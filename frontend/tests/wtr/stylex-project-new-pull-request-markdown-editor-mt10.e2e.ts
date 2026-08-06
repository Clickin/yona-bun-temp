// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test, type Page } from "../wtr-compat.ts";
import type { Route } from "@playwright/test";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-new-pull-request-markdown-editor-mt10",
  fallbackOff ? "fallback-off" : "normal",
);
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/newPullRequestForm.tsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/-new-pull-request.stylex.ts", import.meta.url),
  "utf8",
);
const legacyPullRequestSource = readFileSync(
  new URL("../../yona-original/app/views/git/create.scala.html", import.meta.url),
  "utf8",
);
const legacyEditorSource = readFileSync(
  new URL("../../yona-original/app/views/common/editor.scala.html", import.meta.url),
  "utf8",
);
const legacyCommonLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("new pull request markdown editor keeps legacy mt10 ownership and tabs", async ({ page }) => {
  expect(legacyPullRequestSource).toContain('@common.editor("body"');
  expect(legacyEditorSource).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyCommonLessSource).toContain(".mt10 { margin-top:10px; }");

  // bucket-3: the mt10 wrapper class and owner moved into the shared editor
  // component; the route passes them via wrapperClassName/owners props (the old
  // className / data-stylex-owner pins matched the intermediate inline state).
  expect(routeSource).toContain(
    'wrapperClassName={`mt10 ${stylex.props(styles.markdownEditorWrapper).className ?? ""}`.trim()}',
  );
  expect(routeSource).toContain('wrapper: "new-pull-request-markdown-editor-wrapper"');
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
  expect(styleSource).toContain('markdownEditorWrapper: { marginTop: "10px" }');

  await mockNewPullRequestForm(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/newPullRequestForm`, { waitUntil: "commit" });

    const editor = page.locator('[data-stylex-owner="new-pull-request-markdown-editor-wrapper"]');
    await expect(editor).toBeVisible();
    await expect(editor).toHaveClass(/\bmt10\b/u);
    await expect(editor).toHaveCSS("margin-top", "10px");
    await expect(editor).not.toHaveAttribute("style", /.+/u);
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const tabs = editor.locator(".nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).locator("button")).toHaveText("Edit");
    await expect(tabs.nth(1).locator("button")).toHaveText("Preview");
    await expect(tabs.nth(2).locator("button")).toHaveText("Add checklist");
    await expect(tabs.nth(3).locator("button")).toHaveText("Clear Temporary");
    await expect(editor.locator("#edit-body")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#preview-body")).not.toHaveClass(/\bactive\b/u);

    await tabs.nth(1).locator("button").click();
    await expect(editor.locator("#preview-body")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#edit-body")).not.toHaveClass(/\bactive\b/u);
    await tabs.nth(0).locator("button").click();
    await expect(editor.locator("#edit-body")).toHaveClass(/\bactive\b/u);

    const metrics = await editor.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        right: box.right,
        top: box.top,
        viewportWidth: window.innerWidth,
      };
    });
    expect(metrics.top).toBeGreaterThan(0);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.bottom).toBeGreaterThan(metrics.top);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockNewPullRequestForm(page: Page) {
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
          conflict: false,
        },
      }),
  );
}
