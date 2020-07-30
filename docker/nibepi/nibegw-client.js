const dgram = require('dgram');
var server = dgram.createSocket('udp4');

var HOST = "127.0.0.1";
var PORT = 9999;
const sendQueue = [[192,107,6,115,176,1,0,0,0,111],[192,107,6,212,190,0,0,0,0,199]];
const getQueue = [];
var red = false;
var regQueue = [];
var regCount = 0;
let checkACK = {};
process.on('message', (m) => {
    if(m.start===true) {
        if(m.port!==undefined) {
            HOST = m.port;
            start()
        } else {
            if(process.connected===true) {
                process.send({type:"log",data:'Error starting backend, no serial port specified',level:"error",kind:"Serialport"});
	        console.log('Error in the core');
}
        }
    } else if(m.type=="reqData") {
        if(m.data!==undefined) {
            let found = false;
            for (i = 0; i < getQueue.length; i = i + 1) {
                let address = (getQueue[i][4]*256)+getQueue[i][3];
                if((m.data[4]*256)+m.data[3]==address) {
                    found = true;
                }
            }
            if(found===false) getQueue.unshift(m.data)
        }
        ;
    } else if(m.type=="setData") {
        sendQueue.push(m.data);
    } else if(m.type=="regRegister") {
        regQueue = m.data;
    } else if(m.type=="red") {
        red = m.data;
    }
  });
  process.on('disconnect', (m) => {
      if(red===false) {
        console.log('Shutting down the core.')
        process.exit(99);
      }
    
  });
//start()
function write(data) {
    data = Buffer.from(data)
var client = dgram.createSocket('udp4');
client.send(data, 0, data.length, 10001, HOST, function(err, bytes) {
  if (err) throw err;
  client.close();
});
}
function read(data) {
    data = Buffer.from(data)
    var client = dgram.createSocket('udp4');
    client.send(data, 0, data.length, 10000, HOST, function(err, bytes) {
      if (err) throw err;
      client.close();
    });
    }
function start() {
    server.bind(PORT, "0.0.0.0");
    server.on('listening', function() {
        var address = server.address();
       console.log('NibeGW client is listening on ' + HOST + ':' + address.port);
      });      
    server.on('message', function(message, remote) {
        makeResponse(Buffer.from(message)).then(result => {
                result = Array.from(result);
                let doubleFound = false;
                for (i = 5; i < result.length - 1; i = i + 1) {
                    if(result[i]===92 && result[i+1]===92) {
                        result.splice(i, 1);
                        result[4] = result[4]-1;
                        doubleFound = true;
                    }
                }
                if(doubleFound===true) {
                    var calcChecksum = 0;
                    for(i = 2; i < (result[4] + 5); i++) {
                        calcChecksum ^= result[i];
                    }
                    result[result.length-1] = calcChecksum;
                }
                if(process.connected===true) {
                    process.send({type:"data",data:result,rmu:checkACK[result[2]]});
                    process.send({type:"log",data:result,level:"debug",kind:"OK"});
                }
        }, err => {
    
        })    
    });
}


const makeResponse = (data) => {
    const promise = new Promise((resolve,reject) => {
    // Read from heatpump
    
    if(data[3]==105 && data[4]==0x00) {
        if(getQueue!==undefined && getQueue.length!==0) {
            /*
            let array = [];
            for (i = 0; i < getQueue.length; i = i + 1) {
                array[i] = (getQueue[i][4]*256)+getQueue[i][3];
            }
            
            console.log(JSON.stringify(array))
            */
            var lastMsg = getQueue.pop();
            
            if(lastMsg!==undefined) {
                read(lastMsg)
                resolve(data);
            } else if(getQueue.length!==0) {
                lastMsg = getQueue.pop();
                if(lastMsg!==undefined) {
                    read(lastMsg)
                    resolve(data);
                } else {
                    resolve(data);
                }
            } else {
                    resolve(data);
            }
        } else {
            if(regQueue.length!==0) {
                if(regCount>=regQueue.length) regCount = 0;
                read(regQueue[regCount])
                regCount++;
                resolve(data);
            } else {
                resolve(data);
        }
        }
    // Write to heatpump
    } else if(data[3]==107 && data[4]==0x00) {
        if(sendQueue.length!==0) {
            var lastMsg = sendQueue.pop();
            if(lastMsg!==undefined) {
                let address = (lastMsg[4] * 256 + lastMsg[3]);
                if(process.connected===true) {
                    process.send({type:"ack",data:{register:address,ack:true}});
                    process.send({type:"log",data:`Register: ${address}, Buffer: ${JSON.stringify(lastMsg)}`,level:"debug",kind:"SENT"});
                }
                write(lastMsg);
                resolve(data);
            } else {
                    resolve(data);
            }
        } else {
                resolve(data);
        }
    } else {
            if(data[3]==109) {

            } else if(data[3]==238) {

            } else if(data[3]==106 || data[3]==104) {

            } else {

            }
            resolve(data);
    }
});
return promise;
}
