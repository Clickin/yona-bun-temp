import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const EXPECTED_PULL_REQUEST_OVERVIEW = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="board-header issue"><div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div><div class="title"><strong class="board-id">#9</strong> Initial title</div></div><div class="pull-right"><button id="btnAccept" type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/accept" class="ybtn ybtn-success">Merge</button></div><ul class="nav nav-tabs nm"><li class="active"><a href="__BASE_PATH__/admin/sample/pullRequest/9">Overview</a></li><li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes">Changes</a></li></ul><div class="board-body"><div class="author-info left-txt" style="margin-top:20px"><a href="__BASE_PATH__/dev" class="usf-group pull-left"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a><div class="pullRequest-branchInfo"><i class="yobicon-branch ml0"></i><code class="from" data-toggle="tooltip" data-original-title="From"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/feature%2Fui" class="branchName">feature/ui</a></code><i class="yobicon-right-2 ml10"></i><code class="to" data-toggle="tooltip" data-original-title="To"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/main" class="branchName">main</a></code></div></div><div class="content markdown-wrap"><p>Initial body</p></div><div class="attachments" data-attachments="[]"></div></div><div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div><div class="board-footer board-actrow"><div class="pull-left"><button id="watch-button" type="button" class="ybtn" data-toggle="button" data-watching="false">Watch</button></div><div class="mr5" style="display:inline-block"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a><button type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/close" class="ybtn">Close</button></div></div><hr class="nm"><div class="board-comment-wrap"></div><div class="right-txt"><button type="button" class="ybtn ybtn-inverse ybtn-mini" data-toggle="modal" data-target="#helpMessage">Help</button></div></div></div><div id="helpMessage" class="modal hide fade pullreq-info"><div class="modal-header"><h5>You can check commits and descriptions on received code.</h5></div><div class="modal-body"><div class="row-fluid"><div class="pull-left"><img class="img-polaroid" src="/assets/images/fork-pull/merge.jpg"><br></div><div class="pull-left help-messages mt10"><p>If members of the original project accept the code, it will be merged into the original project.</p><p>You can't accept code if the code is not safe to merge.</p><p>When you can't accept code, you may postpone or delete the pull request.</p></div></div></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-small" data-dismiss="modal">Confirm</button></div></div>
`;

const EXPECTED_PULL_REQUEST_COMMIT_EVENT = `<div class="board-comment-wrap"><ul class="comments" id="comments"><li class="event" id="comment-94"><span class="state changed">Committed</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> has committed.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-94" title="Jul 3, 2026">Jul 3, 2026</a></span><a href="__BASE_PATH__/admin/sample/compare/basehash...headhash" class="ybtn ybtn-mini">Additional changes</a><ul class="commit-list"><li class="comment-body commit-info outdated"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/1234567890abcdef" class="commit-id">1234567</a><a href="__BASE_PATH__/dev" class="avatar-wrap small hide-in-mobile" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"> dev@example.com</a><div class="date hide-in-mobile" title="Jul 3, 2026">Jul 3, 2026</div><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/1234567890abcdef" class="commitMsg short">Fix login</a></li><li class="comment-body commit-info"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890" class="commit-id">abcdef1</a><a href="__BASE_PATH__/dev" class="avatar-wrap small hide-in-mobile" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"> dev@example.com</a><div class="date hide-in-mobile" title="Jul 4, 2026">Jul 4, 2026</div><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890" class="commitMsg short">Add UI</a></li></ul></li></ul></div>`;

const EXPECTED_PULL_REQUEST_OVERVIEW_WITH_COMMIT_EVENT = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="board-comment-wrap"></div>`,
  EXPECTED_PULL_REQUEST_COMMIT_EVENT,
);

const EXPECTED_PULL_REQUEST_STATE_EVENTS = `<div class="board-comment-wrap"><ul class="comments" id="comments"><li class="event" id="comment-101"><span class="state changed">Approve</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> completed a pull request review.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-101" title="Jul 5, 2026">Jul 5, 2026</a></span></li><li class="event" id="comment-102"><span class="state changed">Cancel review</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> withdrew a pull request review.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-102" title="Jul 6, 2026">Jul 6, 2026</a></span></li><li class="event" id="comment-103"><span class="state closed">Closed</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> closed this pull request.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-103" title="Jul 7, 2026">Jul 7, 2026</a></span></li><li class="event" id="comment-104"><span class="state merged">Merged</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> merged commit (<a class="link" href="__BASE_PATH__/admin/sample/commit/mergedcommit123456" title="View commit">mergedc</a>)<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-104" title="Jul 8, 2026">Jul 8, 2026</a></span></li><li class="event" id="comment-105"><span class="state merged">Merged</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> merged commit ({1})<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-105" title="Jul 9, 2026">Jul 9, 2026</a></span></li></ul></div>`;

const EXPECTED_PULL_REQUEST_OVERVIEW_WITH_STATE_EVENTS = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="board-comment-wrap"></div>`,
  EXPECTED_PULL_REQUEST_STATE_EVENTS,
);

const EXPECTED_PULL_REQUEST_CONFLICT_RESOLVED_EVENTS = `<div class="board-comment-wrap"><ul class="comments" id="comments"><li class="event" id="comment-106"><span class="state conflict">Conflicted</span>A conflict has occurred.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-106" title="Jul 10, 2026">Jul 10, 2026</a></span></li><li class="event" id="comment-107"><span class="state resolved">Resolved</span>The conflict has been resolved.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-107" title="Jul 11, 2026">Jul 11, 2026</a></span></li></ul></div>`;

const EXPECTED_PULL_REQUEST_OVERVIEW_WITH_CONFLICT_RESOLVED_EVENTS =
  EXPECTED_PULL_REQUEST_OVERVIEW.replace(
    `<div class="board-comment-wrap"></div>`,
    EXPECTED_PULL_REQUEST_CONFLICT_RESOLVED_EVENTS,
  );

const EXPECTED_PULL_REQUEST_OPEN_THREAD_BADGE = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes">Changes</a></li>`,
  `<li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes">Changes<span class="num-badge">1</span></a></li>`,
);

const EXPECTED_PULL_REQUEST_MARKDOWN_BODY = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="content markdown-wrap"><p>Initial body</p></div>`,
  `<div class="content markdown-wrap"><p>Initial <strong>markdown</strong> body</p></div>`,
);

const EXPECTED_PULL_REQUEST_ATTACHMENTS_DATA = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="attachments" data-attachments="[]"></div>`,
  `<div class="attachments" data-attachments='[{"id":11,"mimeType":"image/png","name":"review-note.png","size":1234,"sizeLabel":"1.2 KB","url":"__BASE_PATH__/files/11"}]'></div>`,
);

const EXPECTED_PULL_REQUEST_NO_WATCH_BUTTON = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-left"><button id="watch-button" type="button" class="ybtn" data-toggle="button" data-watching="false">Watch</button></div>`,
  `<div class="pull-left"></div>`,
);

const EXPECTED_PULL_REQUEST_REVIEWER_CONTROLS = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-right"><button id="btnAccept" type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/accept" class="ybtn ybtn-success">Merge</button></div>`,
  `<div class="pull-right"><div id="reviewers" style="display:inline-block; margin-right:5px;"><span style="font-size: 13px; vertical-align: middle; margin: 0px 10px;"><strong>2</strong> participants</span><a href="__BASE_PATH__/admin" class="usf-group" data-toggle="tooltip" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a></div><button type="button" data-request-method="post" class="ybtn ybtn-default" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/unreview">Cancel review</button><button id="btnAccept" type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/accept" class="ybtn ybtn-success">Merge</button></div>`,
);

const EXPECTED_PULL_REQUEST_CONFLICT_STATE = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div>`,
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-conflict">Conflict</span></div>`,
)
  .replace(
    `<div class="pull-right"><button id="btnAccept" type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/accept" class="ybtn ybtn-success">Merge</button></div>`,
    `<div class="pull-right"><button type="button" class="ybtn ybtn-disabled" data-toggle="tooltip" data-placement="top" title="There are conflicts.">Merge</button></div>`,
  )
  .replace(
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div>`,
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-error"><i class="yobicon-error mr5"></i><span>A conflict occurred when merging. This pull request cannot be merged safely.</span></div></div>`,
  );

const EXPECTED_PULL_REQUEST_CONFLICT_CONTRIBUTOR_STATE =
  EXPECTED_PULL_REQUEST_CONFLICT_STATE.replace(
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-error"><i class="yobicon-error mr5"></i><span>A conflict occurred when merging. This pull request cannot be merged safely.</span></div></div>`,
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-error"><i class="yobicon-error mr5"></i><span>A conflict occurred when merging. This pull request cannot be merged safely.</span><div class="howto-resolve-conflict"><h6>Resolving conflicts</h6><div class="help"><ol><li>Move from local to the branch that sent the code. <code>git checkout feature/ui</code></li><li>Add upstream repository URL as new remote. But if you did it already, skip it. <code>git remote add upstream __UPSTREAM_URL__</code></li><li>Get the latest upstream code. <code>git fetch upstream</code></li><li>Rebase branch that will receive the code. <code>git rebase upstream/main</code></li><li>There must be some conflicted files. Open the files and edit them.</li><li>Once you fix it, notify Git. <code>git add resolved_file</code></li><li>After resolving all conflicts, continue rebasing. <code>git rebase --continue</code></li><li>You may need to repeat steps 5 to 7 several times.</li><li>After rebasing, push it to origin. <code>git push -f origin feature/ui</code></li><li>The End!<a href="__BASE_PATH__/admin/sample/pullRequest/9" class="ybtn ybtn-mini ybtn-primary">Refresh page</a>Double check whether your pull request can be merged safely or not.</li></ol></div></div></div></div>`,
  );

const EXPECTED_PULL_REQUEST_REFS_HEADS_BRANCH_NAMES =
  EXPECTED_PULL_REQUEST_CONFLICT_CONTRIBUTOR_STATE.replaceAll("feature/ui", "release/hotfix")
    .replaceAll("main", "production")
    .replaceAll("feature%2Fui", "release%2Fhotfix");

const EXPECTED_PULL_REQUEST_CLOSED_REOPEN = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div>`,
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-closed">Closed</span></div>`,
)
  .replace(
    `<div class="pull-right"><button id="btnAccept" type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/accept" class="ybtn ybtn-success">Merge</button></div>`,
    `<div class="pull-right"><button type="button" class="ybtn ybtn-disabled" data-toggle="tooltip" data-placement="top" title="This pull request is not open.">Merge</button></div>`,
  )
  .replace(
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div>`,
    `<div id="state" class="pullRequest-stateInfo"></div>`,
  )
  .replace(
    `<div class="mr5" style="display:inline-block"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a><button type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/close" class="ybtn">Close</button></div>`,
    `<div class="mr5" style="display:inline-block"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a><button type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/open" class="ybtn">Reopen</button></div>`,
  );

const EXPECTED_PULL_REQUEST_MERGING_STATE = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-right"><button id="btnAccept" type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/accept" class="ybtn ybtn-success">Merge</button></div>`,
  `<div class="pull-right"><button type="button" class="ybtn ybtn-disabled" data-toggle="tooltip" data-placement="top" title="Now, it's checking the code.">Merge</button></div>`,
).replace(
  `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div>`,
  `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-warnning"><i class="yobicon-supportrequest mr5"></i><span>We are checking if the code is safe. Please wait for a while to complete this process.</span></div></div>`,
);

const EXPECTED_PULL_REQUEST_MERGED_DELETE_BRANCH = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div>`,
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-merged">Merged</span></div>`,
)
  .replace(
    `<div class="pull-right"><button id="btnAccept" type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/accept" class="ybtn ybtn-success">Merge</button></div>`,
    `<div class="pull-right"></div>`,
  )
  .replace(
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div>`,
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-info"><a href="__BASE_PATH__/admin" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="25" height="25"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a> accepted this pull request.<code>feature/ui</code> You can delete branch.<button type="button" class="ybtn ybtn-danger ybtn-mini pull-right" data-request-method="delete" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/deletefrombranch">Delete branch</button></div></div>`,
  )
  .replace(
    `<div class="mr5" style="display:inline-block"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a><button type="button" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/close" class="ybtn">Close</button></div>`,
    `<div class="mr5" style="display:inline-block"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a></div>`,
  );

const EXPECTED_PULL_REQUEST_MERGED_RESTORE_BRANCH =
  EXPECTED_PULL_REQUEST_MERGED_DELETE_BRANCH.replace(
    `<code>feature/ui</code> You can delete branch.<button type="button" class="ybtn ybtn-danger ybtn-mini pull-right" data-request-method="delete" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/deletefrombranch">Delete branch</button>`,
    `<code>feature/ui</code> Branch can be restored.<button type="button" class="ybtn ybtn-info ybtn-mini pull-right" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/pullRequest/9/restorefrombranch">Restore branch</button>`,
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
    "data-request-uri",
    `${basePath}/admin/sample/pullRequest/9/accept`,
  );
  await expect(page.locator(".author-info > .usf-group.pull-left")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expectLegacyAnchor(page.locator(".author-info > .usf-group.pull-left"), {
    class: "usf-group pull-left",
    href: `${basePath}/dev`,
    text: "Dev Member @dev",
  });
  await expectLegacyAnchor(page.locator('.nav-tabs a[href$="/pullRequest/9"]'), {
    href: `${basePath}/admin/sample/pullRequest/9`,
    text: "Overview",
  });
  await expect(page.locator('.nav-tabs a[href$="/pullRequest/9"]').locator("xpath=..")).toHaveClass(
    "active",
  );
  await expectLegacyAnchor(page.locator('.nav-tabs a[href$="/pullRequest/9/changes"]'), {
    href: `${basePath}/admin/sample/pullRequest/9/changes`,
    text: "Changes",
  });
  await expect(
    page.locator('.nav-tabs a[href$="/pullRequest/9/changes"]').locator("xpath=.."),
  ).not.toHaveClass("active");
  await expectLegacyAnchor(page.locator(".pullRequest-branchInfo .from a").nth(0), {
    href: `${basePath}/admin`,
    text: "admin",
  });
  await expectLegacyAnchor(page.locator(".pullRequest-branchInfo .from a").nth(1), {
    href: `${basePath}/admin/sample`,
    text: "sample",
  });
  await expect(page.locator(".pullRequest-branchInfo .from .branchName")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/feature%2Fui`,
  );
  await expectLegacyAnchor(page.locator(".pullRequest-branchInfo .from .branchName"), {
    class: "branchName",
    href: `${basePath}/admin/sample/code/feature%2Fui`,
    text: "feature/ui",
  });
  await expectLegacyAnchor(page.locator(".pullRequest-branchInfo .to .branchName"), {
    class: "branchName",
    href: `${basePath}/admin/sample/code/main`,
    text: "main",
  });
  await expect(page.locator(".board-footer .mr5 .ybtn").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/editform`,
  );
  await expectLegacyAnchor(page.locator(".board-footer .mr5 .ybtn").first(), {
    class: "ybtn",
    href: `${basePath}/admin/sample/pullRequest/9/editform`,
    text: "Edit",
  });
  await expect(page.locator('.board-footer button[data-request-method="post"]')).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/pullRequest/9/close`,
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_OVERVIEW.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await pullRequestOverviewMetrics(page)).toEqual({
    alertColor: "rgb(70, 136, 71)",
    alertFontSize: "13px",
    alertFontWeight: "700",
    alertPadding: "15px",
    authorInfoMargin: "20px 20px 10px",
    badgeBackground: "rgb(182, 218, 84)",
    badgeBorderRadius: "15px",
    badgeLineHeight: "20px",
    badgePadding: "5px 15px",
    boardBodyContentMinHeight: "150px",
    boardBodyContentPadding: "0px 20px",
    boardFooterMarginTop: "20px",
    boardFooterOverflow: "auto",
    boardFooterPaddingRight: "15px",
    boardFooterTextAlign: "right",
    branchIconColor: "rgb(42, 127, 143)",
    branchIconFontSize: "12px",
    branchLinkColor: "rgb(81, 170, 204)",
    branchOwnerColor: "rgb(42, 127, 143)",
    branchPadding: "0px",
    branchWrapDisplay: "block",
    headerClear: "both",
    headerMargin: "15px 0px",
    headerTitleBackground: "rgb(242, 242, 242)",
    headerTitleBorderRadius: "10px",
    headerTitleLineHeight: "30px",
    headerTitlePadding: "10px 20px",
    stateMarginTop: "15px",
    titleIdColor: "rgb(147, 147, 147)",
    titleIdFontSize: "14px",
    titleIdPaddingRight: "10px",
  });
});

test("project pull request overview exposes legacy project-header search scope", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    container: {
      isProtected: true,
      organizationName: "admin",
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator(".board-header.issue .title")).toContainText("#9 Initial title");
  await expect(page.locator(".gnb-outer")).toHaveClass("gnb-outer project-header");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form .search-box")).toHaveClass("search-box select");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect
    .poll(() =>
      page.locator(".gnb-search-form [data-toggle='search-scope']").evaluateAll((elements) =>
        elements.map((element) => ({
          action: element.getAttribute("data-action") ?? "",
          text: element.textContent?.trim() ?? "",
        })),
      ),
    )
    .toEqual([
      { action: `${basePath}/admin/sample/search`, text: "This Project" },
      { action: `${basePath}/organizations/admin/search`, text: "This Group" },
      { action: `${basePath}/search`, text: "All Projects" },
    ]);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator(".gnb-search-form [data-toggle='search-scope']").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );
  expect(new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/pullRequest/9`);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator(".gnb-search-form [data-toggle='search-scope']").nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );

  const boxes = await pullRequestOverviewNavbarMetrics(page);
  expect(boxes).not.toBeNull();
  expect(boxes!.form.top).toBeGreaterThanOrEqual(boxes!.nav.top);
  expect(boxes!.form.bottom).toBeLessThanOrEqual(boxes!.nav.bottom);
  expect(boxes!.search.left).toBeGreaterThanOrEqual(boxes!.form.left);
  expect(boxes!.search.right).toBeLessThanOrEqual(boxes!.form.right);
  expect(boxes!.scope.top).toBeGreaterThanOrEqual(boxes!.nav.top);
  expect(boxes!.scope.bottom).toBeLessThanOrEqual(boxes!.nav.bottom);
  expect(boxes!.menu.top).toBeGreaterThanOrEqual(boxes!.header.bottom - 1);
});

async function pullRequestOverviewMetrics(page: Page) {
  return page.locator(".page-wrap-outer").evaluate((root) => {
    const header = root.querySelector<HTMLElement>(".board-header.issue");
    const title = root.querySelector<HTMLElement>(".board-header .title");
    const boardId = root.querySelector<HTMLElement>(".board-id");
    const badge = root.querySelector<HTMLElement>(".badge-issue-open");
    const authorInfo = root.querySelector<HTMLElement>(".board-body .author-info");
    const content = root.querySelector<HTMLElement>(".board-body .content");
    const branchWrap = root.querySelector<HTMLElement>(".pullRequest-branchInfo");
    const branchIcon = root.querySelector<HTMLElement>(".pullRequest-branchInfo i");
    const branchCode = root.querySelector<HTMLElement>(".pullRequest-branchInfo code");
    const branchOwner = root.querySelector<HTMLElement>(".pullRequest-branchInfo code a");
    const branchLink = root.querySelector<HTMLElement>(".pullRequest-branchInfo .branchName");
    const state = root.querySelector<HTMLElement>("#state.pullRequest-stateInfo");
    const alert = root.querySelector<HTMLElement>("#state .alert");
    const footer = root.querySelector<HTMLElement>(".board-footer");
    const missing = Object.entries({
      alert,
      authorInfo,
      badge,
      boardId,
      branchCode,
      branchIcon,
      branchLink,
      branchOwner,
      branchWrap,
      content,
      footer,
      header,
      state,
      title,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected pull request overview metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const alertStyle = window.getComputedStyle(alert);
    const authorInfoStyle = window.getComputedStyle(authorInfo);
    const badgeStyle = window.getComputedStyle(badge);
    const boardIdStyle = window.getComputedStyle(boardId);
    const branchCodeStyle = window.getComputedStyle(branchCode);
    const branchIconStyle = window.getComputedStyle(branchIcon);
    const contentStyle = window.getComputedStyle(content);
    const footerStyle = window.getComputedStyle(footer);
    const headerStyle = window.getComputedStyle(header);
    const stateStyle = window.getComputedStyle(state);
    const titleStyle = window.getComputedStyle(title);
    return {
      alertColor: alertStyle.color,
      alertFontSize: alertStyle.fontSize,
      alertFontWeight: alertStyle.fontWeight,
      alertPadding: alertStyle.padding,
      authorInfoMargin: authorInfoStyle.margin,
      badgeBackground: badgeStyle.backgroundColor,
      badgeBorderRadius: badgeStyle.borderRadius,
      badgeLineHeight: badgeStyle.lineHeight,
      badgePadding: badgeStyle.padding,
      boardBodyContentMinHeight: contentStyle.minHeight,
      boardBodyContentPadding: contentStyle.padding,
      boardFooterMarginTop: footerStyle.marginTop,
      boardFooterOverflow: footerStyle.overflow,
      boardFooterPaddingRight: footerStyle.paddingRight,
      boardFooterTextAlign: footerStyle.textAlign,
      branchIconColor: branchIconStyle.color,
      branchIconFontSize: branchIconStyle.fontSize,
      branchLinkColor: window.getComputedStyle(branchLink).color,
      branchOwnerColor: window.getComputedStyle(branchOwner).color,
      branchPadding: branchCodeStyle.padding,
      branchWrapDisplay: window.getComputedStyle(branchWrap).display,
      headerClear: headerStyle.clear,
      headerMargin: headerStyle.margin,
      headerTitleBackground: titleStyle.backgroundColor,
      headerTitleBorderRadius: titleStyle.borderRadius,
      headerTitleLineHeight: titleStyle.lineHeight,
      headerTitlePadding: titleStyle.padding,
      stateMarginTop: stateStyle.marginTop,
      titleIdColor: boardIdStyle.color,
      titleIdFontSize: boardIdStyle.fontSize,
      titleIdPaddingRight: boardIdStyle.paddingRight,
    };
  });
}

async function pullRequestOverviewNavbarMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>(".gnb-outer.project-header");
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const search = document.querySelector<HTMLElement>(".gnb-search-form .search-box.select");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const header = document.querySelector<HTMLElement>(".project-header-outer");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    if (!navbar || !form || !search || !scope || !header || !menu) {
      return null;
    }
    const toBox = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    };
    return {
      form: toBox(form),
      header: toBox(header),
      menu: toBox(menu),
      nav: toBox(navbar),
      scope: toBox(scope),
      search: toBox(search),
    };
  });
}

test("project pull request overview changes tab uses legacy href and SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page);

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  const changesTab = page.locator('.nav-tabs a[href$="/pullRequest/9/changes"]');
  await expect(changesTab).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/changes`,
  );

  await changesTab.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequest/9/changes`);
  await expect(page.locator(".code-browse-wrap > .nav-tabs li.active a")).toHaveText("Changes");
  await expect(page.locator("#changes.diffs-wrap")).toHaveCount(1);
  await expect(page.locator("#comment-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/pullRequest/90/comments`,
  );
});

test("project pull request overview route source uses direct Links", async () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    "utf8",
  );

  expect(routeSource).toContain(
    'createFileRoute("/$ownerName/$projectName/pullRequest/$pullRequestNumber")',
  );
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("LegacyLink");
  expect(routeSource).not.toContain("AnchorHTMLAttributes");
  expect(routeSource).not.toMatch(/<a\b/u);
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("React.ComponentType");
  expect(routeSource).not.toContain(
    "href={prefixBasePath(runtimeConfig.basePath, `/${pullRequest.contributor.loginId}`)}",
  );
  expect(routeSource).not.toContain("as never");
  expect(routeSource).toContain('to="/$user"');
  expect(routeSource).toContain("params={{ user: pullRequest.contributor.loginId }}");
  expect(routeSource).toContain("params={{ user: event.senderLoginId }}");
  expect(routeSource).toContain("params={{ user: reviewer.loginId }}");
  expect(routeSource).toContain('to="/$ownerName/$projectName/code/$branch"');
  expect(routeSource).toContain("branch: fromBranchName");
  expect(routeSource).toContain("branch: toBranchName");
  expect(routeSource).toContain('to="/$ownerName/$projectName/commit/$commitId"');
  expect(routeSource).toContain(
    'to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"',
  );
  expect(routeSource).toContain(
    'to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes/$commitId"',
  );
  expect(routeSource).toContain(
    "const [isHelpMessageOpen, setIsHelpMessageOpen] = useState(false);",
  );
  expect(routeSource).toContain(
    "<PullRequestHelpModal\n        isOpen={isHelpMessageOpen}\n        onClose={() => setIsHelpMessageOpen(false)}",
  );
  expect(routeSource).toContain(
    "function insulateModalButtonClick(event: MouseEvent<HTMLButtonElement>) {",
  );
  expect(routeSource).toContain("event.preventDefault();");
  expect(routeSource).toContain("event.stopPropagation();");
  expect(routeSource.match(/insulateModalButtonClick\(event\);/g)?.length ?? 0).toBe(2);
  expect(routeSource).toContain(
    'className={isOpen ? "modal fade pullreq-info in" : "modal hide fade pullreq-info"}',
  );
  expect(routeSource).toContain('{isOpen ? <div className="modal-backdrop fade in"');
  expect(routeSource).toContain("commitId: commit.commitId");
  expect(routeSource).not.toContain("commitPath as never");
  expect(routeSource).not.toContain("to={to as never}");
  expect(routeSource).toContain('to="."');
  expect(routeSource).toContain("hash={`event-${event.id}`}");
  expect(routeSource).toContain("Legacy data-request-method controls below are POST actions");
  expect(routeSource).toContain("Restore branch is a legacy POST action");
  expect(routeSource).not.toMatch(/<a\b[^>]*data-request-method=/u);
  expect(routeSource).not.toMatch(/document\.|querySelector|classList|style\.display/u);
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("project pull request overview help modal source insulates delegated modal bridge", async () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    "utf8",
  );

  expect(routeSource).toContain(
    "function insulateModalButtonClick(event: MouseEvent<HTMLButtonElement>) {",
  );
  expect(routeSource).toContain("event.preventDefault();");
  expect(routeSource).toContain("event.stopPropagation();");
  expect(routeSource).toContain(
    "const [isHelpMessageOpen, setIsHelpMessageOpen] = useState(false);",
  );
  expect(routeSource).toContain('data-target="#helpMessage"');
  expect(routeSource).toContain('data-dismiss="modal"');
  expect(routeSource.match(/insulateModalButtonClick\(event\);/g)?.length ?? 0).toBe(2);
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
  const event = page.locator("#comment-94");
  await expect(event).toContainText("Committed");
  await expect(event.locator(".commit-id").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/changes/1234567890abcdef`,
  );
  await expectLegacyAnchor(event.locator(".usf-group").nth(0), {
    class: "usf-group",
    href: `${basePath}/dev`,
    text: "",
    title: "dev",
  });
  await expectLegacyAnchor(event.locator(".usf-group").nth(1), {
    class: "usf-group",
    href: `${basePath}/dev`,
    text: "Dev Member",
    title: "dev",
  });
  await expectLegacyAnchor(event.locator(".date a"), {
    href: `${basePath}/admin/sample/pullRequest/9#event-94`,
    text: "Jul 3, 2026",
    title: "Jul 3, 2026",
  });
  await expectLegacyAnchor(event.locator(".ybtn.ybtn-mini"), {
    class: "ybtn ybtn-mini",
    href: `${basePath}/admin/sample/compare/basehash...headhash`,
    text: "Additional changes",
  });
  await expectLegacyAnchor(event.locator(".commit-id").first(), {
    class: "commit-id",
    href: `${basePath}/admin/sample/pullRequest/9/changes/1234567890abcdef`,
    text: "1234567",
  });
  await expectLegacyAnchor(event.locator(".avatar-wrap.small.hide-in-mobile").first(), {
    class: "avatar-wrap small hide-in-mobile",
    href: `${basePath}/dev`,
    text: "dev@example.com",
    title: "Dev Member",
  });
  await expect(event.locator(".commitMsg.short").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/changes/1234567890abcdef`,
  );
  await expectLegacyAnchor(event.locator(".commitMsg.short").first(), {
    class: "commitMsg short",
    href: `${basePath}/admin/sample/pullRequest/9/changes/1234567890abcdef`,
    text: "Fix login",
  });

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_OVERVIEW_WITH_COMMIT_EVENT.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await pullRequestEventMetrics(page)).toEqual({
    commitIdColor: "rgb(81, 170, 204)",
    commitIdFloat: "left",
    commitIdFontSize: "12px",
    commitIdTextAlign: "center",
    commitIdWidth: 74,
    commitInfoPadding: "10px 5px",
    commitListBackground: "rgb(253, 253, 253)",
    commitListBorderRadius: "3px",
    commitListBorderWidth: "1px",
    commitListMargin: "10px 0px 0px 102px",
    commitListPadding: "0px",
    dateFontSize: "11px",
    eventLineHeight: "30px",
    eventPaddingLeft: "55px",
    shortMargin: "0px",
    shortPadding: "5px",
    stateBackground: "rgb(101, 201, 223)",
    stateMarginRight: "10px",
    stateWidth: 90,
  });
});

test("project pull request overview owns event hash links through router", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    events: [
      {
        commits: [],
        createdLabel: "Jul 10, 2026",
        eventType: "PULL_REQUEST_STATE_CHANGED",
        id: 106,
        newValue: "conflict",
        oldValue: "open",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pull-request-event-hash";
  });

  await expect(page.locator('.board-comment-wrap .date a[href^="#event-"]')).toHaveCount(0);
  const eventDate = page.locator("#comment-106 .date a");
  await expect(eventDate).toHaveText("Jul 10, 2026");
  await expect(eventDate).toHaveAttribute("title", "Jul 10, 2026");
  await expect(eventDate).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9#event-106`,
  );

  await eventDate.click();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#event-106");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("pull-request-event-hash");
});

test("project pull request overview opens help modal through route-owned React state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page);

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pull-request-help-modal";
  });

  await expect(page.locator('.right-txt a[href="#helpMessage"]')).toHaveCount(0);
  const helpButton = page.locator(
    '.right-txt button[type="button"][data-toggle="modal"][data-target="#helpMessage"]',
  );
  await expect(helpButton).toHaveClass("ybtn ybtn-inverse ybtn-mini");
  await expect(helpButton).toHaveText("Help");

  const beforeHelpUrl = page.url();
  await expect(page.locator("#helpMessage")).toHaveClass(/hide/u);
  await expect(page.locator("#helpMessage")).not.toHaveAttribute("style", /./u);
  await expect(page.locator("#helpMessage")).not.toHaveAttribute("aria-hidden", /./u);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await armRootModalBridgeTrap(page);
  await helpButton.click();
  await expect(page).toHaveURL(beforeHelpUrl);
  await expect(page.locator("#helpMessage")).not.toHaveClass(/hide/u);
  await expect(page.locator("#helpMessage")).toHaveClass(/in/u);
  await expect(page.locator("#helpMessage")).not.toHaveAttribute("style", /./u);
  await expect(page.locator("#helpMessage")).not.toHaveAttribute("aria-hidden", /./u);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(
    page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).resolves.toBe("pull-request-help-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await armRootModalBridgeTrap(page);
  await page.locator('#helpMessage [data-dismiss="modal"]').click();
  await expect(page).toHaveURL(beforeHelpUrl);
  await expect(page.locator("#helpMessage")).toHaveClass(/hide/u);
  await expect(page.locator("#helpMessage")).not.toHaveAttribute("style", /./u);
  await expect(page.locator("#helpMessage")).not.toHaveAttribute("aria-hidden", /./u);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).resolves.toBe("pull-request-help-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
});

async function armRootModalBridgeTrap(page: Page) {
  await page.evaluate(() => {
    const win = window as Window &
      typeof globalThis & {
        __yonaRootModalBridgeHits?: string[];
        __yonaRootModalBridgeTrapArmed?: boolean;
      };
    win.__yonaRootModalBridgeHits = [];
    if (win.__yonaRootModalBridgeTrapArmed) {
      return;
    }
    win.__yonaRootModalBridgeTrapArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridged = target?.closest('[data-toggle="modal"], [data-dismiss="modal"]');
      if (bridged) {
        win.__yonaRootModalBridgeHits?.push(
          `${bridged.tagName.toLowerCase()}#${bridged.id}.${bridged.className}`,
        );
      }
    });
  });
}

async function rootModalBridgeHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __yonaRootModalBridgeHits?: string[];
          }
      ).__yonaRootModalBridgeHits ?? [],
  );
}

async function pullRequestEventMetrics(page: Page) {
  return page.locator("#comment-94").evaluate((event) => {
    const state = event.querySelector<HTMLElement>(".state");
    const date = event.querySelector<HTMLElement>(".date");
    const commitList = event.querySelector<HTMLElement>(".commit-list");
    const commitInfo = event.querySelector<HTMLElement>(".commit-info");
    const commitId = event.querySelector<HTMLElement>(".commit-id");
    const short = event.querySelector<HTMLElement>(".commitMsg.short");
    const missing = Object.entries({
      commitId,
      commitInfo,
      commitList,
      date,
      short,
      state,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected pull request event metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const commitIdStyle = window.getComputedStyle(commitId);
    const commitInfoStyle = window.getComputedStyle(commitInfo);
    const commitListStyle = window.getComputedStyle(commitList);
    const eventStyle = window.getComputedStyle(event);
    const shortStyle = window.getComputedStyle(short);
    const stateStyle = window.getComputedStyle(state);
    return {
      commitIdColor: commitIdStyle.color,
      commitIdFloat: commitIdStyle.float,
      commitIdFontSize: commitIdStyle.fontSize,
      commitIdTextAlign: commitIdStyle.textAlign,
      commitIdWidth: Math.round(commitId.getBoundingClientRect().width),
      commitInfoPadding: commitInfoStyle.padding,
      commitListBackground: commitListStyle.backgroundColor,
      commitListBorderRadius: commitListStyle.borderRadius,
      commitListBorderWidth: commitListStyle.borderTopWidth,
      commitListMargin: commitListStyle.margin,
      commitListPadding: commitListStyle.padding,
      dateFontSize: window.getComputedStyle(date).fontSize,
      eventLineHeight: eventStyle.lineHeight,
      eventPaddingLeft: eventStyle.paddingLeft,
      shortMargin: shortStyle.margin,
      shortPadding: shortStyle.padding,
      stateBackground: stateStyle.backgroundColor,
      stateMarginRight: stateStyle.marginRight,
      stateWidth: Math.round(state.getBoundingClientRect().width),
    };
  });
}

test("project pull request overview renders legacy review and state event DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    events: [
      {
        commits: [],
        createdLabel: "Jul 5, 2026",
        eventType: "PULL_REQUEST_REVIEW_STATE_CHANGED",
        id: 101,
        newValue: "DONE",
        oldValue: "",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
      {
        commits: [],
        createdLabel: "Jul 6, 2026",
        eventType: "PULL_REQUEST_REVIEW_STATE_CHANGED",
        id: 102,
        newValue: "CANCEL",
        oldValue: "DONE",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
      {
        commits: [],
        createdLabel: "Jul 7, 2026",
        eventType: "PULL_REQUEST_STATE_CHANGED",
        id: 103,
        newValue: "closed",
        oldValue: "open",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
      {
        commits: [],
        createdLabel: "Jul 8, 2026",
        eventType: "PULL_REQUEST_STATE_CHANGED",
        id: 104,
        newValue: "merged",
        oldValue: "closed",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
      {
        commits: [],
        createdLabel: "Jul 9, 2026",
        eventType: "PULL_REQUEST_MERGED",
        id: 105,
        newValue: "merged",
        oldValue: "closed",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
    mergedCommitIdTo: "mergedcommit123456",
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator("#comment-105")).toContainText("Merged");

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_OVERVIEW_WITH_STATE_EVENTS.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview renders legacy conflict and resolved event DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    events: [
      {
        commits: [],
        createdLabel: "Jul 10, 2026",
        eventType: "PULL_REQUEST_STATE_CHANGED",
        id: 106,
        newValue: "conflict",
        oldValue: "open",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
      {
        commits: [],
        createdLabel: "Jul 11, 2026",
        eventType: "PULL_REQUEST_STATE_CHANGED",
        id: 107,
        newValue: "resolved",
        oldValue: "conflict",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator("#comment-106")).toContainText("Conflicted");
  await expect(page.locator("#comment-107")).toContainText("Resolved");

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_OVERVIEW_WITH_CONFLICT_RESOLVED_EVENTS.replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("project pull request overview renders legacy changes tab open-thread badge", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      threads: [
        { id: 77, state: "open" },
        { id: 78, state: "closed" },
      ],
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator(".nav-tabs .num-badge")).toHaveText("1");

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_OPEN_THREAD_BADGE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview renders legacy markdown body from REST markdown", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      bodyHtml: "",
      bodyMarkdown: "Initial **markdown** body",
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator(".content.markdown-wrap strong")).toHaveText("markdown");

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_MARKDOWN_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview preserves legacy attachments data", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      attachments: [
        {
          id: 11,
          mimeType: "image/png",
          name: "review-note.png",
          size: 1234,
          sizeLabel: "1.2 KB",
          url: `${basePath}/files/11`,
        },
      ],
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator(".attachments")).toHaveAttribute(
    "data-attachments",
    JSON.stringify([
      {
        id: 11,
        mimeType: "image/png",
        name: "review-note.png",
        size: 1234,
        sizeLabel: "1.2 KB",
        url: `${basePath}/files/11`,
      },
    ]),
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_ATTACHMENTS_DATA.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview hides legacy watch button without WATCH permission", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      permissions: {
        canComment: true,
        canDeleteSourceBranch: false,
        canRead: true,
        canReadChanges: true,
        canReview: true,
        canRestoreSourceBranch: false,
        canUpdate: true,
        canUpdateState: true,
        canWatch: false,
      },
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator(".board-header.issue .title")).toContainText("#9 Initial title");
  await expect(page.locator("#watch-button")).toHaveCount(0);

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_NO_WATCH_BUTTON.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview watch button posts and toggles legacy watching state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { watchRequests } = await mockPullRequestOverview(page);

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  const watchButton = page.locator(".board-footer #watch-button");
  await expect(watchButton).toHaveText("Watch");
  await expect(watchButton).toHaveAttribute("data-watching", "false");
  await expect(watchButton).not.toHaveClass(/ybtn-watching/u);

  const watchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/pull-requests/9/watch") &&
      response.request().method() === "POST",
  );
  await watchButton.click();
  await watchResponsePromise;

  await expect(watchButton).toHaveText("Unwatch");
  await expect(watchButton).toHaveAttribute("data-watching", "true");
  await expect(watchButton).toHaveClass(/ybtn-watching/u);

  const unwatchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/pull-requests/9/watch") &&
      response.request().method() === "DELETE",
  );
  await watchButton.click();
  await unwatchResponsePromise;

  expect(watchRequests).toEqual([
    { hasCsrfToken: true, method: "POST" },
    { hasCsrfToken: true, method: "DELETE" },
  ]);
  await expect(watchButton).toHaveText("Watch");
  await expect(watchButton).toHaveAttribute("data-watching", "false");
  await expect(watchButton).not.toHaveClass(/ybtn-watching/u);
});

test("project pull request overview renders legacy reviewer controls DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    container: {
      isUsingReviewerCount: true,
    },
    detail: {
      reviewed: true,
      reviewers: [
        {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "admin",
          userId: 1,
          userLabel: "Site Admin",
        },
        {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "dev",
          userId: 2,
          userLabel: "Dev Member",
        },
      ],
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator("#reviewers")).toContainText("2 participants");
  await expect(page.locator('button[data-request-uri$="/unreview"]')).toHaveText("Cancel review");

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_REVIEWER_CONTROLS.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview renders legacy conflict state DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      conflict: true,
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator(".badge-issue-conflict")).toHaveText("Conflict");
  await expect(page.locator(".ybtn-disabled")).toHaveAttribute("title", "There are conflicts.");
  await expect(page.locator("#state .alert-error")).toContainText(
    "A conflict occurred when merging. This pull request cannot be merged safely.",
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_CONFLICT_STATE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview renders legacy contributor conflict guide DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      conflict: true,
    },
    session: {
      actorId: 2,
      emailAddress: "dev@example.com",
      loginId: "dev",
      userLabel: "Dev Member",
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  const upstreamUrl = await page.evaluate((mountedBasePath) => {
    const url = new URL(`${mountedBasePath}/admin/sample`, window.location.origin);
    url.username = "dev";
    return url.toString();
  }, basePath);
  await expect(page.locator(".howto-resolve-conflict")).toContainText("Resolving conflicts");
  await expect(page.locator(".howto-resolve-conflict code")).toContainText([
    "git checkout feature/ui",
    `git remote add upstream ${upstreamUrl}`,
    "git fetch upstream",
    "git rebase upstream/main",
    "git add resolved_file",
    "git rebase --continue",
    "git push -f origin feature/ui",
  ]);

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_CONFLICT_CONTRIBUTOR_STATE.replaceAll(
        "__BASE_PATH__",
        basePath,
      ).replace("__UPSTREAM_URL__", upstreamUrl),
    ),
  );
});

test("project pull request overview renders legacy refs heads branch names", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      conflict: true,
      fromBranch: "refs/heads/release/hotfix",
      toBranch: "refs/heads/production",
    },
    session: {
      actorId: 2,
      emailAddress: "dev@example.com",
      loginId: "dev",
      userLabel: "Dev Member",
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  const upstreamUrl = await page.evaluate((mountedBasePath) => {
    const url = new URL(`${mountedBasePath}/admin/sample`, window.location.origin);
    url.username = "dev";
    return url.toString();
  }, basePath);
  await expect(page.locator(".pullRequest-branchInfo .from .branchName")).toHaveText(
    "release/hotfix",
  );
  await expect(page.locator(".pullRequest-branchInfo .to .branchName")).toHaveText("production");
  await expect(page.locator(".pullRequest-branchInfo .from .branchName")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/release%2Fhotfix`,
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_REFS_HEADS_BRANCH_NAMES.replaceAll("__BASE_PATH__", basePath).replace(
        "__UPSTREAM_URL__",
        upstreamUrl,
      ),
    ),
  );
});

test("project pull request overview renders legacy closed reopen footer DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      state: "closed",
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator(".badge-issue-closed")).toHaveText("Closed");
  await expect(page.locator('button[data-request-uri$="/open"]')).toHaveText("Reopen");
  await expect(page.locator("#state")).toBeEmpty();

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_CLOSED_REOPEN.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview renders legacy merging state DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      isMerging: true,
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator("#state .alert-warnning")).toContainText(
    "We are checking if the code is safe.",
  );
  await expect(page.locator(".ybtn-disabled")).toHaveAttribute(
    "title",
    "Now, it's checking the code.",
  );

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_MERGING_STATE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview renders legacy merged source-branch delete state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      permissions: {
        canComment: true,
        canDeleteSourceBranch: true,
        canRead: true,
        canReadChanges: true,
        canReview: false,
        canRestoreSourceBranch: false,
        canUpdate: true,
        canUpdateState: false,
        canWatch: true,
      },
      state: "merged",
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator("#state .alert-info")).toContainText("Delete branch");

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_MERGED_DELETE_BRANCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project pull request overview renders legacy merged source-branch restore state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    detail: {
      permissions: {
        canComment: true,
        canDeleteSourceBranch: false,
        canRead: true,
        canReadChanges: true,
        canReview: false,
        canRestoreSourceBranch: true,
        canUpdate: true,
        canUpdateState: false,
        canWatch: true,
      },
      sourceBranchExists: false,
      state: "merged",
    },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page.locator("#state .alert-info")).toContainText("Restore branch");

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_MERGED_RESTORE_BRANCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

async function mockPullRequestOverview(
  page: Page,
  options: {
    container?: Record<string, unknown>;
    detail?: Record<string, unknown>;
    events?: unknown[];
    mergedCommitIdTo?: string;
    session?: Record<string, unknown>;
  } = {},
) {
  const watchRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const detail = {
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
    events: options.events ?? [],
    fromBranch: "feature/ui",
    fromOwnerName: "admin",
    fromProjectName: "sample",
    id: 90,
    isMerging: false,
    isWatching: false,
    lackingReviewerCount: 0,
    mergedCommitIdFrom: "",
    mergedCommitIdTo: options.mergedCommitIdTo ?? "",
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
    ...options.detail,
  };

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
        ...options.session,
      }),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
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
        ...options.session,
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
        ...options.container,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/9", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(detail),
    });
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/watch",
    async (route) => {
      const method = route.request().method();
      watchRequests.push({
        hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
        method,
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...detail,
          isWatching: method !== "DELETE",
        }),
      });
    },
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/changes**",
    async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get("commitId") ?? "").toBe("");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          cardThreads: [],
          commits: [],
          files: [],
          inlineThreads: [],
          nonRangedThreads: [],
          pullRequest: detail,
          threads: [],
        }),
      });
    },
  );

  return { watchRequests };
}

async function expectLegacyAnchor(
  locator: Locator,
  attrs: { class?: string; href: string; text: string; title?: string },
) {
  await expect(locator).toHaveAttribute("href", attrs.href);
  if (attrs.class === undefined) {
    await expect(locator).not.toHaveAttribute("class", /.+/u);
  } else {
    await expect(locator).toHaveAttribute("class", attrs.class);
  }
  if (attrs.title === undefined) {
    await expect(locator).not.toHaveAttribute("title", /.+/u);
  } else {
    await expect(locator).toHaveAttribute("title", attrs.title);
  }
  await expect(locator).toHaveText(attrs.text);
  await expect(locator).not.toHaveAttribute("aria-current", /.+/u);
  await expect(locator).not.toHaveAttribute("data-status", /.+/u);
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status",
        )
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status",
        )
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
