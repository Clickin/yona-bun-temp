import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("preserves legacy fork controls and narrow viewport overflow", async ({ page }) => {
  await mockFork(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/newFork`);
    await expect(owner(page, "project-fork-form")).toBeVisible();
    await expect(owner(page, "project-fork-name-input")).toHaveValue("demo-fork");
    await expect(owner(page, "project-fork-submit")).toHaveText("코드 저장소 복사");
    await expect(owner(page, "project-fork-public-radio")).toBeChecked();
    await expect(owner(page, "project-fork-public-label")).toBeVisible();
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    // Live legacy: 180px controls margin + 220px fields; responsive CSS is inactive.
    expect(geometry.scrollWidth).toBe(Math.max(geometry.clientWidth, 400));
  }
});

async function mockFork(page: Page) {
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
  await page.route("**/api/v1/owners/**/projects/**/fork-options", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        source: { ownerName: "weblabs", projectName: "demo", vcs: "GIT" },
        selected: { ownerName: "admin", projectName: "demo-fork" },
        ownerOptions: [
          { ownerName: "admin", organization: false },
          { ownerName: "weblabs", organization: true },
        ],
        existingForks: [],
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        viewerCanUpdate: true,
        ownerName: "weblabs",
        projectName: "demo",
        vcs: "GIT",
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
}
