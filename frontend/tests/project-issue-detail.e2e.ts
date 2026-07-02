import { expect, test, type Page } from "@playwright/test";

const ISSUE_DETAIL_KEYMAP = `<div class="pull-left" style="padding:10px 0px;margin-left:55px"><a href="#helpKeys" data-toggle="modal" class="ybtn ybtn-inverse ybtn-mini">Keyboard shortcuts</a><div id="helpKeys" class="modal hide fade keymap-help" tabindex="-1" role="dialog"><div class="row-fluid"><div class="span3"><h5>projects</h5><span class="ybtn ybtn-small">H</span><span class="help-inline">Home</span><br><span class="ybtn ybtn-small">B</span><span class="help-inline">Board</span><br><span class="ybtn ybtn-small">I</span><span class="help-inline">Issue</span><br><span class="ybtn ybtn-small">C</span><span class="help-inline">Code</span><br><span class="ybtn ybtn-small">M</span><span class="help-inline">Milestone</span><br><span class="ybtn ybtn-small">P</span><span class="help-inline">Pull request</span><br><span class="ybtn ybtn-small">Q</span><span class="help-inline">Settings</span><br></div><div class="span9"><div class="row-fluid"><div class="span5"><h5>Issue details</h5><span class="ybtn ybtn-small">N</span><span class="help-inline">New issue</span><br><span class="ybtn ybtn-small">L</span><span class="help-inline">List</span><br><span class="ybtn ybtn-small">E</span><span class="help-inline">Edit</span><br></div><div class="span7"><h5>Site</h5><span class="ybtn ybtn-small">A</span><span class="help-inline">My Issues</span><br><span class="ybtn ybtn-small">U</span><span class="help-inline">Profile</span><br><span class="ybtn ybtn-small">F</span><span class="help-inline">User menu</span><br>__SITE_SEARCH_KEYS__<span class="help-inline">Site search</span><br><span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Submit form</span><br></div></div><div class="row-fluid mt20"><div class="span12"><h5>Issue Comments</h5><span class="ybtn ybtn-small">SHIFT</span> + <span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Comment &amp; Close issue</span><br></div></div></div></div><p class="actrow"><button type="button" class="ybtn ybtn-info" data-dismiss="modal">Confirm</button></p></div></div>`;

const EXPECTED_ISSUE_DETAIL = `
<div class="page-wrap-outer"><div class="project-page-wrap board-view"><div class="board-header issue"><div class="pull-right mr10 mt10 hide-in-mobile"><div class="date" title="Jul 1, 2026">Jul 1, 2026</div><span class="badge badge-issue-open">Open</span></div><div class="title"><strong class="board-id">11</strong>Fix flaky issue<span class="favorite-issue" data-issue-id="42"><i class="star material-icons va-text-top">star</i></span><div class="pull-right hide show-in-mobile" style="font-size:0.7em"><span class="date" title="Jul 1, 2026">Jul 1, 2026</span><span class="badge badge-small badge-issue-open">Open</span></div></div></div><div class="board-body row-fluid"><div class="span9 span-left-pane"><div class="author-info"><a href="__BASE_PATH__/dev" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></div><div id="issue-11" class="hide"><form action="__BASE_PATH__/api/v1/projects/admin/sample/issues/11/content"><textarea>Body **markdown**</textarea></form></div><div id="issue-body-11"><div class="content markdown-wrap" data-allowed-update="true"><p>Body <strong>markdown</strong></p></div></div><div class="attachments" id="attachments" data-attachments="[]"></div><div class="board-actrow right-txt"><div class="pull-left"><div><button id="watch-button" type="button" class="ybtn " data-toggle="tooltip" data-placement="top" title="Watch this issue" data-watching="false">Watch</button><button id="issue-share-button" type="button" class="ybtn" data-toggle="popover" data-trigger="hover" data-placement="top" data-content="Share this issue">Share issue</button><span class="project-btn-item hide show-in-mobile-inline ml4"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></span><span class="issue-weight"><span class="divider">|</span><button id="upvote-issue-weight" class="ybtn ybtn-small" data-toggle="tooltip" title="Issue weight: Upvote"><i class="yobicon-arrow-up-alt"></i></button><button class="ybtn ybtn-small" id="down-vote-issue-weight" data-toggle="tooltip" title="Issue weight: Down vote"><i class="yobicon-arrow-down-alt"></i></button><span class="weight-number" data-toggle="popover" data-trigger="hover" data-placement="top" data-content="Issue weight description">2</span></span></div></div><div id="vote" class="vote-wrap voter-exists"><a href="__BASE_PATH__/admin/sample/issue/11/vote" class="" title="Vote this issue" data-request-method="post" data-toggle="tooltip"><span class="heart"><i class="yobicon-hearts"></i></span></a><div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div></div><div id="voters" class="modal hide voters-dialog"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h5 class="nm">Issue Voters</h5></div><div class="modal-body"><ul class="unstyled"><li><a href="__BASE_PATH__/admin" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></li><li><a href="__BASE_PATH__/dev" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></li></ul></div><div class="modal-footer"><button id="copyEmailBtn" class="ybtn ybtn-info ybtn-small" data-clipboard-text="Site Admin <admin@example.com>;Dev Member <dev@example.com>;">Copy email</button><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal" aria-hidden="true">Close</button></div></div><span class="act-row"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="Edit"><i class="yobicon-edit-2"></i></button><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></span></div><dl class="sharer-list hideFromDisplayOnly"><dt class="issue-share-title mb10">Issue Sharer <span class="num issue-sharer-count"></span></dt><dd id="sharer-list" class="hideFromDisplayOnly"><input type="hidden" class="bigdrop width100p" id="issueSharer" name="issueSharer" placeholder="Select sharer" value="" title=""></dd></dl><div class="watcher-list"></div><div class="subtasks"></div><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div><div class="span3 span-right-pane mb20"><div class="issue-info"><form id="issueUpdateForm" action="__BASE_PATH__/admin/sample/issues" method="post"><input type="hidden" name="issues[0].id" value="42"><dl><dd class="project-btn-item"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></dd><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="admin" style="width:100%" title=""></dd></dl><dl><dt>Milestone</dt><dd><a href="__BASE_PATH__/admin/sample/milestone/5">v1.0</a></dd></dl><dl><dt>Due date<span class="duedate-status "></span></dt><dd><div class="search search-bar"><input type="text" name="dueDate" value="Jul 5, 2026" class="textbox full" autocomplete="off" data-toggle="calendar"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-toggle="select2" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false" selected="">bug</option></optgroup></select></dd></dl><div class="act-row right-menu-icons"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="Edit"><i class="yobicon-edit-2"></i></button><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></div></form><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div></div></div><div><input type="hidden" id="issueBodyChecksum" value="body-sha1"><input type="hidden" id="numOfComments" value="0"><input type="hidden" id="issueUpdateDate" value="1782892800000"></div><div class="board-footer">${ISSUE_DETAIL_KEYMAP}</div></div><div id="deleteConfirm" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete issue</h3></div><div class="modal-body"><p>Are you sure you want to delete this post?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-danger" data-request-method="delete" data-request-uri="__BASE_PATH__/admin/sample/issue/11">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div><div id="comment-delete-modal" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete comment</h3></div><div class="modal-body"><p>Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?</p></div><div class="modal-footer"><button id="comment-delete-confirm" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div></div>
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
const LEFT_NULL_MILESTONE_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-99"><span class="state milestone-changed">Update milestone</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> changed milestone to <span class="bold">None</span><span class="date"><a href="#event-99">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_MOVED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-92"><span class="state changed">moved</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> moved this issue from <strong><a href="__BASE_PATH__/old-owner/old-project" class="link">old-owner/old-project</a></strong><span class="date"><a href="#event-92">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_COMMIT_REFERRED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-93"><span class="state changed">mentioned</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> mentioned this issue in <strong>Commit <a href="__BASE_PATH__/admin/sample/commit/abcdef0" class="link">@abcdef0</a></strong><span class="date"><a href="#event-93">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_PULL_REQUEST_REFERRED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-94"><span class="state changed">mentioned</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> mentioned this issue in <strong>Pull request -3 <a href="__BASE_PATH__/admin/sample/pullRequest/3" class="link">Fix login redirect</a></strong><span class="date"><a href="#event-94">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_SHARER_ADDED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-95"><span class="state sharer-added">Issue Sharer</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> shared current issue to <a href="__BASE_PATH__/qa1" class="usf-group" data-toggle="tooltip" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa1" class="usf-group" data-toggle="tooltip" data-placement="top" title="qa1"><strong>QA One</strong></a><span class="date"><a href="#event-95">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_SHARER_DELETED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-96"><span class="state sharer-deleted">Cancelled</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> cancelled issue sharing with <a href="__BASE_PATH__/qa1" class="usf-group" data-toggle="tooltip" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa1" class="usf-group" data-toggle="tooltip" data-placement="top" title="qa1"><strong>QA One</strong></a><span class="date"><a href="#event-96">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_LABEL_ADDED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-97"><span class="state label-added">Added</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> added <div class="label issue-label" style="background-color: rgb(81, 170, 204)">bug</div> label<span class="date"><a href="#event-97">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_LABEL_DELETED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-98"><span class="state label-deleted">Removed</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> removed <div class="label issue-label" style="background-color: rgb(81, 170, 204)">bug</div> label<span class="date"><a href="#event-98">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_CONSECUTIVE_SHARER_ADDED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-100"><span class="state sharer-added">Issue Sharer</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> shared current issue to <a href="__BASE_PATH__/qa1" class="usf-group" data-toggle="tooltip" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa1" class="usf-group" data-toggle="tooltip" data-placement="top" title="qa1"><strong>QA One</strong></a><span class="date"><a href="#event-100">Jul 4, 2026</a></span></li><li class="event" id="event-101"><span class="state"></span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> shared current issue to <a href="__BASE_PATH__/qa2" class="usf-group" data-toggle="tooltip" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa2" class="usf-group" data-toggle="tooltip" data-placement="top" title="qa2"><strong>QA Two</strong></a><span class="date"><a href="#event-101">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_CONSECUTIVE_LABEL_DELETED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-102"><span class="state label-deleted">Removed</span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> removed <div class="label issue-label" style="background-color: rgb(81, 170, 204)">bug</div> label<span class="date"><a href="#event-102">Jul 4, 2026</a></span></li><li class="event" id="event-103"><span class="state"></span><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a> removed <div class="label issue-label" style="background-color: rgb(81, 170, 204)">bug</div> label<span class="date"><a href="#event-103">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
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
  expect(await issueDetailShellMetrics(page)).toEqual({
    actionMargin: "20px 0px",
    actionOverflow: "auto",
    actionPaddingRight: "15px",
    bodyMarginTop: "0px",
    contentMarginBottom: "20px",
    contentMinHeight: "150px",
    contentPadding: "0px 20px",
    footerFontSize: "0px",
    footerMarginTop: "20px",
    footerTextAlign: "right",
    headerMargin: "15px 0px",
    issueInfoPadding: "15px 0px 0px 10px",
    leftPaneWidth: 938,
    outerMarginTop: "10px",
    outerMinHeight: "450px",
    projectMarginTop: "5px",
    rightPaneWidth: 295,
    titleBackground: "rgb(242, 242, 242)",
    titleBorderRadius: "10px",
    titleFontSize: "18px",
    titleLineHeight: "30px",
    titlePadding: "10px 20px",
  });
  expect(await indexCommentMetrics(page)).toEqual({
    authorDisplay: "block",
    bodyPadding: "5px 20px",
    bodyText: "Comment markdown",
    childCountMarkers: 0,
    commentDisplay: "list-item",
    dataLocation: "#comment-77",
    listDisplay: "block",
    rowLeft: 985,
    rowWidth: 285,
    shareDisplay: "none",
  });
  expect(await issueCommentMetrics(page)).toEqual({
    attachmentsDisplay: "block",
    avatarFloat: "left",
    avatarMarginRight: "0px",
    avatarWidth: 37,
    bodyMinHeight: "0px",
    bodyPadding: "15px 20px",
    commentDisplay: "list-item",
    commentPaddingBottom: "10px",
    commentWidth: 938,
    mediaBodyOverflow: "hidden",
    metaHeight: 32,
    metaPaddingTop: "5px",
    replyDisplay: "none",
  });
});

test("project issue detail new subtask link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const newSubtaskLink = page.locator(".span-right-pane .project-btn-item a").filter({
    hasText: "New subtask",
  });
  await expect(newSubtaskLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issueform?parentIssueId=42`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await newSubtaskLink.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/issueform?parentIssueId=42`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#parentId")).toHaveValue("42");
  await expect(page.locator('#parentId option[selected][value="42"]')).toHaveCount(1);
});

test("project issue detail renders legacy posting history modal", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    historyHtml: "Server HTML should not render",
    historyMarkdown: "Previous **body**",
    updatedByAuthorLabel: "Site Admin",
    updatedLabel: "Jul 3, 2026",
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#-yona-posting-history .modal-body")).not.toContainText(
    "Server HTML should not render",
  );

  const history =
    '<div class="posting-history"><a href="#-yona-posting-history" data-toggle="modal"><span class="lastUpdatedBy"><span>Site Admin</span><span>Jul 3, 2026</span></span><span>edited</span></a><div id="-yona-posting-history" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h5 class="nm">Change history</h5></div><div class="modal-body"><p>Previous <strong>body</strong></p></div><div class="modal-footer"><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal">Confirm</button></div></div></div>';
  const expected = EXPECTED_ISSUE_DETAIL.replace(
    '</span></a></div><div id="issue-11"',
    `</span></a>${history}</div><div id="issue-11"`,
  )
    .replace(
      '<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div>',
      LEFT_COMMENT_TIMELINE,
    )
    .replace(
      '<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div>',
      RIGHT_INDEX_COMMENT_TIMELINE,
    )
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

test("project issue detail opens legacy keymap modal through data-toggle modal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await page.locator('.board-footer a[href="#helpKeys"][data-toggle="modal"]').click();
  await expect(page.locator("#helpKeys")).not.toHaveClass(/hide/);
  await expect(page.locator("#helpKeys")).toHaveClass(/in/);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  expect(await keymapModalMetrics(page)).toEqual({
    display: "block",
    firstColumnTitle: "projects",
    left: 320,
    top: 72,
    width: 682,
  });

  await page.locator('#helpKeys [data-dismiss="modal"]').click();
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail switches legacy comment editor tabs through data-toggle tab", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator('#comment-form a[href="#edit-contents"]')).toHaveAttribute(
    "data-toggle",
    "tab",
  );
  await expect(page.locator("#comment-form li:has(> a[href='#edit-contents'])")).toHaveClass(
    /active/,
  );
  await expect(page.locator("#edit-contents")).toHaveClass(/active/);
  await page.locator('#comment-form a[href="#preview-contents"][data-toggle="tab"]').click();
  await expect(page.locator("#comment-form li:has(> a[href='#preview-contents'])")).toHaveClass(
    /active/,
  );
  await expect(page.locator("#preview-contents")).toHaveClass(/active/);
  await expect(page.locator("#edit-contents")).not.toHaveClass(/active/);
});

test("project issue detail toggles legacy comment update form through comment-edit", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  await expect(comment.locator("#comment-editform-77")).toBeHidden();
  await expect(comment.locator("#comment-body-77")).toBeVisible();

  await comment.locator('[data-toggle="comment-edit"][data-comment-id="77"]').click();
  await expect(comment.locator("#comment-editform-77")).toBeVisible();
  await expect(comment.locator("#comment-body-77")).toBeHidden();
  await expect(comment.locator(".add-a-comment")).toBeHidden();
  expect(await commentUpdateFormMetrics(page)).toEqual({
    bodyDisplay: "none",
    buttonLineMarginTop: "10px",
    formDisplay: "block",
    replyDisplay: "none",
    textareaBoxMarginBottom: "10px",
    textareaBoxPaddingRight: "2px",
    textareaValue: "Comment **markdown**",
    writeCommentBoxPadding: "10px",
  });

  await comment.locator("#comment-editform-77 .ybtn-cancel").click();
  await expect(comment.locator("#comment-editform-77")).toBeHidden();
  await expect(comment.locator("#comment-body-77")).toBeVisible();
});

test("project issue detail preserves legacy child comment anchor divs", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const childAnchor = comment.locator(":scope > #comment-78");
  await expect(childAnchor).toHaveCount(1);
  await expect(comment.locator(".one-line-comment #comment-78")).toHaveCount(0);
  await expect(comment.locator('.subcomment-author a[href="#comment-78"].ago')).toHaveText(
    "Jul 2, 2026",
  );

  expect(await childCommentAnchorMetrics(page)).toEqual({
    anchorHeight: 0,
    anchorNextClass: "comment-avatar",
    childHref: "#comment-78",
    inlineChildAnchorCount: 0,
  });
});

test("project issue detail renders legacy draft header state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    isDraft: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".span-left-pane > #comments")).toHaveCount(0);

  const expectedHeader = `<div class="board-header issue"><div class="pull-right mr10 mt10 hide-in-mobile"><div class="date" title="Jul 1, 2026">Jul 1, 2026</div><span class="badge badge-issue-open">Open</span></div><div class="title"><strong class="board-id"><span class="draft-number">#Draft</span></strong>Fix flaky issue<span class="favorite-issue" data-issue-id="42"><i class="star material-icons va-text-top">star</i></span><div class="pull-right hide show-in-mobile" style="font-size:0.7em"><span class="date" title="Jul 1, 2026">Jul 1, 2026</span><span class="badge badge-small badge-issue-open">Open</span></div></div><div class="draft">This is an draft issue. Only you can see it until you publish.</div></div>`;
  expect(await canonicalize(page, ".board-header.issue")).toEqual(
    await canonicalizeHtml(page, expectedHeader),
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
  expect(await selectedLabelMetrics(page)).toEqual({
    ddPadding: "5px 0px",
    dlMarginBottom: "20px",
    dtText: "Label",
    labelBackground: "rgb(81, 170, 204)",
    labelBorderRadius: "1px",
    labelDisplay: "inline-block",
    labelFontSize: "11px",
    labelLineHeight: "12px",
    labelMargin: "0px",
    labelPadding: "2px 4px",
  });
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

  const expected =
    `<dl class="sharer-list"><dt class="issue-share-title mb10">Issue Sharer <span class="num issue-sharer-count">2</span></dt><dd id="sharer-list" class=""><div class="text-ellipsis sharer-item"><a href="__BASE_PATH__/qa1" class="usf-group"><strong class="name">QA One</strong></a></div><div class="text-ellipsis sharer-item"><a href="__BASE_PATH__/qa2" class="usf-group"><strong class="name">QA Two</strong></a></div></dd></dl>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > .sharer-list")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail renders legacy read-only action buttons", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<span class="act-row"><a href="__BASE_PATH__/admin/sample/issue/11/editform"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="See text"><i class="yobicon-edit-2"></i></button></a><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></span>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > .board-actrow > .act-row")).toEqual(
    await canonicalizeHtml(page, expected),
  );

  const expectedRight =
    `<div class="act-row right-menu-icons"><a href="__BASE_PATH__/admin/sample/issue/11/editform"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="See text"><i class="yobicon-edit-2"></i></button></a><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".issue-info .act-row.right-menu-icons")).toEqual(
    await canonicalizeHtml(page, expectedRight),
  );
});

test("project issue detail deletes through legacy confirmation modal", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { deleteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await page.locator('a[href="#deleteConfirm"] button[title="Delete"]').first().click();
  await expect(page.locator("#deleteConfirm")).not.toHaveClass(/hide/);
  expect(deleteRequests).toEqual([]);

  await page
    .locator('#deleteConfirm [data-dismiss="modal"]')
    .last()
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  expect(deleteRequests).toEqual([]);

  await page.locator('a[href="#deleteConfirm"] button[title="Delete"]').first().click();
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

  await page.locator('#comment-77 .media-body > .meta-info [data-toggle="comment-delete"]').click();
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-modal .modal-header h3")).toHaveText("Delete comment");
  await expect(page.locator("#comment-delete-modal .modal-body p")).toHaveText(
    "Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?",
  );
  await expect(page.locator("#comment-delete-confirm")).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/issue/11/comment/77`,
  );
  await expect(page.locator("#comment-delete-confirm")).toHaveAttribute(
    "data-request-method",
    "delete",
  );
  expect(await commentDeleteModalMetrics(page)).toEqual({
    backdropDisplay: "block",
    bodyDisplay: "block",
    confirmMethod: "delete",
    confirmText: "Yes",
    confirmUri: `${basePath}/admin/sample/issue/11/comment/77`,
    display: "block",
    dismissCount: 2,
    footerTextAlign: "right",
    headerDisplay: "block",
    left: 1,
    noText: "No",
    title: "Delete comment",
    top: 10,
    width: 562,
  });
  expect(commentDeleteRequests).toEqual([]);

  await page.locator('#comment-delete-modal [data-dismiss="modal"]').last().click();
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  expect(commentDeleteRequests).toEqual([]);

  await page.locator('#comment-77 .media-body > .meta-info [data-toggle="comment-delete"]').click();
  await page.locator("#comment-delete-confirm").click();
  await expect.poll(() => commentDeleteRequests).toEqual(["DELETE"]);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
});

test("project issue detail votes comments through legacy agree action", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.locator('#comment-77 [data-request-type="comment-vote"]').click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "POST" }]);
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
  await expect(page.locator('#comment-77 [data-request-type="comment-vote"]')).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/issue/11/comment/77/unvote`,
  );
  await page.locator('#comment-77 [data-request-type="comment-vote"]').click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
});

test("project issue detail renders legacy disabled delete action", async ({ page }) => {
  await mockProjectIssueDetail(page, { viewerCanDelete: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const expected = `<button type="button" class="icon disabled btn-transparent-with-fontsize-lineheight ml6" data-toggle="popover" data-trigger="hover" data-placement="top" data-content="Can't be deleted because of other users' comments"><i class="yobicon-trash"></i></button>`;
  expect(
    await canonicalize(page, ".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).toEqual(await canonicalizeHtml(page, expected));
  expect(await canonicalize(page, ".issue-info .right-menu-icons > button.disabled")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail renders legacy disabled vote action", async ({ page }) => {
  await mockProjectIssueDetail(page, { viewerCanComment: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const expected = `<span class="ybtn-disabled" style="color:rgb(119,119,119)" data-toggle="tooltip" title="Please log in." data-login="required"><span class="heart"><i class="yobicon-hearts"></i></span></span>`;
  expect(await canonicalize(page, "#vote > .ybtn-disabled")).toEqual(
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
    `<div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-toggle="tooltip" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li data-toggle="tooltip" data-html="true" title="QA Two &lt;br&gt;QA Three &lt;br&gt;QA Four &lt;br&gt;"><a href="#voters" data-toggle="modal">and 3 others</a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail renders legacy attachment file items", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
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

  const expectedIssueAttachments =
    `<div class="attachments" id="attachments" data-attachments='${JSON.stringify(issueAttachments)}'><li class="attached-file" data-name="issue-spec.txt" data-href="__BASE_PATH__/files/501" data-mime="text/plain" data-size="12345"><strong>issue-spec.txt(12.3 kB)</strong><a class="attached-delete"><i class="ico btn-delete"></i></a></li></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > #attachments")).toEqual(
    await canonicalizeHtml(page, expectedIssueAttachments),
  );

  const expectedCommentAttachments =
    `<div class="attachments pull-left" data-attachments='${JSON.stringify(commentAttachments)}'><li class="attached-file" data-name="comment-shot.png" data-href="__BASE_PATH__/files/502" data-mime="image/png" data-size="4096"><strong>comment-shot.png(4.1 kB)</strong><a class="attached-delete"><i class="ico btn-delete"></i></a></li></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#comment-body-77 > .attachments")).toEqual(
    await canonicalizeHtml(page, expectedCommentAttachments),
  );
});

test("project issue detail renders legacy child issue list", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    childClosedCount: 1,
    childIssues: [
      {
        assigneeLabel: "QA One",
        commentCount: 2,
        createdLabel: "Jul 3, 2026",
        issueNumber: 12,
        labels: [],
        state: "open",
        title: "Open child",
        voterCount: 1,
      },
      {
        assigneeLabel: "",
        commentCount: 0,
        createdLabel: "Jul 4, 2026",
        issueNumber: 13,
        labels: [],
        state: "closed",
        title: "Closed child",
        voterCount: 0,
      },
    ],
    childOpenCount: 1,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="subtasks"><div class="child-issues"><div class="issue-item parent-issue"><a href="__BASE_PATH__/admin/sample/issue/11" class="bold">#11 Fix flaky issue - Site Admin</a><div class="upload-progress red-outline"><div class="bar red" style="width:50%" title="Subtask"></div></div><span class=" ">1/2 </span><span class="parent-issue-state open">Open</span></div><hr class="parent-issue-delimeter"><div class="child-issues"><div class="issue-item  child-issue"><span class="state-label open"></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/12"><span class="item-name"><span class="subtask-number">#12</span><span>Open child</span><span> - QA One</span></span></a><span class="font12 no-border-at-child"><span class="item-count-groups"><a href="__BASE_PATH__/admin/sample/issue/12#comments" class="comments-count comments-count-color"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">2</span></a><a href="__BASE_PATH__/admin/sample/issue/12#vote" class="vote-count vote-color"><span class="count-groups item-icon"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a></span></span><span class="child-issue-date" title="Jul 3, 2026">Jul 3, 2026</span></div><div class="issue-item  child-issue"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/13"><span class="item-name"><span class="subtask-number">#13</span><span>Closed child</span><span></span></span></a><span class="font12 no-border-at-child"></span><span class="child-issue-date" title="Jul 4, 2026">Jul 4, 2026</span></div></div></div></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > .subtasks")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  expect(await childIssueMetrics(page)).toEqual({
    countGroupBorder: "0px none rgb(51, 51, 51)",
    countGroupLineHeight: "14px",
    countGroupMarginTop: "2px",
    dateDisplay: "none",
    firstChildWidth: 938,
    itemIconFontSize: "9px",
    parentFontSize: "16px",
    rowDisplay: "block",
    rowPadding: "0px 3px",
    voteLinkMarginLeft: "-5px",
  });
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
  await expect(page.locator(".span-right-pane #comments li.event-index")).toHaveCount(0);

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(page, LEFT_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await eventTimelineMetrics(page, "#event-88")).toEqual({
    avatarHeight: 24,
    avatarWidth: 24,
    dateFontSize: "11px",
    eventDisplay: "list-item",
    lineHeight: "30px",
    paddingLeft: "55px",
    stateBackground: "rgb(253, 105, 86)",
    stateMarginRight: "10px",
    stateWidth: 90,
  });
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

test("project issue detail renders legacy null milestone timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_MILESTONE_CHANGED",
        id: 99,
        kind: "event",
        milestoneId: 0,
        newValue: "0",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-99 .state.milestone-changed")).toHaveText("Update milestone");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_NULL_MILESTONE_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
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

test("project issue detail renders legacy commit referred timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_REFERRED_FROM_COMMIT",
        id: 93,
        kind: "event",
        newValue: "abcdef0",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-93 .state.changed")).toHaveText("mentioned");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_COMMIT_REFERRED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy pull request referred timeline event", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_REFERRED_FROM_PULL_REQUEST",
        id: 94,
        kind: "event",
        newValue: "3",
        pullRequestNumber: 3,
        pullRequestTitle: "Fix login redirect",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-94 .state.changed")).toHaveText("mentioned");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_PULL_REQUEST_REFERRED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy sharer added timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 95,
        kind: "event",
        newValue: "qa1",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA One",
        targetLoginId: "qa1",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-95 .state.sharer-added")).toHaveText("Issue Sharer");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_SHARER_ADDED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy sharer deleted timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 96,
        kind: "event",
        oldValue: "qa1",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA One",
        targetLoginId: "qa1",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-96 .state.sharer-deleted")).toHaveText("Cancelled");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_SHARER_DELETED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy consecutive sharer added timeline events", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 100,
        kind: "event",
        newValue: "qa1",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA One",
        targetLoginId: "qa1",
      },
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 101,
        kind: "event",
        newValue: "qa2",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA Two",
        targetLoginId: "qa2",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-101 > .state")).toHaveText("");
  await expect(page.locator("#event-101 > .state")).toHaveAttribute("class", "state");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_CONSECUTIVE_SHARER_ADDED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy label added timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 97,
        kind: "event",
        newValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-97 .state.label-added")).toHaveText("Added");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_LABEL_ADDED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy label deleted timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 98,
        kind: "event",
        oldValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-98 .state.label-deleted")).toHaveText("Removed");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_LABEL_DELETED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue detail renders legacy consecutive label deleted timeline events", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 102,
        kind: "event",
        oldValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 103,
        kind: "event",
        oldValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-103 > .state")).toHaveText("");
  await expect(page.locator("#event-103 > .state")).toHaveAttribute("class", "state");

  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(
      page,
      LEFT_CONSECUTIVE_LABEL_DELETED_EVENT_TIMELINE.replaceAll("__BASE_PATH__", basePath),
    ),
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

  await page.locator('#comment-77 a[href="#voters-77"][data-toggle="modal"]').click();
  await expect(page.locator("#voters-77")).toBeVisible();
  expect(await commentVoterModalMetrics(page)).toEqual({
    avatarHeight: 40,
    avatarWidth: 40,
    bodyDisplay: "block",
    closeHookCount: 2,
    display: "block",
    footerDisplay: "block",
    headerDisplay: "block",
    left: 360,
    rowCount: 6,
    rowDisplay: "list-item",
    width: 562,
  });

  await page.locator('#voters-77 [data-dismiss="modal"]').last().click();
  await expect(page.locator("#voters-77")).toBeHidden();
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

async function commentUpdateFormMetrics(page: Page) {
  return page.locator(".span-left-pane #comment-77").evaluate((comment) => {
    const form = comment.querySelector<HTMLElement>("#comment-editform-77");
    const body = comment.querySelector<HTMLElement>("#comment-body-77");
    const reply = document.querySelector<HTMLElement>(".add-a-comment");
    const textarea = comment.querySelector<HTMLTextAreaElement>("#editor-contents-77");
    const textareaBox = form?.querySelector<HTMLElement>(".textarea-box");
    const writeCommentBox = form?.querySelector<HTMLElement>(".write-comment-box");
    const buttonLine = form?.querySelector<HTMLElement>(".comment-update-button");
    const textareaBoxStyle = textareaBox ? window.getComputedStyle(textareaBox) : null;
    const writeCommentBoxStyle = writeCommentBox ? window.getComputedStyle(writeCommentBox) : null;
    const buttonLineStyle = buttonLine ? window.getComputedStyle(buttonLine) : null;
    return {
      bodyDisplay: body ? window.getComputedStyle(body).display : null,
      buttonLineMarginTop: buttonLineStyle?.marginTop ?? null,
      formDisplay: form ? window.getComputedStyle(form).display : null,
      replyDisplay: reply ? window.getComputedStyle(reply).display : null,
      textareaBoxMarginBottom: textareaBoxStyle?.marginBottom ?? null,
      textareaBoxPaddingRight: textareaBoxStyle?.paddingRight ?? null,
      textareaValue: textarea?.value,
      writeCommentBoxPadding: writeCommentBoxStyle?.padding ?? null,
    };
  });
}

async function childCommentAnchorMetrics(page: Page) {
  return page.locator(".span-left-pane #comment-77").evaluate((comment) => {
    const anchor = comment.querySelector<HTMLElement>(":scope > #comment-78");
    const childAnchor = comment.querySelector<HTMLAnchorElement>(
      '.subcomment-author a[href="#comment-78"].ago',
    );
    return {
      anchorHeight: anchor ? anchor.getBoundingClientRect().height : null,
      anchorNextClass: anchor?.nextElementSibling?.className ?? null,
      childHref: childAnchor?.getAttribute("href") ?? null,
      inlineChildAnchorCount: comment.querySelectorAll(".one-line-comment #comment-78").length,
    };
  });
}

async function commentVoterModalMetrics(page: Page) {
  return page.locator("#voters-77").evaluate((modal) => {
    const rect = modal.getBoundingClientRect();
    const header = modal.querySelector<HTMLElement>(".modal-header");
    const body = modal.querySelector<HTMLElement>(".modal-body");
    const footer = modal.querySelector<HTMLElement>(".modal-footer");
    const firstRow = modal.querySelector<HTMLElement>(".modal-body li");
    const firstImage = modal.querySelector<HTMLImageElement>(".avatar-wrap.mlarge img");

    return {
      avatarHeight: firstImage ? Math.round(firstImage.getBoundingClientRect().height) : null,
      avatarWidth: firstImage ? Math.round(firstImage.getBoundingClientRect().width) : null,
      bodyDisplay: body ? window.getComputedStyle(body).display : null,
      closeHookCount: modal.querySelectorAll('[data-dismiss="modal"]').length,
      display: window.getComputedStyle(modal).display,
      footerDisplay: footer ? window.getComputedStyle(footer).display : null,
      headerDisplay: header ? window.getComputedStyle(header).display : null,
      left: Math.round(rect.left),
      rowCount: modal.querySelectorAll(".modal-body li").length,
      rowDisplay: firstRow ? window.getComputedStyle(firstRow).display : null,
      width: Math.round(rect.width),
    };
  });
}

async function issueDetailShellMetrics(page: Page) {
  return page.locator(".page-wrap-outer").evaluate((outer) => {
    const project = outer.querySelector<HTMLElement>(".project-page-wrap.board-view");
    const header = outer.querySelector<HTMLElement>(".board-header.issue");
    const title = outer.querySelector<HTMLElement>(".board-header.issue .title");
    const body = outer.querySelector<HTMLElement>(".board-body.row-fluid");
    const leftPane = outer.querySelector<HTMLElement>(".span-left-pane");
    const rightPane = outer.querySelector<HTMLElement>(".span-right-pane");
    const content = outer.querySelector<HTMLElement>("#issue-body-11 .content");
    const action = outer.querySelector<HTMLElement>(".board-actrow");
    const issueInfo = outer.querySelector<HTMLElement>(".issue-info");
    const footer = outer.querySelector<HTMLElement>(".board-footer");
    const missing = Object.entries({
      action,
      body,
      content,
      footer,
      header,
      issueInfo,
      leftPane,
      project,
      rightPane,
      title,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected issue detail shell metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const actionStyle = window.getComputedStyle(action);
    const bodyStyle = window.getComputedStyle(body);
    const contentStyle = window.getComputedStyle(content);
    const footerStyle = window.getComputedStyle(footer);
    const headerStyle = window.getComputedStyle(header);
    const issueInfoStyle = window.getComputedStyle(issueInfo);
    const outerStyle = window.getComputedStyle(outer);
    const projectStyle = window.getComputedStyle(project);
    const titleStyle = window.getComputedStyle(title);
    return {
      actionMargin: actionStyle.margin,
      actionOverflow: actionStyle.overflow,
      actionPaddingRight: actionStyle.paddingRight,
      bodyMarginTop: bodyStyle.marginTop,
      contentMarginBottom: contentStyle.marginBottom,
      contentMinHeight: contentStyle.minHeight,
      contentPadding: contentStyle.padding,
      footerFontSize: footerStyle.fontSize,
      footerMarginTop: footerStyle.marginTop,
      footerTextAlign: footerStyle.textAlign,
      headerMargin: headerStyle.margin,
      issueInfoPadding: issueInfoStyle.padding,
      leftPaneWidth: Math.round(leftPane.getBoundingClientRect().width),
      outerMarginTop: outerStyle.marginTop,
      outerMinHeight: outerStyle.minHeight,
      projectMarginTop: projectStyle.marginTop,
      rightPaneWidth: Math.round(rightPane.getBoundingClientRect().width),
      titleBackground: titleStyle.backgroundColor,
      titleBorderRadius: titleStyle.borderRadius,
      titleFontSize: titleStyle.fontSize,
      titleLineHeight: titleStyle.lineHeight,
      titlePadding: titleStyle.padding,
    };
  });
}

async function indexCommentMetrics(page: Page) {
  return page.locator(".span-right-pane #comment-77.index-comment").evaluate((comment) => {
    const body = comment.querySelector<HTMLElement>(".comment-body");
    const author = comment.querySelector<HTMLElement>(".index-comment-author");
    const list = comment.closest<HTMLElement>("ul.comments");
    const rect = comment.getBoundingClientRect();
    const bodyStyle = body ? window.getComputedStyle(body) : null;
    const share = comment.querySelector<HTMLElement>(".share-link");

    return {
      authorDisplay: author ? window.getComputedStyle(author).display : null,
      bodyPadding: bodyStyle ? `${bodyStyle.paddingTop} ${bodyStyle.paddingRight}` : null,
      bodyText: body?.textContent?.trim() ?? null,
      childCountMarkers: comment.querySelectorAll(".comment-exists").length,
      commentDisplay: window.getComputedStyle(comment).display,
      dataLocation: comment.getAttribute("data-location"),
      listDisplay: list ? window.getComputedStyle(list).display : null,
      rowLeft: Math.round(rect.left),
      rowWidth: Math.round(rect.width),
      shareDisplay: share ? window.getComputedStyle(share).display : null,
    };
  });
}

async function issueCommentMetrics(page: Page) {
  return page.locator(".span-left-pane #comment-77").evaluate((comment) => {
    const avatar = comment.querySelector<HTMLElement>(":scope > .comment-avatar");
    const mediaBody = comment.querySelector<HTMLElement>(":scope > .media-body");
    const meta = comment.querySelector<HTMLElement>(".meta-info");
    const body = comment.querySelector<HTMLElement>("#comment-body-77 .comment-body");
    const attachments = comment.querySelector<HTMLElement>("#comment-body-77 .attachments");
    const reply = comment.querySelector<HTMLElement>(":scope > .add-a-comment");
    const missing = Object.entries({ attachments, avatar, body, mediaBody, meta, reply })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected issue comment metric targets are missing: ${missing.join(", ")}`);
    }

    const avatarStyle = window.getComputedStyle(avatar);
    const bodyStyle = window.getComputedStyle(body);
    const commentStyle = window.getComputedStyle(comment);
    const mediaBodyStyle = window.getComputedStyle(mediaBody);
    const metaStyle = window.getComputedStyle(meta);
    return {
      attachmentsDisplay: window.getComputedStyle(attachments).display,
      avatarFloat: avatarStyle.float,
      avatarMarginRight: avatarStyle.marginRight,
      avatarWidth: Math.round(avatar.getBoundingClientRect().width),
      bodyMinHeight: bodyStyle.minHeight,
      bodyPadding: bodyStyle.padding,
      commentDisplay: commentStyle.display,
      commentPaddingBottom: commentStyle.paddingBottom,
      commentWidth: Math.round(comment.getBoundingClientRect().width),
      mediaBodyOverflow: mediaBodyStyle.overflow,
      metaHeight: Math.round(meta.getBoundingClientRect().height),
      metaPaddingTop: metaStyle.paddingTop,
      replyDisplay: window.getComputedStyle(reply).display,
    };
  });
}

async function eventTimelineMetrics(page: Page, selector: string) {
  return page.locator(selector).evaluate((event) => {
    const eventStyle = window.getComputedStyle(event);
    const state = event.querySelector<HTMLElement>(".state");
    const stateStyle = state ? window.getComputedStyle(state) : null;
    const avatar = event.querySelector<HTMLImageElement>(".avatar-wrap.small");
    const date = event.querySelector<HTMLElement>(".date");

    return {
      avatarHeight: avatar ? Math.round(avatar.getBoundingClientRect().height) : null,
      avatarWidth: avatar ? Math.round(avatar.getBoundingClientRect().width) : null,
      dateFontSize: date ? window.getComputedStyle(date).fontSize : null,
      eventDisplay: eventStyle.display,
      lineHeight: eventStyle.lineHeight,
      paddingLeft: eventStyle.paddingLeft,
      stateBackground: stateStyle?.backgroundColor ?? null,
      stateMarginRight: stateStyle?.marginRight ?? null,
      stateWidth: state ? Math.round(state.getBoundingClientRect().width) : null,
    };
  });
}

async function childIssueMetrics(page: Page) {
  return page
    .locator(".span-left-pane .issue-item.child-issue")
    .first()
    .evaluate((row) => {
      const rowStyle = window.getComputedStyle(row);
      const parent = row.closest(".subtasks")?.querySelector<HTMLElement>(".parent-issue");
      const countGroup = row.querySelector<HTMLElement>(".item-count-groups");
      const countStyle = countGroup ? window.getComputedStyle(countGroup) : null;
      const itemIcon = row.querySelector<HTMLElement>(".count-groups.item-icon");
      const date = row.querySelector<HTMLElement>(".child-issue-date");
      const voteLink = row.querySelector<HTMLElement>(".vote-count");

      return {
        countGroupBorder: countStyle?.border ?? null,
        countGroupLineHeight: countStyle?.lineHeight ?? null,
        countGroupMarginTop: countStyle?.marginTop ?? null,
        dateDisplay: date ? window.getComputedStyle(date).display : null,
        firstChildWidth: Math.round(row.getBoundingClientRect().width),
        itemIconFontSize: itemIcon ? window.getComputedStyle(itemIcon).fontSize : null,
        parentFontSize: parent ? window.getComputedStyle(parent).fontSize : null,
        rowDisplay: rowStyle.display,
        rowPadding: `${rowStyle.paddingTop} ${rowStyle.paddingRight}`,
        voteLinkMarginLeft: voteLink ? window.getComputedStyle(voteLink).marginLeft : null,
      };
    });
}

async function selectedLabelMetrics(page: Page) {
  return page
    .locator(".issue-info form dl:has(a.label.issue-label.active.static)")
    .evaluate((dl) => {
      const dd = dl.querySelector<HTMLElement>("dd");
      const label = dl.querySelector<HTMLElement>("a.label.issue-label.active.static");
      const dlStyle = window.getComputedStyle(dl);
      const ddStyle = dd ? window.getComputedStyle(dd) : null;
      const labelStyle = label ? window.getComputedStyle(label) : null;

      return {
        ddPadding: ddStyle ? `${ddStyle.paddingTop} ${ddStyle.paddingRight}` : null,
        dlMarginBottom: dlStyle.marginBottom,
        dtText: dl.querySelector("dt")?.textContent?.trim() ?? null,
        labelBackground: labelStyle?.backgroundColor ?? null,
        labelBorderRadius: labelStyle?.borderRadius ?? null,
        labelDisplay: labelStyle?.display ?? null,
        labelFontSize: labelStyle?.fontSize ?? null,
        labelLineHeight: labelStyle?.lineHeight ?? null,
        labelMargin: labelStyle?.margin ?? null,
        labelPadding: labelStyle ? `${labelStyle.paddingTop} ${labelStyle.paddingRight}` : null,
      };
    });
}

async function keymapModalMetrics(page: Page) {
  return page.locator("#helpKeys").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      display: window.getComputedStyle(element).display,
      firstColumnTitle: element.querySelector(".span3 h5")?.textContent?.trim(),
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
    };
  });
}

async function mockProjectIssueDetail(page: Page, issueOverrides: Record<string, unknown> = {}) {
  const deleteRequests: string[] = [];
  const commentDeleteRequests: string[] = [];
  const commentVoteRequests: { csrfToken: string | null; method: string }[] = [];
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
  await page.route("**/api/v1/projects/admin/sample/issues/parent-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: 42, issueNumber: 11, selected: false, title: "Existing parent" }],
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/11", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteRequests.push(route.request().method());
      await route.fulfill({ status: 204 });
      return;
    }
    const issue = {
      assigneeLoginId: "admin",
      assigneeLabel: "Site Admin",
      attachments: [],
      authorAvatarUrl: "/assets/images/default-avatar-32.png",
      authorLabel: "Dev Member",
      authorLoginId: "dev",
      bodyChecksum: "body-sha1",
      bodyHtml: "<p>Server HTML should not render</p>",
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
              contentsHtml: "<p>Server HTML should not render</p>",
              contentsMarkdown: "Child **reply**",
              createdLabel: "Jul 2, 2026",
              id: 78,
              viewerCanDelete: true,
            },
          ],
          contentsHtml: "<p>Server HTML should not render</p>",
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
  await page.route("**/api/v1/projects/admin/sample/issues/11/comments/77", async (route) => {
    if (route.request().method() === "DELETE") {
      commentDeleteRequests.push(route.request().method());
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fallback();
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/issues/11/comments/77/vote",
    async (route) => {
      commentVoteRequests.push({
        csrfToken: route.request().headers()["x-csrf-token"] ?? null,
        method: route.request().method(),
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    },
  );
  return { commentDeleteRequests, commentVoteRequests, deleteRequests };
}

async function commentDeleteModalMetrics(page: Page) {
  return page.locator("#comment-delete-modal").evaluate((modal) => {
    const rect = modal.getBoundingClientRect();
    const backdrop = document.querySelector<HTMLElement>(".modal-backdrop");
    const body = modal.querySelector<HTMLElement>(".modal-body");
    const confirm = modal.querySelector<HTMLButtonElement>("#comment-delete-confirm");
    const footer = modal.querySelector<HTMLElement>(".modal-footer");
    const header = modal.querySelector<HTMLElement>(".modal-header");
    const viewportWidth = document.documentElement.clientWidth;
    const width = Math.round(rect.width);

    return {
      backdropDisplay: backdrop ? window.getComputedStyle(backdrop).display : null,
      bodyDisplay: body ? window.getComputedStyle(body).display : null,
      confirmMethod: confirm?.dataset.requestMethod ?? null,
      confirmText: confirm?.textContent?.trim() ?? null,
      confirmUri: confirm?.dataset.requestUri ?? null,
      display: window.getComputedStyle(modal).display,
      dismissCount: modal.querySelectorAll('[data-dismiss="modal"]').length,
      footerTextAlign: footer ? window.getComputedStyle(footer).textAlign : null,
      headerDisplay: header ? window.getComputedStyle(header).display : null,
      left: Math.round(rect.left - (viewportWidth - width) / 2),
      noText:
        footer?.querySelector<HTMLButtonElement>('[data-dismiss="modal"]')?.textContent?.trim() ??
        null,
      title: header?.querySelector("h3")?.textContent?.trim() ?? null,
      top: Math.round((rect.top / window.innerHeight) * 100),
      width,
    };
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
    const isMac = navigator.userAgent.toLowerCase().includes("macintosh");
    const ctrlKey = isMac ? "⌘" : "CTRL";
    const siteSearchKeys = isMac
      ? '<span class="ybtn ybtn-small">CTRL</span> + <span class="ybtn ybtn-small">ALT</span> + <span class="ybtn ybtn-small">S</span>'
      : '<span class="ybtn ybtn-small">ALT</span> + <span class="ybtn ybtn-small">S</span>';
    const template = document.createElement("template");
    template.innerHTML = input
      .replaceAll("__CTRL_KEY__", ctrlKey)
      .replaceAll("__SITE_SEARCH_KEYS__", siteSearchKeys);
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
