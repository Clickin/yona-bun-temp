// Lane classification for the DOM-parity fast lane (B4). Static grep only —
// the authority is the B3 capability guard: if a dom-lane run raises
// DOM_UNSUPPORTED, move that file to the chrome list. Regenerate after any
// physical split: `node scripts/classify-e2e-specs.mjs --regen`.
//
// Capability families mirror docs/provenance/tailwind-dom-parity-pivot.md
// ("Capability guard definitions"): geometry, computed-style, hit-test,
// document-reload, native-navigation, window-realm-reset. A file matching any
// pattern of a family stays in chrome.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const specDir = join(root, "frontend", "tests", "wtr");
const manifestPath = join(root, "frontend", "tests", "e2e-lane-manifest.json");

// Capability families that prove a spec needs the browser lane. Matched
// against the whole file (case-sensitive, line-scoped). The lists are
// deliberately conservative: unknown patterns keep a file in chrome, and the
// capability guard is the final authority. Lookbehinds exclude string
// literals of the `expect(source).not.toContain("window.parent...")` shape.
const CAPABILITY_PATTERNS = {
  geometry: [
    /\bboundingBox\s*\(/,
    /\bgetBoundingClientRect\s*\(/,
    // locator.screenshot()/page.screenshot() raise DOM_UNSUPPORTED:geometry
    // in dom-compat — real pixels are a browser capability.
    /\bsaveScreenshot\s*\(/,
    /\bscreenshot\s*\(/,
  ],
  "computed-style": [/\btoHaveCSS\s*\(/, /\bgetComputedStyle\s*\(/],
  "hit-test": [
    /\belementFromPoint\s*\(/,
    /\brealMouse/,
    // coordinate clicks: click(x, y) or click({ position: ... })
    /\.\bclick\s*\(\s*-?\d/,
    /\.\bclick\s*\(\s*\{[^})]*\bposition\s*:/,
  ],
  "document-reload": [/\breload\s*\(/],
  "native-navigation": [
    /\bwindow\.location\s*\.\s*(?:href|assign|replace)\s*[=(]/,
    /(?<!["'`.\w])location\s*\.\s*(?:href\s*=|assign\s*\(|replace\s*\()/,
    /\bwindow\.open\s*\(/,
  ],
  "window-realm-reset": [
    /(?<!["'`.\w])window\.parent\b/,
    /(?<!["'`])\bcontentWindow\b/,
    /\bframes\s*\[/,
  ],
};

// Harness surface the dom-compat facade does not implement at all — calling
// it would crash with TypeError rather than raise a DOM_UNSUPPORTED guard,
// so the runtime guard could never promote these. Conservative chrome.
const HARNESS_ONLY_PATTERNS = [
  /\bwaitForResponse\s*\(/,
  /\bwaitForLoadState\s*\(/,
  /\bon\s*\(\s*["'](?:response|request)["']/,
  /\buploadFile\s*\(/,
  /\bpage\.drag\s*\(/,
  /\bpage\.setContent\s*\(/,
];

const ALL_CHROME_PATTERNS = [
  ...Object.values(CAPABILITY_PATTERNS).flat(),
  ...HARNESS_ONLY_PATTERNS,
];

// Harness-internal diagnostics (deliberate DIAG throws / iframe-fetch
// interception) exercise the WTR harness itself, not app DOM — always chrome.
const CHROME_FILES = [/^_diag-/u, /^wtr-smoke/u];
// Runtime-verified dom-lane failures (B4 rebalance): these depend on the WTR
// fixture middleware's fetch interception/timing, which the dom-compat route
// mock does not reproduce — deterministic timeouts under happy-dom, never a
// DOM_UNSUPPORTED guard. Conservative chrome until triaged.
const CHROME_FILES_OVERRIDE = [
  "ownership-project-new-fork.e2e.ts",
  "ownership-project-projectform.e2e.ts",
  "project-issue-list-fetch-lock.e2e.ts",
];

function classify(source, fileName) {
  // Physically split files carry their lane in the suffix (B4.2).
  if (/\.dom\.e2e\.ts$/u.test(fileName)) return "dom";
  if (/\.chrome\.e2e\.ts$/u.test(fileName)) return "chrome";
  if (CHROME_FILES.some((pattern) => pattern.test(fileName))) return "chrome";
  if (CHROME_FILES_OVERRIDE.includes(fileName)) return "chrome";
  for (const pattern of ALL_CHROME_PATTERNS) {
    if (pattern.test(source)) return "chrome";
  }
  return "dom";
}

function main() {
  const specs = readdirSync(specDir)
    .filter((name) => name.endsWith(".e2e.ts"))
    .sort();
  const manifest = { chrome: [], dom: [] };
  for (const name of specs) {
    const source = readFileSync(join(specDir, name), "utf8");
    manifest[classify(source, name)].push(`tests/wtr/${name}`);
  }

  // Manifest invariants: disjoint, cover the current inventory, no dupes.
  const inventory = new Set(specs.map((name) => `tests/wtr/${name}`));
  const listed = new Set([...manifest.chrome, ...manifest.dom]);
  const problems = [];
  for (const file of inventory) {
    if (!listed.has(file)) problems.push(`missing: ${file}`);
  }
  for (const file of listed) {
    if (!inventory.has(file)) problems.push(`stale: ${file}`);
  }
  if (manifest.chrome.length + manifest.dom.length !== inventory.size) {
    problems.push("duplicate or missing entries");
  }
  if (problems.length > 0) {
    console.error("manifest invariant violations:\n" + problems.join("\n"));
    process.exit(1);
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  // Capability summary for the remaining chrome set (report input).
  const capabilityCounts = {};
  for (const [capability, patterns] of Object.entries(CAPABILITY_PATTERNS)) {
    capabilityCounts[capability] = manifest.chrome.filter((file) =>
      patterns.some((pattern) => pattern.test(readFileSync(join(root, "frontend", file), "utf8"))),
    ).length;
  }
  console.log(
    `classify-e2e-specs: ${manifest.dom.length} dom / ${manifest.chrome.length} chrome (${specs.length} total) -> ${manifestPath}`,
  );
  console.log("chrome capability reasons:", JSON.stringify(capabilityCounts));
}

main();
