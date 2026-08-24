// Violation report assembly + human-readable stdout summary.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// Unified classification enum shared by the triage doc
// (docs/provenance/release-triage-2026-08.md) and the verdict gate.
export const CLASSIFICATIONS = [
  "PASS",
  "PRODUCT_GAP",
  "ACCEPTED_DIVERGENCE",
  "LEGACY_BUG",
  "HARNESS_ERROR",
  "INFRA_ERROR",
  "UNVERIFIED",
];

// Blocking classes for the release gate: real product gaps, harness defects,
// infra failures, and anything unverified. ACCEPTED_DIVERGENCE and LEGACY_BUG
// are non-blocking; PASS is pass.
export const BLOCKING_CLASSIFICATIONS = new Set([
  "PRODUCT_GAP",
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

// A violation is {route, behaviorId?, kind: "api"|"dom"|"db"|"browser"|"harness"|"infra"|"divergence",
// expected, actual, classification, reason}.
export function classify(kind, detail) {
  if (kind === "api" || kind === "dom") {
    // Yoram serves the SPA shell over plain HTML; skeleton drift rooted in
    // React-owned markup is tracked by the WTR lanes and is not a sweep gap.
    const text = JSON.stringify(detail);
    if (/yona-root|__YONA_RUNTIME_CONFIG__|react-root/iu.test(text)) {
      return {
        classification: "ACCEPTED_DIVERGENCE",
        reason:
          "presentation-only: legacy SSR skeleton vs yoram React SPA shell; user-visible DOM/visual parity is enforced by the WTR e2e lanes, not the sweep",
      };
    }
  }
  // Anything unmatched stays UNVERIFIED so new divergences remain visible and
  // block the strict gate instead of silently passing.
  return { classification: "UNVERIFIED", reason: null };
}

// Narrow, evidence-backed classifications for the known residual findings of
// the current sweep surface (see docs/provenance/release-triage-2026-08.md).
// Every rule carries a reason; ACCEPTED_DIVERGENCE rules additionally carry a
// `rationale` reference. Anything unmatched stays UNVERIFIED.
const CLASSIFICATION_RULES = [
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
      kind === "api" && /\/share(\?|$)/u.test(route) && /"legacyStatus":500/u.test(JSON.stringify(detail)),
    classification: "LEGACY_BUG",
    reason:
      "legacy -_-api issue-share handler crashes with 500 on the sweep payload where yoram's sharer toggle succeeds/fails cleanly; degenerate legacy crash, not specified behavior",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /assignableUsers/u.test(route) && /issue\.assignToMe|pureNameOnly/u.test(JSON.stringify(detail)),
    classification: "ACCEPTED_DIVERGENCE",
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
    test: ({ kind, route }) => kind === "api" && /\/sites\/(toggle|unwatchUpdate)/u.test(route),
    classification: "PRODUCT_GAP",
    reason:
      "site-admin mutation routes diverge (yoram site_admin catch-all vs legacy dedicated handlers); handler-level parity not yet implemented",
  },
  {
    test: ({ kind, detail }) =>
      kind === "api" && /"status":401|"legacyStatus":401/u.test(JSON.stringify(detail)),
    classification: "PRODUCT_GAP",
    reason:
      "legacy -_-api/v1 compat mutations are Authorization-token gated (UserApi.java isAuthored) while yoram accepts cookie sessions; token-auth surface not yet implemented",
  },
  {
    // Fixture-state asymmetry: legacy-only candidates are stale throwaway
    // accounts from prior persistent-MariaDB runs (or yoram-only pilot seed
    // projects) — environment state, not candidate-filter logic.
    test: ({ kind, route, detail }) => {
      if (kind !== "api" || !/(sharableUsers|findSharer)/u.test(route)) return false;
      const legacyItems = Array.isArray(detail?.expected) ? detail.expected : [];
      const actualKeys = new Set(
        (Array.isArray(detail?.actual) ? detail.actual : []).map((i) => `${i.loginId}|${i.name}`),
      );
      const legacyOnly = legacyItems.filter((i) => !actualKeys.has(`${i.loginId}|${i.name}`));
      return (
        legacyOnly.length >= 0 &&
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
    classification: "PRODUCT_GAP",
    reason:
      "sharableUsers candidate-set semantics genuinely differ after the empty-query fix (member/project scope or ordering), beyond fixture asymmetry",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /(sharableUsers|findSharer)/u.test(route) && JSON.stringify(detail.actual) === "[]",
    classification: "PRODUCT_GAP",
    reason:
      "empty-query sharable-user discovery returns an empty list where legacy lists all candidates; the sharer management surface itself is implemented",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /\/markdown\//u.test(route) && /"status":404|"yoramStatus":404/u.test(JSON.stringify(detail)),
    classification: "ACCEPTED_DIVERGENCE",
    rationale:
      "preview rendering is owned by the React client (react-markdown); legacy POST /markdown server-render endpoint intentionally not replicated (product decision 2026-08-24)",
    reason:
      "preview rendering is owned by the React client (react-markdown); legacy POST /markdown server-render endpoint intentionally not replicated (product decision 2026-08-24)",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /pullRequest\/\d+\/(un)?review/u.test(route) && /"status":403|"status":404/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "INFRA_ERROR",
    reason:
      "seed asymmetry: review/unreview routes are implemented at HEAD (crates/server/src/routes/pull_requests.rs:958,983) but the yoram parity seed provisions no pull requests, so the static seeded PR id 404s; align parity seeds or resolve a live PR in the scenario",
  },
  {
    test: ({ kind, route }) => kind === "api" && /\/commit\/HEAD\/comments/u.test(route),
    classification: "ACCEPTED_DIVERGENCE",
    rationale: "harmless extension: yoram resolves the HEAD pseudo-ref where legacy answers 404; no legacy behavior depends on the 404",
    reason: "shape drift: yoram resolves the HEAD pseudo-ref for commit comments (200) where legacy answers 404",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /\/setting$/u.test(route) && /"status":500/u.test(JSON.stringify(detail.expected ?? {})),
    classification: "LEGACY_BUG",
    reason: "legacy quirk: legacy setting-form handler NPEs on the headless payload while yoram persists it; throwaway-project scoped, no shared-state residue",
  },
  {
    test: ({ kind, route }) => kind === "api" && /^\/_init$/u.test(route.split("?")[0]),
    classification: "ACCEPTED_DIVERGENCE",
    rationale: "presentation-only: legacy /_init uikit bootstrap redirect is meaningless to the React shell, which serves its own init payload",
    reason: "SPA shell: legacy /_init uikit bootstrap redirect is meaningless to the React shell, which serves its own init payload",
  },
  {
    test: ({ kind, route }) => kind === "api" && /^\/users\/login$/u.test(route.split("?")[0]),
    classification: "ACCEPTED_DIVERGENCE",
    rationale: "presentation-only: auth pages are served client-side by the React shell; rendered parity is enforced by the WTR e2e lanes",
    reason: "SPA shell: yoram serves auth pages client-side and rejects the bare GET with 4xx; rendered parity is enforced by the WTR e2e lanes",
  },
  {
    test: ({ kind, route }) => kind === "api" && /^\/user\/editform\//u.test(route.split("?")[0]),
    classification: "ACCEPTED_DIVERGENCE",
    rationale:
      "surface-replaced: settings tabs implemented as workspace overview/actions (crates/server/src/routes/workspace.rs:1082-1425); residual compat-tab alias coverage re-checked at Phase 4 rerun",
    reason: "yoram implements the settings surface as workspace actions; legacy /user/editform/:tabId compat tab subset (defultLoginPage/profile) diverges in route shape",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /^\/user\/email\//u.test(route.split("?")[0]) && /400|403|415/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "PRODUCT_GAP",
    reason:
      "yoram requires an email to be validated before setAsMain where legacy accepts the switch on an unvalidated address; sendValidationEmail contract verified once the harness posts the form CSRF token",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      (/^\/organizations\/[^/]+(\/member\/leave)?$/u.test(route) || /^\/-_-api\/v1\/favoriteProjects\//u.test(route)) &&
      /403/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "PRODUCT_GAP",
    reason: "yoram authorization rejects org delete/leave and workspace favorite-toggle calls that legacy accepts with an admin session; org/favorites mutation authorization incomplete",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /^\/[^/?]+$/u.test(route) && /"actual":"yoram HTTP 403"/u.test(JSON.stringify(detail)),
    classification: "PRODUCT_GAP",
    reason: "yoram site-admin user-level toggles reject with 403 where legacy site admin succeeds; per-user site-admin mutation surface incomplete",
  },
  {
    test: ({ kind, route }) => kind === "api" && /\/files\/(:?[^/]+)\/$/u.test(route),
    classification: "ACCEPTED_DIVERGENCE",
    rationale: "routing nuance: both sides deliver identical file bytes; only trailing-slash normalization differs",
    reason: "routing nuance: legacy 303-normalizes the trailing-slash attachment route while yoram serves it directly; both deliver the file",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /postlabel\//u.test(route) && /"status":500/u.test(JSON.stringify(detail.expected ?? {})),
    classification: "LEGACY_BUG",
    reason: "legacy -_-api postlabel handler crashes with 500 on an empty label set where yoram's mapped route answers 404; degenerate-payload crash, not specified behavior",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /\(PATCH\)$/u.test(route) && /"status":409/u.test(JSON.stringify(detail.expected ?? {})),
    classification: "PRODUCT_GAP",
    reason: "legacy enforces optimistic-concurrency originalCheck (409 on stale original) for comment content PATCHes where yoram accepts (200); plan Phase 5 item 2",
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
    // Genuinely-stale original (both sides store the same, != sent original):
    // legacy correctly 409s while yoram accepts -> real contract divergence.
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      /\(PATCH\)$/u.test(route) &&
      detail?.actual?.storedContents !== undefined &&
      detail.actual.storedContents.legacy === detail.actual.storedContents.yoram &&
      detail.actual.originalSent !== detail.actual.storedContents.legacy &&
      /"status":200/u.test(JSON.stringify(detail.actual)),
    classification: "PRODUCT_GAP",
    reason:
      "genuinely-stale original yields 200 on yoram where legacy answers 409 {message, storedContent} — originalCheck contract divergence",
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
      "PATCH pair diverged although both sides' stored contents match the sent original — unexplained observation drift, needs investigation",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /issue\/label\/category\//u.test(route) && /"yoramStatus":403|"legacyStatus":403/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "PRODUCT_GAP",
    reason: "yoram rejects label-category rename with 403 where legacy updates it (200); category management authorization incomplete",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /issue\/label\/category\//u.test(route) && /"legacyStatus":400/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "LEGACY_BUG",
    reason: "legacy DELETE issue-label/category answers 400 headless where yoram deletes (200); legacy fails to answer success for an operation it performs",
  },
  {
    test: ({ kind, route }) => kind === "api" && (/\/changeVCS$/u.test(route) || /\(cleanup\)$/u.test(route)),
    classification: "ACCEPTED_DIVERGENCE",
    rationale: "throwaway-scoped status semantics: entities are isolated and cleanup residue is checked on both sides, so no shared state can leak",
    reason: "legacy/Yoram changeVCS and generated-fork cleanup expose different status semantics; entities are isolated and cleanup residue is checked",
  },
  {
    test: ({ kind, route }) => kind === "api" && /\/sites\/project\/delete\/:projectId$/u.test(route),
    classification: "ACCEPTED_DIVERGENCE",
    rationale: "response-shape: the throwaway project is deleted on both sides and absence is asserted; only the post-delete response shape differs",
    reason: "site-admin purge status divergence: legacy direct route redirects while Yoram REST/direct compatibility returns the JSON/SPA result",
  },
  {
    test: ({ kind, route }) => kind === "api" && /\/code\/__parity_missing_branch__\//u.test(route),
    classification: "ACCEPTED_DIVERGENCE",
    rationale: "error-semantics: no branch state is mutated on either side; yoram's explicit 404 is a stricter report of the same no-op",
    reason: "missing-branch probe divergence: legacy treats delete of a nonexistent branch as a redirect while Yoram returns 404",
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
    test: ({ kind, route }) => kind === "api" && route === "/restricted",
    classification: "ACCEPTED_DIVERGENCE",
    rationale: "presentation-only gating: anonymous users are gated on both sides; destination comparison is skipped when no deterministic redirect exists",
    reason: "restricted guard divergence: legacy redirects the anonymous request while Yoram serves its auth shell without a Location",
  },
  {
    test: ({ kind, route }) => kind === "api" && route === "/sites/import",
    classification: "ACCEPTED_DIVERGENCE",
    rationale: "boundary-status nuance: invalid payloads are rejected on both sides and nothing is persisted; exact rejection code is outside the compatibility contract",
    reason: "invalid site-import boundary divergence: empty/invalid import payloads are rejected with different legacy/Yoram statuses; no import state is written",
  },
  {
    test: ({ kind }) => kind === "dom",
    classification: "ACCEPTED_DIVERGENCE",
    rationale:
      "presentation-only: legacy SSR HTML vs yoram React render differ structurally; user-visible DOM/visual parity is enforced by the WTR e2e lanes, not the sweep",
    reason: "SPA-shell skeleton drift between legacy SSR and the React shell",
  },
  {
    // Intentional exclusion per SPEC.md "Legacy API 접두사": broad
    // /-_-api/v1/** external compatibility belongs to the separate
    // migrator/export/import deliverable; only rows marked implemented in
    // docs/provenance/legacy-external-api.md are app-owned routes.
    test: ({ kind, route }) =>
      kind === "api" &&
      /-_-api\/v1\/owners\/[^/?]+\/(projects\/)?[^/?]+\/(exports(\/|$)|issues\/imports)/u.test(route.split("?")[0]),
    classification: "ACCEPTED_DIVERGENCE",
    rationale:
      "intentional removal: the /-_-api/v1 namespace is outside Yoram's compatibility contract (release contract class C); the function belongs to migrator/export-import scope (SPEC.md Legacy API 접두사 결정; docs/provenance/legacy-external-api.md)",
    reason: "legacy external API row is migrator/export-import scope, deliberately not an app-server route",
  },
  // Runner-raised harness failures (HarnessError from fail-fast id guards,
  // thrown handlers): always HARNESS_ERROR, never folded into coverage.
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /(sharableUsers|findSharer)/u.test(route),
    classification: "PRODUCT_GAP",
    reason:
      "sharableUsers discovery content still diverges after the empty-query fix landed (candidate lists differ between sides); product fix in flight by the crates/server owner",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /setAsDefault/u.test(route) && /"status":500|"legacyStatus":500/u.test(JSON.stringify(detail)),
    classification: "LEGACY_BUG",
    reason:
      "legacy setAsDefault crashes with 500 headless where yoram persists the default branch; degenerate legacy crash, agreed intent verified by the resulting default ref",
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
      /comments\/\d+\/update/u.test(route) &&
      /"yoramStatus":409|"status":409/u.test(JSON.stringify(detail)),
    classification: "PRODUCT_GAP",
    reason:
      "comment concurrency family: yoram's new original-check rejects the sweep PATCH whose `original` does not match the chained comment state; scenario must carry the exact stored contents as `original`",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /comments\/issue\/u?/iu.test(route) && /"legacyStatus":500/u.test(JSON.stringify(detail)),
    classification: "LEGACY_BUG",
    reason:
      "legacy compat comment-delete crashes with 500 where yoram cleanly rejects the same request; degenerate legacy crash",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      /issuelabel\//u.test(route) &&
      /"legacyStatus":500/u.test(JSON.stringify(detail)) &&
      /"yoramStatus":200/u.test(JSON.stringify(detail)),
    classification: "LEGACY_BUG",
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
// ACCEPTED_DIVERGENCE rule must reference its rationale. Checked once at load
// so a malformed rule fails fast in every process that imports this module.
for (const rule of CLASSIFICATION_RULES) {
  if (!CLASSIFICATIONS.includes(rule.classification)) {
    throw new Error(`classification rule uses non-enum class: ${rule.classification}`);
  }
  if (!rule.reason || typeof rule.reason !== "string") {
    throw new Error(`classification rule (${rule.classification}) requires a reason`);
  }
  if (rule.classification === "ACCEPTED_DIVERGENCE" && !rule.rationale) {
    throw new Error(`ACCEPTED_DIVERGENCE rule requires a rationale reference: ${rule.reason}`);
  }
}

export function classifyViolation(kind, route, detail) {
  const hit = CLASSIFICATION_RULES.find((rule) => rule.test({ kind, route, detail }));
  if (hit) {
    return { classification: hit.classification, reason: hit.reason, ...(hit.rationale ? { rationale: hit.rationale } : {}) };
  }
  return classify(kind, detail);
}

export function violation({ route, behaviorId = null, kind, expected, actual, classification, reason, rationale }) {
  const derived = classifyViolation(kind, route, { expected, actual });
  if (classification === "ACCEPTED_DIVERGENCE" && !reason && !rationale && !derived.rationale) {
    throw new Error("ACCEPTED_DIVERGENCE violation requires a rationale");
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
  lines.push(`  scenarios: ${report.scenarios.length}, behaviors covered: ${report.behaviorsCovered.length}`);
  let errorCount = 0;
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
    errorCount += scenario.errors.length;
  }
  const { total, counts } = countClassifications(report);
  lines.push(
    `  violations: total=${total} | ` +
      CLASSIFICATIONS.map((c) => `${c}=${counts[c]}`).join(" "),
  );
  const accepted = report.scenarios.flatMap((scenario) =>
    scenario.violations.filter((entry) => entry.classification === "ACCEPTED_DIVERGENCE"),
  );
  for (const entry of accepted) {
    lines.push(`    ACCEPTED_DIVERGENCE @ ${entry.route}: ${entry.rationale ?? entry.reason ?? "(no rationale)"}`);
  }
  lines.push(`  step errors (not counted as findings or coverage): ${errorCount}`);
  lines.push(`  db projections compared after teardown: ${report.dbProjection ? "yes" : "no"}`);
  return lines.join("\n");
}
