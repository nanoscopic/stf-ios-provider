var stream = require('stream')
var url = require('url')
var util = require('util')

var syrup = require('stf-syrup')
var request = require('request').defaults({ rejectUnauthorized: false })
var Promise = require('bluebird')

var logger = require('../../../util/logger')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')
var promiseutil = require('../../../util/promiseutil')
var fs = require('fs')
var os = require('os')
var temp = require('temp')

module.exports = syrup.serial()
  .dependency(require('./ios-deploy'))
  .dependency(require('../../device/support/router'))
  .dependency(require('../../device/support/push'))
  .define(function(options, deploy, router, push) {
    var log = logger.createLogger('device-ios:plugins:install')
    var cacheDir = os.tmpdir()

    router.on(wire.InstallMessage, function(channel, message) {

      log.info('Installing app from "%s"', message.href)

      var reply = wireutil.reply(options.serial)
      var resolver = Promise.defer()

      function sendProgress(data, progress) {
        push.send([
          channel
        , reply.progress(data, progress)
        ])
      }

      function progressListener(value){
        sendProgress('installing_app', 50+value/2)
        if(value===100){
            push.send([
                channel
              , reply.okay('INSTALL_SUCCEEDED')
              ])
        }
      }
      function errorListener(err) {
        push.send([
            channel
          , reply.fail(err)
          ])
        resolver.reject(err)
      }
      function endListener() {
        resolver.resolve('end')
      }
      deploy.on('installing_app',progressListener)
      deploy.on('error', errorListener)
      deploy.on('end',endListener)

      urlstr = url.resolve(options.storageUrl, message.href)
      log.info('Downloading app to install from "%s"', urlstr)
        
      var filepath = temp.path()
      var stream = fs.createWriteStream(filepath)
      request(urlstr).pipe(stream).on('close',function(){
          deploy.install(options.serial,filepath,options.type).then(function(){
            return resolver.promise.finally(function() {
                deploy.removeListener('progress', progressListener)
                deploy.removeListener('error', errorListener)
                deploy.removeListener('end', endListener)
              })
          })
      })
    })

    router.on(wire.UninstallMessage, function(channel, message) {
      log.info('Uninstalling "%s"', message.packageName)

      var reply = wireutil.reply(options.serial)

      deploy.uninstall(options.serial, message.packageName,options.type)
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
