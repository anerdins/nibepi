var fs = require('fs');
let writer = fs.createWriteStream('/tmp/nibepi.log');
const log = (enable,data,enabled,kind) => {
    if(enable!==undefined && enable===true && enabled!==undefined && enabled===true) {
        var tzoffset = (new Date()).getTimezoneOffset() * 60000;
        var time = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1).replace('T',' ');
        writer.write(`${time} ${kind}: [${data}]\n`);
}
}

module.exports = log;
