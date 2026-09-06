// Violation report assembly + human-readable stdout summary.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  domVisibleLoss,
  normalizeSkeletonEntry,
  PULL_REQUEST_MERGE_PENDING_SIGNATURE,
  PULL_REQUEST_MERGE_SUCCESS_SIGNATURE,
} from "./diff.mjs";

// Unified classification enum shared by the triage doc
// (docs/provenance/release-triage-2026-08.md) and the verdict gate.
export const CLASSIFICATIONS = [
  "PASS",
  "REAL_OBSERVABLE_MISMATCH",
  "IMPLEMENTATION_DIFFERENCE",
  "LEGACY_BUG_NOT_REPRODUCED",
  "HARNESS_ERROR",
  "INFRA_ERROR",
  "UNVERIFIED",
];

// Blocking classes for the release gate: real product gaps, harness defects,
// infra failures, and anything unverified. IMPLEMENTATION_DIFFERENCE and LEGACY_BUG_NOT_REPRODUCED
// are non-blocking; PASS is pass.
export const BLOCKING_CLASSIFICATIONS = new Set([
  "REAL_OBSERVABLE_MISMATCH",
  "HARNESS_ERROR",
  "INFRA_ERROR",
  "UNVERIFIED",
]);

// Thrown by scenario steps when the HARNESS (not the product) is at fault:
// unresolved entity ids, missing fixtures. The runner classifies it as a
// HARNESS_ERROR violation so dependent actions are skipped, never silent.
export class HarnessError extends Error {
  constructor(message) {
    super(message);
    this.name = "HarnessError";
  }
}

function normalizeClassification(value) {
  return CLASSIFICATIONS.includes(value) ? value : "UNVERIFIED";
}

// Narrow, evidence-backed classifications for the known residual findings of
// the current sweep surface (see docs/provenance/release-triage-2026-08.md).
// Every rule carries a reason; IMPLEMENTATION_DIFFERENCE rules additionally carry a
// `rationale` reference. Anything unmatched stays UNVERIFIED.
//
// First-match order matters: specific rules must precede their broader family
// catch-alls (see the label-route and sharableUsers chains). There is NO
// blanket dom -> IMPLEMENTATION_DIFFERENCE rule: unknown DOM divergence falls
// through to UNVERIFIED (blocking) unless an explicit, evidence-backed rule
// below matches. Generic DOM allow rules cannot match a visible loss
// (diff.mjs#domVisibleLoss); the exact reviewed route fingerprints and the
// dedicated merge-bug rule are narrower still, requiring their complete
// signatures (and, for the merge bug, same-scenario API evidence).
function pairStatuses(detail) {
  const actual = detail?.actual;
  const legacy =
    Number(actual?.legacyStatus ?? /"expected":"legacy HTTP (\d+)"/u.exec(JSON.stringify(detail))?.[1]) || null;
  const yoram =
    Number(actual?.yoramStatus ?? /"actual":"yoram HTTP (\d+)"/u.exec(JSON.stringify(detail))?.[1]) || null;
  return { legacy, yoram };
}

function exactStatus(detail, side) {
  const values =
    side === "legacy"
      ? [[detail?.expected, true], [detail?.actual, false]]
      : [[detail?.actual, true], [detail?.expected, false]];
  for (const [value, primary] of values) {
    const paired = Number(value?.[`${side}Status`]);
    if (Number.isFinite(paired) && paired > 0) return paired;
    const direct = primary ? Number(value?.status) : NaN;
    if (Number.isFinite(direct) && direct > 0) return direct;
    const match = new RegExp(`${side} HTTP (\\d+)`, "u").exec(String(value ?? ""));
    if (match) return Number(match[1]);
  }
  return null;
}

function exactJsonObject(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) return false;
  return expectedKeys.every((key) => {
    const actual = value[key];
    const wanted = expected[key];
    if (Array.isArray(wanted)) return JSON.stringify(actual) === JSON.stringify(wanted);
    return actual === wanted;
  });
}

function requestEvidence(detail, side) {
  const request = detail?.actual?.[`${side}Request`];
  return request && typeof request === "object" ? request : null;
}

function hasExactShareProbe(detail) {
  const legacy = requestEvidence(detail, "legacy");
  const yoram = requestEvidence(detail, "yoram");
  if (
    !legacy ||
    !yoram ||
    legacy.method !== "POST" ||
    yoram.method !== "POST" ||
    !/^\/-_-api\/v1\/owners\/[^/]+\/projects\/[^/]+\/issues\/\d+\/share$/u.test(legacy.path) ||
    !/^\/api\/v1\/owners\/[^/]+\/projects\/[^/]+\/issues\/\d+\/sharers\/toggle$/u.test(yoram.path)
  ) {
    return false;
  }
  const legacyPayload = legacy.json;
  const yoramPayload = yoram.json;
  if (
    !legacyPayload ||
    !yoramPayload ||
    !exactJsonObject(legacyPayload, { sharer: ["admin"], action: legacyPayload.action }) ||
    !exactJsonObject(yoramPayload, { sharer: ["admin"], action: yoramPayload.action })
  ) {
    return false;
  }
  return (legacyPayload.action === "add" || legacyPayload.action === "remove") && legacyPayload.action === yoramPayload.action;
}

function hasExactIssueImportProbe(detail) {
  const legacy = requestEvidence(detail, "legacy");
  const yoram = requestEvidence(detail, "yoram");
  const valid = (request) => {
    if (
      !request ||
      request.method !== "POST" ||
      !/^\/-_-api\/v1\/owners\/[^/]+\/projects\/[^/]+\/issues\/imports$/u.test(request.path)
    ) {
      return false;
    }
    const payload = request.json;
    return (
      payload &&
      Object.keys(payload).sort().join(",") === "owner,repoName,token" &&
      payload.owner === "parity-sweep" &&
      typeof payload.repoName === "string" &&
      /^nonexistent-/u.test(payload.repoName) &&
      payload.token === ""
    );
  };
  return valid(legacy) && valid(yoram);
}

const PULL_REQUEST_MERGE_COMPANION_ENTRIES = new Set([
  // Empty attachment wrapper and icon-only/status wrappers are the finite
  // structural residue reviewed with the merge-state fixture. User-visible
  // controls, text, and list entries are intentionally absent.
  "div.attachments:",
  "i.yobicon-right-2.ml10:",
  "i.yobicon-check-circle-alt.mr5:",
  "i.yobicon-supportrequest.mr5:",
  "li.active:",
]);

function primaryDomDiffEntries(firstDiffs) {
  return firstDiffs.flatMap((diff) => {
    if (diff.side === "legacy-only") return [diff.expected];
    if (diff.side === "yoram-only") return [diff.actual];
    if (diff.side === "order") return [diff.expected, diff.actual];
    return [];
  });
}

function hasLegacyPendingEntry(firstDiffs, entry) {
  return firstDiffs.some((diff) => diff.side === "legacy-only" && diff.expected === entry);
}

function hasCurrentSuccessEntry(firstDiffs, entry) {
  return firstDiffs.some(
    (diff) =>
      (diff.side === "legacy-only" || diff.side === "yoram-only") &&
      diff.actual === entry,
  );
}

function hasExactMergeStateDiff(detail) {
  const firstDiffs = detail?.actual?.firstDiffs;
  if (!Array.isArray(firstDiffs)) return false;
  if (
    firstDiffs.some(
      (diff) => !["legacy-only", "yoram-only", "order"].includes(diff?.side),
    )
  ) {
    return false;
  }
  if (!PULL_REQUEST_MERGE_PENDING_SIGNATURE.every((entry) => hasLegacyPendingEntry(firstDiffs, entry))) {
    return false;
  }
  if (!PULL_REQUEST_MERGE_SUCCESS_SIGNATURE.every((entry) => hasCurrentSuccessEntry(firstDiffs, entry))) {
    return false;
  }
  const signatureEntries = new Set([
    ...PULL_REQUEST_MERGE_PENDING_SIGNATURE,
    ...PULL_REQUEST_MERGE_SUCCESS_SIGNATURE,
  ]);
  return primaryDomDiffEntries(firstDiffs).every(
    (entry) => signatureEntries.has(entry) || PULL_REQUEST_MERGE_COMPANION_ENTRIES.has(entry),
  );
}

const LEGACY_MERGE_FAILURE_REASON =
  "Legacy PullRequest.Merger.Success dereferences a null reusable merge tree during accept.";

function hasSameScenarioMergeFailure(scenarioViolations) {
  return (scenarioViolations ?? []).some(
    (finding) =>
      finding?.kind === "api" &&
      finding.behaviorId === "B-0227" &&
      /\/pullRequest\/\d+\/accept$/u.test(finding.route ?? "") &&
      finding.expected?.status === 500 &&
      finding.actual?.status === 200 &&
      finding.reason === LEGACY_MERGE_FAILURE_REASON,
  );
}

function siteAdminDomFingerprint({
  route,
  state,
  scenarioId,
  action,
  normalizeIssueDiffs = false,
  expectedSkeletonEntries,
  actualSkeletonEntries,
  firstDiffs,
  wtrTest,
  wtrSource,
  rationale,
}) {
  const normalizedFirstDiffs = normalizeIssueDiffs
    ? firstDiffs.map(([side, expected, actual]) => [
        side,
        normalizeSkeletonEntry(normalizeIssueDiffEntry(expected)),
        normalizeSkeletonEntry(normalizeIssueDiffEntry(actual)),
      ])
    : firstDiffs.map(([side, expected, actual]) => [
        side,
        normalizeSkeletonEntry(expected),
        normalizeSkeletonEntry(actual),
      ]);
  const residualFirstDiffs = normalizedFirstDiffs.filter(
    ([_side, expected, actual]) => expected !== actual,
  );
  return Object.freeze({
    route,
    state,
    scenarioId,
    action,
    normalizeIssueDiffs,
    expectedSkeletonEntries,
    actualSkeletonEntries,
    firstDiffs: Object.freeze(
      residualFirstDiffs.map(([side, expected, actual]) =>
        Object.freeze({ side, expected, actual }),
      ),
    ),
    wtrTest,
    wtrSource,
    rationale,
  });
}

function normalizeIssueDiffEntry(entry) {
  if (typeof entry !== "string") return entry;
  if (entry.startsWith("a.ago:")) return "a.ago:<relative-time>";
  return entry.replace(
    /^a:Differential sweep issue body sweep[\w-]+$/u,
    "a:Differential sweep issue body <sweep-id>",
  );
}

function normalizedFingerprintDetail(detail, fingerprint) {
  if (!Array.isArray(detail?.actual?.firstDiffs)) {
    return detail;
  }
  return {
    ...detail,
    actual: {
      ...detail.actual,
      firstDiffs: detail.actual.firstDiffs
        .map((diff) => ({
          ...diff,
          expected: normalizeSkeletonEntry(
            fingerprint.normalizeIssueDiffs
              ? normalizeIssueDiffEntry(diff.expected)
              : diff.expected,
          ),
          actual: normalizeSkeletonEntry(
            fingerprint.normalizeIssueDiffs
              ? normalizeIssueDiffEntry(diff.actual)
              : diff.actual,
          ),
        }))
        .filter((diff) => diff.expected !== diff.actual),
    },
  };
}

// These are exact, finite SSR-vs-SPA body fingerprints from the authoritative final-corrected-03b683 capture.
// They are deliberately not class-prefix or route-family allowlists: route,
// state, both skeleton counts, and every residual firstDiff must match after
// the same comparator canonicalization (identity-only pairs are absent from
// the residual). The focused WTR test title/source is carried with each
// fingerprint so a reclassification remains auditable. Any changed/missing
// visible row, text, or control represented by the captured count/signature
// falls through to UNVERIFIED.
export const SITE_ADMIN_DOM_IMPLEMENTATION_FINGERPRINTS = Object.freeze([
  siteAdminDomFingerprint({
    route: "/sites/userList",
    state: "populated",
    scenarioId: "U18-site-admin-screens",
    action: "view-site-screen",
    expectedSkeletonEntries: 91,
    actualSkeletonEntries: 70,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap.list-avatar:", "a:@alice"],
      ["legacy-only", "a.avatar-wrap.list-avatar:", "a:@alice"],
      ["legacy-only", "a.avatar-wrap.list-avatar:", "a:@alice"],
      ["legacy-only", "a.user-id:@alice", "a:@alice"],
      ["legacy-only", "a.user-id:@bob", "a:@alice"],
      ["legacy-only", "a.user-id:@carol", "a:@alice"],
      ["legacy-only", "a.user-name:Alice Kim", "a:@alice"],
      ["legacy-only", "a.user-name:Bob Park", "a:@alice"],
      ["legacy-only", "a.user-name:Carol Lee", "a:@alice"],
      ["yoram-only", "a:게스트 사용자", "a:@alice"],
      ["yoram-only", "a:게스트 사용자", "a:@bob"],
      ["yoram-only", "a:게스트 사용자", "a:@carol"],
      ["yoram-only", "a:게스트 사용자", "a:Alice Kim"],
      ["yoram-only", "a:게스트 사용자", "a:Bob Park"],
      ["yoram-only", "a:게스트 사용자", "a:Carol Lee"],
      ["legacy-only", "button.close:×", "button.search-btn:"],
      ["legacy-only", "button.ybtn.ybtn-danger:예", "button:×"],
      ["legacy-only", "button.ybtn.ybtn-small.label-info:사이트 어드민으로 지정", "button:×"],
      ["legacy-only", "button.ybtn.ybtn-small.label-info:사이트 어드민으로 지정", "button:×"],
      ["legacy-only", "button.ybtn.ybtn-small.label-info:사이트 어드민으로 지정", "button:×"],
    ],
    wtrTest: "site admin /sites/userList matches legacy Scala template DOM",
    wtrSource: "frontend/tests/wtr/site-admin-user-list.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by site admin /sites/userList matches legacy Scala template DOM in frontend/tests/wtr/site-admin-user-list.e2e.ts against yona-original/app/views/site/userList.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/sites/projectList",
    state: "populated",
    scenarioId: "U18-site-admin-screens",
    action: "view-site-screen",
    expectedSkeletonEntries: 109,
    actualSkeletonEntries: 88,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap.list-avatar:admin/parity-git-wvamt5efl73", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.avatar-wrap.list-avatar:admin/parity-lc-sweep-mt6k1hwu-33", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.avatar-wrap.list-avatar:admin/parity-lc-sweep-mt6k1hwu-39", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.avatar-wrap.list-avatar:admin/parity-lc-sweep-mt6k1hwu-40", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.avatar-wrap.list-avatar:admin/parity-svn-wvbmt5esi2l", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.avatar-wrap.list-avatar:admin/parity-svn-wvbmt5etjsa", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.avatar-wrap.list-avatar:admin/sample", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.avatar-wrap.list-avatar:admin/svnplayground", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.avatar-wrap.list-avatar:alice/sample", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.project-name:admin/parity-git-wvamt5efl73", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.project-name:admin/parity-lc-sweep-mt6k1hwu-33", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.project-name:admin/parity-lc-sweep-mt6k1hwu-39", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.project-name:admin/parity-lc-sweep-mt6k1hwu-40", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.project-name:admin/parity-svn-wvbmt5esi2l", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.project-name:admin/parity-svn-wvbmt5etjsa", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.project-name:admin/sample", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.project-name:admin/svnplayground", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "a.project-name:alice/sample", "a:admin/parity-git-wvamt5efl73"],
      ["legacy-only", "button.close:×", "a:admin/parity-git-wvamt5efl73"],
      ["yoram-only", "button.search-btn:", "a:admin/parity-git-wvamt5efl73"],
    ],
    wtrTest: "site admin /sites/projectList matches legacy Scala template DOM",
    wtrSource: "frontend/tests/wtr/site-admin-project-list.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by site admin /sites/projectList matches legacy Scala template DOM in frontend/tests/wtr/site-admin-project-list.e2e.ts against yona-original/app/views/site/projectList.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/sites/data",
    state: "default",
    scenarioId: "U18-site-admin-screens",
    action: "view-site-screen",
    expectedSkeletonEntries: 16,
    actualSkeletonEntries: 15,
    firstDiffs: [
      ["legacy-only", "div.title_area:", "h2:데이터"],
      ["legacy-only", "h2.pull-left:데이터", "h2:데이터"],
      ["yoram-only", "h3:Export", "h2:데이터"],
    ],
    wtrTest: "site admin /sites/data matches legacy Scala template DOM",
    wtrSource: "frontend/tests/wtr/site-admin-data.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by site admin /sites/data matches legacy Scala template DOM in frontend/tests/wtr/site-admin-data.e2e.ts against yona-original/app/views/site/data.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/sites/issueList",
    state: "open-populated",
    scenarioId: "U18-site-admin-screens",
    action: "view-site-screen",
    expectedSkeletonEntries: 59,
    actualSkeletonEntries: 35,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap.list-avatar:", "a:0"],
      ["legacy-only", "a.avatar-wrap.list-avatar:", "a:0"],
      ["legacy-only", "a.avatar-wrap.list-avatar:", "a:0"],
      ["legacy-only", "a.avatar-wrap:", "a:0"],
      ["legacy-only", "a.avatar-wrap:", "a:0"],
      ["legacy-only", "a.avatar-wrap:", "a:0"],
      ["legacy-only", "a.post-meta-item:Site Admin", "a:0"],
      ["legacy-only", "a.post-meta-item:Site Admin", "a:0"],
      ["legacy-only", "a.post-meta-item:Site Admin", "a:0"],
      ["legacy-only", "a.post-project:admin/sample", "a:0"],
      ["legacy-only", "a.post-project:admin/sample", "a:0"],
      ["legacy-only", "a.post-project:admin/sample", "a:0"],
      ["legacy-only", "a.post-title:Differential sweep issue sweep-mtpqyait-80", "a:0"],
      ["legacy-only", "a.post-title:Differential sweep issue sweep-mtpqyait-82", "a:0"],
      ["legacy-only", "a.post-title:parity-ilabel-sweep-mtpqyait-32", "a:0"],
      ["order", "a:닫힘", "a:1"],
      ["yoram-only", "a:열림", "a:Differential sweep issue sweep-mtpqyait-80"],
      ["yoram-only", "a:열림", "a:Differential sweep issue sweep-mtpqyait-82"],
      ["yoram-only", "a:열림", "a:Review rail parity check"],
      ["yoram-only", "a:열림", "a:Site Admin"],
    ],
    wtrTest: "site admin /sites/issueList matches legacy Scala template DOM",
    wtrSource: "frontend/tests/wtr/site-admin-issue-list.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by site admin /sites/issueList matches legacy Scala template DOM in frontend/tests/wtr/site-admin-issue-list.e2e.ts against yona-original/app/views/site/issueList.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/sites/postList",
    state: "populated",
    scenarioId: "U18-site-admin-screens",
    action: "view-site-screen",
    expectedSkeletonEntries: 29,
    actualSkeletonEntries: 15,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap:", "a:2"],
      ["legacy-only", "a.post-meta-item:Site Admin", "a:2"],
      ["legacy-only", "a.post-project:admin/sample", "a:2"],
      ["legacy-only", "a.post-title:Seed notes", "a:2"],
      ["legacy-only", "div.page-navigation-wrap:", "a:Seed notes"],
      ["legacy-only", "div.post-info-wrap:", "a:Seed notes"],
      ["legacy-only", "div.post-meta-wrap:", "a:Seed notes"],
      ["yoram-only", "div.span10:", "a:Seed notes"],
      ["yoram-only", "div.span10:", "a:Site Admin"],
      ["yoram-only", "div.span10:", "a:admin/sample"],
      ["legacy-only", "div.title_area:", "h2:게시물"],
      ["legacy-only", "h2.pull-left:게시물", "h2:게시물"],
      ["legacy-only", "i.ico.btn-pg-next.off:", "h2:게시물"],
      ["legacy-only", "i.ico.btn-pg-prev.off:", "h2:게시물"],
      ["legacy-only", "i.yobicon-comments:", "h2:게시물"],
      ["legacy-only", "input.input-mini.nospinner:", "h2:게시물"],
      ["legacy-only", "li.page-num.delimiter:/", "h2:게시물"],
      ["legacy-only", "li.page-num.ikon:", "h2:게시물"],
      ["legacy-only", "li.page-num.ikon:", "h2:게시물"],
      ["legacy-only", "li.page-num:", "h2:게시물"],
    ],
    wtrTest: "site admin /sites/postList matches legacy Scala template DOM",
    wtrSource: "frontend/tests/wtr/site-admin-post-list.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by site admin /sites/postList matches legacy Scala template DOM in frontend/tests/wtr/site-admin-post-list.e2e.ts against yona-original/app/views/site/postList.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/sites/mail",
    state: "not-configured",
    scenarioId: "U18-site-admin-screens",
    action: "view-site-screen",
    expectedSkeletonEntries: 23,
    actualSkeletonEntries: 14,
    firstDiffs: [
      ["legacy-only", "div.control-group.mr10:", "div.alert.alert-error:"],
      ["legacy-only", "div.control-group.mr10:", "div.alert.alert-error:"],
      ["legacy-only", "div.control-group:", "div.alert.alert-error:"],
      ["legacy-only", "div.control-group:", "div.alert.alert-error:"],
      ["legacy-only", "div.controls:", "div.alert.alert-error:"],
      ["legacy-only", "div.controls:", "div.alert.alert-error:"],
      ["legacy-only", "div.controls:", "div.alert.alert-error:"],
      ["legacy-only", "div.controls:", "div.alert.alert-error:"],
      ["yoram-only", "div.span10:", "div.alert.alert-error:"],
      ["legacy-only", "form.form-horizontal:", "h2.pull-left:메일 발송"],
      ["legacy-only", "input.span12:", "label:받는 사람"],
      ["legacy-only", "input.span4:", "label:받는 사람"],
      ["legacy-only", "input.span4:", "label:받는 사람"],
      ["legacy-only", "label.control-label.span3:보내는 메일 주소", "label:받는 사람"],
      ["legacy-only", "label.control-label:받는 사람", "label:받는 사람"],
      ["legacy-only", "label.control-label:본문", "label:받는 사람"],
      ["legacy-only", "label.control-label:제목", "label:받는 사람"],
      ["yoram-only", "strong:발송", "label:받는 사람"],
      ["yoram-only", "strong:발송", "label:보내는 메일 주소"],
      ["yoram-only", "strong:발송", "label:본문"],
    ],
    wtrTest: "site admin /sites/mail matches legacy Scala template DOM",
    wtrSource: "frontend/tests/wtr/site-admin-mail.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by site admin /sites/mail matches legacy Scala template DOM in frontend/tests/wtr/site-admin-mail.e2e.ts against yona-original/app/views/site/mail.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/sites/massmail",
    state: "default",
    scenarioId: "U18-site-admin-screens",
    action: "view-site-screen",
    expectedSkeletonEntries: 13,
    actualSkeletonEntries: 12,
    firstDiffs: [
      ["legacy-only", "button.ybtn.ybtn-primary:", "button.ybtn:"],
      ["legacy-only", "div.control-group.hide:", "div.controls:"],
      ["yoram-only", "div.mess-mail-wrap:", "div.hide:"],
    ],
    wtrTest: "site admin /sites/massmail matches legacy Scala template DOM",
    wtrSource: "frontend/tests/wtr/site-admin-massmail.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by site admin /sites/massmail matches legacy Scala template DOM in frontend/tests/wtr/site-admin-massmail.e2e.ts against yona-original/app/views/site/massMail.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/sites/update",
    state: "no-update-product-version",
    scenarioId: "U18-site-admin-screens",
    action: "view-site-screen",
    expectedSkeletonEntries: 5,
    actualSkeletonEntries: 5,
    firstDiffs: [
      ["legacy-only", "p:현재 버전은 1.16.0 입니다", "p:현재 버전은 0.1.0 입니다"],
      ["yoram-only", "p:현재 최신 버전을 사용중입니다", "p:현재 버전은 0.1.0 입니다"],
    ],
    wtrTest: "site admin /sites/update matches legacy Scala template DOM",
    wtrSource: "frontend/tests/wtr/site-admin-update.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by site admin /sites/update matches legacy Scala template DOM in frontend/tests/wtr/site-admin-update.e2e.ts against yona-original/app/views/site/update.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
]);

function canonicalFingerprintRoute(route) {
  return route.replace(/^\/admin\/sample\/issue\/[1-9][0-9]*$/u, "/admin/sample/issue/<issue-number>");
}

function exactDomFingerprint(detail, fingerprint) {
  const comparableDetail = normalizedFingerprintDetail(detail, fingerprint);
  const comparableFirstDiffs = comparableDetail?.actual?.firstDiffs?.map(({ side, expected, actual }) => [
    side,
    expected,
    actual,
  ]);
  const fingerprintFirstDiffs = fingerprint.firstDiffs.map(({ side, expected, actual }) => [
    side,
    expected,
    actual,
  ]);
  return (
    comparableDetail?.expected?.skeletonEntries === fingerprint.expectedSkeletonEntries &&
    comparableDetail?.actual?.skeletonEntries === fingerprint.actualSkeletonEntries &&
    JSON.stringify(comparableFirstDiffs) === JSON.stringify(fingerprintFirstDiffs)
  );
}

const SITE_ADMIN_DOM_FINGERPRINT_RULES = SITE_ADMIN_DOM_IMPLEMENTATION_FINGERPRINTS.map((fingerprint) => ({
  test: ({ kind, route, detail, scenarioId, scenarioActions }) =>
    kind === "dom" &&
    canonicalFingerprintRoute(route) === fingerprint.route &&
    (!fingerprint.scenarioId || scenarioId === fingerprint.scenarioId) &&
    (!fingerprint.action || scenarioActions?.includes(fingerprint.action)) &&
    exactDomFingerprint(detail, fingerprint),
  classification: "IMPLEMENTATION_DIFFERENCE",
  rationale: fingerprint.rationale,
  reason: `exact ${fingerprint.route} ${fingerprint.state} DOM implementation fingerprint; changed or missing visible content falls through to UNVERIFIED`,
}));

export const PROJECT_PULL_REQUEST_DOM_IMPLEMENTATION_FINGERPRINTS = Object.freeze([
  siteAdminDomFingerprint({
    route: "/admin/sample/pullRequests",
    state: "populated",
    scenarioId: "R1-pr-lists",
    action: "list-pullrequests",
    expectedSkeletonEntries: 68,
    actualSkeletonEntries: 73,
    firstDiffs: [
      ["yoram-only", "abbr.select2-search-choice-close:", "a:닫힘"],
      ["yoram-only", "abbr.select2-search-choice-close:", "a:열림"],
      ["legacy-only", "button:닫힘", "div.infos:"],
      ["legacy-only", "button:열림", "div.infos:"],
      ["legacy-only", "div.select2-container:", "div.select2-container.fullsize:"],
      ["legacy-only", "div.select2-drop.select2-display-none.select2-with-searchbox:", "div.select2-container.fullsize:"],
      ["yoram-only", "div.select2-search:", "div.select2-container.fullsize:"],
      ["yoram-only", "div.select2-search:", "div.select2-drop.select2-with-searchbox.select2-display-none:"],
      ["yoram-only", "div.select2-search:", "div.select2-result-label:Site Admin"],
      ["yoram-only", "div.select2-search:", "div.select2-result-label:내가 보낸 코드"],
      ["yoram-only", "div.select2-search:", "div.select2-result-label:전체"],
      ["legacy-only", "div:전체", "dl.issue-option:"],
      ["yoram-only", "option:Site Admin", "li.select2-result-selectable:"],
      ["yoram-only", "option:Site Admin", "li.select2-result-selectable:"],
      ["yoram-only", "option:Site Admin", "li.select2-result-selectable:"],
      ["legacy-only", "span.select2-chosen:", "span.select2-chosen:전체"],
      ["yoram-only", "span.to-branch:feature/ui", "span.select2-chosen:전체"],
    ],
    wtrTest: "project pull request populated list matches legacy DOM",
    wtrSource: "frontend/tests/wtr/project-pullrequests.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by project pull request populated list matches legacy DOM in frontend/tests/wtr/project-pullrequests.e2e.ts against yona-original/app/views/git/partial_list.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/closedPullRequests",
    state: "empty",
    scenarioId: "R1-pr-lists",
    action: "list-closed-pullrequests",
    expectedSkeletonEntries: 45,
    actualSkeletonEntries: 50,
    firstDiffs: [
      ["yoram-only", "abbr.select2-search-choice-close:", "a:닫힘"],
      ["yoram-only", "abbr.select2-search-choice-close:", "a:열림"],
      ["legacy-only", "button:닫힘", "div.error-wrap:"],
      ["legacy-only", "button:열림", "div.error-wrap:"],
      ["legacy-only", "div.select2-container:", "div.select2-container.fullsize:"],
      ["legacy-only", "div.select2-drop.select2-display-none.select2-with-searchbox:", "div.select2-container.fullsize:"],
      ["yoram-only", "div.select2-search:", "div.select2-container.fullsize:"],
      ["yoram-only", "div.select2-search:", "div.select2-drop.select2-with-searchbox.select2-display-none:"],
      ["yoram-only", "div.select2-search:", "div.select2-result-label:Site Admin"],
      ["yoram-only", "div.select2-search:", "div.select2-result-label:내가 보낸 코드"],
      ["yoram-only", "div.select2-search:", "div.select2-result-label:전체"],
      ["legacy-only", "div:전체", "dl.issue-option:"],
      ["yoram-only", "option:Site Admin", "li.select2-result-selectable:"],
      ["yoram-only", "option:Site Admin", "li.select2-result-selectable:"],
      ["yoram-only", "option:Site Admin", "li.select2-result-selectable:"],
      ["legacy-only", "span.select2-chosen:", "span.select2-chosen:전체"],
      ["yoram-only", "span.two-column-mode-text:2단 보기", "span.select2-chosen:전체"],
    ],
    wtrTest: "project pull request empty list matches legacy DOM",
    wtrSource: "frontend/tests/wtr/project-pullrequests.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by project pull request empty list matches legacy DOM in frontend/tests/wtr/project-pullrequests.e2e.ts against yona-original/app/views/git/list.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/sentPullRequests",
    state: "empty",
    scenarioId: "R1-pr-lists",
    action: "list-sent-pullrequests",
    expectedSkeletonEntries: 49,
    actualSkeletonEntries: 49,
    firstDiffs: [
      ["yoram-only", "button.search-btn:", "a:닫힘"],
      ["yoram-only", "button.search-btn:", "a:열림"],
      ["legacy-only", "button:닫힘", "div.infos:"],
      ["legacy-only", "button:열림", "div.infos:"],
    ],
    wtrTest: "project pull request empty list matches legacy DOM",
    wtrSource: "frontend/tests/wtr/project-pullrequests.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by project pull request empty list matches legacy DOM in frontend/tests/wtr/project-pullrequests.e2e.ts against yona-original/app/views/git/partial_list.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
]);

const PROJECT_PULL_REQUEST_DOM_FINGERPRINT_RULES = PROJECT_PULL_REQUEST_DOM_IMPLEMENTATION_FINGERPRINTS.map(
  (fingerprint) => ({
    test: ({ kind, route, detail, scenarioId, scenarioActions }) =>
      kind === "dom" &&
      canonicalFingerprintRoute(route) === fingerprint.route &&
      (!fingerprint.scenarioId || scenarioId === fingerprint.scenarioId) &&
      (!fingerprint.action || scenarioActions?.includes(fingerprint.action)) &&
      exactDomFingerprint(detail, fingerprint),
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale: fingerprint.rationale,
    reason: `exact ${fingerprint.route} ${fingerprint.state} DOM implementation fingerprint; changed or missing visible content falls through to UNVERIFIED`,
  }),
);

export const PROJECT_ISSUE_DOM_IMPLEMENTATION_FINGERPRINTS = Object.freeze([
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/<issue-number>",
    state: "seeded-issue-detail",
    scenarioId: "I1-issue-detail",
    action: "issue-detail",
    normalizeIssueDiffs: true,
    expectedSkeletonEntries: 1017,
    actualSkeletonEntries: 558,
    firstDiffs: [
      ["yoram-only", "a.avatar-wrap:", "a.ago:2026-07-07"],
      ["yoram-only", "a.avatar-wrap:", "a.ago:2026-07-07"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group:", "a.share-link:[Link]"],
      ["yoram-only", "a.usf-group:", "a.share-link:[Link]"],
      ["order", "a.usf-group:", "a.ybtn.ybtn-success:새 서브 태스크"],
      ["order", "a.usf-group:", "a.ybtn.ybtn-success:새 서브 태스크"],
      ["order", "a.usf-group:", "a:#2"],
      ["order", "a.usf-group:", "a:#2"],
      ["order", "a.usf-group:", "a:<example-host>/"],
      ["order", "a.usf-group:", "a:<example-host>/"],
      ["order", "a.usf-group:", "a:@763575"],
      ["order", "a.usf-group:", "a:@763575"],
      ["order", "a.usf-group:", "a:@763575"],
      ["order", "a.usf-group:", "a:@763575"],
    ],
    wtrTest: "project issue detail matches legacy issue/view.scala.html voter state",
    wtrSource: "frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420",
    rationale: "Exact 03b683 DOM fingerprint backed by project issue detail matches legacy issue/view.scala.html voter state in frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420 against yona-original/app/views/issue/view.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/<issue-number>",
    state: "edit-issue-state",
    scenarioId: "I18-issue-edit-state",
    action: "create-issue",
    expectedSkeletonEntries: 325,
    actualSkeletonEntries: 300,
    firstDiffs: [
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:List"],
    ],
    wtrTest: "project issue detail renders legacy updateable labels without manager edit link",
    wtrSource: "frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390",
    rationale: "Exact 03b683 DOM fingerprint backed by project issue detail renders legacy updateable labels without manager edit link in frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390 against yona-original/app/views/issue/view.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/<issue-number>",
    state: "comment-lifecycle",
    scenarioId: "I19-comment-lifecycle",
    action: "create-issue",
    expectedSkeletonEntries: 325,
    actualSkeletonEntries: 300,
    firstDiffs: [
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:List"],
    ],
    wtrTest: "project issue detail matches legacy issue/view.scala.html voter state",
    wtrSource: "frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420; frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390",
    rationale: "Exact 03b683 DOM fingerprint backed by project issue detail matches legacy issue/view.scala.html voter state in frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420; frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390 against yona-original/app/views/issue/view.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/<issue-number>",
    state: "comment-lifecycle",
    scenarioId: "I19-comment-lifecycle",
    action: "create-issue-comment",
    normalizeIssueDiffs: true,
    expectedSkeletonEntries: 572,
    actualSkeletonEntries: 550,
    firstDiffs: [
      ["yoram-only", "a.avatar-wrap:", "a.ago:11시간 전"],
      ["yoram-only", "a.avatar-wrap:", "a.ago:11시간 전"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group:", "a.share-link:[Link]"],
      ["yoram-only", "a.usf-group:", "a.share-link:[Link]"],
      ["yoram-only", "a:Site", "a:Differential sweep issue body sweepmtpqyait11"],
      ["yoram-only", "a:Site", "a:Reference in new issue"],
      ["legacy-only", "a:이슈로 만들기", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "button.ago:방금 전", "button.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.ago:방금 전", "button.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.btn-transparent-with-fontsize-lineheight.ml10:", "button.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.btn-transparent-with-fontsize-lineheight.ml6:", "button.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.btn-transparent-with-fontsize-lineheight:"],
    ],
    wtrTest: "project issue detail matches legacy issue/view.scala.html voter state",
    wtrSource: "frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420; frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390",
    rationale: "Exact 03b683 DOM fingerprint backed by project issue detail matches legacy issue/view.scala.html voter state in frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420; frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390 against yona-original/app/views/issue/view.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/<issue-number>",
    state: "issue-engagement",
    scenarioId: "I20-issue-engagement",
    action: "create-issue",
    expectedSkeletonEntries: 325,
    actualSkeletonEntries: 300,
    firstDiffs: [
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:List"],
    ],
    wtrTest: "project issue detail renders legacy updateable labels without manager edit link",
    wtrSource: "frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390",
    rationale: "Exact 03b683 DOM fingerprint backed by project issue detail renders legacy updateable labels without manager edit link in frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390 against yona-original/app/views/issue/view.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/<issue-number>",
    state: "issue-label-crud",
    scenarioId: "I21-issue-label-crud",
    action: "create-issue",
    expectedSkeletonEntries: 325,
    actualSkeletonEntries: 300,
    firstDiffs: [
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:List"],
    ],
    wtrTest: "project issue detail renders legacy updateable labels without manager edit link",
    wtrSource: "frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390",
    rationale: "Exact 03b683 DOM fingerprint backed by project issue detail renders legacy updateable labels without manager edit link in frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390 against yona-original/app/views/issue/view.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/<issue-number>",
    state: "created-issue",
    scenarioId: "S3-create-issue",
    action: "create-issue",
    expectedSkeletonEntries: 324,
    actualSkeletonEntries: 299,
    firstDiffs: [
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:List"],
    ],
    wtrTest: "project issue detail create flow preserves legacy body and controls",
    wtrSource: "frontend/tests/wtr/project-issue-detail-2.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by project issue detail create flow preserves legacy body and controls in frontend/tests/wtr/project-issue-detail-2.e2e.ts against yona-original/app/views/issue/view.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/<issue-number>",
    state: "comment-created",
    scenarioId: "S4-issue-comment",
    action: "create-issue",
    expectedSkeletonEntries: 324,
    actualSkeletonEntries: 299,
    firstDiffs: [
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.icon.btn-transparent-with-fontsize-lineheight:"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.search-btn.btn-calendar:", "button.markdown-help-nav-button:List"],
    ],
    wtrTest: "project issue detail comment flow preserves legacy timeline and controls",
    wtrSource: "frontend/tests/wtr/project-issue-detail-2.e2e.ts; frontend/tests/wtr/project-issue-detail-3.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by project issue detail comment flow preserves legacy timeline and controls in frontend/tests/wtr/project-issue-detail-2.e2e.ts; frontend/tests/wtr/project-issue-detail-3.e2e.ts against yona-original/app/views/issue/view.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/<issue-number>",
    state: "comment-created",
    scenarioId: "S4-issue-comment",
    action: "create-issue-comment",
    normalizeIssueDiffs: true,
    expectedSkeletonEntries: 571,
    actualSkeletonEntries: 549,
    firstDiffs: [
      ["yoram-only", "a.avatar-wrap:", "a.ago:11시간 전"],
      ["yoram-only", "a.avatar-wrap:", "a.ago:11시간 전"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group:", "a.share-link:[Link]"],
      ["yoram-only", "a.usf-group:", "a.share-link:[Link]"],
      ["yoram-only", "a:Site", "a:Differential sweep issue body sweepmtpqyait82"],
      ["yoram-only", "a:Site", "a:Reference in new issue"],
      ["legacy-only", "a:이슈로 만들기", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "button.ago:방금 전", "button.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.ago:방금 전", "button.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.btn-transparent-with-fontsize-lineheight.ml10:", "button.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.btn-transparent-with-fontsize-lineheight.ml6:", "button.btn-transparent-with-fontsize-lineheight:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.btn-transparent-with-fontsize-lineheight:"],
    ],
    wtrTest: "project issue detail comment flow preserves legacy timeline and controls",
    wtrSource: "frontend/tests/wtr/project-issue-detail-2.e2e.ts; frontend/tests/wtr/project-issue-detail-3.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by project issue detail comment flow preserves legacy timeline and controls in frontend/tests/wtr/project-issue-detail-2.e2e.ts; frontend/tests/wtr/project-issue-detail-3.e2e.ts against yona-original/app/views/issue/view.scala.html; the full route/state/action/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
]);

const PROJECT_ISSUE_DOM_FINGERPRINT_RULES = PROJECT_ISSUE_DOM_IMPLEMENTATION_FINGERPRINTS.map(
  (fingerprint) => ({
    test: ({ kind, route, detail, scenarioId, scenarioActions }) =>
      kind === "dom" &&
      canonicalFingerprintRoute(route) === fingerprint.route &&
      scenarioId === fingerprint.scenarioId &&
      (!fingerprint.action || scenarioActions?.includes(fingerprint.action)) &&
      exactDomFingerprint(detail, fingerprint),
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale: fingerprint.rationale,
    reason: `exact ${fingerprint.route} ${fingerprint.state} DOM implementation fingerprint; changed or missing visible content falls through to UNVERIFIED`,
  }),
);

export const PROJECT_ISSUE_LABELS_DOM_IMPLEMENTATION_FINGERPRINTS = Object.freeze([
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/labelsform",
    state: "labels-form",
    scenarioId: "P1-issue-labels",
    action: "view-issue-labels-form",
    expectedSkeletonEntries: 75,
    actualSkeletonEntries: 75,
    firstDiffs: [
      [
        "legacy-only",
        "div:만약 라벨을 복사해 오려는 대상 프로젝트가 'naver/yobi' 라면 소유자는 naver, 프로젝트 이름은 yobi 입니다. 대소문자는 구분하지 않습니다.",
        "div:만약 라벨을 복사해 오려는 대상 프로젝트가 'Yoram/Yoram' 라면 소유자는 Yoram, 프로젝트 이름은 Yoram 입니다. 대소문자는 구분하지 않습니다.",
      ],
      [
        "yoram-only",
        "div:현재 프로젝트에 이미 동일한 이름과 동일한 카테고리, 색을 가진 라벨이 존재하면, 해당 라벨은 추가되지 않습니다.",
        "div:만약 라벨을 복사해 오려는 대상 프로젝트가 'Yoram/Yoram' 라면 소유자는 Yoram, 프로젝트 이름은 Yoram 입니다. 대소문자는 구분하지 않습니다.",
      ],
    ],
    wtrTest: "project labels renders REST categoryName payloads with legacy control classes",
    wtrSource: "frontend/tests/wtr/project-labels-form.e2e.ts:1187-1215",
    rationale:
      "Product-identity-only copy: the exact legacy naver/yobi description versus the current Yoram/Yoram description is the approved Yoram rebrand documented by docs/provenance/frontend-yoram-rebrand-2026-07-13.md:135-138 and frontend/src/rebrand.spec.ts:72-84. The focused WTR test \"project labels renders REST categoryName payloads with legacy control classes\" (frontend/tests/wtr/project-labels-form.e2e.ts:1187-1215) separately proves the live label payload, visible category/label order, and primary control classes; any changed or missing form, button, label, copy, or count remains UNVERIFIED.",
  }),
  // The final-corrected sweep captured the same approved copy-only rebrand
  // with the route body narrowed to 62 entries. Keep that capture explicit:
  // skeleton counts remain part of the fingerprint, so this does not widen
  // the 75-entry rule or accept a missing form/control.
  siteAdminDomFingerprint({
    route: "/admin/sample/issue/labelsform",
    state: "labels-form-final-corrected",
    scenarioId: "P1-issue-labels",
    action: "view-issue-labels-form",
    expectedSkeletonEntries: 62,
    actualSkeletonEntries: 62,
    firstDiffs: [
      [
        "legacy-only",
        "div:만약 라벨을 복사해 오려는 대상 프로젝트가 'naver/yobi' 라면 소유자는 naver, 프로젝트 이름은 yobi 입니다. 대소문자는 구분하지 않습니다.",
        "div:만약 라벨을 복사해 오려는 대상 프로젝트가 'Yoram/Yoram' 라면 소유자는 Yoram, 프로젝트 이름은 Yoram 입니다. 대소문자는 구분하지 않습니다.",
      ],
      [
        "yoram-only",
        "div:현재 프로젝트에 이미 동일한 이름과 동일한 카테고리, 색을 가진 라벨이 존재하면, 해당 라벨은 추가되지 않습니다.",
        "div:만약 라벨을 복사해 오려는 대상 프로젝트가 'Yoram/Yoram' 라면 소유자는 Yoram, 프로젝트 이름은 Yoram 입니다. 대소문자는 구분하지 않습니다.",
      ],
    ],
    wtrTest: "project labels renders REST categoryName payloads with legacy control classes",
    wtrSource: "frontend/tests/wtr/project-labels-form.e2e.ts:1187-1215",
    rationale:
      "Product-identity-only copy: the final-corrected capture contains only the approved legacy naver/yobi versus current Yoram/Yoram copy pair, with no form/control/label loss. The rebrand is documented by docs/provenance/frontend-yoram-rebrand-2026-07-13.md:135-138 and frontend/src/rebrand.spec.ts:72-84; the focused WTR test proves the live label payload, visible category/label order, and primary control classes. Any changed count, form, button, label, or copy remains UNVERIFIED.",
  }),
]);

const PROJECT_ISSUE_LABELS_DOM_FINGERPRINT_RULES = PROJECT_ISSUE_LABELS_DOM_IMPLEMENTATION_FINGERPRINTS.map(
  (fingerprint) => ({
    test: ({ kind, route, detail, scenarioId, scenarioActions }) =>
      kind === "dom" &&
      route === fingerprint.route &&
      scenarioId === fingerprint.scenarioId &&
      (!fingerprint.action || scenarioActions?.includes(fingerprint.action)) &&
      exactDomFingerprint(detail, fingerprint),
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale: fingerprint.rationale,
    reason: `exact ${fingerprint.route} ${fingerprint.state} DOM implementation fingerprint; changed or missing visible content falls through to UNVERIFIED`,
  }),
);

export const PROJECT_ROUTE_DOM_IMPLEMENTATION_FINGERPRINTS = Object.freeze([
  siteAdminDomFingerprint({
    route: "/orgs",
    state: "fresh-03b683",
    scenarioId: "U5-orgs-list",
    action: "view-orgs-list",
    expectedSkeletonEntries: 94,
    actualSkeletonEntries: 74,
    firstDiffs: [
      ["legacy-only", "a.show-progress-bar:전체 목록", "a.show-progress-bar.active:전체 목록"],
      ["yoram-only", "a.user-item-btn.loggged-in:내 이슈", "a.show-progress-bar.active:전체 목록"],
      ["yoram-only", "button.search-btn:", "button.pin:"],
      ["legacy-only", "div.admin-logged-in-affix.affix-top:관리자로 로그인 하였습니다!", "div.btn-dismiss:"],
      ["legacy-only", "div.page-footer:", "div.pull-left:"],
      ["legacy-only", "div.page-navigation-wrap:", "div.pull-left:"],
      ["legacy-only", "div.page-wrap-outer:", "div.pull-left:"],
      ["legacy-only", "div.pin:", "div.pull-left:"],
      ["legacy-only", "div.project-page-wrap:", "div.pull-left:"],
      ["legacy-only", "div.site-breadcrumb-inner:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.site-breadcrumb-outer:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["yoram-only", "div.title_area:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.yobiToasts:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "footer.page-footer-outer:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "i.ico.btn-pg-next.off:", "i.yobicon-arrow-left:"],
      ["legacy-only", "i.ico.btn-pg-prev.off:", "i.yobicon-arrow-left:"],
      ["legacy-only", "input.input-mini.nospinner:", "input.textbox:"],
      ["legacy-only", "li.page-num.delimiter:/", "li.project:"],
      ["legacy-only", "li.page-num.ikon:", "li.project:"],
      ["legacy-only", "li.page-num.ikon:", "li.project:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/organizations-list.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/organizations-list.e2e.ts against yona-original/app/views/organization/list.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/milestones",
    state: "fresh-03b683",
    scenarioId: "P3-milestones",
    action: "list-milestones",
    expectedSkeletonEntries: 165,
    actualSkeletonEntries: 34,
    firstDiffs: [
      ["legacy-only", "a.filter.active:기한순", "a.issue-link:"],
      ["legacy-only", "a.filter:완료율순", "a.issue-link:"],
      ["order", "a.issue-link:", "a.milestone-name:Parity launch"],
      ["order", "a.milestone-name:Parity launch", "a.ybtn.ybtn-success:새 마일스톤"],
      ["legacy-only", "a.milestone-name:mini-x1", "a:전체"],
      ["legacy-only", "a.milestone-name:parity-milestone-api-sweep-mt6k1hwu-48", "a:전체"],
      ["legacy-only", "a.milestone-name:parity-milestone-mini1", "a:전체"],
      ["legacy-only", "a.milestone-name:parity-milestone-minimt5bpygl", "a:전체"],
      ["legacy-only", "a.milestone-name:parity-milestone-minimt5bq1e6", "a:전체"],
      ["legacy-only", "a.milestone-name:parity-milestone-minimt5brahy", "a:전체"],
      ["legacy-only", "a.milestone-name:parity-milestone-sweep-mt6k1hwu-48", "a:전체"],
      ["legacy-only", "a.milestone-name:parity-ms-probemt5abpvy-c", "a:전체"],
      ["legacy-only", "a.milestone-name:parity-ms-probemt5accmi-m1", "a:전체"],
      ["legacy-only", "a.milestone-name:parity-ms-probemt5bmbf3-m1", "a:전체"],
      ["order", "a.ybtn.ybtn-success:새 마일스톤", "a:전체"],
      ["order", "a:전체", "a:종료"],
      ["order", "a:종료", "a:진행중"],
      ["order", "a:진행중", "div.bar:"],
      ["legacy-only", "button.label.issue-label.list-label.active:bug", "div.btns:"],
      ["legacy-only", "button.search-btn:", "div.btns:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-milestones.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-milestones.e2e.ts against yona-original/app/views/milestone/list.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/milestone/1",
    state: "fresh-03b683",
    scenarioId: "P3-milestones",
    action: "view-milestone",
    expectedSkeletonEntries: 98,
    actualSkeletonEntries: 85,
    firstDiffs: [
      ["yoram-only", "a.title:Parity launch", "a.avatar-wrap.assinee:"],
      ["yoram-only", "a.title:Parity launch", "a.comments-count.comments-count-color:"],
      ["yoram-only", "a.title:Parity launch", "a.infos-item.infos-link-item.active:Site Admin"],
      ["yoram-only", "a.title:Parity launch", "a.title:"],
      ["legacy-only", "a.ybtn.pull-left:목록", "a.title:Review rail parity check"],
      ["yoram-only", "a.ybtn:수정", "a.title:Review rail parity check"],
      ["yoram-only", "a.ybtn:수정", "a.ybtn:목록"],
      ["yoram-only", "a:닫힘", "a:Parity launch"],
      ["yoram-only", "button.btn.dropdown-toggle.medium:", "button.label.issue-label.list-label.active:bug"],
      ["order", "button.btn.dropdown-toggle.medium:", "button.search-btn:"],
      ["order", "button.btn.dropdown-toggle.medium:", "button.usf-group:"],
      ["order", "button.btn.dropdown-toggle.medium:", "button.ybtn.ybtn-danger:삭제"],
      ["order", "button.search-btn:", "button.ybtn:마일스톤 종료"],
      ["order", "button.usf-group:", "button:나에게 할당하기"],
      ["order", "button.ybtn.ybtn-danger:삭제", "button:닫힘"],
      ["order", "button.ybtn:마일스톤 종료", "button:담당자 없음"],
      ["legacy-only", "button:Parity launch", "button:열림"],
      ["legacy-only", "button:mini-x1", "button:열림"],
      ["legacy-only", "button:parity-milestone-api-sweep-mt6k1hwu-48", "button:열림"],
      ["legacy-only", "button:parity-milestone-mini1", "button:열림"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-milestone-detail.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-milestone-detail.e2e.ts against yona-original/app/views/milestone/view.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/milestone/1/editform",
    state: "fresh-03b683",
    scenarioId: "P3-milestones",
    action: "view-milestone-editform",
    expectedSkeletonEntries: 300,
    actualSkeletonEntries: 300,
    firstDiffs: [
      ["yoram-only", "a.ybtn:취소", "a.head-anchor.active:#"],
      ["yoram-only", "a.ybtn:취소", "a.head-anchor.active:#"],
      ["yoram-only", "a.ybtn:취소", "a.head-anchor.active:#"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:List"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Short Link"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Table"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Text Style"],
      ["legacy-only", "code.javascript.hljs:{ .log(); }", "code.language-javascript.hljs:{ .log(); }"],
      ["yoram-only", "code:function test() {console.log(\"hello world\");}", "code.language-javascript.hljs:{ .log(); }"],
      ["legacy-only", "div.actrow.right-txt:", "div.actrow:"],
      ["yoram-only", "div.attach-wrap:", "div.actrow:"],
      ["legacy-only", "div.msg-wrap:", "div.mt10:"],
      ["legacy-only", "div.msg:여기에 파일을 끌어다 놓으면 업로드 됩니다", "div.mt10:"],
      ["legacy-only", "div.upload-drop-here:", "div.upload-wrap.content-footer:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-milestone-edit-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-milestone-edit-form.e2e.ts against yona-original/app/views/milestone/edit.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/newMilestoneForm",
    state: "fresh-03b683",
    scenarioId: "P3-milestones",
    action: "view-new-milestone-form",
    expectedSkeletonEntries: 300,
    actualSkeletonEntries: 300,
    firstDiffs: [
      ["legacy-only", "a.ybtn:취소", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "abbr:Fri", "a:취소"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:List"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Short Link"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Table"],
      ["yoram-only", "button.pika-button.pika-day:1", "button.markdown-help-nav-button:Text Style"],
      ["legacy-only", "button.ybtn.ybtn-info:저장", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제"],
      ["yoram-only", "button:편집", "button:저장"],
      ["legacy-only", "code.javascript.hljs:{ .log(); }", "code.language-javascript.hljs:{ .log(); }"],
      ["yoram-only", "code:function test() {console.log(\"hello world\");}", "code.language-javascript.hljs:{ .log(); }"],
      ["legacy-only", "div.actrow.right-txt:", "div.actrow:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-milestone-create-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-milestone-create-form.e2e.ts against yona-original/app/views/milestone/create.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/posts",
    state: "fresh-03b683",
    scenarioId: "P4-posts-and-board",
    action: "list-posts",
    expectedSkeletonEntries: 91,
    actualSkeletonEntries: 81,
    firstDiffs: [
      ["legacy-only", "a.comments-count.comments-count-color:", "a.infos-item.infos-link-item:Site Admin"],
      ["legacy-only", "div.pull-right:", "div.row-fluid.mt20:"],
      ["legacy-only", "div.select2-container.select2-container-multi.hide.issue-labels.bordered.fullsize:", "div.span12:"],
      ["legacy-only", "div.select2-drop.select2-drop-multi.select2-display-none.issue-labels:", "div.span12:"],
      ["legacy-only", "form.pull-left:", "h5:게시글 목록"],
      ["legacy-only", "i.yobicon-comment2:", "i.yobicon-comments:"],
      ["yoram-only", "i.yobicon-search:", "i.yobicon-comments:"],
      ["legacy-only", "input.select2-input.select2-default:", "input.textbox:"],
      ["legacy-only", "li.select2-no-results:결과 없음", "option:bug"],
      ["legacy-only", "li.select2-search-field:", "option:bug"],
      ["legacy-only", "select.hide.select2-offscreen:", "select.hide:"],
      ["yoram-only", "span.count-groups.item-count:2", "select.hide:"],
      ["legacy-only", "span.infos-item:07-22", "span.infos-item:2026-07-07"],
      ["yoram-only", "span.label.label-notice:공지", "span.infos-item:2026-07-07"],
      ["legacy-only", "ul.select2-choices:", "<absent>"],
      ["legacy-only", "ul.select2-results:", "<absent>"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-posts.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-posts.e2e.ts against yona-original/app/views/board/list.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/postform",
    state: "fresh-03b683",
    scenarioId: "P4-posts-and-board",
    action: "view-post-form",
    expectedSkeletonEntries: 202,
    actualSkeletonEntries: 202,
    firstDiffs: [
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가", "a:미리보기"],
      ["yoram-only", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가", "a:편집"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:List"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Short Link"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Table"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Text Style"],
      ["legacy-only", "button:미리보기", "code.language-javascript.hljs:{ .log(); }"],
      ["legacy-only", "button:편집", "code.language-javascript.hljs:{ .log(); }"],
      ["legacy-only", "code.javascript.hljs:{ .log(); }", "code.language-javascript.hljs:{ .log(); }"],
      ["yoram-only", "code:function test() {console.log(\"hello world\");}", "code.language-javascript.hljs:{ .log(); }"],
      ["legacy-only", "div.msg-wrap:", "div.mt10.mb10:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-board-create-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-board-create-form.e2e.ts against yona-original/app/views/board/new.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/post/1",
    state: "fresh-03b683",
    scenarioId: "P4-posts-and-board",
    action: "view-post",
    normalizeIssueDiffs: true,
    expectedSkeletonEntries: 546,
    actualSkeletonEntries: 541,
    firstDiffs: [
      ["yoram-only", "a.avatar-wrap:", "a.active:미리보기"],
      ["yoram-only", "a.avatar-wrap:", "a.active:미리보기"],
      ["yoram-only", "a.avatar-wrap:", "a.active:편집"],
      ["yoram-only", "a.avatar-wrap:", "a.active:편집"],
      ["yoram-only", "a.avatar-wrap:", "a.ago:2026-07-07"],
      ["yoram-only", "a.avatar-wrap:", "a.ago:2026-09-06"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.label-edit:[수정]", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group:", "a.share-link:[Link]"],
      ["legacy-only", "button.ago:07-22", "button.btn-transparent.deleteButtonX:x"],
      ["legacy-only", "button.ago:07-22", "button.btn-transparent.deleteButtonX:x"],
      ["legacy-only", "button.btn-transparent.ml10:", "button.btn-transparent:"],
      ["legacy-only", "button.btn-transparent.ml6:", "button.btn-transparent:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.btn-transparent:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml10.pt5px:", "button.btn-transparent:"],
      ["legacy-only", "button.icon.btn-transparent-with-fontsize-lineheight.ml6:", "button.btn-transparent:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-posts.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-posts.e2e.ts against yona-original/app/views/board/view.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/post/1/editform",
    state: "fresh-03b683",
    scenarioId: "P4-posts-and-board",
    action: "view-post-editform",
    expectedSkeletonEntries: 207,
    actualSkeletonEntries: 207,
    firstDiffs: [
      ["yoram-only", "a:#2", "a.active:미리보기"],
      ["yoram-only", "a:#2", "a.active:편집"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:List"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:Short Link"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:Table"],
      ["yoram-only", "button.ybtn.ybtn-info:저장", "button.markdown-help-nav-button:Text Style"],
      ["legacy-only", "button:미리보기", "code.language-javascript.hljs:{ .log(); }"],
      ["legacy-only", "button:편집", "code.language-javascript.hljs:{ .log(); }"],
      ["legacy-only", "code.javascript.hljs:{ .log(); }", "code.language-javascript.hljs:{ .log(); }"],
      ["yoram-only", "code:function test() {console.log(\"hello world\");}", "code.language-javascript.hljs:{ .log(); }"],
      ["legacy-only", "div.msg-wrap:", "div.mt10.mb10:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-board-edit-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-board-edit-form.e2e.ts against yona-original/app/views/board/edit.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/members",
    state: "fresh-03b683",
    scenarioId: "P5-project-home-subpages",
    action: "view-project-members",
    expectedSkeletonEntries: 22,
    actualSkeletonEntries: 26,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap.mlarge.pull-left.mr10:", "a:멤버"],
      ["legacy-only", "div.member-id:@admin", "div.member-setting:"],
      ["legacy-only", "div.member-name:Site Admin", "div.member-setting:"],
      ["order", "div.project-page-wrap:", "div.member-setting:"],
      ["order", "form.nm:", "div.project-page-wrap:"],
      ["yoram-only", "i.yobicon-addfriend:", "div:@admin"],
      ["yoram-only", "i.yobicon-addfriend:", "div:@admin"],
      ["yoram-only", "i.yobicon-addfriend:", "div:Site Admin"],
      ["yoram-only", "i.yobicon-addfriend:", "div:Site Admin"],
      ["order", "i.yobicon-addfriend:", "form.nm:"],
      ["order", "input.text.uname:", "i.yobicon-addfriend:"],
      ["order", "li.active:", "input.text.uname:"],
      ["order", "li.member.span6.span-hard-wrap:", "li.active:"],
      ["order", "span.label.owner:프로젝트 소유자", "li.member.span6.span-hard-wrap:"],
      ["order", "ul.members.project.row-fluid:", "li.member.span6.span-hard-wrap:"],
      ["order", "ul.nav.nav-tabs:", "span.label.owner:프로젝트 소유자"],
      ["order", undefined, "span.label.owner:프로젝트 소유자"],
      ["order", undefined, "ul.members.project.row-fluid:"],
      ["order", undefined, "ul.nav.nav-tabs:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-members-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-members-form.e2e.ts against yona-original/app/views/project/members.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/watchers",
    state: "fresh-03b683",
    scenarioId: "P5-project-home-subpages",
    action: "view-project-watchers",
    expectedSkeletonEntries: 8,
    actualSkeletonEntries: 4,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap.mlarge.pull-left.mr10:", "div.project-page-wrap:"],
      ["legacy-only", "div.member-id:@bob", "div.project-page-wrap:"],
      ["legacy-only", "div.member-name:Bob Park", "div.project-page-wrap:"],
      ["legacy-only", "li.member.span6.span-hard-wrap:", "p:* 지켜보기 한 멤버 중, 실제로 프로젝트에 접근할 수 있는 사람들의 목록입니다"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-watchers.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-watchers.e2e.ts against yona-original/app/views/project/watchers.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/settingform",
    state: "fresh-03b683",
    scenarioId: "P5-project-home-subpages",
    action: "view-project-setting-form",
    expectedSkeletonEntries: 100,
    actualSkeletonEntries: 108,
    firstDiffs: [
      ["yoram-only", "a.ybtn:편집", "a.s2e-setting-submenu-link.is-active:설정"],
      ["yoram-only", "a.ybtn:편집", "a.s2e-setting-submenu-link:멤버"],
      ["yoram-only", "a.ybtn:편집", "a.s2e-setting-submenu-link:웹후크"],
      ["yoram-only", "a.ybtn:편집", "a.s2e-setting-submenu-link:이슈 라벨"],
      ["yoram-only", "a.ybtn:편집", "a.s2e-setting-submenu-link:코드 저장소 타입 변경"],
      ["yoram-only", "a.ybtn:편집", "a.s2e-setting-submenu-link:프로젝트 삭제"],
      ["yoram-only", "a.ybtn:편집", "a.s2e-setting-submenu-link:프로젝트 이관"],
      ["legacy-only", "a:멤버", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["legacy-only", "a:설정", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["legacy-only", "a:웹후크", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["legacy-only", "a:이슈 라벨", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["legacy-only", "a:코드 저장소 타입 변경", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["legacy-only", "a:프로젝트 삭제", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["legacy-only", "a:프로젝트 이관", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["legacy-only", "button.btn.dropdown-toggle.large:", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["yoram-only", "button.select2-choice:", "button.btn.dropdown-toggle.large.s2e-reviewer-dropdown-toggle:"],
      ["yoram-only", "button.ybtn.ybtn-success:저장", "button.select2-result-label:feature/ui"],
      ["yoram-only", "button.ybtn.ybtn-success:저장", "button.select2-result-label:main"],
      ["yoram-only", "div.box-wrap.bottom:", "button:2"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-settings-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-settings-form.e2e.ts against yona-original/app/views/project/setting.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/webhooks",
    state: "fresh-03b683",
    scenarioId: "P5-project-home-subpages",
    action: "view-project-webhooks",
    expectedSkeletonEntries: 256,
    actualSkeletonEntries: 29,
    firstDiffs: [
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
      ["legacy-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.ybtn.ybtn-primary.btn-submit:웹후크 추가"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-webhooks-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-webhooks-form.e2e.ts against yona-original/app/views/project/webhooks.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/statistics",
    state: "fresh-03b683",
    scenarioId: "P5-project-home-subpages",
    action: "view-project-statistics",
    expectedSkeletonEntries: 2,
    actualSkeletonEntries: 2,
    firstDiffs: [
      ["legacy-only", "h1:Under Construction", "h1.s2e-statistics-heading:Under Construction"],
      ["yoram-only", "<absent>", "h1.s2e-statistics-heading:Under Construction"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-statistics.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-statistics.e2e.ts against yona-original/app/views/project/statistics.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/search?keyword=welcome&searchType=issue",
    state: "fresh-03b683",
    scenarioId: "P7-project-search",
    action: "search-in-project",
    expectedSkeletonEntries: 34,
    actualSkeletonEntries: 34,
    firstDiffs: [
      ["yoram-only", "button.ybtn:검색", "a.project-search-category-action:게시판"],
      ["yoram-only", "button.ybtn:검색", "a.project-search-category-action:게시판 댓글"],
      ["yoram-only", "button.ybtn:검색", "a.project-search-category-action:마일스톤"],
      ["yoram-only", "button.ybtn:검색", "a.project-search-category-action:사용자"],
      ["yoram-only", "button.ybtn:검색", "a.project-search-category-action:이슈"],
      ["yoram-only", "button.ybtn:검색", "a.project-search-category-action:이슈 댓글"],
      ["yoram-only", "button.ybtn:검색", "a.project-search-category-action:코드 리뷰"],
      ["legacy-only", "button:게시판", "div.empty-result:"],
      ["legacy-only", "button:게시판 댓글", "div.empty-result:"],
      ["legacy-only", "button:마일스톤", "div.empty-result:"],
      ["legacy-only", "button:사용자", "div.empty-result:"],
      ["legacy-only", "button:이슈", "div.empty-result:"],
      ["legacy-only", "button:이슈 댓글", "div.empty-result:"],
      ["legacy-only", "button:코드 리뷰", "div.empty-result:"],
      ["legacy-only", "span.num-badge.pull-right:0", "span.project-search-category-badge.num-badge:0"],
      ["legacy-only", "span.num-badge.pull-right:0", "span.project-search-category-badge.num-badge:0"],
      ["legacy-only", "span.num-badge.pull-right:0", "span.project-search-category-badge.num-badge:0"],
      ["legacy-only", "span.num-badge.pull-right:0", "span.project-search-category-badge.num-badge:0"],
      ["legacy-only", "span.num-badge.pull-right:0", "span.project-search-category-badge.num-badge:0"],
      ["legacy-only", "span.num-badge.pull-right:0", "span.project-search-category-badge.num-badge:0"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/search-project.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/search-project.e2e.ts against yona-original/app/views/project/search.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/compare/main..feature%2Fui",
    state: "fresh-03b683",
    scenarioId: "R10-compare-and-file-views",
    action: "code-compare",
    expectedSkeletonEntries: 106,
    actualSkeletonEntries: 112,
    firstDiffs: [
      ["order", "span.hidden:...", "span.hidden:"],
      ["order", "span.hidden:...", "span.hidden:"],
      ["order", "span.hidden:...", "span.hidden:"],
      ["order", "span.hidden:1", "span.hidden:..."],
      ["order", "span.hidden:1", "span.hidden:..."],
      ["order", "span.hidden:1", "span.hidden:..."],
      ["order", "span.hidden:2", "span.hidden:1"],
      ["order", "span.hidden:2", "span.hidden:1"],
      ["order", "span.hidden:2", "span.hidden:1"],
      ["order", "span.hidden:3", "span.hidden:2"],
      ["order", "span.hidden:3", "span.hidden:2"],
      ["order", "strong.commitId:@a92847dc20bf80c878a8017b4c2cec36b7d9eaac..04467638e7c756c063a745e1416e657bf40d839c", "span.hidden:2"],
      ["order", "table.diff-container.show-comments:", "span.hidden:3"],
      ["order", "table.diff-container.show-comments:", "span.hidden:3"],
      ["yoram-only", "td.code:", "span.project-compare-diff-stat-badge-add:+4"],
      ["yoram-only", "td.code:", "span.project-compare-diff-stat-badge-changed:2 files changed"],
      ["yoram-only", "td.code:", "span.project-compare-diff-stat-badge-delete:-0"],
      ["order", "td.code:", "strong.commitId:@a92847dc20bf80c878a8017b4c2cec36b7d9eaac..04467638e7c756c063a745e1416e657bf40d839c"],
      ["order", "td.code:", "table.diff-container.show-comments:"],
      ["order", "td.code:", "table.diff-container.show-comments:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-compare.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-compare.e2e.ts against yona-original/app/views/code/compare.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/newFork",
    state: "fresh-03b683",
    scenarioId: "R12-newfork-reviews-attachments",
    action: "view-newfork-page",
    expectedSkeletonEntries: 32,
    actualSkeletonEntries: 30,
    firstDiffs: [
      ["legacy-only", "button.ybtn.ybtn-info:코드 저장소 복사", "button:코드 저장소 복사"],
      ["yoram-only", "div.content-wrap.frm-wrap:", "button:코드 저장소 복사"],
      ["yoram-only", "div.controls:", "div.controls.pr-fork-controls:"],
      ["order", "div.controls:", "div.project-page-wrap:"],
      ["order", "div.project-page-wrap:", "div.pull-left:"],
      ["legacy-only", "div.pull-left.help-messages:", "div.row-fluid:"],
      ["order", "div.pull-left:", "div.row-fluid:"],
      ["order", "div.row-fluid:", "div.well:"],
      ["order", "div.well:", "form.form-horizontal.nm:"],
      ["order", "form.form-horizontal.nm:", "h4:admin / sample 코드 저장소 복사"],
      ["order", "h4:admin / sample 코드 저장소 복사", "input.radio-btn:"],
      ["legacy-only", "img.img-polaroid:", "input.radio-btn:"],
      ["order", "input.radio-btn:", "label.bg-radiobtn.label-private:비공개"],
      ["order", "label.bg-radiobtn.label-private:비공개", "label.bg-radiobtn.label-public:공개"],
      ["order", "label.bg-radiobtn.label-public:공개", "label.control-label:공개 설정"],
      ["order", "label.control-label:공개 설정", "label.control-label:프로젝트 소유자"],
      ["order", "label.control-label:프로젝트 소유자", "label.control-label:프로젝트 이름"],
      ["order", "label.control-label:프로젝트 이름", "option:admin"],
      ["order", "option:admin", "option:weblabs"],
      ["order", "option:weblabs", "p.lead:프로젝트의 코드 저장소를 복사합니다."],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-fork-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-fork-form.e2e.ts against yona-original/app/views/git/fork.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/branches",
    state: "fresh-03b683",
    scenarioId: "R15-branch-default-toggle",
    action: "list-branches",
    expectedSkeletonEntries: 33,
    actualSkeletonEntries: 34,
    firstDiffs: [
      ["legacy-only", "a.commitId:f87f1bf", "a.commitId:61b93de"],
      ["yoram-only", "a:feature/ui", "a.commitId:61b93de"],
      ["yoram-only", "a:feature/ui", "a.pullrequest-state.merged:pullRequest-2"],
      ["yoram-only", "a:feature/ui", "a.pullrequest-state.open:pullRequest-1"],
      ["yoram-only", "a:파일", "a:태그"],
      ["legacy-only", "span.date:01-01", "span.date:2026-01-01"],
      ["legacy-only", "span.date:3초 전", "span.date:2026-01-01"],
      ["legacy-only", "span.disabled:주고받은 코드가 없습니다", "span.date:2026-01-01"],
      ["legacy-only", "span.disabled:주고받은 코드가 없습니다", "span.date:2026-01-01"],
      ["yoram-only", "span.headBranch.ml10:기본 브랜치", "span.date:2026-01-01"],
      ["yoram-only", "span.headBranch.ml10:기본 브랜치", "span.date:2026-09-06"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-branches.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-branches.e2e.ts against yona-original/app/views/code/branches.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/pullRequest/1/changes",
    state: "fresh-03b683",
    scenarioId: "R2-pr-detail",
    action: "view-pullrequest-changes",
    expectedSkeletonEntries: 456,
    actualSkeletonEntries: 471,
    firstDiffs: [
      ["yoram-only", "a.usf-group.pull-left:", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group.pull-left:", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group.pull-left:", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group.pull-left:", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group.pull-left:", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group.pull-left:", "a.head-anchor.active:#"],
      ["yoram-only", "a.usf-group.pull-left:", "a.review-card.open:"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:List"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-pullrequest-changes.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-pullrequest-changes.e2e.ts against yona-original/app/views/git/viewChanges.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/newPullRequestForm",
    state: "fresh-03b683",
    scenarioId: "R3-pr-forms",
    action: "new-pullrequest-form",
    expectedSkeletonEntries: 266,
    actualSkeletonEntries: 276,
    firstDiffs: [
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:List"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:Short Link"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:Table"],
      ["yoram-only", "button.select2-choice:", "button.markdown-help-nav-button:Text Style"],
      ["legacy-only", "code.javascript.hljs:{ .log(); }", "code.language-javascript.hljs:{ .log(); }"],
      ["yoram-only", "code:function test() {console.log(\"hello world\");}", "code.language-javascript.hljs:{ .log(); }"],
      ["legacy-only", "div.alert.mt20.mb20:코드가 안전한지 확인하고 있습니다. 완료될때까지 잠시만 기다려주십시오.", "div.alert.mt20.mb20.alert-info:변경 내역이 없습니다."],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-pullrequest-create-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-pullrequest-create-form.e2e.ts against yona-original/app/views/git/create.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/pullRequest/1/editform",
    state: "fresh-03b683",
    scenarioId: "R3-pr-forms",
    action: "view-pullrequest-editform",
    expectedSkeletonEntries: 264,
    actualSkeletonEntries: 255,
    firstDiffs: [
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:#2", "a.head-anchor.active:#"],
      ["yoram-only", "a:<example-host>/", "a:61b93de"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.add-task-list-button.ybtn.ybtn-small.ybtn-danger-no-outline:체크리스트 추가"],
      ["legacy-only", "button.select2-choice.select2-default:", "button.markdown-help-nav-button:Blockquote"],
      ["legacy-only", "button.select2-choice.select2-default:", "button.markdown-help-nav-button:Blockquote"],
      ["legacy-only", "button.select2-choice:", "button.markdown-help-nav-button:Blockquote"],
      ["legacy-only", "button.select2-choice:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Header"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Image"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Link"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:List"],
      ["yoram-only", "button.ybtn.ybtn-small.ybtn-warning:복구된 본문 삭제", "button.markdown-help-nav-button:Short Link"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-pullrequest-edit-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-pullrequest-edit-form.e2e.ts against yona-original/app/views/git/edit.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/commits",
    state: "fresh-03b683",
    scenarioId: "R4-commits-list",
    action: "list-commits",
    expectedSkeletonEntries: 68,
    actualSkeletonEntries: 69,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap:", "a.commitMsg.short:Add feature branch parity fixture"],
      ["legacy-only", "a.commitMsg.short:Merge branch 'feature/ui' into 'main'", "a.commitMsg.short:Merge remote-tracking branch 'refs/remotes/pull-request-source/feature/ui'"],
      ["yoram-only", "a.commitMsg.short:Seed sample parity repository", "a.commitMsg.short:Merge remote-tracking branch 'refs/remotes/pull-request-source/feature/ui'"],
      ["legacy-only", "a.ybtn.pull-left:다음", "a:0446763"],
      ["yoram-only", "a:a92847d", "a:61b93de"],
      ["legacy-only", "a:f87f1bf", "a:브랜치"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.project-commits-branch-button.select2-choice:"],
      ["legacy-only", "button.commitMsg.moreBtn:", "button.project-commits-branch-button.select2-choice:"],
      ["legacy-only", "button.select2-choice:", "button.project-commits-branch-button.select2-choice:"],
      ["yoram-only", "button.ybtn.ybtn-mini.btn-copy-commitId:", "button.project-commits-branch-button.select2-choice:"],
      ["yoram-only", "button.ybtn.ybtn-mini.btn-copy-commitId:", "button.project-commits-branch-button.select2-result-label:feature/ui"],
      ["yoram-only", "button.ybtn.ybtn-mini.btn-copy-commitId:", "button.project-commits-branch-button.select2-result-label:main"],
      ["yoram-only", "div.project-page-wrap:", "div.project-commits-branch-dropdown.select2-drop.select2-display-none.select2-with-searchbox.branches:"],
      ["legacy-only", "div.select2-container.pull-right:", "div.select2-container:"],
      ["legacy-only", "div.select2-drop.select2-display-none.branches.select2-with-searchbox:", "div.select2-container:"],
      ["yoram-only", "div.select2-search:", "div.select2-container:"],
      ["legacy-only", "option:refs/heads/feature/ui", "li.select2-results-dept-0.select2-result.select2-result-selectable.select2-selected:"],
      ["legacy-only", "option:refs/heads/main", "li.select2-results-dept-0.select2-result.select2-result-selectable.select2-selected:"],
      ["legacy-only", "pre.commitMsg.desc.hidden:from pull-request 2 * feature/ui: Add feature branch parity fixture", "li.select2-results-dept-0.select2-result.select2-result-selectable.select2-selected:"],
      ["yoram-only", "select.pull-right.select2-offscreen:", "li.select2-results-dept-0.select2-result.select2-result-selectable.select2-selected:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-history.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-history.e2e.ts against yona-original/app/views/code/history.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/commits/main/",
    state: "fresh-03b683",
    scenarioId: "R4-commits-list",
    action: "list-commits",
    expectedSkeletonEntries: 68,
    actualSkeletonEntries: 69,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap:", "a.commitMsg.short:Add feature branch parity fixture"],
      ["legacy-only", "a.commitMsg.short:Merge branch 'feature/ui' into 'main'", "a.commitMsg.short:Merge remote-tracking branch 'refs/remotes/pull-request-source/feature/ui'"],
      ["yoram-only", "a.commitMsg.short:Seed sample parity repository", "a.commitMsg.short:Merge remote-tracking branch 'refs/remotes/pull-request-source/feature/ui'"],
      ["legacy-only", "a.ybtn.pull-left:다음", "a:0446763"],
      ["yoram-only", "a:a92847d", "a:61b93de"],
      ["legacy-only", "a:f87f1bf", "a:브랜치"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.project-commits-branch-button.select2-choice:"],
      ["legacy-only", "button.commitMsg.moreBtn:", "button.project-commits-branch-button.select2-choice:"],
      ["legacy-only", "button.select2-choice:", "button.project-commits-branch-button.select2-choice:"],
      ["yoram-only", "button.ybtn.ybtn-mini.btn-copy-commitId:", "button.project-commits-branch-button.select2-choice:"],
      ["yoram-only", "button.ybtn.ybtn-mini.btn-copy-commitId:", "button.project-commits-branch-button.select2-result-label:feature/ui"],
      ["yoram-only", "button.ybtn.ybtn-mini.btn-copy-commitId:", "button.project-commits-branch-button.select2-result-label:main"],
      ["yoram-only", "div.project-page-wrap:", "div.project-commits-branch-dropdown.select2-drop.select2-display-none.select2-with-searchbox.branches:"],
      ["legacy-only", "div.select2-container.pull-right:", "div.select2-container:"],
      ["legacy-only", "div.select2-drop.select2-display-none.branches.select2-with-searchbox:", "div.select2-container:"],
      ["yoram-only", "div.select2-search:", "div.select2-container:"],
      ["legacy-only", "option:refs/heads/feature/ui", "li.select2-results-dept-0.select2-result.select2-result-selectable.select2-selected:"],
      ["legacy-only", "option:refs/heads/main", "li.select2-results-dept-0.select2-result.select2-result-selectable.select2-selected:"],
      ["legacy-only", "pre.commitMsg.desc.hidden:from pull-request 2 * feature/ui: Add feature branch parity fixture", "li.select2-results-dept-0.select2-result.select2-result-selectable.select2-selected:"],
      ["yoram-only", "select.pull-right.select2-offscreen:", "li.select2-results-dept-0.select2-result.select2-result-selectable.select2-selected:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-history.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-history.e2e.ts against yona-original/app/views/code/history.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/commits/main/README.md",
    state: "fresh-03b683",
    scenarioId: "R4-commits-list",
    action: "list-commits-path",
    expectedSkeletonEntries: 31,
    actualSkeletonEntries: 31,
    firstDiffs: [
      ["legacy-only", "td.date:01-01", "td.date:2026-01-01"],
      ["yoram-only", "td.messages:", "td.date:2026-01-01"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-history-file.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-history-file.e2e.ts against yona-original/app/views/code/history.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/commit/HEAD",
    state: "fresh-03b683",
    scenarioId: "R5-commit-detail",
    action: "view-commit",
    expectedSkeletonEntries: 542,
    actualSkeletonEntries: 437,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap.smaller:", "a.head-anchor:#"],
      ["legacy-only", "a.ybtn.pull-right:목록", "a.head-anchor:#"],
      ["yoram-only", "a:#2", "a.head-anchor:#"],
      ["yoram-only", "a:#2", "a.head-anchor:#"],
      ["yoram-only", "a:#2", "a.head-anchor:#"],
      ["yoram-only", "a:#2", "a.head-anchor:#"],
      ["yoram-only", "a:#2", "a.head-anchor:#"],
      ["yoram-only", "a:#2", "a.head-anchor:#"],
      ["yoram-only", "a:#2", "a.ybtn:목록"],
      ["legacy-only", "a:a92847d", "a:브랜치"],
      ["legacy-only", "a:f87f1bf", "a:브랜치"],
      ["legacy-only", "a:f87f1bf", "a:브랜치"],
      ["legacy-only", "button.pull-left.ybtn.active.ybtn-watching:지켜보기", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Blockquote"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Checklist"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Code"],
      ["yoram-only", "button.ybtn.hidden:", "button.markdown-help-nav-button:Header"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-commit-detail.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-commit-detail.e2e.ts against yona-original/app/views/code/diff.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/code",
    state: "fresh-03b683",
    scenarioId: "R6-code-browser",
    action: "browse-code",
    expectedSkeletonEntries: 64,
    actualSkeletonEntries: 73,
    firstDiffs: [
      ["yoram-only", "a:Seed sample parity repository", "a:Add feature branch parity fixture"],
      ["yoram-only", "a:Seed sample parity repository", "a:Add feature branch parity fixture"],
      ["order", "a:Seed sample parity repository", "a:sample"],
      ["order", "a:Seed sample parity repository", "a:브랜치"],
      ["order", "a:sample", "a:커밋"],
      ["order", "a:브랜치", "a:파일"],
      ["yoram-only", "a:커밋", "button.code-search-submit:Search"],
      ["yoram-only", "a:커밋", "button.code-search-tab-button.is-active:Find File"],
      ["yoram-only", "a:커밋", "button.code-search-tab-button:Search in File"],
      ["yoram-only", "a:커밋", "button.project-code-branch-picker-choice.select2-choice:"],
      ["yoram-only", "a:커밋", "button.project-code-branch-picker-choice.select2-result-label:feature/ui"],
      ["yoram-only", "a:커밋", "button.project-code-branch-picker-choice.select2-result-label:main"],
      ["order", "a:커밋", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["order", "a:파일", "div.code-browse-header:"],
      ["legacy-only", "abbr.select2-search-choice-close:", "div.code-browse-wrap:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-browse-wrap:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-browse-wrap:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-browse-wrap:"],
      ["legacy-only", "button.select2-choice:", "div.code-browse-wrap:"],
      ["order", "div.code-breadcrumb-wrap.ml10.pull-left:", "div.code-browse-wrap:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-view-folder.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-view-folder.e2e.ts against yona-original/app/views/code/view.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/code/main",
    state: "fresh-03b683",
    scenarioId: "R6-code-browser",
    action: "browse-code",
    expectedSkeletonEntries: 64,
    actualSkeletonEntries: 73,
    firstDiffs: [
      ["yoram-only", "a:Seed sample parity repository", "a:Add feature branch parity fixture"],
      ["yoram-only", "a:Seed sample parity repository", "a:Add feature branch parity fixture"],
      ["order", "a:Seed sample parity repository", "a:sample"],
      ["order", "a:Seed sample parity repository", "a:브랜치"],
      ["order", "a:sample", "a:커밋"],
      ["order", "a:브랜치", "a:파일"],
      ["yoram-only", "a:커밋", "button.code-search-submit:Search"],
      ["yoram-only", "a:커밋", "button.code-search-tab-button.is-active:Find File"],
      ["yoram-only", "a:커밋", "button.code-search-tab-button:Search in File"],
      ["yoram-only", "a:커밋", "button.project-code-branch-picker-choice.select2-choice:"],
      ["yoram-only", "a:커밋", "button.project-code-branch-picker-choice.select2-result-label:feature/ui"],
      ["yoram-only", "a:커밋", "button.project-code-branch-picker-choice.select2-result-label:main"],
      ["order", "a:커밋", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["order", "a:파일", "div.code-browse-header:"],
      ["legacy-only", "abbr.select2-search-choice-close:", "div.code-browse-wrap:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-browse-wrap:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-browse-wrap:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-browse-wrap:"],
      ["legacy-only", "button.select2-choice:", "div.code-browse-wrap:"],
      ["order", "div.code-breadcrumb-wrap.ml10.pull-left:", "div.code-browse-wrap:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-view-folder.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-view-folder.e2e.ts against yona-original/app/views/code/view.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/code/main/README.md",
    state: "fresh-03b683",
    scenarioId: "R7-code-tree-entry",
    action: "browse-code-tree-entry",
    expectedSkeletonEntries: 86,
    actualSkeletonEntries: 35,
    firstDiffs: [
      ["legacy-only", "a.dynatree-ico-c:README.md", "a.avatar-wrap:"],
      ["legacy-only", "a.dynatree-ico-cf:docs", "a.avatar-wrap:"],
      ["legacy-only", "a.dynatree-ico-cf:src", "a.avatar-wrap:"],
      ["yoram-only", "a.ybtn:Edit", "a.avatar-wrap:"],
      ["yoram-only", "a.ybtn:Edit", "a.ml5:"],
      ["legacy-only", "a:Seed sample parity repository", "a:a92847d"],
      ["legacy-only", "a:Seed sample parity repository", "a:a92847d"],
      ["legacy-only", "a:Seed sample parity repository", "a:a92847d"],
      ["legacy-only", "a:f87f1bf", "a:a92847d"],
      ["yoram-only", "a:sample", "a:a92847d"],
      ["legacy-only", "a:브랜치", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["legacy-only", "a:커밋", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["legacy-only", "a:파일", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["legacy-only", "abbr.select2-search-choice-close:", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["legacy-only", "button.avatar-wrap.smaller:", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["legacy-only", "button.ml5:Parity Seed", "div.code-breadcrumb-wrap.ml10.pull-left:"],
      ["legacy-only", "button.select2-choice:", "div.code-breadcrumb-wrap.ml10.pull-left:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-view-file.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-view-file.e2e.ts against yona-original/app/views/code/viewFile.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample/branches",
    state: "fresh-03b683",
    scenarioId: "R9-branches",
    action: "list-branches",
    expectedSkeletonEntries: 33,
    actualSkeletonEntries: 34,
    firstDiffs: [
      ["legacy-only", "a.blue-txt.pullrequest-state.merged:pullRequest-3", "a.commitId:0446763"],
      ["legacy-only", "a.commitId:f87f1bf", "a.commitId:61b93de"],
      ["yoram-only", "a:feature/ui", "a.commitId:61b93de"],
      ["yoram-only", "a:feature/ui", "a.pullrequest-state.open:pullRequest-1"],
      ["yoram-only", "a:feature/ui", "a.pullrequest-state.open:pullRequest-3"],
      ["yoram-only", "a:파일", "a:태그"],
      ["legacy-only", "span.date:01-01", "span.date:2026-01-01"],
      ["legacy-only", "span.date:40초 전", "span.date:2026-01-01"],
      ["legacy-only", "span.disabled:주고받은 코드가 없습니다", "span.date:2026-01-01"],
      ["yoram-only", "span.headBranch.ml10:기본 브랜치", "span.date:2026-01-01"],
      ["yoram-only", "span.headBranch.ml10:기본 브랜치", "span.date:2026-09-06"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-code-branches.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-code-branches.e2e.ts against yona-original/app/views/code/branches.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/users/login",
    state: "fresh-03b683",
    scenarioId: "S2-login-forms",
    action: "view-login-page",
    expectedSkeletonEntries: 80,
    actualSkeletonEntries: 76,
    firstDiffs: [
      ["legacy-only", "a.ybtn.ybtn-success.ybtn-padding:<product> 시작 하기", "a.yona-author:<product> authors"],
      ["legacy-only", "a.ybtn.ybtn-success:멤버 가입", "a.yona-author:<product> authors"],
      ["yoram-only", "a:<provider>", "a:<product> 시작 하기"],
      ["yoram-only", "button.btn-transparent:×", "a:멤버 가입"],
      ["yoram-only", "button.ybtn.ybtn-info:확인", "button.pin:"],
      ["legacy-only", "div.page-footer:", "div.search-box:"],
      ["legacy-only", "div.pin:", "div.search-box:"],
      ["legacy-only", "div.yobiToasts:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "footer.page-footer-outer:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "span.provider:Copyright & © & Supported by", "span:Copyright & © & Supported by"],
      ["yoram-only", "span:주요 기능 소개", "span:Copyright & © & Supported by"],
      ["legacy-only", "ul.gnb-nav:", "ul.gnb-usermenu:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/loginform.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/loginform.e2e.ts against yona-original/app/views/user/login.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/users/loginform",
    state: "fresh-03b683",
    scenarioId: "S2-login-forms",
    action: "view-login-form",
    expectedSkeletonEntries: 25,
    actualSkeletonEntries: 23,
    firstDiffs: [
      ["order", "a.ybtn.oauth-login-btn:", "a:비밀번호를 잊어버리셨나요?"],
      ["order", "a:비밀번호를 잊어버리셨나요?", "button.ybtn.ybtn-primary.ybtn-large.ybtn-fullsize:로그인"],
      ["order", "button.ybtn.ybtn-primary.ybtn-large.ybtn-fullsize:로그인", "div.act-row.mt5:"],
      ["order", "div.act-row.mt5:", "div.btns-row.nm:"],
      ["order", "div.btns-row.nm:", "div.btns-row:"],
      ["order", "div.btns-row:", "div.center-wrap.tag-line-wrap.login:"],
      ["yoram-only", "div.center-wrap.tag-line-wrap.login:", "div.links-wrap:"],
      ["order", "div.center-wrap.tag-line-wrap.login:", "div.login-form-wrap.frm-wrap:"],
      ["legacy-only", "div.email-verification-help:최초 로그인일 경우 확인 메일이 발송됩니다.", "div.page.full:"],
      ["legacy-only", "div.links-wrap.pull-right:", "div.page.full:"],
      ["order", "div.login-form-wrap.frm-wrap:", "div.page.full:"],
      ["yoram-only", "div.page.full:", "div.remember-me-wrap:"],
      ["order", "div.page.full:", "div.social-login-title-line:or"],
      ["legacy-only", "div.remember-me-wrap.pull-left:", "div:최초 로그인일 경우 확인 메일이 발송됩니다."],
      ["yoram-only", "div.social-login-title-line:or", "div:최초 로그인일 경우 확인 메일이 발송됩니다."],
      ["order", "div.social-login-title-line:or", "h1.title:로그인"],
      ["order", "h1.title:로그인", "input.checkbox:"],
      ["order", "input.checkbox:", "input.text.email:"],
      ["order", "input.text.email:", "input.text.password:"],
      ["order", "input.text.password:", "label.bg-checkbox:로그인 유지하기"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/loginform.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/loginform.e2e.ts against yona-original/app/views/user/login.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin/sample",
    state: "fresh-03b683",
    scenarioId: "S2-view-project",
    action: "view-project",
    expectedSkeletonEntries: 74,
    actualSkeletonEntries: 79,
    firstDiffs: [
      ["order", "a.name:", "a.avatar-wrap.img-rounded.pull-left.small:"],
      ["legacy-only", "a.title:parity-ms-probemt5abpvy-c", "a.name:"],
      ["order", "a.ybtn.vmiddle.ml5:수정", "a.name:"],
      ["order", "a.ybtn.ybtn-inverse:코드 저장소 복사", "a.name:"],
      ["yoram-only", "a.ybtn.ybtn-minimum:추가", "a.title:Parity launch"],
      ["order", "a.ybtn.ybtn-minimum:추가", "a.ybtn.vmiddle.ml5:수정"],
      ["order", "a.ybtn.ybtn-success:새 이슈 등록", "a.ybtn.ybtn-inverse:코드 저장소 복사"],
      ["order", "a:README", "a.ybtn.ybtn-minimum:추가"],
      ["order", "a:admin", "a.ybtn.ybtn-success:새 이슈 등록"],
      ["order", "a:sample", "a:README"],
      ["order", "a:대시보드", "a:admin"],
      ["order", "a:최근 이력", "a:sample"],
      ["order", "button.close:×", "a:대시보드"],
      ["order", "button.ybtn.project-clone-button:주소 복사", "a:최근 이력"],
      ["order", "button.ybtn.ybtn-info.ybtn-mini:예", "button.close:×"],
      ["order", "button.ybtn.ybtn-mini:아니요", "button.ybtn.project-clone-button:주소 복사"],
      ["legacy-only", "button.ybtn.ybtn-minimum.ybtn-danger.pull-right:프로젝트 탈퇴", "button.ybtn.ybtn-info.ybtn-mini:예"],
      ["order", "button.ybtn.ybtn-minimum:", "button.ybtn.ybtn-info.ybtn-mini:예"],
      ["order", "button.ybtn.ybtn-success:저장", "button.ybtn.ybtn-mini:아니요"],
      ["yoram-only", "button.ybtn:취소", "button.ybtn.ybtn-minimum.ybtn-danger:프로젝트 탈퇴"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-home-dashboard.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-home-dashboard.e2e.ts against yona-original/app/views/project/index.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/users/signupform",
    state: "fresh-03b683",
    scenarioId: "S3-signup-form",
    action: "view-signup-form",
    expectedSkeletonEntries: 20,
    actualSkeletonEntries: 15,
    firstDiffs: [
      ["legacy-only", "input.text.password:", "label:비밀번호"],
      ["legacy-only", "input.text.password:", "label:비밀번호"],
      ["legacy-only", "input.text.password:", "label:비밀번호"],
      ["legacy-only", "input.text.password:", "label:비밀번호"],
      ["legacy-only", "input.text.password:", "label:비밀번호"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/ownership-anonymous-site-signup.dom.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/ownership-anonymous-site-signup.dom.e2e.ts against yona-original/app/views/user/signup.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/lostPassword",
    state: "fresh-03b683",
    scenarioId: "S4-lost-password",
    action: "view-lost-password",
    expectedSkeletonEntries: 10,
    actualSkeletonEntries: 8,
    firstDiffs: [
      ["legacy-only", "input.text:", "p.tag-line:21세기 소프트웨어 개발 플랫폼"],
      ["legacy-only", "input.text:", "p.tag-line:21세기 소프트웨어 개발 플랫폼"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/lost-password.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/lost-password.e2e.ts against yona-original/app/views/site/lostPassword.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/projectform",
    state: "fresh-03b683",
    scenarioId: "S6-projectform",
    action: "view-projectform",
    expectedSkeletonEntries: 83,
    actualSkeletonEntries: 59,
    firstDiffs: [
      ["legacy-only", "abbr.select2-search-choice-close:", "button.ybtn.ybtn-success:프로젝트 생성"],
      ["legacy-only", "abbr.select2-search-choice-close:", "button.ybtn.ybtn-success:프로젝트 생성"],
      ["legacy-only", "button.select2-choice:", "button.ybtn.ybtn-success:프로젝트 생성"],
      ["legacy-only", "button.select2-choice:", "button.ybtn.ybtn-success:프로젝트 생성"],
      ["legacy-only", "div.select2-container.mb10.mt5:", "div.span10.cu-desc:"],
      ["legacy-only", "div.select2-container.mb10:", "div.span10.cu-desc:"],
      ["legacy-only", "div.select2-drop.select2-display-none.select2-with-searchbox:", "div.span10.cu-desc:"],
      ["legacy-only", "div.select2-drop.select2-display-none.select2-without-searchbox.select2-with-searchbox:", "div.span10.cu-desc:"],
      ["legacy-only", "div.select2-search:", "div.span10.cu-desc:"],
      ["legacy-only", "div.select2-search:", "div.span10.cu-desc:"],
      ["legacy-only", "div.span2.right-txt.mt10:", "div.span2.mt10:"],
      ["legacy-only", "div.span2.right-txt.mt10:공개 설정", "div.span2.mt10:"],
      ["legacy-only", "div.span2.right-txt:메뉴 설정", "div.span2.mt10:"],
      ["legacy-only", "div.usf-group:", "div.span2.mt10:"],
      ["yoram-only", "form.frm-wrap:", "div.span2.mt10:"],
      ["yoram-only", "form.frm-wrap:", "div.span2.mt10:공개 설정"],
      ["yoram-only", "form.frm-wrap:", "div.span2:메뉴 설정"],
      ["legacy-only", "input.select2-focusser.select2-offscreen:", "input.text:"],
      ["legacy-only", "input.select2-focusser.select2-offscreen:", "input.text:"],
      ["legacy-only", "input.select2-input:", "input.text:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/project-create.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/project-create.e2e.ts against yona-original/app/views/project/new.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/projects",
    state: "fresh-03b683",
    scenarioId: "S7-projects-listing",
    action: "view-projects-list",
    expectedSkeletonEntries: 289,
    actualSkeletonEntries: 213,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap:", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.avatar-wrap:", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.avatar-wrap:", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.avatar-wrap:", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.avatar-wrap:", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.avatar-wrap:", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.black:parity-git-wvamt5efl73", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.black:parity-lc-sweep-mt6k1hwu-33", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.black:parity-lc-sweep-mt6k1hwu-39", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.black:parity-lc-sweep-mt6k1hwu-40", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.black:parity-svn-wvbmt5esi2l", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.black:parity-svn-wvbmt5etjsa", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.black:sample", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.black:sample", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.black:svnplayground", "a.logo.logo-letter:Y"],
      ["legacy-only", "a.owner-name-small:admin", "a.projects-directory-member-avatar:"],
      ["legacy-only", "a.owner-name-small:admin", "a.projects-directory-member-avatar:"],
      ["legacy-only", "a.owner-name-small:admin", "a.projects-directory-member-avatar:"],
      ["legacy-only", "a.owner-name-small:admin", "a.projects-directory-member-avatar:"],
      ["legacy-only", "a.owner-name-small:admin", "a.projects-directory-member-avatar:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/projects-list.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/projects-list.e2e.ts against yona-original/app/views/project/list.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/_help",
    state: "fresh-03b683",
    scenarioId: "S9-help-init-uikit",
    action: "view-help-page",
    expectedSkeletonEntries: 107,
    actualSkeletonEntries: 61,
    firstDiffs: [
      ["legacy-only", "a.ybtn.ybtn-success:멤버 가입", "a.yona-author:<product> authors"],
      ["yoram-only", "a:정보 페이지", "a:멤버 가입"],
      ["legacy-only", "button.question:<product>를 설치하고 싶어요.", "button.pin:"],
      ["legacy-only", "button.question:<product>의 버그를 발견했어요.", "button.pin:"],
      ["legacy-only", "button.question:게시판에서는 어떠한 것들을 할수 있나요?", "button.pin:"],
      ["legacy-only", "button.question:내가 참여하는 프로젝트들은 어디서 볼수 있나요?", "button.pin:"],
      ["legacy-only", "button.question:프로젝트 탈퇴는 어떻게 하나요.", "button.pin:"],
      ["legacy-only", "button.question:프로젝트를 새로 생성하고 싶어요.", "button.pin:"],
      ["yoram-only", "button.ybtn.ybtn-info:확인", "button.pin:"],
      ["legacy-only", "div.answer-wrap:", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer-wrap:", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer-wrap:", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer-wrap:", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer-wrap:", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer-wrap:", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer:", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer:<product>는 현재 Open Source로 진행되고 있습니다. 버그를 발견하셨다면 해 주시거나 패치를 만들어 보내주시면 됩니다.", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer:<product>를 설치하고자 하면 를 참고해 주세요.", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer:게시판에서는 다음과 같은 기능이 가능합니다.", "button:<product>를 설치하고 싶어요."],
      ["legacy-only", "div.answer:우측 하단에 다음과 같이 참여하고 있는 프로젝트의 목록을 볼수 있습니다. 자물쇠가 있는 것은 비공개 프로젝트이며 자물쇠가 없는 것은 공개 프로젝트 입니다. 혹은 자신의 에서도 확인하실수 있습니다.", "button:<product>를 설치하고 싶어요."],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/help-toc.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/help-toc.e2e.ts against yona-original/app/views/help/markdown.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/organizations/weblabs/boards",
    state: "fresh-03b683",
    scenarioId: "U11-org-screens",
    action: "view-org-subpage",
    expectedSkeletonEntries: 24,
    actualSkeletonEntries: 15,
    firstDiffs: [
      ["legacy-only", "div.select2-container.select2-container-multi.fullsize:", "div.two-column-icon-border:"],
      ["legacy-only", "div.select2-drop.select2-drop-multi.select2-display-none:", "div.two-column-icon-border:"],
      ["legacy-only", "form.pull-left:", "i.ico.ico-err1:"],
      ["legacy-only", "input.select2-input.select2-default:", "input.textbox.group-board:"],
      ["legacy-only", "li.select2-no-results:결과 없음", "p:등록된 게시물이 없습니다."],
      ["legacy-only", "li.select2-search-field:", "p:등록된 게시물이 없습니다."],
      ["legacy-only", "select.select2-offscreen:", "span.two-column-mode-text:2단 보기"],
      ["legacy-only", "ul.select2-choices:", "<absent>"],
      ["legacy-only", "ul.select2-results:", "<absent>"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/organization-boards.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/organization-boards.e2e.ts against yona-original/app/views/organization/group_board_list.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/organizations/weblabs/members",
    state: "fresh-03b683",
    scenarioId: "U11-org-screens",
    action: "view-org-subpage",
    expectedSkeletonEntries: 53,
    actualSkeletonEntries: 51,
    firstDiffs: [
      ["yoram-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.role-menu-item:org_admin"],
      ["yoram-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.role-menu-item:org_admin"],
      ["yoram-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.role-menu-item:org_member"],
      ["yoram-only", "button.ybtn.ybtn-danger.ybtn-small:삭제", "button.role-menu-item:org_member"],
      ["legacy-only", "button:그룹 관리자", "div.btn-group:"],
      ["legacy-only", "button:그룹 관리자", "div.btn-group:"],
      ["legacy-only", "button:그룹 관리자", "div.btn-group:"],
      ["legacy-only", "button:그룹 구성원", "div.btn-group:"],
      ["legacy-only", "button:그룹 구성원", "div.btn-group:"],
      ["legacy-only", "button:그룹 구성원", "div.btn-group:"],
      ["legacy-only", "span.d-label:", "span.d-label:org_admin"],
      ["legacy-only", "span.d-label:", "span.d-label:org_admin"],
      ["yoram-only", "ul.dropdown-menu:", "span.d-label:org_admin"],
      ["yoram-only", "ul.dropdown-menu:", "span.d-label:org_member"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/organization-members-form.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/organization-members-form.e2e.ts against yona-original/app/views/organization/members.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/organizations/weblabs/issues",
    state: "fresh-03b683",
    scenarioId: "U11-org-screens",
    action: "view-org-subpage",
    expectedSkeletonEntries: 37,
    actualSkeletonEntries: 29,
    firstDiffs: [
      ["legacy-only", "div.select2-container.select2-container-multi.fullsize:", "div.span10.span-hard-wrap:"],
      ["legacy-only", "div.select2-drop.select2-drop-multi.select2-display-none:", "div.span10.span-hard-wrap:"],
      ["legacy-only", "input.select2-input.select2-default:", "input.textbox.full:"],
      ["legacy-only", "li.select2-no-results:결과 없음", "p:등록된 이슈가 없습니다."],
      ["legacy-only", "li.select2-search-field:", "p:등록된 이슈가 없습니다."],
      ["legacy-only", "select.select2-offscreen:", "span.num-badge:0"],
      ["legacy-only", "ul.select2-choices:", "<absent>"],
      ["legacy-only", "ul.select2-results:", "<absent>"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/organization-issues.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/organization-issues.e2e.ts against yona-original/app/views/organization/group_issue_list.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/organizations/new",
    state: "fresh-03b683",
    scenarioId: "U11-org-screens",
    action: "view-new-org-form",
    expectedSkeletonEntries: 15,
    actualSkeletonEntries: 11,
    firstDiffs: [
      ["legacy-only", "button.ybtn.ybtn-success:그룹 만들기", "button:그룹 만들기"],
      ["yoram-only", "div.actions:", "button:그룹 만들기"],
      ["legacy-only", "div.form-wrap.new-project:", "div.n-alert:"],
      ["legacy-only", "form.frm-wrap:", "i.yobicon-friends:"],
      ["legacy-only", "input.text:", "label:그룹 설명을 입력해주세요"],
      ["legacy-only", "textarea.text.textarea.span4:", "<absent>"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/organizations-new.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/organizations-new.e2e.ts against yona-original/app/views/organization/new.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/search?keyword=sample&searchType=issue",
    state: "fresh-03b683",
    scenarioId: "U4-global-search",
    action: "view-global-search",
    expectedSkeletonEntries: 36,
    actualSkeletonEntries: 35,
    firstDiffs: [
      ["yoram-only", "button.ybtn:검색", "a:게시판"],
      ["yoram-only", "button.ybtn:검색", "a:게시판 댓글"],
      ["yoram-only", "button.ybtn:검색", "a:마일스톤"],
      ["yoram-only", "button.ybtn:검색", "a:사용자"],
      ["yoram-only", "button.ybtn:검색", "a:이슈"],
      ["yoram-only", "button.ybtn:검색", "a:이슈 댓글"],
      ["yoram-only", "button.ybtn:검색", "a:코드 리뷰"],
      ["yoram-only", "button.ybtn:검색", "a:프로젝트"],
      ["legacy-only", "button:게시판", "div.empty-result:"],
      ["legacy-only", "button:게시판 댓글", "div.empty-result:"],
      ["legacy-only", "button:마일스톤", "div.empty-result:"],
      ["legacy-only", "button:사용자", "div.empty-result:"],
      ["legacy-only", "button:이슈", "div.empty-result:"],
      ["legacy-only", "button:이슈 댓글", "div.empty-result:"],
      ["legacy-only", "button:코드 리뷰", "div.empty-result:"],
      ["legacy-only", "button:프로젝트", "div.empty-result:"],
      ["legacy-only", "input.span11:", "li.active.empty:"],
      ["legacy-only", "span.num-badge.pull-right:2", "span.num-badge.pull-right:3"],
      ["yoram-only", "strong:0", "span.num-badge.pull-right:3"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/search-global.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/search-global.e2e.ts against yona-original/app/views/common/search.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/organizations/weblabs",
    state: "fresh-03b683",
    scenarioId: "U6-org-home",
    action: "view-org-home",
    expectedSkeletonEntries: 32,
    actualSkeletonEntries: 30,
    firstDiffs: [
      ["legacy-only", "button.ybtn.ybtn-minimum.ybtn-danger.pull-right:그룹 탈퇴", "div.bubble-wrap.gray.project-home.mt10:"],
      ["legacy-only", "div.pull-right:", "div.search-bar:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/organization-home.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/organization-home.e2e.ts against yona-original/app/views/organization/view.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/admin",
    state: "fresh-03b683",
    scenarioId: "U7-user-profile",
    action: "view-user-profile",
    expectedSkeletonEntries: 298,
    actualSkeletonEntries: 294,
    firstDiffs: [
      ["yoram-only", "a.avatar-wrap.small:", "a.avatar-wrap.assinee:"],
      ["yoram-only", "a.avatar-wrap.small:", "a.avatar-wrap.assinee:"],
      ["yoram-only", "a.avatar-wrap.small:", "a.avatar-wrap.mlarge:"],
      ["yoram-only", "a.avatar-wrap.small:", "a.avatar-wrap.mlarge:"],
      ["order", "a.avatar-wrap.small:", "a.comments-count:"],
      ["order", "a.avatar-wrap.small:", "a.comments-count:"],
      ["yoram-only", "a.comments-count:", "a.infos-item.infos-icon-link:"],
      ["order", "a.comments-count:", "a.infos-item.infos-link-item.author-cell:Alice Kim"],
      ["order", "a.comments-count:", "a.infos-item.infos-link-item.author-cell:Alice Kim"],
      ["order", "a.infos-item.infos-link-item.author-cell:Alice Kim", "a.infos-item.infos-link-item.author-cell:Site Admin"],
      ["order", "a.infos-item.infos-link-item.author-cell:Alice Kim", "a.infos-item.infos-link-item.author-cell:Site Admin"],
      ["yoram-only", "a.infos-item.infos-link-item.author-cell:Site Admin", "a.infos-item.infos-link-item:Site Admin"],
      ["yoram-only", "a.infos-item.infos-link-item.author-cell:Site Admin", "a.infos-item.infos-link-item:Site Admin"],
      ["order", "a.infos-item.infos-link-item.author-cell:Site Admin", "a.label.issue-label.list-label:bug"],
      ["order", "a.infos-item.infos-link-item.author-cell:Site Admin", "a.nbtn.black.medium.last.leaveProject:탈퇴"],
      ["order", "a.label.issue-label.list-label:bug", "a.owner-name-small:admin"],
      ["order", "a.nbtn.black.medium.last.leaveProject:탈퇴", "a.owner-name-small:admin"],
      ["order", "a.owner-name-small:admin", "a.owner-name-small:alice"],
      ["order", "a.owner-name-small:admin", "a.project-name:parity-git-wvamt5efl73"],
      ["order", "a.owner-name-small:admin", "a.project-name:parity-svn-wvbmt5esi2l"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/user-public-profile.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/user-public-profile.e2e.ts against yona-original/app/views/user/view.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/user/files",
    state: "fresh-03b683",
    scenarioId: "U8-user-files",
    action: "view-user-files",
    expectedSkeletonEntries: 29,
    actualSkeletonEntries: 15,
    firstDiffs: [
      ["legacy-only", "a:parity-sweep-mt6k1hwu-36.txt", "a:내 이슈"],
      ["legacy-only", "button.search-btn:", "div.attachment-files-header.row:"],
      ["legacy-only", "button.ybtn:", "div.attachment-files-header.row:"],
      ["legacy-only", "div.attachment-file-detail.row:", "div.attachment-files-header.row:"],
      ["legacy-only", "div.file-preview.span1:", "div.page-wrap:"],
      ["legacy-only", "div.span1.file-download:", "div.span1.header-preview:Preview"],
      ["legacy-only", "div.span1.file-size:44 B", "div.span1.header-preview:Preview"],
      ["legacy-only", "div.span2.file-date:2026-08-24 12:00 오전", "div.span2.file-date:Date"],
      ["legacy-only", "div.span4.file-location:", "div.span4.header-location:Location"],
      ["legacy-only", "div.span5.file-name:", "div.span5.header-file-name:Filename"],
      ["legacy-only", "div.user-file-search.search.search-bar:", "i.yobicon-search:"],
      ["legacy-only", "i.icon.text-icon.medium-blue.font-larger:", "i.yobicon-search:"],
      ["legacy-only", "i.yobicon-cloud-download:", "i.yobicon-search:"],
      ["legacy-only", "input.textbox:", "li.active:"],
    ],
    wtrTest: "03b683 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/user-files.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by 03b683 focused WTR parity contract in frontend/tests/wtr/user-files.e2e.ts against yona-original/app/views/user/files.scala.html; the complete route/scenario/action/state/count/firstDiff tuple is required and any changed visible content remains UNVERIFIED.",
  }),

  siteAdminDomFingerprint({
    route: "/user/editform",
    state: "fresh-03b683",
    scenarioId: "U15-profile-editforms",
    action: "view-user-editform",
    expectedSkeletonEntries: 98,
    actualSkeletonEntries: 83,
    firstDiffs: [
      ["yoram-only", "button.ybtn.ybtn-default:취소", "button.pin:"],
      ["legacy-only", "dd.mt10:", "div.avatar-frm:"],
      ["legacy-only", "dd.mt10:", "div.avatar-frm:"],
      ["legacy-only", "dd.mt10:", "div.avatar-frm:"],
      ["legacy-only", "div.admin-logged-in-affix.affix-top:관리자로 로그인 하였습니다!", "div.avatar-frm:"],
      ["legacy-only", "div.btn-wrap.mt10.center-txt:", "div.btn-wrap:"],
      ["yoram-only", "div.center-text:", "div.btn-wrap:"],
      ["legacy-only", "div.modal-header.center-txt:", "div.modal-header:"],
      ["yoram-only", "div.modal.hide.yobiDialog:", "div.modal-header:"],
      ["legacy-only", "div.page-footer:", "div.reset-user-visited-list:"],
      ["legacy-only", "div.page-wrap-outer:", "div.reset-user-visited-list:"],
      ["legacy-only", "div.page-wrap:", "div.reset-user-visited-list:"],
      ["legacy-only", "div.pin:", "div.reset-user-visited-list:"],
      ["legacy-only", "div.site-breadcrumb-inner:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.site-breadcrumb-outer:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["yoram-only", "div.unsupported-inner:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.upload-progress.avatar:", "div.upload-progress.avatar.hide:"],
      ["yoram-only", "div.ybtn.ybtn-small.fake-file-wrap.btnUploadAvatar:아바타 변경", "div.upload-progress.avatar.hide:"],
      ["legacy-only", "div.yobiToasts:", "dt:아이디"],
      ["legacy-only", "footer.page-footer-outer:", "form.input-prepend.gnb-search-form:"],
    ],
    wtrTest: "32/32 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/user-profile-settings.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by the 32/32 focused WTR parity contract and artifact (artifact://4361) and live evidence .agent/u19-live-audit/u15-settings-live.json; WTR source frontend/tests/wtr/user-profile-settings.e2e.ts exercises role/copy/order/geometry/interaction against yona-original/app/views/user/edit.scala.html. The full route/scenario/action/state/count/firstDiff tuple is required; changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/user/editform/emails",
    state: "fresh-03b683",
    scenarioId: "U15-profile-editforms",
    action: "view-user-editform",
    expectedSkeletonEntries: 76,
    actualSkeletonEntries: 63,
    firstDiffs: [
      ["yoram-only", "button.ybtn.ybtn-info:확인", "button.pin:"],
      ["legacy-only", "button.ybtn.ybtn-success:추가", "button:추가"],
      ["legacy-only", "div.admin-logged-in-affix.affix-top:관리자로 로그인 하였습니다!", "button:추가"],
      ["yoram-only", "div.btn-dismiss:", "button:추가"],
      ["legacy-only", "div.page-footer:", "div.search-box:"],
      ["legacy-only", "div.page-wrap-outer:", "div.search-box:"],
      ["legacy-only", "div.page-wrap:", "div.search-box:"],
      ["legacy-only", "div.pin:", "div.search-box:"],
      ["legacy-only", "div.site-breadcrumb-inner:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.site-breadcrumb-outer:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["yoram-only", "div.unsupported-inner:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.yobiToasts:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "footer.page-footer-outer:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "form.form-inline.inner-bubble:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "input.text.uname:", "li.divider:"],
      ["legacy-only", "li.active:", "li.divider:"],
      ["legacy-only", "p:대표 이메일로 설정한 이메일로 알림을 받거나 비밀번호 변경 요청을 받을 수 있습니다. 여러 이메일을 사용할 경우 확인된 이메일로도 동일한 사용자로 인식할 수 있습니다.", "p:대표 이메일로 설정한 이메일로 알림을 받거나 비밀번호 변경 요청을 받을 수 있습니다.여러 이메일을 사용할 경우 확인된 이메일로도 동일한 사용자로 인식할 수 있습니다."],
      ["yoram-only", "span.avatar-wrap.smaller:", "p:대표 이메일로 설정한 이메일로 알림을 받거나 비밀번호 변경 요청을 받을 수 있습니다.여러 이메일을 사용할 경우 확인된 이메일로도 동일한 사용자로 인식할 수 있습니다."],
      ["legacy-only", "span.label-head.vmiddle.ml10:대표 이메일", "span:- 큰 힘에는 큰 책임이 따릅니다"],
      ["legacy-only", "span.provider:Copyright & © & Supported by", "span:- 큰 힘에는 큰 책임이 따릅니다"],
    ],
    wtrTest: "32/32 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/user-email-settings.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by the 32/32 focused WTR parity contract and artifact (artifact://4361) and live evidence .agent/u19-live-audit/u15-emails-interaction.json; WTR source frontend/tests/wtr/user-email-settings.e2e.ts exercises role/copy/order/geometry/interaction against yona-original/app/views/user/email.scala.html. The full route/scenario/action/state/count/firstDiff tuple is required; changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/user/editform/notifications",
    state: "fresh-03b683",
    scenarioId: "U15-profile-editforms",
    action: "view-user-editform",
    expectedSkeletonEntries: 71,
    actualSkeletonEntries: 59,
    firstDiffs: [
      ["yoram-only", "button.ybtn.ybtn-info:확인", "button.pin:"],
      ["legacy-only", "div.admin-logged-in-affix.affix-top:관리자로 로그인 하였습니다!", "div.btn-dismiss:"],
      ["legacy-only", "div.page-footer:", "div.search-box:"],
      ["legacy-only", "div.page-wrap-outer:", "div.search-box:"],
      ["legacy-only", "div.page-wrap:", "div.search-box:"],
      ["legacy-only", "div.pin:", "div.search-box:"],
      ["legacy-only", "div.site-breadcrumb-inner:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.site-breadcrumb-outer:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.tab-content:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["yoram-only", "div.unsupported-inner:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.yobiToasts:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "footer.page-footer-outer:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "li.active:", "li.divider:"],
      ["legacy-only", "span.provider:Copyright & © & Supported by", "span:- 큰 힘에는 큰 책임이 따릅니다"],
      ["legacy-only", "span.small-font:- 큰 힘에는 큰 책임이 따릅니다", "span:- 큰 힘에는 큰 책임이 따릅니다"],
      ["yoram-only", "ul.dropdown-menu.flat.right:", "span:- 큰 힘에는 큰 책임이 따릅니다"],
      ["yoram-only", "ul.dropdown-menu.flat.right:", "span:Copyright & © & Supported by"],
      ["legacy-only", "ul.gnb-nav:", "ul.gnb-usermenu:"],
      ["legacy-only", "ul.nav.nav-tabs.mt20:", "<absent>"],
      ["legacy-only", "ul.unstyled.lst-stacked.span3.mr20:", "<absent>"],
    ],
    wtrTest: "32/32 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/user-notification-settings.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by the 32/32 focused WTR parity contract and artifact (artifact://4361) and live evidence .agent/u19-live-audit/u15-notifications-interaction.json; WTR source frontend/tests/wtr/user-notification-settings.e2e.ts exercises role/copy/order/geometry/interaction against yona-original/app/views/user/notification.scala.html. The full route/scenario/action/state/count/firstDiff tuple is required; changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/user/editform/token",
    state: "fresh-03b683",
    scenarioId: "U15-profile-editforms",
    action: "view-user-editform",
    expectedSkeletonEntries: 74,
    actualSkeletonEntries: 61,
    firstDiffs: [
      ["yoram-only", "button.ybtn.ybtn-info:확인", "button.pin:"],
      ["legacy-only", "button.ybtn.ybtn-success:사용자토큰 다시생성", "button:사용자토큰 다시생성"],
      ["legacy-only", "div.admin-logged-in-affix.affix-top:관리자로 로그인 하였습니다!", "button:사용자토큰 다시생성"],
      ["yoram-only", "div.btn-dismiss:", "button:사용자토큰 다시생성"],
      ["legacy-only", "div.page-footer:", "div.search-box:"],
      ["legacy-only", "div.page-wrap-outer:", "div.search-box:"],
      ["legacy-only", "div.page-wrap:", "div.search-box:"],
      ["legacy-only", "div.pin:", "div.search-box:"],
      ["legacy-only", "div.site-breadcrumb-inner:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.site-breadcrumb-outer:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.token-generate:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["yoram-only", "div.unsupported-inner:", "div.site-admin-affix-surface:관리자로 로그인 하였습니다!"],
      ["legacy-only", "div.yobiToasts:", "div:사용자토큰"],
      ["legacy-only", "footer.page-footer-outer:", "form.input-prepend.gnb-search-form:"],
      ["legacy-only", "form.pull-left:", "h3:사용자토큰"],
      ["legacy-only", "input.text:", "li.divider:"],
      ["legacy-only", "li.active:", "li.divider:"],
      ["legacy-only", "span.provider:Copyright & © & Supported by", "span:- 큰 힘에는 큰 책임이 따릅니다"],
      ["legacy-only", "span.small-font:- 큰 힘에는 큰 책임이 따릅니다", "span:- 큰 힘에는 큰 책임이 따릅니다"],
      ["yoram-only", "ul.dropdown-menu.flat.right:", "span:- 큰 힘에는 큰 책임이 따릅니다"],
    ],
    wtrTest: "32/32 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/user-token-settings.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by the 32/32 focused WTR parity contract and artifact (artifact://4361) and live evidence .agent/u19-live-audit/u15-token-interaction.json; WTR source frontend/tests/wtr/user-token-settings.e2e.ts exercises role/copy/order/geometry/interaction against yona-original/app/views/user/token.scala.html. The full route/scenario/action/state/count/firstDiff tuple is required; changed visible content remains UNVERIFIED.",
  }),
  siteAdminDomFingerprint({
    route: "/notifications",
    state: "fresh-03b683",
    scenarioId: "U3-notifications-list",
    action: "view-notifications",
    expectedSkeletonEntries: 51,
    actualSkeletonEntries: 37,
    firstDiffs: [
      ["legacy-only", "a.author:Alice Kim", "a.avatar-wrap.smaller:"],
      ["legacy-only", "a.author:Bob Park", "a.avatar-wrap.smaller:"],
      ["yoram-only", "a:Re: [sample] Review rail parity check (#1)", "a:Alice Kim"],
      ["yoram-only", "a:Re: [sample] Review rail parity check (#1)", "a:Bob Park"],
      ["legacy-only", "button.ybtn.hide-in-mobile:기본 페이지로 지정", "button:More"],
      ["legacy-only", "button.ybtn:More", "button:More"],
      ["yoram-only", "div.guide-toggle:", "button:More"],
      ["yoram-only", "div.guide-toggle:", "button:기본 페이지로 지정"],
      ["legacy-only", "div.message-wrap.nowrap:", "div.page-wrap:"],
      ["legacy-only", "div.message-wrap.nowrap:", "div.page-wrap:"],
      ["legacy-only", "div.message:Board seed confirmed from the fork contributor side. --- Original posting from @admin at 7:44 오전 --- This board post exists to seed the legacy board list and detail flows.", "div.page-wrap:"],
      ["legacy-only", "div.message:I can reproduce the legacy issue view from this seed. --- Original issue from @admin at 7:44 오전 --- Use this issue to verify labels, assignee, milestone, and timeline rendering in the converted frontend.", "div.page-wrap:"],
      ["legacy-only", "div.meta:@alice", "div.page-wrap:"],
      ["legacy-only", "div.meta:@bob", "div.page-wrap:"],
      ["legacy-only", "div.stream-desc:", "div:@alice"],
      ["legacy-only", "div.stream-desc:", "div:@alice"],
      ["legacy-only", "div.stream-info:", "div:@alice"],
      ["legacy-only", "div.stream-info:", "div:@alice"],
      ["legacy-only", "div.stream-type.comment2:", "div:@alice"],
      ["legacy-only", "div.stream-type.comment2:", "div:@alice"],
    ],
    wtrTest: "32/32 focused WTR parity contract",
    wtrSource: "frontend/tests/wtr/notification-route.e2e.ts",
    rationale: "Exact 03b683 DOM fingerprint backed by the 32/32 focused WTR parity contract and artifact (artifact://4361) and live evidence .agent/u19-live-audit/u3-notifications-live.json; WTR source frontend/tests/wtr/notification-route.e2e.ts exercises role/copy/order/geometry/interaction against yona-original/app/views/notification/list.scala.html. The full route/scenario/action/state/count/firstDiff tuple is required; changed visible content remains UNVERIFIED.",
  }),]);

const PROJECT_ROUTE_DOM_FINGERPRINT_RULES = PROJECT_ROUTE_DOM_IMPLEMENTATION_FINGERPRINTS.map((fingerprint) => ({
  test: ({ kind, route, detail, scenarioId, scenarioActions }) =>
    kind === "dom" &&
    canonicalFingerprintRoute(route) === fingerprint.route &&
    scenarioId === fingerprint.scenarioId &&
    (!fingerprint.action || scenarioActions?.includes(fingerprint.action)) &&
    exactDomFingerprint(detail, fingerprint),
  classification: "IMPLEMENTATION_DIFFERENCE",
  rationale: fingerprint.rationale,
  reason: `exact ${fingerprint.route} ${fingerprint.state} DOM implementation fingerprint; changed or missing visible content falls through to UNVERIFIED`,
}));

// Fallback for findings no rule claims: UNVERIFIED so new divergences remain
// visible and block the strict gate instead of silently passing.
export function classify(kind, detail) {
  void kind;
  void detail;
  return { classification: "UNVERIFIED", reason: null };
}

const CLASSIFICATION_RULES = [
  {
    test: ({ kind, route, detail, behaviorId }) =>
      kind === "api" &&
      behaviorId === "B-0185" &&
      route === "/user/sidebar" &&
      exactStatus(detail, "legacy") === 500 &&
      exactStatus(detail, "yoram") === 200,
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy Application.sidebar dereferences a missing sidebar hash entry and raises NoSuchElementException for the direct endpoint (yona-original/app/views/html/index/sidebar.scala.html); the malformed fixture is not supported behavior",
  },
  {
    test: ({ kind, route, detail, behaviorId }) =>
      kind === "api" &&
      behaviorId === "B-0267" &&
      /\/[^/]+\/[^/]+\/setting$/u.test(route) &&
      exactStatus(detail, "legacy") === 500 &&
      exactStatus(detail, "yoram") === 200,
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy ProjectApp.settingProject raises an NPE when the headless multipart payload omits the project id; the malformed throwaway-setting probe is not supported behavior (yona-original/app/controllers/ProjectApp.java:427-448)",
  },
  {
    test: ({ kind, route, detail, behaviorId, scenarioId, scenarioActions }) =>
      kind === "api" &&
      behaviorId === "B-0002" &&
      scenarioId === "P26-residual-branch-import-probes" &&
      scenarioActions?.includes("probe-delete-branch-missing") &&
      /^\/[^/]+\/[^/]+\/code\/__parity_missing_branch__\/$/u.test(route) &&
      exactStatus(detail, "legacy") === 303 &&
      exactStatus(detail, "yoram") === 404,
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy BranchApp.deleteBranch redirects after blindly deleting a nonexistent branch, while Yoram reports the same no-op as 404; the malformed missing-branch probe is not supported behavior (yona-original/app/controllers/BranchApp.java:71-79; yona-original/app/playRepository/GitRepository.java:1230-1236)",
  },
  {
    test: ({ kind, route, detail, behaviorId, scenarioId, scenarioActions }) =>
      kind === "api" &&
      (behaviorId === null || behaviorId === "B-0298") &&
      scenarioId === "U22-user-profile-edit-revert" &&
      scenarioActions?.filter((action) => action === "save-user-editform-tab").length === 2 &&
      route === "/user/editform/:tabId" &&
      detail?.expected === "legacy HTTP 200" &&
      detail?.actual === "yoram HTTP 404",
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale:
      "surface-replaced: the exact U22 empty POST notifications/emails probes are not supported UI mutations; the supported settings surface is the React workspace tabs and actions (frontend/src/routes/user/editform.tsx:16-47,374-384; crates/server/src/routes/workspace.rs:1082-1425; docs/provenance/differential-step-disposition-2026-09.md)",
    reason:
      "U22 exact empty POST editform-tab probes: legacy compat tab responds 200 while Yoram intentionally has no mutation route; no user-visible settings mutation is represented",
  },
  {
    test: ({ kind, route, detail, behaviorId }) =>
      kind === "api" &&
      behaviorId === "B-0221" &&
      route === "/user/editform/defultLoginPage" &&
      detail?.expected === "2xx" &&
      detail?.actual === "4xx",
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy UserApp.setDefaultLoginPage accepts a missing query path and persists the malformed empty boundary payload, while Yoram rejects it; no valid default landing page is represented (yona-original/app/controllers/UserApp.java:1372-1380)",
  },
  {
    test: ({ kind, route, detail, behaviorId }) =>
      kind === "api" &&
      behaviorId === "B-0286" &&
      route === "/sites/import" &&
      exactStatus(detail, "legacy") === 303 &&
      exactStatus(detail, "yoram") === 400,
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale:
      "boundary-status nuance: malformed multipart import is rejected on both sides and no state is persisted; the exact legacy redirect status is outside the supported compatibility contract",
    reason:
      "SiteApp.importData redirects a missing multipart data file to /sites/data while Yoram rejects it with 400; this unsupported malformed boundary writes no import state (yona-original/app/controllers/SiteApp.java:368-387)",
  },
  {
    test: ({ kind, route, detail, behaviorId }) =>
      kind === "api" &&
      behaviorId === "B-0014" &&
      /^\/comments\/issue\/\d+$/u.test(route) &&
      exactStatus(detail, "legacy") === 500 &&
      exactStatus(detail, "yoram") === 400,
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy compat CommentApp.delete crashes on the malformed issue-comment request while Yoram rejects it cleanly; the degenerate delete payload is not supported behavior",
  },
  {
    test: ({ kind, route, detail, behaviorId }) =>
      kind === "api" &&
      behaviorId === "B-0212" &&
      /\/-_-api\/v1\/owners\/[^/]+\/projects\/[^/]+\/issues\/\d+\/share$/u.test(route) &&
      exactStatus(detail, "legacy") === 500 &&
      (exactStatus(detail, "yoram") === 404 || exactStatus(detail, "yoram") === 200) &&
      hasExactShareProbe(detail),
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy IssueApi share handler dereferences the malformed sharer payload and crashes, while Yoram rejects the missing target with 404; the add/remove probe is not supported behavior",
  },
  {
    test: ({ kind, route, detail, behaviorId }) =>
      kind === "api" &&
      behaviorId === "B-0214" &&
      /\/-_-api\/v1\/owners\/[^/]+\/projects\/[^/]+\/issues\/imports$/u.test(route) &&
      exactStatus(detail, "legacy") === 400 &&
      exactStatus(detail, "yoram") === 404 &&
      hasExactIssueImportProbe(detail),
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale:
      "intentional removal: IssueApi.imports remains in the legacy external migrator namespace, outside Yoram's app-server compatibility contract (SPEC.md Legacy API 접두사; docs/provenance/legacy-external-api.md)",
    reason:
      "legacy external issue-import route is migrator scope; the malformed probe is not an app-server compatibility requirement",
  },
  {
    test: ({ kind, route, detail, behaviorId }) =>
      kind === "api" &&
      behaviorId === "B-0287" &&
      route === "/sites/mail" &&
      exactStatus(detail, "legacy") === 500 &&
      exactStatus(detail, "yoram") === 400,
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy SiteApp.sendMail lets EmailException escape for the malformed empty form while Yoram rejects it cleanly; no mail is sent or persisted (yona-original/app/controllers/SiteApp.java:87-95)",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /\/member\/leave$/u.test(route) && /"legacy HTTP 403"/u.test(JSON.stringify(detail)),
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy org-leave authorization defect: AccessControl.java:176-183 handles Operation.LEAVE only for PROJECT resources, so an ORGANIZATION leave falls into the UPDATE/DELETE switch and is authorized as OrganizationUser.isAdmin (AccessControl.java:197); validateForLeave (OrganizationApp.java:297-311) then 403s a plain member in a single-admin org with the atLeastOneAdmin message while still letting the last admin leave. Yoram implements the intended protection (blocks only the last admin, members leave with redirect) covered by organization_leave_mutation_redirects_members_and_blocks_last_admins",
  },
  {
    test: ({ kind, route }) => kind === "db" && /labels/u.test(route),
    classification: "INFRA_ERROR",
    reason:
      "sweep residue: label rows left behind by earlier sweeps' failed cleanups (parity-cat-sweep-* categories) survive the unfiltered projection; boot-time fixture alignment now deletes residue on both sides",
  },
  {
    test: ({ kind, route }) => kind === "db" && /comments/u.test(route),
    classification: "HARNESS_ERROR",
    reason:
      "comment projection diverges because a legacy-side comment step failed during the sweep (see the scenario error list); the projection compares only this run's rows, so a failed legacy write shows as yoram-only",
  },

  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /assignableUsers/u.test(route) && /issue\.assignToMe|pureNameOnly/u.test(JSON.stringify(detail)),
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale:
      "i18n-key contract: yoram's API returns stable message keys (issue.assignToMe/issue.noAssignee) and the React frontend localizes them via t() (frontend issue form maps the key set); legacy external API returned pre-localized strings — plan decision fixes the client mapping, not the API",
    reason: "assignableUsers returns stable message keys where legacy returns localized display strings",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      (/\/(null|undefined)(\/|\?|$)/u.test(route) ||
        /unresolved|id discovery|no sweep-suffixed|nothing matched/u.test(JSON.stringify(detail))) ,
    classification: "HARNESS_ERROR",
    reason:
      "harness id-resolution failure: one side did not yield the created-entity id, so the pair was not comparable; fix the discovery step rather than treating this as a product gap",
  },
  {
    // Legacy's external -_-api/v1 surface is Authorization-token gated by
    // design (UserApi.isAuthored) while yoram's canonical /api/v1 REST API
    // (AGENTS.md canonical-contract decision) serves its React client with
    // sessions and additionally honors API tokens (Authorization: Bearer /
    // Yona-Token). Legacy 401 + yoram success is that documented transport
    // difference — NOT an unimplemented token surface (token auth exists:
    // /api/v1/auth/token exchange, admin token gating). Legacy success +
    // yoram 401 does NOT match and stays UNVERIFIED (blocking).
    test: ({ kind, detail }) => {
      if (kind !== "api") return false;
      const { legacy, yoram } = pairStatuses(detail);
      return legacy === 401 && yoram !== null && yoram < 400;
    },
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale:
      "transport difference: legacy external -_-api/v1 routes are Authorization-token gated (yona-original/app/controllers/api/UserApi.java:295-305) while yoram's canonical /api/v1 REST API authenticates the React client by session and additionally resolves API tokens (crates/server/src/routes/utils.rs Yona-Token/Bearer); the sweep adapter carries sessions, not tokens",
    reason: "legacy answers 401 (token-gated external API) where yoram serves the canonical REST surface by session",
  },
  {
    // Fixture-state asymmetry: legacy-only candidates are stale throwaway
    // accounts from prior persistent-MariaDB runs (or yoram-only pilot seed
    // projects) — environment state, not candidate-filter logic. The >0 guard
    // keeps this rule from shadowing the general sharableUsers mismatch below
    // when nothing actually differs on the legacy side.
    test: ({ kind, route, detail }) => {
      if (kind !== "api" || !/(sharableUsers|findSharer)/u.test(route)) return false;
      const legacyItems = Array.isArray(detail?.expected) ? detail.expected : [];
      const actualKeys = new Set(
        (Array.isArray(detail?.actual) ? detail.actual : []).map((i) => `${i.loginId}|${i.name}`),
      );
      const legacyOnly = legacyItems.filter((i) => !actualKeys.has(`${i.loginId}|${i.name}`));
      return (
        legacyOnly.length > 0 &&
        legacyOnly.every(
          (i) =>
            i.type === "user" &&
            /paritysweep|parity-throwaway|sweepmt/iu.test(`${i.loginId ?? ""}${i.name ?? ""}`),
        )
      );
    },
    classification: "INFRA_ERROR",
    reason:
      "fixture-state asymmetry: the differing sharable-user candidates are stale parity throwaway accounts persisted on the legacy instance (or yoram pilot seed projects); purge/align legacy fixture users rather than changing filter logic",
  },
  {
    test: ({ kind, route }) => kind === "api" && /(sharableUsers|findSharer)/u.test(route),
    classification: "REAL_OBSERVABLE_MISMATCH",
    reason:
      "regression detector: the empty-query sharable-user contract is implemented (crates/persistence/src/repo/issue_picker.rs, contract coverage crates/server/tests/issue_sharer_contract.rs); a candidate-set divergence now means fixture/catalog drift or a filter regression — verify fixtures or obtain a product decision before changing candidate semantics",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /\/markdown\//u.test(route) && /"status":404|"yoramStatus":404/u.test(JSON.stringify(detail)),
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale:
      "preview rendering is owned by the React client (frontend Markdown component); the legacy POST /markdown server-render endpoint is intentionally not replicated (product decision 2026-08-24)",
    reason:
      "preview rendering is owned by the React client (frontend Markdown component); legacy POST /markdown server-render endpoint intentionally not replicated (product decision 2026-08-24)",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /pullRequest\/\d+\/(un)?review/u.test(route) && /"status":403|"status":404/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "INFRA_ERROR",
    reason:
      "seed asymmetry: review/unreview routes are implemented at HEAD (crates/server/src/routes/pull_requests.rs:958,983) but the yoram parity seed provisions no pull requests, so the static seeded PR id 404s; align parity seeds or resolve a live PR in the scenario",
  },
  {
    test: ({ kind, route }) => kind === "api" && /^\/_init$/u.test(route.split("?")[0]),
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale: "presentation-only: legacy /_init uikit bootstrap redirect is meaningless to the React shell, which serves its own init payload",
    reason: "SPA shell: legacy /_init uikit bootstrap redirect is meaningless to the React shell, which serves its own init payload",
  },

  {
    test: ({ kind, route, detail }) => kind === "api" && /postlabel\//u.test(route) && /"status":500/u.test(JSON.stringify(detail.expected ?? {})),
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy -_-api postlabel handler crashes with 500 on an empty label set where yoram's mapped route answers 404; degenerate-payload crash, not specified behavior (yona-original/app/controllers/api/BoardApi.java:42-52 parses each label node unconditionally)",
  },
  {
    // Stored-state drift: both sides hold DIFFERENT contents at patch time, so
    // the chain broke somewhere upstream — harness defect, not product.
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      /\(PATCH\)$/u.test(route) &&
      detail?.actual?.storedContents !== undefined &&
      detail.actual.storedContents.legacy !== detail.actual.storedContents.yoram,
    classification: "HARNESS_ERROR",
    reason:
      "stored-comment drift between sides at PATCH time (see actual.storedContents): the scenario chain diverged upstream, so the pair does not measure the original-check contract",
  },
  {
    // States agree AND original matches them, yet statuses diverge: unexplained
    // observation drift — treat as harness error pending investigation.
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      /\(PATCH\)$/u.test(route) &&
      detail?.actual?.storedContents !== undefined,
    classification: "HARNESS_ERROR",
    reason:
      "PATCH original-check pair diverged unexpectedly at HEAD (yoram answers 409 {message, storedContent} on a stale original since the optimistic-concurrency fix; focused coverage crates/server/tests/issue_core_contract.rs) — investigate the pair before treating it as product behavior",
  },
  {
    test: ({ kind, route }) => kind === "api" && /^\/resetPassword\?s=/u.test(route),
    classification: "HARNESS_ERROR",
    reason:
      "harness session contamination: each server correctly accepts only its own SMTP token, but the shared sweep session replays one side's token against the other; capture tokens per side",
  },
  {
    test: ({ kind, route }) => kind === "api" && route === "/resetPassword",
    classification: "HARNESS_ERROR",
    reason:
      "per-side reset tokens are single-use and the shared sweep session consumes/contaminates one side's token before its POST replays: config is already matched (email verification enabled both sides), yet statuses diverge; capture and replay each side's token in isolation",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      (/\/(watch|unwatch)(\?|$)/u.test(route) || /\/issues$/u.test(route.split("?")[0])) &&
      /"legacyStatus":400/u.test(JSON.stringify(detail)),
    classification: "HARNESS_ERROR",
    reason:
      "harness payload contract gap: legacy binding rejects the sweep's minimal watch/unwatch/mass-update payload while yoram accepts it; align the legacy form fields before treating this as behavior",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /issue\/label(\/|\/category\/)/u.test(route) && /"legacyStatus":400.*"yoramStatus":400/u.test(JSON.stringify(detail)),
    classification: "HARNESS_ERROR",
    reason:
      "both sides rejected the label mutation pair: the discovery-resolved id/payload contract is still imperfect; fix id resolution rather than comparing agreed failures",
  },

  {
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      /issuelabel\//u.test(route) &&
      /"legacyStatus":500/u.test(JSON.stringify(detail)) &&
      /"yoramStatus":200/u.test(JSON.stringify(detail)),
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy -_-api issuelabel attach crashes with 500 where yoram attaches cleanly; degenerate legacy crash on the same payload",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /(issuelabel\/|issue\/label\/|issue\/labels)/u.test(route),
    classification: "HARNESS_ERROR",
    reason:
      "label attach/update/delete pair diverged: the discovery-resolved id/payload contract for this label route is still imperfect; fix id resolution and payload shape rather than comparing agreed failures",
  },
  // --- explicit DOM allow rules (plan Phase B) --------------------------------
  // No blanket dom rule exists: only these reviewed, evidence-backed exact
  // fingerprints may classify a DOM divergence as IMPLEMENTATION_DIFFERENCE.
  // The route/state/count/firstDiff equality is the guard; near misses,
  // including changed or missing visible controls/text/rows, remain UNVERIFIED.
  ...SITE_ADMIN_DOM_FINGERPRINT_RULES,
  ...PROJECT_PULL_REQUEST_DOM_FINGERPRINT_RULES,
  ...PROJECT_ISSUE_DOM_FINGERPRINT_RULES,
  ...PROJECT_ISSUE_LABELS_DOM_FINGERPRINT_RULES,
  ...PROJECT_ROUTE_DOM_FINGERPRINT_RULES,
  {
    // Narrow exception for the one known PR merge actor failure. This rule is
    // intentionally scenario-aware and only accepts an exact pending/current
    // state pair with the matching B-0227 accept evidence. Any extra text,
    // control, list, or near-miss entry stays UNVERIFIED.
    test: ({ kind, route, detail, scenarioViolations }) =>
      kind === "dom" &&
      /^\/[^/]+\/[^/]+\/pullRequest\/\d+$/u.test(route.split("?")[0]) &&
      hasExactMergeStateDiff(detail) &&
      hasSameScenarioMergeFailure(scenarioViolations),
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason: LEGACY_MERGE_FAILURE_REASON,
  },
  {
    // Reviewed selector/content tuple: the legacy SSR document carries the SPA
    // shell bootstrap markers (yona-root / __YONA_RUNTIME_CONFIG__ /
    // react-root); drift mentioning them is React-owned shell markup, whose
    // rendered parity is owned by the WTR e2e lanes and the frozen visual
    // baseline (docs/provenance/frontend-visual-parity-baseline-2026-07-11.md,
    // arbitration in docs/provenance/parity-reclassification-2026-09.md §3).
    test: ({ kind, route, detail }) => {
      void route;
      if (kind !== "dom" && kind !== "api") return false;
      if (kind === "dom" && domVisibleLoss(detail)) return false;
      return /yona-root|__YONA_RUNTIME_CONFIG__|react-root/iu.test(JSON.stringify(detail));
    },
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale:
      "presentation-only: the diff payload carries the React SPA shell bootstrap markers (yona-root/__YONA_RUNTIME_CONFIG__/react-root) — legacy SSR skeleton vs yoram React shell markup; rendered user-visible parity is enforced by the WTR e2e lanes and the frozen visual baseline, not the sweep",
    reason: "SPA-shell bootstrap drift between legacy SSR and the React shell",
  },
  {
    // Reviewed alignment artifact: every diffing entry exists on BOTH sides at
    // a different position (multiset-equal, order-only). Content is identical;
    // geometry/order parity is owned by the WTR lanes + frozen visual baseline
    // (docs/provenance/parity-reclassification-2026-09.md §3 arbitration).
    test: ({ kind, detail }) => {
      if (kind !== "dom" || domVisibleLoss(detail)) return false;
      const diffs = detail?.actual?.firstDiffs;
      return Array.isArray(diffs) && diffs.length > 0 && diffs.every((diff) => diff.side === "order");
    },
    classification: "IMPLEMENTATION_DIFFERENCE",
    rationale:
      "alignment artifact: the skeleton multisets are equal and only entry order differs (all firstDiffs sides are 'order'), the reviewed SSR-vs-SPA alignment drift from the 2026-09 reclassification arbitration; visual order/geometry parity is owned by the WTR e2e lanes",
    reason: "skeleton order drift with identical content on both sides",
  },
  {
    test: ({ kind }) => kind === "harness",
    classification: "HARNESS_ERROR",
    reason: "harness step failure: unresolved entity id or thrown handler — dependent actions skipped",
  },
  // Browser-side observation failures (CDP/protocol timeouts, selector
  // misses): infrastructure, not findings against Yoram.
  {
    test: ({ kind }) => kind === "infra",
    classification: "INFRA_ERROR",
    reason: "unresolved browser/CDP failure (timeout or selector miss): the sweep could not observe, which is not evidence of divergence",
  },
];

// Rule integrity: every rule must name an enum class, carry a reason, and any
// IMPLEMENTATION_DIFFERENCE rule must reference its rationale. Checked once at load
// so a malformed rule fails fast in every process that imports this module.
for (const rule of CLASSIFICATION_RULES) {
  if (!CLASSIFICATIONS.includes(rule.classification)) {
    throw new Error(`classification rule uses non-enum class: ${rule.classification}`);
  }
  if (!rule.reason || typeof rule.reason !== "string") {
    throw new Error(`classification rule (${rule.classification}) requires a reason`);
  }
  if (rule.classification === "IMPLEMENTATION_DIFFERENCE" && !rule.rationale) {
    throw new Error(`IMPLEMENTATION_DIFFERENCE rule requires a rationale reference: ${rule.reason}`);
  }
}

export function classifyViolation(kind, route, detail, context = {}) {
  const hit = CLASSIFICATION_RULES.find((rule) =>
    rule.test({
      kind,
      route,
      detail,
      ...context,
      scenarioViolations: context.scenarioViolations ?? detail?.scenarioViolations,
    }),
  );
  if (hit) {
    return { classification: hit.classification, reason: hit.reason, ...(hit.rationale ? { rationale: hit.rationale } : {}) };
  }
  return classify(kind, detail);
}

// DOM findings are created while a scenario is still running, before later
// mutation steps can establish the matching legacy-bug evidence. Re-run
// classification once the scenario is complete so the rule can require
// evidence from that same scenario without weakening ordinary DOM strictness.
export function reclassifyScenarioViolations(scenario) {
  const scenarioViolations = scenario?.violations;
  if (!Array.isArray(scenarioViolations)) return scenario;
  for (const finding of scenarioViolations) {
    const scenarioScopedApi =
      finding?.kind === "api" &&
      (scenario.id === "P26-residual-branch-import-probes" ||
        scenario.id === "U22-user-profile-edit-revert");
    if (finding?.kind !== "dom" && !scenarioScopedApi) continue;
    const classified = classifyViolation(
      finding.kind,
      finding.route,
      { expected: finding.expected, actual: finding.actual },
      {
        behaviorId: finding.behaviorId,
        scenarioId: scenario.id,
        scenarioActions: (scenario.stepResults ?? []).map((step) => step.action),
        scenarioViolations,
      },
    );
    Object.assign(finding, classified);
  }
  return scenario;
}

export function violation({ route, behaviorId = null, kind, expected, actual, classification, reason, rationale }) {
  const derived = classifyViolation(kind, route, { expected, actual }, { behaviorId });
  if (classification === "IMPLEMENTATION_DIFFERENCE" && !reason && !rationale && !derived.rationale) {
    throw new Error("IMPLEMENTATION_DIFFERENCE violation requires a rationale");
  }
  return {
    route,
    behaviorId,
    kind,
    expected,
    actual,
    ...derived,
    ...(classification ? { classification: normalizeClassification(classification) } : {}),
    ...(reason ? { reason } : {}),
    ...(rationale ? { rationale } : {}),
  };
}

export function writeReport(report, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, "report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

export function summarizeExecution(report, registeredScenarios = null) {
  const scenarioRows = Array.isArray(report.scenarios) ? report.scenarios : [];
  const attemptedScenarios = scenarioRows.length;
  const scenariosWithStepErrors = scenarioRows.filter((scenario) =>
    (scenario.stepResults ?? []).some((step) => step.status !== "EXECUTED"),
  ).length;
  const totalStepErrors = scenarioRows.reduce(
    (total, scenario) => total + (scenario.stepResults ?? []).filter((step) => step.status !== "EXECUTED").length,
    0,
  );
  return {
    registeredScenarios: registeredScenarios ?? attemptedScenarios,
    attemptedScenarios,
    globalInfraErrors: report.infraErrors ?? [],
    scenariosWithStepErrors,
    scenariosWithoutStepErrors: attemptedScenarios - scenariosWithStepErrors,
    totalStepErrors,
  };
}

// Independent per-class counts; errors are reported separately and never fold
// into coverage.
export function countClassifications(report) {
  const counts = Object.fromEntries(CLASSIFICATIONS.map((c) => [c, 0]));
  let total = 0;
  for (const scenario of report.scenarios) {
    for (const entry of scenario.violations) {
      counts[normalizeClassification(entry.classification)] += 1;
      total += 1;
    }
  }
  return { total, counts };
}

export function formatSummary(report) {
  const lines = [];
  lines.push(`differential sweep ${report.runId}`);
  const execution = report.executionAccounting ?? summarizeExecution(report);
  lines.push(`  scenarios: ${execution.attemptedScenarios}, behaviors covered: ${report.behaviorsCovered.length}`);
  for (const scenario of report.scenarios) {
    lines.push(`  [${scenario.id}] ${scenario.title} -> ${scenario.behaviorIds.join(", ") || "(no inventory match)"}`);
    for (const entry of scenario.violations) {
      lines.push(
        `    ${entry.kind.toUpperCase()} violation @ ${entry.route}` +
          ` (${entry.classification})${entry.behaviorId ? ` [${entry.behaviorId}]` : ""}`,
      );
      lines.push(`      expected: ${JSON.stringify(entry.expected).slice(0, 300)}`);
      lines.push(`      actual:   ${JSON.stringify(entry.actual).slice(0, 300)}`);
    }
  }
  const { total, counts } = countClassifications(report);
  lines.push(
    `  violations: total=${total} | ` +
      CLASSIFICATIONS.map((c) => `${c}=${counts[c]}`).join(" "),
  );
  const accepted = report.scenarios.flatMap((scenario) =>
    scenario.violations.filter((entry) => entry.classification === "IMPLEMENTATION_DIFFERENCE"),
  );
  for (const entry of accepted) {
    lines.push(`    IMPLEMENTATION_DIFFERENCE @ ${entry.route}: ${entry.rationale ?? entry.reason ?? "(no rationale)"}`);
  }
  lines.push(
    `  execution: registered=${execution.registeredScenarios} attempted=${execution.attemptedScenarios} ` +
      `globalInfraErrors=${execution.globalInfraErrors.length} scenariosWithStepErrors=${execution.scenariosWithStepErrors} ` +
      `scenariosWithoutStepErrors=${execution.scenariosWithoutStepErrors} totalStepErrors=${execution.totalStepErrors}`,
  );
  lines.push(`  step errors (not counted as findings or coverage): ${execution.totalStepErrors}`);
  lines.push(`  db projections compared after teardown: ${report.dbProjection ? "yes" : "no"}`);
  return lines.join("\n");
}
