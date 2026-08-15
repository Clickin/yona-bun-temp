import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const routeSource = readFileSync(
  "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
  "utf8",
);
const styleSource =
  readFileSync("src/app.css", "utf8") +
  readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
const appCss = readFileSync("../src/app.css", "utf8");
const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
const legacyLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");

// legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.

test("issue detail populated body/sidebar owns route-scoped Style geometry", () => {
  expect(legacyView).toContain('<div class="board-body row-fluid">');
  expect(legacyView).toContain('class="author-info"');
  expect(legacyView).toContain('class="board-actrow right-txt"');
  expect(legacyView).toContain('class="issue-info"');
  expect(legacyView).toContain('class="board-footer"');
  expect(legacyLess).toContain(".board-body {");
  expect(legacyLess).toContain(".author-info {");
  expect(legacyLess).toContain(".content {");
  expect(legacyLess).toContain(".board-actrow");
  expect(legacyLess).toContain(".board-footer");
  expect(legacyLess).toContain(".issue-info");
  expect(legacyLess).toContain(".subcomment-media-body");
  expect(legacyLess).toContain(".one-line-comment");
  expect(legacyLess).toContain(".contents {");
  expect(legacyLess).toContain(".deleteButtonX");
  expect(legacyLess).toContain(".oneline-comment-box");

  for (const owner of ["author", "content", "actions", "boardFooter", "issueInfo"]) {
  }
  for (const owner of [
    "disabledCommentActions",
    "commentFormActions",
    "uploadHelp",
    "commentUpdateActions",
  ]) {
  }
  for (const marker of [
    "project-issue-detail-author",
    "project-issue-detail-content",
    "project-issue-detail-actions",
    "project-issue-detail-disabled-comment-actions",
    "project-issue-detail-comment-actions",
    "project-issue-detail-comment-update-actions",
    "project-issue-detail-board-footer",
    "project-issue-detail-sidebar-meta",
    "project-issue-detail-child-comment-surface",
    "project-issue-detail-child-comment-contents",
    "project-issue-detail-child-comment-delete",
    "project-issue-detail-child-comment-form-row",
  ]) {
    expect(routeSource).toContain(`data-owner="${marker}"`);
  }
  // Upload help marker moved onto the shared UploadForm via the helpOwner prop.
  expect(routeSource).toContain('helpOwner="project-issue-detail-upload-help"');
  const uploadFormSource = readFileSync("../src/components/file-uploader.tsx", "utf8");
  expect(uploadFormSource).toContain("data-owner={helpOwner}");
  expect(routeSource).toContain(
    '<div className="write-comment-wrap">\n          <MarkdownEditor\n            {...issueDetailMarkdownEditorProps("comment-body", "contents", "", "contents")}',
  );

  expect(routeSource).toContain('data-owner-issue-info="project-issue-detail-issue-info"');
  for (const declaration of []) {
    expect(styleSource).toContain(declaration);
  }

  expect(appCss).not.toContain(".issue-detail-page .board-body .author-info {");
  expect(appCss).not.toContain(".issue-detail-page .board-body .content {");
  expect(appCss).not.toContain(".issue-detail-page .board-actrow");
  expect(appCss).not.toContain(".issue-detail-page .board-footer");
  expect(appCss).not.toContain(".issue-detail-page .issue-info {");
  expect(appCss).toContain(".board-body .author-info {");
  expect(appCss).toContain(".board-body .content {");
  expect(appCss).toContain(".board-actrow {");
  expect(appCss).toContain(".board-footer {");
});

test("issue detail body/sidebar geometry stays contained on desktop and mobile", async ({
  page,
}) => {
  await mockIssueDetail(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/yona/admin/sample/issue/11");

  const author = page.locator('[data-owner="project-issue-detail-author"]');
  const content = page.locator('[data-owner="project-issue-detail-content"]');
  const actions = page.locator('[data-owner="project-issue-detail-actions"]');
  const upload = page.locator(".write-comment-wrap .upload-wrap.content-footer").first();
  const footer = page.locator('[data-owner="project-issue-detail-board-footer"]');
  const sidebar = page.locator('[data-owner="project-issue-detail-sidebar-meta"]');
  await expect(author).toBeVisible();
  await expect(content).toContainText("Body markdown");
  await expect(actions).toBeVisible();
  await expect(upload).toBeVisible();
  await expect(upload.locator("xpath=..")).toHaveClass(/write-comment-wrap/u);
  await expect(sidebar).toBeVisible();
  await expect(author).toHaveCSS("display", "block");
  await expect(content).toHaveCSS("min-height", "150px");
  await expect(actions).toHaveCSS("overflow", "auto");
  await expect(actions).toHaveCSS("text-align", "right");
  await expect(page.locator('[data-owner="project-issue-detail-comment-actions"]')).toHaveCSS(
    "text-align",
    "right",
  );
  await expect(page.locator('[data-owner="project-issue-detail-upload-help"]')).toHaveCSS(
    "text-align",
    "right",
  );
  await expect(footer).toHaveCSS("text-align", "right");
  await expect(sidebar).toHaveCSS("padding-top", "15px");
  // `_page.less:3561` sets the 52px desktop gutter, but the frozen
  // `_responsive.less:553` unconstrained `@media all` block overrides it to
  // `15px 0 0 10px` at every width (later cascade, equal specificity) — the
  // app.css rule pins the 10px contract at 1366 and 720.
  await expect(sidebar).toHaveCSS("padding-left", "10px");
  await expect(page.locator('[data-owner="project-issue-detail-child-comment-surface"]')).toHaveCSS(
    "margin-left",
    "60px",
  );
  await expect(
    page.locator('[data-owner="project-issue-detail-child-comment-contents"]'),
  ).toHaveCSS("border-bottom-width", "1px");
  const desktop = await page.evaluate(() => {
    const get = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`missing ${selector}`);
      const rect = element.getBoundingClientRect();
      return { bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width };
    };
    return {
      author: get('[data-owner="project-issue-detail-author"]'),
      content: get('[data-owner="project-issue-detail-content"]'),
      actions: get('[data-owner="project-issue-detail-actions"]'),
      sidebar: get('[data-owner="project-issue-detail-sidebar-meta"]'),
    };
  });
  expect(desktop.content.width).toBeGreaterThan(0);
  expect(desktop.content.right).toBeLessThanOrEqual(1366);
  expect(desktop.actions.left).toBeGreaterThanOrEqual(desktop.content.left);
  expect(desktop.sidebar.width).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toHaveCSS("padding-left", "10px");
  const mobile = await page.evaluate(() => {
    const body = document.querySelector<HTMLElement>(".board-body");
    const content = document.querySelector<HTMLElement>(
      '[data-owner="project-issue-detail-content"]',
    );
    if (!body || !content) throw new Error("missing mobile geometry target");
    const bodyRect = body.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      bodyWidth: bodyRect.width,
      contentRight: contentRect.right,
      contentLeft: contentRect.left,
    };
  });
  expect(mobile.bodyWidth).toBeGreaterThan(0);
  expect(mobile.contentLeft).toBeGreaterThanOrEqual(0);
  expect(mobile.contentRight).toBeLessThanOrEqual(390);
});

async function mockIssueDetail(page: Page) {
  const session = {
    isAnonymous: false,
    isSiteAdmin: true,
    isConfirmed: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/11", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 42,
        number: 11,
        title: "Fix flaky issue",
        state: "OPEN",
        bodyMarkdown: "Body **markdown**",
        authorLoginId: "admin",
        authorLabel: "Site Admin",
        authorAvatarUrl: "",
        createdLabel: "Jul 1, 2026",
        createdDate: "Jul 1, 2026",
        canUpdate: true,
        canWatch: true,
        isWatching: false,
        isFavorited: false,
        isDraft: false,
        weight: 2,
        voters: [],
        sharers: [],
        comments: [
          {
            id: 101,
            parentCommentId: "",
            authorLoginId: "admin",
            authorLabel: "Site Admin",
            authorAvatarUrl: "",
            contentsMarkdown: "Top-level comment",
            createdLabel: "Jul 2, 2026",
            viewerCanRead: true,
            viewerCanUpdate: true,
            viewerCanDelete: true,
            viewerHasVoted: false,
            childComments: [
              {
                id: 102,
                parentCommentId: "101",
                authorLoginId: "admin",
                authorLabel: "Site Admin",
                contentsMarkdown: "Child comment",
                createdLabel: "Jul 2, 2026",
                viewerCanDelete: true,
              },
            ],
          },
        ],
        timeline: [],
        childIssues: [],
        attachments: [],
        labels: [],
        milestone: null,
        assigneeLoginId: null,
        commentCount: 0,
        viewerCanComment: true,
      },
    }),
  );
}
