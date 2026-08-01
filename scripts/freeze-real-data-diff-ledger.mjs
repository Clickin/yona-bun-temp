import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const artifactRoot = resolve(
  repoRoot,
  process.env.YORAM_SWEEP_ROOT ?? ".agent/real-data-parity/2026-08-01",
);
const viewports = [
  ["desktop", resolve(artifactRoot, "desktop/latest.json")],
  ["mobile", resolve(artifactRoot, "mobile/latest-mobile.json")],
];

function readSweep(viewport, path) {
  if (!existsSync(path)) throw new Error(`missing ${viewport} sweep: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function categoriesForCard(card) {
  const categories = new Set();
  for (const value of [...(card.localErrors ?? []), ...(card.diffErrors ?? [])]) {
    categories.add(value);
  }
  if (card.statusDelta && card.statusDelta !== "200->200") categories.add("HTTP status delta");
  if (card.statusDelta === "legacy-missing") categories.add("route coverage gap");
  if (categories.size === 0) categories.add("no classified diff");
  return [...categories].sort();
}

const sweeps = viewports.map(([viewport, path]) => ({ viewport, sweep: readSweep(viewport, path) }));
const cards = sweeps.flatMap(({ viewport, sweep }) =>
  (sweep.comparison ?? []).map((card) => ({
    viewport,
    path: card.path,
    categories: categoriesForCard(card),
    statusDelta: card.statusDelta,
    legacyOk: card.legacyOk,
    localOk: card.localOk,
    textLengthDelta: card.textLengthDelta,
    localStylesheetRules: card.localStylesheetRules,
  })),
);
const categoryCounts = Object.fromEntries(
  [...new Set(cards.flatMap((card) => card.categories))]
    .sort()
    .map((category) => [category, cards.filter((card) => card.categories.includes(category)).length]),
);
const ledger = {
  generatedAt: new Date().toISOString(),
  mode: "real-data-pre-fix-read-only",
  authentication: Object.fromEntries(
    sweeps.map(({ viewport, sweep }) => [
      viewport,
      {
        legacy: sweep.legacy?.authStatus ?? "AUTH_BLOCKED",
        yoram: sweep.local?.authStatus ?? "AUTH_BLOCKED",
      },
    ]),
  ),
  viewportSummaries: Object.fromEntries(
    sweeps.map(({ viewport, sweep }) => [viewport, sweep.comparisonSummary]),
  ),
  categoryCounts,
  cards,
  attachmentPolicy: "attachment-excluded",
};
writeFileSync(resolve(artifactRoot, "diff-ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
const summaryLines = [
  "# Real-data whole-route parity audit",
  "",
  `Generated: ${ledger.generatedAt}`,
  "Mode: real-data pre-fix read-only; route implementation unchanged during capture.",
  "",
  `Desktop cards: ${sweeps[0].sweep.comparisonSummary.total}`,
  `Mobile cards: ${sweeps[1].sweep.comparisonSummary.total}`,
  `Desktop diff failures: ${sweeps[0].sweep.comparisonSummary.diffFailures}`,
  `Mobile diff failures: ${sweeps[1].sweep.comparisonSummary.diffFailures}`,
  `Authentication: ${JSON.stringify(ledger.authentication)}`,
  "",
  "## Classified diff counts",
  ...Object.entries(categoryCounts).map(([category, count]) => `- ${category}: ${count}`),
  "",
  "## Safety",
  "- Visual inspection was GET-only.",
  "- Attachment payload/content was not inspected.",
  "- Persisted artifacts contain route paths, status, lengths, selector state, geometry, and categorized errors only.",
  "- Write parity remains RESTORE_REQUIRED until a user-provided dump and verified clone checkpoint are available.",
];
writeFileSync(resolve(artifactRoot, "summary.md"), `${summaryLines.join("\n")}\n`);
console.log(JSON.stringify({
  output: resolve(artifactRoot, "diff-ledger.json"),
  cards: cards.length,
  categoryCounts,
}, null, 2));
