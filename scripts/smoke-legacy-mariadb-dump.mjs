import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const dumpPath = resolve(
  repoRoot,
  process.env.YONA_LEGACY_MARIADB_DUMP_SQL ?? ".agent/legacy-dumps/yona-dump.sql",
);
const image = process.env.YONA_LEGACY_MARIADB_IMAGE ?? "mariadb:10.3";
const binaryName = process.platform === "win32" ? "yoram.exe" : "yoram";
const binaryPath = join(repoRoot, "target", "debug", binaryName);

if (!existsSync(dumpPath)) {
  throw new Error(`legacy MariaDB dump not found: ${dumpPath}`);
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...options.env },
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${signal ?? code}\n${stdout}\n${stderr}`.trim(),
        ),
      );
    });
  });
}

function getFreePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePromise(address.port));
    });
  });
}

async function waitForSql(containerId, sql, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await run(
        "docker",
        ["exec", containerId, "mysql", "-uroot", "-N", "-B", "yona", "-e", sql],
        { capture: true },
      );
      return result.stdout.trim();
    } catch (error) {
      lastError = error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
    }
  }
  throw lastError ?? new Error("timed out waiting for MariaDB import");
}

async function waitForHttp(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
  }
  throw lastError ?? new Error(`timed out waiting for ${url}`);
}

async function startServer(policy, databaseUrl) {
  const port = await getFreePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(binaryPath, {
    cwd: repoRoot,
    env: {
      ...process.env,
      YONA_BIND_ADDR: `127.0.0.1:${port}`,
      YONA_DATABASE_URL: databaseUrl,
      YONA_SCHEMA_POLICY: policy,
      YONA_USE_EMBEDDED_ASSETS: "0",
      YONA_ASSET_ROOT: "frontend/dist",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  try {
    await waitForHttp(`${origin}/api/auth/session`);
    return { child, origin, output: () => output };
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`${policy} server did not start: ${error.message}\n${output}`);
  }
}

async function stopServer(server) {
  if (server.child.exitCode !== null) {
    return;
  }
  server.child.kill("SIGTERM");
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  if (server.child.exitCode === null) {
    server.child.kill("SIGKILL");
  }
}

let containerId;
try {
  await run("cargo", ["build", "-p", "yona-rust-pilot-server", "--bin", "yoram", "--features", "db-matrix"]);
  if (!existsSync(binaryPath)) {
    throw new Error(`server binary not found: ${binaryPath}`);
  }

  const mariadbPort = await getFreePort();
  const runResult = await run(
    "docker",
    [
      "run",
      "--rm",
      "-d",
      "-p",
      `127.0.0.1:${mariadbPort}:3306`,
      "-e",
      "MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1",
      "-e",
      "MARIADB_DATABASE=yona",
      "-v",
      `${realpathSync(dumpPath)}:/docker-entrypoint-initdb.d/001-yona-dump.sql:ro`,
      image,
    ],
    { capture: true },
  );
  containerId = runResult.stdout.trim();
  if (!containerId) {
    throw new Error("docker run did not return a container id");
  }

  const userCount = await waitForSql(containerId, "SELECT COUNT(*) FROM n4user;");
  const databaseUrl = `mysql://root@127.0.0.1:${mariadbPort}/yona`;

  const validateOnly = await startServer("validate_only", databaseUrl);
  await stopServer(validateOnly);
  const migrationsAfterValidate = await waitForSql(
    containerId,
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='seaql_migrations';",
  );

  const adopt = await startServer("adopt", databaseUrl);
  await stopServer(adopt);
  const adoptedVersion = await waitForSql(containerId, "SELECT version FROM seaql_migrations LIMIT 1;");

  const result = {
    dump: dumpPath.replace(`${repoRoot}/`, ""),
    image,
    container_id: containerId.slice(0, 12),
    users: Number(userCount),
    validate_only_left_migration_table_absent: migrationsAfterValidate === "0",
    adopted_version: adoptedVersion,
  };
  if (!result.validate_only_left_migration_table_absent || !result.adopted_version) {
    throw new Error(`legacy MariaDB dump smoke failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result));
} finally {
  if (containerId) {
    await run("docker", ["rm", "-f", containerId], { capture: true }).catch((error) => {
      console.error(error.message);
    });
  }
}
