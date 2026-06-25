import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const checklistPath = path.join(
  repoRoot,
  "docs",
  "plans",
  "2026-06-24-rc-ux-diff-closure-checklist.md",
);
const visualProvenancePath = path.join(
  repoRoot,
  "docs",
  "provenance",
  "visual-parity-sweep-2026-06-25.md",
);
const legacyAuditOutputPath = path.join(
  repoRoot,
  ".agent",
  "legacy-html-page-audit",
  "latest.json",
);
const sweepOutputPath = path.join(repoRoot, "output", "playwright", "visual-sweep", "latest.json");

const allowedClosedStatuses = new Set(["pass", "not-applicable", "expected-legacy-non-ok"]);
const forbiddenOpenStatuses = new Set(["unchecked", "diff", "blocked"]);
const requiredRows = [
  "rc-ux-public-auth",
  "rc-ux-auth-shell",
  "rc-ux-directory-create",
  "rc-ux-user-workspace",
  "rc-ux-search-notification",
  "rc-ux-site-admin",
  "rc-ux-project-home-code",
  "rc-ux-issues",
  "rc-ux-board",
  "rc-ux-milestones",
  "rc-ux-pull-requests",
  "rc-ux-project-admin",
  "rc-ux-fragment-conversions",
  "rc-ux-security-stability",
  "rc-ux-db-migration-smoke",
];
const requiredVisualPathsByRow = {
  "rc-ux-public-auth": ["/", "/users/loginform", "/users/signupform", "/lostPassword", "/_help"],
  "rc-ux-auth-shell": [
    "/",
    "/user/sidebar?path=%2Fadmin%2Fsample%2Fissue%2F1&hash=comment-7",
    "/user/usermenuTabContentList",
  ],
  "rc-ux-directory-create": [
    "/projects",
    "/projectform",
    "/_import",
    "/orgs",
    "/organizations/new",
  ],
  "rc-ux-user-workspace": [
    "/admin",
    "/user/issues",
    "/user/issues/new/mine",
    "/user/files",
    "/user/editform",
    "/user/editform/password",
    "/user/editform/notifications",
    "/user/editform/emails",
    "/user/editform/token",
  ],
  "rc-ux-search-notification": [
    "/search?keyword=yona&searchType=auto",
    "/notifications",
    "/notification?from=0&limit=20",
  ],
  "rc-ux-site-admin": [
    "/sites/userList",
    "/sites/projectList",
    "/sites/postList",
    "/sites/issueList",
    "/sites/mail",
    "/sites/massmail",
    "/sites/update",
    "/sites/diagnostic",
    "/sites/data",
  ],
  "rc-ux-project-home-code": [
    "/admin/sample",
    "/admin/sample/code",
    "/admin/sample/commits",
    "/admin/sample/branches",
  ],
  "rc-ux-issues": [
    "/admin/sample/issues",
    "/admin/sample/issue/1",
    "/admin/sample/issueform",
    "/admin/sample/issue/labelsform",
  ],
  "rc-ux-board": [
    "/admin/sample/posts",
    "/admin/sample/post/1",
    "/admin/sample/postform",
    "/admin/sample/post/1/editform",
  ],
  "rc-ux-milestones": [
    "/admin/sample/milestones",
    "/admin/sample/newMilestoneForm",
    "/admin/sample/milestone/1",
  ],
  "rc-ux-pull-requests": [
    "/admin/sample/pullRequests",
    "/admin/sample/newPullRequestForm",
    "/admin/sample/reviews",
    "/admin/sample/pullRequest/1",
    "/admin/sample/pullRequest/1/changes",
  ],
  "rc-ux-project-admin": [
    "/admin/sample/members",
    "/admin/sample/watchers",
    "/admin/sample/settingform",
    "/admin/sample/webhooks",
    "/admin/sample/deleteform",
    "/admin/sample/transfer",
    "/admin/sample/newFork",
    "/admin/sample/statistics",
    "/admin/sample/changeVCS",
  ],
  "rc-ux-fragment-conversions": [
    "/notification?from=0&limit=20",
    "/user/sidebar?path=%2Fadmin%2Fsample%2Fissue%2F1&hash=comment-7",
    "/user/usermenuTabContentList",
  ],
  "rc-ux-security-stability": [
    "/admin/sample/issue/1",
    "/search?keyword=yona&searchType=auto",
    "/admin/sample/code/main/README.md",
  ],
};
const requiredQueryStringUiLinks = [
  "/admin/sample/postform?readme=true",
  "/admin/sample/postform?issueTemplate=true",
  "/admin/sample/issues?format=xls",
  "/admin/sample/reviews?format=xls",
];

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function rcRows(source) {
  return source
    .split("\n")
    .filter((line) => line.startsWith("| `rc-ux-"))
    .map((line) => {
      const columns = line
        .split("|")
        .slice(1, -1)
        .map((column) => column.trim());
      return {
        id: columns[0]?.replaceAll("`", ""),
        status: columns[3]?.replaceAll("`", ""),
      };
    });
}

function sectionForRow(source, rowId) {
  const startMarker = `### \`${rowId}\``;
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${rowId} needs closed evidence`);
  const next = source.indexOf("\n### `rc-ux-", start + startMarker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

function collectStringPaths(value, paths = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringPaths(item, paths);
    }
    return paths;
  }
  if (value && typeof value === "object") {
    if (typeof value.path === "string" && value.path.startsWith("/")) {
      paths.add(value.path);
    }
    for (const item of Object.values(value)) {
      collectStringPaths(item, paths);
    }
    return paths;
  }
  if (typeof value === "string" && value.startsWith("/") && !path.isAbsolute(value)) {
    paths.add(value);
  }
  return paths;
}

test("RC UX checklist keeps every row closed and backed by evidence sections", () => {
  const source = readText(checklistPath);
  const rows = rcRows(source);

  assert.deepEqual(
    rows.map((row) => row.id),
    requiredRows,
    "RC UX matrix must keep the canonical row set explicit",
  );

  for (const row of rows) {
    assert.equal(
      allowedClosedStatuses.has(row.status),
      true,
      `${row.id} must be closed with pass/not-applicable/expected-legacy-non-ok`,
    );
    assert.equal(
      forbiddenOpenStatuses.has(row.status),
      false,
      `${row.id} must not remain unchecked/diff/blocked`,
    );
    assert.match(source, new RegExp(`### \`${row.id}\``), `${row.id} needs closed evidence`);
  }

  assert.match(source, /XSS, SQLi literal keyword behavior, long fenced code block/u);
  assert.match(source, /Every legacy Java endpoint that returned an HTML fragment/u);
  assert.match(source, /Adopted legacy MariaDB plus SQLite, PostgreSQL, MySQL\/MariaDB/u);
});

test("RC UX user-facing rows stay backed by visual sweep coverage", () => {
  const source = readText(checklistPath);
  const latestSweep = JSON.parse(readText(sweepOutputPath));
  const sweepPaths = collectStringPaths(latestSweep);

  assert.deepEqual(
    Object.keys(requiredVisualPathsByRow),
    requiredRows.filter((row) => row !== "rc-ux-db-migration-smoke"),
    "Every user-facing RC row except DB migration smoke must declare visual sweep path coverage",
  );

  for (const [rowId, requiredPaths] of Object.entries(requiredVisualPathsByRow)) {
    const section = sectionForRow(source, rowId);
    for (const requiredPath of requiredPaths) {
      assert.equal(
        sweepPaths.has(requiredPath),
        true,
        `${rowId} requires visual sweep coverage for ${requiredPath}`,
      );
      assert.match(
        section,
        new RegExp(requiredPath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")),
        `${rowId} evidence should name ${requiredPath}`,
      );
    }
  }
});

test("generated audit and visual sweep evidence preserves discovered query-string UI links", () => {
  const latestAudit = JSON.parse(readText(legacyAuditOutputPath));
  const latestSweep = JSON.parse(readText(sweepOutputPath));
  const auditLinks = new Set(latestAudit.discoveredPageLinks ?? []);
  const sweepPaths = collectStringPaths(latestSweep);
  const legacyAuditPagesByTarget = [
    ...(latestSweep.legacy?.legacyAuditPages ?? []),
    ...(latestSweep.local?.legacyAuditPages ?? []),
  ];
  const importedAuditPages = new Set(legacyAuditPagesByTarget);

  for (const requiredPath of requiredQueryStringUiLinks) {
    assert.equal(
      auditLinks.has(requiredPath),
      true,
      `legacy HTML audit discoveredPageLinks must keep ${requiredPath}`,
    );
    assert.equal(
      importedAuditPages.has(requiredPath),
      true,
      `visual sweep legacyAuditPages must import ${requiredPath}`,
    );
    assert.equal(
      sweepPaths.has(requiredPath),
      true,
      `visual sweep results must include rendered coverage evidence for ${requiredPath}`,
    );
  }
});

test("RC auth row documents REST JSON as the React submit boundary", () => {
  const source = readText(checklistPath);
  const section = sectionForRow(source, "rc-ux-public-auth");

  assert.match(section, /REST JSON/u);
  assert.match(
    section,
    /direct legacy POST routes only as no-JS\/deep-link\s+compatibility adapters/u,
  );
  assert.match(section, /frontend\/src\/form-submit-boundary\.spec\.tsx/u);
  assert.match(section, /frontend\/src\/auth-workspace-shell\.spec\.tsx/u);
  assert.match(section, /tests\/server-spa-rest-boundary-contract\.test\.mjs/u);
});

test("RC security row keeps concrete XSS, SQLi, and Markdown stability evidence", () => {
  const source = readText(checklistPath);
  const section = sectionForRow(source, "rc-ux-security-stability");

  assert.match(section, /docs\/provenance\/legacy-html-page-audit\.md/u);
  assert.match(section, /frontend\/tests\/legacy-rendered-page-audit\.e2e\.ts/u);
  assert.match(section, /frontend\/src\/markdown-renderer\.spec\.tsx/u);
  assert.match(section, /frontend\/src\/markdown-render-boundary\.spec\.tsx/u);
  assert.match(section, /ReactMarkdown path[\s\S]*Yona legacy compatibility plugins/u);
  assert.match(section, /server-rendered HTML fragments/u);
  assert.match(section, /tests\/search-parity\.e2e\.ts/u);
  assert.match(
    section,
    /search_contract[\s\S]*global_search_treats_sql_injection_probe_as_plain_keyword/u,
  );
  assert.match(section, /very long fenced[\s\S]*plain source without syntax highlighting/u);
});

test("RC visual status deltas are documented against the latest sweep output", () => {
  const checklist = readText(checklistPath);
  const visualProvenance = readText(visualProvenancePath);
  const latestSweep = JSON.parse(readText(sweepOutputPath));
  const statusDeltas = latestSweep.comparisonSummary?.statusDeltas ?? [];

  assert.ok(statusDeltas.length > 0, "latest visual sweep must expose status deltas explicitly");
  assert.match(checklist, /Expected legacy non-2xx observations are documented/u);
  assert.match(visualProvenance, /### Recorded Status Deltas/u);

  for (const delta of statusDeltas) {
    assert.match(
      visualProvenance,
      new RegExp(`\\\`${delta.path.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\\``),
      `${delta.path} must be documented in visual parity provenance`,
    );
  }
});
