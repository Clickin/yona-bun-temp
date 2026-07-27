import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("moves board post editor layout declarations to route-local StyleX", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/postform.tsx", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-postform.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/board/create.scala.html", "utf8");
  expect(template).toContain('<dd style="position: relative;">');
  expect(template).toContain('@common.editor("body"');
  expect(route).toContain('data-stylex-owner="project-postform-editor-wrapper"');
  expect(route).toContain('data-stylex-owner="project-postform-editor-tab-content"');
  expect(route).not.toContain('<dd style={{ position: "relative" }}>');
  expect(route).not.toContain(
    'className="tab-content" style={{ position: "relative", overflow: "visible" }}',
  );
  expect(theme).toContain('editorWrapper: { position: "relative" }');
  expect(theme).toContain('editorTabContent: { overflow: "visible", position: "relative" }');

  await mockPostOptions(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/demo/postform`);
  const wrapper = owner(page, "project-postform-editor-wrapper");
  const tabContent = owner(page, "project-postform-editor-tab-content");
  await expect(wrapper).toBeVisible();
  await expect(tabContent).toBeVisible();
  await expect(wrapper).not.toHaveAttribute("style", /.+/);
  await expect(tabContent).not.toHaveAttribute("style", /.+/);
  await expect(wrapper).toHaveCSS("position", "relative");
  await expect(tabContent).toHaveCSS("position", "relative");
  await expect(tabContent).toHaveCSS("overflow", "visible");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(owner(page, "project-postform-form")).toBeVisible();
  const geometry = await owner(page, "project-postform-form").evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.scrollWidth).toBe(390);
});

async function mockPostOptions(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
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
