import { strict as assert } from "node:assert";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildControllerPartials,
  buildControllerSummary,
  buildDiscoveryQueue,
  buildReconciliation,
  buildSourceClassIndex,
  evaluateCoverageEvidence,
} from "./legacy-jacoco-reconciliation.mjs";

function route(controllerMethod, path, line) {
  return {
    method: "GET",
    path,
    line,
    controllerClass: "IssueApp",
    controllerMethod,
  };
}

test("source class index keeps top-level package/class declarations and excludes generated sources", () => {
  const root = mkdtempSync(join(tmpdir(), "legacy-jacoco-source-index-"));
  const sourceRoot = join(root, "yona-original", "app");
  try {
    mkdirSync(join(sourceRoot, "controllers"), { recursive: true });
    mkdirSync(join(sourceRoot, "models"), { recursive: true });
    mkdirSync(join(sourceRoot, "generated"), { recursive: true });
    writeFileSync(
      join(sourceRoot, "controllers", "IssueApp.java"),
      "package controllers;\npublic class IssueApp { static class GeneratedHelper {} }\n",
    );
    writeFileSync(
      join(sourceRoot, "models", "Project.java"),
      "package models;\npublic interface Project {}\n",
    );
    writeFileSync(
      join(sourceRoot, "generated", "Routes.java"),
      "package generated;\npublic class Routes {}\n",
    );

    assert.deepEqual(buildSourceClassIndex(sourceRoot, root), [
      {
        class: "controllers.IssueApp",
        source: "yona-original/app/controllers/IssueApp.java",
        kind: "controllers",
      },
      {
        class: "models.Project",
        source: "yona-original/app/models/Project.java",
        kind: "models",
      },
    ]);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("reconciliation reports each static/runtime coverage state", () => {
  const methods = [
    {
      class: "controllers.IssueApp",
      method: "covered",
      status: "FULLY_COVERED",
      instructionCovered: 3,
      instructionMissed: 0,
    },
    {
      class: "controllers.IssueApp",
      method: "missed",
      status: "FULLY_MISSED",
      instructionCovered: 0,
      instructionMissed: 3,
    },
    {
      class: "controllers.IssueApp",
      method: "uncoveredExecuted",
      status: "FULLY_COVERED",
      instructionCovered: 2,
      instructionMissed: 0,
    },
    {
      class: "controllers.IssueApp",
      method: "uncoveredMissed",
      status: "FULLY_MISSED",
      instructionCovered: 0,
      instructionMissed: 2,
    },
  ];
  const reconciliation = buildReconciliation({
    methods,
    routes: [
      route("covered", "/covered", 1),
      route("missed", "/missed", 2),
      route("uncoveredExecuted", "/uncovered-executed", 3),
      route("uncoveredMissed", "/uncovered-missed", 4),
    ],
    behaviors: [
      { id: "covered-behavior", action: "IssueApp.covered" },
      { id: "missed-behavior", action: "IssueApp.missed" },
    ],
  });

  assert.deepEqual(
    reconciliation.entries.map(({ action, staticRuntimeState }) => ({ action, staticRuntimeState })),
    [
      {
        action: "controllers.IssueApp#covered",
        staticRuntimeState: "STATIC_COVERED + RUNTIME_EXECUTED",
      },
      {
        action: "controllers.IssueApp#missed",
        staticRuntimeState: "STATIC_COVERED + RUNTIME_MISSED",
      },
      {
        action: "controllers.IssueApp#uncoveredExecuted",
        staticRuntimeState: "STATIC_UNCOVERED + RUNTIME_EXECUTED",
      },
      {
        action: "controllers.IssueApp#uncoveredMissed",
        staticRuntimeState: "STATIC_UNCOVERED + RUNTIME_MISSED",
      },
    ],
  );
  assert.deepEqual(reconciliation.summary, {
    staticCoveredRuntimeExecuted: 1,
    staticCoveredRuntimeMissed: 1,
    staticUncoveredRuntimeExecuted: 1,
    staticUncoveredRuntimeMissed: 1,
    routeFacingFullyMissed: 2,
    routeFacingUnknown: 0,
    coverageMappingUnresolved: 0,
  });
});

test("route-facing source-backed class without method evidence remains unresolved", () => {
  const reconciliation = buildReconciliation({
    classes: [{ name: "controllers.IssueApp", methods: { covered: 0, missed: 0 } }],
    sourceClasses: [{ class: "controllers.IssueApp", kind: "controllers" }],
    methods: [],
    routes: [route("index", "/", 9)],
    behaviors: [{ id: "index-behavior", action: "IssueApp.index" }],
  });
  const entry = reconciliation.entries.find((candidate) => candidate.action === "controllers.IssueApp#index");
  assert.equal(entry.classification, "COVERAGE_MAPPING_UNRESOLVED");
  assert.equal(entry.reportClassExists, true);
  assert.equal(entry.sourceBackedClass, true);
  assert.notEqual(entry.classification, "UNREACHABLE_OR_INTERNAL");
  assert.equal(reconciliation.summary.coverageMappingUnresolved, 1);
});

test("route-facing missing class evidence stays non-closure UNKNOWN", () => {
  const reconciliation = buildReconciliation({
    methods: [],
    routes: [route("index", "/", 9)],
    behaviors: [{ id: "index-behavior", action: "IssueApp.index" }],
  });
  const entry = reconciliation.entries.find((candidate) => candidate.action === "controllers.IssueApp#index");
  assert.equal(entry.classification, "UNKNOWN");
  assert.equal(entry.sourceBackedClass, false);
  assert.equal(entry.reportClassExists, false);
  assert.equal(reconciliation.summary.coverageMappingUnresolved, 0);
  assert.notEqual(entry.classification, "UNREACHABLE_OR_INTERNAL");
});

test("missing source-backed method evidence invalidates and blocks discovery", () => {
  const coverageEvidence = evaluateCoverageEvidence({
    sourceBackedClasses: [{ name: "controllers.IssueApp" }],
    sourceBackedMethods: [],
    sourceClasses: [{ class: "controllers.IssueApp", kind: "controllers" }],
    routes: [route("index", "/", 9)],
  });
  assert.deepEqual(coverageEvidence, {
    status: "INVALID",
    code: "INVALID_EVIDENCE",
    reason: "SOURCE_BACKED_METHODS_MISSING",
    warnings: [],
  });
  const queue = buildDiscoveryQueue(
    [],
    { entries: [], summary: {} },
    [],
    coverageEvidence,
  );
  assert.deepEqual(queue.priorities, { P0: [], P1: [], P2: [], P3: [] });
  assert.equal(queue.status, "BLOCKED");
  assert.equal(queue.coverageEvidenceStatus, "INVALID");
});

test("identity warnings invalidate coverage evidence defensively", () => {
  const coverageEvidence = evaluateCoverageEvidence({
    coverageIdentityValid: true,
    coverageIdentityWarnings: ["Some classes do not match with execution data"],
  });
  assert.equal(coverageEvidence.status, "INVALID");
  assert.equal(coverageEvidence.reason, "CLASS_IDENTITY_MISMATCH");
});

test("infra errors triage route-facing misses as harness gaps, never unknown", () => {
  const reconciliation = buildReconciliation({
    methods: [{
      class: "controllers.IssueApp",
      method: "missed",
      status: "FULLY_MISSED",
      instructionCovered: 0,
      instructionMissed: 1,
    }],
    routes: [route("missed", "/missed", 11)],
    behaviors: [{ id: "missed-behavior", action: "IssueApp.missed" }],
    infraErrors: [{ scenario: "login", error: "server unavailable" }],
  });

  const missed = reconciliation.entries.filter((entry) => entry.routeFacing && entry.staticRuntimeState.endsWith("RUNTIME_MISSED"));
  assert.equal(missed.length, 1);
  assert.deepEqual(missed.map((entry) => entry.classification), ["HARNESS_GAP"]);
  assert.equal(reconciliation.summary.routeFacingUnknown, 0);
  assert.equal(reconciliation.summary.routeFacingFullyMissed, 1);
});

test("controller partials retain coverage metadata, routes, and inventory evidence", () => {
  const partials = buildControllerPartials(
    [
      {
        class: "controllers.IssueApp",
        method: "edit",
        desc: "(I)V",
        status: "PARTIALLY_COVERED",
        instructionCovered: 4,
        instructionMissed: 2,
        branchCovered: 1,
        branchMissed: 1,
        sourceLine: 73,
      },
      {
        class: "models.Issue",
        method: "save",
        status: "PARTIALLY_COVERED",
        instructionCovered: 1,
        instructionMissed: 1,
      },
    ],
    [route("edit", "/issues/edit", 19)],
    [{ id: "edit-behavior", action: "IssueApp.edit" }],
  );

  assert.deepEqual(partials, [{
    class: "controllers.IssueApp",
    method: "edit",
    desc: "(I)V",
    instructionCovered: 4,
    instructionMissed: 2,
    branchCovered: 1,
    branchMissed: 1,
    routes: [{ method: "GET", path: "/issues/edit", line: 19 }],
    behaviorIds: ["edit-behavior"],
    sourceLine: 73,
  }]);
});

test("major controller summary has stable rows and aggregate counts", () => {
  const methods = [
    { class: "controllers.IssueApp", method: "index", status: "FULLY_COVERED" },
    { class: "controllers.IssueApp", method: "edit", status: "PARTIALLY_COVERED" },
    { class: "controllers.IssueApp", method: "delete", status: "FULLY_MISSED" },
    { class: "controllers.BoardApp", method: "index", status: "FULLY_COVERED" },
  ];
  const reconciliation = buildReconciliation({
    methods,
    routes: [route("delete", "/issues/delete", 28)],
    behaviors: [
      { id: "index-behavior", action: "IssueApp.index" },
      { id: "edit-behavior", action: "IssueApp.edit" },
    ],
  });
  const summary = buildControllerSummary(methods, reconciliation);

  assert.deepEqual(summary.map((entry) => entry.controller), [
    "IssueApp",
    "BoardApp",
    "ProjectApp",
    "UserApp",
    "OrganizationApp",
    "PullRequestApp",
    "ReviewApp",
    "SiteApp",
  ]);
  assert.deepEqual(summary[0], {
    controller: "IssueApp",
    totalMethods: 3,
    fullyCovered: 1,
    partial: 1,
    fullyMissed: 1,
    routeFacingFullyMissed: 1,
    behaviorIds: ["edit-behavior", "index-behavior"],
  });
  assert.deepEqual(summary[1], {
    controller: "BoardApp",
    totalMethods: 1,
    fullyCovered: 1,
    partial: 0,
    fullyMissed: 0,
    routeFacingFullyMissed: 0,
    behaviorIds: [],
  });
  assert.deepEqual(summary.slice(2).map(({ totalMethods, behaviorIds }) => ({ totalMethods, behaviorIds })), [
    { totalMethods: 0, behaviorIds: [] },
    { totalMethods: 0, behaviorIds: [] },
    { totalMethods: 0, behaviorIds: [] },
    { totalMethods: 0, behaviorIds: [] },
    { totalMethods: 0, behaviorIds: [] },
    { totalMethods: 0, behaviorIds: [] },
  ]);
});
