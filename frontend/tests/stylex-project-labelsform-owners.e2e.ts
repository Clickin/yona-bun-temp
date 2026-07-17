import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/-labelsform.stylex.ts", import.meta.url),
  ),
  "utf8",
);
const owners = [
  "project-labels-category-list",
  "project-labels-edit-category-modal",
  "project-labels-edit-label-modal",
  "project-labels-preset-color",
] as const;

async function mockLabelsPage(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-labels" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        backgroundUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isFavorited: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        ownerName: "admin",
        projectId: 7,
        projectName: "sample",
        showCode: true,
        showBoard: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  // The parent project layout loads `/container` before the labels child route.
  // Keep this response separate from `/settings`, which the child screen owns.
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        isFavorite: false,
        isPrivate: false,
        isWatching: true,
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        openIssueCount: 1,
        openPullRequestCount: 0,
        ownerName: "admin",
        postCount: 1,
        projectId: 7,
        projectName: "sample",
        reviewCount: 0,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanManageIssueLabels: true,
        viewerCanUpdate: true,
        viewerCanWatch: true,
        watchCount: 1,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            category: "type",
            categoryId: 3,
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#e11d48",
            id: 8,
            name: "bug",
          },
          {
            category: "type",
            categoryId: 3,
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#3f51b5",
            id: 9,
            name: "feature",
          },
          {
            category: "priority",
            categoryId: 4,
            categoryIsExclusive: true,
            categoryName: "priority",
            color: "#ff9800",
            id: 10,
            name: "high",
          },
        ],
      }),
    });
  });
}

test("labels form source exposes residual StyleX owners", () => {
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('from "./-labelsform.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
});

test("populated labels form keeps category and edit modal owners within the viewport", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockLabelsPage(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/labelsform`);

  const category = page.locator('[data-stylex-owner="project-labels-category-list"]').first();
  await expect(category).toBeVisible();
  await expect(category.locator('[data-stylex-owner="project-labels-preset-color"]')).toHaveCount(
    0,
  );
  await category.locator("button.ybtn-mini").click();
  await expect(
    page.locator('[data-stylex-owner="project-labels-edit-category-modal"]'),
  ).toBeVisible();
  await page.locator("#editCategory button.ybtn-default").click();

  await category.locator("button.ybtn-small").last().click();
  const editLabel = page.locator('[data-stylex-owner="project-labels-edit-label-modal"]');
  await expect(editLabel).toBeVisible();
  await expect(editLabel.locator('[data-stylex-owner="project-labels-preset-color"]')).toHaveCount(
    12,
  );
  const box = await editLabel.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.right ?? 0).toBeLessThanOrEqual(1366);

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(overflow).toBe(true);
});
