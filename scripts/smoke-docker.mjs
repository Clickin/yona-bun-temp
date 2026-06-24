import { spawn } from "node:child_process";
import { createServer } from "node:net";

const imageTag = process.env.YONA_DOCKER_SMOKE_IMAGE ?? "yoram:smoke";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
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
        resolve({ stdout, stderr });
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
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitFor(url, timeoutMs = 45_000) {
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
    await new Promise((resolve) => setTimeout(resolve, 750));
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
  const match = indexHtml.match(/src="(?<path>(?:\.\/|\/(?:yona\/)?)?assets\/[^"]+)"/);
  if (!match?.groups?.path) {
    throw new Error("Failed to discover embedded asset path from index.html");
  }
  return match.groups.path;
}

function discoverStylesheetPath(indexHtml) {
  const match = indexHtml.match(/href="(?<path>(?:\.\/|\/(?:yona\/)?)?assets\/[^"]+\.css)"/);
  if (!match?.groups?.path) {
    throw new Error("Failed to discover embedded stylesheet path from index.html");
  }
  return match.groups.path;
}

function assetUrl(origin, assetPath) {
  if (assetPath.startsWith("/yona/")) {
    return `${origin}${assetPath}`;
  }
  if (assetPath.startsWith("/")) {
    return `${origin}/yona${assetPath}`;
  }
  return `${origin}/yona/${assetPath.replace(/^\.\//, "")}`;
}

let containerId;
try {
  await run("docker", ["buildx", "build", "--load", "-t", imageTag, "."]);
  const port = await getFreePort();
  const runResult = await run(
    "docker",
    [
      "run",
      "--rm",
      "-d",
      "-p",
      `127.0.0.1:${port}:8089`,
      "-e",
      "YONA_BIND_ADDR=0.0.0.0:8089",
      "-e",
      "YONA_BASE_PATH=/yona",
      "-e",
      "YONA_DATABASE_URL=sqlite::memory:",
      "-e",
      "YONA_SCHEMA_POLICY=up",
      "-e",
      "YONA_SEED_PILOT=1",
      "-e",
      "YONA_USE_EMBEDDED_ASSETS=1",
      imageTag,
    ],
    { capture: true },
  );
  containerId = runResult.stdout.trim();
  if (!containerId) {
    throw new Error("docker run did not return a container id");
  }

  const origin = `http://127.0.0.1:${port}`;
  await waitFor(`${origin}/yona/api/auth/session`);
  const index = await fetchOk(`${origin}/yona/`);
  const projects = await fetchOk(`${origin}/yona/projects`);
  const assetPath = discoverAssetPath(index.body);
  const stylesheetPath = discoverStylesheetPath(index.body);
  const asset = await fetchOk(assetUrl(origin, assetPath));
  const stylesheet = await fetchOk(assetUrl(origin, stylesheetPath));
  const session = await fetchOk(`${origin}/yona/api/auth/session`);
  const restProjects = await fetchOk(`${origin}/yona/api/v1/projects`);

  const result = {
    image: imageTag,
    container_id: containerId.slice(0, 12),
    index_status: index.response.status,
    index_runtime_config: index.body.includes("__YONA_RUNTIME_CONFIG__"),
    projects_status: projects.response.status,
    asset_status: asset.response.status,
    asset_non_empty: asset.body.length > 0,
    stylesheet_status: stylesheet.response.status,
    stylesheet_content_type: stylesheet.response.headers.get("content-type"),
    stylesheet_non_empty: stylesheet.body.length > 0,
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
    result.stylesheet_status !== 200 ||
    !result.stylesheet_content_type?.startsWith("text/css") ||
    !result.stylesheet_non_empty ||
    result.session_status !== 200 ||
    !result.session_has_csrf ||
    result.rest_projects_status !== 200 ||
    !result.rest_projects_has_project
  ) {
    throw new Error(`docker smoke failed: ${JSON.stringify(result)}`);
  }

  console.log(JSON.stringify(result));
} finally {
  if (containerId) {
    await run("docker", ["rm", "-f", containerId]).catch((error) => {
      console.error(error.message);
    });
  }
}
