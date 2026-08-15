import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const SOURCE = readFileSync("../src/routes/$ownerName/$projectName/issueform.tsx", "utf8");
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project issue form preserves legacy editor layout with Style owners", async ({ page }) => {
  page.on("pageerror", (error) => console.log(`[issueform-pageerror] ${error.message}`));
  await mockIssueForm(page);
  await page.goto(`${basePath}/admin/sample/issueform`, { waitUntil: "commit" });

  await expect(
    page.locator('link[href$="legacy-assets/stylesheets/legacy-fallback.css"]'),
  ).toHaveCount(process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1);
  await expect(page).toHaveTitle("New issue - admin/sample");
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator('[data-owner="project-issue-form"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="project-issue-form-title-row"]')).toBeVisible();
  const editorCell = page.locator('[data-owner="project-issue-form-editor"]');
  await expect(editorCell).toBeVisible();
  await expect(editorCell).toHaveCSS("position", "relative");
  const editorTabContent = page.locator('[data-owner="project-issue-form-editor-tab-content"]');
  await expect(editorTabContent).toHaveCSS("position", "relative");
  await expect(editorTabContent).toHaveCSS("overflow", "visible");
  const uploadShell = page.locator('[data-owner="project-issue-form-upload-shell"]');
  await expect(uploadShell).toBeVisible();
  await expect(uploadShell).toHaveCSS("position", "relative");
  await expect(uploadShell).toHaveCSS("box-sizing", "border-box");
  await expect(uploadShell).toHaveCSS("width", /\d+(?:\.\d+)?px/u);
  expect(
    await uploadShell.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(0);
  await expect(uploadShell).toHaveCSS("min-height", "70px");
  await expect(uploadShell).toHaveCSS("padding", "10px");
  const editorTextarea = page.locator('[data-owner="project-issue-form-editor-textarea"]');
  await expect(editorTextarea).toHaveCSS("height", /\d+px/u);
  await expect(editorTextarea).toHaveCSS("overflow", "hidden");
  await expect(editorTextarea).toHaveCSS("overflow-wrap", "break-word");
  await expect(page.locator('[data-owner="project-issue-form-actions"]')).toBeVisible();
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator("#button-save")).toBeVisible();
  await expect(page.locator("#draft-save-btn")).toBeVisible();
  // F5 (2026-08-15): all legacy plugin attributes are gone — React owns the
  // form's behaviors (AGENTS.md plugin-attribute rule); the 2026-08-11 pin
  // counted one remaining data-toggle that has since been converted.
  await expect(page.locator("[data-toggle], [data-request-method], [data-dismiss]")).toHaveCount(0);

  const geometry = await page
    .locator('[data-owner="project-issue-form-columns"]')
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

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(uploadShell).toHaveCSS("min-height", "100px");
  await expect(page.locator(".project-menu-outer")).toBeVisible();
});

test("issue form upload progress uses a dynamic route-local Style width", async ({ page }) => {
  const styles =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/issue/create.scala.html", "utf8");
  const uploadLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const uploaderSource = readFileSync("../src/components/file-uploader.tsx", "utf8");
  expect(legacy).toContain("@common.fileUploader(ResourceType.ISSUE_POST, null)");
  expect(uploadLess).toContain(".upload-progress");
  expect(uploaderSource).toContain('data-owner="project-issue-form-upload-progress"');

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
  const progress = page.locator('[data-owner="project-issue-form-upload-progress"]');
  const progressShell = page.locator('[data-owner="project-issue-form-upload-progress-shell"]');
  await expect(progress).toBeVisible();
  await expect(progressShell).toBeVisible();
  expect(await progressShell.evaluate((element) => element.tagName)).toBe("DIV");
  await expect(progressShell).toHaveClass(/\bprogress\b/u);
  await expect(progressShell).toHaveClass(/\bupload-progress\b/u);
  await expect(progressShell.locator("xpath=..")).toHaveClass(/\bpull-right\b/u);
  await expect(progressShell).toHaveCSS("display", "inline-block");
  await expect(progressShell).toHaveCSS("width", "100px");
  await expect(progressShell).toHaveCSS("height", "7px");
  await expect(progressShell).toHaveCSS("margin-top", "0px");
  await expect(progressShell).toHaveCSS("margin-bottom", "0px");
  await expect(progressShell).toHaveCSS("overflow", "hidden");
  await expect(progressShell).toHaveCSS("vertical-align", "middle");
  await expect(progressShell).toHaveCSS("background-color", "rgb(240, 240, 240)");
  await expect(progressShell).toHaveCSS("box-shadow", /inset/u);
  expect(
    await progressShell.evaluate((element) => element.getBoundingClientRect().toJSON()),
  ).toMatchObject({
    height: 7,
    width: 100,
  });
  await expect(progress).toHaveCSS("background-color", "rgb(243, 108, 34)");
  await expect(progress).toHaveCSS("display", "block");
  await expect(progress).toHaveCSS("height", "7px");
  const progressWidth = await progress.evaluate((element) => element.getBoundingClientRect().width);
  expect(progressWidth).toBeGreaterThan(0);
  expect(progressWidth).toBeLessThan(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(progressShell).toHaveCSS("display", "inline-block");
  await expect(progressShell).toHaveCSS("width", "100px");
  await expect(progressShell).toHaveCSS("height", "7px");
  await expect(progressShell).toHaveCSS("margin-top", "0px");
  await expect(progressShell).toHaveCSS("margin-bottom", "0px");
  await expect(progressShell).toHaveCSS("overflow", "hidden");
  await expect(progressShell).toHaveCSS("vertical-align", "middle");
  await expect(progressShell).toHaveCSS("background-color", "rgb(240, 240, 240)");
  await expect(progressShell).toHaveCSS("box-shadow", /inset/u);
  expect(
    await progressShell.evaluate((element) => element.getBoundingClientRect().toJSON()),
  ).toMatchObject({
    height: 7,
    width: 100,
  });
  await expect(progress).toHaveCSS("background-color", "rgb(243, 108, 34)");
  await expect(progress).toHaveCSS("display", "block");
  await expect(progress).toHaveCSS("height", "7px");
  expect(await progress.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThan(
    2,
  );

  releaseUpload?.();
  await expect(progress).toHaveCount(0);
});

test("issue form attachment save help owns right alignment in Style", async ({ page }) => {
  const route = readFileSync("../src/routes/$ownerName/$projectName/issueform.tsx", "utf8");
  const styles =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  const uploaderSource = readFileSync("../src/components/file-uploader.tsx", "utf8");
  expect(legacy).toContain('<p class="right-txt help">');
  expect(uploaderSource).toContain('helpOwner="project-issue-form-upload-attach-save-help"');
  expect(route).not.toContain("right-txt help attach-save-help");

  await page.route("**/files", async (route) => {
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
  await page.locator('#upload input[type="file"]').setInputFiles({
    name: "diagram.png",
    mimeType: "image/png",
    buffer: Buffer.from("x"),
  });
  const help = page.locator('[data-owner="project-issue-form-upload-attach-save-help"]');
  await expect(help).toBeVisible();
  await expect(help).not.toHaveClass(/right-txt/u);
  await expect(help).toHaveCSS("display", "block");
  await expect(help).toHaveCSS("text-align", "right");
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
  await page.route("**/api/v1/auth/session", async (route) => {
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
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
