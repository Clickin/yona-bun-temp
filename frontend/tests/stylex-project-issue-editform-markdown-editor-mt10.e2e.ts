import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-issue-editform-markdown-editor-mt10",
  fallbackOff ? "fallback-off" : "normal",
);
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/issue/$issueNumber/-issue-editform.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);
const legacyIssueSource = readFileSync(
  new URL("../../yona-original/app/views/issue/edit.scala.html", import.meta.url),
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

test("issue editform markdown editor keeps legacy mt10 ownership and tabs", async ({ page }) => {
  expect(legacyIssueSource).toContain('@common.editor("body"');
  expect(legacyEditorSource).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyCommonLessSource).toContain(".mt10 { margin-top:10px; }");

  expect(routeSource).toContain(
    "markdownEditorWrapper: stylex.props(styles.markdownEditorWrapper)",
  );
  expect(routeSource).toContain('data-stylex-owner="issue-editform-markdown-editor-wrapper"');
  expect(routeSource).toContain(
    'className={`mt10 ${sx.markdownEditorWrapper.className ?? ""}`.trim()}',
  );
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
  expect(styleSource).toContain('markdownEditorWrapper: { marginTop: "10px" }');

  await mockIssueEditForm(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/issue/1/editform`, { waitUntil: "commit" });

    const wrapper = page.locator('[data-stylex-owner="issue-editform-markdown-editor-wrapper"]');
    await expect(wrapper).toBeVisible({ timeout: 15000 });
    await expect(wrapper).toHaveClass(/\bmt10\b/u);
    await expect(wrapper).toHaveCSS("margin-top", "10px");
    await expect(wrapper).not.toHaveAttribute("style", /.+/u);
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const tabs = wrapper.locator(".nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).locator("button")).toHaveText("Edit");
    await expect(tabs.nth(1).locator("button")).toHaveText("Preview");
    await expect(tabs.nth(2).locator("button")).toHaveText("Add checklist");
    await expect(tabs.nth(3).locator("button")).toHaveText("Clear Temporary");
    await expect(wrapper.locator("#edit-body")).toHaveClass(/\bactive\b/u);
    await expect(wrapper.locator("#preview-body")).not.toHaveClass(/\bactive\b/u);
    await expect(wrapper).toContainText("Notification receivers");

    await tabs.nth(1).locator("button").click();
    await expect(wrapper.locator("#preview-body")).toHaveClass(/\bactive\b/u);
    await expect(wrapper.locator("#edit-body")).not.toHaveClass(/\bactive\b/u);
    await tabs.nth(0).locator("button").click();
    await expect(wrapper.locator("#edit-body")).toHaveClass(/\bactive\b/u);

    const wrapperMetrics = await wrapper.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
        viewportWidth: window.innerWidth,
      };
    });
    expect(wrapperMetrics.top).toBeGreaterThan(0);
    expect(wrapperMetrics.right).toBeLessThanOrEqual(wrapperMetrics.viewportWidth + 1);
    expect(wrapperMetrics.bottom).toBeGreaterThan(wrapperMetrics.top);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockIssueEditForm(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: "7",
        menuSetting: { issue: true, milestone: true },
        movableIssueProjects: [],
        ownerName: "weblabs",
        projectName: "demo",
        projectScope: "PUBLIC",
        vcs: "GIT",
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/labels", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/projects/**/issues/parent-options**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/projects/**/issues/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        authorId: "1",
        bodyMarkdown: "Issue body",
        issueId: "1",
        issueNumber: 1,
        isDraft: false,
        labels: [],
        state: "open",
        title: "Issue title",
        viewerUserId: "1",
      },
    }),
  );
}
