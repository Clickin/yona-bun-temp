import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(new URL("..", import.meta.url).pathname);
mkdirSync(resolve(root, "docs/provenance/baselines"), { recursive: true });
const inputs = [
  ["desktop", "output/playwright/visual-sweep/latest.json"],
  ["mobile", "output/playwright/visual-sweep/latest-mobile.json"],
];
const reports = new Map(
  inputs.map(([name, relativePath]) => {
    const bytes = readFileSync(resolve(root, relativePath));
    const archivePath = `docs/provenance/baselines/visual-parity-2026-07-11-${name}.json.gz`;
    writeFileSync(resolve(root, archivePath), gzipSync(bytes, { level: 9 }));
    return [
      name,
      {
        archivePath,
        data: JSON.parse(bytes),
        hash: createHash("sha256").update(bytes).digest("hex"),
        relativePath,
      },
    ];
  }),
);

const paths = new Map();
for (const [viewport, report] of reports) {
  for (const result of report.data.comparison) {
    if (result.diffErrors.length === 0) continue;
    const entry = paths.get(result.path) ?? {};
    entry[viewport] = result.diffErrors;
    paths.set(result.path, entry);
  }
}

const lines = [
  "# ko-KR Visual Parity Baseline Queue",
  "",
  "Status: current, frozen initial full-suite baseline",
  "Date: 2026-07-11",
  "",
  "This queue is the fixed input for focused parity work. Do not rerun the full suite per screen. Use `YORAM_SWEEP_PATHS` for the listed path and rerun the full desktop/mobile suite only for the final closure gate.",
  "",
  "## Frozen Artifacts",
  "",
  "| Viewport | Checked at | Entries | Compared | Diff failures | Local failures | Legacy missing | SHA-256 | Artifact |",
  "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
];

for (const [viewport, report] of reports) {
  const summary = report.data.comparisonSummary;
  lines.push(
    `| ${viewport} | ${report.data.checkedAt} | ${summary.total} | ${summary.compared} | ${summary.diffFailures} | ${summary.localFailures} | ${summary.legacyMissing} | \`${report.hash}\` | \`${report.archivePath}\` |`,
  );
}

lines.push(
  "",
  "## Focused Work Queue",
  "",
  `Union of failing paths: **${paths.size}**. Order is stable by path; status changes from OPEN only with focused E2E and live paired-sweep evidence.`,
  "",
  "| Path | Desktop diff | Mobile diff | Status |",
  "| --- | --- | --- | --- |",
);

const cell = (errors) =>
  errors?.length ? errors.map((error) => error.replaceAll("|", "\\|")).join("<br>") : "—";
for (const [path, viewports] of [...paths].sort(([left], [right]) => left.localeCompare(right))) {
  lines.push(
    `| \`${path}\` | ${cell(viewports.desktop)} | ${cell(viewports.mobile)} | OPEN |`,
  );
}

writeFileSync(
  resolve(root, "docs/provenance/frontend-visual-parity-baseline-2026-07-11.md"),
  `${lines.join("\n")}\n`,
);
