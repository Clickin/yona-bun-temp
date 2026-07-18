import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("moves board post detail static residuals to route-local StyleX", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");
  const tasklistTemplate = readFileSync(
    "../yona-original/app/views/common/tasklistBar.scala.html",
    "utf8",
  );
  const originalMessage = readFileSync(
    "../yona-original/public/javascripts/common/yobi.OriginalMessage.js",
    "utf8",
  );
  expect(template).toContain(
    '<div class="tab-content" style="position:relative;overflow: visible;">',
  );
  expect(originalMessage).toContain(".css('border', 0)");
  expect(originalMessage).toContain(".css('padding-left', '5px')");
  expect(tasklistTemplate).toContain(
    '<div class="bar red" style="width: 0;" title="Tasklist"></div>',
  );
  expect(route).not.toContain(
    'className="tab-content" style={{ position: "relative", overflow: "visible" }}',
  );
  expect(route).not.toContain("style={{ border: 0, paddingLeft: 5, paddingRight: 5 }}");
  expect(route).not.toContain('<div className="bar red" style={{ width: 0 }}');
  expect(theme).toContain('editorTabContent: { overflow: "visible", position: "relative" }');
  expect(theme).toContain("originalMessageToggle: { paddingLeft: 5, paddingRight: 5 }");
  expect(theme).toContain("tasklistProgress: { width: 0 }");

  await mockPost(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/demo/post/1`);

  const tabContent = page.locator('[data-stylex-owner="post-detail-editor-tab-content"]').first();
  await expect(tabContent).toHaveCount(1);
  await expect(tabContent).not.toHaveAttribute("style", /.+/);
  await expect(tabContent).toHaveCSS("position", "relative");
  await expect(tabContent).toHaveCSS("overflow", "visible");

  const toggle = page.locator('[data-stylex-owner="post-detail-original-message-toggle"]');
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toHaveAttribute("style", /border: 0/);
  await expect(toggle).toHaveCSS("border-top-width", "0px");
  await expect(toggle).toHaveCSS("padding-left", "5px");
  await expect(toggle).toHaveCSS("padding-right", "5px");

  const tasklistProgress = page.locator('[data-stylex-owner="post-detail-tasklist-progress"]');
  expect(await tasklistProgress.count()).toBeGreaterThan(0);
  for (let index = 0; index < (await tasklistProgress.count()); index += 1) {
    const progress = tasklistProgress.nth(index);
    await expect(progress).toHaveAttribute("class", /bar/);
    await expect(progress).toHaveAttribute("class", /red/);
    await expect(progress).not.toHaveAttribute("style", /.+/);
    await expect(progress).toHaveCSS("width", "0px");
  }
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
  await page.route("**/api/v1/owners/**/projects/**/container", (route: Route) =>
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
            contentsMarkdown: "Visible comment\n\n---Original message---\nHidden comment",
            viaEmail: true,
            createdLabel: "Jul 2, 2026",
            attachments: [],
            parentCommentId: "",
          },
        ],
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
        labels: [],
      },
    }),
  );
}
