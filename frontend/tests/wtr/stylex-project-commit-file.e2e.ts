import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records commit file history owners and responsive containment", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/commits/$branch/$filePath.tsx",
    "utf8",
  );
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/commits/-commit-file.stylex.ts",
    "utf8",
  );
  const historyTemplate = readFileSync(
    "../yona-original/app/views/code/history.scala.html",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/code/partial_view_file.scala.html",
    "utf8",
  );
  expect(template).toContain('class="file-wrap"');
  expect(template).toContain('class="file-header nm"');
  expect(historyTemplate).toContain(
    '<span class="number-of-comments"><i class="yobicon-comments"></i> @numOfComment</span>',
  );
  expect(route).toContain('data-stylex-owner="commit-file-breadcrumbs"');
  expect(route).toContain('data-stylex-owner="commit-file-comment-count"');
  expect(route).not.toContain('className="number-of-comments"');
  expect(theme).toContain("export const commitFileColors");
  expect(theme).toContain(
    'commentCount: {\n    float: "right",\n    marginRight: "8px",\n    position: "relative",\n    color: commitFileColors.commentText,\n  }',
  );
  await mockHistory(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/demo/commits/main/src/app.ts`);
  await expect(owner(page, "commit-file-breadcrumbs")).toBeVisible();
  await expect(owner(page, "commit-file-history")).toBeVisible();
  const commentCount = owner(page, "commit-file-comment-count");
  await expect(commentCount).toHaveText("2");
  await expect(commentCount.locator(".yobicon-comments")).toHaveCount(1);
  await expect(commentCount).toHaveAttribute("data-stylex-owner", "commit-file-comment-count");
  await expect
    .poll(() => commentCount.evaluate((element) => getComputedStyle(element).cssFloat))
    .toBe("right");
  await expect
    .poll(() => commentCount.evaluate((element) => getComputedStyle(element).position))
    .toBe("relative");
  await expect
    .poll(() => commentCount.evaluate((element) => getComputedStyle(element).marginRight))
    .toBe("8px");
  await expect
    .poll(() => commentCount.evaluate((element) => getComputedStyle(element).color))
    .toBe("rgb(102, 102, 102)");
  const geometry = await owner(page, "commit-file-history").evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.scrollWidth).toBe(1366);
});

async function mockHistory(page: Page) {
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
  await page.route("**/api/v1/projects/**/commits**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        selectedBranch: "main",
        breadcrumbs: [{ name: "src", path: "src" }],
        commits: [
          {
            authorAvatarUrl: "",
            authorDate: "Jul 17, 2026",
            authorEmail: "admin@example.com",
            authorLoginId: "admin",
            authorName: "Admin",
            commentCount: 2,
            commitId: "abcdef1234567890",
            commitShortId: "abcdef1",
            message: "Initial commit",
            shortMessage: "Initial commit",
          },
        ],
        hasNewer: false,
        hasOlder: false,
        noHead: false,
        ownerName: "weblabs",
        page: 1,
        path: "src/app.ts",
        projectName: "demo",
      },
    }),
  );
}
