var syrup = require('stf-syrup')
var logger = require('../../../util/logger')

module.exports = syrup.serial()
  .dependency(require('./identity'))
  .define(function(options, identity) {
    var log = logger.createLogger('device-ios:plugins:data')

    function find() {
      var data = {
        "carrier": {
          "code": "?",
          "name": "?"
        },
        "cpu": {
          "cores": "?",
          "freq": "?",
          "name": "Apple"
        },
        "date": "2011-10-13T15:00:00.000Z",
        "display": {
          "h": identity.display.height,
          "s": 3.5,
          "w": identity.display.width
        },
        "maker": {
          "code": "a",
          "name": "Apple"
        },
        "memory": {
          "ram": 512,
          "rom": 65536
        },
        "name": {
          "id": identity.model,
          "long": ""
        },
        "os": {
          "type": "ios",
          "ver": identity.version
        }
      }
      return data
    }

    return find()
  })
