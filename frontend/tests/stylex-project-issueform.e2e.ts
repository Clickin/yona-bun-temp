import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url),
  "utf8",
);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project issue form preserves legacy editor layout with StyleX owners", async ({ page }) => {
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

test("issue form upload progress uses a dynamic route-local StyleX width", async ({ page }) => {
  const styles = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-issueform.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync("../yona-original/app/views/issue/create.scala.html", "utf8");
  const uploadLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  expect(legacy).toContain("@common.fileUploader(ResourceType.ISSUE_POST, null)");
  expect(uploadLess).toContain(".upload-progress");
  expect(SOURCE).toContain('data-stylex-owner="project-issue-form-upload-progress"');
  expect(SOURCE).toContain("issueFormStyles.uploadProgressBar(`${row.progress}%`)");
  expect(SOURCE).not.toContain("style={{ width: `${row.progress}%` }}");
  expect(styles).toContain("uploadProgressBar: (width: string) => ({ width })");

  let releaseUpload: (() => void) | undefined;
  const uploadPaused = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });
  await page.route("**/files", async (route) => {
    await uploadPaused;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 501,
        mimeType: "image/png",
        name: "diagram.png",
        size: 1,
        url: "/files/501/diagram.png",
      }),
    });
  });
  await mockIssueForm(page);
  await page.goto(`${basePath}/admin/sample/issueform`, { waitUntil: "commit" });

  const input = page.locator('#upload input[type="file"]');
  await input.setInputFiles({
    name: "diagram.png",
    mimeType: "image/png",
    buffer: Buffer.from("x"),
  });
  const progress = page.locator('[data-stylex-owner="project-issue-form-upload-progress"]');
  await expect(progress).toBeVisible();
  await expect(progress).toHaveAttribute("style", /--x-width:\s*1%/u);
  await expect(progress).not.toHaveAttribute("style", /(?:^|;)\s*width\s*:/u);
  const progressWidth = await progress.evaluate((element) => element.getBoundingClientRect().width);
  expect(progressWidth).toBeGreaterThan(0);
  expect(progressWidth).toBeLessThan(2);

  releaseUpload?.();
  await expect(progress).toHaveCount(0);
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
