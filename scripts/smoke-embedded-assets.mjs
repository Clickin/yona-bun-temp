import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeBasePath } from "./dev-config.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontendDist = join(repoRoot, "frontend", "dist");
const binaryName = process.platform === "win32" ? "yoram.exe" : "yoram";
const binaryPath = join(repoRoot, "target", "debug", binaryName);
const requiredInitialAssetKinds = ["icon", "stylesheet", "module-script"];

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

function readInitialAssetTags(html) {
  const tags = [];
  // The input is build-produced Vite HTML, not arbitrary user HTML.
  for (const tagMatch of html.matchAll(/<(link|script)\b([^>]*)>/giu)) {
    const attributes = {};
    for (const attributeMatch of tagMatch[2].matchAll(
      /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu,
    )) {
      attributes[attributeMatch[1].toLowerCase()] =
        attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? "";
    }
    tags.push({ attributes, name: tagMatch[1].toLowerCase() });
  }
  return tags;
}

function classifyInitialAsset(tag) {
  if (tag.name === "script") {
    return tag.attributes.type?.trim().toLowerCase() === "module" && tag.attributes.src
      ? { kind: "module-script", path: tag.attributes.src }
      : null;
  }
  if (tag.name !== "link" || !tag.attributes.href) {
    return null;
  }

  const rel = (tag.attributes.rel ?? "").trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (rel.includes("stylesheet")) {
    return { kind: "stylesheet", path: tag.attributes.href };
  }
  if (rel.includes("modulepreload")) {
    return { kind: "modulepreload", path: tag.attributes.href };
  }
  if (rel.includes("preload")) {
    return { kind: "preload", path: tag.attributes.href };
  }
  if (rel.some((token) => token === "icon" || token.endsWith("-icon"))) {
    return { kind: "icon", path: tag.attributes.href };
  }
  return null;
}

function isUnderBasePath(pathname, basePath) {
  return basePath === "/" ? pathname.startsWith("/") : pathname.startsWith(`${basePath}/`);
}

export function resolveSmokeBasePath(env = process.env) {
  return normalizeBasePath(env.YONA_SMOKE_BASE_PATH ?? "/team/yoram");
}

export function extractInitialAssetReferences(indexHtml, indexUrl, configuredBasePath) {
  const documentUrl = new URL(indexUrl);
  const basePath = normalizeBasePath(configuredBasePath);
  const references = [];
  const seen = new Set();

  for (const tag of readInitialAssetTags(indexHtml)) {
    const asset = classifyInitialAsset(tag);
    if (!asset) {
      continue;
    }

    let url;
    try {
      url = new URL(asset.path, documentUrl);
    } catch (error) {
      throw new Error(`invalid initial asset URL ${JSON.stringify(asset.path)}`, { cause: error });
    }
    if (url.origin !== documentUrl.origin) {
      continue;
    }
    if (!isUnderBasePath(url.pathname, basePath)) {
      throw new Error(`initial asset is outside configured base path ${basePath}: ${url.pathname}`);
    }

    const key = `${asset.kind}\0${url.href}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push({ kind: asset.kind, url: url.href });
    }
  }

  const kinds = new Set(references.map(({ kind }) => kind));
  const missingKinds = requiredInitialAssetKinds.filter((kind) => !kinds.has(kind));
  if (missingKinds.length > 0) {
    throw new Error(`missing initial asset references: ${missingKinds.join(", ")}`);
  }

  return references;
}

export async function fetchInitialAssets(references, fetchImplementation = fetch) {
  return Promise.all(
    references.map(async (reference) => {
      const response = await fetchImplementation(reference.url);
      const body = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") ?? "";
      const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();

      if (!response.ok) {
        throw new Error(`${reference.url} returned ${response.status}`);
      }
      if (body.byteLength === 0) {
        throw new Error(`${reference.url} returned an empty body`);
      }
      if (mediaType === "text/html" || mediaType === "application/xhtml+xml") {
        throw new Error(`${reference.url} was served as ${mediaType} instead of an asset`);
      }
      if (reference.kind === "stylesheet" && mediaType !== "text/css") {
        throw new Error(`${reference.url} expected text/css but received ${contentType || "none"}`);
      }

      return {
        ...reference,
        bodyLength: body.byteLength,
        contentType,
        status: response.status,
      };
    }),
  );
}

function urlAtBase(origin, basePath, leaf = "") {
  const normalizedLeaf = leaf.startsWith("/") ? leaf.slice(1) : leaf;
  const path = basePath === "/" ? `/${normalizedLeaf}` : `${basePath}/${normalizedLeaf}`;
  return new URL(path, origin).href;
}

export async function runEmbeddedAssetsSmoke() {
  const basePath = resolveSmokeBasePath();
  let serverProcess;

  try {
    await run("pnpm", ["--dir", "frontend", "build"], {
      env: { VITE_YONA_BASE_PATH: "/" },
    });
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
        YONA_BASE_PATH: basePath,
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

    const sessionUrl = urlAtBase(origin, basePath, "api/auth/session");
    await waitFor(sessionUrl);

    const indexUrl = urlAtBase(origin, basePath);
    const index = await fetchOk(indexUrl);
    const projects = await fetchOk(urlAtBase(origin, basePath, "projects"));
    const initialAssetReferences = extractInitialAssetReferences(index.body, indexUrl, basePath);
    const initialAssets = await fetchInitialAssets(initialAssetReferences);
    const asset = initialAssets.find(({ kind }) => kind === "module-script");
    const stylesheet = initialAssets.find(({ kind }) => kind === "stylesheet");
    const session = await fetchOk(sessionUrl);
    const restProjects = await fetchOk(urlAtBase(origin, basePath, "api/v1/projects"));

    const result = {
      base_path: basePath,
      index_status: index.response.status,
      index_runtime_config: index.body.includes("__YONA_RUNTIME_CONFIG__"),
      projects_status: projects.response.status,
      asset_uri: asset.url,
      asset_status: asset.status,
      asset_non_empty: asset.bodyLength > 0,
      stylesheet_uri: stylesheet.url,
      stylesheet_status: stylesheet.status,
      stylesheet_content_type: stylesheet.contentType,
      stylesheet_non_empty: stylesheet.bodyLength > 0,
      initial_assets_count: initialAssets.length,
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
      !result.stylesheet_content_type.startsWith("text/css") ||
      !result.stylesheet_non_empty ||
      result.session_status !== 200 ||
      !result.session_has_csrf ||
      result.rest_projects_status !== 200 ||
      !result.rest_projects_has_project
    ) {
      throw new Error(`embedded smoke failed: ${JSON.stringify(result)}\n${serverOutput}`);
    }

    console.log(JSON.stringify(result));
    return result;
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
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  await runEmbeddedAssetsSmoke();
}
