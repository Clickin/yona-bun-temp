import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const frontendDist = join(repoRoot, "frontend", "dist");
const binaryName = process.platform === "win32" ? "yoram.exe" : "yoram";
const binaryPath = join(repoRoot, "target", "debug", binaryName);

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...options.env },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? code}`));
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

async function waitFor(url, timeoutMs = 30_000) {
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
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw lastError ?? new Error(`timed out waiting for ${url}`);
}

async function fetchOk(url) {
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${body.slice(0, 200)}`);
  }
  return { response, body };
}

function discoverAssetPath(indexHtml) {
  const match = indexHtml.match(/src="(?<path>(?:\.\/|\/)?assets\/[^"]+)"/);
  if (!match?.groups?.path) {
    throw new Error("Failed to discover embedded asset path from index.html");
  }
  return match.groups.path;
}

function assetUrl(origin, assetPath) {
  if (assetPath.startsWith("/")) {
    return `${origin}/yona${assetPath}`;
  }
  return `${origin}/yona/${assetPath.replace(/^\.\//, "")}`;
}

let serverProcess;
try {
  await run("pnpm", ["--dir", "frontend", "build"]);
  if (!existsSync(frontendDist)) {
    throw new Error(`frontend dist not found: ${frontendDist}`);
  }

  await run("cargo", ["build", "-p", "yoram-server", "--bin", "yoram"], {
    env: { YONA_EMBED_ASSET_ROOT: frontendDist },
  });
  if (!existsSync(binaryPath)) {
    throw new Error(`server binary not found: ${binaryPath}`);
  }

  const port = await getFreePort();
  const origin = `http://127.0.0.1:${port}`;
  serverProcess = spawn(binaryPath, {
    cwd: repoRoot,
    env: {
      ...process.env,
      YONA_BASE_PATH: "/yona",
      YONA_BIND_ADDR: `127.0.0.1:${port}`,
      YONA_DATABASE_URL: "sqlite::memory:",
      YONA_SCHEMA_POLICY: "up",
      YONA_SEED_PILOT: "1",
      YONA_USE_EMBEDDED_ASSETS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverOutput = "";
  serverProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  serverProcess.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      serverOutput += `\nserver exited with ${code}`;
    } else if (signal) {
      serverOutput += `\nserver exited with ${signal}`;
    }
  });

  await waitFor(`${origin}/yona/api/auth/session`);

  const index = await fetchOk(`${origin}/yona/`);
  const projects = await fetchOk(`${origin}/yona/projects`);
  const assetPath = discoverAssetPath(index.body);
  const asset = await fetchOk(assetUrl(origin, assetPath));
  const session = await fetchOk(`${origin}/yona/api/auth/session`);
  const restProjects = await fetchOk(`${origin}/yona/api/v1/projects`);

  const result = {
    index_status: index.response.status,
    index_runtime_config: index.body.includes("__YONA_RUNTIME_CONFIG__"),
    projects_status: projects.response.status,
    asset_uri: assetUrl(origin, assetPath),
    asset_status: asset.response.status,
    asset_non_empty: asset.body.length > 0,
    session_status: session.response.status,
    session_has_csrf: session.response.headers.has("x-csrf-token"),
    rest_projects_status: restProjects.response.status,
    rest_projects_has_project: restProjects.body.includes('"projectName":"yona"'),
  };

  if (
    result.index_status !== 200 ||
    !result.index_runtime_config ||
    result.projects_status !== 200 ||
    result.asset_status !== 200 ||
    !result.asset_non_empty ||
    result.session_status !== 200 ||
    !result.session_has_csrf ||
    result.rest_projects_status !== 200 ||
    !result.rest_projects_has_project
  ) {
    throw new Error(`embedded smoke failed: ${JSON.stringify(result)}`);
  }

  console.log(JSON.stringify(result));
} finally {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
    setTimeout(() => {
      if (serverProcess.exitCode === null) {
        serverProcess.kill("SIGKILL");
      }
    }, 1_000).unref();
  }
}
