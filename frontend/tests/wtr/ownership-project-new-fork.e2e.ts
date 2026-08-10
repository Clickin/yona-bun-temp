import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records fork form owners and responsive containment", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/newFork.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const template = readFileSync("../yona-original/app/views/git/fork.scala.html", "utf8");
  expect(template).toContain('name="projectScope"');
  expect(template).toContain('class="help-messages');
  expect(route).toContain('data-owner="project-fork-form"');
  expect(route).toContain('data-owner="project-fork-submit"');
  for (const owner of [
    "project-fork-help-row",
    "project-fork-owner-label",
    "project-fork-name-label",
    "project-fork-name-help",
    "project-fork-scope-label",
    "project-fork-public-radio",
    "project-fork-public-label",
    "project-fork-protected-radio",
    "project-fork-protected-label",
    "project-fork-private-radio",
    "project-fork-private-label",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
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
    const geometry = await owner(page, "project-fork-form").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
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
