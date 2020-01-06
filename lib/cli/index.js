var yargs = require('yargs')
var Promise = require('bluebird')

Promise.longStackTraces()

var _argv = yargs.usage('Usage: $0 <command> [options]')
  .strict()
  .command(require('./device-ios'))
  .command(require('./provider'))
  .demandCommand(1, 'Must provide a valid command.')
  .help('h', 'Show help.')
  .alias('h', 'help')
  .version('V', 'Show version.', function() {
    return require('../../package').version
  })
  .alias('V', 'version')
  .argv
