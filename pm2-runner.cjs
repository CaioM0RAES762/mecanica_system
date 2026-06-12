const { spawn } = require('child_process');
const path = require('path');

const app = process.env.PM2_APP;
const cwd = path.join(__dirname, 'apps', app);

const proc = spawn('pnpm', ['dev'], {
  stdio: 'inherit',
  windowsHide: true,
  cwd,
  shell: false,
});

proc.on('exit', (code) => process.exit(code || 0));
