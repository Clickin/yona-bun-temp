import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PULL_REQUEST_CHANGES = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="board-header issue"><div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div><div class="title"><strong class="board-id">#9</strong> Initial title</div></div><div class="pull-right"><a id="btnAccept" href="__BASE_PATH__/admin/sample/pullRequest/9/accept" data-request-method="post" class="ybtn ybtn-success">Merge</a></div><ul class="nav nav-tabs nm"><li><a href="__BASE_PATH__/admin/sample/pullRequest/9">Overview</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes">Changes</a></li></ul><div class="board-body mb20"><div class="author-info right-txt" style="margin-top:20px"><a href="__BASE_PATH__/dev" class="usf-group pull-left"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a><div class="pullRequest-branchInfo"><i class="yobicon-branch ml0"></i><code class="from" data-toggle="tooltip" data-original-title="From"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/feature%2Fui" class="branchName">feature/ui</a></code><i class="yobicon-right-2 ml10"></i><code class="to" data-toggle="tooltip" data-original-title="To"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/main" class="branchName">main</a></code></div></div></div><div class="codediff-wrap mt10 diffs-only"><div id="changes" class="diffs-wrap"><div id="commits" class="btn-group auto mb10"><button class="btn dropdown-toggle auto" data-toggle="dropdown"><span class="d-label">All commit changes</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="All"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes">All commit changes</a></li><li class="divider"></li></ul></div><div class="diff-body diffs-wrap-scroll"><div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div><div class="btnPop"><button type="button" class="ybtn ybtn-info ybtn-small"><i class="yobicon-post2"></i></button></div></div><div class="board-comment-wrap"><div class="non-ranged-threads-wrap"></div><form id="comment-form" action="__BASE_PATH__/admin/sample/pullRequest/90/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-comment" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-comment" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-comment" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" id="editor-contents-comment" markdown="true"></textarea></div></div><div id="preview-comment" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers</span><span class="notification-receiver-list"></span></div></div></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form></div><div id="review-form" class="review-form"><form action="__BASE_PATH__/admin/sample/pullRequest/90/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="write-comment-wrap"><div class="pull-right"><button type="button" class="ybtn ybtn-default ybtn-small" data-toggle="close">×</button></div><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-review" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-review" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-review" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-review" markdown="true"></textarea></div></div><div id="preview-review" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers</span><span class="notification-receiver-list"></span></div></div></div><div class="upload-wrap content-footer" data-resource-type="REVIEW_COMMENT"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><div class="right-txt"><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div></div></div></div></div>
`;

const SELECTED_COMMIT_ID = "abcdef1234567890";

const SELECTED_COMMIT = {
  authorDateLabel: "Jul 4, 2026",
  authorEmail: "dev@example.com",
  commitId: SELECTED_COMMIT_ID,
  commitMessage: "Add UI\n\nDetails",
  commitShortId: "abcdef1",
  state: "CURRENT",
};

const PRIOR_COMMIT_ID = "1234567890abcdef";

const PRIOR_COMMIT = {
  authorDateLabel: "Jul 3, 2026",
  authorEmail: "old@example.com",
  commitId: PRIOR_COMMIT_ID,
  commitMessage: "Old UI\n\nDetails",
  commitShortId: "1234567",
  state: "PRIOR",
};

const EXPECTED_PULL_REQUEST_SELECTED_CHANGE = EXPECTED_PULL_REQUEST_CHANGES.replace(
  `<span class="d-label">All commit changes</span>`,
  `<span class="d-label"><strong class="blue-txt mr10 commit-hash">abcdef1</strong><span>Add UI</span></span>`,
)
  .replace(
    `<li class="divider"></li></ul>`,
    `<li class="divider"></li><li data-value="abcdef1234567890"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890"><strong class="blue-txt mr10 commit-hash">abcdef1</strong><span>Add UI</span></a></li></ul>`,
  )
  .replace(
    `<div class="diff-body diffs-wrap-scroll">`,
    `<p class="commitInfo"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>dev@example.com</strong><span class="ago" title="Jul 4, 2026">Jul 4, 2026</span></p><pre class="commitMsg mt5">Add UI\n\nDetails</pre><div class="diff-body diffs-wrap-scroll">`,
  )
  .replaceAll(
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments"`,
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments?commitId=abcdef1234567890"`,
  );

const EXPECTED_PULL_REQUEST_PRIOR_CHANGE = EXPECTED_PULL_REQUEST_CHANGES.replace(
  `<span class="d-label">All commit changes</span>`,
  `<span class="d-label"><strong class="blue-txt mr10 commit-hash">1234567</strong><span>Old UI (Outdated)</span></span>`,
)
  .replace(
    `<li class="divider"></li></ul>`,
    `<li class="divider"></li><li data-value="abcdef1234567890"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890"><strong class="blue-txt mr10 commit-hash">abcdef1</strong><span>Add UI</span></a></li></ul>`,
  )
  .replace(
    `<div class="diff-body diffs-wrap-scroll">`,
    `<p class="commitInfo"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong>old@example.com</strong><span class="ago" title="Jul 3, 2026">Jul 3, 2026</span></p><pre class="commitMsg mt5">Old UI\n\nDetails</pre><div class="diff-body diffs-wrap-scroll">`,
  )
  .replaceAll(
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments"`,
    `action="__BASE_PATH__/admin/sample/pullRequest/90/comments?commitId=1234567890abcdef"`,
  );

const REVIEW_THREAD = {
  authorAvatarUrl: "/assets/images/default-avatar-32.png",
  authorId: 2,
  authorLabel: "Dev Member",
  authorLoginId: "dev",
  comments: [
    {
      attachments: [],
      authorId: 2,
      authorLabel: "Dev Member",
      authorLoginId: "dev",
      canDelete: false,
      canUpdate: false,
      contentsHtml: "<p>Review note</p>",
      contentsMarkdown: "Review note",
      createdLabel: "Jul 5, 2026",
      id: 701,
      threadId: 91,
      viaEmail: false,
    },
    {
      attachments: [],
      authorId: 1,
      authorLabel: "Site Admin",
      authorLoginId: "admin",
      canDelete: false,
      canUpdate: false,
      contentsHtml: "<p>Follow up</p>",
      contentsMarkdown: "Follow up",
      createdLabel: "Jul 6, 2026",
      id: 702,
      threadId: 91,
      viaEmail: false,
    },
  ],
  commitId: "abcdef1234567890",
  createdLabel: "Jul 5, 2026",
  endLine: 2,
  endSide: "B",
  id: 91,
  path: "src/main.rs",
  prevCommitId: "1234567890abcdef",
  pullRequestNumber: 9,
  startLine: 2,
  startSide: "B",
  state: "open",
};

const EXPECTED_PULL_REQUEST_REVIEW_CARD = EXPECTED_PULL_REQUEST_CHANGES.replace(
  `class="codediff-wrap mt10 diffs-only"`,
  `class="codediff-wrap mt10"`,
)
  .replace(
    `<div id="changes" class="diffs-wrap">`,
    `<button type="button" class="ybtn ybtn-default btn-show-reviewcards"><i class="yobicon-restore"></i></button><div id="changes" class="diffs-wrap">`,
  )
  .replace(
    `</div></div></div></div></div></div>`,
    `</div></div><div class="review-wrap"><div class="review-container"><button type="button" class="ybtn ybtn-default btn-hide-reviewcards"><i class="yobicon-maximize"></i></button><ul class="nav nav-tabs" style="margin-bottom:10px"><li class="active"><a href="#reviewcards-open" data-toggle="tab">Open1</a></li><li><a href="#reviewcards-closed" data-toggle="tab">Closed0</a></li></ul><div class="tab-content review-list"><div id="reviewcards-open" class="tab-pane active"><a href="#thread-91" class="review-card open"><p class="content">Review note</p><p class="info"><span class="comments pull-left"><i class="yobicon-comments"></i>1</span><span class="outdated-label">Outdated</span><span class="date" title="Jul 5, 2026">Jul 5, 2026</span><span class="avatar-wrap smaller ml5"><img src="/assets/images/default-avatar-32.png"></span></p></a></div><div id="reviewcards-closed" class="tab-pane"></div></div></div></div></div></div></div></div>`,
  );

const NON_RANGED_THREAD = {
  ...REVIEW_THREAD,
  comments: [
    {
      attachments: [],
      authorId: 2,
      authorLabel: "Dev Member",
      authorLoginId: "dev",
      canDelete: false,
      canUpdate: false,
      contentsHtml: "<p>General note</p>",
      contentsMarkdown: "General note",
      createdLabel: "Jul 7, 2026",
      id: 801,
      threadId: 92,
      viaEmail: false,
    },
  ],
  createdLabel: "Jul 7, 2026",
  id: 92,
  path: "",
};

const EXPECTED_PULL_REQUEST_NON_RANGED_THREAD_HTML = `<div id="thread-92" class="comment-thread-wrap open"><div class="btn-thread-here btn-thread-minimize"><button type="button" class="ybtn ybtn-default ybtn-small"><i class="yobicon-comments"></i></button></div><ul class="comments"><li id="comment-801" class="comment"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author pull-left"><a href="__BASE_PATH__/dev" data-toggle="tooltip" data-placement="top" title="Dev Member"><strong>dev </strong></a></span><span class="ago"><a href="#comment-801" title="Jul 7, 2026">Jul 7, 2026</a></span></div><div id="comment-body-801"><div class="comment-body markdown-wrap" data-via-email="false"><p>General note</p></div><div class="attachments" data-attachments="[]"></div></div></div></li></ul><div class="write-comment-form"><form action="__BASE_PATH__/admin/sample/pullRequest/90/comments?commitId=abcdef1234567890" method="post" enctype="multipart/form-data" class="review-form" style="display:block"><input type="hidden" name="thread.id" value="92"><div class="write-comment-box"><div class="write-comment-wrap"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-thread-92" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-thread-92" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-thread-92" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="code-review-body" id="editor-contents-thread-92" markdown="true"></textarea></div></div><div id="preview-thread-92" class="tab-pane"><div class="markdown-preview markdown-wrap code-review-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers</span><span class="notification-receiver-list"></span></div></div></div><div class="upload-wrap content-footer" data-resource-type="REVIEW_COMMENT"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><div class="right-txt"><button type="button" data-request-method="post" data-request-uri="__BASE_PATH__/threads/92/close" class="ybtn ybtn-default ybtn-small">Close</button><button type="submit" class="ybtn ybtn-success ybtn-small">Add a comment</button></div></div></div></form></div></div>`;

const EXPECTED_PULL_REQUEST_NON_RANGED_THREAD = EXPECTED_PULL_REQUEST_REVIEW_CARD.replace(
  `<div class="non-ranged-threads-wrap"></div>`,
  `<div class="non-ranged-threads-wrap">${EXPECTED_PULL_REQUEST_NON_RANGED_THREAD_HTML}</div>`,
)
  .replace(`href="#thread-91"`, `href="#thread-92"`)
  .replace(`<p class="content">Review note</p>`, `<p class="content">General note</p>`)
  .replace(`title="Jul 5, 2026">Jul 5, 2026`, `title="Jul 7, 2026">Jul 7, 2026`)
  .replace(`<span class="comments pull-left"><i class="yobicon-comments"></i>1</span>`, ``);

test("project pull request changes matches legacy git/viewChanges.scala.html empty diff DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page);

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page.locator(".code-browse-wrap > .nav-tabs.nm li.active a")).toHaveText("Changes");
  await expect(page.locator(".codediff-wrap")).toHaveClass(/diffs-only/u);
  await expect(page.locator("#commits .d-label")).toHaveText("All commit changes");

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_CHANGES.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request selected commit changes matches legacy git/viewChanges.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    commits: [SELECTED_COMMIT],
    expectedCommitId: SELECTED_COMMIT_ID,
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/${SELECTED_COMMIT_ID}`);
  await expect(page.locator("#commits .d-label .commit-hash")).toHaveText("abcdef1");
  await expect(page.locator(".commitInfo .ago")).toHaveAttribute("title", "Jul 4, 2026");
  await expect(page.locator("#comment-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/pullRequest/90/comments?commitId=${SELECTED_COMMIT_ID}`,
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_SELECTED_CHANGE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request prior commit changes matches legacy outdated dropdown DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    commits: [SELECTED_COMMIT, PRIOR_COMMIT],
    expectedCommitId: PRIOR_COMMIT_ID,
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes/${PRIOR_COMMIT_ID}`);
  await expect(page.locator("#commits .d-label")).toContainText("Old UI (Outdated)");
  await expect(
    page.locator("#commits .dropdown-menu li[data-value='1234567890abcdef']"),
  ).toHaveCount(0);

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_PRIOR_CHANGE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request changes renders legacy review cards when threads exist", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, { cardThreads: [REVIEW_THREAD], threads: [REVIEW_THREAD] });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page.locator(".codediff-wrap")).not.toHaveClass(/diffs-only/u);
  await expect(page.locator(".btn-show-reviewcards")).toHaveCount(1);
  await expect(page.locator("#reviewcards-open .review-card.open")).toHaveAttribute(
    "href",
    "#thread-91",
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_REVIEW_CARD.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request changes renders legacy non-ranged thread DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestChanges(page, {
    cardThreads: [NON_RANGED_THREAD],
    nonRangedThreads: [NON_RANGED_THREAD],
    threads: [NON_RANGED_THREAD],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page.locator(".non-ranged-threads-wrap #thread-92")).toHaveCount(1);
  await expect(page.locator("#thread-92 .write-comment-form")).toHaveCount(1);

  expect(await canonicalizeAll(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_NON_RANGED_THREAD.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

async function mockPullRequestChanges(
  page: Page,
  options: {
    cardThreads?: unknown[];
    commits?: unknown[];
    expectedCommitId?: string;
    nonRangedThreads?: unknown[];
    threads?: unknown[];
  } = {},
) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/changes**",
    async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get("commitId") ?? "").toBe(options.expectedCommitId ?? "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          cardThreads: options.cardThreads ?? [],
          commits: options.commits ?? [],
          files: [],
          inlineThreads: [],
          nonRangedThreads: options.nonRangedThreads ?? [],
          pullRequest: pullRequestDetail(),
          threads: options.threads ?? [],
        }),
      });
    },
  );
}

function pullRequestDetail() {
  return {
    attachments: [],
    bodyHtml: "<p>Initial body</p>",
    bodyMarkdown: "Initial body",
    commits: [],
    conflict: false,
    contributor: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "dev",
      userId: 2,
      userLabel: "Dev Member",
    },
    createdLabel: "Jul 2, 2026",
    events: [],
    fromBranch: "feature/ui",
    fromOwnerName: "admin",
    fromProjectName: "sample",
    id: 90,
    isMerging: false,
    isWatching: false,
    lackingReviewerCount: 0,
    mergedCommitIdFrom: "",
    mergedCommitIdTo: "",
    ownerName: "admin",
    permissions: {
      canComment: true,
      canDeleteSourceBranch: false,
      canRead: true,
      canReadChanges: true,
      canReview: true,
      canRestoreSourceBranch: false,
      canUpdate: true,
      canUpdateState: true,
      canWatch: true,
    },
    projectName: "sample",
    pullRequestNumber: 9,
    receiver: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "admin",
      userId: 1,
      userLabel: "Site Admin",
    },
    requiredReviewerCount: 0,
    reviewed: false,
    reviewers: [],
    sourceBranchExists: true,
    state: "open",
    threads: [],
    title: "Initial title",
    toBranch: "main",
    updatedLabel: "Jul 2, 2026",
    watcherCount: 0,
  };
}

async function canonicalizeAll(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((roots) => {
    return roots.map(visit).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      return attr.name === "style" ? value.replace(/\s+/gu, "") : value;
    }

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  });
}

async function canonicalizeHtmlAll(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return Array.from(template.content.children).map(visit).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      return attr.name === "style" ? value.replace(/\s+/gu, "") : value;
    }

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  }, html);
}
