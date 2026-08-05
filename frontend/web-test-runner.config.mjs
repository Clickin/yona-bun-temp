// Pilot @web/test-runner config for the in-browser e2e parity suite.
// The converted specs run entirely in the browser; WTR receives only the
// per-test pass/fail result (no per-assertion IPC). The app-under-test mounts
// in a same-origin iframe via the compat harness; this server serves the
// legacy fixture sources + route sources the specs read via readFileSync.
import { esbuildPlugin } from "@web/dev-server-esbuild";
import { readFileSync, existsSync, statSync, globSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = join(repoRoot, "frontend", "dist");
const srcDir = join(repoRoot, "frontend", "src");
const frontendDir = join(repoRoot, "frontend");
const legacyDir = join(repoRoot, "yona-original");
const basePath = "/yona";

const RUNTIME_CONFIG_SCRIPT = '<script>window.__YONA_RUNTIME_CONFIG__={basePath:"/yona"};</script>';

const FETCH_MOCK_SCRIPT = `<script>
  window.fetch = function (...args) { return parent.__wtrMockFetch.apply(parent, args); };
  try { for (const hook of parent.__wtrInitHooks ?? []) { eval("(" + hook.source + ")(" + (hook.argJson || "") + ")"); } } catch (e) {}
  window.confirm = (msg) => { parent.__wtrEmit("dialog", { type: () => "confirm", message: () => msg, accept: () => {}, dismiss: () => {} }); return true; };
  window.alert = (msg) => { parent.__wtrEmit("dialog", { message: () => msg, accept: () => {}, dismiss: () => {} }); };
  window.prompt = () => null;
  if (typeof PerformanceObserver !== "undefined") {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry;
          parent.__wtrEmit("request", {
            url: () => resource.name,
            method: () => "GET",
            resourceType: () => {
              const initiator = resource.initiatorType || "other";
              if (initiator === "link" || initiator === "css") return "stylesheet";
              if (initiator === "img") return "image";
              if (initiator === "script") return "script";
              if (initiator === "xmlhttprequest" || initiator === "fetch") return "fetch";
              if (initiator === "navigation") return "document";
              return initiator;
            },
          });
        }
      });
      observer.observe({ type: "resource", buffered: true });
    } catch (e) {}
  }
  for (const level of ["log", "error", "warn", "info", "debug"]) {
    const original = console[level];
    console[level] = (...args) => {
      parent.__wtrEmit("console", { type: () => level, text: () => args.map((a) => (typeof a === "string" ? a : String(a))).join(" ") });
      original.apply(console, args);
    };
  }
</script>`;

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

function stripTxtSuffix(parts) {
  if (parts.length === 0) return parts;
  const last = parts[parts.length - 1];
  if (/\.(ts|tsx|js|mjs)\.txt$/i.test(last)) {
    return [...parts.slice(0, -1), last.replace(/\.txt$/i, "")];
  }
  return parts;
}

function fixtureContentTypeFor(filePath) {
  // FIXTURE code sources must stay raw: a text/javascript response goes
  // through the esbuild transform and corrupts source-snapshot pins (the
  // specs themselves are served by esbuildPlugin — this function is only
  // used for readFileSync fixture responses).
  switch (extname(filePath)) {
    case ".ts":
    case ".tsx":
    case ".mjs":
    case ".js":
      return "text/plain";
    default:
      return contentTypeFor(filePath);
  }
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
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".woff":
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    case ".ico":
      return "image/x-icon";
    case ".map":
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
    if (pathname.startsWith("/tests/")) {
      // eslint-disable-next-line no-console
      console.log("FIXSERVE", pathname.slice(0, 80));
    }
    if (pathname.startsWith("/tests/frontend/")) {
      const rel = stripTxtSuffix(
        pathname
          .replace(/^\/tests\/frontend\//, "")
          .split("/")
          .filter(Boolean),
      );
      const diskPath = join(frontendDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      if (existsSync(diskPath) && statSync(diskPath).isFile()) {
        return { body: readFileSync(diskPath), type: fixtureContentTypeFor(diskPath) };
      }
      return undefined;
    }
    if (pathname.startsWith("/tests/root/")) {
      let rel = pathname
        .replace(/^\/tests\/root\//, "")
        .split("/")
        .filter(Boolean);
      rel = stripTxtSuffix(rel);
      const diskPath = join(frontendDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      if (existsSync(diskPath) && statSync(diskPath).isFile()) {
        return { body: readFileSync(diskPath), type: fixtureContentTypeFor(diskPath) };
      }
      return undefined;
    }
    if (pathname.startsWith("/tests/") && pathname.includes("/src/")) {
      const srcMarker = pathname.indexOf("/src/");
      let rel = pathname
        .slice(srcMarker + "/src/".length)
        .split("/")
        .filter(Boolean);
      rel = stripTxtSuffix(rel);
      const diskPath = join(srcDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      if (existsSync(diskPath) && statSync(diskPath).isFile()) {
        return { body: readFileSync(diskPath), type: fixtureContentTypeFor(diskPath) };
      }
      return undefined;
    }
    if (pathname.startsWith("/docs/")) {
      const rel = stripTxtSuffix(
        pathname
          .replace(/^\/docs\//, "")
          .split("/")
          .filter(Boolean),
      );
      const diskPath = join(repoRoot, "docs", ...rel.map((part) => part.replace(/\.\./g, "")));
      if (existsSync(diskPath) && statSync(diskPath).isFile()) {
        return { body: readFileSync(diskPath), type: fixtureContentTypeFor(diskPath) };
      }
      return undefined;
    }
    if (pathname.startsWith("/yona-original/")) {
      const rel = stripTxtSuffix(
        pathname
          .replace(/^\/yona-original\//, "")
          .split("/")
          .filter(Boolean),
      );
      const diskPath = join(legacyDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      if (existsSync(diskPath) && statSync(diskPath).isFile()) {
        return { body: readFileSync(diskPath), type: fixtureContentTypeFor(diskPath) };
      }
      return undefined;
    }
    // globSync support: /__wtr_glob__/<url-encoded pattern> -> JSON line list.
    if (pathname.startsWith("/__wtr_glob__/")) {
      const pattern = decodeURIComponent(pathname.slice("/__wtr_glob__/".length));
      let root = srcDir;
      let relPattern = pattern;
      if (pattern.startsWith("src/")) {
        relPattern = pattern.slice("src/".length);
      } else if (pattern.startsWith("../")) {
        root = repoRoot;
        relPattern = pattern.slice(3);
      }
      const matches = globSync(relPattern, { cwd: root, onlyFiles: true, dot: false });
      const prefixed = matches.map((match) =>
        pattern.startsWith("src/") ? `src/${match}` : match,
      );
      return { body: prefixed.join("\n"), type: "text/plain" };
    }
    // API paths must 404 (the compat harness fetch-mocks them; a 200 index.html
    // response would desync the app's JSON parsing).
    if (pathname.startsWith(`${basePath}/api/`)) {
      // @web/dev-server drops the `status` field of a serve() return object;
      // set it on the context instead (serveIndex pattern).
      context.status = 404;
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
  plugins: [fixturePlugin, esbuildPlugin({ ts: true })],
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
