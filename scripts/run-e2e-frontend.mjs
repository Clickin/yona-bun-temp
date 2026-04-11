import { spawn } from "node:child_process";

const frontendPort = process.env.YONA_E2E_FRONTEND_PORT ?? "3101";

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
  "dev",
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
