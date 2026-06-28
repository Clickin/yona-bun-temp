import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const phasePlanPath = path.join(
  repoRoot,
  "docs",
  "plans",
  "2026-06-26-full-ui-parity-subagent-phase.md",
);
const goalDirectivePath = path.join(
  repoRoot,
  "docs",
  "plans",
  "2026-06-28-template-first-ui-parity-goal-directive.md",
);
const reportsDir = path.join(repoRoot, "docs", "provenance", "ui-parity-reports");
const inventoryStatuses = [
  "covered",
  "gap",
  "deviation",
  "deferred",
  "not-applicable",
  "weak evidence",
  "needs-parent-decision",
];
const blockingStatuses = new Set(["gap", "deviation", "weak evidence", "needs-parent-decision"]);
const templateFirstPackets = [
  "template-first-p0-global-shell",
  "template-first-p1-auth-public-home",
  "template-first-p2-project-shell",
  "template-first-p3-issues-editor-comments",
  "template-first-p4-board-milestone-post",
  "template-first-p5-code-git-pr-review",
  "template-first-p6-organization-directory-workspace",
  "template-first-p7-site-admin-error-security",
];

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function section(source, heading) {
  const start = source.indexOf(`## ${heading}`);
  assert.notEqual(start, -1, `${heading} section must exist`);
  const next = source.indexOf("\n## ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function activePackets(phasePlan) {
  return section(phasePlan, "Full UI Parity Matrix")
    .split("\n")
    .filter((line) => line.startsWith("| `ui-parity-"))
    .map((line) => {
      const match = /^\| `([^`]+)` \|/.exec(line);
      assert.ok(match, `cannot parse packet row: ${line}`);
      return match[1];
    });
}

function blockerRows(reportSource) {
  const rows = [];

  for (const line of reportSource.split("\n")) {
    if (!line.startsWith("|")) {
      continue;
    }
    const columns = line
      .split("|")
      .slice(1, -1)
      .map((column) => column.trim().replaceAll("`", "").toLowerCase());

    columns.forEach((column, index) => {
      if (!blockingStatuses.has(column)) {
        return;
      }
      const adjacentCount =
        /^\d+$/.test(columns[index + 1] ?? "") || /^\d+$/.test(columns[index - 1] ?? "");
      const zeroCount = columns[index + 1] === "0" || columns[index - 1] === "0";
      if (!adjacentCount || !zeroCount) {
        rows.push(line);
      }
    });
  }

  return rows;
}

function queuedPacketBlockers(phasePlan, packet) {
  const queue = section(phasePlan, "Audit Result Queue");
  return queue
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .filter((line) => line.includes(packet))
    .filter((line) =>
      [...blockingStatuses].some((status) => line.toLowerCase().includes(`| \`${status}\` |`)),
    );
}

function parseSummaryCounts(summarySection) {
  const totalRows = Number(summarySection.match(/Total rows:\s+(\d+)/)?.[1]);
  const counts = Object.fromEntries(inventoryStatuses.map((status) => [status, 0]));

  for (const status of inventoryStatuses) {
    const match = summarySection.match(new RegExp(`\\| ${status} \\| (\\d+) \\|`, "i"));
    assert.ok(match, `summary must count ${status}`);
    counts[status] = Number(match[1]);
  }

  return { counts, totalRows };
}

function parseResetQueueCounts(summarySection) {
  const counts = new Map();

  for (const line of summarySection.split("\n")) {
    const match = /^\| ([^|]+) \| (\d+) \|$/.exec(line.trim());
    if (match === null || match[1] === "status") {
      continue;
    }
    counts.set(match[1].trim().toLowerCase(), Number(match[2]));
  }

  return counts;
}

function parseInventoryCounts(resultInventorySection) {
  const counts = Object.fromEntries(inventoryStatuses.map((status) => [status, 0]));

  for (const line of resultInventorySection.split("\n")) {
    if (!line.startsWith("|") || line.includes("---")) {
      continue;
    }
    const columns = line
      .split("|")
      .slice(1, -1)
      .map((column) => column.trim().replaceAll("`", "").toLowerCase());
    const statusColumn = columns.find(
      (column) =>
        column === "covered" || inventoryStatuses.includes(column) || column.startsWith("covered "),
    );

    if (statusColumn === undefined) {
      continue;
    }
    if (statusColumn.startsWith("covered")) {
      counts.covered += 1;
      continue;
    }
    counts[statusColumn] += 1;
  }

  return counts;
}

function parseScenarioRows(scenarioMatrixSection) {
  return scenarioMatrixSection
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .slice(1)
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((column) => column.trim().replaceAll("`", "").toLowerCase()),
    );
}

test("full UI parity Gate A keeps one report for every active packet", () => {
  const phasePlan = readText(phasePlanPath);
  const packets = activePackets(phasePlan);

  assert.deepEqual(
    packets,
    [
      "ui-parity-auth-public-entry",
      "ui-parity-root-navigation-shell",
      "ui-parity-user-workspace-profile",
      "ui-parity-user-account-settings",
      "ui-parity-directory-organization",
      "ui-parity-project-home-admin",
      "ui-parity-issues",
      "ui-parity-board-milestone",
      "ui-parity-code-vcs",
      "ui-parity-pull-request-review",
      "ui-parity-search-notification",
      "ui-parity-site-admin-setup",
      "ui-parity-fragment-security-db",
    ],
    "The active packet set must stay explicit when the Gate A scope changes",
  );

  for (const packet of packets) {
    const reportPath = path.join(reportsDir, `${packet}.md`);
    assert.equal(existsSync(reportPath), true, `${packet} needs a Gate A report file`);
  }
});

test("full UI parity phase stays a separate inventory-before-worker gate", () => {
  const phasePlan = readText(phasePlanPath);
  const objective = section(phasePlan, "Phase Objective");
  const rules = section(phasePlan, "Phase Rule");
  const executionModel = section(phasePlan, "Execution Model");
  const parallelization = section(phasePlan, "Parallelization Plan");

  assert.match(objective, /This document is the separate UI parity phase/);
  assert.match(objective, /before broad RC\s+implementation resumes/);
  assert.match(objective, /Split the inventory into subagent explorer packets/);
  assert.match(objective, /Assign worker subagents only for concrete queued rows/);
  assert.match(rules, /Parent must keep this phase as a separate UI-parity gate/);
  assert.match(rules, /must not assign a worker from an isolated smoke-test failure alone/);
  assert.match(executionModel, /Gate A is documentation-only inventory/);
  assert.match(executionModel, /Gate B is bounded implementation/);
  assert.match(parallelization, /Gate A documents the complete UI parity\s+inventory first/);
  assert.match(parallelization, /Gate B distributes only the concrete queued rows/);
});

test("full UI parity Gate A reports have no unqueued blocker summary rows", () => {
  const phasePlan = readText(phasePlanPath);

  for (const packet of activePackets(phasePlan)) {
    const reportPath = path.join(reportsDir, `${packet}.md`);
    const rows = blockerRows(readText(reportPath));
    if (rows.length === 0) {
      continue;
    }

    assert.match(
      phasePlan,
      /## Current Reopen Directive/,
      `${packet} blockers require the active reopen directive`,
    );
    assert.notDeepEqual(
      queuedPacketBlockers(phasePlan, packet),
      [],
      `${packet} blockers must be mirrored in the Audit Result Queue`,
    );
  }
});

test("full UI parity Gate A reports keep the standard inventory sections", () => {
  const phasePlan = readText(phasePlanPath);

  for (const packet of activePackets(phasePlan)) {
    const reportPath = path.join(reportsDir, `${packet}.md`);
    const reportSource = readText(reportPath);
    const summary = section(reportSource, "Route Inventory Summary");
    const resultInventory = section(reportSource, "Result Inventory");
    const scenarioMatrix = section(reportSource, "Playwright Scenario Matrix");

    assert.match(summary, /Total rows:\s+\d+/, `${packet} must record total row count`);
    for (const status of inventoryStatuses) {
      assert.match(
        summary,
        new RegExp(`\\| ${status} \\| \\d+ \\|`),
        `${packet} must count ${status}`,
      );
    }
    assert.match(resultInventory, /\| (path|route\/state|surface) \|/i);
    assert.match(
      resultInventory,
      /\| (legacy evidence|legacy source and behavior|legacy source) \|/i,
    );
    assert.match(
      resultInventory,
      /\| (current evidence|current source and evidence|current source) \|/i,
    );
    assert.match(
      scenarioMatrix,
      /\| path \| state \| legacy selector\/copy \| Rust selector\/copy \| interaction \| API\/direct boundary \| status \|/i,
    );
  }
});

test("full UI parity Gate A report summaries match their inventory rows", () => {
  const phasePlan = readText(phasePlanPath);

  for (const packet of activePackets(phasePlan)) {
    const reportPath = path.join(reportsDir, `${packet}.md`);
    const reportSource = readText(reportPath);
    const summaryCounts = parseSummaryCounts(section(reportSource, "Route Inventory Summary"));
    const inventoryCounts = parseInventoryCounts(section(reportSource, "Result Inventory"));

    assert.deepEqual(
      summaryCounts.counts,
      inventoryCounts,
      `${packet} summary counts must match Result Inventory`,
    );
    assert.equal(
      summaryCounts.totalRows,
      Object.values(inventoryCounts).reduce((sum, count) => sum + count, 0),
      `${packet} total rows must match counted inventory statuses`,
    );
  }
});

test("template-first UI parity directive close condition stays satisfied", () => {
  const directive = readText(goalDirectivePath);
  assert.match(directive, /Close only when all active P0-P7 report rows are covered/);
  assert.match(directive, /no gap\/deviation\/weak-evidence row remains/);

  for (const packet of templateFirstPackets) {
    const reportPath = path.join(reportsDir, `${packet}.md`);
    assert.equal(existsSync(reportPath), true, `${packet} needs a template-first report`);

    const reportSource = readText(reportPath);
    const counts = parseResetQueueCounts(section(reportSource, "Open Reset Queue Summary"));
    assert.equal(counts.get("covered") > 0, true, `${packet} needs covered evidence`);

    for (const status of blockingStatuses) {
      assert.equal(counts.get(status) ?? 0, 0, `${packet} has nonzero ${status} rows`);
    }
  }
});

test("full UI parity Playwright scenario matrices keep nonblocking concrete rows", () => {
  const phasePlan = readText(phasePlanPath);
  const allowedScenarioStatuses = new Set(["covered", "deferred", "not-applicable"]);

  for (const packet of activePackets(phasePlan)) {
    const reportPath = path.join(reportsDir, `${packet}.md`);
    const scenarioRows = parseScenarioRows(
      section(readText(reportPath), "Playwright Scenario Matrix"),
    );

    assert.ok(scenarioRows.length > 0, `${packet} must have at least one scenario row`);
    for (const [index, columns] of scenarioRows.entries()) {
      assert.equal(columns.length, 7, `${packet} scenario row ${index + 1} must have 7 columns`);
      columns.slice(0, 6).forEach((column, columnIndex) => {
        assert.notEqual(
          column,
          "",
          `${packet} scenario row ${index + 1} column ${columnIndex + 1} must not be empty`,
        );
      });
      const status = columns[6];
      const normalizedStatus = status.startsWith("covered ") ? "covered" : status;
      assert.equal(
        allowedScenarioStatuses.has(normalizedStatus),
        true,
        `${packet} scenario row ${index + 1} has non-closed status: ${status}`,
      );
    }
  }
});

test("full UI parity phase records Gate A report closure evidence", () => {
  const phasePlan = readText(phasePlanPath);
  const gateStatus = section(phasePlan, "Parallelization Plan");

  assert.match(gateStatus, /Current Gate A report status:/);
  assert.doesNotMatch(gateStatus, /report file is missing \| open/);
  assert.match(gateStatus, /ui-parity-user-workspace-profile\.md` records 14 covered rows/);
  assert.match(gateStatus, /ui-parity-user-account-settings\.md` records 13 covered rows/);
  assert.match(gateStatus, /ui-parity-fragment-security-db\.md` records 12 covered rows/);
});

test("full UI parity Round 2 browser-visible gate is closed with explicit evidence", () => {
  const phasePlan = readText(phasePlanPath);
  const roundTwo = section(phasePlan, "Browser-Visible Round 2 Gate");
  const packets = roundTwo
    .split("\n")
    .filter((line) => line.startsWith("| `r2-"))
    .map((line) => {
      const match = /^\| `([^`]+)` \|[^|]+\| ([^|]+) \|/.exec(line);
      assert.ok(match, `cannot parse Round 2 row: ${line}`);
      return { packet: match[1], status: match[2].trim() };
    });

  assert.deepEqual(
    packets.map(({ packet }) => packet),
    [
      "r2-auth-setup-public-shell",
      "r2-workspace-settings-directory",
      "r2-project-issue-board-milestone",
      "r2-code-pr-review-search-notification",
      "r2-site-admin-security-db",
    ],
    "Round 2 browser-visible packets must stay explicit after closure",
  );
  assert.match(roundTwo, /Round 2 is closed only while every packet status below is/);

  const statuses = new Map(packets.map(({ packet, status }) => [packet, status]));
  assert.equal(statuses.get("r2-auth-setup-public-shell"), "covered in current follow-up");
  assert.equal(statuses.get("r2-workspace-settings-directory"), "covered in current follow-up");
  assert.equal(statuses.get("r2-project-issue-board-milestone"), "covered in current follow-up");
  assert.equal(
    statuses.get("r2-code-pr-review-search-notification"),
    "covered in current follow-up",
  );
  assert.equal(statuses.get("r2-site-admin-security-db"), "covered in current follow-up");
  assert.deepEqual(
    packets.filter(({ status }) => blockingStatuses.has(status)),
    [],
    "Round 2 closure must not leave blocking packet statuses",
  );
  assert.match(phasePlan, /Round 2 browser-visible gate closure/);
});
