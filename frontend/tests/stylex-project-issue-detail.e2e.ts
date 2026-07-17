import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
  ),
  "utf8",
);

test("issue detail keeps direct StyleX owners and paint-only theme", () => {
  for (const owner of [
    "project-issue-detail-page",
    "project-issue-detail-header",
    "project-issue-detail-body",
    "project-issue-detail-content",
    "project-issue-detail-actions",
    "project-issue-detail-sidebar",
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
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("issue detail renders legacy header, markdown body, and action owners", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const session = {
    isAnonymous: false,
    isSiteAdmin: true,
    isConfirmed: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/11", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 42,
        number: 11,
        title: "Fix flaky issue",
        state: "OPEN",
        bodyMarkdown: "Body **markdown**",
        authorLoginId: "admin",
        authorLabel: "Site Admin",
        authorAvatarUrl: "",
        createdLabel: "Jul 1, 2026",
        createdDate: "Jul 1, 2026",
        canUpdate: true,
        canWatch: true,
        isWatching: false,
        isFavorited: false,
        isDraft: false,
        weight: 2,
        voters: [],
        sharers: [],
        comments: [],
        childIssues: [],
        attachments: [],
        labels: [],
        milestone: null,
        assigneeLoginId: null,
        commentCount: 0,
      },
    }),
  );
  await page.goto("/yona/admin/sample/issue/11");
  await expect(page.locator('[data-stylex-owner="project-issue-detail-header"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-issue-detail-content"]')).toContainText(
    "Body markdown",
  );
  await expect(page.locator('[data-stylex-owner="project-issue-detail-actions"]')).toBeVisible();
});
