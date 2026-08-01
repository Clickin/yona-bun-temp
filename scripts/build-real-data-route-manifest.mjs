import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, relative } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const outputDir = resolve(
  repoRoot,
  process.env.YORAM_SWEEP_OUTPUT_DIR ?? ".agent/real-data-parity/2026-08-01",
);
const legacyBaseUrl = (process.env.YONA_LEGACY_BASE_URL ?? "http://127.0.0.1:9000").replace(/\/$/u, "");
const outputPath = resolve(outputDir, "route-manifest.json");
const knownLegacyOnlyGaps = [
  "/sites/setting",
  "/sites/noAvatarUsers",
  "/sites/setAttachmentToUserAvatar",
  "/sites/export",
  "/labels",
  "/categories",
  "project label/category endpoints",
  "label CSS routes",
];
const discoverySeeds = [
  "/",
  "/projects",
  "/orgs",
  "/search?keyword=yona&searchType=auto",
  "/notifications",
  "/user/issues",
  "/sites/userList",
  "/sites/projectList",
];
const blockedPrefixes = ["/-_-api/", "/api/", "/assets/", "/files/", "/users/logout"];
const blockedActions = /\/(?:delete|unwatch|vote)(?:\/|$)/u;
const blockedExtensions = /\.(?:css|gif|ico|jpeg|jpg|js|map|png|svg|woff2?)$/u;

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function normalizePath(baseUrl, href) {
  try {
    const base = new URL(baseUrl);
    const url = new URL(href, baseUrl);
    if (url.origin !== base.origin) return null;
    const pathname = decodeURIComponent(url.pathname);
    if (
      blockedPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
      blockedActions.test(pathname) ||
      blockedExtensions.test(pathname)
    ) {
      return null;
    }
    return `${pathname}${url.search}`.replace(/\/$/u, "") || "/";
  } catch {
    return null;
  }
}

function legacyRoutePatterns() {
  const source = readFileSync(resolve(repoRoot, "yona-original/conf/routes"), "utf8");
  return sortedUnique(
    source
      .split("\n")
      .map((line) => line.trim().match(/^(?:GET|POST|PUT|PATCH|DELETE|OPTIONS)\s+(\S+)/u)?.[1])
      .filter(Boolean),
  );
}

function frontendRouteFiles() {
  const root = resolve(repoRoot, "frontend/src/routes");
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.tsx?$/u.test(entry.name)) files.push(relative(repoRoot, path));
    }
  };
  visit(root);
  return files.sort();
}

function generatedRoutePatterns() {
  const source = readFileSync(resolve(repoRoot, "frontend/src/routeTree.gen.ts"), "utf8");
  return sortedUnique([...source.matchAll(/fullPath:\s*'([^']+)'/gu)].map((match) => match[1]));
}

function auditPages() {
  const path = resolve(repoRoot, ".agent/legacy-html-page-audit/latest.json");
  if (!existsSync(path)) return [];
  const payload = JSON.parse(readFileSync(path, "utf8"));
  return sortedUnique(payload.discoveredPageLinks ?? payload.pages ?? []);
}

async function discoverLivePaths() {
  const browser = await chromium.launch({
    ...(process.env.PW_CHANNEL && process.env.PW_CHANNEL !== "chromium"
      ? { channel: process.env.PW_CHANNEL }
      : {}),
    headless: true,
  });
  const context = await browser.newContext({ locale: "ko-KR" });
  const page = await context.newPage();
  const queue = [...discoverySeeds];
  const seen = new Set();
  const discovered = new Set();
  while (queue.length > 0 && seen.size < 250) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    discovered.add(path);
    await page.goto(`${legacyBaseUrl}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    }).catch(() => {});
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""))
      .catch(() => []);
    for (const href of hrefs) {
      const normalized = normalizePath(legacyBaseUrl, href);
      if (normalized && !seen.has(normalized) && !queue.includes(normalized)) queue.push(normalized);
    }
  }
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  return sortedUnique([...discovered]);
}

const livePaths = await discoverLivePaths();
const manifest = {
  generatedAt: new Date().toISOString(),
  mode: "real-data-route-inventory",
  sources: [
    "yona-original/conf/routes",
    "yona-original/app/views/**/*.scala.html",
    "frontend/src/routeTree.gen.ts",
    "frontend/src/routes/**/*.tsx",
    ".agent/legacy-html-page-audit/latest.json",
    "live Legacy anchor discovery",
  ],
  legacyRoutePatterns: legacyRoutePatterns(),
  generatedRoutePatterns: generatedRoutePatterns(),
  frontendRouteFiles: frontendRouteFiles(),
  legacyAuditPages: auditPages(),
  liveLegacyPaths: livePaths,
  reachableParameterizedInstances: livePaths.filter((path) => /\/[^/]+\/[^/]+/u.test(path)),
  staticCoverage: sortedUnique([...legacyRoutePatterns(), ...generatedRoutePatterns()]),
  knownLegacyOnlyGaps,
  counts: {
    legacyRoutePatterns: legacyRoutePatterns().length,
    generatedRoutePatterns: generatedRoutePatterns().length,
    frontendRouteFiles: frontendRouteFiles().length,
    legacyAuditPages: auditPages().length,
    liveLegacyPaths: livePaths.length,
    reachableParameterizedInstances: livePaths.filter((path) => /\/[^/]+\/[^/]+/u.test(path)).length,
  },
};
mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, counts: manifest.counts }, null, 2));
