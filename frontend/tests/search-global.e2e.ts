import { expect, test, type Page } from "@playwright/test";

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
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="project"><input type="text" id="searchKeyword" name="keyword" class="span11" value="sample"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Projects</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item project"><a href="__BASE_PATH__/admin/sample" class="avatar-wrap"><img src="/assets/images/project_default_logo.png"></a><div class="title-wrap"><a href="__BASE_PATH__/admin/sample" class="title project-link">admin/sample</a></div><div class="search-meta-info nm np"><span><i class="yobicon-split yobicon-white vmiddle"></i>Forked from</span><span><a href="__BASE_PATH__/origin/base" class="project-link">origin/base</a></span></div><div class="search-content np"><p class="search-content-body">Sample project</p></div><div class="search-meta-info np"><span class="meta-info">Create a project<strong title="Jun 30, 2026">Jun 30, 2026</strong></span><span class="meta-info">Latest code update<strong title="Jul 1, 2026">Jul 1, 2026</strong></span></div></li></ul></div></div></div></div></div></div>
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
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="post"><input type="text" id="searchKeyword" name="keyword" class="span11" value="notice"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Posts</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><span class="post-id">#5</span><a href="__BASE_PATH__/admin/sample/post/5" class="title">Release notice</a></div><div class="search-content"><p class="search-content-body">Notice body.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/admin/sample" class="project-link meta-item">admin/sample</a><a href="__BASE_PATH__/bob" class="meta-item" data-toggle="tooltip" data-placement="top" title="bob">Bob</a><span class="meta-item" title="Jun 29, 2026">Jun 29, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
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
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class="active "><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/search"><input type="hidden" name="searchType" value="milestone"><input type="text" id="searchKeyword" name="keyword" class="span11" value="v1"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Milestones</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><a href="__BASE_PATH__/admin/sample/milestone/8" class="title">v1.0</a></div><div class="search-content"><p class="search-content-body">Release scope.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/admin/sample" class="project-link meta-item">admin/sample</a><span class="due-date meta-item">Due Date<strong>Jul 31, 2026</strong> (D-30)</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
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
});

test("global project search renders legacy partial_projects.scala.html populated row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockGlobalSearch(page);

  await page.goto(`${basePath}/search?keyword=sample&searchType=project`);
  await expect(page.locator(".search-list-wrap .search-list-item.project")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_GLOBAL_PROJECT_SEARCH.replaceAll("__BASE_PATH__", basePath),
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

async function mockGlobalSearch(page: Page) {
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
    const requestUrl = new URL(route.request().url());
    const keyword = requestUrl.searchParams.get("keyword") ?? "";
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
              authorLabel: "",
              authorLoginId: "",
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
        keyword: "missing",
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "project",
        scope: "global",
        searchType: "project",
        totalCount: 0,
      }),
    });
  });
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
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}="${normalizeAttr(attr)}"`)
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
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}="${normalizeAttr(attr)}"`)
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
