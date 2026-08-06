import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("commit detail diff layout and file metadata owners are present", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/commit/$commitId.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/code/diff.scala.html", "utf8");
  const filePartial = readFileSync(
    "../yona-original/app/views/partial_filediff.scala.html",
    "utf8",
  );
  expect(legacy).toContain('class="codediff-wrap"');
  expect(filePartial).toContain('class="diff-partial-meta"');
  for (const owner of [
    "commit-detail-diff-layout",
    "commit-detail-diffs",
    "commit-detail-review-panel",
    "commit-detail-file",
    "commit-detail-file-meta",
    "commit-detail-file-code",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }

  await mockCommit(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/demo/commit/abc123`);
  for (const owner of [
    "commit-detail-diff-layout",
    "commit-detail-diffs",
    "commit-detail-review-panel",
    "commit-detail-file",
    "commit-detail-file-meta",
    "commit-detail-file-code",
  ]) {
    await expect(page.locator(`[data-stylex-owner="${owner}"]`)).toBeVisible();
  }

  const geometry = await page.evaluate(() => {
    const read = (name: string) => {
      const node = document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    };
    return {
      layout: read("commit-detail-diff-layout"),
      diffs: read("commit-detail-diffs"),
      review: read("commit-detail-review-panel"),
      file: read("commit-detail-file"),
      meta: read("commit-detail-file-meta"),
      code: read("commit-detail-file-code"),
    };
  });
  for (const value of Object.values(geometry)) {
    expect(value).not.toBeNull();
    expect(value!.width).toBeGreaterThan(0);
    expect(value!.left).toBeGreaterThanOrEqual(0);
    expect(value!.right).toBeLessThanOrEqual(1366);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
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
        parentCommit: { commitId: "0000000", commitShortId: "0000000" },
        files: [
          {
            path: "README.md",
            patch: "--- a/README.md\n+++ b/README.md\n@@ -1 +1 @@\n-old\n+new",
          },
        ],
        threads: [],
        isWatching: false,
        permissions: { canComment: false, canUpdateThreadState: false },
      },
    }),
  );
}
