import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const EXPECTED_GLOBAL_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li>
        <form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div class="search-box">
            <input type="text" name="keyword" autocomplete="off" accesskey="S">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li>
          <li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li>
          <li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" id="required-logged-in">
        <a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a>
      </li>
      <li class="divider"></li>
      <li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li>
    </ul>
  </div>
</header>
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner">
    <h3>Search</h3>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="project-page-wrap">
      <div class="row-fluid">
        <div class="span2">
          <ul class="lst-stacked unstyled search-category-wrap">
            <li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li>
            <li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li>
            <li class="active empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li>
            <li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li>
            <li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li>
            <li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li>
            <li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li>
            <li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li>
          </ul>
        </div>
        <div class="span10">
          <div class="search-box-wrap">
            <form id="searchInnerForm" method="get" action="__BASE_PATH__/search">
              <input type="hidden" name="searchType" value="project">
              <input type="text" id="searchKeyword" name="keyword" class="span11" value="missing">
              <button type="submit" class="ybtn">Search</button>
            </form>
            <h3 class="search-result-title">Found <strong>0</strong> result(s) in Projects</h3>
          </div>
          <div class="search-result-wrap">
            <div class="empty-result"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

const EXPECTED_REQUEST_TEXT_TOO_LARGE = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="error-wrap"><i class="ico ico-err2"></i><p>Request text entity too large</p><p>Text length exceeds maximum allowed text "102400" bytes.</p></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_GLOBAL_PROJECT_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="project"><input type="text" id="searchKeyword" name="keyword" class="span11" value="sample"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Projects</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item project"><a href="__BASE_PATH__/admin/sample" class="avatar-wrap"><img src="/assets/images/project_default_logo.png"></a><div class="title-wrap"><a href="__BASE_PATH__/admin/sample" class="title project-link">admin/<strong class="keyword">sample</strong></a></div><div class="search-meta-info nm np"><span><i class="yobicon-split yobicon-white vmiddle"></i>Forked from</span><span><a href="__BASE_PATH__/origin/base" class="project-link">origin/base</a></span></div><div class="search-content np"><p class="search-content-body"><strong class="keyword">Sample</strong> project</p></div><div class="search-meta-info np"><span class="meta-info">Create a project<strong title="Jun 30, 2026">Jun 30, 2026</strong></span><span class="meta-info">Latest code update<strong title="Jul 1, 2026">Jul 1, 2026</strong></span></div></li></ul></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_GLOBAL_USER_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="user"><input type="text" id="searchKeyword" name="keyword" class="span11" value="member"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Users</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item project"><a href="__BASE_PATH__/alice" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="alice"><img src="__BASE_PATH__/files/7" alt="Alice" width="32" height="32"></a><div class="title-wrap"><a href="__BASE_PATH__/alice" class="title user-link">Alice (@alice)</a></div><div class="infos nm"><span class="infos-item">Member since Jun 30, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const DEFAULT_USER_PICTURE_URL = "https://www.gravatar.com/avatar/default-member?s=32&d=identicon";

const EXPECTED_GLOBAL_DEFAULT_USER_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="user"><input type="text" id="searchKeyword" name="keyword" class="span11" value="default-member"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Users</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item project"><a href="__BASE_PATH__/default-member" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="default-member"><img src="${DEFAULT_USER_PICTURE_URL}"></a><div class="title-wrap"><a href="__BASE_PATH__/default-member" class="title user-link">Default Member (@<strong class="keyword">default-member</strong>)</a></div><div class="infos nm"><span class="infos-item">Member since Jun 30, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_GLOBAL_ISSUE_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class="active "><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="issue"><input type="text" id="searchKeyword" name="keyword" class="span11" value="bug"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Issues</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><span class="post-id">#42</span><a href="__BASE_PATH__/admin/sample/issue/42" class="title">Save button fails</a></div><div class="search-content"><p class="search-content-body">Crash when saving.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/admin/sample" class="project-link meta-item">admin/sample</a><a href="__BASE_PATH__/alice" class="meta-item" data-toggle="tooltip" data-placement="top" title="alice">Alice</a><span class="meta-item" title="Jun 30, 2026">Jun 30, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_GLOBAL_POST_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="post"><input type="text" id="searchKeyword" name="keyword" class="span11" value="notice"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Posts</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><span class="post-id">#5</span><a href="__BASE_PATH__/admin/sample/post/5" class="title">Release <strong class="keyword">notice</strong></a></div><div class="search-content"><p class="search-content-body"><strong class="keyword">Notice</strong> body.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/admin/sample" class="project-link meta-item">admin/sample</a><a href="__BASE_PATH__/bob" class="meta-item" data-toggle="tooltip" data-placement="top" title="bob">Bob</a><span class="meta-item" title="Jun 29, 2026">Jun 29, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_GLOBAL_MILESTONE_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="milestone"><input type="text" id="searchKeyword" name="keyword" class="span11" value="v1"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Milestones</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><a href="__BASE_PATH__/admin/sample/milestone/8" class="title"><strong class="keyword">v1</strong>.0</a></div><div class="search-content"><p class="search-content-body">Release scope.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/admin/sample" class="project-link meta-item">admin/sample</a><span class="due-date meta-item">Due Date<strong>Jul 31, 2026</strong> (D-30)</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_GLOBAL_ISSUE_COMMENT_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="issue_comment"><input type="text" id="searchKeyword" name="keyword" class="span11" value="reply"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Issue Comments</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><span class="post-id">#42</span><a href="__BASE_PATH__/admin/sample/issue/42#comment-77">Re) Save button fails</a></div><div class="search-content"><p class="search-content-body"><strong class="keyword">Reply</strong> body.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/admin/sample" class="project-link meta-item">admin/sample</a><a href="__BASE_PATH__/alice" class="meta-item" data-toggle="tooltip" data-placement="top" title="alice">Alice</a><span class="meta-item" title="Jun 30, 2026">Jun 30, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_GLOBAL_POST_COMMENT_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="post_comment"><input type="text" id="searchKeyword" name="keyword" class="span11" value="thread"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Post Comments</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><span class="post-id">#5</span><a href="__BASE_PATH__/admin/sample/post/5#comment-88">Re) Release notice</a></div><div class="search-content"><p class="search-content-body"><strong class="keyword">Thread</strong> body.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/admin/sample" class="project-link meta-item">admin/sample</a><span class="meta-item">posting.noAuthor</span><span class="meta-item" title="Jun 29, 2026">Jun 29, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_GLOBAL_REVIEW_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">1</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="review"><input type="text" id="searchKeyword" name="keyword" class="span11" value="review"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Code Reviews</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><span class="post-id">#3</span><a href="__BASE_PATH__/admin/sample/pullRequest/3#comment-99">Re) Refactor auth flow</a></div><div class="search-content"><p class="search-content-body"><strong class="keyword">Review</strong> body.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/admin/sample" class="project-link meta-item">admin/sample</a><a href="__BASE_PATH__/carol" class="meta-item" data-toggle="tooltip" data-placement="top" title="carol">Carol</a><span class="meta-item" title="Jun 28, 2026">Jun 28, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_GLOBAL_INLINE_REVIEW_SEARCH = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">1</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="review"><input type="text" id="searchKeyword" name="keyword" class="span11" value="inline"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Code Reviews</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="search-content"><a href="__BASE_PATH__/admin/sample/code/main/src/App.ts#thread-100"><p class="search-content-body"><strong class="keyword">Inline</strong> review body.....</p></a></div><div class="search-meta-info"><a href="__BASE_PATH__/admin/sample" class="project-link meta-item">admin/sample</a><a href="__BASE_PATH__/dave" class="meta-item" data-toggle="tooltip" data-placement="top" title="dave">Dave</a><span class="meta-item" title="Jun 27, 2026">Jun 27, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("global search matches legacy search/result.scala.html empty project result DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=missing&searchType=project`);
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_GLOBAL_SEARCH.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await readSearchResultShellMetrics(page)).toEqual({
    activeCategoryBackground: "rgb(81, 170, 204)",
    activeCategoryHeight: 55,
    buttonHeight: 30,
    buttonWidth: 71,
    categoryColumnWidth: 188,
    categoryListMargin: "0px",
    categoryPaddingLeft: "0px",
    emptyHeight: 52,
    formDisplay: "flex",
    innerProjectWrapWidth: 1260,
    keywordHeight: 30,
    keywordPadding: "4px 6px",
    keywordValue: "missing",
    pageWrapOuterMinHeight: "450px",
    resultColumnWidth: 1046,
    resultWrapMarginTop: "0px",
    rowWidth: 1260,
    searchBoxMarginBottom: "16px",
    titleFontSize: "16px",
    titleMargin: "15px 0px 10px",
  });
});

test("global project search renders legacy partial_projects.scala.html populated row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=sample&searchType=project`);
  await expect(page.locator(".search-list-wrap .search-list-item.project")).toBeVisible();
  const projectLogo = page.locator(".search-list-item.project .avatar-wrap img");
  await expect(projectLogo).toHaveAttribute("src", "/assets/images/project_default_logo.png");
  await expect(projectLogo).not.toHaveAttribute("alt");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_GLOBAL_PROJECT_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("global search result navigation keeps legacy hrefs through TanStack Router Link", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=sample&searchType=project`);
  await expect(page.locator(".search-list-item.project .avatar-wrap")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(page.locator(".search-list-item.project .title.project-link")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(page.locator(".search-meta-info.nm.np .project-link")).toHaveAttribute(
    "href",
    `${basePath}/origin/base`,
  );

  await page.goto(`${basePath}/search?keyword=reply&searchType=issue_comment`);
  await expect(page.locator(".title-wrap a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/42#comment-77`,
  );
  await expect(page.locator(".search-meta-info .project-link.meta-item")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(page.locator(".search-meta-info a.meta-item[title='alice']")).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );

  const routeSource = readFileSync(
    new URL("../src/routes/-search-screen.tsx", import.meta.url),
    "utf8",
  );
  const resultListSource = routeSource.slice(
    routeSource.indexOf("function SearchResultList"),
    routeSource.indexOf("function internalLinkTarget"),
  );
  const routeBodySource = routeSource.slice(0, routeSource.indexOf("function HighlightedText"));
  expect(routeBodySource).not.toMatch(/<a[\s>]/u);
  expect(routeBodySource).not.toContain('href="#"');
  expect(routeBodySource).not.toContain("<Link href");
  expect(routeBodySource).not.toContain('data-toggle="search-category"');
  expect(routeBodySource).not.toContain("data-type={menu.type}");
  expect(routeBodySource).not.toContain("dangerouslySetInnerHTML");
  expect(resultListSource).not.toMatch(/<a[\s>]/u);
  expect(resultListSource).not.toContain("</a>");
  expect(resultListSource).not.toContain("InternalResultLink");
  expect(resultListSource).toContain("isDefaultUserSearchAvatar(item.avatarUrl)");
  expect(resultListSource).toContain("<Link");
  expect(resultListSource).toContain("to={itemLink.to}");
  expect(resultListSource).toContain("hash={itemLink.hash || undefined}");
  expect(routeBodySource).toContain('<button\n                          type="button"');
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toMatch(/<a[\s>]/u);
  expect(routeSource).not.toContain("setAttribute");
  expect(routeSource).not.toContain("removeAttribute");
  expect(routeSource).not.toContain("activeProps={{ className: undefined }}");
  expect(routeSource).toContain("const legacySearchPaginationLinkActiveOptions =");
  expect(routeSource).toContain("const legacySearchPaginationLinkActiveProps =");
  expect(routeSource).toContain("explicitUndefined: true");
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
});

test("global search category button uses React SPA navigation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=missing&searchType=project`);
  await expect(page.locator('.search-category-wrap a[href="#"]')).toHaveCount(0);
  await expect(page.locator(".search-category-wrap a")).toHaveCount(0);
  const issueCategory = page.locator(".search-category-wrap button").filter({ hasText: "Issues" });
  await expect(issueCategory).toHaveAttribute("type", "button");
  await expect(issueCategory).not.toHaveAttribute("data-toggle");
  await expect(issueCategory).not.toHaveAttribute("data-type");
  await page.locator("#searchKeyword").fill("fresh");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await issueCategory.click();

  await expect(page).toHaveURL(new RegExp(`${basePath}/search\\?`));
  expect(new URL(page.url()).searchParams.get("keyword")).toBe("fresh");
  expect(new URL(page.url()).searchParams.get("searchType")).toBe("issue");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator('#searchInnerForm input[name="searchType"]')).toHaveValue("issue");
  await expect(page.locator("#searchKeyword")).toHaveValue("fresh");
  await expect(page.locator(".search-category-wrap li.active button")).toHaveText("Issues0");
});

test("global search without required query renders legacy badrequest_default.scala.html shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockGlobalSearch(page);

  await page.goto(`${basePath}/search`);
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "The request cannot be fulfilled due to bad syntax",
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute("href", `${basePath}/`);
  await expect(page.locator("#searchInnerForm")).toHaveCount(0);
  expect(searchApi.count).toBe(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedDefaultSearchErrorScreen({
        basePath,
        buttonClass: "ybtn ybtn-info",
        iconClass: "ico-404",
        message: "The request cannot be fulfilled due to bad syntax",
      }),
    ),
  );
});

test("global search preserves whitespace-only raw keyword and calls search API", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=%20%20&searchType=user`);
  await expect(page.locator("#searchKeyword")).toHaveValue("  ");
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();
  await expect.poll(() => searchApi.count).toBe(1);
  await page.waitForLoadState("networkidle");
  expect(searchApi.count).toBe(1);
});

test("global user search renders legacy partial_users.scala.html populated row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=member&searchType=user`);
  await expect(page.locator(".search-list-wrap .search-list-item.project")).toBeVisible();
  const customAvatar = page.locator(".search-list-item.project .avatar-wrap img");
  await expect(customAvatar).toHaveAttribute("src", `${basePath}/files/7`);
  await expect(customAvatar).toHaveAttribute("alt", "Alice");
  await expect(customAvatar).toHaveAttribute("width", "32");
  await expect(customAvatar).toHaveAttribute("height", "32");
  await expect(page.locator("#pagination")).toHaveAttribute("id", "pagination");
  await expect(page.locator("#pagination")).not.toHaveClass(/page-navigation-wrap/u);
  await expect(page.locator("#pagination .page-nums")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_GLOBAL_USER_SEARCH.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("global user search renders legacy partial_users.scala.html default avatar branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=default-member&searchType=user`);
  await expect(page.locator(".search-list-wrap .search-list-item.project")).toBeVisible();
  const defaultAvatar = page.locator(".search-list-item.project .avatar-wrap img");
  await expect(defaultAvatar).toHaveAttribute("src", DEFAULT_USER_PICTURE_URL);
  await expect(defaultAvatar).not.toHaveAttribute("alt");
  await expect(defaultAvatar).not.toHaveAttribute("width");
  await expect(defaultAvatar).not.toHaveAttribute("height");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_GLOBAL_DEFAULT_USER_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("global issue search renders legacy partial_issues.scala.html populated row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=bug&searchType=issue`);
  await expect(page.locator(".search-list-wrap .search-list-item")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_GLOBAL_ISSUE_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("global issue search renders legacy pagination when result pages exceed one", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=paged&searchType=issue&pageNum=1`);
  const pagination = page.locator("#pagination");
  await expect(pagination).toHaveClass("page-navigation-wrap");
  await expect(pagination.locator("ul.page-nums")).toHaveCount(1);
  await expect(pagination.locator("li.page-num")).toHaveCount(5);
  await expect(pagination.locator(".btn-pg-prev.off")).toHaveCount(1);
  await expect(pagination.locator("span.off")).toHaveText("Previous page");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "3");
  await expect(pagination.locator(".page-num").nth(3)).toHaveText("3");

  const nextLink = pagination.locator("a", { hasText: "Next page" });
  await expect(nextLink.locator("span")).toHaveText("Next page");
  await expect(nextLink.locator(".btn-pg-next")).toHaveClass("ico btn-pg-next");
  await expect(nextLink.locator("..")).toHaveClass("page-num ikon");
  await expect(nextLink).not.toHaveAttribute("class");
  await expect(nextLink).not.toHaveAttribute("title");
  await expect(nextLink).not.toHaveAttribute("aria-current");
  await expect(nextLink).not.toHaveAttribute("data-status");

  const nextHref = await nextLink.getAttribute("href");
  expect(nextHref).not.toBeNull();
  const nextUrl = new URL(nextHref ?? "", page.url());
  expect(nextUrl.pathname).toBe(`${basePath}/search`);
  expect(nextUrl.searchParams.get("keyword")).toBe("paged");
  expect(nextUrl.searchParams.get("searchType")).toBe("issue");
  expect(nextUrl.searchParams.get("pageNum")).toBe("2");
  await expect(nextLink).toHaveAttribute(
    "href",
    `${basePath}/search?keyword=paged&pageNum=2&searchType=issue`,
  );

  await nextLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");

  const pageTwoUrl = page.url();
  await pagination.locator('input[name="pageNum"]').fill("1.5");
  await pagination.locator('input[name="pageNum"]').press("Enter");
  await expect(page).toHaveURL(pageTwoUrl);
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");

  const prevLink = pagination.locator("a", { hasText: "Previous page" });
  await expect(prevLink.locator("span")).toHaveText("Previous page");
  await expect(prevLink.locator(".btn-pg-prev")).toHaveClass("ico btn-pg-prev");
  await expect(prevLink.locator("..")).toHaveClass("page-num ikon");
  await expect(prevLink).not.toHaveAttribute("class");
  await expect(prevLink).not.toHaveAttribute("title");
  await expect(prevLink).not.toHaveAttribute("aria-current");
  await expect(prevLink).not.toHaveAttribute("data-status");

  const prevHref = await prevLink.getAttribute("href");
  expect(prevHref).not.toBeNull();
  const prevUrl = new URL(prevHref ?? "", page.url());
  expect(prevUrl.pathname).toBe(`${basePath}/search`);
  expect(prevUrl.searchParams.get("keyword")).toBe("paged");
  expect(prevUrl.searchParams.get("searchType")).toBe("issue");
  expect(prevUrl.searchParams.get("pageNum")).toBe("1");
  await expect(prevLink).toHaveAttribute(
    "href",
    `${basePath}/search?keyword=paged&pageNum=1&searchType=issue`,
  );

  await pagination.locator('input[name="pageNum"]').fill("9");
  await pagination.locator('input[name="pageNum"]').press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("3");
  await expect(pagination.locator(".btn-pg-next.off")).toHaveCount(1);
});

test("global post search renders legacy partial_posts.scala.html populated row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=notice&searchType=post`);
  await expect(page.locator(".search-list-wrap .search-list-item")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_GLOBAL_POST_SEARCH.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("global milestone search renders legacy partial_milestones.scala.html populated row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=v1&searchType=milestone`);
  await expect(page.locator(".search-list-wrap .search-list-item")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_GLOBAL_MILESTONE_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("global issue comment search renders legacy partial_issue_comments.scala.html populated row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=reply&searchType=issue_comment`);
  await expect(page.locator(".search-list-wrap .search-list-item")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_GLOBAL_ISSUE_COMMENT_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("global post comment search renders legacy partial_post_comments.scala.html populated row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=thread&searchType=post_comment`);
  await expect(page.locator(".search-list-wrap .search-list-item")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_GLOBAL_POST_COMMENT_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("global review search renders legacy partial_reviews.scala.html populated row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=review&searchType=review`);
  await expect(page.locator(".search-list-wrap .search-list-item")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_GLOBAL_REVIEW_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("global inline review search renders legacy partial_reviews.scala.html non-pull-request row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=inline&searchType=review`);
  await expect(page.locator(".search-list-wrap .search-list-item")).toBeVisible();
  await expect(page.locator(".search-list-item .title-wrap")).toHaveCount(0);
  await expect(page.locator(".search-content > a > p.search-content-body")).toHaveText(
    "Inline review body .....",
  );
  await expect(page.locator(".search-content > a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/src/App.ts#thread-100`,
  );

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_GLOBAL_INLINE_REVIEW_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("global search renders legacy request text too large error shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=too-large&searchType=issue&pageNum=1`);
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText([
    "Request text entity too large",
    'Text length exceeds maximum allowed text "102400" bytes.',
  ]);
  await expect(page.locator(".search-box-wrap")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_REQUEST_TEXT_TOO_LARGE.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readRequestTextTooLargeMetrics(page)).toEqual({
    errorIconBackgroundPosition: "-80px -160px",
    errorIconHeight: "80px",
    errorIconWidth: "50px",
    errorPaddingBottom: "100px",
    errorPaddingTop: "100px",
    errorTextAlign: "center",
    errorTextColor: "rgb(137, 137, 137)",
    errorTextFontSize: "16px",
    errorTextFontWeight: "700",
    errorTextMarginBottom: "30px",
    errorTextMarginTop: "30px",
    footerLineHeight: "34px",
    footerPaddingBottom: "10px",
    footerPaddingTop: "10px",
    pageWrapOuterMinHeight: "450px",
    projectPageWrapMarginTop: "20px",
  });
});

test("global search renders legacy error/forbidden_default.scala.html shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=forbidden&searchType=issue&pageNum=1`);
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText("You are not authorized");
  await expect(page.locator(".error-wrap .ybtn.ybtn-primary")).toHaveAttribute(
    "href",
    `${basePath}/`,
  );
  await expect(page.locator(".search-box-wrap")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedDefaultSearchErrorScreen({
        basePath,
        buttonClass: "ybtn ybtn-primary",
        iconClass: "ico ico-err2",
        message: "You are not authorized",
      }),
    ),
  );
  expect(await readDefaultSearchErrorMetrics(page, ".error-wrap .ico-err2")).toEqual({
    actionDisplay: "inline-block",
    actionHeight: "20px",
    actionLineHeight: "20px",
    errorIconHeight: "80px",
    errorIconWidth: "50px",
    errorPaddingBottom: "100px",
    errorPaddingTop: "100px",
    errorTextAlign: "center",
    errorTextColor: "rgb(137, 137, 137)",
    errorTextFontSize: "16px",
    errorTextFontWeight: "700",
    errorTextMarginBottom: "30px",
    errorTextMarginTop: "30px",
    footerLineHeight: "34px",
    footerPaddingBottom: "10px",
    footerPaddingTop: "10px",
    pageWrapOuterMinHeight: "450px",
    projectPageWrapMarginTop: "20px",
  });
});

test("global search renders legacy error/internalServerError_default.scala.html shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=server-error&searchType=issue&pageNum=1`);
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "Server error occurred; service is not available",
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-primary")).toHaveAttribute(
    "href",
    `${basePath}/`,
  );
  await expect(page.locator(".search-box-wrap")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedDefaultSearchErrorScreen({
        basePath,
        buttonClass: "ybtn ybtn-primary",
        iconClass: "ico-404",
        message: "Server error occurred; service is not available",
      }),
    ),
  );
  expect(await readDefaultSearchErrorMetrics(page, ".error-wrap .ico-404")).toEqual({
    actionDisplay: "inline-block",
    actionHeight: "20px",
    actionLineHeight: "20px",
    errorIconHeight: "80px",
    errorIconWidth: "50px",
    errorPaddingBottom: "100px",
    errorPaddingTop: "100px",
    errorTextAlign: "center",
    errorTextColor: "rgb(137, 137, 137)",
    errorTextFontSize: "16px",
    errorTextFontWeight: "700",
    errorTextMarginBottom: "30px",
    errorTextMarginTop: "30px",
    footerLineHeight: "34px",
    footerPaddingBottom: "10px",
    footerPaddingTop: "10px",
    pageWrapOuterMinHeight: "450px",
    projectPageWrapMarginTop: "20px",
  });
});

async function readRequestTextTooLargeMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const projectPageWrap = document.querySelector<HTMLElement>(".project-page-wrap");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const errorIcon = document.querySelector<HTMLElement>(".error-wrap .ico-err2");
    const errorText = document.querySelector<HTMLElement>(".error-wrap p");
    const footerOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const footer = document.querySelector<HTMLElement>(".page-footer");
    const missing = Object.entries({
      errorIcon,
      errorText,
      errorWrap,
      footer,
      footerOuter,
      pageWrapOuter,
      projectPageWrap,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected request-text-too-large metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const errorWrapStyle = getComputedStyle(errorWrap);
    const errorIconStyle = getComputedStyle(errorIcon);
    const errorTextStyle = getComputedStyle(errorText);
    const footerOuterStyle = getComputedStyle(footerOuter);
    return {
      errorIconBackgroundPosition: errorIconStyle.backgroundPosition,
      errorIconHeight: errorIconStyle.height,
      errorIconWidth: errorIconStyle.width,
      errorPaddingBottom: errorWrapStyle.paddingBottom,
      errorPaddingTop: errorWrapStyle.paddingTop,
      errorTextAlign: errorWrapStyle.textAlign,
      errorTextColor: errorTextStyle.color,
      errorTextFontSize: errorTextStyle.fontSize,
      errorTextFontWeight: errorTextStyle.fontWeight,
      errorTextMarginBottom: errorTextStyle.marginBottom,
      errorTextMarginTop: errorTextStyle.marginTop,
      footerLineHeight: getComputedStyle(footer).lineHeight,
      footerPaddingBottom: footerOuterStyle.paddingBottom,
      footerPaddingTop: footerOuterStyle.paddingTop,
      pageWrapOuterMinHeight: getComputedStyle(pageWrapOuter).minHeight,
      projectPageWrapMarginTop: getComputedStyle(projectPageWrap).marginTop,
    };
  });
}

async function readDefaultSearchErrorMetrics(page: Page, iconSelector: string) {
  return page.evaluate((selector) => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const projectPageWrap = document.querySelector<HTMLElement>(".project-page-wrap");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const errorIcon = document.querySelector<HTMLElement>(selector);
    const errorText = document.querySelector<HTMLElement>(".error-wrap p");
    const action = document.querySelector<HTMLElement>(".error-wrap .ybtn");
    const footerOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const footer = document.querySelector<HTMLElement>(".page-footer");
    const missing = Object.entries({
      action,
      errorIcon,
      errorText,
      errorWrap,
      footer,
      footerOuter,
      pageWrapOuter,
      projectPageWrap,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected default error metric targets are missing: ${missing.join(", ")}`);
    }

    const actionStyle = getComputedStyle(action);
    const errorWrapStyle = getComputedStyle(errorWrap);
    const errorIconStyle = getComputedStyle(errorIcon);
    const errorTextStyle = getComputedStyle(errorText);
    const footerOuterStyle = getComputedStyle(footerOuter);
    return {
      actionDisplay: actionStyle.display,
      actionHeight: actionStyle.height,
      actionLineHeight: actionStyle.lineHeight,
      errorIconHeight: errorIconStyle.height,
      errorIconWidth: errorIconStyle.width,
      errorPaddingBottom: errorWrapStyle.paddingBottom,
      errorPaddingTop: errorWrapStyle.paddingTop,
      errorTextAlign: errorWrapStyle.textAlign,
      errorTextColor: errorTextStyle.color,
      errorTextFontSize: errorTextStyle.fontSize,
      errorTextFontWeight: errorTextStyle.fontWeight,
      errorTextMarginBottom: errorTextStyle.marginBottom,
      errorTextMarginTop: errorTextStyle.marginTop,
      footerLineHeight: getComputedStyle(footer).lineHeight,
      footerPaddingBottom: footerOuterStyle.paddingBottom,
      footerPaddingTop: footerOuterStyle.paddingTop,
      pageWrapOuterMinHeight: getComputedStyle(pageWrapOuter).minHeight,
      projectPageWrapMarginTop: getComputedStyle(projectPageWrap).marginTop,
    };
  }, iconSelector);
}

async function readSearchResultShellMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const outerProjectWrap = document.querySelector<HTMLElement>(
      ".page-wrap-outer > .project-page-wrap",
    );
    const innerProjectWrap = document.querySelector<HTMLElement>(
      ".page-wrap-outer > .project-page-wrap > .project-page-wrap",
    );
    const row = document.querySelector<HTMLElement>(".page-wrap-outer .row-fluid");
    const categoryColumn = document.querySelector<HTMLElement>(".row-fluid > .span2");
    const resultColumn = document.querySelector<HTMLElement>(".row-fluid > .span10");
    const categories = document.querySelector<HTMLElement>(".search-category-wrap");
    const activeCategory = document.querySelector<HTMLElement>(".search-category-wrap li.active");
    const searchBox = document.querySelector<HTMLElement>(".search-box-wrap");
    const form = document.querySelector<HTMLElement>("#searchInnerForm");
    const keyword = document.querySelector<HTMLInputElement>("#searchKeyword");
    const button = document.querySelector<HTMLElement>("#searchInnerForm .ybtn");
    const title = document.querySelector<HTMLElement>(".search-result-title");
    const resultWrap = document.querySelector<HTMLElement>(".search-result-wrap");
    const empty = document.querySelector<HTMLElement>(".empty-result");
    const missing = Object.entries({
      activeCategory,
      button,
      categories,
      categoryColumn,
      empty,
      form,
      innerProjectWrap,
      keyword,
      outerProjectWrap,
      pageWrapOuter,
      resultColumn,
      resultWrap,
      row,
      searchBox,
      title,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected search result shell metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const activeCategoryStyle = getComputedStyle(activeCategory);
    const categoryColumnStyle = getComputedStyle(categoryColumn);
    const keywordStyle = getComputedStyle(keyword);
    const resultWrapStyle = getComputedStyle(resultWrap);
    const searchBoxStyle = getComputedStyle(searchBox);
    const titleStyle = getComputedStyle(title);
    return {
      activeCategoryBackground: activeCategoryStyle.backgroundColor,
      activeCategoryHeight: Math.round(activeCategory.getBoundingClientRect().height),
      buttonHeight: Math.round(button.getBoundingClientRect().height),
      buttonWidth: Math.round(button.getBoundingClientRect().width),
      categoryColumnWidth: Math.round(categoryColumn.getBoundingClientRect().width),
      categoryListMargin: getComputedStyle(categories).margin,
      categoryPaddingLeft: categoryColumnStyle.paddingLeft,
      emptyHeight: Math.round(empty.getBoundingClientRect().height),
      formDisplay: getComputedStyle(form).display,
      innerProjectWrapWidth: Math.round(innerProjectWrap.getBoundingClientRect().width),
      keywordHeight: Math.round(keyword.getBoundingClientRect().height),
      keywordPadding: keywordStyle.padding,
      keywordValue: keyword.value,
      pageWrapOuterMinHeight: getComputedStyle(pageWrapOuter).minHeight,
      resultColumnWidth: Math.round(resultColumn.getBoundingClientRect().width),
      resultWrapMarginTop: resultWrapStyle.marginTop,
      rowWidth: Math.round(row.getBoundingClientRect().width),
      searchBoxMarginBottom: searchBoxStyle.marginBottom,
      titleFontSize: titleStyle.fontSize,
      titleMargin: titleStyle.margin,
    };
  });
}

async function mockGlobalSearch(page: Page) {
  const apiCalls = { count: 0 };
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        defaultLandingPath: "/",
        isAnonymous: true,
      }),
    });
  });
  await page.route("**/api/v1/search?**", async (route) => {
    apiCalls.count += 1;
    const requestUrl = new URL(route.request().url());
    const keyword = requestUrl.searchParams.get("keyword") ?? "";
    const requestedSearchType = requestUrl.searchParams.get("searchType") ?? "project";
    if (keyword === "forbidden") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "forbidden",
            message: "You are not authorized",
            status: 403,
          },
        }),
      });
      return;
    }
    if (keyword === "server-error") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "internal_server_error",
            message: "Server error occurred; service is not available",
            status: 500,
          },
        }),
      });
      return;
    }
    if (keyword === "too-large") {
      await route.fulfill({
        status: 413,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "request_entity_too_large",
            message: "Request text entity too large",
            status: 413,
          },
        }),
      });
      return;
    }
    if (keyword === "sample") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 1,
            reviews: 0,
            users: 0,
          },
          items: [
            {
              authorLabel: "Bob",
              authorLoginId: "bob",
              createdLabel: "Jun 30, 2026",
              href: `${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample`,
              id: "7",
              number: "",
              originOwnerName: "origin",
              originProjectName: "base",
              ownerName: "admin",
              projectLogoUrl: "/assets/images/project_default_logo.png",
              projectName: "sample",
              snippets: [{ highlights: [], text: "Sample project", truncated: false }],
              state: "",
              title: "admin/sample",
              type: "project",
              updatedLabel: "Jul 1, 2026",
            },
          ],
          keyword: "sample",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "project",
          scope: "global",
          searchType: "project",
          totalCount: 1,
        }),
      });
      return;
    }
    if (keyword === "member") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 1,
          },
          items: [
            {
              authorLabel: "Alice",
              authorLoginId: "alice",
              avatarUrl: `${basePath}/files/7`,
              createdLabel: "Jun 30, 2026",
              href: `${basePath}/alice`,
              id: "10",
              number: "",
              ownerName: "",
              projectName: "",
              snippets: [],
              state: "active",
              title: "Alice",
              type: "user",
              updatedLabel: "",
            },
          ],
          keyword: "member",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "user",
          scope: "global",
          searchType: "user",
          totalCount: 1,
        }),
      });
      return;
    }
    if (keyword === "default-member") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 1,
          },
          items: [
            {
              authorLabel: "Default Member",
              authorLoginId: "default-member",
              avatarUrl: DEFAULT_USER_PICTURE_URL,
              createdLabel: "Jun 30, 2026",
              href: `${basePath}/default-member`,
              id: "11",
              number: "",
              ownerName: "",
              projectName: "",
              snippets: [],
              state: "active",
              title: "Default Member",
              type: "user",
              updatedLabel: "",
            },
          ],
          keyword: "default-member",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "user",
          scope: "global",
          searchType: "user",
          totalCount: 1,
        }),
      });
      return;
    }
    if (keyword === "bug") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 1,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 0,
          },
          items: [
            {
              authorLabel: "Alice",
              authorLoginId: "alice",
              createdLabel: "Jun 30, 2026",
              href: `${basePath}/admin/sample/issue/42`,
              id: "42",
              number: "42",
              ownerName: "admin",
              projectName: "sample",
              snippets: [{ highlights: [], text: "Crash when saving", truncated: true }],
              state: "open",
              title: "Save button fails",
              type: "issue",
              updatedLabel: "Jun 30, 2026",
            },
          ],
          keyword: "bug",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "issue",
          scope: "global",
          searchType: "issue",
          totalCount: 1,
        }),
      });
      return;
    }
    if (keyword === "paged") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      const pageNum = Number(requestUrl.searchParams.get("pageNum")) || 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 41,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 0,
          },
          items: [
            {
              authorLabel: "Alice",
              authorLoginId: "alice",
              createdLabel: "Jun 30, 2026",
              href: `${basePath}/admin/sample/issue/${40 + pageNum}`,
              id: `paged-${pageNum}`,
              number: String(40 + pageNum),
              ownerName: "admin",
              projectName: "sample",
              snippets: [{ highlights: [], text: "Paged issue body", truncated: true }],
              state: "open",
              title: `Paged issue ${pageNum}`,
              type: "issue",
              updatedLabel: "Jun 30, 2026",
            },
          ],
          keyword: "paged",
          pageNum,
          pageSize: 20,
          requestedSearchType: "issue",
          scope: "global",
          searchType: "issue",
          totalCount: 1,
          totalPages: 3,
        }),
      });
      return;
    }
    if (keyword === "notice") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 0,
            postComments: 0,
            posts: 1,
            projects: 0,
            reviews: 0,
            users: 0,
          },
          items: [
            {
              authorLabel: "Bob",
              authorLoginId: "bob",
              createdLabel: "Jun 29, 2026",
              href: `${basePath}/admin/sample/post/5`,
              id: "5",
              number: "5",
              ownerName: "admin",
              projectName: "sample",
              snippets: [{ highlights: [], text: "Notice body", truncated: true }],
              state: "",
              title: "Release notice",
              type: "post",
              updatedLabel: "Jun 29, 2026",
            },
          ],
          keyword: "notice",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "post",
          scope: "global",
          searchType: "post",
          totalCount: 1,
        }),
      });
      return;
    }
    if (keyword === "v1") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 1,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 0,
          },
          items: [
            {
              authorLabel: "",
              authorLoginId: "",
              createdLabel: "",
              dueDateUntilLabel: "D-30",
              href: `${basePath}/admin/sample/milestone/8`,
              id: "8",
              number: "8",
              ownerName: "admin",
              projectName: "sample",
              snippets: [{ highlights: [], text: "Release scope", truncated: true }],
              state: "open",
              title: "v1.0",
              type: "milestone",
              updatedLabel: "Jul 31, 2026",
            },
          ],
          keyword: "v1",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "milestone",
          scope: "global",
          searchType: "milestone",
          totalCount: 1,
        }),
      });
      return;
    }
    if (keyword === "reply") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 1,
            issues: 0,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 0,
          },
          items: [
            {
              authorLabel: "Alice",
              authorLoginId: "alice",
              createdLabel: "Jun 30, 2026",
              href: `${basePath}/admin/sample/issue/42#comment-77`,
              id: "77",
              number: "42",
              ownerName: "admin",
              projectName: "sample",
              snippets: [{ highlights: [], text: "Reply body", truncated: true }],
              state: "open",
              title: "Re) Save button fails",
              type: "issue_comment",
              updatedLabel: "",
            },
          ],
          keyword: "reply",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "issue_comment",
          scope: "global",
          searchType: "issue_comment",
          totalCount: 1,
        }),
      });
      return;
    }
    if (keyword === "thread") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 0,
            postComments: 1,
            posts: 0,
            projects: 0,
            reviews: 0,
            users: 0,
          },
          items: [
            {
              authorLabel: "",
              authorLoginId: "",
              createdLabel: "Jun 29, 2026",
              href: `${basePath}/admin/sample/post/5#comment-88`,
              id: "88",
              number: "5",
              ownerName: "admin",
              projectName: "sample",
              snippets: [{ highlights: [], text: "Thread body", truncated: true }],
              state: "open",
              title: "Re) Release notice",
              type: "post_comment",
              updatedLabel: "",
            },
          ],
          keyword: "thread",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "post_comment",
          scope: "global",
          searchType: "post_comment",
          totalCount: 1,
        }),
      });
      return;
    }
    if (keyword === "review") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 1,
            users: 0,
          },
          items: [
            {
              authorLabel: "Carol",
              authorLoginId: "carol",
              createdLabel: "Jun 28, 2026",
              href: `${basePath}/admin/sample/pullRequest/3#comment-99`,
              id: "99",
              number: "3",
              ownerName: "admin",
              projectName: "sample",
              reviewThreadOnPullRequest: true,
              snippets: [{ highlights: [], text: "Review body", truncated: true }],
              state: "open",
              title: "Re) Refactor auth flow",
              type: "review",
              updatedLabel: "",
            },
          ],
          keyword: "review",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "review",
          scope: "global",
          searchType: "review",
          totalCount: 1,
        }),
      });
      return;
    }
    if (keyword === "inline") {
      const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          context: {
            organizationName: "",
            ownerName: "",
            projectName: "",
          },
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 1,
            users: 0,
          },
          items: [
            {
              authorLabel: "Dave",
              authorLoginId: "dave",
              createdLabel: "Jun 27, 2026",
              href: `${basePath}/admin/sample/code/main/src/App.ts#thread-100`,
              id: "100",
              number: "",
              ownerName: "admin",
              projectName: "sample",
              reviewThreadOnPullRequest: false,
              snippets: [{ highlights: [], text: "Inline review body", truncated: true }],
              state: "open",
              title: "",
              type: "review",
              updatedLabel: "",
            },
          ],
          keyword: "inline",
          pageNum: 1,
          pageSize: 20,
          requestedSearchType: "review",
          scope: "global",
          searchType: "review",
          totalCount: 1,
        }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        context: {
          organizationName: "",
          ownerName: "",
          projectName: "",
        },
        counts: {
          issueComments: 0,
          issues: 0,
          milestones: 0,
          postComments: 0,
          posts: 0,
          projects: 0,
          reviews: 0,
          users: 0,
        },
        items: [],
        keyword,
        pageNum: 1,
        pageSize: 20,
        requestedSearchType,
        scope: "global",
        searchType: requestedSearchType,
        totalCount: 0,
      }),
    });
  });
  return apiCalls;
}

function expectedDefaultSearchErrorScreen({
  basePath,
  buttonClass,
  iconClass,
  message,
}: {
  basePath: string;
  buttonClass: string;
  iconClass: string;
  message: string;
}) {
  return `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="${basePath}" class="logo logo-letter">Y</a></li>
      <li><form action="${basePath}/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="${basePath}/user/anonymous">Profile</a></span><span class="user-menu"><a href="${basePath}/user/editform">Account</a></span><a href="${basePath}/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu"><li class="gnb-usermenu-item" id="required-logged-in"><a href="${basePath}/users/loginform" class="user-item-btn" data-login="required">Log in</a></li><li class="divider"></li><li><a href="${basePath}/users/signupform" class="ybtn ybtn-success">Sign up</a></li></ul>
  </div>
</header>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="error-wrap"><i class="${iconClass}"></i><p>${message}</p><a href="${basePath}/" class="${buttonClass}">Home</a></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
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
        .filter(
          (attr) =>
            !isModernizedTanStackRouterAttr(attr) &&
            !isEmptyModernizedTanStackRouterActiveClass(attr) &&
            !isModernizedLegacySearchCategoryAttribute(attr) &&
            !isModernizedSearchResultTooltipAttribute(attr) &&
            !isModernizedLegacySearchCategoryButtonType(attr) &&
            !isModernizedLegacyTabButtonType(attr) &&
            attr.name !== "data-login" &&
            attr.name !== "alt",
        )
        .map((attr) => `${attr.name}="${normalizeAttr(attr)}"`)
        .concat(isModernizedLegacySearchCategoryButton(node) ? ['href="#"'] : [])
        .concat(isModernizedLegacyTabButton(node) ? [`href="${legacyTabHref(node)}"`] : [])
        .sort()
        .join(" ");
      const tagName =
        isModernizedLegacySearchCategoryButton(node) || isModernizedLegacyTabButton(node)
          ? "a"
          : node.tagName.toLowerCase();
      const open = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${tagName}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (isModernizedTanStackRouterHref(attr)) {
        return "#";
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
      }
      if (
        attr.name === "href" &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("logo-letter") &&
        attr.value.length > 1
      ) {
        return attr.value.replace(/\/$/u, "");
      }
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }

    function isModernizedLegacySearchCategoryAttribute(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-type") &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedSearchResultTooltipAttribute(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-placement") &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.closest(".search-result-wrap") !== null &&
        (attr.ownerElement.classList.contains("avatar-wrap") ||
          attr.ownerElement.classList.contains("meta-item"))
      );
    }

    function isModernizedTanStackRouterHref(attr: Attr) {
      return (
        attr.name === "href" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        attr.name === "class" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedLegacySearchCategoryButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacySearchCategoryButton(attr.ownerElement);
    }

    function isModernizedLegacyTabButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyTabButton(attr.ownerElement);
    }

    function isModernizedLegacySearchCategoryButton(node: Element | null) {
      return node instanceof HTMLButtonElement && node.closest(".search-category-wrap") !== null;
    }

    function isModernizedLegacySearchCategoryControl(node: Element | null) {
      return node instanceof HTMLAnchorElement || isModernizedLegacySearchCategoryButton(node);
    }

    function isModernizedLegacyTabButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.closest(".nav-tabs.nm") !== null &&
        node.getAttribute("data-toggle") === "tab"
      );
    }

    function legacyTabHref(node: Element) {
      const item = node.closest("li");
      if (item?.classList.contains("myOrganizationList")) {
        return "#myOrganizationList";
      }
      if (item?.classList.contains("myProjectList")) {
        return "#myProjectList";
      }
      return "#myRecentIssueList";
    }

    function isEmptyModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        isModernizedTanStackRouterActiveClass(attr) &&
        modernizedTanStackRouterActiveClass(attr) === ""
      );
    }

    function modernizedTanStackRouterActiveClass(attr: Attr) {
      return attr.value
        .split(/\s+/u)
        .filter((token) => token && token !== "active")
        .join(" ");
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.childNodes)
      .map((node) => visit(node))
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
            !isModernizedTanStackRouterAttr(attr) &&
            !isEmptyModernizedTanStackRouterActiveClass(attr) &&
            !isModernizedLegacySearchCategoryAttribute(attr) &&
            !isModernizedSearchResultTooltipAttribute(attr) &&
            !isModernizedLegacySearchCategoryButtonType(attr) &&
            !isModernizedLegacyTabButtonType(attr) &&
            attr.name !== "data-login" &&
            attr.name !== "alt",
        )
        .map((attr) => `${attr.name}="${normalizeAttr(attr)}"`)
        .concat(isModernizedLegacySearchCategoryButton(node) ? ['href="#"'] : [])
        .concat(isModernizedLegacyTabButton(node) ? [`href="${legacyTabHref(node)}"`] : [])
        .sort()
        .join(" ");
      const tagName =
        isModernizedLegacySearchCategoryButton(node) || isModernizedLegacyTabButton(node)
          ? "a"
          : node.tagName.toLowerCase();
      const open = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${tagName}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (isModernizedTanStackRouterHref(attr)) {
        return "#";
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
      }
      if (
        attr.name === "href" &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("logo-letter") &&
        attr.value.length > 1
      ) {
        return attr.value.replace(/\/$/u, "");
      }
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }

    function isModernizedLegacySearchCategoryAttribute(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-type") &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedSearchResultTooltipAttribute(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-placement") &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.closest(".search-result-wrap") !== null &&
        (attr.ownerElement.classList.contains("avatar-wrap") ||
          attr.ownerElement.classList.contains("meta-item"))
      );
    }

    function isModernizedTanStackRouterHref(attr: Attr) {
      return (
        attr.name === "href" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        attr.name === "class" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedLegacySearchCategoryButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacySearchCategoryButton(attr.ownerElement);
    }

    function isModernizedLegacyTabButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyTabButton(attr.ownerElement);
    }

    function isModernizedLegacySearchCategoryButton(node: Element | null) {
      return node instanceof HTMLButtonElement && node.closest(".search-category-wrap") !== null;
    }

    function isModernizedLegacySearchCategoryControl(node: Element | null) {
      return node instanceof HTMLAnchorElement || isModernizedLegacySearchCategoryButton(node);
    }

    function isModernizedLegacyTabButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.closest(".nav-tabs.nm") !== null &&
        node.getAttribute("data-toggle") === "tab"
      );
    }

    function legacyTabHref(node: Element) {
      const item = node.closest("li");
      if (item?.classList.contains("myOrganizationList")) {
        return "#myOrganizationList";
      }
      if (item?.classList.contains("myProjectList")) {
        return "#myProjectList";
      }
      return "#myRecentIssueList";
    }

    function isEmptyModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        isModernizedTanStackRouterActiveClass(attr) &&
        modernizedTanStackRouterActiveClass(attr) === ""
      );
    }

    function modernizedTanStackRouterActiveClass(attr: Attr) {
      return attr.value
        .split(/\s+/u)
        .filter((token) => token && token !== "active")
        .join(" ");
    }
  }, html);
}
