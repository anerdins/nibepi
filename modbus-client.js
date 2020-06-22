// create an empty modbus client
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();
const getQueue = [];
var red = false;
process.on('message', (m) => {
    if(m.start===true) {
        // open connection to a tcp line
        client.connectTCP(m.host, { port: m.port });
        client.setID(1);
        client._port._client.on('initialized',(data) => {
            console.log(data)
        })
        client._port._client.on('error',(data) => {
            console.log(data)
        })
        setTimeout(() => {
            process.send({type:"started",data:true});
            console.log(JSON.stringify(client,null,2))
        }, 2000);
        
    } else if(m.type=="reqData") {
        if(m.data.toString().charAt(0)=="3") {
            let register = Number(m.data)-30000;
            // Get input register
            if(client!==undefined) {
                client.readInputRegisters(register, 1, function(err, data) {
                    if(data!==undefined) {
                        if(process.connected===true) {
                            process.send({type:"data",data:{register:m.data,data:data.data}});
                            //process.send({type:"log",data:data.data,level:"debug",kind:"OK"});
                        }
                    }
                });
            }
        } else if(m.data.toString().charAt(0)=="4") {
            // Get holding register
            let register = Number(m.data)-40000;
            if(client!==undefined) {
                client.readHoldingRegisters(register, 1, function(err, data) {
                    if(data!==undefined) {
                        if(process.connected===true) {
                            process.send({type:"data",data:{register:m.data,data:data.data}});
                            //process.send({type:"log",data:data.data,level:"debug",kind:"OK"});
                        }
                    }
                });
            }
        }
    } else if(m.type=="setData") {
        //sendQueue.push(m.data);
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







