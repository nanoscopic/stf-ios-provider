var util = require('util')
var url = require('url')

var syrup = require('stf-syrup')
var Promise = require('bluebird')
var fetch = require('node-fetch')
var https = require('https')

var logger = require('../../../util/logger')
var FormData = require('form-data');

module.exports = syrup.serial()
  .define(function(options) {
    var log = logger.createLogger('device:support:storage')
    var plugin = Object.create(null)

    plugin.store = function(type, stream, meta) {
      var resolver = Promise.defer()

      var postUrl = url.resolve(options.storageUrl, util.format('s/upload/%s', type))

      const agent = new https.Agent( {
        rejectUnauthorized: false,
        method: 'POST'
      } )
      
      var formData = new FormData();
      Object.keys( meta ).forEach( key => {
        if( key != 'filename' && key != 'contentType' ) formData.append( key, meta[ key ] + '' )
      } )
      
      formData.append( 'file', stream, {
        contentType: meta.contentType,
        name: 'file',
        filename: meta.filename,
      } );
      
      fetch( postUrl, { method: 'POST', body: formData, agent: agent })
      .catch( err => {
          log.error('Upload to "%s" failed', postUrl, err.stack)
          resolver.reject(err)
      } )
      .then( res => {
        if( res.status !== 201 ) {
          log.error('Upload to "%s" failed: HTTP %d', postUrl, res.status)
          resolver.reject(new Error(util.format('Upload to "%s" failed: HTTP %d', postUrl, res.status ) ) )
          return null
        }
        else {
          res.json().then( json => {
            log.info('Upload response "%s"', JSON.stringify( json ) )
            resolver.resolve(json.resources.file)
          } )
        }
      } )

      return resolver.promise
    }

    return plugin
  })
