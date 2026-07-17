import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url),
  "utf8",
);

test("project issue form preserves legacy editor layout with StyleX owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  page.on("pageerror", (error) => console.log(`[issueform-pageerror] ${error.message}`));
  await mockIssueForm(page);
  await page.goto(`${basePath}/admin/sample/issueform`, { waitUntil: "commit" });

  await expect(page).toHaveTitle("New issue - admin/sample");
  await expect(page.locator('[data-stylex-owner="project-issue-form"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="project-issue-form-title-row"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-issue-form-editor"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-issue-form-actions"]')).toBeVisible();
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator("#button-save")).toBeVisible();
  await expect(page.locator("#draft-save-btn")).toBeVisible();
  await expect(page.locator("[data-toggle], [data-request-method], [data-dismiss]")).toHaveCount(0);

  const geometry = await page
    .locator('[data-stylex-owner="project-issue-form-columns"]')
    .evaluate((columns) => {
      const left = columns.querySelector<HTMLElement>(".span-left-pane");
      const right = columns.querySelector<HTMLElement>(".right-menu");
      if (!left || !right) throw new Error("Missing issue form columns");
      return {
        columnsWidth: Math.round(columns.getBoundingClientRect().width),
        leftWidth: Math.round(left.getBoundingClientRect().width),
        rightWidth: Math.round(right.getBoundingClientRect().width),
      };
    });
  expect(geometry.columnsWidth).toBeGreaterThan(0);
  expect(geometry.leftWidth).toBeGreaterThan(geometry.rightWidth);

  expect(SOURCE).toContain('id="issue-form"');
  expect(SOURCE).toContain('id="button-save"');
  expect(SOURCE).toContain('id="draft-save-btn"');
  expect(SOURCE).toContain("IssuePostFileUploader");
  expect(SOURCE).not.toContain("$yobi.loadModule");
  expect(SOURCE).not.toContain('data-toggle="select2"');
  expect(SOURCE).not.toMatch(/href="javascript:/u);
});

async function mockIssueForm(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-issue-form" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        emails: [],
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        session: {
          actorId: 1,
          isAnonymous: false,
          isSiteAdmin: true,
          loginId: "admin",
          userLabel: "Site Admin",
        },
        watchedProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectPayload()),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ labels: [] }) });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/form-options", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canCreateIssueAssignee: false,
        canCreateIssueMilestone: true,
        canManageIssueLabels: false,
        currentProject: { logoUrl: "", ownerName: "admin", projectId: 7, projectName: "sample" },
        issueTemplateMarkdown: "",
        movableIssueProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/parent-options**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [] }) });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestones: [] }),
    });
  });
}

function projectPayload() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrolledUsers: [],
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    openIssueCount: 0,
    openPullRequestCount: 0,
    organizationName: "",
    ownerName: "admin",
    postCount: 0,
    projectId: 7,
    projectName: "sample",
    projectScope: "PUBLIC",
    showMilestone: true,
    vcs: "GIT",
    viewerCanUpdate: true,
  };
}
