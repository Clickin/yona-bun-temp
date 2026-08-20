import { expect, test, type Page, type Route, mergedLegacyBlock } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("new pull request form owns legacy inline layout and preserves Select2 closed state", async ({
  page,
}) => {
  const source = readFileSync("src/routes/$ownerName/$projectName/newPullRequestForm.tsx", "utf8");
  const styleSource = readFileSync("src/app.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/git/create.scala.html", "utf8");
  const editorLegacy = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");
  expect(legacy).toContain('<div class="pull-request-wrap">');
  expect(editorLegacy).toContain('style="position:relative;overflow: visible;"');

  await mockNewPullRequestForm(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/newPullRequestForm`, { waitUntil: "commit" });

  const editorWrapper = page.locator('[data-owner="new-pull-request-editor-wrapper"]');
  await expect(editorWrapper).toHaveCSS("position", "relative");
  const editorTabContent = page.locator('[data-owner="new-pull-request-editor-tab-content"]');
  await expect(editorTabContent).toHaveCSS("position", "relative");
  await expect(editorTabContent).toHaveCSS("overflow", "visible");

  const picker = page.locator('[data-owner="new-pull-request-fromBranch-picker"]');
  await expect(picker).toHaveCSS("width", "220px");
  await expect(picker).not.toHaveAttribute("style", /width/u);
  await expect(picker.locator("button.select2-choice")).toHaveAttribute("aria-expanded", "false");
  await expect(picker.locator(".select2-drop")).not.toBeVisible();

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.locator("#preview-body")).toHaveClass(/active/u);
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("#edit-body")).toHaveClass(/active/u);

  await page.setViewportSize({ width: 390, height: 844 });
  const geometry = await editorWrapper.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { right: rect.right, viewport: window.innerWidth };
  });
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
});

test("new pull request conflict modal owns legacy center-txt alignment", async ({ page }) => {
  const source = readFileSync("src/routes/$ownerName/$projectName/newPullRequestForm.tsx", "utf8");
  const styleSource = readFileSync("src/app.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/common/scripts.scala.html", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  expect(legacy).toContain('<div class="center-txt buttons">');
  expect(commonLess).toContain(".center-txt    { text-align:center; }");

  await mockNewPullRequestForm(page, { conflict: true });
  await page.goto(`${basePath}/admin/sample/newPullRequestForm`, { waitUntil: "commit" });
  // bucket-3: the shell renders three forms with submit buttons (GNb search,
  // root login dialog, and the PR form — matching legacy navbar/loginDialog/
  // create), so the bare `form button[type="submit"]` selector was never unique.
  await page.locator('[data-owner="new-pull-request-form"] button[type="submit"]').click();

  const message = page.locator('[data-owner="new-pull-request-conflict-message"]');
  const actions = page.locator('[data-owner="new-pull-request-conflict-actions"]');
  await expect(message).toBeVisible();
  await expect(message).toHaveCSS("text-align", "center");
  await expect(actions).toBeVisible();
  await expect(actions).toHaveCSS("text-align", "center");
  await expect(actions).toHaveClass(/buttons/u);
  await expect(actions).toHaveClass(/mt20/u);
  await expect(actions).toHaveClass(/mb20/u);
});

async function mockNewPullRequestForm(page: Page, options: { conflict?: boolean } = {}) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "en",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        menuSetting: { board: true, code: true, issue: true, milestone: true, pullRequest: true },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "public",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/form-options**",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          fromBranches: [{ name: "feature/ui" }, { name: "main" }],
          fromProjects: [{ id: 7, ownerName: "admin", projectName: "sample" }],
          mode: "create",
          selected: {
            fromBranch: "feature/ui",
            fromProjectId: 7,
            toBranch: "main",
            toProjectId: 7,
          },
          toBranches: [{ name: "main" }],
          toProjects: [{ id: 7, ownerName: "admin", projectName: "sample" }],
        },
      }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          commits: [
            {
              authorDateLabel: "Jul 17, 2026",
              authorEmail: "admin@example.com",
              commitId: "abcdef1234567890",
              commitMessage: "Add UI",
              commitShortId: "abcdef1",
            },
          ],
          conflict: options.conflict ?? false,
        },
      }),
  );
}
