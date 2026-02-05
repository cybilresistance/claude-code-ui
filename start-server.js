#!/usr/bin/env node

import { spawn } from 'child_process';
import { which } from 'child_process';
import { promisify } from 'util';

const whichAsync = promisify(which);

async function checkPM2Available() {
  try {
    await whichAsync('pm2');
    return true;
  } catch (error) {
    return false;
  }
}

async function startServer() {
  const pm2Available = await checkPM2Available();

  if (pm2Available) {
    console.log('PM2 detected. Checking if process exists...');

    // Try to restart first (handles existing processes)
    const restartProcess = spawn('pm2', ['restart', 'claude-code-ui'], {
      stdio: 'pipe'
    });

    restartProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('PM2 process restarted successfully.');
        process.exit(0);
      } else {
        // If restart failed, try to start fresh
        console.log('PM2 restart failed, starting new process...');
        const startProcess = spawn('pm2', ['start', 'backend/dist/index.js', '--name', 'claude-code-ui'], {
          stdio: 'inherit'
        });

        startProcess.on('exit', (code) => {
          process.exit(code);
        });
      }
    });
  } else {
    console.log('PM2 not available. Starting with node...');
    const nodeProcess = spawn('node', ['backend/dist/index.js'], {
      stdio: 'inherit'
    });

    nodeProcess.on('exit', (code) => {
      process.exit(code);
    });
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});