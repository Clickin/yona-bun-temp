import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records board post detail owners and responsive containment", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");

  const template = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(template).toContain('class="board-header issue"');
  expect(template).toContain('class="board-body row-fluid"');
  expect(route).toContain('data-owner="post-detail-content"');
  const editorIndex = route.indexOf('postDetailMarkdownEditorProps("comment-body"');
  const wrapIndex = route.indexOf("write-comment-wrap");
  const uploadIndex = route.indexOf('data-owner="post-detail-comment-upload-wrap"');
  const actionsIndex = route.indexOf('data-owner="post-detail-comment-actions"');
  expect(wrapIndex).toBeGreaterThanOrEqual(0);
  expect(wrapIndex).toBeLessThan(editorIndex);
  expect(editorIndex).toBeGreaterThanOrEqual(0);
  expect(uploadIndex).toBeGreaterThan(editorIndex);
  expect(actionsIndex).toBeGreaterThan(uploadIndex);
  expect(route.slice(wrapIndex, actionsIndex)).toContain("write-comment-wrap");

  expect(pageLess).toContain(".comments {\n");
  expect(pageLess).toMatch(/\.comments\s*\{[\s\S]*?\.comment\s*\{\s*padding:\s*10px 0px;/u);

  await mockPost(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/post/1`);
    await expect(owner(page, "post-detail-header")).toBeVisible();
    await expect(owner(page, "post-detail-content")).toContainText("Body");
    const geometry = await owner(page, "post-detail-body").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
});

async function mockPost(page: Page) {
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
        createdAt: "2026-07-01T00:00:00+09:00",
        attachments: [],
        comments: [],
        labels: [],
        isWatching: false,
        permissions: {
          canComment: true,
          canCreate: true,
          canDelete: false,
          canRead: true,
          canSetNotice: false,
          canUpdate: false,
          canWatch: true,
        },
        historyHtml: "",
        historyMarkdown: "",
      },
    }),
  );
}
