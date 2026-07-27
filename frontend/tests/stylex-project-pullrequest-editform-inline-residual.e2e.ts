import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync(
  "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
  "utf8",
);
const styleSource = readFileSync(
  "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-editform.stylex.ts",
  "utf8",
);

test("pull-request edit editor tab-content owns the legacy static layout", async ({ page }) => {
  expect(readFileSync("../yona-original/app/views/git/edit.scala.html", "utf8")).toContain(
    'style="position: relative;"',
  );
  expect(readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8")).toContain(
    "position:relative;overflow: visible",
  );
  expect(routeSource).not.toContain('style={{ position: "relative", overflow: "visible" }}');
  expect(styleSource).toContain('editorTabContent: { overflow: "visible", position: "relative" }');

  await mockEditForm(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);
  const editorTabs = page.locator('[data-stylex-owner="pull-request-edit-editor-tab-content"]');
  await expect(editorTabs).toHaveCount(1);
  await expect(editorTabs).toHaveCSS("position", "relative");
  await expect(editorTabs).toHaveCSS("overflow", "visible");
  await expect(page.locator("#editor-body-body")).toBeVisible();
});

test("pull-request conflict actions own legacy center-txt alignment", async ({ page }) => {
  expect(readFileSync("../yona-original/app/views/common/scripts.scala.html", "utf8")).toContain(
    '<div class="center-txt buttons">',
  );
  expect(routeSource).not.toContain('className="center-txt buttons"');
  expect(styleSource).toContain('conflictActions: { textAlign: "center" }');

  await mockEditForm(page, { conflict: true });
  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);
  await page.locator('button[type="submit"]').click();
  const actions = page.locator('[data-stylex-owner="pull-request-edit-conflict-actions"]');
  await expect(actions).toBeVisible();
  await expect(actions).toHaveCSS("text-align", "center");
  await expect(actions).toHaveClass(/buttons/u);
});

test("pull-request edit upload save help owns legacy right alignment", async ({ page }) => {
  expect(readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8")).toContain(
    '<p class="right-txt help">',
  );
  expect(
    readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8"),
  ).toContain(".right-txt     { text-align:right; }");
  expect(routeSource).not.toContain('<p className="right-txt help">');
  expect(routeSource).toContain('data-stylex-owner="pull-request-edit-upload-save-help"');
  expect(styleSource).toContain('uploadSaveHelp: { textAlign: "right" }');

  await mockEditForm(page);
  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);
  const help = page.locator('[data-stylex-owner="pull-request-edit-upload-save-help"]');
  await expect(help).toHaveCount(1);
  await expect(help).toContainText("Selected file will be attached when your comment is saved.");
  await expect(help).toHaveCSS("text-align", "right");
  await expect(help).toHaveClass(/help/u);
});

async function mockEditForm(page: Page, options: { conflict?: boolean } = {}) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ actorId: 1, isAnonymous: false, loginId: "admin" }),
    }),
  );
  await page.route("**/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify({ user: { loginId: "admin" } }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 7,
        menuSetting: { pullRequest: true },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/7/form-options", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        fromBranches: [{ name: "feature/ui", selected: true }],
        fromProjects: [{ id: 8, ownerName: "dev", projectName: "fork", selected: true }],
        mode: "edit",
        pullRequest: {
          bodyMarkdown: "Initial body",
          fromBranch: "feature/ui",
          fromOwnerName: "dev",
          fromProjectName: "fork",
          id: 90,
          state: "OPEN",
          title: "Initial title",
        },
        selected: { fromBranch: "feature/ui", fromProjectId: 8, toBranch: "main", toProjectId: 7 },
        toBranches: [{ name: "main", selected: true }],
        toProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ commits: [], conflict: options.conflict ?? false }),
    }),
  );
}
