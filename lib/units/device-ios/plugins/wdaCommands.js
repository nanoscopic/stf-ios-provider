var requestPromise = require('request-promise')
var syrup = require('stf-syrup')
var request = require('request')
var Promise = require('bluebird')
var url = require('url')
var util = require('util')
var logger = require('../../../util/logger')
var EventEmitter = require('eventemitter3')
var lifecycle = require('../../../util/lifecycle')

module.exports = syrup.serial()
.dependency(require('./vncControl'))
.define(function(options, vncControl){
    var log = logger.createLogger('device-ios:plugins:wdaCommands')
    var plugin = new EventEmitter()
    var baseUrl = util.format('http://localhost:%d',options.wdaPort)
    var sessionid = null
    var sessionTimer = null
    
    plugin.getSessionid = function(){
        if(sessionid==null){
            plugin.initSession()
        }
        return sessionid
    }

    plugin.initSession = function(){
        let options = {
            method:'GET',
            uri:baseUrl+'/status',
            headers:{
                'Content-Type':'application/json'
            },
            json:true
        }
        requestPromise(options).then(function(resp){
            sessionid = resp.sessionId
            return sessionid
        }).catch(function(err){
            return null
        })
    }

    plugin.click = function(x,y,duration) {
        log.info('click at x:',x,'y:',y)
        if( options.vncPort ) {
          vncControl.click(x,y)
        }
        else {
          plugin.PostData('wda/tap/0',{x:x,y:y},true)
        }
    }

    plugin.swipe = function(swipeList,duration){
        var actions = [
            {
                action:"press",
                options:{
                    x:swipeList[0].x,
                    y:swipeList[0].y
                }
            }
        ]
        var time = duration
        if(swipeList.length>2){
            time = 50
        }
        for(i=1;i<swipeList.length;i++){
            actions.push(
                {
                    action:"wait",
                    options:{
                        ms:time
                    }
                }
            )
            actions.push(
                {
                    action:"moveTo",
                    options:{
                        x:swipeList[i].x,
                        y:swipeList[i].y
                    }
                }
            )
        }
        actions.push({
            action:"release",
            options:{}
        })
        var body = {
            actions:actions
        }
        plugin.PostData('wda/touch/perform_stf',body,false)
    }
    
    plugin.swipeViaDrag = function(x1,y1,x2,y2,duration) {
        if( options.vncPort ) {
          vncControl.drag(x1,y1,x2,y2)
        }
        else {
            var body = {
              fromX: Math.floor(x1),
              fromY: Math.floor(y1),
              toX: Math.floor(x2),
              toY: Math.floor(y2),
              duration: 0.5 // this is the minimum allowed
            }
            //console.log( 'body:', body )
            plugin.PostData('wda/element/0/dragfromtoforduration', body ,true)
        }        
    }

    plugin.launchApp = function(bundleId){
        var body = {
            desiredCapabilities:{
                bundleId:bundleId
            }
        }
        plugin.PostData('session',body,false)
    }

    function processResp(resp){
        var respValue = resp.value
        if(respValue=={}||respValue==null||respValue=="")
            return
        if(respValue.func==undefined)
            return
        return plugin.emit(respValue.func,respValue)
    }

    plugin.PostData = function(uri,body,bWithSession){
        var session = ''
        if(bWithSession)
            session = util.format("/session/%s",plugin.getSessionid())
        let options = {
            method:'POST',
            uri:util.format("%s%s/%s",baseUrl,session,uri),
            body:body,
            json:true,
            headers:{
                'Content-Type':'application/json'
            }
        }
        requestPromise(options).then(function(resp){
            log.warn("response from ", uri, ":", resp.value)
            processResp(resp)
        }).catch(function(err){
            var statusCode = err.statusCode
            log.warn("posting to:", uri, "status code:",statusCode)
            
            err = err.error.value;
            var trace = err.traceback;
            err.traceback = null;
            log.warn(JSON.stringify(err,null,2))
            if( trace ) {
              log.warn( "stack trace:", trace)
            }
            return null
        })
    }

    plugin.GetRequest = function(uri,param='',bWithSession=false){
        var session = ''
        if(bWithSession)
            session = util.format("/session/%s",plugin.getSessionid())
        let options = {
            method:'GET',
            uri:util.format("%s%s/%s%s",baseUrl,session,uri,param),
            json:true,
            headers:{
                'Content-Type':'application/json'
            }
        }
        requestPromise(options).then(function(resp){
            processResp(resp)
        }).catch(function(err){
            return null
        })
    }

    sessionTimer = setInterval(plugin.initSession, 30000);

    lifecycle.observe(function() {
        clearInterval(sessionTimer)
        return true
    })

    return plugin
})
