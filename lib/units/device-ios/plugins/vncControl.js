var net = require('net')
var util = require('util')
var os = require('os')
var rfb = require('rfb2')
//var EventEmitter = require('eventemitter3')
var events = require('events')
var syrup = require('stf-syrup')

var logger = require('../../../util/logger')
var lifecycle = require('../../../util/lifecycle')

module.exports = syrup.serial()
.define(function(options,identity) {
  var log = logger.createLogger('ios-device:plugins:vnc')
  
  //var plugin = new EventEmitter()
  var plugin = new events.EventEmitter()
  
  var width
  var height
  var rawWidth = 0//identity.screen.width
  var rawHeight = 0//identity.screen.height
  var flip = false
  
  var r = 0
  
  if( options.vncPort ) {
    var vncOps = {
      host: 'localhost',
      port: options.vncPort
    };
    if( options.vncPassword != '' ) {
      vncOps.password = options.vncPassword
    }
    r = rfb.createConnection( vncOps );
  }
  
  if(r) r.on('connect', function() {
    log.info('successfully connected and authorised');
    log.info('remote screen name: ' + r.title + ' width:' + r.width + ' height: ' + r.height);
    width = r.width
    height = r.height
    if( width > height ) flip = true
  });
  
  if(r) r.on('error', function(error) {
    log.error( error )
  });
  
  plugin.setDims = function( wid, heg ) {
    rawWidth = wid
    rawHeight = heg
  }
  
  plugin.click = function( x, y ) {
    log.info( 'raw pointer click at ' + x + ' ' + y )
    
    x = Math.floor( x / ( rawWidth  / options.vncScale ) * width  )
    y = Math.floor( y / ( rawHeight / options.vncScale ) * height )
    
    log.info( 'pointer click at ' + x + ' ' + y )
    
    if( flip ) {
        var xbackup = x;
        x = ( width - y );
        y = xbackup;
    }
    
    r.pointerEvent( x, y, 1 )
    //r.pointerEvent( 0, 0, 1 )
    r.pointerEvent( x, y, 0 )
  }
  
  plugin.drag = function( x1, y1, x2, y2 ) {
    x1 = Math.floor( x1 / ( rawWidth  / options.vncScale ) * width  )
    y1 = Math.floor( y1 / ( rawHeight / options.vncScale ) * height )
    x2 = Math.floor( x2 / ( rawWidth  / options.vncScale ) * width  )
    y2 = Math.floor( y2 / ( rawHeight / options.vncScale ) * height )
    
    if( flip ) {
        var xbackup = x1;
        x1 = ( width - y1 );
        y1 = xbackup;
        
        xbackup = x2;
        x2 = ( width - y2 );
        y2 = xbackup;
    }
    
    //log.info( 'pointer click at ' + x + ' ' + y )
    r.pointerEvent( x1, y1, 1 )
    r.pointerEvent( x2, y2, 1 )
    //r.pointerEvent( 0, 0, 1 )
    r.pointerEvent( x2, y2, 0 )
  }
  
  lifecycle.observe(function() {
    //r.end();
    return true
  } )

  return plugin
})
