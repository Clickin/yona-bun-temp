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
    bodyMarkdown: "- [ ] issue open\n- [x] issue done",
    childIssues: [
      {
        assigneeLabel: "Door",
        commentCount: 2,
        createdLabel: "2026-06-28",
        isDraft: false,
        issueNumber: 2,
        labels: [{ color: "#2196f3", id: "6", name: "feature" }],
        state: "open",
        title: "Child pair display issue",
        voterCount: 1,
      },
    ],
    childOpenCount: 1,
    commentParentLinks: [{ id: 31, parentCommentId: 30 }],
    viewerUserId: 1,
    comments: [
      {
        authorAvatarUrl: "",
        authorLabel: "Admin",
        authorLoginId: "admin",
        contentsMarkdown: "Child anchor target",
        createdLabel: "just now",
        id: 31,
        parentCommentId: 30,
        viewerCanDelete: true,
        viewerCanUpdate: false,
        viewerHasVoted: false,
        voterCount: 0,
        voters: [],
      },
    ],
    timeline: [
      {
        comment: {
          authorAvatarUrl: "",
          authorId: 1,
          authorLabel: "Admin",
          authorLoginId: "admin",
          contentsMarkdown: "Editable **comment**",
          createdLabel: "just now",
          id: 10,
          viewerCanDelete: false,
          viewerCanUpdate: true,
          viewerHasVoted: false,
          voterCount: 0,
          voters: [],
        },
        createdLabel: "just now",
        eventType: "",
        id: 10,
        kind: "comment",
        newValue: "",
        oldValue: "",
        senderLoginId: "admin",
      },
      {
        comment: {
          authorAvatarUrl: "",
          authorLabel: "Admin",
          authorLoginId: "admin",
          contentsMarkdown: "Delete target comment",
          createdLabel: "just now",
          id: 30,
          viewerCanDelete: true,
          viewerCanUpdate: false,
          viewerHasVoted: false,
          voterCount: 0,
          voters: [],
        },
        createdLabel: "just now",
        eventType: "",
        id: 30,
        kind: "comment",
        newValue: "",
        oldValue: "",
        senderLoginId: "admin",
      },
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
      body: ["POST", "PUT"].includes(request.method()) ? request.postDataJSON() : null,
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

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1/comments"), async (route) => {
    record(route.request());
    const body = route.request().postDataJSON() as {
      attachmentIds?: string[];
      contentsMarkdown?: string;
      parentCommentId?: number;
    };
    currentIssue = {
      ...currentIssue,
      commentParentLinks: [
        ...(currentIssue.commentParentLinks as Array<{ id: number; parentCommentId: number }>),
        { id: 32, parentCommentId: Number(body.parentCommentId ?? 0) },
      ],
      comments: [
        ...(currentIssue.comments as Array<Record<string, unknown>>),
        {
          authorAvatarUrl: "",
          authorLabel: "Admin",
          authorLoginId: "admin",
          contentsMarkdown: body.contentsMarkdown ?? "",
          createdLabel: "just now",
          id: 32,
          viewerCanDelete: false,
          viewerCanUpdate: false,
          viewerHasVoted: false,
          voterCount: 0,
          voters: [],
        },
      ],
    };
    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/projects/admin/projectYobi/issues/1/comments/30"),
    async (route) => {
      record(route.request());
      currentIssue = {
        ...currentIssue,
        timeline: currentIssue.timeline.filter((item) => item.id !== 30),
      };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/projects/admin/projectYobi/issues/1/comments/10"),
    async (route) => {
      record(route.request());
      const request = route.request();
      if (request.method() === "PUT") {
        const body = request.postDataJSON() as {
          attachmentIds?: string[];
          contentsMarkdown?: string;
        };
        currentIssue = {
          ...currentIssue,
          timeline: currentIssue.timeline.map((item) =>
            item.id === 10 && "comment" in item
              ? {
                  ...item,
                  comment: {
                    ...item.comment,
                    contentsMarkdown: body.contentsMarkdown ?? item.comment.contentsMarkdown,
                  },
                }
              : item,
          ),
        };
      }
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.locator("#helpKeys.modal.hide.fade.keymap-help")).toHaveCount(1);
  await expect(page.locator("#comment-delete-modal.modal.hide.fade")).toHaveCount(1);
  await expect(page.locator("#issue-body-1 .tasklist.task-show")).toBeVisible();
  await expect(page.locator("#issue-body-1 .task-title")).toContainText("Tasks(1/2)");
  await expect(page.locator("#issue-body-1 .task-progress .bar.red")).toHaveAttribute(
    "title",
    "Tasklist",
  );
  await expect(page.locator("#issue-body-1 .task-progress .bar.red")).toHaveAttribute(
    "style",
    "width: 50%;",
  );
  const tasklist = await layoutBox(page, "#issue-body-1 .tasklist.task-show");
  const taskTitle = await layoutBox(page, "#issue-body-1 .task-title");
  const doneCounter = await layoutBox(page, "#issue-body-1 .done-counter");
  const taskProgress = await layoutBox(page, "#issue-body-1 .task-progress");
  const taskProgressBar = await layoutBox(page, "#issue-body-1 .task-progress .bar");
  const taskStyles = await page.locator("#issue-body-1 .tasklist.task-show").evaluate((element) => {
    const tasklistStyle = window.getComputedStyle(element);
    const title = window.getComputedStyle(element.querySelector(".task-title") as HTMLElement);
    const counter = window.getComputedStyle(element.querySelector(".done-counter") as HTMLElement);
    const progress = window.getComputedStyle(
      element.querySelector(".task-progress") as HTMLElement,
    );
    const bar = window.getComputedStyle(
      element.querySelector(".task-progress .bar") as HTMLElement,
    );
    return {
      barBackgroundColor: bar.backgroundColor,
      barHeight: bar.height,
      counterMarginLeft: counter.marginLeft,
      display: tasklistStyle.display,
      paddingLeft: tasklistStyle.paddingLeft,
      paddingRight: tasklistStyle.paddingRight,
      paddingTop: tasklistStyle.paddingTop,
      progressBackgroundColor: progress.backgroundColor,
      titleFontWeight: title.fontWeight,
    };
  });
  expect(taskTitle.x).toBeCloseTo(tasklist.x + 20, 0);
  expect(taskProgress.x).toBeCloseTo(taskTitle.x, 0);
  expect(taskProgress.y).toBeGreaterThan(taskTitle.y + taskTitle.height - 1);
  expect(doneCounter.x).toBeGreaterThan(taskTitle.x);
  expect(taskProgressBar.x).toBeCloseTo(taskProgress.x, 0);
  expect(taskProgressBar.width).toBeCloseTo(taskProgress.width * 0.5, 0);
  expect(taskStyles).toEqual({
    barBackgroundColor: "rgb(255, 0, 0)",
    barHeight: "2px",
    counterMarginLeft: "5px",
    display: "block",
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingTop: "10px",
    progressBackgroundColor: "rgb(212, 212, 212)",
    titleFontWeight: "500",
  });

  await expect(page.locator(".subtasks .parent-issue")).toContainText("#1 Pilot issue - Nori");
  await expect(
    page.locator(".subtasks .child-issue .twoColumeModeTarget:has(.item-name)"),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issue/2");
  await expect(page.locator(".subtasks .child-issue .item-name")).toContainText(
    "#2 Child pair display issue - Door",
  );
  await expect(page.locator(".subtasks .child-issue .font12.no-border-at-child")).toHaveCount(1);
  await expect(
    page.locator(".subtasks .child-issue .comments-count.comments-count-color"),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issue/2#comments");
  await expect(
    page.locator(".subtasks .child-issue .comments-count .yobicon-comment2"),
  ).toHaveCount(1);
  await expect(
    page.locator(".subtasks .child-issue .comments-count .count-groups.item-count"),
  ).toHaveText("2");
  await expect(page.locator(".subtasks .child-issue .vote-count.vote-color")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issue/2#vote",
  );
  await expect(page.locator(".subtasks .child-issue .vote-count .yobicon-hearts")).toHaveCount(1);
  await expect(
    page.locator(".subtasks .child-issue .vote-count .count-groups.item-count.strong"),
  ).toHaveText("1");
  await expect(page.locator('.subtasks .child-issue .issue-label[data-label-id="6"]')).toHaveText(
    "feature",
  );
  await expect(
    page.locator('.subtasks .child-issue .issue-label[data-label-id="6"]'),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issues?state=open&labelIds=6");

  const subtasks = await layoutBox(page, ".subtasks");
  const content = await layoutBox(page, ".issue-detail-page .board-body .content");
  const parentIssue = await layoutBox(page, ".subtasks .parent-issue");
  const delimiter = await layoutBox(page, ".subtasks .parent-issue-delimeter");
  const childIssue = await layoutBox(page, ".subtasks .child-issue");
  const childPairWrap = await layoutBox(page, ".subtasks .child-issue .font12.no-border-at-child");
  const childGroup = await layoutBox(page, ".subtasks .child-issue .item-count-groups");
  const childComment = await layoutBox(page, ".subtasks .child-issue .comments-count");
  const childCommentIcon = await layoutBox(
    page,
    ".subtasks .child-issue .comments-count .count-groups.item-icon",
  );
  const childCommentCount = await layoutBox(
    page,
    ".subtasks .child-issue .comments-count .count-groups.item-count",
  );
  const childVote = await layoutBox(page, ".subtasks .child-issue .vote-count");
  const childVoteIcon = await layoutBox(
    page,
    ".subtasks .child-issue .vote-count .count-groups.item-icon",
  );
  const childVoteCount = await layoutBox(
    page,
    ".subtasks .child-issue .vote-count .count-groups.item-count",
  );
  const childLabel = await layoutBox(
    page,
    '.subtasks .child-issue .issue-label[data-label-id="6"]',
  );
  const childPairStyles = await page
    .locator(".subtasks .child-issue .font12.no-border-at-child")
    .evaluate((element) => {
      const group = element.querySelector(".item-count-groups") as HTMLElement;
      const comment = group.querySelector(".comments-count") as HTMLElement;
      const commentIcon = comment.querySelector(".item-icon") as HTMLElement;
      const commentCount = comment.querySelector(".item-count") as HTMLElement;
      const vote = group.querySelector(".vote-count") as HTMLElement;
      const voteIcon = vote.querySelector(".item-icon") as HTMLElement;
      const voteCount = vote.querySelector(".item-count") as HTMLElement;
      const subtasksElement = element.closest(".subtasks") as HTMLElement;
      const parent = subtasksElement.querySelector(".parent-issue") as HTMLElement;
      const delimiterElement = subtasksElement.querySelector(
        ".parent-issue-delimeter",
      ) as HTMLElement;
      const child = element.closest(".child-issue") as HTMLElement;
      const wrapperStyle = window.getComputedStyle(element);
      const groupStyle = window.getComputedStyle(group);
      const commentStyle = window.getComputedStyle(comment);
      const commentIconStyle = window.getComputedStyle(commentIcon);
      const commentCountStyle = window.getComputedStyle(commentCount);
      const voteStyle = window.getComputedStyle(vote);
      const voteIconStyle = window.getComputedStyle(voteIcon);
      const voteCountStyle = window.getComputedStyle(voteCount);
      const subtasksStyle = window.getComputedStyle(subtasksElement);
      const parentStyle = window.getComputedStyle(parent);
      const delimiterStyle = window.getComputedStyle(delimiterElement);
      const childStyle = window.getComputedStyle(child);
      return {
        childPaddingLeft: childStyle.paddingLeft,
        childPaddingRight: childStyle.paddingRight,
        commentColor: commentStyle.color,
        commentCountFontWeight: commentCountStyle.fontWeight,
        commentCountPaddingRight: commentCountStyle.paddingRight,
        commentIconBorderLeftWidth: commentIconStyle.borderLeftWidth,
        commentIconFontSize: commentIconStyle.fontSize,
        commentIconLineHeight: commentIconStyle.lineHeight,
        commentIconPaddingTop: commentIconStyle.paddingTop,
        delimiterBorderTopStyle: delimiterStyle.borderTopStyle,
        delimiterBorderTopWidth: delimiterStyle.borderTopWidth,
        delimiterMarginTop: delimiterStyle.marginTop,
        groupBorderTopWidth: groupStyle.borderTopWidth,
        groupLineHeight: groupStyle.lineHeight,
        parentFontSize: parentStyle.fontSize,
        subtasksMarginBottom: subtasksStyle.marginBottom,
        subtasksMarginTop: subtasksStyle.marginTop,
        voteColor: voteStyle.color,
        voteCountPaddingRight: voteCountStyle.paddingRight,
        voteIconFontSize: voteIconStyle.fontSize,
        voteIconLineHeight: voteIconStyle.lineHeight,
        voteIconPaddingTop: voteIconStyle.paddingTop,
        voteMarginLeft: voteStyle.marginLeft,
        wrapperFontSize: wrapperStyle.fontSize,
      };
    });
  const childLabelStyles = await page
    .locator('.subtasks .child-issue .issue-label[data-label-id="6"]')
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        color: style.color,
      };
    });

  expect(subtasks.y).toBeGreaterThanOrEqual(content.y + content.height + 38);
  expect(parentIssue.x).toBeGreaterThanOrEqual(subtasks.x);
  expect(delimiter.y).toBeGreaterThan(parentIssue.y + parentIssue.height - 1);
  expect(childIssue.y).toBeGreaterThan(delimiter.y);
  expect(childPairWrap.x).toBeGreaterThan(childIssue.x);
  expect(childGroup.x).toBeGreaterThanOrEqual(childPairWrap.x);
  expect(childComment.x).toBeGreaterThanOrEqual(childGroup.x);
  expect(childCommentIcon.x).toBeGreaterThanOrEqual(childComment.x);
  expect(childCommentCount.x).toBeGreaterThan(childCommentIcon.x);
  expect(childVote.x).toBeGreaterThan(childComment.x);
  expect(childVoteIcon.x).toBeGreaterThanOrEqual(childVote.x);
  expect(childVoteCount.x).toBeGreaterThan(childVoteIcon.x);
  expect(childLabel.x).toBeGreaterThan(childPairWrap.x + childPairWrap.width - 1);
  expect(childLabel.y).toBeGreaterThanOrEqual(childIssue.y - 1);
  expect(childCommentIcon.y).toBeLessThanOrEqual(childCommentCount.y + childCommentCount.height);
  expect(childVoteIcon.y).toBeLessThanOrEqual(childVoteCount.y + childVoteCount.height);
  expect(childLabelStyles).toEqual({
    backgroundColor: "rgb(33, 150, 243)",
    boxShadow: "rgb(33, 150, 243) 2px 0px 0px 0px inset",
    color: "rgb(255, 255, 255)",
  });
  expect(childPairStyles).toEqual({
    childPaddingLeft: "3px",
    childPaddingRight: "3px",
    commentColor: "rgb(139, 0, 139)",
    commentCountFontWeight: "400",
    commentCountPaddingRight: "5px",
    commentIconBorderLeftWidth: "0px",
    commentIconFontSize: "9px",
    commentIconLineHeight: "12px",
    commentIconPaddingTop: "2px",
    delimiterBorderTopStyle: "dashed",
    delimiterBorderTopWidth: "1px",
    delimiterMarginTop: "5px",
    groupBorderTopWidth: "0px",
    groupLineHeight: "14px",
    parentFontSize: "16px",
    subtasksMarginBottom: "15px",
    subtasksMarginTop: "40px",
    voteColor: "rgb(243, 108, 34)",
    voteCountPaddingRight: "5px",
    voteIconFontSize: "9px",
    voteIconLineHeight: "12px",
    voteIconPaddingTop: "2px",
    voteMarginLeft: "-5px",
    wrapperFontSize: "12px",
  });

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

  await expect(fullTimeline.locator("#comment-10")).toContainText("Editable comment");
  await fullTimeline.locator("#comment-10").hover();
  await fullTimeline.locator("#comment-10 button:has(.yobicon-edit-2)").click();
  const commentUpdateForm = fullTimeline.locator("#comment-editform-10.comment-update-form");
  await expect(commentUpdateForm).toBeVisible();
  await expect(commentUpdateForm.locator("form")).toHaveAttribute(
    "action",
    "/yona/admin/projectYobi/issue/1/comments/10",
  );
  await expect(commentUpdateForm.locator("form")).toHaveAttribute("method", "post");
  await expect(commentUpdateForm.locator("form")).toHaveAttribute("enctype", "multipart/form-data");
  await expect(commentUpdateForm.locator('input[type="hidden"][name="id"]')).toHaveValue("10");
  await expect(commentUpdateForm.locator('[data-toggle="markdown-editor"].mt10')).toHaveCount(1);
  await expect(commentUpdateForm.locator('a[href="#edit-10"][data-mode="edit"]')).toHaveAttribute(
    "data-toggle",
    "tab",
  );
  await expect(
    commentUpdateForm.locator('a[href="#preview-10"][data-mode="preview"]'),
  ).toHaveAttribute("data-toggle", "tab");
  await expect(commentUpdateForm.locator("#edit-10.tab-pane.active")).toHaveCount(1);
  await expect(commentUpdateForm.locator("#preview-10.tab-pane")).toHaveCount(1);
  await expect(commentUpdateForm.locator("#editor-contents-10")).toHaveAttribute(
    "name",
    "contents",
  );
  await expect(commentUpdateForm.locator("#editor-contents-10")).toHaveAttribute(
    "data-editor-mode",
    "update-comment-body",
  );
  await expect(commentUpdateForm.locator("#editor-contents-10")).toHaveAttribute(
    "markdown",
    "true",
  );
  await expect(
    commentUpdateForm.locator(".markdown-preview.markdown-wrap.update-comment-body"),
  ).toHaveCount(1);
  await expect(commentUpdateForm.locator(".upload-drop-here .msg")).toContainText(
    "Drag & Drop files here to upload.",
  );
  await expect(commentUpdateForm.locator(".file-upload__label.ybtn")).toContainText("File upload");
  await expect(
    commentUpdateForm.locator("input.file-upload__input[name=filePath]"),
  ).toHaveAttribute("multiple", "");
  await expect(commentUpdateForm.locator(".send-notification-check")).toHaveAttribute(
    "data-toggle",
    "popover",
  );
  await expect(commentUpdateForm.locator('input[name="notificationMail"]')).toBeChecked();
  await expect(commentUpdateForm.locator(".ybtn.ybtn-cancel")).toHaveAttribute(
    "data-comment-id",
    "10",
  );
  await expect(commentUpdateForm.locator(".ybtn.ybtn-info[type=submit]")).toContainText("Save");
  await expect(commentUpdateForm.locator('input[name="temporaryUploadFiles"]')).toHaveValue("");
  await expect(commentUpdateForm.locator(".preview-10")).toHaveCount(1);
  await expect(commentUpdateForm.locator(".attachment-files")).toHaveCount(1);
  await expect(commentUpdateForm.locator("div#upload-10")).toHaveAttribute(
    "data-resourcetype",
    "ISSUE_COMMENT",
  );
  await expect(commentUpdateForm.locator("div#upload-10")).toHaveAttribute("data-resourceid", "10");

  const commentUpdateBox = await layoutBox(page, "#comment-editform-10 .write-comment-box");
  const commentUpdateWrap = await layoutBox(page, "#comment-editform-10 .write-comment-wrap");
  const commentUpdateEditor = await layoutBox(page, "#comment-editform-10 #editor-contents-10");
  const commentUpdateActionRow = await layoutBox(
    page,
    "#comment-editform-10 .comment-update-button.upload-button-line",
  );
  const commentUpdateUploadLabel = await layoutBox(
    page,
    "#comment-editform-10 .file-upload__label",
  );
  const commentUpdateCancel = await layoutBox(page, "#comment-editform-10 .ybtn-cancel");
  const commentUpdateSave = await layoutBox(page, "#comment-editform-10 .ybtn-info");
  const commentUpdateStyles = await commentUpdateForm.evaluate((element) => {
    const formStyle = window.getComputedStyle(element);
    const textareaBox = window.getComputedStyle(
      element.querySelector(".textarea-box") as HTMLElement,
    );
    const textarea = window.getComputedStyle(element.querySelector("textarea") as HTMLElement);
    const actionRow = window.getComputedStyle(
      element.querySelector(".comment-update-button") as HTMLElement,
    );
    const dropOverlay = window.getComputedStyle(
      element.querySelector(".upload-drop-here") as HTMLElement,
    );
    return {
      actionRowTextAlign: actionRow.textAlign,
      display: formStyle.display,
      dropOverlayDisplay: dropOverlay.display,
      textareaBoxMarginBottom: textareaBox.marginBottom,
      textareaBoxPaddingRight: textareaBox.paddingRight,
      textareaHeight: textarea.height,
      textareaResize: textarea.resize,
    };
  });
  expect(commentUpdateWrap.x).toBeGreaterThanOrEqual(commentUpdateBox.x);
  expect(commentUpdateEditor.y).toBeGreaterThan(commentUpdateWrap.y);
  expect(commentUpdateActionRow.y).toBeGreaterThan(
    commentUpdateEditor.y + commentUpdateEditor.height - 1,
  );
  expect(commentUpdateUploadLabel.x).toBeGreaterThanOrEqual(commentUpdateActionRow.x);
  expect(commentUpdateCancel.x).toBeGreaterThan(commentUpdateUploadLabel.x);
  expect(commentUpdateSave.x).toBeGreaterThan(commentUpdateCancel.x);
  expect(commentUpdateStyles).toEqual({
    actionRowTextAlign: "right",
    display: "block",
    dropOverlayDisplay: "none",
    textareaBoxMarginBottom: "10px",
    textareaBoxPaddingRight: "2px",
    textareaHeight: "160px",
    textareaResize: "vertical",
  });

  await commentUpdateForm.locator("#editor-contents-10").fill("Edited **comment**");
  await commentUpdateForm.locator("form").evaluate((element) => {
    (element as HTMLFormElement).requestSubmit();
  });
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.path === "/projects/admin/projectYobi/issues/1/comments/10" &&
          request.method === "PUT" &&
          (request.body as { contentsMarkdown?: string }).contentsMarkdown === "Edited **comment**",
      ),
    )
    .toBe(true);

  await expect(fullTimeline.locator("#comment-30")).toContainText("Delete target comment");
  await expect(fullTimeline.locator("#comment-30 .child-comments > #comment-31")).toHaveCount(1);
  await expect(fullTimeline.locator("#comment-30 .child-comments .one-line-comment")).toContainText(
    "Child anchor target",
  );
  await expect(
    fullTimeline.locator('#comment-30 .child-comments a.ago[href="#comment-31"]'),
  ).toHaveAttribute("title", "just now");
  await expect(
    fullTimeline.locator(
      '#comment-30 .child-comments .deleteButtonX[data-toggle="comment-delete"]',
    ),
  ).toHaveAttribute("data-request-uri", "/yona/admin/projectYobi/issue/1/comment/31/delete");
  await expect(fullTimeline.locator("#comment-30 .add-a-comment.pull-right")).toContainText(
    "Reply",
  );
  await expect(fullTimeline.locator("#comment-30 .child-comment-input-form form")).toHaveAttribute(
    "action",
    "/yona/admin/projectYobi/issue/1/comments",
  );
  await expect(fullTimeline.locator("#comment-30 .child-comment-input-form form")).toHaveAttribute(
    "method",
    "post",
  );
  await expect(fullTimeline.locator("#comment-30 .child-comment-input-form form")).toHaveAttribute(
    "enctype",
    "multipart/form-data",
  );
  await expect(
    fullTimeline.locator('#comment-30 .child-comment-input-form input[name="parentCommentId"]'),
  ).toHaveValue("30");
  await expect(
    fullTimeline.locator('#comment-30 .child-comment-input-form textarea[name="contents"]'),
  ).toHaveAttribute("placeholder", "Reply (CTRL + ENTER)");
  await expect(
    fullTimeline.locator('#comment-30 .child-comment-input-form textarea[name="contents"]'),
  ).toHaveAttribute("markdown", "true");
  await expect(
    fullTimeline.locator("#comment-30 .child-comment-input-form .ybtn.ybtn-success"),
  ).toHaveAttribute("data-legacy-label", "OK");
  await expect(
    fullTimeline.locator(
      '#comment-30 .child-comment-input-form .ybtn.ybtn-success span[aria-hidden="true"]',
    ),
  ).toHaveText("OK");
  await expect(
    fullTimeline.locator("#comment-30 .child-comment-input-form .notification-receiver-title"),
  ).toContainText("Notification receivers");

  const subcommentBody = await layoutBox(page, "#comment-30 .subcomment-media-body");
  const childComments = await layoutBox(page, "#comment-30 .child-comments");
  const childAnchor = await layoutBox(page, "#comment-30 .child-comments > #comment-31");
  const childOneLine = await layoutBox(page, "#comment-30 .child-comments .one-line-comment");
  const childContents = await layoutBox(
    page,
    "#comment-30 .child-comments .one-line-comment .contents",
  );
  const childForm = await page.locator("#comment-30 .child-comment-input-form").boundingBox();
  expect(childForm, "hidden child comment form should not reserve visible layout").toBeNull();
  const childCommentStyles = await page
    .locator("#comment-30 .subcomment-media-body")
    .evaluate((element) => {
      const bodyStyle = window.getComputedStyle(element);
      const addCommentElement = element.previousElementSibling as HTMLElement;
      const addCommentStyle = window.getComputedStyle(addCommentElement);
      const contents = element.querySelector(".one-line-comment .contents") as HTMLElement;
      const contentsStyle = window.getComputedStyle(contents);
      const deleteButton = element.querySelector(".deleteButtonX") as HTMLElement;
      const deleteStyle = window.getComputedStyle(deleteButton);
      const inputForm = element.querySelector(".child-comment-input-form") as HTMLElement;
      const inputFormStyle = window.getComputedStyle(inputForm);
      const oneLineBox = inputForm.querySelector(".oneline-comment-box") as HTMLElement;
      const oneLineBoxStyle = window.getComputedStyle(oneLineBox);
      const textarea = element.querySelector("textarea") as HTMLElement;
      const textareaStyle = window.getComputedStyle(textarea);
      const notificationReceiver = inputForm.querySelector(".notification-receiver") as HTMLElement;
      const notificationStyle = window.getComputedStyle(notificationReceiver);
      return {
        addBorderColor: addCommentStyle.borderTopColor,
        addColor: addCommentStyle.color,
        addDisplay: addCommentStyle.display,
        addFontSize: addCommentStyle.fontSize,
        addMarginTop: addCommentStyle.marginTop,
        bodyMarginLeft: bodyStyle.marginLeft,
        bodyTextAlign: bodyStyle.textAlign,
        contentsBorderBottomStyle: contentsStyle.borderBottomStyle,
        contentsBorderBottomWidth: contentsStyle.borderBottomWidth,
        contentsMarginLeft: contentsStyle.marginLeft,
        contentsPaddingBottom: contentsStyle.paddingBottom,
        contentsPaddingLeft: contentsStyle.paddingLeft,
        contentsPaddingTop: contentsStyle.paddingTop,
        deleteAlignItems: deleteStyle.alignItems,
        deleteColor: deleteStyle.color,
        deleteDisplay: deleteStyle.display,
        formDisplay: inputFormStyle.display,
        notificationBackgroundColor: notificationStyle.backgroundColor,
        notificationDisplay: notificationStyle.display,
        notificationMarginLeft: notificationStyle.marginLeft,
        notificationPaddingLeft: notificationStyle.paddingLeft,
        oneLineBoxDisplay: oneLineBoxStyle.display,
        oneLineBoxMarginLeft: oneLineBoxStyle.marginLeft,
        textareaBorderBottomWidth: textareaStyle.borderBottomWidth,
        textareaMarginTop: textareaStyle.marginTop,
        textareaPaddingLeft: textareaStyle.paddingLeft,
        textareaWidth: textareaStyle.width,
      };
    });
  const childAnchorDisplay = await page
    .locator("#comment-30 .child-comments > #comment-31")
    .evaluate((element) => window.getComputedStyle(element).display);
  expect(subcommentBody.x).toBeGreaterThan(childComments.x - 1);
  expect(childAnchorDisplay).toBe("block");
  expect(childAnchor.x).toBeCloseTo(childComments.x, 0);
  expect(childAnchor.width).toBeCloseTo(childComments.width, 0);
  expect(childAnchor.height).toBe(0);
  expect(childAnchor.y).toBeLessThanOrEqual(childOneLine.y);
  expect(childOneLine.y).toBeGreaterThanOrEqual(childAnchor.y);
  expect(childContents.x).toBeGreaterThanOrEqual(childOneLine.x);
  expect(childContents.y).toBeGreaterThanOrEqual(childOneLine.y);
  expect(childCommentStyles).toEqual({
    addBorderColor: "rgb(0, 176, 232)",
    addColor: "rgb(0, 176, 232)",
    addDisplay: "none",
    addFontSize: "12px",
    addMarginTop: "-32px",
    bodyMarginLeft: "60px",
    bodyTextAlign: "right",
    contentsBorderBottomStyle: "dashed",
    contentsBorderBottomWidth: "1px",
    contentsMarginLeft: "12px",
    contentsPaddingBottom: "4px",
    contentsPaddingLeft: "10px",
    contentsPaddingTop: "5px",
    deleteAlignItems: "center",
    deleteColor: "rgb(255, 0, 0)",
    deleteDisplay: "inline-flex",
    formDisplay: "none",
    notificationBackgroundColor: "rgb(247, 247, 247)",
    notificationDisplay: "none",
    notificationMarginLeft: "12px",
    notificationPaddingLeft: "10px",
    oneLineBoxDisplay: "flex",
    oneLineBoxMarginLeft: "12px",
    textareaBorderBottomWidth: "1px",
    textareaMarginTop: "5px",
    textareaPaddingLeft: "10px",
    textareaWidth: "100%",
  });

  await page
    .locator('#comment-30 .child-comment-input-form textarea[name="contents"]')
    .evaluate((element) => {
      const textarea = element as HTMLTextAreaElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(textarea, "Nested **reply**");
      textarea.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    });
  await page
    .locator("#comment-30 .child-comment-input-form form")
    .evaluate((element) => (element as HTMLFormElement).requestSubmit());
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.path === "/projects/admin/projectYobi/issues/1/comments" &&
          (request.body as { contentsMarkdown?: string; parentCommentId?: number })
            .contentsMarkdown === "Nested **reply**" &&
          Number(
            (request.body as { contentsMarkdown?: string; parentCommentId?: number })
              .parentCommentId,
          ) === 30,
      ),
    )
    .toBe(true);

  const commentDeleteTrigger = fullTimeline.locator(
    '#comment-30 [data-toggle="comment-delete"][data-request-uri="/yona/admin/projectYobi/issue/1/comment/30/delete"]',
  );
  await expect(commentDeleteTrigger).toHaveAttribute("title", "Delete comment");
  await expect(commentDeleteTrigger.locator(".yobicon-trash")).toHaveCount(1);
  const commentDeleteTriggerBox = await layoutBox(
    page,
    '#comment-30 [data-toggle="comment-delete"][data-request-uri="/yona/admin/projectYobi/issue/1/comment/30/delete"]',
  );
  await commentDeleteTrigger.click();
  await expect(page.locator("#comment-delete-modal.modal.hide.fade.in")).toBeVisible();
  await expect(page.locator("#comment-delete-modal .modal-header h3")).toContainText(
    "Delete comment",
  );
  await expect(page.locator("#comment-delete-modal .modal-body p")).toContainText("won't");
  await expect(page.locator("#comment-delete-confirm")).toHaveAttribute(
    "data-request-uri",
    "/yona/admin/projectYobi/issue/1/comment/30/delete",
  );

  const commentDeleteModal = await layoutBox(page, "#comment-delete-modal");
  const commentDeleteHeader = await layoutBox(page, "#comment-delete-modal .modal-header");
  const commentDeleteTitle = await layoutBox(page, "#comment-delete-modal .modal-header h3");
  const commentDeleteClose = await layoutBox(page, "#comment-delete-modal .modal-header .close");
  const commentDeleteBody = await layoutBox(page, "#comment-delete-modal .modal-body");
  const commentDeleteFooter = await layoutBox(page, "#comment-delete-modal .modal-footer");
  const commentDeleteYes = await layoutBox(page, "#comment-delete-confirm");
  const commentDeleteNo = await layoutBox(
    page,
    '#comment-delete-modal .modal-footer .ybtn[data-dismiss="modal"]',
  );
  const commentDeleteViewportCenter = await page.evaluate(
    () => document.documentElement.clientWidth / 2,
  );
  const commentDeleteStyles = await page.locator("#comment-delete-modal").evaluate((element) => {
    const modalStyle = window.getComputedStyle(element);
    const headerStyle = window.getComputedStyle(
      element.querySelector(".modal-header") as HTMLElement,
    );
    const bodyStyle = window.getComputedStyle(element.querySelector(".modal-body") as HTMLElement);
    const footerStyle = window.getComputedStyle(
      element.querySelector(".modal-footer") as HTMLElement,
    );
    return {
      backgroundColor: modalStyle.backgroundColor,
      bodyPaddingLeft: bodyStyle.paddingLeft,
      borderTopColor: footerStyle.borderTopColor,
      footerDisplay: footerStyle.display,
      footerJustifyContent: footerStyle.justifyContent,
      footerPaddingLeft: footerStyle.paddingLeft,
      headerBorderBottomWidth: headerStyle.borderBottomWidth,
      headerPaddingLeft: headerStyle.paddingLeft,
      position: modalStyle.position,
      zIndex: modalStyle.zIndex,
    };
  });

  expect(commentDeleteModal.width).toBeGreaterThanOrEqual(470);
  expect(commentDeleteModal.width).toBeLessThanOrEqual(490);
  expect(
    Math.abs(commentDeleteModal.x + commentDeleteModal.width / 2 - commentDeleteViewportCenter),
  ).toBeLessThanOrEqual(2);
  expect(commentDeleteModal.y).toBeGreaterThanOrEqual(120);
  expect(commentDeleteModal.y).toBeLessThanOrEqual(150);
  expect(commentDeleteHeader.y).toBeCloseTo(commentDeleteModal.y + 1, 0);
  expect(commentDeleteBody.y).toBeGreaterThan(
    commentDeleteHeader.y + commentDeleteHeader.height - 1,
  );
  expect(commentDeleteFooter.y).toBeGreaterThan(commentDeleteBody.y + commentDeleteBody.height - 1);
  expect(commentDeleteClose.x).toBeGreaterThan(commentDeleteTitle.x + commentDeleteTitle.width);
  expect(commentDeleteYes.x).toBeGreaterThan(commentDeleteFooter.x + 300);
  expect(commentDeleteNo.x).toBeGreaterThan(commentDeleteYes.x + commentDeleteYes.width - 1);
  expect(commentDeleteTriggerBox.y).toBeGreaterThan(commentDeleteModal.y);
  expect(commentDeleteStyles).toEqual({
    backgroundColor: "rgb(255, 255, 255)",
    bodyPaddingLeft: "16px",
    borderTopColor: "rgb(221, 221, 221)",
    footerDisplay: "flex",
    footerJustifyContent: "flex-end",
    footerPaddingLeft: "16px",
    headerBorderBottomWidth: "1px",
    headerPaddingLeft: "16px",
    position: "fixed",
    zIndex: "1000",
  });

  await page.locator('#comment-delete-modal .modal-footer .ybtn[data-dismiss="modal"]').click();
  await expect(page.locator("#comment-delete-modal")).toBeHidden();
  await commentDeleteTrigger.click();
  await page.locator("#comment-delete-confirm").click();
  await expect(fullTimeline.locator("#comment-30")).toHaveCount(0);

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
        path: "/projects/admin/projectYobi/issues/1/comments/30",
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
  await expect(page.locator("#comment-form")).toHaveAttribute(
    "action",
    "/yona/admin/projectYobi/issue/1/comments",
  );
  await expect(page.locator("#comment-form")).toHaveAttribute("method", "post");
  await expect(page.locator("#comment-form")).toHaveAttribute("enctype", "multipart/form-data");
  await expect(page.locator("#comment-form .write-comment-box")).toHaveCount(1);
  await expect(page.locator('#comment-form [data-toggle="markdown-editor"].mt10')).toHaveCount(1);
  await expect(page.locator('#comment-form a[href="#edit-comment-body"]')).toHaveAttribute(
    "data-toggle",
    "tab",
  );
  await expect(page.locator('#comment-form a[href="#edit-comment-body"]')).toHaveAttribute(
    "data-mode",
    "edit",
  );
  await expect(page.locator('#comment-form a[href="#preview-comment-body"]')).toHaveAttribute(
    "data-toggle",
    "tab",
  );
  await expect(page.locator('#comment-form a[href="#preview-comment-body"]')).toHaveAttribute(
    "data-mode",
    "preview",
  );
  await expect(page.locator("#comment-form .add-task-list-button")).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator("#comment-form .add-task-list-button .task-list-icon")).toHaveCount(1);
  await expect(page.locator("#comment-form #button-clear-temporary.ybtn-warning")).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator("#comment-form .editor-notice-label")).toHaveCount(1);
  await expect(page.locator("#comment-form .textarea-box")).toHaveCount(1);
  await expect(page.locator("#comment-form #edit-comment-body.tab-pane.active")).toHaveCount(1);
  await expect(page.locator("#comment-form #preview-comment-body.tab-pane")).toHaveCount(1);
  await expect(page.locator("#editor-contents-comment-body")).toHaveAttribute("name", "contents");
  await expect(page.locator("#editor-contents-comment-body")).toHaveClass(
    /editorSeries content comment nm/,
  );
  await expect(page.locator("#editor-contents-comment-body")).toHaveAttribute(
    "data-editor-mode",
    "comment-body",
  );
  await expect(page.locator("#editor-contents-comment-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#preview-comment-body .markdown-preview")).toHaveAttribute(
    "class",
    /markdown-preview markdown-wrap comment-body/,
  );
  await expect(page.locator("#comment-form .temporaryUploadFiles")).toHaveAttribute(
    "name",
    "temporaryUploadFiles",
  );
  await expect(page.locator("#comment-form #upload.upload-wrap.content-footer")).toHaveAttribute(
    "data-resource-type",
    "ISSUE_COMMENT",
  );
  await expect(page.locator("#comment-form #upload .help.help-droppable")).toContainText(
    "Drag & Drop files to attach here or",
  );
  await expect(
    page.locator("#comment-form #upload .nbtn.medium.white.fake-file-wrap"),
  ).toContainText("File upload");
  await expect(page.locator("#comment-form #upload .yobicon-upload")).toHaveCount(1);
  await expect(page.locator("#comment-form #upload input.file[name=filePath]")).toHaveAttribute(
    "multiple",
    "",
  );
  await expect(page.locator("#comment-form #upload .plain")).toContainText("Click upload button");
  await expect(page.locator("#comment-form #upload .help.help-pastable")).toContainText(
    "Paste the clipboard image",
  );
  await expect(page.locator("#comment-form #upload .attached-files.unstyled")).toHaveCount(1);
  await expect(page.locator("#comment-form #upload .right-txt.help")).toContainText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator("script#tplAttachedFile")).toHaveAttribute(
    "type",
    "text/x-jquery-tmpl",
  );
  const attachedFileTemplate = await page
    .locator("script#tplAttachedFile")
    .evaluate((element) => element.textContent ?? "");
  expect(attachedFileTemplate).toContain('class="attached-file"');
  expect(attachedFileTemplate).toContain('data-id="${fileId}"');
  expect(attachedFileTemplate).toContain('class="progress upload-progress"');
  expect(attachedFileTemplate).toContain('class="bar orange"');
  expect(attachedFileTemplate).toContain('class="btn-transparent btn-delete pull-right"');
  expect(attachedFileTemplate).toContain('class="pull-right nbtn small white btn-insert"');
  expect(attachedFileTemplate).toContain("Click to post");
  await expect(page.locator("script#tplDropFilesHere")).toHaveAttribute(
    "type",
    "text/x-jquery-tmpl",
  );
  const dropFilesTemplate = await page
    .locator("script#tplDropFilesHere")
    .evaluate((element) => element.textContent ?? "");
  expect(dropFilesTemplate).toContain('class="upload-drop-here"');
  expect(dropFilesTemplate).toContain("Drag & Drop files here to upload.");
  await expect(page.locator("#comment-form #dynamic-comment-btn.ybtn.hidden")).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator("#comment-form .notification-receiver-title")).toContainText(
    "Notification receivers",
  );

  const commentForm = await layoutBox(page, "#comment-form");
  const writeCommentBox = await layoutBox(page, "#comment-form .write-comment-box");
  const editorTabs = await layoutBox(page, "#comment-form .nav.nav-tabs.nm.small");
  const editorTabContent = await layoutBox(page, "#comment-form .tab-content");
  const editTab = await layoutBox(page, "#comment-form #edit-comment-body");
  const textareaBox = await layoutBox(page, "#comment-form .textarea-box");
  const commentEditor = await layoutBox(page, "#editor-contents-comment-body");
  const uploadWrap = await layoutBox(page, "#comment-form .upload-wrap");
  const uploadAttachWrap = await layoutBox(page, "#comment-form .upload-wrap .attach-wrap");
  const uploadButtonWrap = await layoutBox(page, "#comment-form .upload-wrap .btn-wrap");
  const uploadFakeButton = await layoutBox(page, "#comment-form .fake-file-wrap");
  const uploadPlainText = await layoutBox(page, "#comment-form .upload-wrap .plain");
  const writeCommentWrap = await layoutBox(page, "#comment-form .write-comment-wrap");
  const submitButton = await layoutBox(page, "#comment-form .ybtn.ybtn-success[type=submit]");
  const commentFormStyles = await page.locator("#comment-form").evaluate((element) => {
    const writeBox = element.querySelector(".write-comment-box") as HTMLElement;
    const writeBoxStyle = window.getComputedStyle(writeBox);
    const textareaBoxElement = element.querySelector(".textarea-box") as HTMLElement;
    const textareaBoxStyle = window.getComputedStyle(textareaBoxElement);
    const textarea = element.querySelector("textarea.comment") as HTMLElement;
    const textareaStyle = window.getComputedStyle(textarea);
    const tabContent = element.querySelector(".tab-content") as HTMLElement;
    const tabContentStyle = window.getComputedStyle(tabContent);
    const editTab = element.querySelector("#edit-comment-body") as HTMLElement;
    const editTabStyle = window.getComputedStyle(editTab);
    const previewTab = element.querySelector("#preview-comment-body") as HTMLElement;
    const previewTabStyle = window.getComputedStyle(previewTab);
    const upload = element.querySelector(".upload-wrap") as HTMLElement;
    const uploadStyle = window.getComputedStyle(upload);
    const helpDroppable = element.querySelector(".help-droppable") as HTMLElement;
    const helpDroppableStyle = window.getComputedStyle(helpDroppable);
    const helpPastable = element.querySelector(".help-pastable") as HTMLElement;
    const helpPastableStyle = window.getComputedStyle(helpPastable);
    const attachWrap = element.querySelector(".attach-wrap") as HTMLElement;
    const attachWrapStyle = window.getComputedStyle(attachWrap);
    const buttonWrap = element.querySelector(".btn-wrap") as HTMLElement;
    const buttonWrapStyle = window.getComputedStyle(buttonWrap);
    const plain = element.querySelector(".upload-wrap .plain") as HTMLElement;
    const plainStyle = window.getComputedStyle(plain);
    const attachedFiles = element.querySelector(".attached-files") as HTMLElement;
    const attachedFilesStyle = window.getComputedStyle(attachedFiles);
    const dynamicButton = element.querySelector("#dynamic-comment-btn") as HTMLElement;
    const dynamicButtonStyle = window.getComputedStyle(dynamicButton);
    const notification = element.querySelector(".notification-receiver") as HTMLElement;
    const notificationStyle = window.getComputedStyle(notification);
    const notificationTitle = element.querySelector(".notification-receiver-title") as HTMLElement;
    const notificationTitleStyle = window.getComputedStyle(notificationTitle);
    return {
      dynamicButtonDisplay: dynamicButtonStyle.display,
      notificationBackgroundColor: notificationStyle.backgroundColor,
      notificationDisplay: notificationStyle.display,
      notificationPaddingLeft: notificationStyle.paddingLeft,
      notificationTitleColor: notificationTitleStyle.color,
      editTabDisplay: editTabStyle.display,
      previewTabDisplay: previewTabStyle.display,
      tabContentOverflow: tabContentStyle.overflow,
      tabContentPosition: tabContentStyle.position,
      textareaBorderBottomLeftRadius: textareaStyle.borderBottomLeftRadius,
      textareaBorderBottomRightRadius: textareaStyle.borderBottomRightRadius,
      textareaBoxPaddingRight: textareaBoxStyle.paddingRight,
      textareaFontSize: textareaStyle.fontSize,
      textareaHeight: textareaStyle.height,
      textareaMarginTop: textareaStyle.marginTop,
      textareaResize: textareaStyle.resize,
      uploadBackgroundColor: uploadStyle.backgroundColor,
      uploadBorderBottomLeftRadius: uploadStyle.borderBottomLeftRadius,
      uploadHelpDroppableDisplay: helpDroppableStyle.display,
      uploadHelpPastableDisplay: helpPastableStyle.display,
      uploadMarginBottom: uploadStyle.marginBottom,
      uploadPaddingTop: uploadStyle.paddingTop,
      uploadAttachedFilesBorderTopWidth: attachedFilesStyle.borderTopWidth,
      uploadAttachedFilesDisplay: attachedFilesStyle.display,
      uploadAttachTextAlign: attachWrapStyle.textAlign,
      uploadButtonWrapDisplay: buttonWrapStyle.display,
      uploadButtonWrapMarginLeft: buttonWrapStyle.marginLeft,
      uploadPlainDisplay: plainStyle.display,
      uploadPlainLineHeight: plainStyle.lineHeight,
      writeBoxPaddingBottom: writeBoxStyle.paddingBottom,
      writeBoxPaddingLeft: writeBoxStyle.paddingLeft,
    };
  });
  const uploaderTemplateStyles = await page.evaluate(() => {
    const host = document.createElement("div");
    host.className = "dragover";
    host.style.position = "relative";
    host.style.width = "320px";
    host.style.height = "120px";
    host.innerHTML =
      '<div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drop files here to attach them</div></div></div>';
    document.body.append(host);
    const overlay = host.querySelector(".upload-drop-here") as HTMLElement;
    const overlayStyle = window.getComputedStyle(overlay);
    const message = host.querySelector(".msg") as HTMLElement;
    const messageStyle = window.getComputedStyle(message);
    const result = {
      borderTopStyle: overlayStyle.borderTopStyle,
      borderTopWidth: overlayStyle.borderTopWidth,
      bottom: overlayStyle.bottom,
      display: overlayStyle.display,
      left: overlayStyle.left,
      messageColor: messageStyle.color,
      messageFontSize: messageStyle.fontSize,
      messageMarginTop: messageStyle.marginTop,
      pointerEvents: overlayStyle.pointerEvents,
      position: overlayStyle.position,
      right: overlayStyle.right,
      top: overlayStyle.top,
      zIndex: overlayStyle.zIndex,
    };
    host.remove();
    return result;
  });

  expect(writeCommentBox.x).toBeCloseTo(commentForm.x, 0);
  expect(writeCommentBox.y).toBeGreaterThanOrEqual(commentForm.y);
  expect(editorTabs.x).toBeGreaterThanOrEqual(writeCommentBox.x);
  expect(editorTabContent.y).toBeGreaterThan(editorTabs.y + editorTabs.height - 1);
  expect(editTab.y).toBeGreaterThanOrEqual(editorTabContent.y);
  expect(textareaBox.x).toBeCloseTo(editorTabs.x, 0);
  expect(commentEditor.x).toBeGreaterThanOrEqual(textareaBox.x);
  expect(commentEditor.y).toBeGreaterThan(editorTabs.y + editorTabs.height - 1);
  expect(uploadWrap.y).toBeGreaterThan(commentEditor.y + commentEditor.height - 1);
  expect(uploadAttachWrap.x).toBeGreaterThanOrEqual(uploadWrap.x);
  expect(uploadButtonWrap.x).toBeGreaterThan(uploadAttachWrap.x);
  expect(uploadFakeButton.x).toBeCloseTo(uploadButtonWrap.x, 0);
  expect(uploadPlainText.x).toBeGreaterThan(uploadFakeButton.x + uploadFakeButton.width - 1);
  expect(writeCommentWrap.y).toBeGreaterThan(uploadWrap.y + uploadWrap.height - 1);
  expect(submitButton.x).toBeGreaterThan(writeCommentWrap.x);
  expect(submitButton.y).toBeGreaterThanOrEqual(writeCommentWrap.y);
  expect(commentFormStyles).toEqual({
    dynamicButtonDisplay: "none",
    notificationBackgroundColor: "rgb(247, 247, 247)",
    notificationDisplay: "none",
    notificationPaddingLeft: "10px",
    notificationTitleColor: "rgb(153, 153, 153)",
    editTabDisplay: "block",
    previewTabDisplay: "none",
    tabContentOverflow: "visible",
    tabContentPosition: "relative",
    textareaBorderBottomLeftRadius: "3px",
    textareaBorderBottomRightRadius: "3px",
    textareaBoxPaddingRight: "14px",
    textareaFontSize: "13px",
    textareaHeight: "160px",
    textareaMarginTop: "0px",
    textareaResize: "vertical",
    uploadBackgroundColor: "rgb(239, 239, 239)",
    uploadBorderBottomLeftRadius: "5px",
    uploadHelpDroppableDisplay: "inline",
    uploadHelpPastableDisplay: "none",
    uploadMarginBottom: "10px",
    uploadPaddingTop: "10px",
    uploadAttachedFilesBorderTopWidth: "1px",
    uploadAttachedFilesDisplay: "none",
    uploadAttachTextAlign: "center",
    uploadButtonWrapDisplay: "inline-block",
    uploadButtonWrapMarginLeft: "5px",
    uploadPlainDisplay: "inline-block",
    uploadPlainLineHeight: "30px",
    writeBoxPaddingBottom: "15px",
    writeBoxPaddingLeft: "54px",
  });
  expect(uploaderTemplateStyles).toEqual({
    borderTopStyle: "dashed",
    borderTopWidth: "3px",
    bottom: "2px",
    display: "block",
    left: "2px",
    messageColor: "rgb(153, 153, 153)",
    messageFontSize: "26px",
    messageMarginTop: "-13px",
    pointerEvents: "none",
    position: "absolute",
    right: "2px",
    top: "2px",
    zIndex: "9999",
  });

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
