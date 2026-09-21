import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("moves board post detail static residuals to route-local Style", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");

  const template = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");
  const boardTemplate = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const commentTemplate = readFileSync(
    "../yona-original/app/views/common/commentForm.scala.html",
    "utf8",
  );
  const commentUpdateTemplate = readFileSync(
    "../yona-original/app/views/common/commentUpdateForm.scala.html",
    "utf8",
  );
  const uploadTemplate = readFileSync(
    "../yona-original/app/views/common/uploadForm.scala.html",
    "utf8",
  );
  const commonStyles = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const selectedLabelPartial = readFileSync(
    "../yona-original/app/views/issue/partial_show_selected_label.scala.html",
    "utf8",
  );
  const responsiveStyles = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const tasklistTemplate = readFileSync(
    "../yona-original/app/views/common/tasklistBar.scala.html",
    "utf8",
  );
  const originalMessage = readFileSync(
    "../yona-original/public/javascripts/common/yobi.OriginalMessage.js",
    "utf8",
  );
  const keymapTemplate = readFileSync("../yona-original/app/views/help/keymap.scala.html", "utf8");
  expect(template).toContain(
    '<div class="tab-content" style="position:relative;overflow: visible;">',
  );
  expect(boardTemplate).toContain(
    '<div class="pull-right hide show-in-mobile" style="font-size: 0.7em">',
  );
  expect(boardTemplate).toContain('<div class="board-actrow right-txt">');
  expect(commentTemplate).toContain('<div class="right-txt">');
  expect(commentTemplate).toContain('<div class="right-txt mt10">');
  expect(commentUpdateTemplate).toContain(
    '<div class="right-txt comment-update-button upload-button-line">',
  );
  expect(uploadTemplate).toContain('<p class="right-txt help">');
  expect(commonStyles).toContain(".right-txt     { text-align:right; }");
  expect(boardTemplate).toContain('class="board-id">#@post.getNumber</strong>');
  expect(boardTemplate).toContain(
    'class="date" title="@JodaDateUtil.getDateString(post.createdDate)">',
  );
  expect(selectedLabelPartial).toContain('style="background:@label.color"');
  expect(responsiveStyles).toContain(".show-in-mobile {");
  expect(responsiveStyles).toContain("display: block !important;");
  expect(responsiveStyles).toContain(".hide-in-mobile {");
  expect(originalMessage).toContain(".css('border', 0)");
  expect(originalMessage).toContain(".css('padding-left', '5px')");
  expect(tasklistTemplate).toContain(
    '<div class="bar red" style="width: 0;" title="Tasklist"></div>',
  );
  expect(keymapTemplate).toContain(
    '<div class="pull-left" style="padding:10px 0; margin-left: 55px;">',
  );

  expect(route).toContain('data-owner="post-detail-title"');
  expect(route).toContain('data-owner="post-detail-board-id"');
  expect(route).toContain('data-owner="post-detail-date"');
  for (const owner of [
    "post-detail-actions",
    "post-detail-disabled-comment-actions",
    "post-detail-comment-upload-help",
    "post-detail-comment-actions",
    "post-detail-comment-update-actions",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  await mockPost(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/demo/post/1`);

  for (const owner of [
    "post-detail-actions",
    "post-detail-comment-upload-help",
    "post-detail-comment-actions",
  ]) {
    const element = page.locator(`[data-owner="${owner}"]`);
    await expect(element).toHaveCount(1);
    await expect(element).not.toHaveAttribute("style", /text-align/i);
    await expect(element).toHaveCSS("text-align", "right");
  }

  const label = page.locator('[data-owner="post-detail-label-background"]');
  await expect(label).toHaveCount(1);
  await expect(label).toHaveAttribute("style", /--x-backgroundColor/);
  await expect(label).not.toHaveAttribute("style", /background(?:-color)?\s*:/i);
  await expect(label).toHaveCSS("background-color", "rgb(210, 40, 40)");
  await expect(label).toHaveAttribute("class", /issue-label/);

  const mobileMetadata = page.locator('[data-owner="post-detail-mobile-metadata"]');
  await expect(mobileMetadata).toHaveCount(1);
  await expect(mobileMetadata).not.toHaveAttribute("style", /.+/);
  const desktopMetadata = await mobileMetadata.evaluate((element) => ({
    display: getComputedStyle(element).display,
    fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
  }));
  expect(desktopMetadata.display).toBe("none");
  // The legacy 18px title × 0.7em computes to 12.6px and Chromium exposes
  // the rounded used value (13px) for this inherited heading context.
  expect(desktopMetadata.fontSize).toBeCloseTo(12.6, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(mobileMetadata).toBeVisible();
  const mobileMetadataStyle = await mobileMetadata.evaluate((element) => ({
    display: getComputedStyle(element).display,
    fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
  }));
  expect(mobileMetadataStyle.display).toBe("block");
  expect(mobileMetadataStyle.fontSize).toBeCloseTo(12.6, 0);
  const title = page.locator('[data-owner="post-detail-title"]');
  const boardId = page.locator('[data-owner="post-detail-board-id"]');
  const date = page.locator('[data-owner="post-detail-date"]').first();
  await expect(title).toHaveCSS("padding-left", "20px");
  await expect(title).toHaveCSS("padding-right", "20px");
  await expect(title).toHaveCSS("background-color", "rgb(242, 242, 242)");
  await expect(boardId).toHaveCSS("color", "rgb(147, 147, 147)");
  await expect(boardId).toHaveCSS("font-size", "14px");
  await expect(date).toHaveCSS("color", "rgb(153, 153, 153)");
  await expect(date).toHaveCSS("line-height", "29px");
  const mobileMetadataBox = await mobileMetadata.boundingBox();
  const titleBox = await page.locator(".title").first().boundingBox();
  expect(mobileMetadataBox).not.toBeNull();
  expect(mobileMetadataBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileMetadataBox!.x + mobileMetadataBox!.width).toBeLessThanOrEqual(390);
  if (titleBox) {
    expect(mobileMetadataBox!.x).toBeGreaterThanOrEqual(titleBox.x);
    expect(mobileMetadataBox!.x + mobileMetadataBox!.width).toBeLessThanOrEqual(
      titleBox.x + titleBox.width,
    );
  }

  await page.setViewportSize({ width: 1366, height: 900 });

  const tabContent = page.locator('[data-owner="post-detail-editor-tab-content"]').first();
  await expect(tabContent).toHaveCount(1);
  await expect(tabContent).not.toHaveAttribute("style", /.+/);
  await expect(tabContent).toHaveCSS("position", "relative");
  await expect(tabContent).toHaveCSS("overflow", "visible");

  const toggle = page.locator('[data-owner="post-detail-original-message-toggle"]');
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toHaveCSS("border-top-width", "0px");
  await expect(toggle).toHaveCSS("padding-left", "5px");
  await expect(toggle).toHaveCSS("padding-right", "5px");

  const tasklistProgress = page.locator('[data-owner="post-detail-tasklist-progress"]');
  expect(await tasklistProgress.count()).toBeGreaterThan(0);
  for (let index = 0; index < (await tasklistProgress.count()); index += 1) {
    const progress = tasklistProgress.nth(index);
    await expect(progress).toHaveAttribute("class", /bar/);
    await expect(progress).toHaveAttribute("class", /red/);
    // F5 width: 0px — yona-original/app/views/common/tasklistBar.scala.html
    // renders `style="width: 0;"` inline; the app keeps the equivalent
    // inline `width: 0px` (route-local Style does not own this declaration).
    await expect(progress).toHaveAttribute("style", /width:\s*0/);
    await expect(progress).toHaveCSS("width", "0px");
  }

  const keymap = page.locator('[data-owner="post-detail-keymap-wrapper"]');
  await expect(keymap).toHaveCount(1);
  await expect(keymap).not.toHaveAttribute("style", /.+/);
  await expect(keymap).toHaveCSS("padding-top", "10px");
  await expect(keymap).toHaveCSS("padding-bottom", "10px");
  await expect(keymap).toHaveCSS("margin-left", "55px");
  const keymapButton = keymap.locator("button.ybtn").first();
  await expect(keymapButton).toHaveCount(1);
  await keymapButton.click();
  const keymapModal = page.locator("#helpKeys");
  await expect(keymapModal).toBeVisible();

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const wrapperBox = await keymap.boundingBox();
    expect(wrapperBox).not.toBeNull();
    expect(wrapperBox!.x).toBeGreaterThanOrEqual(0);
    expect(wrapperBox!.x + wrapperBox!.width).toBeLessThanOrEqual(viewport.width);
  }
});

test("post detail right alignment owners are route-local Style", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");

  for (const owner of [
    "post-detail-actions",
    "post-detail-disabled-comment-actions",
    "post-detail-comment-upload-help",
    "post-detail-comment-actions",
    "post-detail-comment-update-actions",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
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
        comments: [
          {
            id: "comment-1",
            authorLabel: "reviewer",
            authorLoginId: "reviewer",
            contentsMarkdown: "Visible comment\n\n---Original message---\nHidden comment",
            viaEmail: true,
            createdAt: "2026-07-02T00:00:00+09:00",
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
        labels: [
          {
            categoryId: "cat-1",
            categoryIsExclusive: false,
            categoryName: "Status",
            color: "rgb(210, 40, 40)",
            id: "label-1",
            name: "Bug",
          },
        ],
      },
    }),
  );
}
