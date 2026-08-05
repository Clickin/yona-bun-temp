// Pilot @web/test-runner config for the in-browser e2e parity suite.
// The converted specs run entirely in the browser; WTR receives only the
// per-test pass/fail result (no per-assertion IPC). The app-under-test mounts
// in a same-origin iframe via the compat harness; this server serves the
// legacy fixture sources + route sources the specs read via readFileSync.
import { esbuildPlugin } from "@web/dev-server-esbuild";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = join(repoRoot, "frontend", "dist");
const srcDir = join(repoRoot, "frontend", "src");
const legacyDir = join(repoRoot, "yona-original");
const basePath = "/yona";

const RUNTIME_CONFIG_SCRIPT =
  '<script>window.__YONA_RUNTIME_CONFIG__={basePath:"/yona",feedbackUrl:"https://github.com/yona-projects/yona/issues"};</script>';

const FETCH_MOCK_SCRIPT =
  "<script>window.fetch = function (...args) { return parent.__wtrMockFetch.apply(parent, args); };</script>";

function serveIndex(context) {
  const indexPath = join(distDir, "index.html");
  if (!existsSync(indexPath)) {
    context.status = 500;
    return "frontend/dist missing — run scripts/run-web-runner.mjs (it builds first)";
  }
  let html = readFileSync(indexPath, "utf8");
  if (!html.includes("__YONA_RUNTIME_CONFIG__")) {
    html = html.replace("</head>", `${RUNTIME_CONFIG_SCRIPT}</head>`);
  }
  if (!html.includes("__wtrMockFetch")) {
    html = html.replace("</head>", `${FETCH_MOCK_SCRIPT}</head>`);
  }
  return html;
}

function contentTypeFor(filePath) {
  switch (extname(filePath)) {
    case ".ts":
    case ".tsx":
    case ".mjs":
    case ".js":
      return "text/javascript";
    case ".css":
      return "text/css";
    case ".html":
      return "text/html";
    case ".json":
      return "application/json";
    default:
      return "text/plain";
  }
}

// Converted specs live one directory deeper than the Playwright originals, so
// `new URL("../src/routes/...", import.meta.url)` resolves to /tests/src/...
// and `../../yona-original/...` to /yona-original/... — serve both. NOTE: serve()
// must return `undefined` to pass through; returning null crashes the pipeline.
const fixturePlugin = {
  name: "yona-fixture-sources",
  serve(context) {
    const pathname = context.url.split("?")[0];
    if (pathname.startsWith("/tests/") && pathname.includes("/src/")) {
      const srcMarker = pathname.indexOf("/src/");
      const rel = pathname
        .slice(srcMarker + "/src/".length)
        .split("/")
        .filter(Boolean);
      const diskPath = join(srcDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      if (existsSync(diskPath) && statSync(diskPath).isFile()) {
        return { body: readFileSync(diskPath), type: contentTypeFor(diskPath) };
      }
      return undefined;
    }
    if (pathname.startsWith("/yona-original/")) {
      const rel = pathname
        .replace(/^\/yona-original\//, "")
        .split("/")
        .filter(Boolean);
      const diskPath = join(legacyDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      if (existsSync(diskPath) && statSync(diskPath).isFile()) {
        return { body: readFileSync(diskPath), type: contentTypeFor(diskPath) };
      }
      return undefined;
    }
    // API paths must 404 (the compat harness fetch-mocks them; a 200 index.html
    // response would desync the app's JSON parsing).
    if (pathname.startsWith(`${basePath}/api/`)) {
      return {
        body: '{"error":{"code":"not_found","status":404}}',
        type: "application/json",
        headers: { "x-csrf-token": "wtr-csrf" },
      };
    }
    // The built app under the mounted base path, SPA fallback with the runtime config.
    if (pathname.startsWith(`${basePath}/`) || pathname === basePath) {
      const rel = pathname
        .replace(/^\/yona\//, "")
        .split("/")
        .filter(Boolean);
      const diskPath = join(distDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      if (existsSync(diskPath) && statSync(diskPath).isFile()) {
        return { body: readFileSync(diskPath), type: contentTypeFor(diskPath) };
      }
      return { body: serveIndex(context), type: "text/html" };
    }
    return undefined;
  },
};

export default {
  plugins: [esbuildPlugin({ ts: true }), fixturePlugin],
  files: ["tests/wtr/**/*.e2e.ts"],
  mimeTypes: { "**/*.ts": "text/javascript" },
  port: 8128,
  nodeResolve: false,
  concurrency: 2,
  testsFinishTimeout: 300000,
  testFramework: { config: { timeout: 30000 } },
  browserLogs: true,
  logBrowserLogs: true,
  browsers: [
    (await import("@web/test-runner-playwright")).playwrightLauncher({
      product: "chromium",
      concurrency: 2,
      launchOptions: {
        channel: "chrome",
        headless: true,
        args: ["--no-first-run"],
      },
      createBrowserContext: ({ browser }) =>
        browser.newContext({
          locale: "en-US",
          viewport: { width: 1280, height: 720 },
        }),
    }),
  ],
};
