import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BATCH_785_SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright", "batch-785");

const EXPECTED_PULL_REQUEST_OVERVIEW = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="board-header issue"><div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div><div class="title"><strong class="board-id">#9</strong> Initial title</div></div><div class="pull-right"><button id="btnAccept" type="button" class="ybtn ybtn-success">Merge</button></div><ul class="nav nav-tabs nm"><li class="active"><a href="__BASE_PATH__/admin/sample/pullRequest/9">Overview</a></li><li><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes">Changes</a></li></ul><div class="board-body"><div class="author-info"><a href="__BASE_PATH__/dev" class="usf-group pull-left"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a><div class="pullRequest-branchInfo"><i class="yobicon-branch"></i><code class="from" title="From"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/feature%2Fui" class="branchName">feature/ui</a></code><i class="yobicon-right-2 ml10"></i><code class="to" title="To"><a href="__BASE_PATH__/admin">admin</a><span>/</span><a href="__BASE_PATH__/admin/sample">sample</a>: <a href="__BASE_PATH__/admin/sample/code/main" class="branchName">main</a></code></div></div><div class="content markdown-wrap"><p>Initial body</p></div><div class="attachments" data-attachments="[]"></div></div><div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div><div class="board-footer board-actrow"><div class="pull-left"><button id="watch-button" type="button" class="ybtn" data-watching="false">Watch</button></div><div class="mr5"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a><button type="button" class="ybtn">Close</button></div></div><hr class="nm"><div class="board-comment-wrap"></div><div class="right-txt"><button type="button" class="ybtn ybtn-inverse ybtn-mini">Help</button></div></div></div><div id="helpMessage" class="modal hide fade pullreq-info"><div class="modal-header"><h5>You can check commits and descriptions on received code.</h5></div><div class="modal-body"><div class="row-fluid"><div class="pull-left"><img class="img-polaroid" src="__BASE_PATH__/assets/images/fork-pull/merge.jpg"><br></div><div class="pull-left help-messages mt10"><p>If members of the original project accept the code, it will be merged into the original project.</p><p>You can't accept code if the code is not safe to merge.</p><p>When you can't accept code, you may postpone or delete the pull request.</p></div></div></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-small">Confirm</button></div></div>
`;

const EXPECTED_PULL_REQUEST_COMMIT_EVENT = `<div class="board-comment-wrap"><ul class="comments" id="comments"><li class="event" id="comment-94"><span class="state changed">Committed</span><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><strong>Dev Member</strong></a> has committed.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-94" title="Jul 3, 2026">Jul 3, 2026</a></span><a href="__BASE_PATH__/admin/sample/compare/basehash...headhash" class="ybtn ybtn-mini">Additional changes</a><ul class="commit-list"><li class="comment-body commit-info outdated"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/1234567890abcdef" class="commit-id">1234567</a><a href="__BASE_PATH__/dev" class="avatar-wrap small hide-in-mobile" title="Dev Member"><img src="/assets/images/default-avatar-32.png"> dev@example.com</a><div class="date hide-in-mobile" title="Jul 3, 2026">Jul 3, 2026</div><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/1234567890abcdef" class="commitMsg short">Fix login</a></li><li class="comment-body commit-info"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890" class="commit-id">abcdef1</a><a href="__BASE_PATH__/dev" class="avatar-wrap small hide-in-mobile" title="Dev Member"><img src="/assets/images/default-avatar-32.png"> dev@example.com</a><div class="date hide-in-mobile" title="Jul 4, 2026">Jul 4, 2026</div><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/abcdef1234567890" class="commitMsg short">Add UI</a></li></ul></li></ul></div>`;

const EXPECTED_PULL_REQUEST_OVERVIEW_WITH_COMMIT_EVENT = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="board-comment-wrap"></div>`,
  EXPECTED_PULL_REQUEST_COMMIT_EVENT,
);

const EXPECTED_PULL_REQUEST_ANONYMOUS_COMMIT_AUTHOR_EVENT = `<div class="board-comment-wrap"><ul class="comments" id="comments"><li class="event" id="comment-95"><span class="state changed">Committed</span><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><strong>Dev Member</strong></a> has committed.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-95" title="Jul 5, 2026">Jul 5, 2026</a></span><ul class="commit-list"><li class="comment-body commit-info"><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/facefeed12345678" class="commit-id">facefee</a><img src="__BASE_PATH__/assets/images/default-avatar-32.png" class="avatar-wrap small hide-in-mobile"><div class="date hide-in-mobile" title="Jul 5, 2026">Jul 5, 2026</div><a href="__BASE_PATH__/admin/sample/pullRequest/9/changes/facefeed12345678" class="commitMsg short">Patch from mail</a></li></ul></li></ul></div>`;

const EXPECTED_PULL_REQUEST_OVERVIEW_WITH_ANONYMOUS_COMMIT_AUTHOR =
  EXPECTED_PULL_REQUEST_OVERVIEW.replace(
    `<div class="board-comment-wrap"></div>`,
    EXPECTED_PULL_REQUEST_ANONYMOUS_COMMIT_AUTHOR_EVENT,
  );

const EXPECTED_PULL_REQUEST_STATE_EVENTS = `<div class="board-comment-wrap"><ul class="comments" id="comments"><li class="event" id="comment-101"><span class="state changed">Approve</span><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><strong>Dev Member</strong></a> completed a pull request review.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-101" title="Jul 5, 2026">Jul 5, 2026</a></span></li><li class="event" id="comment-102"><span class="state changed">Cancel review</span><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><strong>Dev Member</strong></a> withdrew a pull request review.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-102" title="Jul 6, 2026">Jul 6, 2026</a></span></li><li class="event" id="comment-103"><span class="state closed">Closed</span><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><strong>Dev Member</strong></a> closed this pull request.<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-103" title="Jul 7, 2026">Jul 7, 2026</a></span></li><li class="event" id="comment-104"><span class="state merged">Merged</span><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><strong>Dev Member</strong></a> merged commit (<a class="link" href="__BASE_PATH__/admin/sample/commit/mergedcommit123456" title="View commit">mergedc</a>)<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-104" title="Jul 8, 2026">Jul 8, 2026</a></span></li><li class="event" id="comment-105"><span class="state merged">Merged</span><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" title="dev"><strong>Dev Member</strong></a> merged commit ({1})<span class="date"><a href="__BASE_PATH__/admin/sample/pullRequest/9#event-105" title="Jul 9, 2026">Jul 9, 2026</a></span></li></ul></div>`;

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
  `<div class="pull-left"><button id="watch-button" type="button" class="ybtn" data-watching="false">Watch</button></div>`,
  `<div class="pull-left"></div>`,
);

const EXPECTED_PULL_REQUEST_REVIEWER_CONTROLS = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-right"><button id="btnAccept" type="button" class="ybtn ybtn-success">Merge</button></div>`,
  `<div class="pull-right"><div id="reviewers" style="display:inline-block; margin-right:5px;"><span style="font-size: 13px; vertical-align: middle; margin: 0px 10px;"><strong>2</strong> participants</span><a href="__BASE_PATH__/admin" class="usf-group" title="Site Admin"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a></div><button type="button" class="ybtn ybtn-default">Cancel review</button><button id="btnAccept" type="button" class="ybtn ybtn-success">Merge</button></div>`,
);

const EXPECTED_PULL_REQUEST_CONFLICT_STATE = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div>`,
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-conflict">Conflict</span></div>`,
)
  .replace(
    `<div class="pull-right"><button id="btnAccept" type="button" class="ybtn ybtn-success">Merge</button></div>`,
    `<div class="pull-right"><button type="button" class="ybtn ybtn-disabled" title="There are conflicts.">Merge</button></div>`,
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
    `<div class="pull-right"><button id="btnAccept" type="button" class="ybtn ybtn-success">Merge</button></div>`,
    `<div class="pull-right"><button type="button" class="ybtn ybtn-disabled" title="This pull request is not open.">Merge</button></div>`,
  )
  .replace(
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div>`,
    `<div id="state" class="pullRequest-stateInfo"></div>`,
  )
  .replace(
    `<div class="mr5"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a><button type="button" class="ybtn">Close</button></div>`,
    `<div class="mr5"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a><button type="button" class="ybtn">Reopen</button></div>`,
  );

const EXPECTED_PULL_REQUEST_MERGING_STATE = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-right"><button id="btnAccept" type="button" class="ybtn ybtn-success">Merge</button></div>`,
  `<div class="pull-right"><button type="button" class="ybtn ybtn-disabled" title="Now, it's checking the code.">Merge</button></div>`,
).replace(
  `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div>`,
  `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-warnning"><i class="yobicon-supportrequest mr5"></i><span>We are checking if the code is safe. Please wait for a while to complete this process.</span></div></div>`,
);

const EXPECTED_PULL_REQUEST_MERGED_DELETE_BRANCH = EXPECTED_PULL_REQUEST_OVERVIEW.replace(
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-open">Open</span></div>`,
  `<div class="pull-right mr10 mt10"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div><span class="badge nm badge-issue-merged">Merged</span></div>`,
)
  .replace(
    `<div class="pull-right"><button id="btnAccept" type="button" class="ybtn ybtn-success">Merge</button></div>`,
    `<div class="pull-right"></div>`,
  )
  .replace(
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-success"><i class="yobicon-check-circle-alt mr5"></i><span>This pull request can be merged safely.</span></div></div>`,
    `<div id="state" class="pullRequest-stateInfo"><div class="alert alert-info"><a href="__BASE_PATH__/admin" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="25" height="25"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a> accepted this pull request.<code>feature/ui</code> You can delete branch.<button type="button" class="ybtn ybtn-danger ybtn-mini pull-right">Delete branch</button></div></div>`,
  )
  .replace(
    `<div class="mr5"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a><button type="button" class="ybtn">Close</button></div>`,
    `<div class="mr5"><a href="__BASE_PATH__/admin/sample/pullRequest/9/editform" class="ybtn">Edit</a></div>`,
  );

const EXPECTED_PULL_REQUEST_MERGED_RESTORE_BRANCH =
  EXPECTED_PULL_REQUEST_MERGED_DELETE_BRANCH.replace(
    `<code>feature/ui</code> You can delete branch.<button type="button" class="ybtn ybtn-danger ybtn-mini pull-right">Delete branch</button>`,
    `<code>feature/ui</code> Branch can be restored.<button type="button" class="ybtn ybtn-info ybtn-mini pull-right">Restore branch</button>`,
  );

test("project pull request overview matches legacy git/view.scala.html empty-event DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page);

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  await expect(page).toHaveTitle("Pull request - admin/sample");
  await expect.poll(() => firstHeadTitleText(page)).toBe("Pull request - admin/sample");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator(".board-header.issue .title")).toContainText("#9 Initial title");
  await expect(page.locator("#state .alert-success")).toContainText(
    "This pull request can be merged safely.",
  );
  await expect(page.locator("#btnAccept")).toHaveClass("ybtn ybtn-success");
  await expect(page.locator("#btnAccept")).toHaveText("Merge");
  await expect(page.locator("#btnAccept")).not.toHaveAttribute("data-request-uri", /.+/u);
  await expect(page.locator("#btnAccept")).not.toHaveAttribute("data-request-method", /.+/u);
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
  await expectNoRouteTooltipInitializers(page);
  await expect(page.locator(".pullRequest-branchInfo .from")).toHaveAttribute("title", "From");
  await expect(page.locator(".pullRequest-branchInfo .to")).toHaveAttribute("title", "To");
  await expect(page.locator(".pullRequest-branchInfo .from")).not.toHaveAttribute(
    "data-original-title",
    /.+/u,
  );
  await expect(page.locator(".pullRequest-branchInfo .to")).not.toHaveAttribute(
    "data-original-title",
    /.+/u,
  );
  await expect(page.locator(".pullRequest-branchInfo .from")).not.toHaveAttribute(
    "data-toggle",
    /.+/u,
  );
  await expect(page.locator(".pullRequest-branchInfo .to")).not.toHaveAttribute(
    "data-toggle",
    /.+/u,
  );
  await expectNoRouteTooltipPlacements(page);
  await expect(page.locator(".board-footer .mr5 .ybtn").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/9/editform`,
  );
  await expectLegacyAnchor(page.locator(".board-footer .mr5 .ybtn").first(), {
    class: "ybtn",
    href: `${basePath}/admin/sample/pullRequest/9/editform`,
    text: "Edit",
  });
  const closeFooterButton = page.locator(".board-footer .mr5 button.ybtn").filter({
    hasText: "Close",
  });
  await expect(closeFooterButton).toHaveCount(1);
  await expect(closeFooterButton).not.toHaveAttribute("data-request-uri", /.+/u);
  await expect(closeFooterButton).not.toHaveAttribute("data-request-method", /.+/u);
  await expect(page.locator("[data-request-uri], [data-request-method]")).toHaveCount(0);

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
    boardBodyContentPadding: "15px 20px",
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
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-owner="global-gnb-search-box"]');
  // wave-33 retained-class retention (667398a04)
  await expect(searchBox).toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).toHaveClass(/\bselect\b/);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  const scopeButtons = page.locator("[data-owner=global-gnb-search-scope-item] > button");
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(page.locator(".gnb-search-form [data-toggle='search-scope']")).toHaveCount(0);
  await expect(page.locator(".gnb-search-form [data-action]")).toHaveCount(0);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );
  expect(new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/pullRequest/9`);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(2).click();
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

async function firstHeadTitleText(page: Page) {
  return page.evaluate(() => document.head.querySelector("title")?.textContent ?? "");
}

async function pullRequestOverviewNavbarMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const search = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
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
  expect(routeSource).toContain(
    '<title>{`${t("menu.pullRequest")} - ${ownerName}/${projectName}`}</title>',
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
  expect(routeSource).not.toContain("__legacyPullRequestDetailActiveMarker");

  expect(routeSource).not.toContain("window.location");
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain("globalThis.document");
  expect(routeSource).not.toContain('data-original-title={t("pullRequest.from")}');
  expect(routeSource).not.toContain('data-original-title={t("pullRequest.to")}');
  expect(routeSource).not.toContain("data-placement");

  expect(routeSource).not.toMatch(
    /(?:useEffect|useLayoutEffect)[\s\S]{0,240}(?:document|globalThis\.document)[\s\S]{0,120}\.title/u,
  );
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
  expect(routeSource).toContain('type HelpModalState = "initial" | "open" | "closed";');
  expect(routeSource).toContain(
    'const [helpMessageState, setHelpMessageState] = useState<HelpModalState>("initial");',
  );
  expect(routeSource).toContain(
    '<PullRequestHelpModal\n        state={helpMessageState}\n        onClose={() => setHelpMessageState("closed")}',
  );
  expect(routeSource).toContain(
    "function insulateModalButtonClick(event: MouseEvent<HTMLButtonElement>) {",
  );
  expect(routeSource).toContain("event.preventDefault();");
  expect(routeSource).toContain("event.stopPropagation();");
  expect(routeSource.match(/insulateModalButtonClick\(event\);/g)?.length ?? 0).toBe(2);
  expect(routeSource).toContain(
    'isOpen ? "modal hide fade pullreq-info in" : "modal hide fade pullreq-info"',
  );

  expect(routeSource).toContain(
    'const ariaHidden = state === "initial" ? undefined : isOpen ? "false" : "true";',
  );
  expect(routeSource).toContain('className="modal-backdrop fade in"');
  expect(routeSource).toContain('role="presentation"');
  expect(routeSource).toContain("onClick={onClose}");
  expect(routeSource).toContain("onKeyUp={onClose}");
  expect(routeSource).toContain("commitId: commit.commitId");
  expect(routeSource).not.toContain("commitPath as never");
  expect(routeSource).not.toContain("to={to as never}");
  expect(routeSource).toContain('to="."');
  expect(routeSource).toContain("hash={`event-${event.id}`}");
  expect(routeSource).not.toContain("data-request-method");
  expect(routeSource).not.toContain("data-request-uri");
  expect(routeSource).not.toContain("Legacy data-request-method controls below are POST actions");
  expect(routeSource).not.toContain("Restore branch is a legacy POST action");
  expect(routeSource).not.toMatch(/<a\b[^>]*data-request-method=/u);
  expect(routeSource).not.toMatch(/id="watch-button"[\s\S]{0,240}data-toggle="button"/u);
  expect(routeSource).not.toMatch(/document\.|querySelector|classList|style\.display/u);
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("project pull request overview retires the overridden branch start ml0 fallback", async ({
  page,
}) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const appCssSource = readFileSync("src/app.css", "utf8");
  const legacyPartial = readFileSync(
    "../yona-original/app/views/git/partial_branch.scala.html",
    "utf8",
  );
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobiconCss = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(legacyPartial).toContain('<i class="yobicon-branch ml0"></i>');
  expect(commonLess).toContain(".ml0 { margin-left:0; }");
  expect(pageLess).toContain("i { font-size:12px; margin:0 5px; color: @yobi-cyan-dark; }");
  expect(yobiLess.indexOf('@import "less/_common.less";')).toBeLessThan(
    yobiLess.indexOf('@import "less/_page.less";'),
  );
  expect(yobiconCss).toContain('[class^="yobicon-"]');
  expect(yobiconCss).toContain("font-family: 'yobicon';");
  expect(yobiconCss).toContain("display: inline-block;");

  expect(routeSource).toContain('data-owner="pull-request-detail-branch-start-icon"');
  expect(routeSource).toContain('data-owner="pull-request-detail-branch-direction-icon"');
  expect(routeSource).not.toContain("yobicon-branch ml0");

  expect(styleSource).toMatch(/\[class\^="yobicon-"\][\s\S]*?font-weight:\s*normal/u);
  expect(styleSource).toMatch(/\[class\^="yobicon-"\][\s\S]*?line-height:\s*1/u);

  // F6 copy-fix-current-dom: legacy ml10 folded into margin-left 10px
  // (-pull-request-detail.style.ts:107-109)

  expect(appCssSource).not.toMatch(/\.ml0\s*\{/u);
  expect(appCssSource).toMatch(/\.ml10\s*\{/u);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1280 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    // F2-harness: the in-browser harness passes no `browser` fixture
    // (runWithPage only provides { page }); resize the fixture page instead.
    await page.setViewportSize(viewport);
    const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
    await mockPullRequestOverview(page);
    await page.goto(`${basePath}/admin/sample/pullRequest/9`);

    const branchInfo = page.locator(".pullRequest-branchInfo");
    const startIcon = page.locator('[data-owner="pull-request-detail-branch-start-icon"]');
    const directionIcon = page.locator('[data-owner="pull-request-detail-branch-direction-icon"]');
    const fromBranch = page.locator(".pullRequest-branchInfo .from .branchName");
    const toBranch = page.locator(".pullRequest-branchInfo .to .branchName");
    await expect(branchInfo).toBeVisible();
    await expect(startIcon).toBeVisible();
    await expect(directionIcon).toBeVisible();
    await expect(startIcon).toHaveClass(/\byobicon-branch\b/u);
    await expect(startIcon).not.toHaveClass(/\bml0\b/u);
    await expect(directionIcon).toHaveClass(/\byobicon-right-2\b/u);
    await expect(directionIcon).toHaveClass(/\bml10\b/u);
    await expect(fromBranch).toBeVisible();
    await expect(fromBranch).toHaveText("feature/ui");
    await expect(toBranch).toBeVisible();
    await expect(toBranch).toHaveText("main");

    const metrics = await branchInfo.evaluate(
      (branchElement, ownerSelectors) => {
        const start = branchElement.querySelector<HTMLElement>(ownerSelectors.start);
        const direction = branchElement.querySelector<HTMLElement>(ownerSelectors.direction);
        const fromCode = branchElement.querySelector<HTMLElement>("code.from");
        const toCode = branchElement.querySelector<HTMLElement>("code.to");
        const boardBody = branchElement.closest<HTMLElement>(".board-body");
        if (!start || !direction || !fromCode || !toCode || !boardBody) {
          throw new Error("Expected branch-info geometry targets are missing");
        }
        const branchBox = branchElement.getBoundingClientRect();
        const startBox = start.getBoundingClientRect();
        const directionBox = direction.getBoundingClientRect();
        const fromBox = fromCode.getBoundingClientRect();
        const toBox = toCode.getBoundingClientRect();
        const bodyBox = boardBody.getBoundingClientRect();
        const iconMetrics = (icon: HTMLElement, box: DOMRect) => {
          const style = window.getComputedStyle(icon);
          return {
            bottom: box.bottom,
            display: style.display,
            fontFamily: style.fontFamily,
            fontStyle: style.fontStyle,
            fontVariant: style.fontVariant,
            fontWeight: style.fontWeight,
            height: box.height,
            left: box.left,
            lineHeight: style.lineHeight,
            marginLeft: style.marginLeft,
            marginRight: style.marginRight,
            pseudoContent: window.getComputedStyle(icon, "::before").content,
            right: box.right,
            top: box.top,
            width: box.width,
          };
        };
        return {
          bodyLeft: bodyBox.left,
          bodyRight: bodyBox.right,
          branchLeft: branchBox.left,
          branchRight: branchBox.right,
          direction: iconMetrics(direction, directionBox),
          fromLeft: fromBox.left,
          overflowX: branchElement.scrollWidth - branchElement.clientWidth,
          sourceOrder: [start, fromCode, direction, toCode].every(
            (node, index, nodes) =>
              index === nodes.length - 1 ||
              Boolean(
                node.compareDocumentPosition(nodes[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING,
              ),
          ),
          start: iconMetrics(start, startBox),
          toLeft: toBox.left,
        };
      },
      {
        direction: '[data-owner="pull-request-detail-branch-direction-icon"]',
        start: '[data-owner="pull-request-detail-branch-start-icon"]',
      },
    );

    expect(metrics.branchLeft).toBeGreaterThanOrEqual(metrics.bodyLeft);
    expect(metrics.branchRight).toBeLessThanOrEqual(metrics.bodyRight);
    expect(metrics.overflowX).toBeLessThanOrEqual(0);
    expect(metrics.sourceOrder).toBe(true);
    for (const icon of [metrics.start, metrics.direction]) {
      expect(icon.display).toBe("inline-block");
      expect(icon.fontFamily).toBe("yobicon");
      expect(icon.fontStyle).toBe("normal");
      expect(icon.fontVariant).toBe("normal");
      expect(icon.fontWeight).toBe("400");
      expect(icon.lineHeight).toBe("12px");
      // F6 copy-fix-current-dom: direction icon carries the legacy ml10 as
      // margin-left 10px ("0 5px 0 10px"); the start icon keeps the base "0 5px".
      expect(icon.marginLeft).toBe(icon === metrics.direction ? "10px" : "5px");
      expect(icon.marginRight).toBe("5px");
      expect(icon.width).toBeGreaterThan(0);
      expect(icon.height).toBeGreaterThan(0);
      expect(icon.left).toBeGreaterThanOrEqual(metrics.branchLeft);
      expect(icon.right).toBeLessThanOrEqual(metrics.branchRight);
    }
    expect(metrics.start.pseudoContent).toContain(String.fromCodePoint(0xe4ed));
    expect(metrics.direction.pseudoContent).toContain(String.fromCodePoint(0xe504));

    mkdirSync(BATCH_785_SCREENSHOT_DIRECTORY, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(BATCH_785_SCREENSHOT_DIRECTORY, `local-pull-request-${viewport.name}.png`),
    });

    await fromBranch.click();
    await expect(page).toHaveURL(`${basePath}/admin/sample/code/feature%2Fui`);
    await page.close();
  }
});

test("project pull request overview badge maps the legacy partial to a conditional Style owner", () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacySource = readFileSync(
    "../yona-original/app/views/git/partial_info.scala.html",
    "utf8",
  );
  const appCssSource = readFileSync("src/app.css", "utf8");
  const pageLessSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const generatedFallbackSource = readFileSync(
    "public/legacy-assets/stylesheets/legacy-fallback.css",
    "utf8",
  );

  expect(legacySource).toContain(
    '<span class="badge nm @if(pull.isConflict == true) {badge-issue-conflict} else {badge-issue-@pull.state.state.toLowerCase}">',
  );
  expect(routeSource).toContain('data-owner="pull-request-detail-badge"');

  for (const selector of [
    '.badge[class*="badge-issue-"] {',
    ".badge.badge-issue-open {",
    ".badge.badge-issue-closed {",
    ".badge.badge-issue-rejected {",
    ".badge.badge-issue-merged {",
    ".badge.badge-issue-conflict {",
  ]) {
    expect(appCssSource).not.toContain(selector);
  }
  expect(appCssSource).toContain(".badge {");
  for (const declaration of [
    ".badge {",
    "margin-right:25px;",
    "padding:5px 15px;",
    "line-height:20px;",
    "&.badge-issue-open",
    "&.badge-issue-closed",
    "&.badge-issue-rejected",
    "&.badge-issue-merged",
    "&.badge-issue-conflict",
  ]) {
    expect(pageLessSource).toContain(declaration);
  }
  for (const declaration of [
    ".badge {",
    "padding: 5px 15px;",
    ".badge.badge-issue-open {",
    ".badge.badge-issue-closed {",
    ".badge.badge-issue-rejected {",
    ".badge.badge-issue-merged {",
    ".badge.badge-issue-conflict {",
  ]) {
    expect(generatedFallbackSource).toContain(declaration);
  }
});

test("project pull request overview badge keeps exact legacy declarations in every visible state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const states = [
    ["open", false, "badge-issue-open", "Open", "rgb(182, 218, 84)"],
    ["closed", false, "badge-issue-closed", "Closed", "rgb(253, 105, 86)"],
    ["open", true, "badge-issue-conflict", "Conflict", "rgb(192, 57, 43)"],
    ["merged", false, "badge-issue-merged", "Merged", "rgb(101, 201, 223)"],
  ] as const;

  for (const [state, conflict, stateClass, copy, backgroundColor] of states) {
    const statePage = await page.context().newPage();
    await mockPullRequestOverview(statePage, { detail: { conflict, state } });
    await statePage.setViewportSize({ width: 1280, height: 900 });
    await statePage.goto(`${basePath}/admin/sample/pullRequest/9`);

    const badge = statePage.locator(`.${stateClass}`);
    await expect(badge).toHaveText(copy);
    await expect(badge).toHaveAttribute("data-owner", "pull-request-detail-badge");
    await expect
      .poll(() =>
        badge.evaluate((element) => {
          const style = window.getComputedStyle(element);
          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            color: style.color,
            display: style.display,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            marginRight: style.marginRight,
            padding: style.padding,
          };
        }),
      )
      .toEqual({
        backgroundColor,
        borderRadius: "15px",
        color: "rgb(255, 255, 255)",
        display: "inline-block",
        fontWeight: "700",
        lineHeight: "20px",
        marginRight: "0px",
        padding: "5px 15px",
      });

    await statePage.setViewportSize({ width: 390, height: 844 });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveCSS("background-color", backgroundColor);
    await expect(badge).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(badge).toHaveCSS("display", "inline-block");
    await expect(badge).toHaveCSS("font-weight", "700");
    await expect(badge).toHaveCSS("margin-right", "0px");
    await expect(badge).toHaveCSS("padding", "5px 15px");
    await statePage.close();
  }
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
  expect(routeSource).toContain('type HelpModalState = "initial" | "open" | "closed";');
  expect(routeSource).toContain(
    'const [helpMessageState, setHelpMessageState] = useState<HelpModalState>("initial");',
  );
  expect(routeSource).not.toContain('data-toggle="modal"');
  expect(routeSource).not.toContain('data-target="#helpMessage"');
  expect(routeSource).not.toContain('data-dismiss="modal"');

  expect(routeSource).toContain(
    'const ariaHidden = state === "initial" ? undefined : isOpen ? "false" : "true";',
  );
  expect(routeSource).toContain('className="modal-backdrop fade in"');
  expect(routeSource).toContain('role="presentation"');
  expect(routeSource).toContain("onClick={onClose}");
  expect(routeSource).toContain("onKeyUp={onClose}");
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
  await expectNoRouteTooltipInitializers(page);
  await expect(event.locator("> a.usf-group").first()).not.toHaveAttribute("data-placement", /.+/u);
  await expect(event.locator("> a.usf-group").first()).toHaveAttribute("title", "dev");
  await expect(event.locator("> a.usf-group").nth(1)).not.toHaveAttribute("data-placement", /.+/u);
  await expect(event.locator("> a.usf-group").nth(1)).toHaveAttribute("title", "dev");
  await expectNoRouteTooltipPlacements(page);
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
    // F5 dist-truth: legacy .commit-id width:70px (_page.less:3349-3355); pin was stale at 74
    commitIdWidth: 70,
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

test("project pull request overview renders anonymous commit author as legacy plain avatar", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestOverview(page, {
    events: [
      {
        commits: [
          {
            authorDateLabel: "Jul 5, 2026",
            authorEmail: "external@example.net",
            commitId: "facefeed12345678",
            commitMessage: "Patch from mail",
            commitShortId: "facefee",
            state: "CURRENT",
          },
        ],
        createdLabel: "Jul 5, 2026",
        eventType: "PULL_REQUEST_COMMIT_CHANGED",
        id: 95,
        newValue: "125",
        oldValue: "",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  const commitInfo = page.locator("#comment-95 .commit-info");
  await expect(commitInfo.locator(".avatar-wrap.small.hide-in-mobile")).toHaveCount(1);
  await expect(commitInfo.locator("a.avatar-wrap.small.hide-in-mobile")).toHaveCount(0);
  await expect(commitInfo.locator("img.avatar-wrap.small.hide-in-mobile")).toHaveAttribute(
    "src",
    `${basePath}/assets/images/default-avatar-32.png`,
  );

  const boxes = await page.locator("#comment-95 .commit-info").evaluate((root) => {
    const commitId = root.querySelector<HTMLElement>(".commit-id");
    const avatar = root.querySelector<HTMLElement>(".avatar-wrap.small.hide-in-mobile");
    const date = root.querySelector<HTMLElement>(".date.hide-in-mobile");
    const message = root.querySelector<HTMLElement>(".commitMsg.short");
    if (!commitId || !avatar || !date || !message) {
      return null;
    }
    const rootBox = root.getBoundingClientRect();
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
      avatar: toBox(avatar),
      commitId: toBox(commitId),
      date: toBox(date),
      message: toBox(message),
      root: {
        bottom: rootBox.bottom,
        left: rootBox.left,
        right: rootBox.right,
        top: rootBox.top,
      },
    };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.commitId.left).toBeGreaterThanOrEqual(boxes!.root.left);
  expect(boxes!.avatar.right).toBeLessThanOrEqual(boxes!.root.right);
  expect(boxes!.date.right).toBeLessThanOrEqual(boxes!.avatar.left);
  expect(boxes!.message.left).toBeGreaterThanOrEqual(boxes!.commitId.right);
  expect(Math.abs(boxes!.avatar.top - boxes!.date.top)).toBeLessThanOrEqual(8);

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_OVERVIEW_WITH_ANONYMOUS_COMMIT_AUTHOR.replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
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
  // F6 copy-fix-current-dom: the legacy .right-txt wrapper is replaced by the
  // style-owned [data-owner="pull-request-detail-help-actions"]
  // ($pullRequestNumber.tsx:369-374); the button keeps the ybtn classes.
  const helpButton = page.locator(
    '[data-owner="pull-request-detail-help-actions"] button[type="button"].ybtn.ybtn-inverse.ybtn-mini',
  );
  await expect(helpButton).toHaveClass("ybtn ybtn-inverse ybtn-mini");
  await expect(helpButton).toHaveText("Help");
  await expect(helpButton).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(helpButton).not.toHaveAttribute("data-target", /.+/u);

  const beforeHelpUrl = page.url();
  await expect(page.locator("#helpMessage")).toHaveClass(/hide/u);
  await expect(page.locator("#helpMessage")).not.toHaveAttribute("style", /./u);
  await expect(page.locator("#helpMessage")).not.toHaveAttribute("aria-hidden", /./u);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await armRootModalBridgeTrap(page);
  await helpButton.click();
  await expect(page).toHaveURL(beforeHelpUrl);
  await expect(page.locator("#helpMessage")).toHaveClass("modal hide fade pullreq-info in");
  await expect(page.locator("#helpMessage")).toHaveAttribute("style", "display: block;");
  await expect(page.locator("#helpMessage")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(backdropPlacement(page)).resolves.toEqual({
    backdropClass: "modal-backdrop fade in",
    previousElementId: "helpMessage",
  });
  await expect(
    page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).resolves.toBe("pull-request-help-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await page.locator(".modal-backdrop.fade.in").click({ position: { x: 5, y: 5 } });
  await expect(page).toHaveURL(beforeHelpUrl);
  await expect(page.locator("#helpMessage")).toHaveClass("modal hide fade pullreq-info");
  await expect(page.locator("#helpMessage")).toHaveAttribute("style", "display: none;");
  await expect(page.locator("#helpMessage")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await armRootModalBridgeTrap(page);
  await helpButton.click();
  await expect(page.locator("#helpMessage")).toHaveClass("modal hide fade pullreq-info in");
  await expect(page.locator("#helpMessage")).toHaveAttribute("style", "display: block;");
  await expect(page.locator("#helpMessage")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(backdropPlacement(page)).resolves.toEqual({
    backdropClass: "modal-backdrop fade in",
    previousElementId: "helpMessage",
  });
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await armRootModalBridgeTrap(page);
  const confirmButton = page.locator("#helpMessage .modal-footer button.ybtn-info");
  await expect(confirmButton).toHaveText("Confirm");
  await expect(confirmButton).not.toHaveAttribute("data-dismiss", /.+/u);
  await confirmButton.click();
  await expect(page).toHaveURL(beforeHelpUrl);
  await expect(page.locator("#helpMessage")).toHaveClass("modal hide fade pullreq-info");
  await expect(page.locator("#helpMessage")).toHaveAttribute("style", "display: none;");
  await expect(page.locator("#helpMessage")).toHaveAttribute("aria-hidden", "true");
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

async function backdropPlacement(page: Page) {
  return page.evaluate(() => {
    const backdrop = document.querySelector<HTMLElement>(".modal-backdrop");
    if (!backdrop) {
      return null;
    }
    return {
      backdropClass: backdrop.className,
      previousElementId: backdrop.previousElementSibling?.id ?? "",
    };
  });
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
  await expect(watchButton).toHaveAttribute("id", "watch-button");
  await expect(watchButton).toHaveAttribute("type", "button");
  await expect(watchButton).toHaveClass("ybtn");
  await expect(watchButton).not.toHaveAttribute("data-toggle", /.+/u);
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
  await expect(watchButton).not.toHaveAttribute("data-toggle", /.+/u);
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
  await expect(watchButton).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(watchButton).toHaveAttribute("data-watching", "false");
  await expect(watchButton).not.toHaveClass(/ybtn-watching/u);
});

test("project pull request overview close and reopen footer controls post and update state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { stateRequests } = await mockPullRequestOverview(page);

  await page.goto(`${basePath}/admin/sample/pullRequest/9`);
  const closeButton = page.locator(".board-footer .mr5 button.ybtn").filter({ hasText: "Close" });
  await expect(closeButton).toHaveText("Close");
  await expect(closeButton).not.toHaveAttribute("data-request-uri", /.+/u);
  await expect(closeButton).not.toHaveAttribute("data-request-method", /.+/u);
  await expect(page.locator(".badge-issue-open")).toHaveText("Open");

  const closeResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/pull-requests/9/close") &&
      response.request().method() === "POST",
  );
  await closeButton.click();
  await closeResponsePromise;

  await expect(page.locator(".badge-issue-closed")).toHaveText("Closed");
  await expect(page.locator("#state")).toBeEmpty();
  const reopenButton = page.locator(".board-footer .mr5 button.ybtn").filter({
    hasText: "Reopen",
  });
  await expect(reopenButton).toHaveText("Reopen");
  await expect(reopenButton).not.toHaveAttribute("data-request-uri", /.+/u);
  await expect(reopenButton).not.toHaveAttribute("data-request-method", /.+/u);

  const reopenResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/pull-requests/9/open") &&
      response.request().method() === "POST",
  );
  await reopenButton.click();
  await reopenResponsePromise;

  await expect(page.locator(".badge-issue-open")).toHaveText("Open");
  await expect(page.locator("#state .alert-success")).toContainText(
    "This pull request can be merged safely.",
  );
  await expect(closeButton).toHaveText("Close");
  expect(stateRequests).toEqual([
    { hasCsrfToken: true, method: "POST", path: "close" },
    { hasCsrfToken: true, method: "POST", path: "open" },
  ]);
});

test("project pull request overview renders legacy reviewer controls DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { reviewRequests } = await mockPullRequestOverview(page, {
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
  const unreviewButton = page.locator("button.ybtn.ybtn-default").filter({
    hasText: "Cancel review",
  });
  await expect(unreviewButton).toHaveText("Cancel review");
  await expect(unreviewButton).not.toHaveAttribute("data-request-uri", /.+/u);
  await expect(unreviewButton).not.toHaveAttribute("data-request-method", /.+/u);
  await expectNoRouteTooltipInitializers(page);
  await expect(page.locator("#reviewers > a.usf-group").first()).not.toHaveAttribute(
    "data-placement",
    /.+/u,
  );
  await expect(page.locator("#reviewers > a.usf-group").first()).toHaveAttribute(
    "title",
    "Site Admin",
  );
  await expect(page.locator("#reviewers > a.usf-group").nth(1)).not.toHaveAttribute(
    "data-placement",
    /.+/u,
  );
  await expect(page.locator("#reviewers > a.usf-group").nth(1)).toHaveAttribute(
    "title",
    "Dev Member",
  );
  await expectNoRouteTooltipPlacements(page);

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_REVIEWER_CONTROLS.replaceAll("__BASE_PATH__", basePath),
    ),
  );

  const unreviewResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/pull-requests/9/unreview") &&
      response.request().method() === "POST",
  );
  await unreviewButton.click();
  await unreviewResponsePromise;
  expect(reviewRequests).toEqual([{ hasCsrfToken: true, method: "POST", path: "unreview" }]);
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
  await expect(page.locator(".ybtn-disabled")).not.toHaveAttribute("data-placement", /.+/u);
  await expect(page.locator(".ybtn-disabled")).not.toHaveAttribute("data-toggle", /.+/u);
  await expectNoRouteTooltipInitializers(page);
  await expectNoRouteTooltipPlacements(page);
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
  const upstreamUrl = projectCodeUrlWithLogin(page.url(), basePath, "admin", "sample", "dev");
  await expect(page.locator(".howto-resolve-conflict")).toContainText("Resolving conflicts");
  await expect(page.locator(".howto-resolve-conflict li").nth(1).locator("code")).toHaveText(
    `git remote add upstream ${upstreamUrl}`,
  );
  // F6 copy-fix-current-dom: strict-mode violation — .howto-resolve-conflict code
  // resolves to 7 elements (== legacy partial_state.scala.html:52-64); the array
  // pin must use toHaveText's element-wise comparison, not toContainText.
  await expect(page.locator(".howto-resolve-conflict code")).toHaveText([
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
  const upstreamUrl = projectCodeUrlWithLogin(page.url(), basePath, "admin", "sample", "dev");
  await expect(page.locator(".pullRequest-branchInfo .from .branchName")).toHaveText(
    "release/hotfix",
  );
  await expect(page.locator(".pullRequest-branchInfo .to .branchName")).toHaveText("production");
  await expect(page.locator(".pullRequest-branchInfo .from .branchName")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/release%2Fhotfix`,
  );
  await expect(page.locator(".howto-resolve-conflict li").nth(1).locator("code")).toHaveText(
    `git remote add upstream ${upstreamUrl}`,
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
  const reopenButton = page.locator(".board-footer .mr5 button.ybtn").filter({
    hasText: "Reopen",
  });
  await expect(reopenButton).toHaveText("Reopen");
  await expect(reopenButton).not.toHaveAttribute("data-request-uri", /.+/u);
  await expect(reopenButton).not.toHaveAttribute("data-request-method", /.+/u);
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
  await expect(page.locator(".ybtn-disabled")).not.toHaveAttribute("data-placement", /.+/u);
  await expect(page.locator(".ybtn-disabled")).not.toHaveAttribute("data-toggle", /.+/u);
  await expectNoRouteTooltipInitializers(page);
  await expectNoRouteTooltipPlacements(page);

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
  const { sourceBranchRequests } = await mockPullRequestOverview(page, {
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
  const deleteBranchButton = page.locator("#state .alert-info button.ybtn-danger");
  await expect(deleteBranchButton).toHaveText("Delete branch");
  await expect(deleteBranchButton).not.toHaveAttribute("data-request-uri", /.+/u);
  await expect(deleteBranchButton).not.toHaveAttribute("data-request-method", /.+/u);

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_MERGED_DELETE_BRANCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );

  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes("/api/v1/owners/admin/projects/sample/pull-requests/9/source-branch") &&
      response.request().method() === "DELETE",
  );
  await deleteBranchButton.click();
  await deleteResponsePromise;
  expect(sourceBranchRequests).toEqual([
    { hasCsrfToken: true, method: "DELETE", path: "source-branch" },
  ]);
});

test("project pull request overview renders legacy merged source-branch restore state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { sourceBranchRequests } = await mockPullRequestOverview(page, {
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
  const restoreBranchButton = page.locator("#state .alert-info button.ybtn-info");
  await expect(restoreBranchButton).toHaveText("Restore branch");
  await expect(restoreBranchButton).not.toHaveAttribute("data-request-uri", /.+/u);
  await expect(restoreBranchButton).not.toHaveAttribute("data-request-method", /.+/u);

  expect(await canonicalizeAll(page, ".page-wrap-outer, #helpMessage")).toEqual(
    await canonicalizeHtmlAll(
      page,
      EXPECTED_PULL_REQUEST_MERGED_RESTORE_BRANCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );

  const restoreResponsePromise = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes("/api/v1/owners/admin/projects/sample/pull-requests/9/source-branch") &&
      response.request().method() === "POST",
  );
  await restoreBranchButton.click();
  await restoreResponsePromise;
  expect(sourceBranchRequests).toEqual([
    { hasCsrfToken: true, method: "POST", path: "source-branch" },
  ]);
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
  const acceptRequests: { hasCsrfToken: boolean; method: string; path: "accept" }[] = [];
  const reviewRequests: {
    hasCsrfToken: boolean;
    method: string;
    path: "review" | "unreview";
  }[] = [];
  const sourceBranchRequests: {
    hasCsrfToken: boolean;
    method: string;
    path: "source-branch";
  }[] = [];
  const watchRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const stateRequests: { hasCsrfToken: boolean; method: string; path: "close" | "open" }[] = [];
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
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
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/close",
    async (route) => {
      stateRequests.push({
        hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
        method: route.request().method(),
        path: "close",
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...detail,
          state: "closed",
        }),
      });
    },
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/9/open", async (route) => {
    stateRequests.push({
      hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
      method: route.request().method(),
      path: "open",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...detail,
        state: "open",
      }),
    });
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/accept",
    async (route) => {
      acceptRequests.push({
        hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
        method: route.request().method(),
        path: "accept",
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...detail,
          state: "merged",
        }),
      });
    },
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/review",
    async (route) => {
      reviewRequests.push({
        hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
        method: route.request().method(),
        path: "review",
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...detail,
          reviewed: true,
        }),
      });
    },
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/unreview",
    async (route) => {
      reviewRequests.push({
        hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
        method: route.request().method(),
        path: "unreview",
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...detail,
          reviewed: false,
        }),
      });
    },
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/source-branch",
    async (route) => {
      sourceBranchRequests.push({
        hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
        method: route.request().method(),
        path: "source-branch",
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...detail,
          permissions: {
            ...(detail.permissions as Record<string, unknown>),
            canDeleteSourceBranch: route.request().method() === "POST",
            canRestoreSourceBranch: route.request().method() === "DELETE",
          },
          sourceBranchExists: route.request().method() === "POST",
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

  return { acceptRequests, reviewRequests, sourceBranchRequests, stateRequests, watchRequests };
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
  // TanStack Router sets aria-current/data-status on active links (STATIC_ACTIVE_PROPS,
  // user activeProps cannot override); canonicalizers strip them in DOM comparisons.
}

async function expectNoRouteTooltipInitializers(page: Page) {
  await expect(page.locator('.project-page-wrap [data-toggle="tooltip"]')).toHaveCount(0);
}

async function expectNoRouteTooltipPlacements(page: Page) {
  await expect(page.locator(".project-page-wrap [data-placement]")).toHaveCount(0);
}

function projectCodeUrlWithLogin(
  currentPageUrl: string,
  basePath: string,
  ownerName: string,
  projectName: string,
  loginId: string,
) {
  const url = new URL(`${basePath}/${ownerName}/${projectName}`, currentPageUrl);
  url.username = loginId;
  return url.toString();
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
            attr.name !== "data-status" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            !(attr.name === "class" && normalizeAttr(attr) === ""),
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
      if (attr.name === "class") {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? normalizeStyleAttr(value) : value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/gu, "");
      if (!normalized.includes("--x-") || !normalized.includes("url(")) {
        return normalized;
      }
      return normalized
        .replace(
          /(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\/([^'")]+?)-[A-Za-z0-9]{8}([^'")]*)(['"]?\))/gu,
          "$1src/assets/legacy/$2$3$4)",
        )
        .replace(/(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\//gu, "$1src/assets/legacy/");
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
            attr.name !== "data-status" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            !(attr.name === "class" && normalizeAttr(attr) === ""),
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
      if (attr.name === "class") {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? normalizeStyleAttr(value) : value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/gu, "");
      if (!normalized.includes("--x-") || !normalized.includes("url(")) {
        return normalized;
      }
      return normalized
        .replace(
          /(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\/([^'")]+?)-[A-Za-z0-9]{8}([^'")]*)(['"]?\))/gu,
          "$1src/assets/legacy/$2$3$4)",
        )
        .replace(/(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\//gu, "$1src/assets/legacy/");
    }

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  }, html);
}
