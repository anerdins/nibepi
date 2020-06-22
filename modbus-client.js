// create an empty modbus client
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();
const getQueue = [];

process.on('message', (m) => {
    if(m.start===true) {
        // open connection to a tcp line
        client.connectTCP(m.host, { port: m.port });
        client.setID(1);
        setInterval(function() {
            let register = 1
            if(client!==undefined) {
                client.readInputRegisters(register, 1, function(err, data) {
                    if(data!==undefined) {
                        console.log("3000"+register+": "+data.data);
                        if(process.connected===true) {
                            process.send({type:"data",data:{register:"3000"+register,data:data.data}});
                            process.send({type:"log",data:data.data,level:"debug",kind:"OK"});
                        }
                    }
                    
                });
            }
            
        }, 2000);
    } else if(m.type=="reqData") {
        //getQueue.unshift(m.data);
    } else if(m.type=="setData") {
        //sendQueue.push(m.data);
    } else if(m.type=="rmuSet") {
        //rmuQueue.push(m.data);
    } else if(m.type=="regRegister") {
        //regQueue = m.data;
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







