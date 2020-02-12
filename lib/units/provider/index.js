var Promise = require('bluebird')

var logger     = require('../../util/logger')
var wire       = require('../../wire')
var wireutil   = require('../../wire/util')
var wirerouter = require('../../wire/router')
var lifecycle  = require('../../util/lifecycle')
var srv        = require('../../util/srv')
var zmqutil    = require('../../util/zmqutil')
var zmq        = require('zeromq/v5-compat')
var crypto     = require('crypto')

module.exports = function(options) {
  var log  = logger.createLogger('provider')
  var solo = wireutil.makePrivateChannel()
  var push = setup_zmq('push', options.endpoints.push, "Sending output to"    , log )
  var sub  = setup_zmq('sub' , options.endpoints.sub  , "Receiving input from", log )
  
  // Establish always-on channels
  ;[solo].forEach( function( channel ) {
    log.info('Subscribing to permanent channel "%s"', channel)
    sub.subscribe( channel )
  })

  // Track IOS devices; notifications received over ZeroMQ from coordinator
  var connected = {};
  var sock2 = zmq.socket('sub');
  sock2.connect('tcp://127.0.0.1:7294');
  sock2.subscribe('devEvent');
  sock2.on( 'message', function( topic, msg ) {
    var str = msg.toString();
    if( str == "dummy" ) return;
    var ob = JSON.parse( str );

    if( ob.Type == 'connect' && !connected[ ob.UUID ] ) {
      connected[ ob.UUID ] = 1
      log.info('Tracking iOS device')
      log.info('  UUID:   ', ob.UUID )
      log.info('  Name:   ', ob.Name )
      log.info('  WDAPort:', ob.WDAPort )
      log.info('  VidPort:', ob.VidPort )

      push.send( [ wireutil.global, wireutil.envelope(
        new wire.DeviceIntroductionMessage( 
          ob.UUID, wireutil.toDeviceStatus('device'), new wire.ProviderMessage(solo, options.name)
        )
      ) ] )
      
      var hash = crypto.createHash('sha1')
      hash.update( ob.UUID )
      var chanId = hash.digest('base64')
      sub.subscribe( chanId )
      log.info('  Channel: ', chanId )
    }
    else if( ob.Type == 'present' ) {
      log.info('IOS Present: ', ob.UUID )
      push.send ( [ wireutil.global, wireutil.envelope( new wire.DevicePresentMessage( ob.UUID ) ) ] )
    }
    else if( ob.Type == 'heartbeat' ) {
      log.info('IOS Heartbeat: ', ob.UUID )
      push.send ( [ wireutil.global, wireutil.envelope( new wire.DeviceHeartbeatMessage( ob.UUID ) ) ] )
    }
    else if( ob.Type == 'disconnect' ) {
      delete connected[ ob.UUID ]
      log.info('IOS Device disconnect', ob.UUID )
      push.send( [ wireutil.global, wireutil.envelope( new wire.DeviceAbsentMessage( ob.UUID ) ) ] )
    }
  } );
  
  sub.on( 'message', wirerouter().on( wire.DeviceRegisteredMessage,
    function( channel, message ) {
      log.info("sub messsage:", message.serial, 'register' )
    }
  ).handler() );
}

function setup_zmq( type, addr, msg, log ) {
  var sub = zmqutil.socket(type)
  Promise.map(addr, function(endpoint) {
    return srv.resolve(endpoint).then(function(records) {
      return srv.attempt(records, function(record) {
        log.info( msg + ' "%s"', record.url)
        sub.connect(record.url)
        return Promise.resolve(true)
      })
    })
  })
  .catch(function(err) {
    log.fatal('Unable to connect to endpoint', err)
    lifecycle.fatal()
  })
  return sub
}
