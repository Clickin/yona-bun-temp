import { expect, test, type Page, readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
// Post-merge: the full legacy cascade lives in app.css — normal-mode semantics.
const fallbackOff = false;
import {
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
    issueVoters: [],
    voterCount: 0,
    viewerCanUpdate: true,
  });
  await page.goto(`${basePath}/admin/sample/issue/11`);

  const content = page.locator("#issue-body-11 > .content.markdown-wrap");
  await expect(content.getByRole("heading", { name: "Rendered heading" })).toBeVisible();
  // SyntaxHighlighter (like legacy highlight.js) keeps language-* on the code
  // element, not the pre; the prism theme emits `token` spans with inline
  // colors (no keyword subclass).
  await expect(content.locator('pre code[class~="language-javascript"]')).toHaveCount(1);
  await expect(content.locator("pre code.language-javascript")).toContainText(
    "const parity = true;",
  );
  await expect(content.locator("pre code.language-javascript")).not.toContainText("<script");
  await expect(content.locator("pre code.language-javascript")).toHaveCount(1);
  await expect(content.locator("video.video-js[controls]")).toHaveAttribute("width", "640");
  await expect(content.locator("video.video-js source")).toHaveAttribute(
    "src",
    `${basePath}/files/issue-demo.mp4`,
  );

  const editButton = page.locator('.board-actrow [data-owner="project-issue-detail-action-edit"]');
  const editIcon = editButton.locator("i.yobicon-edit-2");
  await expect(editButton).toBeVisible();
  await expect(editIcon).toHaveAttribute("data-yobicon", "\ue51d");
  const voteButton = page.locator("#vote > button");
  await expect(voteButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(voteButton).toHaveCSS("border-top-width", "0px");
  await expect(voteButton).toHaveCSS("padding", "0px");
  await page.evaluate(() => document.fonts.ready);

  const geometry = await page.evaluate(() => {
    const left = document.querySelector<HTMLElement>(".board-body > .span-left-pane");
    const right = document.querySelector<HTMLElement>(".board-body > .span-right-pane");
    const issueBody = document.querySelector<HTMLElement>("#issue-body-11");
    const content = issueBody?.querySelector<HTMLElement>(":scope > .content.markdown-wrap");
    const actions = document.querySelector<HTMLElement>(".span-left-pane > .board-actrow");
    const editIcon = actions?.querySelector<HTMLElement>(".yobicon-edit-2");
    const vote = actions?.querySelector<HTMLElement>("#vote");
    const edit = actions?.querySelector<HTMLElement>(
      '[data-owner="project-issue-detail-action-edit"]',
    );
    if (!left || !right || !issueBody || !content || !actions || !editIcon || !vote || !edit)
      return null;
    const l = left.getBoundingClientRect();
    const r = right.getBoundingClientRect();
    const b = issueBody.getBoundingClientRect();
    const a = actions.getBoundingClientRect();
    const i = editIcon.getBoundingClientRect();
    const contentStyle = getComputedStyle(content);
    const v = vote.getBoundingClientRect();
    const e = edit.getBoundingClientRect();
    return {
      actionsAfterBody: a.top >= b.bottom,
      // view.scala.html:188–249 keeps the inline vote beside the right-side
      // edit control; its ml10 combines with .vote-wrap margin-right:-3px.
      voteBesideEdit: e.left >= v.right && e.left - v.right <= 10,
      voteSharesEditRow: v.top < e.bottom && e.top < v.bottom,
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
    voteBesideEdit: true,
    voteSharesEditRow: true,
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
    Date.now = () => new Date(2026, 6, 11, 12).getTime();
    Object.defineProperty(window.navigator, "languages", { value: ["ko-KR"], configurable: true });
    Object.defineProperty(window.navigator, "language", { value: "ko-KR", configurable: true });
  });
  const { massUpdateRequests } = await mockProjectIssueDetail(page, {
    __projectOverrides: { backgroundImageUrl: "", logoUrl: "" },
    createdLabel: "2026-01-06T09:15:00",
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Bob Park",
        authorLoginId: "bob",
        childComments: [],
        contentsMarkdown: "I can reproduce the legacy issue view from this seed.",
        createdLabel: "2026-07-07T12:00:00",
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

  await expect(page.locator(".board-header.issue > .hide-in-mobile .date")).toHaveText("01-06");
  await expect(page.locator(".span-left-pane #comment-77 .ago").first()).toHaveText("4일 전");
  await expect(page.locator(".span-right-pane #comment-77 .ago").first()).toHaveText("4일 전");
  const commentActions = page.locator(".span-left-pane #comment-77 .act-row");
  const editComment = commentActions.locator('button[title="댓글 수정"]');
  const deleteComment = commentActions.locator('button[title="댓글 삭제"]');
  await expect(editComment).toHaveCSS("margin-left", "10px");
  await expect(deleteComment).toHaveCSS("margin-left", "6px");
  await expect(commentActions.locator('button[title="공감"]')).toBeVisible();
  await editComment.click();
  await expect(page.locator("#comment-editform-77")).toBeVisible();
  await page.locator("#comment-editform-77 .ybtn-cancel").click();
  await expect(page.locator("#comment-body-77").first()).toBeVisible();
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
  await expect(milestone.locator(".select2-choice > .select2-chosen")).toHaveText("v1.0");
  await expect(labels.locator(":scope > .select2-choices > li")).toHaveCount(2);
  await expect(
    labels.locator(".select2-search-choice > div > .label.issue-label.active.static"),
  ).toHaveText("bug");
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
      assigneeFillsSidebar: Math.abs(a.width - f.width) <= 1,
      editorBoxSizing: getComputedStyle(
        document.querySelector<HTMLElement>("#comment-form textarea.comment")!,
      ).boxSizing,
      formContainsLabels: l.bottom <= f.bottom,
      labelChoicesContained: labelChoices.getBoundingClientRect().bottom <= l.bottom,
      labelControlHeight: Math.round(l.height),
      labelTokenHeight: Math.round(token.height),
      labelTokenSearchSameRow: token.top < search.bottom && search.top < token.bottom,
      uploadFollowsEditor: u.top >= e.bottom,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry).toEqual({
    assigneeBeforeLabels: true,
    assigneeChoiceContained: true,
    assigneeFillsSidebar: true,
    editorBoxSizing: "content-box",
    formContainsLabels: true,
    labelChoicesContained: true,
    // Select2 clearSearch() collapses a selected control's idle input;
    // one 16px token + 6px padding + 6px margins + 2px border is one row.
    labelControlHeight: 30,
    labelTokenHeight: 16,
    labelTokenSearchSameRow: true,
    uploadFollowsEditor: true,
  });

  await assignee.locator(".select2-choice").click();
  const qaAssignee = assignee.getByRole("option", { name: "QA Member qa" });
  await expect(qaAssignee.locator("img")).toBeVisible();
  await qaAssignee.click();
  await expect(assignee.locator(".select2-chosen")).toHaveText("QA Member qa");
  await expect(assignee.locator(".select2-chosen img")).toBeVisible();
  await expect(assignee.locator(".select2-chosen .usf-group")).toHaveAttribute(
    "title",
    "QA Member qa",
  );
  const assigneeGaps = await assignee.locator(".select2-chosen .usf-group").evaluate((group) => {
    const avatar = group.querySelector(".avatar-wrap")!.getBoundingClientRect();
    const name = group.querySelector(".name")!.getBoundingClientRect();
    const login = group.querySelector(".loginid")!.getBoundingClientRect();
    return { name: name.left - avatar.right, login: login.left - name.right };
  });
  // Live legacy formatter: inline whitespace plus the frozen 5px/2px label margins.
  expect(Math.round(assigneeGaps.name)).toBe(9);
  expect(Math.round(assigneeGaps.login)).toBe(6);
  await assignee.locator(".select2-choice").click();
  await assignee.getByRole("option", { name: "담당자 없음" }).click();
  await expect(page.locator("#assignee")).toHaveValue("");
  await expect(assignee.locator(".select2-chosen")).toHaveText("담당자 없음");
  await expect(assignee.locator(".select2-choice")).toHaveCSS("color", "rgb(153, 153, 153)");
  await labels.getByRole("button", { name: "bug 삭제" }).click();
  await expect(labels.locator(".select2-search-choice")).toHaveCount(0);
  const labelSearch = labels.getByRole("textbox", { name: "라벨 선택" });
  // Select2 removal closes its results and focuses the empty search, hiding its idle hint.
  await expect(labelSearch).toBeFocused();
  await expect(labelSearch).toHaveValue("");
  await expect(labelSearch).not.toHaveAttribute("placeholder", /.+/u);
  await expect(labels.getByRole("listbox")).toHaveCount(0);
  await labelSearch.fill("없는 라벨");
  await expect(labelSearch).not.toHaveAttribute("placeholder", /.+/u);
  await expect(labels.getByRole("option")).toHaveCount(0);
  await milestone.locator(".select2-choice").click();
  await milestone.getByRole("option", { name: "v2.0" }).click();
  await expect(labelSearch).toHaveValue("");
  await expect(labelSearch).toHaveAttribute("placeholder", "라벨 선택");
  await expect(labels.getByRole("listbox")).toHaveCount(0);
  await expect(milestone.locator(".select2-chosen")).toHaveText("v2.0");
  await expect.poll(() => massUpdateRequests.length).toBe(4);
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

test("project issue detail applies the legacy issue-info affix threshold", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);

  const issueInfo = page.locator(".span-right-pane .issue-info");
  await expect(issueInfo).toHaveClass(/(?:^|\s)affix-top(?:\s|$)/u);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const offsetTop = await page.evaluate(() => {
    const issueInfo = document.querySelector<HTMLElement>(".span-right-pane .issue-info");
    if (!issueInfo) {
      throw new Error("Missing issue-info");
    }
    const spacer = document.createElement("div");
    spacer.style.height = "3000px";
    document.body.append(spacer);
    return issueInfo.getBoundingClientRect().top + window.scrollY - 10;
  });

  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), Math.floor(offsetTop));
  await expect(issueInfo).toHaveClass(/(?:^|\s)affix-top(?:\s|$)/u);
  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), Math.ceil(offsetTop + 1));
  await expect(issueInfo).toHaveClass(/(?:^|\s)affix(?:\s|$)/u);
  await expect(issueInfo).toHaveCSS("position", "fixed");
  await expect(issueInfo).toHaveCSS("top", "0px");
  await expect(issueInfo).toHaveCSS("overflow-y", "scroll");

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(issueInfo).toHaveClass(/(?:^|\s)affix-top(?:\s|$)/u);
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
  await expect(
    page.getByRole("combobox", { name: "Milestone", exact: true }).locator(".select2-chosen"),
  ).toHaveText("v1.0");

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

test("project issue detail formats REST timestamps and preserves comment and event deep links", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const issueHref = `${basePath}/admin/sample/issue/11`;
  await page.addInitScript(() => {
    Date.now = () => new Date(2026, 6, 11, 12).getTime();
  });
  await setBrowserLanguage(page, "en-US");
  const comment = {
    attachments: [],
    authorAvatarUrl: "/assets/images/default-avatar-32.png",
    authorLabel: "Dev Member",
    authorLoginId: "dev",
    childComments: [
      {
        authorLabel: "QA One",
        authorLoginId: "qa1",
        contentsMarkdown: "First paragraph\n\nLast **reply**",
        createdLabel: "2025-12-30T15:30:00",
        id: 78,
        viewerCanDelete: true,
      },
    ],
    contentsHtml: "<p>Server HTML should not render</p>",
    contentsMarkdown: "Comment **markdown**",
    createdLabel: "2026-07-04T12:00:00",
    id: 77,
    viewerCanDelete: true,
    viewerCanUpdate: true,
    viewerHasVoted: true,
    viaEmail: false,
    voterCount: 6,
    voters: commentVoters(),
  };
  await mockProjectIssueDetail(page, {
    createdLabel: "2026-01-06T09:15:00",
    historyMarkdown: "Previous body",
    updatedByAuthorLabel: "Site Admin",
    updatedLabel: "2026-07-11T11:59:20",
    childOpenCount: 1,
    childIssues: [
      {
        createdLabel: "2026-07-03T12:00:00",
        issueNumber: 12,
        labels: [],
        state: "open",
        title: "Eight-day-old subtask",
      },
    ],
    comments: [comment],
    timeline: [
      { comment, id: 77, kind: "comment" },
      {
        createdLabel: "2026-07-11T11:59:20",
        eventType: "ISSUE_STATE_CHANGED",
        id: 88,
        kind: "event",
        newValue: "closed",
        oldValue: "open",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(issueHref);
  // TemplateHelper.agoOrDateString: relative below eight days, then MM-dd
  // in the current year and yyyy-MM-dd otherwise. JodaDateUtil supplies
  // the full local 12-hour timestamp only for existing date tooltips.
  await expect(page.locator(".board-header .date").first()).toHaveText("01-06");
  await expect(page.locator(".board-header .date").first()).toHaveAttribute(
    "title",
    "2026-01-06 9:15:00 AM",
  );
  await expect(page.locator(".board-header .date").nth(1)).toHaveText("01-06");
  await expect(page.locator(".posting-history .lastUpdatedBy > span").nth(1)).toHaveText(
    "40 seconds ago",
  );
  for (const pane of [".span-left-pane", ".span-right-pane"]) {
    await expect(page.locator(`${pane} #comment-77 .ago`).first()).toHaveText("7 days ago");
    await expect(page.locator(`${pane} #comment-77 .ago`).first()).toHaveAttribute(
      "title",
      "2026-07-04 12:00:00 PM",
    );
  }
  await expect(page.locator(".subcomment-author .ago")).toHaveText("2025-12-30");
  await expect(page.locator(".subcomment-author .ago")).toHaveAttribute(
    "title",
    "2025-12-30 3:30:00 PM",
  );
  const childParagraphs = page.locator(".one-line-comment .contents > p");
  await expect(childParagraphs.first()).toHaveText("First paragraph");
  await expect(childParagraphs.last().locator(".subcomment-author")).toBeVisible();
  await expect(page.locator(".child-issue-date")).toHaveText("07-03");
  await expect(page.locator(".child-issue-date")).toHaveAttribute(
    "title",
    "2026-07-03 12:00:00 PM",
  );
  await expect(page.locator("#event-88 .date a")).toHaveText("40 seconds ago");
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
  const eventAvatar = page.locator("#event-88 img.avatar-wrap.small");
  await expect.poll(() => eventAvatar.evaluate((image) => image.naturalWidth)).toBe(128);
  expect(
    await eventAvatar.evaluate(async (image) => {
      const bytes = await (await fetch(image.currentSrc)).arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }),
  ).toBe("781a764b1f86352b2c23acd7e7807feb39b45aac11b905cf731bd764859aa891");
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
  await mockProjectIssueDetail(page, {
    comments: [
      {
        id: 77,
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        contentsMarkdown: "Compare **sweep-run-11** with #123: 4 > 2.",
        createdLabel: "2026-07-02T12:00:00",
      },
    ],
  });

  await page.goto(issueHref);
  await expect(page.locator(".span-right-pane #comment-77 .comment-body > a")).toHaveText(
    "Compare sweep-run-11 with #123: 4 > 2.",
  );
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-index-comment-row";
  });
  await page.locator(".span-right-pane #comment-77.index-comment").click();
  await expect(page).toHaveURL(`${issueHref}#comment-77`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-index-comment-row");
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
  const styleSource = readFileSync("src/app.css", "utf8");
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
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-action-edit"\]\s*\{[\s\S]*?margin-left:\s*10px[\s\S]*?padding-top:\s*5px/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-action-delete"\]\s*\{[\s\S]*?margin-left:\s*6px/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
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
  const styleSource = readFileSync("src/app.css", "utf8");
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
  const styleSource = readFileSync("src/app.css", "utf8");
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
  const styleSource = readFileSync("src/app.css", "utf8");
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
  await mockProjectIssueDetail(page);
  const metadata = page.locator('[data-owner="project-issue-detail-desktop-metadata"]');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(metadata).toHaveCount(1);
  await expect(metadata).not.toHaveAttribute("style", /.+/u);
  await expect(metadata).toHaveClass(/pull-right/);
  await expect(metadata).toHaveClass(/hide-in-mobile/);
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
  const styleSource = readFileSync("src/app.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );

  expect(legacyView).toContain('<div class="span3 span-right-pane mb20">');
  expect(legacyCommon).toContain(".mb20 { margin-bottom:20px; }");
  expect(routeSource).toContain('data-owner="project-issue-detail-sidebar"');
  expect(routeSource).toContain("span3 span-right-pane");
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-sidebar"\]\s*\{[\s\S]*?margin-bottom:\s*20px/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
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
  await expect(
    page.getByRole("combobox", { name: "Milestone", exact: true }).locator(".select2-chosen"),
  ).toHaveText("No milestone");
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
    historyMarkdown: "<!-- XML comment should not render -->\nPrevious **body**",
    updatedByAuthorLabel: "Site Admin",
    updatedLabel: "Jul 3, 2026",
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#-yona-posting-history .modal-body")).not.toContainText(
    "Server HTML should not render",
  );
  // History markdown strips XML comments like the issue body render.
  await expect(page.locator("#-yona-posting-history .modal-body")).not.toContainText(
    "XML comment should not render",
  );
  await expect(page.locator("#-yona-posting-history .close")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator("#-yona-posting-history .modal-footer .ybtn")).toHaveAttribute(
    "aria-hidden",
    "true",
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
  // Legacy partial_history.scala.html has no backdrop; the old React
  // modal-backdrop darkened the whole screen on issue detail.
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
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
  await page.keyboard.press("Escape");
  await expect(page.locator("#-yona-posting-history")).toHaveClass(/modal hide/);
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
