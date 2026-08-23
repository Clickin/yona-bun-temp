// Violation report assembly + human-readable stdout summary.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// A violation is {route, behaviorId?, kind: "api"|"dom"|"db"|"browser",
// expected, actual, classification}. classification: "infra" | "known-gap" |
// "needs-review".
export function classify(kind, detail) {
  if (kind === "api" || kind === "dom") {
    // Yoram serves the SPA shell over plain HTML; skeleton drift rooted in
    // React-owned markup is tracked by the WTR lanes and is not a sweep gap.
    const text = JSON.stringify(detail);
    if (/yona-root|__YONA_RUNTIME_CONFIG__|react-root/iu.test(text)) return "known-gap";
  }
  return "needs-review";
}

// Narrow, evidence-backed classifications for the known residual findings of
// the current sweep surface. Every rule must carry a reason; anything unmatched
// stays needs-review so new divergences remain visible.
const CLASSIFICATION_RULES = [
  {
    test: ({ kind, route }) => kind === "db" && /labels/u.test(route),
    classification: "known-gap",
    reason:
      "seed divergence: yoram reconcileDefaultDevParitySeed provisions sample-project labels (bug/parity) that the legacy parity instance does not seed; the seed is shared with run-dev-backend-once.spec.mjs assertions",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /assignableUsers/u.test(route) && /issue\.assignToMe|pureNameOnly/u.test(JSON.stringify(detail)),
    classification: "known-gap",
    reason:
      "i18n divergence: yoram assignableUsers returns message keys (issue.assignToMe) where legacy returns localized display names (Assign to me / No assignee)",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      (/\/(null|undefined)(\/|\?|$)/u.test(route) ||
        /unresolved|id discovery|no sweep-suffixed|nothing matched/u.test(JSON.stringify(detail))) ,
    classification: "infra",
    reason:
      "harness id-resolution failure: one side did not yield the created-entity id, so the pair was not comparable; fix the discovery step rather than treating this as a product gap",
  },
  {
    test: ({ kind, route }) => kind === "api" && /\/sites\/(toggle|unwatchUpdate)/u.test(route),
    classification: "known-gap",
    reason:
      "site-admin mutation routes diverge (yoram site_admin catch-all vs legacy dedicated handlers); site-admin surface is v1 scope, handler-level parity not yet implemented",
  },
  {
    test: ({ kind, detail }) =>
      kind === "api" && /"status":401|"legacyStatus":401/u.test(JSON.stringify(detail)),
    classification: "known-gap",
    reason:
      "legacy -_-api/v1 compat mutations are Authorization-token gated (UserApi.java isAuthored) while yoram accepts cookie sessions; documented adapter divergence",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" && /(sharableUsers|findSharer)/u.test(route) && JSON.stringify(detail.actual) === "[]",
    classification: "known-gap",
    reason: "gap: yoram REST returns an empty sharer list for sharableUsers/findSharer; sharer management is v1 scope, not yet implemented",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /\/markdown\//u.test(route) && /"status":404|"yoramStatus":404|"yoramStatus":415/u.test(JSON.stringify(detail)),
    classification: "known-gap",
    reason: "gap: yoram has no POST /markdown/:user/:project render endpoint (legacy handler itself 500s headless); markdown preview parity is v1 scope, not yet implemented",
   },
  {
    test: ({ kind, route, detail }) => kind === "api" && /pullRequest\/\d+\/(un)?review/u.test(route) && /"status":403/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "known-gap",
    reason: "gap: yoram rejects review-point toggle with 403 where legacy accepts the PR author's own review (reviewer authorization divergence); review-point surface is v1 scope",
  },
  {
    test: ({ kind, route }) => kind === "api" && /\/commit\/HEAD\/comments/u.test(route),
    classification: "known-gap",
    reason: "shape drift: yoram resolves the HEAD pseudo-ref for commit comments (200) where legacy answers 404; commit-comment thread surface is v1 scope",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /\/setting$/u.test(route) && /"status":500/u.test(JSON.stringify(detail.expected ?? {})),
    classification: "known-gap",
    reason: "legacy quirk: legacy setting-form handler NPEs on the headless payload while yoram persists it; throwaway-project scoped, no shared-state residue",
  },
  {
    test: ({ kind, route }) => kind === "api" && /^\/_init$/u.test(route.split("?")[0]),
    classification: "known-gap",
    reason: "SPA shell: legacy /_init uikit bootstrap redirect is meaningless to the React shell, which serves its own init payload",
  },
  {
    test: ({ kind, route }) => kind === "api" && /^\/authenticate\//u.test(route.split("?")[0]),
    classification: "known-gap",
    reason: "deferred: OAuth provider flows are out of v1 scope (docs/provenance/auth-deferred-oauth-ldap.md); yoram answers 2xx where legacy redirects to the provider",
  },
  {
    test: ({ kind, route }) => kind === "api" && /^\/users\/login$/u.test(route.split("?")[0]),
    classification: "known-gap",
    reason: "SPA shell: yoram serves auth pages client-side and rejects the bare GET with 4xx; rendered parity is enforced by the WTR e2e lanes",
  },
  {
    test: ({ kind, route }) => kind === "api" && /^\/user\/editform\//u.test(route.split("?")[0]),
    classification: "known-gap",
    reason: "gap: yoram implements a subset of legacy /user/editform/:tabId compat tabs (defultLoginPage and profile tabs missing); account-settings surface is v1 scope",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /^\/user\/email\//u.test(route.split("?")[0]) && /403|415/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "known-gap",
    reason: "gap: yoram user-email management compat surface incomplete (setAsMain rejected 403, sendValidationEmail unsupported media 415); v1 scope follow-up",
  },
  {
    test: ({ kind, route, detail }) =>
      kind === "api" &&
      (/^\/organizations\/[^/]+(\/member\/leave)?$/u.test(route) || /^\/-_-api\/v1\/favoriteProjects\//u.test(route)) &&
      /403/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "known-gap",
    reason: "gap: yoram authorization rejects org delete/leave and workspace favorite-toggle calls that legacy accepts with an admin session; org/favorites mutation surface is v1 scope",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /^\/[^/?]+$/u.test(route) && /"actual":"yoram HTTP 403"/u.test(JSON.stringify(detail)),
    classification: "known-gap",
    reason: "gap: yoram site-admin user-level toggles reject with 403 where legacy site admin succeeds; extends the /sites/toggle known divergence to per-user routes",
  },
  {
    test: ({ kind, route }) => kind === "api" && /\/files\/(:?[^/]+)\/$/u.test(route),
    classification: "known-gap",
    reason: "routing nuance: legacy 303-normalizes the trailing-slash attachment route while yoram serves it directly; both deliver the file",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /postlabel\//u.test(route) && /"status":500/u.test(JSON.stringify(detail.expected ?? {})),
    classification: "known-gap",
    reason: "divergence: legacy -_-api postlabel handler crashes with 500 on an empty label set where yoram's mapped route answers 404; label-set surface is v1 scope",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /\(PATCH\)$/u.test(route) && /"status":409/u.test(JSON.stringify(detail.expected ?? {})),
    classification: "known-gap",
    reason: "divergence: legacy enforces optimistic-concurrency originalCheck (409 on stale original) for comment content PATCHes where yoram accepts (200); write-model surface is v1 scope",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /issue\/label\/category\//u.test(route) && /"yoramStatus":403|"legacyStatus":403/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "known-gap",
    reason: "divergence: yoram rejects label-category rename with 403 where legacy updates it (200); category management authorization is v1 scope",
  },
  {
    test: ({ kind, route, detail }) => kind === "api" && /issue\/label\/category\//u.test(route) && /"legacyStatus":400/u.test(JSON.stringify(detail.actual ?? {})),
    classification: "known-gap",
    reason: "legacy quirk: legacy DELETE issue-label/category answers 400 headless where yoram deletes (200); agreed-intent delete divergence, v1 scope",
  },
  {
    test: ({ kind }) => kind === "dom",
    classification: "known-gap",
    reason:
      "SPA-shell skeleton drift: legacy SSR HTML vs yoram React render differ structurally; user-visible DOM/visual parity is enforced by the WTR e2e lanes, not the sweep",
   },
   {
    // Intentional exclusion per SPEC.md "Legacy API 접두사": broad
    // /-_-api/v1/** external compatibility belongs to the separate
    // migrator/export/import deliverable; only rows marked implemented in
    // docs/provenance/legacy-external-api.md are app-owned routes.
    test: ({ kind, route }) =>
      kind === "api" &&
      /-_-api\/v1\/owners\/[^/?]+\/(projects\/)?[^/?]+\/(exports(\/|$)|issues\/imports)/u.test(route.split("?")[0]),
    classification: "known-gap",
    reason:
      "intentional deviation: legacy external API row is migrator/export-import scope, deliberately not an app-server route (SPEC.md Legacy API 접두사 결정; docs/provenance/legacy-external-api.md)",
   },
];

export function classifyViolation(kind, route, detail) {
  const hit = CLASSIFICATION_RULES.find((rule) => rule.test({ kind, route, detail }));
  return hit ? { classification: hit.classification, reason: hit.reason } : { classification: classify(kind, detail), reason: null };
}

export function violation({ route, behaviorId = null, kind, expected, actual }) {
  return {
    route,
    behaviorId,
    kind,
    expected,
    actual,
    ...classifyViolation(kind, route, { expected, actual }),
  };
}

export function writeReport(report, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, "report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

export function formatSummary(report) {
  const lines = [];
  lines.push(`differential sweep ${report.runId}`);
  lines.push(`  scenarios: ${report.scenarios.length}, behaviors covered: ${report.behaviorsCovered.length}`);
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
  const counts = { api: 0, dom: 0, db: 0, browser: 0 };
  let infra = 0;
  for (const scenario of report.scenarios) {
    for (const entry of scenario.violations) {
      if (entry.classification === "infra") {
        infra += 1;
      } else {
        counts[entry.kind] += 1;
      }
    }
  }
  lines.push(`  violations: api=${counts.api} dom=${counts.dom} db=${counts.db} browser=${counts.browser} infra=${infra}`);
  lines.push(`  db projections compared after teardown: ${report.dbProjection ? "yes" : "no"}`);
  return lines.join("\n");
}
