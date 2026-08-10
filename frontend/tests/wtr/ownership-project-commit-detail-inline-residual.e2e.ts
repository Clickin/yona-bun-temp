import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("commit detail owns static legacy tabs and editor tab-content styles", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/commit/$commitId.tsx", "utf8");
  const style =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/code/diff.scala.html", "utf8");
  const editor = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");
  expect(legacy).toContain('<ul class="nav nav-tabs" style="margin-bottom:20px;">');
  expect(legacy).toContain('<ul class="nav nav-tabs" style="margin-bottom:10px;">');
  expect(editor).toContain(
    '<div class="tab-content" style="position:relative;overflow: visible;">',
  );
  expect(route).toContain('data-owner="commit-detail-browse-tabs"');
  expect(route).toContain('data-owner="commit-detail-review-tabs"');
  expect(route).toContain('data-owner="commit-detail-editor-tab-content"');

  await mockCommit(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/demo/commit/abc123`, { waitUntil: "commit" });
  await expect(page.locator('[data-owner="commit-detail-browse-tabs"]')).toHaveCSS(
    "margin-bottom",
    "20px",
  );
  await expect(page.locator('[data-owner="commit-detail-review-tabs"]')).toHaveCSS(
    "margin-bottom",
    "10px",
  );
  const editorTabContent = page.locator('[data-owner="commit-detail-editor-tab-content"]');
  await expect(editorTabContent.first()).toHaveCSS("position", "relative");
  await expect(editorTabContent.first()).toHaveCSS("overflow", "visible");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "commit" });
  const geometry = await page
    .locator('[data-owner="commit-detail-browse-tabs"]')
    .evaluate((element) => ({
      right: element.getBoundingClientRect().right,
      viewport: window.innerWidth,
    }));
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
});

async function mockCommit(page: Page) {
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
    userLabel: "Admin",
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
  await page.route("**/api/v1/projects/**/commit/abc123**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        selectedBranch: "main",
        commit: {
          commitId: "abc123",
          shortMessage: "Fix issue",
          message: "Fix issue\nDetails",
          authorName: "admin",
          authorDate: "today",
        },
        files: [],
        threads: [],
        isWatching: false,
        permissions: { canComment: true, canUpdateThreadState: true },
      },
    }),
  );
}
