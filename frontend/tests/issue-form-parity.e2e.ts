import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

async function assertLegacyIssueCreateFormShellMetrics(page: Page) {
  const pageWrapOuter = await layoutBox(page, ".page-wrap-outer");
  const projectPageWrap = await layoutBox(page, ".page-wrap-outer .project-page-wrap");
  const contentWrap = await layoutBox(page, ".page-wrap-outer .content-wrap.frm-wrap");
  const form = await layoutBox(page, "#issue-form");
  const titleRow = await layoutBox(page, "#issue-form > .row-fluid > .span12");
  const titleDl = await layoutBox(page, "#issue-form > .row-fluid > .span12 > dl");
  const titleDd = await layoutBox(page, "#issue-form > .row-fluid > .span12 > dl > dd");
  const titleSpan = await layoutBox(page, "#issue-form .span12 .span11");
  const titleInput = await layoutBox(page, "#title.text.title");
  const optionToggle = await layoutBox(page, "#issue-form .subtask-message");
  const subtaskWrap = await layoutBox(page, "#issue-form .subtask-wrap.show");
  const bodyRow = await layoutBox(page, "#issue-form > .row-fluid > .row-fluid");
  const leftPane = await layoutBox(page, "#issue-form .span9.span-left-pane");
  const rightMenu = await layoutBox(page, "#issue-form .span3.span-hard-wrap.right-menu");
  const editorDl = await layoutBox(page, "#issue-form .span-left-pane > dl");
  const editorShell = await layoutBox(page, '#issue-form [data-toggle="markdown-editor"]');
  const editorTextarea = await layoutBox(page, "#editor-body-content-body");
  const uploader = await layoutBox(page, "#issue-form #upload.upload-wrap");
  const actionRow = await layoutBox(page, "#issue-form .actrow.right-txt");
  const saveButton = await layoutBox(page, "#button-save");
  const draftButton = await layoutBox(page, "#draft-save-btn");
  const cancelButton = await layoutBox(
    page,
    '#issue-form .actrow a[data-legacy-href="history.back"]',
  );
  const assigneeOption = await layoutBox(
    page,
    "#issue-form .right-menu > dl.issue-option:nth-of-type(1)",
  );
  const milestoneOption = await layoutBox(page, "#issue-form #milestoneOption.issue-option");
  const dueDateOption = await layoutBox(page, "#issueDueDate");
  const labelOption = await layoutBox(
    page,
    "#issue-form .right-menu > dl.issue-option:has(#labelIds)",
  );
  const rightMenuStyles = await page.locator("#issue-form .right-menu").evaluate((element) => {
    const issueOption = element.querySelector("dl.issue-option") as HTMLElement;
    const dt = issueOption.querySelector("dt") as HTMLElement;
    const dd = issueOption.querySelector("dd") as HTMLElement;
    const searchBar = element.querySelector(".search.search-bar") as HTMLElement;
    const calendarButton = element.querySelector(".btn-calendar") as HTMLElement;
    return {
      calendarDisplay: window.getComputedStyle(calendarButton).display,
      ddDisplay: window.getComputedStyle(dd).display,
      dlDisplay: window.getComputedStyle(issueOption).display,
      dtDisplay: window.getComputedStyle(dt).display,
      menuFloat: window.getComputedStyle(element).float,
      searchBarDisplay: window.getComputedStyle(searchBar).display,
    };
  });

  await expect(page.locator("#issue-form")).toHaveAttribute("enctype", "multipart/form-data");
  await expect(page.locator("#title")).toHaveAttribute("maxlength", "250");
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await expect(page.locator("#title")).toHaveAttribute(
    "title",
    "press 'Tab' or 'Enter' to move cursor to content area",
  );
  await expect(page.locator("#editor-body-content-body")).toHaveAttribute("name", "body");
  await expect(page.locator("#editor-body-content-body")).toHaveAttribute(
    "data-editor-mode",
    "content-body",
  );
  await expect(page.locator("#editor-body-content-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator("#draft-save-btn")).toHaveAttribute("data-placement", "top");
  await expect(page.locator('input[name="referCommentId"]')).toHaveValue("55");
  await expect(page.locator("#isDraft")).toHaveValue("false");

  expect(projectPageWrap.y).toBeGreaterThanOrEqual(pageWrapOuter.y);
  expect(projectPageWrap.width).toBeLessThanOrEqual(pageWrapOuter.width + 1);
  expect(contentWrap.x).toBeGreaterThanOrEqual(projectPageWrap.x);
  expect(contentWrap.y).toBeGreaterThanOrEqual(projectPageWrap.y);
  expect(form.x).toBeGreaterThanOrEqual(contentWrap.x);
  expect(form.width).toBeLessThanOrEqual(contentWrap.width + 1);
  expect(titleRow.y).toBeGreaterThanOrEqual(form.y);
  expect(titleDl.x).toBeGreaterThanOrEqual(titleRow.x);
  expect(titleDd.y).toBeGreaterThanOrEqual(titleDl.y);
  expect(titleSpan.x).toBeGreaterThanOrEqual(titleDd.x);
  expect(titleInput.x).toBeGreaterThanOrEqual(titleSpan.x);
  expect(titleInput.width).toBeLessThanOrEqual(titleSpan.width + 1);
  expect(optionToggle.x).toBeGreaterThan(titleInput.x + titleInput.width - 1);
  expect(subtaskWrap.x).toBeGreaterThanOrEqual(titleDd.x);
  expect(subtaskWrap.y).toBeGreaterThanOrEqual(titleDd.y);
  expect(leftPane.x).toBeGreaterThanOrEqual(bodyRow.x);
  expect(rightMenu.x).toBeGreaterThan(leftPane.x + leftPane.width - 1);
  expect(rightMenu.width).toBeLessThan(leftPane.width);
  expect(Math.abs(rightMenu.y - leftPane.y)).toBeLessThanOrEqual(2);
  expect(editorDl.y).toBeGreaterThanOrEqual(leftPane.y);
  expect(editorShell.y).toBeGreaterThanOrEqual(editorDl.y);
  expect(editorTextarea.x).toBeGreaterThanOrEqual(editorShell.x);
  expect(editorTextarea.width).toBeLessThanOrEqual(editorShell.width + 1);
  expect(uploader.y).toBeGreaterThan(editorShell.y + editorShell.height - 1);
  expect(actionRow.y).toBeGreaterThan(uploader.y + uploader.height - 1);
  expect(saveButton.x).toBeGreaterThanOrEqual(actionRow.x);
  expect(draftButton.x).toBeGreaterThan(saveButton.x + saveButton.width - 1);
  expect(cancelButton.x).toBeGreaterThan(draftButton.x + draftButton.width - 1);
  expect(assigneeOption.y).toBeGreaterThanOrEqual(rightMenu.y);
  expect(milestoneOption.y).toBeGreaterThan(assigneeOption.y + assigneeOption.height - 1);
  expect(dueDateOption.y).toBeGreaterThan(milestoneOption.y);
  expect(labelOption.y).toBeGreaterThan(dueDateOption.y);
  expect(rightMenuStyles).toEqual({
    calendarDisplay: "inline-block",
    ddDisplay: "block",
    dlDisplay: "block",
    dtDisplay: "block",
    menuFloat: "left",
    searchBarDisplay: "block",
  });
}

async function assertLegacyIssueEditFormShellMetrics(page: Page) {
  const pageWrapOuter = await layoutBox(page, ".page-wrap-outer");
  const projectPageWrap = await layoutBox(page, ".page-wrap-outer .project-page-wrap");
  const contentWrap = await layoutBox(page, ".page-wrap-outer .content-wrap.frm-wrap");
  const form = await layoutBox(page, "#issue-form");
  const issueNumberLabel = await layoutBox(page, '#issue-form label[for="title"] .secondary-txt');
  const titleDd = await layoutBox(page, "#issue-form > .row-fluid > .span12 > dl > dd");
  const titleInput = await layoutBox(page, "#title.text.title");
  const optionToggle = await layoutBox(page, "#issue-form .subtask-message");
  const subtaskWrap = await layoutBox(page, "#issue-form .subtask-wrap.show");
  const bodyRow = await layoutBox(page, "#issue-form > .row-fluid > .row-fluid");
  const leftPane = await layoutBox(page, "#issue-form .span9.span-left-pane");
  const rightMenu = await layoutBox(page, "#issue-form .span3.span-hard-wrap.right-menu");
  const editorShell = await layoutBox(page, '#issue-form [data-toggle="markdown-editor"]');
  const editorTextarea = await layoutBox(page, "#editor-body-content-body");
  const uploader = await layoutBox(page, "#issue-form #upload.upload-wrap");
  const actionRow = await layoutBox(page, "#issue-form .actrow.right-txt");
  const notificationCheck = await layoutBox(page, "#issue-form .send-notification-check");
  const saveButton = await layoutBox(page, "#button-save");
  const cancelButton = await layoutBox(
    page,
    '#issue-form .actrow a[data-legacy-href="history.back"]',
  );
  const stateOption = await layoutBox(
    page,
    "#issue-form .right-menu > dl.issue-option:nth-of-type(1)",
  );
  const stateDropdown = await layoutBox(page, "#state.btn-group.auto");
  const assigneeOption = await layoutBox(
    page,
    "#issue-form .right-menu > dl.issue-option:nth-of-type(2)",
  );
  const milestoneOption = await layoutBox(page, "#issue-form #milestoneOption.issue-option");
  const dueDateOption = await layoutBox(page, "#issueDueDate");
  const labelOption = await layoutBox(
    page,
    "#issue-form .right-menu > dl.issue-option:has(#labelIds)",
  );
  const editStyles = await page.locator("#issue-form").evaluate((element) => {
    const state = element.querySelector("#state") as HTMLElement;
    const dropdownButton = state.querySelector("button") as HTMLElement;
    const dropdownMenu = state.querySelector(".dropdown-menu") as HTMLElement;
    const notification = element.querySelector(".send-notification-check") as HTMLElement;
    const actionRow = element.querySelector(".actrow") as HTMLElement;
    return {
      actionTextAlign: window.getComputedStyle(actionRow).textAlign,
      dropdownButtonDisplay: window.getComputedStyle(dropdownButton).display,
      dropdownMenuDisplay: window.getComputedStyle(dropdownMenu).display,
      notificationDisplay: window.getComputedStyle(notification).display,
      stateDisplay: window.getComputedStyle(state).display,
    };
  });

  await expect(page.locator("#issue-form")).toHaveAttribute("enctype", "multipart/form-data");
  await expect(page.locator('input[name="authorId"]')).toHaveValue("1");
  await expect(page.locator("#isDraft")).toHaveValue("false");
  await expect(page.locator("#isPublish")).toHaveValue("false");
  await expect(page.locator('#issue-form label[for="title"] .secondary-txt')).toHaveText("#17");
  await expect(page.locator("#title")).toHaveAttribute("maxlength", "250");
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await expect(page.locator("#editor-body-content-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator("#editor-body-content-body")).toHaveAttribute(
    "data-editor-mode",
    "content-body",
  );
  await expect(page.locator("#state")).toHaveAttribute("data-name", "state");
  await expect(page.locator('#state li[data-value="CLOSED"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.locator("#notificationMail")).toHaveAttribute("name", "notificationMail");
  await expect(page.locator("#notificationMail")).toHaveAttribute("value", "yes");
  await expect(page.locator("#button-draft-publish")).toHaveCount(0);
  await expect(page.locator("#draft-save-btn")).toHaveCount(0);

  expect(projectPageWrap.y).toBeGreaterThanOrEqual(pageWrapOuter.y);
  expect(projectPageWrap.width).toBeLessThanOrEqual(pageWrapOuter.width + 1);
  expect(contentWrap.x).toBeGreaterThanOrEqual(projectPageWrap.x);
  expect(form.x).toBeGreaterThanOrEqual(contentWrap.x);
  expect(form.width).toBeLessThanOrEqual(contentWrap.width + 1);
  expect(issueNumberLabel.x).toBeGreaterThanOrEqual(form.x);
  expect(titleInput.y).toBeGreaterThanOrEqual(issueNumberLabel.y + issueNumberLabel.height - 1);
  expect(optionToggle.x).toBeGreaterThan(titleInput.x + titleInput.width - 1);
  expect(subtaskWrap.x).toBeGreaterThanOrEqual(titleDd.x);
  expect(subtaskWrap.y).toBeGreaterThanOrEqual(titleDd.y);
  expect(leftPane.x).toBeGreaterThanOrEqual(bodyRow.x);
  expect(rightMenu.x).toBeGreaterThan(leftPane.x + leftPane.width - 1);
  expect(rightMenu.width).toBeLessThan(leftPane.width);
  expect(Math.abs(rightMenu.y - leftPane.y)).toBeLessThanOrEqual(2);
  expect(editorShell.y).toBeGreaterThanOrEqual(leftPane.y);
  expect(editorTextarea.x).toBeGreaterThanOrEqual(editorShell.x);
  expect(editorTextarea.width).toBeLessThanOrEqual(editorShell.width + 1);
  expect(uploader.y).toBeGreaterThan(editorShell.y + editorShell.height - 1);
  expect(actionRow.y).toBeGreaterThan(uploader.y + uploader.height - 1);
  expect(notificationCheck.x).toBeGreaterThanOrEqual(actionRow.x);
  expect(saveButton.x).toBeGreaterThan(notificationCheck.x + notificationCheck.width - 1);
  expect(cancelButton.x).toBeGreaterThan(saveButton.x + saveButton.width - 1);
  expect(stateOption.y).toBeGreaterThanOrEqual(rightMenu.y);
  expect(stateDropdown.x).toBeGreaterThanOrEqual(stateOption.x);
  expect(assigneeOption.y).toBeGreaterThan(stateOption.y + stateOption.height - 1);
  expect(milestoneOption.y).toBeGreaterThan(assigneeOption.y + assigneeOption.height - 1);
  expect(dueDateOption.y).toBeGreaterThan(milestoneOption.y);
  expect(labelOption.y).toBeGreaterThan(dueDateOption.y);
  expect(editStyles).toEqual({
    actionTextAlign: "right",
    dropdownButtonDisplay: "inline-block",
    dropdownMenuDisplay: "none",
    notificationDisplay: "block",
    stateDisplay: "block",
  });
}

const projectContainer = {
  cloneUrl: "https://example.com/admin/projectYobi.git",
  dashboard: {
    labels: [
      {
        categoryId: 4,
        categoryIsExclusive: false,
        categoryName: "Type",
        color: "#f44336",
        id: 5,
        name: "bug",
        openIssueCount: 1,
      },
    ],
  },
  enrollmentRequested: false,
  isFavorited: false,
  isWatching: false,
  logoUrl: "",
  memberCount: 1,
  members: [],
  openIssueCount: 2,
  openPullRequestCount: 0,
  organizationName: "",
  overview: "Issue form parity",
  ownerName: "admin",
  projectId: 101,
  projectName: "projectYobi",
  projectScope: "public",
  reviewCount: 0,
  showAdmin: true,
  showBoard: true,
  showCode: true,
  showIssue: true,
  showMilestone: true,
  showPullRequest: true,
  showReview: true,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
  viewerCanWatch: true,
  watchCount: 1,
};

const milestones = [
  {
    closedIssueCount: 0,
    completionPercent: 0,
    contentsHtml: "",
    contentsMarkdown: "",
    dueDateLabel: "2026-07-01",
    id: "7",
    openIssueCount: 1,
    state: "open",
    title: "Next",
    viewerCanDelete: true,
    viewerCanUpdate: true,
    attachments: [],
    closedIssues: [],
    openIssues: [],
  },
  {
    closedIssueCount: 1,
    completionPercent: 100,
    contentsHtml: "",
    contentsMarkdown: "",
    dueDateLabel: "2026-06-01",
    id: "8",
    openIssueCount: 0,
    state: "closed",
    title: "Done",
    viewerCanDelete: true,
    viewerCanUpdate: true,
    attachments: [],
    closedIssues: [],
    openIssues: [],
  },
];

const parentOptions = {
  items: [
    { id: "31", issueNumber: "31", selected: false, title: "Parent issue" },
    { id: "32", issueNumber: "32", selected: false, title: "Other issue" },
  ],
};

function issueDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    assigneeAvatarUrl: "",
    assigneeLabel: "Nori",
    assigneeLoginId: "nori",
    attachments: [],
    authorAvatarUrl: "",
    authorId: "1",
    authorLabel: "Admin",
    authorLoginId: "admin",
    bodyMarkdown: "Existing body",
    childClosedCount: 0,
    childIssues: [],
    childOpenCount: 0,
    commentCount: 0,
    comments: [],
    createdLabel: "just now",
    dueDateLabel: "2026-07-03",
    hasVoted: false,
    historyMarkdown: "",
    isDraft: false,
    isFavorited: false,
    isWatching: false,
    issueId: "170",
    issueNumber: "17",
    issueReferences: [],
    issueVoters: [],
    labels: [{ color: "#f44336", id: "5", name: "bug" }],
    mentionReferences: [],
    milestoneId: "8",
    milestoneTitle: "Done",
    ownerName: "admin",
    parentIssueId: "31",
    parentIssueNumber: "31",
    parentIssueState: "open",
    parentIssueTitle: "Parent issue",
    projectName: "projectYobi",
    sharers: [],
    state: "closed",
    timeline: [],
    title: "Existing issue",
    viewerCanComment: true,
    viewerCanDelete: true,
    viewerCanManageSharers: true,
    viewerCanUpdate: true,
    viewerHasInheritedShare: false,
    viewerIsDirectSharer: false,
    voterCount: 0,
    watcherCount: 0,
    weight: 0,
    ...overrides,
  };
}

async function installRuntime(page: Page) {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "admin" },
        user: { isSiteAdmin: true, loginId: "admin" },
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Admin",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        daysAgo: 0,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainer),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/milestones?*"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({ milestones }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/projects/admin/projectYobi/issues/parent-options?*"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(parentOptions),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/projects/admin/projectYobi/issues/parent-options"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(parentOptions),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
}

test.beforeEach(async ({ page }) => {
  await installRuntime(page);
});

test("project issue create form validates, submits REST JSON, and redirects to detail", async ({
  page,
}) => {
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  await page.route(apiV1Route("/projects/admin/projectYobi/issues"), async (route) => {
    const request = route.request();
    requests.push({
      body: request.postDataJSON(),
      method: request.method(),
      path: new URL(request.url()).pathname.replace("/yona/api/v1", ""),
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.fulfill({
      body: JSON.stringify(issueDetail({ issueNumber: "22", title: "Created issue" })),
      headers: restJsonHeaders,
      status: 201,
    });
  });
  await page.route(apiV1Route("/projects/admin/projectYobi/issues/22"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(issueDetail({ issueNumber: "22", title: "Created issue" })),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/admin/projectYobi/issueform?parentIssueId=31&commentId=55");

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".content-wrap.frm-wrap")).toBeVisible();
  await expect(page.locator("#issue-form")).toBeVisible();
  await assertLegacyIssueCreateFormShellMetrics(page);
  await expect(page.locator("#targetProjectId")).toBeVisible();
  await expect(page.locator("#targetProjectId")).toHaveAttribute("name", "targetProjectId");
  await expect(page.locator("#targetProjectId")).toHaveAttribute("data-format", "projects");
  await expect(page.locator("#targetProjectId")).toHaveAttribute(
    "data-placeholder",
    "Choose projects",
  );
  await expect(page.locator("#targetProjectId")).toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#targetProjectId")).toHaveAttribute(
    "data-container-css-class",
    "fullsize",
  );
  await expect(page.locator('#targetProjectId option[value="101"]')).toHaveText("projectYobi");
  await expect(page.locator('#targetProjectId option[value="101"]')).toHaveAttribute(
    "data-avatar-url",
    "",
  );
  await expect(page.locator("#parentId")).toHaveValue("31");
  await expect(page.locator("#parentId")).toHaveAttribute("name", "parentIssueId");
  await expect(page.locator("#parentId")).toHaveAttribute("data-format", "issues");
  await expect(page.locator("#parentId")).toHaveAttribute("data-placeholder", "Choose projects");
  await expect(page.locator("#parentId")).toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#parentId")).toHaveAttribute("data-container-css-class", "fullsize");
  await expect(page.locator('#parentId option[value=""]')).toHaveText(
    "??? Select parent issue ???",
  );
  await expect(page.locator('#parentId option[value="31"]')).toHaveText("#31. Parent issue");
  await expect(page.locator('input[name="referCommentId"]')).toHaveValue("55");
  await expect(page.locator('#milestoneId option[value="7"]')).toHaveText("Next");
  await expect(page.locator('#milestoneId option[value="8"]')).toHaveCount(0);
  await expect(page.locator('#labelIds option[value="5"]')).toHaveText("bug");
  const titleInput = await layoutBox(page, "#title");
  const subtaskMessage = await layoutBox(page, ".frm-wrap .subtask-message");
  const subtaskWrap = await layoutBox(page, ".frm-wrap .subtask-wrap.show");
  const targetProjectColumn = await layoutBox(page, ".frm-wrap .subtask-wrap.show > .span3");
  const parentIssueColumn = await layoutBox(page, ".frm-wrap .subtask-wrap.show > .span6");
  const targetProjectSelect = await layoutBox(page, "#targetProjectId");
  const parentIssueSelect = await layoutBox(page, "#parentId");
  const subtaskStyles = await page.locator(".frm-wrap .subtask-wrap.show").evaluate((wrap) => {
    const message = document.querySelector(".frm-wrap .subtask-message") as HTMLElement;
    const targetProject = wrap.querySelector("#targetProjectId") as HTMLElement;
    const parentIssue = wrap.querySelector("#parentId") as HTMLElement;
    const wrapStyle = window.getComputedStyle(wrap);
    const messageStyle = window.getComputedStyle(message);
    const targetStyle = window.getComputedStyle(targetProject);
    const parentStyle = window.getComputedStyle(parentIssue);
    return {
      messageBorderColor: messageStyle.borderColor,
      messageColor: messageStyle.color,
      messageFontSize: messageStyle.fontSize,
      messageLineHeight: messageStyle.lineHeight,
      messageMarginTop: messageStyle.marginTop,
      messageMaxWidth: messageStyle.maxWidth,
      messageOverflow: messageStyle.overflow,
      messagePaddingBottom: messageStyle.paddingBottom,
      messagePaddingTop: messageStyle.paddingTop,
      messageTextAlign: messageStyle.textAlign,
      messageTextOverflow: messageStyle.textOverflow,
      messageWhiteSpace: messageStyle.whiteSpace,
      parentDisplay: parentStyle.display,
      targetDisplay: targetStyle.display,
      wrapDisplay: wrapStyle.display,
    };
  });

  expect(subtaskMessage.y).toBeGreaterThanOrEqual(titleInput.y - 1);
  expect(subtaskMessage.x).toBeGreaterThan(titleInput.x + titleInput.width - 1);
  expect(subtaskWrap.y).toBeLessThanOrEqual(titleInput.y + titleInput.height);
  expect(targetProjectColumn.x).toBeGreaterThanOrEqual(subtaskWrap.x);
  expect(parentIssueColumn.x).toBeGreaterThan(
    targetProjectColumn.x + targetProjectColumn.width - 1,
  );
  expect(targetProjectSelect.x).toBeGreaterThanOrEqual(targetProjectColumn.x);
  expect(targetProjectSelect.y).toBeGreaterThan(titleInput.y + titleInput.height - 1);
  expect(parentIssueSelect.x).toBeGreaterThanOrEqual(parentIssueColumn.x);
  expect(parentIssueSelect.y).toBeGreaterThan(titleInput.y + titleInput.height - 1);
  expect(parentIssueSelect.width).toBeGreaterThan(targetProjectSelect.width);
  expect(subtaskStyles).toEqual({
    messageBorderColor: "rgb(221, 221, 221)",
    messageColor: "rgb(158, 158, 158)",
    messageFontSize: "12px",
    messageLineHeight: "15px",
    messageMarginTop: "14px",
    messageMaxWidth: "80px",
    messageOverflow: "hidden",
    messagePaddingBottom: "5px",
    messagePaddingTop: "7px",
    messageTextAlign: "center",
    messageTextOverflow: "ellipsis",
    messageWhiteSpace: "nowrap",
    parentDisplay: "inline-block",
    targetDisplay: "inline-block",
    wrapDisplay: "block",
  });

  await page.locator("#button-save").click();
  await expect(page.getByRole("alert")).toHaveText("Issue title is a required field.");
  await expect(page.locator("#button-save")).toBeDisabled();
  expect(requests).toEqual([]);

  await page.locator("#title").fill("Created issue");
  await page.locator("#editor-body-content-body").fill("Created body");
  await page.locator("#assignee").fill("nori");
  await page.locator("#issueDueDate").fill("2026-07-04");
  await page.locator("#milestoneId").selectOption("7");
  await page.locator('.issue-labels-fallback input[name="labelIds"][value="5"]').check();
  await page.locator("#draft-save-btn").click();
  await expect(page.locator("#draft-save-btn")).toBeDisabled();
  await expect(page.locator("#isDraft")).toHaveValue("true");

  await expect
    .poll(() => requests.some((request) => request.path === "/projects/admin/projectYobi/issues"))
    .toBe(true);
  expect(requests.at(-1)).toEqual({
    body: {
      assigneeLoginId: "nori",
      attachmentIds: [],
      bodyMarkdown: "Created body",
      dueDate: "2026-07-04",
      isDraft: true,
      isPublish: false,
      labelIds: ["5"],
      milestoneId: "7",
      parentIssueId: "31",
      referCommentId: "55",
      title: "Created issue",
    },
    method: "POST",
    path: "/projects/admin/projectYobi/issues",
  });
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/issue\/22$/);
  await expect(page.locator("body")).toContainText("Created issue");
});

test("project issue edit form validates due date and submits updated REST JSON", async ({
  page,
}) => {
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  let currentIssue = issueDetail();
  await page.route(apiV1Route("/projects/admin/projectYobi/issues/17"), async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      requests.push({
        body: request.postDataJSON(),
        method: request.method(),
        path: new URL(request.url()).pathname.replace("/yona/api/v1", ""),
      });
      currentIssue = issueDetail({
        bodyMarkdown: "Updated body",
        dueDateLabel: "2026-07-05",
        milestoneId: "7",
        milestoneTitle: "Next",
        state: "closed",
        title: "Updated issue",
      });
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/admin/projectYobi/issue/17/editform");

  await assertLegacyIssueEditFormShellMetrics(page);
  await expect(page.locator('input[name="authorId"]')).toHaveValue("1");
  await expect(page.locator("#isDraft")).toHaveValue("false");
  await expect(page.locator("#isPublish")).toHaveValue("false");
  await expect(page.locator('#state li[data-value="CLOSED"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.locator("#notificationMail")).toBeChecked();
  await expect(page.locator("#title")).toHaveValue("Existing issue");
  await expect(page.locator("#editor-body-content-body")).toHaveValue("Existing body");
  await expect(page.locator("#issueDueDate")).toHaveValue("2026-07-03");
  await expect(page.locator('#milestoneId optgroup[label="Open"] option[value="7"]')).toHaveText(
    "Next",
  );
  await expect(page.locator('#milestoneId optgroup[label="Closed"] option[value="8"]')).toHaveText(
    "Done",
  );
  await expect(
    page.locator('.issue-labels-fallback input[name="labelIds"][value="5"]'),
  ).toBeChecked();

  await page.locator("#issueDueDate").fill("not-a-date");
  await page.locator("#button-save").click();
  await expect(page.getByRole("alert")).toHaveText("Issue due date is not valid date type.");
  expect(requests).toEqual([]);

  await page.locator("#title").fill("Updated issue");
  await page.locator("#editor-body-content-body").fill("Updated body");
  await page.locator("#assignee").fill("nori");
  await page.locator("#issueDueDate").fill("2026-07-05");
  await page.locator("#milestoneId").selectOption("7");
  await page.locator("#parentId").selectOption("31");
  await page.locator("#button-save").click();

  await expect
    .poll(() =>
      requests.some((request) => request.path === "/projects/admin/projectYobi/issues/17"),
    )
    .toBe(true);
  expect(requests.at(-1)).toEqual({
    body: {
      assigneeLoginId: "nori",
      attachmentIds: [],
      bodyMarkdown: "Updated body",
      dueDate: "2026-07-05",
      isDraft: false,
      isPublish: false,
      labelIds: ["5"],
      milestoneId: "7",
      parentIssueId: "31",
      title: "Updated issue",
    },
    method: "PUT",
    path: "/projects/admin/projectYobi/issues/17",
  });
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/issue\/17$/);
  await expect(page.locator("body")).toContainText("Updated issue");
});
