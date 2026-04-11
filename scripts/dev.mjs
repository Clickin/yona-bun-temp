import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDevConfig } from "./dev-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const devConfig = resolveDevConfig(process.env);

let shuttingDown = false;
const children = [];

function resolveSpawn(command, args) {
  if (process.platform === "win32" && command === "pnpm") {
    return {
      args: ["/d", "/s", "/c", "pnpm", ...args],
      command: "cmd.exe",
    };
  }

  return {
    args,
    command,
  };
}

function terminateChild(child) {
  if (!child.pid) {
    return;
  }

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    killer.on("error", () => {});
    return;
  }

  child.kill("SIGTERM");
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    terminateChild(child);
  }
  setTimeout(() => process.exit(exitCode), 250);
}

function startProcess(command, args, env) {
  const next = resolveSpawn(command, args);
  const child = spawn(next.command, next.args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    if (signal) {
      shutdown(1);
      return;
    }
    shutdown(code ?? 1);
  });
  return child;
}

console.log("Yona live-reload dev startup");
console.log(`- frontend: ${devConfig.frontendUrl}`);
console.log(`- backend : ${devConfig.backendSessionUrl}`);
console.log("- stop    : Ctrl+C");

startProcess("node", ["scripts/dev-backend.mjs"], {
  YONA_DEV_BASE_PATH: devConfig.basePath,
  YONA_DEV_PUBLIC_ORIGIN: devConfig.frontendOrigin,
});

startProcess("pnpm", ["--dir", "frontend", "dev"], {
  VITE_YONA_BASE_PATH: devConfig.basePath,
  YONA_DEV_BACKEND_TARGET: devConfig.backendTarget,
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
