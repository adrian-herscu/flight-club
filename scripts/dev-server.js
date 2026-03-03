#!/usr/bin/env node

/**
 * Development Server Manager
 * 
 * Manages the Next.js dev server on a fixed port with proper cleanup.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PID_FILE = path.join(__dirname, '.dev-server.pid');
const LOG_FILE = path.join(__dirname, '..', 'dev-server.log');

function savePid(pid) {
  fs.writeFileSync(PID_FILE, pid.toString());
}

function loadPid() {
  try {
    if (fs.existsSync(PID_FILE)) {
      return parseInt(fs.readFileSync(PID_FILE, 'utf8'));
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

function deletePidFile() {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (error) {
    // Ignore errors
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

async function killPort(port) {
  return new Promise((resolve) => {
    // Use netstat/ss to find PIDs listening on port
    const findCmd = `ss -tlnp 2>/dev/null | grep :${port} | awk '{print $NF}' | grep -oP 'pid=\\K[0-9]+' || echo ''`;
    const kill = spawn('sh', ['-c', findCmd]);
    let pids = '';
    
    kill.stdout.on('data', (data) => {
      pids += data.toString();
    });
    
    kill.on('close', async (code) => {
      if (pids.trim()) {
        const pidList = pids.trim().split('\n').filter(p => p);
        for (const pid of pidList) {
          try {
            const pidNum = parseInt(pid);
            if (!isNaN(pidNum) && pidNum > 0) {
              process.kill(pidNum, 'SIGTERM');
              console.log(`  Sent SIGTERM to process ${pid}`);
              
              // Wait a bit then force kill if still running
              await new Promise(r => setTimeout(r, 500));
              if (isProcessRunning(pidNum)) {
                process.kill(pidNum, 'SIGKILL');
                console.log(`  Force killed process ${pid}`);
              }
            }
          } catch (error) {
            // Process might already be dead, ignore
          }
        }
        // Wait for processes to actually die
        await new Promise(r => setTimeout(r, 1000));
      }
      resolve();
    });
  });
}

async function start() {
  // Check if already running
  const existingPid = loadPid();
  if (existingPid && isProcessRunning(existingPid)) {
    console.log(`✅ Server already running on http://localhost:${PORT} (PID: ${existingPid})`);
    console.log(`   Use 'npm run dev:stop' to stop it`);
    return;
  }

  // Kill any process using the port and wait
  await killPort(PORT);
  
  // Double check the port is free
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log(`🚀 Starting dev server on port ${PORT}...`);
  console.log(`📝 Logs will be written to: ${LOG_FILE}`);
  
  // Open log file for writing (truncate if exists)
  const logFd = fs.openSync(LOG_FILE, 'w');
  
  const devServer = spawn('npx', ['next', 'dev', '-p', PORT.toString()], {
    stdio: ['ignore', logFd, logFd], // Redirect stdout and stderr to log file
    detached: true,
  });
  
  // Close the file descriptor in the parent process
  fs.closeSync(logFd);

  savePid(devServer.pid);

  devServer.on('error', (error) => {
    console.error('❌ Failed to start server:', error.message);
    deletePidFile();
    process.exit(1);
  });

  // Detach the process so it keeps running
  devServer.unref();
  
  // Wait a bit to make sure it started
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`\n✅ Server started on http://localhost:${PORT}`);
  console.log(`   PID: ${devServer.pid}`);
  console.log(`   Logs: ${LOG_FILE}`);
  console.log(`   Use 'npm run dev:stop' to stop it`);
  console.log(`   Use 'npm run dev:restart' to restart it`);
  console.log(`   Use 'tail -f ${LOG_FILE}' to watch logs\n`);
}

async function stop() {
  const pid = loadPid();
  
  console.log(`🛑 Stopping dev server...`);
  
  if (pid && isProcessRunning(pid)) {
    console.log(`   Stopping PID ${pid}...`);
    try {
      process.kill(pid, 'SIGTERM');
      
      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isProcessRunning(pid)) {
        console.log(`   Force killing PID ${pid}...`);
        process.kill(pid, 'SIGKILL');
      }
    } catch (error) {
      // Process might already be dead
    }
  }
  
  deletePidFile();
  
  // Always try to kill any process on the port (might be orphaned)
  console.log(`   Checking for processes on port ${PORT}...`);
  await killPort(PORT);
  
  console.log('✅ Server stopped');
}

async function restart() {
  console.log('🔄 Restarting server...\n');
  await stop();
  await new Promise(resolve => setTimeout(resolve, 2000));
  await start();
}

async function status() {
  const pid = loadPid();
  
  if (!pid) {
    console.log('❌ Server is not running (no PID file)');
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log(`❌ Server is not running (stale PID: ${pid})`);
    deletePidFile();
    return;
  }

  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`   PID: ${pid}`);
}

const command = process.argv[2] || 'start';

async function main() {
  switch (command) {
    case 'start':
      await start();
      break;
    case 'stop':
      await stop();
      break;
    case 'restart':
      await restart();
      break;
    case 'status':
      await status();
      break;
    default:
      console.log('Usage: node dev-server.js [start|stop|restart|status]');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
