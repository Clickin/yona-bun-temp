import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("issue detail header metadata floats are StyleX-owned", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const styles = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyBootstrap = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyPage = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(legacyView).toContain('<div class="pull-right mr10 mt10 hide-in-mobile">');
  expect(legacyView).toContain('class="pull-right hide show-in-mobile" style="font-size: 0.7em"');
  expect(legacyBootstrap).toContain(".pull-right {\n  float: right;\n}");
  expect(legacyCommon).toContain(".mr10 { margin-right:10px; }");
  expect(legacyCommon).toContain(".mt10 { margin-top:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(legacyYobi).toContain('@import "less/_page.less";');
  expect(legacyPage).toContain(".board-header {");
  expect(legacyPage).toContain("    .date {");
  expect(route).toMatch(
    /styles\.desktopMetadata\)\.className\} pull-right mr10 mt10 hide-in-mobile/u,
  );
  expect(route).not.toMatch(/styles\.mobileMetadata\)\.className\} pull-right/u);
  expect(styles).toMatch(
    /desktopMetadata:\s*\{[\s\S]*?float:\s*["']right["'][\s\S]*?marginRight:\s*["']10px["'][\s\S]*?marginTop:\s*["']10px["']/u,
  );
  expect(styles).toMatch(
    /mobileMetadata:\s*\{[\s\S]*?float:\s*["']right["'][\s\S]*?fontSize:\s*["']0\.7em["']/u,
  );

  await mockIssue(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`, { waitUntil: "commit" });

  const desktop = page.locator('[data-stylex-owner="project-issue-detail-desktop-metadata"]');
  const mobile = page.locator('[data-stylex-owner="project-issue-detail-mobile-metadata"]');
  await expect(desktop).toHaveCSS("float", "right");
  await expect(desktop).toHaveCSS("margin-right", "10px");
  await expect(desktop).toHaveCSS("margin-top", "10px");
  await expect(desktop).toHaveClass(/hide-in-mobile/);
  await expect(desktop).toHaveClass(/pull-right/);
  await expect(mobile).toHaveCSS("float", "right");
  await expect(mobile).toHaveCSS("font-size", "12.6px");
  await expect(mobile).toHaveClass(/hide/);
  await expect(mobile).toHaveClass(/show-in-mobile/);
  await expect(mobile).not.toHaveClass(/pull-right/);
  await expect(desktop).not.toHaveAttribute("style", /float|margin|font-size/);
  await expect(mobile).not.toHaveAttribute("style", /float|margin|font-size/);

  const screenshotDirectory = resolve(
    `output/playwright/stylex-project-issue-detail-header-metadata-floats/${
      process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal"
    }`,
  );
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(screenshotDirectory, "desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.VITE_DISABLE_LEGACY_FALLBACK === "1") {
    await expect(mobile).toBeHidden();
  } else {
    await expect(mobile).toBeVisible();
  }
  await expect(mobile).toHaveCSS("float", "right");
  const boxes = await page.evaluate(() => {
    const metadata = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-issue-detail-mobile-metadata"]',
    );
    const header = document.querySelector<HTMLElement>(".board-header.issue");
    if (!metadata || !header) return null;
    const metadataBox = metadata.getBoundingClientRect();
    const headerBox = header.getBoundingClientRect();
    return {
      left: metadataBox.left,
      right: metadataBox.right,
      headerRight: headerBox.right,
      scrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.left).toBeGreaterThanOrEqual(0);
  expect(boxes!.right).toBeLessThanOrEqual(boxes!.headerRight);
  expect(boxes!.scrollWidth).toBeLessThanOrEqual(boxes!.viewport);
  await page.screenshot({ fullPage: true, path: resolve(screenshotDirectory, "mobile.png") });
});

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
  const legacyBootstrap = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyPage = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const legacySubtasks = readFileSync(
    "../yona-original/app/views/issue/partial_list_subtask.scala.html",
    "utf8",
  );

  expect(legacyView).toContain("@partial_comments(project, issue)");
  expect(legacyView).toContain('class="pull-right hide show-in-mobile" style="font-size: 0.7em"');
  expect(legacyView).toContain('<div class="pull-right mr10 mt10 hide-in-mobile">');
  expect(legacyBootstrap).toContain(".pull-right {\n  float: right;\n}");
  expect(legacyCommon).toContain(".mr10 { margin-right:10px; }");
  expect(legacyCommon).toContain(".mt10 { margin-top:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(legacyYobi).toContain('@import "less/_page.less";');
  expect(legacyPage).toContain(".board-header {");
  expect(legacyPage).toContain("    .date {");
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
  expect(route).not.toContain("style={{ background: stringField(label.color) }}");
  expect(route).not.toContain("style={{ backgroundColor: stringField(label.color) }}");
  expect(route).toContain("color={stringField(label.color)}");
  expect(styles).toContain("labelColor: (backgroundColor: string) => ({");
  expect(route).toContain('data-stylex-owner="project-issue-detail-mobile-metadata"');
  expect(styles).toMatch(
    /mobileMetadata:\s*\{[\s\S]*?float:\s*["']right["'][\s\S]*?fontSize:\s*["']0\.7em["']/u,
  );
  expect(styles).toMatch(
    /desktopMetadata:\s*\{[\s\S]*?float:\s*["']right["'][\s\S]*?marginRight:\s*["']10px["'][\s\S]*?marginTop:\s*["']10px["']/u,
  );
  expect(route).toMatch(
    /styles\.desktopMetadata\)\.className\} pull-right mr10 mt10 hide-in-mobile/u,
  );
  expect(route).not.toMatch(/styles\.mobileMetadata\)\.className\} pull-right/u);
  expect(route).not.toContain('className="tab-content" style={{ position: "relative"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-original-message-toggle"');
  expect(styles).toContain('borderWidth: "0px"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-editor-tab-content"');
  expect(route).toContain("data-stylex-owner-instance={wrapId}");
  expect(styles).toContain("originalMessageToggle: {");
  expect(styles).toContain("editorTabContent: {");
  expect(styles).toMatch(/taskProgressBar:\s*\{[\s\S]*?width:\s*["']0px["']/u);
  expect(route).toContain('data-stylex-owner="project-issue-detail-task-progress-bar"');
  expect(route).not.toContain('<div className="bar red" style={{ width: 0 }}');

  await mockIssue(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`, { waitUntil: "commit" });

  const mobileMetadata = page.locator('[data-stylex-owner="project-issue-detail-mobile-metadata"]');
  await expect(mobileMetadata).toHaveCount(1);
  await expect(mobileMetadata).toHaveCSS("font-size", "12.6px");
  await expect(mobileMetadata).toBeHidden();
  await expect(mobileMetadata).toHaveCSS("float", "right");

  const desktopMetadata = page.locator(
    '[data-stylex-owner="project-issue-detail-desktop-metadata"]',
  );
  await expect(desktopMetadata).toHaveCSS("float", "right");
  await expect(desktopMetadata).toHaveClass(/hide-in-mobile/);
  await expect(desktopMetadata).toHaveClass(/pull-right/);
  await expect(mobileMetadata).toHaveClass(/hide/);
  await expect(mobileMetadata).toHaveClass(/show-in-mobile/);
  await expect(mobileMetadata).not.toHaveClass(/pull-right/);

  const screenshotDirectory = resolve(
    `output/playwright/stylex-project-issue-detail-header-metadata-floats/${
      process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal"
    }`,
  );
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "desktop.png"),
  });

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
  await expect(mobileMetadata).toHaveCSS("float", "right");
  const mobileMetadataBox = await mobileMetadata.boundingBox();
  expect(mobileMetadataBox).not.toBeNull();
  expect(mobileMetadataBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileMetadataBox!.x + mobileMetadataBox!.width).toBeLessThanOrEqual(390);
  await expect(mobileMetadata).not.toHaveAttribute("style", /font-size|fontSize/);
  const labelColors = page.locator('[data-stylex-owner="project-issue-detail-label-color"]');
  await expect(labelColors).toHaveCount(2);
  await expect(labelColors.filter({ hasText: "bug" }).first()).toHaveCSS(
    "background-color",
    "rgb(210, 40, 40)",
  );
  await expect(labelColors.filter({ hasText: "feature" }).first()).toHaveCSS(
    "background-color",
    "rgb(40, 110, 210)",
  );
  for (const label of await labelColors.all()) {
    await expect(label).not.toHaveAttribute("style", /(?:^|;)\s*background(?:-color)?\s*:/i);
  }
  const toggleBox = await toggle.boundingBox();
  expect(toggleBox).not.toBeNull();
  expect(toggleBox!.x).toBeGreaterThanOrEqual(0);
  expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(390);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "mobile.png"),
  });
});

async function mockIssue(page: Page) {
  const bugLabel = {
    id: 1,
    name: "bug",
    color: "#d22828",
    categoryId: 1,
    categoryName: "Type",
    categoryIsExclusive: false,
  };
  const featureLabel = {
    id: 2,
    name: "feature",
    color: "#286ed2",
    categoryId: 1,
    categoryName: "Type",
    categoryIsExclusive: false,
  };
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [bugLabel, featureLabel] } }),
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
            labels: [featureLabel],
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
        labels: [bugLabel],
        milestone: null,
        assigneeLoginId: null,
        commentCount: 1,
        viewerCanComment: true,
      },
    }),
  );
}
