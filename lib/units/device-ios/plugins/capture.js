var util = require('util')

var syrup = require('stf-syrup')
var execSync = require('child_process').execSync

var logger = require('../../../util/logger')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')
var Promise = require('bluebird')
var PNG = require('pngjs').PNG
var fs =  require('fs')
var jpeg = require('jpeg-js');
var Readable = require('stream').Readable

module.exports = syrup.serial()
  .dependency(require('../../device/support/router'))
  .dependency(require('../../device/support/push'))
  .dependency(require('../../device/support/storage'))
  .define(function(options, router, push, storage) {
    var log = logger.createLogger('ios-device:plugins:screen:capture')
    var plugin = Object.create(null)

    plugin.capture = function() {
      log.info('Capturing screenshot')
      
      var filename = options.serial+".png";
      cmd = "idevicescreenshot -u "+options.serial+" "+filename;
      if(options.type=='emulator'){
        cmd = util.format("xcrun simctl io %s screenshot %s.png",options.serial,options.serial)
      }
      stdout = execSync(cmd,{});
      
      // Todo: Add code to detect when this fails and take some appropriate action
      
      var data = fs.readFileSync(filename);
      var png = PNG.sync.read(data);
      fs.unlinkSync( filename )
      
      var rawImageData = {
        data: png.data,
        width: png.width,
        height: png.height
      };
      var jpegImageData = jpeg.encode(rawImageData, 50).data;
      
      var jpgFilename = options.serial + ".jpg";
      fs.writeFileSync( jpgFilename, jpegImageData )
      
      // Alternative method that avoids writing a file
      //var s = new Readable()
      //s.push( jpegImageData.data )
      //s.push( null )
      
      var s = fs.createReadStream( jpgFilename )
      
      return storage.store('blob', s, {
        filename: jpgFilename,
        contentType: 'image/jpeg',
        knownLength: jpegImageData.length
      })
    }

    router.on(wire.ScreenCaptureMessage, function(channel) {
      var reply = wireutil.reply(options.serial)
      plugin.capture()
        .then(function(file) {
          push.send([
            channel
          , reply.okay('success', file)
          ])
        })
        .catch(function(err) {
          log.error('Screen capture failed', err.stack)
          push.send([
            channel
          , reply.fail(err.message)
          ])
        })
    })

    return plugin
  })
