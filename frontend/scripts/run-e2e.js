#!/usr/bin/env node

/**
 * E2E Test Runner
 * 
 * Automatically starts the backend server, runs e2e tests, then stops the server.
 */

const { spawn } = require('child_process');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '../../backend');
const BACKEND_URL = 'http://localhost:8000';
const MAX_RETRIES = 30; // 30 seconds max wait
const RETRY_DELAY = 1000; // 1 second between retries

let backendProcess = null;

// Kill backend on exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

function cleanup() {
  if (backendProcess) {
    console.log('\n🛑 Stopping backend server...');
    backendProcess.kill();
    backendProcess = null;
  }
}

async function waitForBackend() {
  console.log('⏳ Waiting for backend to be ready...');
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/health`);
      if (response.ok) {
        console.log('✅ Backend is ready!\n');
        return true;
      }
    } catch (error) {
      // Backend not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  }
  
  console.error('❌ Backend failed to start within 30 seconds');
  return false;
}

async function startBackend() {
  console.log('🚀 Starting backend server...');
  
  backendProcess = spawn('python', ['-m', 'uvicorn', 'src.main:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: BACKEND_DIR,
    stdio: 'pipe', // Capture output but don't show it
    detached: false,
  });

  backendProcess.on('error', (error) => {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  });

  backendProcess.on('exit', (code) => {
    if (code !== null && code !== 0 && code !== 143) { // 143 = SIGTERM
      console.error(`❌ Backend exited with code ${code}`);
    }
  });

  // Wait for backend to be ready
  const ready = await waitForBackend();
  if (!ready) {
    cleanup();
    process.exit(1);
  }
}

async function runTests() {
  console.log('🧪 Running e2e tests...\n');
  
  return new Promise((resolve, reject) => {
    const testProcess = spawn('npm', ['run', 'test:e2e:only'], {
      stdio: 'inherit',
      shell: true,
    });

    testProcess.on('exit', (code) => {
      resolve(code);
    });

    testProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('         E2E Test Runner');
  console.log('═══════════════════════════════════════════\n');

  try {
    await startBackend();
    const exitCode = await runTests();
    
    console.log('\n═══════════════════════════════════════════');
    if (exitCode === 0) {
      console.log('✅ All tests passed!');
    } else {
      console.log(`❌ Tests failed with exit code ${exitCode}`);
    }
    console.log('═══════════════════════════════════════════\n');
    
    cleanup();
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Error running tests:', error);
    cleanup();
    process.exit(1);
  }
}

main();
