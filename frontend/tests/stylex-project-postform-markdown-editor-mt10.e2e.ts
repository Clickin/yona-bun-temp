import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-postform-markdown-editor-mt10",
  fallbackOff ? "fallback-off" : "normal",
);
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/postform.tsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/-postform.stylex.ts", import.meta.url),
  "utf8",
);
const legacyCreateSource = readFileSync(
  new URL("../../yona-original/app/views/board/create.scala.html", import.meta.url),
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

test("project postform markdown editor keeps the legacy mt10 source and StyleX owner", () => {
  expect(legacyCreateSource).toContain('@common.editor("body"');
  expect(legacyEditorSource).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyCommonLessSource).toContain(".mt10 { margin-top:10px; }");

  expect(routeSource).toContain(
    "markdownEditorWrapper: stylex.props(styles.markdownEditorWrapper)",
  );
  expect(routeSource).toContain('data-stylex-owner="project-postform-markdown-editor-wrapper"');
  expect(routeSource).toContain(
    'className={`mt10 ${sx.markdownEditorWrapper.className ?? ""}`.trim()}',
  );
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
  expect(styleSource).toContain('markdownEditorWrapper: { marginTop: "10px" }');
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
] as const) {
  test(`project postform markdown editor preserves mt10 at ${viewport.name}`, async ({ page }) => {
    await mockPostOptions(page);
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/postform`, { waitUntil: "commit" });

    const wrapper = page.locator('[data-stylex-owner="project-postform-markdown-editor-wrapper"]');
    await expect(wrapper).toBeVisible();
    await expect(wrapper).toHaveClass(/\bmt10\b/u);
    await expect(wrapper).toHaveCSS("margin-top", "10px");
    await expect(wrapper).not.toHaveAttribute("style", /.+/u);
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const tabs = wrapper.locator(".nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).locator("a")).toHaveText("Edit");
    await expect(tabs.nth(1).locator("a")).toHaveText("Preview");
    await expect(tabs.nth(2).locator("button")).toHaveText("Add checklist");
    await expect(tabs.nth(3).locator("button")).toHaveText("Clear Temporary");
    await expect(wrapper.locator("#edit-body")).toHaveClass(/\bactive\b/u);
    await expect(wrapper.locator("#preview-body")).not.toHaveClass(/\bactive\b/u);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  });
}

async function mockPostOptions(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "weblabs",
        projectName: "demo",
        vcs: "GIT",
        viewerCanUpdate: true,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
      },
    }),
  );
  await page.route("**/api/v1/projects/**/posts/form-options**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: false,
        canMarkNotice: true,
        canMarkReadme: false,
        onlineCommit: null,
      },
    }),
  );
}
