import { spawn } from "node:child_process";
import {
  resolveE2eFrontendViteBaseArgs,
  resolveE2eFrontendViteCommand,
} from "./playwright-e2e-runtime.mjs";

const frontendPort = process.env.YONA_E2E_FRONTEND_PORT ?? "3101";
const frontendMode = process.env.YONA_E2E_FRONTEND_MODE;
const viteCommand = resolveE2eFrontendViteCommand(frontendMode);
const viteBaseArgs = resolveE2eFrontendViteBaseArgs(
  frontendMode,
  process.env.VITE_YONA_BASE_PATH ?? "/",
);

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

const next = resolveSpawn("pnpm", [
  "exec",
  "vite",
  viteCommand,
  ...viteBaseArgs,
  "--host",
  "127.0.0.1",
  "--port",
  frontendPort,
]);
const child = spawn(next.command, next.args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
