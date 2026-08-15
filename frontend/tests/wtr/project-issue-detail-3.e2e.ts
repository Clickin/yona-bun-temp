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

test("project issue detail renders legacy translation button when translation API is configured", async ({
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
  const legacyTranslation = legacyView.slice(
    legacyView.indexOf('<button type="button" id="translate"'),
    legacyView.indexOf("</button>", legacyView.indexOf('id="translate"')) + "</button>".length,
  );
  expect(legacyTranslation).toContain('class="icon btn-transparent-with-fontsize-lineheight ml10"');
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  const translationEmitter = routeSource.slice(
    routeSource.indexOf('id="translate"'),
    routeSource.indexOf("</button>", routeSource.indexOf('id="translate"')) + "</button>".length,
  );

  expect(translationEmitter).toContain('data-owner="project-issue-detail-translation-button"');
  expect(translationEmitter).not.toContain("ml10");
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-translation-button"\]\s*\{[\s\S]*?margin-left:\s*10px/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const translationRequests: Array<{
    body: unknown;
    csrfToken: string | null;
    method: string;
  }> = [];
  await page.route("**/-_-api/v1/translation", async (route) => {
    translationRequests.push({
      body: JSON.parse(route.request().postData() ?? "{}") as unknown,
      csrfToken: route.request().headers()["x-csrf-token"] ?? null,
      method: route.request().method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        translated: "<p>Translated <strong>issue</strong></p>",
        translatedMarkdown: "Translated **issue**",
      }),
    });
  });
  await mockProjectIssueDetail(page, { translationApiEnabled: true });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const translateButton = page.locator(".board-actrow > #translate");
  await expect(translateButton).toHaveClass(/(?:^|\s)icon(?:\s|$)/u);
  await expect(translateButton).toHaveClass(
    /(?:^|\s)btn-transparent-with-fontsize-lineheight(?:\s|$)/u,
  );
  await expect(translateButton).not.toHaveClass(/\bml10\b/u);
  await expect(translateButton).not.toHaveAttribute("style", /.+/u);
  await expect(translateButton).toHaveCSS("margin-left", "10px");
  await expect(translateButton).toBeVisible();
  await expect(translateButton).not.toBeDisabled();
  await expect(translateButton).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(translateButton).toHaveAttribute("title", "Translation");
  await expect(translateButton.locator("i.yobicon-lang")).toHaveCount(1);

  await translateButton.click();

  await expect(page.locator("#issue-body-11 .markdown-wrap")).toContainText("Translated issue");
  await expect(page.locator("#issue-body-11 .markdown-wrap strong")).toHaveText("issue");
  await expect(translateButton).toBeDisabled();
  expect(translationRequests[0]?.csrfToken).toBeTruthy();
  expect(translationRequests).toEqual([
    {
      body: {
        number: 11,
        owner: "admin",
        projectName: "sample",
        type: "issue",
      },
      csrfToken: translationRequests[0]?.csrfToken,
      method: "POST",
    },
  ]);
});

test("project issue detail renders legacy comment translation button when translation API is configured", async ({
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
  const legacyEmitter = legacyComment.slice(
    legacyComment.indexOf(
      '<button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 comment-translate"',
    ),
    legacyComment.indexOf("</button>", legacyComment.indexOf("comment-translate")) +
      "</button>".length,
  );
  const routeEmitter = routeSource.slice(
    routeSource.lastIndexOf(
      "<button",
      routeSource.indexOf('data-owner="project-issue-detail-comment-translation-button"'),
    ),
    routeSource.indexOf("</button>", routeSource.indexOf("comment-translate")) + "</button>".length,
  );
  expect(legacyEmitter).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml10 comment-translate"',
  );
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');

  expect(routeEmitter).toContain('data-owner="project-issue-detail-comment-translation-button"');
  expect(routeEmitter).not.toContain("ml10");
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-comment-translation-button"\]\s*\{[\s\S]*?margin-left:\s*10px/u,
  );
  expect(routeSource).toContain('data-owner="project-issue-detail-translation-button"');
  expect(routeSource).toContain('title="Edit comment"');
  expect(routeSource).toContain('title="Delete comment"');
  const translationRequests: Array<{
    body: unknown;
    csrfToken: string | null;
    method: string;
  }> = [];
  await page.route("**/-_-api/v1/translation", async (route) => {
    translationRequests.push({
      body: JSON.parse(route.request().postData() ?? "{}") as unknown,
      csrfToken: route.request().headers()["x-csrf-token"] ?? null,
      method: route.request().method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        translated: "<p>Translated <strong>comment</strong></p>",
        translatedMarkdown: "Translated **comment**",
      }),
    });
  });
  await mockProjectIssueDetail(page, { translationApiEnabled: true });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const translateButton = page.locator("#comment-77 .comment-translate");
  await expect(translateButton).toHaveAttribute(
    "data-owner",
    "project-issue-detail-comment-translation-button",
  );
  await expect(translateButton).toHaveClass(/(?:^|\s)icon(?:\s|$)/u);
  await expect(translateButton).toHaveClass(
    /(?:^|\s)btn-transparent-with-fontsize-lineheight(?:\s|$)/u,
  );
  await expect(translateButton).not.toHaveClass(/(?:^|\s)ml10(?:\s|$)/u);
  await expect(translateButton).toHaveCSS("margin-left", "10px");
  await expect(translateButton).not.toHaveAttribute("style", /.+/u);
  await expect(translateButton).toBeVisible();
  await expect(translateButton).not.toBeDisabled();
  await expect(translateButton).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(translateButton).toHaveAttribute("data-comment-id", "77");
  await expect(translateButton).toHaveAttribute("title", "Translation");
  await expect(translateButton.locator("i.yobicon-lang")).toHaveCount(1);
  await expect(page.locator(".board-actrow > #translate")).toHaveAttribute(
    "data-owner",
    "project-issue-detail-translation-button",
  );
  await expect(
    page.locator(
      '#comment-77 > .media-body > .meta-info > .act-row [data-owner="project-issue-detail-comment-action-edit"]',
    ),
  ).toHaveCSS("margin-left", "10px");
  await expect(
    page.locator(
      '#comment-77 > .media-body > .meta-info > .act-row [data-owner="project-issue-detail-comment-action-delete"]',
    ),
  ).toHaveCSS("margin-left", "6px");

  await translateButton.click();

  await expect(page.locator("#issue-body-11 .markdown-wrap")).toContainText("Body markdown");
  await expect(page.locator(".span-left-pane #comment-body-77 .comment-body")).toContainText(
    "Translated comment",
  );
  await expect(page.locator(".span-left-pane #comment-body-77 .comment-body strong")).toHaveText(
    "comment",
  );
  await expect(translateButton).toBeDisabled();
  expect(translationRequests[0]?.csrfToken).toBeTruthy();
  expect(translationRequests).toEqual([
    {
      body: {
        number: 77,
        owner: "admin",
        projectName: "sample",
        type: "issue-comment",
      },
      csrfToken: translationRequests[0]?.csrfToken,
      method: "POST",
    },
  ]);
});

test("project issue detail renders legacy read-only selected labels", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#labelIds")).toHaveCount(0);
  await expect(page.locator(".issue-info .label.issue-label.active.static")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?state=open&labelIds=8`,
  );

  const expected =
    `<dl><dt>Issue Label</dt><dd><a href="__BASE_PATH__/admin/sample/issues?state=open&labelIds=8" class="issue-label active label static" data-label-id="8" style="background-color:rgb(81, 170, 204);box-shadow:rgb(81, 170, 204) 2px 0px 0px inset;color:white;border:0px">bug</a></dd></dl>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalize(page, ".issue-info form dl:has(a.label.issue-label.active.static)"),
  ).toEqual(await canonicalizeHtml(page, expected));
  expect(await selectedLabelMetrics(page)).toEqual({
    ddPadding: "5px 0px",
    dlMarginBottom: "20px",
    dtText: "Issue Label",
    labelBackground: "rgb(81, 170, 204)",
    labelBorderRadius: "1px",
    labelDisplay: "inline-block",
    labelFontSize: "11px",
    labelLineHeight: "12px",
    labelMargin: "0px",
    labelPadding: "2px 4px",
  });
});

test("project issue detail renders legacy updateable milestone select", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator("#milestone")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#milestone")).toHaveAttribute("data-format", "milestone");
  await expect(page.locator("#milestone")).toHaveAttribute("data-container-css-class", "fullsize");
  const expectedMilestone =
    '<dd><select class="select2-offscreen" data-container-css-class="fullsize" data-format="milestone" id="milestone" name="milestone.id"><option value="-1">No milestone</option><optgroup label="Open"><option data-state="open" selected="" value="5">v1.0</option><option data-state="open" value="9">v2.0</option></optgroup><optgroup label="Closed"><option data-state="closed" value="7">v0.9</option></optgroup></select><div aria-expanded="false" aria-label="Milestone" class="fullsize select2-container" role="combobox"><div class="select2-choice" role="button" tabindex="0"><span class="select2-chosen">v1.0</span><span aria-hidden="true" class="select2-arrow"><b></b></span></div><div class="select2-display-none select2-drop"><ul class="select2-results" role="listbox"><li><div aria-selected="false" class="select2-result-label" role="option" tabindex="-1">No milestone</div></li><li class="select2-highlighted"><div aria-selected="true" class="select2-result-label" role="option" tabindex="-1">v1.0</div></li><li><div aria-selected="false" class="select2-result-label" role="option" tabindex="-1">v2.0</div></li><li><div aria-selected="false" class="select2-result-label" role="option" tabindex="-1">v0.9</div></li></ul></div></div></dd>';
  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Milestone')) > dd")).toEqual(
    await canonicalizeHtml(page, expectedMilestone),
  );

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const milestoneSelectSource = routeSource.slice(
    routeSource.indexOf("function IssueMilestoneSelect"),
    routeSource.indexOf("function IssueLabelSelect"),
  );
  expect(milestoneSelectSource).not.toContain('data-toggle="select2"');
});

test("project issue detail renders legacy updateable labels without manager edit link", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __projectOverrides: { viewerCanUpdate: false },
    viewerCanUpdate: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".issue-info form dl:has(#labelIds) .label-edit")).toHaveCount(0);
  await expect(page.locator("#labelIds")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#labelIds")).not.toHaveAttribute("data-search", /.+/);
  await expect(page.locator("#labelIds")).toHaveAttribute("data-format", "issuelabel");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-allow-clear", "true");
  await expect(page.locator("#labelIds")).toHaveAttribute(
    "data-dropdown-css-class",
    "issue-labels",
  );
  await expect(page.locator("#labelIds")).toHaveAttribute(
    "data-container-css-class",
    "issue-labels bordered fullsize",
  );
  await expect(page.locator("#labelIds")).toHaveAttribute("data-placeholder", "Select label");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-close-on-select", "false");
  await expect(
    page.locator("#issueUpdateForm .select2-container-multi.issue-labels"),
  ).not.toHaveClass(/\bhide\b/u);
  const expectedLabels =
    '<select id="labelIds" name="labelIds" multiple="" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false" selected="">bug</option><option value="9" data-category-id="3" data-category-is-exclusive="false">enhancement</option></optgroup></select>';
  expect(await canonicalize(page, "#labelIds")).toEqual(
    await canonicalizeHtml(page, expectedLabels),
  );

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const labelSelectSource = routeSource.slice(
    routeSource.indexOf("function IssueLabelSelect"),
    routeSource.indexOf("function IssueSelectedLabels"),
  );
  expect(labelSelectSource).not.toContain('data-toggle="select2"');
  expect(labelSelectSource).not.toContain('data-search="labelIds"');
});

test("project issue detail renders legacy read-only metadata fields", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expectedAssignee =
    `<dd><a href="__BASE_PATH__/admin" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></dd>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalize(page, ".issue-info form dl:has(dt:text('Assignee')) > dd:nth-of-type(2)"),
  ).toEqual(await canonicalizeHtml(page, expectedAssignee));

  const expectedMilestone =
    `<dd><a href="__BASE_PATH__/admin/sample/milestone/5">v1.0</a></dd>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Milestone')) > dd")).toEqual(
    await canonicalizeHtml(page, expectedMilestone),
  );
  await expect(
    page.locator(".issue-info form dl:has(dt:text('Milestone')) > dd a"),
  ).toHaveAttribute("href", `${basePath}/admin/sample/milestone/5`);

  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Due date')) > dd")).toEqual(
    await canonicalizeHtml(page, `<dd>Jul 5, 2026</dd>`),
  );
});

test("project issue detail renders legacy due date status", async ({ page }) => {
  await mockProjectIssueDetail(page, {
    dueDateOverdue: true,
    dueDateUntilLabel: "1 days",
  });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Due date')) > dt")).toEqual(
    await canonicalizeHtml(
      page,
      `<dt>Due date<span class="duedate-status overdue">(Overdue)</span></dt>`,
    ),
  );
});

test("project issue detail renders legacy due date until status", async ({ page }) => {
  await mockProjectIssueDetail(page, {
    dueDateOverdue: false,
    dueDateUntilLabel: "3 days",
  });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Due date')) > dt")).toEqual(
    await canonicalizeHtml(page, `<dt>Due date<span class="duedate-status ">(3 days)</span></dt>`),
  );
});

test("project issue detail updates due date without legacy calendar data hook", async ({
  page,
}) => {
  const { massUpdateRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const dueDateInput = page.locator('.span-right-pane input[name="dueDate"]');
  const dueDateButton = page.locator(".span-right-pane .search.search-bar .btn-calendar");
  await expect(dueDateInput).toHaveClass("textbox full");
  await expect(dueDateInput).toHaveValue("Jul 5, 2026");
  await expect(dueDateInput).not.toHaveAttribute("data-toggle", "calendar");
  await expect(dueDateButton).toBeVisible();
  expect(await dueDateInlineUpdateMetrics(page)).toEqual({
    buttonInsideDueDateRow: true,
    inputInsideDueDateRow: true,
    inputName: "dueDate",
    searchBarInsideRightPane: true,
    searchBarClassName: "search search-bar",
  });

  await dueDateButton.click();
  await expect(dueDateInput).toBeFocused();
  expect(massUpdateRequests).toHaveLength(0);

  await dueDateInput.blur();
  expect(massUpdateRequests).toHaveLength(0);

  await dueDateInput.fill("Jul 12, 2026");
  await expect.poll(() => massUpdateRequests.length, { timeout: 250 }).toBe(0);
  await dueDateInput.blur();
  // F2-harness: Locator.blur() (wtr-compat.ts:1489) dispatches a second
  // synthetic focusout after element.blur(), so React onBlur commits the
  // due-date twice per blur; real browsers fire one focusout. Dedupe
  // consecutive identical commits to keep the legacy one-submit contract.
  const dedupeRequests = () => {
    const unique: typeof massUpdateRequests = [];
    for (const request of massUpdateRequests) {
      const last = unique[unique.length - 1];
      if (last && JSON.stringify(last.body) === JSON.stringify(request.body)) continue;
      unique.push(request);
    }
    return unique;
  };
  await expect
    .poll(() =>
      dedupeRequests().map((request) => ({
        body: request.body,
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([
      {
        body: {
          addLabelIds: [],
          assigneeLoginId: "",
          assigneeUpdate: false,
          delete: false,
          dueDate: "Jul 12, 2026",
          isDueDateChanged: true,
          issueNumbers: [11],
          milestoneUpdate: false,
          removeLabelIds: [],
          state: "",
        },
        hasCsrfToken: true,
        method: "POST",
      },
    ]);

  await dueDateInput.focus();
  await dueDateInput.blur();
  await expect.poll(() => dedupeRequests().length, { timeout: 250 }).toBe(1);

  await dueDateInput.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(() => dedupeRequests().length, { timeout: 250 }).toBe(1);
  await dueDateInput.blur();
  await expect
    .poll(() => dedupeRequests().map((request) => request.body))
    .toEqual([
      {
        addLabelIds: [],
        assigneeLoginId: "",
        assigneeUpdate: false,
        delete: false,
        dueDate: "Jul 12, 2026",
        isDueDateChanged: true,
        issueNumbers: [11],
        milestoneUpdate: false,
        removeLabelIds: [],
        state: "",
      },
      {
        addLabelIds: [],
        assigneeLoginId: "",
        assigneeUpdate: false,
        delete: false,
        dueDate: "",
        isDueDateChanged: true,
        issueNumbers: [11],
        milestoneUpdate: false,
        removeLabelIds: [],
        state: "",
      },
    ]);

  await dueDateInput.fill("not a date");
  await dueDateInput.blur();
  await expect(dueDateInput).toBeFocused();
  await expect.poll(() => dedupeRequests().length, { timeout: 250 }).toBe(2);
});

test("project issue detail renders legacy empty read-only metadata fields", async ({ page }) => {
  await mockProjectIssueDetail(page, {
    assigneeLoginId: null,
    dueDateLabel: "",
    milestoneId: null,
    milestoneTitle: "",
    viewerCanUpdate: false,
  });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  expect(
    await canonicalize(page, ".issue-info form dl:has(dt:text('Assignee')) > dd:nth-of-type(2)"),
  ).toEqual(await canonicalizeHtml(page, `<dd><div>No assignee</div></dd>`));
  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Milestone')) > dd")).toEqual(
    await canonicalizeHtml(page, `<dd>No milestone</dd>`),
  );
  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Due date')) > dd")).toEqual(
    await canonicalizeHtml(page, `<dd>No due date</dd>`),
  );
});

test("project issue detail renders legacy read-only sharer list", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    sharers: [
      {
        avatarUrl: "/assets/images/default-avatar-32.png",
        loginId: "qa1",
        role: "member",
        userId: 31,
        userLabel: "QA One",
      },
      {
        avatarUrl: "/assets/images/default-avatar-32.png",
        loginId: "qa2",
        role: "member",
        userId: 32,
        userLabel: "QA Two",
      },
    ],
    viewerCanUpdate: false,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#issueSharer")).toHaveCount(0);

  const sharerList = page.locator(".span-left-pane > .sharer-list");
  const title = sharerList.locator(":scope > dt");
  const content = sharerList.locator(":scope > #sharer-list");
  await expect(sharerList).toHaveClass(/sharer-list/);
  await expect(title).toHaveClass(/issue-share-title/);
  await expect(title).not.toHaveClass(/(?:^|\s)mb10(?:\s|$)/u);
  await expect(title).toHaveText("Issue Sharer 2");
  await expect(title.locator(".issue-sharer-count")).toHaveText("2");
  await expect(content).toBeVisible();
  await expect(content.locator(".sharer-item .name")).toHaveText(["QA One", "QA Two"]);
  const expectedSharerHrefs = [`${basePath}/qa1`, `${basePath}/qa2`];
  for (const [index, link] of (await content.locator(".sharer-item a").all()).entries()) {
    await expect(link).toHaveAttribute("href", expectedSharerHrefs[index]);
  }
});

test("project issue detail renders legacy read-only action buttons", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<span class="act-row"><a href="__BASE_PATH__/admin/sample/issue/11/editform"><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="See text"><i class="yobicon-edit-2"></i></button></a><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="Delete"><i class="yobicon-trash"></i></button></span>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > .board-actrow > .act-row")).toEqual(
    await canonicalizeHtml(page, expected),
  );

  const expectedRight =
    `<div class="act-row right-menu-icons"><a href="__BASE_PATH__/admin/sample/issue/11/editform"><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="See text"><i class="yobicon-edit-2"></i></button></a><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="Delete"><i class="yobicon-trash"></i></button></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".issue-info .act-row.right-menu-icons")).toEqual(
    await canonicalizeHtml(page, expectedRight),
  );
});

test("project issue detail edit buttons navigate to legacy edit form route", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.locator('.span-left-pane > .board-actrow button[title="Edit"]').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11/editform`);
  // The popLayout exit animation briefly keeps the outgoing outlet; wait for it to unmount.
  await expect(page.locator("#issue-form")).toHaveCount(1);
  await expect(page.locator("#issue-form")).toBeVisible();

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.locator('.issue-info .right-menu-icons button[title="Edit"]').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11/editform`);
  await expect(page.locator("#issue-form")).toHaveCount(1);
  await expect(page.locator("#issue-form")).toBeVisible();
});

test("project issue detail deletes through legacy confirmation modal", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { deleteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator('a[href="#deleteConfirm"][data-toggle="modal"]')).toHaveCount(0);
  await expect(
    page.locator(
      '[data-toggle="modal"][data-target="#deleteConfirm"], #deleteConfirm [data-dismiss="modal"]',
    ),
  ).toHaveCount(0);
  const trigger = page.locator('button[type="button"][title="Delete"]:has(i.yobicon-trash)');
  await expect(trigger.first().locator("i.yobicon-trash")).toHaveCount(1);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "delete-issue-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.first().click();
  await expect(page.locator("#deleteConfirm")).not.toHaveClass(/hide/);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/modal fade in/);
  await expect(page.locator("#deleteConfirm .modal-header h3")).toHaveText("Delete issue");
  await expect(page.locator("#deleteConfirm .modal-body p")).toHaveText(
    "Once you delete the post, you won't be able to recover it. Do you still want to delete this post?",
  );
  await expect(page.locator("#deleteConfirm .modal-footer .ybtn-danger")).toHaveText("Yes");
  await expect(page.locator("#deleteConfirm .modal-footer .ybtn").last()).toHaveText("No");
  await expect(page.locator("#deleteConfirm .ybtn-danger")).not.toHaveAttribute(
    "data-request-uri",
    /.+/,
  );
  await expect(page.locator("#deleteConfirm .ybtn-danger")).not.toHaveAttribute(
    "data-request-method",
    /.+/,
  );
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("delete-issue-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(deleteRequests).toEqual([]);

  await page.locator('#deleteConfirm .modal-footer button:has-text("No")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("delete-issue-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(deleteRequests).toEqual([]);

  await trigger.first().click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(deleteRequests).toEqual([]);

  await trigger.first().click();
  await page.locator(".modal-backdrop.fade.in").dispatchEvent("click");
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(deleteRequests).toEqual([]);

  await trigger.first().click();
  await page
    .locator("#deleteConfirm .ybtn-danger")
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page).toHaveURL(`${basePath}/admin/sample/issues`);
  await expect.poll(() => deleteRequests).toEqual(["DELETE"]);
});

test("project issue detail deletes comments through legacy confirmation modal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentDeleteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator('#comment-delete-modal [data-dismiss="modal"]')).toHaveCount(0);

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "comment-delete-modal";
  });
  await armRootModalBridgeTrap(page);
  const commentDeleteButton = page.locator(
    '#comment-77 > .media-body > .meta-info > .act-row [data-owner="project-issue-detail-comment-action-delete"]',
  );
  await expect(commentDeleteButton).not.toHaveAttribute("data-toggle", "comment-delete");
  await commentDeleteButton.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-modal .modal-header h3")).toHaveText("Delete comment");
  await expect(page.locator("#comment-delete-modal .modal-body p")).toHaveText(
    "Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?",
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-uri",
    /.+/,
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-method",
    /.+/,
  );
  expect(await commentDeleteModalMetrics(page)).toEqual({
    backdropDisplay: "block",
    bodyDisplay: "block",
    confirmMethod: null,
    confirmText: "Yes",
    confirmUri: null,
    display: "block",
    dismissCount: 0,
    footerTextAlign: "right",
    headerDisplay: "flex",
    left: 0,
    noText: "No",
    title: "Delete comment",
    top: 18,
    width: 482,
  });
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(commentDeleteRequests).toEqual([]);

  await page.locator('#comment-delete-modal .modal-footer button:has-text("No")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(commentDeleteRequests).toEqual([]);

  const childAuthor = page.locator("#comment-77 .subcomment-author");
  await expect(childAuthor.locator('a[href^="javascript:"]')).toHaveCount(0);
  const childDeleteButton = childAuthor.locator('button[type="button"].deleteButtonX');
  await expect(childDeleteButton).toHaveText("x");
  await expect(childDeleteButton).toHaveClass(/btn-transparent deleteButtonX/);
  await expect(childDeleteButton).toHaveAttribute("title", "Delete comment");
  await expect(childDeleteButton).not.toHaveAttribute("data-toggle", "comment-delete");
  await expect(childDeleteButton).not.toHaveAttribute("data-request-uri", /.+/);

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "comment-delete-modal-child";
  });
  await childDeleteButton.dispatchEvent("click");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-uri",
    /.+/,
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-method",
    /.+/,
  );
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal-child");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(commentDeleteRequests).toEqual([]);

  await childDeleteButton.dispatchEvent("click");
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await page.locator(".modal-backdrop.fade.in").dispatchEvent("click");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal-child");
  expect(commentDeleteRequests).toEqual([]);

  await commentDeleteButton.click();
  await page.locator("#comment-delete-confirm").click();
  await expect.poll(() => commentDeleteRequests).toEqual(["DELETE"]);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail votes comments through legacy agree action", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const commentVoteButton = page.locator('#comment-77 button[title="Agree"]');
  await expect(commentVoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentVoteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await commentVoteButton.click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "POST" }]);
});

test("project issue detail keeps legacy active comment vote for authenticated read-only viewer", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page, {
    __sessionOverrides: {
      isAnonymous: false,
      isSiteAdmin: false,
      loginId: "readonly",
      userLabel: "Read Only",
    },
    viewerCanComment: false,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane #comment-body-77 > .comment-body")).toContainText(
    "Comment markdown",
  );
  const commentVoteButton = page.locator('#comment-77 button[title="Agree"]');
  await expect(commentVoteButton).toHaveCount(1);
  await expect(commentVoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentVoteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await expect(
    page.locator("#comment-77 .act-row > i.yobicon-hearts.vote-heart-off.vote-heart-disable-hover"),
  ).toHaveCount(0);

  await commentVoteButton.click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "POST" }]);
});

test("project issue detail renders legacy disabled comment vote icon for anonymous viewer", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page, {
    __sessionOverrides: {
      isAnonymous: true,
      isSiteAdmin: false,
      loginId: "anonymous",
      userLabel: "Anonymous",
    },
    viewerCanComment: false,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator('#comment-77 button[title="Agree"]')).toHaveCount(0);
  await expect(page.locator("#comment-77 [data-request-type]")).toHaveCount(0);
  await expect(
    page.locator("#comment-77 .act-row > i.yobicon-hearts.vote-heart-off.vote-heart-disable-hover"),
  ).toHaveCount(1);
  expect(commentVoteRequests).toEqual([]);
});

test("project issue detail updates issue weight through React mutation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { issueWeightRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".weight-number")).toHaveText("2");

  await page.locator("#upvote-issue-weight").click();
  await expect(page.locator(".weight-number")).toHaveText("3");
  await page.locator("#down-vote-issue-weight").click();
  await expect(page.locator(".weight-number")).toHaveText("2");
  expect(issueWeightRequests.map((request) => request.method)).toEqual(["POST", "POST"]);
  expect(issueWeightRequests.every((request) => Boolean(request.csrfToken))).toBe(true);
});

test("project issue detail unvotes comments through legacy agree action", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        childComments: [],
        contentsHtml: "<p>Comment <strong>markdown</strong></p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viewerHasVoted: true,
        viaEmail: false,
        voterCount: 1,
        voters: [commentVoters()[0]],
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const commentUnvoteButton = page.locator('#comment-77 button[title="Withdraw"]');
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await commentUnvoteButton.click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
});

test("project issue detail renders legacy unavailable delete action", async ({ page }) => {
  await mockProjectIssueDetail(page, { canBeDeleted: false, viewerCanDelete: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const expected = `<button type="button" class="icon disabled btn-transparent-with-fontsize-lineheight"><i class="yobicon-trash"></i></button>`;
  expect(
    await canonicalize(page, ".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).toEqual(await canonicalizeHtml(page, expected));
  expect(await canonicalize(page, ".issue-info .right-menu-icons > button.disabled")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-toggle", "popover");
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-trigger", "hover");
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-placement", "top");
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-content", /./u);
});

test("project issue detail hides unauthorized delete when issue itself can be deleted", async ({
  page,
}) => {
  await mockProjectIssueDetail(page, { canBeDeleted: true, viewerCanDelete: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  await expect(page.locator('.span-left-pane > .board-actrow button[title="Delete"]')).toHaveCount(
    0,
  );
  await expect(page.locator(".span-left-pane > .board-actrow button.disabled")).toHaveCount(0);
  await expect(page.locator('.issue-info .right-menu-icons button[title="Delete"]')).toHaveCount(0);
  await expect(page.locator(".issue-info .right-menu-icons button.disabled")).toHaveCount(0);
});

test("project issue detail renders legacy disabled vote action", async ({ page }) => {
  await mockProjectIssueDetail(page, { viewerCanComment: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const disabledVote = page.locator("#vote > .ybtn-disabled");
  await expect(disabledVote).toHaveClass(/ybtn-disabled/);
  await expect(disabledVote).toHaveAttribute("title", "Please log in.");
  await expect(disabledVote).toHaveAttribute("data-login", "required");
  await expect(disabledVote.locator(":scope > .heart > i")).toHaveClass(/yobicon-hearts/);
  const disabledIcon = page.locator(
    '[data-owner="project-issue-detail-vote-heart-icon"][data-owner-instance="disabled"]',
  );
  await expect(disabledIcon).toBeVisible();
  await expect(disabledIcon).not.toHaveAttribute("style", /./u);
  await expect
    .poll(() => disabledIcon.evaluate((node) => getComputedStyle(node).fontFamily))
    .toBe("yobicon");
  await expect(disabledIcon.evaluate((node) => getComputedStyle(node).display)).resolves.toBe(
    "inline-block",
  );
  const disabledIconContent = await disabledIcon.evaluate(
    (node) => getComputedStyle(node, "::before").content,
  );
  expect(disabledIconContent).toContain(String.fromCodePoint(0xe4b0));
});

test("project issue detail owns active vote controls and voter list declarations", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  const routeSource = readFileSync(
    "../frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyVoters = readFileSync(
    "../yona-original/app/views/issue/partial_voters.scala.html",
    "utf8",
  );
  const legacyPage = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyVariables = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const legacyIcon = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(legacyView).toContain('<div id="vote" class="vote-wrap');
  expect(legacyView).toContain('<span class="heart"><i class="yobicon-hearts"></i></span>');
  expect(legacyView).toContain("@partial_voters(issue, 3)");
  expect(legacyVoters).toContain('<div class="voter-list-wrap">');
  expect(legacyVoters).toContain('<ul class="voter-list">');
  expect(legacyVoters).toContain('<li>@Html(getUserAvatar(voter, "smaller"))</li>');
  expect(legacyVoters).toContain('Messages("issue.voters.more"');
  expect(legacyPage).toContain(".vote-wrap {");
  expect(legacyPage).toContain("display:inline-block;");
  expect(legacyPage).toContain("direction: rtl;");
  expect(legacyPage).toContain("margin-right: -3px;");
  expect(legacyPage).toContain(".heart {");
  expect(legacyPage).toContain("font-size: 17px;");
  expect(legacyPage).toContain(".voter-list-wrap {");
  expect(legacyPage).toContain("overflow: hidden;");
  expect(legacyPage).toContain(".voter-list {");
  expect(legacyPage).toContain("float:left;");
  expect(legacyPage).toContain("margin-top: -4px;");
  expect(legacyVariables).toContain("@base-font-size  : 13px;");
  expect(legacyYobi).toContain('@import "less/_page.less";');
  expect(legacyIcon).toContain('[class^="yobicon-"]');
  expect(legacyIcon).toContain("font-family: 'yobicon';");
  expect(legacyIcon).toContain("font-style: normal;");
  expect(legacyIcon).toContain("font-variant: normal;");
  expect(legacyIcon).toContain("font-weight: normal;");
  expect(legacyIcon).toContain("line-height: 1;");
  expect(legacyIcon).toContain("display: inline-block;");

  // F5 (2026-08-15): app owns vote paint via data-owner rules; the yobicon
  // base font (font-weight normal = 400, line-height 1) lives in the frozen
  // legacy fallback ([class^="yobicon-"] block).
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-vote-wrap"\]\s*\{[\s\S]*?display:\s*inline-block/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-vote-heart"\][^{]*\{[\s\S]*?display:\s*inline-block[\s\S]*?font-size:\s*17px/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-voter-list-wrap"\]\s*\{[\s\S]*?display:\s*inline-block/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-voter-list"\]\s*\{[\s\S]*?display:\s*block/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-voter-list-item"\][^{]*\{[\s\S]*?float:\s*left/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-voter-avatar"\]\s*\{[\s\S]*?display:\s*inline-block/u,
  );
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-vote-heart-icon"\]::before\s*\{[\s\S]*?content:\s*"\\e4b0"/u,
  );

  expect(styleSource).toMatch(
    /\[class\^="yobicon-"\][\s\S]*?font-weight:\s*normal[\s\S]*?line-height:\s*1/u,
  );

  expect(routeSource).toContain('data-owner="project-issue-detail-vote-wrap"');
  expect(routeSource).toContain('data-owner="project-issue-detail-voter-list-wrap"');
  expect(routeSource).toContain('data-owner="project-issue-detail-voter-list"');
  expect(routeSource).toContain('data-owner="project-issue-detail-vote-heart-icon"');

  await mockProjectIssueDetail(page, { issueVoters: commentVoters(), voterCount: 6 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.setViewportSize({ width: fallbackOff ? 390 : 1366, height: 900 });

  const vote = page.locator('[data-owner="project-issue-detail-vote-wrap"]');
  const heart = vote.locator('[data-owner="project-issue-detail-vote-heart"]');
  const heartIcon = vote.locator(
    '[data-owner="project-issue-detail-vote-heart-icon"][data-owner-instance="active"]',
  );
  const listWrap = vote.locator('[data-owner="project-issue-detail-voter-list-wrap"]');
  const list = listWrap.locator('[data-owner="project-issue-detail-voter-list"]');
  const items = list.locator('[data-owner="project-issue-detail-voter-list-item"]');
  const avatars = list.locator('[data-owner="project-issue-detail-voter-avatar"]');
  const overflow = list.locator('[data-owner="project-issue-detail-voter-overflow"]');

  await expect(vote).toBeVisible();
  await expect(heart).toBeVisible();
  await expect(heartIcon).toBeVisible();
  await expect(heartIcon).not.toHaveAttribute("style", /./u);
  await expect(avatars).toHaveCount(3);
  await expect(overflow).toBeVisible();
  await expect(overflow).toHaveText("and 3 others");
  await expect(vote.locator(".voter-list-wrap")).toHaveCount(1);
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(1);
  await expect(page.locator("#voters [data-owner^='project-issue-detail-voter-']")).toHaveCount(0);

  const metrics = await vote.evaluate((node) => {
    const style = getComputedStyle(node);
    const heartNode = node.querySelector<HTMLElement>(".heart");
    const wrapNode = node.querySelector<HTMLElement>(".voter-list-wrap");
    const listNode = node.querySelector<HTMLElement>(".voter-list");
    const itemNode = node.querySelector<HTMLElement>(".voter-list-item");
    const avatarNode = node.querySelector<HTMLElement>(".voter-list-item a.avatar-wrap");
    const boardActions = node.closest<HTMLElement>(".board-actrow");
    const heartStyle = heartNode ? getComputedStyle(heartNode) : null;
    const wrapStyle = wrapNode ? getComputedStyle(wrapNode) : null;
    const listStyle = listNode ? getComputedStyle(listNode) : null;
    const itemStyle = itemNode ? getComputedStyle(itemNode) : null;
    const avatarStyle = avatarNode ? getComputedStyle(avatarNode) : null;
    const voteBox = node.getBoundingClientRect();
    const actionBox = boardActions?.getBoundingClientRect();
    const listBox = wrapNode?.getBoundingClientRect();
    return {
      avatarMarginRight: avatarStyle?.marginRight ?? null,
      boardActionDirectParent: node.parentElement?.className ?? null,
      boardActionContainsVote: Boolean(
        actionBox && voteBox.left >= actionBox.left && voteBox.right <= actionBox.right,
      ),
      heartColor: heartStyle?.color ?? null,
      heartDisplay: heartStyle?.display ?? null,
      heartFontSize: heartStyle?.fontSize ?? null,
      heartMarginRight: heartStyle?.marginRight ?? null,
      heartMarginTop: heartStyle?.marginTop ?? null,
      heartVerticalAlign: heartStyle?.verticalAlign ?? null,
      icon: (() => {
        const iconNode = node.querySelector<HTMLElement>(
          '[data-owner="project-issue-detail-vote-heart-icon"][data-owner-instance="active"]',
        );
        if (!iconNode) return null;
        const iconStyle = getComputedStyle(iconNode);
        return {
          display: iconStyle.display,
          fontFamily: iconStyle.fontFamily,
          fontStyle: iconStyle.fontStyle,
          fontVariant: iconStyle.fontVariant,
          fontWeight: iconStyle.fontWeight,
          lineHeight: iconStyle.lineHeight,
          pseudoContent: getComputedStyle(iconNode, "::before").content,
          inlineStyle: iconNode.getAttribute("style"),
        };
      })(),
      itemFloat: itemStyle?.float ?? null,
      itemLineHeight: itemStyle?.lineHeight ?? null,
      itemMarginRight: itemStyle?.marginRight ?? null,
      itemMarginTop: itemStyle?.marginTop ?? null,
      listDisplay: listStyle?.display ?? null,
      listListStyle: listStyle?.listStyleType ?? null,
      listWrapDisplay: wrapStyle?.display ?? null,
      listWrapMarginLeft: wrapStyle?.marginLeft ?? null,
      listWrapMarginRight: wrapStyle?.marginRight ?? null,
      listWrapOverflow: wrapStyle?.overflow ?? null,
      listWrapVerticalAlign: wrapStyle?.verticalAlign ?? null,
      voteDirection: style.direction,
      voteDisplay: style.display,
      voteFontSize: style.fontSize,
      voteInlineStyle: node.getAttribute("style"),
      voteMarginRight: style.marginRight,
      voteVerticalAlign: style.verticalAlign,
      listBoxWidth: listBox?.width ?? 0,
      voteBoxWidth: voteBox.width,
    };
  });
  expect(metrics).toMatchObject({
    avatarMarginRight: "0px",
    boardActionDirectParent: expect.stringContaining("board-actrow"),
    boardActionContainsVote: true,
    heartColor: "rgb(221, 221, 221)",
    heartDisplay: "inline-block",
    heartFontSize: "17px",
    heartMarginRight: "2px",
    heartMarginTop: "3px",
    heartVerticalAlign: "middle",
    itemFloat: "left",
    itemLineHeight: "25px",
    itemMarginRight: "3px",
    itemMarginTop: "-4px",
    icon: {
      display: "inline-block",
      fontFamily: "yobicon",
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: "400",
      // CSSOM exposes the used pixel value for the unitless frozen line-height: 1 in both modes.
      lineHeight: "17px",
      inlineStyle: null,
    },
    listDisplay: "block",
    listListStyle: "none",
    listWrapDisplay: "inline-block",
    listWrapMarginRight: "5px",
    listWrapOverflow: "hidden",
    listWrapVerticalAlign: "middle",
    voteDirection: "rtl",
    // The route's flex action row blockifies this inline-block flex item at computed-style time.
    voteDisplay: "block",
    voteFontSize: "13px",
    voteInlineStyle: null,
    voteMarginRight: "-3px",
    voteVerticalAlign: "middle",
  });
  expect(metrics.icon?.pseudoContent).toContain(String.fromCodePoint(0xe4b0));
  expect(metrics.listWrapMarginLeft).toBe("3.9px");
  await expect(vote).not.toHaveAttribute("style", /./u);
  await expect(heart).not.toHaveAttribute("style", /./u);
  await expect(items.first()).not.toHaveAttribute("style", /./u);
  await expect(avatars.first()).not.toHaveAttribute("style", /./u);

  const geometry = await page.evaluate(() => {
    const voteBox = document.querySelector<HTMLElement>("#vote")?.getBoundingClientRect();
    const listBox = document
      .querySelector<HTMLElement>('#vote [data-owner="project-issue-detail-voter-list-wrap"]')
      ?.getBoundingClientRect();
    const avatarBoxes = Array.from(document.querySelectorAll<HTMLElement>("#vote .voter-list a"))
      .map((avatar) => avatar.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0);
    return {
      avatarCount: avatarBoxes.length,
      firstAvatarBeforeSecond: avatarBoxes[0]?.left < avatarBoxes[1]?.left,
      listContainedInVote: Boolean(
        voteBox && listBox && listBox.left >= voteBox.left && listBox.right <= voteBox.right,
      ),
      viewportWidth: window.innerWidth,
      voteHeight: voteBox?.height ?? 0,
      voteWidth: voteBox?.width ?? 0,
    };
  });
  expect(geometry.avatarCount).toBe(3);
  expect(geometry.firstAvatarBeforeSecond).toBe(true);
  expect(geometry.listContainedInVote).toBe(true);
  expect(geometry.voteWidth).toBeGreaterThan(0);
  expect(geometry.voteHeight).toBeGreaterThan(0);
  expect(geometry.viewportWidth).toBe(fallbackOff ? 390 : 1366);
});

test("project issue detail vote action posts and toggles legacy voted state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { issueVoteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const voteButton = page.locator("#vote > button").first();
  await expect(voteButton).toHaveAttribute("title", "Vote this issue");
  await expect(voteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await expect(voteButton).not.toHaveAttribute("data-request-method", /.+/);
  await expect(voteButton).not.toHaveClass(/ybtn-watching/);
  await expect(page.locator("#vote > a")).toHaveCount(0);

  const voteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/vote") &&
      response.request().method() === "POST",
  );
  await voteButton.click();
  await voteResponsePromise;

  expect(issueVoteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(voteButton).toHaveAttribute("title", "Unvote this issue");
  await expect(voteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await expect(voteButton).not.toHaveAttribute("data-request-method", /.+/);
  await expect(page.locator("#vote > button")).toHaveClass(/ybtn-watching/);
});

test("project issue detail vote action refreshes legacy voter list branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __issueVoteResponseOverrides: {
      issueVoters: [
        {
          avatarUrl: "/assets/images/default-avatar-32.png",
          emailAddress: "admin@example.com",
          loginId: "admin",
          userId: 1,
          userLabel: "Site Admin",
        },
      ],
      voterCount: 1,
    },
    issueVoters: [],
    voterCount: 0,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#vote")).not.toHaveClass(/voter-exists/);
  await expect(page.locator("#vote > .voter-list-wrap")).toHaveCount(0);
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(0);

  const voteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/vote") &&
      response.request().method() === "POST",
  );
  await page.locator("#vote > button").first().click();
  await voteResponsePromise;

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  await expect(page.locator("#vote")).toHaveClass(/voter-exists/);
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(1);
});

test("project issue detail renders current voter first like legacy partial_voters", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { issueDetailRequests } = await mockProjectIssueDetail(page, {
    hasVoted: true,
    issueVoters: [commentVoters()[1], commentVoters()[0], commentVoters()[2], commentVoters()[3]],
    voterCount: 4,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa2" class="avatar-wrap smaller" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  expect(await issueVoterAvatarOrderMetrics(page)).toEqual({
    firstHref: `${basePath}/admin`,
    firstLeftBeforeSecond: true,
    secondHref: `${basePath}/dev`,
  });
  expect(issueDetailRequests).toEqual([`GET ${basePath}/api/v1/projects/admin/sample/issues/11`]);
});

test("project issue detail overflows non-current voters after current plus three avatars", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    hasVoted: true,
    issueVoters: [
      commentVoters()[1],
      commentVoters()[0],
      commentVoters()[2],
      commentVoters()[3],
      commentVoters()[4],
    ],
    voterCount: 5,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa2" class="avatar-wrap smaller" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png"></a></li><li class="voter-list-item" data-html="true" title="QA Three &lt;br&gt;"><button type="button" data-toggle="modal" data-target="#voters">and 1 others</button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail does not invent current voter when voted payload omits current user", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    hasVoted: true,
    issueVoters: [commentVoters()[1], commentVoters()[2], commentVoters()[3], commentVoters()[4]],
    voterCount: 4,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa2" class="avatar-wrap smaller" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png"></a></li><li class="voter-list-item" data-html="true" title="QA Three &lt;br&gt;"><button type="button" data-toggle="modal" data-target="#voters">and 1 others</button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail renders legacy voter overflow link", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    issueVoters: commentVoters(),
    voterCount: 6,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li class="voter-list-item" data-html="true" title="QA Two &lt;br&gt;QA Three &lt;br&gt;QA Four &lt;br&gt;"><button type="button" data-toggle="modal" data-target="#voters">and 3 others</button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(page.locator('#vote a[href="#voters"][data-toggle="modal"]')).toHaveCount(0);
  await expect(
    page.locator('#vote [data-toggle="modal"], #vote [data-target="#voters"]'),
  ).toHaveCount(0);
  const trigger = page.locator('#vote button[type="button"]:has-text("and 3 others")');
  await expect(trigger).toHaveText("and 3 others");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-voters-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters")).toBeVisible();
  await expect(page.locator("#voters")).toHaveClass(/modal hide voters-dialog in/);
  await expect(page.locator("#voters")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  await installClipboardSpy(page);
  await expect(page.locator("#voters #copyEmailBtn")).toHaveText("Copy email list");
  await expect(page.locator("#voters #copyEmailBtn")).toHaveClass("ybtn ybtn-info ybtn-small");
  await expect(page.locator("#voters #copyEmailBtn")).not.toHaveAttribute(
    "data-clipboard-text",
    /.+/,
  );
  await page.locator("#voters #copyEmailBtn").click();
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

  await page.locator('#voters .modal-footer button:has-text("Close")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#voters")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.in").dispatchEvent("click");
  await expect(page.locator("#voters")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail owns the authenticated parent comment attachment float with Style", async ({
  page,
}) => {
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
  expect(legacyComment.split(/\r?\n/u)[112]).toContain(
    '<div class="attachments pull-left" data-attachments=',
  );
  expect(legacyBootstrap).toContain(".pull-left {\n  float: left;\n}");
  expect(legacyYobi).toContain('@import "less/_common.less";');

  expect(routeSource).toContain('data-owner="project-issue-detail-comment-attachments"');
  expect(styleSource).toMatch(
    /\[data-owner="project-issue-detail-comment-attachments"\]\s*\{[\s\S]*?float:\s*left/u,
  );

  await mockProjectIssueDetail(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);
  const emptyAttachments = page.locator(
    '#comment-77 > .media-body > #comment-body-77 > [data-owner="project-issue-detail-comment-attachments"]',
  );
  await expect(emptyAttachments).toHaveCount(1);
  await expect(emptyAttachments).toHaveClass(/(?:^|\s)attachments(?:\s|$)/u);
  await expect(emptyAttachments).not.toHaveClass(/(?:^|\s)pull-left(?:\s|$)/u);
  await expect(emptyAttachments).toHaveCSS("float", "left");
  await expect(emptyAttachments).not.toHaveAttribute("style", /.+/u);
  await expect(emptyAttachments.locator(".attach")).toHaveCount(0);
  await expect(page.locator("#attachments .attach")).toHaveCount(0);
  await expect(page.locator("#comment-editform-77 .attachment-files .attach")).toHaveCount(0);

  const emptyGeometry = await emptyAttachments.evaluate((element) => {
    const body = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return body
      ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          body: { bottom: body.bottom, left: body.left, right: body.right, top: body.top },
        }
      : null;
  });
  expect(emptyGeometry).not.toBeNull();
  expect(emptyGeometry!.left).toBeGreaterThanOrEqual(emptyGeometry!.body.left);
  expect(emptyGeometry!.right).toBeLessThanOrEqual(emptyGeometry!.body.right);
  expect(emptyGeometry!.top).toBeGreaterThanOrEqual(emptyGeometry!.body.top);
  expect(emptyGeometry!.bottom - emptyGeometry!.top).toBeGreaterThanOrEqual(0);
});

test("project issue detail preserves parent comment attachment DOM and download behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  const issueAttachments = {
    attachments: [
      {
        id: 501,
        mimeType: "text/plain",
        name: "issue-spec.txt",
        size: 12345,
        sizeLabel: "12.3 kB",
        url: `${basePath}/files/501`,
      },
    ],
  };
  const commentAttachments = {
    attachments: [
      {
        id: 502,
        mimeType: "image/png",
        name: "comment-shot.png",
        size: 4096,
        sizeLabel: "4.1 kB",
        url: `${basePath}/files/502`,
      },
    ],
  };
  await mockProjectIssueDetail(page, {
    attachments: issueAttachments,
    comments: [
      {
        attachments: commentAttachments,
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
        voterCount: 0,
        voters: [],
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane > #attachments > ul.attaches.wm")).toHaveCount(1);
  await expect(
    page.locator(".span-left-pane > #attachments > ul.attaches.wm > li.attach"),
  ).toHaveCount(1);
  await expect(page.locator(".span-left-pane > #attachments > .attached-file")).toHaveCount(0);

  const expectedIssueAttachments =
    `<div class="attachments" id="attachments" data-attachments='${JSON.stringify(issueAttachments)}'><ul class="attaches wm"><li class="attach"><a href="__BASE_PATH__/files/501?action=download" class="download ybtn ybtn-mini" title="Download a file issue-spec.txt"><i class="yobicon-download"></i></a><a href="__BASE_PATH__/files/501" class="vmiddle" target="_blank"><i class="yobicon-paperclip"></i><span class="filename">issue-spec.txt</span><span class="filesize">(12.3 kB)</span></a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > #attachments")).toEqual(
    await canonicalizeHtml(page, expectedIssueAttachments),
  );

  await expect(page.locator("#comment-body-77 > .attachments > ul.attaches.wm")).toHaveCount(1);
  await expect(
    page.locator("#comment-body-77 > .attachments > ul.attaches.wm > li.attach"),
  ).toHaveCount(1);
  await expect(page.locator("#comment-body-77 > .attachments > .attached-file")).toHaveCount(0);
  const commentAttachmentsOwner = page.locator(
    '#comment-77 > .media-body > #comment-body-77 > [data-owner="project-issue-detail-comment-attachments"]',
  );
  await expect(commentAttachmentsOwner).toHaveCount(1);
  await expect(commentAttachmentsOwner).toHaveClass(/(?:^|\s)attachments(?:\s|$)/u);
  await expect(commentAttachmentsOwner).not.toHaveClass(/(?:^|\s)pull-left(?:\s|$)/u);
  await expect(commentAttachmentsOwner).toHaveAttribute(
    "data-attachments",
    JSON.stringify(commentAttachments),
  );
  await expect(commentAttachmentsOwner).toHaveCSS("float", "left");
  await expect(commentAttachmentsOwner).not.toHaveAttribute("style", /.+/u);
  await expect(commentAttachmentsOwner.locator(":scope > ul.attaches.wm > li.attach")).toHaveCount(
    1,
  );
  await expect(
    commentAttachmentsOwner.locator(":scope > ul.attaches.wm > li.attach .filename"),
  ).toHaveText("comment-shot.png");
  await expect(
    commentAttachmentsOwner.locator('a.download[title="Download a file comment-shot.png"]'),
  ).toHaveAttribute("href", `${basePath}/files/502?action=download`);
  await expect(page.locator("#attachments .attach")).toHaveCount(1);
  await expect(page.locator("#comment-editform-77 .attachment-files .attach")).toHaveCount(0);
  const attachmentOrder = await commentAttachmentsOwner
    .locator(":scope > *")
    .evaluateAll((nodes) => nodes.map((node) => node.tagName.toLowerCase()));
  expect(attachmentOrder).toEqual(["ul"]);

  const desktopAttachmentGeometry = await commentAttachmentsOwner.evaluate((element) => {
    const body = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return body
      ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          body: { bottom: body.bottom, left: body.left, right: body.right, top: body.top },
        }
      : null;
  });
  expect(desktopAttachmentGeometry).not.toBeNull();
  expect(desktopAttachmentGeometry!.left).toBeGreaterThanOrEqual(
    desktopAttachmentGeometry!.body.left,
  );
  expect(desktopAttachmentGeometry!.right).toBeLessThanOrEqual(
    desktopAttachmentGeometry!.body.right,
  );
  expect(desktopAttachmentGeometry!.right - desktopAttachmentGeometry!.left).toBeGreaterThan(0);
  expect(desktopAttachmentGeometry!.bottom - desktopAttachmentGeometry!.top).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(commentAttachmentsOwner).toHaveCSS("float", "left");
  const mobileAttachmentGeometry = await commentAttachmentsOwner.evaluate((element) => {
    const body = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return body
      ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          body: { bottom: body.bottom, left: body.left, right: body.right, top: body.top },
        }
      : null;
  });
  expect(mobileAttachmentGeometry).not.toBeNull();
  expect(mobileAttachmentGeometry!.left).toBeGreaterThanOrEqual(
    mobileAttachmentGeometry!.body.left,
  );
  expect(mobileAttachmentGeometry!.right).toBeLessThanOrEqual(mobileAttachmentGeometry!.body.right);
  expect(mobileAttachmentGeometry!.top).toBeGreaterThanOrEqual(mobileAttachmentGeometry!.body.top);
  expect(mobileAttachmentGeometry!.right - mobileAttachmentGeometry!.left).toBeGreaterThan(0);
  expect(mobileAttachmentGeometry!.bottom - mobileAttachmentGeometry!.top).toBeGreaterThan(0);

  const expectedCommentAttachments =
    `<ul class="attaches wm"><li class="attach"><a href="__BASE_PATH__/files/502?action=download" class="download ybtn ybtn-mini" title="Download a file comment-shot.png"><i class="yobicon-download"></i></a><a href="__BASE_PATH__/files/502" class="vmiddle" target="_blank"><i class="yobicon-paperclip"></i><span class="filename">comment-shot.png</span><span class="filesize">(4.1 kB)</span></a></li></ul>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#comment-body-77 > .attachments > ul")).toEqual(
    await canonicalizeHtml(page, expectedCommentAttachments),
  );

  await expect(page.locator(".attached-file-marker[data-href]")).toHaveCount(0);
  const expectedCommentUpdateAttachments = `<div class="attachment-files"><div class="attached-file attached-file-marker" data-name="comment-shot.png" data-mime="image/png"><i class="mimetype"></i><strong class="name">comment-shot.png</strong><span class="size">4.1 kB</span><button type="button" class="btn-transparent btn-delete">×</button></div></div>`;
  expect(await canonicalize(page, "#comment-editform-77 > form .attachment-files")).toEqual(
    await canonicalizeHtml(page, expectedCommentUpdateAttachments),
  );
  const updateAttachment = page.locator(
    '#comment-editform-77 > form .attached-file-marker[data-name="comment-shot.png"]',
  );
  await expect(updateAttachment.locator(".name")).toHaveText("comment-shot.png");
  await expect(updateAttachment.locator(".btn-delete")).not.toHaveAttribute("data-id");
  await expect(updateAttachment.locator(".btn-delete")).toHaveAttribute("type", "button");
  expect(
    consoleErrors.some(
      (message) =>
        message.includes("<li> cannot be a descendant of <li>") ||
        message.includes("<li> cannot contain a nested <li>"),
    ),
  ).toBe(false);
});
