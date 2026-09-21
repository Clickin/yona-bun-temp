import { readFileSync, curatedAppCss as _curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. fileURLToPath yields the served URL
// pathname so string mapping + .txt raw-suffix applies.
const fileURLToPath = (u: URL) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
      import.meta.url,
    ),
  ),
  "utf8",
);

test("pull request detail declares Style owners and paint-only theme", () => {
  for (const owner of [
    "pull-request-detail-page",
    "pull-request-detail-body",
    "pull-request-detail-content",
    "pull-request-detail-state",
    "pull-request-detail-actions",
    "pull-request-detail-comments",
  ])
    expect(routeSource).toContain(`data-owner="${owner}"`);

  expect(routeSource).not.toContain("document.querySelector");
});

test("pull request detail renders markdown, state, and actions", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT" },
    }),
  );
  // Bucket-3 fix (wave 22): the app fetches owners/admin/projects/sample/pull-requests/1
  // (src/api/pull-requests.ts projectPath), not projects/admin/sample/pullRequests/1.
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/1", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        pullRequestNumber: 1,
        title: "Improve docs",
        bodyMarkdown: "Pull request **body**",
        state: "OPEN",
        contributor: { loginId: "admin", userLabel: "Admin", avatarUrl: "" },
        permissions: { canWatch: true, canUpdate: true, canUpdateState: true },
        isWatching: false,
        attachments: [],
        events: [],
        commits: [],
      },
    }),
  );
  await page.goto("/yona/admin/sample/pullRequest/1");
  await expect(page.locator('[data-owner="pull-request-detail-content"]')).toContainText(
    "Pull request body",
  );
  await expect(page.locator('[data-owner="pull-request-detail-state"]')).toBeVisible();
  await expect(page.locator('[data-owner="pull-request-detail-actions"]')).toBeVisible();
});
