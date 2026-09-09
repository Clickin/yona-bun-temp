import { spawn } from "node:child_process";

export function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => (stdout += chunk));
  child.stderr?.on("data", (chunk) => (stderr += chunk));
  return new Promise((resolve, reject) => {
    // Promise settlement is idempotent when a spawn error is followed by close.
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(options.capture ? { stdout, stderr } : undefined);
      } else {
        reject(new Error(`${command} exited ${code}: ${stderr.slice(0, 4000)}`));
      }
    });
  });
}
