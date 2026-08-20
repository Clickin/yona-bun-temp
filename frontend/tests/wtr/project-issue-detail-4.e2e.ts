import { expect, test, type Page, readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
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

test("project issue detail omits route-local legacy attachment template", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator('script#tplAttachedFile[type="text/x-jquery-tmpl"]')).toHaveCount(0);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  expect(routeSource).not.toContain("AttachedFileTemplate");
  expect(routeSource).not.toContain("tplAttachedFile");
  expect(routeSource).not.toContain("${fileName}");
  expect(routeSource).not.toContain("${fileHref}");
  expect(routeSource).not.toContain("${fileSizeReadable}");
});

test("project issue detail omits route-local duplicated Select2 templates", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expectIssueDetailSelect2Partial(page, basePath);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const rootSource = readFileSync("src/routes/__root.tsx", "utf8");
  // Select2 templates were consolidated into the shared root partial; the route
  // must no longer host any duplicated template script.
  for (const templateId of [
    "tplSelect2FormatUser",
    "tplSelect2FormatMilestone",
    "tplSelect2Projects",
    "tplSelect2ProjectsWithoutAvatar",
    "tplSelect2FormatIssues",
  ]) {
    expect(routeSource).not.toContain(templateId);
  }
  expect(routeSource).not.toContain("text/x-jquery-tmpl");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(rootSource).toContain("function LegacySelect2Templates");
  expect(rootSource).toContain('id="tplSelect2FormatUser"');
  expect(rootSource).toContain('id="tplSelect2FormatMilestone"');
  expect(rootSource).toContain('id="tplSelect2Projects"');
  expect(rootSource).toContain('id="tplSelect2ProjectsWithoutAvatar"');
  expect(rootSource).toContain('id="tplSelect2FormatIssues"');
});

test("project issue detail renders legacy child issue list", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    childClosedCount: 1,
    childIssues: [
      {
        assigneeLabel: "QA One",
        commentCount: 2,
        createdLabel: "Jul 3, 2026",
        issueNumber: 12,
        labels: [],
        state: "open",
        title: "Open child",
        voterCount: 1,
      },
      {
        assigneeLabel: "",
        commentCount: 0,
        createdLabel: "Jul 4, 2026",
        issueNumber: 13,
        labels: [],
        state: "closed",
        title: "Closed child",
        voterCount: 0,
      },
    ],
    childOpenCount: 1,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="subtasks"><div class="child-issues"><div class="issue-item parent-issue"><a href="__BASE_PATH__/admin/sample/issue/11" class="bold">#11 Fix flaky issue - Site Admin</a><div class="upload-progress red-outline"><div class="bar red" style="width:50%" title="Subtask"></div></div><span class=" ">1/2 </span><span class="parent-issue-state open">Open</span></div><hr class="parent-issue-delimeter"><div class="child-issues"><div class="issue-item  child-issue"><span class="state-label open"></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/12"><span class="item-name"><span class="subtask-number">#12</span><span>Open child</span><span> - QA One</span></span></a><span class="font12 no-border-at-child"><span class="item-count-groups"><a href="__BASE_PATH__/admin/sample/issue/12#comments" class="comments-count comments-count-color"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">2</span></a><a href="__BASE_PATH__/admin/sample/issue/12#vote" class="vote-count vote-color"><span class="count-groups item-icon"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a></span></span><span class="child-issue-date" title="Jul 3, 2026">Jul 3, 2026</span></div><div class="issue-item  child-issue"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/13"><span class="item-name"><span class="subtask-number">#13</span><span>Closed child</span><span></span></span></a><span class="font12 no-border-at-child"></span><span class="child-issue-date" title="Jul 4, 2026">Jul 4, 2026</span></div></div></div></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > .subtasks")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  // F5 dist-truth: legacy .page-wrap-outer padding 0 10px (responsive.less:611)
  // + span9 74.468% → 938 at 1280; ported into app.css @layer legacy.
  expect(await childIssueMetrics(page)).toEqual({
    countGroupBorder: "0px none rgb(51, 51, 51)",
    countGroupLineHeight: "14px",
    countGroupMarginTop: "2px",
    dateDisplay: "none",
    firstChildWidth: 938,
    itemIconFontSize: "9px",
    parentFontSize: "16px",
    rowDisplay: "block",
    rowPadding: "0px 3px",
    voteLinkMarginLeft: "-5px",
  });
});

test("project issue detail hides foreign draft child issues like legacy partial_view_child", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    childIssues: [
      {
        authorLoginId: "dev",
        createdLabel: "Jul 3, 2026",
        isDraft: true,
        issueNumber: 12,
        labels: [],
        state: "draft",
        title: "Foreign draft child",
      },
      {
        authorLoginId: "admin",
        createdLabel: "Jul 4, 2026",
        isDraft: true,
        issueNumber: 13,
        labels: [],
        state: "draft",
        title: "Own draft child",
      },
    ],
    childClosedCount: 0,
    childOpenCount: 0,
    isDraft: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane > .subtasks .issue-item.child-issue")).toHaveCount(1);
  await expect(page.locator(".span-left-pane > .subtasks")).not.toContainText(
    "Foreign draft child",
  );
  const visibleDraft = page.locator(".span-left-pane > .subtasks .issue-item.child-issue").first();
  await expect(visibleDraft).toContainText("#DraftOwn draft child");
  await expect(visibleDraft.locator(".state-label.draft")).toHaveCount(1);
  await expect(visibleDraft.locator(".draft-number")).toHaveText("#Draft");
  await expect(visibleDraft.locator("a.twoColumeModeTarget")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/13`,
  );
});

test("project issue detail hides subtasks for directly shared child issue like legacy view.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    childClosedCount: 1,
    childIssues: [
      {
        assigneeLabel: "QA One",
        createdLabel: "Jul 3, 2026",
        issueNumber: 12,
        labels: [],
        state: "open",
        title: "Hidden open child",
      },
    ],
    childOpenCount: 1,
    parentIssueId: 99,
    viewerIsDirectSharer: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane > .subtasks")).toHaveCount(1);
  await expect(page.locator(".span-left-pane > .subtasks")).toBeEmpty();
  await expect(page.locator(".span-left-pane > .subtasks .child-issues")).toHaveCount(0);
  await expect(page.locator(".span-left-pane > .subtasks")).not.toContainText("Hidden open child");
});

test("project issue detail renders parent row and selected child on child issue detail", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __issueNumber: 12,
    childClosedCount: 1,
    childIssues: [
      {
        assigneeLabel: "QA One",
        commentCount: 0,
        createdLabel: "Jul 3, 2026",
        issueNumber: 12,
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
        state: "open",
        title: "Open child",
        voterCount: 0,
      },
      {
        assigneeLabel: "",
        commentCount: 0,
        createdLabel: "Jul 4, 2026",
        issueNumber: 13,
        labels: [],
        state: "closed",
        title: "Closed child",
        voterCount: 0,
      },
    ],
    childOpenCount: 1,
    issueNumber: 12,
    parentIssueId: 42,
    parentIssueNumber: 11,
    parentIssueState: "closed",
    parentIssueTitle: "Parent issue",
    title: "Open child",
  });

  await page.goto(`${basePath}/admin/sample/issue/12`);

  const expected =
    `<div class="subtasks"><div class="child-issues"><div class="issue-item parent-issue"><a href="__BASE_PATH__/admin/sample/issue/11">#11 Parent issue</a><div class="upload-progress red-outline"><div class="bar red" style="width:50%" title="Subtask"></div></div><span class=" ">1/2 </span><span class="parent-issue-state closed">Closed</span></div><hr class="parent-issue-delimeter"><div class="child-issues"><div class="issue-item selected-child child-issue"><span class="state-label open"></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/12"><span class="item-name"><span class="subtask-number">#12</span><span>Open child</span><span> - QA One</span></span></a><span class="font12 no-border-at-child"></span><a href="__BASE_PATH__/admin/sample/issues?state=open&amp;labelIds=8" class="label issue-label list-label active twoColumeModeTarget" data-category-id="3" data-label-id="8" style="background:rgb(81,170,204)">bug</a><span class="child-issue-date" title="Jul 3, 2026">Jul 3, 2026</span></div><div class="issue-item  child-issue"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/13"><span class="item-name"><span class="subtask-number">#13</span><span>Closed child</span><span></span></span></a><span class="font12 no-border-at-child"></span><span class="child-issue-date" title="Jul 4, 2026">Jul 4, 2026</span></div></div></div></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > .subtasks")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail renders legacy unauthorized comment form", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync("src/app.css", "utf8");
  const legacyView = readFileSync(
    "../yona-original/app/views/common/commentForm.scala.html",
    "utf8",
  );
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(legacyView).toContain('<div class="write-comment-box mt20"');
  expect(legacyView).toContain('<div class="right-txt mt10">');
  expect(legacyView).toContain('data-login="required"');
  expect(legacyCommon).toMatch(/\.mt20\s*\{\s*margin-top:\s*20px;\s*\}/u);
  expect(legacyCommon).toMatch(/\.mt10\s*\{\s*margin-top:\s*10px;\s*\}/u);
  expect(legacyYobi).toContain('@import "less/_common.less";');

  expect(routeSource).not.toContain('className="write-comment-box mt20"');

  await mockProjectIssueDetail(page, { viewerCanComment: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const unauthorized = page.locator(
    '.span-left-pane > #comments > [data-owner="project-issue-detail-unauthorized-comment"]',
  );
  await expect(page.locator(".span-left-pane > #comments > #comment-form")).toHaveCount(0);
  await expect(unauthorized).toHaveCount(1);
  await expect(page.locator("#comment-77 .child-comment-input-form")).toHaveCount(0);
  await expect(unauthorized).toHaveClass(/write-comment-box/);
  await expect(unauthorized).not.toHaveClass(/\bmt20\b/);
  await expect(unauthorized).toHaveAttribute("title", "Please log in.");
  await expect(unauthorized).toHaveAttribute("data-login", "required");
  await expect(unauthorized).not.toHaveAttribute("style");
  await expect(unauthorized.locator(".write-comment-wrap > .textarea-box > textarea")).toHaveClass(
    /comment/,
  );
  await expect(unauthorized.locator("textarea")).toHaveClass(/disabled/);
  await expect(unauthorized.locator("textarea")).toBeDisabled();
  await expect(unauthorized.locator("textarea")).not.toHaveAttribute("style");
  const disabledActions = unauthorized.locator(
    "[data-owner='project-issue-detail-disabled-comment-actions']",
  );
  await expect(disabledActions).toHaveClass(/right-txt/);
  await expect(disabledActions).not.toHaveClass(/\bmt10\b/);
  await expect(disabledActions).not.toHaveAttribute("style");
  const disabledActionsMetrics = await disabledActions.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      marginTop: style.marginTop,
      textAlign: style.textAlign,
      top: rect.top,
      height: rect.height,
      right: rect.right,
    };
  });
  expect(disabledActionsMetrics.marginTop).toBe("10px");
  expect(disabledActionsMetrics.textAlign).toBe("right");
  expect(disabledActionsMetrics.height).toBeGreaterThan(0);
  await expect(unauthorized.locator(".ybtn-disabled")).toHaveText("Add a comment");

  const desktopMetrics = await unauthorized.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { marginTop: style.marginTop, top: rect.top, height: rect.height };
  });
  expect(desktopMetrics.marginTop).toBe("20px");
  expect(desktopMetrics.height).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileMetrics = await page
    .locator('[data-owner="project-issue-detail-unauthorized-comment"]')
    .evaluate((element) => ({
      marginTop: getComputedStyle(element).marginTop,
      top: element.getBoundingClientRect().top,
    }));
  expect(mobileMetrics.marginTop).toBe("20px");
  expect(mobileMetrics.top).toBeGreaterThan(0);
  const mobileDisabledActions = page.locator(
    '[data-owner="project-issue-detail-disabled-comment-actions"]',
  );
  const mobileDisabledActionsMetrics = await mobileDisabledActions.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      marginTop: style.marginTop,
      textAlign: style.textAlign,
      right: rect.right,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobileDisabledActionsMetrics.marginTop).toBe("10px");
  expect(mobileDisabledActionsMetrics.textAlign).toBe("right");
  expect(mobileDisabledActionsMetrics.right).toBeLessThanOrEqual(
    mobileDisabledActionsMetrics.viewportWidth,
  );
  await expect(
    page.locator(`script[src="${basePath}/assets/javascripts/common/yobi.CommentForm.js"]`),
  ).toHaveCount(0);
});

test("project issue detail renders legacy state-change timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
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

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-88 .state.closed")).toHaveText("Closed");
  await expect(page.locator(".span-right-pane #comments li.event-index")).toHaveCount(0);
  expect(await canonicalize(page, ".span-right-pane #comments")).toEqual(
    await canonicalizeHtml(
      page,
      `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><strong>Comment</strong> <strong class="num">0</strong></div><ul class="comments"></ul></div></div></div>`,
    ),
  );

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(page, LEFT_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await eventTimelineMetrics(page, "#event-88")).toEqual({
    avatarHeight: 24,
    avatarWidth: 24,
    dateFontSize: "11px",
    eventDisplay: "list-item",
    lineHeight: "30px",
    paddingLeft: "55px",
    stateBackground: "rgb(253, 105, 86)",
    stateMarginRight: "10px",
    stateWidth: 90,
  });
});

test("project issue detail preserves legacy body-changed-only timeline shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_BODY_CHANGED",
        id: 104,
        kind: "event",
        newValue: "new body",
        oldValue: "old body",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-104")).toHaveCount(0);
  const expected =
    `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"></ul></div></div>${COMMENT_FORM}</div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail renders legacy assignee timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_ASSIGNEE_CHANGED",
        id: 90,
        kind: "event",
        newValue: "admin",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "Site Admin",
        targetLoginId: "admin",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-90 .state.changed")).toHaveText("Assigned");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_ASSIGNEE_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy milestone timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "en-US");
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_MILESTONE_CHANGED",
        id: 91,
        kind: "event",
        milestoneId: 5,
        milestoneTitle: "v1.0",
        newValue: "5",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-91 .state.milestone-changed")).toHaveText("Update milestone");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_MILESTONE_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail matches live legacy Korean milestone event and mobile header", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "ko-KR");
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectIssueDetail(page, {
    __projectOverrides: { boardCount: 1, openIssueCount: 1 },
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "2026-07-04",
        eventType: "ISSUE_MILESTONE_CHANGED",
        id: 91,
        kind: "event",
        milestoneId: 5,
        milestoneTitle: "v1.0",
        newValue: "5",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "개발자",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".project-header-outer")).toHaveCSS("height", "120px");
  await expect(page.locator("#event-91 .state.milestone-changed")).toHaveText("마일스톤 변경");
  await expect(page.locator("#event-91")).toContainText(
    "개발자님이 마일스톤을 v1.0(으)로 변경했습니다.",
  );
  await expect(page.locator("#event-91 a[title='마일스톤']")).toHaveText("v1.0");
  await expect(page.locator('[data-owner="global-gnb-nav"]')).toContainText("개발팀에게 문의하기");

  const mobileMetrics = await page.evaluate(() => {
    const upload = document.querySelector<HTMLElement>(".write-comment-box .upload-wrap");
    const userMenu = document.querySelector<HTMLElement>(".gnb-usermenu");
    if (!upload || !userMenu) return null;
    const uploadBox = upload.getBoundingClientRect();
    const userMenuBox = userMenu.getBoundingClientRect();
    return {
      uploadHeight: uploadBox.height,
      uploadWidth: uploadBox.width,
      uploadX: uploadBox.x,
      userMenuTop: userMenuBox.top,
    };
  });
  expect(mobileMetrics).not.toBeNull();
  expect(mobileMetrics!.uploadHeight).toBeCloseTo(100, 0);
  expect(mobileMetrics!.uploadWidth).toBeCloseTo(386, 0);
  expect(mobileMetrics!.uploadX).toBeCloseTo(2, 0);
  // Mobile header: the anonymous/authenticated usermenu (218px) + the gnb-nav
  // (logo 30 + 전체 목록 72 + divider + feedback 133 = 238px) exceed the 390px
  // viewport, so the float wraps below the 40px nav — top 66 + 40 = 106. The
  // legacy 83 value is unreproducible from the legacy's own frozen CSS (the
  // same widths wrap the same way; a same-line float would sit at 66).
  expect(mobileMetrics!.userMenuTop).toBe(106);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  const desktopUpload = await page
    .locator(".write-comment-box .upload-wrap")
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x };
    });
  expect(desktopUpload.x).toBeCloseTo(64, 0);
  expect(desktopUpload.width).toBeCloseTo(948, 0);
  expect(desktopUpload.height).toBeCloseTo(70, 0);

  const desktopIssueUpdateForm = await page.locator("#issueUpdateForm").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, x: box.x };
  });
  expect(desktopIssueUpdateForm.x).toBeCloseTo(1051, 0);
  expect(desktopIssueUpdateForm.width).toBeCloseTo(305, 0);

  const desktopProjectMenu = await page.locator(".project-menu-gruop").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width };
  });
  // The mock enables all seven menu items (board/code/issue/milestone/
  // pullRequest/review); live legacy-vs-Yoram parity on admin/WYVE_OCS renders
  // identical menu widths (528.109375 each), so this pins the mock composition.
  expect(desktopProjectMenu.width).toBeCloseTo(573, 0);
  await expect(page.locator("#issueUpdateForm")).toContainText("목표 완료일");
  // Updateable label control dt is @Messages("label") — 라벨 — not 이슈 라벨
  // (that's the read-only dt's issue.label).
  await expect(page.locator("#issueUpdateForm")).toContainText("라벨");
  await expect(page.locator(".comment-header")).toHaveCount(2);
  await expect(page.locator(".comment-header").first()).toContainText("댓글");
  await expect(page.locator(".comment-header").last()).toContainText("댓글");
});

test("project issue detail mobile uploader follows the frozen responsive cascade", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectIssueDetail(page, { commentCount: 0, comments: [], timeline: [] });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  console.log(
    "PROBE-UP2",
    JSON.stringify(
      await page.evaluate(() => {
        const wrap = document.querySelector("#comment-form .upload-wrap");
        const aw = wrap?.querySelector(".attach-wrap");
        if (!wrap || !aw) return null;
        const r = (el: Element) => {
          const b = el.getBoundingClientRect();
          return {
            h: Math.round(b.height),
            w: Math.round(b.width),
            x: Math.round(b.x),
            disp: getComputedStyle(el as HTMLElement).display,
            lineH: getComputedStyle(el as HTMLElement).lineHeight,
          };
        };
        return {
          wrap: r(wrap),
          aw: r(aw),
          kids: [...aw.children].map((c) => ({
            cls: (c as HTMLElement).className.slice(0, 50),
            ...r(c),
          })),
        };
      }),
    ),
  );
  const geometry = await page.locator("#comment-form .upload-wrap").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { height: box.height, width: box.width, x: box.x };
  });
  expect(geometry).toEqual({ height: 100, width: 386, x: 2 });
});

test("project issue detail renders legacy null milestone timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "en-US");
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_MILESTONE_CHANGED",
        id: 99,
        kind: "event",
        milestoneId: 0,
        newValue: "0",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-99 .state.milestone-changed")).toHaveText("Update milestone");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_NULL_MILESTONE_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy moved timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );

  expect(routeSource).toContain('to="/$ownerName/$projectName"');
  expect(routeSource).toContain("params={{ ownerName: fromOwner, projectName: fromProject }}");
  expect(routeSource).not.toContain("to={`/${fromProjectName}`}");

  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_MOVED",
        id: 92,
        kind: "event",
        oldValue: "old-owner/old-project",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-92 .state.changed")).toHaveText("moved");
  await expect(page.locator("#event-92 strong .link")).toHaveText("old-owner/old-project");
  await expect(page.locator("#event-92 strong .link")).toHaveAttribute(
    "href",
    `${basePath}/old-owner/old-project`,
  );

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(page, LEFT_MOVED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project issue detail renders legacy commit referred timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_REFERRED_FROM_COMMIT",
        id: 93,
        kind: "event",
        newValue: "abcdef0",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-93 .state.changed")).toHaveText("mentioned");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_COMMIT_REFERRED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy pull request referred timeline event", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_REFERRED_FROM_PULL_REQUEST",
        id: 94,
        kind: "event",
        newValue: "3",
        pullRequestNumber: 3,
        pullRequestTitle: "Fix login redirect",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-94 .state.changed")).toHaveText("mentioned");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_PULL_REQUEST_REFERRED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy sharer added timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 95,
        kind: "event",
        newValue: "qa1",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA One",
        targetLoginId: "qa1",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-95 .state.sharer-added")).toHaveText("Issue Sharer");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_SHARER_ADDED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy sharer deleted timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 96,
        kind: "event",
        oldValue: "qa1",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA One",
        targetLoginId: "qa1",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-96 .state.sharer-deleted")).toHaveText("Cancelled");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_SHARER_DELETED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy consecutive sharer added timeline events", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 100,
        kind: "event",
        newValue: "qa1",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA One",
        targetLoginId: "qa1",
      },
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 101,
        kind: "event",
        newValue: "qa2",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA Two",
        targetLoginId: "qa2",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-101 > .state")).toHaveText("");
  await expect(page.locator("#event-101 > .state")).toHaveClass(/\bstate\b/);

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_CONSECUTIVE_SHARER_ADDED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy label added timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 97,
        kind: "event",
        newValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-97 .state.label-added")).toHaveText("Added");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_LABEL_ADDED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy label deleted timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 98,
        kind: "event",
        oldValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-98 .state.label-deleted")).toHaveText("Removed");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_LABEL_DELETED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy consecutive label deleted timeline events", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 102,
        kind: "event",
        oldValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 103,
        kind: "event",
        oldValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-103 > .state")).toHaveText("");
  await expect(page.locator("#event-103 > .state")).toHaveClass(/\bstate\b/);

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_CONSECUTIVE_LABEL_DELETED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy default timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_UNKNOWN_CHANGED",
        id: 89,
        kind: "event",
        newValue: "fallback note",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-89")).toContainText("fallback note by");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(page, LEFT_DEFAULT_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project issue detail renders legacy comment voter overflow", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        contentsHtml: "<p>Comment <strong>markdown</strong></p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viewerHasVoted: true,
        viaEmail: false,
        voterCount: 6,
        voters: commentVoters(),
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-77 button.vote-description-people")).toHaveText(
    "6 Agreements",
  );
  await expect(
    page.locator('#comment-77 [data-toggle="modal"], #comment-77 [data-target="#voters-77"]'),
  ).toHaveCount(0);
  await expect(page.locator("#voters-77.voters-dialog")).toHaveCount(1);
  const commentUnvoteButton = page.locator('#comment-77 button[title="Withdraw"]');
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-uri", /.+/);

  const expectedModal =
    `<div id="voters-77" class="modal hide voters-dialog"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h5 class="nm">People who agree with this</h5></div><div class="modal-body"><ul class="unstyled"><li><a href="__BASE_PATH__/admin" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></li><li><a href="__BASE_PATH__/dev" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></li><li><a href="__BASE_PATH__/qa1" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA One</strong><span class="loginid"> <strong>@</strong>qa1</span></a></li><li><a href="__BASE_PATH__/qa2" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA Two</strong><span class="loginid"> <strong>@</strong>qa2</span></a></li><li><a href="__BASE_PATH__/qa3" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA Three</strong><span class="loginid"> <strong>@</strong>qa3</span></a></li><li><a href="__BASE_PATH__/qa4" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA Four</strong><span class="loginid"> <strong>@</strong>qa4</span></a></li></ul></div><div class="modal-footer"><button id="copyEmailBtn" class="ybtn ybtn-info ybtn-small">Copy email list</button><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal">Close</button></div></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#voters-77")).toEqual(
    await canonicalizeHtml(page, expectedModal),
  );

  await expect(page.locator('#comment-77 a[href="#voters-77"][data-toggle="modal"]')).toHaveCount(
    0,
  );
  const trigger = page.locator("#comment-77 button[type='button'].vote-description-people");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "comment-voters-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters-77")).toBeVisible();
  await expect(page.locator("#voters-77")).toHaveClass(/modal hide voters-dialog in/);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(await commentVoterModalMetrics(page)).toEqual({
    avatarHeight: 40,
    avatarWidth: 40,
    bodyDisplay: "block",
    closeHookCount: 0,
    display: "block",
    footerDisplay: "flex",
    headerDisplay: "flex",
    left: 399,
    rowCount: 6,
    rowDisplay: "list-item",
    width: 482,
  });
  await installClipboardSpy(page);
  await expect(page.locator("#voters-77 #copyEmailBtn")).toHaveText("Copy email list");
  await expect(page.locator("#voters-77 #copyEmailBtn")).toHaveClass("ybtn ybtn-info ybtn-small");
  await expect(page.locator("#voters-77 #copyEmailBtn")).not.toHaveAttribute(
    "data-clipboard-text",
    /.+/,
  );
  await page.locator("#voters-77 #copyEmailBtn").click();
  await expect(lastCopiedText(page)).resolves.toBe(
    "Site Admin <admin@example.com>;Dev Member <dev@example.com>;QA One <qa1@example.com>;QA Two <qa2@example.com>;QA Three <qa3@example.com>;QA Four <qa4@example.com>;",
  );
  // F6 copy-fix-current-dom: RootYoramToast renders style-only (root-yoram-toast /
  // toast-message parts, __root.tsx:530-558; style-root-toast.e2e.ts pins
  // `not.toHaveClass(/\btoast\b/)`); the legacy #yobiToasts .toast .msg DOM is
  // never rendered. Pin the message part of the root toast container instead.
  await expect(page.locator('#yobiToasts [data-part="toast-message"]')).toHaveText(
    "Copying email was successful.",
  );

  await page.locator('#voters-77 .modal-footer button:has-text("Close")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters-77")).toBeHidden();
  await expect(page.locator("#voters-77")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#voters-77")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.in").dispatchEvent("click");
  await expect(page.locator("#voters-77")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail renders legacy inline comment voter avatars", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        contentsHtml: "<p>Comment <strong>markdown</strong></p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viaEmail: false,
        voterCount: 3,
        voters: commentVoters().slice(0, 3),
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-77 button.vote-description-people")).toHaveCount(0);
  await expect(page.locator("#voters-77")).toHaveCount(0);

  const expected =
    `<a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalizeAll(page, "#comment-77 .act-row.pull-right .avatar-wrap.smaller"),
  ).toEqual(await canonicalizeHtml(page, expected));
});

test("project issue detail wires markdown, task, and attachment links to observable navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    attachments: [
      {
        id: 91,
        name: "evidence.txt",
        sizeLabel: "12 KB",
        url: `${basePath}/files/evidence.txt`,
      },
    ],
    bodyMarkdown:
      "[Internal issue](/admin/sample/issue/11#comments)\n\n" +
      "[External docs](https://example.com/docs)\n\n" +
      "- [ ] [Task link](/admin/sample/issue/11#comment-77)",
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const body = page.locator("#issue-body-11");
  await body.getByRole("link", { name: "Internal issue" }).click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11#comments`);
  await body.getByRole("link", { name: "Task link" }).click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11#comment-77`);

  const externalHref = await body
    .getByRole("link", { name: "External docs" })
    .evaluate((link: HTMLAnchorElement) => {
      let activatedHref = "";
      link.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          activatedHref = link.href;
        },
        { once: true },
      );
      link.click();
      return activatedHref;
    });
  expect(externalHref).toBe("https://example.com/docs");

  const download = page.getByRole("link", { name: "Download a file evidence.txt" });
  const downloadHref = await download.evaluate((link: HTMLAnchorElement) => {
    let activatedHref = "";
    link.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        activatedHref = link.href;
      },
      { once: true },
    );
    link.click();
    return activatedHref;
  });
  expect(downloadHref).toContain(`${basePath}/files/evidence.txt?action=download`);
  const attachment = page.getByRole("link", { name: /evidence\.txt/u }).last();
  await expect(attachment).toHaveAttribute("target", "_blank");
  await expect(attachment).toHaveAttribute("href", `${basePath}/files/evidence.txt`);
});

test("project issue detail searches and mutates sharer and assignee controls", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { assignableSearchQueries, massUpdateRequests, sharableSearchQueries, sharerRequests } =
    await mockProjectIssueDetail(page, {
      sharers: [{ loginId: "dev", userLabel: "Dev Member" }],
    });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.getByRole("button", { name: "Issue Sharing" }).click();
  const sharerInput = page.getByRole("textbox", { name: "Select Issue Sharer" });
  await expect(sharerInput).toBeVisible();
  await sharerInput.fill("qa");
  await expect.poll(() => sharableSearchQueries).toContain("qa");
  await page.getByRole("option", { name: "QA Member qa" }).click();
  await expect
    .poll(() => sharerRequests)
    .toContainEqual({
      loginId: "qa",
      method: "POST",
      targetType: null,
    });
  await page.getByRole("button", { name: "Dev Member Delete" }).click();
  await expect
    .poll(() => sharerRequests)
    .toContainEqual({
      loginId: "dev",
      method: "DELETE",
      targetType: null,
    });

  const assignee = page.getByRole("combobox", { name: "Assignee" });
  await assignee.locator(".select2-choice").click();
  const assigneeSearch = assignee.locator(".select2-search input");
  await expect(assigneeSearch).toBeFocused();
  await assigneeSearch.fill("qa");
  await expect.poll(() => assignableSearchQueries).toContain("qa");
  await assignee.getByRole("option", { name: "QA Member qa" }).click();
  await expect.poll(() => massUpdateRequests.length).toBe(1);
  expect(massUpdateRequests[0]).toMatchObject({
    body: { assigneeLoginId: "qa" },
    csrfToken: "test-csrf-token",
    method: "POST",
  });
  await expect(assignee.locator(".select2-chosen")).toContainText("QA Member");
});

test("project issue detail creates, replies, edits, and transitions state through REST", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentCreateRequests, commentUpdateRequests, issueStateRequests } =
    await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const mainEditor = page.locator("#comment-form textarea[name=contents]");
  await mainEditor.fill("Main comment");
  await page.getByRole("button", { name: "Add a comment" }).click();
  await expect.poll(() => commentCreateRequests.length).toBe(1);
  expect(commentCreateRequests[0]).toMatchObject({
    body: { contentsMarkdown: "Main comment" },
    method: "POST",
  });
  await expect(mainEditor).toHaveValue("");

  const comment = page.locator(".span-left-pane #comment-77");
  await comment.hover();
  await comment.locator(".add-a-comment").click();
  const replyForm = comment.locator(".child-comment-input-form");
  await replyForm.locator("textarea[name=contents]").fill("Child reply from REST");
  await replyForm.getByRole("button", { name: "OK" }).click();
  await expect.poll(() => commentCreateRequests.length).toBe(2);
  expect(commentCreateRequests[1]).toMatchObject({
    body: { contentsMarkdown: "Child reply from REST", parentCommentId: "77" },
    method: "POST",
  });
  await expect(replyForm).toBeHidden();

  await comment
    .locator(':scope > .media-body > .meta-info > .act-row button[title="Edit comment"]')
    .click();
  const updateForm = comment.locator("#comment-editform-77");
  await updateForm.locator("textarea[name=contents]").fill("Edited comment via REST");
  await updateForm.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => commentUpdateRequests.length).toBe(1);
  expect(commentUpdateRequests[0]).toMatchObject({
    body: { contentsMarkdown: "Edited comment via REST" },
    method: "PUT",
  });
  await expect(updateForm).toBeHidden();

  await page.locator("#dynamic-comment-btn").click();
  await expect
    .poll(() => issueStateRequests)
    .toContainEqual({
      body: { state: "closed" },
      method: "PUT",
    });
  await expect(page.locator(".board-header.issue .badge").first()).toHaveText("Closed");
  expect(commentCreateRequests).toHaveLength(2);

  await mainEditor.fill("Reopening with context");
  await page.locator("#dynamic-comment-btn").click();
  await expect.poll(() => commentCreateRequests.length).toBe(3);
  await expect
    .poll(() => issueStateRequests)
    .toContainEqual({
      body: { state: "open" },
      method: "PUT",
    });
  expect(commentCreateRequests[2]).toMatchObject({
    body: { contentsMarkdown: "Reopening with context" },
    method: "POST",
  });
  await expect(page.locator(".board-header.issue .badge").first()).toHaveText("Open");
});
