var crypto = require('crypto')

var syrup = require('stf-syrup')

var logger = require('../../../util/logger')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')

module.exports = syrup.serial()
  .dependency(require('../../device/support/sub'))
  .dependency(require('../../device/support/push'))
  .dependency(require('../../device/support/router'))
  .dependency(require('../util/identity'))
  .define(function(options, sub, push, router, identity) {
    var log = logger.createLogger('device-ios:plugins:solo')

    var hash = crypto.createHash('sha1')
    hash.update(options.serial)
    var channel = hash.digest('base64')

    log.info('Subscribing to permanent channel "%s"', channel)
    log.info('Video - width: %s, height: %s, url: %s', identity.display.width, identity.display.height, identity.display.url)
    sub.subscribe(channel)

    router.on(wire.ProbeMessage, function() {
      log.info('Got Probe; responding with identity')

      push.send([
        wireutil.global
      , wireutil.envelope(new wire.DeviceIdentityMessage(
          options.serial
        , identity.platform
        , identity.manufacturer
        , identity.operator
        , identity.model
        , identity.version
        , identity.abi
        , identity.sdk
        , new wire.DeviceDisplayMessage(identity.display)
        , new wire.DevicePhoneMessage(identity.phone)
        , options.deviceName
        , identity.cpuPlatform
        , identity.openGLESVersion
        ))
      ])
    })

    return {
      channel: channel
      , poke: function() {
        push.send([
          wireutil.global
        , wireutil.envelope(new wire.DeviceReadyMessage(
            options.serial
          , channel
          ))
        ])
        log.info('Sent ready message')        
      }
    }
  })
