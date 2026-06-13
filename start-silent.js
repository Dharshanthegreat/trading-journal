import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logFile = join(__dirname, 'server-background.log');
const out = fs.openSync(logFile, 'a');
const err = fs.openSync(logFile, 'a');

// Spawn npm run dev with shell: true to correctly resolve npm on Windows
const child = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  detached: true,
  shell: true,
  stdio: ['ignore', out, err]
});

child.unref();
console.log('Trading Journal successfully launched in the background!');
process.exit(0);
