import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPlaywrightE2eRuntime,
  createPlaywrightE2eRunToken,
  reserveOpenPort,
} from "./playwright-e2e-runtime.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const runToken = createPlaywrightE2eRunToken();
const frontendPort = await reserveOpenPort();
let backendPort = await reserveOpenPort();
while (backendPort === frontendPort) {
  backendPort = await reserveOpenPort();
}
const runtime = buildPlaywrightE2eRuntime({
  backendPort,
  frontendPort,
  repoRoot,
  runToken,
});
const forwardedArgs = process.argv.slice(2);

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

const next = resolveSpawn("pnpm", ["exec", "playwright", "test", ...forwardedArgs]);
const child = spawn(next.command, next.args, {
  cwd: path.join(repoRoot, "frontend"),
  env: {
    ...process.env,
    ...runtime.backendEnv,
    ...runtime.frontendEnv,
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
