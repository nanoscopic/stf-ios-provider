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
    .option('click-width', {
      describe: 'Screen "click" width'
    , type: 'number'
    , demand: true
    })
    .option('click-height', {
      describe: 'Screen "click" height'
    , type: 'number'
    , demand: true
    })
    .option('click-scale', {
      describe: 'Scale for WDA clicking (1000=1)'
    , type: 'number'
    , default: 1000
    })
    .option('group-timeout', {
      alias: 't'
    , describe: 'Timeout in seconds for automatic release of inactive devices.'
    , type: 'number'
    , default: 900
    })
    .option('connect-url-pattern', {
      describe: 'The URL pattern to use for `usbmuxd connect`.'
    , type: 'string'
    , default: '${publicIp}:${publicPort}'
    })
    .option('connect-port', {
      describe: 'Port allocated to usbmuxd connections.'
    , type: 'number'
    , default: 9920
    })
    .option('ios-deploy-path', {
      describe: 'Path to ios-deploy. Used instead of libimobiledevice if set'
    , type: 'string'
    , default: ''
    })
}

module.exports.handler = function(argv) {
  return require('../../units/device-ios') ( {
    serial:             argv.serial,
    deviceName:         argv.name,
    storageUrl:         argv.storageUrl,
    publicIp:           argv.publicIp,
    wdaPort:            argv.wdaPort,
    vidPort:            argv.vidPort,
    screenWsUrlPattern: argv.screenWsUrlPattern,
    vncPort:            argv.vncPort,
    vncPassword:        argv.vncPassword,
    vncScale:           argv.vncScale,
    streamWidth:        argv.streamWidth,
    streamHeight:       argv.streamHeight,
    clickWidth:         argv.clickWidth,
    clickHeight:        argv.clickHeight,
    clickScale:         argv.clickScale,
    groupTimeout:       argv.groupTimeout * 1000, // change to ms
    connectUrlPattern:  argv.connectUrlPattern,
    connectPort:        argv.connectPort,
    iosDeployPath:      argv.iosDeployPath,
    endpoints: {
      sub: argv.connectSub,
      push: argv.connectPush
    }
  } )
}
