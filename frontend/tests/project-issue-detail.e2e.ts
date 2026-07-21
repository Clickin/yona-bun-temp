import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const LEGACY_MARKDOWN_HELP = readFileSync(
  new URL("../../yona-original/app/views/help/markdown.scala.html", import.meta.url),
  "utf8",
)
  .replace(/@Messages\("title\.markdown\.help"\)/g, "Markdown help")
  .replace(/@\{"@"\}/g, "@")
  .replace(/<script[\s\S]*$/u, "")
  .replace(/\sdata-toggle="markdown-help"/g, "")
  .replace(/\sdata-target="markdown[^"]+"/g, "")
  .replace(/^[\s\S]*?<div class="markdown-help">/u, '<div class="markdown-help">')
  .replace(/<\/div>\s*$/u, "</div>");

const ISSUE_DETAIL_KEYMAP = `<div class="pull-left" style="padding:10px 0px;margin-left:55px"><button type="button" data-toggle="modal" class="ybtn ybtn-inverse ybtn-mini">Keyboard shortcuts</button><div id="helpKeys" class="modal hide fade keymap-help" tabindex="-1" role="dialog"><div class="row-fluid"><div class="span3"><h5>projects</h5><span class="ybtn ybtn-small">H</span><span class="help-inline">Home</span><br><span class="ybtn ybtn-small">B</span><span class="help-inline">Board</span><br><span class="ybtn ybtn-small">I</span><span class="help-inline">Issue</span><br><span class="ybtn ybtn-small">C</span><span class="help-inline">Code</span><br><span class="ybtn ybtn-small">M</span><span class="help-inline">Milestone</span><br><span class="ybtn ybtn-small">P</span><span class="help-inline">Pull request</span><br><span class="ybtn ybtn-small">Q</span><span class="help-inline">Settings</span><br></div><div class="span9"><div class="row-fluid"><div class="span5"><h5>Issue details</h5><span class="ybtn ybtn-small">N</span><span class="help-inline">New issue</span><br><span class="ybtn ybtn-small">L</span><span class="help-inline">List</span><br><span class="ybtn ybtn-small">E</span><span class="help-inline">Edit</span><br></div><div class="span7"><h5>Site</h5><span class="ybtn ybtn-small">A</span><span class="help-inline">My Issues</span><br><span class="ybtn ybtn-small">U</span><span class="help-inline">Profile</span><br><span class="ybtn ybtn-small">F</span><span class="help-inline">User menu</span><br>__SITE_SEARCH_KEYS__<span class="help-inline">Site search</span><br><span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Submit form</span><br></div></div><div class="row-fluid mt20"><div class="span12"><h5>Issue Comments</h5><span class="ybtn ybtn-small">SHIFT</span> + <span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Comment &amp; Close issue</span><br></div></div></div></div><p class="actrow"><button type="button" class="ybtn ybtn-info" data-dismiss="modal">Confirm</button></p></div></div>`;

const EXPECTED_ISSUE_DETAIL = `
<div class="page-wrap-outer"><div class="project-page-wrap board-view"><div class="board-header issue"><div class="pull-right mr10 mt10 hide-in-mobile"><div class="date" title="Jul 1, 2026">Jul 1, 2026</div><span class="badge badge-issue-open">Open</span></div><div class="title"><strong class="board-id">11</strong>Fix flaky issue<span class="favorite-issue" data-issue-id="42"><i class="star material-icons va-text-top">star</i></span><div class="pull-right hide show-in-mobile" style="font-size:0.7em"><span class="date" title="Jul 1, 2026">Jul 1, 2026</span><span class="badge badge-small badge-issue-open">Open</span></div></div></div><div class="board-body row-fluid"><div class="span9 span-left-pane"><div class="author-info"><a href="__BASE_PATH__/dev" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></div><div id="issue-11" class="hide"><form action="__BASE_PATH__/api/v1/projects/admin/sample/issues/11/content"><textarea>Body **markdown**</textarea></form></div><div id="issue-body-11"><div class="content markdown-wrap" data-allowed-update="true"><p>Body <strong>markdown</strong></p></div></div><div class="attachments" id="attachments" data-attachments="[]"></div><div class="board-actrow right-txt"><div class="pull-left"><div><button id="watch-button" type="button" class="ybtn " title="Watch this issue" data-watching="false">Subscribe</button><button id="issue-share-button" type="button" class="ybtn">Issue Sharing</button><span class="project-btn-item hide show-in-mobile-inline ml4"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></span><span class="issue-weight"><span class="divider">|</span><button id="upvote-issue-weight" class="ybtn ybtn-small" title="Issue weight: Upvote"><i class="yobicon-arrow-up-alt"></i></button><button class="ybtn ybtn-small" id="down-vote-issue-weight" title="Issue weight: Down vote"><i class="yobicon-arrow-down-alt"></i></button><span class="weight-number">2</span></span></div></div><div id="vote" class="vote-wrap voter-exists"><button type="button" class="" title="Vote this issue"><span class="heart"><i class="yobicon-hearts"></i></span></button><div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div></div><div id="voters" class="modal hide voters-dialog"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h5 class="nm">People who agree with this</h5></div><div class="modal-body"><ul class="unstyled"><li><a href="__BASE_PATH__/admin" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></li><li><a href="__BASE_PATH__/dev" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></li></ul></div><div class="modal-footer"><button id="copyEmailBtn" class="ybtn ybtn-info ybtn-small">Copy email list</button><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal" aria-hidden="true">Close</button></div></div><span class="act-row"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" title="Edit"><i class="yobicon-edit-2"></i></button><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="modal" data-target="#deleteConfirm" title="Delete"><i class="yobicon-trash"></i></button></span></div><dl class="sharer-list hideFromDisplayOnly"><dt class="issue-share-title mb10">Issue Sharer <span class="num issue-sharer-count"></span></dt><dd id="sharer-list" class="hideFromDisplayOnly"><input type="hidden" class="bigdrop width100p" id="issueSharer" name="issueSharer" placeholder="Select Issue Sharer" value=""></dd></dl><div class="watcher-list"></div><div class="subtasks"></div><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div><div class="span3 span-right-pane mb20"><div class="issue-info"><form id="issueUpdateForm" action="__BASE_PATH__/admin/sample/issues" method="post"><input type="hidden" name="issues[0].id" value="42"><dl><dd class="project-btn-item"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></dd><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="admin" style="width:100%"></dd></dl><dl><dt>Milestone</dt><dd><select id="milestone" name="milestone.id" data-format="milestone" data-container-css-class="fullsize"><option value="-1">No milestone</option><optgroup label="Open"><option value="5" data-state="open" selected="">v1.0</option><option value="9" data-state="open">v2.0</option></optgroup><optgroup label="Closed"><option value="7" data-state="closed">v0.9</option></optgroup></select></dd></dl><dl><dt>Due date<span class="duedate-status "></span></dt><dd><div class="search search-bar"><input type="text" name="dueDate" value="Jul 5, 2026" class="textbox full" autocomplete="off"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false" selected="">bug</option><option value="9" data-category-id="3" data-category-is-exclusive="false">enhancement</option></optgroup></select></dd></dl><div class="act-row right-menu-icons"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" title="Edit"><i class="yobicon-edit-2"></i></button><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="modal" data-target="#deleteConfirm" title="Delete"><i class="yobicon-trash"></i></button></div></form><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div></div></div><div><input type="hidden" id="issueBodyChecksum" value="body-sha1"><input type="hidden" id="numOfComments" value="0"><input type="hidden" id="issueUpdateDate" value="1782892800000"></div><div class="board-footer">${ISSUE_DETAIL_KEYMAP}</div></div><div id="deleteConfirm" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete issue</h3></div><div class="modal-body"><p>Are you sure you want to delete this post?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div><div id="comment-delete-modal" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete comment</h3></div><div class="modal-body"><p>Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?</p></div><div class="modal-footer"><button id="comment-delete-confirm" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div></div>
`;

const TASKLIST = `<div class="tasklist"><div class="task-title">Tasks<span class="done-counter"></span></div><div class="task-progress"><div class="bar red" style="width:0px" title="Tasklist"></div></div></div>`;
const COMMENT_UPDATE_FORM = `<div id="comment-editform-77" class="comment-update-form"><form action="__BASE_PATH__/admin/sample/issue/11/comments/77" method="post" enctype="multipart/form-data"><input type="hidden" name="id" value="77"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible">${LEGACY_MARKDOWN_HELP}<div id="edit-77" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="update-comment-body" markdown="true" id="editor-contents-77">Comment **markdown**</textarea></div></div><div id="preview-77" class="tab-pane"><div class="markdown-preview markdown-wrap update-comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div><div class="right-txt comment-update-button upload-button-line"><span class="file-upload"><label for="upload-77" class="file-upload__label ybtn">File upload</label><input id="upload-77" class="file-upload__input" type="file" name="filePath" multiple=""></span><button type="button" class="ybtn ybtn-cancel" data-comment-id="77">Cancel</button><button type="submit" class="ybtn ybtn-info">Save</button></div></div><input type="hidden" name="temporaryUploadFiles" class="temporaryUploadFiles" value=""><div class="preview-77"></div><div class="attachment-files"></div><div id="upload-77" data-resourcetype="ISSUE_COMMENT" data-resourceid="77"></div></div></form></div>`;
const COMMENT_FORM = `<form id="comment-form" action="__BASE_PATH__/admin/sample/issue/11/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible">${LEGACY_MARKDOWN_HELP}<div id="edit-contents" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-contents"></textarea></div></div><div id="preview-contents" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-wrap content-footer" data-resource-type="ISSUE_COMMENT" id="upload"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form>`;
const CHILD_COMMENT_ANCHORS = `<div id="comment-78"></div>`;
const CHILD_COMMENTS = `<div class="add-a-comment pull-right">Reply</div><div class="subcomment-media-body"><div class="child-comments"><div class="one-line-comment"><div class="contents"><p>Child <strong>reply</strong></p><span class="subcomment-author hide">- <a href="__BASE_PATH__/qa1" class="usf-group" title="qa1"><strong>QA One</strong></a><a href="__BASE_PATH__/admin/sample/issue/11#comment-78" class="ago" title="Jul 2, 2026">Jul 2, 2026</a><button type="button" class="btn-transparent deleteButtonX" title="Delete comment">x</button></span></div></div></div><div class="child-comment-input-form"><form action="__BASE_PATH__/admin/sample/issue/11/comments" method="post" enctype="multipart/form-data"><input class="parentCommentId" type="hidden" name="parentCommentId" value="77"><div class="oneline-comment-box"><textarea class="editorSeries" name="contents" markdown="true" rows="1" placeholder="__CHILD_REPLY_PLACEHOLDER__"></textarea><button type="submit" class="ybtn ybtn-success">OK</button></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></form></div></div>`;
const LEFT_COMMENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">1</strong></div><hr class="nm"><ul class="comments"><li class="comment " id="comment-77">${CHILD_COMMENT_ANCHORS}<div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="Dev Member"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author"><span class="resp-comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="dev"></a></span><a href="__BASE_PATH__/dev" data-placement="top" title="dev"><strong>Dev Member</strong></a></span><span class="ago-date"><a href="__BASE_PATH__/admin/sample/issue/11#comment-77" class="ago" title="Jul 2, 2026">Jul 2, 2026</a><a href="__BASE_PATH__/admin/sample/issue/11#comment-77" class="share-link" style="display:none">[Link]</a></span><span class="act-row pull-right"><span class="new-issue-by"><a href="__BASE_PATH__/user/issues/new?commentId=77">Reference in new issue</a></span><button type="button" class="btn-transparent-with-fontsize-lineheight" title="Agree"><i class="yobicon-hearts vote-heart-off"></i></button><button type="button" class="btn-transparent-with-fontsize-lineheight ml10" data-comment-id="77" title="Edit comment"><i class="yobicon-edit-2"></i></button><button type="button" class="btn-transparent-with-fontsize-lineheight ml6" title="Delete comment"><i class="yobicon-trash"></i></button></span></div>${COMMENT_UPDATE_FORM}<div id="comment-body-77">${TASKLIST}<div class="comment-body markdown-wrap" data-allowed-update="true" data-via-email="false"><p>Comment <strong>markdown</strong></p></div><div class="attachments pull-left" data-attachments="[]"></div></div></div>${CHILD_COMMENTS}</li></ul></div></div>${COMMENT_FORM}</div>`;
const RIGHT_INDEX_COMMENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><strong>Comment</strong> <strong class="num">1</strong></div><ul class="comments"><li class="comment index-comment  " id="comment-77" data-location="#comment-77"><div><div id="comment-body-77"><div class="comment-body"><a href="__BASE_PATH__/admin/sample/issue/11#comment-77">Comment markdown</a></div></div><div class="index-comment-author"><span class="comment-exists"><i class="yobicon-comment2"></i></span><span class="comment_author"><a href="__BASE_PATH__/dev" data-placement="top" title="dev"><strong>Dev Member</strong></a></span><span class="ago-date"><a href="__BASE_PATH__/admin/sample/issue/11#comment-77" class="ago" title="Jul 2, 2026">Jul 2, 2026</a><a href="__BASE_PATH__/admin/sample/issue/11#comment-77" class="share-link" style="display:none">[Link]</a></span></div></div></li></ul></div></div></div>`;
const LEFT_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-88"><span class="state closed">Closed</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> closed this issue<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-88">Jul 3, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_ASSIGNEE_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-90"><span class="state changed">Assigned</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> assigned this issue to <a href="__BASE_PATH__/admin" class="usf-group" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/admin" class="usf-group" data-placement="top" title="admin"><strong>Site Admin</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-90">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_MILESTONE_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-91"><span class="state milestone-changed">Update milestone</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> changed milestone to <span class="bold font-blue"><a href="__BASE_PATH__/admin/sample/milestone/5" data-placement="bottom" title="Milestone">v1.0</a></span><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-91">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_NULL_MILESTONE_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-99"><span class="state milestone-changed">Update milestone</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> changed milestone to <span class="bold">None</span><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-99">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_MOVED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-92"><span class="state changed">moved</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> moved this issue from <strong><a href="__BASE_PATH__/old-owner/old-project" class="link">old-owner/old-project</a></strong><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-92">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_COMMIT_REFERRED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-93"><span class="state changed">mentioned</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> mentioned this issue in <strong>Commit <a href="__BASE_PATH__/admin/sample/commit/abcdef0" class="link">@abcdef0</a></strong><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-93">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_PULL_REQUEST_REFERRED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-94"><span class="state changed">mentioned</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> mentioned this issue in <strong>Pull request -3 <a href="__BASE_PATH__/admin/sample/pullRequest/3" class="link">Fix login redirect</a></strong><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-94">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_SHARER_ADDED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-95"><span class="state sharer-added">Issue Sharer</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> shared current issue to <a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="qa1"><strong>QA One</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-95">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_SHARER_DELETED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-96"><span class="state sharer-deleted">Cancelled</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> cancelled issue sharing with <a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="qa1"><strong>QA One</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-96">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_LABEL_ADDED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-97"><span class="state label-added">Added</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> added <div class="label issue-label" style="background-color: rgb(81, 170, 204)">bug</div> label<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-97">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_LABEL_DELETED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-98"><span class="state label-deleted">Removed</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> removed <div class="label issue-label" style="background-color: rgb(81, 170, 204)">bug</div> label<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-98">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_CONSECUTIVE_SHARER_ADDED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-100"><span class="state sharer-added">Issue Sharer</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> shared current issue to <a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="qa1"><strong>QA One</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-100">Jul 4, 2026</a></span></li><li class="event" id="event-101"><span class="state"></span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> shared current issue to <a href="__BASE_PATH__/qa2" class="usf-group" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa2" class="usf-group" data-placement="top" title="qa2"><strong>QA Two</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-101">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_CONSECUTIVE_LABEL_DELETED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-102"><span class="state label-deleted">Removed</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> removed <div class="label issue-label" style="background-color: rgb(81, 170, 204)">bug</div> label<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-102">Jul 4, 2026</a></span></li><li class="event" id="event-103"><span class="state"></span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> removed <div class="label issue-label" style="background-color: rgb(81, 170, 204)">bug</div> label<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-103">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
const LEFT_DEFAULT_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-89">fallback noteby <a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-89">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;

test("project issue detail restores live Korean metadata controls and editor geometry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Date.now = () => Date.parse("2026-07-11T12:00:00Z");
    Object.defineProperty(window.navigator, "languages", { value: ["ko-KR"], configurable: true });
    Object.defineProperty(window.navigator, "language", { value: "ko-KR", configurable: true });
  });
  const { massUpdateRequests } = await mockProjectIssueDetail(page, {
    __projectOverrides: { backgroundImageUrl: "", logoUrl: "" },
    createdLabel: "2026-07-07",
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Bob Park",
        authorLoginId: "bob",
        childComments: [],
        contentsMarkdown: "I can reproduce the legacy issue view from this seed.",
        createdLabel: "2026-07-07",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viaEmail: false,
        voterCount: 0,
        voters: [],
      },
    ],
    dueDateUntilLabel: "13 days",
  });
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  await expect(page.locator(".board-header.issue > .hide-in-mobile .date")).toHaveText("4일 전");
  await expect(page.locator(".board-header.issue > .hide-in-mobile .date")).toHaveAttribute(
    "title",
    "2026-07-07",
  );
  await expect(page.locator(".span-left-pane #comment-77 .ago").first()).toHaveText("4일 전");
  await expect(page.locator(".span-left-pane #comment-77 .ago").first()).toHaveAttribute(
    "title",
    "2026-07-07",
  );
  await expect(page.locator(".span-right-pane #comment-77 .ago").first()).toHaveText("4일 전");
  await expect(page.locator(".project-header-outer")).toHaveAttribute(
    "style",
    /src\/assets\/legacy\/project_default\.jpg/u,
  );
  await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    /src\/assets\/legacy\/project_default_logo\.png$/u,
  );

  const assignee = page.getByRole("combobox", { name: "담당자" });
  const milestone = page.getByRole("combobox", { name: "마일스톤" });
  const labels = page.locator(".issue-info .select2-container-multi.issue-labels");
  await expect(assignee).toBeVisible();
  await expect(assignee.locator(".select2-chosen")).toContainText("Site Admin");
  await expect(labels).toBeVisible();
  await expect(labels.locator(".select2-search-choice .label")).toHaveText("bug");
  await expect(page.locator("#milestone.select2-offscreen")).toHaveValue("5");
  await expect(milestone.locator(".select2-choice > .select2-chosen")).toHaveText("v1.0");
  await expect(labels.locator(":scope > .select2-choices > li")).toHaveCount(2);
  await expect(
    labels.locator(".select2-search-choice > div > .label.issue-label.active.static"),
  ).toHaveText("bug");
  await expect(labels.locator("span.label.issue-label.active.static")).toHaveCount(0);
  await expect(labels.locator("strong.label.issue-label.active.static")).toHaveCount(1);
  await expect(labels.locator("input.select2-input")).toHaveAttribute("style", "width: 10px;");
  await expect(page.locator("#comment-form .nav-tabs > li").nth(0)).toHaveText("편집");
  await expect(page.locator("#comment-form .nav-tabs > li").nth(1)).toHaveText("미리보기");
  await expect(page.locator("#comment-form .add-task-list-button")).toContainText(
    "체크리스트 추가",
  );
  const editorTabMetrics = await page
    .locator("#comment-form .markdown-editor")
    .evaluate((editor) => {
      const edit = editor.querySelector<HTMLElement>(".nav-tabs > li:nth-child(1) > button");
      const preview = editor.querySelector<HTMLElement>(".nav-tabs > li:nth-child(2) > button");
      if (!edit || !preview) return null;
      const editStyle = getComputedStyle(edit);
      const previewStyle = getComputedStyle(preview);
      return {
        editBorderBottom: editStyle.borderBottomWidth,
        editHeight: Math.round(edit.getBoundingClientRect().height),
        editPadding: editStyle.padding,
        previewBorder: previewStyle.borderWidth,
        previewHeight: Math.round(preview.getBoundingClientRect().height),
        previewPadding: previewStyle.padding,
      };
    });
  expect(editorTabMetrics).toEqual({
    editBorderBottom: "1px",
    editHeight: 30,
    editPadding: "4px 15px",
    previewBorder: "1px",
    previewHeight: 30,
    previewPadding: "4px 15px",
  });
  await expect(page.locator(".duedate-status")).toContainText("13일");

  const geometry = await page.evaluate(() => {
    const form = document.querySelector<HTMLElement>("#issueUpdateForm");
    const assigneeControl = document.querySelector<HTMLElement>(
      '#issueUpdateForm .select2-container[aria-label="담당자"]',
    );
    const labelControl = document.querySelector<HTMLElement>(
      "#issueUpdateForm .select2-container-multi.issue-labels",
    );
    const assigneeChoice = assigneeControl?.querySelector<HTMLElement>(".select2-choice");
    const labelChoices = labelControl?.querySelector<HTMLElement>(".select2-choices");
    const labelToken = labelControl?.querySelector<HTMLElement>(
      "strong.label.issue-label.active.static",
    );
    const labelSearch = labelControl?.querySelector<HTMLInputElement>("input.select2-input");
    const editor = document.querySelector<HTMLElement>("#comment-form .mt10");
    const upload = document.querySelector<HTMLElement>("#comment-form .upload-wrap");
    if (
      !form ||
      !assigneeControl ||
      !labelControl ||
      !assigneeChoice ||
      !labelChoices ||
      !labelToken ||
      !labelSearch ||
      !editor ||
      !upload
    )
      return null;
    const f = form.getBoundingClientRect();
    const a = assigneeControl.getBoundingClientRect();
    const l = labelControl.getBoundingClientRect();
    const token = labelToken.getBoundingClientRect();
    const search = labelSearch.getBoundingClientRect();
    const e = editor.getBoundingClientRect();
    const u = upload.getBoundingClientRect();
    return {
      assigneeChoiceContained: assigneeChoice.getBoundingClientRect().bottom <= a.bottom,
      assigneeBeforeLabels: a.bottom <= l.top,
      editorBoxSizing: getComputedStyle(
        document.querySelector<HTMLElement>("#comment-form textarea.comment")!,
      ).boxSizing,
      formContainsLabels: l.bottom <= f.bottom,
      labelChoicesContained: labelChoices.getBoundingClientRect().bottom <= l.bottom,
      labelTokenHeight: Math.round(token.height),
      labelTokenSearchSameRow: token.top < search.bottom && search.top < token.bottom,
      uploadFollowsEditor: u.top >= e.bottom,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry).toEqual({
    assigneeBeforeLabels: true,
    assigneeChoiceContained: true,
    editorBoxSizing: "content-box",
    formContainsLabels: true,
    labelChoicesContained: true,
    labelTokenHeight: 16,
    labelTokenSearchSameRow: true,
    uploadFollowsEditor: true,
  });

  await assignee.locator(".select2-choice").click();
  await assignee.getByRole("option", { name: "담당자 없음" }).click();
  await expect(page.locator("#assignee")).toHaveValue("");
  await labels.getByRole("button", { name: "bug 삭제" }).click();
  await expect(labels.locator(".select2-search-choice")).toHaveCount(0);
  await milestone.locator(".select2-choice").click();
  await milestone.getByRole("option", { name: "v2.0" }).click();
  await expect(page.locator("#milestone")).toHaveValue("9");
  await expect.poll(() => massUpdateRequests.length).toBe(3);
});

test("project issue detail keeps the frozen desktop and mobile issue-info gutters", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".span-right-pane .issue-info")).toHaveCSS(
    "padding",
    "15px 0px 0px 52px",
  );

  await page.setViewportSize({ width: 720, height: 900 });
  await expect(page.locator(".span-right-pane .issue-info")).toHaveCSS(
    "padding",
    "15px 0px 0px 10px",
  );
});

test("project issue detail matches legacy issue/view.scala.html voter state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page).toHaveTitle("Fix flaky issue");
  await expect.poll(() => headTitleText(page)).toBe("Fix flaky issue");
  await expect
    .poll(() => lastHeadMetaContent(page, 'meta[property="og:title"]'))
    .toBe("Fix flaky issue");
  await expect
    .poll(() => lastHeadMetaContent(page, 'meta[property="og:description"]'))
    .toBe("Body **markdown** - admin/sample");
  await expect
    .poll(() => lastHeadMetaContent(page, 'meta[name="twitter:title"]'))
    .toBe("Fix flaky issue");
  await expect
    .poll(() => lastHeadMetaContent(page, 'meta[name="twitter:description"]'))
    .toBe("Body **markdown** - admin/sample");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Issue");
  await expect(page.locator("#vote.voter-exists")).toBeVisible();
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(1);
  await expect(page.locator("#copyEmailBtn")).toHaveText("Copy email list");
  await expect(page.locator("#copyEmailBtn")).not.toHaveAttribute("data-clipboard-text", /.+/);
  await expect(page.locator("#vote .voter-list a.avatar-wrap").first()).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator('#voters a.usf-group[target="_blank"]').first()).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator("#labelIds")).toHaveAttribute("data-close-on-select", "false");
  await expect(page.locator("#labelIds")).not.toHaveAttribute("data-search", /.+/);
  await expect(page.locator("#comment-77 .new-issue-by a")).toHaveText("Reference in new issue");
  await expect(page.locator("#comment-77 .new-issue-by a")).toHaveAttribute(
    "href",
    `${basePath}/user/issues/new?commentId=77`,
  );
  await expectIssueDetailAssets(page, basePath);

  const emptyTimeline =
    '<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div>';
  const expected = EXPECTED_ISSUE_DETAIL.replace(emptyTimeline, LEFT_COMMENT_TIMELINE)
    .replace(emptyTimeline, RIGHT_INDEX_COMMENT_TIMELINE)
    .replace(
      '<div id="issue-body-11"><div class="content markdown-wrap"',
      `<div id="issue-body-11">${TASKLIST}<div class="content markdown-wrap"`,
    )
    .replace('id="numOfComments" value="0"', 'id="numOfComments" value="1"')
    .replaceAll("__CHILD_REPLY_PLACEHOLDER__", await childReplyPlaceholder(page))
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
    issueInfoPadding: "15px 0px 0px 52px",
    leftPaneWidth: 938,
    outerMarginTop: "10px",
    outerMinHeight: "450px",
    projectMarginTop: "20px",
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
    childCountMarkers: 1,
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

test("project issue detail uses route-owned timeline and comment hash links", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const issueHref = `${basePath}/admin/sample/issue/11`;
  const comment = {
    attachments: [],
    authorAvatarUrl: "/assets/images/default-avatar-32.png",
    authorLabel: "Dev Member",
    authorLoginId: "dev",
    childComments: [],
    contentsHtml: "<p>Server HTML should not render</p>",
    contentsMarkdown: "Comment **markdown**",
    createdLabel: "Jul 2, 2026",
    id: 77,
    viewerCanDelete: true,
    viewerCanUpdate: true,
    viewerHasVoted: true,
    viaEmail: false,
    voterCount: 6,
    voters: commentVoters(),
  };
  await mockProjectIssueDetail(page, {
    comments: [comment],
    timeline: [
      { comment, id: 77, kind: "comment" },
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

  await page.goto(issueHref);
  await expect(
    page.locator(
      '.span-left-pane a[href^="#comment-"], .span-left-pane a[href^="#event-"], .span-right-pane a[href^="#comment-"], .span-right-pane a[href^="#event-"]',
    ),
  ).toHaveCount(0);
  await expect(page.locator(".span-left-pane #comment-77 .ago-date a.ago")).toHaveAttribute(
    "href",
    `${issueHref}#comment-77`,
  );
  await expect(page.locator(".span-left-pane #comment-77 .ago-date a.share-link")).toHaveAttribute(
    "href",
    `${issueHref}#comment-77`,
  );
  await expect(page.locator(".span-right-pane #comment-77 .comment-body a")).toHaveAttribute(
    "href",
    `${issueHref}#comment-77`,
  );
  await expect(page.locator(".span-left-pane #event-88 .date a")).toHaveAttribute(
    "href",
    `${issueHref}#event-88`,
  );
  await expect(page.locator("#comment-77 button.vote-description-people")).toHaveText(
    "6 Agreements",
  );

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-hash-links";
  });
  await page.locator(".span-left-pane #comment-77 .ago-date a.ago").click();
  await expect(page).toHaveURL(`${issueHref}#comment-77`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-hash-links");
  await page.locator(".span-left-pane #event-88 .date a").click();
  await expect(page).toHaveURL(`${issueHref}#event-88`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-hash-links");
});

test("project issue detail folds original email message in route-owned comment body", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        childComments: [],
        contentsHtml: "<p>Server HTML should not render</p>",
        contentsMarkdown:
          "Fresh reply before quoted tail\n\n--- Original Message ---\nQuoted tail starts hidden\n\n> previous note",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viaEmail: true,
        voterCount: 0,
        voters: [],
      },
    ],
    timeline: [],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const commentBody = page.locator("#comment-77 .comment-body.markdown-wrap");
  await expect(commentBody).toHaveAttribute("data-via-email", "true");
  await expect(commentBody).toHaveAttribute("data-yobi-original-message-processed", "true");
  await expect(commentBody.getByText("Fresh reply before quoted tail")).toBeVisible();
  await expect(commentBody.getByText("Quoted tail starts hidden")).toBeHidden();

  await page.waitForTimeout(100);
  const toggle = commentBody.locator('button[type="button"]').filter({ hasText: "..." });
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toBeVisible();
  await expect(commentBody.locator('button[type="button"]:visible')).toHaveCount(1);

  await toggle.click();
  await expect(commentBody.getByText("Quoted tail starts hidden")).toBeVisible();
  await expect(commentBody.getByText("previous note")).toBeVisible();

  await toggle.click();
  await expect(commentBody.getByText("Quoted tail starts hidden")).toBeHidden();
  await expect(commentBody.getByText("previous note")).toBeHidden();
});

test("project issue detail preserves legacy clickable right-pane index comments", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const issueHref = `${basePath}/admin/sample/issue/11`;
  await mockProjectIssueDetail(page);

  await page.goto(issueHref);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-index-comment-row";
  });
  await page.locator(".span-right-pane #comment-77.index-comment").click();
  await expect(page).toHaveURL(`${issueHref}#comment-77`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-index-comment-row");
});

test("project issue detail route source uses shared markdown help, legacy copy keys, and direct TanStack links", () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );

  expect(routeSource).toContain(
    'import { LegacyMarkdownHelp } from "../../../-legacy-markdown-help";',
  );
  expect(routeSource).toContain("<LegacyMarkdownHelp />");
  expect(routeSource).not.toContain("help/markdown.scala.html?raw");
  expect(routeSource).not.toContain("legacyMarkdownHelpTemplate");
  expect(routeSource).not.toContain("legacyMarkdownHelpHtml");
  expect(routeSource).not.toMatch(/markdown-help[\s\S]{0,160}dangerouslySetInnerHTML/u);
  expect(routeSource).not.toContain("labelSelectOptionsHtml");
  expect(routeSource).not.toContain("optionsHtml");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML={{ __html: optionsHtml }}");
  expect(routeSource).not.toContain("yobi.Comment.init({'sContainer' : '#comments'});");
  expect(routeSource).not.toContain("/assets/javascripts/common/yobi.Comment.js");
  expect(routeSource).not.toContain("/assets/javascripts/common/yobi.CommentForm.js");
  expect(routeSource).not.toContain("IssueViewBootstrapScript");
  expect(routeSource).not.toContain('$yobi.loadModule("issue.View"');
  expect(routeSource).not.toContain("yobi.ShortcutKey.setKeymapLink");
  expect(routeSource).not.toContain("yobi.Mention({");
  expect(routeSource).not.toContain(":contains(");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).not.toContain("yobi.OriginalMessage.hide");
  for (const key of [
    "button.newSubtask",
    "button.comment.new",
    "button.share.issue",
    "issue.sharer.description",
    "issue.sharer",
    "issue.sharer.select",
    "issue.assignee",
    "issue.noAuthor",
    "issue.noAssignee",
    "issue.state.assigned",
    "issue.state.closed",
    "issue.state.open",
    "issue.event.sharer.deleted.title",
    "label.select",
    "milestone",
    "issue.noMilestone",
    "milestone.menu.new",
    "milestone.state.open",
    "milestone.state.closed",
    "issue.weight",
    "issue.weight.description",
    "button.edit",
    "button.show.original",
    "button.delete",
    "issue.can.not.be.deleted",
    "issue.delete",
    "post.delete.confirm",
    "button.yes",
    "button.no",
  ]) {
    expect(routeSource).toContain(`t("${key}")`);
  }
  expect(routeSource).not.toContain(">Issue Sharing<");
  expect(routeSource).not.toContain(">New subtask<");
  expect(routeSource).not.toContain('<strong className="name">No author</strong>');
  expect(routeSource).not.toContain('<span className="ybtn ybtn-disabled">Add a comment</span>');
  expect(routeSource).not.toContain('<span className="state changed">Assigned</span>');
  expect(routeSource).not.toContain(
    'const stateLabel = issueState === "closed" ? "Closed" : "Open";',
  );
  expect(routeSource).not.toContain('{parentIssueState === "closed" ? "Closed" : "Open"}');
  expect(routeSource).not.toContain('return state === "closed" ? "Closed" : "Open";');
  expect(routeSource).not.toContain(">Issue Sharer{");
  expect(routeSource).not.toContain(">Assignee<");
  expect(routeSource).not.toContain('placeholder="No assignee"');
  expect(routeSource).not.toContain('placeholder="Select Issue Sharer"');
  expect(routeSource).not.toContain('data-placeholder="Select label"');
  expect(routeSource).not.toContain(">Milestone<");
  expect(routeSource).not.toContain(">No milestone<");
  expect(routeSource).not.toContain(">New milestone<");
  expect(routeSource).not.toContain('label="Open"');
  expect(routeSource).not.toContain('label="Closed"');
  expect(routeSource).not.toContain('content="Issue weight description"');
  expect(routeSource).not.toContain('title="Issue weight: Upvote"');
  expect(routeSource).not.toContain('title="Issue weight: Down vote"');
  expect(routeSource).not.toContain('title="Edit"');
  expect(routeSource).not.toContain('title="See text"');
  expect(routeSource).not.toContain('title="Delete"');
  expect(routeSource).not.toContain(
    "content=\"Can\\'t be deleted because of other users\\' comments\"",
  );
  expect(routeSource).not.toContain(">Delete issue<");
  expect(routeSource).not.toContain(">Yes<");
  expect(routeSource).not.toContain(">No<");
  expect(routeSource).toMatch(
    /data-yobi-original-message-processed=\{viaEmail\s*\?\s*"true"\s*:\s*undefined\}/u,
  );
  expect(routeSource).toContain("function OriginalMessageMarkdown({");
  expect(routeSource).toContain("function splitOriginalMessage(contentsMarkdown: string)");
  expect(routeSource).not.toMatch(
    /function CommentDeleteModalScripts[\s\S]*dangerouslySetInnerHTML[\s\S]*function IssueViewBootstrapScript/u,
  );
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("ComponentType");
  expect(routeSource).not.toContain("AnchorHTMLAttributes");
  expect(routeSource).not.toContain("createElement");
  expect(routeSource).not.toMatch(/^\s*<a(?:\s|>)/mu);
  expect(routeSource).not.toContain("function attachedFilesHtml");
  expect(routeSource).not.toContain('<a class="attached-delete"');
  expect(routeSource).not.toContain("attachedFilesHtml(issue.attachments)");
  expect(routeSource).not.toContain("attachedFilesHtml(comment.attachments)");
  expect(routeSource).not.toContain('className="attached-delete"');
  const commentUpdateFormSource = routeSource.slice(
    routeSource.indexOf("function CommentUpdateForm"),
    routeSource.indexOf("function MarkdownEditor"),
  );
  expect(commentUpdateFormSource).toContain('className="attached-file attached-file-marker"');
  expect(commentUpdateFormSource).toContain('className="btn-transparent btn-delete"');
  expect(commentUpdateFormSource).not.toMatch(
    /<button\s+type="button"\s+className="btn-transparent btn-delete"\s+data-id=/u,
  );
  expect(routeSource).toContain('<ul className="attaches wm">');
  expect(routeSource).toContain('className="attach"');
  expect(routeSource).toContain('className="download ybtn ybtn-mini"');
  expect(routeSource).toContain('className="vmiddle"');
  expect(routeSource).toContain("action=download");
  expect(routeSource).toContain("const LEGACY_LINK_PROPS = {");
  expect(routeSource).not.toContain("IssueLegacyLinkProps");
  expect(routeSource).not.toContain("IssueHashLink");
  expect(routeSource).not.toContain("IssueRouteLink");
  expect(routeSource).not.toContain("as never");
  expect(routeSource).not.toContain("const authorPath =");
  expect(routeSource).not.toContain("const userPath =");
  expect(routeSource).toContain('to="/$ownerName/$projectName/issue/$issueNumber"');
  expect(routeSource).toContain('to="/$ownerName/$projectName/issue/$issueNumber/editform"');
  expect(routeSource).toContain('to="/$user"');
  expect(routeSource).toContain(
    "to={`/${ownerName}/${projectName}/milestone/${String(issue.milestoneId)}`}",
  );
  expect(routeSource).toContain("to={`/user/issues/new?commentId=${commentId}`}");
  expect(routeSource).not.toContain('data-request-method="post"');
  expect(routeSource).not.toContain("const voteHref =");
  expect(routeSource).not.toContain("data-request-uri={voteHref}");
  expect(routeSource).not.toMatch(/data-request-(?:type|uri|method)=/u);
  expect(routeSource).not.toContain("data-clipboard-text");
  expect(routeSource).toContain("navigator.clipboard.writeText(emailText)");
  expect(routeSource).not.toMatch(
    /document\.title|globalThis\[[^\]]*document[^\]]*\]|querySelector|addEventListener|classList|style\.display|setAttribute|removeAttribute|innerHTML|dangerouslySetInnerHTML|jQuery|\$\(/u,
  );
  expect(routeSource).toContain("function ProjectIssueDetailTitle({");
  expect(routeSource).toContain("function legacyIssueOpenGraphDescription(");
  expect(routeSource).toContain("issueBodyMarkdown.slice(0, 200)");
  expect(routeSource).toContain(
    "return `${issueBodyMarkdown.slice(0, 200)} - ${ownerName}/${projectName}`;",
  );
  expect(routeSource).toContain('<meta property="og:title" content={issueTitle} />');
  expect(routeSource).toContain('<meta property="og:description" content={description} />');
  expect(routeSource).toContain('<meta name="twitter:title" content={issueTitle} />');
  expect(routeSource).toContain('<meta name="twitter:description" content={description} />');
  expect(routeSource).toContain("function ProjectIssueNotFoundTitle({");
  expect(routeSource).toContain(
    '<title>{`${t("error.notfound")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(routeSource).not.toContain("useProjectIssueDetailDocumentTitle");
  expect(routeSource).not.toContain('data-toggle="comment-edit"');
  expect(routeSource).not.toContain('data-toggle="comment-delete"');
  expect(routeSource).not.toContain('data-toggle="modal"');
  expect(routeSource).not.toContain('data-toggle="tab"');
  expect(routeSource).not.toContain('data-toggle="tooltip"');
  expect(routeSource).not.toContain('data-dismiss="modal"');
  expect(routeSource).not.toMatch(
    /data-target=(?:"#(?:-yona-posting-history|deleteConfirm|helpKeys|voters)"|\{`#voters-\$\{commentId\}`\})/u,
  );
  expect(routeSource).not.toMatch(/data-target=\{`#(?:edit|preview)-\$\{wrapId\}`\}/u);
  expect(routeSource).toContain("setCommentEditOpen((current) => !current)");
  expect(routeSource).toContain("event.stopPropagation();");
  expect(routeSource).toContain(
    "function insulateModalButtonClick(event: MouseEvent<HTMLButtonElement>) {",
  );
  expect(
    routeSource.match(/insulateModalButtonClick\(event\);/g)?.length ?? 0,
  ).toBeGreaterThanOrEqual(12);
});

async function armRootModalBridgeTrap(page: Page) {
  await page.evaluate(() => {
    const win = window as typeof window & {
      __rootModalBridgeHits?: string[];
      __rootModalBridgeTrapArmed?: boolean;
    };
    win.__rootModalBridgeHits = [];
    if (win.__rootModalBridgeTrapArmed) {
      return;
    }
    win.__rootModalBridgeTrapArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridged = target?.closest('[data-toggle="modal"], [data-dismiss="modal"]');
      if (bridged) {
        win.__rootModalBridgeHits?.push(
          `${bridged.tagName.toLowerCase()}#${bridged.id}.${bridged.className}`,
        );
      }
    });
  });
}

async function rootModalBridgeHits(page: Page) {
  return page.evaluate(
    () =>
      (window as typeof window & { __rootModalBridgeHits?: string[] }).__rootModalBridgeHits ?? [],
  );
}

async function installClipboardSpy(page: Page) {
  await page.evaluate(() => {
    const win = window as typeof window & { __lastCopiedText?: string };
    win.__lastCopiedText = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          win.__lastCopiedText = text;
        },
      },
    });
  });
}

async function lastCopiedText(page: Page) {
  return page.evaluate(
    () => (window as typeof window & { __lastCopiedText?: string }).__lastCopiedText ?? "",
  );
}

async function expectIssueDetailAssets(page: Page, basePath: string) {
  const hrefs = [
    `${basePath}/admin/sample/issue/labels.css`,
    `${basePath}/assets/javascripts/lib/atjs/jquery.atwho.css`,
    `${basePath}/assets/javascripts/lib/elevator/jquery.elevator.css`,
    `${basePath}/assets/javascripts/lib/videojs/video-js.min.css`,
  ];

  const markdownLink = page.locator(
    `link[href="${basePath}/assets/javascripts/lib/highlight/styles/default.css"]`,
  );
  await expect(markdownLink).toHaveAttribute("rel", "stylesheet");
  await expect(markdownLink).toHaveAttribute("type", "text/css");

  for (const href of hrefs) {
    const link = page.locator(`link[href="${href}"]`);
    await expect(link).toHaveAttribute("rel", "stylesheet");
    await expect(link).toHaveAttribute("type", "text/css");
    await expect(link).toHaveAttribute("media", "screen");
  }

  const scriptSources = [
    `${basePath}/assets/javascripts/lib/highlight/highlight.pack.js`,
    `${basePath}/assets/javascripts/lib/marked.js`,
    `${basePath}/assets/javascripts/lib/moment-with-langs.min.js`,
    `${basePath}/assets/javascripts/lib/pikaday/pikaday.js`,
    `${basePath}/assets/javascripts/common/yobi.ui.Calendar.js`,
    `${basePath}/assets/javascripts/lib/atjs/jquery.caret.min.js`,
    `${basePath}/assets/javascripts/lib/atjs/jquery.atwho.js`,
    `${basePath}/assets/javascripts/lib/elevator/jquery.elevator.js`,
    `${basePath}/assets/javascripts/lib/videojs/video.min.js`,
    `${basePath}/assets/javascripts/lib/favico/favico.min.js`,
    `${basePath}/assets/javascripts/service/yona.issue.Assginee.js`,
    `${basePath}/assets/javascripts/service/yona.issue.Sharer.js`,
    `${basePath}/assets/javascripts/service/yona.detectChange.js`,
    `${basePath}/assets/javascripts/common/yona.Sha1.js`,
    `${basePath}/assets/javascripts/common/yona.Tasklist.js`,
    `${basePath}/assets/javascripts/common/yona.SubComment.js`,
    `${basePath}/assets/javascripts/common/yona.CommentAttachmentsUpdate.js`,
    `${basePath}/assets/javascripts/common/yona.ReceiverList.js`,
  ];
  for (const src of scriptSources) {
    const script = page.locator(`script[src="${src}"]`);
    await expect(script).toHaveAttribute("type", "text/javascript");
    await expect(script).toHaveAttribute("defer", "");
  }

  await expectIssueDetailSelect2Partial(page, basePath);

  expect(
    await page
      .locator("script:not([src])")
      .evaluateAll((scripts) =>
        scripts.some((script) =>
          (script.textContent ?? "").includes("yobi.Comment.init({'sContainer' : '#comments'});"),
        ),
      ),
  ).toBe(false);

  await expect(
    page.locator(`script[src="${basePath}/assets/javascripts/common/yobi.Comment.js"]`),
  ).toHaveCount(0);
  await expect(
    page.locator(`script[src="${basePath}/assets/javascripts/common/yobi.CommentForm.js"]`),
  ).toHaveCount(0);

  const inlineScriptTexts = await page
    .locator("script:not([src])")
    .evaluateAll((scripts) => scripts.map((script) => script.textContent ?? ""));
  expect(inlineScriptTexts.some((text) => text.includes('$yobi.loadModule("issue.View"'))).toBe(
    false,
  );
  expect(inlineScriptTexts.some((text) => text.includes("yobi.ShortcutKey.setKeymapLink"))).toBe(
    false,
  );
  expect(inlineScriptTexts.some((text) => text.includes("yobi.Mention({"))).toBe(false);
  expect(inlineScriptTexts.some((text) => text.includes(":contains("))).toBe(false);

  await expect(page.locator("script", { hasText: "yonaAssgineeModule(" })).toHaveCount(0);
  await expect(page.locator("script", { hasText: '$(".markdown-wrap").first().html' })).toHaveCount(
    0,
  );
  await expect(page.locator("script", { hasText: '$(".weight-number").html' })).toHaveCount(0);
  await expect(page.locator("#issue-share-button")).not.toHaveAttribute("data-toggle", "popover");
  await expect(page.locator("#issue-share-button")).not.toHaveAttribute("data-trigger", "hover");
  await expect(page.locator("#issue-share-button")).not.toHaveAttribute("data-placement", "top");
  await expect(page.locator("#issue-share-button")).not.toHaveAttribute("data-content", /./u);
  await expect(page.locator(".weight-number")).not.toHaveAttribute("data-toggle", "popover");
  await expect(page.locator(".weight-number")).not.toHaveAttribute("data-trigger", "hover");
  await expect(page.locator(".weight-number")).not.toHaveAttribute("data-placement", "top");
  await expect(page.locator(".weight-number")).not.toHaveAttribute("data-content", /./u);
  await expectIssueDetailTooltipMetadata(page);
}

async function expectIssueDetailTooltipMetadata(page: Page) {
  await expect(page.locator('[data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator("#watch-button")).toHaveAttribute("title", "Watch this issue");
  await expect(page.locator("#watch-button")).not.toHaveAttribute("data-placement", "top");
  await expect(page.locator("#upvote-issue-weight")).toHaveAttribute(
    "title",
    "Issue weight: Upvote",
  );
  await expect(page.locator("#down-vote-issue-weight")).toHaveAttribute(
    "title",
    "Issue weight: Down vote",
  );
  await expect(page.locator("#vote > button").first()).toHaveAttribute("title", "Vote this issue");
  await expect(page.locator("#vote .voter-list a.avatar-wrap").first()).toHaveAttribute(
    "title",
    "Site Admin",
  );
  await expect(page.locator("#comment-77 .comment_author a").last()).toHaveAttribute(
    "title",
    "dev",
  );
}

async function expectLegacyTopHoverPopover(page: Page, targetSelector: string, content: string) {
  await expect(page.locator(".popover.top.in")).toHaveCount(0);
  await page.locator(targetSelector).first().hover();

  const popover = page.locator(".popover.top.in", { hasText: content });
  await expect(popover).toBeVisible();
  await expect(popover.locator(".arrow")).toHaveCount(1);
  await expect(popover.locator(".popover-content")).toHaveText(content);

  const metrics = await page.evaluate(
    ({ content, targetSelector }) => {
      const target = document.querySelector(targetSelector);
      const popover = Array.from(document.querySelectorAll(".popover.top.in")).find((node) =>
        (node.textContent ?? "").includes(content),
      );
      if (!target || !popover) {
        return null;
      }
      const targetBox = target.getBoundingClientRect();
      const popoverBox = popover.getBoundingClientRect();
      return {
        arrowCount: popover.querySelectorAll(".arrow").length,
        popoverBottom: Math.round(popoverBox.bottom),
        popoverCenter: Math.round(popoverBox.left + popoverBox.width / 2),
        targetCenter: Math.round(targetBox.left + targetBox.width / 2),
        targetTop: Math.round(targetBox.top),
      };
    },
    { content, targetSelector },
  );
  expect(metrics).not.toBeNull();
  expect(metrics!.arrowCount).toBe(1);
  expect(metrics!.popoverBottom).toBeLessThanOrEqual(metrics!.targetTop);
  expect(Math.abs(metrics!.popoverCenter - metrics!.targetCenter)).toBeLessThanOrEqual(10);

  await page.mouse.move(1, 1);
  await expect(page.locator(".popover.top.in")).toHaveCount(0);
}

async function expectIssueDetailSelect2Partial(page: Page, basePath: string) {
  const select2Scripts = [
    `${basePath}/assets/javascripts/lib/select2/select2.js`,
    `${basePath}/assets/javascripts/common/yobi.ui.Select2.js`,
  ];
  for (const src of select2Scripts) {
    const scripts = page.locator(`script[src="${src}"]`);
    await expect(scripts).toHaveCount(2);
    await expect(scripts.nth(1)).toHaveAttribute("defer", "");
  }

  const templates = [
    {
      id: "tplSelect2FormatUser",
      text: '<div class="usf-group" title="${name} ${loginId}">',
    },
    {
      id: "tplSelect2FormatMilestone",
      text: '<div title="[${stateLabel}] ${name}">',
    },
    {
      id: "tplSelect2Projects",
      text: '<span class="avatar-wrap smaller"><img src="${avatarURL}" width="16" height="16"></span>',
    },
    {
      id: "tplSelect2ProjectsWithoutAvatar",
      text: '<span class="width25px"></span>',
    },
    {
      id: "tplSelect2FormatIssues",
      text: '<div title="${name}">',
    },
  ];

  for (const template of templates) {
    const nodes = page.locator(`script#${template.id}[type="text/x-jquery-tmpl"]`);
    await expect(nodes).toHaveCount(1);
    expect(await nodes.first().textContent()).toContain(template.text);
  }
}

test("project issue detail not found renders legacy project error shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const cases = [
    { ownerName: "admin", projectName: "svnplayground" },
    { ownerName: "alice", projectName: "sample" },
  ];

  for (const { ownerName, projectName } of cases) {
    await mockProjectIssueDetail(page, {
      __issueNumber: 1,
      __issueStatus: 404,
      __ownerName: ownerName,
      __projectName: projectName,
    });

    await page.goto(`${basePath}/${ownerName}/${projectName}/issue/1`);

    await expect(page.locator(".project-header-outer")).toBeVisible();
    await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Issue");
    await expect(page.locator(".project-page-wrap > .error-wrap")).toBeVisible({ timeout: 1500 });
    await expect(page.locator(".project-page-wrap > .error-wrap p")).toHaveText(
      "Issue does not exist",
    );
    await expect(page.locator(".project-page-wrap > .error-wrap .ybtn.ybtn-primary")).toHaveText(
      "List",
    );
    await expect(
      page.locator(".project-page-wrap > .error-wrap .ybtn.ybtn-primary"),
    ).toHaveAttribute("href", `${basePath}/${ownerName}/${projectName}/issues?state=all`);
    await expect(page).toHaveTitle(`Page not found - ${ownerName}/${projectName}`);
    await expect
      .poll(() => headTitleText(page))
      .toBe(`Page not found - ${ownerName}/${projectName}`);
    await expect(page.locator(".board-view")).toHaveCount(0);
    await expect(page.locator("#issueUpdateForm")).toHaveCount(0);
    await expect(page.locator("#comment-form")).toHaveCount(0);

    expect(await issueNotFoundMetrics(page)).toEqual({
      buttonDisplay: "inline-block",
      buttonHeight: 30,
      buttonLineHeight: "20px",
      errorPaddingBlock: 200,
      iconClass: "ico ico-err2",
      messageFontSize: "16px",
      messageFontWeight: "700",
      messageMarginBottom: 30,
      messageMarginTop: 30,
      pageWrapChildCount: 1,
    });
  }
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

test("project issue detail owns edit/delete action spacing in both legacy rows", async ({
  page,
}) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const componentSource = routeSource.slice(
    routeSource.indexOf("function IssueActionButtons"),
    routeSource.indexOf("type IssueComment"),
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyPage = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const leftRowStart = legacyView.indexOf('<span class="act-row">');
  const rightRowStart = legacyView.indexOf('<div class="act-row right-menu-icons">');
  expect(leftRowStart).toBeGreaterThanOrEqual(0);
  expect(rightRowStart).toBeGreaterThan(leftRowStart);
  expect(legacyView.slice(leftRowStart, rightRowStart)).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"',
  );
  expect(legacyView.slice(leftRowStart, rightRowStart)).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml6"',
  );
  expect(legacyView.slice(rightRowStart)).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"',
  );
  expect(legacyView.slice(rightRowStart)).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml6"',
  );
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");
  expect(legacyCommon).toContain(".ml6 { margin-left:6px; }");
  expect(legacyPage).toContain(".pt5px {");
  expect(legacyPage).toContain("padding-top: 5px;");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(legacyYobi).toContain('@import "less/_page.less";');
  expect(componentSource).toContain("styles.issueActionEdit");
  expect(componentSource).toContain("styles.issueActionDelete");
  expect(componentSource).toContain('data-stylex-owner="project-issue-detail-action-edit"');
  expect(componentSource).toContain('data-stylex-owner="project-issue-detail-action-delete"');
  expect(componentSource).not.toContain("ml10");
  expect(componentSource).not.toContain("pt5px");
  expect(componentSource).not.toContain("ml6");
  expect(styleSource).toMatch(
    /issueActionEdit:\s*\{[\s\S]*?marginLeft:\s*["']10px["'][\s\S]*?paddingTop:\s*["']5px["']/u,
  );
  expect(styleSource).toMatch(/issueActionDelete:\s*\{[\s\S]*?marginLeft:\s*["']6px["']/u);

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  await mockProjectIssueDetail(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);

  const editButtons = page.locator('[data-stylex-owner="project-issue-detail-action-edit"]');
  const deleteButtons = page.locator('[data-stylex-owner="project-issue-detail-action-delete"]');
  await expect(editButtons).toHaveCount(2);
  await expect(deleteButtons).toHaveCount(2);
  for (const button of await editButtons.all()) await expect(button).toBeVisible();
  for (const button of await deleteButtons.all()) await expect(button).toBeVisible();
  for (const button of await editButtons.all()) {
    await expect(button).toHaveClass(/icon/);
    await expect(button).not.toHaveAttribute("style", /.+/u);
  }
  for (const button of await deleteButtons.all()) {
    await expect(button).toHaveClass(/icon/);
    await expect(button).not.toHaveAttribute("style", /.+/u);
  }
  expect(
    await editButtons.evaluateAll((buttons) =>
      buttons.map((button) => getComputedStyle(button).marginLeft),
    ),
  ).toEqual(["10px", "10px"]);
  expect(
    await editButtons.evaluateAll((buttons) =>
      buttons.map((button) => getComputedStyle(button).paddingTop),
    ),
  ).toEqual(["5px", "5px"]);
  expect(
    await deleteButtons.evaluateAll((buttons) =>
      buttons.map((button) => getComputedStyle(button).marginLeft),
    ),
  ).toEqual(["6px", "6px"]);

  const rowMetrics = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".board-actrow .act-row, .right-menu-icons")].map(
      (row) => {
        const edit = row.querySelector<HTMLElement>(
          '[data-stylex-owner="project-issue-detail-action-edit"]',
        );
        const remove = row.querySelector<HTMLElement>(
          '[data-stylex-owner="project-issue-detail-action-delete"]',
        );
        if (!edit || !remove) return null;
        const rowBox = row.getBoundingClientRect();
        const editBox = edit.getBoundingClientRect();
        const removeBox = remove.getBoundingClientRect();
        return {
          editContained: editBox.left >= rowBox.left && editBox.right <= rowBox.right,
          deleteContained: removeBox.left >= rowBox.left && removeBox.right <= rowBox.right,
          ordered: editBox.left <= removeBox.left,
        };
      },
    ),
  );
  expect(rowMetrics).toEqual([
    { editContained: true, deleteContained: true, ordered: true },
    { editContained: true, deleteContained: true, ordered: true },
  ]);

  if (fallbackOff) {
    for (const button of await editButtons.all()) {
      await expect(button).toHaveCSS("margin-left", "10px");
    }
    for (const button of await deleteButtons.all()) {
      await expect(button).toHaveCSS("margin-left", "6px");
    }
  }
  await editButtons.first().click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11/editform`);

  await mockProjectIssueDetail(page);
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await deleteButtons.first().click();
  await expect(page.locator("#deleteConfirm")).toBeVisible();
  await expect(page.locator("#deleteConfirm .modal-header h3")).toHaveText("Delete issue");
});

test("project issue detail owns mobile new-subtask spacing with route StyleX", async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );

  expect(legacyView).toContain('<span class="project-btn-item hide show-in-mobile-inline ml4">');
  expect(legacyCommon).toContain(".ml4 { margin-left:4px; }");
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-mobile-new-subtask"');
  expect(routeSource).toContain("styles.mobileNewSubtask");
  expect(routeSource).not.toContain("show-in-mobile-inline ml4");
  expect(styleSource).toMatch(/mobileNewSubtask:\s*\{[\s\S]*?marginLeft:\s*['"]4px['"]/u);

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  await mockProjectIssueDetail(page);
  const mobile = page.locator('[data-stylex-owner="project-issue-detail-mobile-new-subtask"]');
  const link = mobile.locator("a").filter({ hasText: "New subtask" });

  await page.setViewportSize({ width: fallbackOff ? 390 : 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(mobile).toHaveCount(1);
  await expect(mobile).not.toHaveAttribute("style", /.+/u);

  if (fallbackOff) {
    await expect(mobile).toHaveCSS("margin-left", "4px");
    const rect = await mobile.evaluate((element) => {
      const { bottom, left, right, top } = element.getBoundingClientRect();
      return { bottom, left, right, top };
    });
    expect(rect.bottom).toBeGreaterThanOrEqual(0);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
  } else {
    await expect(mobile).toBeHidden();
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(mobile).toBeVisible();
    await expect(mobile).toHaveClass(/project-btn-item/);
    await expect(mobile).toHaveClass(/hide/);
    await expect(mobile).toHaveClass(/show-in-mobile-inline/);
    await expect(mobile).not.toHaveClass(/ml4/);
    await expect(mobile).toHaveCSS("margin-left", "4px");
    await expect(mobile).toHaveCSS("display", "inline-block");
  }
  await expect(link).toHaveAttribute("href", `${basePath}/admin/sample/issueform?parentIssueId=42`);
});

test("project issue detail owns desktop header metadata spacing with route StyleX", async ({
  page,
}) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(legacyView).toContain('<div class="pull-right mr10 mt10 hide-in-mobile">');
  expect(legacyCommon).toContain(".mr10 { margin-right:10px; }");
  expect(legacyCommon).toContain(".mt10 { margin-top:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-desktop-metadata"');
  expect(routeSource).toContain("styles.desktopMetadata");
  expect(routeSource).not.toContain("pull-right mr10 mt10 hide-in-mobile");
  expect(styleSource).toMatch(
    /desktopMetadata:\s*\{[\s\S]*?marginRight:\s*["']10px["'][\s\S]*?marginTop:\s*["']10px["']/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  await mockProjectIssueDetail(page);
  const metadata = page.locator('[data-stylex-owner="project-issue-detail-desktop-metadata"]');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(metadata).toHaveCount(1);
  await expect(metadata).not.toHaveAttribute("style", /.+/u);
  await expect(metadata).toHaveClass(/pull-right/);
  await expect(metadata).toHaveClass(/hide-in-mobile/);
  await expect(metadata.locator(".date")).toHaveText("Jul 1, 2026");
  await expect(metadata.locator(".badge")).toHaveText("Open");
  await expect(metadata).toHaveCSS("margin-right", "10px");
  await expect(metadata).toHaveCSS("margin-top", "10px");

  const desktopGeometry = await metadata.evaluate((element) => {
    const header = element.closest<HTMLElement>(".board-header.issue");
    const date = element.querySelector<HTMLElement>(".date");
    const badge = element.querySelector<HTMLElement>(".badge");
    if (!header || !date || !badge) return null;
    const wrapper = element.getBoundingClientRect();
    const headerBox = header.getBoundingClientRect();
    return {
      badgeContained: badge.getBoundingClientRect().bottom <= wrapper.bottom,
      dateContained: date.getBoundingClientRect().left >= wrapper.left,
      headerContained: wrapper.right <= headerBox.right,
      visible: wrapper.width > 0 && wrapper.height > 0,
    };
  });
  expect(desktopGeometry).toEqual({
    badgeContained: true,
    dateContained: true,
    headerContained: true,
    visible: true,
  });

  await page.setViewportSize({ width: 390, height: 900 });
  if (fallbackOff) {
    await expect(metadata).toHaveCSS("margin-right", "10px");
    await expect(metadata).toHaveCSS("margin-top", "10px");
  } else {
    await expect(metadata).toBeHidden();
  }
});

test("project issue detail owns sidebar bottom spacing with route StyleX", async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );

  expect(legacyView.split(/\r?\n/u)[292]).toContain('<div class="span3 span-right-pane mb20">');
  expect(legacyCommon.split(/\r?\n/u)[211]).toContain(".mb20 { margin-bottom:20px; }");
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-sidebar"');
  expect(routeSource).toContain("span3 span-right-pane");
  expect(routeSource).not.toContain("span3 span-right-pane mb20");
  expect(styleSource).toMatch(/sidebar:\s*\{[\s\S]*?marginBottom:\s*["']20px["']/u);

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
  await mockProjectIssueDetail(page);
  const sidebar = page.locator('[data-stylex-owner="project-issue-detail-sidebar"]');
  const issueInfo = sidebar.locator(".issue-info");
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(sidebar).toHaveCount(1);
  await expect(sidebar).toBeVisible();
  await expect(sidebar).not.toHaveAttribute("style", /.+/u);
  await expect(sidebar).toHaveCSS("margin-bottom", "20px");
  await expect(issueInfo).toBeVisible();
  await expect(issueInfo).toContainText("Assignee");
  await expect(sidebar.locator(".project-btn-item a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issueform?parentIssueId=42`,
  );

  const assertContained = async () => {
    const metrics = await sidebar.evaluate((element) => {
      const sidebarRect = element.getBoundingClientRect();
      const boardRect = element.parentElement?.getBoundingClientRect();
      if (!boardRect) throw new Error("issue detail sidebar has no board-body parent");
      return {
        bottom: sidebarRect.bottom,
        boardBottom: boardRect.bottom,
        boardLeft: boardRect.left,
        boardRight: boardRect.right,
        left: sidebarRect.left,
        right: sidebarRect.right,
        top: sidebarRect.top,
      };
    });
    expect(metrics.left).toBeGreaterThanOrEqual(metrics.boardLeft);
    expect(metrics.right).toBeLessThanOrEqual(metrics.boardRight);
    expect(metrics.top).toBeGreaterThanOrEqual(0);
    expect(metrics.bottom).toBeGreaterThanOrEqual(metrics.top);
    if (!fallbackOff) expect(metrics.bottom).toBeLessThanOrEqual(metrics.boardBottom);
  };

  await assertContained();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(sidebar).not.toHaveAttribute("style", /.+/u);
  if (fallbackOff) {
    await expect(sidebar).toHaveCSS("margin-bottom", "20px");
    await assertContained();
  } else {
    await expect(sidebar).toBeHidden();
  }
});

test("project issue detail renders protected org-owned localhost shell state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __closedMilestones: [{ id: 8, state: "closed", title: "Portal archive" }],
    __issueNumber: 1,
    __labelsResponse: [],
    __openMilestones: [{ id: 5, state: "open", title: "Portal launch" }],
    __ownerName: "weblabs",
    __projectName: "portal",
    __projectOverrides: {
      backgroundImageUrl: "/assets/images/project_default.jpg",
      id: 2,
      isProtected: true,
      isWatching: true,
      organizationName: "weblabs",
      viewerCanWatch: true,
      watchCount: 2,
    },
    assigneeLoginId: "",
    authorLabel: "Carol Lee",
    authorLoginId: "carol",
    bodyChecksum: "portal-body-sha1",
    bodyHtml: "<p>Server HTML should not render</p>",
    bodyMarkdown: "Seed issue for organization-owned protected project flows.",
    commentCount: 0,
    comments: [],
    createdLabel: "Jul 6, 2026",
    dueDateLabel: "Jul 28, 2026",
    dueDateOverdue: false,
    dueDateUntilLabel: "22 days",
    issueId: 2,
    issueNumber: 1,
    issueUpdateMillis: 1783382400000,
    issueVoters: [],
    labels: [],
    milestoneId: null,
    milestoneTitle: "",
    parentIssueId: null,
    sharers: [],
    timeline: [],
    title: "Portal protected project smoke check",
    voterCount: 0,
    watcherCount: 0,
    weight: 0,
  });

  await page.goto(`${basePath}/weblabs/portal/issue/1`);
  await expect(page).toHaveTitle("Portal protected project smoke check");

  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const scopeToggle = page.locator("#gnb-search-scope-title");
  const scopeButtons = page.locator('[data-stylex-owner="global-gnb-search-scope-item"] > button');
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(1).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expect(scopeToggle).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(2).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expect(scopeToggle).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-util .watcher-count")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/watchers`,
  );
  await expect(page.locator(".project-util .watcher-count")).toHaveText("2");
  await expect(page.locator(".board-id")).toHaveText("1");
  await expect(page.locator(".board-header.issue .title")).toContainText(
    "Portal protected project smoke check",
  );
  await expect(page.locator(".board-header.issue .badge.badge-issue-open").first()).toHaveText(
    "Open",
  );
  await expect(page.locator(".author-info > a.usf-group")).toHaveAttribute(
    "href",
    `${basePath}/carol`,
  );
  await expect(page.locator(".author-info .name")).toHaveText("Carol Lee");
  await expect(page.locator("#issue-body-1 .content.markdown-wrap")).toContainText(
    "Seed issue for organization-owned protected project flows.",
  );
  await expect(page.locator("#attachments .attach")).toHaveCount(0);
  await expect(page.locator("#numOfComments")).toHaveValue("0");
  await expect(page.locator(".timeline-list > .comment-header .num")).toHaveText(["0", "0"]);
  await expect(page.locator(".span-left-pane #timeline .comments > li")).toHaveCount(0);
  await expect(page.locator(".span-right-pane #timeline .comments > li")).toHaveCount(0);
  await expect(page.locator(".span-right-pane .project-btn-item a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/issueform?parentIssueId=2`,
  );
  await expect(page.locator(".span-right-pane .issue-info > form > dl")).toHaveCount(3);
  await expect(page.locator(".span-right-pane dt").nth(0)).toHaveText("Assignee");
  await expect(page.locator(".span-right-pane dt").nth(1)).toHaveText("Milestone");
  await expect(page.locator(".span-right-pane dt").nth(2)).toHaveText("Due date(22 days)");
  await expect(page.locator('#milestone option[value="-1"][selected]')).toHaveCount(1);
  await expect(page.locator("#labelIds")).toHaveCount(0);
  await expect(page.locator("#comment-form")).toHaveCount(1);
  await expect(page.locator("#helpKeys")).toHaveClass("modal hide fade keymap-help");

  expect(await protectedIssueShellMetrics(page)).toEqual({
    boardTopAtOrBelowMenu: true,
    gnbClassName: "gnb-outer project-header",
    searchBottomWithinNavbar: true,
    searchLeftWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
  });
});

test("project issue detail gates only right-pane new subtask by legacy issue menu setting", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __projectOverrides: {
      menuSetting: {
        board: true,
        code: true,
        issue: false,
        milestone: true,
        pullRequest: true,
        review: true,
      },
    },
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const leftActionLink = page.locator(".board-actrow .project-btn-item a").filter({
    hasText: "New subtask",
  });
  await expect(leftActionLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issueform?parentIssueId=42`,
  );
  await expect(page.locator(".span-right-pane .project-btn-item a")).toHaveCount(0);
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
  await expect(page.locator("#-yona-posting-history .close")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator("#-yona-posting-history .modal-footer .ybtn")).toHaveAttribute(
    "aria-hidden",
    "true",
  );

  const history =
    '<div class="posting-history"><button type="button" data-toggle="modal" data-target="#-yona-posting-history"><span class="lastUpdatedBy"><span>Site Admin</span><span>Jul 3, 2026</span></span><span>edited</span></button><div id="-yona-posting-history" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h5 class="nm">Change history</h5></div><div class="modal-body"><p>Previous <strong>body</strong></p></div><div class="modal-footer"><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal" aria-hidden="true">Confirm</button></div></div></div>';
  const expected = EXPECTED_ISSUE_DETAIL.replaceAll(' aria-hidden="true"', "")
    .replace('</span></a></div><div id="issue-11"', `</span></a>${history}</div><div id="issue-11"`)
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
    .replaceAll("__CHILD_REPLY_PLACEHOLDER__", await childReplyPlaceholder(page))
    .replaceAll("__BASE_PATH__", basePath);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, expected),
  );

  await expect(
    page.locator('.posting-history a[href="#-yona-posting-history"][data-toggle="modal"]'),
  ).toHaveCount(0);
  await expect(
    page.locator(
      '.posting-history [data-toggle="modal"], .posting-history [data-target="#-yona-posting-history"], .posting-history [data-dismiss="modal"]',
    ),
  ).toHaveCount(0);
  const trigger = page.locator(
    '.posting-history button[type="button"]:has(span:has-text("edited"))',
  );
  await expect(trigger).toContainText("edited");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "posting-history-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#-yona-posting-history")).toBeVisible();
  await expect(page.locator("#-yona-posting-history")).toHaveClass("modal in");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("posting-history-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await page.locator('#-yona-posting-history .modal-footer button:has-text("Confirm")').click();
  await expect(page.locator("#-yona-posting-history")).toHaveClass("modal hide");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("posting-history-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#-yona-posting-history")).toHaveClass("modal hide");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.in").dispatchEvent("click");
  await expect(page.locator("#-yona-posting-history")).toHaveClass("modal hide");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail renders legacy anonymous posting history login link", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __sessionOverrides: {
      actorId: 0,
      emailAddress: "",
      isAnonymous: true,
      isConfirmed: false,
      isSiteAdmin: false,
      loginId: "anonymous",
      userLabel: "anonymous",
    },
    historyMarkdown: "Previous **body**",
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="posting-history"><a href="__BASE_PATH__/users/loginform?redirectUrl=/admin/sample/issue/11">Change history</a></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".author-info .posting-history")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(page.locator("#-yona-posting-history")).toHaveCount(0);
});

test("project issue detail favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { favoriteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".board-header .favorite-issue i")).not.toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".board-header .favorite-issue").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page.locator(".board-header .favorite-issue i")).toHaveClass(/starred/);
});

test("project issue detail opens legacy keymap modal through route-owned React state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(
    page.locator(
      '.board-footer [data-toggle="modal"], .board-footer [data-target="#helpKeys"], .board-footer [data-dismiss="modal"]',
    ),
  ).toHaveCount(0);
  const trigger = page.locator(".board-footer > .pull-left > button");
  await expect(trigger).toHaveClass("ybtn ybtn-inverse ybtn-mini");
  await expect(page.locator("#helpKeys")).toHaveClass("modal hide fade keymap-help");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-keymap-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#helpKeys")).not.toHaveClass(/hide/);
  await expect(page.locator("#helpKeys")).toHaveClass("modal fade keymap-help in");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-keymap-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(await keymapModalMetrics(page)).toEqual({
    display: "block",
    firstColumnTitle: "projects",
    left: 320,
    top: 72,
    width: 682,
  });

  await page.locator('#helpKeys .actrow button:has-text("Confirm")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#helpKeys")).toHaveClass("modal hide fade keymap-help");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-keymap-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(await keymapModalMetrics(page)).toMatchObject({ display: "none" });

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#helpKeys")).toHaveClass("modal hide fade keymap-help");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.fade.in").dispatchEvent("click");
  await expect(page.locator("#helpKeys")).toHaveClass("modal hide fade keymap-help");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail switches legacy comment editor tabs through React state controls", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const commentEditor = page.locator("#comment-form .mt10:has(#editor-contents-contents)");
  const editTabItem = commentEditor.locator(".nav-tabs > li").nth(0);
  const previewTabItem = commentEditor.locator(".nav-tabs > li").nth(1);
  const editTab = editTabItem.getByRole("button", { name: "Edit" });
  const previewTab = previewTabItem.getByRole("button", { name: "Preview" });
  const initialUrl = page.url();

  await expect(commentEditor).toHaveCount(1);
  await expect(commentEditor).not.toHaveAttribute("data-toggle", "markdown-editor");
  await expect(page.locator('#comment-form [data-toggle="markdown-editor"]')).toHaveCount(0);
  await expect(commentEditor.locator(".nav-tabs > li:nth-child(1) > button")).toHaveText("Edit");
  await expect(commentEditor.locator(".nav-tabs > li:nth-child(2) > button")).toHaveText("Preview");
  await expect(commentEditor.locator(".nav-tabs > li:nth-child(1) > button")).not.toHaveAttribute(
    "data-mode",
  );
  await expect(commentEditor.locator(".nav-tabs > li:nth-child(2) > button")).not.toHaveAttribute(
    "data-mode",
  );
  await expect(
    commentEditor.locator(".nav-tabs > li:nth-child(-n+2) > button[data-mode]"),
  ).toHaveCount(0);
  await expect(page.locator("#comment-form button[data-target]")).toHaveCount(0);
  await expect(editTab).not.toHaveAttribute("data-toggle", "tab");
  await expect(previewTab).not.toHaveAttribute("data-toggle", "tab");
  await expect(page.locator('#comment-form button[data-toggle="tab"]')).toHaveCount(0);
  await expect(editTabItem).toHaveClass(/active/);
  await expect(previewTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#edit-contents")).toHaveClass(/active/);
  await expect(page.locator("#preview-contents")).not.toHaveClass(/active/);
  await expect(page.locator("#comment-form .notification-receiver")).toHaveCount(1);
  await expect(
    page.locator("#comment-form #upload[data-resource-type='ISSUE_COMMENT']"),
  ).toHaveCount(1);
  await expect(page.locator("#comment-form .markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator("#comment-form .markdown-help-wrap > .markdown-help-item")).toHaveCount(
    10,
  );
  const editMetrics = await page.evaluate(() => {
    const tabs = document.querySelector("#comment-form .nav-tabs");
    const edit = document.querySelector("#edit-contents");
    if (!tabs || !edit) return null;
    const tabBox = tabs.getBoundingClientRect();
    const editBox = edit.getBoundingClientRect();
    return {
      editTop: editBox.top,
      editWidth: editBox.width,
      tabBottom: tabBox.bottom,
      tabHeight: tabBox.height,
    };
  });
  expect(editMetrics).not.toBeNull();
  expect(editMetrics!.editTop).toBeGreaterThanOrEqual(editMetrics!.tabBottom);
  expect(editMetrics!.tabHeight).toBeGreaterThan(20);

  await previewTab.click();
  expect(page.url()).toBe(initialUrl);
  await expect(previewTabItem).toHaveClass(/active/);
  await expect(editTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#preview-contents")).toHaveClass(/active/);
  await expect(page.locator("#edit-contents")).not.toHaveClass(/active/);
  const previewMetrics = await page.evaluate(() => {
    const tabs = document.querySelector("#comment-form .nav-tabs");
    const preview = document.querySelector("#preview-contents");
    if (!tabs || !preview) return null;
    const tabBox = tabs.getBoundingClientRect();
    const previewBox = preview.getBoundingClientRect();
    return {
      previewTop: previewBox.top,
      previewWidth: previewBox.width,
      tabBottom: tabBox.bottom,
      tabHeight: tabBox.height,
    };
  });
  expect(previewMetrics).not.toBeNull();
  expect(previewMetrics!.previewTop).toBeGreaterThanOrEqual(previewMetrics!.tabBottom);
  expect(previewMetrics!.previewWidth).toBeCloseTo(editMetrics!.editWidth, 0);
  expect(previewMetrics!.tabHeight).toBeCloseTo(editMetrics!.tabHeight, 0);

  await editTab.click();
  expect(page.url()).toBe(initialUrl);
  await expect(editTabItem).toHaveClass(/active/);
  await expect(previewTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#edit-contents")).toHaveClass(/active/);
  await expect(page.locator("#preview-contents")).not.toHaveClass(/active/);
});

test("project issue detail shows notification receiver on editor focus", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const receiver = page.locator("#comment-form .notification-receiver");
  await expect(receiver).toBeHidden();

  await page.locator("#comment-form .editorSeries").focus();
  await expect(receiver).toBeVisible();
  await expect(receiver).toHaveCSS("display", "block");
  await expect(receiver.locator(".notification-receiver-title")).toHaveText(
    "Notification receivers",
  );
});

test("project issue detail focuses child reply editor after legacy reply click", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const receiver = comment.locator(".child-comment-input-form .notification-receiver");
  await expect(comment.locator(".child-comment-input-form")).toBeHidden();
  await expect(receiver).toBeHidden();

  await comment.hover();
  await expect(comment.locator(".add-a-comment")).toBeVisible();
  await comment.locator(".add-a-comment").click();
  await expect(comment.locator(".child-comment-input-form")).toBeVisible();
  const replyEditor = comment.locator(".child-comment-input-form .editorSeries");
  const expectedReplyPlaceholder = await childReplyPlaceholder(page);
  await expect(replyEditor).toBeFocused();
  await expect(replyEditor).toHaveAttribute("placeholder", expectedReplyPlaceholder);
  await expect(receiver).toBeVisible();
  await expect(receiver).toHaveCSS("display", "block");
  await expect(receiver.locator(".notification-receiver-title")).toHaveText(
    "Notification receivers",
  );
});

test("project issue detail owns the child reply float across desktop and mobile", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const legacyChildComments = readFileSync(
    new URL("../../yona-original/app/views/common/childComments.scala.html", import.meta.url),
    "utf8",
  );
  const legacyBootstrap = readFileSync(
    new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
    "utf8",
  );
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );

  expect(legacyChildComments).toContain(
    '<div class="add-a-comment pull-right">@Messages("comment.oneline.comment.placeholder")</div>',
  );
  expect(legacyBootstrap).toContain(".pull-right {");
  expect(legacyBootstrap).toContain("  float: right;");
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-child-comment-reply"');
  expect(routeSource).toContain("styles.childCommentReply");
  expect(styleSource).toMatch(/childCommentReply:\s*\{\s*float:\s*["']right["']/u);
  expect(routeSource).not.toContain("childAttachment");

  await mockProjectIssueDetail(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const reply = comment.locator(".add-a-comment").first();
  const parentActionRow = comment.locator(":scope > .media-body > .meta-info > .act-row");
  await expect(reply).toHaveCount(1);
  await expect(reply).toHaveText("Reply");
  await expect(reply).toHaveClass(/add-a-comment/);
  await expect(reply).toHaveClass(/pull-right/);
  await expect(reply).toHaveAttribute(
    "data-stylex-owner",
    "project-issue-detail-child-comment-reply",
  );
  expect(await reply.evaluate((element) => element.closest("#comment-77") !== null)).toBe(true);
  await expect(reply).not.toHaveAttribute("style");
  await expect(parentActionRow).not.toHaveAttribute(
    "data-stylex-owner",
    "project-issue-detail-child-comment-reply",
  );

  const readReplyMetrics = () =>
    reply.evaluate((element) => {
      const replyRect = element.getBoundingClientRect();
      const commentRect = element.closest("li.comment")?.getBoundingClientRect();
      if (!commentRect) throw new Error("parent comment target is missing");
      return {
        float: window.getComputedStyle(element).float,
        inlineStyle: element.getAttribute("style"),
        replyLeft: replyRect.left,
        replyRight: replyRect.right,
        commentLeft: commentRect.left,
        commentRight: commentRect.right,
      };
    });
  await comment.hover();
  await expect(reply).toBeVisible();
  const desktopMetrics = await readReplyMetrics();
  expect(desktopMetrics.float).toBe("right");
  expect(desktopMetrics.inlineStyle).toBeNull();
  expect(desktopMetrics.replyRight).toBeLessThanOrEqual(desktopMetrics.commentRight + 1);
  expect(desktopMetrics.replyLeft).toBeGreaterThanOrEqual(desktopMetrics.commentLeft - 1);

  await page.setViewportSize({ height: 844, width: 390 });
  await comment.hover();
  await expect(reply).toBeVisible();
  const mobileMetrics = await readReplyMetrics();
  expect(mobileMetrics.float).toBe("right");
  expect(mobileMetrics.inlineStyle).toBeNull();
  expect(mobileMetrics.replyRight).toBeLessThanOrEqual(mobileMetrics.commentRight + 1);
  expect(mobileMetrics.replyLeft).toBeGreaterThanOrEqual(mobileMetrics.commentLeft - 1);
  await expect(reply).toHaveText("Reply");
});

async function childReplyPlaceholder(page: Page) {
  return page.evaluate(() =>
    navigator.userAgent.toLowerCase().includes("macintosh")
      ? "Reply (⌘ + ENTER)"
      : "Reply (CTRL + ENTER)",
  );
}

test("project issue detail child reply escape hides legacy input form", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const form = comment.locator(".child-comment-input-form");
  await expect(form).toBeHidden();

  await comment.hover();
  await expect(comment.locator(".add-a-comment")).toBeVisible();
  await comment.locator(".add-a-comment").click();
  await expect(form).toBeVisible();
  await comment.locator(".child-comment-input-form .editorSeries").press("Escape");
  await expect(form).toBeHidden();
  await expect(comment.locator(".add-a-comment")).toBeVisible();
});

test("project issue detail toggles legacy comment update form through React-owned edit button", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyComment = readFileSync(
    "../yona-original/app/views/issue/partial_comment.scala.html",
    "utf8",
  );
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const legacyEdit = legacyComment.slice(
    legacyComment.indexOf(
      '<button type="button" class="btn-transparent-with-fontsize-lineheight ml10" data-toggle="comment-edit"',
    ),
    legacyComment.indexOf("</button>", legacyComment.indexOf('data-toggle="comment-edit"')) +
      "</button>".length,
  );
  const legacyDelete = legacyComment.slice(
    legacyComment.indexOf(
      '<button type="button" class="btn-transparent-with-fontsize-lineheight ml6" data-toggle="comment-delete"',
    ),
    legacyComment.indexOf("</button>", legacyComment.indexOf('data-toggle="comment-delete"')) +
      "</button>".length,
  );
  expect(legacyEdit).toContain('class="btn-transparent-with-fontsize-lineheight ml10"');
  expect(legacyDelete).toContain('class="btn-transparent-with-fontsize-lineheight ml6"');
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");
  expect(legacyCommon).toContain(".ml6 { margin-left:6px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  const parentActionEmitter = routeSource.slice(
    routeSource.lastIndexOf(
      "<button",
      routeSource.indexOf('data-stylex-owner="project-issue-detail-comment-action-edit"'),
    ),
    routeSource.indexOf(
      "</button>",
      routeSource.indexOf('data-stylex-owner="project-issue-detail-comment-action-delete"'),
    ) + "</button>".length,
  );
  expect(parentActionEmitter).toContain("styles.commentActionEdit");
  expect(parentActionEmitter).toContain("styles.commentActionDelete");
  expect(parentActionEmitter).toContain(
    'data-stylex-owner="project-issue-detail-comment-action-edit"',
  );
  expect(parentActionEmitter).toContain(
    'data-stylex-owner="project-issue-detail-comment-action-delete"',
  );
  expect(parentActionEmitter).not.toContain("ml10");
  expect(parentActionEmitter).not.toContain("ml6");
  expect(styleSource).toMatch(/commentActionEdit:\s*\{[\s\S]*?marginLeft:\s*["']10px["']/u);
  expect(styleSource).toMatch(/commentActionDelete:\s*\{[\s\S]*?marginLeft:\s*["']6px["']/u);
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const initialUrl = page.url();
  const comment = page.locator(".span-left-pane #comment-77");
  const parentActionRow = comment.locator(":scope > .media-body > .meta-info > .act-row");
  const editButton = parentActionRow.locator('button[title="Edit comment"][data-comment-id="77"]');
  const deleteButton = parentActionRow.locator('button[title="Delete comment"]');
  const cancelButton = comment.locator('.comment-update-form .ybtn-cancel[data-comment-id="77"]');
  const updateForm = comment.locator("#comment-editform-77");
  const updateEditor = updateForm.locator(".mt10:has(#editor-contents-77)");
  const updateEditTabItem = updateEditor.locator(".nav-tabs > li").nth(0);
  const updatePreviewTabItem = updateEditor.locator(".nav-tabs > li").nth(1);
  const updateEditTab = updateEditTabItem.getByRole("button", { name: "Edit" });
  const updatePreviewTab = updatePreviewTabItem.getByRole("button", { name: "Preview" });
  await expect(comment.locator("#comment-editform-77")).toBeHidden();
  await expect(comment.locator("#comment-body-77")).toBeVisible();
  await expect(editButton).toHaveClass(/btn-transparent-with-fontsize-lineheight/);
  await expect(deleteButton).toHaveCount(1);
  await expect(editButton).toHaveAttribute(
    "data-stylex-owner",
    "project-issue-detail-comment-action-edit",
  );
  await expect(deleteButton).toHaveAttribute(
    "data-stylex-owner",
    "project-issue-detail-comment-action-delete",
  );
  await expect(editButton).not.toHaveClass(/\bml10\b/u);
  await expect(deleteButton).not.toHaveClass(/\bml6\b/u);
  await expect(editButton).not.toHaveAttribute("style", /.+/u);
  await expect(deleteButton).not.toHaveAttribute("style", /.+/u);
  await expect(editButton).toHaveCSS("margin-left", "10px");
  await expect(deleteButton).toHaveCSS("margin-left", "6px");
  await expect(
    parentActionRow.locator(
      '[data-stylex-owner="project-issue-detail-comment-action-edit"] ~ [data-stylex-owner="project-issue-detail-comment-action-delete"]',
    ),
  ).toHaveCount(1);
  await expect(editButton).not.toHaveAttribute("data-toggle", "comment-edit");
  await expect(cancelButton).toHaveText("Cancel");
  await expect(updateEditor).toHaveCount(1);
  await expect(updateEditor).not.toHaveAttribute("data-toggle", "markdown-editor");
  await expect(updateForm.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  await expect(updateForm.locator("button[data-target]")).toHaveCount(0);

  await editButton.click();
  await expect(comment.locator("#comment-editform-77")).toBeVisible();
  await expect(comment.locator("#comment-body-77")).toBeHidden();
  await expect(comment.locator(".add-a-comment")).toBeHidden();
  await expect(updateEditor.locator(".nav-tabs > li:nth-child(1) > button")).toHaveText("Edit");
  await expect(updateEditor.locator(".nav-tabs > li:nth-child(2) > button")).toHaveText("Preview");
  await expect(updateEditor.locator(".nav-tabs > li:nth-child(1) > button")).not.toHaveAttribute(
    "data-mode",
  );
  await expect(updateEditor.locator(".nav-tabs > li:nth-child(2) > button")).not.toHaveAttribute(
    "data-mode",
  );
  await expect(
    updateEditor.locator(".nav-tabs > li:nth-child(-n+2) > button[data-mode]"),
  ).toHaveCount(0);
  await expect(updateEditTab).not.toHaveAttribute("data-toggle", "tab");
  await expect(updatePreviewTab).not.toHaveAttribute("data-toggle", "tab");
  await expect(updateEditTabItem).toHaveClass(/active/);
  await expect(updatePreviewTabItem).not.toHaveClass(/active/);
  await expect(updateForm.locator("#edit-77")).toHaveClass(/active/);
  await expect(updateForm.locator("#preview-77")).not.toHaveClass(/active/);
  await expect(updateForm.locator(".notification-receiver")).toHaveCount(1);
  await expect(
    updateForm.locator(".temporaryUploadFiles[name='temporaryUploadFiles']"),
  ).toHaveValue("");
  await expect(updateForm.locator("#upload-77[data-resourcetype='ISSUE_COMMENT']")).toHaveAttribute(
    "data-resourceid",
    "77",
  );
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

  await updatePreviewTab.click();
  expect(page.url()).toBe(initialUrl);
  await expect(updatePreviewTabItem).toHaveClass(/active/);
  await expect(updateEditTabItem).not.toHaveClass(/active/);
  await expect(updateForm.locator("#preview-77")).toHaveClass(/active/);
  await expect(updateForm.locator("#edit-77")).not.toHaveClass(/active/);

  await updateEditTab.click();
  expect(page.url()).toBe(initialUrl);
  await expect(updateEditTabItem).toHaveClass(/active/);
  await expect(updatePreviewTabItem).not.toHaveClass(/active/);
  await expect(updateForm.locator("#edit-77")).toHaveClass(/active/);
  await expect(updateForm.locator("#preview-77")).not.toHaveClass(/active/);

  await editButton.click();
  await expect(comment.locator("#comment-editform-77")).toBeHidden();
  await expect(comment.locator("#comment-body-77")).toBeVisible();

  await editButton.click();
  await expect(comment.locator("#comment-editform-77")).toBeVisible();
  await expect(comment.locator("#comment-body-77")).toBeHidden();

  await cancelButton.click();
  await expect(comment.locator("#comment-editform-77")).toBeHidden();
  await expect(comment.locator("#comment-body-77")).toBeVisible();
  expect(await commentUpdateFormMetrics(page)).toMatchObject({
    bodyDisplay: "block",
    formDisplay: "none",
  });
});

test("project issue detail owns the parent comment action-row float with StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyComment = readFileSync(
    "../yona-original/app/views/issue/partial_comment.scala.html",
    "utf8",
  );
  const legacyBootstrap = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  expect(legacyComment).toContain('<span class="act-row pull-right">');
  expect(legacyBootstrap).toContain(".pull-right {\n  float: right;\n}");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(routeSource).toContain("styles.commentActionRow");
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-comment-action-row"');
  expect(styleSource).toMatch(/commentActionRow:\s*\{[\s\S]*?float:\s*["']right["']/u);
  expect(styleSource).not.toContain("pull-right");

  await mockProjectIssueDetail(page);
  const issueUrl = `${basePath}/admin/sample/issue/11`;
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(issueUrl);

  const comment = page.locator(".span-left-pane #comment-77");
  const parentActionRow = comment.locator(":scope > .media-body > .meta-info > .act-row");
  const childActionRows = comment.locator(":scope .child-comments .act-row");
  await expect(parentActionRow).toHaveCount(1);
  await expect(parentActionRow).toHaveAttribute(
    "data-stylex-owner",
    "project-issue-detail-comment-action-row",
  );
  await expect(parentActionRow).toHaveClass(/(?:^|\s)act-row(?:\s|$)/u);
  await expect(parentActionRow).toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
  await expect(parentActionRow).toHaveCSS("float", "right");
  await expect(parentActionRow).not.toHaveAttribute("style", /.+/u);
  await expect(childActionRows).toHaveCount(0);

  const order = await parentActionRow
    .locator(":scope > *")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.className || node.getAttribute("title") || node.tagName),
    );
  expect(order[0]).toBe("new-issue-by");
  expect(order[1]).toContain("btn-transparent-with-fontsize-lineheight");
  await expect(
    parentActionRow.locator('[data-stylex-owner="project-issue-detail-comment-action-edit"]'),
  ).toHaveCount(1);
  await expect(
    parentActionRow.locator('[data-stylex-owner="project-issue-detail-comment-action-delete"]'),
  ).toHaveCount(1);
  await expect(parentActionRow.locator("button[title='Edit comment']")).toBeVisible();
  await expect(parentActionRow.locator("button[title='Delete comment']")).toBeVisible();

  const desktopGeometry = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>(
      "#comment-77 > .media-body > .meta-info > .act-row",
    );
    const meta = row?.parentElement;
    if (!row || !meta) return null;
    const rowBox = row.getBoundingClientRect();
    const metaBox = meta.getBoundingClientRect();
    return {
      row: {
        bottom: rowBox.bottom,
        left: rowBox.left,
        right: rowBox.right,
        top: rowBox.top,
      },
      meta: {
        bottom: metaBox.bottom,
        left: metaBox.left,
        right: metaBox.right,
        top: metaBox.top,
      },
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(desktopGeometry).not.toBeNull();
  expect(desktopGeometry!.row.left).toBeGreaterThanOrEqual(desktopGeometry!.meta.left);
  expect(desktopGeometry!.row.right).toBeLessThanOrEqual(desktopGeometry!.meta.right);
  expect(desktopGeometry!.row.top).toBeGreaterThanOrEqual(desktopGeometry!.meta.top);
  expect(desktopGeometry!.row.bottom).toBeLessThanOrEqual(desktopGeometry!.meta.bottom);
  expect(desktopGeometry!.row.right).toBeLessThanOrEqual(desktopGeometry!.viewportWidth);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(issueUrl);
  const mobileComment = page.locator(".span-left-pane #comment-77");
  const mobileActionRow = mobileComment.locator(":scope > .media-body > .meta-info > .act-row");
  await expect(mobileActionRow).toHaveCount(1);
  await expect(mobileActionRow).toHaveCSS("float", "right");
  await expect(mobileActionRow).not.toHaveAttribute("style", /.+/u);
  const mobileGeometry = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>(
      "#comment-77 > .media-body > .meta-info > .act-row",
    );
    const meta = row?.parentElement;
    if (!row || !meta) return null;
    const rowBox = row.getBoundingClientRect();
    const metaBox = meta.getBoundingClientRect();
    return {
      row: {
        bottom: rowBox.bottom,
        left: rowBox.left,
        right: rowBox.right,
        top: rowBox.top,
      },
      meta: {
        bottom: metaBox.bottom,
        left: metaBox.left,
        right: metaBox.right,
        top: metaBox.top,
      },
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(mobileGeometry).not.toBeNull();
  expect(mobileGeometry!.row.left).toBeGreaterThanOrEqual(mobileGeometry!.meta.left);
  expect(mobileGeometry!.row.right).toBeLessThanOrEqual(mobileGeometry!.meta.right);
  expect(mobileGeometry!.row.top).toBeGreaterThanOrEqual(mobileGeometry!.meta.top);
  expect(mobileGeometry!.row.bottom).toBeLessThanOrEqual(mobileGeometry!.meta.bottom);
  expect(mobileGeometry!.row.right).toBeLessThanOrEqual(mobileGeometry!.viewportWidth);
  await page.setViewportSize({ width: 1366, height: 900 });
});

test("project issue detail matches authored comment edit branch from legacy partial_comment/commentUpdateForm", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Site Admin",
        authorLoginId: "admin",
        childComments: [],
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
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  expect(await comment.getAttribute("class")).toContain("author");

  await comment
    .locator(":scope > .media-body > .meta-info > .act-row")
    .locator('button[title="Edit comment"][data-comment-id="77"]')
    .click();

  const updateForm = comment.locator("#comment-editform-77");
  const notification = updateForm.locator(".send-notification-check");
  await expect(updateForm).toBeVisible();
  await expect(comment.locator("#comment-body-77")).toBeHidden();
  await expect(notification).toBeVisible();
  await expect(notification).not.toHaveAttribute("data-toggle", "popover");
  await expect(notification).not.toHaveAttribute("data-trigger", "hover");
  await expect(notification).not.toHaveAttribute("data-placement", "top");
  await expect(notification).not.toHaveAttribute("data-content", /./u);
  await expect(notification.locator("input[name='notificationMail']")).toBeChecked();
  await expect(notification.locator("strong")).toHaveText("Send notification mail");
  await expect(updateForm.locator("button[type='submit']")).toHaveText("Save");
  await expect(updateForm.locator(".ybtn-cancel[data-comment-id='77']")).toHaveText("Cancel");
});

test("project issue detail keeps React-owned comment edit button for readable comments", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        childComments: [],
        contentsHtml: "<p>Server HTML should not render</p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanRead: true,
        viewerCanUpdate: false,
        viaEmail: false,
        voterCount: 0,
        voters: [],
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const editButton = comment
    .locator(":scope > .media-body > .meta-info > .act-row")
    .locator('button[title="Edit comment"][data-comment-id="77"]');
  await expect(editButton).toHaveCount(1);
  await expect(editButton).toHaveClass(/btn-transparent-with-fontsize-lineheight/);
  await expect(editButton).not.toHaveClass(/\bml10\b/u);
  await expect(editButton).toHaveAttribute(
    "data-stylex-owner",
    "project-issue-detail-comment-action-edit",
  );
  await expect(editButton).toHaveCSS("margin-left", "10px");
  await expect(editButton).toHaveAttribute("title", "Edit comment");
  await expect(editButton).not.toHaveAttribute("data-toggle", "comment-edit");
  await expect(editButton.locator("i.yobicon-edit-2")).toHaveCount(1);

  await editButton.click();
  await expect(comment.locator("#comment-editform-77")).toBeVisible();
  await expect(comment.locator("#comment-editform-77 button[type='submit']")).toHaveCount(0);
});

test("project issue detail preserves legacy child comment anchor divs", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const comment = page.locator(".span-left-pane #comment-77");
  const childAnchor = comment.locator(":scope > #comment-78");
  await expect(childAnchor).toHaveCount(1);
  await expect(comment.locator(".one-line-comment #comment-78")).toHaveCount(0);
  await expect(
    comment.locator(
      `.subcomment-author a[href="${basePath}/admin/sample/issue/11#comment-78"].ago`,
    ),
  ).toHaveText("Jul 2, 2026");

  expect(await childCommentAnchorMetrics(page)).toEqual({
    anchorHeight: 0,
    anchorNextClass: "comment-avatar",
    childHref: `${basePath}/admin/sample/issue/11#comment-78`,
    inlineChildAnchorCount: 0,
  });
});

test("project issue detail does not duplicate child replies from the flat comment payload", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const childReply = {
    authorLabel: "QA One",
    authorLoginId: "qa1",
    contentsHtml: "<p>Child reply</p>",
    contentsMarkdown: "Child **reply**",
    createdLabel: "Jul 2, 2026",
    id: 78,
    parentCommentId: 77,
    viewerCanDelete: true,
  };
  const parentComment = {
    attachments: [],
    authorAvatarUrl: "/assets/images/default-avatar-32.png",
    authorLabel: "Dev Member",
    authorLoginId: "dev",
    childComments: [childReply],
    contentsHtml: "<p>Comment markdown</p>",
    contentsMarkdown: "Comment **markdown**",
    createdLabel: "Jul 2, 2026",
    id: 77,
    viewerCanDelete: true,
    viewerCanUpdate: true,
    viaEmail: false,
    voterCount: 0,
    voters: [],
  };

  await mockProjectIssueDetail(page, {
    commentCount: 1,
    comments: [parentComment, childReply],
    timeline: [
      { comment: parentComment, id: 77, kind: "comment" },
      { comment: childReply, id: 78, kind: "comment" },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const leftComments = page.locator(
    ".span-left-pane #comments .timeline-list > ul.comments > li.comment",
  );
  const rightComments = page.locator(
    ".span-right-pane #comments .timeline-list > ul.comments > li.comment.index-comment",
  );
  await expect(leftComments).toHaveCount(1);
  await expect(rightComments).toHaveCount(1);
  await expect(page.locator(".span-left-pane #comments .comment-header .num")).toHaveText("1");
  await expect(page.locator(".span-right-pane #comments .comment-header .num")).toHaveText("1");
  await expect(
    page.locator(".span-left-pane #comments .timeline-list > ul.comments > li#comment-78"),
  ).toHaveCount(0);
  await expect(
    page.locator(".span-right-pane #comments .timeline-list > ul.comments > li#comment-78"),
  ).toHaveCount(0);
  await expect(page.locator(".span-left-pane #comment-77 > #comment-78")).toHaveCount(1);
  await expect(
    page.locator(".span-left-pane #comment-77 .child-comments .one-line-comment"),
  ).toHaveCount(1);
  await expect(
    page.locator(
      `.span-left-pane #comment-77 .subcomment-author a[href="${basePath}/admin/sample/issue/11#comment-78"].ago`,
    ),
  ).toHaveCount(1);
});

test("project issue detail renders legacy index comment mention and child count state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
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
            contentsHtml: "<p>Child mention</p>",
            contentsMarkdown: "Child @admin note",
            createdLabel: "Jul 2, 2026",
            id: 78,
            viewerCanDelete: true,
          },
          {
            authorLabel: "QA Two",
            authorLoginId: "qa2",
            contentsHtml: "<p>Second child</p>",
            contentsMarkdown: "Second child",
            createdLabel: "Jul 2, 2026",
            id: 79,
            viewerCanDelete: true,
          },
        ],
        contentsHtml: "<p>Ping @admin please</p>",
        contentsMarkdown: "Ping @admin please",
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
  await expect(page.locator(".span-left-pane #comment-77")).toHaveClass("comment mentioned");
  const indexComment = page.locator(".span-right-pane #comment-77.index-comment");
  await expect(indexComment).toHaveClass("comment index-comment mentioned mentionedInChild");
  expect(await canonicalize(page, ".span-right-pane #comment-77 .comment-exists")).toEqual(
    await canonicalizeHtml(
      page,
      `<span class="comment-exists"><i class="yobicon-comment2"></i>2</span>`,
    ),
  );
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
  expect(await canonicalize(page, ".span-right-pane #comments")).toEqual(
    await canonicalizeHtml(
      page,
      `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><strong>Comment</strong> <strong class="num">0</strong></div></div></div></div>`,
    ),
  );
});

test("project issue detail hides watch button when legacy WATCH is not allowed", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanWatch: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".board-actrow #watch-button")).toHaveCount(0);
  await expect(page.locator(".board-actrow #issue-share-button")).toHaveCount(1);
  await expect(page.locator(".board-actrow .issue-weight")).toHaveCount(1);
});

test("project issue detail watch button posts and toggles legacy watching state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { watchRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const watchButton = page.locator(".board-actrow #watch-button");
  await expect(watchButton).toHaveText("Subscribe");
  await expect(watchButton).toHaveAttribute("data-watching", "false");
  await expect(watchButton).not.toHaveClass(/ybtn-watching/);

  const watchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/watch") &&
      response.request().method() === "POST",
  );
  await watchButton.click();
  await watchResponsePromise;

  expect(watchRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(watchButton).toHaveText("Unsubscribe from this issue");
  await expect(watchButton).toHaveAttribute("data-watching", "true");
  await expect(watchButton).toHaveClass(/ybtn-watching/);
});

test("project issue detail reveals legacy sharer list from share button", async ({ page }) => {
  await mockProjectIssueDetail(page);

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);
  await page.locator("#issue-share-button").click();

  const sharerList = page.locator(".span-left-pane > .sharer-list");
  const title = sharerList.locator(":scope > dt");
  const content = sharerList.locator(":scope > #sharer-list");
  await expect(sharerList).toHaveClass(/sharer-list/);
  await expect(sharerList).toHaveClass(/hideFromDisplayOnly/);
  await expect(sharerList).toHaveClass(/sharer-list-border/);
  await expect(sharerList).toHaveCSS("display", "block");
  await expect(title).toHaveClass(/issue-share-title/);
  await expect(title).not.toHaveClass(/(?:^|\s)mb10(?:\s|$)/u);
  await expect(title).toHaveText("Issue Sharer");
  await expect(title.locator(".issue-sharer-count")).toHaveText("");
  await expect(content).toHaveAttribute("id", "sharer-list");
  await expect(content).toHaveCSS("display", "block");
  await expect(content.locator("#issueSharer")).toHaveAttribute("type", "hidden");
  await expect(content.locator("#issueSharer")).toHaveAttribute("class", "bigdrop width100p");
  await expect(content.locator("#issueSharer")).toHaveAttribute("name", "issueSharer");
  await expect(content.locator("#issueSharer")).toHaveAttribute(
    "placeholder",
    "Select Issue Sharer",
  );
  await expect(content.locator("#issueSharer")).toHaveValue("");
});

test("project issue detail owns sharer title spacing with route StyleX", async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(legacyView).toContain('<dt class="issue-share-title mb10">');
  expect(legacyCommon).toContain(".mb10 { margin-bottom:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(routeSource).toContain('import { styles } from "./-issue-detail.stylex";');
  expect(routeSource).toContain("styles.sharerTitle");
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-sharer-title"');
  expect(routeSource).not.toContain('className="issue-share-title mb10"');
  expect(styleSource).toMatch(/sharerTitle:\s*\{\s*marginBottom:\s*["']10px["']\s*\}/u);

  await mockProjectIssueDetail(page, { sharers: [] });
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const title = page.locator('[data-stylex-owner="project-issue-detail-sharer-title"]');
  const list = page.locator(".span-left-pane > .sharer-list");
  const shareButton = page.locator("#issue-share-button");
  await expect(title).toHaveCount(1);
  await expect(title).not.toHaveAttribute("style", /.+/u);
  await expect(title).toHaveCSS("margin-bottom", "10px");
  await shareButton.click();
  await expect(title).toBeVisible();
  await expect(list).toHaveClass(/sharer-list-border/);
  await expect(list.locator("#sharer-list")).toHaveCSS("display", "block");
  await expect(title).toHaveText("Issue Sharer");
  await expect(title.locator(".issue-sharer-count")).toHaveText("");
});

test("project issue detail hidden sharer and assignee inputs omit empty title residue", async ({
  page,
}) => {
  await mockProjectIssueDetail(page);

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);
  await page.locator("#issue-share-button").click();

  const issueSharer = page.locator("#issueSharer");
  await expect(issueSharer).toHaveAttribute("type", "hidden");
  await expect(issueSharer).toHaveAttribute("class", "bigdrop width100p");
  await expect(issueSharer).toHaveAttribute("name", "issueSharer");
  await expect(issueSharer).toHaveAttribute("placeholder", "Select Issue Sharer");
  await expect(issueSharer).toHaveValue("");
  await expect(issueSharer).not.toHaveAttribute("title", "");

  const assignee = page.locator("#assignee");
  await expect(assignee).toHaveAttribute("type", "hidden");
  await expect(assignee).toHaveAttribute("class", "bigdrop");
  await expect(assignee).toHaveAttribute("name", "assigneeLoginId");
  await expect(assignee).toHaveAttribute("placeholder", "No assignee");
  await expect(assignee).toHaveAttribute("style", "width: 100%;");
  await expect(assignee).toHaveValue("admin");
  await expect(assignee).not.toHaveAttribute("title", "");

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  expect(routeSource).toContain('id="issueSharer"');
  expect(routeSource).toContain('id="assignee"');
  const issueSharerSource = routeSource.slice(
    routeSource.indexOf('id="issueSharer"') - 180,
    routeSource.indexOf('id="issueSharer"') + 220,
  );
  const assigneeSource = routeSource.slice(
    routeSource.indexOf('id="assignee"') - 180,
    routeSource.indexOf('id="assignee"') + 220,
  );
  expect(issueSharerSource).not.toContain('title=""');
  expect(assigneeSource).not.toContain('title=""');
});

test("project issue detail renders React-owned top hover popovers for issue action markers", async ({
  page,
}) => {
  await mockProjectIssueDetail(page, { canBeDeleted: false, viewerCanDelete: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  await expectLegacyTopHoverPopover(
    page,
    "#issue-share-button",
    "You can share this issue with a user or all members of a project. If this project is private, then shared users can only access this issue and its subtasks.",
  );
  await expectLegacyTopHoverPopover(
    page,
    ".weight-number",
    "Higher weight issues will be shown first in the list",
  );
  await expectLegacyTopHoverPopover(
    page,
    ".span-left-pane > .board-actrow .act-row > button.disabled",
    "Can't be deleted because of other users' comments",
  );
});

test("project issue detail renders React-owned top hover popover for notification mail warning", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Site Admin",
        authorLoginId: "admin",
        childComments: [],
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
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page
    .locator("#comment-77 > .media-body > .meta-info > .act-row")
    .locator('button[title="Edit comment"][data-comment-id="77"]')
    .click();

  await expectLegacyTopHoverPopover(
    page,
    "#comment-editform-77 .send-notification-check",
    "If you are not the original author, this option will be ignored. Notification mail will be sent.",
  );
});

test("project issue detail renders legacy translation button when translation API is configured", async ({
  page,
}) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const legacyTranslation = legacyView.slice(
    legacyView.indexOf('<button type="button" id="translate"'),
    legacyView.indexOf("</button>", legacyView.indexOf('id="translate"')) + "</button>".length,
  );
  expect(legacyTranslation).toContain('class="icon btn-transparent-with-fontsize-lineheight ml10"');
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  const translationEmitter = routeSource.slice(
    routeSource.indexOf('id="translate"'),
    routeSource.indexOf("</button>", routeSource.indexOf('id="translate"')) + "</button>".length,
  );
  expect(routeSource).toContain('import { styles } from "./-issue-detail.stylex";');
  expect(translationEmitter).toContain("styles.issueTranslationButton");
  expect(translationEmitter).toContain(
    'data-stylex-owner="project-issue-detail-translation-button"',
  );
  expect(translationEmitter).not.toContain("ml10");
  expect(styleSource).toMatch(/issueTranslationButton:\s*\{[\s\S]*?marginLeft:\s*["']10px["']/u);

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const translationRequests: Array<{
    body: unknown;
    csrfToken: string | null;
    method: string;
  }> = [];
  await page.route("**/-_-api/v1/translation", async (route) => {
    translationRequests.push({
      body: JSON.parse(route.request().postData() ?? "{}") as unknown,
      csrfToken: route.request().headers()["x-csrf-token"] ?? null,
      method: route.request().method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        translated: "<p>Translated <strong>issue</strong></p>",
        translatedMarkdown: "Translated **issue**",
      }),
    });
  });
  await mockProjectIssueDetail(page, { translationApiEnabled: true });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const translateButton = page.locator(".board-actrow > #translate");
  await expect(translateButton).toHaveClass(/(?:^|\s)icon(?:\s|$)/u);
  await expect(translateButton).toHaveClass(
    /(?:^|\s)btn-transparent-with-fontsize-lineheight(?:\s|$)/u,
  );
  await expect(translateButton).not.toHaveClass(/\bml10\b/u);
  await expect(translateButton).not.toHaveAttribute("style", /.+/u);
  await expect(translateButton).toHaveCSS("margin-left", "10px");
  await expect(translateButton).toBeVisible();
  await expect(translateButton).not.toBeDisabled();
  await expect(translateButton).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(translateButton).toHaveAttribute("title", "Translation");
  await expect(translateButton.locator("i.yobicon-lang")).toHaveCount(1);

  await translateButton.click();

  await expect(page.locator("#issue-body-11 .markdown-wrap")).toContainText("Translated issue");
  await expect(page.locator("#issue-body-11 .markdown-wrap strong")).toHaveText("issue");
  await expect(translateButton).toBeDisabled();
  expect(translationRequests[0]?.csrfToken).toBeTruthy();
  expect(translationRequests).toEqual([
    {
      body: {
        number: 11,
        owner: "admin",
        projectName: "sample",
        type: "issue",
      },
      csrfToken: translationRequests[0]?.csrfToken,
      method: "POST",
    },
  ]);
});

test("project issue detail renders legacy comment translation button when translation API is configured", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyComment = readFileSync(
    "../yona-original/app/views/issue/partial_comment.scala.html",
    "utf8",
  );
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const legacyEmitter = legacyComment.slice(
    legacyComment.indexOf(
      '<button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 comment-translate"',
    ),
    legacyComment.indexOf("</button>", legacyComment.indexOf("comment-translate")) +
      "</button>".length,
  );
  const routeEmitter = routeSource.slice(
    routeSource.lastIndexOf(
      "<button",
      routeSource.indexOf('data-stylex-owner="project-issue-detail-comment-translation-button"'),
    ),
    routeSource.indexOf("</button>", routeSource.indexOf("comment-translate")) + "</button>".length,
  );
  expect(legacyEmitter).toContain(
    'class="icon btn-transparent-with-fontsize-lineheight ml10 comment-translate"',
  );
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(routeEmitter).toContain("styles.commentTranslationButton");
  expect(routeEmitter).toContain(
    'data-stylex-owner="project-issue-detail-comment-translation-button"',
  );
  expect(routeEmitter).not.toContain("ml10");
  expect(styleSource).toMatch(/commentTranslationButton:\s*\{[\s\S]*?marginLeft:\s*["']10px["']/u);
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-translation-button"');
  expect(routeSource).toContain('title="Edit comment"');
  expect(routeSource).toContain('title="Delete comment"');
  const translationRequests: Array<{
    body: unknown;
    csrfToken: string | null;
    method: string;
  }> = [];
  await page.route("**/-_-api/v1/translation", async (route) => {
    translationRequests.push({
      body: JSON.parse(route.request().postData() ?? "{}") as unknown,
      csrfToken: route.request().headers()["x-csrf-token"] ?? null,
      method: route.request().method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        translated: "<p>Translated <strong>comment</strong></p>",
        translatedMarkdown: "Translated **comment**",
      }),
    });
  });
  await mockProjectIssueDetail(page, { translationApiEnabled: true });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const translateButton = page.locator("#comment-77 .comment-translate");
  await expect(translateButton).toHaveAttribute(
    "data-stylex-owner",
    "project-issue-detail-comment-translation-button",
  );
  await expect(translateButton).toHaveClass(/(?:^|\s)icon(?:\s|$)/u);
  await expect(translateButton).toHaveClass(
    /(?:^|\s)btn-transparent-with-fontsize-lineheight(?:\s|$)/u,
  );
  await expect(translateButton).not.toHaveClass(/(?:^|\s)ml10(?:\s|$)/u);
  await expect(translateButton).toHaveCSS("margin-left", "10px");
  await expect(translateButton).not.toHaveAttribute("style", /.+/u);
  await expect(translateButton).toBeVisible();
  await expect(translateButton).not.toBeDisabled();
  await expect(translateButton).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(translateButton).toHaveAttribute("data-comment-id", "77");
  await expect(translateButton).toHaveAttribute("title", "Translation");
  await expect(translateButton.locator("i.yobicon-lang")).toHaveCount(1);
  await expect(page.locator(".board-actrow > #translate")).toHaveAttribute(
    "data-stylex-owner",
    "project-issue-detail-translation-button",
  );
  await expect(
    page.locator(
      '#comment-77 > .media-body > .meta-info > .act-row [data-stylex-owner="project-issue-detail-comment-action-edit"]',
    ),
  ).toHaveCSS("margin-left", "10px");
  await expect(
    page.locator(
      '#comment-77 > .media-body > .meta-info > .act-row [data-stylex-owner="project-issue-detail-comment-action-delete"]',
    ),
  ).toHaveCSS("margin-left", "6px");

  await translateButton.click();

  await expect(page.locator("#issue-body-11 .markdown-wrap")).toContainText("Body markdown");
  await expect(page.locator(".span-left-pane #comment-body-77 .comment-body")).toContainText(
    "Translated comment",
  );
  await expect(page.locator(".span-left-pane #comment-body-77 .comment-body strong")).toHaveText(
    "comment",
  );
  await expect(translateButton).toBeDisabled();
  expect(translationRequests[0]?.csrfToken).toBeTruthy();
  expect(translationRequests).toEqual([
    {
      body: {
        number: 77,
        owner: "admin",
        projectName: "sample",
        type: "issue-comment",
      },
      csrfToken: translationRequests[0]?.csrfToken,
      method: "POST",
    },
  ]);
});

test("project issue detail renders legacy read-only selected labels", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#labelIds")).toHaveCount(0);
  await expect(page.locator(".issue-info .label.issue-label.active.static")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?state=open&labelIds=8`,
  );

  const expected =
    `<dl><dt>Label</dt><dd><a href="__BASE_PATH__/admin/sample/issues?state=open&labelIds=8" class="label issue-label active static" style="background:rgb(81, 170, 204)">bug</a></dd></dl>`.replaceAll(
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

test("project issue detail renders legacy updateable milestone select", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator("#milestone")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#milestone")).toHaveAttribute("data-format", "milestone");
  await expect(page.locator("#milestone")).toHaveAttribute("data-container-css-class", "fullsize");
  const expectedMilestone =
    '<dd><select id="milestone" name="milestone.id" data-format="milestone" data-container-css-class="fullsize"><option value="-1">No milestone</option><optgroup label="Open"><option value="5" data-state="open" selected="">v1.0</option><option value="9" data-state="open">v2.0</option></optgroup><optgroup label="Closed"><option value="7" data-state="closed">v0.9</option></optgroup></select></dd>';
  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Milestone')) > dd")).toEqual(
    await canonicalizeHtml(page, expectedMilestone),
  );

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const milestoneSelectSource = routeSource.slice(
    routeSource.indexOf("function IssueMilestoneSelect"),
    routeSource.indexOf("function IssueLabelSelect"),
  );
  expect(milestoneSelectSource).not.toContain('data-toggle="select2"');
});

test("project issue detail renders legacy updateable labels without manager edit link", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __projectOverrides: { viewerCanUpdate: false },
    viewerCanUpdate: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".issue-info form dl:has(#labelIds) .label-edit")).toHaveCount(0);
  await expect(page.locator("#labelIds")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#labelIds")).not.toHaveAttribute("data-search", /.+/);
  await expect(page.locator("#labelIds")).toHaveAttribute("data-format", "issuelabel");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-allow-clear", "true");
  await expect(page.locator("#labelIds")).toHaveAttribute(
    "data-dropdown-css-class",
    "issue-labels",
  );
  await expect(page.locator("#labelIds")).toHaveAttribute(
    "data-container-css-class",
    "issue-labels bordered fullsize",
  );
  await expect(page.locator("#labelIds")).toHaveAttribute("data-placeholder", "Select label");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-close-on-select", "false");
  const expectedLabels =
    '<dl><dt>Label</dt><dd><select id="labelIds" name="labelIds" multiple="" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false" selected="">bug</option><option value="9" data-category-id="3" data-category-is-exclusive="false">enhancement</option></optgroup></select></dd></dl>';
  expect(await canonicalize(page, ".issue-info form dl:has(#labelIds)")).toEqual(
    await canonicalizeHtml(page, expectedLabels),
  );

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const labelSelectSource = routeSource.slice(
    routeSource.indexOf("function IssueLabelSelect"),
    routeSource.indexOf("function IssueSelectedLabels"),
  );
  expect(labelSelectSource).not.toContain('data-toggle="select2"');
  expect(labelSelectSource).not.toContain('data-search="labelIds"');
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
  await expect(
    page.locator(".issue-info form dl:has(dt:text('Milestone')) > dd a"),
  ).toHaveAttribute("href", `${basePath}/admin/sample/milestone/5`);

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

test("project issue detail updates due date without legacy calendar data hook", async ({
  page,
}) => {
  const { massUpdateRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const dueDateInput = page.locator('.span-right-pane input[name="dueDate"]');
  const dueDateButton = page.locator(".span-right-pane .search.search-bar .btn-calendar");
  await expect(dueDateInput).toHaveClass("textbox full");
  await expect(dueDateInput).toHaveValue("Jul 5, 2026");
  await expect(dueDateInput).not.toHaveAttribute("data-toggle", "calendar");
  await expect(dueDateButton).toBeVisible();
  expect(await dueDateInlineUpdateMetrics(page)).toEqual({
    buttonInsideDueDateRow: true,
    inputInsideDueDateRow: true,
    inputName: "dueDate",
    searchBarInsideRightPane: true,
    searchBarClassName: "search search-bar",
  });

  await dueDateButton.click();
  await expect(dueDateInput).toBeFocused();
  expect(massUpdateRequests).toHaveLength(0);

  await dueDateInput.blur();
  expect(massUpdateRequests).toHaveLength(0);

  await dueDateInput.fill("Jul 12, 2026");
  await expect.poll(() => massUpdateRequests.length, { timeout: 250 }).toBe(0);
  await dueDateInput.blur();
  await expect
    .poll(() =>
      massUpdateRequests.map((request) => ({
        body: request.body,
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([
      {
        body: {
          addLabelIds: [],
          assigneeLoginId: "",
          assigneeUpdate: false,
          delete: false,
          dueDate: "Jul 12, 2026",
          isDueDateChanged: true,
          issueNumbers: [11],
          milestoneUpdate: false,
          removeLabelIds: [],
          state: "",
        },
        hasCsrfToken: true,
        method: "POST",
      },
    ]);

  await dueDateInput.focus();
  await dueDateInput.blur();
  await expect.poll(() => massUpdateRequests.length, { timeout: 250 }).toBe(1);

  await dueDateInput.fill("");
  await expect.poll(() => massUpdateRequests.length, { timeout: 250 }).toBe(1);
  await dueDateInput.blur();
  await expect
    .poll(() => massUpdateRequests.map((request) => request.body))
    .toEqual([
      {
        addLabelIds: [],
        assigneeLoginId: "",
        assigneeUpdate: false,
        delete: false,
        dueDate: "Jul 12, 2026",
        isDueDateChanged: true,
        issueNumbers: [11],
        milestoneUpdate: false,
        removeLabelIds: [],
        state: "",
      },
      {
        addLabelIds: [],
        assigneeLoginId: "",
        assigneeUpdate: false,
        delete: false,
        dueDate: "",
        isDueDateChanged: true,
        issueNumbers: [11],
        milestoneUpdate: false,
        removeLabelIds: [],
        state: "",
      },
    ]);

  await dueDateInput.fill("not a date");
  await dueDateInput.blur();
  await expect(dueDateInput).toBeFocused();
  await expect.poll(() => massUpdateRequests.length, { timeout: 250 }).toBe(2);
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

  const sharerList = page.locator(".span-left-pane > .sharer-list");
  const title = sharerList.locator(":scope > dt");
  const content = sharerList.locator(":scope > #sharer-list");
  await expect(sharerList).toHaveClass(/sharer-list/);
  await expect(title).toHaveClass(/issue-share-title/);
  await expect(title).not.toHaveClass(/(?:^|\s)mb10(?:\s|$)/u);
  await expect(title).toHaveText("Issue Sharer 2");
  await expect(title.locator(".issue-sharer-count")).toHaveText("2");
  await expect(content).toBeVisible();
  await expect(content.locator(".sharer-item .name")).toHaveText(["QA One", "QA Two"]);
  const expectedSharerHrefs = [`${basePath}/qa1`, `${basePath}/qa2`];
  for (const [index, link] of (await content.locator(".sharer-item a").all()).entries()) {
    await expect(link).toHaveAttribute("href", expectedSharerHrefs[index]);
  }
});

test("project issue detail renders legacy read-only action buttons", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<span class="act-row"><a href="__BASE_PATH__/admin/sample/issue/11/editform"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" title="See text"><i class="yobicon-edit-2"></i></button></a><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="modal" data-target="#deleteConfirm" title="Delete"><i class="yobicon-trash"></i></button></span>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > .board-actrow > .act-row")).toEqual(
    await canonicalizeHtml(page, expected),
  );

  const expectedRight =
    `<div class="act-row right-menu-icons"><a href="__BASE_PATH__/admin/sample/issue/11/editform"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" title="See text"><i class="yobicon-edit-2"></i></button></a><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="modal" data-target="#deleteConfirm" title="Delete"><i class="yobicon-trash"></i></button></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".issue-info .act-row.right-menu-icons")).toEqual(
    await canonicalizeHtml(page, expectedRight),
  );
});

test("project issue detail edit buttons navigate to legacy edit form route", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.locator('.span-left-pane > .board-actrow button[title="Edit"]').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11/editform`);
  await expect(page.locator("#issue-form")).toBeVisible();

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.locator('.issue-info .right-menu-icons button[title="Edit"]').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11/editform`);
  await expect(page.locator("#issue-form")).toBeVisible();
});

test("project issue detail deletes through legacy confirmation modal", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { deleteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator('a[href="#deleteConfirm"][data-toggle="modal"]')).toHaveCount(0);
  await expect(
    page.locator(
      '[data-toggle="modal"][data-target="#deleteConfirm"], #deleteConfirm [data-dismiss="modal"]',
    ),
  ).toHaveCount(0);
  const trigger = page.locator('button[type="button"][title="Delete"]:has(i.yobicon-trash)');
  await expect(trigger.first().locator("i.yobicon-trash")).toHaveCount(1);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "delete-issue-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.first().click();
  await expect(page.locator("#deleteConfirm")).not.toHaveClass(/hide/);
  await expect(page.locator("#deleteConfirm")).toHaveClass("modal fade in");
  await expect(page.locator("#deleteConfirm .modal-header h3")).toHaveText("Delete issue");
  await expect(page.locator("#deleteConfirm .modal-body p")).toHaveText(
    "Once you delete the post, you won't be able to recover it. Do you still want to delete this post?",
  );
  await expect(page.locator("#deleteConfirm .modal-footer .ybtn-danger")).toHaveText("Yes");
  await expect(page.locator("#deleteConfirm .modal-footer .ybtn").last()).toHaveText("No");
  await expect(page.locator("#deleteConfirm .ybtn-danger")).not.toHaveAttribute(
    "data-request-uri",
    /.+/,
  );
  await expect(page.locator("#deleteConfirm .ybtn-danger")).not.toHaveAttribute(
    "data-request-method",
    /.+/,
  );
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("delete-issue-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(deleteRequests).toEqual([]);

  await page.locator('#deleteConfirm .modal-footer button:has-text("No")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("delete-issue-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(deleteRequests).toEqual([]);

  await trigger.first().click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(deleteRequests).toEqual([]);

  await trigger.first().click();
  await page.locator(".modal-backdrop.fade.in").dispatchEvent("click");
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(deleteRequests).toEqual([]);

  await trigger.first().click();
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
  await expect(page.locator('#comment-delete-modal [data-dismiss="modal"]')).toHaveCount(0);

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "comment-delete-modal";
  });
  await armRootModalBridgeTrap(page);
  const commentDeleteButton = page.locator(
    '#comment-77 > .media-body > .meta-info > .act-row [data-stylex-owner="project-issue-detail-comment-action-delete"]',
  );
  await expect(commentDeleteButton).not.toHaveAttribute("data-toggle", "comment-delete");
  await commentDeleteButton.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-modal .modal-header h3")).toHaveText("Delete comment");
  await expect(page.locator("#comment-delete-modal .modal-body p")).toHaveText(
    "Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?",
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-uri",
    /.+/,
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-method",
    /.+/,
  );
  expect(await commentDeleteModalMetrics(page)).toEqual({
    backdropDisplay: "block",
    bodyDisplay: "block",
    confirmMethod: null,
    confirmText: "Yes",
    confirmUri: null,
    display: "block",
    dismissCount: 0,
    footerTextAlign: "right",
    headerDisplay: "block",
    left: 1,
    noText: "No",
    title: "Delete comment",
    top: 10,
    width: 562,
  });
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(commentDeleteRequests).toEqual([]);

  await page.locator('#comment-delete-modal .modal-footer button:has-text("No")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(commentDeleteRequests).toEqual([]);

  const childAuthor = page.locator("#comment-77 .subcomment-author");
  await expect(childAuthor.locator('a[href^="javascript:"]')).toHaveCount(0);
  const childDeleteButton = childAuthor.locator('button[type="button"].deleteButtonX');
  await expect(childDeleteButton).toHaveText("x");
  await expect(childDeleteButton).toHaveClass("btn-transparent deleteButtonX");
  await expect(childDeleteButton).toHaveAttribute("title", "Delete comment");
  await expect(childDeleteButton).not.toHaveAttribute("data-toggle", "comment-delete");
  await expect(childDeleteButton).not.toHaveAttribute("data-request-uri", /.+/);

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "comment-delete-modal-child";
  });
  await childDeleteButton.dispatchEvent("click");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-uri",
    /.+/,
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-method",
    /.+/,
  );
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal-child");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(commentDeleteRequests).toEqual([]);

  await childDeleteButton.dispatchEvent("click");
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await page.locator(".modal-backdrop.fade.in").dispatchEvent("click");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal-child");
  expect(commentDeleteRequests).toEqual([]);

  await commentDeleteButton.click();
  await page.locator("#comment-delete-confirm").click();
  await expect.poll(() => commentDeleteRequests).toEqual(["DELETE"]);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail votes comments through legacy agree action", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const commentVoteButton = page.locator('#comment-77 button[title="Agree"]');
  await expect(commentVoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentVoteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await commentVoteButton.click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "POST" }]);
});

test("project issue detail keeps legacy active comment vote for authenticated read-only viewer", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page, {
    __sessionOverrides: {
      isAnonymous: false,
      isSiteAdmin: false,
      loginId: "readonly",
      userLabel: "Read Only",
    },
    viewerCanComment: false,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane #comment-body-77 > .comment-body")).toContainText(
    "Comment markdown",
  );
  const commentVoteButton = page.locator('#comment-77 button[title="Agree"]');
  await expect(commentVoteButton).toHaveCount(1);
  await expect(commentVoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentVoteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await expect(
    page.locator("#comment-77 .act-row > i.yobicon-hearts.vote-heart-off.vote-heart-disable-hover"),
  ).toHaveCount(0);

  await commentVoteButton.click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "POST" }]);
});

test("project issue detail renders legacy disabled comment vote icon for anonymous viewer", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page, {
    __sessionOverrides: {
      isAnonymous: true,
      isSiteAdmin: false,
      loginId: "anonymous",
      userLabel: "Anonymous",
    },
    viewerCanComment: false,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator('#comment-77 button[title="Agree"]')).toHaveCount(0);
  await expect(page.locator("#comment-77 [data-request-type]")).toHaveCount(0);
  await expect(
    page.locator("#comment-77 .act-row > i.yobicon-hearts.vote-heart-off.vote-heart-disable-hover"),
  ).toHaveCount(1);
  expect(commentVoteRequests).toEqual([]);
});

test("project issue detail updates issue weight through React mutation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { issueWeightRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".weight-number")).toHaveText("2");

  await page.locator("#upvote-issue-weight").click();
  await expect(page.locator(".weight-number")).toHaveText("3");
  await page.locator("#down-vote-issue-weight").click();
  await expect(page.locator(".weight-number")).toHaveText("2");
  expect(issueWeightRequests.map((request) => request.method)).toEqual(["POST", "POST"]);
  expect(issueWeightRequests.every((request) => Boolean(request.csrfToken))).toBe(true);
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
  const commentUnvoteButton = page.locator('#comment-77 button[title="Withdraw"]');
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await commentUnvoteButton.click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
});

test("project issue detail renders legacy unavailable delete action", async ({ page }) => {
  await mockProjectIssueDetail(page, { canBeDeleted: false, viewerCanDelete: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const expected = `<button type="button" class="icon disabled btn-transparent-with-fontsize-lineheight ml6"><i class="yobicon-trash"></i></button>`;
  expect(
    await canonicalize(page, ".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).toEqual(await canonicalizeHtml(page, expected));
  expect(await canonicalize(page, ".issue-info .right-menu-icons > button.disabled")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-toggle", "popover");
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-trigger", "hover");
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-placement", "top");
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-content", /./u);
});

test("project issue detail hides unauthorized delete when issue itself can be deleted", async ({
  page,
}) => {
  await mockProjectIssueDetail(page, { canBeDeleted: true, viewerCanDelete: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  await expect(page.locator('.span-left-pane > .board-actrow button[title="Delete"]')).toHaveCount(
    0,
  );
  await expect(page.locator(".span-left-pane > .board-actrow button.disabled")).toHaveCount(0);
  await expect(page.locator('.issue-info .right-menu-icons button[title="Delete"]')).toHaveCount(0);
  await expect(page.locator(".issue-info .right-menu-icons button.disabled")).toHaveCount(0);
});

test("project issue detail renders legacy disabled vote action", async ({ page }) => {
  await mockProjectIssueDetail(page, { viewerCanComment: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const expected = `<span class="ybtn-disabled" style="color:rgb(119,119,119)" title="Please log in." data-login="required"><span class="heart"><i class="yobicon-hearts"></i></span></span>`;
  expect(await canonicalize(page, "#vote > .ybtn-disabled")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail vote action posts and toggles legacy voted state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { issueVoteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const voteButton = page.locator("#vote > button").first();
  await expect(voteButton).toHaveAttribute("title", "Vote this issue");
  await expect(voteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await expect(voteButton).not.toHaveAttribute("data-request-method", /.+/);
  await expect(voteButton).not.toHaveClass(/ybtn-watching/);
  await expect(page.locator("#vote > a")).toHaveCount(0);

  const voteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/vote") &&
      response.request().method() === "POST",
  );
  await voteButton.click();
  await voteResponsePromise;

  expect(issueVoteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(voteButton).toHaveAttribute("title", "Unvote this issue");
  await expect(voteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await expect(voteButton).not.toHaveAttribute("data-request-method", /.+/);
  await expect(page.locator("#vote > button")).toHaveClass(/ybtn-watching/);
});

test("project issue detail vote action refreshes legacy voter list branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __issueVoteResponseOverrides: {
      issueVoters: [
        {
          avatarUrl: "/assets/images/default-avatar-32.png",
          emailAddress: "admin@example.com",
          loginId: "admin",
          userId: 1,
          userLabel: "Site Admin",
        },
      ],
      voterCount: 1,
    },
    issueVoters: [],
    voterCount: 0,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#vote")).not.toHaveClass(/voter-exists/);
  await expect(page.locator("#vote > .voter-list-wrap")).toHaveCount(0);
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(0);

  const voteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/vote") &&
      response.request().method() === "POST",
  );
  await page.locator("#vote > button").first().click();
  await voteResponsePromise;

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  await expect(page.locator("#vote")).toHaveClass(/voter-exists/);
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(1);
});

test("project issue detail renders current voter first like legacy partial_voters", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { issueDetailRequests } = await mockProjectIssueDetail(page, {
    hasVoted: true,
    issueVoters: [commentVoters()[1], commentVoters()[0], commentVoters()[2], commentVoters()[3]],
    voterCount: 4,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa2" class="avatar-wrap smaller" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  expect(await issueVoterAvatarOrderMetrics(page)).toEqual({
    firstHref: `${basePath}/admin`,
    firstLeftBeforeSecond: true,
    secondHref: `${basePath}/dev`,
  });
  expect(issueDetailRequests).toEqual([`GET ${basePath}/api/v1/projects/admin/sample/issues/11`]);
});

test("project issue detail overflows non-current voters after current plus three avatars", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    hasVoted: true,
    issueVoters: [
      commentVoters()[1],
      commentVoters()[0],
      commentVoters()[2],
      commentVoters()[3],
      commentVoters()[4],
    ],
    voterCount: 5,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa2" class="avatar-wrap smaller" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png"></a></li><li data-html="true" title="QA Three &lt;br&gt;"><button type="button" data-toggle="modal" data-target="#voters">and 1 others</button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail does not invent current voter when voted payload omits current user", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    hasVoted: true,
    issueVoters: [commentVoters()[1], commentVoters()[2], commentVoters()[3], commentVoters()[4]],
    voterCount: 4,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa2" class="avatar-wrap smaller" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png"></a></li><li data-html="true" title="QA Three &lt;br&gt;"><button type="button" data-toggle="modal" data-target="#voters">and 1 others</button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
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
    `<div class="voter-list-wrap"><ul class="voter-list"><li><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li data-html="true" title="QA Two &lt;br&gt;QA Three &lt;br&gt;QA Four &lt;br&gt;"><button type="button" data-toggle="modal" data-target="#voters">and 3 others</button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(page.locator('#vote a[href="#voters"][data-toggle="modal"]')).toHaveCount(0);
  await expect(
    page.locator('#vote [data-toggle="modal"], #vote [data-target="#voters"]'),
  ).toHaveCount(0);
  const trigger = page.locator('#vote button[type="button"]:has-text("and 3 others")');
  await expect(trigger).toHaveText("and 3 others");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-voters-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters")).toBeVisible();
  await expect(page.locator("#voters")).toHaveClass("modal hide voters-dialog in");
  await expect(page.locator("#voters")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  await installClipboardSpy(page);
  await expect(page.locator("#voters #copyEmailBtn")).toHaveText("Copy email list");
  await expect(page.locator("#voters #copyEmailBtn")).toHaveClass("ybtn ybtn-info ybtn-small");
  await expect(page.locator("#voters #copyEmailBtn")).not.toHaveAttribute(
    "data-clipboard-text",
    /.+/,
  );
  await page.locator("#voters #copyEmailBtn").click();
  await expect(lastCopiedText(page)).resolves.toBe(
    "Site Admin <admin@example.com>;Dev Member <dev@example.com>;QA One <qa1@example.com>;QA Two <qa2@example.com>;QA Three <qa3@example.com>;QA Four <qa4@example.com>;",
  );
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText("Copying email was successful.");

  await page.locator('#voters .modal-footer button:has-text("Close")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters")).toHaveClass("modal hide voters-dialog");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#voters")).toHaveClass("modal hide voters-dialog");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.in").dispatchEvent("click");
  await expect(page.locator("#voters")).toHaveClass("modal hide voters-dialog");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail owns the authenticated parent comment attachment float with StyleX", async ({
  page,
}) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyComment = readFileSync(
    "../yona-original/app/views/issue/partial_comment.scala.html",
    "utf8",
  );
  const legacyBootstrap = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  expect(legacyComment.split(/\r?\n/u)[112]).toContain(
    '<div class="attachments pull-left" data-attachments=',
  );
  expect(legacyBootstrap).toContain(".pull-left {\n  float: left;\n}");
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(routeSource).toContain("styles.commentAttachments");
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-comment-attachments"');
  expect(styleSource).toMatch(/commentAttachments:\s*\{[\s\S]*?float:\s*["']left["']/u);
  expect(styleSource).not.toContain('commentAttachments: {\n    float: "right"');

  await mockProjectIssueDetail(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);
  const emptyAttachments = page.locator(
    '#comment-77 > .media-body > #comment-body-77 > [data-stylex-owner="project-issue-detail-comment-attachments"]',
  );
  await expect(emptyAttachments).toHaveCount(1);
  await expect(emptyAttachments).toHaveClass(/(?:^|\s)attachments(?:\s|$)/u);
  await expect(emptyAttachments).toHaveClass(/(?:^|\s)pull-left(?:\s|$)/u);
  await expect(emptyAttachments).toHaveCSS("float", "left");
  await expect(emptyAttachments).not.toHaveAttribute("style", /.+/u);
  await expect(emptyAttachments.locator(".attach")).toHaveCount(0);
  await expect(page.locator("#attachments .attach")).toHaveCount(0);
  await expect(page.locator("#comment-editform-77 .attachment-files .attach")).toHaveCount(0);

  const emptyGeometry = await emptyAttachments.evaluate((element) => {
    const body = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return body
      ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          body: { bottom: body.bottom, left: body.left, right: body.right, top: body.top },
        }
      : null;
  });
  expect(emptyGeometry).not.toBeNull();
  expect(emptyGeometry!.left).toBeGreaterThanOrEqual(emptyGeometry!.body.left);
  expect(emptyGeometry!.right).toBeLessThanOrEqual(emptyGeometry!.body.right);
  expect(emptyGeometry!.top).toBeGreaterThanOrEqual(emptyGeometry!.body.top);
  expect(emptyGeometry!.bottom - emptyGeometry!.top).toBeGreaterThanOrEqual(0);
});

test("project issue detail preserves parent comment attachment DOM and download behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
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

  await expect(page.locator(".span-left-pane > #attachments > ul.attaches.wm")).toHaveCount(1);
  await expect(
    page.locator(".span-left-pane > #attachments > ul.attaches.wm > li.attach"),
  ).toHaveCount(1);
  await expect(page.locator(".span-left-pane > #attachments > .attached-file")).toHaveCount(0);

  const expectedIssueAttachments =
    `<div class="attachments" id="attachments" data-attachments='${JSON.stringify(issueAttachments)}'><ul class="attaches wm"><li class="attach"><a href="__BASE_PATH__/files/501?action=download" class="download ybtn ybtn-mini" title="Download a file issue-spec.txt"><i class="yobicon-download"></i></a><a href="__BASE_PATH__/files/501" class="vmiddle" target="_blank"><i class="yobicon-paperclip"></i><span class="filename">issue-spec.txt</span><span class="filesize">(12.3 kB)</span></a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > #attachments")).toEqual(
    await canonicalizeHtml(page, expectedIssueAttachments),
  );

  await expect(page.locator("#comment-body-77 > .attachments > ul.attaches.wm")).toHaveCount(1);
  await expect(
    page.locator("#comment-body-77 > .attachments > ul.attaches.wm > li.attach"),
  ).toHaveCount(1);
  await expect(page.locator("#comment-body-77 > .attachments > .attached-file")).toHaveCount(0);
  const commentAttachmentsOwner = page.locator(
    '#comment-77 > .media-body > #comment-body-77 > [data-stylex-owner="project-issue-detail-comment-attachments"]',
  );
  await expect(commentAttachmentsOwner).toHaveCount(1);
  await expect(commentAttachmentsOwner).toHaveClass(/(?:^|\s)attachments(?:\s|$)/u);
  await expect(commentAttachmentsOwner).toHaveClass(/(?:^|\s)pull-left(?:\s|$)/u);
  await expect(commentAttachmentsOwner).toHaveAttribute(
    "data-attachments",
    JSON.stringify(commentAttachments),
  );
  await expect(commentAttachmentsOwner).toHaveCSS("float", "left");
  await expect(commentAttachmentsOwner).not.toHaveAttribute("style", /.+/u);
  await expect(commentAttachmentsOwner.locator(":scope > ul.attaches.wm > li.attach")).toHaveCount(
    1,
  );
  await expect(
    commentAttachmentsOwner.locator(":scope > ul.attaches.wm > li.attach .filename"),
  ).toHaveText("comment-shot.png");
  await expect(
    commentAttachmentsOwner.locator('a.download[title="Download a file comment-shot.png"]'),
  ).toHaveAttribute("href", `${basePath}/files/502?action=download`);
  await expect(page.locator("#attachments .attach")).toHaveCount(1);
  await expect(page.locator("#comment-editform-77 .attachment-files .attach")).toHaveCount(0);
  const attachmentOrder = await commentAttachmentsOwner
    .locator(":scope > *")
    .evaluateAll((nodes) => nodes.map((node) => node.tagName.toLowerCase()));
  expect(attachmentOrder).toEqual(["ul"]);

  const desktopAttachmentGeometry = await commentAttachmentsOwner.evaluate((element) => {
    const body = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return body
      ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          body: { bottom: body.bottom, left: body.left, right: body.right, top: body.top },
        }
      : null;
  });
  expect(desktopAttachmentGeometry).not.toBeNull();
  expect(desktopAttachmentGeometry!.left).toBeGreaterThanOrEqual(
    desktopAttachmentGeometry!.body.left,
  );
  expect(desktopAttachmentGeometry!.right).toBeLessThanOrEqual(
    desktopAttachmentGeometry!.body.right,
  );
  expect(desktopAttachmentGeometry!.right - desktopAttachmentGeometry!.left).toBeGreaterThan(0);
  expect(desktopAttachmentGeometry!.bottom - desktopAttachmentGeometry!.top).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(commentAttachmentsOwner).toHaveCSS("float", "left");
  const mobileAttachmentGeometry = await commentAttachmentsOwner.evaluate((element) => {
    const body = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return body
      ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          body: { bottom: body.bottom, left: body.left, right: body.right, top: body.top },
        }
      : null;
  });
  expect(mobileAttachmentGeometry).not.toBeNull();
  expect(mobileAttachmentGeometry!.left).toBeGreaterThanOrEqual(
    mobileAttachmentGeometry!.body.left,
  );
  expect(mobileAttachmentGeometry!.right).toBeLessThanOrEqual(mobileAttachmentGeometry!.body.right);
  expect(mobileAttachmentGeometry!.top).toBeGreaterThanOrEqual(mobileAttachmentGeometry!.body.top);
  expect(mobileAttachmentGeometry!.right - mobileAttachmentGeometry!.left).toBeGreaterThan(0);
  expect(mobileAttachmentGeometry!.bottom - mobileAttachmentGeometry!.top).toBeGreaterThan(0);

  const expectedCommentAttachments =
    `<ul class="attaches wm"><li class="attach"><a href="__BASE_PATH__/files/502?action=download" class="download ybtn ybtn-mini" title="Download a file comment-shot.png"><i class="yobicon-download"></i></a><a href="__BASE_PATH__/files/502" class="vmiddle" target="_blank"><i class="yobicon-paperclip"></i><span class="filename">comment-shot.png</span><span class="filesize">(4.1 kB)</span></a></li></ul>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#comment-body-77 > .attachments > ul")).toEqual(
    await canonicalizeHtml(page, expectedCommentAttachments),
  );

  await expect(page.locator(".attached-file-marker[data-href]")).toHaveCount(0);
  const expectedCommentUpdateAttachments = `<div class="attachment-files"><div class="attached-file attached-file-marker" data-name="comment-shot.png" data-mime="image/png"><i class="mimetype"></i><strong class="name">comment-shot.png</strong><span class="size">4.1 kB</span><button type="button" class="btn-transparent btn-delete">×</button></div></div>`;
  expect(await canonicalize(page, "#comment-editform-77 > form .attachment-files")).toEqual(
    await canonicalizeHtml(page, expectedCommentUpdateAttachments),
  );
  const updateAttachment = page.locator(
    '#comment-editform-77 > form .attached-file-marker[data-name="comment-shot.png"]',
  );
  await expect(updateAttachment.locator(".name")).toHaveText("comment-shot.png");
  await expect(updateAttachment.locator(".btn-delete")).not.toHaveAttribute("data-id");
  await expect(updateAttachment.locator(".btn-delete")).toHaveAttribute("type", "button");
  expect(
    consoleErrors.some(
      (message) =>
        message.includes("<li> cannot be a descendant of <li>") ||
        message.includes("<li> cannot contain a nested <li>"),
    ),
  ).toBe(false);
});

test("project issue detail omits route-local legacy attachment template", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator('script#tplAttachedFile[type="text/x-jquery-tmpl"]')).toHaveCount(0);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  expect(routeSource).not.toContain("AttachedFileTemplate");
  expect(routeSource).not.toContain("tplAttachedFile");
  expect(routeSource).not.toContain("${fileName}");
  expect(routeSource).not.toContain("${fileHref}");
  expect(routeSource).not.toContain("${fileSizeReadable}");
});

test("project issue detail omits route-local duplicated Select2 templates", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expectIssueDetailSelect2Partial(page, basePath);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const select2HelperStart = routeSource.indexOf("function IssueDetailSelect2Partial");
  const select2HelperEnd = routeSource.indexOf("function ProjectIssueNotFoundBody");
  const select2HelperSource =
    select2HelperStart >= 0 && select2HelperEnd > select2HelperStart
      ? routeSource.slice(select2HelperStart, select2HelperEnd)
      : "";

  expect(select2HelperSource).not.toBe("");
  for (const templateId of [
    "tplSelect2FormatUser",
    "tplSelect2FormatMilestone",
    "tplSelect2Projects",
    "tplSelect2ProjectsWithoutAvatar",
    "tplSelect2FormatIssues",
  ]) {
    expect(select2HelperSource).not.toContain(templateId);
  }
  expect(select2HelperSource).not.toContain("text/x-jquery-tmpl");
  expect(select2HelperSource).not.toContain("dangerouslySetInnerHTML");
  expect(select2HelperSource).not.toContain("${name}");
  expect(select2HelperSource).not.toContain("${avatarURL}");
  expect(select2HelperSource).not.toContain("${stateLabel}");
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

test("project issue detail hides foreign draft child issues like legacy partial_view_child", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    childIssues: [
      {
        authorLoginId: "dev",
        createdLabel: "Jul 3, 2026",
        isDraft: true,
        issueNumber: 12,
        labels: [],
        state: "draft",
        title: "Foreign draft child",
      },
      {
        authorLoginId: "admin",
        createdLabel: "Jul 4, 2026",
        isDraft: true,
        issueNumber: 13,
        labels: [],
        state: "draft",
        title: "Own draft child",
      },
    ],
    childClosedCount: 0,
    childOpenCount: 0,
    isDraft: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane > .subtasks .issue-item.child-issue")).toHaveCount(1);
  await expect(page.locator(".span-left-pane > .subtasks")).not.toContainText(
    "Foreign draft child",
  );
  const visibleDraft = page.locator(".span-left-pane > .subtasks .issue-item.child-issue").first();
  await expect(visibleDraft).toContainText("#DraftOwn draft child");
  await expect(visibleDraft.locator(".state-label.draft")).toHaveCount(1);
  await expect(visibleDraft.locator(".draft-number")).toHaveText("#Draft");
  await expect(visibleDraft.locator("a.twoColumeModeTarget")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/13`,
  );
});

test("project issue detail hides subtasks for directly shared child issue like legacy view.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    childClosedCount: 1,
    childIssues: [
      {
        assigneeLabel: "QA One",
        createdLabel: "Jul 3, 2026",
        issueNumber: 12,
        labels: [],
        state: "open",
        title: "Hidden open child",
      },
    ],
    childOpenCount: 1,
    parentIssueId: 99,
    viewerIsDirectSharer: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane > .subtasks")).toHaveCount(1);
  await expect(page.locator(".span-left-pane > .subtasks")).toBeEmpty();
  await expect(page.locator(".span-left-pane > .subtasks .child-issues")).toHaveCount(0);
  await expect(page.locator(".span-left-pane > .subtasks")).not.toContainText("Hidden open child");
});

test("project issue detail renders parent row and selected child on child issue detail", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __issueNumber: 12,
    childClosedCount: 1,
    childIssues: [
      {
        assigneeLabel: "QA One",
        commentCount: 0,
        createdLabel: "Jul 3, 2026",
        issueNumber: 12,
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
        state: "open",
        title: "Open child",
        voterCount: 0,
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
    issueNumber: 12,
    parentIssueId: 42,
    parentIssueNumber: 11,
    parentIssueState: "closed",
    parentIssueTitle: "Parent issue",
    title: "Open child",
  });

  await page.goto(`${basePath}/admin/sample/issue/12`);

  const expected =
    `<div class="subtasks"><div class="child-issues"><div class="issue-item parent-issue"><a href="__BASE_PATH__/admin/sample/issue/11">#11 Parent issue</a><div class="upload-progress red-outline"><div class="bar red" style="width:50%" title="Subtask"></div></div><span class=" ">1/2 </span><span class="parent-issue-state closed">Closed</span></div><hr class="parent-issue-delimeter"><div class="child-issues"><div class="issue-item selected-child child-issue"><span class="state-label open"></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/12"><span class="item-name"><span class="subtask-number">#12</span><span>Open child</span><span> - QA One</span></span></a><span class="font12 no-border-at-child"></span><a href="__BASE_PATH__/admin/sample/issues?state=open&amp;labelIds=8" class="label issue-label list-label active twoColumeModeTarget" data-category-id="3" data-label-id="8" style="background:rgb(81,170,204)">bug</a><span class="child-issue-date" title="Jul 3, 2026">Jul 3, 2026</span></div><div class="issue-item  child-issue"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/13"><span class="item-name"><span class="subtask-number">#13</span><span>Closed child</span><span></span></span></a><span class="font12 no-border-at-child"></span><span class="child-issue-date" title="Jul 4, 2026">Jul 4, 2026</span></div></div></div></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > .subtasks")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail renders legacy unauthorized comment form", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync(
    "../yona-original/app/views/common/commentForm.scala.html",
    "utf8",
  );
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(legacyView).toContain('<div class="write-comment-box mt20"');
  expect(legacyView).toContain('data-login="required"');
  expect(legacyCommon).toMatch(/\.mt20\s*\{\s*margin-top:\s*20px;\s*\}/u);
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(styleSource).toContain('unauthorizedComment: { marginTop: "20px" }');
  expect(routeSource).toContain("styles.unauthorizedComment");
  expect(routeSource).not.toContain('className="write-comment-box mt20"');

  await mockProjectIssueDetail(page, { viewerCanComment: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const unauthorized = page.locator(
    '.span-left-pane > #comments > [data-stylex-owner="project-issue-detail-unauthorized-comment"]',
  );
  await expect(page.locator(".span-left-pane > #comments > #comment-form")).toHaveCount(0);
  await expect(unauthorized).toHaveCount(1);
  await expect(page.locator("#comment-77 .child-comment-input-form")).toHaveCount(0);
  await expect(unauthorized).toHaveClass(/write-comment-box/);
  await expect(unauthorized).not.toHaveClass(/\bmt20\b/);
  await expect(unauthorized).toHaveAttribute("title", "Please log in.");
  await expect(unauthorized).toHaveAttribute("data-login", "required");
  await expect(unauthorized).not.toHaveAttribute("style");
  await expect(unauthorized.locator(".write-comment-wrap > .textarea-box > textarea")).toHaveClass(
    /comment/,
  );
  await expect(unauthorized.locator("textarea")).toHaveClass(/disabled/);
  await expect(unauthorized.locator("textarea")).toBeDisabled();
  await expect(unauthorized.locator("textarea")).not.toHaveAttribute("style");
  await expect(
    unauthorized.locator("[data-stylex-owner='project-issue-detail-disabled-comment-actions']"),
  ).toHaveClass(/mt10/);
  await expect(unauthorized.locator(".ybtn-disabled")).toHaveText("Add a comment");

  const desktopMetrics = await unauthorized.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { marginTop: style.marginTop, top: rect.top, height: rect.height };
  });
  expect(desktopMetrics.marginTop).toBe("20px");
  expect(desktopMetrics.height).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileMetrics = await page
    .locator('[data-stylex-owner="project-issue-detail-unauthorized-comment"]')
    .evaluate((element) => ({
      marginTop: getComputedStyle(element).marginTop,
      top: element.getBoundingClientRect().top,
    }));
  expect(mobileMetrics.marginTop).toBe("20px");
  expect(mobileMetrics.top).toBeGreaterThan(0);
  await expect(
    page.locator(`script[src="${basePath}/assets/javascripts/common/yobi.CommentForm.js"]`),
  ).toHaveCount(0);
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
  expect(await canonicalize(page, ".span-right-pane #comments")).toEqual(
    await canonicalizeHtml(
      page,
      `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><strong>Comment</strong> <strong class="num">0</strong></div><ul class="comments"></ul></div></div></div>`,
    ),
  );

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

test("project issue detail preserves legacy body-changed-only timeline shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_BODY_CHANGED",
        id: 104,
        kind: "event",
        newValue: "new body",
        oldValue: "old body",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-104")).toHaveCount(0);
  const expected =
    `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"></ul></div></div>${COMMENT_FORM}</div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > #comments")).toEqual(
    await canonicalizeHtml(page, expected),
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
  await setBrowserLanguage(page, "en-US");
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

test("project issue detail matches live legacy Korean milestone event and mobile header", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "ko-KR");
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectIssueDetail(page, {
    __projectOverrides: { boardCount: 1, openIssueCount: 1 },
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "2026-07-04",
        eventType: "ISSUE_MILESTONE_CHANGED",
        id: 91,
        kind: "event",
        milestoneId: 5,
        milestoneTitle: "v1.0",
        newValue: "5",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "개발자",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".project-header-outer")).toHaveCSS("height", "120px");
  await expect(page.locator("#event-91 .state.milestone-changed")).toHaveText("마일스톤 변경");
  await expect(page.locator("#event-91")).toContainText(
    "개발자님이 마일스톤을 v1.0(으)로 변경했습니다.",
  );
  await expect(page.locator("#event-91 a[title='마일스톤']")).toHaveText("v1.0");
  await expect(page.locator('[data-stylex-owner="global-gnb-nav"]')).toContainText(
    "개발팀에게 문의하기",
  );

  const mobileMetrics = await page.evaluate(() => {
    const upload = document.querySelector<HTMLElement>(".write-comment-box .upload-wrap");
    const userMenu = document.querySelector<HTMLElement>(".gnb-usermenu");
    if (!upload || !userMenu) return null;
    const uploadBox = upload.getBoundingClientRect();
    const userMenuBox = userMenu.getBoundingClientRect();
    return {
      uploadHeight: uploadBox.height,
      uploadWidth: uploadBox.width,
      uploadX: uploadBox.x,
      userMenuTop: userMenuBox.top,
    };
  });
  expect(mobileMetrics).not.toBeNull();
  expect(mobileMetrics!.uploadHeight).toBeCloseTo(100, 0);
  expect(mobileMetrics!.uploadWidth).toBeCloseTo(386, 0);
  expect(mobileMetrics!.uploadX).toBeCloseTo(2, 0);
  expect(mobileMetrics!.userMenuTop).toBe(83);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  const desktopUpload = await page
    .locator(".write-comment-box .upload-wrap")
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x };
    });
  expect(desktopUpload.x).toBeCloseTo(64, 0);
  expect(desktopUpload.width).toBeCloseTo(948, 0);
  expect(desktopUpload.height).toBeCloseTo(70, 0);

  const desktopIssueUpdateForm = await page.locator("#issueUpdateForm").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, x: box.x };
  });
  expect(desktopIssueUpdateForm.x).toBeCloseTo(1051, 0);
  expect(desktopIssueUpdateForm.width).toBeCloseTo(305, 0);

  const desktopProjectMenu = await page.locator(".project-menu-gruop").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width };
  });
  expect(desktopProjectMenu.width).toBeCloseTo(566, 0);
  await expect(page.locator("#issueUpdateForm")).toContainText("목표 완료일");
  await expect(page.locator("#issueUpdateForm")).toContainText("이슈 라벨");
  await expect(page.locator(".comment-header")).toHaveCount(2);
  await expect(page.locator(".comment-header").first()).toContainText("댓글");
  await expect(page.locator(".comment-header").last()).toContainText("댓글");
});

test("project issue detail mobile uploader follows the frozen responsive cascade", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectIssueDetail(page, { commentCount: 0, comments: [], timeline: [] });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  const geometry = await page.locator("#comment-form .upload-wrap").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { height: box.height, width: box.width, x: box.x };
  });
  expect(geometry).toEqual({ height: 100, width: 386, x: 2 });
});

test("project issue detail renders legacy null milestone timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "en-US");
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
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );

  expect(routeSource).toContain('to="/$ownerName/$projectName"');
  expect(routeSource).toContain("params={{ ownerName: fromOwner, projectName: fromProject }}");
  expect(routeSource).not.toContain("to={`/${fromProjectName}`}");

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
  await expect(page.locator("#event-92 strong .link")).toHaveText("old-owner/old-project");
  await expect(page.locator("#event-92 strong .link")).toHaveAttribute(
    "href",
    `${basePath}/old-owner/old-project`,
  );

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
  await expect(page.locator("#comment-77 button.vote-description-people")).toHaveText(
    "6 Agreements",
  );
  await expect(
    page.locator('#comment-77 [data-toggle="modal"], #comment-77 [data-target="#voters-77"]'),
  ).toHaveCount(0);
  await expect(page.locator("#voters-77.voters-dialog")).toHaveCount(1);
  const commentUnvoteButton = page.locator('#comment-77 button[title="Withdraw"]');
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-uri", /.+/);

  const expectedModal =
    `<div id="voters-77" class="modal hide voters-dialog"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h5 class="nm">People who agree with this</h5></div><div class="modal-body"><ul class="unstyled"><li><a href="__BASE_PATH__/admin" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></li><li><a href="__BASE_PATH__/dev" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></li><li><a href="__BASE_PATH__/qa1" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA One</strong><span class="loginid"> <strong>@</strong>qa1</span></a></li><li><a href="__BASE_PATH__/qa2" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA Two</strong><span class="loginid"> <strong>@</strong>qa2</span></a></li><li><a href="__BASE_PATH__/qa3" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA Three</strong><span class="loginid"> <strong>@</strong>qa3</span></a></li><li><a href="__BASE_PATH__/qa4" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">QA Four</strong><span class="loginid"> <strong>@</strong>qa4</span></a></li></ul></div><div class="modal-footer"><button id="copyEmailBtn" class="ybtn ybtn-info ybtn-small">Copy email list</button><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal">Close</button></div></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#voters-77")).toEqual(
    await canonicalizeHtml(page, expectedModal),
  );

  await expect(page.locator('#comment-77 a[href="#voters-77"][data-toggle="modal"]')).toHaveCount(
    0,
  );
  const trigger = page.locator("#comment-77 button[type='button'].vote-description-people");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "comment-voters-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters-77")).toBeVisible();
  await expect(page.locator("#voters-77")).toHaveClass("modal hide voters-dialog in");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(await commentVoterModalMetrics(page)).toEqual({
    avatarHeight: 40,
    avatarWidth: 40,
    bodyDisplay: "block",
    closeHookCount: 0,
    display: "block",
    footerDisplay: "block",
    headerDisplay: "block",
    left: 360,
    rowCount: 6,
    rowDisplay: "list-item",
    width: 562,
  });
  await installClipboardSpy(page);
  await expect(page.locator("#voters-77 #copyEmailBtn")).toHaveText("Copy email list");
  await expect(page.locator("#voters-77 #copyEmailBtn")).toHaveClass("ybtn ybtn-info ybtn-small");
  await expect(page.locator("#voters-77 #copyEmailBtn")).not.toHaveAttribute(
    "data-clipboard-text",
    /.+/,
  );
  await page.locator("#voters-77 #copyEmailBtn").click();
  await expect(lastCopiedText(page)).resolves.toBe(
    "Site Admin <admin@example.com>;Dev Member <dev@example.com>;QA One <qa1@example.com>;QA Two <qa2@example.com>;QA Three <qa3@example.com>;QA Four <qa4@example.com>;",
  );
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText("Copying email was successful.");

  await page.locator('#voters-77 .modal-footer button:has-text("Close")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters-77")).toBeHidden();
  await expect(page.locator("#voters-77")).toHaveClass("modal hide voters-dialog");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#voters-77")).toHaveClass("modal hide voters-dialog");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.in").dispatchEvent("click");
  await expect(page.locator("#voters-77")).toHaveClass("modal hide voters-dialog");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
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
  await expect(page.locator("#comment-77 button.vote-description-people")).toHaveCount(0);
  await expect(page.locator("#voters-77")).toHaveCount(0);

  const expected =
    `<a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a>`.replaceAll(
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

async function issueVoterAvatarOrderMetrics(page: Page) {
  return page.evaluate(() => {
    const voters = Array.from(document.querySelectorAll<HTMLAnchorElement>("#vote .voter-list a"));
    const first = voters[0];
    const second = voters[1];
    const firstRect = first?.getBoundingClientRect();
    const secondRect = second?.getBoundingClientRect();
    return {
      firstHref: first?.getAttribute("href") ?? null,
      firstLeftBeforeSecond: firstRect && secondRect ? firstRect.left < secondRect.left : false,
      secondHref: second?.getAttribute("href") ?? null,
    };
  });
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
    const childAnchor = comment.querySelector<HTMLAnchorElement>(".subcomment-author a.ago");
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

async function protectedIssueShellMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const search = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-gnb-search-box"]',
    );
    const board = document.querySelector<HTMLElement>(".project-page-wrap.board-view");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    if (!navbar || !search || !board || !menu) {
      throw new Error("Missing protected issue detail shell elements");
    }
    const navbarRect = navbar.getBoundingClientRect();
    const searchRect = search.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    return {
      boardTopAtOrBelowMenu: Math.round(boardRect.top) >= Math.round(menuRect.bottom),
      gnbClassName: navbar.className,
      searchBottomWithinNavbar: Math.round(searchRect.bottom) <= Math.round(navbarRect.bottom),
      searchLeftWithinNavbar: Math.round(searchRect.left) >= Math.round(navbarRect.left),
      searchRightWithinNavbar: Math.round(searchRect.right) <= Math.round(navbarRect.right),
      searchTopWithinNavbar: Math.round(searchRect.top) >= Math.round(navbarRect.top),
    };
  });
}

async function dueDateInlineUpdateMetrics(page: Page) {
  return page.evaluate(() => {
    const rightPane = document.querySelector<HTMLElement>(".span-right-pane");
    const dueDateRow = document.evaluate(
      './/dl[dt[contains(normalize-space(.), "Due date")]]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue as HTMLElement | null;
    const searchBar = document.querySelector<HTMLElement>(".span-right-pane .search.search-bar");
    const input = document.querySelector<HTMLInputElement>(
      '.span-right-pane input[name="dueDate"]',
    );
    const button = document.querySelector<HTMLElement>(".span-right-pane .btn-calendar");
    if (!rightPane || !dueDateRow || !searchBar || !input || !button) {
      throw new Error("Missing right-pane due-date controls");
    }
    const rightPaneRect = rightPane.getBoundingClientRect();
    const rowRect = dueDateRow.getBoundingClientRect();
    const searchRect = searchBar.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      buttonInsideDueDateRow:
        Math.round(buttonRect.top) >= Math.round(rowRect.top) &&
        Math.round(buttonRect.bottom) <= Math.round(rowRect.bottom) &&
        Math.round(buttonRect.right) <= Math.round(rowRect.right),
      inputInsideDueDateRow:
        Math.round(inputRect.top) >= Math.round(rowRect.top) &&
        Math.round(inputRect.bottom) <= Math.round(rowRect.bottom) &&
        Math.round(inputRect.right) <= Math.round(rowRect.right),
      inputName: input.name,
      searchBarInsideRightPane:
        Math.round(searchRect.left) >= Math.round(rightPaneRect.left) &&
        Math.round(searchRect.right) <= Math.round(rightPaneRect.right),
      searchBarClassName: searchBar.className,
    };
  });
}

async function mockProjectIssueDetail(page: Page, issueOverrides: Record<string, unknown> = {}) {
  const issueStatus = Number(issueOverrides.__issueStatus ?? 200);
  const issueNumber = String(issueOverrides.__issueNumber ?? 11);
  const ownerName = String(issueOverrides.__ownerName ?? "admin");
  const projectName = String(issueOverrides.__projectName ?? "sample");
  const containerPath = String(
    issueOverrides.__containerPath ??
      `/api/v1/owners/${ownerName}/projects/${projectName}/container`,
  );
  const detailPath = String(
    issueOverrides.__detailPath ??
      `/api/v1/projects/${ownerName}/${projectName}/issues/${issueNumber}`,
  );
  const openMilestones =
    issueOverrides.__openMilestones && Array.isArray(issueOverrides.__openMilestones)
      ? issueOverrides.__openMilestones
      : [
          { id: 5, state: "open", title: "v1.0" },
          { id: 9, state: "open", title: "v2.0" },
        ];
  const closedMilestones =
    issueOverrides.__closedMilestones && Array.isArray(issueOverrides.__closedMilestones)
      ? issueOverrides.__closedMilestones
      : [{ id: 7, state: "closed", title: "v0.9" }];
  const labelsResponse =
    issueOverrides.__labelsResponse && Array.isArray(issueOverrides.__labelsResponse)
      ? issueOverrides.__labelsResponse
      : [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#70b858",
            id: "9",
            name: "enhancement",
          },
        ];
  const projectOverrides =
    issueOverrides.__projectOverrides &&
    typeof issueOverrides.__projectOverrides === "object" &&
    !Array.isArray(issueOverrides.__projectOverrides)
      ? (issueOverrides.__projectOverrides as Record<string, unknown>)
      : {};
  const sessionOverrides =
    issueOverrides.__sessionOverrides &&
    typeof issueOverrides.__sessionOverrides === "object" &&
    !Array.isArray(issueOverrides.__sessionOverrides)
      ? (issueOverrides.__sessionOverrides as Record<string, unknown>)
      : {};
  const issueVoteResponseOverrides =
    issueOverrides.__issueVoteResponseOverrides &&
    typeof issueOverrides.__issueVoteResponseOverrides === "object" &&
    !Array.isArray(issueOverrides.__issueVoteResponseOverrides)
      ? (issueOverrides.__issueVoteResponseOverrides as Record<string, unknown>)
      : {};
  const effectiveIssueOverrides = { ...issueOverrides };
  delete effectiveIssueOverrides.__issueVoteResponseOverrides;
  delete effectiveIssueOverrides.__issueStatus;
  delete effectiveIssueOverrides.__issueNumber;
  delete effectiveIssueOverrides.__ownerName;
  delete effectiveIssueOverrides.__projectName;
  delete effectiveIssueOverrides.__containerPath;
  delete effectiveIssueOverrides.__detailPath;
  delete effectiveIssueOverrides.__openMilestones;
  delete effectiveIssueOverrides.__closedMilestones;
  delete effectiveIssueOverrides.__labelsResponse;
  delete effectiveIssueOverrides.__projectOverrides;
  delete effectiveIssueOverrides.__sessionOverrides;
  const deleteRequests: string[] = [];
  const commentDeleteRequests: string[] = [];
  const commentVoteRequests: { csrfToken: string | null; method: string }[] = [];
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const issueDetailRequests: string[] = [];
  const issueVoteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const watchRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const issueWeightRequests: { csrfToken: string | null; method: string; url: string }[] = [];
  const massUpdateRequests: { body: unknown; csrfToken: string | null; method: string }[] = [];
  const sessionResponse = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
    ...sessionOverrides,
  };
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(sessionResponse),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      body: JSON.stringify(sessionResponse),
    });
  });
  await page.route(`**${containerPath}`, async (route) => {
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
        ownerName,
        projectName,
        vcs: "GIT",
        viewerCanUpdate: true,
        ...projectOverrides,
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/milestones**`,
    async (route) => {
      const url = new URL(route.request().url());
      const state = url.searchParams.get("state");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          milestones: state === "closed" ? closedMilestones : openMilestones,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/labels`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          labels: labelsResponse,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/issues/parent-options**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: 42, issueNumber: 11, selected: false, title: "Existing parent" }],
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/issues/mass-update`,
    async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      massUpdateRequests.push({
        body,
        csrfToken: route.request().headers()["x-csrf-token"] ?? null,
        method: route.request().method(),
      });
      effectiveIssueOverrides.dueDateLabel =
        typeof body.dueDate === "string" ? body.dueDate : String(body.dueDate ?? "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ updated: true }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/issues/${issueNumber}/favorite`,
    async (route) => {
      favoriteRequests.push({
        hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
        method: route.request().method(),
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          issueNumber: Number(issueNumber),
          isFavorited: true,
          ownerName,
          projectName,
          ...effectiveIssueOverrides,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/issues/${issueNumber}/watch`,
    async (route) => {
      const method = route.request().method();
      watchRequests.push({
        hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
        method,
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          issueNumber: Number(issueNumber),
          isWatching: method !== "DELETE",
          ownerName,
          projectName,
          ...effectiveIssueOverrides,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/issues/${issueNumber}/vote`,
    async (route) => {
      const method = route.request().method();
      issueVoteRequests.push({
        hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
        method,
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...effectiveIssueOverrides,
          ...issueVoteResponseOverrides,
          hasVoted: method !== "DELETE",
          issueNumber: Number(issueNumber),
          ownerName,
          projectName,
        }),
      });
    },
  );
  await page.route(`**${detailPath}`, async (route) => {
    issueDetailRequests.push(
      `${route.request().method()} ${new URL(route.request().url()).pathname}`,
    );
    if (route.request().method() === "DELETE") {
      deleteRequests.push(route.request().method());
      await route.fulfill({ status: 204 });
      return;
    }
    if (issueStatus === 404) {
      await route.fulfill({
        contentType: "application/json",
        status: 404,
        body: JSON.stringify({
          error: {
            code: "not_found",
            message: "Issue does not exist",
            status: 404,
          },
        }),
      });
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
      canBeDeleted: true,
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
      issueNumber: Number(issueNumber),
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
      ownerName,
      parentIssueId: null,
      projectName,
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
      ...effectiveIssueOverrides,
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(issue),
    });
  });
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/issues/${issueNumber}/comments/77`,
    async (route) => {
      if (route.request().method() === "DELETE") {
        commentDeleteRequests.push(route.request().method());
        await route.fulfill({ status: 204 });
        return;
      }
      await route.fallback();
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/issues/${issueNumber}/comments/77/vote`,
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
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/issues/${issueNumber}/*voteWeight`,
    async (route) => {
      issueWeightRequests.push({
        csrfToken: route.request().headers()["x-csrf-token"] ?? null,
        method: route.request().method(),
        url: route.request().url(),
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          weight: route.request().url().includes("upvoteWeight") ? 3 : 2,
        }),
      });
    },
  );
  return {
    commentDeleteRequests,
    commentVoteRequests,
    deleteRequests,
    favoriteRequests,
    issueDetailRequests,
    issueVoteRequests,
    issueWeightRequests,
    massUpdateRequests,
    watchRequests,
  };
}

async function issueNotFoundMetrics(page: Page) {
  return page.evaluate(() => {
    const errorWrap = requireElement(".project-page-wrap > .error-wrap");
    const icon = requireElement(".project-page-wrap > .error-wrap .ico.ico-err2");
    const message = requireElement(".project-page-wrap > .error-wrap p");
    const button = requireElement(".project-page-wrap > .error-wrap .ybtn.ybtn-primary");
    const pageWrap = requireElement(".project-page-wrap");
    const errorStyle = getComputedStyle(errorWrap);
    const messageStyle = getComputedStyle(message);
    const buttonStyle = getComputedStyle(button);
    const buttonRect = button.getBoundingClientRect();

    return {
      buttonDisplay: buttonStyle.display,
      buttonHeight: Math.round(buttonRect.height),
      buttonLineHeight: buttonStyle.lineHeight,
      errorPaddingBlock:
        Math.round(parseFloat(errorStyle.paddingTop)) +
        Math.round(parseFloat(errorStyle.paddingBottom)),
      iconClass: icon.getAttribute("class"),
      messageFontSize: messageStyle.fontSize,
      messageFontWeight: messageStyle.fontWeight,
      messageMarginBottom: Math.round(parseFloat(messageStyle.marginBottom)),
      messageMarginTop: Math.round(parseFloat(messageStyle.marginTop)),
      pageWrapChildCount: pageWrap.children.length,
    };

    function requireElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function headTitleText(page: Page) {
  return page.evaluate(() => document.querySelector("head > title")?.textContent ?? "");
}

async function lastHeadMetaContent(page: Page, selector: string) {
  return page.evaluate((metaSelector) => {
    const matches = document.querySelectorAll<HTMLMetaElement>(metaSelector);
    return matches.item(matches.length - 1)?.content ?? "";
  }, selector);
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
        footer?.querySelector<HTMLButtonElement>("button:last-child")?.textContent?.trim() ?? null,
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            (node.tagName !== "A" || !attr.name.startsWith("data-")),
        )
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            (node.tagName !== "A" || !attr.name.startsWith("data-")),
        )
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            !isRemovedReactOwnedDataApi(attr) &&
            (node.tagName !== "A" || !attr.name.startsWith("data-")),
        )
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

    function isRemovedReactOwnedDataApi(attr: Attr) {
      return (
        (attr.name === "data-toggle" && attr.value === "tab") ||
        (attr.name === "data-toggle" && attr.value === "modal") ||
        (attr.name === "data-dismiss" && attr.value === "modal") ||
        (attr.name === "data-target" &&
          /^#(?:-yona-posting-history|deleteConfirm|helpKeys|voters(?:-\d+)?)$/u.test(attr.value))
      );
    }
  }, html);
}

async function setBrowserLanguage(page: Page, language: string) {
  await page.addInitScript((nextLanguage) => {
    Object.defineProperty(navigator, "language", {
      configurable: true,
      get: () => nextLanguage,
    });
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      get: () => [nextLanguage],
    });
  }, language);
}
