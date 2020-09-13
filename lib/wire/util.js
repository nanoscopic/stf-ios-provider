const { v4: uuidv4 } = require('uuid');
const uuid = require('uuid');

var wire = require('./')

var wireutil = {
  global: '*ALL'
, makePrivateChannel: function() {
	var bytes = uuid.parse( uuidv4() );
	var buff = Buffer.from( bytes );
	return buff.toString('base64');
  }
, toDeviceStatus: function(type) {
    return wire.DeviceStatus[{
      device: 'ONLINE'
    , emulator: 'ONLINE'
    , unauthorized: 'UNAUTHORIZED'
    , offline: 'OFFLINE'
    , connecting: 'CONNECTING'
    , authorizing: 'AUTHORIZING'
    }[type]]
  }
, toDeviceRequirements: function(requirements) {
    return Object.keys(requirements).map(function(name) {
      var item = requirements[name]
      return new wire.DeviceRequirement(
        name
      , item.value
      , wire.RequirementType[item.match.toUpperCase()]
      )
    })
  }
, envelope: function(message) {
    return new wire.Envelope(message.$code, message.encode()).encodeNB()
  }
, transaction: function(channel, message) {
    return new wire.Envelope(
        message.$code
      , message.encode()
      , channel
      )
      .encodeNB()
  }
, reply: function(source) {
    var seq = 0
    return {
      okay: function(data, body) {
        return wireutil.envelope(new wire.TransactionDoneMessage(
          source
        , seq++
        , true
        , data === null ? null : (data || 'success')
        , body ? JSON.stringify(body) : null
        ))
      }
    , fail: function(data, body) {
        return wireutil.envelope(new wire.TransactionDoneMessage(
          source
        , seq++
        , false
        , data || 'fail'
        , body ? JSON.stringify(body) : null
        ))
      }
    , progress: function(data, progress) {
        return wireutil.envelope(new wire.TransactionProgressMessage(
          source
        , seq++
        , data
        , ~~progress
        ))
      }
    }
  }
}

module.exports = wireutil
