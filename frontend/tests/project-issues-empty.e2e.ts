import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const PROJECT_ISSUES_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url),
  "utf8",
);
const SITE_LAYOUT_SHELL_SOURCE = readFileSync(
  new URL("../src/routes/-home-route-screen.tsx", import.meta.url),
  "utf8",
);
const ROUTE_CAST_ESCAPE = ["as", "never"].join(" ");

const ISSUE_LIST_KEYMAP = `<div id="helpKeys" class="modal hide fade keymap-help" tabindex="-1" role="dialog"><div class="row-fluid"><div class="span3"><h5>projects</h5><span class="ybtn ybtn-small">H</span><span class="help-inline">Home</span><br><span class="ybtn ybtn-small">B</span><span class="help-inline">Board</span><br><span class="ybtn ybtn-small">I</span><span class="help-inline">Issue</span><br><span class="ybtn ybtn-small">C</span><span class="help-inline">Code</span><br><span class="ybtn ybtn-small">M</span><span class="help-inline">Milestone</span><br><span class="ybtn ybtn-small">P</span><span class="help-inline">Pull request</span><br><span class="ybtn ybtn-small">Q</span><span class="help-inline">Settings</span><br></div><div class="span9"><div class="row-fluid"><div class="span5"><h5>Issue list</h5><span class="ybtn ybtn-small">N</span><span class="help-inline">New issue</span><br><span class="ybtn ybtn-small">←</span><span class="help-inline">Previous page</span><br><span class="ybtn ybtn-small">→</span><span class="help-inline">Next page</span><br><span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">A</span><span class="help-inline">Select all</span><br></div><div class="span7"><h5>Site</h5><span class="ybtn ybtn-small">A</span><span class="help-inline">My Issues</span><br><span class="ybtn ybtn-small">U</span><span class="help-inline">Profile</span><br><span class="ybtn ybtn-small">F</span><span class="help-inline">User menu</span><br>__SITE_SEARCH_KEYS__<span class="help-inline">Site search</span><br><span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Submit form</span><br></div></div><div class="row-fluid mt20"><div class="span12"></div></div></div></div><p class="actrow"><button type="button" class="ybtn ybtn-info">Confirm</button></p></div>`;
const ISSUE_LIST_KEYMAP_NON_MANAGER = ISSUE_LIST_KEYMAP.replace(
  '<span class="ybtn ybtn-small">Q</span><span class="help-inline">Settings</span><br>',
  "",
);
const MILESTONE_SEARCH_SELECT = `<dl class="issue-option"><dt>Milestone</dt><dd><select id="milestoneId" name="milestoneId" data-search="milestoneId" data-toggle="select2" data-format="milestone" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="-1">No milestone</option><optgroup label="Open"><option value="5" data-state="open">v1.0</option></optgroup><optgroup label="Closed"><option value="7" data-state="closed">v0.9</option></optgroup></select></dd></dl>`;

const EXPECTED_PROJECT_ISSUES_EMPTY = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer project-header"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Project</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/admin/sample/search">This Project</button></li><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" title="Site administration"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li><li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class="active"><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="row-fluid issue-list-wrap"><div class="left-menu span2 span-hard-wrap"><ul class="lst-stacked unstyled"><li class="active"><button type="button" data-assignee-id="" data-author-id="" data-commenter-id="" data-milestone-id="">Open<span class="num-badge pull-right">0</span></button></li><li><button type="button" data-assignee-id="1" data-author-id="" data-commenter-id="" data-milestone-id="">Assigned<span class="num-badge pull-right">0</span></button></li><li><button type="button" data-assignee-id="" data-author-id="1" data-commenter-id="" data-milestone-id="">Created<span class="num-badge pull-right">0</span></button></li><li><button type="button" data-assignee-id="" data-author-id="" data-commenter-id="1" data-milestone-id="">Commented<span class="num-badge pull-right">0</span></button></li></ul><form id="search" name="search" action="__BASE_PATH__/admin/sample/issues" method="get"><input type="hidden" name="orderBy" value="updatedDate"><input type="hidden" name="orderDir" value="desc"><input type="hidden" name="state" value="open"><input type="hidden" name="commenterId" value="" data-search="commenterId"><hr class="hide-in-mobile"><div class="search"><div class="search-bar"><input name="filter" class="textbox full" type="text" value="empty" data-search="filter"><button type="button" class="search-btn" data-submit="submit"><i class="yobicon-search"></i></button></div></div><div id="advanced-search-form" class="srch-advanced hide-in-mobile"><dl class="issue-option"><dt>Author</dt><dd><select id="authorId" name="authorId" data-search="authorId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="1">Created</option></select></dd></dl><dl class="issue-option"><dt>Assignee</dt><dd><select id="assigneeId" name="assigneeId" data-search="assigneeId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="0">No assignee</option><option value="1">Assigned</option></select></dd></dl>${MILESTONE_SEARCH_SELECT}<dl class="issue-option"><dt>Due date</dt><dd class="search search-bar"><input id="issueDueDate" type="text" name="dueDate" class="textbox full" value="" data-toggle="calendar"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></dd></dl><div class="labels-wrap"><a href="__BASE_PATH__/admin/sample/issue/labelsform" class="ybtn ybtn-default ybtn-mini pull-right"><i class="yobicon-cog vmiddle"></i><span class="vmiddle" style="margin-left:2px;">Manage label</span></a></div></div></form></div><div class="span10 span-hard-wrap" id="span10"><div class="pull-right"><a href="__BASE_PATH__/admin/sample/issueform" class="ybtn ybtn-success">New issue</a></div><ul class="nav nav-tabs nm"><li class="active"><button type="button" state="open">Open<span class="num-badge">0</span></button></li><li><button type="button" state="closed">Closed<span class="num-badge">0</span></button></li><li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" style="position:relative"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li><li class="show-subtasks-li"><div class="show-subtasks mr10" id="two-column-mode-checkbox" style="position:relative" title="Show subtask"><label class="checkbox"><div class="show-subtasks-button-border"><input id="toggle-show-subtasks" type="checkbox"><span class="show-subtasks-text">Show subtask</span></div></label></div></li></ul><div class="error-wrap"><i class="ico ico-err1"></i><p>No issue found</p></div><div class="pull-left" style="padding:10px 0px;margin-left:55px"><button type="button" class="ybtn ybtn-inverse ybtn-mini">Keyboard shortcuts</button>${ISSUE_LIST_KEYMAP}</div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`
  .replace(
    '<select id="authorId" name="authorId" data-search="authorId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="1">Created</option></select>',
    '<select id="authorId" name="authorId" data-search="authorId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="1">Created</option><option value="1" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="admin">Site Admin</option></select>',
  )
  .replace(
    '<select id="assigneeId" name="assigneeId" data-search="assigneeId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="0">No assignee</option><option value="1">Assigned</option></select>',
    '<select id="assigneeId" name="assigneeId" data-search="assigneeId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="0">No assignee</option><option value="1">Assigned</option><option value="1" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="admin">Site Admin</option></select>',
  )
  .replace(
    '<li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/admin/sample/search"',
    '<li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li><li class="divider"></li><li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li><li><form action="__BASE_PATH__/admin/sample/search"',
  )
  .replace(
    '<li class="active"><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li>',
    '<li class="active"><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span><span class="project-menu-count">1</span></a></li>',
  )
  .replace(
    '<li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li>',
    '<li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span><span class="project-menu-count">1</span></a></li>',
  )
  .replace(
    '<li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li>',
    '<li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span><span class="project-menu-count">2</span></a></li>',
  )
  .replace(
    '<li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li>',
    '<li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span><span class="project-menu-count">1</span></a></li>',
  );
const BUG_CHILD_LABEL_STYLE = "background:rgb(81, 170, 204)";
const EMPTY_AUTHOR_SELECT = `<select id="authorId" name="authorId" data-search="authorId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="1">Created</option><option value="1" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="admin">Site Admin</option></select>`;
const POPULATED_AUTHOR_SELECT = `<select id="authorId" name="authorId" data-search="authorId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="1">Created</option><option value="2" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="dev">Dev Member</option><option value="1" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="admin">Site Admin</option></select>`;
const EMPTY_ASSIGNEE_SELECT = `<select id="assigneeId" name="assigneeId" data-search="assigneeId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="0">No assignee</option><option value="1">Assigned</option><option value="1" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="admin">Site Admin</option></select>`;
const POPULATED_ASSIGNEE_SELECT = `<select id="assigneeId" name="assigneeId" data-search="assigneeId" data-toggle="select2" data-format="user" data-container-css-class="fullsize"><option value="" selected="">All</option><option value="0">No assignee</option><option value="1">Assigned</option><option value="1" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="admin">Site Admin</option></select>`;

const POPULATED_SPAN10 = `<div class="span10 span-hard-wrap" id="span10"><div class="pull-right"><a href="__BASE_PATH__/admin/sample/issueform" class="ybtn ybtn-success">New issue</a></div><ul class="nav nav-tabs nm"><li class="active"><button type="button" state="open">Open<span class="num-badge">1</span></button></li><li><button type="button" state="closed">Closed<span class="num-badge">2</span></button></li><li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" style="position:relative"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li><li class="show-subtasks-li"><div class="show-subtasks mr10" id="two-column-mode-checkbox" style="position:relative" title="Show subtask"><label class="checkbox"><div class="show-subtasks-button-border"><input id="toggle-show-subtasks" type="checkbox"><span class="show-subtasks-text">Show subtask</span></div></label></div></li></ul><div class="filter-wrap board"></div><ul class="post-list-wrap row-fluid"><li class="post-item title" id="issue-item-42" data-item="issue-item" data-value="dev 11 Fix flaky issue" href="__BASE_PATH__/admin/sample/issue/11"><div class="span9 span-hard-wrap"><label for="issue-42" class="mass-update-check hide-in-mobile"><input id="issue-42" type="checkbox" name="checked-issue" data-toggle="issue-checkbox" data-issue-id="42" data-issue-labels="bug,8,bug,3,false|"></label><div for="issue-42" class="issue-item-row"><div class="title-wrap"><a href="__BASE_PATH__/admin/sample/issue/11" class="title"><span class="post-id">#11</span></a><a href="__BASE_PATH__/admin/sample/issue/11" class="title">Fix flaky issue</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="bottom" title="dev">Dev Member</a><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="Jul 1, 2026">Jul 1, 2026</span><span class="mileston-tag"><a href="__BASE_PATH__/admin/sample/milestone/5" data-toggle="tooltip" data-placement="bottom" title="Milestone">v1.0</a></span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/admin/sample/issue/11#comments" class="comments-count comments-count-color"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">3</span></a><a href="__BASE_PATH__/admin/sample/issue/11#vote" class="vote-count vote-color"><span class="count-groups item-icon"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a></span><button type="button" class="label issue-label list-label active" data-category-id="3" data-label-id="8">bug</button><div class="child-issue-list hide"></div></div></div></div><div class="span3 hide-in-mobile"><div class="mt5 pull-right"><a href="__BASE_PATH__/admin" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Assignee: Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="Site Admin"></a></div><div class="mr20 mt10 pull-right overdue" data-toggle="tooltip" data-placement="top" title="Jun 30, 2026"><i class="yobicon-clock2 mr3 vmiddle"></i><span class="vmiddle">Overdue</span></div></div></li></ul><div class="pull-left" style="padding:10px"><a href="__BASE_PATH__/admin/sample/issues?filter=bug&amp;format=xls" class="ybtn small"><i class="yobicon-file-excel"></i> Download as Excel file</a></div><div class="pull-left" style="padding:10px 0px;margin-left:55px"><button type="button" class="ybtn ybtn-inverse ybtn-mini">Keyboard shortcuts</button>${ISSUE_LIST_KEYMAP}</div><div id="pagination" class="page-navigation-wrap" data-total="3"><ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li><li class="page-num"><input type="number" pattern="[0-9]*" class="input-mini nospinner" name="pageNum" max="3" min="1" value="1"></li><li class="page-num delimiter">/</li><li class="page-num">3</li><li class="page-num ikon"><a href="__BASE_PATH__/admin/sample/issues?filter=bug&amp;orderBy=updatedDate&amp;orderDir=desc&amp;pageNum=2&amp;state=open"><span>Next page</span><i class="ico btn-pg-next"></i></a></li></ul></div></div>`;
const POPULATED_PAGINATION = `<div id="pagination" class="page-navigation-wrap" data-total="3"><ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li><li class="page-num"><input type="number" pattern="[0-9]*" class="input-mini nospinner" name="pageNum" max="3" min="1" value="1"></li><li class="page-num delimiter">/</li><li class="page-num">3</li><li class="page-num ikon"><a href="__BASE_PATH__/admin/sample/issues?filter=bug&amp;orderBy=updatedDate&amp;orderDir=desc&amp;pageNum=2&amp;state=open"><span>Next page</span><i class="ico btn-pg-next"></i></a></li></ul></div>`;
const SINGLE_PAGE_PAGINATION = `<div id="pagination" class="page-navigation-wrap" data-total="1"><ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li><li class="page-num"><input type="number" pattern="[0-9]*" class="input-mini nospinner" name="pageNum" max="1" min="1" value="1"></li><li class="page-num delimiter">/</li><li class="page-num">1</li><li class="page-num ikon"><span class="off">Next page</span><i class="ico btn-pg-next off"></i></li></ul></div>`;
const MASS_UPDATE_OPTION_BUTTON_STYLE =
  "background:transparent;border:0px;clear:both;color:rgb(51,51,51);display:block;font-weight:normal;line-height:20px;padding:3px20px;text-align:left;white-space:nowrap;width:100%";

const MASS_UPDATE_MILESTONE_DROPDOWN = `<div id="milestone" class="btn-group" data-name="milestone.id"><button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled=""><span class="d-label">Update milestone</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu mass-update-list"><li data-value="-1"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}">No milestone</button></li><li class="divider"></li><li data-value="5"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}">v1.0</button></li></ul></div>`;
const MASS_UPDATE_TOOLBAR = `<div class="mass-update-wrap hide-in-mobile"><form id="mass-update-form" class="mass-update-form pull-left" action="__BASE_PATH__/admin/sample/issues" method="post"><div class="btn-group check-all"><label for="check-all"><input type="checkbox" id="check-all" data-target="checked-issue"></label></div><div id="state" class="btn-group" data-name="state"><button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled=""><span class="d-label">Update status</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu mass-update-list"><li data-value="OPEN"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}">Open</button></li><li data-value="CLOSED"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}">Closed</button></li></ul></div><div id="assignee" class="btn-group" data-name="assignee.id"><button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled=""><span class="d-label">Update assignee</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu mass-update-list"><li data-value="0"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}">No assignee</button></li><li data-value="1"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}">Assign to me</button></li><li class="divider"></li><li data-value="1"><button type="button" class="usf-group" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></button></li><li data-value="2"><button type="button" class="usf-group" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></button></li></ul></div>${MASS_UPDATE_MILESTONE_DROPDOWN}<div id="attaching-label" class="btn-group" data-name="attachingLabelIds"><button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled=""><span class="d-label">Attach label</span><span class="d-caret"><span class="caret"></span></span></button><ul id="attach-label-list" class="dropdown-menu mass-update-list"><li class="disabled" data-category="3"><span>bug</span></li><li data-value="8" data-category="3"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}"><span class="issue-label active list-label" data-label-id="8">bug</span></button></li><li class="divider" data-category="3"></li></ul></div><div id="detaching-label" class="btn-group" data-name="detachingLabelIds"><button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled=""><span class="d-label">Detach label</span><span class="d-caret"><span class="caret"></span></span></button><ul id="delete-label-list" class="dropdown-menu mass-update-list"><li class="disabled" data-category="3"><span>bug</span></li><li data-value="8" data-category="3"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}"><span class="issue-label active list-label" data-label-id="8">bug</span></button></li><li class="divider" data-category="3"></li></ul></div></form></div>`;
const POPULATED_SPAN10_WITH_TOOLBAR = POPULATED_SPAN10.replace(
  '<div class="filter-wrap board"></div>',
  `<div class="filter-wrap board">${MASS_UPDATE_TOOLBAR}</div>`,
);

const EXPECTED_PROJECT_ISSUES_POPULATED = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="bug"',
)
  .replace(EMPTY_AUTHOR_SELECT, POPULATED_AUTHOR_SELECT)
  .replace(EMPTY_ASSIGNEE_SELECT, POPULATED_ASSIGNEE_SELECT)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">1</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${POPULATED_SPAN10_WITH_TOOLBAR}</div></div></div></div>\n<footer`,
  );

const LABEL_SORT_SPAN10 = POPULATED_SPAN10_WITH_TOOLBAR.replace(
  'data-issue-labels="bug,8,bug,3,false|"',
  'data-issue-labels="bug,8,bug,3,false|priority,9,P1,4,true|"',
)
  .replaceAll(
    `<li class="disabled" data-category="3"><span>bug</span></li><li data-value="8" data-category="3"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}"><span class="issue-label active list-label" data-label-id="8">bug</span></button></li><li class="divider" data-category="3"></li>`,
    `<li class="disabled" data-category="3"><span>bug</span></li><li data-value="8" data-category="3"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}"><span class="issue-label active list-label" data-label-id="8">bug</span></button></li><li class="divider" data-category="3"></li><li class="disabled" data-category="4"><span>priority</span></li><li data-value="9" data-category="4"><button type="button" style="${MASS_UPDATE_OPTION_BUTTON_STYLE}"><span class="issue-label active list-label" data-label-id="9">P1</span></button></li><li class="divider" data-category="4"></li>`,
  )
  .replace(
    `<button type="button" class="label issue-label list-label active" data-category-id="3" data-label-id="8">bug</button>`,
    `<button type="button" class="label issue-label list-label active" data-category-id="3" data-label-id="8">bug</button><button type="button" class="label issue-label list-label active" data-category-id="4" data-label-id="9">P1</button>`,
  )
  .replaceAll("filter=bug", "filter=labels-unsorted");

const EXPECTED_PROJECT_ISSUES_LABEL_SORT = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="labels-unsorted"',
)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">1</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${LABEL_SORT_SPAN10}</div></div></div></div>\n<footer`,
  );

const NO_MILESTONE_MENU_SPAN10 = POPULATED_SPAN10_WITH_TOOLBAR.replace(
  '<span class="mileston-tag"><a href="__BASE_PATH__/admin/sample/milestone/5" data-toggle="tooltip" data-placement="bottom" title="Milestone">v1.0</a></span>',
  "",
)
  .replace(MASS_UPDATE_MILESTONE_DROPDOWN, "")
  .replaceAll("filter=bug", "filter=no-milestone-menu");

const EXPECTED_PROJECT_ISSUES_NO_MILESTONE_MENU = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="no-milestone-menu"',
)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">1</span>',
  )
  .replace(
    '<li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li>',
    "",
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${NO_MILESTONE_MENU_SPAN10}</div></div></div></div>\n<footer`,
  );

const PREFIX_SPAN10 = POPULATED_SPAN10_WITH_TOOLBAR.replace(
  'data-value="dev 11 Fix flaky issue"',
  'data-value="dev 11 [P1] Fix flaky issue"',
)
  .replace(
    '<div class="title-wrap"><a href="__BASE_PATH__/admin/sample/issue/11" class="title"><span class="post-id">#11</span></a><a href="__BASE_PATH__/admin/sample/issue/11" class="title">Fix flaky issue</a></div>',
    '<div class="title-wrap"><a href="__BASE_PATH__/admin/sample/issue/11" class="title"><span class="post-id">#11</span></a><a href="__BASE_PATH__/admin/sample/issues?filter=[P1]&amp;orderBy=updatedDate&amp;orderDir=desc&amp;pageNum=1&amp;state=open" class="title-prefix">[P1]</a><a href="__BASE_PATH__/admin/sample/issue/11" class="title">Fix flaky issue</a></div>',
  )
  .replaceAll("filter=bug", "filter=prefix");

const EXPECTED_PROJECT_ISSUES_PREFIX = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="prefix"',
)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">1</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${PREFIX_SPAN10}</div></div></div></div>\n<footer`,
  );

const UPCOMING_DUE_DATE_SPAN10 = POPULATED_SPAN10_WITH_TOOLBAR.replace(
  '<div class="mr20 mt10 pull-right overdue" data-toggle="tooltip" data-placement="top" title="Jun 30, 2026"><i class="yobicon-clock2 mr3 vmiddle"></i><span class="vmiddle">Overdue</span></div>',
  '<div class="mr20 mt10 pull-right" data-toggle="tooltip" data-placement="top" title="Jul 5, 2026"><i class="yobicon-clock2 mr3 vmiddle"></i><span class="vmiddle">4 days left</span></div>',
).replaceAll("filter=bug", "filter=upcoming");

const EXPECTED_PROJECT_ISSUES_UPCOMING_DUE_DATE = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="upcoming"',
)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">1</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${UPCOMING_DUE_DATE_SPAN10}</div></div></div></div>\n<footer`,
  );

const SHARER_SPAN10 = POPULATED_SPAN10_WITH_TOOLBAR.replace(
  '<a href="__BASE_PATH__/admin/sample/issue/11#vote" class="vote-count vote-color"><span class="count-groups item-icon"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a></span>',
  '<a href="__BASE_PATH__/admin/sample/issue/11#vote" class="vote-count vote-color"><span class="count-groups item-icon"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a><button type="button" class="sharer-color" data-toggle="tooltip" data-placement="bottom" title="Issue Sharer"><span class="count-groups item-icon"><i class="yobicon-friends"></i></span><span class="count-groups item-count strong">2</span></button></span>',
).replaceAll("filter=bug", "filter=sharer");

const EXPECTED_PROJECT_ISSUES_SHARER = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="sharer"',
)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">1</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${SHARER_SPAN10}</div></div></div></div>\n<footer`,
  );

const SORT_FILTERS = `<div class="filters pull-right"><button type="button" orderBy="dueDate" orderDir="desc" class="filter"><i class="ico btn-gray-arrow down"></i>Due Date</button><button type="button" orderBy="updatedDate" orderDir="asc" class="filter active"><i class="ico btn-gray-arrow down"></i>Updated</button><button type="button" orderBy="createdDate" orderDir="desc" class="filter"><i class="ico btn-gray-arrow down"></i>Created</button><button type="button" orderBy="numOfComments" orderDir="desc" class="filter"><i class="ico btn-gray-arrow down"></i>Comments</button></div>`;
const DRAFT_ISSUE_ROW = `<li class="post-item title" id="issue-item-41" data-item="issue-item" data-value="admin 10 Draft issue" href="__BASE_PATH__/admin/sample/issue/10"><div class="span9 span-hard-wrap"><label for="issue-41" class="mass-update-check hide-in-mobile"><input id="issue-41" type="checkbox" name="checked-issue" data-toggle="issue-checkbox" data-issue-id="41" data-issue-labels=""></label><div for="issue-41" class="issue-item-row"><div class="title-wrap"><a href="__BASE_PATH__/admin/sample/issue/10" class="title"><span class="post-id"><span class="draft-number">#Draft</span></span></a><a href="__BASE_PATH__/admin/sample/issue/10" class="title">Draft issue</a></div><div class="infos"><a href="__BASE_PATH__/admin" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="bottom" title="admin">Site Admin</a><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="Jul 1, 2026">Jul 1, 2026</span><div class="child-issue-list hide"></div></div></div></div><div class="span3 hide-in-mobile"><div class="mt5 pull-right"><div class="empty-avatar-wrap">&nbsp;</div></div></div></li>`;
const DRAFT_SPAN10 = POPULATED_SPAN10_WITH_TOOLBAR.replace(
  '<ul class="post-list-wrap row-fluid">',
  `<ul class="post-list-wrap row-fluid">${DRAFT_ISSUE_ROW}</ul><ul class="post-list-wrap row-fluid">`,
)
  .replace("filter=bug&amp;format=xls", "format=xls")
  .replace(POPULATED_PAGINATION, SINGLE_PAGE_PAGINATION);

const EXPECTED_PROJECT_ISSUES_DRAFT = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value=""',
)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">1</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${DRAFT_SPAN10}</div></div></div></div>\n<footer`,
  );

const EXPECTED_PROJECT_ISSUES_FOREIGN_DRAFT = EXPECTED_PROJECT_ISSUES_DRAFT.replace(
  DRAFT_ISSUE_ROW,
  "",
);

const SECOND_ISSUE_ROW = `<li class="post-item title" id="issue-item-43" data-item="issue-item" data-value="admin 12 Follow up issue" href="__BASE_PATH__/admin/sample/issue/12"><div class="span9 span-hard-wrap"><label for="issue-43" class="mass-update-check hide-in-mobile"><input id="issue-43" type="checkbox" name="checked-issue" data-toggle="issue-checkbox" data-issue-id="43" data-issue-labels=""></label><div for="issue-43" class="issue-item-row"><div class="title-wrap"><a href="__BASE_PATH__/admin/sample/issue/12" class="title"><span class="post-id">#12</span></a><a href="__BASE_PATH__/admin/sample/issue/12" class="title">Follow up issue</a></div><div class="infos"><a href="__BASE_PATH__/admin" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="bottom" title="admin">Site Admin</a><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="Jul 2, 2026">Jul 2, 2026</span><div class="child-issue-list hide"></div></div></div></div><div class="span3 hide-in-mobile"><div class="mt5 pull-right"><div class="empty-avatar-wrap">&nbsp;</div></div></div></li>`;
const BULK_SPAN10 = POPULATED_SPAN10.replace(
  'Open<span class="num-badge">1</span>',
  'Open<span class="num-badge">2</span>',
)
  .replace(
    '<div class="filter-wrap board"></div>',
    `<div class="filter-wrap board">${MASS_UPDATE_TOOLBAR}${SORT_FILTERS}</div>`,
  )
  .replace('</ul><div class="pull-left"', `${SECOND_ISSUE_ROW}</ul><div class="pull-left"`)
  .replaceAll("filter=bug", "filter=bulk")
  .replace(POPULATED_PAGINATION.replaceAll("filter=bug", "filter=bulk"), SINGLE_PAGE_PAGINATION);

const EXPECTED_PROJECT_ISSUES_BULK = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="bulk"',
)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">2</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${BULK_SPAN10}</div></div></div></div>\n<footer`,
  );

const SUBTASK_SPAN10 = POPULATED_SPAN10_WITH_TOOLBAR.replace(
  '<span class="mileston-tag"><a href="__BASE_PATH__/admin/sample/milestone/5" data-toggle="tooltip" data-placement="bottom" title="Milestone">v1.0</a></span>',
  '<div class="subtask-progress upload-progress red-outline"><div class="bar red" style="width: 33%;" title="Subtask"></div></div><span class="subtask-progress completion-ratio">1/3</span><span class="infos-item subtask"><a href="__BASE_PATH__/admin/sample/issue/9">#9 Parent iss...</a></span><span class="mileston-tag"><a href="__BASE_PATH__/admin/sample/milestone/5" data-toggle="tooltip" data-placement="bottom" title="Milestone">v1.0</a></span>',
).replaceAll("filter=bug", "filter=subtask");

const EXPECTED_PROJECT_ISSUES_SUBTASK = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="subtask"',
)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">1</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${SUBTASK_SPAN10}</div></div></div></div>\n<footer`,
  );

const WEIGHTED_SPAN10 = POPULATED_SPAN10_WITH_TOOLBAR.replace(
  '<li class="active"><button type="button" state="open">Open<span class="num-badge">1</span></button></li><li><button type="button" state="closed">Closed<span class="num-badge">2</span></button></li>',
  '<li><button type="button" state="open">Open<span class="num-badge">0</span></button></li><li class="active"><button type="button" state="closed">Closed<span class="num-badge">1</span></button></li>',
)
  .replace(
    '<div class="title-wrap"><a href="__BASE_PATH__/admin/sample/issue/11" class="title"><span class="post-id">#11</span></a><a href="__BASE_PATH__/admin/sample/issue/11" class="title">Fix flaky issue</a></div>',
    '<div class="title-wrap"><a href="__BASE_PATH__/admin/sample/issue/11" class="title"><span class="post-id">#11</span></a><span class="weight-up-arrow" data-toggle="tooltip" data-placement="right" title="Issue weight 4"><i class="yobicon-angle-circled-up"></i></span><a href="__BASE_PATH__/admin/sample/issue/11" class="title">Fix flaky issue</a></div>',
  )
  .replace(
    '<div class="mr20 mt10 pull-right overdue" data-toggle="tooltip" data-placement="top" title="Jun 30, 2026"><i class="yobicon-clock2 mr3 vmiddle"></i><span class="vmiddle">Overdue</span></div>',
    '<div class="mr20 mt10 pull-right darkgray-txt"><i class="yobicon-clock2 mr3 vmiddle"></i><span class="vmiddle">Jul 5, 2026</span></div>',
  )
  .replace("filter=bug&amp;format=xls", "filter=weighted&amp;state=closed&amp;format=xls")
  .replace(POPULATED_PAGINATION, SINGLE_PAGE_PAGINATION);

const EXPECTED_PROJECT_ISSUES_WEIGHTED_CLOSED = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="weighted"',
)
  .replace(
    '<input type="hidden" name="state" value="open">',
    '<input type="hidden" name="state" value="closed">',
  )
  .replace(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Closed<span class="num-badge pull-right">1</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${WEIGHTED_SPAN10}</div></div></div></div>\n<footer`,
  );

const CHILD_ISSUES = `<div class="child-issues"><div class="issue-item selected-child child-issue"><span class="state-label open"></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/13"><span class="item-name"><span class="subtask-number">#13</span><span>Open child issue</span><span> - Dev Member</span></span></a><span class="font12 no-border-at-child"><span class="item-count-groups"><a href="__BASE_PATH__/admin/sample/issue/13#comments" class="comments-count comments-count-color"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">2</span></a><a href="__BASE_PATH__/admin/sample/issue/13#vote" class="vote-count vote-color"><span class="count-groups item-icon"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a></span></span><a href="__BASE_PATH__/admin/sample/issues?state=open&amp;labelIds=8" class="label issue-label list-label active twoColumeModeTarget" data-category-id="3" data-label-id="8" style="${BUG_CHILD_LABEL_STYLE}">bug</a><span class="child-issue-date" title="Jul 3, 2026">Jul 3, 2026</span></div><div class="issue-item  child-issue"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/14"><span class="item-name"><span class="subtask-number">#14</span><span>Closed child issue</span><span></span></span></a><span class="font12 no-border-at-child"></span><span class="child-issue-date" title="Jul 4, 2026">Jul 4, 2026</span></div></div>`;
const CHILDREN_SPAN10 = POPULATED_SPAN10_WITH_TOOLBAR.replace(
  '<div class="child-issue-list hide"></div>',
  `<div class="child-issue-list hide">${CHILD_ISSUES}</div>`,
).replaceAll("filter=bug", "filter=children");

const EXPECTED_PROJECT_ISSUES_CHILDREN = EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll(
  'value="empty"',
  'value="children"',
)
  .replaceAll(
    '>Open<span class="num-badge pull-right">0</span>',
    '>Open<span class="num-badge pull-right">1</span>',
  )
  .replace(
    /<div class="span10 span-hard-wrap" id="span10">.*<\/div><\/div><\/div><\/div>\n<footer/su,
    `${CHILDREN_SPAN10}</div></div></div></div>\n<footer`,
  );

function withPopulatedSearchUsers(html: string) {
  return html
    .replace(EMPTY_AUTHOR_SELECT, POPULATED_AUTHOR_SELECT)
    .replace(EMPTY_ASSIGNEE_SELECT, POPULATED_ASSIGNEE_SELECT);
}

test("project issue list route source uses Link for navigation and buttons for side effects", async () => {
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("activeProps={{ className: undefined }}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("activeProps={legacyRouteLocalActiveProps}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('"aria-current": undefined');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('"data-status": undefined');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("LegacyInternalLink");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("ComponentType");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("AnchorHTMLAttributes");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("LegacyInertDropdownAnchor");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("LegacyTitlePrefixAnchor");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("ProjectIssuesRouteLink");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('"pjax-page": ""');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("pjax-page");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('"pjax-filter"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("pjax-filter");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('"data-pjax"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("href={excelHref(");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('to={excelHref("", ownerName, projectName');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("reloadDocument");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("<a\n                    href={excelHref");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('<a href={issueHref} className="title">');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("href={authorHref}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("href={`${issueHref}#comments`}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("href={`${issueHref}#vote`}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('to="/$ownerName/$projectName/issue/$issueNumber"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("params={issueParams}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('hash="comments"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('hash="vote"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("to={childLabelRoutePath(String(label.id))}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("const massUpdateOptionButtonStyle");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("style={massUpdateOptionButtonStyle}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('className="usf-group"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain(
    '<title>{`${projectName} - ${t("menu.issue")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("document.title");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("document.");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(["syncIssueSearch", "UserSelect"].join(""));
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(["selected", "Index"].join(""));
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(
    ["triggerHandler", '("change.select2")'].join(""),
  );
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("window.jQuery");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("jQuery?:");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(".jQuery?.");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('type IssueListState = "all" | "closed" | "open"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("state: issueListStateSearch(search.state)");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('state: issueListStateSearch(data.get("state"))');
});

test("project issue list mass update option buttons keep click ownership route-local", async () => {
  const massUpdateToolbarSource =
    PROJECT_ISSUES_ROUTE_SOURCE.match(
      /function MassUpdateToolbar\([\s\S]*?\nfunction MassUpdateDropdown/u,
    )?.[0] ?? "";
  const massUpdateDropdownSource =
    PROJECT_ISSUES_ROUTE_SOURCE.match(
      /function MassUpdateDropdown\([\s\S]*?\nfunction LabelMassUpdateDropdown/u,
    )?.[0] ?? "";
  const labelMassUpdateGroupSource =
    PROJECT_ISSUES_ROUTE_SOURCE.match(
      /function LabelMassUpdateGroup\([\s\S]*?\nfunction massUpdateDropdownGroupClassName/u,
    )?.[0] ?? "";

  expect(massUpdateToolbarSource).toContain("const handleMassUpdateOptionClick = (");
  expect(massUpdateToolbarSource).toContain("submitMassUpdate(name, value)");
  expect(massUpdateToolbarSource).toContain(
    'handleMassUpdateOptionClick(event, "assignee.id", "0")',
  );
  expect(massUpdateToolbarSource).toContain(
    'handleMassUpdateOptionClick(event, "assignee.id", user.id)',
  );
  expect(massUpdateToolbarSource).not.toContain("onClick={() => submitMassUpdate(");

  expect(massUpdateDropdownSource).toContain("const handleMassUpdateOptionClick = (");
  expect(massUpdateDropdownSource).toContain("onSelect(name, value)");
  expect(massUpdateDropdownSource).toContain(
    "onClick={(event) => handleMassUpdateOptionClick(event, option.value)}",
  );
  expect(massUpdateDropdownSource).not.toContain("onClick={() => onSelect(name, option.value)}");

  expect(labelMassUpdateGroupSource).toContain("const handleMassUpdateOptionClick = (");
  expect(labelMassUpdateGroupSource).toContain("onSelect(name, value)");
  expect(labelMassUpdateGroupSource).toContain(
    "onClick={(event) => handleMassUpdateOptionClick(event, label.id)}",
  );
  expect(labelMassUpdateGroupSource).not.toContain("onClick={() => onSelect(name, label.id)}");
});

test("project issue list route source does not duplicate common Select2 templates", async () => {
  const routeLocalSelect2Source =
    PROJECT_ISSUES_ROUTE_SOURCE.match(
      /function IssueListSelect2Partial\([\s\S]*?\nfunction ProjectIssuesBody/u,
    )?.[0] ?? "";

  expect(routeLocalSelect2Source).toContain("/assets/javascripts/lib/select2/select2.js");
  expect(routeLocalSelect2Source).toContain("/assets/javascripts/common/yobi.ui.Select2.js");

  for (const templateId of select2TemplateIds) {
    expect(routeLocalSelect2Source).not.toContain(templateId);
  }

  expect(routeLocalSelect2Source).not.toContain('type="text/x-jquery-tmpl"');
  expect(routeLocalSelect2Source).not.toContain("${avatarURL}");
  expect(routeLocalSelect2Source).not.toContain("${stateLabel}");
  expect(routeLocalSelect2Source).not.toContain("dangerouslySetInnerHTML");
});

test("project issue list route source does not inject route-local bootstrap scripts", async () => {
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('$yobi.loadModule("issue.List")');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("yobi.ShortcutKey.setKeymapLink");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("/assets/javascripts/lib/jquery.pageslide.js");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(
    "/assets/javascripts/service/yona.twoColumnMode.js",
  );
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(
    "/assets/javascripts/service/yona.showSubtask.js",
  );
});

test("project issue list keymap modal is route-owned React state", async () => {
  const keymapSource =
    PROJECT_ISSUES_ROUTE_SOURCE.match(
      /function IssueListKeymap\([\s\S]*?\nfunction KeymapEntry/u,
    )?.[0] ?? "";

  expect(keymapSource).toContain("const [keymapOpen, setKeymapOpen] = useState(false)");
  expect(keymapSource).toContain("setKeymapOpen(true)");
  expect(keymapSource).toContain("setKeymapOpen(false)");
  expect(keymapSource).not.toContain('data-toggle="modal"');
  expect(keymapSource).not.toContain('data-target="#helpKeys"');
  expect(keymapSource).not.toContain('data-dismiss="modal"');
  expect(keymapSource).toContain('className="modal-backdrop fade in"');
  expect(keymapSource).toContain('event.key === "Escape"');
  expect(keymapSource).not.toContain("document.");
  expect(keymapSource).not.toContain("classList");
  expect(keymapSource).not.toContain("style.display");
  expect(keymapSource).not.toContain("addEventListener");
});

test("project issue list anchors do not leak TanStack active markers", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page);

  await page.goto(`${basePath}/admin/sample/issues?filter=empty`);
  await expect(page).toHaveTitle("sample - Issue - admin/sample");
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".issue-list-wrap a[aria-current]")).toHaveCount(0);
  await expect(page.locator(".issue-list-wrap a[data-status]")).toHaveCount(0);
});

test("project issue search due-date validation uses React-owned input access", async () => {
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("const dueDateInputRef = useRef<HTMLInputElement>");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("ref={dueDateInputRef}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(
    "event.currentTarget.querySelector<HTMLInputElement>",
  );
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("\"[data-toggle='calendar']\"");
});

test("project issue list route source types legacy attrs without unsafe casts", async () => {
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(ROUTE_CAST_ESCAPE);
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("as unknown as");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("LegacyPjaxContainerAttributes");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("LegacyPjaxFilterAttributes");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain("LegacyDataPjaxAttributes");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('"pjax-container"');
  for (const shimName of [
    "pjaxContainer",
    "pjaxFilter",
    "legacyHref",
    "legacyFor",
    "legacyState",
    "dataPjax",
  ]) {
    expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(`${shimName} = {`);
    expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(`${shimName}:`);
  }

  for (const typedLegacyAttrs of [
    "satisfies LegacyStateButtonAttributes",
    "satisfies LegacyIssueRowListAttributes",
    "satisfies LegacyIssueRowForAttributes",
    "satisfies LegacyOrderAttributes",
  ]) {
    expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain(typedLegacyAttrs);
  }

  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("projectSearchScope={projectSearchScope}");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("projectSearchScopeOrganizationName(");
  expect(SITE_LAYOUT_SHELL_SOURCE).toContain('t("search.scope.group")');
  expect(SITE_LAYOUT_SHELL_SOURCE).toContain(
    "`/organizations/${projectSearchScope.organizationName}/search`",
  );
  expect(SITE_LAYOUT_SHELL_SOURCE).toContain('handleSearchScopeItemClick("group")');
});

test("protected org-owned project issue list exposes legacy group search scope and localhost row state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "portal-protected");

  await page.goto(`${basePath}/weblabs/portal/issues`);
  await expect(page).toHaveTitle("portal - Issue - weblabs/portal");
  await expect(page.locator(".gnb-outer")).toHaveClass("gnb-outer project-header");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form .search-box")).toHaveClass("search-box select");
  await expect(
    attributes(page, ".gnb-search-form [data-toggle='search-scope']", "data-action"),
  ).resolves.toEqual([
    `${basePath}/weblabs/portal/search`,
    `${basePath}/organizations/weblabs/search`,
    `${basePath}/search`,
  ]);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator(".gnb-search-form [data-toggle='search-scope']").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await page.locator(".gnb-search-form [data-toggle='search-scope']").nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-util .watcher-count")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/watchers`,
  );
  await expect(page.locator(".project-util .watcher-count")).toHaveText("2");
  await expect(page.locator(".project-util .watcher-count")).toHaveClass(/watch-on/);

  const issueLists = page.locator(".post-list-wrap.row-fluid");
  await expect(issueLists).toHaveCount(2);
  await expect(issueLists.first().locator(".post-item")).toHaveCount(0);
  await expect(issueLists.nth(1).locator(".post-item")).toHaveCount(1);

  const row = page.locator("#issue-item-2");
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("href", `${basePath}/weblabs/portal/issue/1`);
  await expect(row.locator(".title-wrap .title").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/issue/1`,
  );
  await expect(row.locator(".infos .infos-link-item")).toHaveText("Carol Lee");
  await expect(row.locator(".infos .infos-link-item")).toHaveAttribute("href", `${basePath}/carol`);
  await expect(row.locator(".span3 .avatar-wrap.assinee img")).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-128.png",
  );
  await expect(row.locator(".span3 span.vmiddle")).toHaveText("22 days");
  await expect(row.locator(".mileston-tag")).toHaveCount(0);
  await expect(row.locator(".item-count-groups")).toHaveCount(0);
  await expect(row.locator(".issue-label")).toHaveCount(0);
  await expect(page.locator(".pull-left .ybtn.small")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/issues?format=xls`,
  );
  await expect(page.getByRole("button", { name: "Keyboard shortcuts" })).toBeVisible();
});

test("protected org-owned project issue list keeps legacy gnb and issue-row geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "portal-protected");

  await page.goto(`${basePath}/weblabs/portal/issues`);
  await expect(page.locator("#issue-item-2")).toBeVisible();
  const boxes = await page.evaluate(() => {
    const navbar = document.querySelector(".gnb-outer");
    const searchForm = document.querySelector(".gnb-search-form");
    const searchBox = document.querySelector(".gnb-search-form .search-box");
    const issueRow = document.querySelector("#issue-item-2");
    const issueTitle = document.querySelector("#issue-item-2 .title-wrap");
    const issueMeta = document.querySelector("#issue-item-2 .infos");
    if (!navbar || !searchForm || !searchBox || !issueRow || !issueTitle || !issueMeta) {
      return null;
    }
    return {
      box: searchBox.getBoundingClientRect(),
      form: searchForm.getBoundingClientRect(),
      meta: issueMeta.getBoundingClientRect(),
      nav: navbar.getBoundingClientRect(),
      row: issueRow.getBoundingClientRect(),
      title: issueTitle.getBoundingClientRect(),
    };
  });

  expect(boxes).not.toBeNull();
  expect(boxes!.form.top).toBeGreaterThanOrEqual(boxes!.nav.top);
  expect(boxes!.form.bottom).toBeLessThanOrEqual(boxes!.nav.bottom);
  expect(boxes!.box.right).toBeLessThanOrEqual(boxes!.form.right);
  expect(boxes!.box.left).toBeGreaterThanOrEqual(boxes!.form.left);
  expect(boxes!.title.top).toBeGreaterThanOrEqual(boxes!.row.top);
  expect(boxes!.meta.top).toBeGreaterThanOrEqual(boxes!.title.bottom - 2);
  expect(boxes!.meta.bottom).toBeLessThanOrEqual(boxes!.row.bottom + 1);
});

test("empty project issue list matches legacy issue/list.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page);

  await page.goto(`${basePath}/admin/sample/issues?filter=empty`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator("[pjax-container]")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Issue");
  await expect(page.locator(".error-wrap")).toContainText("No issue found");
  await expect(
    page.locator(`link[href="${basePath}/admin/sample/issue/labels.css"]`),
  ).toHaveAttribute("rel", "stylesheet");
  await expect(
    page.locator(`link[href="${basePath}/admin/sample/issue/labels.css"]`),
  ).toHaveAttribute("type", "text/css");
  await expect(
    page.locator(`link[href="${basePath}/admin/sample/issue/labels.css"]`),
  ).toHaveAttribute("href", `${basePath}/admin/sample/issue/labels.css`);
  await expect(page.locator("#advanced-search-form #milestoneId")).toHaveAttribute(
    "data-format",
    "milestone",
  );
  await expect(page.locator(".issue-list-wrap a[aria-current]")).toHaveCount(0);
  await expect(page.locator(".issue-list-wrap a[data-status]")).toHaveCount(0);
  await expect(page.locator("#milestoneId optgroup[label='Open'] option")).toHaveText("v1.0");
  await expect(page.locator("#milestoneId optgroup[label='Closed'] option")).toHaveText("v0.9");
  expect(await issueListAssetSources(page, basePath)).toEqual([
    `${basePath}/assets/javascripts/lib/moment-with-langs.min.js`,
    `${basePath}/assets/javascripts/lib/pikaday/pikaday.js`,
    `${basePath}/assets/javascripts/common/yobi.ui.Calendar.js`,
  ]);
  expect(await scriptTextContains(page, '$yobi.loadModule("issue.List")')).toBe(false);
  expect(await scriptTextContains(page, "yobi.ShortcutKey.setKeymapLink")).toBe(false);
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain(
    'style={keymapOpen ? { display: "block" } : undefined}',
  );
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("TWO_COLUMN_MODE_POPOVER_STYLE");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain("SHOW_SUBTASKS_POPOVER_STYLE");
  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('className="popover top"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE.split("}, 100);").length - 1).toBeGreaterThanOrEqual(4);
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('data-toggle="popover"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('data-trigger="hover"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(
    'data-content={t("common.two.column.mode.desc")}',
  );
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain(
    'data-content={t("common.show.subtasks.desc")}',
  );
  await expectIssueListSelect2Partial(page, basePath);
  const twoColumnWrapper = page.locator(".nav-tabs .two-column-icon");
  await expect(twoColumnWrapper).toHaveAttribute("title", "Two Column Mode");
  await expect(twoColumnWrapper).not.toHaveAttribute("data-toggle", "popover");
  await expect(twoColumnWrapper).not.toHaveAttribute("data-trigger", "hover");
  await expect(twoColumnWrapper).not.toHaveAttribute("data-placement", "top");
  await expect(twoColumnWrapper).not.toHaveAttribute(
    "data-content",
    "Splits list and body into columns respectively",
  );
  await expect(twoColumnWrapper.locator(".popover.top")).toHaveCount(0);
  const showSubtasksWrapper = page.locator(".show-subtasks-li .show-subtasks");
  await expect(showSubtasksWrapper).toHaveAttribute("title", "Show subtask");
  await expect(showSubtasksWrapper).not.toHaveAttribute("data-toggle", "popover");
  await expect(showSubtasksWrapper).not.toHaveAttribute("data-trigger", "hover");
  await expect(showSubtasksWrapper).not.toHaveAttribute("data-placement", "top");
  await expect(showSubtasksWrapper).not.toHaveAttribute("data-content", "Show subtask always");
  await expect(showSubtasksWrapper.locator(".popover.top")).toHaveCount(0);

  expect(await issueListShellMetrics(page)).toEqual({
    wrapClear: "both",
    leftMenuClassName: "left-menu span2 span-hard-wrap",
    rightPaneClassName: "span10 span-hard-wrap",
    newIssueAboveTabs: true,
    tabBeforeEmptyState: true,
    emptyIconBeforeText: true,
    searchBarBorder: "1px solid rgb(204, 204, 204)",
    searchBarBorderRadius: "3px",
    searchBarHeight: "20px",
    searchButtonRight: "5px",
    advancedMarginTop: "10px",
    issueOptionMarginBottom: "16px",
  });
  await expect(
    page.locator('.issue-list-wrap #span10 > .pull-left a[href="#helpKeys"]'),
  ).toHaveCount(0);
  const keymapButton = page.locator(
    '.issue-list-wrap #span10 > .pull-left > button[type="button"]',
  );
  await expect(keymapButton).toHaveText("Keyboard shortcuts");
  await expect(keymapButton).toHaveClass("ybtn ybtn-inverse ybtn-mini");
  await expect(keymapButton).not.toHaveAttribute("data-toggle", "modal");
  await expect(keymapButton).not.toHaveAttribute("data-target", "#helpKeys");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_ISSUES_EMPTY.replaceAll("__BASE_PATH__", basePath),
    ),
  );

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-list-keymap";
    document.addEventListener("click", (event) => {
      if (
        (event.target as Element | null)?.closest(
          '[data-toggle="modal"], [data-target="#helpKeys"], [data-dismiss="modal"]',
        )
      ) {
        (
          window as Window & { __issueListDelegatedModalClick?: string }
        ).__issueListDelegatedModalClick = "delegated";
      }
    });
  });
  const beforeUrl = page.url();
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/u);
  await expect(page.locator("#helpKeys")).not.toHaveAttribute("style", /display/u);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await keymapButton.click();
  await expect(page.locator("#helpKeys")).not.toHaveClass(/hide/u);
  await expect(page.locator("#helpKeys")).toHaveClass(/in/u);
  await expect(page.locator("#helpKeys")).toHaveAttribute("style", "display: block;");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  expect(page.url()).toBe(beforeUrl);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-list-keymap");
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __issueListDelegatedModalClick?: string })
          .__issueListDelegatedModalClick,
    ),
  ).toBeUndefined();
  await page.keyboard.press("Escape");
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/u);
  await expect(page.locator("#helpKeys")).not.toHaveClass(/in/u);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await keymapButton.click();
  await expect(page.locator("#helpKeys")).toHaveClass(/in/u);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await page.locator(".modal-backdrop.fade.in").click({ position: { x: 1, y: 1 } });
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/u);
  await expect(page.locator("#helpKeys")).not.toHaveClass(/in/u);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await keymapButton.click();
  await expect(page.locator("#helpKeys")).toHaveClass(/in/u);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  const confirmButton = page.locator("#helpKeys").getByRole("button", { name: "Confirm" });
  await expect(confirmButton).not.toHaveAttribute("data-dismiss", "modal");
  await confirmButton.click();
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/u);
  await expect(page.locator("#helpKeys")).not.toHaveClass(/in/u);
  await expect(page.locator("#helpKeys")).not.toHaveAttribute("style", /display/u);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __issueListDelegatedModalClick?: string })
          .__issueListDelegatedModalClick,
    ),
  ).toBeUndefined();
});

async function expectIssueListSelect2Partial(page: Page, basePath: string) {
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

const select2TemplateIds = [
  "tplSelect2FormatUser",
  "tplSelect2FormatMilestone",
  "tplSelect2Projects",
  "tplSelect2ProjectsWithoutAvatar",
  "tplSelect2FormatIssues",
];

test("project issue list search form renders legacy partial_select_label when project labels exist", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "project-labels");

  await page.goto(`${basePath}/admin/sample/issues?filter=empty&labelIds=8`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".labels-wrap > .ybtn")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(page.locator(".labels-wrap > .ybtn span.vmiddle")).toHaveCount(0);
  await expect(page.locator(".labels-wrap dl.issue-option dt")).toContainText("Label");
  await expect(page.locator(".labels-wrap .label-edit")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(page.locator("#labelIds")).toHaveAttribute("multiple", "");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-search", "labelIds");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-format", "issuelabel");
  await expect(page.locator("#labelIds")).toHaveAttribute(
    "data-dropdown-css-class",
    "issue-labels",
  );
  await expect(page.locator("#labelIds")).toHaveAttribute(
    "data-container-css-class",
    "issue-labels bordered fullsize",
  );
  await expect(page.locator("#labelIds")).toHaveAttribute("data-placeholder", "Select label");
  await expect(page.locator("#labelIds optgroup")).toHaveAttribute("label", "bug");
  await expect(page.locator("#labelIds optgroup")).toHaveAttribute("data-category-id", "3");
  await expect(page.locator("#labelIds optgroup")).toHaveAttribute(
    "data-category-is-exclusive",
    "false",
  );
  await expect(page.locator('#labelIds option[value="8"]')).toHaveAttribute(
    "data-category-id",
    "3",
  );
  await expect(page.locator('#labelIds option[value="8"]')).toHaveText("bug");
});

test("project issue list label select hides legacy edit link for non-managers", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "project-labels-non-manager");

  await page.goto(`${basePath}/admin/sample/issues?filter=empty&labelIds=8`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".labels-wrap > .ybtn")).toHaveCount(0);
  await expect(page.locator(".labels-wrap dl.issue-option dt")).toContainText("Label");
  await expect(page.locator(".labels-wrap .label-edit")).toHaveCount(0);
  await expect(page.locator("#labelIds")).toHaveAttribute("multiple", "");
  await expect(page.locator('#labelIds option[value="8"]')).toHaveText("bug");
});

test("project issue list search form renders selected milestone status like legacy partial_status.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "milestone-selected");

  await page.goto(`${basePath}/admin/sample/issues?filter=empty&milestoneId=5`);
  await expect(page.locator("#advanced-search-form #milestoneId")).toHaveValue("5");

  const status = page.locator("#advanced-search-form .milestone-info");
  await expect(status.locator(".meta-info .title")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestone/5`,
  );
  await expect(status.locator(".meta-info .title")).toHaveText("v1.0");
  await expect(status.locator(".due-date")).toHaveClass("due-date");
  await expect(status.locator(".due-date strong")).toHaveText("Jul 5, 2026");
  await expect(status.locator(".due-date .date")).toHaveText("(4 days left)");
  await expect(status.locator(".progress.progress-success.nm .bar")).toHaveAttribute(
    "style",
    "width: 50%;",
  );
  await expect(status.locator(".progress-info .pull-right strong")).toHaveText("1 / 2");
  await expect(page.locator("#advanced-search-form .milestone-info + hr")).toHaveCount(1);
});

test("anonymous project issue list hides current-user quick search links like legacy partial_list_quicksearch.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "anonymous");

  await page.goto(`${basePath}/admin/sample/issues?filter=empty`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".left-menu .lst-stacked li")).toHaveCount(1);
  await expect(
    page.locator('.left-menu .lst-stacked button[type="button"][data-assignee-id=""]'),
  ).toContainText("Open");
  await expect(page.locator('.left-menu .lst-stacked a[href="#"]')).toHaveCount(0);
  await expect(page.locator(".left-menu .lst-stacked [pjax-filter]")).toHaveCount(0);
  await expect(page.locator(".left-menu .lst-stacked", { hasText: "Assigned" })).toHaveCount(0);
  await expect(page.locator(".left-menu .lst-stacked", { hasText: "Created" })).toHaveCount(0);
  await expect(page.locator(".left-menu .lst-stacked", { hasText: "Commented" })).toHaveCount(0);
});

test("project issue search keeps member self-filters without update controls like legacy partial_searchform.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "member-no-update");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".mass-update-wrap")).toHaveCount(0);
  await expect(page.locator(".mass-update-check")).toHaveCount(0);
  await expect(page.locator("#authorId option")).toHaveText([
    "All",
    "Created",
    "Dev Member",
    "Site Admin",
  ]);
  await expect(page.locator("#assigneeId option")).toHaveText([
    "All",
    "No assignee",
    "Assigned",
    "Site Admin",
  ]);
});

test("project issue advanced search prefers legacy current-user options and submits them", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&authorId=1&assigneeId=1&pageNum=3`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator("#authorId option")).toHaveText([
    "All",
    "Created",
    "Dev Member",
    "Site Admin",
  ]);
  await expect(page.locator("#assigneeId option")).toHaveText([
    "All",
    "No assignee",
    "Assigned",
    "Site Admin",
  ]);
  await expect
    .poll(async () =>
      page.locator("#authorId").evaluate((select) => {
        const selectedOption = select.selectedOptions.item(0);
        return {
          loginId: selectedOption?.getAttribute("data-login-id") ?? "",
          text: selectedOption?.textContent?.trim() ?? "",
          value: select.value,
        };
      }),
    )
    .toEqual({
      loginId: "admin",
      text: "Site Admin",
      value: "1",
    });
  await expect
    .poll(async () =>
      page.locator("#assigneeId").evaluate((select) => {
        const selectedOption = select.selectedOptions.item(0);
        return {
          loginId: selectedOption?.getAttribute("data-login-id") ?? "",
          text: selectedOption?.textContent?.trim() ?? "",
          value: select.value,
        };
      }),
    )
    .toEqual({
      loginId: "admin",
      text: "Site Admin",
      value: "1",
    });

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "issue-advanced-search-submit";
  });
  await page.locator("#search input[name='filter']").fill("current-user");
  await page.locator("#search [data-submit='submit']").click();

  await expect.poll(() => new URL(page.url()).searchParams.get("authorId") ?? "").toBe("1");
  await expect.poll(() => new URL(page.url()).searchParams.get("assigneeId") ?? "").toBe("1");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("filter") ?? "")
    .toBe("current-user");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("1");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-advanced-search-submit");
});

test("populated project issue list matches legacy partial_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(
    page.locator('.lst-stacked button[type="button"][data-assignee-id="1"]'),
  ).toContainText("Assigned");
  await expect(
    page.locator('.lst-stacked button[type="button"][data-author-id="1"]'),
  ).toContainText("Created");
  await expect(
    page.locator('.lst-stacked button[type="button"][data-commenter-id="1"]'),
  ).toContainText("Commented");
  await expect(page.locator('.lst-stacked a[href="#"]')).toHaveCount(0);
  await expect(page.locator(".lst-stacked [pjax-filter]")).toHaveCount(0);
  await expect(page.locator("#issue-item-42")).toHaveAttribute(
    "data-value",
    "dev 11 Fix flaky issue",
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee img")).toHaveAttribute(
    "alt",
    "Site Admin",
  );
  const authorLink = page.locator("#issue-item-42 .infos > .infos-link-item");
  await expect(authorLink).toHaveAttribute("data-toggle", "tooltip");
  await expect(authorLink).toHaveAttribute("data-placement", "bottom");
  await expect(page.locator("#issue-42")).toHaveAttribute("data-issue-id", "42");
  await expect(page.locator("#issue-42")).toHaveAttribute(
    "data-issue-labels",
    "bug,8,bug,3,false|",
  );
  const rowMilestoneLink = page.locator("#issue-item-42 .mileston-tag a");
  await expect(rowMilestoneLink).toHaveAttribute("href", `${basePath}/admin/sample/milestone/5`);
  await expect(rowMilestoneLink).toHaveAttribute("data-toggle", "tooltip");
  await expect(rowMilestoneLink).toHaveAttribute("data-placement", "bottom");
  await expect(rowMilestoneLink).toHaveAttribute("title", "Milestone");
  await expect(page.locator("#mass-update-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/issues`,
  );
  await expect(page.locator("#attach-label-list [data-value='8']")).toHaveAttribute(
    "data-category",
    "3",
  );
  await expect(page.locator('.issue-label[data-label-id="8"]')).toHaveCount(3);
  await expect(page.locator('#authorId option[data-login-id="dev"]')).toHaveAttribute(
    "data-avatar-url",
    "/assets/images/default-avatar-32.png",
  );
  await expect(page.locator('#assigneeId option[data-login-id="admin"]')).toHaveAttribute(
    "data-avatar-url",
    "/assets/images/default-avatar-32.png",
  );

  expect(await issueListRowMetrics(page)).toEqual({
    listStyle: "none",
    listPaddingLeft: "0px",
    rowClear: "both",
    rowDisplay: "block",
    rowOverflow: "auto",
    rowPadding: "10px",
    rowBorderBottom: "1px solid rgb(221, 221, 221)",
    checkboxFloat: "left",
    checkboxMarginRight: "15px",
    checkboxInputMarginTop: "15px",
    titleWrapDisplay: "block",
    titleWrapLineHeight: "20px",
    titleWrapOverflow: "hidden",
    titleWrapTextOverflow: "ellipsis",
    titleWrapWhiteSpace: "nowrap",
    postIdColor: "rgb(153, 153, 153)",
    postIdFontSize: "13px",
    postIdFontWeight: "700",
    postIdMarginRight: "5px",
    titleColor: "rgb(51, 51, 51)",
    titleFontSize: "15px",
    titleFontWeight: "600",
    infosColor: "rgb(153, 153, 153)",
    infosFontSize: "12px",
    infosLineHeight: "20px",
    authorBeforeDate: true,
    titleAboveInfos: true,
    assigneeRightOfMainColumn: true,
    dueDateLeftOfAssignee: true,
  });
  expect(
    await issueLabelDomMetrics(page, ".post-list-wrap .issue-item-row > .infos > .issue-label"),
  ).toEqual({
    dataLabelId: "8",
    href: null,
    styleAttr: null,
    tagName: "BUTTON",
    text: "bug",
    type: "button",
  });
  expect(await issueCommentCountMetrics(page)).toEqual({
    href: `${basePath}/admin/sample/issue/11#comments`,
    className: "comments-count comments-count-color",
    color: "rgb(139, 0, 139)",
    iconClassName: "count-groups item-icon",
    commentIconClassName: "yobicon-comment2",
    countClassName: "count-groups item-count",
    countText: "3",
    iconBeforeCount: true,
  });
  expect(await issueVoteCountMetrics(page)).toEqual({
    groupClassName: "infos-item item-count-groups",
    groupMarginTop: "2px",
    groupLineHeight: "14px",
    groupBorder: "1px solid rgb(238, 238, 238)",
    groupBorderRadius: "3px",
    href: `${basePath}/admin/sample/issue/11#vote`,
    className: "vote-count vote-color",
    color: "rgb(243, 108, 34)",
    iconClassName: "count-groups item-icon",
    iconPadding: "2px 5px 0px",
    iconFontSize: "9px",
    iconLineHeight: "12px",
    heartClassName: "yobicon-hearts",
    countClassName: "count-groups item-count strong",
    countPadding: "0px 5px 0px 0px",
    countText: "1",
    marginLeft: "-5px",
    iconBeforeCount: true,
  });

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_ISSUES_POPULATED.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("standard project-owned issue list restores legacy common/navbar.scala.html shell links and projectMenu.scala.html count badges", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);

  const listAllLink = page.locator(".gnb-nav .show-progress-bar");
  await expect(listAllLink).toHaveText("List All");
  await expect(listAllLink).toHaveAttribute("href", `${basePath}/projects`);

  const feedbackLink = page.locator('.gnb-nav a[target="_blank"]', { hasText: "Feedback" });
  await expect(feedbackLink).toHaveAttribute(
    "href",
    "https://github.com/yona-projects/yona/issues",
  );

  const searchScopeButtons = page.locator(".gnb-search-form .dropdown-menu button");
  await expect(searchScopeButtons).toHaveText(["This Project", "All Projects"]);
  await expect(searchScopeButtons).toHaveCount(2);
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");

  await page.locator("#gnb-search-scope-title").click();
  await page
    .locator('.gnb-search-form .dropdown-menu button[type="button"]', {
      hasText: "All Projects",
    })
    .click();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");

  await page.locator("#gnb-search-scope-title").click();
  await page
    .locator('.gnb-search-form .dropdown-menu button[type="button"]', {
      hasText: "This Project",
    })
    .click();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");

  const projectMenuCounts = await page.locator(".project-menu-gruop > li").evaluateAll((items) =>
    items
      .map((item) => ({
        count: item.querySelector(".project-menu-count")?.textContent?.trim() ?? "",
        name: item.querySelector(".menu-name")?.textContent?.trim() ?? "",
      }))
      .filter((item) => item.count !== ""),
  );
  expect(projectMenuCounts).toEqual([
    { count: "1", name: "Issue" },
    { count: "1", name: "Pull request" },
    { count: "2", name: "Review" },
    { count: "1", name: "Board" },
  ]);

  await expect(page.locator(".project-menu-gruop > li.active .menu-name")).toHaveText("Issue");
  const shellBoxes = await page.evaluate(() => {
    const gnb = document.querySelector(".gnb-outer.project-header");
    const header = document.querySelector(".project-header-outer");
    const menu = document.querySelector(".project-menu-outer");
    const pageWrap = document.querySelector(".page-wrap-outer");
    const activeIssue = document.querySelector(".project-menu-gruop > li.active");
    const issueCount = activeIssue?.querySelector(".project-menu-count");
    if (!gnb || !header || !menu || !pageWrap || !activeIssue || !issueCount) return null;
    const g = gnb.getBoundingClientRect();
    const h = header.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const p = pageWrap.getBoundingClientRect();
    const active = activeIssue.getBoundingClientRect();
    const count = issueCount.getBoundingClientRect();
    return {
      active,
      count,
      gnb: g,
      header: h,
      menu: m,
      pageWrap: p,
    };
  });
  expect(shellBoxes).not.toBeNull();
  expect(shellBoxes!.header.top).toBeGreaterThanOrEqual(shellBoxes!.gnb.top);
  expect(shellBoxes!.menu.top).toBeGreaterThanOrEqual(shellBoxes!.gnb.bottom - 1);
  expect(shellBoxes!.menu.top).toBeGreaterThanOrEqual(shellBoxes!.header.top);
  expect(shellBoxes!.pageWrap.top).toBeGreaterThanOrEqual(shellBoxes!.menu.bottom - 1);
  expect(shellBoxes!.active.top).toBeGreaterThanOrEqual(shellBoxes!.menu.top);
  expect(shellBoxes!.active.bottom).toBeLessThanOrEqual(shellBoxes!.menu.bottom + 1);
  expect(shellBoxes!.count.left).toBeGreaterThan(shellBoxes!.active.left);
  expect(shellBoxes!.count.right).toBeLessThanOrEqual(shellBoxes!.active.right + 1);
});

test("project issue normal list draft marker matches legacy partial_list.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "normal-draft");

  await page.goto(`${basePath}/admin/sample/issues?filter=normal-draft`);
  const row = page.locator("#issue-item-47");
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("data-value", "admin 17 Inline draft issue");
  await expect(row.locator(".title-wrap > a.title").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/17`,
  );
  await expect(row.locator(".post-id")).toHaveText("#Draft");
  await expect(row.locator(".post-id .draft-number")).toHaveText("Draft");

  expect(
    await row.locator(".post-id").evaluate((node) => ({
      draftText: node.querySelector(".draft-number")?.textContent ?? "",
      firstTextNode: Array.from(node.childNodes).find((child) => child.nodeType === Node.TEXT_NODE)
        ?.textContent,
      text: node.textContent,
    })),
  ).toEqual({
    draftText: "Draft",
    firstTextNode: "#",
    text: "#Draft",
  });
});

test("project issue row milestone link preserves legacy partial_list.scala.html tooltip attrs", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  const rowMilestoneLink = page.locator("#issue-item-42 .mileston-tag a");

  await expect(rowMilestoneLink).toHaveAttribute("href", `${basePath}/admin/sample/milestone/5`);
  await expect(rowMilestoneLink).toHaveAttribute("data-toggle", "tooltip");
  await expect(rowMilestoneLink).toHaveAttribute("data-placement", "bottom");
  await expect(rowMilestoneLink).toHaveAttribute("title", "Milestone");
  await expect(rowMilestoneLink).toHaveText("v1.0");
});

test("project issue row assignee avatar preserves legacy partial_list.scala.html tooltip attrs", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  const assigneeAvatarLink = page.locator("#issue-item-42 .avatar-wrap.assinee");

  await expect(assigneeAvatarLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(assigneeAvatarLink).toHaveAttribute("data-toggle", "tooltip");
  await expect(assigneeAvatarLink).toHaveAttribute("data-placement", "top");
  await expect(assigneeAvatarLink).toHaveAttribute("title", "Assignee: Site Admin");
});

test("project issue row hides assignee avatar when legacy assigneeName is blank", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "blank-assignee-label");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  await expect(page.locator("#issue-item-42")).toBeVisible();
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee")).toHaveCount(0);
  await expect(page.locator("#issue-item-42 .empty-avatar-wrap")).toHaveText("\u00a0");
});

test("project issue normal list hides other users' drafts like legacy partial_list.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "normal-foreign-draft");

  await page.goto(`${basePath}/admin/sample/issues?filter=normal-foreign-draft`);

  await expect(page.locator("#issue-item-48")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid")).toHaveCount(1);
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid")).toBeEmpty();
  await expect(page.locator(".error-wrap")).toHaveCount(0);
});

test("project issue quick search updates route like legacy partial_list_quicksearch.scala.html pjax filter", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&pageNum=3`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-quick-search";
  });

  await expect(page.locator('.lst-stacked a[href="#"]')).toHaveCount(0);
  await expect(page.locator(".lst-stacked [pjax-filter]")).toHaveCount(0);
  await page.locator('.lst-stacked button[data-assignee-id="1"]').click();

  await expect.poll(() => new URL(page.url()).searchParams.get("assigneeId") ?? "").toBe("1");
  await expect.poll(() => new URL(page.url()).searchParams.get("authorId") ?? "").toBe("");
  await expect.poll(() => new URL(page.url()).searchParams.get("commenterId") ?? "").toBe("");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("1");
  await expect
    .poll(async () =>
      page.locator("#assigneeId").evaluate((select) => {
        const selectedOption = select.selectedOptions.item(0);
        return {
          loginId: selectedOption?.getAttribute("data-login-id") ?? "",
          text: selectedOption?.textContent?.trim() ?? "",
          value: select.value,
        };
      }),
    )
    .toEqual({
      loginId: "admin",
      text: "Site Admin",
      value: "1",
    });
  await expect(page.locator('.lst-stacked li:has(button[data-assignee-id="1"])')).toHaveClass(
    "active",
  );
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-quick-search");
});

test("project issue pagination updates route like legacy yobi.Pagination through SPA links", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  await expect(page.locator("#pagination a[pjax-page]")).toHaveCount(0);
  const nextPage = page.locator("#pagination a").last();
  await expect(nextPage).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?filter=bug&orderBy=updatedDate&orderDir=desc&pageNum=2&state=open`,
  );
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-pagination";
  });

  await nextPage.click();

  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("2");
  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("bug");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-pagination");
});

test("project issue pagination anchors do not leak TanStack active markers on page 2", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&pageNum=2&state=open`);
  const prevPage = page.locator("#pagination a").first();
  const nextPage = page.locator("#pagination a").last();

  await expect(prevPage).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?filter=bug&orderBy=updatedDate&orderDir=desc&pageNum=1&state=open`,
  );
  await expect(nextPage).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?filter=bug&orderBy=updatedDate&orderDir=desc&pageNum=3&state=open`,
  );
  for (const paginationLink of [prevPage, nextPage]) {
    await expect(paginationLink).not.toHaveAttribute("class", /.*/u);
    await expect(paginationLink).not.toHaveAttribute("aria-current", /.*/u);
    await expect(paginationLink).not.toHaveAttribute("data-status", /.*/u);
  }
});

test("project issue pagination input clamps and routes like legacy yobi.Pagination keydown", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  const pageInput = page.locator('#pagination input[name="pageNum"][type="number"]');
  await pageInput.click();
  await pageInput.fill("9");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-page-input";
  });

  await pageInput.press("Enter");

  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("3");
  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("bug");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-page-input");
});

test("project issue pagination input rejects decimal text like legacy yobi.Pagination keydown", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&pageNum=2&state=open`);
  const pageInput = page.locator('#pagination input[name="pageNum"][type="number"]');
  await pageInput.click();
  await pageInput.fill("1.5");
  const beforeUrl = page.url();

  await pageInput.press("Enter");

  await expect(pageInput).toHaveValue("2");
  expect(page.url()).toBe(beforeUrl);
});

test("project issue Excel export href removes pageNum like legacy partial_list_wrap.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&state=open&pageNum=1`);
  await expect(
    page.locator('.pull-left a.ybtn.small:has-text("Download as Excel file")'),
  ).toHaveAttribute("href", `${basePath}/admin/sample/issues?filter=bug&state=open&format=xls`);

  await page.goto(
    `${basePath}/admin/sample/issues?filter=bug&pageNum=3&orderBy=createdDate&orderDir=asc&state=closed&labelIds=8`,
  );

  await expect(
    page.locator('.pull-left a.ybtn.small:has-text("Download as Excel file")'),
  ).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?filter=bug&orderBy=createdDate&orderDir=asc&state=closed&labelIds=8&format=xls`,
  );
});

test("project issue row hover matches legacy issue.List hover effect", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    (
      window as unknown as { __issueListNativeHoverListenerTypes: string[] }
    ).__issueListNativeHoverListenerTypes = [];
    Element.prototype.addEventListener = function (type, listener, options) {
      if ((type === "mouseover" || type === "mouseout") && this instanceof HTMLElement) {
        if (this.id === "span10") {
          (
            window as unknown as { __issueListNativeHoverListenerTypes: string[] }
          ).__issueListNativeHoverListenerTypes.push(type);
        }
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  const row = page.locator("#issue-item-42");
  await expect(row).toBeVisible();

  await row.hover();
  await expect(row).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await page.mouse.move(0, 0);
  await expect(row).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const nativeHoverListenerTypes = await page.evaluate(
    () =>
      (window as unknown as { __issueListNativeHoverListenerTypes: string[] })
        .__issueListNativeHoverListenerTypes,
  );
  expect(nativeHoverListenerTypes).toEqual([]);
});

test("project issue search button submits route like legacy partial_searchform.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(
    `${basePath}/admin/sample/issues?filter=bug&pageNum=3&state=closed&orderBy=createdDate&orderDir=asc`,
  );
  await expect(page.locator("#search input[name='filter']")).toHaveValue("bug");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-search-submit";
  });

  await page.locator("#search input[name='filter']").fill("urgent");
  await page.locator("#search [data-submit='submit']").click();

  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("urgent");
  await expect.poll(() => new URL(page.url()).searchParams.get("state") ?? "").toBe("closed");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("orderBy") ?? "")
    .toBe("createdDate");
  await expect.poll(() => new URL(page.url()).searchParams.get("orderDir") ?? "").toBe("asc");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("1");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-search-submit");
});

test("project issue list preserves legacy state=all destination and search payload semantics", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "empty");

  const initialIssueListRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      request.method() === "GET" &&
      url.pathname.endsWith("/api/v1/projects/admin/sample/issues") &&
      url.searchParams.get("state") === "all"
    );
  });

  await page.goto(`${basePath}/admin/sample/issues?state=all`);
  const initialRequest = await initialIssueListRequest;
  const initialUrl = new URL(initialRequest.url());
  expect(initialUrl.searchParams.get("state")).toBe("all");

  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator("#search input[name='state']")).toHaveValue("all");
  await expect(page.locator(".left-menu .lst-stacked > li").first()).toContainText("Open");
  await expect(page.locator("#span10 > .nav-tabs [state]")).toHaveCount(2);
  await expect(page.locator("#span10 > .nav-tabs [state='open']")).toBeVisible();
  await expect(page.locator("#span10 > .nav-tabs [state='closed']")).toBeVisible();
  await expect(page.locator("#span10 > .nav-tabs > li.active")).toHaveCount(0);

  const submittedIssueListRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      request.method() === "GET" &&
      url.pathname.endsWith("/api/v1/projects/admin/sample/issues") &&
      url.searchParams.get("filter") === "urgent" &&
      url.searchParams.get("state") === "all"
    );
  });
  await page.locator("#search input[name='filter']").fill("urgent");
  await page.locator("#search [data-submit='submit']").click();
  const submittedRequest = await submittedIssueListRequest;
  const submittedUrl = new URL(submittedRequest.url());

  expect(submittedUrl.searchParams.get("filter")).toBe("urgent");
  expect(submittedUrl.searchParams.get("state")).toBe("all");
  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("urgent");
  await expect.poll(() => new URL(page.url()).searchParams.get("state") ?? "").toBe("all");
});

test("project issue unchanged blur keeps URL and skips issue-list GET like legacy partial_searchform.scala.html change submit", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  const sawProjectIssueListGet = async () => {
    return page
      .waitForRequest(
        (request) => {
          if (request.method() !== "GET") {
            return false;
          }
          return new URL(request.url()).pathname.endsWith("/api/v1/projects/admin/sample/issues");
        },
        { timeout: 300 },
      )
      .then(() => true)
      .catch(() => false);
  };

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&pageNum=3&state=open`);
  await page.waitForLoadState("networkidle");
  const initialUrl = page.url();

  const filterInput = page.locator("#search input[name='filter']");
  await filterInput.focus();
  await expect(filterInput).toBeFocused();
  const filterBlurTriggeredGet = sawProjectIssueListGet();
  await filterInput.blur();
  expect(await filterBlurTriggeredGet).toBe(false);
  expect(page.url()).toBe(initialUrl);

  const dueDateInput = page.locator("#issueDueDate");
  await dueDateInput.focus();
  await expect(dueDateInput).toBeFocused();
  const dueDateBlurTriggeredGet = sawProjectIssueListGet();
  await dueDateInput.blur();
  expect(await dueDateBlurTriggeredGet).toBe(false);
  expect(page.url()).toBe(initialUrl);
});

test("project issue search blocks invalid due date like legacy issue.List submit validation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&pageNum=3`);
  await page.locator("#issueDueDate").fill("not-a-date");
  await page.locator("#search [data-submit='submit']").click();

  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("bug");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "").toBe("3");
  await expect(page.locator("#issueDueDate")).toBeFocused();
  await expect(page.locator(".yobiToasts .toast .msg").first()).toHaveText(
    "Issue due date is not valid date type.",
  );
});

test("project issue search field change submits route like legacy issue.List data-search change", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    (
      window as unknown as { __issueSearchNativeChangeListenerTypes: string[] }
    ).__issueSearchNativeChangeListenerTypes = [];
    Element.prototype.addEventListener = function (type, listener, options) {
      if (type === "change" && this instanceof HTMLFormElement && this.id === "search") {
        (
          window as unknown as { __issueSearchNativeChangeListenerTypes: string[] }
        ).__issueSearchNativeChangeListenerTypes.push(type);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&pageNum=3&orderBy=createdDate`);
  await expect(page.locator("#search #authorId")).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-search-change";
  });

  await page.locator("#search #authorId").selectOption("2");

  await expect.poll(() => new URL(page.url()).searchParams.get("authorId") ?? "").toBe("2");
  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("bug");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("orderBy") ?? "")
    .toBe("createdDate");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("1");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-search-change");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __issueSearchNativeChangeListenerTypes: string[] })
          .__issueSearchNativeChangeListenerTypes,
    ),
  ).toEqual([]);
});

test("project issue state tab updates route like legacy partial_list_wrap.scala.html pjax tab", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&pageNum=3`);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-state-tab";
  });

  await expect(page.locator('.nav-tabs li a[href="#"][state]')).toHaveCount(0);
  await expect(page.locator(".nav-tabs li[data-pjax]")).toHaveCount(0);
  await page.locator('.nav-tabs li button[type="button"][state="closed"]').click();

  await expect.poll(() => new URL(page.url()).searchParams.get("state") ?? "").toBe("closed");
  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("bug");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("1");
  await expect(page.locator('.nav-tabs li:has(button[state="closed"])')).toHaveClass("active");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-state-tab");
});

test("project issue sort filter updates route like legacy partial_list_wrap.scala.html order filter", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "bulk");
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    (
      window as unknown as { __issueSortFilterNativeListeners: string[] }
    ).__issueSortFilterNativeListeners = [];
    Element.prototype.addEventListener = function (type, listener, options) {
      if (type === "click" && this instanceof HTMLElement) {
        if (this.matches(".filter-wrap .filter[orderBy]")) {
          (
            window as unknown as { __issueSortFilterNativeListeners: string[] }
          ).__issueSortFilterNativeListeners.push(this.getAttribute("orderBy") ?? "");
        }
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  await page.goto(`${basePath}/admin/sample/issues?filter=bulk&pageNum=3`);
  await expect(page.locator(".filter-wrap .filters")).toBeVisible();
  const dueDateFilter = page.locator(
    '.filter-wrap button.filter[type="button"][orderBy="dueDate"]',
  );
  const updatedFilter = page.locator(
    '.filter-wrap button.filter[type="button"][orderBy="updatedDate"]',
  );
  await expect(page.locator('.filter-wrap a[href="#"].filter[orderBy]')).toHaveCount(0);
  await expect(dueDateFilter).toHaveAttribute("type", "button");
  await expect(dueDateFilter).toHaveAttribute("orderDir", "desc");
  await expect(dueDateFilter).toHaveClass("filter");
  await expect(dueDateFilter.locator("i")).toHaveClass("ico btn-gray-arrow down");
  await expect(updatedFilter).toHaveAttribute("type", "button");
  await expect(updatedFilter).toHaveAttribute("orderDir", "asc");
  await expect(updatedFilter).toHaveClass("filter active");
  await expect(updatedFilter.locator("i")).toHaveClass("ico btn-gray-arrow down");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-sort-filter";
  });

  await dueDateFilter.click();

  await expect.poll(() => new URL(page.url()).searchParams.get("orderBy") ?? "").toBe("dueDate");
  await expect.poll(() => new URL(page.url()).searchParams.get("orderDir") ?? "").toBe("desc");
  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("bulk");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("1");
  await expect(dueDateFilter).toHaveClass("filter active");
  await expect(dueDateFilter).toHaveAttribute("type", "button");
  await expect(dueDateFilter).toHaveAttribute("orderDir", "asc");
  await expect(dueDateFilter.locator("i")).toHaveClass("ico btn-gray-arrow down");
  await expect(updatedFilter).toHaveClass("filter");
  await expect(updatedFilter).toHaveAttribute("orderDir", "desc");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-sort-filter");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __issueSortFilterNativeListeners: string[] })
          .__issueSortFilterNativeListeners,
    ),
  ).toEqual([]);
});

test("project issue row label updates route like legacy partial_list.scala.html label filter", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug&pageNum=3`);
  const rowLabel = page.locator(
    ".post-list-wrap button.issue-label[type='button'][data-label-id='8']",
  );
  await expect(rowLabel).toBeVisible();
  await expect(rowLabel).toHaveClass("label issue-label list-label active");
  await expect(rowLabel).toHaveAttribute("data-category-id", "3");
  await expect(rowLabel).toHaveText("bug");
  await expect(page.locator(".post-list-wrap a.issue-label[href='#']")).toHaveCount(0);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-label-filter";
  });

  await rowLabel.click();

  await expect.poll(() => new URL(page.url()).searchParams.getAll("labelIds").join(",")).toBe("8");
  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("bug");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("1");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-label-filter");
});

test("project issue list sorts labels like legacy partial_list.scala.html", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "labels-unsorted");

  await page.goto(`${basePath}/admin/sample/issues?filter=labels-unsorted`);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#issue-42")).toHaveAttribute(
    "data-issue-labels",
    "bug,8,bug,3,false|priority,9,P1,4,true|",
  );
  await expect(page.locator(".issue-item-row > .infos > button.issue-label")).toHaveText([
    "bug",
    "P1",
  ]);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_LABEL_SORT).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("project issue search keeps Created but hides Assigned for organization users outside the project", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "non-member");

  await page.goto(`${basePath}/admin/sample/issues?filter=non-member`);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator(".project-setting")).toHaveCount(0);
  await expect(page.locator(".mass-update-wrap")).toHaveCount(0);
  await expect(page.locator(".mass-update-check")).toHaveCount(0);
  await expect(page.locator(".labels-wrap .ybtn")).toHaveCount(0);
  await expect(page.locator("#authorId option")).toHaveText([
    "All",
    "Created",
    "Dev Member",
    "Site Admin",
  ]);
  await expect(page.locator("#assigneeId option")).toHaveText(["All", "No assignee", "Site Admin"]);
  await expect(page.locator("#assigneeId option", { hasText: "Assigned" })).toHaveCount(0);
});

test("project issue list hides row milestone when project milestone menu is disabled", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "no-milestone-menu");

  await page.goto(`${basePath}/admin/sample/issues?filter=no-milestone-menu`);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(
    page.locator(".project-menu-gruop .menu-name", { hasText: "Milestone" }),
  ).toHaveCount(0);
  await expect(page.locator("#advanced-search-form #milestoneId")).toHaveCount(1);
  await expect(page.locator(".mileston-tag")).toHaveCount(0);
  await expect(page.locator("#mass-update-form #milestone")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_NO_MILESTONE_MENU).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("project issue list bracketed title prefix matches legacy title helpers", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "prefix");

  await page.goto(`${basePath}/admin/sample/issues?filter=prefix`);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator(".title-prefix")).toHaveText("[P1]");
  await expect(page.locator(".title-prefix")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?filter=[P1]&orderBy=updatedDate&orderDir=desc&pageNum=1&state=open`,
  );
  await expect(page.locator(".title-wrap > a.title").last()).toHaveText("Fix flaky issue");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_PREFIX).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("project issue title prefix updates route like legacy issue.List implicit prefix search", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "prefix");

  await page.goto(`${basePath}/admin/sample/issues?filter=prefix&pageNum=3`);
  await expect(page.locator(".title-prefix")).toHaveText("[P1]");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-title-prefix";
  });

  await page.locator(".title-prefix").click();

  await expect.poll(() => new URL(page.url()).searchParams.get("filter") ?? "").toBe("[P1]");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("1");
  await expect(page.locator("#search input[name='filter']")).toHaveValue("[P1]");
  await expect(page.locator("#issue-item-42")).toBeVisible();
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-title-prefix");
});

test("project issue title prefix hover follows legacy issue/list.scala.html highlight", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "prefix");

  await page.goto(`${basePath}/admin/sample/issues?filter=prefix`);
  const prefix = page.locator(".title-prefix");
  await expect(prefix).toHaveText("[P1]");

  await prefix.hover();
  await expect(prefix).toHaveClass("title-prefix title-prefix-hover");
  await expect(page.locator(".title-prefix-hover")).toHaveCount(1);

  await page.mouse.move(0, 0);
  await expect(prefix).toHaveClass("title-prefix");
  await expect(page.locator(".title-prefix-hover")).toHaveCount(0);
});

test("project issue list open due date shows legacy relative until text", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "upcoming");

  await page.goto(`${basePath}/admin/sample/issues?filter=upcoming`);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator(".mr20.mt10.pull-right")).toHaveAttribute("title", "Jul 5, 2026");
  await expect(page.locator(".mr20.mt10.pull-right .vmiddle").last()).toHaveText("4 days left");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_UPCOMING_DUE_DATE).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("project issue list sharer count matches legacy common/sharerCount.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "sharer");

  await page.goto(`${basePath}/admin/sample/issues?filter=sharer`);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(
    page.locator('.item-count-groups button.sharer-color[type="button"]'),
  ).toHaveAttribute("title", "Issue Sharer");
  await expect(page.locator(".item-count-groups a.sharer-color")).toHaveCount(0);
  await expect(page.locator(".item-count-groups .yobicon-friends")).toHaveCount(1);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_SHARER).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("project issue draft row renders before normal list like legacy partial_list_draft.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "draft");

  await page.goto(`${basePath}/admin/sample/issues`);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(2);
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid")).toHaveCount(2);
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid").first()).toContainText(
    "Draft issue",
  );
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid").nth(1)).toContainText(
    "Fix flaky issue",
  );
  const draftRow = page.locator("#issue-item-41");
  await expect(draftRow).toHaveAttribute("data-item", "issue-item");
  await expect(draftRow).toHaveAttribute("data-value", "admin 10 Draft issue");
  await expect(draftRow).toHaveAttribute("href", `${basePath}/admin/sample/issue/10`);
  await expect(draftRow.locator(".draft-number")).toHaveText("#Draft");
  await expect(draftRow.locator('input#issue-41[name="checked-issue"]')).toHaveAttribute(
    "data-issue-id",
    "41",
  );
  await expect(draftRow.locator('input#issue-41[name="checked-issue"]')).toHaveAttribute(
    "data-issue-labels",
    "",
  );
  await expect(draftRow.locator(".empty-avatar-wrap")).toHaveText("\u00a0");
  expect(await issueListDraftMetrics(page)).toEqual({
    draftBeforeNormalList: true,
    draftListContainedInRightPane: true,
    draftRowAlignedWithNormalRow: true,
    filterBeforeDraftList: true,
    filterDoesNotOverlapDraftList: true,
    newIssueDoesNotOverlapTabs: true,
    normalListContainedInRightPane: true,
    tabsBeforeFilter: true,
  });

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_DRAFT).replaceAll("__BASE_PATH__", basePath),
    ),
  );

  await page.goto(`${basePath}/admin/sample/issues?pageNum=2`);
  await expect(page.locator("#issue-item-41")).toHaveCount(0);
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid")).toHaveCount(1);
});

test("project issue draft side-channel stays hidden in empty current page branch like legacy partial_list_wrap.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "draft-only-empty");

  await page.goto(`${basePath}/admin/sample/issues`);

  await expect(page.locator(".error-wrap")).toContainText("No issue found");
  await expect(page.locator("#issue-item-41")).toHaveCount(0);
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid")).toHaveCount(0);
  await expect(page.locator("#span10 > .filter-wrap.board")).toHaveCount(0);
  await expect(page.locator("#span10 .yobicon-file-excel")).toHaveCount(0);
  await expect(page.locator("#pagination")).toHaveCount(0);
  expect(await issueListEmptyDraftSuppressionMetrics(page)).toEqual({
    emptyStateAfterTabs: true,
    emptyStateContainedInRightPane: true,
    newIssueDoesNotOverlapTabs: true,
    noDraftList: true,
    noFilterWrap: true,
    tabsAfterNewIssue: true,
  });
});

test("project issue list hides other users' draft rows like legacy partial_list_draft.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "foreign-draft");

  await page.goto(`${basePath}/admin/sample/issues`);
  await expect(page.locator("#issue-item-44")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid")).toHaveCount(2);
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid").first()).toBeEmpty();
  await expect(page.locator("#span10 > .post-list-wrap.row-fluid").nth(1)).toContainText(
    "Fix flaky issue",
  );

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_FOREIGN_DRAFT).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("project issue list mass update toolbar matches legacy partial_massupdate.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "bulk");

  await page.goto(`${basePath}/admin/sample/issues?filter=bulk`);
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(2);
  await expectMassUpdateReactRuntime(page);
  await expect(page.locator("#attach-label-list .issue-label").first()).not.toHaveAttribute(
    "style",
    /.+/u,
  );
  await expect(page.locator("#delete-label-list .issue-label").first()).not.toHaveAttribute(
    "style",
    /.+/u,
  );
  await expect(page.locator('.filter-wrap .filter[orderBy="dueDate"]')).toHaveAttribute(
    "orderDir",
    "desc",
  );
  await expect(page.locator('.filter-wrap .filter.active[orderBy="updatedDate"]')).toHaveAttribute(
    "orderDir",
    "asc",
  );

  expect(await issueListMassUpdateMetrics(page)).toEqual({
    formPosition: "relative",
    groupDisplay: "inline-block",
    groupFontSize: "0px",
    adjacentGroupMarginLeft: "5px",
    checkAllInputMargin: "4px 0px 0px",
    dropdownMaxHeight: "350px",
    dropdownOverflowY: "auto",
    toolbarBeforeRows: true,
  });

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_BULK).replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue list mass update toolbar affixes on scroll like legacy issue.MassUpdate.js", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "bulk");
  await page.setViewportSize({ width: 1440, height: 1200 });

  await page.goto(`${basePath}/admin/sample/issues?filter=bulk`);
  const toolbar = page.locator(".mass-update-wrap");
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await expect(toolbar).not.toHaveClass(/(?:^|\s)affix(?:\s|$)/u);

  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.id = "issue-list-affix-spacer";
    spacer.style.height = "3000px";
    document.body.appendChild(spacer);
  });
  await page.evaluate(() => {
    const toolbar = document.querySelector(".mass-update-wrap");
    if (!(toolbar instanceof HTMLElement)) {
      throw new Error("Expected mass update toolbar");
    }
    const top = toolbar.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top);
  });

  await expect(toolbar).toHaveClass(/(?:^|\s)affix(?:\s|$)/u);
  expect(
    await toolbar.evaluate((element) => {
      const style = window.getComputedStyle(element as HTMLElement);
      return {
        backgroundColor: style.backgroundColor,
        paddingBottom: style.paddingBottom,
        paddingTop: style.paddingTop,
        position: style.position,
        top: style.top,
        zIndex: style.zIndex,
      };
    }),
  ).toEqual({
    backgroundColor: "rgb(255, 255, 255)",
    paddingBottom: "15px",
    paddingTop: "15px",
    position: "fixed",
    top: "0px",
    zIndex: "900",
  });

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect(toolbar).not.toHaveClass(/(?:^|\s)affix(?:\s|$)/u);
});

async function expectMassUpdateReactRuntime(page: Page) {
  await expect(page.locator('script#labelListItem[type="text/x-jquery-tmpl"]')).toHaveCount(0);
  await expect(page.locator('script#labelCatetoryItem[type="text/x-jquery-tmpl"]')).toHaveCount(0);
  expect(await scriptTextContains(page, '$yobi.loadModule("issue.MassUpdate"')).toBe(false);
  await expect(page.locator("#mass-update-form")).toHaveAttribute(
    "action",
    /\/admin\/sample\/issues$/u,
  );
  await expect(page.locator("#attach-label-list li[data-value='8']")).toHaveCount(1);
  await expect(page.locator("#delete-label-list li[data-value='8']")).toHaveCount(1);
}

test("project issue list mass update options come from project-wide legacy sources", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "project-wide-options");

  await page.goto(`${basePath}/admin/sample/issues?filter=project-wide-options`);
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator('#assignee .mass-update-list li[data-value="3"] .name')).toHaveText(
    "Project Wide Member",
  );
  await expect(
    page.locator('#assignee .mass-update-list li[data-value="3"] .loginid'),
  ).toContainText("@wide");
  await expect(page.locator('#milestone .mass-update-list li[data-value="9"]')).toHaveText("v2.0");
  await expect(page.locator('#attach-label-list li[data-value="10"]')).toHaveAttribute(
    "data-category",
    "5",
  );
  await expect(page.locator('#attach-label-list li[data-value="10"] .issue-label')).toHaveText(
    "backend",
  );
  await expect(page.locator('#delete-label-list li[data-value="10"] .issue-label')).toHaveText(
    "backend",
  );
  await expect(page.locator('#authorId option[data-login-id="wide"]')).toHaveCount(0);
  await expect(page.locator('#assigneeId option[data-login-id="wide"]')).toHaveCount(0);
});

test("project issue list user-option avatars fall back to the legacy default when API data is empty", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleMessages: string[] = [];
  page.on("console", (message) => {
    consoleMessages.push(message.text());
  });
  await mockProjectIssues(page, "empty-avatar-options");

  await page.goto(`${basePath}/admin/sample/issues?filter=empty-avatar-options`);
  await expect(page.locator("#mass-update-form")).toBeVisible();

  await expect(page.locator('#authorId option[data-login-id="ghost"]')).toHaveAttribute(
    "data-avatar-url",
    "/assets/images/default-avatar-32.png",
  );
  await expect(page.locator('#assigneeId option[data-login-id="ghost"]')).toHaveAttribute(
    "data-avatar-url",
    "/assets/images/default-avatar-32.png",
  );

  await page.locator("#issue-42").check();
  await page.locator("#assignee > button").click();
  await expect(page.locator("#assignee")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator('#assignee .mass-update-list li[data-value="4"] img')).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-32.png",
  );

  expect(
    consoleMessages.some((message) =>
      message.includes('An empty string ("") was passed to the src attribute'),
    ),
  ).toBe(false);
});

test("project issue list mass update checkboxes enable legacy toolbar controls", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "bulk");

  await page.goto(`${basePath}/admin/sample/issues?filter=bulk`);
  await expect(page.locator("#mass-update-form")).toBeVisible();

  expect(await massUpdateButtonsDisabled(page)).toEqual([true, true, true, true, true]);
  await page.locator("#issue-42").check();
  expect(await massUpdateButtonsDisabled(page)).toEqual([false, false, false, false, false]);
  await expect(page.locator("#issue-item-42")).toHaveClass(/active/);
  await expect(page.locator("#check-all")).not.toBeChecked();

  await page.locator("#issue-42").uncheck();
  expect(await massUpdateButtonsDisabled(page)).toEqual([true, true, true, true, true]);
  await expect(page.locator("#issue-item-42")).not.toHaveClass(/active/);

  await page.locator("#check-all").check();
  await expect(page.locator("#check-all")).toBeChecked();
  await expect(page.locator("#issue-42")).toBeChecked();
  await expect(page.locator("#issue-43")).toBeChecked();
  expect(await massUpdateButtonsDisabled(page)).toEqual([false, false, false, false, false]);
  await expect(page.locator("#issue-item-42")).toHaveClass(/active/);
  await expect(page.locator("#issue-item-43")).toHaveClass(/active/);

  await page.locator("#check-all").uncheck();
  await expect(page.locator("#issue-42")).not.toBeChecked();
  await expect(page.locator("#issue-43")).not.toBeChecked();
  expect(await massUpdateButtonsDisabled(page)).toEqual([true, true, true, true, true]);
  await expect(page.locator("#issue-item-42")).not.toHaveClass(/active/);
  await expect(page.locator("#issue-item-43")).not.toHaveClass(/active/);
});

test("project issue list mass update dropdown opens through route-local React state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "bulk");

  await page.goto(`${basePath}/admin/sample/issues?filter=bulk`);
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await page.locator("#issue-42").check();

  const initialUrl = page.url();
  await page.evaluate(() => {
    window.sessionStorage.setItem("mass-update-dropdown-marker", "alive");
  });
  await installMassUpdateDelegatedOptionClickProbe(page);

  await page.locator("#state > button").click();
  await expect(page.locator("#state")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator("#assignee")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  expect(page.url()).toBe(initialUrl);
  await expect(page.locator("#state .mass-update-list a")).toHaveCount(0);
  await expect(
    page.locator('#state .mass-update-list li[data-value="CLOSED"] button[type="button"]'),
  ).toHaveText("Closed");
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("mass-update-dropdown-marker")),
  ).toBe("alive");

  const massUpdateRequest = page.waitForRequest((request) => {
    return request.method() === "POST" && request.url().includes("/issues/mass-update");
  });
  await page.locator('#state .mass-update-list li[data-value="CLOSED"] button').click();
  await massUpdateRequest;
  await expect(page.locator("#state")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  expect(page.url()).toBe(initialUrl);
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("mass-update-dropdown-marker")),
  ).toBe("alive");
  expect(await massUpdateDelegatedOptionClickMarker(page)).toBeUndefined();
});

test("project issue list mass update assignee option click stays route-local", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "bulk");

  await page.goto(`${basePath}/admin/sample/issues?filter=bulk`);
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await page.locator("#issue-42").check();

  const initialUrl = page.url();
  await page.evaluate(() => {
    window.sessionStorage.setItem("mass-update-dropdown-marker", "alive");
  });
  await installMassUpdateDelegatedOptionClickProbe(page);

  await page.locator("#assignee > button").click();
  await expect(page.locator("#assignee")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  expect(page.url()).toBe(initialUrl);
  await expect(page.locator("#assignee .mass-update-list a")).toHaveCount(0);
  const assignToMeButton = page
    .locator('#assignee .mass-update-list li[data-value="1"] button[type="button"]')
    .first();
  await expect(assignToMeButton).toHaveText("Assign to me");
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("mass-update-dropdown-marker")),
  ).toBe("alive");

  const massUpdateRequest = page.waitForRequest((request) => {
    return request.method() === "POST" && request.url().includes("/issues/mass-update");
  });
  await assignToMeButton.click();

  const request = await massUpdateRequest;
  expect(request.postDataJSON()).toMatchObject({
    assigneeLoginId: "admin",
    assigneeUpdate: true,
    issueNumbers: [11],
  });
  await expect(page.locator("#assignee")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  expect(page.url()).toBe(initialUrl);
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("mass-update-dropdown-marker")),
  ).toBe("alive");
  expect(await massUpdateDelegatedOptionClickMarker(page)).toBeUndefined();
});

test("project issue list mass update state posts selected issues through REST", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "bulk");

  await page.goto(`${basePath}/admin/sample/issues?filter=bulk`);
  await expect(page.locator("#mass-update-form")).toBeVisible();

  await page.locator("#issue-42").check();
  const massUpdateRequest = page.waitForRequest((request) => {
    return request.method() === "POST" && request.url().includes("/issues/mass-update");
  });
  await page.locator("#state > button").click();
  await page.locator('#state .mass-update-list li[data-value="CLOSED"] button').click();

  const request = await massUpdateRequest;
  expect(request.postDataJSON()).toMatchObject({
    issueNumbers: [11],
    state: "CLOSED",
  });
});

test("project issue list mass update label lists follow checked issue labels", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "bulk");

  await page.goto(`${basePath}/admin/sample/issues?filter=bulk`);
  await expect(page.locator("#mass-update-form")).toBeVisible();

  const attachBug = page.locator('#attach-label-list li[data-value="8"]');
  const attachBugCategory = page.locator('#attach-label-list li.disabled[data-category="3"]');
  const attachBugDivider = page.locator('#attach-label-list li.divider[data-category="3"]');
  const detachBug = page.locator('#delete-label-list li[data-value="8"]');
  const detachButton = page.locator("#detaching-label > button");
  expect(await displayValue(attachBug)).not.toBe("none");
  await expect(attachBugCategory).not.toHaveAttribute("hidden", "");
  await expect(attachBugDivider).not.toHaveAttribute("hidden", "");
  await expect(detachButton).toBeDisabled();

  await page.locator("#issue-42").check();
  expect(await displayValue(attachBug)).toBe("none");
  await expect(attachBugCategory).toHaveAttribute("hidden", "");
  await expect(attachBugDivider).toHaveAttribute("hidden", "");
  await expect(detachBug).not.toHaveAttribute("hidden", "");
  await expect(detachButton).toBeEnabled();

  await page.locator("#issue-42").uncheck();
  expect(await displayValue(attachBug)).not.toBe("none");
  await expect(attachBugCategory).not.toHaveAttribute("hidden", "");
  await expect(attachBugDivider).not.toHaveAttribute("hidden", "");
  await expect(detachButton).toBeDisabled();

  await page.locator("#issue-43").check();
  expect(await displayValue(attachBug)).not.toBe("none");
  await expect(page.locator("#delete-label-list li[data-value]")).toHaveCount(0);
  await expect(detachButton).toBeDisabled();
});

test("project issue list mass update label dropdowns post selected issue payloads", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "bulk");

  await page.goto(`${basePath}/admin/sample/issues?filter=bulk`);
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await page.locator("#issue-42").check();

  const detachRequest = page.waitForRequest((request) => {
    return request.method() === "POST" && request.url().includes("/issues/mass-update");
  });
  await page.locator("#detaching-label > button").click();
  await page.locator('#delete-label-list li[data-value="8"] button').click();
  expect((await detachRequest).postDataJSON()).toMatchObject({
    issueNumbers: [11],
    removeLabelIds: [8],
  });

  await page.locator("#issue-43").check();
  const attachRequest = page.waitForRequest((request) => {
    return request.method() === "POST" && request.url().includes("/issues/mass-update");
  });
  await page.locator("#attaching-label > button").click();
  await page.locator('#attach-label-list li[data-value="8"] button').click();
  expect((await attachRequest).postDataJSON()).toMatchObject({
    addLabelIds: [8],
    issueNumbers: [11, 12],
  });
});

test("project issue mass-update checkbox click does not reveal child list like legacy two-column guard", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "children");

  await page.goto(`${basePath}/admin/sample/issues?filter=children`);
  await expect(page.locator("#issue-item-42 .child-issue-list")).not.toBeVisible();

  await page.locator("#issue-42").check();

  await expect(page.locator("#issue-42")).toBeChecked();
  await expect(page.locator("#issue-item-42")).toHaveClass(/active/);
  await expect(page.locator("#issue-item-42 .child-issue-list")).not.toBeVisible();
});

test("project issue list subtask row matches legacy partial_list_subtask.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "subtask");

  await page.goto(`${basePath}/admin/sample/issues?filter=subtask`);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator(".subtask-progress.completion-ratio")).toHaveText("1/3");
  await expect(page.locator(".infos-item.subtask")).toContainText("#9 Parent iss...");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_SUBTASK).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("closed project issue row preserves legacy weight arrow and due-date styling", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "weighted");

  await page.goto(`${basePath}/admin/sample/issues?filter=weighted&state=closed`);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator(".weight-up-arrow")).toHaveAttribute("title", "Issue weight 4");
  await expect(page.locator(".mr20.mt10.pull-right.darkgray-txt")).toHaveText("Jul 5, 2026");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_WEIGHTED_CLOSED).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("project issue list child rows match legacy partial_view_childIssueListOnly.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "children");

  await page.goto(`${basePath}/admin/sample/issues?filter=children`);
  await expect(page.locator(".child-issue-list.hide .issue-item.child-issue")).toHaveCount(2);
  await expect(page.locator("#issue-item-42 .child-issue-list")).not.toBeVisible();
  await expect(page.locator(".child-issue-list .issue-item.child-issue").first()).toContainText(
    "#13Open child issue - Dev Member",
  );
  await expect(page.locator(".child-issue-list .issue-item.child-issue").last()).toContainText(
    "#14Closed child issue",
  );
  const firstChild = page.locator(".child-issue-list .issue-item.child-issue").first();
  await expect(firstChild).toHaveClass("issue-item selected-child child-issue");
  await expect(firstChild.locator(".state-label.open")).toHaveCount(1);
  await expect(firstChild.locator("a.twoColumeModeTarget").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/13`,
  );
  await expect(firstChild.locator(".subtask-number")).toHaveText("#13");
  const childCountPair = firstChild.locator(".font12.no-border-at-child .item-count-groups");
  await expect(childCountPair).toHaveCount(1);
  await expect(childCountPair.locator(".comments-count.comments-count-color")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/13#comments`,
  );
  await expect(childCountPair.locator(".comments-count .item-count")).toHaveText("2");
  await expect(childCountPair.locator(".vote-count.vote-color")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/13#vote`,
  );
  await expect(childCountPair.locator(".vote-count .item-count.strong")).toHaveText("1");
  await expect(firstChild.locator(".child-issue-date")).toHaveAttribute("title", "Jul 3, 2026");
  const childLabel = firstChild.locator(".label.issue-label.list-label.twoColumeModeTarget");
  await expect(childLabel).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?state=open&labelIds=8`,
  );
  await expect(childLabel).toHaveAttribute("data-category-id", "3");
  await expect(childLabel).toHaveAttribute("data-label-id", "8");
  await expect(childLabel).toHaveAttribute("style", "background: rgb(81, 170, 204);");
  await expect(childLabel).toHaveText("bug");
  await expect(page.locator(".child-issue-list .issue-item.child-issue").last()).toHaveClass(
    /child-issue/,
  );
  await expect(
    page.locator(".child-issue-list .issue-item.child-issue").last().locator("i"),
  ).toHaveClass(" yobicon-checkmark");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      withPopulatedSearchUsers(EXPECTED_PROJECT_ISSUES_CHILDREN).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );

  await page
    .locator("#issue-item-42 .title-wrap > .title")
    .first()
    .evaluate((titleLink) => {
      titleLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
      titleLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
  await expect(page.locator("#issue-item-42 .child-issue-list")).not.toBeVisible();

  await page.locator("#issue-item-42 .infos").click();
  await expect(page.locator("#issue-item-42 .child-issue-list")).toBeVisible();
  await expect(page.locator("#issue-item-42 .child-issue-list")).toHaveAttribute(
    "style",
    "display: block;",
  );
});

test("project issue child rows hide foreign drafts like legacy partial_view_child.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "child-draft");

  await page.goto(`${basePath}/admin/sample/issues?filter=child-draft`);

  await expect(page.locator(".child-issue-list .issue-item.child-issue")).toHaveCount(1);
  await expect(page.locator(".child-issue-list")).not.toContainText("Foreign draft child");
  const ownDraftChild = page.locator(".child-issue-list .issue-item.child-issue").first();
  await expect(ownDraftChild).toContainText("#DraftOwn draft child");
  await expect(ownDraftChild.locator(".subtask-number .draft-number")).toHaveText("#Draft");
  await expect(ownDraftChild.locator("a.twoColumeModeTarget")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/16`,
  );
});

test("project issue show-subtasks toggle follows legacy yona.showSubtask localStorage behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "children");

  await page.goto(`${basePath}/admin/sample/issues?filter=children`);
  const toggle = page.locator("#toggle-show-subtasks");
  const childList = page.locator("#issue-item-42 .child-issue-list");
  await expect(toggle).not.toBeChecked();
  await expect(childList).not.toBeVisible();

  await page.locator("#issue-item-42 .infos").click();
  await expect(childList).toBeVisible();

  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(childList).toBeVisible();
  await expect(childList).toHaveAttribute("style", "display: block;");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("showSubtasksAlways")))
    .toBe("true");

  await page.reload();
  await expect(page.locator("#toggle-show-subtasks")).toBeChecked();
  await expect(page.locator("#issue-item-42 .child-issue-list")).toBeVisible();

  await page.locator("#toggle-show-subtasks").click();
  await expect(page.locator("#toggle-show-subtasks")).not.toBeChecked();
  await expect(page.locator("#issue-item-42 .child-issue-list")).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("showSubtasksAlways")))
    .toBe("false");
});

test("project issue show-subtasks popover is React-owned with legacy hover and focus delay", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "children");

  await page.goto(`${basePath}/admin/sample/issues?filter=children`);
  const wrapper = page.locator(".show-subtasks-li .show-subtasks");
  const popover = wrapper.locator(".popover.top");
  await expect(wrapper).toHaveAttribute("title", "Show subtask");
  await expect(wrapper).not.toHaveAttribute("data-toggle", "popover");
  await expect(wrapper).not.toHaveAttribute("data-trigger", "hover");
  await expect(wrapper).not.toHaveAttribute("data-placement", "top");
  await expect(wrapper).not.toHaveAttribute("data-content", "Show subtask always");
  await expect(popover).toHaveCount(0);

  await wrapper.hover();
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Show subtask");
  await expect(popover.locator(".popover-content")).toHaveText("Show subtask always");
  await expect(popover.locator(".arrow")).toHaveCount(1);
  await expect(popover).toHaveCSS("display", "block");

  await page.mouse.move(0, 0);
  await expect(popover).toHaveCount(0);

  await page.locator("#toggle-show-subtasks").focus();
  await expect(popover).toBeVisible();
});

test("project issue two-column mode popover is React-owned with legacy hover and focus delay", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "children");

  await page.goto(`${basePath}/admin/sample/issues?filter=children`);
  const wrapper = page.locator(".nav-tabs .two-column-icon");
  const popover = wrapper.locator(".popover.top");
  await expect(wrapper).toHaveAttribute("title", "Two Column Mode");
  await expect(wrapper).not.toHaveAttribute("data-toggle", "popover");
  await expect(wrapper).not.toHaveAttribute("data-trigger", "hover");
  await expect(wrapper).not.toHaveAttribute("data-placement", "top");
  await expect(wrapper).not.toHaveAttribute(
    "data-content",
    "Splits list and body into columns respectively",
  );
  await expect(popover).toHaveCount(0);

  await wrapper.hover();
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Two Column Mode");
  await expect(popover.locator(".popover-content")).toHaveText(
    "Splits list and body into columns respectively",
  );
  await expect(popover.locator(".arrow")).toHaveCount(1);
  await expect(popover).toHaveCSS("display", "block");
  const boxes = await page.evaluate(() => {
    const trigger = document.querySelector(".nav-tabs .two-column-icon");
    const tip = document.querySelector(".nav-tabs .two-column-icon .popover.top");
    if (!trigger || !tip) return null;
    const triggerBox = trigger.getBoundingClientRect();
    const tipBox = tip.getBoundingClientRect();
    return {
      centered: Math.abs(tipBox.left + tipBox.width / 2 - (triggerBox.left + triggerBox.width / 2)),
      isAboveTrigger: tipBox.bottom <= triggerBox.top,
      minWidth: tipBox.width,
    };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.isAboveTrigger).toBe(true);
  expect(boxes!.centered).toBeLessThanOrEqual(2);
  expect(boxes!.minWidth).toBeGreaterThanOrEqual(276);

  await page.mouse.move(0, 0);
  await expect(popover).toHaveCount(0);

  await page.locator("#two-column-mode").focus();
  await expect(popover).toBeVisible();
});

test("project issue two-column mode toggle follows legacy yona.twoColumnMode localStorage branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();
  const toggle = page.locator("#two-column-mode");
  const row = page.locator("#issue-item-42");
  await expect(toggle).not.toBeChecked();
  await expect(row).not.toHaveCSS("cursor", "pointer");

  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(row).toHaveCSS("cursor", "pointer");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("true");

  await page.reload();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await expect(page.locator("#issue-item-42")).toHaveCSS("cursor", "pointer");

  await page.locator("#issue-item-42 .title-wrap > a.title").last().click();
  await expect(page.locator("#issue-item-42")).toHaveClass(/highlightBg/);
  await page.locator("#two-column-mode").click();
  await expect(page.locator("#two-column-mode")).not.toBeChecked();
  await expect(page.locator("#issue-item-42")).not.toHaveClass(/highlightBg/);
  await expect(page.locator("#issue-item-42")).not.toHaveCSS("cursor", "pointer");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("false");
});

test("project issue two-column title click highlights row and changes history like legacy pageslide branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    (
      window as unknown as { __issueListNativeClickListenerTypes: string[] }
    ).__issueListNativeClickListenerTypes = [];
    Element.prototype.addEventListener = function (type, listener, options) {
      if (type === "click" && this instanceof HTMLElement && this.id === "span10") {
        (
          window as unknown as { __issueListNativeClickListenerTypes: string[] }
        ).__issueListNativeClickListenerTypes.push(type);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();
  await page.locator("#two-column-mode").click();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await expect(page.locator("#issue-item-42")).toHaveCSS("cursor", "pointer");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-two-column-title";
  });

  await page.locator("#issue-item-42 .title-wrap > a.title").last().click();

  await expect(page.locator("#issue-item-42")).toHaveClass(/highlightBg/);
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/issue/11`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-two-column-title");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __issueListNativeClickListenerTypes: string[] })
          .__issueListNativeClickListenerTypes,
    ),
  ).toEqual([]);
});

test("project issue two-column row click uses legacy post-item href branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "populated");

  await page.goto(`${basePath}/admin/sample/issues?filter=bug`);
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();
  await page.locator("#two-column-mode").click();
  await expect(page.locator("#issue-item-42")).toHaveCSS("cursor", "pointer");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "issue-two-column-row";
  });

  await page.locator("#issue-item-42 .infos").click({ position: { x: 8, y: 8 } });

  await expect(page.locator("#issue-item-42")).toHaveClass(/highlightBg/);
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/issue/11`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-two-column-row");
});

test("project issue two-column child label click uses legacy twoColumeModeTarget branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssues(page, "children");

  await page.goto(`${basePath}/admin/sample/issues?filter=children`);
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();
  await page.locator("#issue-item-42 .issue-item-row").click();
  await page.locator("#two-column-mode").click();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await expect(page.locator("#issue-item-42")).toHaveCSS("cursor", "pointer");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "issue-two-column-child-label";
  });

  const childLabel = page.locator(
    `.child-issue-list .label.twoColumeModeTarget[href="${basePath}/admin/sample/issues?state=open&labelIds=8"]`,
  );
  await expect(childLabel).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?state=open&labelIds=8`,
  );

  await childLabel.click();

  await expect(page.locator("#issue-item-42")).toHaveClass(/highlightBg/);
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/issues`);
  await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBeNull();
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("open");
  await expect.poll(() => new URL(page.url()).searchParams.getAll("labelIds").join(",")).toBe("8");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("issue-two-column-child-label");
});

async function issueListShellMetrics(page: Page) {
  return page.locator(".issue-list-wrap").evaluate((wrap) => {
    const leftMenu = wrap.querySelector(".left-menu") as HTMLElement;
    const rightPane = wrap.querySelector("#span10") as HTMLElement;
    const newIssue = rightPane.querySelector(".pull-right") as HTMLElement;
    const tabs = rightPane.querySelector(".nav-tabs") as HTMLElement;
    const emptyState = rightPane.querySelector(".error-wrap") as HTMLElement;
    const emptyIcon = emptyState.querySelector(".ico-err1") as HTMLElement;
    const emptyText = emptyState.querySelector("p") as HTMLElement;
    const searchBar = leftMenu.querySelector(".search-bar") as HTMLElement;
    const searchButton = searchBar.querySelector(".search-btn") as HTMLElement;
    const advanced = leftMenu.querySelector(".srch-advanced") as HTMLElement;
    const issueOption = leftMenu.querySelector(".issue-option") as HTMLElement;
    const wrapStyle = window.getComputedStyle(wrap);
    const searchBarStyle = window.getComputedStyle(searchBar);
    const searchButtonStyle = window.getComputedStyle(searchButton);
    const advancedStyle = window.getComputedStyle(advanced);
    const issueOptionStyle = window.getComputedStyle(issueOption);
    const newIssueRect = newIssue.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const emptyStateRect = emptyState.getBoundingClientRect();
    const emptyIconRect = emptyIcon.getBoundingClientRect();
    const emptyTextRect = emptyText.getBoundingClientRect();

    return {
      wrapClear: wrapStyle.clear,
      leftMenuClassName: leftMenu.className,
      rightPaneClassName: rightPane.className,
      newIssueAboveTabs: newIssueRect.top <= tabsRect.top,
      tabBeforeEmptyState: tabsRect.top < emptyStateRect.top,
      emptyIconBeforeText: emptyIconRect.top < emptyTextRect.top,
      searchBarBorder: searchBarStyle.border,
      searchBarBorderRadius: searchBarStyle.borderRadius,
      searchBarHeight: searchBarStyle.height,
      searchButtonRight: searchButtonStyle.right,
      advancedMarginTop: advancedStyle.marginTop,
      issueOptionMarginBottom: issueOptionStyle.marginBottom,
    };
  });
}

async function issueListRowMetrics(page: Page) {
  return page.locator("#issue-item-42").evaluate((row) => {
    const list = row.closest(".post-list-wrap") as HTMLElement;
    const checkbox = row.querySelector(".mass-update-check") as HTMLElement;
    const checkboxInput = checkbox.querySelector("input") as HTMLElement;
    const titleWrap = row.querySelector(".title-wrap") as HTMLElement;
    const postId = titleWrap.querySelector(".post-id") as HTMLElement;
    const title = titleWrap.querySelector("a.title:last-child") as HTMLElement;
    const infos = row.querySelector(".infos") as HTMLElement;
    const author = infos.querySelector(".infos-link-item") as HTMLElement;
    const date = infos.querySelector(".infos-item:nth-child(2)") as HTMLElement;
    const mainColumn = row.querySelector(".span9") as HTMLElement;
    const assignee = row.querySelector(".avatar-wrap.assinee") as HTMLElement;
    const dueDate = row.querySelector(".mr20.mt10.pull-right") as HTMLElement;
    const listStyle = window.getComputedStyle(list);
    const rowStyle = window.getComputedStyle(row);
    const checkboxStyle = window.getComputedStyle(checkbox);
    const checkboxInputStyle = window.getComputedStyle(checkboxInput);
    const titleWrapStyle = window.getComputedStyle(titleWrap);
    const postIdStyle = window.getComputedStyle(postId);
    const titleStyle = window.getComputedStyle(title);
    const infosStyle = window.getComputedStyle(infos);
    const titleWrapRect = titleWrap.getBoundingClientRect();
    const infosRect = infos.getBoundingClientRect();
    const authorRect = author.getBoundingClientRect();
    const dateRect = date.getBoundingClientRect();
    const mainRect = mainColumn.getBoundingClientRect();
    const assigneeRect = assignee.getBoundingClientRect();
    const dueDateRect = dueDate.getBoundingClientRect();

    return {
      listStyle: listStyle.listStyleType,
      listPaddingLeft: listStyle.paddingLeft,
      rowClear: rowStyle.clear,
      rowDisplay: rowStyle.display,
      rowOverflow: rowStyle.overflow,
      rowPadding: rowStyle.padding,
      rowBorderBottom: rowStyle.borderBottom,
      checkboxFloat: checkboxStyle.cssFloat,
      checkboxMarginRight: checkboxStyle.marginRight,
      checkboxInputMarginTop: checkboxInputStyle.marginTop,
      titleWrapDisplay: titleWrapStyle.display,
      titleWrapLineHeight: titleWrapStyle.lineHeight,
      titleWrapOverflow: titleWrapStyle.overflow,
      titleWrapTextOverflow: titleWrapStyle.textOverflow,
      titleWrapWhiteSpace: titleWrapStyle.whiteSpace,
      postIdColor: postIdStyle.color,
      postIdFontSize: postIdStyle.fontSize,
      postIdFontWeight: postIdStyle.fontWeight,
      postIdMarginRight: postIdStyle.marginRight,
      titleColor: titleStyle.color,
      titleFontSize: titleStyle.fontSize,
      titleFontWeight: titleStyle.fontWeight,
      infosColor: infosStyle.color,
      infosFontSize: infosStyle.fontSize,
      infosLineHeight: infosStyle.lineHeight,
      authorBeforeDate: authorRect.left < dateRect.left,
      titleAboveInfos: titleWrapRect.top < infosRect.top,
      assigneeRightOfMainColumn: assigneeRect.left > mainRect.right,
      dueDateLeftOfAssignee: dueDateRect.left < assigneeRect.left,
    };
  });
}

async function issueListMassUpdateMetrics(page: Page) {
  return page.locator("#mass-update-form").evaluate((form) => {
    const firstGroup = form.querySelector(".btn-group") as HTMLElement;
    const secondGroup = form.querySelector(".btn-group + .btn-group") as HTMLElement;
    const checkAllInput = form.querySelector(".btn-group.check-all input") as HTMLElement;
    const dropdown = form.querySelector(".mass-update-list") as HTMLElement;
    const filterWrap = form.closest(".filter-wrap") as HTMLElement;
    const list = document.querySelector(".post-list-wrap") as HTMLElement;
    const formStyle = window.getComputedStyle(form);
    const firstGroupStyle = window.getComputedStyle(firstGroup);
    const secondGroupStyle = window.getComputedStyle(secondGroup);
    const inputStyle = window.getComputedStyle(checkAllInput);
    const dropdownStyle = window.getComputedStyle(dropdown);
    const filterWrapRect = filterWrap.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();

    return {
      formPosition: formStyle.position,
      groupDisplay: firstGroupStyle.display,
      groupFontSize: firstGroupStyle.fontSize,
      adjacentGroupMarginLeft: secondGroupStyle.marginLeft,
      checkAllInputMargin: inputStyle.margin,
      dropdownMaxHeight: dropdownStyle.maxHeight,
      dropdownOverflowY: dropdownStyle.overflowY,
      toolbarBeforeRows: filterWrapRect.top < listRect.top,
    };
  });
}

async function issueListDraftMetrics(page: Page) {
  return page.locator("#span10").evaluate((rightPane) => {
    const newIssue = rightPane.querySelector(":scope > .pull-right") as HTMLElement;
    const tabs = rightPane.querySelector(":scope > .nav-tabs") as HTMLElement;
    const filterWrap = rightPane.querySelector(":scope > .filter-wrap") as HTMLElement;
    const lists = Array.from(
      rightPane.querySelectorAll<HTMLElement>(":scope > .post-list-wrap.row-fluid"),
    );
    const draftList = lists[0];
    const normalList = lists[1];
    const draftRow = draftList?.querySelector("#issue-item-41") as HTMLElement | null;
    const normalRow = normalList?.querySelector("#issue-item-42") as HTMLElement | null;
    if (!newIssue || !tabs || !filterWrap || !draftList || !normalList || !draftRow || !normalRow) {
      return null;
    }
    const rightRect = rightPane.getBoundingClientRect();
    const newIssueRect = newIssue.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const filterRect = filterWrap.getBoundingClientRect();
    const draftListRect = draftList.getBoundingClientRect();
    const normalListRect = normalList.getBoundingClientRect();
    const draftRowRect = draftRow.getBoundingClientRect();
    const normalRowRect = normalRow.getBoundingClientRect();

    // Live legacy visual confirmation is unavailable in this harness; these are
    // Scala HTML/LESS-derived containment and ordering checks.
    return {
      draftBeforeNormalList: draftListRect.top < normalListRect.top,
      draftListContainedInRightPane:
        draftListRect.left >= rightRect.left - 1 && draftListRect.right <= rightRect.right + 1,
      draftRowAlignedWithNormalRow: Math.abs(draftRowRect.left - normalRowRect.left) <= 1,
      filterBeforeDraftList: filterRect.top <= draftListRect.top,
      filterDoesNotOverlapDraftList: filterRect.bottom <= draftListRect.top + 1,
      newIssueDoesNotOverlapTabs: newIssueRect.bottom <= tabsRect.bottom + 1,
      normalListContainedInRightPane:
        normalListRect.left >= rightRect.left - 1 && normalListRect.right <= rightRect.right + 1,
      tabsBeforeFilter: tabsRect.top < filterRect.top,
    };
  });
}

async function issueListEmptyDraftSuppressionMetrics(page: Page) {
  return page.locator("#span10").evaluate((rightPane) => {
    const newIssue = rightPane.querySelector(":scope > .pull-right") as HTMLElement;
    const tabs = rightPane.querySelector(":scope > .nav-tabs") as HTMLElement;
    const emptyState = rightPane.querySelector(":scope > .error-wrap") as HTMLElement;
    if (!newIssue || !tabs || !emptyState) {
      return null;
    }
    const rightRect = rightPane.getBoundingClientRect();
    const newIssueRect = newIssue.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const emptyRect = emptyState.getBoundingClientRect();

    return {
      emptyStateAfterTabs: tabsRect.bottom <= emptyRect.top + 1,
      emptyStateContainedInRightPane:
        emptyRect.left >= rightRect.left - 1 && emptyRect.right <= rightRect.right + 1,
      newIssueDoesNotOverlapTabs: newIssueRect.bottom <= tabsRect.bottom + 1,
      noDraftList: rightPane.querySelectorAll(":scope > .post-list-wrap.row-fluid").length === 0,
      noFilterWrap: !rightPane.querySelector(":scope > .filter-wrap.board"),
      tabsAfterNewIssue: newIssueRect.top <= tabsRect.top,
    };
  });
}

async function issueLabelDomMetrics(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      return {
        dataLabelId: element.getAttribute("data-label-id"),
        href: element.getAttribute("href"),
        styleAttr: element.getAttribute("style"),
        tagName: element.tagName,
        text: element.textContent?.trim(),
        type: element.getAttribute("type"),
      };
    });
}

async function massUpdateButtonsDisabled(page: Page) {
  return page.locator("#mass-update-form > .btn-group > button").evaluateAll((buttons) =>
    buttons.map((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Expected button");
      }
      return button.disabled;
    }),
  );
}

async function installMassUpdateDelegatedOptionClickProbe(page: Page) {
  await page.evaluate(() => {
    (
      window as Window & { __massUpdateDelegatedOptionClick?: string }
    ).__massUpdateDelegatedOptionClick = undefined;
    document.addEventListener("click", (event) => {
      if ((event.target as Element | null)?.closest("#mass-update-form .mass-update-list button")) {
        (
          window as Window & { __massUpdateDelegatedOptionClick?: string }
        ).__massUpdateDelegatedOptionClick = "delegated";
      }
    });
  });
}

async function massUpdateDelegatedOptionClickMarker(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & { __massUpdateDelegatedOptionClick?: string })
        .__massUpdateDelegatedOptionClick,
  );
}

async function displayValue(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).display);
}

async function issueCommentCountMetrics(page: Page) {
  return page
    .locator("#issue-item-42 .item-count-groups a[href$='#comments']")
    .evaluate((element) => {
      const icon = element.querySelector(".item-icon") as HTMLElement;
      const commentIcon = element.querySelector("i") as HTMLElement;
      const count = element.querySelector(".item-count") as HTMLElement;
      const style = window.getComputedStyle(element);
      const iconRect = icon.getBoundingClientRect();
      const countRect = count.getBoundingClientRect();

      return {
        href: element.getAttribute("href"),
        className: element.className,
        color: style.color,
        iconClassName: icon.className,
        commentIconClassName: commentIcon.className,
        countClassName: count.className,
        countText: count.textContent?.trim(),
        iconBeforeCount: iconRect.left < countRect.left,
      };
    });
}

async function issueVoteCountMetrics(page: Page) {
  return page.locator("#issue-item-42 .item-count-groups a[href$='#vote']").evaluate((element) => {
    const group = element.closest(".item-count-groups") as HTMLElement;
    const icon = element.querySelector(".item-icon") as HTMLElement;
    const heart = element.querySelector("i") as HTMLElement;
    const count = element.querySelector(".item-count") as HTMLElement;
    const groupStyle = window.getComputedStyle(group);
    const linkStyle = window.getComputedStyle(element);
    const iconStyle = window.getComputedStyle(icon);
    const countStyle = window.getComputedStyle(count);
    const iconRect = icon.getBoundingClientRect();
    const countRect = count.getBoundingClientRect();

    return {
      groupClassName: group.className,
      groupMarginTop: groupStyle.marginTop,
      groupLineHeight: groupStyle.lineHeight,
      groupBorder: groupStyle.border,
      groupBorderRadius: groupStyle.borderRadius,
      href: element.getAttribute("href"),
      className: element.className,
      color: linkStyle.color,
      iconClassName: icon.className,
      iconPadding: iconStyle.padding,
      iconFontSize: iconStyle.fontSize,
      iconLineHeight: iconStyle.lineHeight,
      heartClassName: heart.className,
      countClassName: count.className,
      countPadding: countStyle.padding,
      countText: count.textContent?.trim(),
      marginLeft: linkStyle.marginLeft,
      iconBeforeCount: iconRect.left < countRect.left,
    };
  });
}

async function issueListAssetSources(page: Page, basePath: string) {
  const sourceSuffixes = [
    "/assets/javascripts/lib/moment-with-langs.min.js",
    "/assets/javascripts/lib/pikaday/pikaday.js",
    "/assets/javascripts/common/yobi.ui.Calendar.js",
  ];
  return page.evaluate(
    ({ basePath, sourceSuffixes }) =>
      Array.from(document.querySelectorAll<HTMLScriptElement>("script[src][defer]"))
        .map((script) => script.getAttribute("src") ?? "")
        .filter((source) => sourceSuffixes.some((suffix) => source === `${basePath}${suffix}`)),
    { basePath, sourceSuffixes },
  );
}

async function scriptTextContains(page: Page, text: string) {
  return page.evaluate(
    (text) =>
      Array.from(document.querySelectorAll("script")).some((script) =>
        (script.textContent ?? "").includes(text),
      ),
    text,
  );
}

async function mockProjectIssues(
  page: Page,
  state:
    | "anonymous"
    | "blank-assignee-label"
    | "bulk"
    | "child-draft"
    | "children"
    | "draft"
    | "draft-only-empty"
    | "empty-avatar-options"
    | "empty"
    | "foreign-draft"
    | "labels-unsorted"
    | "member-no-update"
    | "milestone-selected"
    | "no-milestone-menu"
    | "non-member"
    | "normal-draft"
    | "normal-foreign-draft"
    | "populated"
    | "portal-protected"
    | "prefix"
    | "project-labels"
    | "project-labels-non-manager"
    | "project-wide-options"
    | "sharer"
    | "subtask"
    | "upcoming"
    | "weighted" = "empty",
) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: {
        "x-csrf-token": "csrf-token",
      },
      body: JSON.stringify({
        actorId: state === "anonymous" ? 0 : 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: state === "anonymous" ? "" : "admin@example.com",
        isAnonymous: state === "anonymous",
        isConfirmed: state !== "anonymous",
        isSiteAdmin: state !== "anonymous",
        loginId: state === "anonymous" ? "anonymous" : "admin",
        userLabel: state === "anonymous" ? "Anonymous" : "Site Admin",
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
          milestone: state !== "no-milestone-menu",
          pullRequest: true,
          review: true,
        },
        openIssueCount: 1,
        openPullRequestCount: 1,
        ownerName: "admin",
        postCount: 1,
        projectName: "sample",
        reviewCount: 2,
        vcs: "GIT",
        viewerCanUpdate:
          state !== "member-no-update" &&
          state !== "non-member" &&
          state !== "project-labels-non-manager",
        viewerIsProjectMember: state !== "anonymous" && state !== "non-member",
      }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/project_default.jpg",
        enrollmentRequestCount: 0,
        id: 2,
        isFavorite: false,
        isFavorited: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: true,
        isWatching: true,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: "weblabs",
        ownerName: "weblabs",
        projectName: "portal",
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerCanWatch: true,
        watchCount: 2,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", async (route) => {
    const url = new URL(route.request().url());
    const milestoneState = url.searchParams.get("state");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones:
          milestoneState === "closed"
            ? [
                {
                  id: 7,
                  state: "closed",
                  title: "v0.9",
                },
              ]
            : state === "project-wide-options"
              ? [
                  {
                    id: 5,
                    closedIssueCount: 1,
                    completionPercent: 50,
                    dueDateLabel: "Jul 5, 2026",
                    dueDateOverdue: false,
                    state: "open",
                    title: "v1.0",
                    openIssueCount: 1,
                    untilLabel: "4 days left",
                  },
                  {
                    id: 9,
                    state: "open",
                    title: "v2.0",
                  },
                ]
              : [
                  {
                    id: 5,
                    closedIssueCount: 1,
                    completionPercent: 50,
                    dueDateLabel: "Jul 5, 2026",
                    dueDateOverdue: false,
                    state: "open",
                    title: "v1.0",
                    openIssueCount: 1,
                    untilLabel: "4 days left",
                  },
                ],
      }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/milestones**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestones: [] }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/issue-search-users**", async (route) => {
    const url = new URL(route.request().url());
    const role = url.searchParams.get("role");
    const isPopulated = state !== "anonymous" && state !== "empty";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items:
          state === "empty-avatar-options"
            ? [
                {
                  avatarUrl: "",
                  displayName: "Ghost Author",
                  loginId: "ghost",
                  pureNameOnly: "Ghost Author",
                  userId: 4,
                },
              ]
            : role === "author" && isPopulated
              ? [
                  {
                    avatarUrl: "/assets/images/default-avatar-32.png",
                    displayName: "Dev Member",
                    loginId: "dev",
                    pureNameOnly: "Dev Member",
                    userId: 2,
                  },
                  {
                    avatarUrl: "/assets/images/default-avatar-32.png",
                    displayName: "Site Admin",
                    loginId: "admin",
                    pureNameOnly: "Site Admin",
                    userId: 1,
                  },
                ]
              : state === "anonymous"
                ? []
                : [
                    {
                      avatarUrl: "/assets/images/default-avatar-32.png",
                      displayName: "Site Admin",
                      loginId: "admin",
                      pureNameOnly: "Site Admin",
                      userId: 1,
                    },
                  ],
      }),
    });
  });
  await page.route(
    "**/api/v1/owners/weblabs/projects/portal/issue-search-users**",
    async (route) => {
      const url = new URL(route.request().url());
      const role = url.searchParams.get("role");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          items:
            role === "author"
              ? [
                  {
                    avatarUrl: "/assets/images/default-avatar-128.png",
                    displayName: "Carol Lee",
                    loginId: "carol",
                    pureNameOnly: "Carol Lee",
                    userId: 2,
                  },
                ]
              : [
                  {
                    avatarUrl: "/assets/images/default-avatar-128.png",
                    displayName: "Site Admin",
                    loginId: "admin",
                    pureNameOnly: "Site Admin",
                    userId: 1,
                  },
                ],
        }),
      });
    },
  );
  await page.route("**/api/v1/owners/admin/projects/sample/assignable-users**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items:
          state === "empty-avatar-options"
            ? [
                {
                  avatarUrl: "",
                  displayName: "Ghost Author",
                  loginId: "ghost",
                  pureNameOnly: "Ghost Author",
                  type: "user",
                  userId: 4,
                },
                {
                  avatarUrl: "/assets/images/default-avatar-32.png",
                  displayName: "Site Admin",
                  loginId: "admin",
                  pureNameOnly: "Site Admin",
                  type: "user",
                  userId: 1,
                },
              ]
            : state === "project-wide-options"
              ? [
                  {
                    avatarUrl: "/assets/images/default-avatar-32.png",
                    displayName: "Site Admin",
                    loginId: "admin",
                    pureNameOnly: "Site Admin",
                    type: "user",
                    userId: 1,
                  },
                  {
                    avatarUrl: "/assets/images/default-avatar-32.png",
                    displayName: "Dev Member",
                    loginId: "dev",
                    pureNameOnly: "Dev Member",
                    type: "user",
                    userId: 2,
                  },
                  {
                    avatarUrl: "/assets/images/default-avatar-32.png",
                    displayName: "Project Wide Member",
                    loginId: "wide",
                    pureNameOnly: "Project Wide Member",
                    type: "user",
                    userId: 3,
                  },
                ]
              : [
                  {
                    avatarUrl: "/assets/images/default-avatar-32.png",
                    displayName: "Site Admin",
                    loginId: "admin",
                    pureNameOnly: "Site Admin",
                    type: "user",
                    userId: 1,
                  },
                  {
                    avatarUrl: "/assets/images/default-avatar-32.png",
                    displayName: "Dev Member",
                    loginId: "dev",
                    pureNameOnly: "Dev Member",
                    type: "user",
                    userId: 2,
                  },
                ],
        total: state === "project-wide-options" ? 3 : 2,
        truncated: false,
      }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/assignable-users**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            avatarUrl: "/assets/images/default-avatar-128.png",
            displayName: "Site Admin",
            loginId: "admin",
            pureNameOnly: "Site Admin",
            type: "user",
            userId: 1,
          },
        ],
        total: 1,
        truncated: false,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels:
          state === "project-labels" || state === "project-labels-non-manager"
            ? [
                {
                  categoryId: 3,
                  categoryIsExclusive: false,
                  categoryName: "bug",
                  color: "#51aacc",
                  id: 8,
                  name: "bug",
                },
              ]
            : state === "project-wide-options"
              ? [
                  {
                    categoryId: 3,
                    categoryIsExclusive: false,
                    categoryName: "bug",
                    color: "#51aacc",
                    id: 8,
                    name: "bug",
                  },
                  {
                    categoryId: 5,
                    categoryIsExclusive: false,
                    categoryName: "area",
                    color: "#7bc043",
                    id: 10,
                    name: "backend",
                  },
                ]
              : [],
      }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ labels: [] }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        state === "populated" ||
          state === "blank-assignee-label" ||
          state === "empty-avatar-options" ||
          state === "no-milestone-menu" ||
          state === "non-member" ||
          state === "project-wide-options"
          ? state === "blank-assignee-label"
            ? {
                ...populatedIssueResponse(),
                items: [
                  {
                    ...populatedIssueResponse().items[0],
                    assigneeLabel: "",
                  },
                ],
              }
            : populatedIssueResponse()
          : state === "normal-draft"
            ? {
                ...populatedIssueResponse(),
                closedIssueCount: 0,
                items: [
                  {
                    ...populatedIssueResponse().items[0],
                    assigneeAvatarUrl: "",
                    assigneeLabel: "",
                    assigneeLoginId: "",
                    assigneeUserId: undefined,
                    authorLabel: "Site Admin",
                    authorLoginId: "admin",
                    authorUserId: 1,
                    commentCount: 0,
                    dueDateLabel: "",
                    dueDateOverdue: false,
                    dueDateText: "",
                    id: 47,
                    isDraft: true,
                    issueNumber: 17,
                    labels: [],
                    milestoneId: undefined,
                    milestoneTitle: undefined,
                    title: "Inline draft issue",
                    voterCount: 0,
                  },
                ],
                openIssueCount: 1,
                totalCount: 1,
                totalPages: 1,
              }
            : state === "normal-foreign-draft"
              ? {
                  ...populatedIssueResponse(),
                  closedIssueCount: 0,
                  items: [
                    {
                      ...populatedIssueResponse().items[0],
                      assigneeAvatarUrl: "",
                      assigneeLabel: "",
                      assigneeLoginId: "",
                      assigneeUserId: undefined,
                      authorLabel: "Dev Member",
                      authorLoginId: "dev",
                      authorUserId: 2,
                      commentCount: 0,
                      dueDateLabel: "",
                      dueDateOverdue: false,
                      dueDateText: "",
                      id: 48,
                      isDraft: true,
                      issueNumber: 18,
                      labels: [],
                      milestoneId: undefined,
                      milestoneTitle: undefined,
                      title: "Foreign inline draft issue",
                      voterCount: 0,
                    },
                  ],
                  openIssueCount: 1,
                  totalCount: 1,
                  totalPages: 1,
                }
              : state === "labels-unsorted"
                ? {
                    ...populatedIssueResponse(),
                    items: [
                      {
                        ...populatedIssueResponse().items[0],
                        labels: [
                          {
                            categoryId: 4,
                            categoryIsExclusive: true,
                            categoryName: "priority",
                            color: "#f66",
                            id: 9,
                            name: "P1",
                          },
                          {
                            categoryId: 3,
                            categoryIsExclusive: false,
                            categoryName: "bug",
                            color: "#51aacc",
                            id: 8,
                            name: "bug",
                          },
                        ],
                      },
                    ],
                  }
                : state === "prefix"
                  ? {
                      ...populatedIssueResponse(),
                      items: [
                        {
                          ...populatedIssueResponse().items[0],
                          title: "[P1] Fix flaky issue",
                        },
                      ],
                    }
                  : state === "sharer"
                    ? {
                        ...populatedIssueResponse(),
                        items: [
                          {
                            ...populatedIssueResponse().items[0],
                            sharerCount: 2,
                          },
                        ],
                      }
                    : state === "upcoming"
                      ? {
                          ...populatedIssueResponse(),
                          items: [
                            {
                              ...populatedIssueResponse().items[0],
                              dueDateLabel: "Jul 5, 2026",
                              dueDateOverdue: false,
                              dueDateText: "4 days left",
                            },
                          ],
                        }
                      : state === "subtask"
                        ? {
                            ...populatedIssueResponse(),
                            items: [
                              {
                                ...populatedIssueResponse().items[0],
                                childClosedCount: 1,
                                childOpenCount: 2,
                                parentIssueNumber: 9,
                                parentIssueTitle: "Parent issue title",
                              },
                            ],
                          }
                        : state === "weighted"
                          ? {
                              ...populatedIssueResponse(),
                              closedIssueCount: 1,
                              items: [
                                {
                                  ...populatedIssueResponse().items[0],
                                  dueDateLabel: "Jul 5, 2026",
                                  dueDateOverdue: false,
                                  dueDateText: "Jul 5, 2026",
                                  state: "closed",
                                  weight: 4,
                                },
                              ],
                              openIssueCount: 0,
                              totalCount: 1,
                              totalPages: 1,
                            }
                          : state === "children" || state === "child-draft"
                            ? {
                                ...populatedIssueResponse(),
                                items: [
                                  {
                                    ...populatedIssueResponse().items[0],
                                    childIssues:
                                      state === "child-draft"
                                        ? [
                                            {
                                              authorLoginId: "dev",
                                              createdLabel: "Jul 3, 2026",
                                              id: 45,
                                              isDraft: true,
                                              issueNumber: 15,
                                              labels: [],
                                              state: "open",
                                              title: "Foreign draft child",
                                            },
                                            {
                                              authorLoginId: "admin",
                                              createdLabel: "Jul 4, 2026",
                                              id: 46,
                                              isDraft: true,
                                              issueNumber: 16,
                                              labels: [],
                                              state: "open",
                                              title: "Own draft child",
                                            },
                                          ]
                                        : [
                                            {
                                              assigneeLabel: "Dev Member",
                                              commentCount: 2,
                                              createdLabel: "Jul 3, 2026",
                                              id: 42,
                                              issueNumber: 13,
                                              labels: [
                                                {
                                                  categoryId: 3,
                                                  categoryIsExclusive: false,
                                                  categoryName: "bug",
                                                  color: "#51aacc",
                                                  id: 8,
                                                  name: "bug",
                                                },
                                              ],
                                              state: "open",
                                              title: "Open child issue",
                                              voterCount: 1,
                                            },
                                            {
                                              assigneeLabel: "",
                                              createdLabel: "Jul 4, 2026",
                                              id: 43,
                                              issueNumber: 14,
                                              labels: [],
                                              state: "closed",
                                              title: "Closed child issue",
                                            },
                                          ],
                                  },
                                ],
                              }
                            : state === "draft"
                              ? {
                                  ...populatedIssueResponse(),
                                  draftItems: [
                                    {
                                      authorAvatarUrl: "/assets/images/default-avatar-32.png",
                                      authorLabel: "Site Admin",
                                      authorLoginId: "admin",
                                      authorUserId: 1,
                                      commentCount: 0,
                                      createdLabel: "Jul 1, 2026",
                                      id: 41,
                                      isDraft: true,
                                      issueNumber: 10,
                                      labels: [],
                                      ownerName: "admin",
                                      projectName: "sample",
                                      state: "open",
                                      title: "Draft issue",
                                      updatedLabel: "Jul 1, 2026",
                                      voterCount: 0,
                                    },
                                  ],
                                  totalCount: 1,
                                  totalPages: 1,
                                }
                              : state === "foreign-draft"
                                ? {
                                    ...populatedIssueResponse(),
                                    draftItems: [
                                      {
                                        authorAvatarUrl: "/assets/images/default-avatar-32.png",
                                        authorLabel: "Dev Member",
                                        authorLoginId: "dev",
                                        authorUserId: 2,
                                        commentCount: 0,
                                        createdLabel: "Jul 1, 2026",
                                        id: 44,
                                        isDraft: true,
                                        issueNumber: 15,
                                        labels: [],
                                        ownerName: "admin",
                                        projectName: "sample",
                                        state: "open",
                                        title: "Foreign draft issue",
                                        updatedLabel: "Jul 1, 2026",
                                        voterCount: 0,
                                      },
                                    ],
                                    totalCount: 1,
                                    totalPages: 1,
                                  }
                                : state === "draft-only-empty"
                                  ? {
                                      closedIssueCount: 0,
                                      draftItems: [
                                        {
                                          authorAvatarUrl: "/assets/images/default-avatar-32.png",
                                          authorLabel: "Site Admin",
                                          authorLoginId: "admin",
                                          authorUserId: 1,
                                          commentCount: 0,
                                          createdLabel: "Jul 1, 2026",
                                          id: 41,
                                          isDraft: true,
                                          issueNumber: 10,
                                          labels: [],
                                          ownerName: "admin",
                                          projectName: "sample",
                                          state: "open",
                                          title: "Draft issue",
                                          updatedLabel: "Jul 1, 2026",
                                          voterCount: 0,
                                        },
                                      ],
                                      items: [],
                                      openIssueCount: 0,
                                      ownerName: "admin",
                                      pageNum: 1,
                                      pageSize: 15,
                                      projectName: "sample",
                                      totalCount: 0,
                                      totalPages: 0,
                                    }
                                  : state === "bulk"
                                    ? {
                                        closedIssueCount: 2,
                                        draftItems: [],
                                        items: [
                                          populatedIssueResponse().items[0],
                                          {
                                            authorAvatarUrl: "/assets/images/default-avatar-32.png",
                                            authorLabel: "Site Admin",
                                            authorLoginId: "admin",
                                            commentCount: 0,
                                            createdLabel: "Jul 2, 2026",
                                            id: 43,
                                            issueNumber: 12,
                                            labels: [],
                                            ownerName: "admin",
                                            projectName: "sample",
                                            state: "open",
                                            title: "Follow up issue",
                                            updatedLabel: "Jul 2, 2026",
                                            voterCount: 0,
                                          },
                                        ],
                                        openIssueCount: 2,
                                        ownerName: "admin",
                                        pageNum: 1,
                                        pageSize: 15,
                                        projectName: "sample",
                                        totalCount: 2,
                                        totalPages: 1,
                                      }
                                    : {
                                        closedIssueCount: 0,
                                        draftItems: [],
                                        items: [],
                                        openIssueCount: 0,
                                        ownerName: "admin",
                                        pageNum: 1,
                                        pageSize: 15,
                                        projectName: "sample",
                                        totalCount: 0,
                                      },
      ),
    });
  });
  await page.route("**/api/v1/projects/weblabs/portal/issues**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        state === "portal-protected"
          ? {
              assignedToMeCount: 0,
              authoredByMeCount: 0,
              closedIssueCount: 0,
              commentedByMeCount: 0,
              draftItems: [
                {
                  authorLoginId: "carol",
                  id: 99,
                  isDraft: true,
                  issueNumber: 99,
                  title: "Foreign draft",
                },
              ],
              items: [
                {
                  assigneeAvatarUrl: "/assets/images/default-avatar-128.png",
                  assigneeLabel: "Site Admin",
                  assigneeLoginId: "admin",
                  assigneeUserId: 1,
                  authorAvatarUrl: "/assets/images/default-avatar-128.png",
                  authorLabel: "Carol Lee",
                  authorLoginId: "carol",
                  authorUserId: 2,
                  commentCount: 0,
                  createdLabel: "Jul 6, 2026",
                  dueDateLabel: "Jul 28, 2026",
                  dueDateOverdue: false,
                  dueDateText: "22 days",
                  id: 2,
                  issueNumber: 1,
                  labels: [],
                  milestoneId: undefined,
                  milestoneTitle: undefined,
                  ownerName: "weblabs",
                  projectName: "portal",
                  sharerCount: 0,
                  state: "open",
                  title: "Portal issue",
                  updatedLabel: "Jul 6, 2026",
                  voterCount: 0,
                },
              ],
              openIssueCount: 1,
              ownerName: "weblabs",
              pageNum: 1,
              pageSize: 15,
              projectName: "portal",
              totalCount: 1,
              totalPages: 1,
            }
          : {
              closedIssueCount: 0,
              draftItems: [],
              items: [],
              openIssueCount: 0,
              ownerName: "weblabs",
              pageNum: 1,
              pageSize: 15,
              projectName: "portal",
              totalCount: 0,
            },
      ),
    });
  });
}

function populatedIssueResponse() {
  return {
    closedIssueCount: 2,
    draftItems: [],
    items: [
      {
        assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
        assigneeLabel: "Site Admin",
        assigneeLoginId: "admin",
        assigneeUserId: 1,
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        authorUserId: 2,
        commentCount: 3,
        createdLabel: "Jul 1, 2026",
        dueDateLabel: "Jun 30, 2026",
        dueDateOverdue: true,
        dueDateText: "Overdue",
        id: 42,
        issueNumber: 11,
        labels: [
          {
            categoryId: 3,
            categoryIsExclusive: false,
            categoryName: "bug",
            color: "#51aacc",
            id: 8,
            name: "bug",
          },
        ],
        milestoneId: 5,
        milestoneTitle: "v1.0",
        ownerName: "admin",
        projectName: "sample",
        state: "open",
        title: "Fix flaky issue",
        updatedLabel: "Jul 1, 2026",
        voterCount: 1,
      },
    ],
    openIssueCount: 1,
    ownerName: "admin",
    pageNum: 1,
    pageSize: 15,
    projectName: "sample",
    totalCount: 3,
    totalPages: 3,
  };
}

async function attributes(page: Page, selector: string, name: string) {
  return page
    .locator(selector)
    .evaluateAll(
      (elements, attributeName) => elements.map((element) => element.getAttribute(attributeName)),
      name,
    );
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
        .filter((attr) => shouldKeepAttr(node, attr))
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
      if (attr.name === "style") {
        return normalizeStyleAttr(attr.value);
      }
      if (attr.name === "class" && attr.ownerElement?.closest(".user-menu-wrap")) {
        return attr.value
          .split(/\s+/u)
          .filter((className) => className && className !== "active")
          .join(" ");
      }
      return attr.value;
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

    function shouldKeepAttr(node: Element, attr: Attr) {
      if (
        attr.name.startsWith("data-v-") ||
        attr.name === "alt" ||
        attr.name === "aria-current" ||
        attr.name === "data-status" ||
        (node.tagName === "A" && attr.name.startsWith("data-"))
      ) {
        return false;
      }
      return attr.name !== "class" || normalizeAttr(attr) !== "";
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
        .filter((attr) => shouldKeepAttr(node, attr))
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

    function shouldKeepAttr(node: Element, attr: Attr) {
      if (
        attr.name.startsWith("data-v-") ||
        attr.name === "alt" ||
        attr.name === "aria-current" ||
        attr.name === "data-status" ||
        (node.tagName === "A" && attr.name.startsWith("data-"))
      ) {
        return false;
      }
      return attr.name !== "class" || normalizeAttr(attr) !== "";
    }
  }, html);
}
