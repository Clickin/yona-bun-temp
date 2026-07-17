import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records project setting owners and responsive form containment", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/setting.tsx", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-setting.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/project/setting.scala.html", "utf8");
  expect(template).toContain('id="project-name"');
  expect(template).toContain('id="project-desc"');
  expect(route).toContain('data-stylex-owner="project-setting-form"');
  expect(route).toContain('data-stylex-owner="project-setting-save"');
  expect(theme).toContain("export const projectSettingColors");
  await mockSetting(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/setting`);
    await expect(owner(page, "project-setting-form")).toBeVisible();
    await expect(owner(page, "project-setting-name-input")).toHaveValue("demo");
    await expect(owner(page, "project-setting-description")).toHaveValue("Demo project");
    const geometry = await owner(page, "project-setting-form").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
});

async function mockSetting(page: Page) {
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
  const project = {
    ownerName: "weblabs",
    projectName: "demo",
    name: "demo",
    overview: "Demo project",
    vcs: "GIT",
    projectScope: "PUBLIC",
    menuSetting: {
      code: true,
      issue: true,
      pullRequest: true,
      review: true,
      milestone: true,
      board: true,
    },
    isCodeAccessibleMemberOnly: false,
    isUsingReviewerCount: false,
    defaultReviewerCount: 1,
  };
  await page.route("**/api/v1/owners/**/projects/**/settings", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/owners/**/projects/**/container", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/owners/**/projects/**/branches", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { branches: [{ name: "main" }], defaultBranch: "main" },
    }),
  );
}
