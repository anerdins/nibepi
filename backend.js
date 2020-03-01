/*MIT License

Copyright (c) 2019 Fredrik Anerdin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const version = "1.1.0";
/*var exec = require('child_process').exec;
exec(`sudo chrt -a -f -p 99 ${process.pid}`, function(error, stdout, stderr) {
    if(error) {
        
    } else {
        console.log('High priority backend is started')
    }

});*/
const serialport = require('serialport');
const nack = [0x15];
const ack = [0x06];
var myPort;
const sendQueue = [[192,107,6,115,176,1,0,0,0,111],[192,107,6,212,190,0,0,0,0,199]];
const getQueue = [];
const rmuQueue = [];
var regQueue = [];
var regCount = 0;
var msgOut = Buffer.alloc(0);
var rmu_buffer = Buffer.alloc(0);
var red = false;
var fs_start = false;
var rmu_start = false;
let other_start = false;
var startReset = true;
let checkACK = {};
process.on('message', (m) => {
    if(m.start===true) {
        if(m.port!==undefined) {
            portName = m.port;
            myPort = new serialport(portName, 9600);
            myPort.on('open', showPortOpen);
            myPort.on('data', analyzeData);
            myPort.on('close', showPortClose);
            myPort.on('error', showError);
        } else {
            if(process.connected===true) {
                process.send({type:"log",data:'Error starting backend, no serial port specified',level:"error",kind:"Serialport"});
            }
        }
    } else if(m.type=="reqData") {
        getQueue.unshift(m.data);
    } else if(m.type=="setData") {
        sendQueue.push(m.data);
    } else if(m.type=="rmuSet") {
        rmuQueue.push(m.data);
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


function showPortOpen() {
    //console.log(`Core started on serial port ${portName}`);
}
function showPortClose() {
    console.log('Port closed. Data rate: ' + myPort.baudRate);
}
function showError(error) {
    if(process.connected===true) {
        process.send({type:"fault",data:{from:"core",message:"The core could not be started, check the serialport"}});
    }
    myPort.removeAllListeners();
    if(process.connected===true) {
        process.disconnect();
    }
}

function analyzeData(data) {
    if(process.connected===true) {
        process.send({type:"log",data:Array.from(data),level:"core",kind:"RAW"});
    }
    // Sometimes and ACK [0x06] is the first byte, and the second byte is the start. We shift it.
    if(data[0]===0x06 && data[1]===0x5C) {
        //console.log('ACK')
        data = data.slice(1)
    } else if(data[0]===0x06 && data[1]===undefined) {
        //console.log('ACK')
    }
    //Check for start message, 0x5C if it's Nibe F series.
    if(fs_start===false) {
        if(data[0]===0x5C) {
            fs_start = true;
        }
    }
    if(fs_start===true) {
        msgOut = Buffer.concat([msgOut,data]);
        if(msgOut.length>=3) {
                if(startReset===true) {
                    startReset = false;
                    sendQueue.push([192,107,6,115,176,1,0,0,0,111]);
                }
                // Only decode objects we know
                if(msgOut[2]!==0x19 && msgOut[2]!==0x1A && msgOut[2]!==0x1B && msgOut[2]!==0x1C&& msgOut[2]!==0x20) {
                    msgOut = Buffer.alloc(0)
                    fs_start = false;
                }
                if(msgOut.length>=5) {
                let msgLength = msgOut[4]+6;
                // Check if we have the full length of the message.
                if(msgOut.length>=msgLength) {
                        // We have full length
                        if(msgOut[2]==0x19 || msgOut[2]==0x1A || msgOut[2]==0x1B || msgOut[2]==0x1C) {
                            if(checkACK[msgOut[2]]===undefined) {
                                if(msgOut.length>=6) {
                                    if(msgOut[msgOut[4]+6]===0x06 || msgOut[msgOut[4]+6]===0xC0) {
                                        checkACK[msgOut[2]] = true;
                                        msgOut = Buffer.alloc(0)
                                        fs_start = false;
                                    } else {
                                        checkACK[msgOut[2]] = false;
                                        msgOut = Buffer.alloc(0)
                                        fs_start = false;
                                    }
                                } else {
                                    msgLength++;
                                }
                                return;
                            }
                        }
                    msgOut = msgOut.slice(0, msgLength);
                    checkMessage(msgOut).then(data => {
                            makeResponse(data).then(result => {
                                if(startReset===false) {
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
                                }
                            }, err => {

                            })
                        }, err => {
                            err = Array.from(err);
                            console.log(`CHKSUM ERROR: ${err}`)
                            if(process.connected===true) {
                                process.send({type:"log",data:err,level:"error",kind:"CHKSUM"});
                            }
                            myPort.write(nack);
                        })
                } else {
                    // Message is not ready yet.
                }
            }
        }
    }
}



const checkMessage = (data) => {
    const promise = new Promise((resolve,reject) => {
        let error = data;
        msgOut = Buffer.alloc(0);
        fs_start = false;
        msgChecksum = data[data[4]+5];
        var calcChecksum = 0;
        for(i = 2; i < (data[4] + 5); i++) {
            calcChecksum ^= data[i];
        }
        if((msgChecksum==calcChecksum) || (msgChecksum==0xC5 && calcChecksum==0x5C)) {
            resolve(data);
        } else {
            reject(error)
        }
    });
    return promise;
}
const makeResponse = (data) => {
    const promise = new Promise((resolve,reject) => {
    // Read from heatpump
    if(data[2]==0x19 || data[2]==0x1A || data[2]==0x1B || data[2]==0x1C) { // < System
        if(data[3]==0x60) { // Send data message
            if(checkACK[data[2]]===false) {
            if(rmuQueue.length!==0) {
                var lastMsg = rmuQueue.pop();
                if(lastMsg!==undefined) {
                    if(Number(lastMsg.ackback[2])==Number(data[2])) {
                        let address = lastMsg.address;
                        if(process.connected===true) {
                            process.send({type:"ack",data:{register:address,ack:true}});
                            process.send({type:"log",data:`Register: ${address}, Buffer: ${JSON.stringify(lastMsg)}`,level:"core",kind:"RMU SENT"});
                        }
                        if(lastMsg.data[3]===6) {
                            if(process.connected===true) {
                                process.send({type:"data",data:lastMsg.ackback,rmu:checkACK[lastMsg.ackback[2]]});
                                process.send({type:"log",data:lastMsg,level:"debug",kind:"RMU ACKBACK"});
                            }
                        }
                        myPort.write(lastMsg.data);
                    } else {
                        rmuQueue.push(lastMsg);
                        myPort.write(ack);
                        resolve(data);
                    }
                } else {
                    myPort.write(ack);
                    resolve(data);
                }
            } else {
                myPort.write(ack);
                resolve(data);
            }
        } else {
            resolve(data);
        }
        } else if(data[3]==0x62) {
            // Message updates
            if(checkACK[data[2]]===false) {
                if(process.connected===true) {
                    let logOut = Array.from(data);
                    process.send({type:"log",data:logOut,level:"debug",kind:"RMU DATA"});
                }
                myPort.write(ack);
                resolve(data);

            } else {
                resolve(data);
            }
            resolve(data);
        } else if(data[3]==0x63) {
            if(checkACK[data[2]]===false) {
                myPort.write([192,96,2,99,0,193]);
                resolve(data);
            } else {
                resolve(data);
            }
        } else if(data[3]==0xEE) {
            if(checkACK[data[2]]===false) {
                if(process.connected===true) {
                    process.send({type:"log",data:"Sending RMU Version v259",level:"debug",kind:"RMU ACK"});
                }
                myPort.write([192,238,3,238,3,1,193]);
                resolve(data);
            } else {
                resolve(data);
            }
        } else {
            if(checkACK[data[2]]===false) {
                myPort.write(ack);
                resolve(data);
            } else {
                resolve(data);
            }
        }
    } else if(data[3]==105 && data[4]==0x00) {
        if(getQueue!==undefined && getQueue.length!==0) {
            var lastMsg = getQueue.pop();
            
            if(lastMsg!==undefined) {
                myPort.write(lastMsg);
                resolve(data);
            } else if(getQueue.length!==0) {
                lastMsg = getQueue.pop();
                if(lastMsg!==undefined) {
                    myPort.write(lastMsg);
                    resolve(data);
                } else {
                    myPort.write(ack);
                    resolve(data);
                }
            } else {
                    myPort.write(ack);
                    resolve(data);
            }
        } else {
            if(regQueue.length!==0) {
                if(regCount>=regQueue.length) regCount = 0;
                myPort.write(regQueue[regCount]);
                regCount++;
                resolve(data);
            } else {
                myPort.write(ack);
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
                myPort.write(lastMsg);
                resolve(data);
            } else {
                    myPort.write(ack);
                    resolve(data);
            }
        } else {
                myPort.write(ack);
                resolve(data);
        }
    } else {
            if(data[3]==109) {
            } else if(data[3]==238) {
            } else if(data[3]==106 || data[3]==104) {

            } else {
            }
            myPort.write(ack);
            resolve(data);
    }
});
return promise;
}
