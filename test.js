var spawn = require('child_process').spawn;
const child = spawn('node', ['./lib/saveGraph.js'], {
    env: { data: "Hello" },
    detached: true,
    stdio: 'inherit'
  });
  child.unref();