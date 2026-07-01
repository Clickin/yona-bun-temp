import { expect, test, type Page } from "@playwright/test";

const EXPECTED_ISSUE_DETAIL = `
<div class="page-wrap-outer"><div class="project-page-wrap board-view"><div class="board-header issue"><div class="pull-right mr10 mt10 hide-in-mobile"><div class="date" title="Jul 1, 2026">Jul 1, 2026</div><span class="badge badge-issue-open">Open</span></div><div class="title"><strong class="board-id">11</strong>Fix flaky issue<span class="favorite-issue" data-issue-id="42"><i class="star material-icons va-text-top">star</i></span><div class="pull-right hide show-in-mobile" style="font-size:0.7em"><span class="date" title="Jul 1, 2026">Jul 1, 2026</span><span class="badge badge-small badge-issue-open">Open</span></div></div></div><div class="board-body row-fluid"><div class="span9 span-left-pane"><div class="author-info"><a href="__BASE_PATH__/dev" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></div><div id="issue-11" class="hide"><form action="__BASE_PATH__/api/v1/projects/admin/sample/issues/11/content"><textarea>Body **markdown**</textarea></form></div><div id="issue-body-11"><div class="content markdown-wrap" data-allowed-update="true"><p>Body <strong>markdown</strong></p></div></div><div class="attachments" id="attachments" data-attachments="[]"></div><div class="board-actrow right-txt"><div class="pull-left"><div><button id="watch-button" type="button" class="ybtn " data-toggle="tooltip" data-placement="top" title="Watch this issue" data-watching="false">Watch</button><button id="issue-share-button" type="button" class="ybtn" data-toggle="popover" data-trigger="hover" data-placement="top" data-content="Share this issue">Share issue</button><span class="project-btn-item hide show-in-mobile-inline ml4"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></span><span class="issue-weight"><span class="divider">|</span><button id="upvote-issue-weight" class="ybtn ybtn-small" data-toggle="tooltip" title="Issue weight: Upvote"><i class="yobicon-arrow-up-alt"></i></button><button class="ybtn ybtn-small" id="down-vote-issue-weight" data-toggle="tooltip" title="Issue weight: Down vote"><i class="yobicon-arrow-down-alt"></i></button><span class="weight-number" data-toggle="popover" data-trigger="hover" data-placement="top" data-content="Issue weight description">2</span></span></div></div><div id="vote" class="vote-wrap voter-exists"><a href="__BASE_PATH__/admin/sample/issue/11/vote" class="" title="Vote this issue" data-request-method="post" data-toggle="tooltip"><span class="heart"><i class="yobicon-hearts"></i></span></a><div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div></div><div id="voters" class="modal hide voters-dialog"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h5 class="nm">Issue Voters</h5></div><div class="modal-body"><ul class="unstyled"><li><a href="__BASE_PATH__/admin" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></li><li><a href="__BASE_PATH__/dev" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></li></ul></div><div class="modal-footer"><button id="copyEmailBtn" class="ybtn ybtn-info ybtn-small" data-clipboard-text="Site Admin <admin@example.com>;Dev Member <dev@example.com>;">Copy email</button><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal" aria-hidden="true">Close</button></div></div><span class="act-row"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="Edit"><i class="yobicon-edit-2"></i></button><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></span></div><dl class="sharer-list hideFromDisplayOnly"><dt class="issue-share-title mb10">Issue Sharer <span class="num issue-sharer-count"></span></dt><dd id="sharer-list" class="hideFromDisplayOnly"><input type="hidden" class="bigdrop width100p" id="issueSharer" name="issueSharer" placeholder="Select sharer" value="" title=""></dd></dl><div class="watcher-list"></div><div class="subtasks"></div><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div><div class="span3 span-right-pane mb20"><div class="issue-info"><form id="issueUpdateForm" action="__BASE_PATH__/admin/sample/issues" method="post"><input type="hidden" name="issues[0].id" value="42"><dl><dd class="project-btn-item"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></dd><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="admin" style="width:100%" title=""></dd></dl><dl><dt>Milestone</dt><dd><a href="__BASE_PATH__/admin/sample/milestone/5">v1.0</a></dd></dl><dl><dt>Due date<span class="duedate-status "></span></dt><dd><div class="search search-bar"><input type="text" name="dueDate" value="Jul 5, 2026" class="textbox full" autocomplete="off" data-toggle="calendar"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-toggle="select2" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false" selected="">bug</option></optgroup></select></dd></dl><div class="act-row right-menu-icons"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="Edit"><i class="yobicon-edit-2"></i></button><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></div></form><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div></div></div><div><input type="hidden" id="issueBodyChecksum" value="body-sha1"><input type="hidden" id="numOfComments" value="0"><input type="hidden" id="issueUpdateDate" value="1782892800000"></div><div class="board-footer"></div></div><div id="deleteConfirm" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete issue</h3></div><div class="modal-body"><p>Are you sure you want to delete this post?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-danger" data-request-method="delete" data-request-uri="__BASE_PATH__/admin/sample/issue/11">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div></div>
`;

const TASKLIST = `<div class="tasklist"><div class="task-title">Tasks<span class="done-counter"></span></div><div class="task-progress"><div class="bar red" style="width:0px" title="Tasklist"></div></div></div>`;
const COMMENT_UPDATE_FORM = `<div id="comment-editform-77" class="comment-update-form"><form action="__BASE_PATH__/admin/sample/issue/11/comments/77" method="post" enctype="multipart/form-data"><input type="hidden" name="id" value="77"><div class="write-comment-box"><div class="write-comment-wrap"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-77" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-77" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-77" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="update-comment-body" markdown="true" id="editor-contents-77">Comment **markdown**</textarea></div></div><div id="preview-77" class="tab-pane"><div class="markdown-preview markdown-wrap update-comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div><div class="right-txt comment-update-button upload-button-line"><span class="file-upload"><label for="upload-77" class="file-upload__label ybtn">File upload</label><input id="upload-77" class="file-upload__input" type="file" name="filePath" multiple=""></span><button type="button" class="ybtn ybtn-cancel" data-comment-id="77">Cancel</button><button type="submit" class="ybtn ybtn-info">Save</button></div></div><input type="hidden" name="temporaryUploadFiles" class="temporaryUploadFiles" value=""><div class="preview-77"></div><div class="attachment-files"></div><div id="upload-77" data-resourcetype="ISSUE_COMMENT" data-resourceid="77"></div></div></form></div>`;
const COMMENT_FORM = `<form id="comment-form" action="__BASE_PATH__/admin/sample/issue/11/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-contents" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-contents" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-contents" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-contents"></textarea></div></div><div id="preview-contents" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-wrap content-footer" data-resource-type="ISSUE_COMMENT" id="upload"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form>`;
const COMMENT_FORM_UNAUTHORIZED = `<div class="write-comment-box mt20" title="You need to log in to add comments." data-login="required"><div class="write-comment-wrap"><div class="textarea-box"><textarea class="comment disabled" disabled="" style="cursor:text"></textarea></div><div class="right-txt mt10"><span class="ybtn ybtn-disabled">Add a comment</span></div></div></div>`;
const CHILD_COMMENT_ANCHORS = `<div id="comment-78"></div>`;
const CHILD_COMMENTS = `<div class="add-a-comment pull-right">Reply</div><div class="subcomment-media-body"><div class="child-comments"><div class="one-line-comment"><div class="contents"><p>Child <strong>reply</strong></p><span class="subcomment-author hide">- <a href="__BASE_PATH__/qa1" class="usf-group" data-toggle="tooltip" data-placement="top" title="qa1"><strong>QA One</strong></a><a href="#comment-78" class="ago" title="Jul 2, 2026">Jul 2, 2026</a><a href="javascript:void(0)" type="button" class="btn-transparent deleteButtonX" data-toggle="comment-delete" data-request-uri="__BASE_PATH__/admin/sample/issue/11/comment/78" title="Delete comment">x</a></span></div></div></div><div class="child-comment-input-form"><form action="__BASE_PATH__/admin/sample/issue/11/comments" method="post" enctype="multipart/form-data"><input class="parentCommentId" type="hidden" name="parentCommentId" value="77"><div class="oneline-comment-box"><textarea class="editorSeries" name="contents" markdown="true" rows="1" placeholder="Reply (CTRL + ENTER)"></textarea><button type="submit" class="ybtn ybtn-success">OK</button></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></form></div></div>`;
const LEFT_COMMENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">1</strong></div><hr class="nm"><ul class="comments"><li class="comment " id="comment-77">${CHILD_COMMENT_ANCHORS}<div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="Dev Member"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author"><span class="resp-comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="dev"></a></span><a href="__BASE_PATH__/dev" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a></span><span class="ago-date"><a href="#comment-77" class="ago" title="Jul 2, 2026">Jul 2, 2026</a><a href="#comment-77" class="share-link" style="display:none">[Link]</a></span><span class="act-row pull-right"><span class="new-issue-by"><a href="__BASE_PATH__/user/issues/new?commentId=77">New issue by this comment</a></span><button type="button" class="btn-transparent-with-fontsize-lineheight" title="Agree" data-request-type="comment-vote" data-request-uri="__BASE_PATH__/admin/sample/issue/11/comment/77/vote"><i class="yobicon-hearts vote-heart-off"></i></button><button type="button" class="btn-transparent-with-fontsize-lineheight ml10" data-toggle="comment-edit" data-comment-id="77" title="Edit comment"><i class="yobicon-edit-2"></i></button><button type="button" class="btn-transparent-with-fontsize-lineheight ml6" data-toggle="comment-delete" data-request-uri="__BASE_PATH__/admin/sample/issue/11/comment/77" title="Delete comment"><i class="yobicon-trash"></i></button></span></div>${COMMENT_UPDATE_FORM}<div id="comment-body-77">${TASKLIST}<div class="comment-body markdown-wrap" data-allowed-update="true" data-via-email="false"><p>Comment <strong>markdown</strong></p></div><div class="attachments pull-left" data-attachments="[]"></div></div></div>${CHILD_COMMENTS}</li></ul></div></div>${COMMENT_FORM}</div>`;
const RIGHT_INDEX_COMMENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><strong>Comment</strong> <strong class="num">1</strong></div><ul class="comments"><li class="comment index-comment  " id="comment-77" data-location="#comment-77"><div><div id="comment-body-77"><div class="comment-body"><a href="#comment-77">Comment markdown</a></div></div><div class="index-comment-author"><span class="comment_author"><a href="__BASE_PATH__/dev" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a></span><span class="ago-date"><a href="#comment-77" class="ago" title="Jul 2, 2026">Jul 2, 2026</a><a href="#comment-77" class="share-link" style="display:none">[Link]</a></span></div></div></li></ul></div></div></div>`;
const LEFT_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-88"><span class="state closed">Closed</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> closed this issue<span class="date"><a href="#event-88">Jul 3, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_ASSIGNEE_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-90"><span class="state changed">Assigned</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> assigned this issue to <a href="__BASE_PATH__/admin" class="usf-group" data-toggle="tooltip" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/admin" class="usf-group" data-toggle="tooltip" data-placement="top" title="admin"><strong>Site Admin</strong></a><span class="date"><a href="#event-90">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_MILESTONE_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-91"><span class="state milestone-changed">Update milestone</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> changed milestone to <span class="bold font-blue"><a href="__BASE_PATH__/admin/sample/milestone/5" data-toggle="tooltip" data-placement="bottom" title="Milestone">v1.0</a></span><span class="date"><a href="#event-91">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_MOVED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-92"><span class="state changed">moved</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> moved this issue from <strong><a href="__BASE_PATH__/old-owner/old-project" class="link">old-owner/old-project</a></strong><span class="date"><a href="#event-92">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_DEFAULT_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-89">fallback noteby <a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a><span class="date"><a href="#event-89">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;

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

  const emptyTimeline =
    '<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div>';
  const expected = EXPECTED_ISSUE_DETAIL.replace(emptyTimeline, LEFT_COMMENT_TIMELINE)
    .replace(emptyTimeline, RIGHT_INDEX_COMMENT_TIMELINE)
    .replace(
      '<div id="issue-body-11"><div class="content markdown-wrap"',
      `<div id="issue-body-11">${TASKLIST}<div class="content markdown-wrap"`,
    )
    .replace('id="numOfComments" value="0"', 'id="numOfComments" value="1"')
    .replaceAll("__BASE_PATH__", basePath)
    .replaceAll(' aria-hidden="true"', "");
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail renders legacy read-only selected labels", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#labelIds")).toHaveCount(0);
  await expect(page.locator(".issue-info .label.issue-label.active.static")).toHaveAttribute(
    "data-label-id",
    "8",
  );

  const expected =
    `<dl><dt>Label</dt><dd><a href="__BASE_PATH__/admin/sample/issues?state=open&labelIds=8" class="label issue-label active static" data-label-id="8" style="background:rgb(81, 170, 204)">bug</a></dd></dl>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalize(page, ".issue-info form dl:has(a.label.issue-label.active.static)"),
  ).toEqual(await canonicalizeHtml(page, expected));
});

test("project issue detail renders legacy unauthorized comment form", async ({ page }) => {
  await mockProjectIssueDetail(page, { viewerCanComment: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);
  await expect(page.locator(".span-left-pane > #comments > #comment-form")).toHaveCount(0);
  await expect(page.locator('.span-left-pane > #comments > [data-login="required"]')).toHaveCount(
    1,
  );
  await expect(page.locator("#comment-77 .child-comment-input-form")).toHaveCount(0);

  expect(await canonicalize(page, '.span-left-pane > #comments > [data-login="required"]')).toEqual(
    await canonicalizeHtml(page, COMMENT_FORM_UNAUTHORIZED),
  );
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

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(page, LEFT_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath)),
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

test("project issue detail renders legacy moved timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
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

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(page, LEFT_MOVED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath)),
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
  await expect(page.locator('#comment-77 a[href="#voters-77"].vote-description-people')).toHaveText(
    "6 Agreements",
  );
  await expect(page.locator("#voters-77.voters-dialog")).toHaveCount(1);
  await expect(page.locator('#comment-77 [data-request-type="comment-vote"]')).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/issue/11/comment/77/unvote`,
  );

  const expectedModal =
    `<div id="voters-77" class="modal hide voters-dialog"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h5 class="nm">Issue Voters</h5></div><div class="modal-body"><ul class="unstyled"><li><a href="__BASE_PATH__/admin" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></li><li><a href="__BASE_PATH__/dev" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></li><li><a href="__BASE_PATH__/qa1" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA One</strong><span class="loginid"> <strong>@</strong>qa1</span></a></li><li><a href="__BASE_PATH__/qa2" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA Two</strong><span class="loginid"> <strong>@</strong>qa2</span></a></li><li><a href="__BASE_PATH__/qa3" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA Three</strong><span class="loginid"> <strong>@</strong>qa3</span></a></li><li><a href="__BASE_PATH__/qa4" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA Four</strong><span class="loginid"> <strong>@</strong>qa4</span></a></li></ul></div><div class="modal-footer"><button id="copyEmailBtn" class="ybtn ybtn-info ybtn-small" data-clipboard-text="Site Admin <admin@example.com>;Dev Member <dev@example.com>;QA One <qa1@example.com>;QA Two <qa2@example.com>;QA Three <qa3@example.com>;QA Four <qa4@example.com>;">Copy email</button><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal">Close</button></div></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#voters-77")).toEqual(
    await canonicalizeHtml(page, expectedModal),
  );
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
  await expect(page.locator('#comment-77 a[href="#voters-77"]')).toHaveCount(0);
  await expect(page.locator("#voters-77")).toHaveCount(0);

  const expected =
    `<a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalizeAll(page, "#comment-77 .act-row.pull-right .avatar-wrap.smaller"),
  ).toEqual(await canonicalizeHtml(page, expected));
});

function commentVoters() {
  return [
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
    {
      avatarUrl: "/assets/images/default-avatar-32.png",
      emailAddress: "qa1@example.com",
      loginId: "qa1",
      userId: 3,
      userLabel: "QA One",
    },
    {
      avatarUrl: "/assets/images/default-avatar-32.png",
      emailAddress: "qa2@example.com",
      loginId: "qa2",
      userId: 4,
      userLabel: "QA Two",
    },
    {
      avatarUrl: "/assets/images/default-avatar-32.png",
      emailAddress: "qa3@example.com",
      loginId: "qa3",
      userId: 5,
      userLabel: "QA Three",
    },
    {
      avatarUrl: "/assets/images/default-avatar-32.png",
      emailAddress: "qa4@example.com",
      loginId: "qa4",
      userId: 6,
      userLabel: "QA Four",
    },
  ];
}

async function mockProjectIssueDetail(page: Page, issueOverrides: Record<string, unknown> = {}) {
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
    const issue = {
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
      commentCount: 1,
      comments: [
        {
          attachments: [],
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          authorLabel: "Dev Member",
          authorLoginId: "dev",
          childComments: [
            {
              authorLabel: "QA One",
              authorLoginId: "qa1",
              contentsHtml: "<p>Child <strong>reply</strong></p>",
              createdLabel: "Jul 2, 2026",
              id: 78,
              viewerCanDelete: true,
            },
          ],
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
      ...issueOverrides,
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(issue),
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

async function canonicalizeAll(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((roots) => {
    return roots.map((root) => visit(root)).join("");

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
