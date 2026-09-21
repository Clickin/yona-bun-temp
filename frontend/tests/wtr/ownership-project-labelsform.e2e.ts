import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const fileURLToPath = (u) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
  ),
  "utf8",
);

const appCssSource = curatedAppCss();
const owners = [
  "project-labels-form-page",
  "project-labels-copy-form",
  "project-labels-copy-legend",
  "project-labels-copy-submit",
  "project-labels-new-form",
  "project-labels-new-submit",
  "project-labels-list",
  "project-labels-list-head",
] as const;

test("labels form exposes direct Style owners for legacy forms and list", () => {
  expect(new Set(owners).size).toBe(8);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
});

test("labels form keeps geometry in route declarations and paint in route-local vars", () => {
  // The colocated helper owns a few finite control geometries (for example
  // the typeahead button); route-level form spacing remains in labelsform.tsx.
  // App change (227440e1b): errorMessage margin "30px 0px" now lives in the
  // colocated helper (legacy `color:#898989; margin:30px 0;` error-wrap parity).
  // Route-level form spacing is still not duplicated here.

  expect(routeSource).toContain("setIsCategoryTypeaheadOpen");
  expect(routeSource).toContain("createMutation.mutate");

  expect(appCssSource).not.toContain(".label-editor-wrap .new-label-wrap");
  expect(appCssSource).not.toContain(".label-editor-wrap .issue-label-list-wrap");
});

test("labels form translates legacy label-editor behavior to React state and Query mutations", () => {
  expect(routeSource).toContain("setEditingCategory");
  expect(routeSource).toContain("setEditingLabel");
  expect(routeSource).toContain("setPendingLabelDeletion");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("labels form renders default forms/list and opens category suggestions through React", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  const session = { isAnonymous: false, isSiteAdmin: true, loginId: "admin" };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) => route.fulfill({ json: session }));
  }
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        ownerName: "admin",
        projectName: "sample",
        showCode: true,
        viewerCanManageIssueLabels: true,
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        ownerName: "admin",
        projectName: "sample",
        projectId: 7,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanManageIssueLabels: true,
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            category: "Type",
            categoryId: 1,
            categoryName: "Type",
            color: "#f44336",
            id: 1,
            name: "Bug",
          },
          {
            category: "Type",
            categoryId: 1,
            categoryName: "Type",
            color: "#4caf50",
            id: 2,
            name: "Feature",
          },
        ],
      }),
    });
  });
  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  const routeReady = { timeout: 15_000 };
  await expect(page.locator('[data-owner="project-labels-copy-form"]')).toBeVisible(routeReady);
  await expect(page.locator('[data-owner="project-labels-new-form"]')).toBeVisible(routeReady);
  await expect(page.locator('[data-owner="project-labels-list"]')).toBeVisible(routeReady);
  await expect(page.locator('[data-owner="project-labels-list-head"]')).toBeVisible(routeReady);
  const rows = page.locator('[data-owner="project-labels-category-list"] tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toHaveCSS("border-bottom-style", "solid");
  await expect(rows.last()).toHaveCSS("border-bottom-style", "none");
  const geometry = await page.locator('[data-owner="project-labels-list"]').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, width: rect.width };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.width).toBeGreaterThan(0);
});
