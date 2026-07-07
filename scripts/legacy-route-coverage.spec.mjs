import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLegacyAuditPath } from "./legacy-route-coverage.mjs";

const rustRoutes = new Set([
  "/",
  "/$user",
  "/sites/$pageName",
  "/$ownerName/$projectName",
  "/$ownerName/$projectName/issue/$issueNumber",
  "/$ownerName/$projectName/issue/$issueNumber/editform",
  "/$ownerName/$projectName/post/$postNumber",
  "/$ownerName/$projectName/post/$postNumber/editform",
  "/$ownerName/$projectName/milestone/$milestoneId",
  "/$ownerName/$projectName/milestone/$milestoneId/editform",
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber",
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform",
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes",
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes/$commitId",
  "/$ownerName/$projectName/commit/$commitId",
  "/$ownerName/$projectName/compare/$revisionRange",
  "/$ownerName/$projectName/commits",
  "/$ownerName/$projectName/commits/$branch",
  "/$ownerName/$projectName/commits/$branch/",
  "/$ownerName/$projectName/commits/$branch/$",
  "/$ownerName/$projectName/code",
  "/$ownerName/$projectName/code/$branch",
  "/$ownerName/$projectName/code/$branch/",
  "/$ownerName/$projectName/code/$branch/$",
]);

test("normalizes legacy dynamic project paths to generated SPA route paths", () => {
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/issue/1", rustRoutes),
    "/$ownerName/$projectName/issue/$issueNumber",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/post/1/editform", rustRoutes),
    "/$ownerName/$projectName/post/$postNumber/editform",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/milestone/1", rustRoutes),
    "/$ownerName/$projectName/milestone/$milestoneId",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/pullRequest/1/changes/HEAD", rustRoutes),
    "/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes/$commitId",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/compare/main...main", rustRoutes),
    "/$ownerName/$projectName/compare/$revisionRange",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/code/main/README.md", rustRoutes),
    "/$ownerName/$projectName/code/$branch/$",
  );
});

test("falls back to the historical owner route parameter name for old route trees", () => {
  const historicalRustRoutes = new Set(["/$owner/$projectName/issues"]);

  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/issues", historicalRustRoutes),
    "/$owner/$projectName/issues",
  );
});

test("keeps reserved roots and site/user aliases bounded", () => {
  assert.equal(normalizeLegacyAuditPath("/", rustRoutes), "/");
  assert.equal(normalizeLegacyAuditPath("/admin", rustRoutes), "/$user");
  assert.equal(normalizeLegacyAuditPath("/sites/userList", rustRoutes), "/sites/$pageName");
  assert.equal(normalizeLegacyAuditPath("/projects", rustRoutes), "/projects");
});
