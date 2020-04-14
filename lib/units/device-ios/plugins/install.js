var stream = require('stream')
var url = require('url')
var util = require('util')

var syrup = require('stf-syrup')
var request = require('request')
var Promise = require('bluebird')

var logger = require('../../../util/logger')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')
var iosDeploy = require('../support/ios-deploy')

// The error codes are available at https://github.com/android/
// platform_frameworks_base/blob/master/core/java/android/content/
// pm/PackageManager.java
function InstallationError(err) {
  return err.code && /^INSTALL_/.test(err.code)
}

module.exports = syrup.serial()
  .dependency(require('../../device/support/router'))
  .dependency(require('../../device/support/push'))
  .define(function(options, router, push) {
    var log = logger.createLogger('device-ios:plugins:install-ipa')
    log.info('install-ipa plugin is ready')

    router.on(wire.InstallMessage, function(channel, message) {
      var manifest = JSON.parse(message.manifest)
      var pkg = manifest.package
      var reply = wireutil.reply(options.serial)

      // Only handle ipa files
      log.info('Received wire.InstallMessage:', message)
      
      if (manifest.CFBundleIdentifier == undefined) {
        log.important("Will not process non-iOS manifest")
        push.send([
          channel
        , reply.fail("Provided file is not an iOS app")
        ])
        return
      }

      log.info('IPA manifest:', manifest)

      log.info('Installing package "%s" from "%s"', manifest.CFBundleIdentifier, message.href)

      function sendProgress(data, progress) {
        push.send([
          channel
        , reply.progress(data, progress)
        ])
      }

      function pushApp() {
        var req = request({
          url: url.resolve(options.storageUrl, message.href)
        })

        // We need to catch the Content-Length on the fly or we risk
        // losing some of the initial chunks.
        var contentLength = null
        req.on('response', function(res) {
          contentLength = parseInt(res.headers['content-length'], 10)
        })

        var source = new stream.Readable().wrap(req)

        return iosDeploy().push(options.serial, source)
      }

      // Progress 0%
      sendProgress('pushing_app', 0)
      pushApp()
        .then(function() {
          if (message.launch) {
            const bundleId = manifest.CFBundleIdentifier

            log.info(
                'Launching app with bundleId "%s"'
              , bundleId
              )
            // Progress 90%
            sendProgress('launching_app', 100)
          }
        })
        .then(function() {
          push.send([
            channel
          , reply.okay('INSTALL_SUCCEEDED')
          ])
        })
        .catch(Promise.TimeoutError, function(err) {
          log.error('Installation of package "%s" failed', pkg, err.stack)
          push.send([
            channel
          , reply.fail('INSTALL_ERROR_TIMEOUT')
          ])
        })
        .catch(InstallationError, function(err) {
          log.important(
            'Tried to install package "%s", got "%s"'
          , pkg
          , err.code
          )
          push.send([
            channel
          , reply.fail(err.code)
          ])
        })
        .catch(function(err) {
          log.error('Installation of package "%s" failed', pkg, err.stack)
          push.send([
            channel
          , reply.fail('INSTALL_ERROR_UNKNOWN')
          ])
        })
    })

    router.on(wire.UninstallMessage, function(channel, message) {
      log.info('Uninstalling "%s"', message.packageName)

      var reply = wireutil.reply(options.serial)

      adb.uninstall(options.serial, message.packageName)
        .then(function() {
          push.send([
            channel
          , reply.okay('success')
          ])
        })
        .catch(function(err) {
          log.error('Uninstallation failed', err.stack)
          push.send([
            channel
          , reply.fail('fail')
          ])
        })
    })
  })
