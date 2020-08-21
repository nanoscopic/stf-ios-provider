var syrup = require('stf-syrup')
var Promise = require('bluebird')
var url = require('url')
var util = require('util')
var logger = require('../../../util/logger')
var EventEmitter = require('eventemitter3')
var lifecycle = require('../../../util/lifecycle')
var fetch = require('node-fetch')
var FormData = require('form-data');
var { URLSearchParams } = require('url');

module.exports = syrup.serial()
.dependency(require('./vncControl'))
.define(function(options, vncControl){
    var log = logger.createLogger('device-ios:plugins:wdaCommands')
    var plugin = new EventEmitter()
    var baseUrl = util.format('http://localhost:%d',options.wdaPort)
    var sessionid = null
    var sessionTimer = null
    
    plugin.getSessionid = function(){
        if( sessionid == null ) {
            plugin.initSession()
            return null
        }
        return sessionid
    }

    plugin.initSession = function(){
        fetch( baseUrl + '/status', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        } )
        .then( res => res.json() )
        .then( json => {
            sessionid = json.sessionId;
        } )
        .catch( err => {
          log.error('Session renew "%s" failed',  baseUrl + '/status', err.stack)
        } )
    }

    plugin.click = function(x,y) {
        log.info('click at x:',x,'y:',y)
        if( options.vncPort ) {
          vncControl.click(x,y)
        }
        else {
          //plugin.PostData('wda/tapat',{x:x,y:y},true)
          plugin.PostData('wda/touch/perform',{"actions":[{"action":"tap","options":{"x":x,"y":y}}]},true)
          //plugin.PostData('wda/tap/0',{x:x,y:y},true)
        }
    }
    
    plugin.clickHold = function(x,y,seconds) {
        log.info('click and hold at x:',x,'y:',y)
        if( options.vncPort ) {
          vncControl.click(x,y)
        }
        else {
          plugin.PostData('wda/touchAndHold',{x:x,y:y,duration:seconds},true)
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
        //plugin.PostData('wda/dragat', { x1: x1, y1: y1, x2: x2, y2: y2 }, true );
          
        var body = {
          "actions": [
            {
              "action": "press",
              "options": {
                "x": Math.floor(x1),
                "y":Math.floor(y1)
              }
            },
            {
              "action":"wait",
              "options": {
                "ms": 500
              }
            },
            {
              "action": "moveTo",
              "options": {
                "x": Math.floor(x2),
                "y":Math.floor(y2)
              }
            },
            {
              "action":"release",
              "options":{}
            }
          ]
        };
        plugin.PostData( "wda/touch/perform", body , true );
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

    plugin.PostData = function( uri, body, useSession, handler ) {
        var sessionPath = useSession ? util.format("/session/%s",plugin.getSessionid()) : '';
        var url = util.format("%s%s/%s", baseUrl, sessionPath, uri );
        
        return new Promise( function( resolve, reject ) {
            fetch( url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( body )
            } )
            .then( res => {
                if( res.status < 200 || res.status >= 300 ) {
                    if( handler ) {
                        if( handler == 1 ) resolve( res.status );
                        else handler( { success: false, status: res.status } );
                    }
                    
                    log.warn( "posting %s to:", JSON.stringify( body ), url, "status code:", res.status )
                }
                else {
                    res.json().then( json => {
                        log.info('POST to URL:%s, Response:%s', url, JSON.stringify( json ) )
                        if( handler ) {
                            if( handler == 1 ) resolve( json );
                            else handler( { success: true, json: json } );
                        }
                        else processResp( json );
                    } )
                }
            } )
            .catch( err => {
                if( handler && handler == 1 ) reject();
                log.error("Post %s to URL:%s", JSON.stringify( body ), url)
            } )
        } );
    }

    plugin.GetRequest = function( uri, param='', useSession=false, callback ) {
        var sessionPath = useSession ? util.format("/session/%s",plugin.getSessionid()) : '';
        var url = util.format( "%s%s/%s%s", baseUrl, sessionPath, uri, param );
        
        fetch( url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        } )
        .then( res => {
            if( res.status < 200 || res.status >= 300 ) {
                log.warn("GET from:", uri, "status code:", res.status)
            }
            else {
                res.json().then( json => {
                    log.info('Get - URL:%s, Response:%s', url, JSON.stringify( json ) )
                    if( callback ) {
                        callback( json );
                    }
                    else processResp( json );
                } )
            }
        } )
        .catch( err => {
            log.error("Get - URL:%s", url)
        } )
    }

    sessionTimer = setInterval(plugin.initSession, 30000);

    lifecycle.observe(function() {
        clearInterval(sessionTimer)
        return true
    })

    return plugin
})
