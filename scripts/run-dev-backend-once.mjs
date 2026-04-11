import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { normalizeBasePath } from "./dev-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const runtimeDirectory = process.env.YONA_DEV_RUNTIME_DIR
  ? path.resolve(process.env.YONA_DEV_RUNTIME_DIR)
  : path.join(repoRoot, ".yona-data");
const configPath = path.join(runtimeDirectory, "dev.toml");
const databasePath = path.join(runtimeDirectory, "dev.db");
const basePath = normalizeBasePath(process.env.YONA_DEV_BASE_PATH);
const publicOrigin = process.env.YONA_DEV_PUBLIC_ORIGIN ?? "http://127.0.0.1:3101";

fs.mkdirSync(runtimeDirectory, { recursive: true });
const shouldSeed = !fs.existsSync(databasePath) || fs.statSync(databasePath).size === 0;
fs.closeSync(fs.openSync(databasePath, "a"));

const relativeDatabasePath = path.relative(repoRoot, databasePath).replace(/\\/g, "/");
const normalizedDatabasePath = relativeDatabasePath.startsWith(".")
  ? relativeDatabasePath
  : `./${relativeDatabasePath}`;

const config = [
  `base_path = ${JSON.stringify(basePath)}`,
  `database_url = ${JSON.stringify(`sqlite://${normalizedDatabasePath}?mode=rwc`)}`,
  `public_origin = ${JSON.stringify(publicOrigin)}`,
  'schema_policy = "up"',
  `seed_pilot = ${shouldSeed ? "true" : "false"}`,
  "use_embedded_assets = false",
].join("\n");

fs.writeFileSync(configPath, `${config}\n`);

const child = spawn("cargo", ["run", "-p", "yona-rust-pilot-server"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    YONA_CONFIG_TOML: configPath,
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
