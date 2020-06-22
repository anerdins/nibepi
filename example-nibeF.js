var nibe = require('./index');
const serialPort = "/dev/ttyAMA0";
const mqtt_host = "127.0.0.1";
const mqtt_port = "1883"
const mqtt_user = "";
const mqtt_pass = "";

nibe.initiateCore(serialPort, function(err,core) {
    if(err) return console.log(err);
    console.log('Core is started.')
})
console.log('Waiting for the core to initiate...')

nibe.handleMQTT(true,mqtt_host,mqtt_port,mqtt_user,mqtt_pass,function(err,result) {
    if(err) return console.log(err);
    if(result===true) {
        
    } else {
        
    }
})
console.log('Waiting for MQTT')

nibe.data.on('data',data => {
    console.log(`${data.register}, ${data.titel}: ${data.data} ${data.unit}`)
})