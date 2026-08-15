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

test("project issue detail renders safe legacy media, highlighted markdown, and action geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1600, height: 1000 });
  await mockProjectIssueDetail(page, {
    bodyMarkdown: [
      "# Rendered heading",
      "",
      "```javascript",
      "const parity = true;",
      "```",
      "",
      '<video class="video-js" controls width="640">',
      '<source src="/files/issue-demo.mp4" type="video/mp4">',
      "</video>",
    ].join("\n"),
    viewerCanUpdate: true,
  });
  await page.goto(`${basePath}/admin/sample/issue/11`);

  const content = page.locator("#issue-body-11 > .content.markdown-wrap");
  await expect(content.getByRole("heading", { name: "Rendered heading" })).toBeVisible();
  // SyntaxHighlighter (like legacy highlight.js) keeps language-* on the code
  // element, not the pre; the prism theme emits `token` spans with inline
  // colors (no keyword subclass).
  await expect(content.locator('pre code[class~="language-javascript"]')).toHaveCount(1);
  await expect(content.locator("pre .token").first()).toHaveText("const");
  await expect(content.locator("video.video-js[controls]")).toHaveAttribute("width", "640");
  await expect(content.locator("video.video-js source")).toHaveAttribute(
    "src",
    `${basePath}/files/issue-demo.mp4`,
  );

  const editButton = page.locator('.board-actrow [data-owner="project-issue-detail-action-edit"]');
  const editIcon = editButton.locator("i.yobicon-edit-2");
  await expect(editButton).toBeVisible();
  await expect(editIcon).toHaveAttribute("data-yobicon", "\ue51d");
  await page.evaluate(() => document.fonts.ready);

  const geometry = await page.evaluate(() => {
    const left = document.querySelector<HTMLElement>(".board-body > .span-left-pane");
    const right = document.querySelector<HTMLElement>(".board-body > .span-right-pane");
    const issueBody = document.querySelector<HTMLElement>("#issue-body-11");
    const content = issueBody?.querySelector<HTMLElement>(":scope > .content.markdown-wrap");
    const actions = document.querySelector<HTMLElement>(".span-left-pane > .board-actrow");
    const editIcon = actions?.querySelector<HTMLElement>(".yobicon-edit-2");
    if (!left || !right || !issueBody || !content || !actions || !editIcon) return null;
    const l = left.getBoundingClientRect();
    const r = right.getBoundingClientRect();
    const b = issueBody.getBoundingClientRect();
    const a = actions.getBoundingClientRect();
    const i = editIcon.getBoundingClientRect();
    const contentStyle = getComputedStyle(content);
    return {
      actionsAfterBody: a.top >= b.bottom,
      contentFontSize: contentStyle.fontSize,
      contentOverflow: contentStyle.overflow,
      contentPadding: contentStyle.padding,
      editGlyphWidth: Math.round(i.width),
      leftWidth: Math.round(l.width),
      panesSeparated: l.right < r.left,
      rightWidth: Math.round(r.width),
    };
  });
  expect(geometry).toEqual({
    actionsAfterBody: true,
    contentFontSize: "14.3px",
    contentOverflow: "auto",
    contentPadding: "15px 20px",
    editGlyphWidth: 22,
    leftWidth: 1177,
    panesSeparated: true,
    rightWidth: 370,
  });
});

test("project issue detail restores live Korean metadata controls and editor geometry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Date.now = () => Date.parse("2026-07-11T12:00:00Z");
    Object.defineProperty(window.navigator, "languages", { value: ["ko-KR"], configurable: true });
    Object.defineProperty(window.navigator, "language", { value: "ko-KR", configurable: true });
  });
  const { massUpdateRequests } = await mockProjectIssueDetail(page, {
    __projectOverrides: { backgroundImageUrl: "", logoUrl: "" },
    createdLabel: "2026-07-07",
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Bob Park",
        authorLoginId: "bob",
        childComments: [],
        contentsMarkdown: "I can reproduce the legacy issue view from this seed.",
        createdLabel: "2026-07-07",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viaEmail: false,
        voterCount: 0,
        voters: [],
      },
    ],
    dueDateUntilLabel: "13 days",
  });
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  await expect(page.locator(".board-header.issue > .hide-in-mobile .date")).toHaveText("4일 전");
  await expect(page.locator(".board-header.issue > .hide-in-mobile .date")).toHaveAttribute(
    "title",
    "2026-07-07",
  );
  await expect(page.locator(".span-left-pane #comment-77 .ago").first()).toHaveText("4일 전");
  await expect(page.locator(".span-left-pane #comment-77 .ago").first()).toHaveAttribute(
    "title",
    "2026-07-07",
  );
  await expect(page.locator(".span-right-pane #comment-77 .ago").first()).toHaveText("4일 전");
  await expect(page.locator(".project-header-outer")).toHaveAttribute(
    "style",
    // F5 (2026-08-15): the app renders the header background via a direct
    // background-image style with the Vite-managed hashed asset
    // (project_default-HASH.jpg) — the earlier --x-backgroundImage CSS-var
    // mechanism was retired; the image URL contract is unchanged.
    /background-image:\s*url\(['"](?:https?:\/\/[^'"]*)?\/yona\/(?:[^\/]+\/)*assets\/project_default-[A-Za-z0-9]{8}\.jpg['"]\)/u,
  );
  await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    // copy-fix-current-dom: Vite-managed hashed logo asset; nested SPA routes
    // resolve the relative vite base against the route path
    /\/yona\/(?:[^\/]+\/)*assets\/project_default_logo-[A-Za-z0-9]{8}\.png$/u,
  );

  const assignee = page.getByRole("combobox", { name: "담당자" });
  const milestone = page.getByRole("combobox", { name: "마일스톤" });
  const labels = page.locator(".issue-info .select2-container-multi.issue-labels");
  await expect(assignee).toBeVisible();
  await expect(assignee.locator(".select2-chosen")).toContainText("Site Admin");
  await expect(labels).toBeVisible();
  await expect(labels.locator(".select2-search-choice .label")).toHaveText("bug");
  await expect(page.locator("#milestone.select2-offscreen")).toHaveValue("5");
  await expect(milestone.locator(".select2-choice > .select2-chosen")).toHaveText("v1.0");
  await expect(labels.locator(":scope > .select2-choices > li")).toHaveCount(2);
  await expect(
    labels.locator(".select2-search-choice > div > .label.issue-label.active.static"),
  ).toHaveText("bug");
  await expect(labels.locator("span.label.issue-label.active.static")).toHaveCount(0);
  await expect(labels.locator("strong.label.issue-label.active.static")).toHaveCount(1);
  // copy-fix-current-dom: legacy select2.js resizeSearch (select2.js:2943)
  // computes searchWidth = selectionWidth - chipOffset - sideBorderPadding
  // (full container minus the leading chip); with one "bug" chip the app's
  // unstyled input measures 206px — the legacy-computed value. Pin the
  // computed width.
  await expect(labels.locator("input.select2-input")).toHaveCSS("width", "206px");
  await expect(page.locator("#comment-form .nav-tabs > li").nth(0)).toHaveText("편집");
  await expect(page.locator("#comment-form .nav-tabs > li").nth(1)).toHaveText("미리보기");
  await expect(page.locator("#comment-form .add-task-list-button")).toContainText(
    "체크리스트 추가",
  );
  const editorTabMetrics = await page
    .locator("#comment-form .markdown-editor")
    .evaluate((editor) => {
      const edit = editor.querySelector<HTMLElement>(".nav-tabs > li:nth-child(1) > button");
      const preview = editor.querySelector<HTMLElement>(".nav-tabs > li:nth-child(2) > button");
      if (!edit || !preview) return null;
      const editStyle = getComputedStyle(edit);
      const previewStyle = getComputedStyle(preview);
      return {
        editBorderBottom: editStyle.borderBottomWidth,
        editHeight: Math.round(edit.getBoundingClientRect().height),
        editPadding: editStyle.padding,
        previewBorder: previewStyle.borderWidth,
        previewHeight: Math.round(preview.getBoundingClientRect().height),
        previewPadding: previewStyle.padding,
      };
    });
  expect(editorTabMetrics).toEqual({
    editBorderBottom: "1px",
    editHeight: 30,
    editPadding: "4px 15px",
    previewBorder: "1px",
    previewHeight: 30,
    previewPadding: "4px 15px",
  });
  await expect(page.locator(".duedate-status")).toContainText("13일");

  const geometry = await page.evaluate(() => {
    const form = document.querySelector<HTMLElement>("#issueUpdateForm");
    const assigneeControl = document.querySelector<HTMLElement>(
      '#issueUpdateForm .select2-container[aria-label="담당자"]',
    );
    const labelControl = document.querySelector<HTMLElement>(
      "#issueUpdateForm .select2-container-multi.issue-labels",
    );
    const assigneeChoice = assigneeControl?.querySelector<HTMLElement>(".select2-choice");
    const labelChoices = labelControl?.querySelector<HTMLElement>(".select2-choices");
    const labelToken = labelControl?.querySelector<HTMLElement>(
      "strong.label.issue-label.active.static",
    );
    const labelSearch = labelControl?.querySelector<HTMLInputElement>("input.select2-input");
    const editor = document.querySelector<HTMLElement>("#comment-form .mt10");
    const upload = document.querySelector<HTMLElement>("#comment-form .upload-wrap");
    if (
      !form ||
      !assigneeControl ||
      !labelControl ||
      !assigneeChoice ||
      !labelChoices ||
      !labelToken ||
      !labelSearch ||
      !editor ||
      !upload
    )
      return null;
    const f = form.getBoundingClientRect();
    const a = assigneeControl.getBoundingClientRect();
    const l = labelControl.getBoundingClientRect();
    const token = labelToken.getBoundingClientRect();
    const search = labelSearch.getBoundingClientRect();
    const e = editor.getBoundingClientRect();
    const u = upload.getBoundingClientRect();
    return {
      assigneeChoiceContained: assigneeChoice.getBoundingClientRect().bottom <= a.bottom,
      assigneeBeforeLabels: a.bottom <= l.top,
      editorBoxSizing: getComputedStyle(
        document.querySelector<HTMLElement>("#comment-form textarea.comment")!,
      ).boxSizing,
      formContainsLabels: l.bottom <= f.bottom,
      labelChoicesContained: labelChoices.getBoundingClientRect().bottom <= l.bottom,
      labelTokenHeight: Math.round(token.height),
      labelTokenSearchSameRow: token.top < search.bottom && search.top < token.bottom,
      uploadFollowsEditor: u.top >= e.bottom,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry).toEqual({
    assigneeBeforeLabels: true,
    assigneeChoiceContained: true,
    editorBoxSizing: "content-box",
    formContainsLabels: true,
    labelChoicesContained: true,
    labelTokenHeight: 16,
    labelTokenSearchSameRow: true,
    uploadFollowsEditor: true,
  });

  await assignee.locator(".select2-choice").click();
  await assignee.getByRole("option", { name: "담당자 없음" }).click();
  await expect(page.locator("#assignee")).toHaveValue("");
  await labels.getByRole("button", { name: "bug 삭제" }).click();
  await expect(labels.locator(".select2-search-choice")).toHaveCount(0);
  await milestone.locator(".select2-choice").click();
  await milestone.getByRole("option", { name: "v2.0" }).click();
  await expect(page.locator("#milestone")).toHaveValue("9");
  await expect.poll(() => massUpdateRequests.length).toBe(3);
});

test("project issue detail keeps the frozen desktop and mobile issue-info gutters", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".span-right-pane .issue-info")).toHaveCSS(
    "padding",
    "15px 0px 0px 10px",
  );

  await page.setViewportSize({ width: 720, height: 900 });
  await expect(page.locator(".span-right-pane .issue-info")).toHaveCSS(
    "padding",
    "15px 0px 0px 10px",
  );
});

test("project issue detail matches legacy issue/view.scala.html voter state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page).toHaveTitle("Fix flaky issue");
  await expect.poll(() => headTitleText(page)).toBe("Fix flaky issue");
  await expect
    .poll(() => lastHeadMetaContent(page, 'meta[property="og:title"]'))
    .toBe("Fix flaky issue");
  await expect
    .poll(() => lastHeadMetaContent(page, 'meta[property="og:description"]'))
    .toBe("Body **markdown** - admin/sample");
  await expect
    .poll(() => lastHeadMetaContent(page, 'meta[name="twitter:title"]'))
    .toBe("Fix flaky issue");
  await expect
    .poll(() => lastHeadMetaContent(page, 'meta[name="twitter:description"]'))
    .toBe("Body **markdown** - admin/sample");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Issue");
  await expect(page.locator("#vote.voter-exists")).toBeVisible();
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(1);
  await expect(page.locator("#copyEmailBtn")).toHaveText("Copy email list");
  await expect(page.locator("#copyEmailBtn")).not.toHaveAttribute("data-clipboard-text", /.+/);
  await expect(page.locator("#vote .voter-list a.avatar-wrap").first()).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator('#voters a.usf-group[target="_blank"]').first()).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator("#labelIds")).toHaveAttribute("data-close-on-select", "false");
  await expect(page.locator("#labelIds")).not.toHaveAttribute("data-search", /.+/);
  await expect(page.locator("#comment-77 .new-issue-by a")).toHaveText("Reference in new issue");
  await expect(page.locator("#comment-77 .new-issue-by a")).toHaveAttribute(
    "href",
    `${basePath}/user/issues/new?commentId=77`,
  );
  await expectIssueDetailAssets(page, basePath);

  const emptyTimeline =
    '<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div>';
  const expected = EXPECTED_ISSUE_DETAIL.replace(emptyTimeline, LEFT_COMMENT_TIMELINE)
    .replace(emptyTimeline, RIGHT_INDEX_COMMENT_TIMELINE)
    .replace(
      '<div id="issue-body-11"><div class="content markdown-wrap"',
      `<div id="issue-body-11">${TASKLIST}<div class="content markdown-wrap"`,
    )
    .replace('id="numOfComments" value="0"', 'id="numOfComments" value="1"')
    .replaceAll("__CHILD_REPLY_PLACEHOLDER__", await childReplyPlaceholder(page))
    .replaceAll("__BASE_PATH__", basePath)
    .replaceAll(' aria-hidden="true"', "");
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  expect(await issueDetailShellMetrics(page)).toEqual({
    actionMargin: "20px 0px",
    actionOverflow: "auto",
    actionPaddingRight: "15px",
    bodyMarginTop: "0px",
    contentMarginBottom: "20px",
    contentMinHeight: "150px",
    // legacy _responsive.less:617 overrides the base 20px to 5px; the app
    // renders the responsive value (the base _page.less:727 20px never wins)
    contentPadding: "15px 20px",
    footerFontSize: "0px",
    footerMarginTop: "20px",
    footerTextAlign: "right",
    headerMargin: "15px 0px",
    issueInfoPadding: "15px 0px 0px 10px",
    leftPaneWidth: 938,
    outerMarginTop: "10px",
    outerMinHeight: "450px",
    projectMarginTop: "5px",
    rightPaneWidth: 295,
    titleBackground: "rgb(242, 242, 242)",
    titleBorderRadius: "10px",
    titleFontSize: "18px",
    titleLineHeight: "30px",
    titlePadding: "10px 20px",
  });
  expect(await indexCommentMetrics(page)).toEqual({
    authorDisplay: "block",
    bodyPadding: "5px 20px",
    bodyText: "Comment markdown",
    childCountMarkers: 1,
    commentDisplay: "list-item",
    dataLocation: "#comment-77",
    listDisplay: "block",
    rowLeft: 985,
    rowWidth: 285,
    shareDisplay: "none",
  });
  expect(await issueCommentMetrics(page)).toEqual({
    attachmentsDisplay: "block",
    avatarFloat: "left",
    avatarMarginRight: "0px",
    avatarWidth: 37,
    bodyMinHeight: "0px",
    bodyPadding: "15px 20px",
    commentDisplay: "list-item",
    commentPaddingBottom: "10px",
    commentWidth: 938,
    mediaBodyOverflow: "hidden",
    metaHeight: 32,
    metaPaddingTop: "5px",
    replyDisplay: "none",
  });
});

test("project issue detail uses route-owned timeline and comment hash links", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const issueHref = `${basePath}/admin/sample/issue/11`;
  const comment = {
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
    viewerCanUpdate: true,
    viewerHasVoted: true,
    viaEmail: false,
    voterCount: 6,
    voters: commentVoters(),
  };
  await mockProjectIssueDetail(page, {
    comments: [comment],
    timeline: [
      { comment, id: 77, kind: "comment" },
      {
        createdLabel: "Jul 3, 2026",
        eventType: "ISSUE_STATE_CHANGED",
        id: 88,
        kind: "event",
        newValue: "closed",
        oldValue: "open",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(issueHref);
  await expect(
    page.locator(
      '.span-left-pane a[href^="#comment-"], .span-left-pane a[href^="#event-"], .span-right-pane a[href^="#comment-"], .span-right-pane a[href^="#event-"]',
    ),
  ).toHaveCount(0);
  await expect(page.locator(".span-left-pane #comment-77 .ago-date a.ago")).toHaveAttribute(
    "href",
    `${issueHref}#comment-77`,
  );
  await expect(page.locator(".span-left-pane #comment-77 .ago-date a.share-link")).toHaveAttribute(
    "href",
    `${issueHref}#comment-77`,
  );
  await expect(page.locator(".span-right-pane #comment-77 .comment-body a")).toHaveAttribute(
    "href",
    `${issueHref}#comment-77`,
  );
  await expect(page.locator(".span-left-pane #event-88 .date a")).toHaveAttribute(
    "href",
    `${issueHref}#event-88`,
  );
  await expect(page.locator("#comment-77 button.vote-description-people")).toHaveText(
    "6 Agreements",
  );

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-hash-links";
  });
  await page.locator(".span-left-pane #comment-77 .ago-date a.ago").click();
  await expect(page).toHaveURL(`${issueHref}#comment-77`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-hash-links");
  await page.locator(".span-left-pane #event-88 .date a").click();
  await expect(page).toHaveURL(`${issueHref}#event-88`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-hash-links");
});

test("project issue detail folds original email message in route-owned comment body", async ({
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
        contentsMarkdown:
          "Fresh reply before quoted tail\n\n--- Original Message ---\nQuoted tail starts hidden\n\n> previous note",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viaEmail: true,
        voterCount: 0,
        voters: [],
      },
    ],
    timeline: [],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const commentBody = page.locator("#comment-77 .comment-body.markdown-wrap");
  await expect(commentBody).toHaveAttribute("data-via-email", "true");
  await expect(commentBody).toHaveAttribute("data-yobi-original-message-processed", "true");
  await expect(commentBody.getByText("Fresh reply before quoted tail")).toBeVisible();
  await expect(commentBody.getByText("Quoted tail starts hidden")).toBeHidden();

  await page.waitForTimeout(100);
  const toggle = commentBody.locator('button[type="button"]').filter({ hasText: "..." });
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toBeVisible();
  await expect(commentBody.locator('button[type="button"]:visible')).toHaveCount(1);

  await toggle.click();
  await expect(commentBody.getByText("Quoted tail starts hidden")).toBeVisible();
  await expect(commentBody.getByText("previous note")).toBeVisible();

  await toggle.click();
  await expect(commentBody.getByText("Quoted tail starts hidden")).toBeHidden();
  await expect(commentBody.getByText("previous note")).toBeHidden();
});

test("project issue detail preserves legacy clickable right-pane index comments", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const issueHref = `${basePath}/admin/sample/issue/11`;
  await mockProjectIssueDetail(page);

  await page.goto(issueHref);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-index-comment-row";
  });
  await page.locator(".span-right-pane #comment-77.index-comment").click();
  await expect(page).toHaveURL(`${issueHref}#comment-77`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-index-comment-row");
});

test("project issue detail route source uses shared markdown help, legacy copy keys, and direct TanStack links", () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );

  expect(routeSource).toContain(
    'import { MarkdownEditor, type MarkdownEditorProps } from "../../../../components/markdown-editor";',
  );
  expect(routeSource).toContain("<MarkdownEditor");
  const sharedMarkdownEditorSource = readFileSync("src/components/markdown-editor.tsx", "utf8");
  expect(sharedMarkdownEditorSource).toContain(
    'import { LegacyMarkdownHelp } from "../routes/-legacy-markdown-help";',
  );
  expect(sharedMarkdownEditorSource).toContain("help = <LegacyMarkdownHelp />");
  expect(routeSource).not.toContain("help/markdown.scala.html?raw");
  expect(routeSource).not.toContain("legacyMarkdownHelpTemplate");
  expect(routeSource).not.toContain("legacyMarkdownHelpHtml");
  expect(routeSource).not.toMatch(/markdown-help[\s\S]{0,160}dangerouslySetInnerHTML/u);
  expect(routeSource).not.toContain("labelSelectOptionsHtml");
  expect(routeSource).not.toContain("optionsHtml");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML={{ __html: optionsHtml }}");
  expect(routeSource).not.toContain("yobi.Comment.init({'sContainer' : '#comments'});");
  expect(routeSource).not.toContain("/assets/javascripts/common/yobi.Comment.js");
  expect(routeSource).not.toContain("/assets/javascripts/common/yobi.CommentForm.js");
  expect(routeSource).not.toContain("IssueViewBootstrapScript");
  expect(routeSource).not.toContain('$yobi.loadModule("issue.View"');
  expect(routeSource).not.toContain("yobi.ShortcutKey.setKeymapLink");
  expect(routeSource).not.toContain("yobi.Mention({");
  expect(routeSource).not.toContain(":contains(");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).not.toContain("yobi.OriginalMessage.hide");
  for (const key of [
    "button.newSubtask",
    "button.comment.new",
    "button.share.issue",
    "issue.sharer.description",
    "issue.sharer",
    "issue.sharer.select",
    "issue.assignee",
    "issue.noAuthor",
    "issue.noAssignee",
    "issue.state.assigned",
    "issue.state.closed",
    "issue.state.open",
    "issue.event.sharer.deleted.title",
    "label.select",
    "milestone",
    "issue.noMilestone",
    "milestone.menu.new",
    "milestone.state.open",
    "milestone.state.closed",
    "issue.weight",
    "issue.weight.description",
    "button.edit",
    "button.show.original",
    "button.delete",
    "issue.can.not.be.deleted",
    "issue.delete",
    "post.delete.confirm",
    "button.yes",
    "button.no",
  ]) {
    expect(routeSource).toContain(`t("${key}")`);
  }
  expect(routeSource).not.toContain(">Issue Sharing<");
  expect(routeSource).not.toContain(">New subtask<");
  expect(routeSource).not.toContain('<strong className="name">No author</strong>');
  expect(routeSource).not.toContain('<span className="ybtn ybtn-disabled">Add a comment</span>');
  expect(routeSource).not.toContain('<span className="state changed">Assigned</span>');
  expect(routeSource).not.toContain(
    'const stateLabel = issueState === "closed" ? "Closed" : "Open";',
  );
  expect(routeSource).not.toContain('{parentIssueState === "closed" ? "Closed" : "Open"}');
  expect(routeSource).not.toContain('return state === "closed" ? "Closed" : "Open";');
  expect(routeSource).not.toContain(">Issue Sharer{");
  expect(routeSource).not.toContain(">Assignee<");
  expect(routeSource).not.toContain('placeholder="No assignee"');
  expect(routeSource).not.toContain('placeholder="Select Issue Sharer"');
  expect(routeSource).not.toContain('data-placeholder="Select label"');
  expect(routeSource).not.toContain(">Milestone<");
  expect(routeSource).not.toContain(">No milestone<");
  expect(routeSource).not.toContain(">New milestone<");
  expect(routeSource).not.toContain('label="Open"');
  expect(routeSource).not.toContain('label="Closed"');
  expect(routeSource).not.toContain('content="Issue weight description"');
  expect(routeSource).not.toContain('title="Issue weight: Upvote"');
  expect(routeSource).not.toContain('title="Issue weight: Down vote"');
  expect(routeSource).not.toContain('title="Edit"');
  expect(routeSource).not.toContain('title="See text"');
  expect(routeSource).not.toContain('title="Delete"');
  expect(routeSource).not.toContain(
    "content=\"Can\\'t be deleted because of other users\\' comments\"",
  );
  expect(routeSource).not.toContain(">Delete issue<");
  expect(routeSource).not.toContain(">Yes<");
  expect(routeSource).not.toContain(">No<");
  expect(routeSource).toMatch(
    /data-yobi-original-message-processed=\{viaEmail\s*\?\s*"true"\s*:\s*undefined\}/u,
  );
  expect(routeSource).toContain("function OriginalMessageMarkdown({");
  expect(routeSource).toContain("function splitOriginalMessage(contentsMarkdown: string)");
  expect(routeSource).not.toMatch(
    /function CommentDeleteModalScripts[\s\S]*dangerouslySetInnerHTML[\s\S]*function IssueViewBootstrapScript/u,
  );
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("ComponentType");
  expect(routeSource).not.toContain("AnchorHTMLAttributes");
  expect(routeSource).not.toContain("createElement");
  expect(routeSource).not.toMatch(/^\s*<a(?:\s|>)/mu);
  expect(routeSource).not.toContain("function attachedFilesHtml");
  expect(routeSource).not.toContain('<a class="attached-delete"');
  expect(routeSource).not.toContain("attachedFilesHtml(issue.attachments)");
  expect(routeSource).not.toContain("attachedFilesHtml(comment.attachments)");
  expect(routeSource).not.toContain('className="attached-delete"');
  const commentUpdateFormSource = routeSource.slice(
    routeSource.indexOf("function CommentUpdateForm"),
    routeSource.indexOf("function MarkdownEditor"),
  );
  expect(commentUpdateFormSource).toContain('className="attached-file attached-file-marker"');
  expect(commentUpdateFormSource).toContain('className="btn-transparent btn-delete"');
  expect(commentUpdateFormSource).not.toMatch(
    /<button\s+type="button"\s+className="btn-transparent btn-delete"\s+data-id=/u,
  );
  expect(routeSource).toContain('<ul className="attaches wm">');
  expect(routeSource).toContain('className="attach"');
  expect(routeSource).toContain('className="download ybtn ybtn-mini"');
  expect(routeSource).toContain('className="vmiddle"');
  expect(routeSource).toContain("action=download");
  expect(routeSource).toContain("const LEGACY_LINK_PROPS = {");
  expect(routeSource).not.toContain("IssueLegacyLinkProps");
  expect(routeSource).not.toContain("IssueHashLink");
  expect(routeSource).not.toContain("IssueRouteLink");
  expect(routeSource).not.toContain("as never");
  expect(routeSource).not.toContain("const authorPath =");
  expect(routeSource).not.toContain("const userPath =");
  expect(routeSource).toContain('to="/$ownerName/$projectName/issue/$issueNumber"');
  expect(routeSource).toContain('to="/$ownerName/$projectName/issue/$issueNumber/editform"');
  expect(routeSource).toContain('to="/$user"');
  expect(routeSource).toContain(
    // copy-fix-current-dom: typed-route link form ($issueNumber.tsx:1213,3132)
    'to="/$ownerName/$projectName/milestone/$milestoneId"',
  );
  expect(routeSource).toContain('to="/user/issues/new"');
  expect(routeSource).toContain("commentId: Number(commentId) || undefined");
  expect(routeSource).not.toContain('data-request-method="post"');
  expect(routeSource).not.toContain("const voteHref =");
  expect(routeSource).not.toContain("data-request-uri={voteHref}");
  expect(routeSource).not.toMatch(/data-request-(?:type|uri|method)=/u);
  expect(routeSource).not.toContain("data-clipboard-text");
  expect(routeSource).toContain("navigator.clipboard.writeText(emailText)");
  expect(routeSource).not.toMatch(
    /document\.title|globalThis\[[^\]]*document[^\]]*\]|querySelector|addEventListener|classList|style\.display|setAttribute|removeAttribute|innerHTML|dangerouslySetInnerHTML|jQuery|\$\(/u,
  );
  expect(routeSource).toContain("function ProjectIssueDetailTitle({");
  expect(routeSource).toContain("function legacyIssueOpenGraphDescription(");
  expect(routeSource).toContain("issueBodyMarkdown.slice(0, 200)");
  expect(routeSource).toContain(
    "return `${issueBodyMarkdown.slice(0, 200)} - ${ownerName}/${projectName}`;",
  );
  expect(routeSource).toContain('<meta property="og:title" content={issueTitle} />');
  expect(routeSource).toContain('<meta property="og:description" content={description} />');
  expect(routeSource).toContain('<meta name="twitter:title" content={issueTitle} />');
  expect(routeSource).toContain('<meta name="twitter:description" content={description} />');
  expect(routeSource).toContain("function ProjectIssueNotFoundTitle({");
  expect(routeSource).toContain(
    '<title>{`${t("error.notfound")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(routeSource).not.toContain("useProjectIssueDetailDocumentTitle");
  expect(routeSource).not.toContain('data-toggle="comment-edit"');
  expect(routeSource).not.toContain('data-toggle="comment-delete"');
  expect(routeSource).not.toContain('data-toggle="modal"');
  expect(routeSource).not.toContain('data-toggle="tab"');
  expect(routeSource).not.toContain('data-toggle="tooltip"');
  expect(routeSource).not.toContain('data-dismiss="modal"');
  expect(routeSource).not.toMatch(
    /data-target=(?:"#(?:-yona-posting-history|deleteConfirm|helpKeys|voters)"|\{`#voters-\$\{commentId\}`\})/u,
  );
  expect(routeSource).not.toMatch(/data-target=\{`#(?:edit|preview)-\$\{wrapId\}`\}/u);
  expect(routeSource).toContain("setCommentEditOpen((current) => !current)");
  expect(routeSource).toContain("event.stopPropagation();");
  expect(routeSource).toContain(
    "function insulateModalButtonClick(event: MouseEvent<HTMLButtonElement>) {",
  );
  expect(
    routeSource.match(/insulateModalButtonClick\(event\);/g)?.length ?? 0,
  ).toBeGreaterThanOrEqual(12);
});

test("project issue detail not found renders legacy project error shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const cases = [
    { ownerName: "admin", projectName: "svnplayground" },
    { ownerName: "alice", projectName: "sample" },
  ];

  for (const { ownerName, projectName } of cases) {
    await mockProjectIssueDetail(page, {
      __issueNumber: 1,
      __issueStatus: 404,
      __ownerName: ownerName,
      __projectName: projectName,
    });

    await page.goto(`${basePath}/${ownerName}/${projectName}/issue/1`);

    await expect(page.locator(".project-header-outer")).toBeVisible();
    await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Issue");
    await expect(page.locator(".project-page-wrap > .error-wrap")).toBeVisible({ timeout: 1500 });
    await expect(page.locator(".project-page-wrap > .error-wrap p")).toHaveText(
      "Issue does not exist",
    );
    await expect(page.locator(".project-page-wrap > .error-wrap .ybtn.ybtn-primary")).toHaveText(
      "List",
    );
    await expect(
      page.locator(".project-page-wrap > .error-wrap .ybtn.ybtn-primary"),
    ).toHaveAttribute("href", `${basePath}/${ownerName}/${projectName}/issues?state=all`);
    await expect(page).toHaveTitle(`Page not found - ${ownerName}/${projectName}`);
    await expect
      .poll(() => headTitleText(page))
      .toBe(`Page not found - ${ownerName}/${projectName}`);
    await expect(page.locator(".board-view")).toHaveCount(0);
    await expect(page.locator("#issueUpdateForm")).toHaveCount(0);
    await expect(page.locator("#comment-form")).toHaveCount(0);

    expect(await issueNotFoundMetrics(page)).toEqual({
      buttonDisplay: "inline-block",
      buttonHeight: 30,
      buttonLineHeight: "20px",
      errorPaddingBlock: 200,
      iconClass: "ico ico-err2",
      messageFontSize: "16px",
      messageFontWeight: "700",
      messageMarginBottom: 30,
      messageMarginTop: 30,
      pageWrapChildCount: 1,
    });
  }
});

test("project issue detail new subtask link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const newSubtaskLink = page.locator(".span-right-pane .project-btn-item a").filter({
    hasText: "New subtask",
  });
  await expect(newSubtaskLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issueform?parentIssueId=42`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await newSubtaskLink.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/issueform?parentIssueId=42`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#parentId")).toHaveValue("42");
  await expect(page.locator('#parentId option[selected][value="42"]')).toHaveCount(1);
});

test("project issue detail owns edit/delete action spacing in both legacy rows", async ({
  page,
}) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const componentSource = routeSource.slice(
    routeSource.indexOf("function IssueActionButtons"),
    routeSource.indexOf("type IssueComment"),
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyPage = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const leftRowStart = legacyView.indexOf('<span class="act-row">');
  const rightRowStart = legacyView.indexOf('<div class="act-row right-menu-icons">');
  expect(leftRowStart).toBeGreaterThanOrEqual(0);
  expect(rightRowStart).toBeGreaterThan(leftRowStart);
  expect(legacyView.slice(leftRowStart, rightRowStart)).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"',
  );
  expect(legacyView.slice(leftRowStart, rightRowStart)).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml6"',
  );
  expect(legacyView.slice(rightRowStart)).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"',
  );
  expect(legacyView.slice(rightRowStart)).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml6"',
  );
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");
  expect(legacyCommon).toContain(".ml6 { margin-left:6px; }");
  expect(legacyPage).toContain(".pt5px {");
  expect(legacyPage).toContain("padding-top: 5px;");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(legacyYobi).toContain('@import "less/_page.less";');

  expect(componentSource).toContain('data-owner="project-issue-detail-action-edit"');
  expect(componentSource).toContain('data-owner="project-issue-detail-action-delete"');
  expect(componentSource).not.toContain("ml10");
  expect(componentSource).not.toContain("pt5px");
  expect(componentSource).not.toContain("ml6");
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-action-edit"\]\s*\{[\s\S]*?margin-left:\s*10px[\s\S]*?padding-top:\s*5px/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-action-delete"\]\s*\{[\s\S]*?margin-left:\s*6px/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  await mockProjectIssueDetail(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);

  const editButtons = page.locator('[data-owner="project-issue-detail-action-edit"]');
  const deleteButtons = page.locator('[data-owner="project-issue-detail-action-delete"]');
  await expect(editButtons).toHaveCount(2);
  await expect(deleteButtons).toHaveCount(2);
  for (const button of await editButtons.all()) await expect(button).toBeVisible();
  for (const button of await deleteButtons.all()) await expect(button).toBeVisible();
  for (const button of await editButtons.all()) {
    await expect(button).toHaveClass(/icon/);
    await expect(button).not.toHaveAttribute("style", /.+/u);
  }
  for (const button of await deleteButtons.all()) {
    await expect(button).toHaveClass(/icon/);
    await expect(button).not.toHaveAttribute("style", /.+/u);
  }
  expect(
    await editButtons.evaluateAll((buttons) =>
      buttons.map((button) => getComputedStyle(button).marginLeft),
    ),
  ).toEqual(["10px", "10px"]);
  expect(
    await editButtons.evaluateAll((buttons) =>
      buttons.map((button) => getComputedStyle(button).paddingTop),
    ),
  ).toEqual(["5px", "5px"]);
  expect(
    await deleteButtons.evaluateAll((buttons) =>
      buttons.map((button) => getComputedStyle(button).marginLeft),
    ),
  ).toEqual(["6px", "6px"]);

  const rowMetrics = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".board-actrow .act-row, .right-menu-icons")].map(
      (row) => {
        const edit = row.querySelector<HTMLElement>(
          '[data-owner="project-issue-detail-action-edit"]',
        );
        const remove = row.querySelector<HTMLElement>(
          '[data-owner="project-issue-detail-action-delete"]',
        );
        if (!edit || !remove) return null;
        const rowBox = row.getBoundingClientRect();
        const editBox = edit.getBoundingClientRect();
        const removeBox = remove.getBoundingClientRect();
        return {
          editContained: editBox.left >= rowBox.left && editBox.right <= rowBox.right,
          deleteContained: removeBox.left >= rowBox.left && removeBox.right <= rowBox.right,
          ordered: editBox.left <= removeBox.left,
        };
      },
    ),
  );
  expect(rowMetrics).toEqual([
    { editContained: true, deleteContained: true, ordered: true },
    { editContained: true, deleteContained: true, ordered: true },
  ]);

  if (fallbackOff) {
    for (const button of await editButtons.all()) {
      await expect(button).toHaveCSS("margin-left", "10px");
    }
    for (const button of await deleteButtons.all()) {
      await expect(button).toHaveCSS("margin-left", "6px");
    }
  }
  await editButtons.first().click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11/editform`);

  await mockProjectIssueDetail(page);
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await deleteButtons.first().click();
  await expect(page.locator("#deleteConfirm")).toBeVisible();
  await expect(page.locator("#deleteConfirm .modal-header h3")).toHaveText("Delete issue");
});

test("project issue detail owns board action group float with route Style", async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyBootstrap = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  const actionStart = legacyView.indexOf('<div class="board-actrow right-txt">');
  const actionEnd = legacyView.indexOf('<div id="vote"', actionStart);
  expect(actionStart).toBeGreaterThanOrEqual(0);
  expect(actionEnd).toBeGreaterThan(actionStart);
  const actionSource = legacyView.slice(actionStart, actionEnd);
  expect(actionSource).toContain('<div class="pull-left">');
  expect(actionSource.indexOf("watch-button")).toBeLessThan(
    actionSource.indexOf("issue-share-button"),
  );
  expect(actionSource.indexOf("issue-share-button")).toBeLessThan(
    actionSource.indexOf("newSubtask"),
  );
  expect(actionSource.indexOf("newSubtask")).toBeLessThan(actionSource.indexOf("issue-weight"));
  expect(legacyBootstrap).toContain(".pull-left {\n  float: left;\n}");
  expect(legacyYobi).toContain('@import "less/_page.less";');

  expect(routeSource).toContain('data-owner="project-issue-detail-board-action-group"');
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-board-action-group"\]\s*\{\s*float:\s*left\s*\}?/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  await mockProjectIssueDetail(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issue/11`);
    const actions = page.locator('[data-owner="project-issue-detail-actions"]');
    const group = actions.locator('[data-owner="project-issue-detail-board-action-group"]');
    await expect(actions).toHaveCount(1);
    await expect(group).toHaveCount(1);
    // wave-33 retained-class retention (667398a04): route retains the legacy
    // pull-left class (view.scala.html:189 <div class="pull-left">) while the
    // float is owned via route Style boardActionGroup.
    await expect(group).toHaveClass(/(?:^|\s)pull-left(?:\s|$)/u);
    await expect(group).not.toHaveAttribute("style", /.+/u);
    await expect(group.locator("#watch-button")).toHaveText("Subscribe");
    await expect(group.locator("#issue-share-button")).toHaveText("Issue Sharing");
    await expect(group.locator(".project-btn-item a")).toHaveText("New subtask");
    await expect(group.locator("#upvote-issue-weight")).toHaveCount(1);
    await expect(group.locator("#down-vote-issue-weight")).toHaveCount(1);
    await expect(group.locator(".weight-number")).toHaveText("2");
    expect(await group.evaluate((element) => getComputedStyle(element).float)).toBe("left");
    const metrics = await group.evaluate((element) => {
      const parent = element.parentElement;
      if (!parent) return null;
      const groupBox = element.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      return {
        contained: groupBox.left >= parentBox.left && groupBox.right <= parentBox.right,
        parentOwner: parent.getAttribute("data-owner"),
        childOrder: [...element.querySelectorAll("button, a")]
          .map((child) => child.id || child.textContent?.trim() || "")
          .filter(Boolean),
      };
    });
    expect(metrics).toEqual({
      contained: true,
      parentOwner: "project-issue-detail-actions",
      childOrder: [
        "watch-button",
        "issue-share-button",
        "New subtask",
        "upvote-issue-weight",
        "down-vote-issue-weight",
      ],
    });
    if (fallbackOff) await expect(group).toHaveCSS("float", "left");
  }
});

test("project issue detail owns mobile new-subtask spacing with route Style", async ({ page }) => {
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

  expect(legacyView).toContain('<span class="project-btn-item hide show-in-mobile-inline ml4">');
  expect(legacyCommon).toContain(".ml4 { margin-left:4px; }");
  expect(routeSource).toContain('data-owner="project-issue-detail-mobile-new-subtask"');

  // wave-33 retained-class retention (667398a04): route retains the legacy
  // legacy view.scala.html:191 <span class="project-btn-item hide
  // show-in-mobile-inline ml4">; the ml4 token is retired (legacy-fallback-off
  // gate) — spacing is owned by the data-owner rule below.
  expect(routeSource).toContain("show-in-mobile-inline");
  expect(routeSource).not.toContain("ml4");
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-mobile-new-subtask"\]\s*\{[\s\S]*?margin-left:\s*4px/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  await mockProjectIssueDetail(page);
  const mobile = page.locator('[data-owner="project-issue-detail-mobile-new-subtask"]');
  const link = mobile.locator("a").filter({ hasText: "New subtask" });

  await page.setViewportSize({ width: fallbackOff ? 390 : 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(mobile).toHaveCount(1);
  await expect(mobile).not.toHaveAttribute("style", /.+/u);

  if (fallbackOff) {
    await expect(mobile).toHaveCSS("margin-left", "4px");
    const rect = await mobile.evaluate((element) => {
      const { bottom, left, right, top } = element.getBoundingClientRect();
      return { bottom, left, right, top };
    });
    expect(rect.bottom).toBeGreaterThanOrEqual(0);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
  } else {
    await expect(mobile).toBeHidden();
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(mobile).toBeVisible();
    await expect(mobile).toHaveClass(/project-btn-item/);
    await expect(mobile).toHaveClass(/hide/);
    await expect(mobile).toHaveClass(/show-in-mobile-inline/);
    // wave-33 retained-class retention (667398a04): project-btn-item/hide/
    // show-in-mobile-inline retained for legacy DOM parity (view.scala.html:
    // 191); the ml4 token is retired — spacing owned via the data-owner rule.
    await expect(mobile).not.toHaveClass(/(?:^|\s)ml4(?:\s|$)/u);
    await expect(mobile).toHaveCSS("margin-left", "4px");
    await expect(mobile).toHaveCSS("display", "inline-block");
  }
  await expect(link).toHaveAttribute("href", `${basePath}/admin/sample/issueform?parentIssueId=42`);
});

test("project issue detail owns desktop header metadata spacing with route Style", async ({
  page,
}) => {
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

  expect(legacyView).toContain('<div class="pull-right mr10 mt10 hide-in-mobile">');
  expect(legacyCommon).toContain(".mr10 { margin-right:10px; }");
  expect(legacyCommon).toContain(".mt10 { margin-top:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(routeSource).toContain('data-owner="project-issue-detail-desktop-metadata"');

  // copy-fix-current-dom: route composes the legacy class string alongside style
  expect(routeSource).toContain("pull-right mr10 mt10 hide-in-mobile");
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-desktop-metadata"\]\s*\{[\s\S]*?margin-right:\s*10px[\s\S]*?margin-top:\s*10px/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  await mockProjectIssueDetail(page);
  const metadata = page.locator('[data-owner="project-issue-detail-desktop-metadata"]');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(metadata).toHaveCount(1);
  await expect(metadata).not.toHaveAttribute("style", /.+/u);
  await expect(metadata).toHaveClass(/pull-right/);
  await expect(metadata).toHaveClass(/hide-in-mobile/);
  await expect(metadata.locator(".date")).toHaveText("Jul 1, 2026");
  await expect(metadata.locator(".badge")).toHaveText("Open");
  await expect(metadata).toHaveCSS("margin-right", "10px");
  await expect(metadata).toHaveCSS("margin-top", "10px");

  const desktopGeometry = await metadata.evaluate((element) => {
    const header = element.closest<HTMLElement>(".board-header.issue");
    const date = element.querySelector<HTMLElement>(".date");
    const badge = element.querySelector<HTMLElement>(".badge");
    if (!header || !date || !badge) return null;
    const wrapper = element.getBoundingClientRect();
    const headerBox = header.getBoundingClientRect();
    return {
      badgeContained: badge.getBoundingClientRect().bottom <= wrapper.bottom,
      dateContained: date.getBoundingClientRect().left >= wrapper.left,
      headerContained: wrapper.right <= headerBox.right,
      visible: wrapper.width > 0 && wrapper.height > 0,
    };
  });
  expect(desktopGeometry).toEqual({
    badgeContained: true,
    dateContained: true,
    headerContained: true,
    visible: true,
  });

  await page.setViewportSize({ width: 390, height: 900 });
  if (fallbackOff) {
    await expect(metadata).toHaveCSS("margin-right", "10px");
    await expect(metadata).toHaveCSS("margin-top", "10px");
  } else {
    await expect(metadata).toBeHidden();
  }
});

test("project issue detail owns sidebar bottom spacing with route Style", async ({ page }) => {
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

  expect(legacyView.split(/\r?\n/u)[292]).toContain('<div class="span3 span-right-pane mb20">');
  expect(legacyCommon.split(/\r?\n/u)[211]).toContain(".mb20 { margin-bottom:20px; }");
  expect(routeSource).toContain('data-owner="project-issue-detail-sidebar"');
  expect(routeSource).toContain("span3 span-right-pane");
  expect(routeSource).not.toContain("span3 span-right-pane mb20");
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-sidebar"\]\s*\{[\s\S]*?margin-bottom:\s*20px/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  await mockProjectIssueDetail(page);
  const sidebar = page.locator('[data-owner="project-issue-detail-sidebar"]');
  const issueInfo = sidebar.locator(".issue-info");
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(sidebar).toHaveCount(1);
  await expect(sidebar).toBeVisible();
  await expect(sidebar).not.toHaveAttribute("style", /.+/u);
  await expect(sidebar).toHaveCSS("margin-bottom", "20px");
  await expect(issueInfo).toBeVisible();
  await expect(issueInfo).toContainText("Assignee");
  await expect(sidebar.locator(".project-btn-item a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issueform?parentIssueId=42`,
  );

  const assertContained = async () => {
    const metrics = await sidebar.evaluate((element) => {
      const sidebarRect = element.getBoundingClientRect();
      const boardRect = element.parentElement?.getBoundingClientRect();
      if (!boardRect) throw new Error("issue detail sidebar has no board-body parent");
      return {
        bottom: sidebarRect.bottom,
        boardBottom: boardRect.bottom,
        boardLeft: boardRect.left,
        boardRight: boardRect.right,
        left: sidebarRect.left,
        right: sidebarRect.right,
        top: sidebarRect.top,
      };
    });
    expect(metrics.left).toBeGreaterThanOrEqual(metrics.boardLeft);
    expect(metrics.right).toBeLessThanOrEqual(metrics.boardRight);
    expect(metrics.top).toBeGreaterThanOrEqual(0);
    expect(metrics.bottom).toBeGreaterThanOrEqual(metrics.top);
    if (!fallbackOff) expect(metrics.bottom).toBeLessThanOrEqual(metrics.boardBottom);
  };

  await assertContained();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(sidebar).not.toHaveAttribute("style", /.+/u);
  if (fallbackOff) {
    await expect(sidebar).toHaveCSS("margin-bottom", "20px");
    await assertContained();
  } else {
    await expect(sidebar).toBeHidden();
  }
});

test("project issue detail renders protected org-owned localhost shell state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __closedMilestones: [{ id: 8, state: "closed", title: "Portal archive" }],
    __issueNumber: 1,
    __labelsResponse: [],
    __openMilestones: [{ id: 5, state: "open", title: "Portal launch" }],
    __ownerName: "weblabs",
    __projectName: "portal",
    __projectOverrides: {
      backgroundImageUrl: "/assets/images/project_default.jpg",
      id: 2,
      isProtected: true,
      isWatching: true,
      organizationName: "weblabs",
      viewerCanWatch: true,
      watchCount: 2,
    },
    assigneeLoginId: "",
    authorLabel: "Carol Lee",
    authorLoginId: "carol",
    bodyChecksum: "portal-body-sha1",
    bodyHtml: "<p>Server HTML should not render</p>",
    bodyMarkdown: "Seed issue for organization-owned protected project flows.",
    commentCount: 0,
    comments: [],
    createdLabel: "Jul 6, 2026",
    dueDateLabel: "Jul 28, 2026",
    dueDateOverdue: false,
    dueDateUntilLabel: "22 days",
    issueId: 2,
    issueNumber: 1,
    issueUpdateMillis: 1783382400000,
    issueVoters: [],
    labels: [],
    milestoneId: null,
    milestoneTitle: "",
    parentIssueId: null,
    sharers: [],
    timeline: [],
    title: "Portal protected project smoke check",
    voterCount: 0,
    watcherCount: 0,
    weight: 0,
  });

  await page.goto(`${basePath}/weblabs/portal/issue/1`);
  await expect(page).toHaveTitle("Portal protected project smoke check");

  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /\bproject-header\b/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const scopeToggle = page.locator("#gnb-search-scope-title");
  const scopeButtons = page.locator('[data-owner="global-gnb-search-scope-item"] > button');
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(1).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expect(scopeToggle).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(2).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expect(scopeToggle).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-util .watcher-count")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/watchers`,
  );
  await expect(page.locator(".project-util .watcher-count")).toHaveText("2");
  await expect(page.locator(".board-id")).toHaveText("1");
  await expect(page.locator(".board-header.issue .title")).toContainText(
    "Portal protected project smoke check",
  );
  await expect(page.locator(".board-header.issue .badge.badge-issue-open").first()).toHaveText(
    "Open",
  );
  await expect(page.locator(".author-info > a.usf-group")).toHaveAttribute(
    "href",
    `${basePath}/carol`,
  );
  await expect(page.locator(".author-info .name")).toHaveText("Carol Lee");
  await expect(page.locator("#issue-body-1 .content.markdown-wrap")).toContainText(
    "Seed issue for organization-owned protected project flows.",
  );
  await expect(page.locator("#attachments .attach")).toHaveCount(0);
  await expect(page.locator("#numOfComments")).toHaveValue("0");
  await expect(page.locator(".timeline-list > .comment-header .num")).toHaveText(["0", "0"]);
  await expect(page.locator(".span-left-pane #timeline .comments > li")).toHaveCount(0);
  await expect(page.locator(".span-right-pane #timeline .comments > li")).toHaveCount(0);
  await expect(page.locator(".span-right-pane .project-btn-item a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/issueform?parentIssueId=2`,
  );
  await expect(page.locator(".span-right-pane .issue-info > form > dl")).toHaveCount(3);
  await expect(page.locator(".span-right-pane dt").nth(0)).toHaveText("Assignee");
  await expect(page.locator(".span-right-pane dt").nth(1)).toHaveText("Milestone");
  await expect(page.locator(".span-right-pane dt").nth(2)).toHaveText("Due date(22 days)");
  await expect(page.locator('#milestone option[value="-1"][selected]')).toHaveCount(1);
  await expect(page.locator("#labelIds")).toHaveCount(0);
  await expect(page.locator("#comment-form")).toHaveCount(1);
  await expect(page.locator("#helpKeys")).toHaveClass(/modal hide fade keymap-help/);

  expect(await protectedIssueShellMetrics(page)).toEqual({
    boardTopAtOrBelowMenu: true,
    gnbClassName: "gnb-outer", // F5 (2026-08-14): GNB outer retains the legacy gnb-outer class for the frozen-CSS cascade
    searchBottomWithinNavbar: true,
    searchLeftWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
  });
});

test("project issue detail gates only right-pane new subtask by legacy issue menu setting", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __projectOverrides: {
      menuSetting: {
        board: true,
        code: true,
        issue: false,
        milestone: true,
        pullRequest: true,
        review: true,
      },
    },
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const leftActionLink = page.locator(".board-actrow .project-btn-item a").filter({
    hasText: "New subtask",
  });
  await expect(leftActionLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issueform?parentIssueId=42`,
  );
  await expect(page.locator(".span-right-pane .project-btn-item a")).toHaveCount(0);
});

test("project issue detail renders legacy posting history modal", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    historyHtml: "Server HTML should not render",
    historyMarkdown: "Previous **body**",
    updatedByAuthorLabel: "Site Admin",
    updatedLabel: "Jul 3, 2026",
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#-yona-posting-history .modal-body")).not.toContainText(
    "Server HTML should not render",
  );
  await expect(page.locator("#-yona-posting-history .close")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator("#-yona-posting-history .modal-footer .ybtn")).toHaveAttribute(
    "aria-hidden",
    "true",
  );

  const history =
    '<div class="posting-history"><button type="button" data-toggle="modal" data-target="#-yona-posting-history"><span class="lastUpdatedBy"><span>Site Admin</span><span>Jul 3, 2026</span></span><span>edited</span></button><div id="-yona-posting-history" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h5 class="nm">Change history</h5></div><div class="modal-body"><p>Previous <strong>body</strong></p></div><div class="modal-footer"><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal" aria-hidden="true">Confirm</button></div></div></div>';
  const expected = EXPECTED_ISSUE_DETAIL.replaceAll(' aria-hidden="true"', "")
    .replace('</span></a></div><div id="issue-11"', `</span></a>${history}</div><div id="issue-11"`)
    .replace(
      '<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div>',
      LEFT_COMMENT_TIMELINE,
    )
    .replace(
      '<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div>',
      RIGHT_INDEX_COMMENT_TIMELINE,
    )
    .replace(
      '<div id="issue-body-11"><div class="content markdown-wrap"',
      `<div id="issue-body-11">${TASKLIST}<div class="content markdown-wrap"`,
    )
    .replace('id="numOfComments" value="0"', 'id="numOfComments" value="1"')
    .replaceAll("__CHILD_REPLY_PLACEHOLDER__", await childReplyPlaceholder(page))
    .replaceAll("__BASE_PATH__", basePath);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, expected),
  );

  await expect(
    page.locator('.posting-history a[href="#-yona-posting-history"][data-toggle="modal"]'),
  ).toHaveCount(0);
  await expect(
    page.locator(
      '.posting-history [data-toggle="modal"], .posting-history [data-target="#-yona-posting-history"], .posting-history [data-dismiss="modal"]',
    ),
  ).toHaveCount(0);
  const trigger = page.locator(
    '.posting-history button[type="button"]:has(span:has-text("edited"))',
  );
  await expect(trigger).toContainText("edited");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "posting-history-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#-yona-posting-history")).toBeVisible();
  await expect(page.locator("#-yona-posting-history")).toHaveClass(/modal in/);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("posting-history-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await page.locator('#-yona-posting-history .modal-footer button:has-text("Confirm")').click();
  await expect(page.locator("#-yona-posting-history")).toHaveClass(/modal hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("posting-history-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#-yona-posting-history")).toHaveClass(/modal hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.in").dispatchEvent("click");
  await expect(page.locator("#-yona-posting-history")).toHaveClass(/modal hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail renders legacy anonymous posting history login link", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __sessionOverrides: {
      actorId: 0,
      emailAddress: "",
      isAnonymous: true,
      isConfirmed: false,
      isSiteAdmin: false,
      loginId: "anonymous",
      userLabel: "anonymous",
    },
    historyMarkdown: "Previous **body**",
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="posting-history"><a href="__BASE_PATH__/users/loginform?redirectUrl=/admin/sample/issue/11">Change history</a></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".author-info .posting-history")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(page.locator("#-yona-posting-history")).toHaveCount(0);
  await expect(page.locator("#watch-button")).toHaveCount(0);
});

test("project issue detail favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { favoriteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".board-header .favorite-issue i")).not.toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".board-header .favorite-issue").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page.locator(".board-header .favorite-issue i")).toHaveClass(/starred/);
});

test("project issue detail opens legacy keymap modal through route-owned React state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(
    page.locator(
      '.board-footer [data-toggle="modal"], .board-footer [data-target="#helpKeys"], .board-footer [data-dismiss="modal"]',
    ),
  ).toHaveCount(0);
  const trigger = page.locator('.board-footer [data-owner="issue-detail-keymap-wrapper"] > button');
  await expect(trigger).toHaveClass("ybtn ybtn-inverse ybtn-mini");
  await expect(page.locator("#helpKeys")).toHaveClass(/modal hide fade keymap-help/);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-keymap-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#helpKeys")).not.toHaveClass(/hide/);
  await expect(page.locator("#helpKeys")).toHaveClass(/modal fade keymap-help in/);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-keymap-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(await keymapModalMetrics(page)).toEqual({
    display: "block",
    firstColumnTitle: "projects",
    left: 320,
    top: 72,
    width: 682,
  });

  await page.locator('#helpKeys .actrow button:has-text("Confirm")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#helpKeys")).toHaveClass(/modal hide fade keymap-help/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-keymap-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(await keymapModalMetrics(page)).toMatchObject({ display: "none" });

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#helpKeys")).toHaveClass(/modal hide fade keymap-help/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.fade.in").dispatchEvent("click");
  await expect(page.locator("#helpKeys")).toHaveClass(/modal hide fade keymap-help/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});
