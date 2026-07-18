import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("issue detail owns original-message and editor static declarations", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const styles = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyEditor = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");
  const legacyTasklist = readFileSync(
    "../yona-original/app/views/common/tasklistBar.scala.html",
    "utf8",
  );
  const legacySubtasks = readFileSync(
    "../yona-original/app/views/issue/partial_list_subtask.scala.html",
    "utf8",
  );

  expect(legacyView).toContain("@partial_comments(project, issue)");
  expect(legacyView).toContain('class="pull-right hide show-in-mobile" style="font-size: 0.7em"');
  expect(legacyEditor).toContain('style="position:relative;overflow: visible;"');
  expect(legacyView).toContain("@common.tasklistBar()");
  expect(legacyTasklist).toContain('class="bar red" style="width: 0;"');
  expect(legacySubtasks).toContain('style="width: @percentage%;" title="Subtask"');
  const legacyOriginalMessage = readFileSync(
    "../yona-original/public/javascripts/common/yobi.OriginalMessage.js",
    "utf8",
  );
  expect(legacyOriginalMessage).toContain(".css('border', 0)");
  expect(route).not.toContain("style={{ border: 0 }}");
  expect(route).not.toContain('style={{ fontSize: "0.7em" }}');
  expect(route).toContain('data-stylex-owner="project-issue-detail-mobile-metadata"');
  expect(styles).toContain('mobileMetadata: {\n    fontSize: "0.7em"');
  expect(route).not.toContain('className="tab-content" style={{ position: "relative"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-original-message-toggle"');
  expect(styles).toContain('borderWidth: "0px"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-editor-tab-content"');
  expect(route).toContain("data-stylex-owner-instance={wrapId}");
  expect(styles).toContain("originalMessageToggle: {");
  expect(styles).toContain("editorTabContent: {");
  expect(styles).toContain('taskProgressBar: {\n    width: "0px"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-task-progress-bar"');
  expect(route).not.toContain('<div className="bar red" style={{ width: 0 }}');

  await mockIssue(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`, { waitUntil: "commit" });

  const mobileMetadata = page.locator('[data-stylex-owner="project-issue-detail-mobile-metadata"]');
  await expect(mobileMetadata).toHaveCount(1);
  await expect(mobileMetadata).toHaveCSS("font-size", "12.6px");
  await expect(mobileMetadata).toBeHidden();

  const taskProgressBar = page.locator(
    '[data-stylex-owner="project-issue-detail-task-progress-bar"]',
  );
  await expect(taskProgressBar).toHaveCount(2);
  for (const bar of await taskProgressBar.all()) {
    await expect(bar).toHaveCSS("width", "0px");
    await expect(bar).toHaveAttribute("data-stylex-owner-instance", "tasklist");
    await expect(bar).not.toHaveAttribute("style", /width/);
    await expect(bar).toHaveClass(/bar/);
  }

  const subtaskProgressBar = page.locator(
    '[data-stylex-owner="project-issue-detail-subtask-progress-bar"]',
  );
  await expect(subtaskProgressBar).toHaveCount(1);
  await expect(subtaskProgressBar).toHaveCSS("width", "15px");
  await expect(subtaskProgressBar).toHaveClass(/bar/);
  await expect(subtaskProgressBar).toHaveClass(/red/);
  await expect(subtaskProgressBar).not.toHaveAttribute("style", /(?:^|;)\s*width:/);

  const toggle = page.locator('[data-stylex-owner="project-issue-detail-original-message-toggle"]');
  await expect(toggle).toHaveCSS("padding-left", "5px");
  await expect(toggle).toHaveCSS("padding-right", "5px");
  await expect(toggle).toHaveCSS("border-top-width", "0px");
  await expect(toggle).toHaveCSS("border-right-width", "0px");
  await expect(toggle).toHaveCSS("border-bottom-width", "0px");
  await expect(toggle).toHaveCSS("border-left-width", "0px");
  await expect(toggle).not.toHaveAttribute("style", /border/);
  await expect(
    page.locator('[data-stylex-owner="project-issue-detail-original-message-toggle"] + div'),
  ).toBeHidden();
  await toggle.click();
  await expect(
    page.locator('[data-stylex-owner="project-issue-detail-original-message-toggle"] + div'),
  ).toBeVisible();

  const editors = page.locator('[data-stylex-owner="project-issue-detail-editor-tab-content"]');
  await expect(editors).toHaveCount(2);
  const editor = editors.first();
  await expect(editor).toHaveCSS("position", "relative");
  await expect(editor).toHaveCSS("overflow", "visible");
  const geometry = await editor.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: window.innerWidth };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(mobileMetadata).toBeVisible();
  await expect(mobileMetadata).toHaveCSS("font-size", "12.6px");
  const mobileMetadataBox = await mobileMetadata.boundingBox();
  expect(mobileMetadataBox).not.toBeNull();
  expect(mobileMetadataBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileMetadataBox!.x + mobileMetadataBox!.width).toBeLessThanOrEqual(390);
  await expect(mobileMetadata).not.toHaveAttribute("style", /font-size|fontSize/);
  const toggleBox = await toggle.boundingBox();
  expect(toggleBox).not.toBeNull();
  expect(toggleBox!.x).toBeGreaterThanOrEqual(0);
  expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(390);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

async function mockIssue(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    isAnonymous: false,
    isSiteAdmin: true,
    isConfirmed: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/11", (route: Route) =>
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
            id: 7,
            parentCommentId: "",
            authorLoginId: "admin",
            authorLabel: "Site Admin",
            authorAvatarUrl: "",
            contentsMarkdown: "Visible comment\n--- original ---\nOriginal comment",
            viaEmail: true,
            createdLabel: "today",
            viewerCanRead: true,
            viewerCanUpdate: false,
            viewerCanDelete: false,
            viewerHasVoted: false,
            voters: [],
            childComments: [],
            attachments: [],
          },
        ],
        timeline: [],
        childOpenCount: 1,
        childClosedCount: 1,
        childIssues: [
          {
            issueNumber: 12,
            title: "Open subtask",
            state: "OPEN",
            isDraft: false,
            labels: [],
            assigneeLabel: "",
          },
          {
            issueNumber: 13,
            title: "Closed subtask",
            state: "CLOSED",
            isDraft: false,
            labels: [],
            assigneeLabel: "",
          },
        ],
        attachments: [],
        labels: [],
        milestone: null,
        assigneeLoginId: null,
        commentCount: 1,
        viewerCanComment: true,
      },
    }),
  );
}
