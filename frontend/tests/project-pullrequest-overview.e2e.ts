import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PULL_REQUEST_OVERVIEW = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="board-header issue"><div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div><div class="title"><strong class="board-id">#9</strong> Initial title</div></div><div class="pull-right"><a id="btnAccept" href="__BASE_PATH__/admin/sample/pullRequest/9/accept" data-request-method="post" class="ybtn ybtn-success">Merge</a></div><ul class="nav nav-tabs nm"><li class="active"><a href="__BASE_PATH__/admin/sample/pullRequest/9">Overview</a></li><li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes">Changes</a></li></ul><div class="board-body"><div class="author-info left-txt" style="margin-top:20px"><a href="__BASE_PATH__/dev" class="usf-group pull-left"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a><div class="pullRequest-branchInfo"><i class="yobicon-branch ml0"></i><code class="from" data-toggle="tooltip" data-original-title="From"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/feature%2Fui" class="branchName">feature/ui</a></code><i class="yobicon-right-2 ml10"></i><code class="to" data-toggle="tooltip" data-original-title="To"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/main" class="branchName">main</a></code></div></div><div class="content markdown-wrap"><p>Initial body</p></div><div class="attachments" data-attachments="[]"></div></div><div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div><div class="board-footer board-actrow"><div class="pull-left"><button id="watch-button" type="button" class="ybtn" data-toggle="button" data-watching="false">Watch</button></div><div class="mr5" style="display:inline-block"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a><a data-request-method="post" href="__BASE_PATH__/admin/sample/pullRequest/9/close" class="ybtn">Close</a></div></div><hr class="nm"><div class="board-comment-wrap"></div><div class="right-txt"><a href="#helpMessage" class="ybtn ybtn-inverse ybtn-mini" data-toggle="modal">Help</a></div></div></div><div id="helpMessage" class="modal hide fade pullreq-info"><div class="modal-header"><h5>You can check commits and descriptions on received code.</h5></div><div class="modal-body"><div class="row-fluid"><div class="pull-left"><img class="img-polaroid" src="/assets/images/fork-pull/merge.jpg"><br></div><div class="pull-left help-messages mt10"><p>If members of the original project accept the code, it will be merged into the original project.</p><p>You can't accept code if the code is not safe to merge.</p><p>When you can't accept code, you may postpone or delete the pull request.</p></div></div></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-small" data-dismiss="modal">Confirm</button></div></div>
`;

const EXPECTED_PULL_REQUEST_COMMIT_EVENT = `<div class="board-comment-wrap"><ul class="comments" id="comments"><li class="event" id="comment-94"><span class="state changed">Committed</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> has committed.<span class="date"><a href="#event-94" title="Jul 3, 2026">Jul 3, 2026</a></span><a href="__BASE_PATH__/admin/sample/compare/basehash...headhash" class="ybtn ybtn-mini">Additional changes</a><ul class="commit-list"><li class="comment-body commit-info outdated"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/1234567890abcdef" class="commit-id">1234567</a><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small hide-in-mobile"><div class="date hide-in-mobile" title="Jul 3, 2026">Jul 3, 2026</div><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/1234567890abcdef" class="commitMsg short">Fix login</a></li><li class="comment-body commit-info"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890" class="commit-id">abcdef1</a><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small hide-in-mobile"><div class="date hide-in-mobile" title="Jul 4, 2026">Jul 4, 2026</div><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890" class="commitMsg short">Add UI</a></li></ul></li></ul></div>`;

const EXPECTED_PULL_REQUEST_OVERVIEW_WITH_COMMIT_EVENT = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="board-comment-wrap"></div>`,
  EXPECTED_PULL_REQUEST_COMMIT_EVENT,
);

test("project pull request overview matches legacy git/view.scala.html empty-event DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page);

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator(".board-header.issue .title")).toContainText("#9 Initial title");
  await expect(page.locator("#state .alert-success")).toContainText(
    "This pull request can be merged safely.",
  );
  await expect(page.locator("#btnAccept")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/accept`,
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_OVERVIEW.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview renders legacy commit-changed event DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    events: [
      {
        commits: [
          {
            authorDateLabel: "Jul 3, 2026",
            authorEmail: "dev@example.com",
            commitId: "1234567890abcdef",
            commitMessage: "Fix login",
            commitShortId: "1234567",
            state: "PRIOR",
          },
          {
            authorDateLabel: "Jul 4, 2026",
            authorEmail: "dev@example.com",
            commitId: "abcdef1234567890",
            commitMessage: "Add UI",
            commitShortId: "abcdef1",
            state: "CURRENT",
          },
        ],
        createdLabel: "Jul 3, 2026",
        eventType: "PULL_REQUEST_COMMIT_CHANGED",
        id: 94,
        newValue: "123,124",
        oldValue: "basehash,headhash",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_OVERVIEW_WITH_COMMIT_EVENT.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

async function mockPullRequestOverview(page: Page, options: { events?: unknown[] } = {}) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/9", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
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
        events: options.events ?? [],
        fromBranch: "feature/ui",
        fromOwnerName: "admin",
        fromProjectName: "sample",
        id: 90,
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
      }),
    });
  });
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
