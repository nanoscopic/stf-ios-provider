var util = require('util')

var syrup = require('stf-syrup')
var EventEmitter = require('eventemitter3')
var lifecycle = require('../../../util/lifecycle')
var Promise = require('bluebird')
var execFileSync = require('child_process').execFileSync
var PNG = require('pngjs').PNG
var fs =  require('fs')

var logger = require('../../../util/logger')
var DeviceInfo = require('../support/deviceinfo')

module.exports = syrup.serial()
  .dependency(require('../plugins/service'))
  .dependency(require('../plugins/vncControl'))
  .define(function(options, service, vncControl) {
    var log = logger.createLogger('device-ios:plugins:display')
    var rotationMap = [0,0,180,90,270,0,0]

    function Display(id, properties) {
      this.id = id
      this.properties = properties
    }

    util.inherits(Display, EventEmitter)

    Display.prototype.updateRotation = function(newRotation) {
      this.properties.rotation = rotationMap[newRotation]
      service.updateRotation(rotationMap[newRotation])
    }

    Display.prototype.updateFrameRate = function(framerate){
      service.setFrameRate(framerate)
    }

    function readInfo(id) {
      log.info('Reading display info')
      
      var width,height;
      
      if( options.streamWidth != 0 ) {
        width = options.streamWidth;
        height = options.streamHeight;
      } else {
        var filename = "/tmp/" + options.serial + ".png"
        execFileSync( "/usr/local/bin/idevicescreenshot", [ "-u", options.serial, filename ], {} )
        var data = fs.readFileSync(filename);
        var png = PNG.sync.read(data);
      
        s.unlinkSync( filename )
      
        width = png.width;
        height = png.height;
      }
      
      vncControl.setDims( width, height )
      
      properties = {
          id:id
          ,width:width
          ,height:height
          ,rotation:0
          ,xdpi:0
          ,ydpi:0
          ,fps:60.0
          ,density:1.0
          ,secure:true
          ,url:options.screenWsUrlPattern
          ,size:0
      }
      return Promise.resolve(new Display(id,properties))
    }

    lifecycle.observe(function() {
        return true
    })

    return readInfo(0).then(function(display){
      return display
    })
  })
