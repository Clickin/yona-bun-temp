import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records compare diff owners and responsive containment", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/compare/$revisionRange.tsx",
    "utf8",
  );
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/compare/-compare.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/code/compare.scala.html", "utf8");
  expect(template).toContain('class="commitInfo"');
  expect(template).toContain('class="diff-body discommentable"');
  expect(route).toContain('data-stylex-owner="project-compare-diff-body"');
  expect(theme).toContain("export const compareColors");
  await mockCompare(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/compare/abc123...def456`);
    await expect(owner(page, "project-compare-browse")).toBeVisible();
    await expect(owner(page, "project-compare-diff-body")).toBeVisible();
    const geometry = await owner(page, "project-compare-diff-body").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
});

async function mockCompare(page: Page) {
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
      json: { ownerName: "weblabs", projectName: "demo", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/compare/**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { commitA: "abc123", commitB: "def456", files: [] },
    }),
  );
}
