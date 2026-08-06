import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test("board post detail keeps StyleX owners and responsive geometry", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  expect(template).toContain('class="board-header issue"');
  expect(template).toContain('class="board-comment-wrap"');
  for (const name of [
    "post-detail-author",
    "post-detail-comments",
    "post-detail-sidebar",
    "post-detail-footer",
  ]) {
    expect(route).toContain(`data-stylex-owner="${name}"`);
  }

  await mockPost(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/demo/post/1`);
  await expect(owner(page, "post-detail-author")).toBeVisible();
  await expect(owner(page, "post-detail-comments")).toBeVisible();
  await expect(owner(page, "post-detail-sidebar")).toBeVisible();
  await expect(owner(page, "post-detail-footer")).toHaveCount(1);
  await expect(owner(page, "post-detail-comments")).toContainText("Comment");
  await expect(owner(page, "post-detail-comments")).toContainText("Looks good");

  const metrics = await page.evaluate(() =>
    ["author", "comments", "sidebar", "footer"].map((name) => {
      const element = document.querySelector<HTMLElement>(
        `[data-stylex-owner="post-detail-${name}"]`,
      );
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }),
  );
  for (const metric of metrics) {
    expect(metric).not.toBeNull();
    expect(metric!.left).toBeGreaterThanOrEqual(0);
    expect(metric!.right).toBeLessThanOrEqual(1366);
    expect(metric!.width).toBeGreaterThan(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const body = document.querySelector<HTMLElement>('[data-stylex-owner="post-detail-body"]');
        return body ? body.getBoundingClientRect().right <= window.innerWidth : false;
      }),
    )
    .toBe(true);
});

async function mockPost(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        ownerName: "weblabs",
        projectName: "demo",
        projectScope: "PUBLIC",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        vcs: "GIT",
        viewerCanUpdate: true,
        showBoard: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/**/posts/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        postNumber: "1",
        title: "Post",
        bodyMarkdown: "Body",
        authorLabel: "admin",
        authorLoginId: "admin",
        authorAvatarUrl: "",
        createdLabel: "Jul 1, 2026",
        attachments: [],
        comments: [
          {
            id: "comment-1",
            authorLabel: "reviewer",
            authorLoginId: "reviewer",
            contentsMarkdown: "Looks good",
            createdLabel: "Jul 2, 2026",
            attachments: [],
            parentCommentId: "",
          },
        ],
        isWatching: false,
        permissions: {
          canComment: false,
          canCreate: true,
          canDelete: false,
          canRead: true,
          canSetNotice: false,
          canUpdate: false,
          canWatch: true,
        },
        labels: [],
      },
    }),
  );
}
