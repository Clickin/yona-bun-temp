import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
      import.meta.url,
    ),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/-pull-request-detail.stylex.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);

test("pull request detail declares StyleX owners and paint-only theme", () => {
  for (const owner of [
    "pull-request-detail-page",
    "pull-request-detail-body",
    "pull-request-detail-content",
    "pull-request-detail-state",
    "pull-request-detail-actions",
    "pull-request-detail-comments",
  ])
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  const themeBlock = styleSource.slice(
    styleSource.indexOf("stylex.defineVars({"),
    styleSource.indexOf("});") + 3,
  );
  expect(themeBlock).toContain("mutedText");
  for (const geometry of ["margin:", "padding:", "width:", "height:"])
    expect(themeBlock).not.toContain(geometry);
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/pullRequests/1", (route) =>
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
  await expect(page.locator('[data-stylex-owner="pull-request-detail-content"]')).toContainText(
    "Pull request body",
  );
  await expect(page.locator('[data-stylex-owner="pull-request-detail-state"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="pull-request-detail-actions"]')).toBeVisible();
});
