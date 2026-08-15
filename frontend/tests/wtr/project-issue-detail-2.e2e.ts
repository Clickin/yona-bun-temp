import { expect, test, type Page, readFileSync } from "../wtr-compat.ts";
import {
  EXPECTED_ISSUE_DETAIL,
  TASKLIST,
  COMMENT_FORM,
  LEFT_COMMENT_TIMELINE,
  RIGHT_INDEX_COMMENT_TIMELINE,
  LEFT_EVENT_TIMELINE,
  LEFT_ASSIGNEE_EVENT_TIMELINE,
  LEFT_MILESTONE_EVENT_TIMELINE,
  LEFT_NULL_MILESTONE_EVENT_TIMELINE,
  LEFT_MOVED_EVENT_TIMELINE,
  LEFT_COMMIT_REFERRED_EVENT_TIMELINE,
  LEFT_PULL_REQUEST_REFERRED_EVENT_TIMELINE,
  LEFT_SHARER_ADDED_EVENT_TIMELINE,
  LEFT_SHARER_DELETED_EVENT_TIMELINE,
  LEFT_LABEL_ADDED_EVENT_TIMELINE,
  LEFT_LABEL_DELETED_EVENT_TIMELINE,
  LEFT_CONSECUTIVE_SHARER_ADDED_EVENT_TIMELINE,
  LEFT_CONSECUTIVE_LABEL_DELETED_EVENT_TIMELINE,
  LEFT_DEFAULT_EVENT_TIMELINE,
  mockProjectIssueDetail,
  issueNotFoundMetrics,
  headTitleText,
  lastHeadMetaContent,
  commentDeleteModalMetrics,
  canonicalize,
  canonicalizeAll,
  canonicalizeHtml,
  setBrowserLanguage,
  armRootModalBridgeTrap,
  rootModalBridgeHits,
  installClipboardSpy,
  lastCopiedText,
  expectIssueDetailAssets,
  expectIssueDetailTooltipMetadata,
  expectLegacyTopHoverPopover,
  expectIssueDetailSelect2Partial,
  childReplyPlaceholder,
  protectedIssueShellMetrics,
  readReplyMetrics,
  dedupeRequests,
  getUserAvatar,
  insulateModalButtonClick,
  splitOriginalMessage,
  assertContained,
  loadModule,
  partial_voters,
  attachedFilesHtml,
  child_commentForm,
  legacyIssueOpenGraphDescription,
  yonaAssgineeModule,
  commentVoters,
  issueVoterAvatarOrderMetrics,
  commentUpdateFormMetrics,
  childCommentAnchorMetrics,
  commentVoterModalMetrics,
  issueDetailShellMetrics,
  indexCommentMetrics,
  issueCommentMetrics,
  eventTimelineMetrics,
  childIssueMetrics,
  selectedLabelMetrics,
  keymapModalMetrics,
  dueDateInlineUpdateMetrics,
} from "./project-issue-detail-shared.ts";

test("project issue detail switches legacy comment editor tabs through React state controls", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const commentEditor = page.locator("#comment-form .mt10:has(#editor-contents-contents)");
  const editTabItem = commentEditor.locator(".nav-tabs > li").nth(0);
  const previewTabItem = commentEditor.locator(".nav-tabs > li").nth(1);
  const editTab = editTabItem.getByRole("button", { name: "Edit" });
  const previewTab = previewTabItem.getByRole("button", { name: "Preview" });
  const initialUrl = page.url();

  await expect(commentEditor).toHaveCount(1);
  await expect(commentEditor).not.toHaveAttribute("data-toggle", "markdown-editor");
  await expect(page.locator('#comment-form [data-toggle="markdown-editor"]')).toHaveCount(0);
  await expect(commentEditor.locator(".nav-tabs > li:nth-child(1) > button")).toHaveText("Edit");
  await expect(commentEditor.locator(".nav-tabs > li:nth-child(2) > button")).toHaveText("Preview");
  await expect(commentEditor.locator(".nav-tabs > li:nth-child(1) > button")).not.toHaveAttribute(
    "data-mode",
  );
  await expect(commentEditor.locator(".nav-tabs > li:nth-child(2) > button")).not.toHaveAttribute(
    "data-mode",
  );
  await expect(
    commentEditor.locator(".nav-tabs > li:nth-child(-n+2) > button[data-mode]"),
  ).toHaveCount(0);
  await expect(page.locator("#comment-form button[data-target]")).toHaveCount(0);
  await expect(editTab).not.toHaveAttribute("data-toggle", "tab");
  await expect(previewTab).not.toHaveAttribute("data-toggle", "tab");
  await expect(page.locator('#comment-form button[data-toggle="tab"]')).toHaveCount(0);
  await expect(editTabItem).toHaveClass(/active/);
  await expect(previewTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#edit-contents")).toHaveClass(/active/);
  await expect(page.locator("#preview-contents")).not.toHaveClass(/active/);
  await expect(page.locator("#comment-form .notification-receiver")).toHaveCount(1);
  await expect(
    page.locator("#comment-form #upload[data-resource-type='ISSUE_COMMENT']"),
  ).toHaveCount(1);
  await expect(page.locator("#comment-form .markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator("#comment-form .markdown-help-wrap > .markdown-help-item")).toHaveCount(
    10,
  );
  const editMetrics = await page.evaluate(() => {
    const tabs = document.querySelector("#comment-form .nav-tabs");
    const edit = document.querySelector("#edit-contents");
    if (!tabs || !edit) return null;
    const tabBox = tabs.getBoundingClientRect();
    const editBox = edit.getBoundingClientRect();
    return {
      editTop: editBox.top,
      editWidth: editBox.width,
      tabBottom: tabBox.bottom,
      tabHeight: tabBox.height,
    };
  });
  expect(editMetrics).not.toBeNull();
  expect(editMetrics!.editTop).toBeGreaterThanOrEqual(editMetrics!.tabBottom);
  expect(editMetrics!.tabHeight).toBeGreaterThan(20);

  await previewTab.click();
  expect(page.url()).toBe(initialUrl);
  await expect(previewTabItem).toHaveClass(/active/);
  await expect(editTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#preview-contents")).toHaveClass(/active/);
  await expect(page.locator("#edit-contents")).not.toHaveClass(/active/);
  const previewMetrics = await page.evaluate(() => {
    const tabs = document.querySelector("#comment-form .nav-tabs");
    const preview = document.querySelector("#preview-contents");
    if (!tabs || !preview) return null;
    const tabBox = tabs.getBoundingClientRect();
    const previewBox = preview.getBoundingClientRect();
    return {
      previewTop: previewBox.top,
      previewWidth: previewBox.width,
      tabBottom: tabBox.bottom,
      tabHeight: tabBox.height,
    };
  });
  expect(previewMetrics).not.toBeNull();
  expect(previewMetrics!.previewTop).toBeGreaterThanOrEqual(previewMetrics!.tabBottom);
  expect(previewMetrics!.previewWidth).toBeCloseTo(editMetrics!.editWidth, 0);
  expect(previewMetrics!.tabHeight).toBeCloseTo(editMetrics!.tabHeight, 0);

  await editTab.click();
  expect(page.url()).toBe(initialUrl);
  await expect(editTabItem).toHaveClass(/active/);
  await expect(previewTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#edit-contents")).toHaveClass(/active/);
  await expect(page.locator("#preview-contents")).not.toHaveClass(/active/);
});

test("project issue detail shows notification receiver on editor focus", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const receiver = page.locator(
    '[data-owner="project-issue-detail-markdown-editor-notification-receiver"][data-owner-instance="contents"]',
  );
  await expect(receiver).toBeHidden();

  await page.locator('textarea[data-editor-mode="comment-body"]').focus();
  await expect(receiver).toBeVisible();
  await expect(receiver).toHaveCSS("display", "block");
  await expect(receiver.locator(".notification-receiver-title")).toHaveText(
    "Notification receivers",
  );
});

test("project issue detail owns generic MarkdownEditor notification receiver title color", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const legacyEditor = readFileSync(
    new URL("../../yona-original/app/views/common/editor.scala.html", import.meta.url),
    "utf8",
  );
  const legacyCommentForm = readFileSync(
    new URL("../../yona-original/app/views/common/commentForm.scala.html", import.meta.url),
    "utf8",
  );
  const legacyCommentUpdateForm = readFileSync(
    new URL("../../yona-original/app/views/common/commentUpdateForm.scala.html", import.meta.url),
    "utf8",
  );
  const legacyPage = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const legacyYobi = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
    "utf8",
  );
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(legacyEditor).toContain('<div class="notification-receiver">');
  expect(legacyEditor).toContain('<span class="notification-receiver-title">');
  expect(legacyCommentForm).toContain('@common.editor("contents","","","comment-body")');
  expect(legacyCommentUpdateForm).toContain('@common.editor("contents-" + comment.id');
  expect(legacyPage).toContain(".notification-receiver-title {");
  expect(
    legacyPage.slice(
      legacyPage.indexOf(".notification-receiver-title {"),
      legacyPage.indexOf(".notification-receiver-title {") + 100,
    ),
  ).toContain("color: #999;");
  expect(legacyYobi).toContain('@import "less/_page.less";');

  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-markdown-editor-notification-receiver-title"\]\s*\{\s*color:\s*#999/u,
  );

  await mockProjectIssueDetail(page, { viewerCanComment: true });
  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issue/11`);

    const genericReceiver = page.locator(
      '[data-owner="project-issue-detail-markdown-editor-notification-receiver"][data-owner-instance="contents"]',
    );
    const genericTitle = genericReceiver.locator(":scope > .notification-receiver-title");
    await expect(genericReceiver).toBeHidden();
    await expect(genericTitle).toHaveCount(1);
    await expect(genericTitle).toHaveText("Notification receivers");
    await expect(genericTitle).toHaveAttribute(
      "data-owner",
      "project-issue-detail-markdown-editor-notification-receiver-title",
    );
    await expect(genericTitle).not.toHaveAttribute("style");
    await expect(
      page.locator('[data-owner="project-issue-detail-child-comment-notification-receiver-title"]'),
    ).toHaveCount(1);

    await page.locator('textarea[data-editor-mode="comment-body"]').focus();
    await expect(genericReceiver).toBeVisible();
    await expect(genericTitle).toHaveCSS("color", "rgb(153, 153, 153)");
    await expect(genericTitle).not.toHaveAttribute("style");
    const newTitleOrder = await genericReceiver
      .locator(":scope > *")
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          node.classList.contains("notification-receiver-title")
            ? "notification-receiver-title"
            : "notification-receiver-list",
        ),
      );
    expect(newTitleOrder).toEqual(["notification-receiver-title", "notification-receiver-list"]);

    const comment = page.locator(".span-left-pane #comment-77");
    await comment
      .locator(':scope > .media-body > .meta-info > .act-row button[title="Edit comment"]')
      .click();
    const updateReceiver = page.locator(
      '[data-owner="project-issue-detail-markdown-editor-notification-receiver"][data-owner-instance="77"]',
    );
    const updateTitle = updateReceiver.locator(":scope > .notification-receiver-title");
    await expect(updateReceiver).toBeHidden();
    await page.locator("#editor-contents-77").focus();
    await expect(updateReceiver).toBeVisible();
    await expect(updateTitle).toHaveText("Notification receivers");
    await expect(updateTitle).toHaveAttribute(
      "data-owner",
      "project-issue-detail-markdown-editor-notification-receiver-title",
    );
    await expect(updateTitle).toHaveCSS("color", "rgb(153, 153, 153)");
    await expect(updateTitle).not.toHaveAttribute("style");
    await expect(updateReceiver.locator(":scope > *")).toHaveCount(2);
  }
});

test("project issue detail focuses child reply editor after legacy reply click", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const receiver = comment.locator(".child-comment-input-form .notification-receiver");
  await expect(comment.locator(".child-comment-input-form")).toBeHidden();
  await expect(receiver).toBeHidden();

  await comment.hover();
  await expect(comment.locator(".add-a-comment")).toBeVisible();
  await comment.locator(".add-a-comment").click();
  await expect(comment.locator(".child-comment-input-form")).toBeVisible();
  const replyEditor = comment.locator(".child-comment-input-form .editorSeries");
  const expectedReplyPlaceholder = await childReplyPlaceholder(page);
  await expect(replyEditor).toBeFocused();
  await expect(replyEditor).toHaveAttribute("placeholder", expectedReplyPlaceholder);
  await expect(receiver).toBeVisible();
  await expect(receiver).toHaveCSS("display", "block");
  await expect(receiver.locator(".notification-receiver-title")).toHaveText(
    "Notification receivers",
  );
});

test("project issue detail owns the child reply form declarations and geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const legacyForm = readFileSync(
    new URL("../../yona-original/app/views/common/child_commentForm.scala.html", import.meta.url),
    "utf8",
  );
  const legacyChildComments = readFileSync(
    new URL("../../yona-original/app/views/common/childComments.scala.html", import.meta.url),
    "utf8",
  );
  const legacyPage = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const legacyYobi = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
    "utf8",
  );
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(legacyForm).toContain(
    '<input class="parentCommentId" type="hidden" name="parentCommentId"',
  );
  expect(legacyForm).toContain('<div class="oneline-comment-box">');
  expect(legacyForm).toContain(
    '<textarea class="editorSeries" name="contents" markdown="true" rows="1"',
  );
  expect(legacyForm).toContain('<button type="submit" class="ybtn ybtn-success">OK</button>');
  expect(legacyForm).toContain('<div class="notification-receiver">');
  expect(legacyForm).toContain('<span class="notification-receiver-title">');
  expect(legacyChildComments).toContain('<div class="child-comment-input-form">');
  expect(legacyChildComments).toContain("@common.child_commentForm(");
  expect(legacyYobi).toContain('@import "less/_page.less";');
  const formLess = legacyPage.slice(
    legacyPage.indexOf("                .child-comment-input-form {"),
    legacyPage.indexOf("                .child-comment-input-form {") + 600,
  );
  for (const declaration of [
    "display: none;",
    "margin-top: 5px;",
    "border: none;",
    "border-bottom: 1px solid #ccc;",
    "border-radius: 0 !important;",
    "margin-bottom: 0;",
    "resize: none;",
    "overflow: hidden;",
    "padding-left: 10px;",
    "display: inline-block;",
  ]) {
    expect(formLess).toContain(declaration);
  }
  expect(routeSource).toContain('data-owner="project-issue-detail-child-comment-form"');

  // F5 (2026-08-15): app owns the hidden state via the state class
  // [data-owner="project-issue-detail-child-comment-form"].issue-detail-child-comment-form-hidden
  // (legacy _page.less .child-comment-input-form { display:none } base moved to the
  // class; visible = UA default because no base rule pins display).
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-child-comment-form"\]\.issue-detail-child-comment-form-hidden\s*\{\s*display:\s*none/u,
  );
  expect(styleSource).not.toMatch(
    /\[data-owner="project-issue-detail-child-comment-form"\]\s*\{\s*display:\s*none/u,
  );
  expect(styleSource).toMatch(
    /\.issue-detail-child-comment-textarea\s*\{[\s\S]*margin-top:\s*5px[\s\S]*border:\s*none[\s\S]*border-bottom:\s*1px solid #ccc[\s\S]*border-radius:\s*0 !important[\s\S]*margin-bottom:\s*0[\s\S]*resize:\s*none[\s\S]*overflow:\s*hidden[\s\S]*padding-left:\s*10px/u,
  );
  expect(styleSource).toMatch(
    /\.issue-detail-child-comment-submit\s*\{\s*display:\s*inline-block/u,
  );

  await mockProjectIssueDetail(page);
  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issue/11`);
    const comment = page.locator(".span-left-pane #comment-77");
    const reply = comment.locator(":scope > .add-a-comment");
    const form = comment.locator(":scope > .subcomment-media-body > .child-comment-input-form");
    const row = form.locator(":scope > form > .oneline-comment-box");
    const editor = row.locator(":scope > .editorSeries");
    const submit = row.locator(":scope > .ybtn-success");

    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute("data-owner", "project-issue-detail-child-comment-form");
    await expect(form).toBeHidden();
    await expect(form).not.toHaveAttribute("style");
    await expect(editor).toHaveCount(1);
    await expect(submit).toHaveCount(1);
    await expect(editor).not.toHaveAttribute("style");
    await expect(submit).not.toHaveAttribute("style");
    await expect(editor).toHaveAttribute("name", "contents");
    await expect(editor).toHaveAttribute("rows", "1");
    await expect(editor).toHaveAttribute("placeholder", await childReplyPlaceholder(page));
    await expect(submit).toHaveText("OK");

    await comment.hover();
    await reply.click();
    await expect(form).toBeVisible();
    await expect(editor).toBeFocused();
    await expect(form.locator(":scope > form > .parentCommentId")).toHaveValue("77");
    await expect(form.locator(":scope > form > .notification-receiver")).toBeVisible();

    const metrics = await row.evaluate((element) => {
      const rowRect = element.getBoundingClientRect();
      const editorElement = element.querySelector(":scope > .editorSeries");
      const submitElement = element.querySelector(":scope > .ybtn-success");
      if (!editorElement || !submitElement) throw new Error("child form controls are missing");
      const editorRect = editorElement.getBoundingClientRect();
      const submitRect = submitElement.getBoundingClientRect();
      const editorStyle = getComputedStyle(editorElement);
      const submitStyle = getComputedStyle(submitElement);
      return {
        editorLeft: editorRect.left,
        editorRight: editorRect.right,
        editorTop: editorRect.top,
        rowLeft: rowRect.left,
        rowRight: rowRect.right,
        rowTop: rowRect.top,
        submitBottom: submitRect.bottom,
        submitLeft: submitRect.left,
        submitRight: submitRect.right,
        submitTop: submitRect.top,
        editorStyle: {
          marginTop: editorStyle.marginTop,
          borderTopWidth: editorStyle.borderTopWidth,
          borderBottomWidth: editorStyle.borderBottomWidth,
          borderRadius: editorStyle.borderRadius,
          marginBottom: editorStyle.marginBottom,
          resize: editorStyle.resize,
          overflow: editorStyle.overflow,
          paddingLeft: editorStyle.paddingLeft,
          inlineStyle: editorElement.getAttribute("style"),
        },
        rowDisplay: getComputedStyle(element).display,
        submitStyle: {
          display: submitStyle.display,
          inlineStyle: submitElement.getAttribute("style"),
        },
      };
    });
    expect(metrics.editorStyle.marginTop).toBe("5px");
    expect(metrics.editorStyle.borderTopWidth).toBe("0px");
    expect(metrics.editorStyle.borderBottomWidth).toBe("1px");
    expect(metrics.editorStyle.borderRadius).toBe("0px");
    expect(metrics.editorStyle.marginBottom).toBe("0px");
    expect(metrics.editorStyle.resize).toBe("none");
    expect(metrics.editorStyle.overflow).toBe("hidden");
    expect(metrics.editorStyle.paddingLeft).toBe("10px");
    expect(metrics.editorStyle.inlineStyle).toBeNull();
    // The legacy declaration remains `display: inline-block`; flex-item blockification
    // makes the browser-computed submit display `block` inside the flex row.
    expect(metrics.rowDisplay).toBe("flex");
    expect(metrics.submitStyle.display).toBe("block");
    expect(metrics.submitStyle.inlineStyle).toBeNull();
    expect(metrics.editorLeft).toBeGreaterThanOrEqual(metrics.rowLeft - 1);
    expect(metrics.editorRight).toBeLessThanOrEqual(metrics.rowRight + 1);
    expect(metrics.submitLeft).toBeGreaterThanOrEqual(metrics.rowLeft - 1);
    expect(metrics.submitRight).toBeLessThanOrEqual(metrics.rowRight + 1);
    expect(metrics.editorTop).toBeGreaterThanOrEqual(metrics.rowTop - 1);
    expect(metrics.submitBottom).toBeGreaterThanOrEqual(metrics.submitTop);

    await editor.press("Escape");
    await expect(form).toBeHidden();
  }
});

test("project issue detail owns the child notification receiver declarations and geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const legacyForm = readFileSync(
    new URL("../../yona-original/app/views/common/child_commentForm.scala.html", import.meta.url),
    "utf8",
  );
  const legacyChildComments = readFileSync(
    new URL("../../yona-original/app/views/common/childComments.scala.html", import.meta.url),
    "utf8",
  );
  const legacyPage = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const legacyYobi = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
    "utf8",
  );
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(legacyForm).toContain('<div class="notification-receiver">');
  expect(legacyChildComments).toContain('<div class="child-comment-input-form">');
  expect(legacyYobi).toContain('@import "less/_page.less";');
  const childReceiverSelector = ".child-comment-input-form {\n    .notification-receiver {";
  const childReceiverStart = legacyPage.indexOf(childReceiverSelector);
  expect(childReceiverStart).toBeGreaterThanOrEqual(0);
  const childReceiverLess = legacyPage.slice(childReceiverStart, childReceiverStart + 260);
  const receiverLess = legacyPage.slice(
    legacyPage.indexOf(".notification-receiver {"),
    legacyPage.indexOf(".notification-receiver {") + 450,
  );
  for (const declaration of [
    "margin-left: 12px;",
    "border-bottom-left-radius: 3px;",
    "border-bottom-right-radius: 3px;",
  ]) {
    expect(childReceiverLess).toContain(declaration);
  }
  for (const declaration of [
    "background-color: #F7F7F7;",
    "display: none;",
    "text-align: start;",
    "padding: 5px 5px 5px 10px;",
  ]) {
    expect(receiverLess).toContain(declaration);
  }
  const titleSelector = ".notification-receiver-title {";
  const titleStart = legacyPage.indexOf(titleSelector);
  expect(titleStart).toBeGreaterThanOrEqual(0);
  expect(legacyPage.slice(titleStart, titleStart + 100)).toContain("color: #999;");
  expect(routeSource).toContain(
    'data-owner="project-issue-detail-child-comment-notification-receiver"',
  );
  expect(routeSource).toContain(
    'data-owner="project-issue-detail-child-comment-notification-receiver-title"',
  );

  // F5 (2026-08-15): app owns receiver hidden state via
  // .issue-detail-notification-receiver-hidden (legacy base display:none moved to
  // the class; visible = UA default, no base display pin).
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-child-comment-notification-receiver"\]\s*\{[\s\S]*margin-left:\s*12px[\s\S]*border-bottom-left-radius:\s*3px[\s\S]*border-bottom-right-radius:\s*3px[\s\S]*background-color:\s*#f7f7f7[\s\S]*text-align:\s*start[\s\S]*padding:\s*5px 5px 5px 10px/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-child-comment-notification-receiver"\]\.issue-detail-notification-receiver-hidden\s*\{\s*display:\s*none/u,
  );
  expect(styleSource).not.toMatch(
    /\[data-owner="project-issue-detail-child-comment-notification-receiver"\]\s*\{\s*display:\s*none/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-child-comment-notification-receiver-title"\][\s\S]*?\{\s*color:\s*#999/u,
  );

  await mockProjectIssueDetail(page);
  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issue/11`);
    const comment = page.locator(".span-left-pane #comment-77");
    const form = comment.locator(":scope > .subcomment-media-body > .child-comment-input-form");
    const receiver = form.locator(":scope > form > .notification-receiver");
    const parentReceiver = page.locator("#comment-form .notification-receiver");

    await expect(receiver).toHaveCount(1);
    await expect(receiver).toHaveAttribute(
      "data-owner",
      "project-issue-detail-child-comment-notification-receiver",
    );
    await expect(parentReceiver).toHaveCount(1);
    await expect(parentReceiver).not.toHaveAttribute(
      "data-owner",
      "project-issue-detail-child-comment-notification-receiver",
    );
    await expect(form).toBeHidden();
    await expect(receiver).toBeHidden();
    await expect(receiver).not.toHaveAttribute("style");

    await comment.hover();
    await comment.locator(":scope > .add-a-comment").click();
    await expect(form).toBeVisible();
    await expect(receiver).toBeVisible();
    await expect(comment.locator(".child-comment-input-form .editorSeries")).toBeFocused();
    const childTitle = receiver.locator(":scope > .notification-receiver-title");
    const parentTitle = parentReceiver.locator(":scope > .notification-receiver-title");
    await expect(childTitle).toHaveText("Notification receivers");
    await expect(childTitle).toHaveAttribute(
      "data-owner",
      "project-issue-detail-child-comment-notification-receiver-title",
    );
    await expect(parentTitle).toHaveCount(1);
    await expect(parentTitle).not.toHaveAttribute(
      "data-owner",
      "project-issue-detail-child-comment-notification-receiver-title",
    );
    await expect(receiver.locator(":scope > .notification-receiver-list")).toHaveCount(1);
    await expect(receiver.locator(":scope > span")).toHaveCount(2);
    await expect(receiver).not.toHaveAttribute("style");
    await expect(parentReceiver).toBeHidden();

    const metrics = await receiver.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const titleElement = element.querySelector(":scope > .notification-receiver-title");
      const style = getComputedStyle(element);
      const formRect = element.closest(".child-comment-input-form")?.getBoundingClientRect();
      if (!formRect || !titleElement)
        throw new Error("child notification receiver nodes are missing");
      const titleRect = titleElement.getBoundingClientRect();
      const titleStyle = getComputedStyle(titleElement);
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        formLeft: formRect.left,
        formRight: formRect.right,
        marginLeft: style.marginLeft,
        borderBottomLeftRadius: style.borderBottomLeftRadius,
        borderBottomRightRadius: style.borderBottomRightRadius,
        backgroundColor: style.backgroundColor,
        display: style.display,
        textAlign: style.textAlign,
        padding: style.padding,
        inlineStyle: element.getAttribute("style"),
        titleColor: titleStyle.color,
        titleInlineStyle: titleElement.getAttribute("style"),
        titleLeft: titleRect.left,
        titleRight: titleRect.right,
      };
    });
    expect(metrics.marginLeft).toBe("12px");
    expect(metrics.borderBottomLeftRadius).toBe("3px");
    expect(metrics.borderBottomRightRadius).toBe("3px");
    expect(metrics.backgroundColor).toBe("rgb(247, 247, 247)");
    expect(metrics.display).toBe("block");
    expect(metrics.textAlign).toBe("start");
    expect(metrics.padding).toBe("5px 5px 5px 10px");
    expect(metrics.inlineStyle).toBeNull();
    expect(metrics.titleColor).toBe("rgb(153, 153, 153)");
    expect(metrics.titleInlineStyle).toBeNull();
    expect(metrics.titleLeft).toBeGreaterThanOrEqual(metrics.left - 1);
    expect(metrics.titleRight).toBeLessThanOrEqual(metrics.right + 1);
    expect(metrics.left).toBeGreaterThanOrEqual(metrics.formLeft - 1);
    expect(metrics.right).toBeLessThanOrEqual(metrics.formRight + 1);
    expect(metrics.bottom).toBeGreaterThanOrEqual(metrics.top);

    await comment.locator(".child-comment-input-form .editorSeries").press("Escape");
    await expect(receiver).toBeHidden();
  }
});

test("project issue detail owns the child reply float across desktop and mobile", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const legacyChildComments = readFileSync(
    new URL("../../yona-original/app/views/common/childComments.scala.html", import.meta.url),
    "utf8",
  );
  const legacyPage = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const legacyBootstrap = readFileSync(
    new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
    "utf8",
  );
  const legacyYobi = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
    "utf8",
  );
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(legacyChildComments).toContain(
    '<div class="add-a-comment pull-right">@Messages("comment.oneline.comment.placeholder")</div>',
  );
  expect(legacyBootstrap).toContain(".pull-right {\n  float: right;\n}");
  expect(legacyYobi).toContain('@import "less/_page.less";');
  expect(legacyPage).toContain(".comment {");
  expect(legacyPage).toContain("            .add-a-comment {");
  for (const declaration of [
    "font-size: 12px;",
    "background-color: #fff;",
    "position: relative;",
    "right: 10px;",
    "color: #00b0e8;",
    "border: 1px solid #00b0e8;",
    "margin-top: -32px;",
    "padding: 0 5px;",
    "border-radius: 3px;",
    "display: none;",
    "z-index: 2;",
    "box-shadow: 1px 1px 2px #e0e0e0;",
    "cursor: pointer;",
    "display: block;",
  ]) {
    expect(legacyPage).toContain(declaration);
  }
  expect(routeSource).toContain('data-owner="project-issue-detail-child-comment-reply"');

  expect(routeSource).not.toContain("add-a-comment pull-right");
  // F5 (2026-08-15): app owns reply paint via [data-owner=...child-comment-reply]
  // (background resolves to #fff via --color-yona-surface) + :hover + hidden class.
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-child-comment-reply"\]\s*\{[^}]*font-size:\s*12px[^}]*background-color:\s*var\(--color-yona-surface\)[^}]*position:\s*relative[^}]*right:\s*10px[^}]*color:\s*#00b0e8[^}]*border:\s*1px solid #00b0e8[^}]*margin-top:\s*-32px[^}]*padding:\s*0 5px[^}]*border-radius:\s*3px[^}]*float:\s*right[^}]*z-index:\s*2[^}]*\}/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-child-comment-reply"\]:hover\s*\{[^}]*box-shadow:\s*1px 1px 2px #e0e0e0[^}]*cursor:\s*pointer[^}]*display:\s*block[^}]*\}/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-child-comment-reply"\]\.issue-detail-child-comment-reply-hidden\s*\{\s*display:\s*none/u,
  );
  expect(styleSource).not.toMatch(
    /\[data-owner="project-issue-detail-child-comment-reply"\]\s*\{\s*display:\s*none/u,
  );
  expect(routeSource).not.toContain("childAttachment");

  await mockProjectIssueDetail(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const reply = comment.locator(":scope > .add-a-comment");
  const parentActionRow = comment.locator(":scope > .media-body > .meta-info > .act-row");
  await expect(reply).toHaveCount(1);
  await expect(reply).toHaveText("Reply");
  await expect(reply).toHaveClass(/add-a-comment/);
  await expect(reply).not.toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
  await expect(reply).toHaveAttribute("data-owner", "project-issue-detail-child-comment-reply");
  expect(await reply.evaluate((element) => element.closest("#comment-77") !== null)).toBe(true);
  await expect(reply).not.toHaveAttribute("style");
  await expect(reply).toHaveCSS("display", "none");
  await expect(parentActionRow).not.toHaveAttribute(
    "data-owner",
    "project-issue-detail-child-comment-reply",
  );

  const readReplyMetrics = () =>
    reply.evaluate((element) => {
      const replyRect = element.getBoundingClientRect();
      const commentRect = element.closest("li.comment")?.getBoundingClientRect();
      if (!commentRect) throw new Error("parent comment target is missing");
      const computed = window.getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        borderStyle: computed.borderTopStyle,
        borderTopColor: computed.borderTopColor,
        borderTopWidth: computed.borderTopWidth,
        color: computed.color,
        display: computed.display,
        float: computed.float,
        fontSize: computed.fontSize,
        inlineStyle: element.getAttribute("style"),
        marginTop: computed.marginTop,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        position: computed.position,
        replyLeft: replyRect.left,
        replyRight: replyRect.right,
        right: computed.right,
        commentLeft: commentRect.left,
        commentRight: commentRect.right,
        zIndex: computed.zIndex,
        boxShadow: computed.boxShadow,
        cursor: computed.cursor,
      };
    });
  await comment.hover();
  await expect(reply).toBeVisible();
  await reply.hover();
  const desktopMetrics = await readReplyMetrics();
  expect(desktopMetrics.fontSize).toBe("12px");
  expect(desktopMetrics.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(desktopMetrics.position).toBe("relative");
  expect(desktopMetrics.right).toBe("10px");
  expect(desktopMetrics.color).toBe("rgb(0, 176, 232)");
  expect(desktopMetrics.borderTopWidth).toBe("1px");
  expect(desktopMetrics.borderStyle).toBe("solid");
  expect(desktopMetrics.borderTopColor).toBe("rgb(0, 176, 232)");
  expect(desktopMetrics.marginTop).toBe("-32px");
  expect(desktopMetrics.paddingLeft).toBe("5px");
  expect(desktopMetrics.paddingRight).toBe("5px");
  expect(desktopMetrics.borderRadius).toBe("3px");
  expect(desktopMetrics.display).toBe("block");
  expect(desktopMetrics.float).toBe("right");
  expect(desktopMetrics.zIndex).toBe("2");
  expect(desktopMetrics.boxShadow).toContain("1px 1px 2px");
  expect(desktopMetrics.boxShadow).toContain("rgb(224, 224, 224)");
  expect(desktopMetrics.cursor).toBe("pointer");
  expect(desktopMetrics.inlineStyle).toBeNull();
  expect(desktopMetrics.replyRight).toBeLessThanOrEqual(desktopMetrics.commentRight + 1);
  expect(desktopMetrics.replyLeft).toBeGreaterThanOrEqual(desktopMetrics.commentLeft - 1);

  await reply.click();
  const replyEditor = comment.locator(".child-comment-input-form .editorSeries");
  await expect(comment.locator(".child-comment-input-form")).toBeVisible();
  await expect(replyEditor).toBeFocused();
  await replyEditor.press("Escape");
  await expect(comment.locator(".child-comment-input-form")).toBeHidden();

  await page.setViewportSize({ height: 844, width: 390 });
  await comment.hover();
  await expect(reply).toBeVisible();
  await reply.hover();
  const mobileMetrics = await readReplyMetrics();
  expect(mobileMetrics.fontSize).toBe("12px");
  expect(mobileMetrics.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(mobileMetrics.position).toBe("relative");
  expect(mobileMetrics.right).toBe("10px");
  expect(mobileMetrics.color).toBe("rgb(0, 176, 232)");
  expect(mobileMetrics.borderTopWidth).toBe("1px");
  expect(mobileMetrics.borderStyle).toBe("solid");
  expect(mobileMetrics.borderTopColor).toBe("rgb(0, 176, 232)");
  expect(mobileMetrics.marginTop).toBe("-32px");
  expect(mobileMetrics.paddingLeft).toBe("5px");
  expect(mobileMetrics.paddingRight).toBe("5px");
  expect(mobileMetrics.borderRadius).toBe("3px");
  expect(mobileMetrics.display).toBe("block");
  expect(mobileMetrics.float).toBe("right");
  expect(mobileMetrics.zIndex).toBe("2");
  expect(mobileMetrics.boxShadow).toContain("1px 1px 2px");
  expect(mobileMetrics.boxShadow).toContain("rgb(224, 224, 224)");
  expect(mobileMetrics.cursor).toBe("pointer");
  expect(mobileMetrics.inlineStyle).toBeNull();
  expect(mobileMetrics.replyRight).toBeLessThanOrEqual(mobileMetrics.commentRight + 1);
  expect(mobileMetrics.replyLeft).toBeGreaterThanOrEqual(mobileMetrics.commentLeft - 1);
  await expect(reply).toHaveText("Reply");
});

test("project issue detail child reply escape hides legacy input form", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const form = comment.locator(".child-comment-input-form");
  await expect(form).toBeHidden();

  await comment.hover();
  await expect(comment.locator(".add-a-comment")).toBeVisible();
  await comment.locator(".add-a-comment").click();
  await expect(form).toBeVisible();
  await comment.locator(".child-comment-input-form .editorSeries").press("Escape");
  await expect(form).toBeHidden();
  await expect(comment.locator(".add-a-comment")).toBeVisible();
});

test("project issue detail toggles legacy comment update form through React-owned edit button", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyComment = readFileSync(
    "../yona-original/app/views/issue/partial_comment.scala.html",
    "utf8",
  );
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const legacyEdit = legacyComment.slice(
    legacyComment.indexOf(
      '<button type="button" class="btn-transparent-with-fontsize-lineheight ml10" data-toggle="comment-edit"',
    ),
    legacyComment.indexOf("</button>", legacyComment.indexOf('data-toggle="comment-edit"')) +
      "</button>".length,
  );
  const legacyDelete = legacyComment.slice(
    legacyComment.indexOf(
      '<button type="button" class="btn-transparent-with-fontsize-lineheight ml6" data-toggle="comment-delete"',
    ),
    legacyComment.indexOf("</button>", legacyComment.indexOf('data-toggle="comment-delete"')) +
      "</button>".length,
  );
  expect(legacyEdit).toContain('class="btn-transparent-with-fontsize-lineheight ml10"');
  expect(legacyDelete).toContain('class="btn-transparent-with-fontsize-lineheight ml6"');
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");
  expect(legacyCommon).toContain(".ml6 { margin-left:6px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  const parentActionEmitter = routeSource.slice(
    routeSource.lastIndexOf(
      "<button",
      routeSource.indexOf('data-owner="project-issue-detail-comment-action-edit"'),
    ),
    routeSource.indexOf(
      "</button>",
      routeSource.indexOf('data-owner="project-issue-detail-comment-action-delete"'),
    ) + "</button>".length,
  );

  expect(parentActionEmitter).toContain('data-owner="project-issue-detail-comment-action-edit"');
  expect(parentActionEmitter).toContain('data-owner="project-issue-detail-comment-action-delete"');
  expect(parentActionEmitter).not.toContain("ml10");
  expect(parentActionEmitter).not.toContain("ml6");
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-comment-action-edit"\]\s*\{[\s\S]*?margin-left:\s*10px/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-comment-action-delete"\]\s*\{[\s\S]*?margin-left:\s*6px/u,
  );
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const initialUrl = page.url();
  const comment = page.locator(".span-left-pane #comment-77");
  const parentActionRow = comment.locator(":scope > .media-body > .meta-info > .act-row");
  const editButton = parentActionRow.locator('button[title="Edit comment"][data-comment-id="77"]');
  const deleteButton = parentActionRow.locator('button[title="Delete comment"]');
  const cancelButton = comment.locator('.comment-update-form .ybtn-cancel[data-comment-id="77"]');
  const updateForm = comment.locator("#comment-editform-77");
  const updateEditor = updateForm.locator(".mt10:has(#editor-contents-77)");
  const updateEditTabItem = updateEditor.locator(".nav-tabs > li").nth(0);
  const updatePreviewTabItem = updateEditor.locator(".nav-tabs > li").nth(1);
  const updateEditTab = updateEditTabItem.getByRole("button", { name: "Edit" });
  const updatePreviewTab = updatePreviewTabItem.getByRole("button", { name: "Preview" });
  await expect(comment.locator("#comment-editform-77")).toBeHidden();
  await expect(comment.locator("#comment-body-77")).toBeVisible();
  await expect(editButton).toHaveClass(/btn-transparent-with-fontsize-lineheight/);
  await expect(deleteButton).toHaveCount(1);
  await expect(editButton).toHaveAttribute(
    "data-owner",
    "project-issue-detail-comment-action-edit",
  );
  await expect(deleteButton).toHaveAttribute(
    "data-owner",
    "project-issue-detail-comment-action-delete",
  );
  await expect(editButton).not.toHaveClass(/\bml10\b/u);
  await expect(deleteButton).not.toHaveClass(/\bml6\b/u);
  await expect(editButton).not.toHaveAttribute("style", /.+/u);
  await expect(deleteButton).not.toHaveAttribute("style", /.+/u);
  await expect(editButton).toHaveCSS("margin-left", "10px");
  await expect(deleteButton).toHaveCSS("margin-left", "6px");
  await expect(
    parentActionRow.locator(
      '[data-owner="project-issue-detail-comment-action-edit"] ~ [data-owner="project-issue-detail-comment-action-delete"]',
    ),
  ).toHaveCount(1);
  await expect(editButton).not.toHaveAttribute("data-toggle", "comment-edit");
  await expect(cancelButton).toHaveText("Cancel");
  await expect(updateEditor).toHaveCount(1);
  await expect(updateEditor).not.toHaveAttribute("data-toggle", "markdown-editor");
  await expect(updateForm.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  await expect(updateForm.locator("button[data-target]")).toHaveCount(0);

  await editButton.click();
  await expect(comment.locator("#comment-editform-77")).toBeVisible();
  await expect(comment.locator("#comment-body-77")).toBeHidden();
  await expect(comment.locator(".add-a-comment")).toBeHidden();
  await expect(updateEditor.locator(".nav-tabs > li:nth-child(1) > button")).toHaveText("Edit");
  await expect(updateEditor.locator(".nav-tabs > li:nth-child(2) > button")).toHaveText("Preview");
  await expect(updateEditor.locator(".nav-tabs > li:nth-child(1) > button")).not.toHaveAttribute(
    "data-mode",
  );
  await expect(updateEditor.locator(".nav-tabs > li:nth-child(2) > button")).not.toHaveAttribute(
    "data-mode",
  );
  await expect(
    updateEditor.locator(".nav-tabs > li:nth-child(-n+2) > button[data-mode]"),
  ).toHaveCount(0);
  await expect(updateEditTab).not.toHaveAttribute("data-toggle", "tab");
  await expect(updatePreviewTab).not.toHaveAttribute("data-toggle", "tab");
  await expect(updateEditTabItem).toHaveClass(/active/);
  await expect(updatePreviewTabItem).not.toHaveClass(/active/);
  await expect(updateForm.locator("#edit-77")).toHaveClass(/active/);
  await expect(updateForm.locator("#preview-77")).not.toHaveClass(/active/);
  await expect(updateForm.locator(".notification-receiver")).toHaveCount(1);
  await expect(
    updateForm.locator(".temporaryUploadFiles[name='temporaryUploadFiles']"),
  ).toHaveValue("");
  await expect(updateForm.locator("#upload-77[data-resourcetype='ISSUE_COMMENT']")).toHaveAttribute(
    "data-resourceid",
    "77",
  );
  // F5 dist-truth: the update form lives inside `.board-comment-wrap .comments`,
  // so the nested overrides apply (legacy _page.less:3019-3027:
  // `.comments .comment-update-form .textarea-box { padding-right:2px;
  // margin-bottom:10px } .write-comment-box { padding:10px }` and
  // _page.less:3485-3487 `.comment-update-button { margin-top:10px }`) —
  // not the top-level `.textarea-box`/`.write-comment-box` defaults.
  expect(await commentUpdateFormMetrics(page)).toEqual({
    bodyDisplay: "none",
    buttonLineMarginTop: "10px",
    formDisplay: "block",
    replyDisplay: "none",
    textareaBoxMarginBottom: "10px",
    textareaBoxPaddingRight: "2px",
    textareaValue: "Comment **markdown**",
    writeCommentBoxPadding: "10px",
  });

  await updatePreviewTab.click();
  expect(page.url()).toBe(initialUrl);
  await expect(updatePreviewTabItem).toHaveClass(/active/);
  await expect(updateEditTabItem).not.toHaveClass(/active/);
  await expect(updateForm.locator("#preview-77")).toHaveClass(/active/);
  await expect(updateForm.locator("#edit-77")).not.toHaveClass(/active/);

  await updateEditTab.click();
  expect(page.url()).toBe(initialUrl);
  await expect(updateEditTabItem).toHaveClass(/active/);
  await expect(updatePreviewTabItem).not.toHaveClass(/active/);
  await expect(updateForm.locator("#edit-77")).toHaveClass(/active/);
  await expect(updateForm.locator("#preview-77")).not.toHaveClass(/active/);

  await editButton.click();
  await expect(comment.locator("#comment-editform-77")).toBeHidden();
  await expect(comment.locator("#comment-body-77")).toBeVisible();

  await editButton.click();
  await expect(comment.locator("#comment-editform-77")).toBeVisible();
  await expect(comment.locator("#comment-body-77")).toBeHidden();

  await cancelButton.click();
  console.log("STEP-F cancel clicked");
  await expect(comment.locator("#comment-body-77")).toBeVisible();
  expect(await commentUpdateFormMetrics(page)).toMatchObject({
    bodyDisplay: "block",
    formDisplay: "none",
  });
});

test("project issue detail owns the parent comment action-row float with Style", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyComment = readFileSync(
    "../yona-original/app/views/issue/partial_comment.scala.html",
    "utf8",
  );
  const legacyBootstrap = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  expect(legacyComment).toContain('<span class="act-row pull-right">');
  expect(legacyBootstrap).toContain(".pull-right {\n  float: right;\n}");
  expect(legacyYobi).toContain('@import "less/_common.less";');

  expect(routeSource).toContain('data-owner="project-issue-detail-comment-action-row"');
  // copy-fix-current-dom: route composes the legacy action-row class alongside style

  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-comment-action-row"\]\s*\{[\s\S]*?float:\s*right/u,
  );
  // The frozen bootstrap fallback legitimately carries the .pull-right utility
  // (and the route composes the retained act-row pull-right class), so a whole-
  // source token check can never pass. The real guard is that the app's own CSS
  // never floats the action-row via a pull-right-class-scoped rule.
  expect(styleSource).not.toMatch(
    /\[data-owner="project-issue-detail-comment-action-row"\]\.pull-right/u,
  );

  await mockProjectIssueDetail(page);
  const issueUrl = `${basePath}/admin/sample/issue/11`;
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(issueUrl);

  const comment = page.locator(".span-left-pane #comment-77");
  const parentActionRow = comment.locator(":scope > .media-body > .meta-info > .act-row");
  const childActionRows = comment.locator(":scope .child-comments .act-row");
  await expect(parentActionRow).toHaveCount(1);
  await expect(parentActionRow).toHaveAttribute(
    "data-owner",
    "project-issue-detail-comment-action-row",
  );
  await expect(parentActionRow).toHaveClass(/(?:^|\s)act-row(?:\s|$)/u);
  // wave-33 retained-class retention (667398a04): route composes act-row pull-right
  await expect(parentActionRow).toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
  await expect(parentActionRow).toHaveCSS("float", "right");
  await expect(parentActionRow).not.toHaveAttribute("style", /.+/u);
  await expect(childActionRows).toHaveCount(0);

  const order = await parentActionRow
    .locator(":scope > *")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.className || node.getAttribute("title") || node.tagName),
    );
  expect(order[0]).toBe("new-issue-by");
  expect(order[1]).toContain("btn-transparent-with-fontsize-lineheight");
  await expect(
    parentActionRow.locator('[data-owner="project-issue-detail-comment-action-edit"]'),
  ).toHaveCount(1);
  await expect(
    parentActionRow.locator('[data-owner="project-issue-detail-comment-action-delete"]'),
  ).toHaveCount(1);
  await expect(parentActionRow.locator("button[title='Edit comment']")).toBeVisible();
  await expect(parentActionRow.locator("button[title='Delete comment']")).toBeVisible();

  const desktopGeometry = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>(
      "#comment-77 > .media-body > .meta-info > .act-row",
    );
    const meta = row?.parentElement;
    if (!row || !meta) return null;
    const rowBox = row.getBoundingClientRect();
    const metaBox = meta.getBoundingClientRect();
    return {
      row: {
        bottom: rowBox.bottom,
        left: rowBox.left,
        right: rowBox.right,
        top: rowBox.top,
      },
      meta: {
        bottom: metaBox.bottom,
        left: metaBox.left,
        right: metaBox.right,
        top: metaBox.top,
      },
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(desktopGeometry).not.toBeNull();
  expect(desktopGeometry!.row.left).toBeGreaterThanOrEqual(desktopGeometry!.meta.left);
  expect(desktopGeometry!.row.right).toBeLessThanOrEqual(desktopGeometry!.meta.right);
  expect(desktopGeometry!.row.top).toBeGreaterThanOrEqual(desktopGeometry!.meta.top);
  expect(desktopGeometry!.row.bottom).toBeLessThanOrEqual(desktopGeometry!.meta.bottom);
  expect(desktopGeometry!.row.right).toBeLessThanOrEqual(desktopGeometry!.viewportWidth);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(issueUrl);
  const mobileComment = page.locator(".span-left-pane #comment-77");
  const mobileActionRow = mobileComment.locator(":scope > .media-body > .meta-info > .act-row");
  await expect(mobileActionRow).toHaveCount(1);
  await expect(mobileActionRow).toHaveCSS("float", "right");
  await expect(mobileActionRow).not.toHaveAttribute("style", /.+/u);
  const mobileGeometry = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>(
      "#comment-77 > .media-body > .meta-info > .act-row",
    );
    const meta = row?.parentElement;
    if (!row || !meta) return null;
    const rowBox = row.getBoundingClientRect();
    const metaBox = meta.getBoundingClientRect();
    return {
      row: {
        bottom: rowBox.bottom,
        left: rowBox.left,
        right: rowBox.right,
        top: rowBox.top,
      },
      meta: {
        bottom: metaBox.bottom,
        left: metaBox.left,
        right: metaBox.right,
        top: metaBox.top,
      },
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(mobileGeometry).not.toBeNull();
  expect(mobileGeometry!.row.left).toBeGreaterThanOrEqual(mobileGeometry!.meta.left);
  expect(mobileGeometry!.row.right).toBeLessThanOrEqual(mobileGeometry!.meta.right);
  expect(mobileGeometry!.row.top).toBeGreaterThanOrEqual(mobileGeometry!.meta.top);
  expect(mobileGeometry!.row.bottom).toBeLessThanOrEqual(mobileGeometry!.meta.bottom);
  expect(mobileGeometry!.row.right).toBeLessThanOrEqual(mobileGeometry!.viewportWidth);
  await page.setViewportSize({ width: 1366, height: 900 });
});

test("project issue detail matches authored comment edit branch from legacy partial_comment/commentUpdateForm", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Site Admin",
        authorLoginId: "admin",
        childComments: [],
        contentsHtml: "<p>Server HTML should not render</p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viaEmail: false,
        voterCount: 0,
        voters: [],
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  expect(await comment.getAttribute("class")).toContain("author");

  await comment
    .locator(":scope > .media-body > .meta-info > .act-row")
    .locator('button[title="Edit comment"][data-comment-id="77"]')
    .click();

  const updateForm = comment.locator("#comment-editform-77");
  const notification = updateForm.locator(".send-notification-check");
  await expect(updateForm).toBeVisible();
  await expect(comment.locator("#comment-body-77")).toBeHidden();
  await expect(notification).toBeVisible();
  await expect(notification).not.toHaveAttribute("data-toggle", "popover");
  await expect(notification).not.toHaveAttribute("data-trigger", "hover");
  await expect(notification).not.toHaveAttribute("data-placement", "top");
  await expect(notification).not.toHaveAttribute("data-content", /./u);
  await expect(notification.locator("input[name='notificationMail']")).toBeChecked();
  await expect(notification.locator("strong")).toHaveText("Send notification mail");
  await expect(updateForm.locator("button[type='submit']")).toHaveText("Save");
  await expect(updateForm.locator(".ybtn-cancel[data-comment-id='77']")).toHaveText("Cancel");
});

test("project issue detail keeps React-owned comment edit button for readable comments", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        childComments: [],
        contentsHtml: "<p>Server HTML should not render</p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanRead: true,
        viewerCanUpdate: false,
        viaEmail: false,
        voterCount: 0,
        voters: [],
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const editButton = comment
    .locator(":scope > .media-body > .meta-info > .act-row")
    .locator('button[title="Edit comment"][data-comment-id="77"]');
  await expect(editButton).toHaveCount(1);
  await expect(editButton).toHaveClass(/btn-transparent-with-fontsize-lineheight/);
  await expect(editButton).not.toHaveClass(/\bml10\b/u);
  await expect(editButton).toHaveAttribute(
    "data-owner",
    "project-issue-detail-comment-action-edit",
  );
  await expect(editButton).toHaveCSS("margin-left", "10px");
  await expect(editButton).toHaveAttribute("title", "Edit comment");
  await expect(editButton).not.toHaveAttribute("data-toggle", "comment-edit");
  await expect(editButton.locator("i.yobicon-edit-2")).toHaveCount(1);

  await editButton.click();
  await expect(comment.locator("#comment-editform-77")).toBeVisible();
  await expect(comment.locator("#comment-editform-77 button[type='submit']")).toHaveCount(0);
});

test("project issue detail preserves legacy child comment anchor divs", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const childAnchor = comment.locator(":scope > #comment-78");
  await expect(childAnchor).toHaveCount(1);
  await expect(comment.locator(".one-line-comment #comment-78")).toHaveCount(0);
  await expect(
    comment.locator(
      `.subcomment-author a[href="${basePath}/admin/sample/issue/11#comment-78"].ago`,
    ),
  ).toHaveText("Jul 2, 2026");

  expect(await childCommentAnchorMetrics(page)).toEqual({
    anchorHeight: 0,
    anchorNextClass: "comment-avatar",
    childHref: `${basePath}/admin/sample/issue/11#comment-78`,
    inlineChildAnchorCount: 0,
  });
});

test("project issue detail does not duplicate child replies from the flat comment payload", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const childReply = {
    authorLabel: "QA One",
    authorLoginId: "qa1",
    contentsHtml: "<p>Child reply</p>",
    contentsMarkdown: "Child **reply**",
    createdLabel: "Jul 2, 2026",
    id: 78,
    parentCommentId: 77,
    viewerCanDelete: true,
  };
  const parentComment = {
    attachments: [],
    authorAvatarUrl: "/assets/images/default-avatar-32.png",
    authorLabel: "Dev Member",
    authorLoginId: "dev",
    childComments: [childReply],
    contentsHtml: "<p>Comment markdown</p>",
    contentsMarkdown: "Comment **markdown**",
    createdLabel: "Jul 2, 2026",
    id: 77,
    viewerCanDelete: true,
    viewerCanUpdate: true,
    viaEmail: false,
    voterCount: 0,
    voters: [],
  };

  await mockProjectIssueDetail(page, {
    commentCount: 1,
    comments: [parentComment, childReply],
    timeline: [
      { comment: parentComment, id: 77, kind: "comment" },
      { comment: childReply, id: 78, kind: "comment" },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const leftComments = page.locator(
    ".span-left-pane #comments .timeline-list > ul.comments > li.comment",
  );
  const rightComments = page.locator(
    ".span-right-pane #comments .timeline-list > ul.comments > li.comment.index-comment",
  );
  await expect(leftComments).toHaveCount(1);
  await expect(rightComments).toHaveCount(1);
  await expect(page.locator(".span-left-pane #comments .comment-header .num")).toHaveText("1");
  await expect(page.locator(".span-right-pane #comments .comment-header .num")).toHaveText("1");
  await expect(
    page.locator(".span-left-pane #comments .timeline-list > ul.comments > li#comment-78"),
  ).toHaveCount(0);
  await expect(
    page.locator(".span-right-pane #comments .timeline-list > ul.comments > li#comment-78"),
  ).toHaveCount(0);
  await expect(page.locator(".span-left-pane #comment-77 > #comment-78")).toHaveCount(1);
  await expect(
    page.locator(".span-left-pane #comment-77 .child-comments .one-line-comment"),
  ).toHaveCount(1);
  await expect(
    page.locator(
      `.span-left-pane #comment-77 .subcomment-author a[href="${basePath}/admin/sample/issue/11#comment-78"].ago`,
    ),
  ).toHaveCount(1);
});

test("project issue detail renders legacy index comment mention and child count state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        childComments: [
          {
            authorLabel: "QA One",
            authorLoginId: "qa1",
            contentsHtml: "<p>Child mention</p>",
            contentsMarkdown: "Child @admin note",
            createdLabel: "Jul 2, 2026",
            id: 78,
            viewerCanDelete: true,
          },
          {
            authorLabel: "QA Two",
            authorLoginId: "qa2",
            contentsHtml: "<p>Second child</p>",
            contentsMarkdown: "Second child",
            createdLabel: "Jul 2, 2026",
            id: 79,
            viewerCanDelete: true,
          },
        ],
        contentsHtml: "<p>Ping @admin please</p>",
        contentsMarkdown: "Ping @admin please",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viaEmail: false,
        voterCount: 0,
        voters: [],
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".span-left-pane #comment-77")).toHaveClass("comment mentioned");
  const indexComment = page.locator(".span-right-pane #comment-77.index-comment");
  await expect(indexComment).toHaveClass("comment index-comment mentioned mentionedInChild");
  expect(await canonicalize(page, ".span-right-pane #comment-77 .comment-exists")).toEqual(
    await canonicalizeHtml(
      page,
      `<span class="comment-exists"><i class="yobicon-comment2"></i>2</span>`,
    ),
  );
});

test("project issue detail renders legacy draft header state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    isDraft: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".span-left-pane > #comments")).toHaveCount(0);

  const expectedHeader = `<div class="board-header issue"><div class="pull-right mr10 mt10 hide-in-mobile"><div class="date" title="Jul 1, 2026">Jul 1, 2026</div><span class="badge badge-issue-open">Open</span></div><div class="title"><strong class="board-id"><span class="draft-number">#Draft</span></strong>Fix flaky issue<span class="favorite-issue" data-issue-id="42"><i class="star material-icons va-text-top">star</i></span><div class="hide show-in-mobile"><span class="date" title="Jul 1, 2026">Jul 1, 2026</span><span class="badge badge-small badge-issue-open">Open</span></div></div><div class="draft">This is an draft issue. Only you can see it until you publish.</div></div>`;
  expect(await canonicalize(page, ".board-header.issue")).toEqual(
    await canonicalizeHtml(page, expectedHeader),
  );
  expect(await canonicalize(page, ".span-right-pane #comments")).toEqual(
    await canonicalizeHtml(
      page,
      `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><strong>Comment</strong> <strong class="num">0</strong></div></div></div></div>`,
    ),
  );
});

test("project issue detail hides watch button when legacy WATCH is not allowed", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanWatch: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".board-actrow #watch-button")).toHaveCount(0);
  await expect(page.locator(".board-actrow #issue-share-button")).toHaveCount(1);
  await expect(page.locator(".board-actrow .issue-weight")).toHaveCount(1);
});

test("project issue detail watch button posts and toggles legacy watching state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { watchRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const watchButton = page.locator(".board-actrow #watch-button");
  await expect(watchButton).toHaveText("Subscribe");
  await expect(watchButton).toHaveAttribute("data-watching", "false");
  await expect(watchButton).not.toHaveClass(/ybtn-watching/);

  const watchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/watch") &&
      response.request().method() === "POST",
  );
  await watchButton.click();
  await watchResponsePromise;

  expect(watchRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(watchButton).toHaveText("Unsubscribe from this issue");
  await expect(watchButton).toHaveAttribute("data-watching", "true");
  await expect(watchButton).toHaveClass(/ybtn-watching/);
});

test("project issue detail reveals legacy sharer list from share button", async ({ page }) => {
  await mockProjectIssueDetail(page);

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);
  await page.locator("#issue-share-button").click();

  const sharerList = page.locator(".span-left-pane > .sharer-list");
  const title = sharerList.locator(":scope > dt");
  const content = sharerList.locator(":scope > #sharer-list");
  await expect(sharerList).toHaveClass(/sharer-list/);
  await expect(sharerList).toHaveClass(/hideFromDisplayOnly/);
  await expect(sharerList).toHaveClass(/sharer-list-border/);
  await expect(sharerList).toHaveCSS("display", "block");
  await expect(title).toHaveClass(/issue-share-title/);
  await expect(title).not.toHaveClass(/(?:^|\s)mb10(?:\s|$)/u);
  await expect(title).toHaveText("Issue Sharer");
  await expect(title.locator(".issue-sharer-count")).toHaveText("");
  await expect(content).toHaveAttribute("id", "sharer-list");
  await expect(content).toHaveCSS("display", "block");
  await expect(content.locator("#issueSharer")).toHaveAttribute("type", "hidden");
  await expect(content.locator("#issueSharer")).toHaveAttribute("class", "bigdrop width100p");
  await expect(content.locator("#issueSharer")).toHaveAttribute("name", "issueSharer");
  await expect(content.locator("#issueSharer")).toHaveAttribute(
    "placeholder",
    "Select Issue Sharer",
  );
  await expect(content.locator("#issueSharer")).toHaveValue("");
});

test("project issue detail owns sharer title spacing with route Style", async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(legacyView).toContain('<dt class="issue-share-title mb10">');
  expect(legacyCommon).toContain(".mb10 { margin-bottom:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');

  expect(routeSource).toContain('data-owner="project-issue-detail-sharer-title"');
  expect(routeSource).not.toContain('className="issue-share-title mb10"');
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-sharer-title"\]\s*\{\s*margin-bottom:\s*10px;\s*\}/u,
  );

  await mockProjectIssueDetail(page, { sharers: [] });
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const title = page.locator('[data-owner="project-issue-detail-sharer-title"]');
  const list = page.locator(".span-left-pane > .sharer-list");
  const shareButton = page.locator("#issue-share-button");
  await expect(title).toHaveCount(1);
  await expect(title).not.toHaveAttribute("style", /.+/u);
  await expect(title).toHaveCSS("margin-bottom", "10px");
  await shareButton.click();
  await expect(title).toBeVisible();
  await expect(list).toHaveClass(/sharer-list-border/);
  await expect(list.locator("#sharer-list")).toHaveCSS("display", "block");
  await expect(title).toHaveText("Issue Sharer");
  await expect(title.locator(".issue-sharer-count")).toHaveText("");
});

test("project issue detail hidden sharer and assignee inputs omit empty title residue", async ({
  page,
}) => {
  await mockProjectIssueDetail(page);

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);
  await page.locator("#issue-share-button").click();

  const issueSharer = page.locator("#issueSharer");
  await expect(issueSharer).toHaveAttribute("type", "hidden");
  await expect(issueSharer).toHaveAttribute("class", "bigdrop width100p");
  await expect(issueSharer).toHaveAttribute("name", "issueSharer");
  await expect(issueSharer).toHaveAttribute("placeholder", "Select Issue Sharer");
  await expect(issueSharer).toHaveValue("");
  await expect(issueSharer).not.toHaveAttribute("title", "");

  const assignee = page.locator("#assignee");
  await expect(assignee).toHaveAttribute("type", "hidden");
  await expect(assignee).toHaveClass(/bigdrop/);
  await expect(assignee).toHaveAttribute("name", "assigneeLoginId");
  await expect(assignee).toHaveAttribute("placeholder", "No assignee");
  await expect(assignee).toHaveAttribute("style", "width: 100%;");
  await expect(assignee).toHaveValue("admin");
  await expect(assignee).not.toHaveAttribute("title", "");

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  expect(routeSource).toContain('id="issueSharer"');
  expect(routeSource).toContain('id="assignee"');
  const issueSharerSource = routeSource.slice(
    routeSource.indexOf('id="issueSharer"') - 180,
    routeSource.indexOf('id="issueSharer"') + 220,
  );
  const assigneeSource = routeSource.slice(
    routeSource.indexOf('id="assignee"') - 180,
    routeSource.indexOf('id="assignee"') + 220,
  );
  expect(issueSharerSource).not.toContain('title=""');
  expect(assigneeSource).not.toContain('title=""');
});

test("project issue detail renders React-owned top hover popovers for issue action markers", async ({
  page,
}) => {
  await mockProjectIssueDetail(page, { canBeDeleted: false, viewerCanDelete: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  await expectLegacyTopHoverPopover(
    page,
    "#issue-share-button",
    "You can share this issue with a user or all members of a project. If this project is private, then shared users can only access this issue and its subtasks.",
  );
  await expectLegacyTopHoverPopover(
    page,
    ".weight-number",
    "Higher weight issues will be shown first in the list",
  );
  await expectLegacyTopHoverPopover(
    page,
    ".span-left-pane > .board-actrow .act-row > button.disabled",
    "Can't be deleted because of other users' comments",
  );
});

test("project issue detail renders React-owned top hover popover for notification mail warning", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Site Admin",
        authorLoginId: "admin",
        childComments: [],
        contentsHtml: "<p>Server HTML should not render</p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viaEmail: false,
        voterCount: 0,
        voters: [],
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page
    .locator("#comment-77 > .media-body > .meta-info > .act-row")
    .locator('button[title="Edit comment"][data-comment-id="77"]')
    .click();

  await expectLegacyTopHoverPopover(
    page,
    "#comment-editform-77 .send-notification-check",
    "If you are not the original author, this option will be ignored. Notification mail will be sent.",
  );
});
