const { spawn } = require('child_process');
const path = require('path');

const app = process.env.PM2_APP;
const cwd = path.join(__dirname, 'apps', app);

let command;
let args;

if (app === 'api') {
  command = process.execPath;
  args = [path.join(cwd, 'dist', 'index.js')];
} else if (app === 'web') {
  command = process.execPath;
  args = [require.resolve('next/dist/bin/next', { paths: [cwd] }), 'start'];
} else {
  throw new Error(`Unknown PM2_APP: ${app}`);
}

const proc = spawn(command, args, {
  stdio: 'inherit',
  windowsHide: true,
  cwd,
});

proc.on('exit', (code) => process.exit(code || 0));
