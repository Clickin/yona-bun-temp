import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacyCreate = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const legacyAssignee = new URL(
  "../../yona-original/app/views/issue/partial_assignee.scala.html",
  import.meta.url,
);
const legacyOverride = new URL(
  "../../yona-original/app/assets/stylesheets/less/_override.less",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("issueform assignee control keeps route-local StyleX geometry", async ({ page }) => {
  const [route, style, create, assignee, override, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyCreate, "utf8"),
    readFile(legacyAssignee, "utf8"),
    readFile(legacyOverride, "utf8"),
    readFile(appStyles, "utf8"),
  ]);
  expect(create).toContain("@partial_assignee(project, null)");
  expect(assignee).toContain('id="assignee"');
  expect(assignee).toContain('name="assigneeLoginId"');
  expect(override).toContain(".select2-container");
  expect(override).toContain(".select2-choice");
  for (const owner of ["assigneeControl", "assigneeControlInput", "assigneeValue"]) {
    expect(style).toContain(owner);
  }
  for (const marker of [
    "project-issue-form-assignee-picker",
    "project-issue-form-assignee-control-input",
    "project-issue-form-assignee-value",
  ]) {
    expect(route).toContain(marker);
  }
  expect(css).not.toContain(".issue-form-page-wrap .issue-assignee-control,");
  expect(css).not.toContain(".issue-form-page-wrap .issue-assignee-control > input {");
  expect(css).not.toContain(".issue-form-page-wrap .issue-assignee-value {");
  // Select2's shared container/choice cascade remains owned by frozen legacy CSS.
  expect(css).toContain(".issue-form-page-wrap .issue-combobox-options {");

  await mockIssueForm(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/issueform`, { waitUntil: "commit" });
  await expect(page.locator("#issue-form")).toBeVisible();
  const control = page.locator('[data-stylex-owner="project-issue-form-assignee-picker"]');
  const value = page.locator('[data-stylex-owner="project-issue-form-assignee-value"]');
  const input = page.locator('[data-stylex-owner="project-issue-form-assignee-control-input"]');
  await expect(control).toBeVisible();
  await expect(value).toBeVisible();
  await expect(control).toHaveCSS("height", "30px");
  // Frozen Select2's offscreen accessibility helper remains the effective height owner.
  await expect(input).toHaveCSS("height", "1px");
  await expect(input).toHaveCSS("display", "block");
  await expect(value).toHaveCSS("overflow", "hidden");
  const desktop = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { height: rect.height, width: rect.width };
  });
  expect(desktop.height).toBeCloseTo(30, 0);
  expect(desktop.width).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await control.scrollIntoViewIfNeeded();
  const mobile = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { bottom: rect.bottom, height: rect.height, left: rect.left, width: rect.width };
  });
  expect(mobile.height).toBeCloseTo(30, 0);
  expect(mobile.width).toBeGreaterThan(0);
  expect(mobile.left).toBeGreaterThanOrEqual(0);
  expect(mobile.bottom).toBeLessThanOrEqual(844);
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
      body: JSON.stringify({
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
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/form-options", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canCreateIssueAssignee: true,
        canCreateIssueMilestone: false,
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
}
