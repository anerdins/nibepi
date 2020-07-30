let path = process.env.path;
let exec = require('child_process').exec;
let config = JSON.parse(process.env.config);
process.on('message', (m) => {
    console.log('Hello')
    let data = m;
    for (var property in data) {
        if (data.hasOwnProperty(property)) {
            for (var object in data[property]) {
                if (data[property].hasOwnProperty(object)) {
                    if(data[property][object]!==undefined && data[property][object].length>5000) {
                        let len = data[property][object].length-5000;
                        data[property][object].splice(0,len)
                    }
                }
            }
        }
    }
    
            if(JSON.stringify(data).length>2) {
                if(config.system===undefined) config.system = {};
                if(config.log===undefined) config.log = {};
                if(config.system.readonly===true) {
                    exec('sudo mount -o remount,rw /', function(error, stdout, stderr) {
                        if(error) {
                            //log(config.log.enable,"Could not open the system for write mode",config.log['error'],"Config");
                            return(false);
                        } else {
                            
                            fs.writeFile(path+'/graph.json', JSON.stringify(data,null,2), function(err) {
                                if(err) return (false);
                                //log(config.log.enable,"Graphs saved",config.log['info'],"Graph");
                                //nibeEmit.emit('fault',{from:"Grafer",message:'Graferna är sparade till SD-kort'});
                                exec('sudo mount -o remount,ro /', function(error, stdout, stderr) {
                                    if(error) {
                                        //nibeEmit.emit('fault',{from:"Grafer",message:'Kunde inte sätta läsbart läge på filsystemet.'});
                                        //log(config.log.enable,"Could not set read-only mode.",config.log['error'],"Graph");
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
                            //log(config.log.enable,"Could not open the system for write mode",config.log['error'],"Config");
                            return(false);
                        } else {
                            fs.writeFile(path+'/graph.json', JSON.stringify(data,null,2), function(err) {
                                if(err) return (false);
                                //nibeEmit.emit('fault',{from:"Grafer",message:'Graferna är sparade till SD-kort'});
                                //log(config.log.enable,"Config file saved",config.log['info'],"Config");
                                return (true)
                            }); 
                        }
                    });
                    
                }
                
            }
            process.exit(99);
});
