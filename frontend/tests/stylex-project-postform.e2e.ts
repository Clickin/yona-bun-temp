import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records board post form owners and responsive geometry", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/postform.tsx", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-postform.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/board/create.scala.html", "utf8");
  expect(template).toContain('name="title"');
  expect(template).toContain('@common.editor("body"');
  expect(route).toContain('data-stylex-owner="project-postform-title"');
  expect(route).toContain('data-stylex-owner="project-postform-editor"');
  expect(theme).toContain("export const postFormColors");
  await mockPostOptions(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/postform`);
    await expect(owner(page, "project-postform-form")).toBeVisible();
    await expect(owner(page, "project-postform-title")).toHaveAttribute("name", "title");
    await expect(owner(page, "project-postform-editor")).toHaveAttribute("name", "body");
    const geometry = await owner(page, "project-postform-form").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
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
  await page.route("**/api/v1/owners/**/projects/**/posts/form-options**", (route: Route) =>
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
