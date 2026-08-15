// e2e closure ledger (2026-08-12): suite hangs past the 600000ms WTR global
// timeout with no per-test assertion observed (HARNESS_ENV). Standard
// suite-hang closure: no route/CSS prescription; a short per-test timeout
// bisect is needed to find the unfinished waitForRequest/poll.
import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

export const LEGACY_MARKDOWN_HELP = readFileSync(
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

export const ISSUE_DETAIL_KEYMAP = `<div class="pull-left" style="padding:10px 0px;margin-left:55px"><button type="button" data-toggle="modal" class="ybtn ybtn-inverse ybtn-mini">Keyboard shortcuts</button><div id="helpKeys" class="modal hide fade keymap-help" tabindex="-1" role="dialog"><div class="row-fluid"><div class="span3"><h5>projects</h5><span class="ybtn ybtn-small">H</span><span class="help-inline">Home</span><br><span class="ybtn ybtn-small">B</span><span class="help-inline">Board</span><br><span class="ybtn ybtn-small">I</span><span class="help-inline">Issue</span><br><span class="ybtn ybtn-small">C</span><span class="help-inline">Code</span><br><span class="ybtn ybtn-small">M</span><span class="help-inline">Milestone</span><br><span class="ybtn ybtn-small">P</span><span class="help-inline">Pull request</span><br><span class="ybtn ybtn-small">Q</span><span class="help-inline">Settings</span><br></div><div class="span9"><div class="row-fluid"><div class="span5"><h5>Issue details</h5><span class="ybtn ybtn-small">N</span><span class="help-inline">New issue</span><br><span class="ybtn ybtn-small">L</span><span class="help-inline">List</span><br><span class="ybtn ybtn-small">E</span><span class="help-inline">Edit</span><br></div><div class="span7"><h5>Site</h5><span class="ybtn ybtn-small">A</span><span class="help-inline">My Issues</span><br><span class="ybtn ybtn-small">U</span><span class="help-inline">Profile</span><br><span class="ybtn ybtn-small">F</span><span class="help-inline">User menu</span><br>__SITE_SEARCH_KEYS__<span class="help-inline">Site search</span><br><span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Submit form</span><br></div></div><div class="row-fluid mt20"><div class="span12"><h5>Issue Comments</h5><span class="ybtn ybtn-small">SHIFT</span> + <span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Comment &amp; Close issue</span><br></div></div></div></div><p class="actrow"><button type="button" class="ybtn ybtn-info" data-dismiss="modal">Confirm</button></p></div></div>`;

export const EXPECTED_ISSUE_DETAIL = `
<div class="page-wrap-outer"><div class="project-page-wrap board-view"><div class="board-header issue"><div class="pull-right mr10 mt10 hide-in-mobile"><div class="date" title="Jul 1, 2026">Jul 1, 2026</div><span class="badge badge-issue-open">Open</span></div><div class="title"><strong class="board-id">11</strong>Fix flaky issue<span class="favorite-issue" data-issue-id="42"><i class="star material-icons va-text-top">star</i></span><div class="hide show-in-mobile"><span class="date" title="Jul 1, 2026">Jul 1, 2026</span><span class="badge badge-small badge-issue-open">Open</span></div></div></div><div class="board-body row-fluid"><div class="span9 span-left-pane"><div class="author-info"><a href="__BASE_PATH__/dev" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></div><div id="issue-11" class="hide"><form action="__BASE_PATH__/api/v1/projects/admin/sample/issues/11/content"><textarea>Body **markdown**</textarea></form></div><div id="issue-body-11"><div class="content markdown-wrap" data-allowed-update="true"><p>Body <strong>markdown</strong></p></div></div><div class="attachments" id="attachments" data-attachments="[]"></div><div class="board-actrow right-txt"><div class="pull-left"><div><button id="watch-button" type="button" class="ybtn " title="Watch this issue" data-watching="false">Subscribe</button><button id="issue-share-button" type="button" class="ybtn">Issue Sharing</button><span class="project-btn-item hide show-in-mobile-inline ml4"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></span><span class="issue-weight"><span class="divider">|</span><button id="upvote-issue-weight" class="ybtn ybtn-small" title="Issue weight: Upvote"><i class="yobicon-arrow-up-alt"></i></button><button class="ybtn ybtn-small" id="down-vote-issue-weight" title="Issue weight: Down vote"><i class="yobicon-arrow-down-alt"></i></button><span class="weight-number">2</span></span></div></div><div id="vote" class="vote-wrap voter-exists"><button type="button" class="" title="Vote this issue"><span class="heart"><i class="yobicon-hearts"></i></span></button><div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div></div><div id="voters" class="modal hide voters-dialog"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h5 class="nm">People who agree with this</h5></div><div class="modal-body"><ul class="unstyled"><li><a href="__BASE_PATH__/admin" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></li><li><a href="__BASE_PATH__/dev" class="usf-group" target="_blank"><span class="avatar-wrap mlarge"><img src="/assets/images/default-avatar-32.png" width="40" height="40"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></li></ul></div><div class="modal-footer"><button id="copyEmailBtn" class="ybtn ybtn-info ybtn-small">Copy email list</button><button class="ybtn ybtn-info ybtn-small" data-dismiss="modal" aria-hidden="true">Close</button></div></div><span class="act-row"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" title="Edit"><i class="yobicon-edit-2"></i></button><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="Delete"><i class="yobicon-trash"></i></button></span></div><dl class="sharer-list hideFromDisplayOnly"><dt class="issue-share-title mb10">Issue Sharer <span class="num issue-sharer-count"></span></dt><dd id="sharer-list" class="hideFromDisplayOnly"><input type="hidden" class="bigdrop width100p" id="issueSharer" name="issueSharer" placeholder="Select Issue Sharer" value=""></dd></dl><div class="watcher-list"></div><div class="subtasks"></div><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div><div class="span3 span-right-pane mb20"><div class="issue-info"><form id="issueUpdateForm" action="__BASE_PATH__/admin/sample/issues" method="post"><input type="hidden" name="issues[0].id" value="42"><dl><dd class="project-btn-item"><a href="__BASE_PATH__/admin/sample/issueform?parentIssueId=42" class="ybtn ybtn-success">New subtask</a></dd><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="admin" style="width:100%"></dd></dl><dl><dt>Milestone</dt><dd><select id="milestone" name="milestone.id" data-format="milestone" data-container-css-class="fullsize"><option value="-1">No milestone</option><optgroup label="Open"><option value="5" data-state="open" selected="">v1.0</option><option value="9" data-state="open">v2.0</option></optgroup><optgroup label="Closed"><option value="7" data-state="closed">v0.9</option></optgroup></select></dd></dl><dl><dt>Due date<span class="duedate-status "></span></dt><dd><div class="search search-bar"><input type="text" name="dueDate" value="Jul 5, 2026" class="textbox full" autocomplete="off"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button><input type="date" class="issue-due-date-native-picker" aria-label="Choose due date" tabindex="-1" value=""></div></dd></dl><dl><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false" selected="">bug</option><option value="9" data-category-id="3" data-category-is-exclusive="false">enhancement</option></optgroup></select></dd></dl><div class="act-row right-menu-icons"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" title="Edit"><i class="yobicon-edit-2"></i></button><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="Delete"><i class="yobicon-trash"></i></button></div></form><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"></div></div></div></div></div></div><div><input type="hidden" id="issueBodyChecksum" value="body-sha1"><input type="hidden" id="numOfComments" value="0"><input type="hidden" id="issueUpdateDate" value="1782892800000"></div><div class="board-footer">${ISSUE_DETAIL_KEYMAP}</div></div><div id="deleteConfirm" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete issue</h3></div><div class="modal-body"><p>Once you delete the post, you won\'t be able to recover it. Do you still want to delete this post?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div><div id="comment-delete-modal" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete comment</h3></div><div class="modal-body"><p>Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?</p></div><div class="modal-footer"><button id="comment-delete-confirm" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div></div>
`;

export const TASKLIST = `<div class="tasklist task-show"><div class="task-title" style="width:0%">Tasks<span class="done-counter"></span></div><div class="task-progress"><div class="bar red" style="width:0" title="Tasklist"></div></div></div>`;
export const COMMENT_UPDATE_FORM = `<div id="comment-editform-77" class="comment-update-form"><form action="__BASE_PATH__/admin/sample/issue/11/comments/77" method="post" enctype="multipart/form-data"><input type="hidden" name="id" value="77"><div class="write-comment-box"><div class="write-comment-wrap"><div class="markdown-editor mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div class="markdown-help"><ul class="markdown-help-nav"><li><span class="label">Markdown help</span></li><li class="help-nav"><button aria-controls="markdown-help-markdownHeaders" aria-expanded="false" class="markdown-help-nav-button" type="button">Header</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownStyling" aria-expanded="false" class="markdown-help-nav-button" type="button">Text Style</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownLinks" aria-expanded="false" class="markdown-help-nav-button" type="button">Link</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownLists" aria-expanded="false" class="markdown-help-nav-button" type="button">List</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownTaskList" aria-expanded="false" class="markdown-help-nav-button" type="button">Checklist</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownImages" aria-expanded="false" class="markdown-help-nav-button" type="button">Image</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownBlockquotes" aria-expanded="false" class="markdown-help-nav-button" type="button">Blockquote</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownCodes" aria-expanded="false" class="markdown-help-nav-button" type="button">Code</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownTables" aria-expanded="false" class="markdown-help-nav-button" type="button">Table</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownShortLinks" aria-expanded="false" class="markdown-help-nav-button" type="button">Short Link</button></li></ul><ul class="markdown-help-wrap"><li class="markdown-help-item markdownHeaders" id="markdown-help-markdownHeaders"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre># This is an H1 ## This is an H2 ### This is an H3</pre></div><div class="span6"><div class="markdown-wrap"><h1 id="yb-header-this-is-an-h1">This is an H1<a class="active head-anchor" href="__BASE_PATH__/admin/sample/issue/11#yb-header-this-is-an-h1">#</a></h1><h2 id="yb-header-this-is-an-h2">This is an H2<a class="active head-anchor" href="__BASE_PATH__/admin/sample/issue/11#yb-header-this-is-an-h2">#</a></h2><h3 id="yb-header-this-is-an-h3">This is an H3<a class="active head-anchor" href="__BASE_PATH__/admin/sample/issue/11#yb-header-this-is-an-h3">#</a></h3></div></div></div></li><li class="markdown-help-item markdownStyling" id="markdown-help-markdownStyling"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>*This is an italic* **This is an bold** ~~This is an strike~~</pre></div><div class="span6"><div class="markdown-wrap"><p><em>This is an italic</em><strong>This is an bold</strong><del>This is an strike</del></p></div></div></div></li><li class="markdown-help-item markdownLinks" id="markdown-help-markdownLinks"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>[Site](https://example.com/ "Example Site") https://example.com/</pre></div><div class="span6"><div class="markdown-wrap"><p><a href="https://example.com/" title="Example Site">Site</a></p><p><a href="https://example.com/">https://example.com/</a></p></div></div></div></li><li class="markdown-help-item markdownLists" id="markdown-help-markdownLists"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>- Red 1. White 2. Blue - Green.</pre></div><div class="span6"><div class="markdown-wrap"><ul><li>Red<ol><li>White</li><li>Blue</li></ol></li><li>Green</li></ul></div></div></div></li><li class="markdown-help-item markdownTaskList" id="markdown-help-markdownTaskList"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>- [ ] Todos - [x] To do A - [ ] To do B - [ ] To do C</pre></div><div class="span6"><div class="markdown-wrap"><ul><li><input type="checkbox"></input>Todos<ul><li><input checked="" type="checkbox"></input>To do A</li><li><input type="checkbox"></input>To do B</li><li><input type="checkbox"></input>To do C</li></ul></li></ul></div></div></div></li><li class="markdown-help-item markdownImages" id="markdown-help-markdownImages"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>![title](https://example.com/images/sample.png "Sample image")</pre></div><div class="span6"><div class="markdown-wrap"><p><img src="__BASE_PATH__/legacy-assets/images/ico-like-small.png" title="Sample image"></img></p></div></div></div></li><li class="markdown-help-item markdownBlockquotes" id="markdown-help-markdownBlockquotes"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>> Lorem ipsum dolor sit amet, consectetuer adipiscing elit. > > Aenean commodo ligula eget dolor.</pre></div><div class="span6"><div class="markdown-wrap"><blockquote><p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</p><p>Aenean commodo ligula eget dolor.</p></blockquote></div></div></div></li><li class="markdown-help-item markdownCodes" id="markdown-help-markdownCodes"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>\`function test() {console.log("hello world");}\` \`\`\`javascript function test() { console.log("hello world"); } \`\`\`</pre></div><div class="span6"><div class="markdown-wrap"><p><code>function test() {console.log("hello world");}</code></p><pre><code class="hljs language-javascript"><span class="hljs-function"><span class="hljs-keyword">function</span><span class="hljs-title">test</span>(<span class="hljs-params"></span>)</span>{<span class="hljs-built_in">console</span>.log(<span class="hljs-string">"hello world"</span>); }</code></pre></div></div></div></li><li class="markdown-help-item markdownTables" id="markdown-help-markdownTables"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>| Default | Align center | Align right | | ------------ | :----------: | ------: | | Carrot | Red | 1,000 | | Banana | Yellow | 32,000 |</pre></div><div class="span6"><div class="markdown-wrap"><table><thead><tr><th>Default</th><th style="text-align:center">Align center</th><th style="text-align:right">Align right</th></tr></thead><tbody><tr><td>Carrot</td><td style="text-align:center">Red</td><td style="text-align:right">1,000</td></tr><tr><td>Banana</td><td style="text-align:center">Yellow</td><td style="text-align:right">32,000</td></tr></tbody></table><p>Also, you can copy & paste table from excel sheet</p></div></div></div></li><li class="markdown-help-item markdownShortLinks" id="markdown-help-markdownShortLinks"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>Issue no: #2 Mention: @example commit: @763575 or @763575f177a4ce8b9370954de3ea1a1410205593</pre></div><div class="span6"><div class="markdown-wrap"><p>Issue no:<a href="__BASE_PATH__/example/example/issue/2">#2</a></p><p></p><p>Mention:<a href="__BASE_PATH__/example">@example</a></p><p>commit:<a href="__BASE_PATH__/example/example/commit/763575">@763575</a>or<a href="__BASE_PATH__/example/example/commit/763575f177a4ce8b9370954de3ea1a1410205593">@763575</a></p></div></div></div></li></ul></div><div id="edit-77" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="update-comment-body" markdown="true" id="editor-contents-77">Comment **markdown**</textarea></div></div><div id="preview-77" class="tab-pane"><div class="markdown-preview markdown-wrap update-comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div><div class="right-txt comment-update-button upload-button-line"><span class="file-upload"><label for="upload-77" class="file-upload__label ybtn">File upload</label><input id="upload-77" class="file-upload__input" type="file" name="filePath" multiple=""></span><button type="button" class="ybtn ybtn-cancel" data-comment-id="77">Cancel</button><button type="submit" class="ybtn ybtn-info">Save</button></div></div><input type="hidden" name="temporaryUploadFiles" class="temporaryUploadFiles" value=""><div class="preview-77"></div><div class="attachment-files"></div><div id="upload-77" data-resourcetype="ISSUE_COMMENT" data-resourceid="77"></div></div></form></div>`;
export const COMMENT_FORM = `<form action="__BASE_PATH__/admin/sample/issue/11/comments" enctype="multipart/form-data" id="comment-form" method="post"><div class="write-comment-box"><div class="write-comment-wrap"><div class="markdown-editor mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button class="add-task-list-button ybtn ybtn-danger-no-outline ybtn-small" type="button"><i class="task-list-icon yobicon-list"></i>Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button class="ybtn ybtn-small ybtn-warning" id="button-clear-temporary" type="button">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content"><div class="markdown-help"><ul class="markdown-help-nav"><li><span class="label">Markdown help</span></li><li class="help-nav"><button aria-controls="markdown-help-markdownHeaders" aria-expanded="false" class="markdown-help-nav-button" type="button">Header</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownStyling" aria-expanded="false" class="markdown-help-nav-button" type="button">Text Style</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownLinks" aria-expanded="false" class="markdown-help-nav-button" type="button">Link</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownLists" aria-expanded="false" class="markdown-help-nav-button" type="button">List</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownTaskList" aria-expanded="false" class="markdown-help-nav-button" type="button">Checklist</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownImages" aria-expanded="false" class="markdown-help-nav-button" type="button">Image</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownBlockquotes" aria-expanded="false" class="markdown-help-nav-button" type="button">Blockquote</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownCodes" aria-expanded="false" class="markdown-help-nav-button" type="button">Code</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownTables" aria-expanded="false" class="markdown-help-nav-button" type="button">Table</button></li><li class="help-nav"><button aria-controls="markdown-help-markdownShortLinks" aria-expanded="false" class="markdown-help-nav-button" type="button">Short Link</button></li></ul><ul class="markdown-help-wrap"><li class="markdown-help-item markdownHeaders" id="markdown-help-markdownHeaders"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre># This is an H1 ## This is an H2 ### This is an H3</pre></div><div class="span6"><div class="markdown-wrap"><h1 id="yb-header-this-is-an-h1">This is an H1<a class="active head-anchor" href="__BASE_PATH__/admin/sample/issue/11#yb-header-this-is-an-h1">#</a></h1><h2 id="yb-header-this-is-an-h2">This is an H2<a class="active head-anchor" href="__BASE_PATH__/admin/sample/issue/11#yb-header-this-is-an-h2">#</a></h2><h3 id="yb-header-this-is-an-h3">This is an H3<a class="active head-anchor" href="__BASE_PATH__/admin/sample/issue/11#yb-header-this-is-an-h3">#</a></h3></div></div></div></li><li class="markdown-help-item markdownStyling" id="markdown-help-markdownStyling"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>*This is an italic* **This is an bold** ~~This is an strike~~</pre></div><div class="span6"><div class="markdown-wrap"><p><em>This is an italic</em><strong>This is an bold</strong><del>This is an strike</del></p></div></div></div></li><li class="markdown-help-item markdownLinks" id="markdown-help-markdownLinks"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>[Site](https://example.com/ "Example Site") https://example.com/</pre></div><div class="span6"><div class="markdown-wrap"><p><a href="https://example.com/" title="Example Site">Site</a></p><p><a href="https://example.com/">https://example.com/</a></p></div></div></div></li><li class="markdown-help-item markdownLists" id="markdown-help-markdownLists"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>- Red 1. White 2. Blue - Green.</pre></div><div class="span6"><div class="markdown-wrap"><ul><li>Red<ol><li>White</li><li>Blue</li></ol></li><li>Green</li></ul></div></div></div></li><li class="markdown-help-item markdownTaskList" id="markdown-help-markdownTaskList"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>- [ ] Todos - [x] To do A - [ ] To do B - [ ] To do C</pre></div><div class="span6"><div class="markdown-wrap"><ul><li><input type="checkbox"></input>Todos<ul><li><input checked="" type="checkbox"></input>To do A</li><li><input type="checkbox"></input>To do B</li><li><input type="checkbox"></input>To do C</li></ul></li></ul></div></div></div></li><li class="markdown-help-item markdownImages" id="markdown-help-markdownImages"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>![title](https://example.com/images/sample.png "Sample image")</pre></div><div class="span6"><div class="markdown-wrap"><p><img src="__BASE_PATH__/legacy-assets/images/ico-like-small.png" title="Sample image"></img></p></div></div></div></li><li class="markdown-help-item markdownBlockquotes" id="markdown-help-markdownBlockquotes"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>> Lorem ipsum dolor sit amet, consectetuer adipiscing elit. > > Aenean commodo ligula eget dolor.</pre></div><div class="span6"><div class="markdown-wrap"><blockquote><p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</p><p>Aenean commodo ligula eget dolor.</p></blockquote></div></div></div></li><li class="markdown-help-item markdownCodes" id="markdown-help-markdownCodes"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>\`function test() {console.log("hello world");}\` \`\`\`javascript function test() { console.log("hello world"); } \`\`\`</pre></div><div class="span6"><div class="markdown-wrap"><p><code>function test() {console.log("hello world");}</code></p><pre><code class="hljs language-javascript"><span class="hljs-function"><span class="hljs-keyword">function</span><span class="hljs-title">test</span>(<span class="hljs-params"></span>)</span>{<span class="hljs-built_in">console</span>.log(<span class="hljs-string">"hello world"</span>); }</code></pre></div></div></div></li><li class="markdown-help-item markdownTables" id="markdown-help-markdownTables"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>| Default | Align center | Align right | | ------------ | :----------: | ------: | | Carrot | Red | 1,000 | | Banana | Yellow | 32,000 |</pre></div><div class="span6"><div class="markdown-wrap"><table><thead><tr><th>Default</th><th style="text-align:center">Align center</th><th style="text-align:right">Align right</th></tr></thead><tbody><tr><td>Carrot</td><td style="text-align:center">Red</td><td style="text-align:right">1,000</td></tr><tr><td>Banana</td><td style="text-align:center">Yellow</td><td style="text-align:right">32,000</td></tr></tbody></table><p>Also, you can copy & paste table from excel sheet</p></div></div></div></li><li class="markdown-help-item markdownShortLinks" id="markdown-help-markdownShortLinks"><div class="row-fluid thead"><div class="span6">Markdown Input</div><div class="span6">Markdown Output</div></div><div class="markdwon-syntax-wrap row-fluid"><div class="markdwon-syntax span6"><pre>Issue no: #2 Mention: @example commit: @763575 or @763575f177a4ce8b9370954de3ea1a1410205593</pre></div><div class="span6"><div class="markdown-wrap"><p>Issue no:<a href="__BASE_PATH__/example/example/issue/2">#2</a></p><p></p><p>Mention:<a href="__BASE_PATH__/example">@example</a></p><p>commit:<a href="__BASE_PATH__/example/example/commit/763575">@763575</a>or<a href="__BASE_PATH__/example/example/commit/763575f177a4ce8b9370954de3ea1a1410205593">@763575</a></p></div></div></div></li></ul></div><div class="active tab-pane" id="edit-contents"><div class="textarea-box"><textarea class="comment content editorSeries nm" data-editor-mode="comment-body" id="editor-contents-contents" markdown="true" name="contents"></textarea></div></div><div class="tab-pane" id="preview-contents"><div class="comment-body markdown-preview markdown-wrap" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers</span><span class="notification-receiver-list"></span></div></div></div><div class="content-footer upload-wrap" data-resource-type="ISSUE_COMMENT" id="upload"><div class="attach-wrap"><span class="help help-droppable">Drag & Drop files to attach here or</span><div class="btn-wrap"><div class="fake-file-wrap medium nbtn white"><i class="yobicon-upload"></i>File upload<input class="file" multiple="" name="filePath" type="file"></input></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="help"><i class="yobicon-supportrequest"></i>Selected file will be attached when your comment is saved.</p></div><div><button class="ybtn" id="dynamic-comment-btn" type="button">Close issue</button><button class="ybtn ybtn-success" type="submit">Add a comment</button></div></div></div></form>`;
export const CHILD_COMMENT_ANCHORS = `<div id="comment-78"></div>`;
export const CHILD_COMMENTS = `<div class="add-a-comment pull-right">Reply</div><div class="subcomment-media-body"><div class="child-comments"><div class="one-line-comment"><div class="contents"><p>Child <strong>reply</strong></p><span class="subcomment-author hide">- <a href="__BASE_PATH__/qa1" class="usf-group" title="qa1"><strong>QA One</strong></a><a href="__BASE_PATH__/admin/sample/issue/11#comment-78" class="ago" title="Jul 2, 2026">Jul 2, 2026</a><button type="button" class="btn-transparent deleteButtonX" title="Delete comment">x</button></span></div></div></div><div class="child-comment-input-form"><form action="__BASE_PATH__/admin/sample/issue/11/comments" method="post" enctype="multipart/form-data"><input class="parentCommentId" type="hidden" name="parentCommentId" value="77"><div class="oneline-comment-box"><textarea class="editorSeries" name="contents" markdown="true" rows="1" placeholder="__CHILD_REPLY_PLACEHOLDER__"></textarea><button type="submit" class="ybtn ybtn-success">OK</button></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></form></div></div>`;
export const LEFT_COMMENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">1</strong></div><hr class="nm"><ul class="comments"><li class="comment " id="comment-77">${CHILD_COMMENT_ANCHORS}<div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="Dev Member"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author"><span class="resp-comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="dev"></a></span><a href="__BASE_PATH__/dev" data-placement="top" title="dev"><strong>Dev Member</strong></a></span><span class="ago-date"><a href="__BASE_PATH__/admin/sample/issue/11#comment-77" class="ago" title="Jul 2, 2026">Jul 2, 2026</a><a href="__BASE_PATH__/admin/sample/issue/11#comment-77" class="share-link" style="display:none">[Link]</a></span><span class="act-row pull-right"><span class="new-issue-by"><a href="__BASE_PATH__/user/issues/new?commentId=77">Reference in new issue</a></span><button type="button" class="btn-transparent-with-fontsize-lineheight" title="Agree"><i class="yobicon-hearts vote-heart-off"></i></button><button type="button" class="btn-transparent-with-fontsize-lineheight ml10" data-comment-id="77" title="Edit comment"><i class="yobicon-edit-2"></i></button><button type="button" class="btn-transparent-with-fontsize-lineheight ml6" title="Delete comment"><i class="yobicon-trash"></i></button></span></div>${COMMENT_UPDATE_FORM}<div id="comment-body-77">${TASKLIST}<div class="comment-body markdown-wrap" data-allowed-update="true" data-via-email="false"><p>Comment <strong>markdown</strong></p></div><div class="attachments pull-left" data-attachments="[]"></div></div></div>${CHILD_COMMENTS}</li></ul></div></div>${COMMENT_FORM}</div>`;
export const RIGHT_INDEX_COMMENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><strong>Comment</strong> <strong class="num">1</strong></div><ul class="comments"><li class="comment index-comment  " id="comment-77" data-location="#comment-77"><div><div id="comment-body-77"><div class="comment-body"><a href="__BASE_PATH__/admin/sample/issue/11#comment-77">Comment markdown</a></div></div><div class="index-comment-author"><span class="comment-exists"><i class="yobicon-comment2"></i></span><span class="comment_author"><a href="__BASE_PATH__/dev" data-placement="top" title="dev"><strong>Dev Member</strong></a></span><span class="ago-date"><a href="__BASE_PATH__/admin/sample/issue/11#comment-77" class="ago" title="Jul 2, 2026">Jul 2, 2026</a><a href="__BASE_PATH__/admin/sample/issue/11#comment-77" class="share-link" style="display:none">[Link]</a></span></div></div></li></ul></div></div></div>`;
export const LEFT_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-88"><span class="state closed">Closed</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> closed this issue<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-88">Jul 3, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_ASSIGNEE_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-90"><span class="state changed">Assigned</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> assigned this issue to <a href="__BASE_PATH__/admin" class="usf-group" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/admin" class="usf-group" data-placement="top" title="admin"><strong>Site Admin</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-90">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_MILESTONE_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-91"><span class="state milestone-changed">Update milestone</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> changed milestone to <span class="bold font-blue"><a href="__BASE_PATH__/admin/sample/milestone/5" data-placement="bottom" title="Milestone">v1.0</a></span><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-91">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_NULL_MILESTONE_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-99"><span class="state milestone-changed">Update milestone</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> changed milestone to <span class="bold">None</span><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-99">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_MOVED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-92"><span class="state changed">moved</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> moved this issue from <strong><a href="__BASE_PATH__/old-owner/old-project" class="link">old-owner/old-project</a></strong><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-92">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_COMMIT_REFERRED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-93"><span class="state changed">mentioned</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> mentioned this issue in <strong>Commit <a href="__BASE_PATH__/admin/sample/commit/abcdef0?branch=&path=" class="link">@abcdef0</a></strong><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-93">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_PULL_REQUEST_REFERRED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-94"><span class="state changed">mentioned</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> mentioned this issue in <strong>Pull request -3 <a href="__BASE_PATH__/admin/sample/pullRequest/3" class="link">Fix login redirect</a></strong><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-94">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_SHARER_ADDED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-95"><span class="state sharer-added">Issue Sharer</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> shared current issue to <a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="qa1"><strong>QA One</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-95">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_SHARER_DELETED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-96"><span class="state sharer-deleted">Cancelled</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> cancelled issue sharing with <a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="qa1"><strong>QA One</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-96">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_LABEL_ADDED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-97"><span class="state label-added">Added</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> added <div class="issue-label active label" data-label-id="8" style="background-color: rgb(81, 170, 204);box-shadow: rgb(81, 170, 204) 2px 0px 0px inset;color: white;border: 0px">bug</div> label<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-97">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_LABEL_DELETED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-98"><span class="state label-deleted">Removed</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> removed <div class="issue-label active label" data-label-id="8" style="background-color: rgb(81, 170, 204);box-shadow: rgb(81, 170, 204) 2px 0px 0px inset;color: white;border: 0px">bug</div> label<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-98">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_CONSECUTIVE_SHARER_ADDED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-100"><span class="state sharer-added">Issue Sharer</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> shared current issue to <a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa1" class="usf-group" data-placement="top" title="qa1"><strong>QA One</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-100">Jul 4, 2026</a></span></li><li class="event" id="event-101"><span class="state"></span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> shared current issue to <a href="__BASE_PATH__/qa2" class="usf-group" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/qa2" class="usf-group" data-placement="top" title="qa2"><strong>QA Two</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-101">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_CONSECUTIVE_LABEL_DELETED_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-102"><span class="state label-deleted">Removed</span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> removed <div class="issue-label active label" data-label-id="8" style="background-color: rgb(81, 170, 204);box-shadow: rgb(81, 170, 204) 2px 0px 0px inset;color: white;border: 0px">bug</div> label<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-102">Jul 4, 2026</a></span></li><li class="event" id="event-103"><span class="state"></span><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a> removed <div class="issue-label active label" data-label-id="8" style="background-color: rgb(81, 170, 204);box-shadow: rgb(81, 170, 204) 2px 0px 0px inset;color: white;border: 0px">bug</div> label<span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-103">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;
export const LEFT_DEFAULT_EVENT_TIMELINE = `<div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i></i><strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"><li class="event" id="event-89">fallback noteby <a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" class="avatar-wrap small"></a><a href="__BASE_PATH__/dev" class="usf-group" data-placement="top" title="dev"><strong>Dev Member</strong></a><span class="date"><a href="__BASE_PATH__/admin/sample/issue/11#event-89">Jul 4, 2026</a></span></li></ul></div></div>${COMMENT_FORM}</div>`;

export function commentVoters() {
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

export async function issueVoterAvatarOrderMetrics(page: Page) {
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

export async function commentUpdateFormMetrics(page: Page) {
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

export async function childCommentAnchorMetrics(page: Page) {
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

export async function commentVoterModalMetrics(page: Page) {
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

export async function issueDetailShellMetrics(page: Page) {
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

export async function indexCommentMetrics(page: Page) {
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

export async function issueCommentMetrics(page: Page) {
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

export async function eventTimelineMetrics(page: Page, selector: string) {
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

export async function childIssueMetrics(page: Page) {
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

export async function selectedLabelMetrics(page: Page) {
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

export async function keymapModalMetrics(page: Page) {
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

export async function protectedIssueShellMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const search = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
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
      // F6 copy-fix-current-dom: the app GNB shell is Style-only by the
      // suite-wide accepted state (see the not.toHaveClass negative pin above;
      // legacy navbar.scala.html:36 classes are not rendered); strip x-tokens
      // like project-code-commit-detail.e2e.ts readCommitDetailNavbarMetrics.
      gnbClassName: navbar.className
        .split(/\s+/u)
        .filter((token) => token && !/^x[0-9a-z]+$/u.test(token))
        .join(" "),
      searchBottomWithinNavbar: Math.round(searchRect.bottom) <= Math.round(navbarRect.bottom),
      searchLeftWithinNavbar: Math.round(searchRect.left) >= Math.round(navbarRect.left),
      searchRightWithinNavbar: Math.round(searchRect.right) <= Math.round(navbarRect.right),
      searchTopWithinNavbar: Math.round(searchRect.top) >= Math.round(navbarRect.top),
    };
  });
}

export async function dueDateInlineUpdateMetrics(page: Page) {
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

export async function mockProjectIssueDetail(
  page: Page,
  issueOverrides: Record<string, unknown> = {},
) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
    };
  }, process.env.YONA_DEV_BASE_PATH ?? "/yona");
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
  const commentCreateRequests: { body: Record<string, unknown>; method: string }[] = [];
  const commentUpdateRequests: { body: Record<string, unknown>; method: string }[] = [];
  const commentVoteRequests: { csrfToken: string | null; method: string }[] = [];
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const issueDetailRequests: string[] = [];
  const issueVoteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const watchRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const issueWeightRequests: { csrfToken: string | null; method: string; url: string }[] = [];
  const issueStateRequests: { body: Record<string, unknown>; method: string }[] = [];
  const massUpdateRequests: { body: unknown; csrfToken: string | null; method: string }[] = [];
  const sharerRequests: { loginId: string; method: string; targetType: string | null }[] = [];
  const sharableSearchQueries: string[] = [];
  const assignableSearchQueries: string[] = [];
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
  // Boot always queries /api/v1/workspace; without a mock the WTR server 404s
  // (43-byte not_found JSON) and the workspace retry loop keeps re-navigating
  // the iframe document, so the goto's load event never settles.
  // `**/api/v1/workspace` is $  -anchored by globToRegExp, so it never matches
  // the /workspace/recent-projects + /workspace/profile sub-queries; use the
  // trailing ** to cover every workspace subpath the boot may hit.
  await page.route("**/api/v1/workspace**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      }),
    });
  });
  // app's auth-workspace-client fetches ${apiBaseUrl}/auth/session (no /v1/);
  // the /api/v1/session route above serves the REST session query.
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      body: JSON.stringify(sessionResponse),
    });
  });
  await page.route(`**${containerPath}**`, async (route) => {
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
    `**/api/v1/projects/${ownerName}/${projectName}/issues/form-options`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          canCreateIssueAssignee: true,
          canCreateIssueMilestone: true,
          canManageIssueLabels: true,
          currentProject: {
            logoUrl: "/assets/images/project_default_logo.png",
            ownerName,
            projectId: 7,
            projectName,
          },
          issueTemplateMarkdown: "Template body",
          movableIssueProjects: [],
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
      if ("assigneeLoginId" in body) {
        effectiveIssueOverrides.assigneeLoginId = String(body.assigneeLoginId ?? "");
        effectiveIssueOverrides.assigneeLabel =
          effectiveIssueOverrides.assigneeLoginId === "qa" ? "QA Member" : "";
      }
      if ("milestoneId" in body) {
        effectiveIssueOverrides.milestoneId = body.milestoneId;
        effectiveIssueOverrides.milestoneTitle =
          String(body.milestoneId ?? "") === "9" ? "v2.0" : "";
      }
      if (Array.isArray(body.labelIds)) {
        effectiveIssueOverrides.labels = labelsResponse.filter((label) =>
          body.labelIds.includes(Number(label.id)),
        );
      }
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
    if (route.request().method() === "PUT") {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      issueStateRequests.push({ body, method: route.request().method() });
      effectiveIssueOverrides.state = String(body.state ?? "open");
      await route.fulfill({ contentType: "application/json", body: "{}" });
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
  await page.route(`**${detailPath}/state`, async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    issueStateRequests.push({ body, method: route.request().method() });
    effectiveIssueOverrides.state = String(body.state ?? "open");
    await route.fulfill({ contentType: "application/json", body: "{}" });
  });
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/issues/${issueNumber}/comments/77`,
    async (route) => {
      if (route.request().method() === "DELETE") {
        commentDeleteRequests.push(route.request().method());
        await route.fulfill({ status: 204 });
        return;
      }
      if (route.request().method() === "PUT") {
        const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
        commentUpdateRequests.push({ body, method: route.request().method() });
        await route.fulfill({ contentType: "application/json", body: "{}" });
        return;
      }
      await route.fallback();
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/issues/${issueNumber}/comments`,
    async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      commentCreateRequests.push({ body, method: route.request().method() });
      await route.fulfill({ contentType: "application/json", body: "{}" });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/issues/${issueNumber}/sharable-users**`,
    async (route) => {
      sharableSearchQueries.push(new URL(route.request().url()).searchParams.get("query") ?? "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              avatarUrl: "/assets/images/default-avatar-32.png",
              displayName: "QA Member",
              loginId: "qa",
            },
          ],
          total: 1,
          truncated: false,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/issues/${issueNumber}/assignable-users**`,
    async (route) => {
      assignableSearchQueries.push(new URL(route.request().url()).searchParams.get("query") ?? "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              avatarUrl: "/assets/images/default-avatar-32.png",
              displayName: "QA Member",
              loginId: "qa",
            },
          ],
          total: 1,
          truncated: false,
        }),
      });
    },
  );
  // sharers** (not sharers/**): the glob is $-anchored, so the bare POST
  // /sharers must match the trailing ** itself; sharers/** misses it.
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/issues/${issueNumber}/sharers**`,
    async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      // shareIssueRest POSTs to /sharers with loginId in the body;
      // unshareIssueRest DELETEs /sharers/{loginId}.
      const loginId =
        method === "POST"
          ? String(route.request().postDataJSON()?.loginId ?? "")
          : decodeURIComponent(url.pathname.split("/").pop() ?? "");
      sharerRequests.push({
        loginId,
        method,
        targetType: url.searchParams.get("targetType"),
      });
      await route.fulfill({ contentType: "application/json", body: "{}" });
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
    assignableSearchQueries,
    commentCreateRequests,
    commentDeleteRequests,
    commentUpdateRequests,
    commentVoteRequests,
    deleteRequests,
    favoriteRequests,
    issueDetailRequests,
    issueStateRequests,
    issueVoteRequests,
    issueWeightRequests,
    massUpdateRequests,
    sharableSearchQueries,
    sharerRequests,
    watchRequests,
  };
}

export async function issueNotFoundMetrics(page: Page) {
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
      // copy-fix-current-dom: strip app-owned style tokens from the raw class
      // (canonicalizer gap; legacy pins "ico ico-err2")
      iconClass: (icon.getAttribute("class") ?? "")
        .split(/\s+/u)
        .filter((token) => token && !/^x[0-9a-z]+$/u.test(token))
        .join(" "),
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

export async function headTitleText(page: Page) {
  return page.evaluate(() => document.querySelector("head > title")?.textContent ?? "");
}

export async function lastHeadMetaContent(page: Page, selector: string) {
  return page.evaluate((metaSelector) => {
    const matches = document.querySelectorAll<HTMLMetaElement>(metaSelector);
    return matches.item(matches.length - 1)?.content ?? "";
  }, selector);
}

export async function commentDeleteModalMetrics(page: Page) {
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

export async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      // copy-fix-current-dom: legacy select2 JS generates .select2-container
      // wrappers next to the source inputs (issue/view.scala.html sharer/label
      // inputs); the app owns that DOM natively — drop it on both sides
      if (
        node instanceof HTMLElement &&
        (node.classList.contains("select2-container") || node.classList.contains("select2-drop"))
      ) {
        return "";
      }
      // copy-fix-current-dom: legacy help-nav items are plain text
      // (markdown.scala.html:14-23); the app wraps each in a button
      // (markdown-editor.tsx) — unwrap the button to its text on both sides
      if (
        node.tagName === "BUTTON" &&
        (node as HTMLElement).classList.contains("markdown-help-nav-button")
      ) {
        return normalizeText(node.textContent ?? "");
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            attr.name !== "data-owner-instance" &&
            // copy-fix-current-dom: the due-date picker button (issue-due-date-
            // input.tsx) carries React-owned aria-label={t("issue.dueDate")};
            // legacy due-date inputs render a plain calendar button
            !(attr.name === "aria-label" && attr.value === "Due date") &&
            attr.name !== "aria-controls" &&
            !(attr.name === "id" && /^_r_\d+_$/u.test(attr.value)) &&
            // copy-fix-current-dom: app gives markdown-help items ids
            // (markdown-help-markdownHeaders etc.) that legacy never renders
            // (markdown.scala.html:26 plain <li>) — drop on both sides
            !(attr.name === "id" && /^markdown-help-/u.test(attr.value)) &&
            (node.tagName !== "A" || !attr.name.startsWith("data-")) &&
            attr.name !== "readonly" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            attr.name !== "data-owner-issue-info" &&
            // data-yobicon: React-owned glyph metadata on yobicon icons
            // (yobicon component); legacy <i> icons carry no such attribute
            attr.name !== "data-yobicon" &&
            !(attr.name === "class" && normalizeAttr(attr) === "") &&
            // copy-fix-current-dom: legacy hides the comment share-link via
            // inline style="display:none" (partial_comment.scala.html:44); the
            // app owns the hidden state via style shareLinkHidden
            // (-issue-detail.style.ts:93) — drop the style attr on both sides
            !(attr.name === "style" && normalizeAttr(attr) === "display:none") &&
            // copy-fix-current-dom: legacy editor tab-content pins an inline
            // style="position:relative;overflow:visible" (editor.scala.html);
            // the app owns it via style editorTabContent
            // (-issue-detail.style.ts:481-484) — drop on both sides
            !(
              attr.name === "style" && normalizeAttr(attr) === "position:relative;overflow:visible"
            ),
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              // pull-left/pull-right: app owns the comment attachments float
              // (commentAttachments -issue-detail.style.ts:316-318) and the
              // child-comment Reply float (childCommentReply :324-335) via
              // style; legacy renders literal classes
              // (partial_comment.scala.html:112, childComments.scala.html:62)
              token !== "pull-left" &&
              token !== "pull-right" &&
              // copy-fix-current-dom: strip app-owned shell/voter tokens that
              // legacy templates never render (issue/view.scala.html page shell,
              // partial_voters.scala.html:19 plain <li>)
              token !== "issue-detail-page" &&
              token !== "voter-list-item" &&
              // React-owned modal chrome (ModalDialog); legacy modals render a
              // plain modal-header div (partial_voters.scala.html,
              // postingHistory.scala.html)
              !token.startsWith("issue-detail-") &&
              token !== "issue-detail-modal-section" &&
              // issue-detail-task-done-counter: React-owned tasklist marker
              // (TasklistBar); legacy tasklistBar.scala.html renders a plain
              // done-counter span
              token !== "issue-detail-task-done-counter" &&
              // issue-detail-modal-close: React-owned dialog close token
              // (modal close buttons in $issueNumber.tsx); legacy modals pin
              // class="close" only (postingHistory.scala.html)
              token !== "issue-detail-modal-close" &&
              // issue-detail-modal-footer: React-owned dialog footer token
              // (ModalDialog footer); legacy modals pin modal-footer only
              token !== "issue-detail-modal-footer" &&
              // issue-detail-child-comment-reply-hidden: React-owned hidden
              // child-reply state (ChildComments); legacy partial pins the
              // plain add-a-comment class
              token !== "issue-detail-child-comment-reply-hidden" &&
              // ml10/ml6/pt5px/mb10: app owns issue/comment action spacing via
              // style (issueActionEdit/commentActionEdit/sharerTitle in
              // -issue-detail.style.ts:293-313); legacy view.scala.html:237,
              // :252 and partial_comment.scala.html:99 render literal classes
              token !== "ml10" &&
              token !== "ml6" &&
              token !== "pt5px" &&
              token !== "mb10" &&
              // mb20: app owns the right-pane margin-bottom via style sidebar
              // (-issue-detail.style.ts:348-350); legacy view.scala.html:293
              // renders the literal class
              token !== "mb20" &&
              // select2-offscreen: React select2 replacement hides the source
              // select offscreen (legacy select2 JS does the same via plugin
              // CSS) — plugin-owned class, not part of the user-visible DOM
              token !== "select2-offscreen" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .sort()
          .join(" ");
      }
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value
        .replace(/\s+/g, "")
        .replace(/;$/u, "")
        .replace(/--x-width:([^;]+)/gu, "width:$1")
        // copy-fix-current-dom: subtask progress bars paint via
        // --x-subtask-progress-width (SubtaskListBar); legacy
        // common/tasklistBar.scala.html:6 pins style="width: N%"
        .replace(/--x-subtask-progress-width:([^;]+)/gu, "width:$1")
        // copy-fix-current-dom: TasklistBar's task-title carries React-owned
        // font-weight:500 inline (legacy tasklistBar.scala.html:4-6 pins only
        // style="width: N%") — strip it on both sides
        .replace(/^font-weight:500;/u, "")
        // copy-fix-current-dom: TasklistBar paints via dynamic style props
        // (taskProgressBar in -issue-detail.style.ts:480); legacy
        // common/tasklistBar.scala.html:6 pins a bare `style="width: N;"`.
        .replace(/^--x-backgroundColor:var\(--x[a-z0-9]+\);width:(\d+(?:\.\d+)?)%$/u, "width:$1")
        // copy-fix-current-dom: TasklistBar's progress bar paints via inline
        // style props (TasklistBar in $issueNumber.tsx); legacy
        // common/tasklistBar.scala.html:6 pins only style="width: N;" — strip
        // the React-owned paint tokens and map --x-task-progress-width.
        .replace(
          /^background-color:[^;]+;height:2px;transition-duration:0.2s;--x-task-progress-width:(\d+(?:\.\d+)?)%$/u,
          "width:$1",
        );
      // copy-fix-current-dom: IssueLabel paints via expanded style props; legacy
      // pins a single background:rgb(...) (partial_list_subtask.scala.html label chip)
      const labelPaint = normalized.match(
        /^background-color:rgb\((\d+,\d+,\d+)\);box-shadow:rgb\(\1\)2px0px0pxinset;color:(?:white|dimgray);border:0px$/u,
      );
      if (labelPaint) {
        return `background:rgb(${labelPaint[1]})`;
      }
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
  });
}

export async function canonicalizeAll(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((roots) => {
    return roots.map((root) => visit(root)).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      // copy-fix-current-dom: legacy select2 JS generates .select2-container
      // wrappers next to the source inputs (issue/view.scala.html sharer/label
      // inputs); the app owns that DOM natively — drop it on both sides
      if (
        node instanceof HTMLElement &&
        (node.classList.contains("select2-container") || node.classList.contains("select2-drop"))
      ) {
        return "";
      }
      // copy-fix-current-dom: legacy help-nav items are plain text
      // (markdown.scala.html:14-23); the app wraps each in a button
      // (markdown-editor.tsx) — unwrap the button to its text on both sides
      if (
        node.tagName === "BUTTON" &&
        (node as HTMLElement).classList.contains("markdown-help-nav-button")
      ) {
        return normalizeText(node.textContent ?? "");
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            attr.name !== "data-owner-instance" &&
            attr.name !== "aria-controls" &&
            !(attr.name === "id" && /^_r_\d+_$/u.test(attr.value)) &&
            // copy-fix-current-dom: app gives markdown-help items ids
            // (markdown-help-markdownHeaders etc.) that legacy never renders
            // (markdown.scala.html:26 plain <li>) — drop on both sides
            !(attr.name === "id" && /^markdown-help-/u.test(attr.value)) &&
            (node.tagName !== "A" || !attr.name.startsWith("data-")) &&
            attr.name !== "readonly" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            attr.name !== "data-owner-issue-info" &&
            // data-yobicon: React-owned glyph metadata on yobicon icons
            // (yobicon component); legacy <i> icons carry no such attribute
            attr.name !== "data-yobicon" &&
            !(attr.name === "class" && normalizeAttr(attr) === "") &&
            // copy-fix-current-dom: legacy hides the comment share-link via
            // inline style="display:none" (partial_comment.scala.html:44); the
            // app owns the hidden state via style shareLinkHidden
            // (-issue-detail.style.ts:93) — drop the style attr on both sides
            !(attr.name === "style" && normalizeAttr(attr) === "display:none") &&
            // copy-fix-current-dom: legacy editor tab-content pins an inline
            // style="position:relative;overflow:visible" (editor.scala.html);
            // the app owns it via style editorTabContent
            // (-issue-detail.style.ts:481-484) — drop on both sides
            !(
              attr.name === "style" && normalizeAttr(attr) === "position:relative;overflow:visible"
            ),
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              // pull-left/pull-right: app owns the comment attachments float
              // (commentAttachments -issue-detail.style.ts:316-318) and the
              // child-comment Reply float (childCommentReply :324-335) via
              // style; legacy renders literal classes
              // (partial_comment.scala.html:112, childComments.scala.html:62)
              token !== "pull-left" &&
              token !== "pull-right" &&
              // copy-fix-current-dom: strip app-owned shell/voter tokens that
              // legacy templates never render (issue/view.scala.html page shell,
              // partial_voters.scala.html:19 plain <li>)
              token !== "issue-detail-page" &&
              token !== "voter-list-item" &&
              // React-owned modal chrome (ModalDialog); legacy modals render a
              // plain modal-header div (partial_voters.scala.html,
              // postingHistory.scala.html)
              !token.startsWith("issue-detail-") &&
              token !== "issue-detail-modal-section" &&
              // issue-detail-task-done-counter: React-owned tasklist marker
              // (TasklistBar); legacy tasklistBar.scala.html renders a plain
              // done-counter span
              token !== "issue-detail-task-done-counter" &&
              // ml10/ml6/pt5px/mb10: app owns issue/comment action spacing via
              // style (issueActionEdit/commentActionEdit/sharerTitle in
              // -issue-detail.style.ts:293-313); legacy view.scala.html:237,
              // :252 and partial_comment.scala.html:99 render literal classes
              token !== "ml10" &&
              token !== "ml6" &&
              token !== "pt5px" &&
              token !== "mb10" &&
              // mb20: app owns the right-pane margin-bottom via style sidebar
              // (-issue-detail.style.ts:348-350); legacy view.scala.html:293
              // renders the literal class
              token !== "mb20" &&
              // select2-offscreen: React select2 replacement hides the source
              // select offscreen (legacy select2 JS does the same via plugin
              // CSS) — plugin-owned class, not part of the user-visible DOM
              token !== "select2-offscreen" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .sort()
          .join(" ");
      }
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value
        .replace(/\s+/g, "")
        .replace(/;$/u, "")
        .replace(/--x-width:([^;]+)/gu, "width:$1")
        // copy-fix-current-dom: subtask progress bars paint via
        // --x-subtask-progress-width (SubtaskListBar); legacy
        // common/tasklistBar.scala.html:6 pins style="width: N%"
        .replace(/--x-subtask-progress-width:([^;]+)/gu, "width:$1")
        // copy-fix-current-dom: TasklistBar's task-title carries React-owned
        // font-weight:500 inline (legacy tasklistBar.scala.html:4-6 pins only
        // style="width: N%") — strip it on both sides
        .replace(/^font-weight:500;/u, "")
        // copy-fix-current-dom: TasklistBar paints via dynamic style props
        // (taskProgressBar in -issue-detail.style.ts:480); legacy
        // common/tasklistBar.scala.html:6 pins a bare `style="width: N;"`.
        .replace(/^--x-backgroundColor:var\(--x[a-z0-9]+\);width:(\d+(?:\.\d+)?)%$/u, "width:$1");
      // copy-fix-current-dom: IssueLabel paints via expanded style props; legacy
      // pins a single background:rgb(...) (partial_list_subtask.scala.html label chip)
      const labelPaint = normalized.match(
        /^background-color:rgb\((\d+,\d+,\d+)\);box-shadow:rgb\(\1\)2px0px0pxinset;color:(?:white|dimgray);border:0px$/u,
      );
      if (labelPaint) {
        return `background:rgb(${labelPaint[1]})`;
      }
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
  });
}

export async function canonicalizeHtml(page: Page, html: string) {
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
      // copy-fix-current-dom: legacy select2 JS generates .select2-container
      // wrappers next to the source inputs (issue/view.scala.html sharer/label
      // inputs); the app owns that DOM natively — drop it on both sides
      if (
        node instanceof HTMLElement &&
        (node.classList.contains("select2-container") || node.classList.contains("select2-drop"))
      ) {
        return "";
      }
      // copy-fix-current-dom: legacy help-nav items are plain text
      // (markdown.scala.html:14-23); the app wraps each in a button
      // (markdown-editor.tsx) — unwrap the button to its text on both sides
      if (
        node.tagName === "BUTTON" &&
        (node as HTMLElement).classList.contains("markdown-help-nav-button")
      ) {
        return normalizeText(node.textContent ?? "");
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            attr.name !== "data-owner-instance" &&
            attr.name !== "aria-controls" &&
            !(attr.name === "id" && /^_r_\d+_$/u.test(attr.value)) &&
            // copy-fix-current-dom: app gives markdown-help items ids
            // (markdown-help-markdownHeaders etc.) that legacy never renders
            // (markdown.scala.html:26 plain <li>) — drop on both sides
            !(attr.name === "id" && /^markdown-help-/u.test(attr.value)) &&
            attr.name !== "data-owner" &&
            attr.name !== "data-owner-issue-info" &&
            // data-yobicon: React-owned glyph metadata on yobicon icons
            // (yobicon component); legacy <i> icons carry no such attribute
            attr.name !== "data-yobicon" &&
            !isRemovedReactOwnedDataApi(attr) &&
            (node.tagName !== "A" || !attr.name.startsWith("data-")) &&
            !(attr.name === "class" && normalizeAttr(attr) === "") &&
            // copy-fix-current-dom: legacy hides the comment share-link via
            // inline style="display:none" (partial_comment.scala.html:44); the
            // app owns the hidden state via style shareLinkHidden
            // (-issue-detail.style.ts:93) — drop the style attr on both sides
            !(attr.name === "style" && normalizeAttr(attr) === "display:none") &&
            // copy-fix-current-dom: legacy editor tab-content pins an inline
            // style="position:relative;overflow:visible" (editor.scala.html);
            // the app owns it via style editorTabContent
            // (-issue-detail.style.ts:481-484) — drop on both sides
            !(
              attr.name === "style" && normalizeAttr(attr) === "position:relative;overflow:visible"
            ),
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              // pull-left/pull-right: app owns the comment attachments float
              // (commentAttachments -issue-detail.style.ts:316-318) and the
              // child-comment Reply float (childCommentReply :324-335) via
              // style; legacy renders literal classes
              // (partial_comment.scala.html:112, childComments.scala.html:62)
              token !== "pull-left" &&
              token !== "pull-right" &&
              // copy-fix-current-dom: strip app-owned shell/voter tokens that
              // legacy templates never render (issue/view.scala.html page shell,
              // partial_voters.scala.html:19 plain <li>)
              token !== "issue-detail-page" &&
              token !== "voter-list-item" &&
              // React-owned modal chrome (ModalDialog); legacy modals render a
              // plain modal-header div (partial_voters.scala.html,
              // postingHistory.scala.html)
              !token.startsWith("issue-detail-") &&
              token !== "issue-detail-modal-section" &&
              // issue-detail-task-done-counter: React-owned tasklist marker
              // (TasklistBar); legacy tasklistBar.scala.html renders a plain
              // done-counter span
              token !== "issue-detail-task-done-counter" &&
              // ml10/ml6/pt5px/mb10: app owns issue/comment action spacing via
              // style (issueActionEdit/commentActionEdit/sharerTitle in
              // -issue-detail.style.ts:293-313); legacy view.scala.html:237,
              // :252 and partial_comment.scala.html:99 render literal classes
              token !== "ml10" &&
              token !== "ml6" &&
              token !== "pt5px" &&
              token !== "mb10" &&
              // mb20: app owns the right-pane margin-bottom via style sidebar
              // (-issue-detail.style.ts:348-350); legacy view.scala.html:293
              // renders the literal class
              token !== "mb20" &&
              // select2-offscreen: React select2 replacement hides the source
              // select offscreen (legacy select2 JS does the same via plugin
              // CSS) — plugin-owned class, not part of the user-visible DOM
              token !== "select2-offscreen" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .sort()
          .join(" ");
      }
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value
        .replace(/\s+/g, "")
        .replace(/;$/u, "")
        .replace(/--x-width:([^;]+)/gu, "width:$1")
        // copy-fix-current-dom: subtask progress bars paint via
        // --x-subtask-progress-width (SubtaskListBar); legacy
        // common/tasklistBar.scala.html:6 pins style="width: N%"
        .replace(/--x-subtask-progress-width:([^;]+)/gu, "width:$1")
        // copy-fix-current-dom: TasklistBar's task-title carries React-owned
        // font-weight:500 inline (legacy tasklistBar.scala.html:4-6 pins only
        // style="width: N%") — strip it on both sides
        .replace(/^font-weight:500;/u, "")
        // copy-fix-current-dom: TasklistBar paints via dynamic style props
        // (taskProgressBar in -issue-detail.style.ts:480); legacy
        // common/tasklistBar.scala.html:6 pins a bare `style="width: N;"`.
        .replace(/^--x-backgroundColor:var\(--x[a-z0-9]+\);width:(\d+(?:\.\d+)?)%$/u, "width:$1");
      // copy-fix-current-dom: IssueLabel paints via expanded style props; legacy
      // pins a single background:rgb(...) (partial_list_subtask.scala.html label chip)
      const labelPaint = normalized.match(
        /^background-color:rgb\((\d+,\d+,\d+)\);box-shadow:rgb\(\1\)2px0px0pxinset;color:(?:white|dimgray);border:0px$/u,
      );
      if (labelPaint) {
        return `background:rgb(${labelPaint[1]})`;
      }
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

export async function setBrowserLanguage(page: Page, language: string) {
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

export async function childReplyPlaceholder(page: Page) {
  return page.evaluate(() =>
    navigator.userAgent.toLowerCase().includes("macintosh")
      ? "Reply (⌘ + ENTER)"
      : "Reply (CTRL + ENTER)",
  );
}

export async function expectIssueDetailSelect2Partial(page: Page, basePath: string) {
  const select2Scripts = [
    `${basePath}/assets/javascripts/lib/select2/select2.js`,
    `${basePath}/assets/javascripts/common/yobi.ui.Select2.js`,
  ];
  for (const src of select2Scripts) {
    const scripts = page.locator(`script[src="${src}"]`);
    await expect(scripts).toHaveCount(1);
    await expect(scripts.first()).toHaveAttribute("defer", "");
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

export async function expectLegacyTopHoverPopover(
  page: Page,
  targetSelector: string,
  content: string,
) {
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

export async function expectIssueDetailTooltipMetadata(page: Page) {
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

export async function expectIssueDetailAssets(page: Page, basePath: string) {
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

export async function lastCopiedText(page: Page) {
  return page.evaluate(
    () => (window as typeof window & { __lastCopiedText?: string }).__lastCopiedText ?? "",
  );
}

export async function installClipboardSpy(page: Page) {
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

export async function rootModalBridgeHits(page: Page) {
  return page.evaluate(
    () =>
      (window as typeof window & { __rootModalBridgeHits?: string[] }).__rootModalBridgeHits ?? [],
  );
}

export async function armRootModalBridgeTrap(page: Page) {
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
