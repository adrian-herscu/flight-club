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
    // Try both regular and sudo lsof
    const kill = spawn('sh', ['-c', `lsof -ti :${port} 2>/dev/null || sudo lsof -ti :${port} 2>/dev/null`]);
    let pids = '';
    
    kill.stdout.on('data', (data) => {
      pids += data.toString();
    });
    
    kill.on('close', async (code) => {
      if (pids.trim()) {
        const pidList = pids.trim().split('\n');
        for (const pid of pidList) {
          try {
            const pidNum = parseInt(pid);
            process.kill(pidNum, 'SIGTERM');
            console.log(`🛑 Killed process ${pid} on port ${port}`);
          } catch (error) {
            // Try with sudo if permission denied
            try {
              spawn('sudo', ['kill', '-9', pid], { stdio: 'inherit' });
            } catch (e) {
              // Ignore
            }
          }
        }
        // Wait for processes to actually die
        await new Promise(r => setTimeout(r, 2000));
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
  
  const devServer = spawn('npx', ['next', 'dev', '-p', PORT.toString()], {
    stdio: 'ignore', // Don't inherit stdio for detached process
    detached: true,
  });

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
  console.log(`   Use 'npm run dev:stop' to stop it`);
  console.log(`   Use 'npm run dev:restart' to restart it\n`);
}

async function stop() {
  const pid = loadPid();
  
  if (!pid) {
    console.log('ℹ️  No server PID file found');
    // Try to kill any process on the port anyway
    await killPort(PORT);
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log(`ℹ️  Server process ${pid} not running`);
    deletePidFile();
    await killPort(PORT);
    return;
  }

  console.log(`🛑 Stopping server (PID: ${pid})...`);
  
  try {
    process.kill(pid, 'SIGTERM');
    
    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (isProcessRunning(pid)) {
      console.log('   Forcing shutdown...');
      process.kill(pid, 'SIGKILL');
    }
    
    console.log('✅ Server stopped');
  } catch (error) {
    console.error('❌ Error stopping server:', error.message);
  }
  
  deletePidFile();
  await killPort(PORT);
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
