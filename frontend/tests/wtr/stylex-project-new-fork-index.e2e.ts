import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("preserves the populated fork notice and project link geometry", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/newFork.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/git/fork.scala.html", "utf8");
  expect(template).toContain("fork.already.exist");
  expect(template).toContain('class="help-messages center-txt"');
  expect(route).toContain('data-stylex-owner="project-fork-existing"');
  expect(route).toContain('data-stylex-owner="project-fork-existing-link"');
  // Retained legacy class ceiling: app keeps `center-txt` on the existing-fork
  // notice (fork.scala.html line 53) while owning textAlign: center via sx.existing.
  expect(route).toContain("sx.existing.className");

  await mockFork(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/newFork/`);
    await expect(owner(page, "project-fork-existing")).toBeVisible();
    await expect(owner(page, "project-fork-existing-message")).toHaveText(
      "동일한 원본 프로젝트를 복사한 프로젝트가 있습니다.",
    );
    const link = owner(page, "project-fork-existing-link");
    await expect(link).toHaveText("admin / demo-fork");
    await expect(link).toHaveAttribute("href", `${basePath}/admin/demo-fork`);
    await expect(owner(page, "project-fork-help-image")).toHaveCount(0);
    const geometry = await owner(page, "project-fork-existing").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      right: element.getBoundingClientRect().right,
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      textAlign: getComputedStyle(element).textAlign,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(geometry.scrollWidth).toBe(viewport.width);
    expect(geometry.textAlign).toBe("center");
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
        existingForks: [{ ownerName: "admin", projectName: "demo-fork" }],
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
