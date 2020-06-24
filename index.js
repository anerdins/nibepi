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
//const path = __dirname;
const path = "/etc/nibepi"
const startCore = require('./lib/startCore')
const stopCore = require('./lib/stopCore');
var log = require('./log');
var child = require('child_process');
let exec = child.exec;
let spawn = child.spawn;
let model = "";
let rmu = {};
let firmware = "";
let register = [];
let mqtt_client;
let mqtt_subcribers = [];
let mqttData = {};
let mqttDiscoverySensors = [];
let red = false;
const regQueue = [];
var pumpModel = require('./lib/models.json')
const EventEmitter = require('events').EventEmitter
const nibeEmit = new EventEmitter();
const fs = require('fs');
if (!fs.existsSync("/etc/nibepi")) {
    exec(`sudo mount -o remount,rw / && sudo mkdir /etc/nibepi && sudo chown ${process.env.USER}:${process.env.USER} /etc/nibepi`, function(error, stdout, stderr) {
        console.log('Configuration directory created /etc/nibepi');
    });
}
function requireF(modulePath){ // force require
    try {
     return require(modulePath);
    }
    catch (e) {
     console.log('Config file not found, loading default.');
     return require(__dirname+'/default.json');
    }
}
function requireGraph(){ // force require
    const promise = new Promise((resolve,reject) => {
    try {
     resolve(require(path+'/graph.json'));
    }
    catch (e) {
        reject('No graphs to load.')
    }
});
return promise;
}
let config = requireF(path+'/config.json');
var timer;
const saveGraph = (data) => {
    const promise = new Promise((resolve,reject) => {
    if(config.system===undefined || config.system.save_graph!==true) reject();
    if(data===undefined) reject(new Error('Cant save empty graph'));
        
    if(config.system===undefined) config.system = {};
            if(config.log===undefined) config.log = {};
            if(config.system.readonly===true) {
                exec('sudo mount -o remount,rw /', function(error, stdout, stderr) {
                    if(error) {
                        reject(new Error('Error saving graph, could not set RW mode'));
                    } else {
                        fs.writeFile(path+'/graph.json', JSON.stringify(data,null,2), function(err) {
                            if(err) reject(new Error('Error saving graph to disc, write error'));
                            log(config.log.enable,"Graphs saved",config.log['info'],"Graph");
                            nibeEmit.emit('fault',{from:"Grafer",message:'Graferna är sparade till SD-kort'});
                            resolve('Graferna sparade till SD-kort')
                            exec('sudo mount -o remount,ro /', function(error, stdout, stderr) {
                                if(error) {
                                    nibeEmit.emit('fault',{from:"Grafer",message:'Kunde inte sätta läsbart läge på filsystemet.'});
                                    
                                    reject(new Error('Error setting read-only mode after saving graph'));
                                } else {
                                    console.log('Read only mode set.')
                                    resolve('Graferna är sparade till SD-kort och läsbart läge aktivt')
                                }
                            })
                            
                        }); 
                    }
                });
            } else {
                exec('sudo mount -o remount,rw /', function(error, stdout, stderr) {
                    if(error) {
                        log(config.log.enable,"Could not open the system for write mode",config.log['error'],"Config");
                        reject(new Error('Error saving graph, could not set RW mode'));
                    } else {
                        fs.writeFile(path+'/graph.json', JSON.stringify(data,null,2), function(err) {
                            if(err) reject(new Error('Error saving graph to disc, write error'));
                            nibeEmit.emit('fault',{from:"Grafer",message:'Graferna är sparade till SD-kort'});
                            resolve('Graferna sparade till SD-kort')
                        }); 
                    }
                });
                
            }
        });
        return promise;
}
const updateConfig = (data) => {
    config = data;

    handleMQTT(config.mqtt.enable,config.mqtt.host,config.mqtt.port,config.mqtt.user,config.mqtt.pass, (err,result) => {
        if(err) return console.log(err);
        if(result===true) {
            if(mqtt_client!==undefined && mqtt_client.connected!==undefined && mqtt_client.connected===false) {

            }
        } else {
            if(mqtt_client!==undefined && mqtt_client.connected!==undefined && mqtt_client.connected===true) {

            }
        }
    })
    nibeEmit.emit('config',config);
   
    let run = false;
    if(timer!==undefined && timer._idleTimeout>0) {
        clearTimeout(timer);
        run = true;
    } else {
        run = true;
    }
    if(run===true) {
        timer = setTimeout(() => {
            if(JSON.stringify(data).length>2) {
                if(config.system===undefined) config.system = {};
                if(config.log===undefined) config.log = {};
                if(config.system.readonly===true) {
                    exec('sudo mount -o remount,rw /', function(error, stdout, stderr) {
                        if(error) {
                            log(config.log.enable,"Could not open the system for write mode",config.log['error'],"Config");
                            return(false);
                        } else {
                            
                            fs.writeFile(path+'/config.json', JSON.stringify(data,null,2), function(err) {
                                if(err) return (false);
                                log(config.log.enable,"Config file saved",config.log['info'],"Config");
                                nibeEmit.emit('fault',{from:"Inställningar",message:'Inställningarna är sparade till SD-kort'});
                                exec('sudo mount -o remount,ro /', function(error, stdout, stderr) {
                                    if(error) {
                                        nibeEmit.emit('fault',{from:"Inställningar",message:'Kunde inte sätta läsbart läge på filsystemet.'});
                                        log(config.log.enable,"Could not set read-only mode.",config.log['error'],"Config");
                                        return(false);
                                    } else {
                                        console.log('Read only mode set.')

                                        return (true)
                                    }
                                })
                                
                            }); 
                        }
                    });
                } else {
                    exec('sudo mount -o remount,rw /', function(error, stdout, stderr) {
                        if(error) {
                            log(config.log.enable,"Could not open the system for write mode",config.log['error'],"Config");
                            return(false);
                        } else {
                            fs.writeFile(path+'/config.json', JSON.stringify(data,null,2), function(err) {
                                if(err) return (false);
                                nibeEmit.emit('fault',{from:"Inställningar",message:'Inställningarna är sparade till SD-kort'});
                                log(config.log.enable,"Config file saved",config.log['info'],"Config");
                                return (true)
                            }); 
                        }
                    });
                    
                }
                
            }
        }, 5000);
    }
}

let core;
const resetCore = () => {
    model = "";
    register = [];
    firmware = "";
}
const initiateCore = (serialPort,cb) => {
    if(config.log===undefined) config.log = {};
if(config.system.readonly===true) {
    exec('sudo mount -o remount,ro /', function(error, stdout, stderr) {
        if(error) {
            log(config.log.enable,"Could not set read-only mode at startup.",config.log['error'],"Startup");
            return(false);
        } else {
            console.log('Read only mode set.')
            return (true)
        }
    })
} else {
    exec('sudo mount -o remount,rw /', function(error, stdout, stderr) {
        if(error) {
            log(config.log.enable,"Could not set write mode at startup.",config.log['error'],"Startup");
            return(false);
        } else {
            return (true)
        }
    })
}
    startCore(serialPort).then(result => {
        core = result;
        
        core.on('message', (m) => {
            if(m.type=="data") {
                let n = m.data;
                announcment(m, (err,ready) => {
                    if(err) console.log(err);
                    if(ready===true) {
                        config.serial.port = serialPort;
                        cb(null,result);
                    } else {

                    }
                });
                decodeRMU(n);
                decodeMessage(n);
            } else if(m.type=="fault") {
                nibeEmit.emit('fault',m.data);
            } else if(m.type=="ack") {
                nibeEmit.emit("ACK_"+m.data.register,m.data.ack);
            } else if(m.type=="log") {
                if(config.log===undefined) {
                    config.log = {};
                    updateConfig(config);
                }
                log(config.log.enable,m.data,config.log[m.level],m.kind);
            }
          });
    });
}


const announcment = (msg,cb) => {
    const checkPump = (data,callback) => {
        let modelLength = data[4]+5;
        model = (Buffer.from(data).slice(8,modelLength).toString()).split(" ");
        firmware = (data[6]*256)+data[7];
        if(model[0]=="VVM") {
            model[0] = model[0]+model[1];
        }
        model = model[0].split("-");
        model = model[0];
        config.system.pump = model;
        config.system.firmware = firmware;
        callback(null);
        }
    if(model=="" && config.system.pump!==undefined && config.system.pump!=="" && config.system.firmware!==undefined && config.system.firmware!=="") {
        model = config.system.pump;
        firmware = config.system.firmware;
        let reg = require(pumpModel[model]);
        for (i = 0; i < reg.length; i = i + 1) {
            let found = false;
            for (j = 0; j < register.length; j = j + 1) {
                if(register[j].register===reg[i].register) {
                    found = true;
                }
            }
            if(found===false) {
                register.push(reg[i])
            }
        }
        cb(null,true)
        console.log(`Nibe ${model} connected`);
        console.log(`Firmware ${firmware}`);
        console.log(`Register is set. Length: ${register.length}`)
    } else if(msg.data[3]==109) {
        let index = register.findIndex(i => i.register == 45001);
        if(index!==-1) {
            reqData(45001).then(atad => {
                let data = Object.assign({}, atad);
                if(data!==undefined && data.raw_data===251) {
                    console.log('Resetting alarm.')
                    setData(45171,1);
                }
            },err => {
                
            });
        }
        
        //console.log(`Announcement message`);
        if(model=="") {
            checkPump(msg.data, function(err) { 
                if(err) throw err;
                let reg = require(pumpModel[model]);
                for (i = 0; i < reg.length; i = i + 1) {
                    let found = false;
                    for (j = 0; j < register.length; j = j + 1) {
                        if(register[j].register===reg[i].register) {
                            found = true;
                        }
                    }
                    if(found===false) {
                        register.push(reg[i])
                    }
                }
                cb(null,true)
                console.log(`Nibe ${model} connected`);
                console.log(`Firmware ${firmware}`);
                console.log(`Register is set. Length: ${register.length}`)
            });
        }
    } else if(msg.data[3]==98) {
        //log('info',msg.data)
        if(rmu['s'+((-24)+msg.data[2])]===undefined || rmu['s'+((-24)+msg.data[2])]===false) {
            rmu['s'+((-24)+msg.data[2])] = true;
            let reg = require(pumpModel['RMU40_S'+((-24)+msg.data[2])]);
            for (i = 0; i < reg.length; i = i + 1) {
                if(msg.rmu===true) { reg[i].mode = "R"; }
                let found = false;
                for (j = 0; j < register.length; j = j + 1) {
                    if(register[j].register===reg[i].register) {
                        found = true;
                    }
                }
                if(found===false) {
                    register.push(reg[i])
                }
            }
            if(msg.rmu===true) {
                console.log('RMU40 System '+((-24)+msg.data[2])+' connected (read-only mode)');
            } else {
                console.log('RMU40 System '+((-24)+msg.data[2])+' connected');
                // EMIT HERE
                nibeEmit.emit('rmu_ready','s'+((-24)+msg.data[2]));
            }
            console.log(`Register is set. Length: ${register.length}`)
            cb(null,false)

        }
    } else {
        cb(null,false)
    }
}
let getTimer = {};

async function reqData (address) {
    async function getDataPromise(address) {
        const promise = new Promise((resolve,reject) => {
        let index = register.findIndex(index => index.register == address);
        if(index!==-1) {
            getTimer[address] = setTimeout((address,index) => {
                getTimer[address] = setTimeout((address) => {
                    nibeEmit.removeAllListeners(address);
                    reject(new Error('No respond from register ('+address+')'));
                }, 30000, address);
                if(register[index]!==undefined) {
                    register[index].logset = false;
                    var data = [];
                    data[0] = 0xc0;
                    data[1] = 0x69;
                    data[2] = 0x02;
                    data[3] = (address & 0xFF);
                    data[4] = ((address >> 8) & 0xFF);
                    data[5] = Calc_CRC(data);
                    nibeEmit.removeAllListeners(address);
                    nibeEmit.once(address,(data) => {
                        clearTimeout(getTimer[data.register]);
                        resolve(data);
                    })
                    core.send({type:"reqData",data:data});
                } else {
                    reject(new Error('Register ('+address+') returned no data.'));
                }
                
            }, 7000, address,index);
            if(register[index].logset===undefined || register[index].logset===false) {
                var data = [];
                data[0] = 0xc0;
                data[1] = 0x69;
                data[2] = 0x02;
                data[3] = (address & 0xFF);
                data[4] = ((address >> 8) & 0xFF);
                data[5] = Calc_CRC(data);
                nibeEmit.once(address,(data) => {
                    clearTimeout(getTimer[data.register]);
                    resolve(data);
                })
                core.send({type:"reqData",data:data});
            } else {
                nibeEmit.once(address,(data) => {
                    clearTimeout(getTimer[data.register]);
                    resolve(data);
                })
            }
        } else {
            reject(new Error('Register ('+address+') not in database'));
        }
        });
        return promise;
    }
    const promise = new Promise((resolve,reject) => {
        if(core!==undefined && core.connected!==undefined && core.connected===true) {
            if(model.length!==0) {
                getDataPromise(address).then(result => {
                    resolve(result)
                },(error => {
                    reject(error)
                }));
            } else {
                reject(new Error('Heatpump is not ready yet.'))
            }
        } else {
            reject(new Error('Core is not started.'))
        }
    });
    return promise;
    
}


const setData = (address,value,cb=()=>{}) => {
    var output = setDataValue({register:address,value:value})
    if(output===-1) {
        let err = ('Register dont exist')
        return cb(err);
    } else if(output===-2) {
        let err = ('Register not writeable');
        return cb(err);
    }
    if(core!==undefined && core.connected!==undefined && core.connected===true) {
        if(output!==undefined) {
            nibeEmit.once("ACK_"+address,(result) => {
                cb(null,result);
            })
            if(address.toString().charAt(0)=="1") {
                core.send({type:"rmuSet",data:output});
            } else {
                core.send({type:"setData",data:output});
                reqData(address);
            }
            
        }
    } else {
        setTimeout((data,address) => {
            if(core!==undefined && core.connected!==undefined && core.connected===true) {
                if(data!==undefined) {
                    nibeEmit.once("ACK_"+address,(result) => {
                        cb(null,result);
                    })
                    if(address.toString().charAt(0)=="1") {
                        core.send({type:"rmuSet",data:data});
                    } else {
                        core.send({type:"setData",data:data});
                        reqData(address);
                    }
                }
            }
        }, 5000, output,address);
    }
}
function getData(address) {
    var item = register.find(item => item.register == address);
    if(item!==undefined) {
            var data = [];
            data[0] = 0xc0;
            data[1] = 0x69;
            data[2] = 0x02;
            data[3] = (address & 0xFF);
            data[4] = ((address >> 8) & 0xFF);
            data[5] = Calc_CRC(data);
            return(data);
    } else {
        console.log('Register('+address+') not in database');
        return;
    }
}
function setDataValue(incoming) {
    var item = register.find(item => item.register == incoming.register);
    if(item!==undefined) {
    var data = [];
    var rmu = {data:[],address:incoming.register,ackback:[]};
        if(item.mode=="R/W") {
            var min = Number(item.min);
            var max = Number(item.max);
            var corruptData;
            incoming.value = incoming.value*item.factor;
            if(min!==undefined && max!==undefined) {
                if(min!==0 || max!==0) {
                    if(incoming.value>max) {
                        incoming.value = max
                        corruptData = true;
                        nibeEmit.emit('fault',{from:"Skicka värde",message:'Data ('+incoming.value/item.factor+') utanför giltigt värde som får skickas.'});
                        log(config.log.enable,'Data ('+incoming.value/item.factor+') out of range, to register '+incoming.register,config.log['error'],"Data");
                    } else if(incoming.value<min) {
                        incoming.value = min;
                        corruptData = true;
                        nibeEmit.emit('fault',{from:"Skicka värde",message:'Data ('+incoming.value/item.factor+') utanför giltigt värde som får skickas.'});
                        log(config.log.enable,'Data ('+incoming.value/item.factor+') out of range, to register '+incoming.register,config.log['error'],"Data");
                    }
                }
            }
            if(item.register.charAt(0)=="1") {
                let len = 0x03;
                if(item.size=="s8" || item.size=="u8") {
                    len = 0x02;
                }
                rmu.data[0] = 0xc0;
                rmu.data[1] = 0x60;
                rmu.data[2] = len;
                rmu.data[3] = Number(item.register.charAt(3));
                if(item.size=="s8" || item.size=="u8") {
                    rmu.data[4] = (incoming.value & 0xFF);
                    rmu.data[5] = Calc_CRC(rmu.data);
                } else {
                    let value = incoming.value;
                    if(value>=32768) { value = value-7 } else { value = value+7 }
                    rmu.data[4] = (value & 0xFF);
                    rmu.data[5] = ((value >> 8) & 0xFF);
                    rmu.data[6] = Calc_CRC(rmu.data);
                } 
                rmu.ackback[0] = 92;
                rmu.ackback[1] = 0;
                rmu.ackback[2] = (Number(item.register.charAt(2))+25);
                rmu.ackback[3] = 96;
                rmu.ackback[4] = 6;
                rmu.ackback[5] = (incoming.register & 0xFF);
                rmu.ackback[6] = ((incoming.register >> 8) & 0xFF);
                rmu.ackback[7] = (incoming.value & 0xFF);
                rmu.ackback[8] = ((incoming.value >> 8) & 0xFF);
                rmu.ackback[9] = ((incoming.value >> 16) & 0xFF);
                rmu.ackback[10] = ((incoming.value >> 24) & 0xFF);
                rmu.ackback[11] = Calc_CRC(rmu.ackback);
            } else {
                data[0] = 0xc0;
                data[1] = 0x6b;
                data[2] = 0x06;
                data[3] = (incoming.register & 0xFF);
                data[4] = ((incoming.register >> 8) & 0xFF);
                data[5] = (incoming.value & 0xFF);
                data[6] = ((incoming.value >> 8) & 0xFF);
                data[7] = ((incoming.value >> 16) & 0xFF);
                data[8] = ((incoming.value >> 24) & 0xFF);
                data[9] = Calc_CRC(data);
            }
            if(corruptData===undefined) {
                log(config.log.enable,`Sending data: ${incoming.register}, ${incoming.value}, ${JSON.stringify(data)}`,config.log['info'],"Data");
                if(data.length===0) {
                    return rmu;
                } else {
                    return data;
                }
            } else {

            }
        } else {
            nibeEmit.emit('fault',{from:"Skicka värde",message:'Register('+incoming.register+') går ej att skriva till.'});
            log(config.log.enable,'Register('+incoming.register+') not allowed write access',config.log['error'],"Data");
            return -2;
        }
    } else {
        nibeEmit.emit('fault',{from:"Skicka värde",message:'Register('+incoming.register+') finns ej i databasen.'});
        log(config.log.enable,'Register('+incoming.register+') not in database',config.log['error'],"Data");
        return -1;
    }
}
function Calc_CRC(data) {
    var calc_checksum = 0;
    for (var i = 0; i < (data[2] + 5); i++)
        calc_checksum ^= data[i];
    return calc_checksum;
}
const addRegister = (address,logset=false) => {
    if(register.length!==0)  {
        let index = register.findIndex(index => index.register == address);
        if(index===-1) {
            return;
        };
        if(config.registers===undefined) {
            config.registers = [];
            updateConfig(config)
        }
        register[index].logset = logset;
        let confIndex = config.registers.findIndex(confIndex => confIndex == address);
        if(confIndex===-1) {
            log(config.log.enable,`Adding register ${address}`,config.log['info'],"Register");
            config.registers.push(register[index].register);
            if(logset===false) {
                addRegular(address);
            }
            updateConfig(config)
        }
    }
    }
function removeRegister(address) {
    if(register!==[] && register.length>1)  {
    let index = register.findIndex(index => index.register == address);
    if(index===-1) {
        return;
    };
    if(config.registers===undefined) {
        config.registers = [];
        updateConfig(config)
    }
    let confIndex = config.registers.findIndex(confIndex => confIndex == address);
    if(confIndex!==-1) {
        config.registers.splice(confIndex,1);
        removeMQTTdiscovery(register[index]);
        updateConfig(config)
        removeRegular(address);
    }
  }
  }

const decodeRMU = (buf) => {
    if((buf[2]==0x19 || buf[2]==0x1A || buf[2]==0x1B || buf[2]==0x1C) && buf[3]===98) {
        let data = [];
        let bitData = buf[21];
        let r = {};
        if(bitData>=128) { bitData = bitData-128; } else {  }
        if(bitData>=64) { bitData = bitData-64; }
        if(bitData>=32) { bitData = bitData-32; r[47393] = 1;} else { r[47393] = 0; } // Inside S2 activated
        if(bitData>=16) { bitData = bitData-16; r[47394] = 1;} else { r[47394] = 0; } // Inside S1 activated
        if(bitData>=8) { bitData = bitData-8; }
        if(bitData>=4) { bitData = bitData-4; }
        if(bitData>=2) { bitData = bitData-2; }
        if(bitData>=1) { bitData = bitData-1; }
        if(r[47394]===1) { r[47398] = buf[9]+50 } else { r[47011] = buf[9] };
        if(r[47393]===1) { r[47397] = buf[10]+50 } else { r[47010] = buf[10] };

        r[40004] = (buf[6] & 0xFF) << 8 | (buf[5] & 0xFF);
        if(r[40004]>=32768) { r[40004] = r[40004]+5 } else { r[40004] = r[40004]-5 }
        r[40013] = ((buf[8] & 0xFF) << 8 | (buf[7] & 0xFF))-5;
        r[40058] = ((buf[14] & 0xFF) << 8 | (buf[13] & 0xFF))-5;
        data[0] = 92;
        data[1] = 0;
        data[2] = buf[2];
        data[3] = buf[3];
        data[4] = data.length;
        data[5] = (40004 & 0xFF);
        data[6] = ((40004 >> 8) & 0xFF);
        data[7] = (r[40004] & 0xFF);
        data[8] = ((r[40004] >> 8) & 0xFF);
        data[9] = (40013 & 0xFF);
        data[10] = ((40013 >> 8) & 0xFF);
        data[11] = (r[40013] & 0xFF);
        data[12] = ((r[40013] >> 8) & 0xFF);
        data[13] = (40058-buf[2] & 0xFF);
        data[14] = ((40058-buf[2] >> 8) & 0xFF);
        data[15] = (r[40058] & 0xFF);
        data[16] = ((r[40058] >> 8) & 0xFF);
        if(r[47394]===1) { data[17] = (47398 & 0xFF); } else { data[17] = (47011 & 0xFF); }
        if(r[47394]===1) { data[18] = ((47398 >> 8) & 0xFF); } else { data[18] = ((47011 >> 8) & 0xFF); }
        if(r[47394]===1) { data[19] = r[47398]; } else { data[19] = r[47011]; }
        data[20] = 0;
        if(r[47393]===1) { data[21] = (47397 & 0xFF); } else { data[21] = (47010 & 0xFF); }
        if(r[47393]===1) { data[22] = ((47397 >> 8) & 0xFF); } else { data[22] = ((47010 >> 8) & 0xFF); }
        if(r[47393]===1) { data[23] = r[47397]; } else { data[23] = r[47010]; }
        data[24] = 0;
        data[25] = (47394 & 0xFF);
        data[26] = ((47394 >> 8) & 0xFF);
        data[27] = r[47394];
        data[28] = 0;
        data[29] = (47393 & 0xFF);
        data[30] = ((47393 >> 8) & 0xFF);
        data[31] = r[47393];
        data[32] = 0;
        data[33] = (10001 & 0xFF);
        data[34] = ((10001 >> 8) & 0xFF);
        data[35] = buf[24];
        data[36] = 0;
        let fan_address = Number(`10${buf[2]-25}10`);
        data[37] = (fan_address & 0xFF);
        data[38] = ((fan_address >> 8) & 0xFF);
        data[39] = buf[18];
        data[40] = 0;
        let hw_address = Number(`10${buf[2]-25}20`);
        data[41] = (hw_address & 0xFF);
        data[42] = ((hw_address >> 8) & 0xFF);
        data[43] = buf[15];
        data[44] = 0;
        data[45] = (10011 & 0xFF);
        data[46] = ((10011 >> 8) & 0xFF);
        if(buf[18]===0) { data[47] = 0; } else { data[47] = buf[26]; }
        data[48] = 0;
        data[49] = (10012 & 0xFF);
        data[50] = ((10012 >> 8) & 0xFF);
        if(buf[18]===0) { data[51] = 0; } else { data[51] = buf[27]; }
        data[52] = 0;
        data[53] = (10021 & 0xFF);
        data[54] = ((10021 >> 8) & 0xFF);
        data[55] = buf[16];
        data[56] = 0;
        data[57] = (10022 & 0xFF);
        data[58] = ((10022 >> 8) & 0xFF);
        data[59] = buf[17];
        data[60] = 0;
        data[4] = data.length;
        decodeMessage(data);
        /*
        if(i===26) address = 10011; 
        if(i===27) address = 10012;*/
    }
}
const addRegular = (address) => {
    if(core!==undefined && core.connected!==undefined && core.connected===true) {
    let regIndex = register.findIndex(regIndex => regIndex.register == address);
    if(register[regIndex]===undefined) return;
    if(register[regIndex]===-1 || (register[regIndex].logset!==undefined && register[regIndex].logset===true)) return;
    let index = regQueue.findIndex(index => index == getData(address));
    if(index===-1) {
        if(address.toString().charAt(0)=="1") {
            log(config.log.enable,`RMU register not added to regular list, Register: ${address}`,config.log['debug'],"Register");
        } else {
            // Req data change
            reqData(address);
            regQueue.push(getData(address));
            log(config.log.enable,`Regular register added (${address})`,config.log['info'],"Register");
            core.send({type:"regRegister",data:regQueue});
        }
        
        //
        
    }
} else {
    setTimeout((data) => {
        addRegular(data)
    }, 10000, address);
}
}
const removeRegular = (address) => {
    var stringed = getData(address).toString();
    if(core!==undefined && core.connected!==undefined && core.connected===true) {
    for (i = 0; i < regQueue.length; i = i + 1) {
        let value = regQueue[i].toString();
        if(stringed===value) {
            regQueue.splice(i,1)
            log(config.log.enable,`Regular register removed (${address})`,config.log['info'],"Register");
            core.send({type:"regRegister",data:regQueue});
        }
    }
} else {
    setTimeout((data) => {
        removeRegular(data);
    }, 10000, address);
}
}
const decodeMessage = (buf) => {

    if(register.length===0) return;
    if(buf[3]!==104 && buf[3]!==106 && buf[3]!==98 && buf[3]!==96) return;
    var data;
    let timeNow = Date.now();
    for (i = 5; i < buf.length-3; i = i + 1) {
        var address = (buf[i + 1] * 256 + buf[i]);
        var index = register.findIndex(index => index.register == address);
        if (index!==-1) {
            if (buf[3]===104 || buf[3]===98 || buf[3]===96) {
                addRegister(address,true)
            } else {
                if(register[index].logset===true) {
                    removeRegular(address);
                }
            } 
            //log('info',`Register: ${register[index].register} found at index ${index}, ${JSON.stringify(register[index])}`)
            if (register[index].size == "s32") {
                if (buf[3]===104) {
                    data = buf[i + 2] | buf[i + 3]<<8 | buf[i + 6] <<16 | buf[i + 7] <<24;
                    if (data >= 2147483647) {
                        data = (data - 4294967294);
                    }
                    i = i + 7;
                }
                else {
                    data = buf[i + 4] | buf[i + 5] <<8 | buf[i + 2] <<16 | buf[i + 3] <<24;
                    //data = buf[i + 2] | buf[i + 3] <<8 | buf[i + 4] <<16 | buf[i + 5] <<24;
                    if (data >= 2147483647) {
                        data = (data - 4294967294);
                    }
                    i = i + 5;
                }
            }
            else if (register[index].size == "s16") {
                data = (buf[i + 3] & 0xFF) << 8 | (buf[i + 2] & 0xFF);
                i = i + 3;
                if (data >= 32768) {
                    data = data - 65536;
                }          
            }
            else if (register[index].size == "s8") {
                data = (buf[i + 3] & 0xFF) << 8 | (buf[i + 2] & 0xFF);
                i = i + 3;
                if (data > 128 && data < 32768) {
                    data = data - 256;
                } else if (data >= 32768) {
                    data = data - 65536;
                }
            }
            else if (register[index].size == "u32") {
                if (buf[3]===104) {
                    data = buf[i + 2] | buf[i + 3]<<8 | buf[i + 6] <<16 | buf[i + 7] <<24;
                    data = data>>>0;
                    i = i + 7;
                }
                else {
                    data = (buf[i + 4] & 0xFF) | (buf[i + 5] & 0xFF) << 8 | (buf[i + 2] & 0xFF) << 16 | (buf[i + 3] & 0xFF) << 24;
                    //data = (buf[i + 2] & 0xFF) | (buf[i + 3] & 0xFF) << 8 | (buf[i + 4] & 0xFF) << 16 | (buf[i + 5] & 0xFF) << 24;
                    //data = (buf[i + 2] & 0xFF) << 16 | (buf[i + 3] & 0xFF) << 24 | (buf[i + 4] & 0xFF) | (buf[i + 5] & 0xFF) << 8; Old way
                    data = data>>>0;
                    i = i + 5;
                }
            }
            else if (register[index].size == "u16") {
                data = (buf[i + 3] & 0xFF) << 8 | (buf[i + 2] & 0xFF);
                i = i + 3;
            }
            else if (register[index].size == "u8") {
                    data = (buf[i + 3] & 0xFF) << 8 | (buf[i + 2] & 0xFF);
                    i = i + 3;
            }
            else {
                i = i + 3;
            }
            data = data / register[index].factor;
            var map = register[index].map;
            var valueMap;
            if (map !== undefined) {
                for (y = 0; y < map.length; y = y + 1) {
                    var mapValue = Object.values(map[y]);
                    if (Number(Object.keys(map[y])) == data) {
                        valueMap = mapValue[0];
                        
                    }
                }
            }
            let corruptData = false;
            let min = Number(register[index].min);
            let max = Number(register[index].max);
            if (min !== undefined && max !== undefined) {
                if (min !== 0 || max !== 0) {
                    if ((data > max / register[index].factor) || (data < min / register[index].factor)) {
                        nibeEmit.emit('fault',{from:"Datahantering",message:'Korrupt värde från register '+address+", Värde: "+data+register[index].unit});
                        log(config.log.enable,register[index].register+", "+register[index].titel+": "+register[index].data+" "+register[index].unit,config.log['error'],"CORRUPT");
                        corruptData = true;
                    }
                }
            }
            if(corruptData===false) {
                if(valueMap!==undefined) {
                    register[index].data = valueMap;
                    valueMap = undefined;
                } else {
                register[index].data = data;
                }
                register[index].raw_data = data;
                register[index].timestamp = timeNow;
                nibeEmit.emit('data',register[index]);
                
                nibeEmit.emit(address,register[index]);
                addMQTTdiscovery(register[index]);
                publishMQTT(config.mqtt.topic+address+"/json",JSON.stringify(register[index]))
                publishMQTT(config.mqtt.topic+address+"/raw",register[index].raw_data)
                publishMQTT(config.mqtt.topic+address,register[index].data)
                log(config.log.enable,JSON.stringify(register[index]),config.log['debug'],"Data");
                log(config.log.enable,register[index].register+", "+register[index].titel+": "+register[index].data+" "+register[index].unit,config.log['info'],"Data");
            }
            address = undefined;
        } else {
            i = i + 3;
        }
    }
    
    if(regQueue.length===0 && buf[4]===80) {
        for (var i = 0; i < config.registers.length; i++) {
            addRegular(config.registers[i]);
        }
    }
}
const getConfig = () => {
    //nibeEmit.emit('config',config);
    return config;
}
const getRegister = () => {
    return register;
}
function startMQTT(host,port,user,pass) {
    return new Promise(function(resolve, reject) {
    const mqtt = require('mqtt');
    if(user=="") user = undefined;
    if(pass=="") pass = undefined;
    var mqtt_host = host;
    var mqtt_port = port;
    var mqtt_subscribe_topic = 'nibe';
    var mqtt_publish_topic = 'nibe';
    var mqtt_username = user;
    var mqtt_password = pass;
    var mqtt_client_id = 'nibe_' + Math.random().toString(16).substr(2, 8);
    // MQTT CLIENT OPTIONS
    var mqtt_Options = {
        port: mqtt_port,
        keepalive: 60,
        clientId: mqtt_client_id,
        protocolId: 'MQTT',
        //protocolVersion: 4,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30 * 1000,
        rejectUnauthorized: false,
        username: mqtt_username, //the username required by your broker, if any
        password: mqtt_password, //the password required by your broker, if any
        will: { topic: mqtt_publish_topic, payload: mqtt_client_id + ' disconnected', qos: 1, retain: false }
    };
    mqtt_client = mqtt.connect('mqtt://' + mqtt_host, mqtt_Options);
    
    mqtt_client.on('connect', function () {
        nibeEmit.emit('fault',{from:"MQTT",message:'MQTT Brokern är ansluten'});
        console.log("MQTT Broker is connected.")
        resolve(mqtt_client);
    });
    mqtt_client.on('close',function(){
        nibeEmit.emit('fault',{from:"MQTT",message:'MQTT Brokern är frånkopplad'});
        console.log("MQTT Broker is disconnected.")
        reject(mqtt_client);
      })
      mqtt_client.on('error',function(){
        nibeEmit.emit('fault',{from:"MQTT",message:'Kunde inte ansluta till MQTT Brokern'});
        console.log("Could not connect to MQTT broker")
        reject(mqtt_client);
      })
})
}
//
async function addMQTTdiscovery(data) {
    if(config.mqtt===undefined) {
        config.mqtt = {};
        updateConfig(config);
    }
    if(config.mqtt.discovery===true) {
        let i = mqttDiscoverySensors.findIndex(i => i == data.register);
        let j = config.registers.findIndex(j => j == data.register);
        if(i===-1 && j!==-1) {
            let result = await formatMQTTdiscovery(data)
            let topic = 'homeassistant/'+result.component+'/'+data.register+'/config'
            let message = JSON.stringify({"name": "Nibe "+data.titel,"device_class":result.type,"unit_of_measurement":result.unit,"state_topic":result.topic});
            if(result.component!==undefined) {
                publishMQTTpromise(topic,message,true).then(result => {
                    log(config.log.enable,`Adding MQTT Discovery object, register ${data.register}`,config.log['info'],"MQTT");
                    mqttDiscoverySensors.push(data.register);
                },(error => {

                }));
            }
            
        } else {
    
        }
    } else {
        removeMQTTdiscovery(data);
    }
}
async function removeMQTTdiscovery(data) {
    let i = mqttDiscoverySensors.findIndex(i => i == data.register);
    if(i!==-1) {
        let result = await formatMQTTdiscovery(data)
        let topic = 'homeassistant/'+result.component+'/'+data.register+'/config'
        let message = "";
        publishMQTTpromise(topic,message,true).then(result => {
            let i = mqttDiscoverySensors.findIndex(i => i == data.register);
            if(i!==-1) mqttDiscoverySensors.splice(i,1);
            log(config.log.enable,`Removed MQTT Discovery object, register ${data.register}`,config.log['info'],"MQTT");
        },(error => {

        }));
    }
}
function formatMQTTdiscovery(data) {
    const promise = new Promise((resolve,reject) => {
        let result = {}
        result.unit = data.unit;
        result.component = "sensor";
        result.topic = config.mqtt.topic+data.register;
        if(result.unit=="°C") {
            result.type = "temperature";
        } else if(result.unit=="A") {
            result.type = "power";
        } else if(result.unit=="kW") {
            result.type = "power";
        } else if(result.unit=="Hz" || result.unit=="%") {
            result.type = undefined;
        } else if(result.unit=="") {
            result.type = undefined;
            result.unit = undefined;
        } else {
            
        }
        resolve(result)
    });
    return promise;
}
const handleMQTT = (on,host,port,user,pass,cb) => {
    if(on===undefined || on=="" || on=="false" || on===false) {
        if(mqtt_client!==undefined && mqtt_client.connected===true) {
            mqtt_client.end();
            console.log('Terminated MQTT session');
            return cb(null,false)
        } else {
            return cb(null,false)
        }
        
    };
    if(host===undefined || host=="") return cb(err = new Error('No MQTT host defined'));
    if(port===undefined || port=="") return cb(err = new Error('No MQTT port defined'));
    if(mqtt_client===undefined || mqtt_client.connected!==true) {
    startMQTT(host,port,user,pass).then(result => {
        config.mqtt.host = host;
        config.mqtt.port = port;
        config.mqtt.enable = true;
        result.subscribe(config.mqtt.topic+'#');
        mqtt_client = result;
        updateSensors();
        if(mqtt_client!==undefined && mqtt_client.connected===true) {
            mqtt_client.on('message', function (topic, message) {
                let subTopic = config.mqtt.topic;
                let subscribed = false;
                for (const arr of mqtt_subcribers) {
                    if(topic===arr) {
                        let save = topic.replace(/\//g,"_");
                        let messageString = message.toString().replace(/\,/g,".");
                        if(mqttData[save]===undefined) mqttData[save] = {};
                        mqttData[save].data = Number(messageString);
                        mqttData[save].raw_data = Number(messageString);
                        mqttData[save].register = save;
                        mqttData[save].timestamp = Date.now();
                        nibeEmit.emit('mqttData',mqttData[save]);
                        subscribed = true;
                    }
                }
                if(subscribed===false && topic.includes(subTopic)) {
                    topic = topic.replace(config.mqtt.topic,'')
                    topic = topic.split('/');
                    if(topic.includes('set')) {
                        setData(topic[0],message,(err,result) => {
                            if(err) return console.log(err);
                        });
                    } else if(topic.includes('get')) {
                        reqData(topic[0]);
                    } else if(topic.includes('add')) {
                        addRegister(topic[0])
                    } else if(topic.includes('remove')) {
                        removeRegister(topic[0])
                    }
                }
                //console.log('Incoming MQTT message:', topic, message.toString());
            });
        }
        cb(null,true);
    },(reject => {
        if(mqtt_client!==undefined) {
            mqtt_client.end();
        }
        console.log('Terminated MQTT session');
        return cb(null,false)
    }));
} else {
    return cb(null,true)
}

}
const publishMQTT = (topic,message,retain=false) => {
    if(mqtt_client!==undefined) {
        if(mqtt_client.connected===true && mqtt_client.disconnecting!==true) {
            mqtt_client.publish(topic, message.toString(),{retain:retain});
        }
    }
    
}
const publishMQTTpromise = (topic,message,retain=false) => {
    const promise = new Promise((resolve,reject) => {
    if(mqtt_client!==undefined) {
        if(mqtt_client.connected===true && mqtt_client.disconnecting!==true) {
            mqtt_client.publish(topic, message.toString(),{retain:retain});
            resolve(true);
        } else {
            reject(false);
        }
    } else {
        reject(false);
    }
});
return promise;
}
const redOn = (enable=true) => {
    core.send({type:"red",data:enable});
}
const updateSensors = () => {
    if(config.home===undefined) config.home = {};
	if(config.home.inside_sensors===undefined) config.home.inside_sensors = [];
	updateConfig(config);
    for (const arr of config.home.inside_sensors) {
        if(arr.source=="mqtt") {
            let found = false;
            for (i = 0; i < mqtt_subcribers.length; i = i + 1) {
                if(mqtt_subcribers[i]===arr.register) found = true;
            }
            if(found===false) {
                mqtt_subcribers.push(arr.register);
            }
        }
    }
    if(mqtt_client!==undefined && mqtt_client.connected===true) {
        for (const arr of mqtt_subcribers) {
            mqtt_client.subscribe(arr);
            nibeEmit.emit('updateSensor',true);
        }
    }
}
const addSensor = (config) => {
    updateConfig(config);
    updateSensors();
}
const removeSensor = (data) => {
    if(config.home.inside_sensors!==undefined) {
        let i = config.home.inside_sensors.findIndex(i => i.register == data.register);
        if(i!==-1) {
            config.home.inside_sensors.splice(i,1);
            i = mqtt_subcribers.findIndex(i => i == data);
            mqtt_subcribers.splice(i,1);
            let mqttRemove = data.register.replace(/\//g,"_");
            delete mqttData[mqttRemove];
            updateConfig(config);
            mqtt_client.unsubscribe(data.register);
            nibeEmit.emit('updateSensor',true);
        }
    }
}
const getMQTTData = (data) => {
    const promise = new Promise((resolve,reject) => {
        if(data!==undefined) data = data.replace(/\//g,"_");
    if(mqttData[data]!==undefined) {
        resolve(mqttData[data]);
    } else {
        reject({})
    }
    });
    return promise;
}
const writeLog = (data,plugin,level) => {
    let from = "System";
    if(plugin=="fan") from = "Automatiskt luftflöde";
    if(plugin=="hw") from = "Varmvattenreglering";
    if(plugin=="weather") from = "Prognosreglering";
    if(plugin=="diagnostic") from = "Diagnostik";
    if(level=="info" || level=="error") {
        nibeEmit.emit('fault',{from:from,message:data});
    }
    if(config.log[plugin]!==undefined) {
        log(config.log.enable,data,config.log[plugin],from);
    }
    
    return;
}
module.exports = {
    reqData:reqData,
    setData:setData,
    addRegister:addRegister,
    removeRegister:removeRegister,
    initiateCore:initiateCore,
    stopCore:stopCore,
    resetCore:resetCore,
    data:nibeEmit,
    getConfig:getConfig,
    setConfig:updateConfig,
    getRegister:getRegister,
    handleMQTT:handleMQTT,
    redOn:redOn,
    addSensor: addSensor,
    removeSensor: removeSensor,
    getMQTTData:getMQTTData,
    log:writeLog,
    saveGraph:saveGraph,
    requireGraph:requireGraph
}