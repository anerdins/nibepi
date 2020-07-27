// create an empty modbus client
var Modbus = require("modbus-serial");
var vector = {
    getInputRegister: function(addr, unitID) {
        // Synchronous handling
        return 185;
    },
    getHoldingRegister: function(addr, unitID, callback) {
        // Asynchronous handling (with callback)

        setTimeout(function() {
            // callback = function(err, value)
            callback(null, 285);
        }, 10);
    },
    getCoil: function(addr, unitID) {
        // Asynchronous handling (with Promises, async/await supported)
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve((addr % 2) === 0);
            }, 10);
        });
    },
    setRegister: function(addr, value, unitID) {
        // Asynchronous handling supported also here
        console.log("set register", addr, value, unitID);
        return;
    },
    setCoil: function(addr, value, unitID) {
        // Asynchronous handling supported also here
        console.log("set coil", addr, value, unitID);
        return;
    },
    readDeviceIdentification: function(addr) {
        return {
            0x00: "MyVendorName",
            0x01: "MyProductCode",
            0x02: "MyMajorMinorRevision",
            0x05: "MyModelName",
            0x97: "MyExtendedObject1",
            0xAB: "MyExtendedObject2"
        };
    }
};
 
// set the server to answer for modbus requests
console.log("ModbusTCP listening on modbus://0.0.0.0:8502");
var serverTCP = new Modbus.ServerTCP(vector, { host: "0.0.0.0", port: 8502, debug: true, unitID: 1 });
 
serverTCP.on("socketError", function(err){
    // Handle socket error if needed, can be ignored
    console.error(err);
});