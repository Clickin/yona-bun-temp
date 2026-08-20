// Initial lane split for the DOM-parity fast lane (B4.1). Static grep only —
// the authority is the B3 capability guard: if a dom-lane run raises
// DOM_UNSUPPORTED, move that file to the chrome list. Regenerate after any
// physical split (B4.2): `node scripts/classify-e2e-specs.mjs --regen`.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const specDir = join(root, "frontend", "tests", "wtr");
const manifestPath = join(root, "frontend", "tests", "e2e-lane-manifest.json");

// Capability patterns that prove a spec needs the browser lane. Matched
// against the whole file (case-sensitive, line-scoped). The list is
// deliberately conservative: unknown patterns keep a file in chrome, and the
// capability guard is the final authority.
const CHROME_PATTERNS = [
  /\bsaveScreenshot\s*\(/,
  /\btoHaveCSS\s*\(/,
  /\bgetComputedStyle\s*\(/,
  /\bboundingBox\s*\(/,
  /\bgetBoundingClientRect\s*\(/,
  /\bsetViewportSize\s*\(/,
  /\bviewport\s*:/,
  /\bwaitForResponse\s*\(/,
  /\bwaitForLoadState\s*\(/,
  /\bon\(\s*["']response/,
  /\bon\(\s*["']request/,
  /\bscreenshot\s*\(/,
  /\buploadFile\s*\(/,
  /\bpage\.drag\s*\(/,
  /\brealMouse/,
  /\bdblclick\s*\(/,
  /\bexpect\.poll/,
];

// Harness-internal diagnostics (deliberate DIAG throws / iframe-fetch
// interception) exercise the WTR harness itself, not app DOM — always chrome.
const CHROME_FILES = [/^_diag-/u, /^wtr-smoke/u];

function classify(source, fileName) {
  if (CHROME_FILES.some((pattern) => pattern.test(fileName))) return "chrome";
  for (const pattern of CHROME_PATTERNS) {
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
  console.log(
    `classify-e2e-specs: ${manifest.dom.length} dom / ${manifest.chrome.length} chrome (${specs.length} total) -> ${manifestPath}`,
  );
}

main();
