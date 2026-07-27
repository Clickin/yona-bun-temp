import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacyUploader = new URL(
  "../../yona-original/app/views/common/fileUploader.scala.html",
  import.meta.url,
);
const legacyUploadForm = new URL(
  "../../yona-original/app/views/common/uploadForm.scala.html",
  import.meta.url,
);
const legacyCreate = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const legacyUiStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  import.meta.url,
);
const legacyCommonStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const legacyResponsiveStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const legacyYobiStyles = new URL(
  "../../yona-original/app/assets/stylesheets/yobi.less",
  import.meta.url,
);
const legacyBootstrap = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);
const legacyBootstrapResponsive = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  import.meta.url,
);
const legacyMessages = new URL("../../yona-original/conf/messages", import.meta.url);
const appStyles = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("issueform attachment rows own active React-matched StyleX geometry", async ({ page }) => {
  const [
    route,
    style,
    uploader,
    uploadForm,
    create,
    less,
    uiLess,
    commonLess,
    responsiveLess,
    yobi,
    bootstrap,
    bootstrapResponsive,
    messages,
    css,
  ] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyUploader, "utf8"),
    readFile(legacyUploadForm, "utf8"),
    readFile(legacyCreate, "utf8"),
    readFile(legacyStyles, "utf8"),
    readFile(legacyUiStyles, "utf8"),
    readFile(legacyCommonStyles, "utf8"),
    readFile(legacyResponsiveStyles, "utf8"),
    readFile(legacyYobiStyles, "utf8"),
    readFile(legacyBootstrap, "utf8"),
    readFile(legacyBootstrapResponsive, "utf8"),
    readFile(legacyMessages, "utf8"),
    readFile(appStyles, "utf8"),
  ]);

  expect(create).toContain("@common.fileUploader(ResourceType.ISSUE_POST, null)");
  expect(uploader).toContain('<li class="attached-file"');
  expect(uploader).toContain('class="name"');
  expect(uploader).toContain('class="btn-transparent btn-delete pull-right"');
  expect(uploadForm).toContain('class="help help-pastable"');
  expect(uploadForm).toContain('class="nbtn medium white fake-file-wrap"');
  expect(uploadForm).toContain('class="file"');
  expect(less).toContain(".upload-wrap {");
  expect(less).toContain(".attached-files {");
  expect(less).toContain(".attached-file {");
  expect(less).toContain(".btn-delete {");
  expect(uiLess).toContain(".fake-file-wrap {");
  expect(uiLess).toContain(".file {");
  expect(commonLess).toContain(".upload-progress {");
  expect(responsiveLess).toContain("@media");
  expect(yobi).toContain('@import "less/_common.less";');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(bootstrap).toContain(".pull-right {");
  expect(bootstrapResponsive).toContain("@media");
  expect(messages).toContain("common.attach.clickToPost");

  for (const owner of [
    "attachedFilesVisible",
    "attachedFile",
    "attachedFileMain",
    "attachedFileMainDisabled",
    "attachedFileMainIcon",
    "attachedFileName",
    "uploadError",
    "attachedFileDelete",
    "uploadProgressWrapper",
    "uploadHelpPastable",
    "uploadFakeFile",
    "uploadFileInput",
    "uploadAttachSaveHelp",
    "attachedFileInsertCopy",
  ]) {
    expect(style).toContain(owner);
  }
  for (const owner of [
    "project-issue-form-attached-files",
    "project-issue-form-attached-file",
    "project-issue-form-attached-file-main",
    "project-issue-form-attached-file-main-icon",
    "project-issue-form-attached-file-name",
    "project-issue-form-upload-error",
    "project-issue-form-attached-file-delete",
    "project-issue-form-upload-progress-wrapper",
    "project-issue-form-upload-help-pastable",
    "project-issue-form-upload-fake-file",
    "project-issue-form-upload-file-input",
    "project-issue-form-upload-attach-save-help",
    "project-issue-form-attached-file-insert-copy",
  ]) {
    expect(route).toContain(owner);
  }

  expect(css).not.toContain(".issue-form-page-wrap .attached-files.has-files");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main:disabled {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main > i {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main .name {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file .upload-error {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file .btn-delete {");
  for (const retiredSelector of [
    ".issue-form-page-wrap #upload .help-pastable",
    ".issue-form-page-wrap #upload .fake-file-wrap.nbtn.medium",
    ".issue-form-page-wrap #upload .fake-file-wrap .file",
    ".issue-form-page-wrap #upload > .attach-save-help",
    ".issue-form-page-wrap .attached-file .btn-insert-copy",
  ]) {
    expect(css).not.toContain(`${retiredSelector} {`);
  }
  // Generic upload/fake-file and legacy `.attached-file` rules remain intentionally frozen.
  expect(css).toContain(".attached-file {");
  // The frozen uploader emits `.btn-insert`, but the current React owner emits
  // `.btn-insert-copy` and owns its ready-state presentation in StyleX. Keep
  // the generated/frozen legacy fallback intact while removing the dead app.css
  // bridge arms.
  for (const retiredSelector of [
    ".attached-file .btn-insert",
    ".attached-file .btn-insert:hover",
    ".attached-file.complete .btn-insert",
  ]) {
    expect(css).not.toContain(`${retiredSelector} {`);
  }
  expect(css).toContain(".attached-file.complete .progress {");
  expect(css).toContain(".write-comment-box .upload-wrap .help-pastable");
  expect(style).toContain('cursor: "default"');
  expect(style).toContain("opacity: 0.65");
  expect(style).toContain('display: "inline-block"');
  expect(style).toContain('width: "auto"');
  expect(style).toContain('margin: "0 3px 0 0"');
  expect(style).toMatch(/attachedFileDelete:\s*\{[\s\S]*?float: "right"/);
  expect(style).toMatch(/uploadProgressWrapper:\s*\{\s*float: "right"\s*\}/);
  expect(route).not.toContain("pull-right");
  expect(route).toContain('data-stylex-owner="project-issue-form-upload-progress-wrapper"');
  expect(route).toContain('data-stylex-owner="project-issue-form-upload-progress-shell"');
  expect(route).toContain('disabled={!row.attachment || row.status !== "ready"}');
  expect(route).toContain('row.status !== "ready" && issueFormStyles.attachedFileMainDisabled');

  let releaseUpload: (() => void) | undefined;
  const uploadGate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });
  await mockIssueForm(page, uploadGate);
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto(`${basePath}/admin/sample/issueform`, { waitUntil: "commit" });
  const fileInput = page.locator('[data-stylex-owner="project-issue-form-upload-file-input"]');
  await fileInput.setInputFiles({
    buffer: Buffer.from("attachment fixture"),
    mimeType: "text/plain",
    name: "fixture.txt",
  });

  const row = page.locator('[data-stylex-owner="project-issue-form-attached-file"]');
  const progressWrapper = page.locator(
    '[data-stylex-owner="project-issue-form-upload-progress-wrapper"]',
  );
  const progress = page.locator('[data-stylex-owner="project-issue-form-upload-progress-shell"]');
  const deleteButton = page.locator(
    '[data-stylex-owner="project-issue-form-attached-file-delete"]',
  );
  await expect(row).toBeVisible();
  await expect(progressWrapper).toBeVisible();
  await expect(progress).toBeVisible();
  await expect(deleteButton).toBeDisabled();
  await expect(progressWrapper).toHaveCSS("float", "right");
  await expect(deleteButton).toHaveCSS("float", "right");
  await expect(progress).toHaveClass(/upload-progress/);
  await expect(deleteButton).toHaveClass(/btn-delete/);
  await expect(deleteButton).not.toHaveClass(/pull-right/);
  await expect(progressWrapper).not.toHaveClass(/pull-right/);

  const uploadingGeometry = await row.evaluate((element) => {
    const rowRect = element.getBoundingClientRect();
    const progressRect = element
      .querySelector<HTMLElement>('[data-stylex-owner="project-issue-form-upload-progress-shell"]')
      ?.getBoundingClientRect();
    const deleteRect = element
      .querySelector<HTMLElement>('[data-stylex-owner="project-issue-form-attached-file-delete"]')
      ?.getBoundingClientRect();
    return {
      deleteRight: deleteRect?.right ?? 0,
      progressRight: progressRect?.right ?? 0,
      rowLeft: rowRect.left,
      rowRight: rowRect.right,
      rowScrollWidth: element.scrollWidth,
      rowWidth: element.clientWidth,
      viewport: document.documentElement.clientWidth,
    };
  });
  expect(uploadingGeometry.deleteRight).toBeLessThanOrEqual(uploadingGeometry.rowRight + 1);
  expect(uploadingGeometry.progressRight).toBeLessThanOrEqual(uploadingGeometry.rowRight + 1);
  expect(uploadingGeometry.rowLeft).toBeGreaterThanOrEqual(0);
  expect(uploadingGeometry.rowScrollWidth).toBe(uploadingGeometry.rowWidth);
  expect(uploadingGeometry.rowRight).toBeLessThanOrEqual(uploadingGeometry.viewport + 1);

  await page.setViewportSize({ height: 844, width: 390 });
  const mobileUploadingGeometry = await row.evaluate((element) => {
    const rowRect = element.getBoundingClientRect();
    const uploadRect = element.closest<HTMLElement>("#upload")?.getBoundingClientRect();
    return {
      rowBottom: rowRect.bottom,
      rowLeft: rowRect.left,
      rowRight: rowRect.right,
      rowScrollWidth: element.scrollWidth,
      rowWidth: element.clientWidth,
      uploadLeft: uploadRect?.left ?? 0,
      uploadRight: uploadRect?.right ?? 0,
      uploadScrollWidth: element.closest<HTMLElement>("#upload")?.scrollWidth ?? 0,
      uploadWidth: element.closest<HTMLElement>("#upload")?.clientWidth ?? 0,
      viewport: document.documentElement.clientWidth,
    };
  });
  expect(mobileUploadingGeometry.rowLeft).toBeGreaterThanOrEqual(0);
  expect(mobileUploadingGeometry.rowRight).toBeLessThanOrEqual(mobileUploadingGeometry.viewport);
  expect(mobileUploadingGeometry.rowBottom).toBeGreaterThan(0);
  expect(mobileUploadingGeometry.rowScrollWidth).toBe(mobileUploadingGeometry.rowWidth);
  expect(mobileUploadingGeometry.uploadLeft).toBeGreaterThanOrEqual(0);
  expect(mobileUploadingGeometry.uploadRight).toBeLessThanOrEqual(mobileUploadingGeometry.viewport);
  expect(mobileUploadingGeometry.uploadScrollWidth).toBe(mobileUploadingGeometry.uploadWidth);

  releaseUpload?.();
  await expect(progress).toHaveCount(0);
  await expect(deleteButton).toBeEnabled();
  await expect(row).toHaveClass(/complete/);
  await expect(row.locator(".btn-insert-copy")).toBeVisible();
  await row.locator(".attached-file-main").click();
  await expect(page.locator("#editor-body-body")).toHaveValue(/fixture\.txt/);
  await deleteButton.click();
  await expect(row).toHaveCount(0);
});

async function mockIssueForm(page: Page, uploadGate: Promise<void>) {
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
        watchedProjects: [],
        session: {
          actorId: 1,
          isAnonymous: false,
          isSiteAdmin: true,
          loginId: "admin",
          userLabel: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
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
  await page.route("**/files", async (route) => {
    await uploadGate;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 77,
        mimeType: "text/plain",
        name: "fixture.txt",
        size: 18,
        url: "/yona/files/77",
      }),
    });
  });
  await page.route("**/files/77", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
}
