var nibe = require('./index.js');

process.on('exit', function(code) {
    console.log('About to exit with code:', code);
    if(code===-1) {
        console.log('No serialport/host specified in config file')
    } else if(code===-2) {
        console.log('F series is only supported')
    } else if(code===-3) {
        console.log('The core could not be started')
    }
  });
  console.log('Waiting for the core to initiate...')
    let config = nibe.getConfig();
    if(config.system.readonly!==false) {
        config.system.readonly=false
        nibe.setConfig(config);
    }
    if(config.home!==undefined) {
        config.home=undefined;
        nibe.setConfig(config);
    }
    if(config.hotwater!==undefined) {
        config.hotwater=undefined;
        nibe.setConfig(config);
    }
    if(config.indoor!==undefined) {
        config.indoor=undefined;
        nibe.setConfig(config);
    }
    if(config.fan!==undefined) {
        config.fan=undefined;
        nibe.setConfig(config);
    }
    nibe.setDocker(true);
    if(config.connection!==undefined) {
        if(config.connection.enable=="serial") {
            if(config.serial!==undefined && config.serial.port!==undefined && config.serial.port!=="") {
                if(config.connection.series!==undefined && config.connection.series!=="" && config.connection.series==="fSeries") {
                    nibe.initiateCore(null,config.serial.port, function(err,core) {
                        if(err) return process.exit(-3);
                        console.log('Core is started.')
                    })
                } else {
                    process.exit(-2)
                }
            } else {
                process.exit(-1);
            }
        } else if(config.connection.enable=="nibegw") {
            if(config.serial!==undefined && config.serial.port!==undefined && config.serial.port!=="") {
                if(config.connection.series!==undefined && config.connection.series!=="" && config.connection.series==="fSeries") {
                    nibe.initiateCore(null,config.serial.port, function(err,core) {
                        if(err) return process.exit(-3);
                        console.log('Core is started.')
                    })
                } else {
                    process.exit(-2)
                }
            } else {
                process.exit(-1);
            }
        } else if(config.connection.enable=="tcp") {
            
        }
    }
    if(config.mqtt!==undefined) {
        if(config.mqtt.enable!==undefined && config.mqtt.enable===true) {
            const mqtt_host = config.mqtt.host;
            const mqtt_port = config.mqtt.port;
            const mqtt_user = config.mqtt.user;
            const mqtt_pass = config.mqtt.pass;
            nibe.handleMQTT(true,mqtt_host,mqtt_port,mqtt_user,mqtt_pass,function(err,result) {
                if(err) return console.log(err);
            })
            console.log('Waiting for MQTT')
        }
    }