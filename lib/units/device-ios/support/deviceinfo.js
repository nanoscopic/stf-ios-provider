var wire = require('../../../wire')
var IOSModelInfo = require("./IOSModelInfo")

var execFileSync = require('child_process').execFileSync;
var simctl = require('./simctl')
var fs =  require('fs')

function iDeviceInfo( serial, options ) {
    var args = ["-u",serial]
    if( options ) args.concat( options )
    var lines = execFileSync( "/usr/local/bin/ideviceinfo", args, {} ).toString().split("\n")
    var hash = {};
    for( var lineNum in lines ) {
        var parts = lines[ lineNum ].split(": ")
        hash[ parts[0] ] = parts[1]
    }
    return hash
}

function iosDeployInfo( options, serial, props ) {
    var propStr = props.join(',');
    var json =  execFileSync( options.iosDeployPath, ["-j","-u",serial,"-g", propStr], {} ).toString()
    var info = JSON.parse( json );
    return info;
}

var DeviceInfo = {
    getBatteryInfo: function(options,serial,type='device'){
        var result = {
          serial:serial
          ,status:"charging"
          ,health:"good"
          ,source:"usb"
          ,level:level
          ,scale:100
          ,temp:0
          ,voltage:0
        }
        if( type == 'emulator' ) return result
        
        if( options.iosDeployPath ) {
            var info = iosDeployPath( options, serial, [
                "com.apple.mobile.battery:BatteryCurrentCapacity",
                "com.apple.mobile.battery:BatteryIsCharging"
            ] );
            result.level = info["com.apple.mobile.battery:BatteryCurrentCapacity"];
            result.status = info["com.apple.mobile.battery:BatteryIsCharging"];            
        } else {
            var batInfo = iDeviceInfo( serial, [ "-q", "com.apple.mobile.battery" ] )
            result.level = parseInt( batInfo["BatteryCurrentCapacity"], 10 );
            result.status = batInfo["BatteryIsCharging"]=="true" ? "charging" : "discharging";
        }
        
        return result
    }
    
    ,getDeviceInfo: function(options,serial,type='device') {
        var devInfo;
        if( options.iosDeployPath != '' ) {
            devInfo = iosDeployInfo( options, serial, [
                "ModelNumber",
                "InternationalMobileSubscriberIdentity",
                "IntegratedCircuitCardIdentity",
                "CPUArchitecture",
                "ProductVersion"
            ] );
        }
        else devInfo = iDeviceInfo( serial )
        
        var iosInfo = IOSModelInfo.modelInfo( devInfo[ "ModelNumber" ] )
        var iLine = iosInfo["name"]
        var iColor = iosInfo["color"]
        var iStorage = iosInfo["storage"]
        
        var result = {
            serial:        serial
            ,platform:     "iOS"
            ,manufacturer: "Apple"
            ,operator:     ""
            ,sdk:          ""
            ,phone: {
                imei:         ( devInfo.InternationalMobileEquipmentIdentity || '' )
                ,imsi:        ( devInfo.InternationalMobileSubscriberIdentity || '' )
                ,phoneNumber: ""
                ,iccid:       ( devInfo.IntegratedCircuitCardIdentity || '' )
                ,network:     ( devInfo["  CFBundleIdentifier"] || '' )
            }
            ,product:         "Apple"
            ,cpuPlatform:     ""
            ,openGLESVersion: ""
            ,memory: {
                rom: ( iStorage * 1000 )
            }
        }
        
        if( type == 'emulator' ) {
            var info = simctl.GetSimInfo(serial)
            result.version = info.sdk
            result.model   = info.name
            result.product = "Apple Simulator"
            result.display = simctl.GetDisplay(serial)
            result.abi     = "arm64"
            return result
        }
        
        // type == "device"
        var devInfo = iDeviceInfo( serial )
        result.abi     = devInfo[ "CPUArchitecture" ]
        result.version = devInfo[ "ProductVersion"  ]
        result.model   = iLine
        //result.display = DeviceInfo.getDisplay( serial, "device" )
        return result
    }
}

module.exports = DeviceInfo;

