import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records commit detail owners and responsive diff containment", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/commit/$commitId.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/commit/-commit-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/common/commitMsg.scala.html", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  expect(commonLess).toContain(".right-txt     { text-align:right; }");
  expect(route).not.toContain("right-txt");
  for (const marker of [
    "commit-detail-thread-actions",
    "commit-detail-comment-update-actions",
    "commit-detail-comment-actions",
    "commit-detail-review-actions",
  ]) {
    expect(route).toContain(`data-stylex-owner="${marker}"`);
  }
  // The attachment-help owner moved to the shared file-uploader component
  // (renders data-stylex-owner={helpOwner}); the route passes the owner prop.
  expect(route).toContain('helpOwner="commit-detail-attachment-help"');
  expect(template).toContain('class="commitMsg short"');
  expect(template).toContain('class="commitMsg desc');
  expect(route).toContain('data-stylex-owner="commit-detail-info"');
  expect(route).toContain('data-stylex-owner="commit-detail-diff-body-layout"');
  expect(theme).toContain("export const commitDetailColors");
  await mockCommit(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/commit/abc123`);
    await expect(owner(page, "commit-detail-browse")).toBeVisible();
    await expect(owner(page, "commit-detail-short-message")).toHaveText("Fix issue");
    const commentActions = owner(page, "commit-detail-comment-actions");
    await expect(commentActions).toBeVisible();
    await expect(commentActions).toHaveCSS("text-align", "right");
    const attachmentHelp = owner(page, "commit-detail-attachment-help");
    await expect(attachmentHelp).toBeAttached();
    await expect(attachmentHelp).toHaveCSS("text-align", "right");
    const geometry = await owner(page, "commit-detail-diff-body-layout").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
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
        permissions: { canComment: true, canUpdateThreadState: true },
        isWatching: false,
      },
    }),
  );
}
