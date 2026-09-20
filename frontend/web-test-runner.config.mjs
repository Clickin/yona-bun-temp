// Pilot @web/test-runner config for the in-browser e2e parity suite.
// The converted specs run entirely in the browser; WTR receives only the
// per-test pass/fail result (no per-assertion IPC). The app-under-test mounts
// in a same-origin iframe via the compat harness; this server serves the
// legacy fixture sources + route sources the specs read via readFileSync.
import { esbuildPlugin } from "@web/dev-server-esbuild";
import { defaultReporter } from "@web/test-runner";
import { readFileSync, existsSync, statSync, globSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, extname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = join(repoRoot, "frontend", "dist");
const srcDir = join(repoRoot, "frontend", "src");
const frontendDir = join(repoRoot, "frontend");
const legacyDir = join(repoRoot, "yona-original");
const basePath = "/yona";
const metricsEnabled = process.env.WTR_METRICS === "1";
const metricsMarker = "__WTR_METRICS__";

const RUNTIME_CONFIG_SCRIPT = '<script>window.__YONA_RUNTIME_CONFIG__={basePath:"/yona"};</script>';

const FETCH_MOCK_SCRIPT = `<script>
  // The specs' expected fixtures are English (legacy @Messages resolved to en);
  // Chrome inherits the system locale (ko) even with --lang, so pin the app's
  // language resolution (frontend/src/i18n.tsx reads navigator.languages).
  try {
    Object.defineProperty(navigator, "language", { get: () => "en-US", configurable: true });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US"], configurable: true });
  } catch (e) {}
  window.fetch = function (...args) { return parent.__wtrMockFetch.apply(parent, args); };
  // Legacy-compatible forms submit natively (method=post action=...); the
  // iframe navigation swallows the POST. Route non-React POST submits
  // (defaultPrevented false) through the mock so waitForRequest sees them.
  window.addEventListener("submit", (event) => {
    if (event.defaultPrevented) return;
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const method = (form.method || "GET").toUpperCase();
    if (method !== "POST") return;
    event.preventDefault();
    const url = new URL(form.action, location.href).href;
    window.fetch(url, { method, body: new FormData(form), credentials: "include" });
  });
  // The app uploads with progress callbacks via XMLHttpRequest (api/attachments
  // passes onProgress). Route XHR through the same mock registry as fetch.
  (function () {
    const NativeXHR = window.XMLHttpRequest;
    class WtrXHR extends NativeXHR {
      open(method, url, asyncFlag, username, password) {
        this.__wtrMethod = method;
        this.__wtrUrl = url;
        this.__wtrAsync = asyncFlag !== false;
        return super.open(method, url, asyncFlag, username, password);
      }
      setRequestHeader(name, value) {
        // Forward CSRF/auth headers to the mock registry (the app uploads
        // via XHR with x-csrf-token; without this the CSRF checks read "").
        this.__wtrHeaders = this.__wtrHeaders ?? {};
        this.__wtrHeaders[name] = value;
      }
      send(body) {
        const xhr = this;
        // Sync XHR (readFileSync fixtures use open(..., false)) cannot wait
        // on the async mock registry; pass through to the native sync path.
        if (xhr.__wtrAsync === false) {
          return super.send(body);
        }
        parent.__wtrMockFetch(this.__wtrUrl, { method: this.__wtrMethod, body, headers: this.__wtrHeaders ?? {} })
          .then((response) => {
            return response.text().then((text) => {
              Object.defineProperty(xhr, "status", { configurable: true, get: () => response.status });
              Object.defineProperty(xhr, "responseText", { configurable: true, get: () => text });
              Object.defineProperty(xhr, "response", { configurable: true, get: () => {
                try { return JSON.parse(text); } catch { return text; }
              } });
              Object.defineProperty(xhr, "statusText", { configurable: true, get: () => "OK" });
              xhr.dispatchEvent(new Event("readystatechange"));
              Object.defineProperty(xhr, "readyState", { configurable: true, get: () => 4 });
              xhr.dispatchEvent(new Event("readystatechange"));
              // Upload-target progress completes (the app's upload.onload ->
              // onProgress(100) drives the row's progress bar).
              try {
                const upload = xhr.upload;
                upload.dispatchEvent(new ProgressEvent("progress", { lengthComputable: true, loaded: 1, total: 1 }));
                upload.dispatchEvent(new ProgressEvent("load", { loaded: 1, total: 1 }));
              } catch (e) {}
              xhr.dispatchEvent(new ProgressEvent("load", { loaded: 1, total: 1 }));
              xhr.dispatchEvent(new Event("loadend"));
            });
          })
          .catch(() => {});
        return undefined;
      }
    }
    window.XMLHttpRequest = WtrXHR;
  })();
  try { for (const hook of parent.__wtrInitHooks ?? []) { eval("(" + hook.source + ")(" + (hook.argJson || "") + ")"); } } catch (e) {}
  window.confirm = (msg) => {
    parent.__wtrConfirmResult = undefined;
    parent.__wtrEmit("dialog", {
      type: () => "confirm",
      message: () => msg,
      // The test's dialog listener runs synchronously during __wtrEmit
      // (direct parent function call), so accept()/dismiss() below set the
      // result BEFORE confirm returns. Playwright parity: dismiss() -> false
      // (onClick preventDefault path), accept()/no listener -> true.
      accept: () => { parent.__wtrConfirmResult = true; },
      dismiss: () => { parent.__wtrConfirmResult = false; },
    });
    return parent.__wtrConfirmResult ?? true;
  };
  window.alert = (msg) => { parent.__wtrEmit("dialog", { type: () => "alert", message: () => msg, accept: () => {}, dismiss: () => {} }); };
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
    return "frontend/dist missing — run scripts/run-wtr-e2e.mjs (it builds first)";
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

function fixtureRevision(filePath) {
  try {
    const info = statSync(filePath);
    return `${info.mtimeMs}:${info.size}`;
  } catch {
    return undefined;
  }
}

function serveFixture(filePath) {
  if (!existsSync(filePath)) return undefined;
  const info = statSync(filePath);
  if (!info.isFile()) return undefined;
  const revision = fixtureRevision(filePath);
  return {
    body: readFileSync(filePath),
    type: fixtureContentTypeFor(filePath),
    ...(revision ? { headers: { "x-wtr-fixture-revision": revision } } : {}),
  };
}

// The built index.html uses relative asset URLs (vite base "./"). At nested
// SPA routes the browser resolves ./assets/* and ./legacy-assets/* against the
// route path (e.g. /yona/users/loginform -> /yona/users/assets/index.js). The
// runtime server rewrites those to dist; mirror it here or the fixture plugin's
// SPA fallback serves index.html as the module script and the app never boots.
function serveNestedStaticAsset(pathname) {
  for (const marker of ["assets", "legacy-assets"]) {
    const markerPath = `/${marker}/`;
    const idx = pathname.indexOf(markerPath, basePath.length);
    if (idx === -1) continue;
    const routePrefix = pathname.slice(0, idx);
    if (routePrefix === basePath || !routePrefix.startsWith(`${basePath}/`)) continue;
    const rel = pathname
      .slice(idx + markerPath.length)
      .split("/")
      .filter(Boolean)
      .map((part) => part.replace(/\.\./g, ""));
    if (marker === "assets" && rel[0] === "images") {
      // Root /yona/assets/images/ aliases dist/legacy-assets/images; keep the
      // same alias for nested routes.
      const distPath = join(distDir, "legacy-assets", "images", ...rel.slice(1));
      if (existsSync(distPath) && statSync(distPath).isFile()) {
        return { body: readFileSync(distPath), type: contentTypeFor(distPath) };
      }
      continue;
    }
    if (marker === "assets") {
      const distPath = join(distDir, "assets", ...rel);
      if (existsSync(distPath) && statSync(distPath).isFile()) {
        return { body: readFileSync(distPath), type: contentTypeFor(distPath) };
      }
      continue;
    }
    const sourcePath = join(legacyDir, "public", ...rel);
    if (existsSync(sourcePath) && statSync(sourcePath).isFile()) {
      return { body: readFileSync(sourcePath), type: contentTypeFor(sourcePath) };
    }
    const distPath = join(distDir, "legacy-assets", ...rel);
    if (existsSync(distPath) && statSync(distPath).isFile()) {
      return { body: readFileSync(distPath), type: contentTypeFor(distPath) };
    }
  }
  return undefined;
}

function isNestedStaticAssetPath(pathname) {
  for (const marker of ["assets", "legacy-assets"]) {
    const markerPath = `/${marker}/`;
    const idx = pathname.indexOf(markerPath, basePath.length);
    if (idx === -1) continue;
    const routePrefix = pathname.slice(0, idx);
    if (routePrefix !== basePath && routePrefix.startsWith(`${basePath}/`)) return true;
  }
  return false;
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
    if (pathname.startsWith("/yona/assets/images/")) {
      const rel = pathname
        .replace(/^\/yona\/assets\/images\//, "")
        .split("/")
        .filter(Boolean);
      // Vite copies public/images to dist/images; legacy /assets/images/...
      // avatar fallbacks resolve through this alias.
      const distPath = join(
        distDir,
        "legacy-assets",
        "images",
        ...rel.map((part) => part.replace(/\.\./g, "")),
      );
      if (existsSync(distPath) && statSync(distPath).isFile()) {
        return { body: readFileSync(distPath), type: contentTypeFor(distPath) };
      }
      return undefined;
    }
    if (pathname.startsWith("/yona/legacy-assets/")) {
      const rel = pathname
        .replace(/^\/yona\/legacy-assets\//, "")
        .split("/")
        .filter(Boolean);
      // Source images live in yona-original/public (images/...); the generated
      // legacy-fallback.css is a dist build artifact (frontend/dist/legacy-assets).
      const sourcePath = join(legacyDir, "public", ...rel.map((part) => part.replace(/\.\./g, "")));
      if (existsSync(sourcePath) && statSync(sourcePath).isFile()) {
        return { body: readFileSync(sourcePath), type: contentTypeFor(sourcePath) };
      }
      const distPath = join(
        distDir,
        "legacy-assets",
        ...rel.map((part) => part.replace(/\.\./g, "")),
      );
      if (existsSync(distPath) && statSync(distPath).isFile()) {
        return { body: readFileSync(distPath), type: contentTypeFor(distPath) };
      }
      return undefined;
    }
    // Nested SPA routes resolve the index.html's relative ./assets and
    // ./legacy-assets URLs against the route path; serve the real dist files
    // (see serveNestedStaticAsset) before the generic basePath SPA fallback.
    {
      const nestedStatic = serveNestedStaticAsset(pathname);
      if (nestedStatic !== undefined) return nestedStatic;
    }
    if (pathname.startsWith("/tests/frontend/")) {
      const rel = stripTxtSuffix(
        pathname
          .replace(/^\/tests\/frontend\//, "")
          .split("/")
          .filter(Boolean),
      );
      const diskPath = join(frontendDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      return serveFixture(diskPath);
    }
    if (pathname.startsWith("/tests/root/")) {
      let rel = pathname
        .replace(/^\/tests\/root\//, "")
        .split("/")
        .filter(Boolean);
      rel = stripTxtSuffix(rel);
      const diskPath = join(frontendDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      return serveFixture(diskPath);
    }
    if (pathname.startsWith("/tests/") && pathname.includes("/src/")) {
      const srcMarker = pathname.indexOf("/src/");
      let rel = pathname
        .slice(srcMarker + "/src/".length)
        .split("/")
        .filter(Boolean);
      rel = stripTxtSuffix(rel);
      const diskPath = join(srcDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      return serveFixture(diskPath);
    }
    if (pathname.startsWith("/docs/")) {
      const rel = stripTxtSuffix(
        pathname
          .replace(/^\/docs\//, "")
          .split("/")
          .filter(Boolean),
      );
      const diskPath = join(repoRoot, "docs", ...rel.map((part) => part.replace(/\.\./g, "")));
      return serveFixture(diskPath);
    }
    if (pathname.startsWith("/yona-original/")) {
      const rel = stripTxtSuffix(
        pathname
          .replace(/^\/yona-original\//, "")
          .split("/")
          .filter(Boolean),
      );
      const diskPath = join(legacyDir, ...rel.map((part) => part.replace(/\.\./g, "")));
      return serveFixture(diskPath);
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

// SPA routes under /yona/ ending in .ts are served as text/html by the
// fixture plugin (built-dist app routes — e.g. a not-found URL whose last
// segment looks like a TS file). The esbuild plugin's default resolveMimeType
// would re-type them as application/javascript and transform the HTML -> 500;
// skip the mime override for the whole app base (its static assets already
// carry correct types).
const esbuild = esbuildPlugin({ ts: true });
const originalResolveMimeType = esbuild.resolveMimeType.bind(esbuild);
esbuild.resolveMimeType = (context) => {
  const pathname = context.path ?? context.url.split("?")[0];
  if (
    pathname.startsWith("/yona/") &&
    !pathname.startsWith("/yona/assets/") &&
    !pathname.startsWith("/yona/api/") &&
    !pathname.startsWith("/yona/legacy-assets/") &&
    !isNestedStaticAssetPath(pathname)
  ) {
    // SPA fallback routes under /yona/ are served as text/html by the
    // fixture plugin; without an explicit override the core falls back to the
    // URL-extension mime (.ts -> text/javascript) and the browser renders the
    // HTML source instead of booting the app.
    return "text/html";
  }
  return originalResolveMimeType(context);
};
const originalTransform = esbuild.transform.bind(esbuild);
esbuild.transform = async (context) => {
  const pathname = context.path ?? context.url.split("?")[0];
  if (pathname.startsWith("/yona/")) {
    // eslint-disable-next-line no-console
    console.log(
      "WTRTRANSFORM-SKIP",
      pathname.slice(0, 50),
      "type:",
      context.response?.type,
      "bodyLen:",
      (context.body ?? "").length,
    );
    // The built app is served verbatim under /yona/ (dist bundles + SPA
    // fallback HTML whose last URL segment may look like a .ts file).
    // Never esbuild-transform it — the HTML would crash the ts loader.
    return context.body;
  }
  return originalTransform(context);
};

let chromiumLaunches = 0;
let sessionStarts = 0;
let sessionStops = 0;
const sessionTimings = new Map();

function flattenTestResults(suite, output = []) {
  if (!suite) return output;
  for (const test of suite.tests ?? []) output.push(test);
  for (const child of suite.suites ?? []) flattenTestResults(child, output);
  return output;
}

function metricPayloads(session) {
  const payloads = [];
  for (const log of session.logs ?? []) {
    for (const value of log ?? []) {
      if (typeof value !== "string" || !value.startsWith(metricsMarker)) continue;
      try {
        const payload = JSON.parse(value.slice(metricsMarker.length));
        if (payload?.kind === "test") payloads.push(payload);
      } catch {
        // A malformed diagnostic must not change the WTR outcome.
      }
    }
  }
  return payloads;
}

function sumMetricRecords(records) {
  const total = {};
  for (const record of records) {
    for (const [key, value] of Object.entries(record ?? {})) {
      if (
        key === "kind" ||
        key === "name" ||
        key === "status" ||
        key === "durationMs" ||
        key === "teardown"
      )
        continue;
      if (typeof value === "number") total[key] = (total[key] ?? 0) + value;
    }
    if (record.teardown) {
      total.teardownChecks = (total.teardownChecks ?? 0) + 1;
      if (record.teardown.ok) total.teardownOk = (total.teardownOk ?? 0) + 1;
    }
  }
  return total;
}

const timeoutMetricFields = [
  ["goto-load", "gotoLoadTimeouts"],
  ["real-mouse", "realMouseTimeouts"],
  ["response", "responseTimeouts"],
  ["event", "eventTimeouts"],
  ["request", "requestTimeouts"],
];

function timeoutSummary(records) {
  return Object.fromEntries(
    timeoutMetricFields
      .map(([kind, field]) => [
        kind,
        records.reduce((total, record) => total + (record[field] ?? 0), 0),
      ])
      .filter(([, count]) => count > 0),
  );
}

function metricsReporter() {
  let startedAt = Date.now();
  let peakRssBytes = process.memoryUsage().rss;
  let rssTimer;

  const sampleRss = () => {
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  };

  return {
    start({ startTime }) {
      startedAt = startTime || Date.now();
      sampleRss();
      rssTimer = setInterval(sampleRss, 250);
      rssTimer.unref?.();
    },
    async stop({ sessions }) {
      if (rssTimer) clearInterval(rssTimer);
      sampleRss();
      const fileResults = sessions.map((session) => {
        const tests = flattenTestResults(session.testResults);
        const metrics = metricPayloads(session);
        const metricsByName = new Map();
        for (const metric of metrics) {
          const list = metricsByName.get(metric.name) ?? [];
          list.push(metric);
          metricsByName.set(metric.name, list);
        }
        const testResults = tests.map((test) => {
          const list = metricsByName.get(test.name) ?? [];
          const metric = list.shift();
          return {
            name: test.name,
            passed: test.passed,
            skipped: test.skipped,
            durationMs: test.duration ?? null,
            ...(metric ? { harness: metric } : {}),
            ...(metric ? { timeouts: timeoutSummary([metric]) } : {}),
          };
        });
        const timing = sessionTimings.get(session.id);
        return {
          file: relative(repoRoot, session.testFile),
          passed: session.passed ?? false,
          testCount: tests.length,
          elapsedMs: timing ? timing.end - timing.start : null,
          tests: testResults,
          timeouts: timeoutSummary(metrics),
          harness: sumMetricRecords(metrics),
        };
      });
      const allTests = fileResults.flatMap((file) => file.tests);
      const unassignedMetricRecords = sessions.flatMap((session) => {
        const knownNames = new Map();
        for (const test of fileResults.find(
          (file) => file.file === relative(repoRoot, session.testFile),
        )?.tests ?? []) {
          knownNames.set(test.name, (knownNames.get(test.name) ?? 0) + 1);
        }
        return metricPayloads(session).filter((metric) => {
          const remaining = knownNames.get(metric.name) ?? 0;
          if (remaining === 0) return true;
          knownNames.set(metric.name, remaining - 1);
          return false;
        });
      });
      const output = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        runId: process.env.WTR_METRICS_RUN_ID ?? null,
        shard: process.env.WTR_METRICS_SHARD ?? null,
        pid: process.pid,
        wtr: {
          wallClockMs: Math.max(0, Date.now() - startedAt),
          chromiumLaunches,
          sessionStarts,
          sessionStops,
          peakRssBytes,
          testsFinishTimeoutMs: 3600000,
        },
        tests: {
          runnableSpecs: sessions.length,
          runnableTests: allTests.length,
          passed: allTests.filter((test) => test.passed && !test.skipped).length,
          failed: allTests.filter((test) => !test.passed && !test.skipped).length,
          skipped: allTests.filter((test) => test.skipped).length,
        },
        files: fileResults,
        harness: {
          ...fileResults.reduce((total, file) => {
            for (const [key, value] of Object.entries(file.harness))
              total[key] = (total[key] ?? 0) + value;
            return total;
          }, {}),
          ...sumMetricRecords(unassignedMetricRecords),
        },
      };
      const outputPath = process.env.WTR_METRICS_OUTPUT
        ? resolve(process.env.WTR_METRICS_OUTPUT)
        : join(repoRoot, ".agent", "wtr-metrics", `${Date.now()}-${process.pid}-wtr.json`);
      mkdirSync(resolve(outputPath, ".."), { recursive: true });
      writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    },
  };
}

// Real CSS :hover/:active require a real mouse. Expose Chrome's Puppeteer
// mouse to the test page via a bridge; wtr-compat's Locator.hover()/mouse
// down()/up() call it after their synthetic dispatch.
const { ChromeLauncher } = await import("@web/test-runner-chrome");
class RealMouseLauncher extends ChromeLauncher {
  launchBrowser(options = {}) {
    chromiumLaunches += 1;
    return super.launchBrowser(options);
  }

  async startSession(sessionId, url) {
    sessionStarts += 1;
    sessionTimings.set(sessionId, { start: Date.now() });
    await super.startSession(sessionId, url);
    const page = this.activePages.get(sessionId).puppeteerPage;
    // Modifier-click popups can leave a reused test page hidden and suspend its rAF.
    await page.bringToFront();
    try {
      await page.exposeFunction("__wtrRealMouse", async (op, x, y) => {
        if (op === "move") await page.mouse.move(x, y);
        if (op === "down") {
          await page.mouse.move(x, y);
          await page.mouse.down();
        }
        if (op === "up") {
          await page.mouse.move(x, y);
          await page.mouse.up();
        }
        // Resize the real browser viewport to the requested test viewport so
        // the iframe (fixed at 0,0 with the same size) fills it exactly and
        // real-mouse coords map 1:1 (the WTR default 800x600 page clips moves).
        if (op === "setViewport") {
          await page.bringToFront();
          await page.setViewport({ width: x, height: y });
        }
      });
    } catch (error) {
      // WTR can reuse a Chrome page for another session. In that case the
      // bridge is already installed and remains valid for the reused page.
      if (!String(error?.message ?? error).includes("already exists")) throw error;
    }
  }

  async stopSession(sessionId) {
    sessionStops += 1;
    const timing = sessionTimings.get(sessionId);
    if (timing) timing.end = Date.now();
    return super.stopSession(sessionId);
  }
}

export default {
  plugins: [fixturePlugin, esbuild],
  files: ["tests/wtr/**/*.e2e.ts"],
  ...(metricsEnabled
    ? {
        reporters: [defaultReporter(), metricsReporter()],
        testRunnerHtml: (testRunnerImport) =>
          `<!DOCTYPE html><html><head></head><body><script>globalThis.__WTR_METRICS__=true;</script><script type="module" src="${testRunnerImport}"></script></body></html>`,
      }
    : {}),
  mimeTypes: { "**/*.ts": "text/javascript" },
  port: 8128,
  nodeResolve: false,
  // concurrency=1: WTR creates one browser tab per test file; in headless
  // Chrome only the active tab reports visibilityState "visible" — every
  // other concurrent tab is hidden (rAF fully paused, image fetches deferred,
  // TanStack Query retries paused via focusManager.visibilityState). That
  // hidden state made group runs fail specs that pass solo. Serializing per
  // WTR instance keeps the single tab always active, so every test runs in
  // the solo-visible state. Shards (WTR_SHARDS=2..4) restore parallelism at
  // the instance level.
  concurrency: 1,
  // Serial per instance (see concurrency note): a shard of ~100 files takes
  // well over 10 min, so the default testsFinishTimeout would abort long
  // shards as false suite-hangs.
  testsFinishTimeout: 3600000,
  testFramework: { config: { timeout: 60000 } },
  browserLogs: true,
  logBrowserLogs: true,
  browsers: [
    new RealMouseLauncher(
      {
        headless: true,
        // The specs' expected fixtures are English (legacy @Messages resolved
        // to en); without --lang Chrome inherits the system locale (ko) and
        // every text assertion mismatches.
        args: ["--no-first-run", "--lang=en-US"],
      },
      ({ browser }) => browser.defaultBrowserContext(),
      ({ context }) => context.newPage(),
      undefined,
      1,
    ),
  ],
};
