import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const defaultRoot = resolve(repoRoot, ".agent/real-data-parity/2026-08-01");

function readJson(path) {
  if (!existsSync(path)) throw new Error(`missing route parity artifact: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function patternRegex(pattern) {
  const pathname = pattern.split("?", 1)[0];
  const escaped = pathname.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
  const parameterized = escaped.replace(/:[^/]+/gu, "[^/]+");
  return new RegExp(`^${parameterized.replace(/\*[^/]+/gu, ".+")}/?$`, "u");
}

export function routePatternForPath(path, patterns) {
  const pathname = path.split("?", 1)[0];
  const candidates = patterns.filter((pattern) => patternRegex(pattern).test(pathname));
  return candidates.sort(
    (left, right) =>
      right.split("/").filter((part) => !part.startsWith(":") && !part.startsWith("*")).length -
      left.split("/").filter((part) => !part.startsWith(":") && !part.startsWith("*")).length,
  )[0] ?? pathname;
}

function cardIndex(sweep) {
  return new Map((sweep.comparison ?? []).map((card) => [card.path, card]));
}

function categoriesFor(path, desktop, mobile) {
  const categories = new Set([
    ...(desktop?.diffErrors ?? []),
    ...(mobile?.diffErrors ?? []),
    ...(desktop?.localErrors ?? []),
    ...(mobile?.localErrors ?? []),
  ]);
  for (const card of [desktop, mobile]) {
    if (card?.statusDelta && card.statusDelta !== "200->200") categories.add("HTTP status delta");
  }
  return [...categories].sort();
}

export function buildRouteGoalQueue({ manifest, desktop, mobile }) {
  const desktopCards = cardIndex(desktop);
  const mobileCards = cardIndex(mobile);
  const authBlocked = [desktop, mobile].every((sweep) =>
    sweep?.legacy?.authStatus === "AUTH_BLOCKED" && sweep?.local?.authStatus === "AUTH_BLOCKED",
  );
  const knownGaps = new Set(manifest.knownLegacyOnlyGaps ?? []);
  const entries = (manifest.liveLegacyPaths ?? []).map((path) => {
    const desktopCard = desktopCards.get(path) ?? null;
    const mobileCard = mobileCards.get(path) ?? null;
    const diffCategories = categoriesFor(path, desktopCard, mobileCard);
    const classification = knownGaps.has(path)
      ? "DEFERRED"
      : authBlocked
        ? "AUTH_BLOCKED"
        : diffCategories.length > 0
          ? "QUEUED"
          : "QUEUED";
    const routePattern = routePatternForPath(path, manifest.legacyRoutePatterns ?? []);
    const stableKey = `${routePattern}|anonymous|ko-KR|unknown|initial|${path}`;
    return {
      id: `real-data-${createHash("sha256").update(stableKey).digest("hex").slice(0, 16)}`,
      routePattern,
      pathStoredLocally: true,
      localPath: path,
      auth: authBlocked ? "unknown" : "anonymous",
      locale: "ko-KR",
      dataState: "unknown",
      interactionState: "initial",
      viewports: ["desktop", "mobile"],
      manifestSource: "route-manifest.liveLegacyPaths",
      diffCategories,
      desktop: desktopCard ? { legacyOk: desktopCard.legacyOk, localOk: desktopCard.localOk, statusDelta: desktopCard.statusDelta } : null,
      mobile: mobileCard ? { legacyOk: mobileCard.legacyOk, localOk: mobileCard.localOk, statusDelta: mobileCard.statusDelta } : null,
      classification,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    mode: "real-data-route-state-queue",
    sourceArtifacts: ["route-manifest.json", "final-desktop/latest.json", "final-mobile/latest-mobile.json"],
    counts: {
      liveLegacyPaths: entries.length,
      classifications: Object.fromEntries([...new Set(entries.map((entry) => entry.classification))].sort().map((key) => [key, entries.filter((entry) => entry.classification === key).length])),
    },
    entries,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(process.env.YORAM_SWEEP_OUTPUT_DIR ?? defaultRoot);
  const queue = buildRouteGoalQueue({
    manifest: readJson(resolve(root, "route-manifest.json")),
    desktop: readJson(resolve(root, "final-desktop/latest.json")),
    mobile: readJson(resolve(root, "final-mobile/latest-mobile.json")),
  });
  mkdirSync(root, { recursive: true });
  const outputPath = resolve(root, "route-goal-queue.json");
  writeFileSync(outputPath, `${JSON.stringify(queue, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, counts: queue.counts }, null, 2));
}
