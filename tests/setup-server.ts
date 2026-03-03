/**
 * Automatically starts and stops the dev server for integration/e2e tests
 */

import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const TEST_PORT = Number(process.env.TEST_SERVER_PORT || "3000");
const TEST_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${TEST_PORT}`;

async function isPortInUse(port: number = TEST_PORT): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

let serverProcess: any = null;
let serverStarted = false;
let startedByTests = false;

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

  // If the port is already occupied, do not try to spawn another server.
  // This prevents EADDRINUSE races when manually rerunning tests.
  const portInUse = await isPortInUse(TEST_PORT);
  if (portInUse) {
    console.log(`✓ Port ${TEST_PORT} already in use; reusing existing server process`);
    serverStarted = true;
    startedByTests = false;
    return;
  }

  console.log("🚀 Starting dev server...");

  return new Promise((resolve, reject) => {
    let settled = false;

    const resolveOnce = () => {
      if (!settled) {
        settled = true;
        resolve(true);
      }
    };

    const rejectOnce = (error: Error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    serverProcess = spawn("npm", ["run", "dev", "--", "-p", String(TEST_PORT)], {
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
        startedByTests = true;
        resolveOnce();
      }
    });

    serverProcess.stderr.on("data", (data: Buffer) => {
      const output = data.toString();

      if (output.includes("EADDRINUSE")) {
        serverStarted = true;
        startedByTests = false;
        resolveOnce();
        return;
      }

      if (output.includes("error") || output.includes("Error")) {
        console.error(output);
      }
    });

    serverProcess.on("error", (error: Error) => {
      console.error("Failed to start dev server:", error);
      rejectOnce(error);
    });

    // Timeout after 45 seconds
    setTimeout(() => {
      if (serverStarted) {
        resolveOnce();
      } else {
        rejectOnce(new Error("Dev server failed to start within 45 seconds"));
      }
    }, 45000);
  });
}

export async function stopDevServer() {
  if (!serverProcess || !serverStarted || !startedByTests) {
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

export async function isServerRunning(url: string = TEST_BASE_URL): Promise<boolean> {
  try {
    const response = await fetch(url + "/api/v1/health", {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
