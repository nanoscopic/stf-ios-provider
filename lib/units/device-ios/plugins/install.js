var stream = require('stream')
var url = require('url')
var util = require('util')

var syrup = require('stf-syrup')
var request = require('request')
var Promise = require('bluebird')

var logger = require('../../../util/logger')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')

// The error codes are available at https://github.com/android/
// platform_frameworks_base/blob/master/core/java/android/content/
// pm/PackageManager.java
function InstallationError(err) {
  return err.code && /^INSTALL_/.test(err.code)
}

module.exports = syrup.serial()
  .dependency(require('../support/ios-deploy'))
  .dependency(require('../support/router'))
  .dependency(require('../support/push'))
  .define(function(options, iosDeploy, router, push) {
    var log = logger.createLogger('device:plugins:install-ipa')

    router.on(wire.InstallMessage, function(channel, message) {
      var manifest = JSON.parse(message.manifest)
      var pkg = manifest.package

      // Only handle ipa files
      log.info('Received install message:', message)
      
      if (!manifest.CFBundleIdentifier) {
        log.info("Will not process non-iOS manifest")
        return
      }

      log.info('IPA manifest:', manifest)

      log.info('Installing package "%s" from "%s"', pkg, message.href)

      var reply = wireutil.reply(options.serial)

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

        return iosDeploy.push(options.serial, source)
          .timeout(10000)
          .then(function(transfer) {
            var resolver = Promise.defer()

            function progressListener(stats) {
              if (contentLength) {
                // Progress 0% to 70%
                sendProgress(
                  'pushing_app'
                , 50 * Math.max(0, Math.min(
                    50
                  , stats.bytesTransferred / contentLength
                  ))
                )
              }
            }

            function errorListener(err) {
              resolver.reject(err)
            }

            function endListener() {
              resolver.resolve(target)
            }

            transfer.on('progress', progressListener)
            transfer.on('error', errorListener)
            transfer.on('end', endListener)

            return resolver.promise.finally(function() {
              transfer.removeListener('progress', progressListener)
              transfer.removeListener('error', errorListener)
              transfer.removeListener('end', endListener)
            })
          })
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
            sendProgress('launching_app', 90)
            return iosDeploy.startActivity(options.serial, bundleId)
                .timeout(30000)
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
