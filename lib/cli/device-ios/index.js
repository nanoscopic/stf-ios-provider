module.exports.command = 'device-ios'

module.exports.builder = function(yargs) {
  return yargs
    .strict()
    .option('serial', {
      describe: 'UUID of IOS device'
    , type: 'string'
    , demand: true
    })
    .option('name', {
      describe: 'Name of IOS device'
    , type: 'string'
    , demand: true
    })
    .option('storage-url', {
      alias: 'r'
    , describe: 'The URL to the storage unit.'
    , type: 'string'
    , demand: true
    })
    .option('connect-push', {
      alias: 'p'
    , describe: 'ZeroMQ PULL endpoint to connect to.'
    , array: true
    , demand: true
    })
    .option('connect-sub', {
      alias: 's'
    , describe: 'ZeroMQ PUB endpoint to connect to.'
    , array: true
    , demand: true
    })
    .option('public-ip', {
      describe: 'The IP or hostname to use in URLs.'
    , type: 'string'
    , demand: true
    })
    .option('wda-port', {
      describe: 'The WDA Server port in mac.'
    , type: 'string'
    , default: '8100'
    })
    .option('vid-port', {
      describe: 'The video streaming port'
    , type: 'string'
    , default: '8000'
    })
    .option('screen-ws-url-pattern', {
      describe: 'The URL pattern to use for the screen WebSocket.'
    , type: 'string'
    , default: 'wss://${publicIp}:${publicPort}'
    })
    .option('vnc-port', {
      describe: 'VNC port to use for mouse control if any'
    , type: 'number'
    , default: 0
    })
    .option('vnc-password', {
      describe: 'VNC password'
    , type: 'string'
    , default: ''
    })
    .option('vnc-scale', {
      describe: 'Scale of IOS device ( physical pixels versus app pixels )'
    , type: 'number'
    , default: 2
    })
    .option('stream-width', {
      describe: 'Video stream width'
    , type: 'number'
    , default: 0
    })
    .option('stream-height', {
      describe: 'Video stream height'
    , type: 'number'
    , default: 0
    })
}

module.exports.handler = function(argv) {
  return require('../../units/device-ios')({
    serial: argv.serial
  , deviceName: argv.name
  , storageUrl: argv.storageUrl
  , publicIp: argv.publicIp
  , wdaPort: argv.wdaPort
  , vidPort: argv.vidPort
  , screenWsUrlPattern: argv.screenWsUrlPattern
  , vncPort: argv.vncPort
  , vncPassword: argv.vncPassword
  , vncScale: argv.vncScale
  , streamWidth: argv.streamWidth
  , streamHeight: argv.streamHeight
  , endpoints: {
      sub: argv.connectSub
    , push: argv.connectPush
    }
  })
}
