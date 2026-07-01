import { expect, test, type Page } from "@playwright/test";

const EXPECTED_ISSUE_DETAIL = `
<div class="page-wrap-outer"><div class="project-page-wrap board-view"><div class="board-header issue"><div class="pull-right mr10 mt10 hide-in-mobile"><div class="date" title="Jul 1, 2026">Jul 1, 2026</div><span class="badge badge-issue-open">Open</span></div><div class="title"><strong class="board-id">11</strong>Fix flaky issue<span class="favorite-issue" data-issue-id="42"><i class="star material-icons va-text-top">star</i></span><div class="pull-right hide show-in-mobile" style="font-size:0.7em"><span class="date" title="Jul 1, 2026">Jul 1, 2026</span><span class="badge badge-small badge-issue-open">Open</span></div></div></div><div class="board-body row-fluid"><div class="span9 span-left-pane"><div class="author-info"><a href="__BASE_PATH__/dev" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></div><div id="issue-11" class="hide"><form action="__BASE_PATH__/api/v1/projects/admin/sample/issues/11/content"><textarea>Body **markdown**</textarea></form></div><div id="issue-body-11"><div class="content markdown-wrap" data-allowed-update="true"><p>Body <strong>markdown</strong></p></div></div><div class="attachments" id="attachments" data-attachments="[]"></div><div class="board-actrow right-txt"><div class="pull-left"><div><button id="watch-button" type="button" class="ybtn " data-toggle="tooltip" data-placement="top" title="Watch this issue" data-watching="false">Watch</button><button id="issue-share-button" type="button" class="ybtn" data-toggle="popover" data-trigger="hover" data-placement="top" data-content="Share this issue">Share issue</button><span class="project-btn-item hide show-in-mobile-inline ml4"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></span><span class="issue-weight"><span class="divider">|</span><button id="upvote-issue-weight" class="ybtn ybtn-small" data-toggle="tooltip" title="Issue weight: Upvote"><i class="yobicon-arrow-up-alt"></i></button><button class="ybtn ybtn-small" id="down-vote-issue-weight" data-toggle="tooltip" title="Issue weight: Down vote"><i class="yobicon-arrow-down-alt"></i></button><span class="weight-number" data-toggle="popover" data-trigger="hover" data-placement="top" data-content="Issue weight description">2</span></span></div></div><div id="vote" class="vote-wrap voter-exists"><a href="__BASE_PATH__/admin/sample/issue/11/vote" class="" title="Vote this issue" data-request-method="post" data-toggle="tooltip"><span class="heart"><i class="yobicon-hearts"></i></span></a><div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div></div><div id="voters" class="modal hide voters-dialog"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h5 class="nm">Issue Voters</h5></div><div class="modal-body"><ul class="unstyled"><li><a href="__BASE_PATH__/admin" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></li><li><a href="__BASE_PATH__/dev" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></li></ul></div><div class="modal-footer"><button id="copyEmailBtn" class="ybtn ybtn-info ybtn-small" data-clipboard-text="Site Admin <admin@example.com>;Dev Member <dev@example.com>;">Copy email</button><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal" aria-hidden="true">Close</button></div></div><span class="act-row"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="Edit"><i class="yobicon-edit-2"></i></button><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></span></div><dl class="sharer-list hideFromDisplayOnly"><dt class="issue-share-title mb10">Issue Sharer <span class="num issue-sharer-count"></span></dt><dd id="sharer-list" class="hideFromDisplayOnly"><input type="hidden" class="bigdrop width100p" id="issueSharer" name="issueSharer" placeholder="Select sharer" value="" title=""></dd></dl><div class="watcher-list"></div><div class="subtasks"></div><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div><div class="span3 span-right-pane mb20"><div class="issue-info"><form id="issueUpdateForm" action="__BASE_PATH__/admin/sample/issues" method="post"><input type="hidden" name="issues[0].id" value="42"><dl><dd class="project-btn-item"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></dd><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="admin" style="width:100%" title=""></dd></dl><dl><dt>Milestone</dt><dd><a href="__BASE_PATH__/admin/sample/milestone/5">v1.0</a></dd></dl><dl><dt>Due date<span class="duedate-status "></span></dt><dd><div class="search search-bar"><input type="text" name="dueDate" value="Jul 5, 2026" class="textbox full" autocomplete="off" data-toggle="calendar"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-toggle="select2" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false" selected="">bug</option></optgroup></select></dd></dl><div class="act-row right-menu-icons"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="Edit"><i class="yobicon-edit-2"></i></button><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></div></form><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div></div></div><div><input type="hidden" id="issueBodyChecksum" value="body-sha1"><input type="hidden" id="numOfComments" value="0"><input type="hidden" id="issueUpdateDate" value="1782892800000"></div><div class="board-footer"></div></div><div id="deleteConfirm" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete issue</h3></div><div class="modal-body"><p>Are you sure you want to delete this post?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-danger" data-request-method="delete" data-request-uri="__BASE_PATH__/admin/sample/issue/11">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div></div>
`;

test("project issue detail matches legacy issue/view.scala.html voter state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Issue");
  await expect(page.locator("#vote.voter-exists")).toBeVisible();
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(1);
  await expect(page.locator("#copyEmailBtn")).toHaveAttribute(
    "data-clipboard-text",
    "Site Admin <admin@example.com>;Dev Member <dev@example.com>;",
  );
  await expect(page.locator("#labelIds")).toHaveAttribute("data-close-on-select", "false");

  const expected = EXPECTED_ISSUE_DETAIL.replaceAll("__BASE_PATH__", basePath).replaceAll(
    ' aria-hidden="true"',
    "",
  );
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

async function mockProjectIssueDetail(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
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
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/11", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assigneeLoginId: "admin",
        assigneeLabel: "Site Admin",
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        bodyChecksum: "body-sha1",
        bodyHtml: "<p>Body <strong>markdown</strong></p>",
        bodyMarkdown: "Body **markdown**",
        childClosedCount: 0,
        childIssues: [],
        childOpenCount: 0,
        commentCount: 0,
        comments: [],
        createdLabel: "Jul 1, 2026",
        dueDateLabel: "Jul 5, 2026",
        hasVoted: false,
        issueId: 42,
        issueNumber: 11,
        issueUpdateMillis: 1782892800000,
        issueVoters: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            emailAddress: "admin@example.com",
            loginId: "admin",
            userId: 1,
            userLabel: "Site Admin",
          },
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            emailAddress: "dev@example.com",
            loginId: "dev",
            userId: 2,
            userLabel: "Dev Member",
          },
        ],
        isDraft: false,
        isFavorited: false,
        isWatching: false,
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
        milestoneId: 5,
        milestoneTitle: "v1.0",
        ownerName: "admin",
        parentIssueId: null,
        projectName: "sample",
        sharers: [],
        state: "open",
        timeline: [],
        title: "Fix flaky issue",
        viewerCanComment: true,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viewerUserId: 1,
        voterCount: 2,
        watcherCount: 0,
        weight: 2,
      }),
    });
  });
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

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
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

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
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
