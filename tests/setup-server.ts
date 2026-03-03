/**
 * Automatically starts and stops the dev server for integration/e2e tests
 */

import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
async function killProcessOnPort(port: number = 3000): Promise<void> {
  try {
    // Try to find and kill process on the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pids = stdout.trim().split('\n').filter(Boolean);
    
    if (pids.length > 0) {
      console.log(`🔪 Killing ${pids.length} process(es) on port ${port}...`);
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid}`);
        } catch {
          // Process might have already died
        }
      }
      // Wait a bit for port to be released
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch {
    // No process found on port, which is fine
  }
}


let serverProcess: any = null;
let serverStarted = false;

export async function startDevServer() {
  if (serverStarted) {
    return; // Already started
  }

  // Check if server already running (from manual start)
  const alreadyRunning = await isServerRunning();
  if (alreadyRunning) {
    console.log("✓ Dev server already running");
    serverStarted = true;
    return;
  }

  console.log("🚀 Starting dev server...");

  return new Promise((resolve, reject) => {
    serverProcess = spawn("npm", ["run", "dev"], {
      cwd: process.cwd(),
      stdio: "pipe",
      shell: true,
    });

    serverProcess.stdout.on("data", (data: Buffer) => {
      const output = data.toString();
      // Only log if not too verbose
      if (output.includes("ready") || output.includes("compiled") || output.includes("error")) {
        console.log(output.trim());
      }
      // Look for the "ready" message from Next.js
      if (output.includes("ready") || output.includes("started server")) {
        serverStarted = true;
        resolve(true);
      }
    });

    serverProcess.stderr.on("data", (data: Buffer) => {
      const output = data.toString();
      if (output.includes("error") || output.includes("Error")) {
        console.error(output);
      }
    });

    serverProcess.on("error", (error: Error) => {
      console.error("Failed to start dev server:", error);
      reject(error);
    });

    // Timeout after 45 seconds
    setTimeout(() => {
      if (serverStarted) {
        resolve(true);
      } else {
        reject(new Error("Dev server failed to start within 45 seconds"));
      }
    }, 45000);
  });
}

  // Kill any zombie processes on port 3000
  await killProcessOnPort(3000);

export async function stopDevServer() {
  if (!serverProcess || !serverStarted) {
    return;
  }

  console.log("🛑 Stopping dev server...");

  return new Promise((resolve) => {
    serverProcess.kill("SIGTERM");
    serverProcess.on("exit", () => {
      serverStarted = false;
      console.log("✓ Dev server stopped");
      resolve(true);
    });

    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }
      resolve(true);
    }, 5000);
  });
}

export async function isServerRunning(url: string = "http://localhost:3000"): Promise<boolean> {
  try {
    const response = await fetch(url + "/api/v1/health", {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
