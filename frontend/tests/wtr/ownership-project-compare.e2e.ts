import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records compare diff owners and responsive containment", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/compare/$revisionRange.tsx",
    "utf8",
  );
  const theme = readFileSync("src/app.css", "utf8");
  const template = readFileSync("../yona-original/app/views/code/compare.scala.html", "utf8");
  expect(template).toContain('class="commitInfo"');
  expect(template).toContain('class="diff-body discommentable"');
  expect(route).toContain('data-owner="project-compare-diff-wrap"');

  await mockCompare(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/compare/abc123...def456`);
    await expect(owner(page, "project-compare-browse")).toBeVisible();
    // F6 copy-fix: the mock serves files:[] so the app renders the
    // project-compare-empty noChanges alert — exactly legacy
    // `@if(diff.isEmpty){<div class="alert">code.noChanges</div>}`
    // (yona-original/app/views/code/compare.scala.html:29-30), which renders NO
    // diff-body for empty diffs. data-owner="project-compare-diff-body"
    // was also removed from the app's files branch in 38254cc9f (parity wave;
    // it now emits plain div.diff-body discommentable like legacy).
    await expect(owner(page, "project-compare-empty")).toBeVisible();
    const geometry = await owner(page, "project-compare-empty").evaluate((element) => ({
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
