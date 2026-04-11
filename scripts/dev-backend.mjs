import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");

const cargoWatchCheck = spawnSync("cargo", ["watch", "--version"], {
  cwd: repoRoot,
  encoding: "utf8",
});

if (cargoWatchCheck.status !== 0) {
  const stderr = cargoWatchCheck.stderr?.trim();
  if (stderr) {
    console.error(stderr);
  }
  console.error("cargo-watch is required for pnpm dev. Install it with: cargo install cargo-watch");
  process.exit(cargoWatchCheck.status ?? 1);
}

const child = spawn(
  "cargo",
  [
    "watch",
    "--watch",
    "crates",
    "--watch",
    "proto",
    "--watch",
    "Cargo.toml",
    "--watch",
    "buf.gen.yaml",
    "--ignore",
    ".yona-data",
    "-s",
    "node scripts/run-dev-backend-once.mjs",
  ],
  {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
