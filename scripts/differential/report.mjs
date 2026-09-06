// Violation report assembly + human-readable stdout summary.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  domVisibleLoss,
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
  expectedSkeletonEntries,
  actualSkeletonEntries,
  firstDiffs,
  wtrTest,
  wtrSource,
  rationale,
}) {
  return Object.freeze({
    route,
    state,
    expectedSkeletonEntries,
    actualSkeletonEntries,
    firstDiffs: Object.freeze(
      firstDiffs.map(([side, expected, actual]) => Object.freeze({ side, expected, actual })),
    ),
    wtrTest,
    wtrSource,
    rationale,
  });
}

// These are exact, finite SSR-vs-SPA body fingerprints from the U18 capture.
// They are deliberately not class-prefix or route-family allowlists: route,
// state, both skeleton counts, and every reported firstDiff must match. The
// focused WTR test title/source is carried with each fingerprint so a
// reclassification remains auditable. Any changed/missing visible row, text,
// or control represented by the captured count/signature falls through to
// UNVERIFIED.
export const SITE_ADMIN_DOM_IMPLEMENTATION_FINGERPRINTS = Object.freeze([
  siteAdminDomFingerprint({
    route: "/sites/userList",
    state: "populated",
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
    wtrTest: "site admin user list matches legacy site/userList.scala.html populated DOM",
    wtrSource: "frontend/tests/wtr/site-admin-user-list.e2e.ts:176-458",
    rationale:
      'WTR exact DOM contract: frontend/tests/wtr/site-admin-user-list.e2e.ts:176-458, test "site admin user list matches legacy site/userList.scala.html populated DOM"; the reviewed populated body retires legacy avatar/user/action/modal plugin identity classes while dedicated WTR assertions retain rows, labels, controls, and modal behavior',
  }),
  siteAdminDomFingerprint({
    route: "/sites/projectList",
    state: "populated",
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
    wtrTest: "site admin project list matches legacy site/projectList.scala.html populated DOM",
    wtrSource: "frontend/tests/wtr/site-admin-project-list.e2e.ts:158-295",
    rationale:
      'WTR exact DOM contract: frontend/tests/wtr/site-admin-project-list.e2e.ts:158-295, test "site admin project list matches legacy site/projectList.scala.html populated DOM"; the reviewed populated body retires legacy avatar/project/modal plugin identity classes while dedicated WTR assertions retain project rows, links, delete behavior, and pagination',
  }),
  siteAdminDomFingerprint({
    route: "/sites/data",
    state: "default",
    expectedSkeletonEntries: 16,
    actualSkeletonEntries: 15,
    firstDiffs: [
      ["legacy-only", "div.title_area:", "h2:데이터"],
      ["legacy-only", "h2.pull-left:데이터", "h2:데이터"],
      ["yoram-only", "h3:Export", "h2:데이터"],
    ],
    wtrTest: "site admin data matches legacy site/data.scala.html DOM",
    wtrSource: "frontend/tests/wtr/site-admin-data.e2e.ts:124-188",
    rationale:
      'WTR exact DOM contract: frontend/tests/wtr/site-admin-data.e2e.ts:124-188, test "site admin data matches legacy site/data.scala.html DOM"; the reviewed body retires the legacy title wrapper/class identity while dedicated WTR assertions retain the title, Export, Import, file input, and form controls',
  }),
  siteAdminDomFingerprint({
    route: "/sites/issueList",
    state: "open-populated",
    expectedSkeletonEntries: 33,
    actualSkeletonEntries: 14,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap.list-avatar:", "a:1"],
      ["legacy-only", "a.avatar-wrap:", "a:1"],
      ["legacy-only", "a.post-meta-item:Site Admin", "a:1"],
      ["legacy-only", "a.post-project:admin/sample", "a:1"],
      ["legacy-only", "a.post-title:Review rail parity check", "a:1"],
      ["yoram-only", "a:닫힘", "a:Review rail parity check"],
      ["yoram-only", "a:닫힘", "a:Site Admin"],
      ["yoram-only", "a:닫힘", "a:admin/sample"],
      ["legacy-only", "div.page-navigation-wrap:", "h2:이슈"],
      ["legacy-only", "div.post-info-wrap:", "h2:이슈"],
      ["legacy-only", "div.post-meta-wrap:", "h2:이슈"],
      ["legacy-only", "div.span10:", "h2:이슈"],
      ["legacy-only", "div.title_area:", "h2:이슈"],
      ["legacy-only", "h2.pull-left:이슈", "h2:이슈"],
      ["legacy-only", "i.ico.btn-pg-next.off:", "h2:이슈"],
      ["legacy-only", "i.ico.btn-pg-prev.off:", "h2:이슈"],
      ["yoram-only", "i.yobicon-comments:", "h2:이슈"],
      ["legacy-only", "input.input-mini.nospinner:", "li:/"],
      ["legacy-only", "li.active:", "li:/"],
      ["legacy-only", "li.page-num.delimiter:/", "li:/"],
    ],
    wtrTest: "site admin issue list matches legacy site/issueList.scala.html open populated DOM",
    wtrSource: "frontend/tests/wtr/site-admin-issue-list.e2e.ts:142-360",
    rationale:
      'WTR exact DOM contract: frontend/tests/wtr/site-admin-issue-list.e2e.ts:142-360, test "site admin issue list matches legacy site/issueList.scala.html open populated DOM"; the reviewed open body retires legacy row/avatar/pagination/icon identity classes while dedicated WTR assertions retain issue rows, state tabs, metadata, comments, and pagination',
  }),
  siteAdminDomFingerprint({
    route: "/sites/postList",
    state: "populated",
    expectedSkeletonEntries: 29,
    actualSkeletonEntries: 15,
    firstDiffs: [
      ["legacy-only", "a.avatar-wrap:", "a:1"],
      ["legacy-only", "a.post-meta-item:Site Admin", "a:1"],
      ["legacy-only", "a.post-project:admin/sample", "a:1"],
      ["legacy-only", "a.post-title:Seed notes", "a:1"],
      ["legacy-only", "a:2", "a:1"],
      ["legacy-only", "div.page-navigation-wrap:", "a:1"],
      ["legacy-only", "div.post-info-wrap:", "a:1"],
      ["legacy-only", "div.post-meta-wrap:", "a:1"],
      ["yoram-only", "div.span10:", "a:1"],
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
    ],
    wtrTest: "site admin post list matches legacy site/postList.scala.html populated DOM",
    wtrSource: "frontend/tests/wtr/site-admin-post-list.e2e.ts:140-331",
    rationale:
      'WTR exact DOM contract: frontend/tests/wtr/site-admin-post-list.e2e.ts:140-331, test "site admin post list matches legacy site/postList.scala.html populated DOM"; the reviewed populated body retires legacy post/avatar/pagination/icon identity classes while dedicated WTR assertions retain post rows, metadata, comments, and pagination',
  }),
  siteAdminDomFingerprint({
    route: "/sites/mail",
    state: "not-configured",
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
    wtrTest: "site admin mail matches legacy site/mail.scala.html not-configured DOM",
    wtrSource: "frontend/tests/wtr/site-admin-mail.e2e.ts:154-242",
    rationale:
      'WTR exact DOM contract: frontend/tests/wtr/site-admin-mail.e2e.ts:154-242, test "site admin mail matches legacy site/mail.scala.html not-configured DOM"; the reviewed not-configured body retires legacy form/control wrapper classes while dedicated WTR assertions retain the alert, labels, fields, and send/error/loading behavior',
  }),
  siteAdminDomFingerprint({
    route: "/sites/massmail",
    state: "default",
    expectedSkeletonEntries: 13,
    actualSkeletonEntries: 12,
    firstDiffs: [
      ["legacy-only", "button.ybtn.ybtn-primary:", "button.ybtn:"],
      ["legacy-only", "div.control-group.hide:", "div.controls:"],
      ["yoram-only", "div.mess-mail-wrap:", "div.hide:"],
    ],
    wtrTest: "site admin mass mail matches legacy site/massMail.scala.html DOM",
    wtrSource: "frontend/tests/wtr/site-admin-massmail.e2e.ts:131-246",
    rationale:
      'WTR exact DOM contract: frontend/tests/wtr/site-admin-massmail.e2e.ts:131-246, test "site admin mass mail matches legacy site/massMail.scala.html DOM"; the reviewed default body retires legacy mass-mail wrapper/button identity classes while dedicated WTR interaction assertions retain recipient selection, project controls, and Write behavior',
  }),
  siteAdminDomFingerprint({
    route: "/sites/update",
    state: "no-update-product-version",
    expectedSkeletonEntries: 5,
    actualSkeletonEntries: 5,
    firstDiffs: [
      ["legacy-only", "p:현재 버전은 1.16.0 입니다", "p:현재 버전은 0.1.0 입니다"],
      ["yoram-only", "p:현재 최신 버전을 사용중입니다", "p:현재 버전은 0.1.0 입니다"],
    ],
    wtrTest: "site admin update matches legacy site/update.scala.html no-update screen DOM",
    wtrSource: "frontend/tests/wtr/site-admin-update.e2e.ts:108-283",
    rationale:
      'Product identity/version fingerprint: legacy Yona declares version 1.16.0 (yona-original/build.sbt:6); Yoram declares workspace version 0.1.0 (Cargo.toml:15-18), defaults site-update current_version from CARGO_PKG_VERSION (crates/server/src/app_config.rs:229-250), and returns that value from the update response (crates/server/src/routes/site_admin/update.rs:105-151). The exact visible version divergence is therefore intentional product identity, not plugin markup. Focused WTR source: frontend/tests/wtr/site-admin-update.e2e.ts:108-283, test "site admin update matches legacy site/update.scala.html no-update screen DOM"',
  }),
]);

function exactSiteAdminDomFingerprint(detail, fingerprint) {
  return (
    detail?.expected?.skeletonEntries === fingerprint.expectedSkeletonEntries &&
    detail?.actual?.skeletonEntries === fingerprint.actualSkeletonEntries &&
    JSON.stringify(detail?.actual?.firstDiffs) === JSON.stringify(fingerprint.firstDiffs)
  );
}

const SITE_ADMIN_DOM_FINGERPRINT_RULES = SITE_ADMIN_DOM_IMPLEMENTATION_FINGERPRINTS.map((fingerprint) => ({
  test: ({ kind, route, detail }) =>
    kind === "dom" && route === fingerprint.route && exactSiteAdminDomFingerprint(detail, fingerprint),
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
    test: ({ kind, route, detail, behaviorId }) =>
      kind === "api" &&
      behaviorId === "B-0002" &&
      /^\/[^/]+\/[^/]+\/code\/__parity_missing_branch__\/$/u.test(route) &&
      exactStatus(detail, "legacy") === 302 &&
      exactStatus(detail, "yoram") === 404,
    classification: "LEGACY_BUG_NOT_REPRODUCED",
    reason:
      "legacy BranchApp.deleteBranch redirects after blindly deleting a nonexistent branch, while Yoram reports the same no-op as 404; the malformed missing-branch probe is not supported behavior (yona-original/app/controllers/BranchApp.java:71-79; yona-original/app/playRepository/GitRepository.java:1230-1236)",
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
    if (finding?.kind !== "dom") continue;
    const classified = classifyViolation(
      finding.kind,
      finding.route,
      { expected: finding.expected, actual: finding.actual },
      { behaviorId: finding.behaviorId, scenarioViolations },
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
