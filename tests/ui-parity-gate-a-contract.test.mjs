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
const reportsDir = path.join(repoRoot, "docs", "provenance", "ui-parity-reports");
const blockingStatuses = new Set(["gap", "deviation", "weak evidence", "needs-parent-decision"]);

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

test("full UI parity Gate A reports have no open blocker summary rows", () => {
  const phasePlan = readText(phasePlanPath);

  for (const packet of activePackets(phasePlan)) {
    const reportPath = path.join(reportsDir, `${packet}.md`);
    assert.deepEqual(
      blockerRows(readText(reportPath)),
      [],
      `${packet} must not have open gap/deviation/weak-evidence/needs-parent-decision rows`,
    );
  }
});

test("full UI parity phase records Gate A report closure evidence", () => {
  const phasePlan = readText(phasePlanPath);
  const gateStatus = section(phasePlan, "Parallelization Plan");

  assert.match(gateStatus, /Current Gate A report status:/);
  assert.doesNotMatch(gateStatus, /report file is missing \| open/);
  assert.match(gateStatus, /ui-parity-user-workspace-profile\.md` records 13 covered rows/);
  assert.match(gateStatus, /ui-parity-user-account-settings\.md` records 12 covered rows/);
  assert.match(gateStatus, /ui-parity-fragment-security-db\.md` records 11 covered rows/);
});

test("full UI parity Round 2 browser-visible gate remains explicit while active", () => {
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
    "Round 2 browser-visible packets must stay explicit while this gate is active",
  );
  assert.match(roundTwo, /Round 2 cannot close while any packet status below is `pending`, `running`/);

  const statuses = new Map(packets.map(({ packet, status }) => [packet, status]));
  assert.equal(statuses.get("r2-auth-setup-public-shell"), "covered in current follow-up");
  assert.equal(statuses.get("r2-workspace-settings-directory"), "covered in current follow-up");
  assert.equal(statuses.get("r2-project-issue-board-milestone"), "covered in current follow-up");
  assert.equal(statuses.get("r2-code-pr-review-search-notification"), "covered in current follow-up");
  assert.equal(statuses.get("r2-site-admin-security-db"), "covered in current follow-up");
  assert.match(phasePlan, /Round 2 remaining browser proof gaps/);
});
