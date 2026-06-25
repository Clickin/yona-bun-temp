import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLegacyAuditPath } from "./legacy-route-coverage.mjs";

const rustRoutes = new Set([
  "/",
  "/$user",
  "/sites/$pageName",
  "/$owner/$projectName",
  "/$owner/$projectName/issue/$issueNumber",
  "/$owner/$projectName/issue/$issueNumber/editform",
  "/$owner/$projectName/post/$postNumber",
  "/$owner/$projectName/post/$postNumber/editform",
  "/$owner/$projectName/milestone/$milestoneId",
  "/$owner/$projectName/milestone/$milestoneId/editform",
  "/$owner/$projectName/pullRequest/$pullRequestNumber",
  "/$owner/$projectName/pullRequest/$pullRequestNumber/editform",
  "/$owner/$projectName/pullRequest/$pullRequestNumber/changes",
  "/$owner/$projectName/pullRequest/$pullRequestNumber/changes/$commitId",
  "/$owner/$projectName/commit/$commitId",
  "/$owner/$projectName/compare/$revisionRange",
  "/$owner/$projectName/commits/$branch",
  "/$owner/$projectName/commits/$branch/",
  "/$owner/$projectName/commits/$branch/$",
  "/$owner/$projectName/code/$branch",
  "/$owner/$projectName/code/$branch/",
  "/$owner/$projectName/code/$branch/$",
]);

test("normalizes legacy dynamic project paths to generated SPA route paths", () => {
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/issue/1", rustRoutes),
    "/$owner/$projectName/issue/$issueNumber",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/post/1/editform", rustRoutes),
    "/$owner/$projectName/post/$postNumber/editform",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/milestone/1", rustRoutes),
    "/$owner/$projectName/milestone/$milestoneId",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/pullRequest/1/changes/HEAD", rustRoutes),
    "/$owner/$projectName/pullRequest/$pullRequestNumber/changes/$commitId",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/compare/main...main", rustRoutes),
    "/$owner/$projectName/compare/$revisionRange",
  );
  assert.equal(
    normalizeLegacyAuditPath("/admin/sample/code/main/README.md", rustRoutes),
    "/$owner/$projectName/code/$branch/$",
  );
});

test("keeps reserved roots and site/user aliases bounded", () => {
  assert.equal(normalizeLegacyAuditPath("/", rustRoutes), "/");
  assert.equal(normalizeLegacyAuditPath("/admin", rustRoutes), "/$user");
  assert.equal(normalizeLegacyAuditPath("/sites/userList", rustRoutes), "/sites/$pageName");
  assert.equal(normalizeLegacyAuditPath("/projects", rustRoutes), "/projects");
});
