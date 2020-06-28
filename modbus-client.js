// create an empty modbus client
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();
const getQueue = [];
var regQueue = [30001];
var red = false;
var getTimer = {};
async function writeData(item) {
    let address = item.register;
    const promise = new Promise((resolve,reject) => {
    let register = Number(address)-40000;
    let size = 0xFFFF;
    if(item.size=="u8" || item.size=="s8") size = 0xFF;
    if(item.size=="u32" || item.size=="s32") size = 0xFFFFFFFF;
    
    client.writeRegisters(register, [item.data,size])
        .then(data => {
            console.log(data);
            resolve(data)
        });
    }).catch((err => {
        reject(err)
    }));
    return promise;
}
async function requestData(address) {
    const promise = new Promise((resolve,reject) => {
        if(address.toString().charAt(0)=="3") {
            let register = Number(address)-30000;
            // Get input register
            if(client!==undefined) {
                getTimer[address] = setTimeout((address) => {
                    reject(new Error('No respond from register ('+address+')'));
                }, 5000, address);
                client.readInputRegisters(register, 1, function(err, data) {
                    clearTimeout(getTimer[address]);
                    if(err) {
                        reject(new Error("Could not read data from register"))
                    } else if(data!==undefined) {
                        if(process.connected===true) {
                            process.send({type:"data",data:{register:address,data:data.data}});
                            resolve(data.data)
                            //process.send({type:"log",data:data.data,level:"debug",kind:"OK"});
                        }
                    } else {
                        reject(new Error("Could not read data from register"))
                    }
                });
            }
        } else if(address.toString().charAt(0)=="4") {
            // Get holding register
            let register = Number(address)-40000;
            if(client!==undefined) {
                client.readHoldingRegisters(register, 1, function(err, data) {
                    if(err) {
                        reject(new Error("Could not read data from register"))
                    } else if(data!==undefined) {
                        if(process.connected===true) {
                            process.send({type:"data",data:{register:address,data:data.data}});
                            resolve(data.data)
                            //process.send({type:"log",data:data.data,level:"debug",kind:"OK"});
                        }
                    } else {
                        reject(new Error("Could not read data from register"))
                    }
                });
            }
        }
        });
        return promise;
    
}
process.on('message', (m) => {
    if(m.start===true) {
        // open connection to a tcp line
        client.connectTCP(m.host, { port: m.port });
        client.setID(1);
        
        setTimeout(async () => {
            process.send({type:"started",data:true});
            for( var i = 0; i < regQueue.length; i++){
                if(getQueue!==undefined && getQueue.length!==0) {
                    var lastMsg = getQueue.pop();
                    await requestData(lastMsg);
                    i--;
                } else {
                    await requestData(regQueue[i]);
                }
                if(i===regQueue.length-1) i=-1;
            }
        }, 2000);
        
    } else if(m.type=="reqData") {
        getQueue.unshift(m.data);
    } else if(m.type=="regRegister") {
        regQueue = m.data;
    } else if(m.type=="setData") {
        let item = m.data;
        writeData(item)
            .then(data => {
                if(process.connected===true) {
                    process.send({type:"ack",data:{register:item.register,ack:true}});
                }
            }).catch(err => {
                if(process.connected===true) {
                    process.send({type:"ack",data:{register:item.register,ack:false}});
                }
            })
    } else if(m.type=="red") {
        //red = m.data;
    }
  });
  process.on('disconnect', (m) => {
      if(red===false) {
        console.log('Shutting down the core.')
        process.exit(99);
      }
    
  });







