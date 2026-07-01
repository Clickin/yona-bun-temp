import { expect, test, type Page } from "@playwright/test";

const BUG_LABEL_STYLE =
  "background-color:rgb(81, 170, 204);box-shadow:rgb(81, 170, 204) 2px 0px 0px 0px inset;color:white";

const BOARD_LIST_KEYMAP = `<div class="pull-left" style="padding:10px 0px;margin-left:55px"><a href="#helpKeys" data-toggle="modal" class="ybtn ybtn-inverse ybtn-mini">Keyboard shortcuts</a><div id="helpKeys" class="modal hide fade keymap-help" tabindex="-1" role="dialog"><div class="row-fluid"><div class="span3"><h5>projects</h5><span class="ybtn ybtn-small">H</span><span class="help-inline">Home</span><br><span class="ybtn ybtn-small">B</span><span class="help-inline">Board</span><br><span class="ybtn ybtn-small">I</span><span class="help-inline">Issue</span><br><span class="ybtn ybtn-small">C</span><span class="help-inline">Code</span><br><span class="ybtn ybtn-small">M</span><span class="help-inline">Milestone</span><br><span class="ybtn ybtn-small">P</span><span class="help-inline">Pull request</span><br><span class="ybtn ybtn-small">Q</span><span class="help-inline">Settings</span><br></div><div class="span9"><div class="row-fluid"><div class="span5"><h5>Posting List</h5><span class="ybtn ybtn-small">N</span><span class="help-inline">New post</span><br><span class="ybtn ybtn-small">←</span><span class="help-inline">Previous page</span><br><span class="ybtn ybtn-small">→</span><span class="help-inline">Next page</span><br></div><div class="span7"><h5>Site</h5><span class="ybtn ybtn-small">A</span><span class="help-inline">My Issues</span><br><span class="ybtn ybtn-small">U</span><span class="help-inline">Profile</span><br><span class="ybtn ybtn-small">F</span><span class="help-inline">User menu</span><br>__SITE_SEARCH_KEYS__<span class="help-inline">Site search</span><br><span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Submit form</span><br></div></div><div class="row-fluid mt20"><div class="span12"></div></div></div></div><p class="actrow"><button type="button" class="ybtn ybtn-info" data-dismiss="modal">Confirm</button></p></div></div>`;
const BOARD_DETAIL_KEYMAP = `<div class="pull-left" style="padding:10px 0px;margin-left:55px"><a href="#helpKeys" data-toggle="modal" class="ybtn ybtn-inverse ybtn-mini">Keyboard shortcuts</a><div id="helpKeys" class="modal hide fade keymap-help" tabindex="-1" role="dialog"><div class="row-fluid"><div class="span3"><h5>projects</h5><span class="ybtn ybtn-small">H</span><span class="help-inline">Home</span><br><span class="ybtn ybtn-small">B</span><span class="help-inline">Board</span><br><span class="ybtn ybtn-small">I</span><span class="help-inline">Issue</span><br><span class="ybtn ybtn-small">C</span><span class="help-inline">Code</span><br><span class="ybtn ybtn-small">M</span><span class="help-inline">Milestone</span><br><span class="ybtn ybtn-small">P</span><span class="help-inline">Pull request</span><br><span class="ybtn ybtn-small">Q</span><span class="help-inline">Settings</span><br></div><div class="span9"><div class="row-fluid"><div class="span5"><h5>Board details</h5><span class="ybtn ybtn-small">N</span><span class="help-inline">New post</span><br><span class="ybtn ybtn-small">L</span><span class="help-inline">List</span><br><span class="ybtn ybtn-small">E</span><span class="help-inline">Edit</span><br></div><div class="span7"><h5>Site</h5><span class="ybtn ybtn-small">A</span><span class="help-inline">My Issues</span><br><span class="ybtn ybtn-small">U</span><span class="help-inline">Profile</span><br><span class="ybtn ybtn-small">F</span><span class="help-inline">User menu</span><br>__SITE_SEARCH_KEYS__<span class="help-inline">Site search</span><br><span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Submit form</span><br></div></div><div class="row-fluid mt20"><div class="span12"></div></div></div></div><p class="actrow"><button type="button" class="ybtn ybtn-info" data-dismiss="modal">Confirm</button></p></div></div>`;

const EXPECTED_PROJECT_POSTS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li><li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class="active"><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="post-list project-page-wrap"><div class="search-wrap underline"><form id="option_form" action="__BASE_PATH__/admin/sample/posts" method="get" class="pull-left"><input type="hidden" name="orderBy" value="updatedDate"><input type="hidden" name="orderDir" value="desc"><div class="search-bar"><input name="filter" class="textbox" type="text" placeholder="Search" value="release"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div><div class="board-labels"><dl class=""><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-toggle="select2" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-exclusive="false"><option value="8" data-category-id="3" data-category-exclusive="false" selected="">bug</option></optgroup></select></dd></dl></div><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" data-content="Splits list and body into columns respectively"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></form><div class="pull-right"><a href="__BASE_PATH__/admin/sample/postform" class="ybtn ybtn-success">New post</a></div></div><div class="filter-wrap board"><div class="filters"><a href="__BASE_PATH__/admin/sample/posts?pageNum=1&amp;filter=release&amp;labelIds=8&amp;orderBy=updatedDate&amp;orderDir=asc" class="filter active"><i class="ico btn-gray-arrow  down "></i>Updated</a><a href="__BASE_PATH__/admin/sample/posts?pageNum=1&amp;filter=release&amp;labelIds=8&amp;orderBy=createdDate&amp;orderDir=desc" class="filter"><i class="ico btn-gray-arrow  down "></i>Created</a><a href="__BASE_PATH__/admin/sample/posts?pageNum=1&amp;filter=release&amp;labelIds=8&amp;orderBy=numOfComments&amp;orderDir=desc" class="filter"><i class="ico btn-gray-arrow  down "></i>Comments</a></div></div><ul class="post-list-wrap notice-wrap"><li class="post-item title" href="__BASE_PATH__/admin/sample/post/2"><a href="__BASE_PATH__/admin" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="bottom" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="label label-notice">Notice</span>&nbsp;<span class="post-id">2</span><a href="__BASE_PATH__/admin/sample/post/2" class="title">Pinned notice</a></div><div class="infos"><a href="__BASE_PATH__/admin" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="bottom" title="admin">Site Admin</a><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="Jul 1, 2026">Jul 1, 2026</span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/admin/sample/post/2#comments"><span class="count-groups item-icon "><i class="yobicon-comments"></i></span><span class="count-groups item-count ">1</span></a></span></div></li></ul><ul class="post-list-wrap"><li class="post-item title" href="__BASE_PATH__/admin/sample/post/3"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="bottom" title="dev"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">3</span><a href="__BASE_PATH__/admin/sample/post/3" class="title">Release note</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="bottom" title="dev">Dev Member</a><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="Jul 2, 2026">Jul 2, 2026</span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/admin/sample/post/3#comments"><span class="count-groups item-icon "><i class="yobicon-comments"></i></span><span class="count-groups item-count ">2</span></a></span><a href="#" class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</a></div></li></ul><div class="write-btn-wrap"></div><div id="pagination"></div>${BOARD_LIST_KEYMAP}</div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_PROJECT_POSTS_PREFIX = EXPECTED_PROJECT_POSTS.replace(
  '<span class="post-id">3</span><a href="__BASE_PATH__/admin/sample/post/3" class="title">Release note</a>',
  '<span class="post-id">3</span><a href="javascript:void(0)" class="title-prefix">[P1]</a><a href="__BASE_PATH__/admin/sample/post/3" class="title">Release note</a>',
);
const EMPTY_CHILD_COMMENT_FORM =
  '<div class="add-a-comment pull-right">Reply</div><div class="subcomment-media-body"><div class="child-comments"></div><div class="child-comment-input-form"><form action="__BASE_PATH__/admin/sample/post/3/comments" method="post" enctype="multipart/form-data"><input class="parentCommentId" type="hidden" name="parentCommentId" value="21"><div class="oneline-comment-box"><textarea class="editorSeries" name="contents" markdown="true" rows="1" placeholder="Reply (__CTRL_KEY__ + ENTER)"></textarea><button type="submit" class="ybtn ybtn-success">OK</button></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></form></div></div>';
const BOARD_COMMENT_FORM = `<form id="comment-form" action="__BASE_PATH__/admin/sample/post/3/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-contents" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-contents" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-contents" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-contents"></textarea></div></div><div id="preview-contents" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-wrap content-footer" data-resource-type="NONISSUE_COMMENT" id="upload"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form>`;
const EXPECTED_PROJECT_POST_DETAIL = `
<div class="page-wrap-outer"><div class="project-page-wrap board-view"><div class="board-header issue"><div class="pull-right mr10 mt10 hide-in-mobile"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div></div><div class="title"><strong class="board-id">#3</strong> Release note<div class="pull-right hide show-in-mobile" style="font-size:0.7em"><span class="date" title="Jul 2, 2026">Jul 2, 2026</span></div></div></div><div class="board-body row-fluid"><div class="span9 span-left-pane"><div class="author-info"><a href="__BASE_PATH__/dev" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a></div><div id="post-3" class="hide"><form action="__BASE_PATH__/api/v1/projects/admin/sample/posts/3/content"><textarea>Post **markdown**</textarea></form></div><div id="post-body-3"><div class="tasklist"><div class="task-title">Tasks<span class="done-counter"></span></div><div class="task-progress"><div class="bar red" style="width:0px" title="Tasklist"></div></div></div><div class="content markdown-wrap" data-allowed-update="true"><p>Post <strong>markdown</strong></p></div></div><div class="attachments" id="attachments" data-attachments="[]"></div><div class="board-actrow right-txt"><div class="pull-left"><div><button id="watch-button" type="button" class="ybtn " data-toggle="tooltip" data-placement="top" title="If subscribe, notify all new comments" data-watching="false">Watch</button></div></div><span class=""><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="Edit"><i class="yobicon-edit-2"></i></button><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></span></div><div class="watcher-list"></div><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i class="yobicon-comments"></i> <strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"></ul></div></div>${BOARD_COMMENT_FORM}</div></div><div class="span3 span-right-pane mb20"><div class="issue-info board-labels"><dl><dd class="project-btn-item"><a href="__BASE_PATH__/admin/sample/postform" class="ybtn ybtn-success">New post</a></dd></dl><div class="right-menu-icons"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" data-toggle="tooltip" title="Edit"><i class="yobicon-edit-2"></i></button><a href="#deleteConfirm" data-toggle="modal"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" data-toggle="tooltip" title="Delete"><i class="yobicon-trash"></i></button></a></div></div></div></div><div class="board-footer">${BOARD_DETAIL_KEYMAP}</div></div><script type="text/x-jquery-tmpl" id="tplAttachedFile"></script><div id="deleteConfirm" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete issue</h3></div><div class="modal-body"><p>Once you delete the post, you won't be able to recover it. Do you still want to delete this post?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-danger" data-request-method="delete" data-request-uri="__BASE_PATH__/admin/sample/post/3">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div><div id="comment-delete-modal" class="modal hide fade"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete comment</h3></div><div class="modal-body"><p>Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?</p></div><div class="modal-footer"><button id="comment-delete-confirm" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div></div></div>
`;

const EXPECTED_PROJECT_POST_DETAIL_WITH_COMMENT = EXPECTED_PROJECT_POST_DETAIL.replace(
  '<div class="comment-header"><i class="yobicon-comments"></i> <strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"></ul>',
  `<div class="comment-header"><i class="yobicon-comments"></i> <strong>Comment</strong> <strong class="num">1</strong></div><hr class="nm"><ul class="comments"><li class="comment" id="comment-21"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author"><span class="resp-comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></span><a href="__BASE_PATH__/dev" data-toggle="tooltip" data-placement="top" title="dev"><strong>Dev Member</strong></a></span><span class="ago-date"><a href="#comment-21" class="ago" title="Jul 3, 2026">Jul 3, 2026</a><a href="#comment-21" class="share-link" style="display:none">[Link]</a></span><span class="act-row pull-right"><button type="button" class="btn-transparent ml10" data-toggle="comment-edit" data-comment-id="21" title="Edit comment"><i class="yobicon-edit-2"></i></button><button type="button" class="btn-transparent ml6" data-toggle="comment-delete" data-request-uri="__BASE_PATH__/admin/sample/post/3/comment/21" title="Delete comment"><i class="yobicon-trash"></i></button></span></div><div id="comment-body-21"><div class="tasklist"><div class="task-title">Tasks<span class="done-counter"></span></div><div class="task-progress"><div class="bar red" style="width:0px" title="Tasklist"></div></div></div><div class="comment-body markdown-wrap" data-allowed-update="true" data-via-email="false"><p>First <strong>comment</strong></p></div><div class="attachments" data-attachments="[]"></div></div></div>${EMPTY_CHILD_COMMENT_FORM}</li></ul>`,
);

const COMMENT_UPDATE_FORM =
  '<div id="comment-editform-21" class="comment-update-form"><form action="__BASE_PATH__/admin/sample/post/3/comments/21" method="post" enctype="multipart/form-data"><input type="hidden" name="id" value="21"><div class="write-comment-box"><div class="write-comment-wrap"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-21" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-21" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible"><div id="edit-21" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="update-comment-body" markdown="true" id="editor-contents-21">First **comment**</textarea></div></div><div id="preview-21" class="tab-pane"><div class="markdown-preview markdown-wrap update-comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div><div class="right-txt comment-update-button upload-button-line"><span class="file-upload"><label for="upload-21" class="file-upload__label ybtn">File upload</label><input id="upload-21" class="file-upload__input" type="file" name="filePath" multiple=""></span><button type="button" class="ybtn ybtn-cancel" data-comment-id="21">Cancel</button><button type="submit" class="ybtn ybtn-info">Save</button></div></div><input type="hidden" name="temporaryUploadFiles" class="temporaryUploadFiles" value=""><div class="preview-21"></div><div class="attachment-files"></div><div id="upload-21" data-resourcetype="NONISSUE_COMMENT" data-resourceid="21"></div></div></form></div>';

const EXPECTED_PROJECT_POST_DETAIL_WITH_COMMENT_UPDATE =
  EXPECTED_PROJECT_POST_DETAIL_WITH_COMMENT.replace(
    '<div id="comment-body-21">',
    `${COMMENT_UPDATE_FORM}<div id="comment-body-21">`,
  );

const EXPECTED_PROJECT_POST_DETAIL_WITH_CHILD_COMMENT =
  EXPECTED_PROJECT_POST_DETAIL_WITH_COMMENT_UPDATE.replace(
    '<strong class="num">1</strong>',
    '<strong class="num">2</strong>',
  )
    .replace(
      '<li class="comment" id="comment-21"><div class="comment-avatar">',
      '<li class="comment" id="comment-21"><div id="comment-22"></div><div class="comment-avatar">',
    )
    .replace(
      EMPTY_CHILD_COMMENT_FORM,
      '<div class="add-a-comment pull-right">Reply</div><div class="subcomment-media-body"><div class="child-comments"><div class="one-line-comment"><div class="contents"><p>Nested <strong>reply</strong></p><span class="subcomment-author hide">- <a href="__BASE_PATH__/admin" class="usf-group" data-toggle="tooltip" data-placement="top" title="admin"><strong>Site Admin</strong></a> <a href="#comment-22" class="ago" title="Jul 4, 2026">Jul 4, 2026</a><a href="javascript:void(0)" type="button" class="btn-transparent deleteButtonX" data-toggle="comment-delete" data-request-uri="__BASE_PATH__/admin/sample/post/3/comment/22" title="Delete comment">x</a></span></div></div></div><div class="child-comment-input-form"><form action="__BASE_PATH__/admin/sample/post/3/comments" method="post" enctype="multipart/form-data"><input class="parentCommentId" type="hidden" name="parentCommentId" value="21"><div class="oneline-comment-box"><textarea class="editorSeries" name="contents" markdown="true" rows="1" placeholder="Reply (__CTRL_KEY__ + ENTER)"></textarea><button type="submit" class="ybtn ybtn-success">OK</button></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></form></div></div>',
    );

function expectedProjectPostsEmpty() {
  const listStart = EXPECTED_PROJECT_POSTS.indexOf('<div class="filter-wrap board">');
  const listEnd = EXPECTED_PROJECT_POSTS.indexOf(
    '<div class="write-btn-wrap"></div><div id="pagination"></div>',
  );
  return `${EXPECTED_PROJECT_POSTS.slice(0, listStart).replace(
    'value="release"',
    'value="empty"',
  )}<div class="error-wrap"><i class="ico ico-err1"></i><p>No post has been added.</p></div>${EXPECTED_PROJECT_POSTS.slice(
    listEnd,
  )}`;
}

test("project board list matches legacy board/list.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8`);
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(2);
  await expect(page.locator(".board-labels #labelIds")).toHaveAttribute(
    "data-container-css-class",
    "issue-labels bordered fullsize",
  );
  await expect(
    page.locator('.post-list-wrap:not(.notice-wrap) .issue-label[data-label-id="8"]'),
  ).toHaveText("bug");
  expect(await issueLabelColorMetrics(page)).toEqual({
    backgroundColor: "rgb(81, 170, 204)",
    boxShadow: "rgb(81, 170, 204) 2px 0px 0px 0px inset",
    color: "rgb(255, 255, 255)",
    dataCategoryId: "3",
    dataLabelId: "8",
    href: "#",
    text: "bug",
  });

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_POSTS.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project board list empty state matches legacy board/list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "empty");

  await page.goto(`${basePath}/admin/sample/posts?filter=empty&labelIds=8`);
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(page.locator(".error-wrap")).toHaveText("No post has been added.");
  await expect(page.locator(".filter-wrap.board")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedProjectPostsEmpty().replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project board list bracketed title prefix matches legacy title helpers", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "prefix");

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8&title=prefix`);
  await expect(page.locator(".title-prefix")).toHaveText("[P1]");
  await expect(page.locator(".post-list-wrap:not(.notice-wrap) .title-wrap .title")).toHaveText(
    "Release note",
  );

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_POSTS_PREFIX.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project board detail matches legacy board/view.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");
  await expect(page.locator(".project-page-wrap.board-view")).toBeVisible();
  await expect(page.locator("#post-body-3 .markdown-wrap")).toContainText("Post markdown");
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "false");
  await expect(page.locator("#deleteConfirm [data-request-uri]")).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/post/3`,
  );

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_POST_DETAIL.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project board detail toggles legacy watch state through REST", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { watchRequests } = await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#watch-button")).toHaveText("Watch");
  await page.locator("#watch-button").click();
  await expect(page.locator("#watch-button")).toHaveText("Stop watching");
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "true");
  await page.locator("#watch-button").click();
  await expect(page.locator("#watch-button")).toHaveText("Watch");
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "false");
  expect(watchRequests).toEqual(["POST", "DELETE"]);
});

test("project board detail deletes through legacy confirmation modal", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { deleteRequests } = await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
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
  await expect(page).toHaveURL(`${basePath}/admin/sample/posts`);
  await expect.poll(() => deleteRequests).toEqual(["DELETE"]);
});

test("project board detail deletes comments through legacy confirmation modal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentDeleteRequests } = await mockProjectPosts(page, "comment");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);

  await page.locator('#comment-21 [data-toggle="comment-delete"]').click();
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-modal .modal-header h3")).toHaveText("Delete comment");
  await expect(page.locator("#comment-delete-modal .modal-body p")).toHaveText(
    "Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?",
  );
  await expect(page.locator("#comment-delete-confirm")).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/post/3/comment/21`,
  );
  await expect(page.locator("#comment-delete-confirm")).toHaveAttribute(
    "data-request-method",
    "delete",
  );
  expect(commentDeleteRequests).toEqual([]);

  await page.locator('#comment-delete-modal [data-dismiss="modal"]').last().click();
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  expect(commentDeleteRequests).toEqual([]);

  await page.locator('#comment-21 [data-toggle="comment-delete"]').click();
  await page.locator("#comment-delete-confirm").click();
  await expect.poll(() => commentDeleteRequests).toEqual(["DELETE"]);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
});

test("project board detail submits legacy comment form through REST", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentCreateRequests } = await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#comment-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/post/3/comments`,
  );
  await expect(page.locator("#comment-form")).toHaveAttribute("method", "post");
  await expect(page.locator("#comment-form")).toHaveAttribute("enctype", "multipart/form-data");
  await expect(
    page.locator("#comment-form #upload[data-resource-type='NONISSUE_COMMENT']"),
  ).toHaveCount(1);
  await expect(page.locator("#comment-form #dynamic-comment-btn")).toHaveClass(/hidden/);

  await page.locator("#comment-form textarea[name='contents']").fill("New **board** comment");
  await page.locator("#comment-form button[type='submit']").click();

  await expect
    .poll(() => commentCreateRequests)
    .toEqual([
      {
        contentsMarkdown: "New **board** comment",
        attachmentIds: [],
        parentCommentId: null,
      },
    ]);
  await expect(page.locator("#comment-form textarea[name='contents']")).toHaveValue("");
});

test("project board detail opens legacy keymap modal through data-toggle modal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
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

test("project board detail renders legacy read-only selected labels", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "readonlyLabel");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator(".issue-info.board-labels #labelIds")).toHaveCount(0);
  await expect(
    page.locator(".issue-info.board-labels .label.issue-label.active.static"),
  ).toHaveAttribute("data-label-id", "8");

  const expected =
    `<dl><dt>Label</dt><dd><a href="__BASE_PATH__/admin/sample/posts?labelIds=8" class="label issue-label active static" data-label-id="8" style="background:rgb(81, 170, 204)">bug</a></dd></dl>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalize(page, ".issue-info.board-labels dl:has(a.label.issue-label.active.static)"),
  ).toEqual(await canonicalizeHtml(page, expected));
});

test("project board detail renders legacy parent comments", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "comment");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#comments .comment-header .num")).toHaveText("1");
  await expect(page.locator("#comment-21 .comment-body.markdown-wrap")).toContainText(
    "First comment",
  );

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_POST_DETAIL_WITH_COMMENT_UPDATE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project board detail renders legacy comment update form", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "commentUpdate");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#comment-editform-21 .comment-update-button")).toHaveCount(1);
  await expect(page.locator("#editor-contents-21")).toHaveValue("First **comment**");
  await expect(page.locator("#upload-21[data-resourcetype='NONISSUE_COMMENT']")).toHaveAttribute(
    "data-resourceid",
    "21",
  );

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_POST_DETAIL_WITH_COMMENT_UPDATE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project board detail renders legacy post and comment attachments", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "attachments");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#attachments .attached-file")).toHaveAttribute(
    "data-href",
    `${basePath}/files/31`,
  );
  await expect(page.locator("#comment-body-21 .attachments .attached-file")).toHaveAttribute(
    "data-href",
    `${basePath}/files/41`,
  );

  const postAttachments = [{ id: "31", mimeType: "text/plain", name: "post-note.txt", size: 1024 }];
  const expectedPostAttachments =
    `<div class="attachments" id="attachments" data-attachments='${JSON.stringify(postAttachments)}'><li class="attached-file" data-name="post-note.txt" data-href="__BASE_PATH__/files/31" data-mime="text/plain" data-size="1024"><strong>post-note.txt(1024)</strong><a class="attached-delete"><i class="ico btn-delete"></i></a></li></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > #attachments")).toEqual(
    await canonicalizeHtml(page, expectedPostAttachments),
  );

  const commentAttachments = [
    { id: "41", mimeType: "image/png", name: "comment-shot.png", size: 2048 },
  ];
  const expectedCommentAttachments =
    `<div class="attachments" data-attachments='${JSON.stringify(commentAttachments)}'><li class="attached-file" data-name="comment-shot.png" data-href="__BASE_PATH__/files/41" data-mime="image/png" data-size="2048"><strong>comment-shot.png(2048)</strong><a class="attached-delete"><i class="ico btn-delete"></i></a></li></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#comment-body-21 > .attachments")).toEqual(
    await canonicalizeHtml(page, expectedCommentAttachments),
  );
});

test("project board detail renders legacy child comments", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "childComment");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#comments .comment-header .num")).toHaveText("2");
  await expect(page.locator("#comment-22")).toHaveCount(1);
  await expect(page.locator("#comment-21 .child-comments .one-line-comment")).toContainText(
    "Nested reply",
  );

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_POST_DETAIL_WITH_CHILD_COMMENT.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

async function issueLabelColorMetrics(page: Page) {
  return page
    .locator(".post-list-wrap:not(.notice-wrap) .issue-label")
    .first()
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        color: style.color,
        dataCategoryId: element.getAttribute("data-category-id"),
        dataLabelId: element.getAttribute("data-label-id"),
        href: element.getAttribute("href"),
        text: element.textContent?.trim(),
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

async function mockProjectPosts(
  page: Page,
  state:
    | "default"
    | "empty"
    | "prefix"
    | "readonlyLabel"
    | "comment"
    | "commentUpdate"
    | "attachments"
    | "childComment" = "default",
) {
  const commentCreateRequests: Array<{
    attachmentIds: string[];
    contentsMarkdown: string;
    parentCommentId: string | number | null;
  }> = [];
  const deleteRequests: string[] = [];
  const commentDeleteRequests: string[] = [];
  const watchRequests: string[] = [];
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
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canAttachFiles: true,
        canMarkNotice: true,
        canMarkReadme: true,
        defaultPermissions: {
          canAttachFiles: true,
          canCreate: true,
          canMarkNotice: true,
          canMarkReadme: true,
        },
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
        onlineCommit: {
          branch: "",
          edit: false,
          issueTemplate: false,
          path: "",
          preparedBodyMarkdown: "",
          title: "",
        },
        readme: false,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/posts?**", async (route) => {
    const isEmpty = state === "empty";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: isEmpty
          ? []
          : [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorLabel: "Dev Member",
                authorLoginId: "dev",
                commentCount: 2,
                createdLabel: "Jul 2, 2026",
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
                notice: false,
                ownerName: "admin",
                postNumber: "3",
                projectName: "sample",
                readme: false,
                title: state === "prefix" ? "[P1] Release note" : "Release note",
                updatedLabel: "Jul 2, 2026",
              },
            ],
        notices: isEmpty
          ? []
          : [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorLabel: "Site Admin",
                authorLoginId: "admin",
                commentCount: 1,
                createdLabel: "Jul 1, 2026",
                labels: [],
                notice: true,
                ownerName: "admin",
                postNumber: "2",
                projectName: "sample",
                readme: false,
                title: "Pinned notice",
                updatedLabel: "Jul 1, 2026",
              },
            ],
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        readme: null,
        totalCount: isEmpty ? 0 : 2,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/posts/3", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteRequests.push(route.request().method());
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        attachments:
          state === "attachments"
            ? [
                {
                  id: "31",
                  mimeType: "text/plain",
                  name: "post-note.txt",
                  size: 1024,
                },
              ]
            : [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorId: "2",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        bodyHtml: "<p>Post <strong>markdown</strong></p>",
        bodyMarkdown: "Post **markdown**",
        commentCount:
          state === "comment" || state === "commentUpdate" || state === "attachments"
            ? 1
            : state === "childComment"
              ? 2
              : 0,
        comments:
          state === "comment" ||
          state === "commentUpdate" ||
          state === "attachments" ||
          state === "childComment"
            ? [
                {
                  attachments:
                    state === "attachments"
                      ? [
                          {
                            id: "41",
                            mimeType: "image/png",
                            name: "comment-shot.png",
                            size: 2048,
                          },
                        ]
                      : [],
                  authorId: "2",
                  authorLabel: "Dev Member",
                  authorLoginId: "dev",
                  contentsHtml: "<p>First <strong>comment</strong></p>",
                  contentsMarkdown: "First **comment**",
                  createdLabel: "Jul 3, 2026",
                  id: "21",
                  parentCommentId: "",
                  viaEmail: false,
                },
                ...(state === "childComment"
                  ? [
                      {
                        attachments: [],
                        authorId: "1",
                        authorLabel: "Site Admin",
                        authorLoginId: "admin",
                        contentsHtml: "<p>Nested <strong>reply</strong></p>",
                        contentsMarkdown: "Nested **reply**",
                        createdLabel: "Jul 4, 2026",
                        id: "22",
                        parentCommentId: "21",
                        viaEmail: false,
                      },
                    ]
                  : []),
              ]
            : [],
        createdLabel: "Jul 2, 2026",
        historyHtml: "",
        historyMarkdown: "",
        id: "33",
        isWatching: false,
        labels:
          state === "readonlyLabel"
            ? [
                {
                  categoryId: "3",
                  categoryIsExclusive: false,
                  categoryName: "type",
                  color: "#51aacc",
                  id: "8",
                  name: "bug",
                },
              ]
            : [],
        notice: false,
        ownerName: "admin",
        permissions: {
          canComment: true,
          canCreate: true,
          canDelete: true,
          canRead: true,
          canSetNotice: true,
          canWatch: true,
          canUpdate: state !== "readonlyLabel",
        },
        postNumber: "3",
        projectName: "sample",
        readme: false,
        title: "Release note",
        updatedLabel: "Jul 2, 2026",
        watcherCount: 0,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/posts/3/watch", async (route) => {
    const isWatching = route.request().method() === "POST";
    watchRequests.push(route.request().method());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorId: "2",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        bodyHtml: "<p>Post <strong>markdown</strong></p>",
        bodyMarkdown: "Post **markdown**",
        commentCount: 0,
        comments: [],
        createdLabel: "Jul 2, 2026",
        historyHtml: "",
        historyMarkdown: "",
        id: "33",
        isWatching,
        labels: [],
        notice: false,
        ownerName: "admin",
        permissions: {
          canComment: false,
          canCreate: true,
          canDelete: true,
          canRead: true,
          canSetNotice: true,
          canWatch: true,
          canUpdate: true,
        },
        postNumber: "3",
        projectName: "sample",
        readme: false,
        title: "Release note",
        updatedLabel: "Jul 2, 2026",
        watcherCount: isWatching ? 1 : 0,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/posts/3/comments", async (route) => {
    if (route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        attachmentIds?: string[];
        contentsMarkdown?: string;
        parentCommentId?: string | number | null;
      };
      commentCreateRequests.push({
        attachmentIds: body.attachmentIds ?? [],
        contentsMarkdown: body.contentsMarkdown ?? "",
        parentCommentId: body.parentCommentId ?? null,
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          authorId: "2",
          authorLabel: "Dev Member",
          authorLoginId: "dev",
          bodyHtml: "<p>Post <strong>markdown</strong></p>",
          bodyMarkdown: "Post **markdown**",
          commentCount: 1,
          comments: [
            {
              attachments: [],
              authorId: "1",
              authorLabel: "Site Admin",
              authorLoginId: "admin",
              contentsHtml: "<p>New <strong>board</strong> comment</p>",
              contentsMarkdown: "New **board** comment",
              createdLabel: "Jul 5, 2026",
              id: "23",
              parentCommentId: "",
              viaEmail: false,
            },
          ],
          createdLabel: "Jul 2, 2026",
          historyHtml: "",
          historyMarkdown: "",
          id: "33",
          isWatching: false,
          labels: [],
          notice: false,
          ownerName: "admin",
          permissions: {
            canComment: true,
            canCreate: true,
            canDelete: true,
            canRead: true,
            canSetNotice: true,
            canWatch: true,
            canUpdate: true,
          },
          postNumber: "3",
          projectName: "sample",
          readme: false,
          title: "Release note",
          updatedLabel: "Jul 2, 2026",
          watcherCount: 0,
        }),
      });
      return;
    }
    await route.fallback();
  });
  await page.route("**/api/v1/projects/admin/sample/posts/3/comments/21", async (route) => {
    if (route.request().method() === "DELETE") {
      commentDeleteRequests.push(route.request().method());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          authorId: "2",
          authorLabel: "Dev Member",
          authorLoginId: "dev",
          bodyHtml: "<p>Post <strong>markdown</strong></p>",
          bodyMarkdown: "Post **markdown**",
          commentCount: 0,
          comments: [],
          createdLabel: "Jul 2, 2026",
          historyHtml: "",
          historyMarkdown: "",
          id: "33",
          isWatching: false,
          labels: [],
          notice: false,
          ownerName: "admin",
          permissions: {
            canComment: false,
            canCreate: true,
            canDelete: true,
            canRead: true,
            canSetNotice: true,
            canWatch: true,
            canUpdate: true,
          },
          postNumber: "3",
          projectName: "sample",
          readme: false,
          title: "Release note",
          updatedLabel: "Jul 2, 2026",
          watcherCount: 0,
        }),
      });
      return;
    }
    await route.fallback();
  });
  return { commentCreateRequests, commentDeleteRequests, deleteRequests, watchRequests };
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, .page-footer-outer",
      ),
    );
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
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    function normalizeStyleAttr(value: string) {
      return value
        .replace(/\s+/g, "")
        .replace(/;$/u, "")
        .replaceAll('"', "'")
        .replace(
          /box-shadow:rgb\(([^)]+)\)2px0px0px0pxinset/gu,
          "box-shadow:rgb($1)2px0px0pxinset",
        );
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    const isMac = navigator.userAgent.toLowerCase().includes("macintosh");
    const ctrlKey = isMac ? "⌘" : "CTRL";
    const siteSearchKeys = isMac
      ? '<span class="ybtn ybtn-small">CTRL</span> + <span class="ybtn ybtn-small">ALT</span> + <span class="ybtn ybtn-small">S</span>'
      : '<span class="ybtn ybtn-small">ALT</span> + <span class="ybtn ybtn-small">S</span>';
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
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    function normalizeStyleAttr(value: string) {
      return value
        .replace(/\s+/g, "")
        .replace(/;$/u, "")
        .replaceAll('"', "'")
        .replace(
          /box-shadow:rgb\(([^)]+)\)2px0px0px0pxinset/gu,
          "box-shadow:rgb($1)2px0px0pxinset",
        );
    }
  }, html);
}
