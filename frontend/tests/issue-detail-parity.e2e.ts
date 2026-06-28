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
      {
        categoryId: 4,
        categoryIsExclusive: false,
        categoryName: "Type",
        color: "#2196f3",
        id: 6,
        name: "feature",
        openIssueCount: 0,
      },
    ],
  },
  enrollmentRequested: false,
  isFavorited: false,
  isWatching: false,
  logoUrl: "",
  memberCount: 1,
  members: [],
  openIssueCount: 1,
  openPullRequestCount: 0,
  organizationName: "",
  overview: "Issue detail parity",
  ownerName: "admin",
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
    bodyMarkdown: "Issue body",
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
    issueId: "101",
    issueNumber: "1",
    issueReferences: [],
    issueVoters: [],
    labels: [{ color: "#f44336", id: "5", name: "bug" }],
    mentionReferences: [],
    milestoneId: "7",
    milestoneTitle: "Next",
    ownerName: "admin",
    parentIssueId: null,
    parentIssueNumber: null,
    parentIssueState: "",
    parentIssueTitle: "",
    projectName: "projectYobi",
    sharers: [],
    state: "open",
    timeline: [],
    title: "Pilot issue",
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
}

test.beforeEach(async ({ page }) => {
  await installRuntime(page);
});

test("issue detail actions, metadata sidebar, and delete modal mutate through REST", async ({
  page,
}) => {
  let currentIssue = issueDetail({
    timeline: [
      {
        createdLabel: "1 minute ago",
        eventType: "ISSUE_STATE_CHANGED",
        id: 17,
        kind: "event",
        newValue: "closed",
        oldValue: "open",
        senderLoginId: "owner",
      },
      {
        createdLabel: "now",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 18,
        kind: "event",
        newValue: "bug",
        oldValue: "",
        senderLoginId: "owner",
      },
      {
        createdLabel: "now",
        eventType: "ISSUE_ASSIGNEE_CHANGED",
        id: 20,
        kind: "event",
        newValue: "2",
        oldValue: "",
        senderLabel: "Owner User",
        senderLoginId: "owner",
        targetLabel: "Assignee User",
        targetLoginId: "assignee",
      },
      {
        createdLabel: "now",
        eventType: "ISSUE_BODY_CHANGED",
        id: 19,
        kind: "event",
        newValue: "new body",
        oldValue: "old body",
        senderLoginId: "owner",
      },
    ],
  });
  const requests: Array<{ body: unknown; csrfToken: string; method: string; path: string }> = [];

  const record = (
    request: Parameters<Page["route"]>[1] extends (route: infer R) => unknown
      ? R extends { request: () => infer Request }
        ? Request
        : never
      : never,
  ) => {
    const url = new URL(request.url());
    requests.push({
      body: request.method() === "POST" ? request.postDataJSON() : null,
      csrfToken: request.headers()["x-csrf-token"] ?? "",
      method: request.method(),
      path: url.pathname.replace("/yona/api/v1", ""),
    });
  };

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1"), async (route) => {
    const request = route.request();
    if (request.method() === "DELETE") {
      record(request);
      await route.fulfill({ body: "{}", headers: restJsonHeaders, status: 200 });
      return;
    }

    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/favorite"),
    async (route) => {
      record(route.request());
      currentIssue = { ...currentIssue, isFavorited: true };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/watch"),
    async (route) => {
      record(route.request());
      currentIssue = { ...currentIssue, isWatching: route.request().method() === "POST" };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/vote"),
    async (route) => {
      record(route.request());
      currentIssue = {
        ...currentIssue,
        hasVoted: route.request().method() === "POST",
        voterCount: route.request().method() === "POST" ? 1 : 0,
      };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/sharable-users?*"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          items: [{ loginId: "door", type: "user", userId: "9", userLabel: "Door" }],
          truncated: false,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/sharers"),
    async (route) => {
      record(route.request());
      currentIssue = {
        ...currentIssue,
        sharers: [{ loginId: "door", userId: "9", userLabel: "Door" }],
      };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/mass-update"), async (route) => {
    record(route.request());
    const body = route.request().postDataJSON() as {
      dueDate?: string;
      milestoneId?: string;
    };
    currentIssue = {
      ...currentIssue,
      dueDateLabel: body.dueDate ?? currentIssue.dueDateLabel,
      milestoneId: body.milestoneId ?? currentIssue.milestoneId,
      milestoneTitle: body.milestoneId === "8" ? "Done" : currentIssue.milestoneTitle,
    };
    await route.fulfill({
      body: JSON.stringify({ items: [] }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.locator("#helpKeys.modal.hide.fade.keymap-help")).toHaveCount(1);

  const keymapTrigger = await layoutBox(page, 'a[href="#helpKeys"][data-toggle="modal"]');
  await page.locator('a[href="#helpKeys"][data-toggle="modal"]').click();
  await expect(page.locator("#helpKeys.modal.fade.keymap-help.in")).toBeVisible();

  const keymapModal = await layoutBox(page, "#helpKeys.keymap-help");
  const keymapRow = await layoutBox(page, "#helpKeys > .row-fluid");
  const projectColumn = await layoutBox(page, "#helpKeys > .row-fluid > .span3");
  const rightColumn = await layoutBox(page, "#helpKeys > .row-fluid > .span9");
  const sectionColumn = await layoutBox(page, "#helpKeys .span9 > .row-fluid > .span5");
  const siteColumn = await layoutBox(page, "#helpKeys .span9 > .row-fluid > .span7");
  const commentShortcut = await layoutBox(page, "#helpKeys .span9 > .row-fluid.mt20 .span12");
  const firstKey = await layoutBox(page, "#helpKeys .span3 .ybtn.ybtn-small");
  const firstLabel = await layoutBox(page, "#helpKeys .span3 .help-inline");
  const actionRow = await layoutBox(page, "#helpKeys .actrow");
  const confirm = await layoutBox(page, "#helpKeys .actrow .ybtn-info");
  const viewportCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);

  expect(keymapTrigger.x).toBeGreaterThanOrEqual(55);
  expect(keymapModal.width).toBeGreaterThanOrEqual(680);
  expect(keymapModal.width).toBeLessThanOrEqual(690);
  expect(Math.abs(keymapModal.x + keymapModal.width / 2 - viewportCenter)).toBeLessThanOrEqual(24);
  expect(keymapRow.x).toBeGreaterThanOrEqual(keymapModal.x + 20);
  expect(projectColumn.x).toBeCloseTo(keymapRow.x, 0);
  expect(rightColumn.x).toBeGreaterThan(projectColumn.x + projectColumn.width - 1);
  expect(sectionColumn.x).toBeCloseTo(rightColumn.x, 0);
  expect(siteColumn.x).toBeGreaterThan(sectionColumn.x + sectionColumn.width - 1);
  expect(commentShortcut.y).toBeGreaterThan(sectionColumn.y + sectionColumn.height - 1);
  expect(firstLabel.x).toBeGreaterThan(firstKey.x + firstKey.width - 1);
  expect(firstKey.width).toBeGreaterThanOrEqual(20);
  expect(actionRow.y).toBeGreaterThan(keymapRow.y + keymapRow.height - 1);
  expect(
    Math.abs(confirm.x + confirm.width / 2 - (keymapModal.x + keymapModal.width / 2)),
  ).toBeLessThanOrEqual(2);

  await page.locator("#helpKeys .actrow .ybtn-info").click();
  await expect(page.locator("#helpKeys.modal.hide.fade.keymap-help")).toHaveCount(1);

  const fullTimeline = page.locator("section#comments #timeline");
  await expect(fullTimeline.locator("#event-17")).toContainText("Closed");
  await expect(fullTimeline.locator("#event-17")).toContainText("owner closed this issue");
  await expect(fullTimeline.locator("#event-17 a.usf-group")).toHaveAttribute(
    "href",
    "/yona/owner",
  );
  await expect(fullTimeline.locator("#event-18")).toContainText("Added");
  await expect(fullTimeline.locator("#event-18 .issue-label")).toContainText("bug");
  await expect(fullTimeline.locator("#event-20")).toContainText(
    "Owner User assigned this issue to",
  );
  await expect(fullTimeline.locator("#event-20 a.usf-group").nth(1)).toHaveAttribute(
    "href",
    "/yona/assignee",
  );
  await expect(fullTimeline.locator("#event-19")).toHaveCount(0);
  await expect(fullTimeline).not.toContainText("issue.event.");

  await page.locator(".favorite-issue").click();
  await expect(page.locator(".favorite-issue .star")).toHaveClass(/starred/);
  await page.locator("#watch-button").click();
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "true");
  await page.locator("#vote a").click();
  await expect(page.locator("#vote")).toHaveClass(/voter-exists/);

  await page.locator("#issue-share-button").click();
  await expect(page.locator(".sharer-list")).toBeVisible();
  await page.locator('.sharer-list form input[name="issueSharer"]').fill("door");
  await page.locator(".sharer-list button", { hasText: "Issue Sharing" }).click();
  await expect(page.locator("#sharer-list")).toContainText("Door");

  await page.locator("#milestone").selectOption("8");
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.path === "/projects/admin/projectYobi/issues/mass-update" &&
          String((request.body as { milestoneId?: string }).milestoneId) === "8",
      ),
    )
    .toBe(true);
  await page.locator('#issueUpdateForm input[name="dueDate"]').fill("2026-07-08");
  await page.locator('#issueUpdateForm input[name="dueDate"]').blur();
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.path === "/projects/admin/projectYobi/issues/mass-update" &&
          (request.body as { dueDate?: string }).dueDate === "2026-07-08",
      ),
    )
    .toBe(true);
  await expect(page.locator("#labelIds")).toBeAttached();
  await expect(page.locator('#labelIds option[value="5"]')).toHaveJSProperty("selected", true);
  await expect(page.locator('#labelIds option[value="6"]')).toHaveText("feature");

  await page.locator('a[href="#deleteConfirm"]').click();
  await expect(page.locator("#deleteConfirm")).toBeVisible();
  await page.locator("#deleteConfirm").getByRole("button", { name: "No" }).click();
  await expect(page.locator("#deleteConfirm")).toBeHidden();
  await page.locator('a[href="#deleteConfirm"]').click();
  await page.locator("#deleteConfirm").getByRole("button", { name: "Yes" }).click();
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/issues$/);

  expect(requests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        csrfToken: "csrf-123",
        method: "POST",
        path: "/owners/admin/projects/projectYobi/issues/1/favorite",
      }),
      expect.objectContaining({
        csrfToken: "csrf-123",
        method: "POST",
        path: "/owners/admin/projects/projectYobi/issues/1/watch",
      }),
      expect.objectContaining({
        csrfToken: "csrf-123",
        method: "POST",
        path: "/owners/admin/projects/projectYobi/issues/1/vote",
      }),
      expect.objectContaining({
        body: { loginId: "door", targetType: "user" },
        csrfToken: "csrf-123",
        method: "POST",
        path: "/owners/admin/projects/projectYobi/issues/1/sharers",
      }),
      expect.objectContaining({
        csrfToken: "csrf-123",
        method: "DELETE",
        path: "/projects/admin/projectYobi/issues/1",
      }),
    ]),
  );
});

test("issue comment editor inserts pasted and dropped image uploads before REST submit", async ({
  page,
}) => {
  let currentIssue = issueDetail();
  const uploadedHeaders: string[] = [];
  let submittedComment: null | { attachmentIds?: string[]; contentsMarkdown?: string } = null;

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route("**/files", async (route) => {
    const uploadIndex = uploadedHeaders.length + 1;
    uploadedHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
    await route.fulfill({
      body: JSON.stringify({
        id: 930 + uploadIndex,
        mimeType: "image/png",
        name: uploadIndex === 1 ? "issue-paste.png" : "issue-drop.png",
        size: 8,
        url: `/yona/files/${930 + uploadIndex}`,
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1/comments"), async (route) => {
    submittedComment = route.request().postDataJSON() as {
      attachmentIds?: string[];
      contentsMarkdown?: string;
    };
    currentIssue = issueDetail({
      commentCount: 1,
      timeline: [
        {
          comment: {
            authorAvatarUrl: "",
            authorLabel: "Admin",
            authorLoginId: "admin",
            contentsMarkdown: submittedComment.contentsMarkdown ?? "",
            createdLabel: "now",
            id: 99,
            viewerCanDelete: false,
            viewerCanUpdate: false,
            viewerHasVoted: false,
            voterCount: 0,
            voters: [],
          },
          createdLabel: "now",
          eventType: "",
          id: 99,
          kind: "comment",
          newValue: "",
          oldValue: "",
          senderLoginId: "admin",
        },
      ],
    });
    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.locator(".markdown-help")).toBeVisible();
  await expect(page.locator(".markdown-help-nav .help-nav")).toHaveCount(10);
  await expect(page.locator(".markdown-help-wrap .markdown-help-item")).toHaveCount(10);

  const markdownHelp = await layoutBox(page, ".markdown-help");
  const markdownNav = await layoutBox(page, ".markdown-help .markdown-help-nav");
  const markdownWrap = await layoutBox(page, ".markdown-help .markdown-help-wrap");
  const headerNav = await layoutBox(
    page,
    '.markdown-help .markdown-help-nav [data-target="markdownHeaders"]',
  );

  expect(markdownNav.y).toBeGreaterThanOrEqual(markdownHelp.y);
  expect(markdownNav.width).toBeCloseTo(markdownHelp.width, 0);
  expect(headerNav.x).toBeGreaterThan(markdownNav.x);
  expect(markdownWrap.y).toBeGreaterThan(markdownNav.y + markdownNav.height - 1);
  await expect(page.locator(".markdown-help-item.markdownHeaders")).not.toHaveClass(/active/);

  await page.locator('.markdown-help .help-nav[data-target="markdownHeaders"] button').click();
  await expect(page.locator(".markdown-help-item.markdownHeaders")).toHaveClass(/active/);
  const activeMarkdownNav = await layoutBox(page, ".markdown-help .markdown-help-nav");
  const activeMarkdownWrap = await layoutBox(page, ".markdown-help .markdown-help-wrap");
  const activeNav = await layoutBox(
    page,
    '.markdown-help .help-nav[data-target="markdownHeaders"]',
  );
  const activeItem = await layoutBox(page, ".markdown-help-item.markdownHeaders.active");
  const inputHeader = await layoutBox(page, ".markdown-help-item.markdownHeaders .thead .span6");
  const outputHeader = await layoutBox(
    page,
    ".markdown-help-item.markdownHeaders .thead .span6:nth-child(2)",
  );
  const inputColumn = await layoutBox(
    page,
    ".markdown-help-item.markdownHeaders .markdwon-syntax-wrap .span6.markdwon-syntax",
  );
  const outputColumn = await layoutBox(
    page,
    ".markdown-help-item.markdownHeaders .markdwon-syntax-wrap > .span6:nth-child(2)",
  );
  const syntaxPre = await layoutBox(page, ".markdown-help-item.markdownHeaders pre");

  expect(activeMarkdownNav.width).toBeCloseTo(markdownNav.width, 0);
  expect(activeMarkdownWrap.width).toBeCloseTo(markdownWrap.width, 0);
  expect(activeNav.x).toBeGreaterThanOrEqual(activeMarkdownNav.x);
  expect(activeNav.x + activeNav.width).toBeLessThanOrEqual(
    activeMarkdownNav.x + activeMarkdownNav.width + 1,
  );
  expect(activeNav.y).toBeGreaterThanOrEqual(activeMarkdownNav.y);
  expect(activeNav.y + activeNav.height).toBeLessThanOrEqual(
    activeMarkdownNav.y + activeMarkdownNav.height + 1,
  );
  expect(activeItem.y).toBeGreaterThanOrEqual(activeMarkdownWrap.y);
  expect(inputHeader.x).toBeCloseTo(inputColumn.x, 0);
  expect(outputHeader.x).toBeCloseTo(outputColumn.x, 0);
  expect(outputHeader.x).toBeGreaterThan(inputHeader.x + inputHeader.width - 1);
  expect(outputColumn.x).toBeGreaterThan(inputColumn.x + inputColumn.width - 1);
  expect(inputColumn.width).toBeCloseTo(outputColumn.width, -1);
  expect(syntaxPre.x).toBeGreaterThanOrEqual(inputColumn.x);
  expect(syntaxPre.width).toBeLessThanOrEqual(inputColumn.width);

  await page.locator('.markdown-help .help-nav[data-target="markdownHeaders"] button').click();
  await expect(page.locator(".markdown-help-item.markdownHeaders")).not.toHaveClass(/active/);

  const editor = page.locator("#editor-contents-comment-body");

  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "issue-paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(editor).toHaveValue("![issue-paste.png](/yona/files/931) ");

  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["dropped"], "issue-drop.png", { type: "image/png" }));
    element.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(editor).toHaveValue(
    "![issue-paste.png](/yona/files/931) ![issue-drop.png](/yona/files/932) ",
  );

  await editor.fill("Preview **markdown**");
  await page.locator('a[href="#preview-comment-body"][data-mode="preview"]').click();
  await expect(page.locator("#preview-comment-body .markdown-preview")).toContainText(
    "Preview markdown",
  );
  await expect(page.locator("#preview-comment-body strong")).toHaveText("markdown");

  await page.locator("#comment-form").getByRole("button", { name: "Add a comment" }).click();

  expect(uploadedHeaders).toEqual(["csrf-123", "csrf-123"]);
  expect(submittedComment).toEqual({
    attachmentIds: ["931", "932"],
    contentsMarkdown: "Preview **markdown**",
  });
});
