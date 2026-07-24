import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const LEGACY_MARKDOWN_HELP = readFileSync(
  new URL("../../yona-original/app/views/help/markdown.scala.html", import.meta.url),
  "utf8",
)
  .replace(/@Messages\("title\.markdown\.help"\)/g, "Markdown help")
  .replace(/@\{"@"\}/g, "@")
  .replace(/<script[\s\S]*$/u, "")
  .replace(/^[\s\S]*?<div class="markdown-help">/u, '<div class="markdown-help">')
  .replace(/ data-toggle="markdown-help"/g, "")
  .replace(/\sdata-target="markdown[^"]+"/g, "")
  .replace(/<\/div>\s*$/u, "</div>");

const BUG_LABEL_STYLE =
  "background-color:rgb(81, 170, 204);box-shadow:rgb(81, 170, 204) 2px 0px 0px 0px inset;color:white";

const BOARD_LIST_KEYMAP = `<div class="pull-left" style="padding:10px 0px;margin-left:55px"><button type="button" class="ybtn ybtn-inverse ybtn-mini">Keyboard shortcuts</button><div id="helpKeys" class="modal hide fade keymap-help" tabindex="-1" role="dialog"><div class="row-fluid"><div class="span3"><h5>projects</h5><span class="ybtn ybtn-small">H</span><span class="help-inline">Home</span><br><span class="ybtn ybtn-small">B</span><span class="help-inline">Board</span><br><span class="ybtn ybtn-small">I</span><span class="help-inline">Issue</span><br><span class="ybtn ybtn-small">C</span><span class="help-inline">Code</span><br><span class="ybtn ybtn-small">M</span><span class="help-inline">Milestone</span><br><span class="ybtn ybtn-small">P</span><span class="help-inline">Pull request</span><br><span class="ybtn ybtn-small">Q</span><span class="help-inline">Settings</span><br></div><div class="span9"><div class="row-fluid"><div class="span5"><h5>Posting List</h5><span class="ybtn ybtn-small">N</span><span class="help-inline">New post</span><br><span class="ybtn ybtn-small">←</span><span class="help-inline">Previous page</span><br><span class="ybtn ybtn-small">→</span><span class="help-inline">Next page</span><br></div><div class="span7"><h5>Site</h5><span class="ybtn ybtn-small">A</span><span class="help-inline">My Issues</span><br><span class="ybtn ybtn-small">U</span><span class="help-inline">Profile</span><br><span class="ybtn ybtn-small">F</span><span class="help-inline">User menu</span><br>__SITE_SEARCH_KEYS__<span class="help-inline">Site search</span><br><span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Submit form</span><br></div></div><div class="row-fluid mt20"><div class="span12"></div></div></div></div><p class="actrow"><button type="button" class="ybtn ybtn-info">Confirm</button></p></div></div>`;
const BOARD_DETAIL_KEYMAP = `<div class="pull-left" style="padding:10px 0px;margin-left:55px"><button type="button" class="ybtn ybtn-inverse ybtn-mini">Keyboard shortcuts</button><div id="helpKeys" class="modal hide fade keymap-help" tabindex="-1" role="dialog"><div class="row-fluid"><div class="span3"><h5>projects</h5><span class="ybtn ybtn-small">H</span><span class="help-inline">Home</span><br><span class="ybtn ybtn-small">B</span><span class="help-inline">Board</span><br><span class="ybtn ybtn-small">I</span><span class="help-inline">Issue</span><br><span class="ybtn ybtn-small">C</span><span class="help-inline">Code</span><br><span class="ybtn ybtn-small">M</span><span class="help-inline">Milestone</span><br><span class="ybtn ybtn-small">P</span><span class="help-inline">Pull request</span><br><span class="ybtn ybtn-small">Q</span><span class="help-inline">Settings</span><br></div><div class="span9"><div class="row-fluid"><div class="span5"><h5>Board details</h5><span class="ybtn ybtn-small">N</span><span class="help-inline">New post</span><br><span class="ybtn ybtn-small">L</span><span class="help-inline">List</span><br><span class="ybtn ybtn-small">E</span><span class="help-inline">Edit</span><br></div><div class="span7"><h5>Site</h5><span class="ybtn ybtn-small">A</span><span class="help-inline">My Issues</span><br><span class="ybtn ybtn-small">U</span><span class="help-inline">Profile</span><br><span class="ybtn ybtn-small">F</span><span class="help-inline">User menu</span><br>__SITE_SEARCH_KEYS__<span class="help-inline">Site search</span><br><span class="ybtn ybtn-small">__CTRL_KEY__</span> + <span class="ybtn ybtn-small">ENTER</span><span class="help-inline">Submit form</span><br></div></div><div class="row-fluid mt20"><div class="span12"></div></div></div></div><p class="actrow"><button type="button" class="ybtn ybtn-info">Confirm</button></p></div></div>`;

const EXPECTED_PROJECT_POSTS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li><li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class="active"><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="post-list project-page-wrap"><div class="search-wrap underline"><form id="option_form" action="__BASE_PATH__/admin/sample/posts" method="get" class="pull-left"><input type="hidden" name="orderBy" value="updatedDate"><input type="hidden" name="orderDir" value="desc"><div class="search-bar"><input name="filter" class="textbox" type="text" placeholder="Search current project" value="release"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div><div class="board-labels"><dl class=""><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-exclusive="false"><option value="8" data-category-id="3" data-category-exclusive="false" selected="">bug</option><option value="9" data-category-id="3" data-category-exclusive="false">enhancement</option></optgroup><optgroup label="priority" data-category-id="4" data-category-exclusive="true"><option value="10" data-category-id="4" data-category-exclusive="true">high</option><option value="11" data-category-id="4" data-category-exclusive="true">low</option></optgroup></select></dd></dl></div><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" style="position:relative" title="Two Column Mode"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></form><div class="pull-right"><a href="__BASE_PATH__/admin/sample/postform" class="ybtn ybtn-success">New post</a></div></div><div class="filter-wrap board"><div class="filters"><a href="__BASE_PATH__/admin/sample/posts?pageNum=1&amp;filter=release&amp;labelIds=8&amp;orderBy=updatedDate&amp;orderDir=asc" class="filter active"><i class="ico btn-gray-arrow  down "></i>Updated</a><a href="__BASE_PATH__/admin/sample/posts?pageNum=1&amp;filter=release&amp;labelIds=8&amp;orderBy=createdDate&amp;orderDir=desc" class="filter"><i class="ico btn-gray-arrow  down "></i>Created</a><a href="__BASE_PATH__/admin/sample/posts?pageNum=1&amp;filter=release&amp;labelIds=8&amp;orderBy=numOfComments&amp;orderDir=desc" class="filter"><i class="ico btn-gray-arrow  down "></i>Comments</a></div></div><ul class="post-list-wrap notice-wrap"><li class="post-item title" href="__BASE_PATH__/admin/sample/post/2"><a href="__BASE_PATH__/admin" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="bottom" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="label label-notice">Notice</span>&nbsp;<span class="post-id">2</span><a href="__BASE_PATH__/admin/sample/post/2" class="title">Pinned notice</a></div><div class="infos"><a href="__BASE_PATH__/admin" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="bottom" title="admin">Site Admin</a><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="Jul 1, 2026">Jul 1, 2026</span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/admin/sample/post/2#comments"><span class="count-groups item-icon "><i class="yobicon-comments"></i></span><span class="count-groups item-count ">1</span></a></span></div></li></ul><ul class="post-list-wrap"><li class="post-item title" href="__BASE_PATH__/admin/sample/post/3"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="bottom" title="dev"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">3</span><a href="__BASE_PATH__/admin/sample/post/3" class="title">Release note</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="bottom" title="dev">Dev Member</a><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="Jul 2, 2026">Jul 2, 2026</span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/admin/sample/post/3#comments"><span class="count-groups item-icon "><i class="yobicon-comments"></i></span><span class="count-groups item-count ">2</span></a></span><button type="button" class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</button></div></li></ul><div class="write-btn-wrap"></div><div id="pagination"></div>${BOARD_LIST_KEYMAP}</div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

function modernizeBoardListExpected(html: string) {
  return html
    .replace(
      '<li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>',
      '<li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>',
    )
    .replace(
      '<li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>',
      '<li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>',
    )
    .replace(
      '<li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right">',
      '<li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right">',
    )
    .replace(
      '<span class="user-project-list" data-project-id="7">',
      '<span class="user-project-list" data-project-id="7" role="button" tabindex="0">',
    )
    .replaceAll(
      ' class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="bottom"',
      ' class="avatar-wrap mlarge hide-in-mobile"',
    )
    .replaceAll(
      ' class="infos-item infos-link-item" data-toggle="tooltip" data-placement="bottom"',
      ' class="infos-item infos-link-item"',
    )
    .replaceAll(
      ' class="infos-item" data-toggle="tooltip" data-placement="bottom"',
      ' class="infos-item"',
    );
}

function withProjectBoardSearchScope(
  html: string,
  options: { ownerName: string; organizationName?: string; projectName: string },
) {
  const { ownerName, organizationName, projectName } = options;
  const scopedSearchMenu = `<form action="__BASE_PATH__/${ownerName}/${projectName}/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Project</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope">This Project</button></li>${organizationName ? `<li><button type="button" data-toggle="search-scope">This Group</button></li>` : ""}<li><button type="button" data-toggle="search-scope">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form>`;

  return html
    .replace('<header class="gnb-outer">', '<header class="gnb-outer project-header">')
    .replace(
      '<form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form>',
      scopedSearchMenu,
    );
}

const EXPECTED_PROJECT_POSTS_CURRENT = modernizeBoardListExpected(
  withProjectBoardSearchScope(EXPECTED_PROJECT_POSTS, {
    ownerName: "admin",
    projectName: "sample",
  }),
);
const EXPECTED_PROJECT_POSTS_PREFIX = EXPECTED_PROJECT_POSTS_CURRENT.replace(
  '<span class="post-id">3</span><a href="__BASE_PATH__/admin/sample/post/3" class="title">Release note</a>',
  '<span class="post-id">3</span><button type="button" class="title-prefix">[P1]</button><a href="__BASE_PATH__/admin/sample/post/3" class="title">Release note</a>',
);

async function expectNoTanStackActiveAttrs(locator: Locator) {
  await expect(locator).not.toHaveAttribute("aria-current", /.+/u);
  await expect(locator).not.toHaveAttribute("data-status", /.+/u);
}

async function installRootModalBridgeGuard(page: Page, modalIds: string[]) {
  await page.evaluate((ids) => {
    type GuardedWindow = typeof window & {
      __rootModalBridgeGuard?: {
        documentClicks: string[];
        getElementById: string[];
      };
      __rootModalBridgeNativeGetElementById?: typeof Document.prototype.getElementById;
    };
    const guardedWindow = window as GuardedWindow;
    guardedWindow.__rootModalBridgeGuard = {
      documentClicks: [],
      getElementById: [],
    };
    guardedWindow.__rootModalBridgeNativeGetElementById ??= Document.prototype.getElementById;
    const nativeGetElementById = guardedWindow.__rootModalBridgeNativeGetElementById;

    Document.prototype.getElementById = function guardedGetElementById(id: string) {
      if (ids.includes(id)) {
        guardedWindow.__rootModalBridgeGuard?.getElementById.push(id);
      }
      return nativeGetElementById.call(this, id);
    };
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridgeTarget = target?.closest(
        '[data-toggle="modal"], [data-dismiss="modal"], [data-toggle="comment-delete"]',
      );
      if (bridgeTarget) {
        guardedWindow.__rootModalBridgeGuard?.documentClicks.push(
          `${bridgeTarget.tagName.toLowerCase()}:${bridgeTarget.getAttribute("data-toggle") ?? ""}:${bridgeTarget.getAttribute("data-dismiss") ?? ""}`,
        );
      }
    });
  }, modalIds);
}

async function expectRootModalBridgeUnused(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const guard = (
          window as typeof window & {
            __rootModalBridgeGuard?: {
              documentClicks: string[];
              getElementById: string[];
            };
          }
        ).__rootModalBridgeGuard;
        return guard ?? { documentClicks: [], getElementById: [] };
      }),
    )
    .toEqual({ documentClicks: [], getElementById: [] });
}

async function dispatchCancelableClick(locator: Locator) {
  return locator.evaluate((element) => {
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    return element.dispatchEvent(clickEvent);
  });
}

test("project board list keymap modal is route state owned", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);
  await page.addInitScript(() => localStorage.removeItem("useTwoColumnMode"));

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8`);
  await installRootModalBridgeGuard(page, ["helpKeys"]);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-list-keymap";
  });
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(
    page.locator('.post-list.project-page-wrap > .pull-left a[href="#helpKeys"]'),
  ).toHaveCount(0);
  const keymapButton = page.locator(
    '.post-list.project-page-wrap > .pull-left button[type="button"].ybtn.ybtn-inverse.ybtn-mini',
  );
  await expect(keymapButton).toHaveClass("ybtn ybtn-inverse ybtn-mini");
  await expect(keymapButton).toHaveText("Keyboard shortcuts");
  await expect(keymapButton).not.toHaveAttribute("data-toggle", "modal");
  await expect(keymapButton).not.toHaveAttribute("data-target", "#helpKeys");

  const beforeUrl = page.url();
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(await dispatchCancelableClick(keymapButton)).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#helpKeys")).not.toHaveClass(/hide/);
  await expect(page.locator("#helpKeys")).toHaveClass(/in/);
  await expect(page.locator("#helpKeys")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page).toHaveURL(beforeUrl);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("board-list-keymap");

  await expect(page.locator('#helpKeys [data-dismiss="modal"]')).toHaveCount(0);
  const confirmButton = page.locator("#helpKeys .actrow button.ybtn.ybtn-info");
  await expect(confirmButton).toHaveText("Confirm");
  await expect(confirmButton).not.toHaveAttribute("data-dismiss", "modal");
  expect(await dispatchCancelableClick(confirmButton)).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(beforeUrl);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("board-list-keymap");

  const routeSource = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  const keymapSource = routeSource.slice(
    routeSource.indexOf("function BoardListKeymap"),
    routeSource.indexOf("function KeymapEntry"),
  );
  expect(keymapSource).toContain("useState(false)");
  expect(keymapSource).toContain("event.stopPropagation();");
  expect(keymapSource).toContain("setIsOpen(true);");
  expect(keymapSource).toContain("setIsOpen(false);");
  expect(keymapSource).toContain('style={isOpen ? { display: "block" } : undefined}');
  expect(keymapSource).toContain('event.key === "Escape"');
  expect(keymapSource).not.toContain('data-toggle="modal"');
  expect(keymapSource).not.toContain('data-target="#helpKeys"');
  expect(keymapSource).toMatch(
    /onClick=\{\(event\) => \{[\s\S]+?event\.preventDefault\(\);[\s\S]+?event\.stopPropagation\(\);[\s\S]+?setIsOpen\(true\);/u,
  );
  expect(keymapSource).toMatch(
    /const closeModal[\s\S]+?event\.preventDefault\(\);[\s\S]+?event\.stopPropagation\(\);[\s\S]+?setIsOpen\(false\);/u,
  );
  expect(keymapSource).not.toContain('data-dismiss="modal"');
  expect(keymapSource).toContain('className="modal-backdrop fade in"');
  expect(keymapSource).toContain("onClick={closeModal}");
  expect(keymapSource).not.toContain("document.");
  expect(keymapSource).not.toContain("classList");
  expect(keymapSource).not.toContain("style.display");
  expect(keymapSource).not.toContain("dangerouslySetInnerHTML");
});

test("project board list label filter select2 marker is not React-owned DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8`);

  const labelSelect = page.locator("#option_form .board-labels #labelIds");
  await expect(labelSelect).toHaveValues(["8"]);
  await expect(labelSelect).not.toHaveAttribute("data-toggle", "select2");
  await expect(labelSelect).toHaveAttribute("id", "labelIds");
  await expect(labelSelect).toHaveAttribute("name", "labelIds");
  await expect(labelSelect).toHaveAttribute("multiple", "");
  await expect(labelSelect).not.toHaveAttribute("data-search");
  await expect(labelSelect).toHaveAttribute("data-format", "issuelabel");
  await expect(labelSelect).toHaveAttribute("data-allow-clear", "true");
  await expect(labelSelect).toHaveAttribute("data-dropdown-css-class", "issue-labels");
  await expect(labelSelect).toHaveAttribute(
    "data-container-css-class",
    "issue-labels bordered fullsize",
  );
  await expect(labelSelect).toHaveAttribute("data-placeholder", "Select label");
  await expect(labelSelect).toHaveClass("hide");
  await expect(labelSelect.locator("option")).toHaveText(["", "bug", "enhancement", "high", "low"]);
  await expect(labelSelect.locator('optgroup[label="type"]')).toHaveAttribute(
    "data-category-id",
    "3",
  );
  await expect(labelSelect.locator('optgroup[label="type"]')).toHaveAttribute(
    "data-category-exclusive",
    "false",
  );
  await expect(labelSelect.locator('optgroup[label="priority"]')).toHaveAttribute(
    "data-category-id",
    "4",
  );
  await expect(labelSelect.locator('optgroup[label="priority"]')).toHaveAttribute(
    "data-category-exclusive",
    "true",
  );

  const routeSource = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  const labelsSource = routeSource.slice(
    routeSource.indexOf("function BoardLabels"),
    routeSource.indexOf("function groupLabels"),
  );
  expect(labelsSource).toContain('id="labelIds"');
  expect(labelsSource).toContain('name="labelIds"');
  expect(labelsSource).not.toContain('data-search="labelIds"');
  expect(labelsSource).toContain('data-format="issuelabel"');
  expect(labelsSource).toContain('data-container-css-class="issue-labels bordered fullsize"');
  expect(labelsSource).toContain("onChange={(event) => event.currentTarget.form?.requestSubmit()}");
  expect(labelsSource).not.toContain('data-toggle="select2"');
  expect(labelsSource).not.toContain("document.");
  expect(labelsSource).not.toContain("classList");
  expect(labelsSource).not.toContain("dangerouslySetInnerHTML");

  await labelSelect.evaluate((select) => {
    for (const option of (select as HTMLSelectElement).options) {
      option.selected = option.value === "9";
    }
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/posts?orderBy=updatedDate&orderDir=desc&filter=release&labelIds=9`,
  );
});

test("project board list tooltip markers are not React-owned DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8`);

  await expect(
    page.locator('.page-wrap-outer .post-list-wrap [data-toggle="tooltip"]'),
  ).toHaveCount(0);
  await expect(page.locator(".page-wrap-outer .post-list-wrap [data-placement]")).toHaveCount(0);

  const noticeRow = page.locator(".notice-wrap .post-item").first();
  await expect(noticeRow).toHaveAttribute("href", `${basePath}/admin/sample/post/2`);
  await expect(noticeRow.locator(".avatar-wrap.mlarge")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(noticeRow.locator(".avatar-wrap.mlarge")).toHaveAttribute("title", "admin");
  await expect(noticeRow.locator(".infos-link-item")).toHaveAttribute("href", `${basePath}/admin`);
  await expect(noticeRow.locator(".infos-link-item")).toHaveAttribute("title", "admin");
  await expect(noticeRow.locator(".infos > .infos-item").nth(1)).toHaveAttribute(
    "title",
    "Jul 1, 2026",
  );
  await expect(noticeRow.locator(".item-count-groups a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/post/2#comments`,
  );
  await expect(noticeRow.locator(".item-count-groups .item-count")).toHaveText("1");

  const projectRow = page.locator(".post-list-wrap:not(.notice-wrap) .post-item").first();
  await expect(projectRow).toHaveAttribute("href", `${basePath}/admin/sample/post/3`);
  await expect(projectRow.locator(".avatar-wrap.mlarge")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(projectRow.locator(".avatar-wrap.mlarge")).toHaveAttribute("title", "dev");
  await expect(projectRow.locator(".infos-link-item")).toHaveAttribute("href", `${basePath}/dev`);
  await expect(projectRow.locator(".infos-link-item")).toHaveAttribute("title", "dev");
  await expect(projectRow.locator(".infos > .infos-item").nth(1)).toHaveAttribute(
    "title",
    "Jul 2, 2026",
  );
  await expect(projectRow.locator(".item-count-groups a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/post/3#comments`,
  );
  await expect(projectRow.locator(".item-count-groups .item-count")).toHaveText("2");

  const routeSource = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  const projectBoardPostSource = routeSource.slice(
    routeSource.indexOf("function ProjectBoardPost"),
    routeSource.indexOf("function splitHeaderWordsInBrackets"),
  );
  expect(projectBoardPostSource).not.toContain('data-toggle="tooltip"');
  expect(projectBoardPostSource).not.toContain("data-placement");
  expect(projectBoardPostSource).toContain("title={post.authorLoginId}");
  expect(projectBoardPostSource).toContain("title={post.createdLabel}");
});

const EMPTY_CHILD_COMMENT_FORM =
  '<div class="add-a-comment">Reply</div><div class="subcomment-media-body"><div class="child-comments"></div><div class="child-comment-input-form"><form action="__BASE_PATH__/admin/sample/post/3/comments" method="post" enctype="multipart/form-data"><input class="parentCommentId" type="hidden" name="parentCommentId" value="21"><div class="oneline-comment-box"><textarea class="editorSeries" name="contents" markdown="true" rows="1" placeholder="Reply (__CTRL_KEY__ + ENTER)"></textarea><button type="submit" class="ybtn ybtn-success">OK</button></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></form></div></div>';
const POPULATED_CHILD_COMMENT_BODY =
  '<div class="subcomment-media-body"><div class="child-comments"><div class="one-line-comment"><div class="contents"><blockquote><p><a href="__BASE_PATH__/dev" class="no-text-decoration user-link">@Dev Member</a> references <a href="__BASE_PATH__/admin/sample/issue/11" class="issueLink">#11.Rich child Markdown<span class="issue-state open">Open</span></a>, <a href="__BASE_PATH__/admin/sample/issue/12" class="issueLink">#12.Closed child Markdown<span class="issue-state closed">Closed</span></a>, <a href="__BASE_PATH__/organizations/weblabs"><span class="org-link">@Team</span></a>, and <a href="__BASE_PATH__/other/cross"><span class="project-link">@other/cross</span></a>.</p></blockquote><p>Nested <strong>reply</strong>- <a href="__BASE_PATH__/admin" class="usf-group"><strong>Site Admin</strong></a> <a href="__BASE_PATH__/admin/sample/post/3#comment-22" class="ago" title="Jul 4, 2026">Jul 4, 2026</a><button type="button" class="btn-transparent deleteButtonX" title="Delete comment">x</button></p></div></div></div><div class="child-comment-input-form"><form action="__BASE_PATH__/admin/sample/post/3/comments" method="post" enctype="multipart/form-data"><input class="parentCommentId" type="hidden" name="parentCommentId" value="21"><div class="oneline-comment-box"><textarea class="editorSeries" name="contents" markdown="true" rows="1" placeholder="Reply (__CTRL_KEY__ + ENTER)"></textarea><button type="submit" class="ybtn ybtn-success">OK</button></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></form></div></div>';
const POPULATED_CHILD_COMMENT_FORM = `<div class="add-a-comment">Reply</div>${POPULATED_CHILD_COMMENT_BODY}`;
const BOARD_COMMENT_FORM = `<form id="comment-form" action="__BASE_PATH__/admin/sample/post/3/comments" method="post" enctype="multipart/form-data"><div class="write-comment-box"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible">${LEGACY_MARKDOWN_HELP}<div id="edit-contents" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="comment-body" markdown="true" id="editor-contents-contents"></textarea></div></div><div id="preview-contents" class="tab-pane"><div class="markdown-preview markdown-wrap comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-wrap content-footer" data-resource-type="NONISSUE_COMMENT" id="upload"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><div class="write-comment-wrap"><div class="right-txt"><button type="button" class="ybtn hidden" id="dynamic-comment-btn"></button><button type="submit" class="ybtn ybtn-success">Add a comment</button></div></div></div></form>`;
const BOARD_EDITABLE_LABEL_SELECTOR =
  '<dl class=""><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false">bug</option><option value="9" data-category-id="3" data-category-is-exclusive="false">enhancement</option></optgroup><optgroup label="priority" data-category-id="4" data-category-is-exclusive="true"><option value="10" data-category-id="4" data-category-is-exclusive="true">high</option><option value="11" data-category-id="4" data-category-is-exclusive="true">low</option></optgroup></select></dd></dl>';
const POSTING_HISTORY =
  '<div class="posting-history"><button type="button">Change history</button><div id="-yona-posting-history" class="modal hide"><div class="modal-header"><button type="button" class="close">×</button><h5 class="nm">Change history</h5></div><div class="modal-body"><p>Edited <strong>body</strong></p></div><div class="modal-footer"><button class="ybtn ybtn-info ybtn-small">Confirm</button></div></div></div>';
const EXPECTED_PROJECT_POST_DETAIL_RAW = `
<div class="page-wrap-outer"><div class="project-page-wrap board-view"><div class="board-header issue"><div class="pull-right mr10 mt10 hide-in-mobile"><div class="date" title="Jul 2, 2026">Jul 2, 2026</div></div><div class="title"><strong class="board-id">#3</strong> Release note<div class="pull-right hide show-in-mobile" style="font-size:0.7em"><span class="date" title="Jul 2, 2026">Jul 2, 2026</span></div></div></div><div class="board-body row-fluid"><div class="span9 span-left-pane"><div class="author-info"><a href="__BASE_PATH__/dev" class="usf-group"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" width="20" height="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></a>${POSTING_HISTORY}</div><div id="post-3" class="hide"><form action="__BASE_PATH__/api/v1/projects/admin/sample/posts/3/content"><textarea>Post **markdown**</textarea></form></div><div id="post-body-3"><div class="tasklist"><div class="task-title">Tasks<span class="done-counter"></span></div><div class="task-progress"><div class="bar red" style="width:0px" title="Tasklist"></div></div></div><div class="content markdown-wrap" data-allowed-update="true"><p>Post <strong>markdown</strong></p></div></div><div class="attachments" id="attachments" data-attachments="[]"></div><div class="board-actrow right-txt"><div class="pull-left"><div><button id="watch-button" type="button" class="ybtn " data-placement="top" title="If subscribe, notify all new comments" data-watching="false">Watch</button></div></div><span class=""><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" title="Edit"><i class="yobicon-edit-2"></i></button><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" title="Delete"><i class="yobicon-trash"></i></button></span></div><div class="watcher-list"></div><div id="comments" class="board-comment-wrap"><div id="timeline"><div class="timeline-list"><div class="comment-header"><i class="yobicon-comments"></i> <strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"></ul></div></div>${BOARD_COMMENT_FORM}</div></div><div class="span3 span-right-pane mb20"><div class="issue-info board-labels"><dl><dd class="project-btn-item"><a href="__BASE_PATH__/admin/sample/postform" class="ybtn ybtn-success">New post</a></dd></dl>${BOARD_EDITABLE_LABEL_SELECTOR}<div class="right-menu-icons"><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml10 pt5px" title="Edit"><i class="yobicon-edit-2"></i></button><button type="button" class="icon btn-transparent-with-fontsize-lineheight ml6" title="Delete"><i class="yobicon-trash"></i></button></div></div></div></div><div class="board-footer">${BOARD_DETAIL_KEYMAP}</div></div><div id="deleteConfirm" class="modal hide fade"><div class="modal-header"><button type="button" class="close">×</button><h3>Delete issue</h3></div><div class="modal-body"><p>Once you delete the post, you won't be able to recover it. Do you still want to delete this post?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn">No</button></div></div><div id="comment-delete-modal" class="modal hide fade"><div class="modal-header"><button type="button" class="close">×</button><h3>Delete comment</h3></div><div class="modal-body"><p>Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?</p></div><div class="modal-footer"><button id="comment-delete-confirm" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn">No</button></div></div></div>
`;

const EXPECTED_PROJECT_POST_DETAIL = EXPECTED_PROJECT_POST_DETAIL_RAW.replace(
  'src="/assets/images/default-avatar-32.png" width="20" height="20"',
  'src="__BASE_PATH__/assets/images/default-avatar-32.png" width="20" height="20"',
).replaceAll(" ml10 pt5px", "");

const EXPECTED_PROJECT_POST_DETAIL_WITH_COMMENT = EXPECTED_PROJECT_POST_DETAIL.replace(
  '<div class="comment-header"><i class="yobicon-comments"></i> <strong>Comment</strong> <strong class="num">0</strong></div><hr class="nm"><ul class="comments"></ul>',
  `<div class="comment-header"><i class="yobicon-comments"></i> <strong>Comment</strong> <strong class="num">1</strong></div><hr class="nm"><ul class="comments"><li class="comment" id="comment-21"><div class="comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="media-body"><div class="meta-info"><span class="comment_author"><span class="resp-comment-avatar"><a href="__BASE_PATH__/dev" class="avatar-wrap"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></span><a href="__BASE_PATH__/dev"><strong>Dev Member</strong></a></span><span class="ago-date"><a href="__BASE_PATH__/admin/sample/post/3#comment-21" class="ago" title="Jul 3, 2026">Jul 3, 2026</a><a href="__BASE_PATH__/admin/sample/post/3#comment-21" class="share-link" style="display:none">[Link]</a></span><span class="act-row"><button type="button" class="btn-transparent ml10" data-comment-id="21" title="Edit comment"><i class="yobicon-edit-2"></i></button><button type="button" class="btn-transparent ml6" title="Delete comment"><i class="yobicon-trash"></i></button></span></div><div id="comment-body-21"><div class="tasklist"><div class="task-title">Tasks<span class="done-counter"></span></div><div class="task-progress"><div class="bar red" style="width:0px" title="Tasklist"></div></div></div><div class="comment-body markdown-wrap" data-allowed-update="true" data-via-email="false"><p>First <strong>comment</strong></p></div><div class="attachments" data-attachments="[]"></div></div></div>${EMPTY_CHILD_COMMENT_FORM}</li></ul>`,
)
  .replaceAll(
    'src="/assets/images/default-avatar-32.png" width="32" height="32"',
    'src="__BASE_PATH__/legacy-assets/images/default-avatar-128.png" width="32" height="32"',
  )
  .replace('class="btn-transparent ml10"', 'class="btn-transparent"');

const COMMENT_UPDATE_FORM = `<div id="comment-editform-21" class="comment-update-form"><form action="__BASE_PATH__/admin/sample/post/3/comments/21" method="post" enctype="multipart/form-data"><input type="hidden" name="id" value="21"><div class="write-comment-box"><div class="write-comment-wrap"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow:visible">${LEGACY_MARKDOWN_HELP}<div id="edit-21" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="update-comment-body" markdown="true" id="editor-contents-21">First **comment**</textarea></div></div><div id="preview-21" class="tab-pane"><div class="markdown-preview markdown-wrap update-comment-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div><div class="right-txt comment-update-button upload-button-line"><span class="file-upload"><label for="upload-21" class="file-upload__label ybtn">File upload</label><input id="upload-21" class="file-upload__input" type="file" name="filePath" multiple=""></span><button type="button" class="ybtn ybtn-cancel" data-comment-id="21">Cancel</button><button type="submit" class="ybtn ybtn-info">Save</button></div></div><input type="hidden" name="temporaryUploadFiles" class="temporaryUploadFiles" value=""><div class="preview-21"></div><div class="attachment-files"></div><div id="upload-21" data-resourcetype="NONISSUE_COMMENT" data-resourceid="21"></div></div></form></div>`;

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
    .replace(EMPTY_CHILD_COMMENT_FORM, POPULATED_CHILD_COMMENT_FORM);

function expectedProjectPostsEmpty() {
  const listStart = EXPECTED_PROJECT_POSTS_CURRENT.indexOf('<div class="filter-wrap board">');
  const listEnd = EXPECTED_PROJECT_POSTS_CURRENT.indexOf(
    '<div class="write-btn-wrap"></div><div id="pagination"></div>',
  );
  return `${EXPECTED_PROJECT_POSTS_CURRENT.slice(0, listStart).replace(
    'value="release"',
    'value="empty"',
  )}<div class="error-wrap"><i class="ico ico-err1"></i><p>No post has been added.</p></div>${EXPECTED_PROJECT_POSTS_CURRENT.slice(
    listEnd,
  )}`;
}

test("project board list matches legacy board/list.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8`);
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();
  await expect(page).toHaveTitle("sample - Board - admin/sample");
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(page.locator('#option_form input[name="filter"]')).toHaveAttribute(
    "placeholder",
    "Search current project",
  );
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");
  await expect(page.locator(".project-menu-gruop li.active")).toHaveCount(1);
  expect(await projectShellLinkActiveMarkers(page)).toEqual([]);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(2);
  const labelSelect = page.locator(".board-labels #labelIds");
  await expect(labelSelect).toHaveValues(["8"]);
  await expect(labelSelect).not.toHaveAttribute("data-toggle", "select2");
  await expect(labelSelect).toHaveAttribute("name", "labelIds");
  await expect(labelSelect).toHaveAttribute("multiple", "");
  await expect(labelSelect).not.toHaveAttribute("data-search");
  await expect(labelSelect).toHaveAttribute("data-format", "issuelabel");
  await expect(labelSelect).toHaveAttribute("data-allow-clear", "true");
  await expect(labelSelect).toHaveAttribute("data-dropdown-css-class", "issue-labels");
  await expect(labelSelect).toHaveAttribute(
    "data-container-css-class",
    "issue-labels bordered fullsize",
  );
  await expect(labelSelect).toHaveAttribute("data-placeholder", "Select label");
  await expect(labelSelect).toHaveClass("hide");
  await expect(labelSelect.locator("option")).toHaveText(["", "bug", "enhancement", "high", "low"]);
  await expect(labelSelect.locator('optgroup[label="type"]')).toHaveAttribute(
    "data-category-id",
    "3",
  );
  await expect(labelSelect.locator('optgroup[label="type"]')).toHaveAttribute(
    "data-category-exclusive",
    "false",
  );
  await expect(labelSelect.locator('optgroup[label="priority"]')).toHaveAttribute(
    "data-category-id",
    "4",
  );
  await expect(labelSelect.locator('optgroup[label="priority"]')).toHaveAttribute(
    "data-category-exclusive",
    "true",
  );
  await expect(
    page.locator(
      '.post-list-wrap:not(.notice-wrap) button.issue-label[type="button"][data-label-id="8"]',
    ),
  ).toHaveText("bug");
  await expect(
    page.locator('.post-list-wrap:not(.notice-wrap) a.issue-label[href="#"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('.post-list.project-page-wrap > .pull-left a[href="#helpKeys"]'),
  ).toHaveCount(0);
  const keymapButton = page.locator(
    '.post-list.project-page-wrap > .pull-left button[type="button"].ybtn.ybtn-inverse.ybtn-mini',
  );
  await expect(keymapButton).toHaveText("Keyboard shortcuts");
  await expect(keymapButton).toHaveClass("ybtn ybtn-inverse ybtn-mini");
  await expect(keymapButton).not.toHaveAttribute("data-toggle", "modal");
  await expect(keymapButton).not.toHaveAttribute("data-target", "#helpKeys");
  expect(await issueLabelColorMetrics(page)).toEqual({
    backgroundColor: "rgb(81, 170, 204)",
    boxShadow: "rgb(81, 170, 204) 2px 0px 0px 0px inset",
    className: "label issue-label list-label active",
    color: "rgb(255, 255, 255)",
    dataCategoryId: "3",
    dataLabelId: "8",
    hasInlineBackgroundStyle: true,
    hasInlineColorStyle: true,
    href: null,
    tagName: "button",
    text: "bug",
    type: "button",
  });
  expect(await boardTwoColumnMetrics(page)).toEqual({
    borderColor: "rgb(3, 175, 255)",
    borderPadding: "3px 3px 0px",
    borderRadius: "3px",
    borderTextColor: "rgb(3, 169, 244)",
    checkboxId: "two-column-mode",
    checkboxMargin: "4px 4px 0px 2px",
    dataContent: null,
    display: "inline-block",
    followsLabels: true,
    lineHeight: "37px",
    marginLeft: "10px",
    text: "Column View",
    textLineHeight: "20px",
    textPadding: "0px 4px 0px 0px",
    title: "Two Column Mode",
    wrapperClass: "two-column-icon mr10 hide-in-mobile",
    wrapperPosition: "relative",
  });
  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_POSTS_CURRENT.replaceAll("__BASE_PATH__", basePath),
    ),
  );

  await labelSelect.evaluate((select) => {
    for (const option of (select as HTMLSelectElement).options) {
      option.selected = option.value === "9";
    }
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/posts?orderBy=updatedDate&orderDir=desc&filter=release&labelIds=9`,
  );

  const twoColumnWrapper = page.locator("#option_form #two-column-mode-checkbox");
  const twoColumnToggle = page.locator("#two-column-mode");
  await expect(twoColumnWrapper).not.toHaveAttribute("data-content", /.+/u);
  await expect(twoColumnWrapper.locator(".popover.top")).toHaveCount(0);
  await expect(twoColumnToggle).not.toBeChecked();
  await twoColumnToggle.click();
  await expect(twoColumnToggle).toBeChecked();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("true");
  await page.reload();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await page.locator("#two-column-mode").click();
  await expect(page.locator("#two-column-mode")).not.toBeChecked();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("false");
  await page.locator("#option_form #two-column-mode-checkbox").hover();
  const hoverPopover = page.locator("#option_form #two-column-mode-checkbox .popover.top");
  await expect(hoverPopover).toBeVisible();
  await expect(hoverPopover.locator(".popover-title")).toHaveText("Two Column Mode");
  await expect(hoverPopover.locator(".popover-content")).toHaveText(
    "Splits list and body into columns respectively",
  );
  const hoverMetrics = await boardTwoColumnPopoverMetrics(page);
  expect(hoverMetrics).toMatchObject({
    className: "popover top",
    contentText: "Splits list and body into columns respectively",
    placement: "top",
    titleText: "Two Column Mode",
  });
  expect(hoverMetrics.isAboveWrapper).toBe(true);
  await page.locator("body").hover({ position: { x: 10, y: 10 } });
  await expect(hoverPopover).toHaveCount(0);
  await page.locator('#option_form input[name="filter"]').focus();
  await page.locator("#two-column-mode").focus();
  const focusPopover = page.locator("#option_form #two-column-mode-checkbox .popover.top");
  await expect(focusPopover).toBeVisible();
  await page.locator('#option_form input[name="filter"]').focus();
  await expect(focusPopover).toHaveCount(0);

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-list-keymap";
  });
  const beforeUrl = page.url();
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await keymapButton.click();
  await expect(page.locator("#helpKeys")).not.toHaveClass(/hide/);
  await expect(page.locator("#helpKeys")).toHaveClass(/in/);
  await expect(page.locator("#helpKeys")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  expect(page.url()).toBe(beforeUrl);
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-list-keymap");
  await expect(page.locator('#helpKeys [data-dismiss="modal"]')).toHaveCount(0);
  const confirmButton = page.locator("#helpKeys .actrow button.ybtn.ybtn-info");
  await expect(confirmButton).toHaveText("Confirm");
  await expect(confirmButton).not.toHaveAttribute("data-dismiss", "modal");
  await confirmButton.click();
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await keymapButton.click();
  await expect(page.locator("#helpKeys")).toHaveCSS("display", "block");
  await page.locator(".modal-backdrop.in").click({ position: { x: 1, y: 1 } });
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await keymapButton.click();
  await page.locator("#helpKeys").press("Escape");
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  const routeSource = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  expect(routeSource).toContain(
    '<title>{`${projectName} - ${t("menu.board")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(routeSource).toContain('placeholder={t("project.searchPlaceholder")}');
  expect(routeSource).not.toContain('placeholder={t("title.search")}');
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain('globalThis["document"]');
  const twoColumnSource = routeSource.slice(
    routeSource.indexOf("function TwoColumnModeCheckbox"),
    routeSource.indexOf("function BoardListKeymap"),
  );
  expect(twoColumnSource).toContain("useState(false)");
  expect(twoColumnSource).toContain('localStorage.getItem("useTwoColumnMode") === "true"');
  expect(twoColumnSource).toContain('localStorage.setItem("useTwoColumnMode", String(checked))');
  expect(twoColumnSource).toContain("setTimeout(() => setShowPopover(true), 100)");
  expect(twoColumnSource).toContain("setTimeout(() => setShowPopover(false), 100)");
  expect(twoColumnSource).toContain('className="popover top"');
  expect(twoColumnSource).toContain('role="tooltip"');
  expect(twoColumnSource).not.toContain("data-content=");
  expect(twoColumnSource).not.toContain("document.");
  expect(twoColumnSource).not.toContain("classList");
  expect(twoColumnSource).not.toContain("dangerouslySetInnerHTML");
  const keymapSource = routeSource.slice(
    routeSource.indexOf("function BoardListKeymap"),
    routeSource.indexOf("function KeymapEntry"),
  );
  expect(keymapSource).toContain("useState(false)");
  expect(keymapSource).toContain("event.stopPropagation();");
  expect(keymapSource).toContain("setIsOpen(true);");
  expect(keymapSource).toContain("setIsOpen(false);");
  expect(keymapSource).toContain('style={isOpen ? { display: "block" } : undefined}');
  expect(keymapSource).toContain('event.key === "Escape"');
  expect(keymapSource).not.toContain('data-dismiss="modal"');
  expect(keymapSource).toContain('className="modal-backdrop fade in"');
  expect(keymapSource).toContain("onClick={closeModal}");
  expect(keymapSource).not.toContain("document.");
  expect(keymapSource).not.toContain("classList");
  expect(keymapSource).not.toContain("style.display");
  expect(keymapSource).not.toContain("dangerouslySetInnerHTML");
});

test("project board list renders protected org-owned localhost shell state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "default", {
    __ownerName: "weblabs",
    __projectName: "portal",
    __projectOverrides: {
      backgroundImageUrl: "/assets/images/project_default.jpg",
      id: 2,
      isProtected: true,
      organizationName: "weblabs",
    },
  });

  await page.goto(`${basePath}/weblabs/portal/posts`);
  await expect(page).toHaveTitle("portal - Board - weblabs/portal");

  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect
    .poll(() =>
      page
        .locator("[data-stylex-owner=global-gnb-search-scope-item] > button")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            dataAction: element.getAttribute("data-action"),
            text: element.textContent?.trim() ?? "",
          })),
        ),
    )
    .toEqual([
      { dataAction: null, text: "This Project" },
      { dataAction: null, text: "This Group" },
      { dataAction: null, text: "All Projects" },
    ]);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button").nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");

  expect(await protectedProjectPostsShellMetrics(page)).toEqual({
    boardTopAtOrBelowMenu: true,
    gnbClassName: "gnb-outer project-header",
    scopeBottomWithinNavbar: true,
    scopeTopWithinNavbar: true,
    searchBottomWithinNavbar: true,
    searchLeftWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
  });
});

test("project board shared shell anchors keep active markers on li only", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8`);
  await expect(page.locator(".project-menu-gruop li.active")).toHaveCount(1);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");
  expect(await projectShellLinkActiveMarkers(page)).toEqual([]);
});

test("project board list row internal links are router-owned", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8`);
  const row = page.locator(".post-list-wrap:not(.notice-wrap) .post-item").first();
  await expect(row).toHaveAttribute("href", `${basePath}/admin/sample/post/3`);
  await expect(row.locator(".avatar-wrap.mlarge")).toHaveAttribute("href", `${basePath}/dev`);
  await expect(row.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/post/3`,
  );
  await expect(row.locator(".infos-link-item")).toHaveAttribute("href", `${basePath}/dev`);
  await expect(row.locator(".item-count-groups a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/post/3#comments`,
  );
  await expectNoTanStackActiveAttrs(row.locator(".avatar-wrap.mlarge"));
  await expectNoTanStackActiveAttrs(row.locator(".title-wrap .title"));
  await expectNoTanStackActiveAttrs(row.locator(".infos-link-item"));
  await expectNoTanStackActiveAttrs(row.locator(".item-count-groups a"));

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-row-title";
  });
  await row.locator(".title-wrap .title").click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3`);
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-row-title");

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8`);
  const freshRow = page.locator(".post-list-wrap:not(.notice-wrap) .post-item").first();
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-row-comments";
  });
  await freshRow.locator(".item-count-groups a").click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3#comments`);
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-row-comments");

  const routeSource = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  expect(routeSource).not.toContain('declare module "react"');
  expect(routeSource).not.toContain("interface LiHTMLAttributes");
  expect(routeSource).toContain(
    "type LegacyPostItemAttrs = HTMLAttributes<HTMLLIElement> & { href: string };",
  );
  const rowSource = routeSource.slice(
    routeSource.indexOf("function ProjectBoardPost"),
    routeSource.indexOf("function LegacyTitlePrefixButton"),
  );
  expect(rowSource).toContain("const postHref");
  expect(rowSource).toContain("const legacyPostItemAttrs");
  expect(rowSource).toContain("href: postHref");
  expect(rowSource).toContain("satisfies LegacyPostItemAttrs");
  expect(rowSource).toContain("<li {...legacyPostItemAttrs}>");
  expect(rowSource).not.toContain("legacyHref");
  expect(rowSource).not.toContain("as unknown as LiHTMLAttributes<HTMLLIElement>");
  expect(rowSource).not.toContain("const authorHref");
  expect(rowSource).not.toContain("<a\n        href={authorHref}");
  expect(rowSource).not.toContain('<a href={postHref} className="title">');
  expect(rowSource).not.toContain("`${postHref}#comments`");
  expect(rowSource).toContain("<Link");
  expect(rowSource).toContain('hash="comments"');
  expect(rowSource).toContain("activeProps={legacyRouteLocalActiveProps}");
});

test("project board list top navigation and filters are router-owned", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8`);

  const newPost = page.locator(".search-wrap .pull-right .ybtn-success");
  await expect(newPost).toHaveAttribute("href", `${basePath}/admin/sample/postform`);
  await expect(newPost).toHaveText("New post");
  await expectNoTanStackActiveAttrs(newPost);

  const labelEdit = page.locator(".board-labels .label-edit");
  await expect(labelEdit).toHaveAttribute("href", `${basePath}/admin/sample/issue/labelsform`);
  await expect(labelEdit).toHaveAttribute("target", "_blank");
  await expect(labelEdit).toHaveText("[Edit]");
  await expectNoTanStackActiveAttrs(labelEdit);

  await expect(page.locator(".filter-wrap.board .filters .filter")).toHaveCount(3);
  const filterLinks = page.locator(".filter-wrap.board .filters .filter");
  await expect(filterLinks.nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/posts?pageNum=1&filter=release&labelIds=8&orderBy=updatedDate&orderDir=asc`,
  );
  await expect(filterLinks.nth(0)).toHaveClass("filter active");
  await expect(filterLinks.nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/posts?pageNum=1&filter=release&labelIds=8&orderBy=createdDate&orderDir=desc`,
  );
  await expect(filterLinks.nth(2)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/posts?pageNum=1&filter=release&labelIds=8&orderBy=numOfComments&orderDir=desc`,
  );
  for (const filterLink of await filterLinks.all()) {
    await expectNoTanStackActiveAttrs(filterLink);
  }

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-filter";
  });
  await page.locator(".filter-wrap.board .filters .filter").nth(1).click();
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/posts?pageNum=1&filter=release&labelIds=8&orderBy=createdDate&orderDir=desc`,
  );
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-filter");

  const routeSource = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  const bodySource = routeSource.slice(
    routeSource.indexOf("function ProjectPostsBody"),
    routeSource.indexOf("function BoardLabels"),
  );
  const labelsSource = routeSource.slice(
    routeSource.indexOf("function BoardLabels"),
    routeSource.indexOf("function groupLabels"),
  );
  const filtersSource = routeSource.slice(
    routeSource.indexOf("function BoardFilters"),
    routeSource.indexOf("function ProjectBoardPost"),
  );
  expect(bodySource).not.toContain("<a\n              href=");
  expect(labelsSource).not.toContain("<a\n            href=");
  expect(filtersSource).not.toContain("<a\n              href=");
  expect(bodySource).toContain("<Link");
  expect(labelsSource).toContain("<Link");
  expect(labelsSource).toContain('id="labelIds"');
  expect(labelsSource).toContain('name="labelIds"');
  expect(labelsSource).not.toContain('data-search="labelIds"');
  expect(labelsSource).toContain('data-format="issuelabel"');
  expect(labelsSource).toContain('data-container-css-class="issue-labels bordered fullsize"');
  expect(labelsSource).toContain("onChange={(event) => event.currentTarget.form?.requestSubmit()}");
  expect(labelsSource).not.toContain('data-toggle="select2"');
  expect(filtersSource).toContain("<Link");
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
});

test("project board list pagination matches legacy yobi.Pagination behavior", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "paged");

  await page.goto(
    `${basePath}/admin/sample/posts?pageNum=2&filter=release&labelIds=8&orderBy=createdDate&orderDir=asc`,
  );

  const routeSource = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  const styleSource = readFileSync("src/routes/$ownerName/$projectName/-posts.stylex.ts", "utf8");
  const boardScala = readFileSync("../yona-original/app/views/board/list.scala.html", "utf8");
  const projectScala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const spritesLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_sprites.less",
    "utf8",
  );
  expect(boardScala).toContain('<div id="pagination">');
  expect(projectScala).toContain('<div id="pagination"></div>');
  expect(commonLess).toContain(".page-navigation-wrap {");
  expect(commonLess).toContain(".page-nums {");
  expect(commonLess).toContain(".input-mini {");
  expect(pageLess).toContain(".page-nums {\n    margin-left: -120px !important;");
  expect(responsiveLess).toContain(".page-nums {\n    margin-left: 0;");
  expect(spritesLess).toContain(".btn-pg-prev {");
  expect(spritesLess).toContain(".btn-pg-next {");
  for (const owner of [
    "project-posts-pagination",
    "project-posts-pagination-page-nums",
    "project-posts-pagination-prev-page",
    "project-posts-pagination-prev-icon",
    "project-posts-pagination-prev-label",
    "project-posts-pagination-input-page",
    "project-posts-pagination-input",
    "project-posts-pagination-delimiter",
    "project-posts-pagination-total",
    "project-posts-pagination-next-page",
    "project-posts-pagination-next-icon",
    "project-posts-pagination-next-label",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const declaration of [
    "paginationWrap",
    "paginationPageNums",
    "paginationPageNum",
    "paginationIconPageNum",
    "paginationInput",
    "paginationNoSpinner",
    "paginationDelimiter",
    "paginationIcon",
    "paginationPrev",
    "paginationPrevOff",
    "paginationNext",
    "paginationNextOff",
  ]) {
    expect(styleSource).toContain(`${declaration}:`);
  }

  const pagination = page.locator("#pagination");
  await expect(pagination).toHaveClass(/page-navigation-wrap/u);
  await expect(pagination.locator("> ul.page-nums")).toHaveCount(1);
  await expect(pagination.locator("> ul.page-nums > li")).toHaveCount(5);
  await expect(pagination.locator("li.page-num.ikon").first()).toContainText("Previous page");
  await expect(pagination.locator("li.page-num.ikon").last()).toContainText("Next page");
  await expect(pagination.locator("li.page-num.delimiter")).toHaveText("/");
  await expect(pagination.locator("li.page-num").nth(3)).toHaveText("3");

  const input = pagination.locator('input[name="pageNum"]');
  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveAttribute("pattern", "[0-9]*");
  await expect(input).toHaveClass(/input-mini/u);
  await expect(input).toHaveClass(/nospinner/u);
  await expect(input).toHaveAttribute("min", "1");
  await expect(input).toHaveAttribute("max", "3");
  await expect(input).toHaveValue("2");
  await expect(
    pagination.locator('[data-stylex-owner="project-posts-pagination-prev-icon"]'),
  ).toHaveCSS("width", "6px");
  await expect(
    pagination.locator('[data-stylex-owner="project-posts-pagination-prev-icon"]'),
  ).toHaveCSS("height", "9px");
  await expect(
    pagination.locator('[data-stylex-owner="project-posts-pagination-next-icon"]'),
  ).toHaveCSS("width", "6px");
  await expect(
    pagination.locator('[data-stylex-owner="project-posts-pagination-next-icon"]'),
  ).toHaveCSS("height", "9px");
  await expect(input).toHaveCSS("width", "30px");

  const desktopMetrics = await pagination.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const pageNums = element.querySelector(".page-nums")!.getBoundingClientRect();
    return {
      pageNumsInside: pageNums.left >= rect.left && pageNums.right <= rect.right,
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      pageNumsMarginLeft: getComputedStyle(element.querySelector(".page-nums")!).marginLeft,
      inputBorder: getComputedStyle(element.querySelector("input")!).borderTopWidth,
    };
  });
  expect(desktopMetrics).toEqual({
    pageNumsInside: true,
    noOverflow: true,
    pageNumsMarginLeft: "-120px",
    inputBorder: "1px",
  });
  await input.hover();
  await expect(input).toHaveCSS("border-top-color", "rgb(243, 108, 34)");
  await input.focus();
  await expect(input).toHaveCSS("border-top-color", "rgb(243, 108, 34)");

  const screenshotDirectory = resolve(process.cwd(), "output/playwright/batch-823");
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "board-pagination-desktop.png"),
  });

  await expect(pagination.locator("li.page-num.ikon").first().locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/posts?pageNum=1&filter=release&labelIds=8&orderBy=createdDate&orderDir=asc`,
  );
  await expect(pagination.locator("li.page-num.ikon").last().locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/posts?pageNum=3&filter=release&labelIds=8&orderBy=createdDate&orderDir=asc`,
  );
  await expectNoTanStackActiveAttrs(pagination.locator("li.page-num.ikon").first().locator("a"));
  await expectNoTanStackActiveAttrs(pagination.locator("li.page-num.ikon").last().locator("a"));

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-pagination-next";
  });
  await pagination.locator("li.page-num.ikon").last().locator("a").click();
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/posts?pageNum=3&filter=release&labelIds=8&orderBy=createdDate&orderDir=asc`,
  );
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-pagination-next");

  const lastPagePagination = page.locator("#pagination");
  await expect(lastPagePagination.locator('input[name="pageNum"]')).toHaveValue("3");
  await expect(lastPagePagination.locator("li.page-num.ikon").last().locator("a")).toHaveCount(0);
  await expect(lastPagePagination.locator("li.page-num.ikon").last()).toContainText("Next page");
  await expect(lastPagePagination.locator("li.page-num.ikon").last().locator(".off")).toHaveCount(
    2,
  );

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-pagination-input";
  });
  await input.fill("99");
  await input.press("Enter");
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/posts?pageNum=3&filter=release&labelIds=8&orderBy=createdDate&orderDir=asc`,
  );
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("3");
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-pagination-input");

  await page.locator('#pagination input[name="pageNum"]').fill("1.5");
  await page.locator('#pagination input[name="pageNum"]').press("Enter");
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/posts?pageNum=3&filter=release&labelIds=8&orderBy=createdDate&orderDir=asc`,
  );
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("3");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMetrics = await page.locator("#pagination").evaluate((element) => ({
    pageNumsMarginLeft: getComputedStyle(element.querySelector(".page-nums")!).marginLeft,
    noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  }));
  expect(mobileMetrics).toEqual({ pageNumsMarginLeft: "-120px", noOverflow: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "board-pagination-mobile.png"),
  });
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
  await expect(page.locator("#pagination")).not.toHaveClass(/page-navigation-wrap/u);
  await expect(page.locator("#pagination")).toBeEmpty();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedProjectPostsEmpty().replaceAll("__BASE_PATH__", basePath)),
  );
});

test("SVN board list keeps the clean legacy URL and empty pagination geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.addInitScript((configuredBasePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: configuredBasePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  await mockProjectPosts(page, "empty", {
    __ownerName: "admin",
    __projectName: "svnplayground",
    __labelOptions: [],
    __projectOverrides: {
      menuSetting: null,
      showBoard: true,
      showCode: true,
      showIssue: true,
      showMilestone: true,
      showPullRequest: false,
      showReview: true,
      vcs: "Subversion",
    },
  });

  await page.goto(`${basePath}/admin/svnplayground/posts`);
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/posts`);
  await expect(page.locator(".error-wrap")).toBeVisible();
  await expect(page.locator("#pagination")).toBeEmpty();
  expect(await emptyBoardGeometry(page)).toEqual({
    borderTopWidth: "0px",
    documentWidth: 1366,
    paginationDisplay: "block",
    paginationMargin: "0px",
    projectPageHeight: 413,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/posts`);
  expect(await emptyBoardGeometry(page)).toEqual({
    borderTopWidth: "0px",
    documentWidth: 390,
    paginationDisplay: "block",
    paginationMargin: "0px",
    projectPageHeight: 382,
  });
});

test("project board list bracketed title prefix matches legacy title helpers", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "prefix");
  await page.addInitScript(() => {
    const nativeAddEventListener = Element.prototype.addEventListener;
    (window as typeof window & { __titlePrefixListeners: string[] }).__titlePrefixListeners = [];
    Element.prototype.addEventListener = function patchedAddEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (this instanceof Element && this.matches(".title-prefix, .title-wrap, .post-list-wrap")) {
        (
          window as typeof window & { __titlePrefixListeners: string[] }
        ).__titlePrefixListeners.push(`${this.tagName.toLowerCase()}.${this.className}:${type}`);
      }
      return nativeAddEventListener.call(this, type, listener, options);
    };
  });

  await page.goto(`${basePath}/admin/sample/posts?filter=release&labelIds=8&title=prefix`);
  await expect(page.locator(".title-prefix[href]")).toHaveCount(0);
  await expect(page.locator('button.title-prefix[type="button"]')).toHaveText("[P1]");
  await expect(page.locator(".post-list-wrap:not(.notice-wrap) .title-wrap .title")).toHaveText(
    "Release note",
  );
  expect(
    await page.evaluate(
      () => (window as typeof window & { __titlePrefixListeners: string[] }).__titlePrefixListeners,
    ),
  ).toEqual([]);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_POSTS_PREFIX.replaceAll("__BASE_PATH__", basePath),
    ),
  );

  const prefix = page.locator('button.title-prefix[type="button"]');
  await prefix.hover();
  await expect(prefix).toHaveClass("title-prefix title-prefix-hover");
  await page.mouse.move(0, 0);
  await expect(prefix).toHaveClass("title-prefix");

  await page.goto(
    `${basePath}/admin/sample/posts?filter=release&labelIds=8&title=prefix&pageNum=3`,
  );
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-prefix";
  });
  await prefix.click();
  await expect(page.locator('#option_form input[name="filter"]')).toHaveValue("[P1]");
  await expect(page).toHaveURL(/\/admin\/sample\/posts\?/u);
  const searchParams = new URL(page.url()).searchParams;
  expect(searchParams.get("filter")).toBe("[P1]");
  expect(searchParams.get("labelIds")).toBe("8");
  expect(searchParams.get("orderBy")).toBe("updatedDate");
  expect(searchParams.get("orderDir")).toBe("desc");
  expect(searchParams.get("pageNum")).toBe("1");
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-prefix");
});

test("project board post create form uploader shell matches legacy fileUploader.scala.html without local templates", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/postform`);
  await expect(page.locator("#upload[data-resource-type='BOARD_POST']")).toBeVisible();
  await expect(page.locator("#upload .attach-wrap")).toBeVisible();
  await expect(page.locator("#upload input.file[name='filePath']")).toHaveAttribute("multiple", "");
  await expect(page.locator("#upload .attached-files.unstyled")).toHaveCount(1);
  await expect(page.locator("#upload .right-txt.help")).toHaveText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator("#tplAttachedFile, #tplDropFilesHere")).toHaveCount(0);

  const uploadMetrics = await page.locator("#upload").evaluate((upload) => {
    const style = window.getComputedStyle(upload);
    const droppable = upload.querySelector(".help-droppable") as HTMLElement;
    const btnWrap = upload.querySelector(".btn-wrap") as HTMLElement;
    const fileButton = upload.querySelector(".fake-file-wrap") as HTMLElement;
    const fileInput = upload.querySelector("input.file") as HTMLInputElement;
    const plain = upload.querySelector(".plain") as HTMLElement;
    const pastable = upload.querySelector(".help-pastable") as HTMLElement;
    const attachedFiles = upload.querySelector(".attached-files") as HTMLElement;
    const help = upload.querySelector(".right-txt.help") as HTMLElement;
    const attachedFilesStyle = window.getComputedStyle(attachedFiles);

    return {
      className: upload.className,
      resourceType: upload.getAttribute("data-resource-type"),
      droppableText: droppable.textContent?.trim(),
      btnWrapDisplay: window.getComputedStyle(btnWrap).display,
      uploadButtonText: fileButton.textContent?.trim(),
      fileInputName: fileInput.name,
      fileInputMultiple: fileInput.multiple,
      plainText: plain.textContent?.trim(),
      pastableText: pastable.textContent?.trim(),
      attachedFilesClass: attachedFiles.className,
      attachedFilesDisplay: attachedFilesStyle.display,
      attachedFilesPadding: attachedFilesStyle.padding,
      helpText: help.textContent?.trim(),
      padding: style.padding,
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
    };
  });
  expect(uploadMetrics).toEqual({
    className: "upload-wrap content-footer",
    resourceType: "BOARD_POST",
    droppableText: "Drag & Drop files to attach here or",
    btnWrapDisplay: "inline-block",
    uploadButtonText: "File upload",
    fileInputName: "filePath",
    fileInputMultiple: true,
    plainText: "Click upload button",
    pastableText: "Paste the clipboard image",
    attachedFilesClass: "attached-files unstyled",
    attachedFilesDisplay: "none",
    attachedFilesPadding: "15px 0px",
    helpText: "Selected file will be attached when your comment is saved.",
    padding: "10px 20px",
    backgroundColor: "rgb(245, 245, 245)",
    borderRadius: "5px",
  });

  const routeSource = readFileSync("src/routes/$ownerName/$projectName/postform.tsx", "utf8");
  const uploaderSource = routeSource.slice(
    routeSource.indexOf("function BoardPostFileUploader"),
    routeSource.indexOf("function isOnlineCommitResponse"),
  );
  expect(routeSource).not.toContain("tplAttachedFile");
  expect(routeSource).not.toContain("tplDropFilesHere");
  expect(routeSource).not.toContain("text/x-jquery-tmpl");
  expect(uploaderSource).not.toContain("dangerouslySetInnerHTML");
  expect(uploaderSource).not.toContain("<script");
  expect(uploaderSource).not.toContain("document.");
  expect(uploaderSource).not.toContain("createElement");
  expect(uploaderSource).not.toContain("$(");
  expect(uploaderSource).not.toContain("<a");
});

test("project board post edit form uploader shell matches legacy fileUploader.scala.html without local templates", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3/editform`);
  const editor = page.locator('[data-toggle="markdown-editor"]');
  await expect(editor.locator(".tab-content > .markdown-help")).toHaveCount(1);
  await expect(editor.locator(".markdown-help-nav .label")).toHaveText("Markdown help");
  await expect(editor.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(editor.locator(".markdown-help-wrap > .markdown-help-item")).toHaveCount(10);
  expect(
    await editor.locator(".tab-content").evaluate((tabContent) =>
      Array.from(tabContent.children)
        .slice(0, 2)
        .map((child) => ({
          className: child.className,
          id: child.id,
          tagName: child.tagName.toLowerCase(),
        })),
    ),
  ).toEqual([
    {
      className: "markdown-help",
      id: "",
      tagName: "div",
    },
    {
      className: "tab-pane active",
      id: "edit-body",
      tagName: "div",
    },
  ]);

  const upload = page.locator("#upload[data-resource-type='BOARD_POST'][data-resource-id='33']");
  await expect(upload).toBeVisible();
  await expect(upload.locator(".attach-wrap")).toBeVisible();
  await expect(upload.locator("input.file[name='filePath']")).toHaveAttribute("multiple", "");
  await expect(upload.locator(".attached-files.unstyled")).toHaveCount(1);
  await expect(upload.locator(".right-txt.help")).toHaveText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator("#tplAttachedFile, #tplDropFilesHere")).toHaveCount(0);

  const uploadMetrics = await upload.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const droppable = element.querySelector(".help-droppable") as HTMLElement;
    const btnWrap = element.querySelector(".btn-wrap") as HTMLElement;
    const fileButton = element.querySelector(".fake-file-wrap") as HTMLElement;
    const fileInput = element.querySelector("input.file") as HTMLInputElement;
    const plain = element.querySelector(".plain") as HTMLElement;
    const pastable = element.querySelector(".help-pastable") as HTMLElement;
    const attachedFiles = element.querySelector(".attached-files") as HTMLElement;
    const help = element.querySelector(".right-txt.help") as HTMLElement;
    const attachedFilesStyle = window.getComputedStyle(attachedFiles);

    return {
      className: element.className,
      resourceType: element.getAttribute("data-resource-type"),
      resourceId: element.getAttribute("data-resource-id"),
      droppableText: droppable.textContent?.trim(),
      btnWrapDisplay: window.getComputedStyle(btnWrap).display,
      uploadButtonText: fileButton.textContent?.trim(),
      fileInputName: fileInput.name,
      fileInputMultiple: fileInput.multiple,
      plainText: plain.textContent?.trim(),
      pastableText: pastable.textContent?.trim(),
      attachedFilesClass: attachedFiles.className,
      attachedFilesDisplay: attachedFilesStyle.display,
      attachedFilesPadding: attachedFilesStyle.padding,
      helpText: help.textContent?.trim(),
      padding: style.padding,
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
    };
  });
  expect(uploadMetrics).toEqual({
    className: "upload-wrap content-footer",
    resourceType: "BOARD_POST",
    resourceId: "33",
    droppableText: "Drag & Drop files to attach here or",
    btnWrapDisplay: "inline-block",
    uploadButtonText: "File upload",
    fileInputName: "filePath",
    fileInputMultiple: true,
    plainText: "Click upload button",
    pastableText: "Paste the clipboard image",
    attachedFilesClass: "attached-files unstyled",
    attachedFilesDisplay: "none",
    attachedFilesPadding: "15px 0px",
    helpText: "Selected file will be attached when your comment is saved.",
    padding: "10px 20px",
    backgroundColor: "rgb(245, 245, 245)",
    borderRadius: "5px",
  });

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx",
    "utf8",
  );
  const uploaderSource = routeSource.slice(
    routeSource.indexOf("function BoardPostFileUploader"),
    routeSource.indexOf("function stringFormValue"),
  );
  expect(routeSource).not.toContain("attachedFileTemplate");
  expect(routeSource).not.toContain("dropFilesHereTemplate");
  expect(routeSource).not.toContain("tplAttachedFile");
  expect(routeSource).not.toContain("tplDropFilesHere");
  expect(routeSource).not.toContain("text/x-jquery-tmpl");
  expect(routeSource).not.toContain("help/markdown.scala.html");
  expect(routeSource).not.toContain("legacyMarkdownHelpTemplate");
  expect(routeSource).not.toContain("legacyMarkdownHelpHtml");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).toContain(
    'import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help"',
  );
  expect(uploaderSource).not.toContain("dangerouslySetInnerHTML");
  expect(uploaderSource).not.toContain("<script");
  expect(uploaderSource).not.toContain("document.");
  expect(uploaderSource).not.toContain("createElement");
  expect(uploaderSource).not.toContain("$(");
  expect(uploaderSource).not.toContain("<a");
});

test("project board detail matches legacy board/view.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page).toHaveTitle("Release note");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.head.querySelectorAll("title")).map((title) => title.outerHTML),
      ),
    )
    .toContain("<title>Release note</title>");
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchScopeButtons = page.locator(
    "[data-stylex-owner=global-gnb-search-scope-item] > button",
  );
  await expect(searchScopeButtons).toHaveText(["This Project", "All Projects"]);
  await expect(searchScopeButtons).toHaveCount(2);
  for (const button of await searchScopeButtons.all()) {
    await expect(button).toHaveAttribute("type", "button");
    await expect(button).not.toHaveAttribute("data-toggle");
    await expect(button).not.toHaveAttribute("data-action");
  }
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveText("admin");
  await expect(page.locator(".project-breadcrumb .project-name a")).toHaveText("sample");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");
  expect(await projectShellLinkActiveMarkers(page)).toEqual([]);
  await expect(page.locator(".project-page-wrap.board-view")).toBeVisible();
  await expect(page.locator("#post-body-3 .markdown-wrap")).toContainText("Post markdown");
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "false");
  await expect(page.locator("#watch-button")).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(page.locator("#watch-button")).toHaveAttribute("data-placement", "top");
  await expect(page.locator("#watch-button")).toHaveAttribute(
    "title",
    "If subscribe, notify all new comments",
  );
  await expect(page.locator("#watch-button")).toHaveText("Watch");
  await expect(page.locator(".board-actrow > span > button[title='Edit']")).not.toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(page.locator(".right-menu-icons > button[title='Edit']")).not.toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(page.locator(".board-actrow > span > button[title='Edit']")).not.toHaveClass(
    /\b(?:ml10|pt5px)\b/u,
  );
  await expect(page.locator(".right-menu-icons > button[title='Edit']")).not.toHaveClass(
    /\b(?:ml10|pt5px)\b/u,
  );
  await expect(page.locator("#deleteConfirm [data-request-uri]")).toHaveCount(0);
  await expect(page.locator("#deleteConfirm [data-request-method]")).toHaveCount(0);
  await expect(page.locator("#tplAttachedFile, #tplDropFilesHere")).toHaveCount(0);
  await expect(page.locator("#comment-form #upload.upload-wrap.content-footer")).toBeVisible();
  await expect(page.locator("#comment-form #upload .attached-files.unstyled")).toHaveCount(1);
  await expect(page.locator("#comment-form #upload input.file[name='filePath']")).toHaveAttribute(
    "multiple",
    "",
  );
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  expect(routeSource).toContain("projectSearchScope={projectSearchScope}");
  expect(routeSource).toContain(
    "organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName)",
  );
  expect(routeSource).toContain("function ProjectPostDetailTitle");
  expect(routeSource).toContain("<title>{postTitle}</title>");
  expect(routeSource).not.toContain("useLegacyPostDetailDocumentTitle");
  expect(routeSource).not.toContain("document.title");
  const detailBodySource = routeSource.slice(
    routeSource.indexOf("function ProjectPostDetailBody"),
    routeSource.indexOf("function PostingHistory"),
  );
  const actionButtonsSource = routeSource.slice(
    routeSource.indexOf("function PostActionButtons"),
    routeSource.indexOf("function PostComments"),
  );
  expect(detailBodySource).not.toContain('data-toggle="tooltip"');
  expect(detailBodySource).toContain('data-placement="top"');
  expect(detailBodySource).toContain('title={t("issue.watch.description")}');
  expect(detailBodySource).toContain('{post.isWatching ? t("post.unwatch") : t("post.watch")}');
  expect(actionButtonsSource).not.toContain('data-toggle="tooltip"');
  expect(actionButtonsSource).toContain('title={t("button.edit")}');
  expect(actionButtonsSource).toContain('title={t("button.show.original")}');
  expect(actionButtonsSource).toContain('title={t("button.delete")}');

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_POST_DETAIL.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await boardDetailMetrics(page)).toEqual({
    actionRowTextAlign: "right",
    attachmentTemplateCount: 0,
    bodyDisplay: "block",
    boardTopAtOrBelowMenu: true,
    bodyWidth: 1260,
    commentUploadAttachedFilesClass: "attached-files unstyled",
    commentUploadClass: "upload-wrap content-footer",
    commentUploadFileMultiple: true,
    commentUploadResourceType: "NONISSUE_COMMENT",
    contentAllowedUpdate: "true",
    contentLineHeight: "22.165px",
    deleteTransportMarkerCount: 0,
    documentTitle: "Release note",
    footerKeyboardTarget: null,
    gnbClassName: "gnb-outer project-header",
    gnbSearchAction: `${basePath}/admin/sample/search`,
    gnbSearchScopeDataActions: [null, null],
    gnbSearchScopeLabels: ["This Project", "All Projects"],
    gnbSearchScopeTitle: "This Project",
    headerMarginBottom: "15px",
    leftPaneWidth: 938,
    newPostHref: `${basePath}/admin/sample/postform`,
    postBodyId: "post-body-3",
    postEditorId: "post-3",
    projectHeaderProjectName: "sample",
    projectHeaderBottomBelowNavbar: true,
    projectMenuActiveCount: 1,
    projectMenuActiveText: "Board",
    projectMenuTopAtOrBelowHeader: true,
    rightPaneWidth: 295,
    scopeBottomWithinNavbar: true,
    scopeTopWithinNavbar: true,
    searchBottomWithinNavbar: true,
    searchLeftWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
    titleFontSize: "18px",
    watchButtonHeight: 30,
  });
});

test("project board detail tooltip plugin markers are not React-owned DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);

  const watchButton = page.locator("#watch-button");
  await expect(watchButton).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(watchButton).toHaveAttribute("data-placement", "top");
  await expect(watchButton).toHaveAttribute("title", "If subscribe, notify all new comments");
  await expect(watchButton).toHaveText("Watch");

  const topEditButton = page.locator(".board-actrow > span > button[title='Edit']");
  const sideEditButton = page.locator(".right-menu-icons > button[title='Edit']");
  await expect(topEditButton).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(sideEditButton).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(topEditButton).not.toHaveClass(/\b(?:ml10|pt5px)\b/u);
  await expect(sideEditButton).not.toHaveClass(/\b(?:ml10|pt5px)\b/u);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const detailBodySource = routeSource.slice(
    routeSource.indexOf("function ProjectPostDetailBody"),
    routeSource.indexOf("function PostingHistory"),
  );
  const actionButtonsSource = routeSource.slice(
    routeSource.indexOf("function PostActionButtons"),
    routeSource.indexOf("function PostComments"),
  );
  expect(detailBodySource).not.toContain('data-toggle="tooltip"');
  expect(detailBodySource).toContain('data-placement="top"');
  expect(detailBodySource).toContain('title={t("issue.watch.description")}');
  expect(detailBodySource).toContain('{post.isWatching ? t("post.unwatch") : t("post.watch")}');
  expect(actionButtonsSource).not.toContain('data-toggle="tooltip"');
  expect(actionButtonsSource).toContain('title={t("button.edit")}');
  expect(actionButtonsSource).toContain('title={t("button.show.original")}');
  expect(actionButtonsSource).toContain('title={t("button.delete")}');
});

test("project board detail editable edit buttons route to edit form without reload", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator(".board-actrow > span > button[title='Edit']")).toHaveCount(1);
  await expect(page.locator(".right-menu-icons > button[title='Edit']")).toHaveCount(1);
  await expect(page.locator(".board-actrow > span > a, .right-menu-icons > a")).toHaveCount(0);

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-detail-top-edit";
  });
  await page.locator(".board-actrow > span > button[title='Edit']").click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3/editform`);
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-detail-top-edit");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-detail-side-edit";
  });
  await page.locator(".right-menu-icons > button[title='Edit']").click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3/editform`);
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-detail-side-edit");

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const actionButtonsSource = routeSource.slice(
    routeSource.indexOf("function PostActionButtons"),
    routeSource.indexOf("function PostComments"),
  );
  expect(actionButtonsSource).toContain("onEditClick");
  expect(actionButtonsSource).toContain("event.preventDefault();");
  expect(actionButtonsSource).toContain("event.stopPropagation();");
  expect(actionButtonsSource).not.toContain("window.location");
  expect(actionButtonsSource).not.toContain("document.");
  expect(actionButtonsSource).not.toContain("<a");
});

test("project board detail renders protected org-owned localhost shell state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "default", {
    __ownerName: "weblabs",
    __projectName: "portal",
    __projectOverrides: {
      backgroundImageUrl: "/assets/images/project_default.jpg",
      id: 2,
      isProtected: true,
      organizationName: "weblabs",
    },
  });

  await page.goto(`${basePath}/weblabs/portal/post/3`);
  await expect(page).toHaveTitle("Release note");

  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect
    .poll(() =>
      page
        .locator("[data-stylex-owner=global-gnb-search-scope-item] > button")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            dataAction: element.getAttribute("data-action"),
            text: element.textContent?.trim() ?? "",
          })),
        ),
    )
    .toEqual([
      { dataAction: null, text: "This Project" },
      { dataAction: null, text: "This Group" },
      { dataAction: null, text: "All Projects" },
    ]);

  const beforeUrl = page.url();
  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page).toHaveURL(beforeUrl);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button").nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page).toHaveURL(beforeUrl);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button").first().click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page).toHaveURL(beforeUrl);

  await expect(page.locator("#post-3 form")).toHaveAttribute(
    "action",
    `${basePath}/api/v1/projects/weblabs/portal/posts/3/content`,
  );
  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");

  expect(await boardDetailMetrics(page)).toMatchObject({
    boardTopAtOrBelowMenu: true,
    deleteTransportMarkerCount: 0,
    gnbClassName: "gnb-outer project-header",
    gnbSearchAction: `${basePath}/weblabs/portal/search`,
    gnbSearchScopeDataActions: [null, null, null],
    gnbSearchScopeLabels: ["This Project", "This Group", "All Projects"],
    gnbSearchScopeTitle: "This Project",
    newPostHref: `${basePath}/weblabs/portal/postform`,
    projectHeaderProjectName: "portal",
    projectMenuActiveCount: 1,
    projectMenuActiveText: "Board",
    scopeBottomWithinNavbar: true,
    scopeTopWithinNavbar: true,
    searchBottomWithinNavbar: true,
    searchLeftWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
  });

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  expect(routeSource).toContain("projectSearchScope={projectSearchScope}");
  expect(routeSource).toContain(
    "organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName)",
  );
  expect(routeSource).toContain(
    "function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string)",
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

test("project board detail owns legacy Watch button paint in StyleX", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyButtonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );
  const legacyVariablesSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  expect(legacyViewSource).toMatch(
    /id="watch-button"[^>]*class="ybtn @if\(conatinsCurrentUserInWatchers\) \{ybtn-watching\}"/u,
  );
  expect(legacyButtonSource).toMatch(
    /\.ybtn, \.flat > li > \.ybtn\s*\{[\s\S]*?background-color: @yobi-btn-default;[\s\S]*?&:hover, &:focus, &:active,[\s\S]*?background-color:#f1f1f1;/u,
  );
  expect(legacyButtonSource).toMatch(
    /&\.ybtn-watching\s*\{[\s\S]*?background-color\s*:\s*#f4efea !important;[\s\S]*?border:1px solid #C9C5C1;[\s\S]*?color:#333;[\s\S]*?&:hover, &:focus\s*\{[\s\S]*?background-color: #e0dad4 !important;/u,
  );
  expect(legacyVariablesSource).toMatch(/@yobi-white\s*:\s*#FFF;/u);
  expect(legacyVariablesSource).toMatch(/@yobi-btn-default\s*:\s*@yobi-white;/u);
  expect(routeSource).toContain('ybtn${post.isWatching ? " ybtn-watching" : ""}');
  expect(routeSource).toMatch(
    /stylex\.props\(\s*styles\.watch,\s*post\.isWatching && styles\.watchWatching,?\s*\)/u,
  );
  expect(styleSource).toMatch(/watch:\s*\{[\s\S]*?backgroundColor:\s*"#ffffff"/u);
  expect(styleSource).toMatch(/watchWatching:\s*\{[\s\S]*?backgroundColor:\s*"#f4efea"/u);
  expect(routeSource).not.toMatch(/id="watch-button"[\s\S]*?style=\{/u);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const { watchRequests } = await mockProjectPosts(page, "comment");
    await page.goto(`${basePath}/admin/sample/post/3`);

    const watchButton = page.locator("#watch-button");
    await expect(watchButton).toHaveJSProperty("tagName", "BUTTON");
    await expect(watchButton).toHaveClass(/\bybtn\b/u);
    await expect(watchButton).not.toHaveClass(/\bybtn-watching\b/u);
    await expect(watchButton).toHaveAttribute("data-watching", "false");
    await expect(watchButton).toHaveAttribute("title", "If subscribe, notify all new comments");
    await expect(watchButton).toHaveText("Watch");
    await expect(watchButton).not.toHaveAttribute("style");

    const paint = () =>
      watchButton.evaluate((element) => {
        const button = element.getBoundingClientRect();
        const wrapper = element.parentElement!.parentElement!.getBoundingClientRect();
        const actions = element.closest<HTMLElement>(".board-actrow")!.getBoundingClientRect();
        const actionButtons = element
          .closest<HTMLElement>(".board-actrow")!
          .querySelector<HTMLElement>(":scope > span")!
          .getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          color: style.color,
          contained:
            button.left >= wrapper.left - 0.5 &&
            button.right <= wrapper.right + 0.5 &&
            button.top >= wrapper.top - 0.5 &&
            button.bottom <= wrapper.bottom + 0.5 &&
            wrapper.left >= actions.left - 0.5 &&
            wrapper.right <= actions.right + 0.5,
          height: button.height,
          noOverlap: button.right <= actionButtons.left,
          padding: style.padding,
        };
      });

    await expect.poll(paint).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      borderColor: "rgba(0, 0, 0, 0.15)",
      borderRadius: "3px",
      boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      color: "rgb(51, 51, 51)",
      contained: true,
      height: 30,
      noOverlap: true,
      padding: "4px 12px",
    });

    await watchButton.hover();
    await expect.poll(paint).toMatchObject({
      backgroundColor: "rgb(241, 241, 241)",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "rgb(41, 41, 41)",
    });
    await page.mouse.move(0, 0);
    await watchButton.focus();
    await expect.poll(paint).toMatchObject({
      backgroundColor: "rgb(241, 241, 241)",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "rgb(41, 41, 41)",
    });

    await watchButton.click();
    await expect(watchButton).toHaveClass(/\bybtn-watching\b/u);
    await expect(watchButton).toHaveAttribute("data-watching", "true");
    await expect(watchButton).toHaveText("Stop watching");
    await page.mouse.move(0, 0);
    await watchButton.blur();
    await expect.poll(paint).toMatchObject({
      backgroundColor: "rgb(244, 239, 234)",
      borderColor: "rgb(201, 197, 193)",
      color: "rgb(51, 51, 51)",
    });
    await watchButton.hover();
    await expect.poll(paint).toMatchObject({
      backgroundColor: "rgb(224, 218, 212)",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "rgb(41, 41, 41)",
    });
    await page.mouse.move(0, 0);
    await watchButton.focus();
    await expect.poll(paint).toMatchObject({
      backgroundColor: "rgb(224, 218, 212)",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "rgb(41, 41, 41)",
    });

    await watchButton.click();
    await expect(watchButton).not.toHaveClass(/\bybtn-watching\b/u);
    await expect(watchButton).toHaveAttribute("data-watching", "false");
    await expect(watchButton).toHaveText("Watch");
    expect(watchRequests).toEqual(["POST", "DELETE"]);
  }
});

test("project board detail deletes through legacy confirmation modal", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { deleteRequests } = await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
  const detailUrl = page.url();
  await installRootModalBridgeGuard(page, ["deleteConfirm"]);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "post-delete-modal";
  });
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator('a[href="#deleteConfirm"][data-toggle="modal"]')).toHaveCount(0);
  await expect(page.locator('button[type="button"][data-target="#deleteConfirm"]')).toHaveCount(0);
  const deleteButtons = page.locator('.board-view button[type="button"][title="Delete"]');
  await expect(deleteButtons).toHaveCount(2);
  await expect(deleteButtons.first()).not.toHaveAttribute("data-toggle", "modal");
  await expect(deleteButtons.first()).not.toHaveAttribute("data-target", "#deleteConfirm");
  expect(await dispatchCancelableClick(deleteButtons.first())).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#deleteConfirm")).not.toHaveClass(/hide/);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/in/);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page).toHaveURL(detailUrl);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-delete-modal");
  expect(deleteRequests).toEqual([]);

  await expect(page.locator('#deleteConfirm [data-dismiss="modal"]')).toHaveCount(0);
  expect(
    await dispatchCancelableClick(page.locator("#deleteConfirm .modal-footer button.ybtn").last()),
  ).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(detailUrl);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-delete-modal");
  expect(deleteRequests).toEqual([]);

  await deleteButtons.first().click();
  await expectRootModalBridgeUnused(page);
  await page
    .locator("#deleteConfirm .ybtn-danger")
    .evaluate((button: HTMLButtonElement) => button.click());
  await expectRootModalBridgeUnused(page);
  await expect(page).toHaveURL(`${basePath}/admin/sample/posts`);
  await expect.poll(() => deleteRequests).toEqual(["DELETE"]);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const bodySource = routeSource.slice(
    routeSource.indexOf("function ProjectPostDetailBody"),
    routeSource.indexOf("function PostingHistory"),
  );
  const actionButtonsSource = routeSource.slice(
    routeSource.indexOf("function PostActionButtons"),
    routeSource.indexOf("function PostComments"),
  );
  expect(routeSource).toContain('type PostDetailModalId = "deleteConfirm"');
  expect(bodySource).toContain("const [openPostModal, setOpenPostModal]");
  expect(bodySource).toContain('openPostModal === "deleteConfirm"');
  expect(bodySource).toContain('setOpenPostModal("deleteConfirm")');
  expect(bodySource).toContain("event.preventDefault();");
  expect(bodySource).toContain("event.stopPropagation();");
  expect(actionButtonsSource).not.toContain('data-toggle="modal"');
  expect(actionButtonsSource).not.toContain('data-target="#deleteConfirm"');
  expect(bodySource).not.toContain('data-dismiss="modal"');
  expect(
    actionButtonsSource.slice(actionButtonsSource.indexOf('title={t("button.delete")}')),
  ).toContain("event.preventDefault();");
  expect(bodySource).not.toContain('document.getElementById("deleteConfirm")');
  expect(bodySource).not.toContain("classList");
  expect(bodySource).not.toContain("style.display");
});

test("project board detail deletes comments through legacy confirmation modal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentDeleteRequests } = await mockProjectPosts(page, "comment");

  await page.goto(`${basePath}/admin/sample/post/3`);
  const detailUrl = page.url();
  await installRootModalBridgeGuard(page, ["comment-delete-modal"]);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "post-comment-delete";
  });
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);

  expect(
    await dispatchCancelableClick(
      page.locator('#comment-21 .act-row button[title="Delete comment"]'),
    ),
  ).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-modal .modal-header h3")).toHaveText("Delete comment");
  await expect(page.locator("#comment-delete-modal .modal-body p")).toHaveText(
    "Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?",
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute("data-request-uri");
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute("data-request-method");
  await expect(page).toHaveURL(detailUrl);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-comment-delete");
  expect(commentDeleteRequests).toEqual([]);

  await expect(page.locator('#comment-delete-modal [data-dismiss="modal"]')).toHaveCount(0);
  expect(
    await dispatchCancelableClick(
      page.locator("#comment-delete-modal .modal-footer button.ybtn").last(),
    ),
  ).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page).toHaveURL(detailUrl);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-comment-delete");
  expect(commentDeleteRequests).toEqual([]);

  expect(
    await dispatchCancelableClick(
      page.locator('#comment-21 .act-row button[title="Delete comment"]'),
    ),
  ).toBe(false);
  await expectRootModalBridgeUnused(page);
  await page.locator("#comment-delete-confirm").click();
  await expectRootModalBridgeUnused(page);
  await expect.poll(() => commentDeleteRequests).toEqual(["DELETE"]);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const commentDeleteSource = routeSource.slice(
    routeSource.indexOf("function CommentDeleteConfirm"),
    routeSource.indexOf("function PostSelectedLabels"),
  );
  const commentRowSource = routeSource.slice(
    routeSource.indexOf("function PostCommentRow"),
    routeSource.indexOf("function PostCommentUpdateForm"),
  );
  const childCommentSource = routeSource.slice(
    routeSource.indexOf("function PostChildComment"),
    routeSource.indexOf("function MarkdownEditor"),
  );
  expect(
    commentRowSource.slice(commentRowSource.indexOf('title={t("common.comment.delete")}')),
  ).toContain("event.preventDefault();");
  expect(
    childCommentSource.slice(childCommentSource.indexOf('title={t("common.comment.delete")}')),
  ).toContain("event.preventDefault();");
  expect(commentRowSource).not.toContain('data-toggle="comment-edit"');
  expect(commentRowSource).not.toContain('data-toggle="comment-delete"');
  expect(childCommentSource).not.toContain('data-toggle="comment-delete"');
  expect(commentDeleteSource).toContain("event.preventDefault();");
  expect(commentDeleteSource).toContain("event.stopPropagation();");
  expect(routeSource).not.toContain("data-request-uri");
  expect(routeSource).not.toContain("data-request-method");
  expect(routeSource).not.toContain("requestAs");
  expect(commentDeleteSource).not.toContain('data-dismiss="modal"');
  expect(commentDeleteSource).not.toContain("document.");
  expect(commentDeleteSource).not.toContain("classList");
  expect(commentDeleteSource).not.toContain("style.display");
});

test("project board detail owns the final ml6 delete-action spacing in StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const appCssSource = readFileSync("src/app.css", "utf8");
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  const legacyYobiUiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );

  expect(legacyViewSource.match(/btn-transparent-with-fontsize-lineheight ml6/g)).toHaveLength(2);
  expect(legacyCommentsSource).toContain('class="btn-transparent ml6"');
  expect(legacyYobiSource).toContain('@import "less/_common.less";');
  expect(legacyCommonSource).toMatch(/\.ml6\s*\{\s*margin-left:\s*6px;\s*\}/u);
  expect(styleSource.match(/marginLeft:\s*"6px"/g)).toHaveLength(2);
  expect(styleSource).toContain("postDeleteAction:");
  expect(styleSource).toContain("commentDeleteAction:");
  expect(routeSource.match(/data-stylex-owner="post-detail-post-delete-action"/g)).toHaveLength(1);
  expect(routeSource.match(/data-stylex-owner="post-detail-comment-delete-action"/g)).toHaveLength(
    1,
  );
  expect(routeSource).not.toMatch(/className="[^"]*\bml6\b/u);
  expect(appCssSource).not.toMatch(/\.ml6\s*\{/u);

  const productionSources = [routeSource, appCssSource];
  expect(productionSources.join("\n")).not.toMatch(/className="[^"]*\bml6\b/u);

  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockProjectPosts(page, "comment");
    await page.goto(`${basePath}/admin/sample/post/3`);

    const postDeletes = page.locator('[data-stylex-owner="post-detail-post-delete-action"]');
    const commentDelete = page.locator(
      '#comment-21 [data-stylex-owner="post-detail-comment-delete-action"]',
    );
    await expect(postDeletes).toHaveCount(2);
    await expect(commentDelete).toHaveCount(1);
    expect(
      await postDeletes.evaluateAll((buttons) =>
        buttons.every((button) => !button.classList.contains("ml6")),
      ),
    ).toBe(true);
    await expect(commentDelete).not.toHaveClass(/\bml6\b/u);

    const geometry = await page.evaluate(() => {
      const postButtons = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-stylex-owner="post-detail-post-delete-action"]',
        ),
      );
      const commentButton = document.querySelector<HTMLElement>(
        '#comment-21 [data-stylex-owner="post-detail-comment-delete-action"]',
      )!;
      const allButtons = [...postButtons, commentButton];
      const details = allButtons.map((button) => {
        const buttonRect = button.getBoundingClientRect();
        const isComment = button.dataset.stylexOwner === "post-detail-comment-delete-action";
        const region = isComment
          ? button.closest<HTMLElement>("li.comment")
          : (button.closest<HTMLElement>(".span-left-pane") ??
            button.closest<HTMLElement>(".span-right-pane"));
        const regionRect = region?.getBoundingClientRect() ?? null;
        const previous = button.previousElementSibling as HTMLElement | null;
        const previousRect = previous?.getBoundingClientRect() ?? null;
        return {
          marginLeft: getComputedStyle(button).marginLeft,
          regionClass: region?.className ?? null,
          regionWidth: regionRect?.width ?? null,
          regionHeight: regionRect?.height ?? null,
          buttonWidth: buttonRect.width,
          buttonHeight: buttonRect.height,
          regionHasBox: regionRect !== null && regionRect.width > 0 && regionRect.height > 0,
          contained:
            regionRect !== null &&
            buttonRect.left >= regionRect.left - 0.5 &&
            buttonRect.right <= regionRect.right + 0.5 &&
            buttonRect.top >= regionRect.top - 0.5 &&
            buttonRect.bottom <= regionRect.bottom + 0.5,
          followsEdit: previous?.getAttribute("title")?.toLowerCase().includes("edit") ?? false,
          noOverlap: previousRect === null || previousRect.right <= buttonRect.left,
        };
      });
      return {
        details,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.details).toHaveLength(3);
    expect(geometry.details.every(({ marginLeft }) => marginLeft === "6px")).toBe(true);
    const leftPaneDelete = geometry.details.find(({ regionClass }) =>
      regionClass?.includes("span-left-pane"),
    );
    const rightPaneDelete = geometry.details.find(({ regionClass }) =>
      regionClass?.includes("span-right-pane"),
    );
    const commentRowDelete = geometry.details.find(({ regionClass }) =>
      regionClass?.split(/\s+/u).includes("comment"),
    );
    expect(leftPaneDelete).toBeDefined();
    expect(rightPaneDelete).toBeDefined();
    expect(commentRowDelete).toBeDefined();
    if (viewport.name === "desktop") {
      expect(
        geometry.details.filter(
          ({ regionHasBox, contained, buttonWidth, buttonHeight }) =>
            !regionHasBox || !contained || buttonWidth === 0 || buttonHeight === 0,
        ),
      ).toEqual([]);
    } else {
      for (const visibleDelete of [leftPaneDelete!, commentRowDelete!]) {
        expect(visibleDelete.regionHasBox).toBe(true);
        expect(visibleDelete.contained).toBe(true);
        expect(visibleDelete.buttonWidth).toBeGreaterThan(0);
        expect(visibleDelete.buttonHeight).toBeGreaterThan(0);
      }
      expect(rightPaneDelete).toMatchObject({
        buttonHeight: 0,
        buttonWidth: 0,
        contained: true,
        regionHasBox: false,
        regionHeight: 0,
        regionWidth: 0,
      });
    }
    expect(geometry.details.every(({ followsEdit }) => followsEdit)).toBe(true);
    expect(geometry.details.every(({ noOverlap }) => noOverlap)).toBe(true);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);

    await postDeletes.first().click();
    await expect(page.locator("#deleteConfirm")).toBeVisible();
    expect(
      await dispatchCancelableClick(
        page.locator("#deleteConfirm .modal-footer button.ybtn").last(),
      ),
    ).toBe(false);
    await expect(page.locator("#deleteConfirm")).toBeHidden();

    await commentDelete.click();
    await expect(page.locator("#comment-delete-modal")).toBeVisible();
    expect(
      await dispatchCancelableClick(
        page.locator("#comment-delete-modal .modal-footer button.ybtn").last(),
      ),
    ).toBe(false);
    await expect(page.locator("#comment-delete-modal")).toBeHidden();
  }
});

test("project board detail owns the final edit-action spacing in StyleX", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );

  expect(
    legacyViewSource.match(/btn-transparent-with-fontsize-lineheight ml10 pt5px/g),
  ).toHaveLength(4);
  expect(legacyCommentsSource).toContain('class="btn-transparent ml10"');
  expect(legacyCommonSource).toMatch(/\.ml10\s*\{\s*margin-left:\s*10px;\s*\}/u);
  expect(legacyPageSource.match(/\.pt5px\s*\{\s*padding-top:\s*5px;\s*\}/gu)).toHaveLength(2);
  expect(legacyYobiSource.match(/^@import "less\/_.*\.less";$/gmu)).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]);
  expect(styleSource).toMatch(
    /postEditAction:\s*\{[^}]*marginLeft:\s*"10px"[^}]*paddingTop:\s*"5px"/su,
  );
  expect(styleSource).toMatch(/commentEditAction:\s*\{[^}]*marginLeft:\s*"10px"/su);
  expect(routeSource.match(/data-stylex-owner="post-detail-post-edit-action"/g)).toHaveLength(2);
  expect(routeSource.match(/data-stylex-owner="post-detail-comment-edit-action"/g)).toHaveLength(1);
  expect(routeSource).not.toMatch(/className="[^"]*\b(?:ml10|pt5px)\b/u);

  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockProjectPosts(page, "comment");
    await page.goto(`${basePath}/admin/sample/post/3`);

    const postEdits = page.locator('[data-stylex-owner="post-detail-post-edit-action"]');
    const commentEdit = page.locator(
      '#comment-21 [data-stylex-owner="post-detail-comment-edit-action"]',
    );
    await expect(postEdits).toHaveCount(2);
    await expect(commentEdit).toHaveCount(1);

    const geometry = await page.evaluate(() => {
      const postButtons = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-stylex-owner="post-detail-post-edit-action"]',
        ),
      );
      const commentButton = document.querySelector<HTMLElement>(
        '#comment-21 [data-stylex-owner="post-detail-comment-edit-action"]',
      )!;
      return [...postButtons, commentButton].map((button) => {
        const buttonRect = button.getBoundingClientRect();
        const isComment = button.dataset.stylexOwner === "post-detail-comment-edit-action";
        const region = isComment
          ? button.closest<HTMLElement>("li.comment")
          : (button.closest<HTMLElement>(".span-left-pane") ??
            button.closest<HTMLElement>(".span-right-pane"));
        const regionRect = region?.getBoundingClientRect() ?? null;
        const next = button.nextElementSibling as HTMLElement | null;
        const nextRect = next?.getBoundingClientRect() ?? null;
        return {
          contained:
            regionRect !== null &&
            buttonRect.left >= regionRect.left - 0.5 &&
            buttonRect.right <= regionRect.right + 0.5 &&
            buttonRect.top >= regionRect.top - 0.5 &&
            buttonRect.bottom <= regionRect.bottom + 0.5,
          height: buttonRect.height,
          marginLeft: getComputedStyle(button).marginLeft,
          nextIsDelete: next?.getAttribute("title")?.toLowerCase().includes("delete") ?? false,
          noOverlap: nextRect === null || buttonRect.right <= nextRect.left,
          paddingTop: getComputedStyle(button).paddingTop,
          regionHasBox: regionRect !== null && regionRect.width > 0 && regionRect.height > 0,
          type: isComment
            ? "comment"
            : region?.classList.contains("span-left-pane")
              ? "left"
              : "right",
          width: buttonRect.width,
        };
      });
    });
    expect(geometry).toHaveLength(3);
    expect(geometry.every(({ marginLeft }) => marginLeft === "10px")).toBe(true);
    expect(
      geometry
        .filter(({ type }) => type !== "comment")
        .every(({ paddingTop }) => paddingTop === "5px"),
    ).toBe(true);
    expect(geometry.every(({ nextIsDelete, noOverlap }) => nextIsDelete && noOverlap)).toBe(true);
    const visible = geometry.filter(({ type }) => viewport.name === "desktop" || type !== "right");
    expect(
      visible.every(
        ({ contained, height, regionHasBox, width }) =>
          contained && regionHasBox && height > 0 && width > 0,
      ),
    ).toBe(true);

    await postEdits.first().click();
    await expect(page).toHaveURL(`${basePath}/admin/sample/post/3/editform`);
    await page.goto(`${basePath}/admin/sample/post/3`);
    await commentEdit.click();
    await expect(page.locator("#comment-editform-21")).toBeVisible();
    await page.locator("#comment-editform-21 .ybtn-cancel").click();
    await expect(page.locator("#comment-editform-21")).toBeHidden();
  }
});

test("project board detail owns responsive header metadata in StyleX", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyBootstrapSource = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyResponsiveSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );

  expect(legacyViewSource).toContain('<div class="pull-right mr10 mt10 hide-in-mobile">');
  expect(legacyViewSource).toContain(
    '<div class="pull-right hide show-in-mobile" style="font-size: 0.7em">',
  );
  expect(legacyBootstrapSource).toMatch(/\.pull-right\s*\{\s*float:\s*right;\s*\}/u);
  expect(legacyBootstrapSource).toMatch(/\.hide\s*\{\s*display:\s*none;\s*\}/u);
  expect(legacyCommonSource).toMatch(/\.mr10\s*\{\s*margin-right:\s*10px;\s*\}/u);
  expect(legacyCommonSource).toMatch(/\.mt10\s*\{\s*margin-top:\s*10px;\s*\}/u);
  expect(legacyResponsiveSource).toMatch(
    /@media[^\{]*\(max-width:\s*720px\)[\s\S]*?\.show-in-mobile\s*\{\s*display:\s*block\s*!important;\s*\}[\s\S]*?\.hide-in-mobile\s*\{\s*display:\s*none\s*!important;\s*\}/u,
  );
  expect(legacyYobiSource.match(/^@import "less\/_.*\.less";$/gmu)).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]);
  expect(styleSource).toMatch(
    /desktopMetadata:\s*\{[\s\S]*?float:\s*"right"[\s\S]*?marginRight:\s*"10px"[\s\S]*?marginTop:\s*"10px"[\s\S]*?["']@media all and \(max-width:\s*720px\)["']:\s*\{\s*display:\s*"none"/u,
  );
  expect(styleSource).toMatch(
    /mobileMetadata:\s*\{[\s\S]*?display:\s*"none"[\s\S]*?float:\s*"right"[\s\S]*?fontSize:\s*"0\.7em"[\s\S]*?["']@media all and \(max-width:\s*720px\)["']:\s*\{\s*display:\s*"block"/u,
  );
  expect(routeSource.match(/data-stylex-owner="post-detail-desktop-metadata"/g)).toHaveLength(1);
  expect(routeSource.match(/data-stylex-owner="post-detail-mobile-metadata"/g)).toHaveLength(1);
  expect(routeSource).not.toContain('className="pull-right mr10 mt10 hide-in-mobile"');
  expect(routeSource).not.toContain("pull-right hide show-in-mobile");
  expect(routeSource).not.toMatch(/data-stylex-owner="post-detail-mobile-metadata"[^>]*style=/su);

  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockProjectPosts(page, "comment");
    await page.goto(`${basePath}/admin/sample/post/3`);

    const desktopMetadata = page.locator('[data-stylex-owner="post-detail-desktop-metadata"]');
    const mobileMetadata = page.locator('[data-stylex-owner="post-detail-mobile-metadata"]');
    await expect(desktopMetadata).toHaveCount(1);
    await expect(mobileMetadata).toHaveCount(1);
    await expect(desktopMetadata).not.toHaveClass(/\b(?:pull-right|mr10|mt10|hide-in-mobile)\b/u);
    await expect(mobileMetadata).not.toHaveClass(/\b(?:pull-right|hide|show-in-mobile)\b/u);
    await expect(desktopMetadata.locator(".date")).toHaveText("Jul 2, 2026");
    await expect(desktopMetadata.locator(".date")).toHaveAttribute("title", "Jul 2, 2026");
    await expect(mobileMetadata.locator(".date")).toHaveText("Jul 2, 2026");
    await expect(mobileMetadata.locator(".date")).toHaveAttribute("title", "Jul 2, 2026");

    if (viewport.name === "desktop") {
      await expect(desktopMetadata).toBeVisible();
      await expect(mobileMetadata).toBeHidden();
    } else {
      await expect(desktopMetadata).toBeHidden();
      await expect(mobileMetadata).toBeVisible();
    }

    const metrics = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-header"]',
      )!;
      const title = document.querySelector<HTMLElement>('[data-stylex-owner="post-detail-title"]')!;
      const boardId = document.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-board-id"]',
      )!;
      const desktop = document.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-desktop-metadata"]',
      )!;
      const mobile = document.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-mobile-metadata"]',
      )!;
      const headerRect = header.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const boardIdRect = boardId.getBoundingClientRect();
      const desktopRect = desktop.getBoundingClientRect();
      const mobileRect = mobile.getBoundingClientRect();
      const desktopStyle = getComputedStyle(desktop);
      const mobileStyle = getComputedStyle(mobile);
      return {
        desktopBeforeTitle: Boolean(
          desktop.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        boardIdBeforeMobile: Boolean(
          boardId.compareDocumentPosition(mobile) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        desktop: {
          contained:
            desktopStyle.display === "none" ||
            (desktopRect.left >= headerRect.left - 0.5 &&
              desktopRect.right <= headerRect.right + 0.5 &&
              desktopRect.top >= headerRect.top - 0.5 &&
              desktopRect.bottom <= headerRect.bottom + 0.5),
          display: desktopStyle.display,
          float: desktopStyle.float,
          marginRight: desktopStyle.marginRight,
          marginTop: desktopStyle.marginTop,
          noOverlap:
            desktopStyle.display === "none" ||
            boardIdRect.right <= desktopRect.left ||
            desktopRect.right <= boardIdRect.left,
        },
        mobile: {
          contained:
            mobileStyle.display === "none" ||
            (mobileRect.left >= titleRect.left - 0.5 &&
              mobileRect.right <= titleRect.right + 0.5 &&
              mobileRect.top >= titleRect.top - 0.5 &&
              mobileRect.bottom <= titleRect.bottom + 0.5),
          display: mobileStyle.display,
          float: mobileStyle.float,
          fontSize: mobileStyle.fontSize,
          noOverlap:
            mobileStyle.display === "none" ||
            boardIdRect.right <= mobileRect.left ||
            mobileRect.right <= boardIdRect.left,
        },
      };
    });
    expect(metrics.desktopBeforeTitle).toBe(true);
    expect(metrics.boardIdBeforeMobile).toBe(true);
    expect(metrics.desktop).toMatchObject({
      contained: true,
      display: viewport.name === "desktop" ? "block" : "none",
      float: "right",
      marginRight: "10px",
      marginTop: "10px",
      noOverlap: true,
    });
    expect(metrics.mobile).toMatchObject({
      contained: true,
      display: viewport.name === "desktop" ? "none" : "block",
      float: "right",
      fontSize: "12.6px",
      noOverlap: true,
    });
  }
});

test("project board-post body and footer own their left floats in StyleX", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyKeymapSource = readFileSync(
    "../yona-original/app/views/help/keymap.scala.html",
    "utf8",
  );
  const legacyBootstrapSource = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyResponsiveSource = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );

  const legacyWatchArea = legacyViewSource.slice(
    legacyViewSource.indexOf('<div class="board-actrow right-txt">'),
    legacyViewSource.indexOf('<div class="watcher-list"></div>'),
  );
  expect(legacyWatchArea.match(/<div class="pull-left">/g)).toHaveLength(1);
  expect(legacyWatchArea).toContain('<button id="watch-button"');
  expect(legacyKeymapSource.match(/<div class="pull-left"/g)).toHaveLength(1);
  expect(legacyKeymapSource).toContain('style="padding:10px 0; margin-left: 55px;"');
  expect(legacyBootstrapSource).toMatch(/\.pull-left\s*\{\s*float:\s*left;\s*\}/u);
  expect(legacyResponsiveSource).toMatch(/\.media \.pull-left,\s*\.media \.pull-right\s*\{/u);
  expect(legacyYobiSource.match(/^@import "less\/_.*\.less";$/gmu)).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]);
  expect(styleSource).toMatch(/watchWrapper:\s*\{\s*float:\s*"left"\s*\}/u);
  expect(styleSource).toMatch(
    /keymapWrapper:\s*\{[^}]*float:\s*"left"[^}]*marginLeft:\s*55[^}]*padding:\s*"10px 0px"/su,
  );
  expect(routeSource.match(/data-stylex-owner="post-detail-watch-wrapper"/g)).toHaveLength(1);
  expect(routeSource.match(/data-stylex-owner="post-detail-keymap-wrapper"/g)).toHaveLength(1);
  expect(routeSource).not.toMatch(/data-stylex-owner="post-detail-watch-wrapper"[^>]*pull-left/su);
  expect(routeSource).not.toMatch(/data-stylex-owner="post-detail-keymap-wrapper"[^>]*pull-left/su);
  expect(routeSource).not.toMatch(
    /data-stylex-owner="post-detail-(?:watch|keymap)-wrapper"[^>]*style=/su,
  );

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const { watchRequests } = await mockProjectPosts(page, "comment");
    await page.goto(`${basePath}/admin/sample/post/3`);

    const watchWrapper = page.locator('[data-stylex-owner="post-detail-watch-wrapper"]');
    const keymapWrapper = page.locator('[data-stylex-owner="post-detail-keymap-wrapper"]');
    await expect(watchWrapper).toHaveCount(1);
    await expect(keymapWrapper).toHaveCount(1);
    await expect(watchWrapper).not.toHaveClass(/\bpull-left\b/u);
    await expect(keymapWrapper).not.toHaveClass(/\bpull-left\b/u);

    const metrics = await page.evaluate(() => {
      const watch = document.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-watch-wrapper"]',
      )!;
      const watchButton = watch.querySelector<HTMLElement>("#watch-button")!;
      const actionRow = watch.closest<HTMLElement>(".board-actrow")!;
      const actionButtons = actionRow.querySelector<HTMLElement>(":scope > span")!;
      const keymap = document.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-keymap-wrapper"]',
      )!;
      const keymapButton = keymap.querySelector<HTMLElement>("button")!;
      const footer = keymap.closest<HTMLElement>(".board-footer")!;
      const watchRect = watch.getBoundingClientRect();
      const watchButtonRect = watchButton.getBoundingClientRect();
      const actionRect = actionRow.getBoundingClientRect();
      const actionButtonsRect = actionButtons.getBoundingClientRect();
      const keymapRect = keymap.getBoundingClientRect();
      const keymapButtonRect = keymapButton.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      return {
        keymap: {
          buttonContained:
            keymapButtonRect.left >= keymapRect.left - 0.5 &&
            keymapButtonRect.right <= keymapRect.right + 0.5 &&
            keymapButtonRect.top >= keymapRect.top - 0.5 &&
            keymapButtonRect.bottom <= keymapRect.bottom + 0.5,
          contained:
            keymapRect.left >= footerRect.left - 0.5 && keymapRect.right <= footerRect.right + 0.5,
          float: getComputedStyle(keymap).float,
          leftOffset: Math.round(keymapRect.left - footerRect.left),
          noOverflow: keymapRect.right <= footerRect.right + 0.5,
        },
        watch: {
          buttonContained:
            watchButtonRect.left >= watchRect.left - 0.5 &&
            watchButtonRect.right <= watchRect.right + 0.5 &&
            watchButtonRect.top >= watchRect.top - 0.5 &&
            watchButtonRect.bottom <= watchRect.bottom + 0.5,
          contained:
            watchRect.left >= actionRect.left - 0.5 &&
            watchRect.right <= actionRect.right + 0.5 &&
            watchRect.top >= actionRect.top - 0.5 &&
            watchRect.bottom <= actionRect.bottom + 0.5,
          float: getComputedStyle(watch).float,
          leftAligned: Math.abs(watchRect.left - actionRect.left) <= 3,
          noOverlap: watchRect.right <= actionButtonsRect.left,
        },
      };
    });
    expect(metrics.watch).toEqual({
      buttonContained: true,
      contained: true,
      float: "left",
      leftAligned: true,
      noOverlap: true,
    });
    expect(metrics.keymap).toEqual({
      buttonContained: true,
      contained: true,
      float: "left",
      leftOffset: 55,
      noOverflow: true,
    });

    const watchButton = page.locator("#watch-button");
    await expect(watchButton).toHaveText("Watch");
    await watchButton.click();
    await expect(watchButton).toHaveText("Stop watching");
    await watchButton.click();
    await expect(watchButton).toHaveText("Watch");
    expect(watchRequests).toEqual(["POST", "DELETE"]);

    const keymapButton = keymapWrapper.locator("button").first();
    const keymapModal = page.locator("#helpKeys");
    await keymapButton.click();
    await expect(keymapModal).toBeVisible();
    expect(await dispatchCancelableClick(keymapModal.locator(".actrow button"))).toBe(false);
    await expect(keymapModal).toBeHidden();
    await keymapButton.click();
    await expect(keymapModal).toBeVisible();
    await keymapModal.locator(".actrow button").focus();
    await page.keyboard.press("Escape");
    await expect(keymapModal).toBeHidden();
  }
});

test("project board-post renders legacy unauthorized comment state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyCommentFormSource = readFileSync(
    "../yona-original/app/views/common/commentForm.scala.html",
    "utf8",
  );
  const legacyBootstrapSource = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyResponsiveSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyVariablesSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const legacyYobiUiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  const englishMessages = readFileSync("../yona-original/conf/messages", "utf8");
  const koreanMessages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");

  expect(legacyViewSource).toContain(
    "@common.commentForm(post.asResource(), ResourceType.NONISSUE_COMMENT, routes.BoardApp.newComment(project.owner, project.name, post.getNumber).toString())",
  );
  expect(legacyCommentFormSource).toMatch(
    /<div class="write-comment-box mt20" title="@Messages\("error\.auth\.unauthorized\.comment"\)" data-login="required">[\s\S]*?<div class="write-comment-wrap">[\s\S]*?<div class="textarea-box">\s*<textarea class="comment disabled" disabled="disabled" style="cursor:text;"><\/textarea>[\s\S]*?<div class="right-txt mt10">\s*<span class="ybtn ybtn-disabled">@Messages\("button\.comment\.new"\)<\/span>/u,
  );
  expect(legacyCommonSource).toMatch(/\.right-txt\s*\{\s*text-align:\s*right;\s*\}/u);
  expect(legacyCommonSource).toMatch(/\.mt10\s*\{\s*margin-top:\s*10px;\s*\}/u);
  expect(legacyCommonSource).toMatch(/\.mt20\s*\{\s*margin-top:\s*20px;\s*\}/u);
  expect(legacyCommonSource).toContain("textarea { font-family: @fixed-font-family !important; }");
  expect(legacyPageSource).toMatch(
    /\.write-comment-box\s*\{\s*padding:\s*0 0 15px 54px;\s*font-family:@base-font-family;[\s\S]*?\.write-comment-wrap\s*\{\s*position:\s*relative;[\s\S]*?textarea\.disabled\s*\{\s*resize:none;\s*height:80px;\s*background:transparent;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.textarea-box\s*\{[\s\S]*?padding-right:\s*14px;[\s\S]*?position:relative;[\s\S]*?textarea\s*\{[\s\S]*?width:\s*100%;[\s\S]*?resize:vertical !important;[\s\S]*?font-size:\s*1em;/u,
  );
  expect(legacyResponsiveSource).toMatch(
    /@media[^{]*\(max-width:\s*720px\)[\s\S]*?\.write-comment-box\s*\{\s*padding:\s*0;\s*\}/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /label, input, button, select, textarea \{ font-size:12px; \}/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /&\.ybtn-disabled, &\[disabled\] \{\s*background-color\s*:\s*@yobi-btn-disabled !important;\s*border:none;\s*color:#dedede;\s*text-shadow:1px 1px rgba\(255,255,255,0\.5\);/u,
  );
  expect(legacyVariablesSource).toContain("@yobi-btn-disabled : @yobi-white-dark;");
  expect(legacyVariablesSource).toContain("@yobi-white-dark :#F2F2F2;");
  expect(legacyVariablesSource).toContain(
    '@fixed-font-family: Consolas, "Menlo", "Monaco", "Ubuntu Mono",  "source-code-pro", monospace;',
  );
  expect(legacyBootstrapSource).toMatch(
    /input,\s*button,\s*select,\s*textarea\s*\{\s*font-family:\s*"Helvetica Neue", Helvetica, Arial, sans-serif;/u,
  );
  expect(legacyYobiSource.match(/^@import "less\/_.*\.less";$/gmu)?.slice(0, 9)).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
  ]);
  expect(englishMessages).toContain("button.comment.new = Add a comment");
  expect(koreanMessages).toContain("button.comment.new = 댓글 입력");

  const owners = [
    "post-detail-disabled-comment-box",
    "post-detail-disabled-comment-wrap",
    "post-detail-disabled-comment-textarea-box",
    "post-detail-disabled-comment",
    "post-detail-disabled-comment-actions",
    "post-detail-disabled-comment-button",
  ];
  for (const owner of owners) {
    expect(routeSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  expect(styleSource).toContain("disabledCommentBox");
  expect(styleSource).toMatch(/commentCreateTextareaControl:\s*\{[\s\S]*?width:\s*"100%"/u);

  for (const viewport of [
    { height: 900, locale: "ko-KR", title: "로그인 후 댓글 입력이 가능합니다.", width: 1366 },
    { height: 844, locale: "en-US", title: "You need to log in to add comments.", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.addInitScript((locale) => {
      Object.defineProperty(navigator, "language", { configurable: true, value: locale });
      Object.defineProperty(navigator, "languages", { configurable: true, value: [locale] });
    }, viewport.locale);
    await mockProjectPosts(page, "unauthorizedComment", { __postNumber: "1" });
    await page.goto(`${basePath}/admin/sample/post/1`);

    const box = page.locator('[data-stylex-owner="post-detail-disabled-comment-box"]');
    const wrap = box.locator(':scope > [data-stylex-owner="post-detail-disabled-comment-wrap"]');
    const textareaBox = wrap.locator(
      ':scope > [data-stylex-owner="post-detail-disabled-comment-textarea-box"]',
    );
    const textarea = textareaBox.locator(
      ':scope > [data-stylex-owner="post-detail-disabled-comment"]',
    );
    const actions = wrap.locator(
      ':scope > [data-stylex-owner="post-detail-disabled-comment-actions"]',
    );
    const button = actions.locator(
      ':scope > [data-stylex-owner="post-detail-disabled-comment-button"]',
    );

    await expect(page.locator("#comment-form")).toHaveCount(0);
    await expect(box).toHaveCount(1);
    await expect(box).toHaveClass(/write-comment-box/u);
    await expect(box).toHaveClass(/mt20/u);
    await expect(box).toHaveAttribute("title", viewport.title);
    await expect(box).toHaveAttribute("data-login", "required");
    await expect(wrap).toHaveClass(/write-comment-wrap/u);
    await expect(textareaBox).toHaveClass(/textarea-box/u);
    await expect(textarea).toHaveClass(/comment/u);
    await expect(textarea).toHaveClass(/disabled/u);
    await expect(textarea).toBeDisabled();
    await expect(textarea).not.toHaveAttribute("style");
    await expect(actions).toHaveClass(/mt10/u);
    await expect(button).toHaveClass(/ybtn/u);
    await expect(button).toHaveClass(/ybtn-disabled/u);
    await expect(button).toHaveText(viewport.locale === "ko-KR" ? "댓글 입력" : "Add a comment");
    await expect(page.locator('[data-stylex-owner^="post-detail-disabled-comment"]')).toHaveCount(
      6,
    );
    await expect(
      page.locator(
        '[data-stylex-owner^="post-detail-comment-create-"], .comment-update-form [data-stylex-owner^="post-detail-disabled-comment"], .child-comment-input-form [data-stylex-owner^="post-detail-disabled-comment"]',
      ),
    ).toHaveCount(0);

    await expect(box).toHaveCSS("margin", "20px 0px 0px");
    await expect(box).toHaveCSS("padding", viewport.width === 390 ? "0px" : "0px 0px 15px 54px");
    await expect(wrap).toHaveCSS("position", "relative");
    await expect(textareaBox).toHaveCSS("display", "block");
    await expect(textareaBox).toHaveCSS("margin", "0px");
    await expect(textareaBox).toHaveCSS("padding", "0px 14px 0px 0px");
    await expect(textareaBox).toHaveCSS("position", "relative");
    await expect(textarea).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(textarea).toHaveCSS("border", "1px solid rgb(204, 204, 204)");
    await expect(textarea).toHaveCSS("border-radius", "0px 0px 3px 3px");
    await expect(textarea).toHaveCSS("box-shadow", "none");
    await expect(textarea).toHaveCSS("cursor", "text");
    await expect(textarea).toHaveCSS("font-size", viewport.width === 390 ? "16px" : "13px");
    await expect(textarea).toHaveCSS("height", "80px");
    await expect(textarea).toHaveCSS("margin", "0px");
    await expect(textarea).toHaveCSS("overflow", "hidden");
    await expect(textarea).toHaveCSS("overflow-wrap", "break-word");
    await expect(textarea).toHaveCSS("resize", "vertical");
    expect(await textarea.evaluate((element) => getComputedStyle(element).fontFamily)).toBe(
      'Consolas, Menlo, Monaco, "Ubuntu Mono", source-code-pro, monospace',
    );
    await expect(actions).toHaveCSS("margin-top", "10px");
    await expect(actions).toHaveCSS("text-align", "right");
    await expect(button).toHaveCSS("background-color", "rgb(242, 242, 242)");
    await expect(button).toHaveCSS("border", "0px none rgb(222, 222, 222)");
    await expect(button).toHaveCSS("border-radius", "3px");
    await expect(button).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px");
    await expect(button).toHaveCSS("color", "rgb(222, 222, 222)");
    await expect(button).toHaveCSS("cursor", "pointer");
    await expect(button).toHaveCSS("display", "inline-block");
    await expect(button).toHaveCSS("font-size", "14px");
    await expect(button).toHaveCSS("line-height", "20px");
    await expect(button).toHaveCSS("margin", "0px");
    await expect(button).toHaveCSS("padding", "4px 12px");
    await expect(button).toHaveCSS("text-align", "center");
    await expect(button).toHaveCSS("text-shadow", "rgba(255, 255, 255, 0.5) 1px 1px 0px");
    await expect(button).toHaveCSS("vertical-align", "middle");
    await expect(button).toHaveCSS("white-space", "nowrap");

    const metrics = await box.evaluate((outer) => {
      const owner = (name: string) =>
        outer.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
      const measure = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      return {
        actions: measure(owner("post-detail-disabled-comment-actions")),
        box: measure(outer),
        button: measure(owner("post-detail-disabled-comment-button")),
        textarea: measure(owner("post-detail-disabled-comment")),
        textareaBox: measure(owner("post-detail-disabled-comment-textarea-box")),
        wrap: measure(owner("post-detail-disabled-comment-wrap")),
      };
    });
    expect(metrics.wrap.left).toBeGreaterThanOrEqual(metrics.box.left);
    expect(metrics.wrap.right).toBeLessThanOrEqual(metrics.box.right);
    expect(metrics.textareaBox.left).toBeGreaterThanOrEqual(metrics.wrap.left);
    expect(metrics.textareaBox.right).toBeLessThanOrEqual(metrics.wrap.right);
    expect(metrics.textarea.left).toBeCloseTo(metrics.textareaBox.left, 1);
    expect(metrics.textarea.right).toBeCloseTo(metrics.textareaBox.right, 1);
    expect(metrics.textarea.bottom).toBeLessThanOrEqual(metrics.actions.top);
    expect(metrics.button.left).toBeGreaterThanOrEqual(metrics.actions.left);
    expect(metrics.button.right).toBeLessThanOrEqual(metrics.actions.right);
    expect(metrics.button.top).toBeGreaterThanOrEqual(metrics.actions.top);
    expect(metrics.button.bottom).toBeLessThanOrEqual(metrics.actions.bottom);

    const url = page.url();
    await textarea.evaluate((element) => element.focus());
    await expect(textarea).not.toBeFocused();
    await textarea.click({ force: true });
    await expect(textarea).toBeDisabled();
    await expect(textarea).not.toBeFocused();
    expect(page.url()).toBe(url);
    await button.hover();
    await expect(button).toHaveCSS("background-color", "rgb(242, 242, 242)");
    await expect(button).toHaveCSS("color", "rgb(222, 222, 222)");
    expect(page.url()).toBe(url);
  }
});

test("project board-post comment editor meets its upload boundary", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyEditorSource = readFileSync(
    "../yona-original/app/views/common/editor.scala.html",
    "utf8",
  );
  const legacyBoardSource = readFileSync(
    "../yona-original/app/views/board/view.scala.html",
    "utf8",
  );
  const legacyCommentFormSource = readFileSync(
    "../yona-original/app/views/common/commentForm.scala.html",
    "utf8",
  );
  const legacyUploadFormSource = readFileSync(
    "../yona-original/app/views/common/uploadForm.scala.html",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyMixinsSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_mixins.less",
    "utf8",
  );
  const legacyVariablesSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const legacyResponsiveSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  const legacyYobiUiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );
  const legacyYobiconSource = readFileSync(
    "../yona-original/public/stylesheets/yobicon/style.css",
    "utf8",
  );
  const legacyTemporarySaveSource = readFileSync(
    "../yona-original/public/javascripts/service/yona.temporarySaveHandler.js",
    "utf8",
  );
  const legacyAttachmentsSource = readFileSync(
    "../yona-original/public/javascripts/common/yobi.Attachments.js",
    "utf8",
  );
  const legacyFilesSource = readFileSync(
    "../yona-original/public/javascripts/common/yobi.Files.js",
    "utf8",
  );
  const legacyKoreanMessagesSource = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");
  const legacyBootstrapSource = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );

  expect(legacyBoardSource).toContain(
    "@common.commentForm(post.asResource(), ResourceType.NONISSUE_COMMENT,",
  );
  expect(legacyCommentFormSource).toContain('@common.editor("contents","","","comment-body")');
  expect(legacyBoardSource).toContain(
    "@common.commentForm(post.asResource(), ResourceType.NONISSUE_COMMENT",
  );
  expect(legacyBoardSource).not.toContain("notification-receiver");
  expect(legacyCommentFormSource).toContain("@common.fileUploader(resourceType, null)");
  expect(legacyCommentFormSource).toMatch(
    /<form id="comment-form" action="@action" method="post" enctype="multipart\/form-data">\s*<div class="write-comment-box">/u,
  );
  expect(legacyBootstrapSource).toMatch(/form\s*\{\s*margin:\s*0 0 20px;\s*\}/u);
  expect(legacyPageSource).toMatch(
    /\.write-comment-box\s*\{\s*padding:\s*0 0 15px 54px;\s*font-family:@base-font-family;/u,
  );
  expect(legacyResponsiveSource).toMatch(
    /@media[^{]*\(max-width:\s*720px\)[\s\S]*?\.write-comment-box\s*\{\s*padding:\s*0;\s*\}/u,
  );
  expect(legacyVariablesSource).toContain(
    '@base-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";',
  );
  expect(legacyYobiUiSource).toContain("form { margin:0 0 2px; }");
  expect(legacyYobiSource).toMatch(
    /@import "less\/_page\.less";[\s\S]*?@import "less\/_responsive\.less";\s*@import "less\/_yobiUI\.less";/u,
  );
  expect(styleSource).toMatch(/commentCreateForm:\s*\{ margin:\s*"0px 0px 2px" \}/u);
  expect(styleSource).toMatch(
    /commentCreateWriteBox:\s*\{[\s\S]*?fontFamily:[\s\S]*?-apple-system, BlinkMacSystemFont[\s\S]*?Segoe UI Symbol[\s\S]*?padding:\s*"0px 0px 15px 54px"[\s\S]*?@media all and \(max-width: 720px\)[\s\S]*?padding:\s*0/u,
  );
  for (const owner of ["post-detail-comment-create-form", "post-detail-comment-create-write-box"]) {
    expect(routeSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  expect(legacyCommentFormSource).toMatch(
    /<div class="write-comment-wrap">\s*<div class="right-txt">\s*<button type="button" class="ybtn hidden" id="dynamic-comment-btn"><\/button>\s*<button type="submit" class="ybtn ybtn-success">@Messages\("button\.comment\.new"\)<\/button>/u,
  );
  for (const owner of [
    "post-detail-comment-create-write-wrap",
    "post-detail-comment-actions",
    "post-detail-comment-create-dynamic-button",
    "post-detail-comment-create-submit",
  ]) {
    expect(routeSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  expect(legacyUploadFormSource).toMatch(
    /<div[\s\S]*?class="upload-wrap content-footer"[\s\S]*?<div class="attach-wrap">[\s\S]*?<div class="btn-wrap">[\s\S]*?<div class="nbtn medium white fake-file-wrap">[\s\S]*?<input type="file" class="file" name="filePath" multiple="multiple">/u,
  );
  expect(legacyUploadFormSource).toMatch(
    /<span class="help help-droppable">[\s\S]*?<span class="plain">[\s\S]*?<span class="help help-pastable">[\s\S]*?<ul class="attached-files unstyled"><\/ul>[\s\S]*?<p class="right-txt help">/u,
  );
  for (const owner of [
    "post-detail-comment-upload-droppable",
    "post-detail-comment-upload-plain",
    "post-detail-comment-upload-pastable",
    "post-detail-comment-upload-attached-files",
    "post-detail-comment-upload-help",
  ]) {
    expect(routeSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  expect(legacyPageSource).toMatch(
    /\.write-comment-box\s*\{[\s\S]*?\.upload-wrap\s*\{\s*background:#efefef;\s*padding:10px; margin-bottom:10px;\s*\.border-radius\(0px 0px 5px 5px\);/u,
  );
  expect(legacyPageSource).toMatch(
    /\.write-comment-box\s*\{[\s\S]*?\.write-comment-wrap\s*\{\s*position:\s*relative;/u,
  );
  expect(legacyCommonSource).toContain(".right-txt     { text-align:right; }");
  expect(legacyCommonSource).toMatch(
    /\.hidden\s*\{\s*display:\s*none !important;\s*visibility:\s*hidden !important;/u,
  );
  for (const declaration of [
    "@yobi-orange : #FF7332;",
    "@yobi-orange-dark : #E95E01;",
    "@yobi-primary : @yobi-orange;",
    "@yobi-btn-primary : @yobi-primary;",
    "@yobi-btn-primary-hover : @yobi-orange-dark;",
  ]) {
    expect(legacyVariablesSource).toContain(declaration);
  }
  expect(legacyYobiUiSource).toMatch(
    /\.ybtn, \.flat > li > \.ybtn\s*\{[\s\S]*?text-align\s*:center;[\s\S]*?background-color:\s*@yobi-btn-default;[\s\S]*?\.border-radius\(3px\)\s*!important;[\s\S]*?padding:\s*4px 12px !important;[\s\S]*?font-size:\s*14px;[\s\S]*?margin-left:\s*\.3em;[\s\S]*?border:\s*1px solid rgba\(0,0,0,\.15\);/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /&\.ybtn-primary, &\.ybtn-success,[\s\S]*?color:@yobi-white;[\s\S]*?&\.ybtn-success\s*\{\s*background-color\s*:\s*@yobi-btn-primary !important;\s*border:1px solid @yobi-btn-primary-hover;[\s\S]*?&:hover, &:focus, &:active, &:focus\s*\{\s*background-color:\s*@yobi-btn-primary-hover !important;/u,
  );
  expect(legacyBootstrapSource).toMatch(
    /button,\s*input,\s*select,\s*textarea\s*\{\s*margin:\s*0;\s*font-size:\s*100%;\s*vertical-align:\s*middle;[\s\S]*?button,\s*input\s*\{[\s\S]*?line-height:\s*normal;[\s\S]*?input\[type="submit"\]\s*\{\s*cursor:\s*pointer;\s*-webkit-appearance:\s*button;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.upload-wrap\s*\{\s*padding:10px !important;[\s\S]*?\.attach-wrap\s*\{\s*text-align:center;[\s\S]*?\.btn-wrap\s*\{\s*display:inline-block !important;\s*margin:0 5px; vertical-align:top;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.upload-wrap\s*\{\s*padding:10px !important;\s*\.help \{ display:none; \}\s*\.help-droppable \{\s*display: inline;\s*\}[\s\S]*?\.plain\s*\{\s*display:inline-block;\s*line-height:30px;\s*\}[\s\S]*?\.attached-files\s*\{\s*display:none;\s*padding: 0;\s*margin-bottom: 0;\s*margin-top: 15px;\s*border-top: 1px solid #e0e0e0;\s*padding: 15px 0px;/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /\.nbtn\s*\{[\s\S]*?text-align\s*:center;[\s\S]*?font-weight:bold;[\s\S]*?font-size: 11px;[\s\S]*?line-height: 18px;[\s\S]*?&\.white\s*\{\s*color: #222;\s*background-color: @white;/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /a\.nbtn, div\.nbtn, span\.nbtn, p\.nbtn\s*\{[\s\S]*?&\.medium \{ padding: 6px 20px; \}[\s\S]*?\.fake-file-wrap\s*\{\s*position: relative; display:block; clear:both;\s*overflow: hidden; cursor:pointer;[\s\S]*?\.file\s*\{\s*position: absolute; z-index:2; cursor:pointer;\s*top:0; left: 5px;[\s\S]*?min-width:100px; width:100%;\s*\.opacity\(0\);/u,
  );
  expect(styleSource).toMatch(
    /commentUploadWrap:\s*\{[\s\S]*?backgroundColor:\s*"#efefef"[\s\S]*?borderRadius:\s*"0px 0px 5px 5px"[\s\S]*?marginBottom:\s*"10px"[\s\S]*?padding:\s*"10px !important"/u,
  );
  expect(styleSource).toMatch(/commentUploadAttachWrap:\s*\{ textAlign:\s*"center" \}/u);
  expect(styleSource).toMatch(
    /commentUploadButtonWrap:\s*\{\s*display:\s*"inline-block !important",\s*margin:\s*"0px 5px",\s*verticalAlign:\s*"top"/u,
  );
  expect(styleSource).toMatch(
    /commentUploadFileInput:\s*\{[\s\S]*?left:\s*"5px"[\s\S]*?minWidth:\s*"100px"[\s\S]*?opacity:\s*0[\s\S]*?position:\s*"absolute"[\s\S]*?top:\s*0[\s\S]*?width:\s*"100%"[\s\S]*?zIndex:\s*2/u,
  );
  expect(styleSource).toMatch(/commentUploadDroppable:\s*\{ display:\s*"inline" \}/u);
  expect(styleSource).toMatch(
    /commentUploadPlain:\s*\{ display:\s*"inline-block", lineHeight:\s*"30px" \}/u,
  );
  expect(styleSource).toMatch(/commentUploadPastable:\s*\{ display:\s*"block" \}/u);
  expect(styleSource).toMatch(
    /commentUploadAttachedFiles:\s*\{\s*borderTop:\s*"1px solid #e0e0e0",\s*display:\s*"none",\s*marginBottom:\s*0,\s*marginTop:\s*"15px",\s*padding:\s*"15px 0px"/u,
  );
  expect(styleSource).toMatch(
    /commentUploadHelp:\s*\{ display:\s*"none", textAlign:\s*"right" \}/u,
  );
  expect(styleSource).toMatch(/commentCreateWriteWrap:\s*\{ position:\s*"relative" \}/u);
  expect(styleSource).toMatch(/commentActions:\s*\{ textAlign:\s*"right" \}/u);
  expect(styleSource).toMatch(
    /commentCreateDynamicButton:\s*\{\s*display:\s*"none !important",\s*visibility:\s*"hidden !important"/u,
  );
  expect(styleSource).toMatch(
    /commentCreateSubmitButton:\s*\{[\s\S]*?backgroundColor:\s*"#FF7332 !important"[\s\S]*?borderColor:\s*"#E95E01"[\s\S]*?color:\s*"#ffffff"[\s\S]*?":hover"[\s\S]*?"#E95E01 !important"[\s\S]*?":focus"[\s\S]*?"#E95E01 !important"[\s\S]*?":active"[\s\S]*?"#E95E01 !important"/u,
  );
  expect(routeSource).toMatch(
    /commentCreateDynamicButton:\s*stylex\.props\(\s*styles\.commentUpdateActionButton,\s*styles\.commentCreateDynamicButton,/u,
  );
  expect(routeSource).toMatch(
    /commentCreateSubmitButton:\s*stylex\.props\(\s*styles\.commentUpdateActionButton,\s*styles\.commentCreateSubmitButton,/u,
  );
  for (const owner of [
    "post-detail-comment-upload-wrap",
    "post-detail-comment-upload-attach-wrap",
    "post-detail-comment-upload-button-wrap",
    "post-detail-comment-upload-file-button",
    "post-detail-comment-upload-file-input",
  ]) {
    expect(routeSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  expect(legacyEditorSource).toMatch(
    /<li class="active">[\s\S]*?common\.editor\.edit[\s\S]*?<li>[\s\S]*?common\.editor\.preview[\s\S]*?<li>[\s\S]*?task-list-button[\s\S]*?<li>[\s\S]*?editor-clear-temporary[\s\S]*?<li>[\s\S]*?editor-notice-label/u,
  );
  expect(legacyCommonSource).toContain(".nm { margin: 0 !important; }");
  expect(legacyCommonSource).toContain("textarea { font-family: @fixed-font-family !important; }");
  expect(legacyPageSource).toMatch(
    /\.textarea-box\s*\{\s*padding:\s*0;\s*margin:\s*0;\s*display:\s*block;\s*padding-right:\s*14px;\s*position:relative;[\s\S]*?textarea\s*\{\s*\.border-radius\(0 0 3px 3px\);\s*width:\s*100%;\s*resize:vertical !important;\s*font-size:\s*1em;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.write-comment-box\s*\{[\s\S]*?\.comment\s*\{\s*height:\s*160px;\s*margin:\s*0;\s*resize:vertical;\s*\.box-shadow\(none\);\s*&:focus\s*\{\s*border:\s*1px solid @gray-cc;/u,
  );
  expect(legacyResponsiveSource).toMatch(
    /input\[type="text"\],[\s\S]*?textarea\s*\{\s*font-size:\s*16px !important;/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /label, input, button, select, textarea \{ font-size:12px; \}[\s\S]*?textarea,[\s\S]*?\.box-shadow\(none\);\s*\.border-radius\(2px\);[\s\S]*?&:focus\s*\{\s*\.box-shadow\(none\);\s*border-color:@primary !important;/u,
  );
  expect(legacyBootstrapSource).toMatch(
    /select,\s*textarea,[\s\S]*?display:\s*inline-block;\s*height:\s*20px;\s*padding:\s*4px 6px;\s*margin-bottom:\s*10px;[\s\S]*?textarea,[\s\S]*?background-color:\s*#ffffff;\s*border:\s*1px solid #cccccc;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.project-page-wrap\s*\{[\s\S]*?\.nav-tabs > li\s*\{\s*margin-bottom:\s*-2px;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.write-comment-box\s*\{[\s\S]*?\.write-comment-wrap\s*\{[\s\S]*?\.nav\s*\{\s*margin-bottom:\s*0;/u,
  );
  expect(legacyMixinsSource).toContain(".border-radius(@radius: 5px)");
  expect(legacyVariablesSource).toContain("@yobi-white-dark :#F2F2F2;");
  expect(legacyResponsiveSource).toMatch(
    /\.nav-tabs li a\s*\{\s*padding-left:\s*5px !important;\s*padding-right:\s*5px !important;/u,
  );
  expect(legacyYobiSource).toMatch(
    /@import "less\/_variables\.less";\s*@import "less\/_mixins\.less";\s*@import "less\/_common\.less";[\s\S]*?@import "less\/_page\.less";[\s\S]*?@import "less\/_responsive\.less";\s*@import "less\/_yobiUI\.less";/u,
  );
  expect(legacyPageSource).toMatch(
    /\.editor-clear-temporary\s*\{\s*margin-left:\s*10px;\s*display:\s*none;\s*\}/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /&\.small\s*\{[\s\S]*?\.editor-notice-label\s*\{\s*padding:4px 15px;[\s\S]*?\.unsaved\s*\{/u,
  );
  expect(legacyTemporarySaveSource).toMatch(
    /var noticePanel = \$\("\.editor-notice-label"\);[\s\S]*?setTimeout\(function \(\) \{[\s\S]*?noticePanel\.html\("<span class=\\"saved\\">Draft saved<\/span>"\);/u,
  );
  expect(legacyFilesSource).toMatch(
    /htVar\.bXHR2 = !!\(window\.ProgressEvent && window\.FileReader\) && !!window\.FormData;[\s\S]*?htVar\.bPastable = \(typeof document\.onpaste != "undefined"\) && htVar\.bXHR2\s*&& \(navigator\.userAgent\.indexOf\("FireFox"\) === -1\);/u,
  );
  expect(legacyAttachmentsSource).toMatch(
    /var htEnv = yobi\.Files\.getEnv\(\);[\s\S]*?welHelpPastable\s*= htElements\.welContainer\.find\("\.help-pastable"\);[\s\S]*?welHelpPastable\[htEnv\.bPastable \? "show" : "hide"\]\(\);/u,
  );
  expect(legacyKoreanMessagesSource).toContain("button.clear.temporary = 복구된 본문 삭제");
  expect(legacyKoreanMessagesSource).toContain("common.editor.edit = 편집");
  expect(legacyKoreanMessagesSource).toContain("common.editor.preview = 미리보기");
  expect(legacyKoreanMessagesSource).toContain("button.add.checklist = 체크리스트 추가");
  expect(legacyKoreanMessagesSource).toContain("button.comment.new = 댓글 입력");
  expect(legacyKoreanMessagesSource).toContain(
    "common.attach.drophere = 첨부할 파일을 끌어다 놓거나",
  );
  expect(legacyKoreanMessagesSource).toContain(
    "common.attach.clickbutton = 버튼을 클릭해서 선택하세요",
  );
  expect(legacyKoreanMessagesSource).toContain(
    "common.attach.pastehere = 클립보드 이미지를 붙여 넣을 수도 있습니다",
  );
  expect(legacyKoreanMessagesSource).toContain(
    "common.attach.attachIfYouSave = 표시된 파일은 글을 저장하면 첨부됩니다.",
  );
  expect(legacyEditorSource).toMatch(
    /<div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"><\/i> @Messages\("button\.add\.checklist"\)<\/button><\/div>/u,
  );
  expect(legacyPageSource).toMatch(
    /\.task-list-button\s*\{\s*margin-top:\s*2px;\s*\.tasklist-icon\s*\{\s*vertical-align:\s*top;\s*\}\s*button\s*\{\s*margin-top:\s*1px;/u,
  );
  expect(legacyEditorSource).not.toContain('class="yobicon-list tasklist-icon"');
  expect(legacyYobiUiSource).toMatch(
    /\.ybtn, \.flat > li > \.ybtn\s*\{[\s\S]*?padding:\s*4px 12px !important;[\s\S]*?&\.ybtn-small\s*\{\s*padding:\s*3px 10px !important;\s*font-size:\s*13px !important;[\s\S]*?&\.ybtn-danger-no-outline\s*\{\s*font-weight:\s*600;\s*box-shadow:\s*none;\s*color:\s*#666;\s*padding:\s*1px 10px !important;\s*border:\s*1px solid transparent;\s*background-color:\s*#eee;[\s\S]*?background-color:\s*#fbe9e7;\s*border:\s*1px solid #EF9A9A;/u,
  );
  expect(legacyYobiconSource).toMatch(
    /\[class\^="yobicon-"\],[\s\S]*?font-family:\s*'yobicon';[\s\S]*?line-height:\s*1;[\s\S]*?display:\s*inline-block;[\s\S]*?vertical-align:\s*baseline;/u,
  );
  expect(legacyYobiconSource).toMatch(/\.yobicon-list:before\s*\{\s*content:\s*"\\e25e";/u);
  expect(styleSource).toMatch(
    /commentCreateClearTemporary:\s*\{\s*display:\s*"none",\s*marginLeft:\s*"10px"\s*\}/u,
  );
  expect(styleSource).toMatch(/commentCreateEditorNoticeLabel:\s*\{\s*padding:\s*"4px 15px"\s*\}/u);
  expect(styleSource).toMatch(
    /commentCreateTextareaBox:\s*\{\s*display:\s*"block",\s*margin:\s*0,\s*padding:\s*"0px 14px 0px 0px",\s*position:\s*"relative",\s*\}/u,
  );
  expect(styleSource).toMatch(
    /commentCreateTextareaControl:\s*\{[\s\S]*?borderRadius:\s*"2px"[\s\S]*?boxShadow:\s*"none"[\s\S]*?fontSize:\s*"12px"[\s\S]*?height:\s*"160px"[\s\S]*?margin:\s*0[\s\S]*?resize:\s*"vertical"[\s\S]*?width:\s*"100%"[\s\S]*?borderColor:\s*"#F36C22 !important"[\s\S]*?@media all and \(max-width: 720px\)[\s\S]*?fontSize:\s*"16px !important"/u,
  );
  for (const owner of [
    "post-detail-comment-create-textarea-box",
    "post-detail-comment-create-textarea",
  ]) {
    expect(routeSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  expect(styleSource).toMatch(/commentUpdateChecklistWrap:\s*\{ marginTop:\s*"2px" \}/u);
  expect(styleSource).toMatch(
    /commentUpdateChecklistButton:\s*\{[\s\S]*?backgroundColor:\s*"#eeeeee"[\s\S]*?borderColor:\s*"transparent"[\s\S]*?fontSize:\s*"13px !important"[\s\S]*?marginTop:\s*"1px"[\s\S]*?padding:\s*"1px 10px !important"[\s\S]*?backgroundColor:\s*"#fbe9e7"[\s\S]*?borderColor:\s*"#EF9A9A"[\s\S]*?color:\s*"#C93426"/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateChecklistIcon:\s*\{[\s\S]*?fontFamily:\s*"yobicon"[\s\S]*?lineHeight:\s*"20px"[\s\S]*?verticalAlign:\s*"baseline"[\s\S]*?"::before":\s*\{ content:\s*'"\\\\e25e"' \}/u,
  );
  expect(routeSource.match(/post-detail-comment-create-clear-temporary/g)).toHaveLength(1);
  expect(routeSource.match(/post-detail-comment-create-editor-notice-label/g)).toHaveLength(1);
  for (const owner of [
    "post-detail-comment-create-checklist-wrap",
    "post-detail-comment-create-checklist-button",
    "post-detail-comment-create-checklist-icon",
  ]) {
    expect(routeSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  const markdownEditorSource = routeSource.slice(
    routeSource.indexOf("function MarkdownEditor("),
    routeSource.indexOf("function MarkdownEditor(") + 9_000,
  );
  expect(markdownEditorSource).not.toMatch(
    /localStorage|setTimeout|setInterval|document\.|querySelector|addEventListener|innerHTML|classList/u,
  );
  expect(legacyEditorSource).toContain(
    '<div class="tab-content" style="position:relative;overflow: visible;">',
  );
  expect(legacyBootstrapSource).toMatch(
    /\.tab-content > \.tab-pane,[\s\S]*?\{\s*display:\s*none;\s*\}/u,
  );
  expect(legacyBootstrapSource).toMatch(
    /\.tab-content > \.active,[\s\S]*?\{\s*display:\s*block;\s*\}/u,
  );
  expect(legacyBootstrapSource).toMatch(
    /\.nav\s*\{\s*margin-bottom:\s*20px;\s*margin-left:\s*0;\s*list-style:\s*none;[\s\S]*?\.nav-tabs:before,[\s\S]*?display:\s*table;\s*line-height:\s*0;\s*content:\s*"";[\s\S]*?\.nav-tabs:after,[\s\S]*?clear:\s*both;[\s\S]*?\.nav-tabs > li\s*\{\s*margin-bottom:\s*-1px;[\s\S]*?\.nav-tabs > li > a\s*\{[\s\S]*?border-radius:\s*4px 4px 0 0;[\s\S]*?\.nav-tabs > \.active > a,[\s\S]*?border-bottom-color:\s*transparent;/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /\.nav-tabs\s*\{\s*li\s*\{\s*a\s*\{\s*padding-left:30px; padding-right:30px;\s*color: #3592b5;\s*font-weight: bold;[\s\S]*?&\.small\s*\{\s*height:29px;\s*li a \{ padding:4px 15px; \}/u,
  );
  for (const styleName of [
    "commentUpdateEditorNav",
    "commentUpdateEditorNavItem",
    "commentUpdateEditorTabLink",
    "commentUpdateEditorTabLinkActive",
  ]) {
    expect(styleSource).toContain(`${styleName}:`);
  }
  for (const owner of [
    "post-detail-comment-create-editor-nav",
    "post-detail-comment-create-editor-nav-item",
    "post-detail-comment-create-editor-tab",
    "post-detail-comment-create-editor-tab-active",
  ]) {
    expect(routeSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  for (const owner of [
    "post-detail-comment-update-editor-nav",
    "post-detail-comment-update-editor-nav-item",
    "post-detail-comment-update-editor-tab",
    "post-detail-comment-update-editor-tab-active",
  ]) {
    expect(routeSource).toContain(`"${owner}"`);
  }
  expect(styleSource).toMatch(
    /editorTabContent:\s*\{\s*overflow:\s*"visible",\s*position:\s*"relative"\s*\}/u,
  );
  expect(styleSource).toMatch(/editorPane:\s*\{\s*display:\s*"none"\s*\}/u);
  expect(styleSource).toMatch(/editorPaneActive:\s*\{\s*display:\s*"block"\s*\}/u);
  expect(routeSource).toContain("className={`${sx.editorTabContent.className} tab-content`}");
  expect(routeSource.match(/data-stylex-owner="post-detail-editor-tab-content"/g)).toHaveLength(1);
  expect(routeSource.match(/data-stylex-owner="post-detail-editor-pane"/g)).toHaveLength(2);
  expect(routeSource).toContain(
    'Children.toArray(nav.props.children).flatMap((item) => [item, " "])',
  );
  expect(routeSource).not.toMatch(/className="tab-content"\s*\{\.\.\.sx\.editorTabContent\}/u);
  const editorSource = routeSource.slice(
    routeSource.indexOf("function MarkdownEditor("),
    routeSource.indexOf("function MarkdownEditor(") + 7_000,
  );
  expect(editorSource).not.toMatch(/style=|margin(?:Top|Bottom):\s*-|transform:/u);

  for (const viewport of [
    { height: 900, markdownHelpHeight: 31, width: 1366 },
    { height: 844, markdownHelpHeight: 91, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
      Object.defineProperty(navigator, "languages", {
        configurable: true,
        value: ["ko-KR"],
      });
    });
    await mockProjectPosts(page, "comment", { __postNumber: "1" });
    await page.goto(`${basePath}/admin/sample/post/1`);

    const commentForm = page.locator("#comment-form:has(#upload)");
    const createWriteBox = commentForm.locator(
      ':scope > [data-stylex-owner="post-detail-comment-create-write-box"]',
    );
    const upload = commentForm.locator('[data-stylex-owner="post-detail-comment-upload-wrap"]');
    const uploadAttach = upload.locator(
      '[data-stylex-owner="post-detail-comment-upload-attach-wrap"]',
    );
    const uploadButtonWrap = upload.locator(
      '[data-stylex-owner="post-detail-comment-upload-button-wrap"]',
    );
    const uploadFileButton = upload.locator(
      '[data-stylex-owner="post-detail-comment-upload-file-button"]',
    );
    const uploadFileInput = upload.locator(
      '[data-stylex-owner="post-detail-comment-upload-file-input"]',
    );
    const uploadDroppable = upload.locator(
      '[data-stylex-owner="post-detail-comment-upload-droppable"]',
    );
    const uploadPlain = upload.locator('[data-stylex-owner="post-detail-comment-upload-plain"]');
    const uploadPastable = upload.locator(
      '[data-stylex-owner="post-detail-comment-upload-pastable"]',
    );
    const uploadAttachedFiles = upload.locator(
      '[data-stylex-owner="post-detail-comment-upload-attached-files"]',
    );
    const uploadHelp = upload.locator('[data-stylex-owner="post-detail-comment-upload-help"]');
    const createWriteWrap = commentForm.locator(
      '[data-stylex-owner="post-detail-comment-create-write-wrap"]',
    );
    const createActions = createWriteWrap.locator(
      '[data-stylex-owner="post-detail-comment-actions"]',
    );
    const createDynamicButton = createActions.locator(
      '[data-stylex-owner="post-detail-comment-create-dynamic-button"]',
    );
    const createSubmit = createActions.locator(
      '[data-stylex-owner="post-detail-comment-create-submit"]',
    );
    await expect(commentForm).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-create-form",
    );
    await expect(commentForm).toHaveAttribute("action", `${basePath}/admin/sample/post/1/comments`);
    await expect(commentForm).toHaveAttribute("method", "post");
    await expect(commentForm).toHaveAttribute("enctype", "multipart/form-data");
    await expect(commentForm).toHaveCSS("margin", "0px 0px 2px");
    await expect(createWriteBox).toHaveCount(1);
    await expect(createWriteBox).toHaveClass(/write-comment-box/u);
    await expect(createWriteBox).toHaveCSS(
      "padding",
      viewport.width === 390 ? "0px" : "0px 0px 15px 54px",
    );
    const createFontFamily = await createWriteBox.evaluate(
      (element) => getComputedStyle(element).fontFamily,
    );
    for (const family of [
      "-apple-system",
      "Segoe UI",
      "Helvetica",
      "Arial",
      "sans-serif",
      "Apple Color Emoji",
      "Segoe UI Emoji",
      "Segoe UI Symbol",
    ]) {
      expect(createFontFamily).toContain(family);
    }
    expect(createFontFamily).toMatch(/BlinkMacSystemFont|system-ui/u);
    expect(
      await commentForm.evaluate((form) => {
        const child = form.firstElementChild;
        return {
          childCount: form.children.length,
          className: child?.className,
          owner: child?.getAttribute("data-stylex-owner"),
          tagName: child?.tagName.toLowerCase(),
        };
      }),
    ).toEqual({
      childCount: 1,
      className: expect.stringContaining("write-comment-box"),
      owner: "post-detail-comment-create-write-box",
      tagName: "div",
    });
    await expect(
      page.locator(
        '[data-stylex-owner="post-detail-comment-create-form"], [data-stylex-owner="post-detail-comment-create-write-box"]',
      ),
    ).toHaveCount(2);
    await expect(
      page.locator(
        '.comment-update-form [data-stylex-owner="post-detail-comment-create-form"], .comment-update-form [data-stylex-owner="post-detail-comment-create-write-box"], [data-login="required"] [data-stylex-owner="post-detail-comment-create-form"], [data-login="required"] [data-stylex-owner="post-detail-comment-create-write-box"]',
      ),
    ).toHaveCount(0);
    const editPane = commentForm.locator("#edit-contents");
    const previewPane = commentForm.locator("#preview-contents");
    const textarea = commentForm.locator("textarea.editorSeries");
    const textareaBox = commentForm.locator(
      '[data-stylex-owner="post-detail-comment-create-textarea-box"]',
    );
    const editorNav = commentForm.locator(
      '[data-stylex-owner="post-detail-comment-create-editor-nav"]',
    );
    const editorNavItems = editorNav.locator(
      ':scope > [data-stylex-owner="post-detail-comment-create-editor-nav-item"]',
    );
    const editTab = editorNav.getByRole("link", { name: "편집" });
    const previewTab = editorNav.getByRole("link", { name: "미리보기" });
    const checklistWrap = editorNav.locator(
      '[data-stylex-owner="post-detail-comment-create-checklist-wrap"]',
    );
    const checklistButton = checklistWrap.locator(
      '[data-stylex-owner="post-detail-comment-create-checklist-button"]',
    );
    const checklistIcon = checklistButton.locator(
      '[data-stylex-owner="post-detail-comment-create-checklist-icon"]',
    );
    const clearTemporary = commentForm.locator(
      '[data-stylex-owner="post-detail-comment-create-clear-temporary"]',
    );
    const noticeLabel = commentForm.locator(
      '[data-stylex-owner="post-detail-comment-create-editor-notice-label"]',
    );
    await expect(clearTemporary).toHaveCount(1);
    await expect(clearTemporary).toContainText("복구된 본문 삭제");
    await expect(clearTemporary).toBeHidden();
    await expect(noticeLabel).toHaveCount(1);
    await expect(noticeLabel).toBeEmpty();
    await expect(upload).toHaveClass(/upload-wrap content-footer/u);
    await expect(uploadAttach).toHaveClass(/attach-wrap/u);
    await expect(uploadButtonWrap).toHaveClass(/btn-wrap/u);
    await expect(uploadFileButton).toHaveClass(/nbtn medium white fake-file-wrap/u);
    await expect(uploadFileInput).toHaveClass(/file/u);
    await expect(uploadFileInput).toHaveAttribute("name", "filePath");
    await expect(uploadFileInput).toHaveAttribute("multiple", "");
    await expect(upload).toHaveCSS("background-color", "rgb(239, 239, 239)");
    await expect(upload).toHaveCSS("border-radius", "0px 0px 5px 5px");
    await expect(upload).toHaveCSS("margin-bottom", "10px");
    await expect(upload).toHaveCSS("padding", "10px");
    await expect(uploadAttach).toHaveCSS("text-align", "center");
    await expect(uploadButtonWrap).toHaveCSS("display", "inline-block");
    await expect(uploadButtonWrap).toHaveCSS("margin", "0px 5px");
    await expect(uploadButtonWrap).toHaveCSS("vertical-align", "top");
    await expect(uploadFileButton).toHaveCSS("display", "block");
    await expect(uploadFileButton).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(uploadFileButton).toHaveCSS("border", "0px none rgb(34, 34, 34)");
    await expect(uploadFileButton).toHaveCSS("border-radius", "2px");
    await expect(uploadFileButton).toHaveCSS(
      "box-shadow",
      "rgba(0, 0, 0, 0.3) 0px -1px 1px 0px inset",
    );
    await expect(uploadFileButton).toHaveCSS("color", "rgb(34, 34, 34)");
    await expect(uploadFileButton).toHaveCSS("font-size", "11px");
    await expect(uploadFileButton).toHaveCSS("font-weight", "700");
    await expect(uploadFileButton).toHaveCSS("line-height", "18px");
    await expect(uploadFileButton).toHaveCSS("margin-right", "5px");
    await expect(uploadFileButton).toHaveCSS("position", "relative");
    await expect(uploadFileButton).toHaveCSS("overflow", "hidden");
    await expect(uploadFileButton).toHaveCSS("padding", "6px 20px");
    await expect(uploadFileButton).toHaveCSS("text-align", "center");
    await expect(uploadFileButton).toHaveCSS("white-space", "nowrap");
    await expect(uploadFileInput).toHaveCSS("left", "5px");
    await expect(uploadFileInput).toHaveCSS("min-width", "100px");
    await expect(uploadFileInput).toHaveCSS("opacity", "0");
    await expect(uploadFileInput).toHaveCSS("position", "absolute");
    await expect(uploadFileInput).toHaveCSS("top", "0px");
    await expect(uploadFileInput).toHaveCSS("z-index", "2");
    await expect(uploadDroppable).toHaveClass(/help help-droppable/u);
    await expect(uploadDroppable).toHaveCSS("display", "inline");
    await expect(uploadPlain).toHaveClass(/plain/u);
    await expect(uploadPlain).toHaveCSS("display", "inline-block");
    await expect(uploadPlain).toHaveCSS("line-height", "30px");
    await expect(uploadPastable).toHaveClass(/help help-pastable/u);
    await expect(uploadPastable).toHaveCSS("display", "block");
    await expect(uploadPastable).toHaveCSS("text-align", "center");
    await expect(uploadPastable).toBeVisible();
    await expect(uploadPastable).toContainText("클립보드 이미지를 붙여 넣을 수도 있습니다");
    await expect(uploadAttachedFiles).toHaveClass(/attached-files unstyled/u);
    await expect(uploadAttachedFiles).toHaveCSS("border-top", "1px solid rgb(224, 224, 224)");
    await expect(uploadAttachedFiles).toHaveCSS("display", "none");
    await expect(uploadAttachedFiles).toHaveCSS("margin-bottom", "0px");
    await expect(uploadAttachedFiles).toHaveCSS("margin-top", "15px");
    await expect(uploadAttachedFiles).toHaveCSS("padding", "15px 0px");
    await expect(uploadHelp).toHaveClass(/help/u);
    await expect(uploadHelp).toHaveCSS("display", "none");
    await expect(uploadHelp).toHaveCSS("text-align", "right");
    await expect(uploadHelp).toContainText("표시된 파일은 글을 저장하면 첨부됩니다.");
    await expect(createWriteWrap).toHaveClass(/write-comment-wrap/u);
    await expect(createWriteWrap).toHaveCSS("position", "relative");
    await expect(createActions).toHaveClass(/right-txt/u);
    await expect(createActions).toHaveCSS("text-align", "right");
    await expect(createDynamicButton).toHaveClass(/ybtn hidden/u);
    await expect(createDynamicButton).toHaveAttribute("id", "dynamic-comment-btn");
    await expect(createDynamicButton).toHaveAttribute("type", "button");
    await expect(createDynamicButton).toHaveCSS("display", "none");
    await expect(createDynamicButton).toHaveCSS("visibility", "hidden");
    await expect(createSubmit).toHaveClass(/ybtn ybtn-success/u);
    await expect(createSubmit).toHaveAttribute("type", "submit");
    await expect(createSubmit).toHaveText("댓글 입력");
    await expect(createSubmit).toHaveCSS("background-color", "rgb(255, 115, 50)");
    await expect(createSubmit).toHaveCSS("border", "1px solid rgb(233, 94, 1)");
    await expect(createSubmit).toHaveCSS("border-radius", "3px");
    await expect(createSubmit).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px");
    await expect(createSubmit).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(createSubmit).toHaveCSS("cursor", "pointer");
    await expect(createSubmit).toHaveCSS("display", "inline-block");
    await expect(createSubmit).toHaveCSS("font-size", "14px");
    await expect(createSubmit).toHaveCSS("line-height", "20px");
    await expect(createSubmit).toHaveCSS("margin-bottom", "0px");
    await expect(createSubmit).toHaveCSS("padding", "4px 12px");
    await expect(createSubmit).toHaveCSS("position", "relative");
    await expect(createSubmit).toHaveCSS("text-align", "center");
    await expect(createSubmit).toHaveCSS("vertical-align", "middle");
    await expect(createSubmit).toHaveCSS("white-space", "nowrap");
    await expect(
      commentForm.locator(
        '[data-stylex-owner="post-detail-comment-create-write-wrap"], [data-stylex-owner="post-detail-comment-actions"], [data-stylex-owner="post-detail-comment-create-dynamic-button"], [data-stylex-owner="post-detail-comment-create-submit"]',
      ),
    ).toHaveCount(4);
    await expect(
      page.locator(
        '.comment-update-form [data-stylex-owner="post-detail-comment-create-write-wrap"], .comment-update-form [data-stylex-owner="post-detail-comment-actions"], .comment-update-form [data-stylex-owner="post-detail-comment-create-dynamic-button"], .comment-update-form [data-stylex-owner="post-detail-comment-create-submit"]',
      ),
    ).toHaveCount(0);
    await expect(
      commentForm.locator(
        '[data-stylex-owner="post-detail-comment-upload-droppable"], [data-stylex-owner="post-detail-comment-upload-plain"], [data-stylex-owner="post-detail-comment-upload-pastable"], [data-stylex-owner="post-detail-comment-upload-attached-files"], [data-stylex-owner="post-detail-comment-upload-help"]',
      ),
    ).toHaveCount(5);
    await expect(
      page.locator(
        '.comment-update-form [data-stylex-owner="post-detail-comment-upload-droppable"], .comment-update-form [data-stylex-owner="post-detail-comment-upload-plain"], .comment-update-form [data-stylex-owner="post-detail-comment-upload-pastable"], .comment-update-form [data-stylex-owner="post-detail-comment-upload-attached-files"], .comment-update-form [data-stylex-owner="post-detail-comment-upload-help"]',
      ),
    ).toHaveCount(0);
    await expect(
      commentForm.locator(
        '[data-stylex-owner="post-detail-comment-upload-wrap"], [data-stylex-owner="post-detail-comment-upload-attach-wrap"], [data-stylex-owner="post-detail-comment-upload-button-wrap"], [data-stylex-owner="post-detail-comment-upload-file-button"], [data-stylex-owner="post-detail-comment-upload-file-input"]',
      ),
    ).toHaveCount(5);
    await expect(
      page.locator(
        '.comment-update-form [data-stylex-owner="post-detail-comment-upload-wrap"], .comment-update-form [data-stylex-owner="post-detail-comment-upload-attach-wrap"], .comment-update-form [data-stylex-owner="post-detail-comment-upload-button-wrap"], .comment-update-form [data-stylex-owner="post-detail-comment-upload-file-button"], .comment-update-form [data-stylex-owner="post-detail-comment-upload-file-input"]',
      ),
    ).toHaveCount(0);
    await uploadFileButton.hover();
    await expect(uploadFileButton).toHaveCSS("background-color", "rgb(230, 230, 230)");
    await expect(uploadFileButton).toHaveCSS("color", "rgb(243, 108, 34)");
    await uploadFileInput.setInputFiles([
      {
        name: `batch-806-${viewport.width}-a.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from("batch 806 a"),
      },
      {
        name: `batch-806-${viewport.width}-b.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from("batch 806 b"),
      },
    ]);
    expect(await uploadFileInput.evaluate((input: HTMLInputElement) => input.files?.length)).toBe(
      2,
    );
    await expect(editorNav).toHaveCount(1);
    await expect(editorNavItems).toHaveCount(5);
    await expect(editTab).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-create-editor-tab-active",
    );
    await expect(previewTab).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-create-editor-tab",
    );
    await expect(checklistWrap).toHaveClass(/task-list-button/u);
    await expect(checklistButton).toHaveClass(
      /add-task-list-button ybtn ybtn-small ybtn-danger-no-outline/u,
    );
    await expect(checklistButton).toHaveText("체크리스트 추가");
    await expect(checklistIcon).toHaveClass(/yobicon-list task-list-icon/u);
    await expect(
      commentForm.locator('[data-stylex-owner^="post-detail-comment-create-checklist-"]'),
    ).toHaveCount(3);
    await expect(
      commentForm.locator('[data-stylex-owner^="post-detail-comment-update-"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('.comment-update-form [data-stylex-owner^="post-detail-comment-create-"]'),
    ).toHaveCount(0);
    await expect(textareaBox).toHaveCount(1);
    await expect(textarea).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-create-textarea",
    );
    await expect(textareaBox).toHaveCSS("display", "block");
    await expect(textareaBox).toHaveCSS("margin", "0px");
    await expect(textareaBox).toHaveCSS("padding", "0px 14px 0px 0px");
    await expect(textareaBox).toHaveCSS("position", "relative");
    await expect(textarea).toHaveCSS("border-radius", "2px");
    await expect(textarea).toHaveCSS("box-shadow", "none");
    await expect(textarea).toHaveCSS("font-size", viewport.width === 390 ? "16px" : "12px");
    await expect(textarea).toHaveCSS("height", "160px");
    await expect(textarea).toHaveCSS("margin", "0px");
    await expect(textarea).toHaveCSS("resize", "vertical");
    await textarea.focus();
    await expect(textarea).toHaveCSS("border-color", "rgb(243, 108, 34)");
    await expect(
      page.locator(
        '.comment-update-form [data-stylex-owner^="post-detail-comment-create-checklist-"]',
      ),
    ).toHaveCount(0);
    await expect(
      page.locator(
        '.comment-update-form [data-stylex-owner="post-detail-comment-create-editor-nav"], .comment-update-form [data-stylex-owner="post-detail-comment-create-editor-nav-item"], .comment-update-form [data-stylex-owner="post-detail-comment-create-editor-tab"], .comment-update-form [data-stylex-owner="post-detail-comment-create-editor-tab-active"]',
      ),
    ).toHaveCount(0);
    const metrics = await commentForm.evaluate((form) => {
      const measureElement = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          bottom: rect.bottom,
          display: style.display,
          height: rect.height,
          left: rect.left,
          overflow: style.overflow,
          position: style.position,
          right: rect.right,
          textAlign: style.textAlign,
          top: rect.top,
          visibility: style.visibility,
          width: rect.width,
        };
      };
      const measure = (selector: string) => {
        const element = form.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return measureElement(element);
      };
      return {
        createForm: measureElement(form),
        createWriteBox: measure('[data-stylex-owner="post-detail-comment-create-write-box"]'),
        createShellOrder: Array.from(
          form.querySelector<HTMLElement>(
            ':scope > [data-stylex-owner="post-detail-comment-create-write-box"]',
          )!.children,
        ).map((element) => ({
          className: element.className,
          owner: element.getAttribute("data-stylex-owner"),
          tagName: element.tagName.toLowerCase(),
        })),
        clearTemporary: measure('[data-stylex-owner="post-detail-comment-create-clear-temporary"]'),
        editPane: measure("#edit-contents"),
        editor: measure(".write-comment-box > .mt10"),
        help: measure(".markdown-help"),
        noticeLabel: measure(
          '[data-stylex-owner="post-detail-comment-create-editor-notice-label"]',
        ),
        editorNav: measure('[data-stylex-owner="post-detail-comment-create-editor-nav"]'),
        editorItems: Array.from(
          form.querySelectorAll<HTMLElement>(
            ':scope [data-stylex-owner="post-detail-comment-create-editor-nav"] > [data-stylex-owner="post-detail-comment-create-editor-nav-item"]',
          ),
        ).map((item) => ({
          float: getComputedStyle(item).float,
          marginBottom: getComputedStyle(item).marginBottom,
        })),
        editTab: measure('[data-stylex-owner="post-detail-comment-create-editor-tab-active"]'),
        previewTab: measure('[data-stylex-owner="post-detail-comment-create-editor-tab"]'),
        checklistWrap: measure('[data-stylex-owner="post-detail-comment-create-checklist-wrap"]'),
        checklistButton: measure(
          '[data-stylex-owner="post-detail-comment-create-checklist-button"]',
        ),
        checklistIcon: measure('[data-stylex-owner="post-detail-comment-create-checklist-icon"]'),
        order: Array.from(form.querySelectorAll(":scope .nav-tabs > li")).map((item) =>
          item.textContent?.trim(),
        ),
        previewPane: measure("#preview-contents"),
        tabContent: measure(".tab-content"),
        textarea: measure("textarea.editorSeries"),
        textareaBox: measure('[data-stylex-owner="post-detail-comment-create-textarea-box"]'),
        upload: measure('[data-stylex-owner="post-detail-comment-upload-wrap"]'),
        uploadAttach: measure('[data-stylex-owner="post-detail-comment-upload-attach-wrap"]'),
        uploadButtonWrap: measure('[data-stylex-owner="post-detail-comment-upload-button-wrap"]'),
        uploadFileButton: measure('[data-stylex-owner="post-detail-comment-upload-file-button"]'),
        uploadFileInput: measure('[data-stylex-owner="post-detail-comment-upload-file-input"]'),
        uploadDroppable: measure('[data-stylex-owner="post-detail-comment-upload-droppable"]'),
        uploadPlain: measure('[data-stylex-owner="post-detail-comment-upload-plain"]'),
        uploadPastable: measure('[data-stylex-owner="post-detail-comment-upload-pastable"]'),
        uploadAttachedFiles: measure(
          '[data-stylex-owner="post-detail-comment-upload-attached-files"]',
        ),
        uploadHelp: measure('[data-stylex-owner="post-detail-comment-upload-help"]'),
        createWriteWrap: measure('[data-stylex-owner="post-detail-comment-create-write-wrap"]'),
        createActions: measure('[data-stylex-owner="post-detail-comment-actions"]'),
        createDynamicButton: measure(
          '[data-stylex-owner="post-detail-comment-create-dynamic-button"]',
        ),
        createSubmit: measure('[data-stylex-owner="post-detail-comment-create-submit"]'),
        createActionOrder: Array.from(
          form.querySelectorAll<HTMLElement>(
            '[data-stylex-owner="post-detail-comment-actions"] > [data-stylex-owner]',
          ),
        ).map((element) => element.dataset.stylexOwner),
        uploadResidualOrder: Array.from(
          form.querySelectorAll<HTMLElement>(
            '[data-stylex-owner="post-detail-comment-upload-droppable"], [data-stylex-owner="post-detail-comment-upload-plain"], [data-stylex-owner="post-detail-comment-upload-pastable"], [data-stylex-owner="post-detail-comment-upload-attached-files"], [data-stylex-owner="post-detail-comment-upload-help"]',
          ),
        ).map((element) => element.dataset.stylexOwner),
      };
    });

    expect(metrics.tabContent).toMatchObject({ overflow: "visible", position: "relative" });
    expect(metrics.createShellOrder).toHaveLength(3);
    expect(metrics.createShellOrder[0]).toMatchObject({ tagName: "div" });
    expect(metrics.createShellOrder[0]?.className).toContain("mt10");
    expect(metrics.createShellOrder[1]).toMatchObject({
      owner: "post-detail-comment-upload-wrap",
      tagName: "div",
    });
    expect(metrics.createShellOrder[2]).toMatchObject({
      owner: "post-detail-comment-create-write-wrap",
      tagName: "div",
    });
    expect(metrics.createWriteBox.left).toBeGreaterThanOrEqual(metrics.createForm.left);
    expect(metrics.createWriteBox.right).toBeLessThanOrEqual(metrics.createForm.right);
    expect(metrics.createWriteBox.top).toBeGreaterThanOrEqual(metrics.createForm.top);
    expect(metrics.createWriteBox.bottom).toBeLessThanOrEqual(metrics.createForm.bottom);
    expect(metrics.editor.left).toBeGreaterThanOrEqual(metrics.createWriteBox.left);
    expect(metrics.editor.right).toBeLessThanOrEqual(metrics.createWriteBox.right);
    expect(metrics.upload.left).toBeGreaterThanOrEqual(metrics.createWriteBox.left);
    expect(metrics.upload.right).toBeLessThanOrEqual(metrics.createWriteBox.right);
    expect(metrics.createWriteWrap.left).toBeGreaterThanOrEqual(metrics.createWriteBox.left);
    expect(metrics.createWriteWrap.right).toBeLessThanOrEqual(metrics.createWriteBox.right);
    expect(metrics.editor.bottom).toBeLessThanOrEqual(metrics.upload.top);
    expect(metrics.upload.bottom).toBeLessThanOrEqual(metrics.createWriteWrap.top);
    expect(metrics.textarea.left).toBeGreaterThanOrEqual(metrics.textareaBox.left);
    expect(metrics.textarea.right).toBeLessThanOrEqual(metrics.textareaBox.right);
    expect(metrics.textarea.top).toBeGreaterThanOrEqual(metrics.textareaBox.top);
    expect(metrics.textarea.bottom).toBeLessThanOrEqual(metrics.textareaBox.bottom);
    expect(metrics.textareaBox.bottom).toBeLessThanOrEqual(metrics.upload.top);
    expect(metrics.uploadAttach.left).toBeGreaterThanOrEqual(metrics.upload.left);
    expect(metrics.uploadAttach.right).toBeLessThanOrEqual(metrics.upload.right);
    expect(metrics.uploadButtonWrap.left).toBeGreaterThanOrEqual(metrics.uploadAttach.left);
    expect(metrics.uploadButtonWrap.right).toBeLessThanOrEqual(metrics.uploadAttach.right);
    expect(metrics.uploadFileButton.left).toBeGreaterThanOrEqual(metrics.uploadButtonWrap.left);
    expect(metrics.uploadFileButton.right).toBeLessThanOrEqual(metrics.uploadButtonWrap.right);
    expect(metrics.uploadFileInput.left).toBeGreaterThan(metrics.uploadFileButton.left);
    expect(metrics.uploadFileInput.right).toBeGreaterThanOrEqual(metrics.uploadFileButton.right);
    expect(metrics.uploadFileInput.top).toBe(metrics.uploadFileButton.top);
    expect(metrics.uploadFileInput.bottom).toBeGreaterThanOrEqual(metrics.uploadFileButton.bottom);
    expect(metrics.uploadFileButton.overflow).toBe("hidden");
    expect(metrics.uploadFileInput.width).toBeGreaterThanOrEqual(100);
    expect(metrics.uploadResidualOrder).toEqual([
      "post-detail-comment-upload-droppable",
      "post-detail-comment-upload-plain",
      "post-detail-comment-upload-pastable",
      "post-detail-comment-upload-attached-files",
      "post-detail-comment-upload-help",
    ]);
    expect(metrics.uploadDroppable.right).toBeLessThanOrEqual(metrics.uploadButtonWrap.left);
    expect(
      metrics.uploadButtonWrap.right <= metrics.uploadPlain.left ||
        metrics.uploadButtonWrap.bottom <= metrics.uploadPlain.top ||
        metrics.uploadPlain.bottom <= metrics.uploadButtonWrap.top,
    ).toBe(true);
    expect(metrics.uploadDroppable.top).toBeLessThan(metrics.uploadButtonWrap.bottom);
    expect(metrics.uploadDroppable.bottom).toBeGreaterThan(metrics.uploadButtonWrap.top);
    if (viewport.width === 390) {
      expect((metrics.uploadPlain.left + metrics.uploadPlain.right) / 2).toBeCloseTo(
        (metrics.uploadAttach.left + metrics.uploadAttach.right) / 2,
        1,
      );
    } else {
      expect(metrics.uploadPlain.top).toBeLessThan(metrics.uploadButtonWrap.bottom);
      expect(metrics.uploadPlain.bottom).toBeGreaterThan(metrics.uploadButtonWrap.top);
    }
    expect(
      metrics.uploadDroppable.right <= metrics.uploadPlain.left ||
        metrics.uploadDroppable.bottom <= metrics.uploadPlain.top ||
        metrics.uploadPlain.bottom <= metrics.uploadDroppable.top,
    ).toBe(true);
    expect(metrics.uploadPastable.width).toBeGreaterThan(0);
    expect(metrics.uploadPastable.height).toBeGreaterThan(0);
    expect(metrics.uploadPastable.left).toBeCloseTo(metrics.uploadAttach.left, 1);
    expect(metrics.uploadPastable.right).toBeCloseTo(metrics.uploadAttach.right, 1);
    expect(metrics.uploadPastable.width).toBeCloseTo(metrics.uploadAttach.width, 1);
    expect(metrics.uploadPastable.top).toBeGreaterThanOrEqual(metrics.uploadButtonWrap.bottom);
    expect(metrics.uploadPastable.top).toBeGreaterThanOrEqual(metrics.uploadPlain.bottom);
    for (const hidden of [metrics.uploadAttachedFiles, metrics.uploadHelp]) {
      expect(hidden).toMatchObject({ display: "none", height: 0, width: 0 });
      expect(hidden.left).toBe(0);
      expect(hidden.right).toBe(0);
      expect(hidden.top).toBe(0);
      expect(hidden.bottom).toBe(0);
    }
    expect(metrics.createActionOrder).toEqual([
      "post-detail-comment-create-dynamic-button",
      "post-detail-comment-create-submit",
    ]);
    expect(metrics.createWriteWrap.position).toBe("relative");
    expect(metrics.createActions.textAlign).toBe("right");
    expect(metrics.createDynamicButton).toMatchObject({
      display: "none",
      height: 0,
      visibility: "hidden",
      width: 0,
    });
    expect(metrics.createDynamicButton.left).toBe(0);
    expect(metrics.createDynamicButton.right).toBe(0);
    expect(metrics.createDynamicButton.top).toBe(0);
    expect(metrics.createDynamicButton.bottom).toBe(0);
    expect(metrics.createSubmit.left).toBeGreaterThanOrEqual(metrics.createActions.left);
    expect(metrics.createSubmit.right).toBeLessThanOrEqual(metrics.createActions.right);
    expect(metrics.createSubmit.top).toBeGreaterThanOrEqual(metrics.createActions.top);
    expect(metrics.createSubmit.bottom).toBeLessThanOrEqual(metrics.createActions.bottom);
    expect(metrics.createActions.left).toBeGreaterThanOrEqual(metrics.createWriteWrap.left);
    expect(metrics.createActions.right).toBeLessThanOrEqual(metrics.createWriteWrap.right);
    expect(metrics.createActions.top).toBeGreaterThanOrEqual(metrics.createWriteWrap.top);
    expect(metrics.createActions.bottom).toBeLessThanOrEqual(metrics.createWriteWrap.bottom);
    expect(metrics.createWriteWrap.top).toBeGreaterThanOrEqual(metrics.upload.bottom);
    expect(metrics.clearTemporary).toMatchObject({ display: "none", height: 0 });
    expect(metrics.clearTemporary.left).toBe(0);
    expect(metrics.clearTemporary.right).toBe(0);
    expect(metrics.clearTemporary.top).toBe(0);
    expect(metrics.noticeLabel.display).toBe("block");
    await expect(noticeLabel).toHaveCSS("padding", "4px 15px");
    expect(metrics.noticeLabel.height).toBeGreaterThan(0);
    expect(metrics.noticeLabel.width).toBeGreaterThanOrEqual(30);
    expect(metrics.order).toEqual(["편집", "미리보기", "체크리스트 추가", "복구된 본문 삭제", ""]);
    await expect(editorNav).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
    await expect(editorNav).toHaveCSS("height", "29px");
    await expect(editorNav).toHaveCSS("list-style-type", "none");
    await expect(editorNav).toHaveCSS("margin", "0px");
    await expect(editorNav).toHaveCSS("padding", "0px");
    expect(metrics.editorItems).toEqual(
      Array.from({ length: 5 }, () => ({ float: "left", marginBottom: "-2px" })),
    );
    await expect(editTab).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(editTab).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
    await expect(editTab).toHaveCSS("color", "rgb(85, 85, 85)");
    await expect(editTab).toHaveCSS("cursor", "default");
    await expect(previewTab).toHaveCSS("color", "rgb(53, 146, 181)");
    await expect(previewTab).toHaveCSS("display", "block");
    await expect(previewTab).toHaveCSS("font-weight", "700");
    await expect(previewTab).toHaveCSS("padding", viewport.width === 390 ? "4px 5px" : "4px 15px");
    expect(metrics.editTab.right).toBeLessThanOrEqual(metrics.previewTab.left);
    expect(metrics.editTab.top).toBeCloseTo(metrics.previewTab.top, 1);
    expect(metrics.editTab.bottom).toBeCloseTo(metrics.previewTab.bottom, 1);
    expect(metrics.editTab.left).toBeGreaterThanOrEqual(metrics.editorNav.left);
    expect(metrics.previewTab.right).toBeLessThanOrEqual(metrics.editorNav.right);
    await expect(checklistWrap).toHaveCSS("margin-top", "2px");
    await expect(checklistButton).toHaveCSS("background-color", "rgb(238, 238, 238)");
    await expect(checklistButton).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");
    await expect(checklistButton).toHaveCSS("border-radius", "3px");
    await expect(checklistButton).toHaveCSS("box-shadow", "none");
    await expect(checklistButton).toHaveCSS("color", "rgb(102, 102, 102)");
    await expect(checklistButton).toHaveCSS("display", "inline-block");
    await expect(checklistButton).toHaveCSS("font-size", "13px");
    await expect(checklistButton).toHaveCSS("font-weight", "600");
    await expect(checklistButton).toHaveCSS("line-height", "20px");
    await expect(checklistButton).toHaveCSS("margin-top", "1px");
    await expect(checklistButton).toHaveCSS("padding", "1px 10px");
    await expect(checklistButton).toHaveCSS("position", "relative");
    await expect(checklistButton).toHaveCSS("vertical-align", "middle");
    await expect(checklistIcon).toHaveCSS("background-image", "none");
    await expect(checklistIcon).toHaveCSS("display", "inline-block");
    await expect(checklistIcon).toHaveCSS("font-family", "yobicon");
    await expect(checklistIcon).toHaveCSS("font-style", "normal");
    await expect(checklistIcon).toHaveCSS("font-variant", "normal");
    await expect(checklistIcon).toHaveCSS("font-weight", "400");
    await expect(checklistIcon).toHaveCSS("line-height", "20px");
    await expect(checklistIcon).toHaveCSS("text-decoration-line", "none");
    await expect(checklistIcon).toHaveCSS("vertical-align", "baseline");
    expect(await checklistIcon.evaluate((icon) => getComputedStyle(icon, "::before").content)).toBe(
      '""',
    );
    expect(metrics.previewTab.right).toBeLessThanOrEqual(metrics.checklistButton.left);
    expect(metrics.checklistWrap.left).toBeGreaterThanOrEqual(metrics.editorNav.left);
    expect(metrics.checklistWrap.right).toBeLessThanOrEqual(metrics.editorNav.right);
    expect(metrics.checklistButton.left).toBeGreaterThanOrEqual(metrics.checklistWrap.left);
    expect(metrics.checklistButton.right).toBeLessThanOrEqual(metrics.checklistWrap.right);
    expect(metrics.checklistIcon.left).toBeGreaterThanOrEqual(metrics.checklistButton.left);
    expect(metrics.checklistIcon.right).toBeLessThanOrEqual(metrics.checklistButton.right);
    expect(metrics.checklistButton.top - metrics.editTab.top).toBeCloseTo(3, 1);
    expect(metrics.checklistButton.bottom).toBeLessThanOrEqual(metrics.editTab.bottom);
    expect(metrics.checklistButton.bottom).toBeLessThanOrEqual(metrics.editorNav.bottom);
    expect(metrics.editPane.display).toBe("block");
    expect(metrics.previewPane.display).toBe("none");
    expect(metrics.previewPane.height).toBe(0);
    expect(metrics.help.height).toBeCloseTo(viewport.markdownHelpHeight, 1);
    expect(metrics.editor.bottom).toBeCloseTo(metrics.upload.top, 5);
    expect(metrics.editor.left).toBeLessThanOrEqual(metrics.upload.left);
    expect(metrics.editor.right).toBeGreaterThanOrEqual(metrics.upload.right);
    expect(metrics.editPane.bottom).toBeCloseTo(metrics.upload.top, 5);
    expect(metrics.textarea.bottom).toBeLessThanOrEqual(metrics.upload.top);
    expect(metrics.tabContent.bottom).toBeCloseTo(metrics.upload.top, 5);
    expect(metrics.upload.top).toBeGreaterThanOrEqual(metrics.editor.top);

    await textarea.fill("Boundary **preview**");
    const urlBeforePreview = page.url();
    const valueBeforeSubmitStates = await textarea.inputValue();
    await createSubmit.hover();
    await expect(createSubmit).toHaveCSS("background-color", "rgb(233, 94, 1)");
    await expect(createSubmit).toHaveCSS("border-color", "rgb(233, 94, 1)");
    await expect(createSubmit).toHaveCSS("color", "rgb(255, 255, 255)");
    expect(page.url()).toBe(urlBeforePreview);
    await expect(textarea).toHaveValue(valueBeforeSubmitStates);
    await createSubmit.focus();
    await expect(createSubmit).toBeFocused();
    await expect(createSubmit).toHaveCSS("background-color", "rgb(233, 94, 1)");
    expect(page.url()).toBe(urlBeforePreview);
    await expect(textarea).toHaveValue(valueBeforeSubmitStates);
    await createSubmit.hover();
    await page.mouse.down();
    await expect(createSubmit).toHaveCSS("background-color", "rgb(233, 94, 1)");
    await expect(createSubmit).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.mouse.move(0, 0);
    await page.mouse.up();
    expect(page.url()).toBe(urlBeforePreview);
    await expect(textarea).toHaveValue(valueBeforeSubmitStates);
    await previewTab.click();
    await expect(editPane).toHaveCSS("display", "none");
    await expect(previewPane).toHaveCSS("display", "block");
    await expect(previewTab).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-create-editor-tab-active",
    );
    await expect(editTab).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-create-editor-tab",
    );
    expect(page.url()).toBe(urlBeforePreview);

    const checklistValue = await textarea.inputValue();
    await checklistButton.hover();
    await expect(checklistButton).toHaveCSS("background-color", "rgb(251, 233, 231)");
    await expect(checklistButton).toHaveCSS("border-color", "rgb(239, 154, 154)");
    await expect(checklistButton).toHaveCSS("color", "rgb(201, 52, 38)");
    await checklistButton.focus();
    await expect(checklistButton).toBeFocused();
    await expect(checklistButton).toHaveCSS("background-color", "rgb(251, 233, 231)");
    await expect(checklistButton).toHaveCSS("border-color", "rgb(239, 154, 154)");
    await checklistButton.click();
    await expect(checklistButton).toBeFocused();
    await expect(textarea).toHaveValue(checklistValue);
    expect(page.url()).toBe(urlBeforePreview);
    await expect(previewPane.locator(".markdown-preview")).toBeVisible();
    await expect(previewPane.locator("strong")).toHaveText("preview");
    await editTab.click();
    await expect(editPane).toHaveCSS("display", "block");
    await expect(previewPane).toHaveCSS("display", "none");
    await expect(textarea).toHaveValue("Boundary **preview**");
    await expect(editTab).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-create-editor-tab-active",
    );
    expect(page.url()).toBe(urlBeforePreview);

    const restoredBoundary = await commentForm.evaluate((form) => {
      const editor = form.querySelector<HTMLElement>(".write-comment-box > .mt10")!;
      const upload = form.querySelector<HTMLElement>("#upload")!;
      return {
        editorBottom: editor.getBoundingClientRect().bottom,
        uploadTop: upload.getBoundingClientRect().top,
      };
    });
    expect(restoredBoundary.editorBottom).toBeCloseTo(restoredBoundary.uploadTop, 5);
  }
});

test("project board detail owns parent comment action and reply controls in StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyChildCommentsSource = readFileSync(
    "../yona-original/app/views/common/childComments.scala.html",
    "utf8",
  );
  const legacyChildCommentFormSource = readFileSync(
    "../yona-original/app/views/common/child_commentForm.scala.html",
    "utf8",
  );
  const legacyBootstrapSource = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );

  expect(legacyCommentsSource).toContain('<span class="act-row pull-right">');
  expect(legacyChildCommentsSource).toContain(
    '<div class="add-a-comment pull-right">@Messages("comment.oneline.comment.placeholder")</div>',
  );
  expect(legacyCommentsSource).toContain(
    "@common.childComments(post, comment, ResourceType.NONISSUE_COMMENT)",
  );
  expect(legacyChildCommentsSource).toContain(
    "@common.child_commentForm(posting.asResource(), resourceType, getNewCommentUrl, currentComment.id)",
  );
  expect(legacyChildCommentFormSource).toMatch(
    /<div class="notification-receiver">\s*<span class="notification-receiver-title">@Messages\("notification\.receiver\.list\.title"\)<\/span>\s*<span class="notification-receiver-list"><\/span>\s*<\/div>/u,
  );
  expect(legacyBootstrapSource).toMatch(/\.pull-right\s*\{\s*float:\s*right;\s*\}/u);
  expect(legacyPageSource).toMatch(
    /\.add-a-comment\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?background-color:\s*#fff;[\s\S]*?position:\s*relative;[\s\S]*?right:\s*10px;[\s\S]*?color:\s*#00b0e8;[\s\S]*?border:\s*1px solid #00b0e8;[\s\S]*?margin-top:\s*-32px;[\s\S]*?padding:\s*0 5px;[\s\S]*?border-radius:\s*3px;[\s\S]*?display:\s*none;[\s\S]*?z-index:\s*2;[\s\S]*?&:hover\s*\{[\s\S]*?box-shadow:\s*1px 1px 2px #e0e0e0;[\s\S]*?cursor:\s*pointer;[\s\S]*?display:\s*block;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.child-comment-input-form\s*\{\s*\.notification-receiver\s*\{\s*margin-left:\s*12px;\s*border-bottom-left-radius:\s*3px;\s*border-bottom-right-radius:\s*3px;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.notification-receiver\s*\{\s*background-color:\s*#F7F7F7;\s*display:\s*none;\s*text-align:\s*start;\s*padding:\s*5px 5px 5px 10px;[\s\S]*?\.notification-receiver-title\s*\{\s*color:\s*#999;/u,
  );
  expect(legacyYobiSource.match(/^@import "less\/_.*\.less";$/gmu)).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]);
  expect(styleSource).toMatch(/commentActionRow:\s*\{\s*float:\s*"right"\s*\}/u);
  expect(styleSource).toMatch(
    /childCommentReply:\s*\{[\s\S]*?fontSize:\s*"12px"[\s\S]*?backgroundColor:\s*"#fff"[\s\S]*?position:\s*"relative"[\s\S]*?right:\s*"10px"[\s\S]*?color:\s*"#00b0e8"[\s\S]*?border:\s*"1px solid #00b0e8"[\s\S]*?marginTop:\s*"-32px"[\s\S]*?padding:\s*"0 5px"[\s\S]*?borderRadius:\s*"3px"[\s\S]*?float:\s*"right"[\s\S]*?zIndex:\s*2[\s\S]*?":hover":\s*\{[\s\S]*?boxShadow:\s*"1px 1px 2px #e0e0e0"[\s\S]*?cursor:\s*"pointer"[\s\S]*?display:\s*"block"/u,
  );
  expect(styleSource).toMatch(/childCommentReplyHidden:\s*\{\s*display:\s*"none"\s*\}/u);
  expect(styleSource).toMatch(/childCommentReplyVisible:\s*\{\s*display:\s*"block"\s*\}/u);
  expect(styleSource).toMatch(
    /childCommentNotificationReceiver:\s*\{\s*borderBottomLeftRadius:\s*"3px",\s*borderBottomRightRadius:\s*"3px",\s*marginLeft:\s*"12px",\s*\}/u,
  );
  expect(routeSource).toContain(
    "styles.commentCreateNotificationReceiver,\n    styles.childCommentNotificationReceiver,",
  );
  expect(routeSource).toContain("styles.commentCreateNotificationReceiverTitle");
  expect(routeSource.match(/data-stylex-owner="post-detail-comment-action-row"/g)).toHaveLength(1);
  expect(routeSource.match(/data-stylex-owner="post-detail-child-comment-reply"/g)).toHaveLength(1);
  expect(
    routeSource.match(/data-stylex-owner="post-detail-child-comment-notification-receiver"/g),
  ).toHaveLength(1);
  expect(
    routeSource.match(/data-stylex-owner="post-detail-child-comment-notification-receiver-title"/g),
  ).toHaveLength(1);
  expect(routeSource).not.toMatch(/className="act-row pull-right"/u);
  expect(routeSource).not.toMatch(/className="add-a-comment pull-right"/u);
  expect(routeSource).not.toMatch(/style=\{|style:\s*\{/u);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await mockProjectPosts(page, "comment");
    await page.goto(`${basePath}/admin/sample/post/3`);

    const comment = page.locator("#comment-21");
    const actionRow = comment.locator('[data-stylex-owner="post-detail-comment-action-row"]');
    const reply = comment.locator('[data-stylex-owner="post-detail-child-comment-reply"]');
    const form = comment.locator(".child-comment-input-form");
    await expect(actionRow).toHaveCount(1);
    await expect(reply).toHaveCount(1);
    await expect(reply).toHaveText("Reply");
    await expect(reply).not.toHaveClass(/\bpull-right\b/u);
    await expect(actionRow).not.toHaveClass(/\bpull-right\b/u);
    await expect(reply).toHaveCSS("display", "none");

    await comment.hover();
    await expect(reply).toHaveCSS("display", "block");
    const metrics = await comment.evaluate((element) => {
      const action = element.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-comment-action-row"]',
      )!;
      const replyControl = element.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-child-comment-reply"]',
      )!;
      const edit = action.querySelector<HTMLElement>('[title="Edit comment"]')!;
      const remove = action.querySelector<HTMLElement>('[title="Delete comment"]')!;
      const commentRect = element.getBoundingClientRect();
      const actionRect = action.getBoundingClientRect();
      const replyRect = replyControl.getBoundingClientRect();
      const editRect = edit.getBoundingClientRect();
      const removeRect = remove.getBoundingClientRect();
      const replyStyle = getComputedStyle(replyControl);
      return {
        actionFloat: getComputedStyle(action).float,
        actionContained:
          actionRect.left >= commentRect.left && actionRect.right <= commentRect.right + 0.5,
        editBeforeDelete: edit.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING,
        actionsDoNotOverlap: editRect.right <= removeRect.left,
        replyContained:
          replyRect.left >= commentRect.left && replyRect.right <= commentRect.right + 0.5,
        replyFloat: replyStyle.float,
        replyFontSize: replyStyle.fontSize,
        replyBackgroundColor: replyStyle.backgroundColor,
        replyPosition: replyStyle.position,
        replyRight: replyStyle.right,
        replyColor: replyStyle.color,
        replyBorder: replyStyle.border,
        replyMarginTop: replyStyle.marginTop,
        replyPadding: replyStyle.padding,
        replyBorderRadius: replyStyle.borderRadius,
        replyDisplay: replyStyle.display,
        replyZIndex: replyStyle.zIndex,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(metrics).toMatchObject({
      actionFloat: "right",
      actionContained: true,
      actionsDoNotOverlap: true,
      replyContained: true,
      replyFloat: "right",
      replyFontSize: "12px",
      replyBackgroundColor: "rgb(255, 255, 255)",
      replyPosition: "relative",
      replyRight: "10px",
      replyColor: "rgb(0, 176, 232)",
      replyBorder: "1px solid rgb(0, 176, 232)",
      replyMarginTop: "-32px",
      replyPadding: "0px 5px",
      replyBorderRadius: "3px",
      replyDisplay: "block",
      replyZIndex: "2",
    });
    expect(metrics.editBeforeDelete).toBeTruthy();
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);

    await reply.hover();
    await expect(reply).toHaveCSS("cursor", "pointer");
    await expect(reply).toHaveCSS("box-shadow", "rgb(224, 224, 224) 1px 1px 2px 0px");
    await page.mouse.move(1, 1);
    await expect(reply).toHaveCSS("display", "none");

    await comment.hover();
    await reply.click();
    await expect(form).toBeVisible();
    const childReplyForm = form.locator(":scope > form");
    const textarea = form.locator("textarea[name='contents']");
    const receiver = childReplyForm.locator(
      ':scope > [data-stylex-owner="post-detail-child-comment-notification-receiver"].notification-receiver',
    );
    const receiverTitle = receiver.locator(
      ':scope > [data-stylex-owner="post-detail-child-comment-notification-receiver-title"].notification-receiver-title',
    );
    await expect(textarea).toBeFocused();
    await expect(form.locator(".parentCommentId")).toHaveValue("21");
    await expect(form.locator("button[type='submit']")).toHaveText("OK");
    await expect(receiver).toHaveCount(1);
    await expect(receiverTitle).toHaveText("Notification receivers");
    await expect(receiver.locator(":scope > .notification-receiver-list")).toBeEmpty();
    await expect(receiver).not.toHaveAttribute("style");
    await expect(receiverTitle).not.toHaveAttribute("style");
    await expect(
      page.locator(
        '[data-stylex-owner="post-detail-child-comment-notification-receiver"], [data-stylex-owner="post-detail-child-comment-notification-receiver-title"]',
      ),
    ).toHaveCount(2);
    await expect(
      page.locator(
        '#comment-form [data-stylex-owner^="post-detail-child-comment-notification-receiver"], .comment-update-form [data-stylex-owner^="post-detail-child-comment-notification-receiver"]',
      ),
    ).toHaveCount(0);
    await expect(
      form.locator(
        '[data-stylex-owner^="post-detail-comment-create-notification-receiver"], [data-stylex-owner^="post-detail-comment-update-notification-receiver"]',
      ),
    ).toHaveCount(0);

    const receiverMetrics = async () =>
      receiver.evaluate((element) => {
        const title = element.querySelector<HTMLElement>(
          ':scope > [data-stylex-owner="post-detail-child-comment-notification-receiver-title"]',
        )!;
        const list = element.querySelector<HTMLElement>(":scope > .notification-receiver-list")!;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          backgroundColor: style.backgroundColor,
          borderBottomLeftRadius: style.borderBottomLeftRadius,
          borderBottomRightRadius: style.borderBottomRightRadius,
          childOrder: Array.from(element.children).map((child) =>
            child.classList.contains("notification-receiver-title")
              ? "notification-receiver-title"
              : "notification-receiver-list",
          ),
          display: style.display,
          height: rect.height,
          listText: list.textContent,
          marginLeft: style.marginLeft,
          padding: style.padding,
          textAlign: style.textAlign,
          titleColor: getComputedStyle(title).color,
          width: rect.width,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });
    await textarea.blur();
    const blurredReceiverMetrics = await receiverMetrics();
    expect(blurredReceiverMetrics).toMatchObject({
      backgroundColor: "rgb(247, 247, 247)",
      borderBottomLeftRadius: "3px",
      borderBottomRightRadius: "3px",
      childOrder: ["notification-receiver-title", "notification-receiver-list"],
      display: "none",
      height: 0,
      listText: "",
      marginLeft: "12px",
      padding: "5px 5px 5px 10px",
      textAlign: "start",
      titleColor: "rgb(153, 153, 153)",
      width: 0,
    });
    expect(blurredReceiverMetrics.documentWidth).toBeLessThanOrEqual(
      blurredReceiverMetrics.viewportWidth,
    );
    await textarea.focus();
    await expect(textarea).toBeFocused();
    expect(await receiverMetrics()).toMatchObject({ display: "none", height: 0, width: 0 });
    await reply.click();
    await expect(form).toBeHidden();
  }
});

test("project board detail submits legacy comment form through REST", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const batch811RouteSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const batch811StyleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyCommentFormSource = readFileSync(
    "../yona-original/app/views/common/commentForm.scala.html",
    "utf8",
  );
  const legacyEditorSource = readFileSync(
    "../yona-original/app/views/common/editor.scala.html",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  expect(legacyCommentFormSource).toContain('@common.editor("contents","","","comment-body")');
  expect(legacyEditorSource).toMatch(
    /<div class="notification-receiver">\s*<span class="notification-receiver-title">@Messages\("notification\.receiver\.list\.title"\)<\/span>\s*<span class="notification-receiver-list"><\/span>\s*<\/div>/u,
  );
  expect(legacyPageSource).toMatch(
    /\.notification-receiver\s*\{\s*background-color:\s*#F7F7F7;\s*display:\s*none;\s*text-align:\s*start;\s*padding:\s*5px 5px 5px 10px;[\s\S]*?\.notification-receiver-title\s*\{\s*color:\s*#999;/u,
  );
  expect(legacyYobiSource).toContain('@import "less/_page.less";');
  for (const owner of [
    "post-detail-comment-create-notification-receiver",
    "post-detail-comment-create-notification-receiver-title",
  ]) {
    expect(batch811RouteSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  expect(batch811StyleSource).toMatch(
    /commentCreateNotificationReceiver:\s*\{\s*backgroundColor:\s*"#F7F7F7",\s*display:\s*"none",\s*padding:\s*"5px 5px 5px 10px",\s*textAlign:\s*"start",\s*\}/u,
  );
  expect(batch811StyleSource).toContain(
    'commentCreateNotificationReceiverTitle: { color: "#999999" }',
  );
  const { commentCreateRequests } = await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
  const elevator = page.locator(".jq-elevator");
  await expect(elevator).toHaveCount(1);
  await expect(elevator).toHaveClass("jq-elevator align-bottom align-right rounded glass");
  const elevatorTop = elevator.locator('.jq-top[title="Move to Top"]');
  await expect(elevatorTop).toBeHidden();
  await expect(elevatorTop).toHaveClass(/jq-sml/u);
  const elevatorBottom = elevator.locator('.jq-bottom.jq-big[title="Move to Bottom"]');
  await expect(elevatorBottom).toBeVisible();
  const initialElevatorBoxes = await page.evaluate(() => {
    const top = document.querySelector(".jq-elevator .jq-top");
    const bottom = document.querySelector(".jq-elevator .jq-bottom");
    if (!top || !bottom) return null;
    const topBox = top.getBoundingClientRect();
    const bottomBox = bottom.getBoundingClientRect();
    return {
      bottomHeight: bottomBox.height,
      bottomOpacity: getComputedStyle(bottom).opacity,
      bottomWidth: bottomBox.width,
      topHeight: topBox.height,
      topWidth: topBox.width,
    };
  });
  expect(initialElevatorBoxes).not.toBeNull();
  expect(initialElevatorBoxes!.topWidth).toBe(0);
  expect(initialElevatorBoxes!.topHeight).toBe(0);
  expect(initialElevatorBoxes!.bottomWidth).toBeCloseTo(62, 0);
  expect(initialElevatorBoxes!.bottomHeight).toBeCloseTo(58, 0);
  expect(initialElevatorBoxes!.bottomOpacity).toBe("0.5");
  await elevatorBottom.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(elevatorTop).toHaveClass(/jq-big/u);
  await expect(elevatorTop).toBeVisible();
  const collapsedBottom = elevator.locator('.jq-bottom[title="Move to Bottom"]');
  await expect(collapsedBottom).toHaveClass(/jq-sml/u);
  await expect(collapsedBottom).toBeHidden();
  await elevatorTop.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(elevatorTop).toHaveClass(/jq-sml/u);
  await expect(collapsedBottom).toHaveClass(/jq-big/u);
  await expect(collapsedBottom).toBeVisible();
  await expect(page.locator("#comment-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/post/3/comments`,
  );
  await expect(page.locator("#comment-form")).toHaveAttribute("method", "post");
  await expect(page.locator("#comment-form")).toHaveAttribute("enctype", "multipart/form-data");
  await expect(page.locator('#comment-form [data-toggle="markdown-editor"]')).toHaveCount(0);
  const commentEditor = page.locator("#comment-form .mt10:has(#editor-contents-contents)");
  await expect(commentEditor).toHaveCount(1);
  const notificationReceiver = commentEditor.locator(
    ':scope > .tab-content > [data-stylex-owner="post-detail-comment-create-notification-receiver"]',
  );
  const notificationReceiverTitle = notificationReceiver.locator(
    ':scope > [data-stylex-owner="post-detail-comment-create-notification-receiver-title"]',
  );
  await expect(notificationReceiver).toHaveCount(1);
  await expect(notificationReceiver).toHaveClass(/notification-receiver/u);
  await expect(notificationReceiver).not.toHaveAttribute("style");
  await expect(notificationReceiverTitle).toHaveCount(1);
  await expect(notificationReceiverTitle).toHaveClass(/notification-receiver-title/u);
  await expect(notificationReceiverTitle).not.toHaveAttribute("style");
  await expect(notificationReceiverTitle).toHaveText("Notification receivers ");
  await expect(notificationReceiver).toHaveCSS("background-color", "rgb(247, 247, 247)");
  await expect(notificationReceiver).toHaveCSS("display", "none");
  await expect(notificationReceiver).toHaveCSS("padding", "5px 5px 5px 10px");
  await expect(notificationReceiver).toHaveCSS("text-align", "start");
  await expect(notificationReceiverTitle).toHaveCSS("color", "rgb(153, 153, 153)");
  expect(
    await notificationReceiver.evaluate((receiver) => ({
      childClasses: Array.from(receiver.children).map((child) =>
        child.classList.contains("notification-receiver-title")
          ? "notification-receiver-title"
          : "notification-receiver-list",
      ),
      height: receiver.getBoundingClientRect().height,
      previousId: receiver.previousElementSibling?.id,
      width: receiver.getBoundingClientRect().width,
    })),
  ).toEqual({
    childClasses: ["notification-receiver-title", "notification-receiver-list"],
    height: 0,
    previousId: "preview-contents",
    width: 0,
  });
  await expect(
    page.locator(
      '[data-stylex-owner="post-detail-comment-create-notification-receiver"], [data-stylex-owner="post-detail-comment-create-notification-receiver-title"]',
    ),
  ).toHaveCount(2);
  await expect(
    page.locator(
      '.comment-update-form [data-stylex-owner^="post-detail-comment-create-notification-receiver"], .child-comment-input-form [data-stylex-owner^="post-detail-comment-create-notification-receiver"]',
    ),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.locator("#comment-form textarea[name='contents']").focus();
  await expect(notificationReceiver).toHaveCSS("display", "none");
  const editorMetrics = await page
    .locator("#comment-form .mt10:has(#editor-contents-contents)")
    .evaluate((editor) => {
      const nav = editor.querySelector(".nav-tabs") as HTMLElement;
      const tabLinks = nav.querySelectorAll(":scope > li > a");
      const editButton = tabLinks[0] as HTMLAnchorElement;
      const previewButton = tabLinks[1] as HTMLAnchorElement;
      const taskButton = editor.querySelector(".add-task-list-button") as HTMLButtonElement;
      const clearButton = editor.querySelector("#button-clear-temporary") as HTMLButtonElement;
      const tabContent = editor.querySelector(".tab-content") as HTMLElement;
      const editPane = editor.querySelector("#edit-contents") as HTMLElement;
      const previewPane = editor.querySelector("#preview-contents") as HTMLElement;
      const textarea = editor.querySelector("textarea") as HTMLTextAreaElement;
      const preview = editor.querySelector(".markdown-preview") as HTMLElement;
      const markdownHelpNavItems = editor.querySelectorAll(".markdown-help-nav > li");
      const markdownHelpItems = editor.querySelectorAll(
        ".markdown-help-wrap > .markdown-help-item",
      );
      const notification = editor.querySelector(".notification-receiver") as HTMLElement;
      const notificationTitle = editor.querySelector(".notification-receiver-title") as HTMLElement;
      const navStyle = window.getComputedStyle(nav);
      const tabContentStyle = window.getComputedStyle(tabContent);
      const editPaneStyle = window.getComputedStyle(editPane);
      const previewPaneStyle = window.getComputedStyle(previewPane);
      const notificationStyle = window.getComputedStyle(notification);

      return {
        className: editor.className,
        navClassName: nav.className,
        navHeight: navStyle.height,
        navMargin: navStyle.margin,
        editTagName: editButton.tagName.toLowerCase(),
        editType: editButton.getAttribute("type"),
        editHref: editButton.getAttribute("href"),
        editToggle: editButton.getAttribute("data-toggle"),
        editMode: editButton.getAttribute("data-mode"),
        editText: editButton.textContent?.trim(),
        previewTagName: previewButton.tagName.toLowerCase(),
        previewType: previewButton.getAttribute("type"),
        previewHref: previewButton.getAttribute("href"),
        previewToggle: previewButton.getAttribute("data-toggle"),
        previewMode: previewButton.getAttribute("data-mode"),
        previewText: previewButton.textContent?.trim(),
        taskButtonType: taskButton.type,
        taskButtonClassName: taskButton.className,
        taskButtonText: taskButton.textContent?.trim(),
        clearButtonType: clearButton.type,
        clearButtonClassName: clearButton.className,
        clearButtonText: clearButton.textContent?.trim(),
        tabContentStyle: tabContent.getAttribute("style"),
        tabContentPosition: tabContentStyle.position,
        tabContentOverflow: tabContentStyle.overflow,
        editPaneClassName: editPane.className,
        editPaneDisplay: editPaneStyle.display,
        previewPaneClassName: previewPane.className,
        previewPaneDisplay: previewPaneStyle.display,
        textareaName: textarea.name,
        textareaClassName: textarea.className,
        textareaMode: textarea.getAttribute("data-editor-mode"),
        textareaMarkdown: textarea.getAttribute("markdown"),
        textareaId: textarea.id,
        previewClassName: preview.className,
        previewViaEmail: preview.getAttribute("data-via-email"),
        markdownHelpNavItemCount: markdownHelpNavItems.length,
        markdownHelpItemCount: markdownHelpItems.length,
        notificationClassName: notification.className,
        notificationDisplay: notificationStyle.display,
        notificationText: notificationTitle.textContent,
        tabButtonDataModeCount: editor.querySelectorAll("button[data-mode]").length,
      };
    });
  expect(editorMetrics).toEqual({
    className: "mt10",
    navClassName: expect.stringContaining("nav nav-tabs nm small"),
    navHeight: "29px",
    navMargin: "0px",
    editTagName: "a",
    editType: null,
    editHref: `${basePath}/admin/sample/post/3#edit-contents`,
    editToggle: null,
    editMode: null,
    editText: "Edit",
    previewTagName: "a",
    previewType: null,
    previewHref: `${basePath}/admin/sample/post/3#preview-contents`,
    previewToggle: null,
    previewMode: null,
    previewText: "Preview",
    taskButtonType: "button",
    taskButtonClassName: expect.stringContaining(
      "add-task-list-button ybtn ybtn-small ybtn-danger-no-outline",
    ),
    taskButtonText: "Add checklist",
    clearButtonType: "button",
    clearButtonClassName: "ybtn ybtn-small ybtn-warning",
    clearButtonText: "Clear Temporary",
    tabContentStyle: null,
    tabContentPosition: "relative",
    tabContentOverflow: "visible",
    editPaneClassName: expect.stringContaining("tab-pane active"),
    editPaneDisplay: "block",
    previewPaneClassName: expect.stringContaining("tab-pane"),
    previewPaneDisplay: "none",
    textareaName: "contents",
    textareaClassName: expect.stringContaining("editorSeries content comment nm"),
    textareaMode: "comment-body",
    textareaMarkdown: "true",
    textareaId: "editor-contents-contents",
    previewClassName: "markdown-preview markdown-wrap comment-body",
    previewViaEmail: "false",
    markdownHelpNavItemCount: 11,
    markdownHelpItemCount: 10,
    notificationClassName: expect.stringContaining("notification-receiver"),
    notificationDisplay: "none",
    notificationText: "Notification receivers ",
    tabButtonDataModeCount: 0,
  });
  await expect(
    page.locator("#comment-form .mt10:has(#editor-contents-contents) a[href^='#']"),
  ).toHaveCount(0);
  await expect(
    page.locator("#comment-form .mt10:has(#editor-contents-contents) button[data-toggle='tab']"),
  ).toHaveCount(0);
  await expect(
    page.locator("#comment-form .mt10:has(#editor-contents-contents) button[data-mode]"),
  ).toHaveCount(0);
  const commentEditorLayout = await page
    .locator("#comment-form .mt10:has(#editor-contents-contents)")
    .evaluate((editor) => {
      const nav = editor.querySelector(".nav-tabs") as HTMLElement;
      const tabContent = editor.querySelector(".tab-content") as HTMLElement;
      const editPane = editor.querySelector("#edit-contents") as HTMLElement;
      const textarea = editor.querySelector("textarea") as HTMLTextAreaElement;
      const n = nav.getBoundingClientRect();
      const c = tabContent.getBoundingClientRect();
      const e = editPane.getBoundingClientRect();
      const t = textarea.getBoundingClientRect();
      return {
        contentStartsAfterNav: c.top >= n.bottom - 1,
        editContainedHorizontally: e.left >= c.left - 1 && e.right <= c.right + 1,
        textareaContainedHorizontally: t.left >= e.left - 1 && t.right <= e.right + 1,
        tabOrder: Array.from(nav.children).map((child) => child.textContent?.trim()),
      };
    });
  expect(commentEditorLayout).toEqual({
    contentStartsAfterNav: true,
    editContainedHorizontally: true,
    textareaContainedHorizontally: true,
    tabOrder: ["Edit", "Preview", "Add checklist", "Clear Temporary", ""],
  });
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-comment-editor";
  });
  const editorUrl = page.url();
  await commentEditor
    .locator(".nav-tabs > li")
    .nth(1)
    .getByRole("link", { name: "Preview" })
    .click();
  await expect(page.locator("#comment-form #preview-contents")).toHaveClass(/active/);
  await expect(page.locator("#comment-form #edit-contents")).not.toHaveClass(/active/);
  await expect(page.locator("#comment-form #preview-contents")).toBeVisible();
  await expect(page.locator("#comment-form #edit-contents")).toBeHidden();
  const activePreviewLayout = await page
    .locator("#comment-form .mt10:has(#editor-contents-contents)")
    .evaluate((editor) => {
      const tabContent = editor.querySelector(".tab-content") as HTMLElement;
      const previewPane = editor.querySelector("#preview-contents") as HTMLElement;
      const preview = editor.querySelector(".markdown-preview") as HTMLElement;
      const c = tabContent.getBoundingClientRect();
      const p = previewPane.getBoundingClientRect();
      const m = preview.getBoundingClientRect();
      return {
        previewContainedHorizontally: p.left >= c.left - 1 && p.right <= c.right + 1,
        markdownContainedHorizontally: m.left >= p.left - 1 && m.right <= p.right + 1,
      };
    });
  expect(activePreviewLayout).toEqual({
    previewContainedHorizontally: true,
    markdownContainedHorizontally: true,
  });
  await expect(page).toHaveURL(editorUrl);
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-comment-editor");
  await commentEditor.locator(".nav-tabs > li").nth(0).getByRole("link", { name: "Edit" }).click();
  await expect(page.locator("#comment-form #edit-contents")).toHaveClass(/active/);
  await expect(page.locator("#comment-form #edit-contents")).toBeVisible();
  await expect(page.locator("#comment-form #preview-contents")).toBeHidden();
  await expect(
    page.locator("#comment-form #upload[data-resource-type='NONISSUE_COMMENT']"),
  ).toHaveCount(1);
  const uploadFormMetrics = await page.locator("#comment-form #upload").evaluate((upload) => {
    const style = window.getComputedStyle(upload);
    const writeCommentBox = upload.closest(".write-comment-box") as HTMLElement;
    const writeCommentBoxStyle = window.getComputedStyle(writeCommentBox);
    const uploadBox = upload.getBoundingClientRect();
    const writeCommentBoxRect = writeCommentBox.getBoundingClientRect();
    const droppable = upload.querySelector(".help-droppable") as HTMLElement;
    const btnWrap = upload.querySelector(".btn-wrap") as HTMLElement;
    const fileButton = upload.querySelector(".fake-file-wrap") as HTMLElement;
    const fileInput = upload.querySelector("input.file") as HTMLInputElement;
    const plain = upload.querySelector(".plain") as HTMLElement;
    const pastable = upload.querySelector(".help-pastable") as HTMLElement;
    const attachedFiles = upload.querySelector(".attached-files") as HTMLElement;
    const help = upload.querySelector(
      '[data-stylex-owner="post-detail-comment-upload-help"].help',
    ) as HTMLElement;
    const droppableStyle = window.getComputedStyle(droppable);
    const btnWrapStyle = window.getComputedStyle(btnWrap);
    const plainStyle = window.getComputedStyle(plain);
    const attachedFilesStyle = window.getComputedStyle(attachedFiles);
    const helpStyle = window.getComputedStyle(help);

    return {
      className: upload.className,
      leftInset: uploadBox.left - writeCommentBoxRect.left,
      resourceType: upload.getAttribute("data-resource-type"),
      resourceId: upload.getAttribute("data-resource-id"),
      droppableText: droppable.textContent?.trim(),
      uploadButtonText: fileButton.textContent?.trim(),
      fileInputName: fileInput.name,
      fileInputMultiple: fileInput.multiple,
      plainText: plain.textContent?.trim(),
      pastableText: pastable.textContent?.trim(),
      helpText: help.textContent?.trim(),
      attachedFilesClass: attachedFiles.className,
      padding: style.padding,
      marginBottom: style.marginBottom,
      writeCommentBoxPadding: writeCommentBoxStyle.padding,
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      droppableDisplay: droppableStyle.display,
      btnWrapDisplay: btnWrapStyle.display,
      btnWrapMargin: btnWrapStyle.margin,
      plainDisplay: plainStyle.display,
      plainLineHeight: plainStyle.lineHeight,
      attachedFilesDisplay: attachedFilesStyle.display,
      attachedFilesPadding: attachedFilesStyle.padding,
      attachedFilesMarginTop: attachedFilesStyle.marginTop,
      attachedFilesBorderTop: attachedFilesStyle.borderTop,
      helpDisplay: helpStyle.display,
    };
  });
  expect(uploadFormMetrics).toEqual({
    className: expect.stringContaining("upload-wrap content-footer"),
    leftInset: 54,
    resourceType: "NONISSUE_COMMENT",
    resourceId: null,
    droppableText: "Drag & Drop files to attach here or",
    uploadButtonText: "File upload",
    fileInputName: "filePath",
    fileInputMultiple: true,
    plainText: "Click upload button",
    pastableText: "Paste the clipboard image",
    helpText: "Selected file will be attached when your comment is saved.",
    attachedFilesClass: expect.stringContaining("attached-files unstyled"),
    padding: "10px",
    marginBottom: "10px",
    writeCommentBoxPadding: "0px 0px 15px 54px",
    backgroundColor: "rgb(239, 239, 239)",
    borderRadius: "0px 0px 5px 5px",
    droppableDisplay: "inline",
    btnWrapDisplay: "inline-block",
    btnWrapMargin: "0px 5px",
    plainDisplay: "inline-block",
    plainLineHeight: "30px",
    attachedFilesDisplay: "none",
    attachedFilesPadding: "15px 0px",
    attachedFilesMarginTop: "15px",
    attachedFilesBorderTop: "1px solid rgb(224, 224, 224)",
    helpDisplay: "none",
  });
  await expect(page.locator("#comment-form #dynamic-comment-btn")).toHaveClass(/hidden/);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  expect(routeSource).not.toContain("help/markdown.scala.html");
  expect(routeSource).not.toContain("legacyMarkdownHelpTemplate");
  expect(routeSource).not.toContain("legacyMarkdownHelpHtml");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).toContain(
    'import { LegacyMarkdownHelp } from "../../../-legacy-markdown-help"',
  );
  const markdownEditorSource = routeSource.slice(
    routeSource.indexOf("function MarkdownEditor"),
    routeSource.indexOf("function AttachedFiles"),
  );
  const postCommentFormSource = routeSource.slice(
    routeSource.indexOf("function PostCommentForm"),
    routeSource.indexOf("function PostCommentRow"),
  );
  expect(postCommentFormSource).toContain('t("error.auth.unauthorized.comment")');
  expect(postCommentFormSource).toContain('t("button.comment.new")');
  expect(postCommentFormSource).toContain('t("common.attach.drophere")');
  expect(postCommentFormSource).toContain('t("button.upload")');
  expect(postCommentFormSource).toContain('t("common.attach.clickbutton")');
  expect(postCommentFormSource).toContain('t("common.attach.pastehere")');
  expect(postCommentFormSource).toContain('t("common.attach.attachIfYouSave")');
  expect(postCommentFormSource).not.toContain('"You need to log in to add comments."');
  expect(postCommentFormSource).not.toContain(">Add a comment<");
  expect(postCommentFormSource).not.toContain("Drag &amp; Drop files to attach here or");
  expect(postCommentFormSource).not.toContain("File upload");
  expect(postCommentFormSource).not.toContain("Click upload button");
  expect(postCommentFormSource).not.toContain("Paste the clipboard image");
  expect(postCommentFormSource).not.toContain("Selected file will be attached");
  expect(markdownEditorSource).not.toContain('data-toggle="markdown-editor"');
  expect(markdownEditorSource).not.toContain("data-mode");
  expect(markdownEditorSource).not.toContain('data-toggle="tab"');
  expect(markdownEditorSource).toContain('t("common.editor.edit")');
  expect(markdownEditorSource).toContain('t("common.editor.preview")');
  expect(markdownEditorSource).toContain('t("button.add.checklist")');
  expect(markdownEditorSource).toContain('t("button.clear.temporary")');
  expect(markdownEditorSource).toContain('t("notification.receiver.list.title")');
  expect(markdownEditorSource).toContain("styles.commentCreateNotificationReceiver");
  expect(markdownEditorSource).toContain("styles.commentCreateNotificationReceiverTitle");
  expect(markdownEditorSource).not.toContain(">Edit<");
  expect(markdownEditorSource).not.toContain(">Preview<");
  expect(markdownEditorSource).not.toContain("Add checklist");
  expect(markdownEditorSource).not.toContain("Clear Temporary");
  expect(markdownEditorSource).not.toContain("Notification receivers ");
  expect(markdownEditorSource).toContain("setActiveMode(mode)");
  expect(markdownEditorSource).not.toContain("document.");
  expect(markdownEditorSource).not.toContain("classList");
  expect(markdownEditorSource).not.toContain("style.display");

  await page.locator("#comment-form textarea[name='contents']").fill("New **board** comment");
  await commentEditor
    .locator(".nav-tabs > li")
    .nth(1)
    .getByRole("link", { name: "Preview" })
    .click();
  await expect(page.locator("#comment-form #preview-contents .markdown-preview")).toContainText(
    "New board comment",
  );
  await expect(page.locator("#comment-form #preview-contents strong")).toHaveText("board");
  await commentEditor.locator(".nav-tabs > li").nth(0).getByRole("link", { name: "Edit" }).click();
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

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(notificationReceiver).toHaveCSS("display", "none");
  expect(
    await notificationReceiver.evaluate((receiver) => ({
      height: receiver.getBoundingClientRect().height,
      width: receiver.getBoundingClientRect().width,
    })),
  ).toEqual({ height: 0, width: 0 });
  await page.locator("#comment-form textarea[name='contents']").focus();
  await expect(notificationReceiver).toHaveCSS("display", "none");
  const mobileUploadMetrics = await page.locator("#comment-form #upload").evaluate((upload) => {
    const writeCommentBox = upload.closest(".write-comment-box") as HTMLElement;
    const uploadBox = upload.getBoundingClientRect();
    const writeCommentBoxRect = writeCommentBox.getBoundingClientRect();
    return {
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      leftInset: uploadBox.left - writeCommentBoxRect.left,
      padding: getComputedStyle(writeCommentBox).padding,
      uploadContained:
        uploadBox.left >= writeCommentBoxRect.left - 1 &&
        uploadBox.right <= writeCommentBoxRect.right + 1,
    };
  });
  expect(mobileUploadMetrics).toEqual({
    documentOverflow: 0,
    leftInset: 0,
    padding: "0px",
    uploadContained: true,
  });
});

test("project board detail opens legacy keymap modal through route state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
  await installRootModalBridgeGuard(page, ["helpKeys"]);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "post-keymap-modal";
  });
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator('.board-footer a[href="#helpKeys"][data-toggle="modal"]')).toHaveCount(
    0,
  );
  const keymapButton = page.locator(
    '.board-footer button[type="button"].ybtn.ybtn-inverse.ybtn-mini',
  );
  await expect(keymapButton).toHaveClass(/ybtn ybtn-inverse ybtn-mini/);
  await expect(keymapButton).toHaveText("Keyboard shortcuts");
  await expect(keymapButton).not.toHaveAttribute("data-toggle", "modal");
  await expect(keymapButton).not.toHaveAttribute("data-target", "#helpKeys");
  expect(await dispatchCancelableClick(keymapButton)).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#helpKeys")).not.toHaveClass(/hide/);
  await expect(page.locator("#helpKeys")).toHaveClass(/in/);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3`);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-keymap-modal");
  expect(await keymapModalMetrics(page)).toEqual({
    display: "block",
    firstColumnTitle: "projects",
    left: 320,
    top: 72,
    width: 682,
  });

  await expect(page.locator('#helpKeys [data-dismiss="modal"]')).toHaveCount(0);
  expect(await dispatchCancelableClick(page.locator("#helpKeys .actrow button.ybtn-info"))).toBe(
    false,
  );
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3`);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-keymap-modal");

  await keymapButton.click();
  await expect(page.locator("#helpKeys")).toHaveCSS("display", "block");
  await page.locator(".modal-backdrop.in").click({ position: { x: 1, y: 1 } });
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3`);

  await keymapButton.click();
  await expect(page.locator("#helpKeys")).toHaveCSS("display", "block");
  await page.locator("#helpKeys").press("Escape");
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3`);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const bodySource = routeSource.slice(
    routeSource.indexOf("function ProjectPostDetailBody"),
    routeSource.indexOf("function PostingHistory"),
  );
  const keymapSource = routeSource.slice(
    routeSource.indexOf("function BoardDetailKeymap"),
    routeSource.indexOf("function KeymapEntry"),
  );
  expect(bodySource).toContain('setOpenPostModal("helpKeys")');
  expect(bodySource).toContain('open={openPostModal === "helpKeys"}');
  expect(bodySource).toContain("closeCurrentModal");
  expect(bodySource).toContain('className="modal-backdrop fade in"');
  expect(bodySource).toContain("onClick={closeCurrentModal}");
  expect(keymapSource).toContain("event.preventDefault();");
  expect(keymapSource).not.toContain('data-toggle="modal"');
  expect(keymapSource).not.toContain('data-target="#helpKeys"');
  expect(keymapSource).not.toContain('data-dismiss="modal"');
  expect(keymapSource).not.toContain("useState(false)");
  expect(keymapSource).toContain("event.stopPropagation();");
  expect(keymapSource).toContain("closeModalOnEscape(event, onClose)");
  expect(keymapSource).not.toContain("document.");
  expect(keymapSource).not.toContain("classList");
  expect(keymapSource).not.toContain("style.display");
});

test("project board detail opens legacy posting history modal", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page);

  await page.goto(`${basePath}/admin/sample/post/3`);
  await installRootModalBridgeGuard(page, ["-yona-posting-history"]);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "post-history-modal";
  });
  await expect(
    page.locator('.posting-history a[href="#-yona-posting-history"][data-toggle="modal"]'),
  ).toHaveCount(0);
  const historyButton = page.locator('.posting-history button[type="button"]').first();
  await expect(historyButton).toHaveText("Change history");
  await expect(historyButton).not.toHaveAttribute("data-toggle", "modal");
  await expect(historyButton).not.toHaveAttribute("data-target", "#-yona-posting-history");
  await expect(page.locator("#-yona-posting-history")).toHaveClass(/hide/);
  await expect(page.locator("#-yona-posting-history .modal-header h5")).toHaveText(
    "Change history",
  );
  await expect(page.locator("#-yona-posting-history .modal-body")).toContainText("Edited body");
  await expect(page.locator("#-yona-posting-history .modal-body")).not.toContainText(
    "Server HTML should not render",
  );

  expect(await dispatchCancelableClick(historyButton)).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#-yona-posting-history")).not.toHaveClass(/hide/);
  await expect(page.locator("#-yona-posting-history")).toHaveClass(/in/);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3`);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-history-modal");
  expect(await postingHistoryMetrics(page)).toEqual({
    backdropDisplay: "block",
    bodyPadding: "15px",
    confirmText: "Confirm",
    display: "block",
    footerTextAlign: "right",
    headerBorderBottomWidth: "1px",
    historyDisplay: "inline-block",
    historyMarginLeft: "10px",
    title: "Change history",
    top: 10,
    width: 562,
  });

  await expect(page.locator('#-yona-posting-history [data-dismiss="modal"]')).toHaveCount(0);
  expect(
    await dispatchCancelableClick(
      page.locator("#-yona-posting-history .modal-footer button.ybtn-info"),
    ),
  ).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#-yona-posting-history")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3`);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-history-modal");

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const bodySource = routeSource.slice(
    routeSource.indexOf("function ProjectPostDetailBody"),
    routeSource.indexOf("function PostingHistory"),
  );
  const historySource = routeSource.slice(
    routeSource.indexOf("function PostingHistory"),
    routeSource.indexOf("function CommentDeleteConfirm"),
  );
  expect(bodySource).toContain('setOpenPostModal("postingHistory")');
  expect(bodySource).toContain('open={openPostModal === "postingHistory"}');
  expect(historySource).toContain("event.preventDefault();");
  expect(historySource).not.toContain('data-toggle="modal"');
  expect(historySource).not.toContain('data-target="#-yona-posting-history"');
  expect(historySource).not.toContain('data-dismiss="modal"');
  expect(historySource).not.toContain("useState(false)");
  expect(historySource).toContain("event.stopPropagation();");
  expect(historySource).not.toContain("document.");
  expect(historySource).not.toContain("classList");
  expect(historySource).not.toContain("style.display");
});

test("project board detail renders legacy read-only selected labels", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "readonlyLabel");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator(".issue-info.board-labels #labelIds")).toHaveCount(0);

  const expected =
    `<dl><dt>Label</dt><dd><a href="__BASE_PATH__/admin/sample/posts?labelIds=8" class="label issue-label active static" style="background:rgb(81, 170, 204)">bug</a></dd></dl>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalize(page, ".issue-info.board-labels dl:has(a.label.issue-label.active.static)"),
  ).toEqual(await canonicalizeHtml(page, expected));

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const selectedLabelsSource = routeSource.slice(
    routeSource.indexOf("function PostSelectedLabels"),
    routeSource.indexOf("function ProjectPostActionButtons"),
  );
  expect(selectedLabelsSource).toContain('t("label")');
  expect(selectedLabelsSource).not.toContain("<dt>Label</dt>");
});

test("project board detail renders legacy editable label selector", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { labelUpdateRequests } = await mockProjectPosts(page, "editableLabel");

  await page.goto(`${basePath}/admin/sample/post/3`);

  const expected = BOARD_EDITABLE_LABEL_SELECTOR.replaceAll("__BASE_PATH__", basePath);
  expect(await canonicalize(page, ".issue-info.board-labels dl:has(#labelIds)")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  const labelSelect = page.locator(".issue-info.board-labels #labelIds");
  await expect(page.locator(".issue-info.board-labels #s2id_labelIds")).toBeVisible();
  await expect(
    page.locator('.issue-info.board-labels #s2id_labelIds input[placeholder="Select label"]'),
  ).toBeVisible();
  await expect(labelSelect).toHaveValues(["8"]);
  await expect(labelSelect).not.toHaveAttribute("data-toggle", "select2");
  await expect(labelSelect).toHaveAttribute("id", "labelIds");
  await expect(labelSelect).toHaveAttribute("name", "labelIds");
  await expect(labelSelect).toHaveAttribute("multiple", "");
  await expect(labelSelect).not.toHaveAttribute("data-search");
  await expect(labelSelect).toHaveAttribute("data-format", "issuelabel");
  await expect(labelSelect).toHaveAttribute("data-allow-clear", "true");
  await expect(labelSelect).toHaveAttribute("data-dropdown-css-class", "issue-labels");
  await expect(labelSelect).toHaveAttribute(
    "data-container-css-class",
    "issue-labels bordered fullsize",
  );
  await expect(labelSelect).toHaveAttribute("data-placeholder", "Select label");
  await expect(labelSelect).toHaveClass("hide");
  await expect(labelSelect.locator("option")).toHaveText(["", "bug", "enhancement", "high", "low"]);
  await expect(labelSelect.locator('optgroup[label="type"]')).toHaveAttribute(
    "data-category-id",
    "3",
  );
  await expect(labelSelect.locator('optgroup[label="type"]')).toHaveAttribute(
    "data-category-is-exclusive",
    "false",
  );
  await expect(labelSelect.locator('optgroup[label="priority"]')).toHaveAttribute(
    "data-category-id",
    "4",
  );
  await expect(labelSelect.locator('optgroup[label="priority"]')).toHaveAttribute(
    "data-category-is-exclusive",
    "true",
  );

  const labelMessageRouteSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const editableLabelMessageSource = labelMessageRouteSource.slice(
    labelMessageRouteSource.indexOf("function PostEditableLabels"),
    labelMessageRouteSource.indexOf("function nextPostLabelIds"),
  );
  expect(editableLabelMessageSource).toContain('t("label")');
  expect(editableLabelMessageSource).toContain('t("label.select")');
  expect(editableLabelMessageSource).not.toContain('data-placeholder="Select label"');

  const setSelectedLabels = async (labelIds: string[]) => {
    await page.locator(".issue-info.board-labels #labelIds").evaluate((element, ids) => {
      const selectedIds = new Set(ids);
      const select = element as HTMLSelectElement;
      for (const option of select.options) {
        option.selected = selectedIds.has(option.value);
      }
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, labelIds);
  };

  await setSelectedLabels(["8", "9"]);
  await expect.poll(() => labelUpdateRequests).toEqual([["8", "9"]]);
  await expect(page.locator(".issue-info.board-labels #labelIds")).toHaveValues(["8", "9"]);

  await setSelectedLabels(["8", "9", "10"]);
  await expect
    .poll(() => labelUpdateRequests)
    .toEqual([
      ["8", "9"],
      ["8", "9", "10"],
    ]);
  await expect(page.locator(".issue-info.board-labels #labelIds")).toHaveValues(["8", "9", "10"]);

  await setSelectedLabels(["8", "9", "10", "11"]);
  await expect
    .poll(() => labelUpdateRequests)
    .toEqual([
      ["8", "9"],
      ["8", "9", "10"],
      ["8", "9", "11"],
    ]);
  await expect(page.locator(".issue-info.board-labels #labelIds")).toHaveValues(["8", "9", "11"]);

  await page.locator(".issue-info.board-labels #labelIds").evaluate((element) => {
    const select = element as HTMLSelectElement;
    for (const option of select.options) {
      option.selected = false;
    }
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect
    .poll(() => labelUpdateRequests)
    .toEqual([["8", "9"], ["8", "9", "10"], ["8", "9", "11"], []]);
  await expect(page.locator(".issue-info.board-labels #labelIds")).toHaveValues([]);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const editableLabelsSource = routeSource.slice(
    routeSource.indexOf("function PostEditableLabels"),
    routeSource.indexOf("function PostSelectedLabels"),
  );
  expect(editableLabelsSource).toContain("nextPostLabelIds(labels, selectedLabelIds, select)");
  expect(editableLabelsSource).toContain("option.selected");
  expect(editableLabelsSource).toContain("categoryIsExclusive");
  expect(editableLabelsSource).not.toContain('data-search="labelIds"');
  expect(editableLabelsSource).toContain('data-format="issuelabel"');
  expect(editableLabelsSource).toContain(
    'data-container-css-class="issue-labels bordered fullsize"',
  );
  expect(editableLabelsSource).not.toContain("selectedOptions");
  expect(editableLabelsSource).not.toContain('data-toggle="select2"');
  expect(editableLabelsSource).not.toContain("document.");
  expect(editableLabelsSource).not.toContain("classList");
  expect(editableLabelsSource).not.toContain("dangerouslySetInnerHTML");
});

test("project board detail internal links are router-owned", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "readonlyLabel");

  await page.goto(`${basePath}/admin/sample/post/3`);

  const authorProfile = page.locator(".author-info .usf-group");
  await expect(authorProfile).toHaveAttribute("href", `${basePath}/dev`);
  await expect(authorProfile).toHaveClass("usf-group");
  await expect(authorProfile.locator(".name")).toHaveText("Dev Member");
  await expect(authorProfile.locator(".loginid")).toHaveText("@dev");
  await expectNoTanStackActiveAttrs(authorProfile);

  const newPost = page.locator(".issue-info.board-labels .project-btn-item .ybtn-success");
  await expect(newPost).toHaveAttribute("href", `${basePath}/admin/sample/postform`);
  await expect(newPost).toHaveClass("ybtn ybtn-success");
  await expect(newPost).toHaveText("New post");
  await expectNoTanStackActiveAttrs(newPost);

  const selectedLabel = page.locator(".issue-info.board-labels .label.issue-label.active.static");
  await expect(selectedLabel).toHaveAttribute("href", `${basePath}/admin/sample/posts?labelIds=8`);
  await expect(selectedLabel).toHaveClass("label issue-label active static");
  await expect(selectedLabel).toHaveText("bug");
  await expectNoTanStackActiveAttrs(selectedLabel);

  const showOriginalLinks = page.locator(".board-actrow > span > a, .right-menu-icons > a");
  await expect(showOriginalLinks).toHaveCount(2);
  for (const showOriginalLink of await showOriginalLinks.all()) {
    await expect(showOriginalLink).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/post/3/editform`,
    );
    await expect(showOriginalLink.locator("button")).toHaveAttribute("title", "See text");
    await expectNoTanStackActiveAttrs(showOriginalLink);
  }

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-detail-label-link";
  });
  await selectedLabel.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/posts?labelIds=8`);
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-detail-label-link");

  await mockProjectPosts(page, "childComment");
  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#comment-21 .comment-avatar .avatar-wrap")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator("#comment-21 .comment_author > a")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator("#comment-21 .subcomment-author .usf-group")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expectNoTanStackActiveAttrs(page.locator("#comment-21 .comment-avatar .avatar-wrap"));
  await expectNoTanStackActiveAttrs(page.locator("#comment-21 .comment_author > a"));
  await expectNoTanStackActiveAttrs(page.locator("#comment-21 .subcomment-author .usf-group"));

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  expect(routeSource).not.toContain("as never");
  expect(routeSource).not.toContain("FileUploaderTemplates");
  expect(routeSource).not.toContain("tplAttachedFile");
  expect(routeSource).not.toContain("tplDropFilesHere");
  expect(routeSource).not.toContain("text/x-jquery-tmpl");
  expect(routeSource).toContain("const LEGACY_EMPTY_PROFILE_SEARCH");
  expect(routeSource).toContain("const LEGACY_EMPTY_POST_FORM_SEARCH");
  expect(routeSource).toContain("const legacyRouteLocalActiveProps");
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).toContain('to="/$ownerName/$projectName/posts"');
  expect(routeSource).toContain("params={{ ownerName, projectName }}");
  expect(routeSource).toContain("search={{ labelIds: [label.id] }}");
  expect(routeSource).toContain(
    "mask={{ to: `/${ownerName}/${projectName}/posts?labelIds=${label.id}` }}",
  );
  expect(routeSource).not.toContain("legacySingleLabelIds");
  expect(routeSource).not.toContain("toJSON");
  expect(routeSource).not.toContain("window.location.assign");
  expect(routeSource).not.toContain("listRoutePath");
  expect(routeSource).not.toContain("encodeURIComponent(label.id)");
  const selectedLabelsSource = routeSource.slice(
    routeSource.indexOf("function PostSelectedLabels"),
    routeSource.indexOf("function PostActionButtons"),
  );
  expect(selectedLabelsSource).not.toContain("preventDefault");
  expect(selectedLabelsSource).not.toContain("router.history.push");
  const renderedRouteSource = routeSource.slice(0, routeSource.indexOf("function AttachedFiles"));
  expect(renderedRouteSource).not.toContain("<a");
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

test("project board detail auto-links populated parent rich Markdown", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "parentRichMarkdown");
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/post/3`);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyAutoLinkSource = readFileSync(
    "../yona-original/app/utils/AutoLinkRenderer.java",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  const owners = [
    "post-detail-parent-comment-no-text-decoration",
    "post-detail-parent-comment-user-link",
    "post-detail-parent-comment-project-link",
    "post-detail-parent-comment-organization-link",
    "post-detail-parent-comment-issue-state-open",
    "post-detail-parent-comment-issue-state-closed",
  ] as const;

  expect(legacyViewSource).toContain("@partial_comments(project, post)");
  expect(legacyCommentsSource).toContain("Markdown.render(comment.contents, project)");
  expect(legacyAutoLinkSource).toMatch(
    /return new Link\(RouteUtil\.getUrl\(user\), "no-text-decoration user-link",/u,
  );
  expect(legacyAutoLinkSource).toContain("<span class='org-link'>@");
  expect(legacyAutoLinkSource).toContain("<span class='project-link'>@");
  expect(legacyAutoLinkSource).toContain("<span class='issue-state ");
  expect(legacyPageSource).toMatch(
    /\.user-link\s*\{[\s\S]*?border:\s*1px solid #4FC3F7;[\s\S]*?background-color:\s*#4FC3F7;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.project-link, \.org-link\s*\{[\s\S]*?border:\s*1px solid #9741ff;[\s\S]*?background-color:\s*#9741ff;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.issue-state\s*\{[\s\S]*?&\.open\s*\{[\s\S]*?background-color:\s*#2ea043;[\s\S]*?&\.closed\s*\{[\s\S]*?background-color:\s*#da3733;/u,
  );
  expect(legacyYobiSource.indexOf('@import "less/_page.less";')).toBeLessThan(
    legacyYobiSource.indexOf('@import "less/_responsive.less";'),
  );
  expect(routeSource).toContain("createParentCommentMarkdownAutoLinkPlugin");
  expect(routeSource).toContain("createParentCommentMarkdownComponents");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  for (const owner of owners) {
    expect(routeSource.match(new RegExp(`data-stylex-owner="${owner}"`, "g"))).toHaveLength(1);
    expect(routeSource).not.toMatch(new RegExp(`data-stylex-owner="${owner}"[^>]*style=`, "u"));
  }
  expect(styleSource).toContain("parentCommentUserLink:");
  expect(styleSource).toContain("parentCommentProjectLink:");
  expect(styleSource).toContain("parentCommentOrganizationLink:");
  expect(styleSource).toContain("parentCommentIssueStateOpen:");
  expect(styleSource).toContain("parentCommentIssueStateClosed:");

  const commentBody = page.locator("#comment-21 .comment-body.markdown-wrap");
  await expect(commentBody).toHaveAttribute("data-via-email", "false");
  await expect(commentBody).toContainText("Parent");
  const paragraph = commentBody.locator(":scope > p");
  const userLink = paragraph.locator("a.no-text-decoration");
  const organizationLink = paragraph.locator("a:has(> span.org-link)");
  const projectLink = paragraph.locator("a:has(> span.project-link)");
  const issueLinks = paragraph.locator("a.issueLink");
  await expect(paragraph.locator(":scope > a, :scope > span")).toHaveCount(5);
  await expect(userLink).toHaveText("@Dev Member");
  await expect(userLink).toHaveAttribute("href", `${basePath}/dev`);
  await expect(userLink).toHaveCSS("background-color", "rgb(79, 195, 247)");
  await expect(organizationLink).toHaveText("@Team");
  await expect(organizationLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(projectLink).toHaveText("@other/cross");
  await expect(projectLink).toHaveAttribute("href", `${basePath}/other/cross`);
  await expect(issueLinks).toHaveCount(2);
  await expect(issueLinks.nth(0)).toContainText("#11.Open parent Markdown");
  await expect(issueLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample/issue/11`);
  await expect(issueLinks.nth(0).locator(".issue-state.open")).toHaveText("Open");
  await expect(issueLinks.nth(1)).toContainText("#12.Closed parent Markdown");
  await expect(issueLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/issue/12`);
  await expect(issueLinks.nth(1).locator(".issue-state.closed")).toHaveText("Closed");
  await expectNoTanStackActiveAttrs(userLink);
  await expectNoTanStackActiveAttrs(organizationLink);
  await expectNoTanStackActiveAttrs(projectLink);
  await expectNoTanStackActiveAttrs(issueLinks.nth(0));
  await userLink.hover();
  await expect(userLink).toHaveCSS("background-color", "rgb(79, 195, 247)");
  await issueLinks.nth(1).locator(".issue-state.closed").hover();
  await expect(issueLinks.nth(1).locator(".issue-state.closed")).toHaveCSS(
    "text-decoration-line",
    "none",
  );

  const desktopMetrics = await commentBody.evaluate((body) => {
    const bodyRect = body.getBoundingClientRect();
    const links = [
      ...body.querySelectorAll(
        "a.no-text-decoration, a:has(> span.org-link), a:has(> span.project-link), a.issueLink",
      ),
    ];
    return {
      linksInside: links.every((link) => {
        const rect = link.getBoundingClientRect();
        return rect.left >= bodyRect.left && rect.right <= bodyRect.right + 1;
      }),
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      userBackground: getComputedStyle(body.querySelector("a.no-text-decoration")!).backgroundColor,
      projectBackground: getComputedStyle(body.querySelector(".project-link")!).backgroundColor,
      openBackground: getComputedStyle(body.querySelector(".issue-state.open")!).backgroundColor,
      closedBackground: getComputedStyle(body.querySelector(".issue-state.closed")!)
        .backgroundColor,
    };
  });
  expect(desktopMetrics).toEqual({
    linksInside: true,
    noOverflow: true,
    userBackground: "rgb(79, 195, 247)",
    projectBackground: "rgb(151, 65, 255)",
    openBackground: "rgb(46, 160, 67)",
    closedBackground: "rgb(218, 55, 51)",
  });

  const screenshotDirectory = resolve(process.cwd(), "../output/playwright");
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(
      screenshotDirectory,
      "batch-818-local-board-post-parent-rich-markdown-desktop.png",
    ),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMetrics = await commentBody.evaluate((body) => {
    const bodyRect = body.getBoundingClientRect();
    const richNodes = [
      ...body.querySelectorAll(".user-link, .project-link, .org-link, .issue-state"),
    ];
    return {
      inside: richNodes.every((node) => {
        const rect = node.getBoundingClientRect();
        return rect.left >= bodyRect.left && rect.right <= bodyRect.right + 1;
      }),
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      userPadding: getComputedStyle(body.querySelector("a.no-text-decoration")!).padding,
      issueStatePadding: getComputedStyle(body.querySelector(".issue-state.open")!).padding,
    };
  });
  expect(mobileMetrics).toEqual({
    inside: true,
    noOverflow: true,
    userPadding: "0px 2px",
    issueStatePadding: "0px 3px",
  });
  await page.screenshot({
    fullPage: true,
    path: resolve(
      screenshotDirectory,
      "batch-818-local-board-post-parent-rich-markdown-mobile.png",
    ),
  });
});

test("project board detail auto-links commit references in parent and child Markdown", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const screenshotDirectory = resolve(process.cwd(), "output/playwright/batch-819");
  mkdirSync(screenshotDirectory, { recursive: true });
  await mockProjectPosts(page, "commitReferenceMarkdown");
  await page.goto(`${basePath}/admin/sample/post/3`);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyChildCommentsSource = readFileSync(
    "../yona-original/app/views/common/childComments.scala.html",
    "utf8",
  );
  const legacyAutoLinkSource = readFileSync(
    "../yona-original/app/utils/AutoLinkRenderer.java",
    "utf8",
  );
  expect(legacyViewSource).toContain("@partial_comments(project, post)");
  expect(legacyCommentsSource).toContain("Markdown.render(comment.contents, project)");
  expect(legacyChildCommentsSource).toContain("Markdown.render(comment.contents, posting.project)");
  expect(legacyAutoLinkSource).toContain("User/Project@SHA");
  expect(legacyAutoLinkSource).toContain("commit.getShortId()");
  expect(routeSource).toContain("commitReferences");
  expect(routeSource).toContain("/commit/${reference.commitId}");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");

  const parentLinks = page.locator("#comment-21 .comment-body p a");
  await expect(parentLinks).toHaveCount(2);
  await expect(parentLinks).toHaveText(["0123456", "admin/sample@fedcba9"]);
  await expect(parentLinks.nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/0123456789abcdef`,
  );
  await expect(parentLinks.nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/fedcba987654321`,
  );

  const childLinks = page.locator("#comment-21 .child-comments .contents a[href*='/commit/']");
  await expect(childLinks).toHaveCount(2);
  await expect(childLinks).toHaveText(["abcdef0", "admin/sample@1234567"]);
  await expect(childLinks.nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef0123456789`,
  );
  await expect(childLinks.nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/1234567890abcdef`,
  );

  for (const [viewport, filename] of [
    [{ width: 1366, height: 900 }, "board-post-commit-references-desktop.png"],
    [{ width: 390, height: 844 }, "board-post-commit-references-mobile.png"],
  ] as const) {
    await page.setViewportSize(viewport);
    const containment = await page.locator("#comments").evaluate((comments) => {
      const commentsRect = comments.getBoundingClientRect();
      const links = [...comments.querySelectorAll(".comment-body a, .contents a")];
      return {
        linksInside: links.every((link) => {
          const rect = link.getBoundingClientRect();
          return rect.left >= commentsRect.left && rect.right <= commentsRect.right + 1;
        }),
        noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    });
    expect(containment).toEqual({ linksInside: true, noOverflow: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, filename),
    });
  }

  await mockProjectPosts(page, "comment");
  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#comments a[href*='/commit/']")).toHaveCount(0);
  for (const [viewport, filename] of [
    [{ width: 1366, height: 900 }, "board-post-commit-references-fallback-off-desktop.png"],
    [{ width: 390, height: 844 }, "board-post-commit-references-fallback-off-mobile.png"],
  ] as const) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, filename),
    });
  }
});

test("project board detail folds original message content in via-email comments", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "viaEmailComment");

  await page.goto(`${basePath}/admin/sample/post/3`);

  const commentBody = page.locator("#comment-body-21 .comment-body");
  await expect(commentBody).toHaveAttribute("data-via-email", "true");
  await expect(commentBody).toHaveAttribute("data-yobi-original-message-processed", "true");
  await expect(commentBody.locator("p").first()).toHaveText("Reply before quoted mail.");

  const toggle = commentBody.locator('button[type="button"]', { hasText: "..." });
  await page.waitForTimeout(100);
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toBeVisible();
  await expect
    .poll(() =>
      commentBody.locator('button[type="button"]').evaluateAll(
        (buttons) =>
          buttons.filter((button) => {
            const element = button as HTMLElement;
            return element.textContent?.trim() === "..." && element.offsetParent !== null;
          }).length,
      ),
    )
    .toBe(1);
  await expect(commentBody.locator('[data-original-message-owner="route"]')).toBeHidden();
  await expect(commentBody.getByText("Original author wrote:")).toBeHidden();
  await expect(commentBody.getByText("Quoted original line")).toBeHidden();

  await toggle.click();
  await expect(commentBody.locator('[data-original-message-owner="route"]')).toBeVisible();
  await expect(commentBody.getByText("Original author wrote:")).toBeVisible();
  await expect(commentBody.getByText("Quoted original line")).toBeVisible();

  await toggle.click();
  await expect(commentBody.locator('[data-original-message-owner="route"]')).toBeHidden();
  await expect(commentBody.getByText("Quoted original line")).toBeHidden();

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const originalMessageSource = routeSource.slice(
    routeSource.indexOf("function PostCommentRow"),
    routeSource.indexOf("function PostCommentUpdateForm"),
  );
  expect(originalMessageSource).toContain("hasRouteOwnedOriginalMessage");
  expect(originalMessageSource).toContain("data-yobi-original-message-processed={");
  expect(originalMessageSource).toContain('hasRouteOwnedOriginalMessage ? "true" : undefined');
  const originalMessageComponentSource = routeSource.slice(
    routeSource.indexOf("function OriginalMessageMarkdown"),
    routeSource.indexOf("function PostCommentUpdateForm"),
  );
  expect(originalMessageComponentSource).toContain("useState(false)");
  expect(originalMessageComponentSource).toContain(
    "setShowsOriginalMessage((current) => !current)",
  );
  expect(originalMessageComponentSource).toContain('data-original-message-owner="route"');
  expect(originalMessageComponentSource).toContain("hidden={!showsOriginalMessage}");
  expect(originalMessageSource).not.toContain("document.");
  expect(originalMessageComponentSource).not.toContain("document.");
  expect(originalMessageSource).not.toContain("addEventListener");
  expect(originalMessageComponentSource).not.toContain("addEventListener");
  expect(originalMessageSource).not.toContain("classList");
  expect(originalMessageComponentSource).not.toContain("classList");
  expect(originalMessageSource).not.toContain("style.display");
  expect(originalMessageComponentSource).not.toContain("style.display");
  expect(originalMessageSource).not.toContain("innerHTML");
  expect(originalMessageComponentSource).not.toContain("innerHTML");
  expect(originalMessageSource).not.toContain("outerHTML");
  expect(originalMessageComponentSource).not.toContain("outerHTML");
  expect(originalMessageSource).not.toContain("dangerouslySetInnerHTML");
  expect(originalMessageComponentSource).not.toContain("dangerouslySetInnerHTML");
});

test("project board detail owns comment hash links through router", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPosts(page, "childComment");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/post/3`);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "post-comment-hash";
  });

  await expect(
    page.locator('.board-view .ago[href^="#comment-"], .board-view .share-link[href^="#comment-"]'),
  ).toHaveCount(0);

  const parentAgo = page.locator("#comment-21 .ago-date .ago");
  const parentShare = page.locator("#comment-21 .ago-date .share-link");
  await expect(parentAgo).toHaveText("Jul 3, 2026");
  await expect(parentAgo).toHaveAttribute("title", "Jul 3, 2026");
  await expect(parentAgo).toHaveAttribute("href", `${basePath}/admin/sample/post/3#comment-21`);
  await expect(parentShare).toHaveText("[Link]");
  await expect(parentShare).toHaveCSS("display", "none");
  await expect(parentShare).toHaveAttribute("href", `${basePath}/admin/sample/post/3#comment-21`);
  await expectNoTanStackActiveAttrs(parentAgo);
  await expectNoTanStackActiveAttrs(parentShare);

  const childAgo = page.locator("#comment-21 .subcomment-author .ago");
  await expect(childAgo).toHaveText("Jul 4, 2026");
  await expect(childAgo).toHaveAttribute("title", "Jul 4, 2026");
  await expect(childAgo).toHaveAttribute("href", `${basePath}/admin/sample/post/3#comment-22`);
  await expectNoTanStackActiveAttrs(childAgo);
  await expect(page.locator('#comment-21 .subcomment-author .ago[href^="#comment-"]')).toHaveCount(
    0,
  );

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  expect(routeSource).not.toContain("as never");
  expect(routeSource).toContain("hash={`comment-${commentId}`}");

  await parentAgo.click();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#comment-21");
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-comment-hash");

  await parentShare.dispatchEvent("click");
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#comment-21");
  await expect(page.locator('a[href="#deleteConfirm"][data-toggle="modal"]')).toHaveCount(0);
  await expect(page.locator('.board-footer a[href="#helpKeys"][data-toggle="modal"]')).toHaveCount(
    0,
  );
  await expect(page.locator('button[type="button"][data-target="#deleteConfirm"]')).toHaveCount(0);
  await expect(
    page.locator('.board-footer button[type="button"][data-target="#helpKeys"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('.posting-history button[type="button"][data-target="#-yona-posting-history"]'),
  ).toHaveCount(0);
  await expect(page.locator('.board-view button[type="button"][title="Delete"]')).toHaveCount(2);
  await expect(
    page.locator('.board-footer button[type="button"].ybtn.ybtn-inverse.ybtn-mini'),
  ).toHaveCount(1);
  await expect(page.locator('.posting-history > button[type="button"]')).toHaveCount(1);
  await expect(
    page.locator(
      '.board-view a[href="#deleteConfirm"][data-toggle="modal"], .board-footer a[href="#helpKeys"][data-toggle="modal"], .posting-history a[href="#-yona-posting-history"][data-toggle="modal"], .board-view [data-toggle="modal"], .board-footer [data-toggle="modal"], .posting-history [data-toggle="modal"]',
    ),
  ).toHaveCount(0);

  await childAgo.dispatchEvent("click");
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#comment-22");
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-comment-hash");

  expect(routeSource).not.toContain("AnchorHTMLAttributes");
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("ComponentType");
  expect(routeSource).not.toContain("CommentHashLink");
  expect(routeSource).not.toContain("CommentHashLinkProps");
  expect(routeSource.split("hash={`comment-${commentId}`}")).toHaveLength(4);
  const hashLinkSource = routeSource.slice(
    routeSource.indexOf("function PostCommentRow"),
    routeSource.indexOf("function PostCommentUpdateForm"),
  );
  expect(hashLinkSource).toContain("<Link");
  expect(hashLinkSource).toContain("hash={`comment-${commentId}`}");
  expect(hashLinkSource).not.toContain("<a");
  expect(hashLinkSource).not.toContain("href=");
});

test("project board detail renders legacy comment update form", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentUpdateRequests } = await mockProjectPosts(page, "commentUpdate");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator("#comment-editform-21 .comment-update-button")).toHaveCount(1);
  await expect(page.locator("#editor-contents-21")).toHaveValue("First **comment**");
  await expect(page.locator('#comment-editform-21 [data-toggle="markdown-editor"]')).toHaveCount(0);
  const updateEditor = page.locator("#comment-editform-21 .mt10:has(#editor-contents-21)");
  await expect(updateEditor).toHaveCount(1);
  await expect(
    page.locator("#comment-editform-21 .mt10:has(#editor-contents-21) a[href^='#']"),
  ).toHaveCount(0);
  await expect(
    page.locator("#comment-editform-21 .mt10:has(#editor-contents-21) button[data-toggle='tab']"),
  ).toHaveCount(0);
  await expect(
    page.locator("#comment-editform-21 .mt10:has(#editor-contents-21) button[data-mode]"),
  ).toHaveCount(0);
  const updateEditTab = updateEditor.locator(".nav-tabs > li > button").nth(0);
  const updatePreviewTab = updateEditor.locator(".nav-tabs > li > button").nth(1);
  await expect(updateEditTab).toHaveText("Edit");
  await expect(updatePreviewTab).toHaveText("Preview");
  const updateEditorOrder = await page
    .locator("#comment-editform-21 .mt10:has(#editor-contents-21) .nav-tabs")
    .evaluate((nav) =>
      Array.from(nav.children).map((child) => ({
        active: child.classList.contains("active"),
        hasMode: child.querySelector("button")?.hasAttribute("data-mode") ?? false,
        text: child.textContent?.trim(),
      })),
    );
  expect(updateEditorOrder).toEqual([
    { active: true, hasMode: false, text: "Edit" },
    { active: false, hasMode: false, text: "Preview" },
    { active: false, hasMode: false, text: "Add checklist" },
    { active: false, hasMode: false, text: "Clear Temporary" },
    { active: false, hasMode: false, text: "" },
  ]);
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

  await page.locator('#comment-21 .act-row button[title="Edit comment"]').click();
  await expect(page.locator("#comment-editform-21")).toHaveCSS("display", "block");
  await expect(page.locator("#comment-body-21")).toHaveCSS("display", "none");
  await expect(page.locator("#comment-21 .add-a-comment")).toHaveAttribute("hidden", "");
  await page.locator('#comment-21 .act-row button[title="Edit comment"]').click();
  await expect(page.locator("#comment-editform-21")).toBeHidden();
  await expect(page.locator("#comment-body-21")).toBeVisible();
  await expect(page.locator("#comment-21 .add-a-comment")).not.toHaveAttribute("hidden", "");
  await page.locator('#comment-21 .act-row button[title="Edit comment"]').click();
  await expect(page.locator("#comment-editform-21")).toHaveCSS("display", "block");
  await page.locator("#comment-editform-21 .ybtn-cancel").click();
  await expect(page.locator("#comment-editform-21")).toBeHidden();
  await expect(page.locator("#comment-body-21")).toBeVisible();
  await page.locator('#comment-21 .act-row button[title="Edit comment"]').click();
  await expect(page.locator("#comment-editform-21")).toHaveCSS("display", "block");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "board-update-editor";
  });
  const editorUrl = page.url();
  await updatePreviewTab.click();
  await expect(page.locator("#comment-editform-21 #preview-21")).toHaveClass(/active/);
  await expect(page.locator("#comment-editform-21 #edit-21")).not.toHaveClass(/active/);
  await expect(page.locator("#comment-editform-21 #preview-21")).toBeVisible();
  await expect(page.locator("#comment-editform-21 #edit-21")).toBeHidden();
  await expect(page.locator("#comment-editform-21 #preview-21 .markdown-preview")).toContainText(
    "First comment",
  );
  await expect(page.locator("#comment-editform-21 #preview-21 strong")).toHaveText("comment");
  await expect(page.locator("#comment-form #edit-contents")).toHaveClass(/active/);
  await expect(page.locator("#comment-form #preview-contents")).not.toHaveClass(/active/);
  await expect(page).toHaveURL(editorUrl);
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-update-editor");
  await updateEditTab.click();
  await expect(page.locator("#comment-editform-21 #edit-21")).toHaveClass(/active/);
  await expect(page.locator("#comment-editform-21 #edit-21")).toBeVisible();
  await expect(page.locator("#comment-editform-21 #preview-21")).toBeHidden();
  await page.locator("#editor-contents-21").fill("Updated **board** comment");
  await updatePreviewTab.click();
  await expect(page.locator("#comment-editform-21 #preview-21 .markdown-preview")).toContainText(
    "Updated board comment",
  );
  await expect(page.locator("#comment-editform-21 #preview-21 strong")).toHaveText("board");
  await updateEditTab.click();
  await page.locator("#comment-editform-21 button[type='submit']").click();
  await expect
    .poll(() => commentUpdateRequests)
    .toEqual([
      {
        attachmentIds: [],
        contentsMarkdown: "Updated **board** comment",
        parentCommentId: null,
      },
    ]);
  await expect(page.locator("#comment-editform-21")).toBeHidden();
  await expect(page.locator("#comment-body-21")).toBeVisible();
  await expect(page.locator("#comment-body-21 .comment-body.markdown-wrap")).toContainText(
    "Updated board comment",
  );
  await expect(page).toHaveURL(editorUrl);
  expect(
    await page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).toBe("board-update-editor");

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const updateFormSource = routeSource.slice(
    routeSource.indexOf("function PostCommentUpdateForm"),
    routeSource.indexOf("function MarkdownEditor"),
  );
  const commentToggleSource = routeSource.slice(
    routeSource.indexOf("function PostComments"),
    routeSource.indexOf("function MarkdownEditor"),
  );
  expect(commentToggleSource).toContain("setEditingCommentId((currentCommentId)");
  expect(commentToggleSource).toContain("event.stopPropagation();");
  expect(commentToggleSource).toContain('data-stylex-owner="post-detail-child-comment-reply"');
  expect(commentToggleSource).toContain('t("notification.receiver.list.title")');
  expect(commentToggleSource).not.toContain("Notification receivers ");
  expect(commentToggleSource).not.toContain("document.");
  expect(commentToggleSource).not.toContain("querySelector");
  expect(commentToggleSource).not.toContain("classList");
  expect(commentToggleSource).not.toContain("setAttribute");
  expect(commentToggleSource).not.toContain("removeAttribute");
  expect(commentToggleSource).not.toContain("innerHTML");
  expect(commentToggleSource).not.toContain("dangerouslySetInnerHTML");
  expect(commentToggleSource).not.toContain("style.display");
  expect(updateFormSource).not.toContain("document.getElementById");
  expect(updateFormSource).not.toContain("setAttribute");
  expect(updateFormSource).not.toContain("removeAttribute");
  expect(updateFormSource).not.toContain("style.display");
  expect(updateFormSource).toContain('t("common.attach.dropFilesHere")');
  expect(updateFormSource).toContain('t("button.upload")');
  expect(updateFormSource).toContain('t("button.cancel")');
  expect(updateFormSource).toContain('t("button.save")');
  expect(updateFormSource).not.toContain("Drag &amp; Drop files here to upload.");
  expect(updateFormSource).not.toContain("File upload");
  expect(updateFormSource).not.toContain(">Cancel<");
  expect(updateFormSource).not.toContain(">Save<");
  const markdownEditorSource = routeSource.slice(
    routeSource.indexOf("function MarkdownEditor"),
    routeSource.indexOf("function AttachedFiles"),
  );
  expect(markdownEditorSource).not.toContain('data-toggle="tab"');
});

test("project board detail renders legacy post and comment attachments", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleMessages: string[] = [];
  page.on("console", (message) => {
    consoleMessages.push(message.text());
  });
  await mockProjectPosts(page, "attachments");

  await page.goto(`${basePath}/admin/sample/post/3`);
  await expect(page.locator(".span-left-pane > #attachments > ul.attaches.wm")).toHaveCount(1);
  await expect(
    page.locator(".span-left-pane > #attachments > ul.attaches.wm > li.attached-file"),
  ).toHaveCount(1);
  await expect(page.locator(".span-left-pane > #attachments > .attached-file")).toHaveCount(0);
  await expect(page.locator("#attachments .attached-file")).not.toHaveAttribute("data-href", /.+/u);
  await expect(page.locator("#attachments .attached-file")).toHaveAttribute(
    "data-name",
    "post-note.txt",
  );
  await expect(page.locator("#attachments .attached-file")).toHaveAttribute(
    "data-mime",
    "text/plain",
  );
  await expect(page.locator("#attachments .attached-delete")).toHaveCount(1);
  await expect(page.locator("#comment-body-21 > .attachments > ul.attaches.wm")).toHaveCount(1);
  await expect(
    page.locator("#comment-body-21 > .attachments > ul.attaches.wm > li.attached-file"),
  ).toHaveCount(1);
  await expect(page.locator("#comment-body-21 > .attachments > .attached-file")).toHaveCount(0);
  await expect(page.locator("#comment-body-21 .attachments .attached-file")).not.toHaveAttribute(
    "data-href",
    /.+/u,
  );
  await expect(page.locator("#comment-body-21 .attachments .attached-file")).toHaveAttribute(
    "data-name",
    "comment-shot.png",
  );
  await expect(page.locator("#comment-body-21 .attachments .attached-delete")).toHaveCount(1);
  const editableAttachment = page.locator(
    "#comment-editform-21 .attachment-files .attached-file-marker",
  );
  await expect(editableAttachment).not.toHaveAttribute("data-href", /.+/u);
  await expect(editableAttachment).toHaveAttribute("data-mime", "image/png");
  const editableAttachmentDelete = page.locator(
    "#comment-editform-21 .attachment-files .attached-file-marker > button.btn-delete",
  );
  await expect(editableAttachmentDelete).toHaveCount(1);
  await expect(editableAttachmentDelete).toHaveAttribute("type", "button");
  await expect(editableAttachmentDelete).toHaveClass("btn-transparent btn-delete");
  await expect(editableAttachmentDelete).toHaveText("×");
  await expect(editableAttachmentDelete).not.toHaveAttribute("data-id", /.+/u);
  await expect(
    page.locator("#comment-editform-21 .attachment-files .btn-delete[data-id]"),
  ).toHaveCount(0);
  await expect(
    page.locator("#comment-editform-21 .attachment-files .attached-file-marker[data-href]"),
  ).toHaveCount(0);

  const postAttachments = [{ id: "31", mimeType: "text/plain", name: "post-note.txt", size: 1024 }];
  const expectedPostAttachments =
    `<div class="attachments" id="attachments" data-attachments='${JSON.stringify(postAttachments)}'><ul class="attaches wm"><li class="attached-file" data-name="post-note.txt" data-mime="text/plain" data-size="1024"><strong>post-note.txt(1024)</strong><button type="button" class="attached-delete"><i class="ico btn-delete"></i></button></li></ul></div>`.replaceAll(
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
    `<div class="attachments" data-attachments='${JSON.stringify(commentAttachments)}'><ul class="attaches wm"><li class="attached-file" data-name="comment-shot.png" data-mime="image/png" data-size="2048"><strong>comment-shot.png(2048)</strong><button type="button" class="attached-delete"><i class="ico btn-delete"></i></button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#comment-body-21 > .attachments")).toEqual(
    await canonicalizeHtml(page, expectedCommentAttachments),
  );

  const expectedCommentUpdateAttachment =
    `<div class="attachment-files"><div class="attached-file attached-file-marker" data-name="comment-shot.png" data-mime="image/png"><i class="mimetype"></i><strong class="name">comment-shot.png</strong><span class="size">2048</span><button type="button" class="btn-transparent btn-delete">×</button></div></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#comment-editform-21 .attachment-files")).toEqual(
    await canonicalizeHtml(page, expectedCommentUpdateAttachment),
  );

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const attachmentSource = routeSource.slice(
    routeSource.indexOf("function AttachedFiles"),
    routeSource.indexOf("function TasklistBar"),
  );
  expect(attachmentSource).toContain('<ul className="attaches wm">');
  expect(routeSource).not.toContain("function attachedFilesHtml");
  expect(routeSource).not.toContain("function attachmentFileHtml");
  expect(attachmentSource).not.toContain("dangerouslySetInnerHTML");
  expect(attachmentSource).not.toContain("data-href");
  expect(attachmentSource).not.toContain("data-href={href}");
  expect(attachmentSource).toContain('<button type="button" className="attached-delete">');
  expect(attachmentSource).toContain('className="attached-file attached-file-marker"');
  const commentEditAttachmentSource = routeSource.slice(
    routeSource.indexOf("function CommentEditAttachmentFiles"),
    routeSource.indexOf("function TasklistBar"),
  );
  expect(commentEditAttachmentSource).toContain('className="btn-transparent btn-delete"');
  expect(commentEditAttachmentSource).not.toContain("data-id");
  expect(
    consoleMessages.some((message) =>
      /validateDOMNesting|<li> cannot (?:be|appear) as a child of <div>/u.test(message),
    ),
  ).toBe(false);
});

test("project board detail renders legacy child comments", async ({ page }) => {
  test.setTimeout(60_000);
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const submitKey = process.platform === "darwin" ? "⌘" : "CTRL";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyLayoutSource = readFileSync("../yona-original/app/views/layout.scala.html", "utf8");
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyChildSource = readFileSync(
    "../yona-original/app/views/common/childComments.scala.html",
    "utf8",
  );
  const legacyFormSource = readFileSync(
    "../yona-original/app/views/common/child_commentForm.scala.html",
    "utf8",
  );
  const legacySubCommentScript = readFileSync(
    "../yona-original/public/javascripts/common/yona.SubComment.js",
    "utf8",
  );
  const legacyAutoLinkSource = readFileSync(
    "../yona-original/app/utils/AutoLinkRenderer.java",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyBootstrapSource = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyResponsiveSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  const owners = [
    "post-detail-child-comment-media-body",
    "post-detail-child-comment-contents",
    "post-detail-child-comment-delete",
    "post-detail-child-comment-oneline-box",
    "post-detail-child-comment-textarea",
    "post-detail-child-comment-submit",
  ] as const;
  const batch815Owners = [
    "post-detail-child-comment-form",
    "post-detail-child-comment-paragraph",
    "post-detail-child-comment-strong",
    "post-detail-child-comment-author-link",
    "post-detail-child-comment-author-strong",
    "post-detail-child-comment-ago-link",
  ] as const;
  const batch816Owners = [
    "post-detail-child-comment-no-text-decoration",
    "post-detail-child-comment-issue-link",
    "post-detail-child-comment-issue-state-open",
    "post-detail-child-comment-blockquote",
    "post-detail-child-comment-blockquote-paragraph",
  ] as const;
  const batch817Owners = [
    "post-detail-child-comment-organization-link",
    "post-detail-child-comment-project-link",
    "post-detail-child-comment-issue-state-closed",
  ] as const;

  expect(legacyViewSource).toContain("@partial_comments(project, post)");
  expect(legacyLayoutSource.indexOf("bootstrap/css/bootstrap.css")).toBeLessThan(
    legacyLayoutSource.indexOf("stylesheets/yobi.css"),
  );
  expect(legacyCommentsSource).toContain(
    "@common.childComments(post, comment, ResourceType.NONISSUE_COMMENT)",
  );
  expect(legacyChildSource).toContain(
    "@common.child_commentForm(posting.asResource(), resourceType, getNewCommentUrl, currentComment.id)",
  );
  expect(legacyChildSource).toMatch(
    /@Html\(Markdown\.render\(comment\.contents, posting\.project\)\)[\s\S]*?<span class="subcomment-author hide">/u,
  );
  expect(legacyViewSource).toContain("yona.SubComment.js");
  expect(legacySubCommentScript).toMatch(
    /var trimmed = \$el\.html\(\)\.replace\(\/\\s\\s\+\/g, ' '\);[\s\S]*?var normalTextRenderedParagraph = \$closest\.find\('p'\)\.last\(\);[\s\S]*?\$el\.remove\(\);[\s\S]*?normalTextRenderedParagraph\.length === 0[\s\S]*?\$closest\.append\(trimmed\);[\s\S]*?normalTextRenderedParagraph\.append\(trimmed\);/u,
  );
  expect(legacyAutoLinkSource).toMatch(
    /return new Link\(RouteUtil\.getUrl\(issue\), "issueLink", prefix \+ linkText\);/u,
  );
  expect(legacyAutoLinkSource).toMatch(
    /return new Link\(RouteUtil\.getUrl\(user\), "no-text-decoration user-link",/u,
  );
  expect(legacyAutoLinkSource).toMatch(
    /return new Link\(RouteUtil\.getUrl\(org\), "<span class='org-link'>@"/u,
  );
  expect(legacyAutoLinkSource).toMatch(
    /return new Link\(RouteUtil\.getUrl\(project\), "<span class='project-link'>@"/u,
  );
  expect(legacyFormSource).toMatch(
    /<div class="oneline-comment-box">[\s\S]*?<textarea class="editorSeries"[\s\S]*?<button type="submit" class="ybtn ybtn-success">OK<\/button>/u,
  );
  expect(legacyPageSource).toMatch(
    /\.subcomment-media-body\s*\{\s*margin-left:\s*60px;\s*text-align:\s*right;[\s\S]*?\.deleteButtonX\s*\{\s*display:\s*inline-flex;\s*align-items:\s*center;\s*color:\s*red;[\s\S]*?\.contents\s*\{\s*text-align:\s*left;\s*margin-left:\s*12px;\s*padding:\s*5px 0 4px 10px;\s*border-bottom:\s*1px dashed #ccc;[\s\S]*?\.child-comment-input-form\s*\{\s*display:\s*none;[\s\S]*?textarea\s*\{\s*margin-top:\s*5px;\s*border:\s*none;\s*border-bottom:\s*1px solid #ccc;\s*border-radius:\s*0 !important;\s*margin-bottom:\s*0;\s*resize:\s*none;\s*overflow:\s*hidden;\s*padding-left:\s*10px;[\s\S]*?button\s*\{\s*display:\s*inline-block;/u,
  );
  expect(legacyCommonSource).toMatch(
    /body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button\{\s*margin:0;\s*padding:0/u,
  );
  expect(legacyCommonSource).toMatch(
    /a\s*\{\s*color:\s*inherit;\s*text-decoration:\s*none;\s*outline:\s*none;[\s\S]*?&:hover\s*\{\s*outline:\s*none !important;\s*text-decoration:\s*underline;\s*\}[\s\S]*?&:focus\s*\{\s*outline:\s*none !important;\s*text-decoration:\s*underline;\s*\}/u,
  );
  expect(legacyBootstrapSource).toMatch(/strong\s*\{\s*font-weight:\s*bold;\s*\}/u);
  expect(legacyBootstrapSource).toMatch(
    /a:hover,\s*a:focus\s*\{\s*color:\s*#005580;\s*text-decoration:\s*underline;\s*\}/u,
  );
  expect(legacyBootstrapSource).toMatch(
    /blockquote\s*\{\s*padding:\s*0 0 0 15px;\s*margin:\s*0 0 20px;\s*border-left:\s*5px solid #eeeeee;\s*\}[\s\S]*?blockquote p\s*\{\s*margin-bottom:\s*0;\s*font-size:\s*17\.5px;\s*font-weight:\s*300;\s*line-height:\s*1\.25;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.contents\s*\{[\s\S]*?\.no-text-decoration\s*\{\s*color:\s*#0e90d2;\s*\}[\s\S]*?a\.issueLink\s*\{\s*color:\s*#0e90d2;\s*\}[\s\S]*?blockquote\s*\{\s*margin-bottom:\s*10px;\s*p\s*\{\s*font-size:\s*1em;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.no-text-decoration\s*\{\s*text-decoration:\s*none !important;\s*\}/u,
  );
  expect(legacyPageSource).toMatch(
    /\.issue-state\s*\{\s*border-radius:\s*3px;\s*padding:\s*0 3px;\s*margin-left:\s*3px;\s*user-select:\s*none;[\s\S]*?&\.open\s*\{\s*color:\s*#fff;\s*background-color:\s*#2ea043;\s*\}[\s\S]*?&:hover\s*\{\s*text-decoration:\s*none;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.oneline-comment-box\s*\{\s*display:\s*flex;\s*margin-left:\s*12px;\s*textarea\s*\{\s*width:\s*100%;/u,
  );
  expect(legacyResponsiveSource).toMatch(
    /\.board-comment-wrap \.comments \.comment \.subcomment-media-body\s*\{\s*margin-left:\s*0;/u,
  );
  expect(legacyYobiSource.indexOf('@import "less/_page.less";')).toBeLessThan(
    legacyYobiSource.indexOf('@import "less/_responsive.less";'),
  );
  // RED recorded before implementation: all six consumer owner counts were zero.
  expect(owners).toHaveLength(6);
  for (const owner of owners) {
    expect(routeSource.match(new RegExp(`data-stylex-owner="${owner}"`, "g"))).toHaveLength(1);
    expect(routeSource).not.toMatch(new RegExp(`data-stylex-owner="${owner}"[^>]*style=`, "u"));
  }
  // RED recorded before Batch 815: these six owners were absent and metadata remained hidden.
  expect(batch815Owners).toHaveLength(6);
  for (const owner of batch815Owners) {
    expect(routeSource.match(new RegExp(`data-stylex-owner="${owner}"`, "g"))).toHaveLength(1);
    expect(routeSource).not.toMatch(new RegExp(`data-stylex-owner="${owner}"[^>]*style=`, "u"));
  }
  // RED recorded before Batch 816: the rich child Markdown had none of these five owners.
  expect(batch816Owners).toHaveLength(5);
  for (const owner of batch816Owners) {
    expect(routeSource.match(new RegExp(`data-stylex-owner="${owner}"`, "g"))).toHaveLength(1);
    expect(routeSource).not.toMatch(new RegExp(`data-stylex-owner="${owner}"[^>]*style=`, "u"));
  }
  expect(routeSource).not.toContain('className="subcomment-author hide"');
  expect(routeSource).toContain("remarkChildCommentMetadata");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(styleSource).toMatch(/childCommentForm:\s*\{\s*display:\s*"none"\s*\}/u);
  expect(styleSource).toMatch(
    /childCommentParagraph:\s*\{\s*color:\s*"#202020",\s*margin:\s*0,\s*padding:\s*0\s*\}/u,
  );
  expect(styleSource).toMatch(/childCommentStrong:\s*\{\s*fontWeight:\s*"bold"\s*\}/u);
  expect(styleSource).toMatch(/childCommentAuthorStrong:\s*\{\s*fontWeight:\s*"bold"\s*\}/u);
  expect(
    styleSource.match(
      /color:\s*"#005580",\s*outline:\s*"none !important",\s*textDecoration:\s*"underline"/g,
    ),
  ).toHaveLength(4);
  expect(styleSource).toContain('"@media all and (max-width: 720px)": { marginLeft: 0 }');
  expect(styleSource).toMatch(
    /childCommentNoTextDecoration:\s*\{\s*color:\s*"#0e90d2",\s*textDecoration:\s*"none !important",\s*\}/u,
  );
  expect(styleSource).toMatch(/childCommentIssueLink:\s*\{\s*color:\s*"#0e90d2"\s*\}/u);
  expect(styleSource).toMatch(
    /childCommentIssueStateOpen:\s*\{\s*backgroundColor:\s*"#2ea043",\s*borderRadius:\s*"3px",\s*color:\s*"#fff",\s*marginLeft:\s*"3px",\s*padding:\s*"0 3px",\s*userSelect:\s*"none",\s*":hover":\s*\{\s*textDecoration:\s*"none"\s*\},\s*\}/u,
  );
  expect(styleSource).toMatch(
    /childCommentIssueStateClosed:\s*\{\s*backgroundColor:\s*"#da3733",\s*borderRadius:\s*"3px",\s*color:\s*"#fff",\s*marginLeft:\s*"3px",\s*padding:\s*"0 3px",\s*userSelect:\s*"none",\s*":hover":\s*\{\s*textDecoration:\s*"none"\s*\},\s*\}/u,
  );
  for (const owner of batch817Owners) {
    expect(routeSource.match(new RegExp(`data-stylex-owner="${owner}"`, "g"))).toHaveLength(1);
    expect(routeSource).not.toMatch(new RegExp(`data-stylex-owner="${owner}"[^>]*style=`, "u"));
  }
  expect(styleSource).toContain('borderColor: "#9741ff"');
  expect(styleSource).toContain('borderStyle: "solid"');
  expect(styleSource).toContain('borderWidth: "1px"');
  expect(styleSource).toContain('backgroundColor: "#9741ff"');
  expect(styleSource).toContain('color: "#00ddff"');
  expect(styleSource).toMatch(
    /childCommentBlockquote:\s*\{\s*borderLeftColor:\s*"#eeeeee",\s*borderLeftStyle:\s*"solid",\s*borderLeftWidth:\s*"5px",\s*margin:\s*"0 0 10px",\s*padding:\s*"0 0 0 15px",\s*\}/u,
  );
  expect(styleSource).toMatch(
    /childCommentBlockquoteParagraph:\s*\{\s*fontSize:\s*"1em",\s*fontWeight:\s*300,\s*lineHeight:\s*1\.25,\s*margin:\s*0,\s*padding:\s*0,\s*\}/u,
  );
  await mockProjectPosts(page, "childComment");

  await page.goto(`${basePath}/admin/sample/post/3`);
  const detailUrl = page.url();
  await installRootModalBridgeGuard(page, ["comment-delete-modal"]);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "post-child-comment-delete";
  });
  await expect(page.locator("#comments .comment-header .num")).toHaveText("2");
  await expect(page.locator("#comment-22")).toHaveCount(1);
  await expect(page.locator("#comment-21 .child-comments .one-line-comment")).toContainText(
    "Nested reply",
  );
  const childCommentMetrics = await page.locator("#comment-21").evaluate((comment) => {
    const reply = comment.querySelector(".add-a-comment") as HTMLElement;
    const body = comment.querySelector(".subcomment-media-body") as HTMLElement;
    const childComments = comment.querySelector(".child-comments") as HTMLElement;
    const row = comment.querySelector(".one-line-comment") as HTMLElement;
    const contents = comment.querySelector(".one-line-comment .contents") as HTMLElement;
    const paragraph = contents.querySelector(":scope > p") as HTMLParagraphElement;
    const blockquote = contents.querySelector(":scope > blockquote") as HTMLQuoteElement;
    const blockquoteParagraph = blockquote.querySelector(":scope > p") as HTMLParagraphElement;
    const mentionLink = blockquoteParagraph.querySelector(
      ".no-text-decoration",
    ) as HTMLAnchorElement;
    const issueLink = blockquoteParagraph.querySelector("a.issueLink") as HTMLAnchorElement;
    const issueState = issueLink.querySelector(".issue-state.open") as HTMLSpanElement;
    const markdownStrong = paragraph.querySelector(
      '[data-stylex-owner="post-detail-child-comment-strong"]',
    ) as HTMLElement;
    const author = paragraph.querySelector(
      '[data-stylex-owner="post-detail-child-comment-author-link"]',
    ) as HTMLAnchorElement;
    const authorStrong = paragraph.querySelector(
      '[data-stylex-owner="post-detail-child-comment-author-strong"]',
    ) as HTMLElement;
    const ago = paragraph.querySelector(
      '[data-stylex-owner="post-detail-child-comment-ago-link"]',
    ) as HTMLAnchorElement;
    const deleteButton = comment.querySelector(".deleteButtonX") as HTMLButtonElement;
    const formWrap = comment.querySelector(".child-comment-input-form") as HTMLElement;
    const form = formWrap.querySelector("form") as HTMLFormElement;
    const parentId = form.querySelector(".parentCommentId") as HTMLInputElement;
    const oneLineBox = form.querySelector(".oneline-comment-box") as HTMLElement;
    const textarea = form.querySelector("textarea") as HTMLTextAreaElement;
    const submitButton = form.querySelector("button[type='submit']") as HTMLButtonElement;
    const notification = form.querySelector(".notification-receiver") as HTMLElement;
    const notificationTitle = form.querySelector(".notification-receiver-title") as HTMLElement;
    const replyStyle = window.getComputedStyle(reply);
    const bodyStyle = window.getComputedStyle(body);
    const contentsStyle = window.getComputedStyle(contents);
    const paragraphStyle = window.getComputedStyle(paragraph);
    const blockquoteStyle = window.getComputedStyle(blockquote);
    const blockquoteParagraphStyle = window.getComputedStyle(blockquoteParagraph);
    const mentionLinkStyle = window.getComputedStyle(mentionLink);
    const issueLinkStyle = window.getComputedStyle(issueLink);
    const issueStateStyle = window.getComputedStyle(issueState);
    const issueLinkRect = issueLink.getBoundingClientRect();
    const issueStateRect = issueState.getBoundingClientRect();
    const markdownStrongStyle = window.getComputedStyle(markdownStrong);
    const authorStyle = window.getComputedStyle(author);
    const authorStrongStyle = window.getComputedStyle(authorStrong);
    const agoStyle = window.getComputedStyle(ago);
    const deleteStyle = window.getComputedStyle(deleteButton);
    const formWrapStyle = window.getComputedStyle(formWrap);
    const oneLineBoxStyle = window.getComputedStyle(oneLineBox);
    const textareaStyle = window.getComputedStyle(textarea);
    const notificationStyle = window.getComputedStyle(notification);
    const submitStyle = window.getComputedStyle(submitButton);

    return {
      replyClassName: reply.className,
      replyText: reply.textContent?.trim(),
      replyDisplay: replyStyle.display,
      replyPosition: replyStyle.position,
      replyRight: replyStyle.right,
      replyMarginTop: replyStyle.marginTop,
      replyPadding: replyStyle.padding,
      replyColor: replyStyle.color,
      replyBorder: replyStyle.border,
      replyBorderRadius: replyStyle.borderRadius,
      bodyClassName: body.className,
      bodyMarginLeft: bodyStyle.marginLeft,
      bodyTextAlign: bodyStyle.textAlign,
      childCommentsClassName: childComments.className,
      rowClassName: row.className,
      contentsText: contents.textContent?.replace(/\s+/g, " ").trim(),
      contentsMarginLeft: contentsStyle.marginLeft,
      contentsPadding: contentsStyle.padding,
      contentsTextAlign: contentsStyle.textAlign,
      contentsBorderBottom: contentsStyle.borderBottom,
      directContentsChildren: Array.from(contents.children).map((element) =>
        element.tagName.toLowerCase(),
      ),
      blockquoteMargin: blockquoteStyle.margin,
      blockquotePadding: blockquoteStyle.padding,
      blockquoteBorderLeft: blockquoteStyle.borderLeft,
      blockquoteParagraphMargin: blockquoteParagraphStyle.margin,
      blockquoteParagraphPadding: blockquoteParagraphStyle.padding,
      blockquoteParagraphFontSize: blockquoteParagraphStyle.fontSize,
      blockquoteParagraphFontWeight: blockquoteParagraphStyle.fontWeight,
      blockquoteParagraphLineHeight: blockquoteParagraphStyle.lineHeight,
      mentionColor: mentionLinkStyle.color,
      mentionDecoration: mentionLinkStyle.textDecorationLine,
      mentionHref: mentionLink.getAttribute("href"),
      issueColor: issueLinkStyle.color,
      issueHref: issueLink.getAttribute("href"),
      issueStateBackground: issueStateStyle.backgroundColor,
      issueStateBorderRadius: issueStateStyle.borderRadius,
      issueStateColor: issueStateStyle.color,
      issueStateMarginLeft: issueStateStyle.marginLeft,
      issueStatePadding: issueStateStyle.padding,
      issueStateUserSelect: issueStateStyle.userSelect,
      issueStateInsideLink:
        issueStateRect.left >= issueLinkRect.left && issueStateRect.right <= issueLinkRect.right,
      paragraphMargin: paragraphStyle.margin,
      paragraphPadding: paragraphStyle.padding,
      directParagraphChildren: Array.from(paragraph.childNodes).map((node) =>
        node.nodeType === Node.TEXT_NODE
          ? `#text:${node.textContent}`
          : (node as Element).matches('[data-stylex-owner="post-detail-child-comment-strong"]')
            ? "markdown-strong"
            : (node as Element).matches(
                  '[data-stylex-owner="post-detail-child-comment-author-link"]',
                )
              ? "author-link"
              : (node as Element).matches(
                    '[data-stylex-owner="post-detail-child-comment-ago-link"]',
                  )
                ? "ago-link"
                : (node as Element).matches(".deleteButtonX")
                  ? "delete"
                  : (node as Element).tagName.toLowerCase(),
      ),
      markdownStrongWeight: markdownStrongStyle.fontWeight,
      authorClassName: author.className,
      authorColor: authorStyle.color,
      authorDecoration: authorStyle.textDecorationLine,
      authorOutline: authorStyle.outlineStyle,
      authorStrongWeight: authorStrongStyle.fontWeight,
      agoColor: agoStyle.color,
      agoDecoration: agoStyle.textDecorationLine,
      agoOutline: agoStyle.outlineStyle,
      agoHref: ago.getAttribute("href"),
      agoTitle: ago.getAttribute("title"),
      deleteTagName: deleteButton.tagName.toLowerCase(),
      deleteType: deleteButton.type,
      deleteHref: deleteButton.getAttribute("href"),
      deleteToggle: deleteButton.getAttribute("data-toggle"),
      deleteTransportMarkerCount: Number(
        deleteButton.hasAttribute("data-request-uri") ||
          deleteButton.hasAttribute("data-request-method"),
      ),
      deleteTitle: deleteButton.getAttribute("title"),
      deleteDisplay: deleteStyle.display,
      deleteAlignItems: deleteStyle.alignItems,
      deleteColor: deleteStyle.color,
      formWrapClassName: formWrap.className,
      formWrapDisplay: formWrapStyle.display,
      formAction: form.getAttribute("action"),
      formMethod: form.getAttribute("method"),
      formEnctype: form.getAttribute("enctype"),
      parentClassName: parentId.className,
      parentName: parentId.name,
      parentValue: parentId.value,
      oneLineBoxClassName: oneLineBox.className,
      oneLineBoxDisplay: oneLineBoxStyle.display,
      oneLineBoxMarginLeft: oneLineBoxStyle.marginLeft,
      textareaClassName: textarea.className,
      textareaName: textarea.name,
      textareaMarkdown: textarea.getAttribute("markdown"),
      textareaRows: textarea.rows,
      textareaPlaceholder: textarea.placeholder,
      textareaMarginTop: textareaStyle.marginTop,
      textareaMarginBottom: textareaStyle.marginBottom,
      textareaPaddingLeft: textareaStyle.paddingLeft,
      textareaOverflow: textareaStyle.overflow,
      textareaResize: textareaStyle.resize,
      textareaBorderBottom: textareaStyle.borderBottom,
      textareaBorderRadius: textareaStyle.borderRadius,
      textareaWidth: textareaStyle.width,
      submitText: submitButton.textContent?.trim(),
      submitClassName: submitButton.className,
      submitDisplay: submitStyle.display,
      notificationClassName: notification.className,
      notificationDisplay: notificationStyle.display,
      notificationMarginLeft: notificationStyle.marginLeft,
      notificationPadding: notificationStyle.padding,
      notificationBackground: notificationStyle.backgroundColor,
      notificationText: notificationTitle.textContent,
    };
  });
  expect(childCommentMetrics).toEqual({
    replyClassName: expect.stringContaining("add-a-comment"),
    replyText: "Reply",
    replyDisplay: "none",
    replyPosition: "relative",
    replyRight: "10px",
    replyMarginTop: "-32px",
    replyPadding: "0px 5px",
    replyColor: "rgb(0, 176, 232)",
    replyBorder: "1px solid rgb(0, 176, 232)",
    replyBorderRadius: "3px",
    bodyClassName: expect.stringContaining("subcomment-media-body"),
    bodyMarginLeft: "60px",
    bodyTextAlign: "right",
    childCommentsClassName: "child-comments",
    rowClassName: "one-line-comment",
    contentsText:
      "@Dev Member references #11.Rich child MarkdownOpen, #12.Closed child MarkdownClosed, @Team, and @other/cross. Nested reply- Site Admin Jul 4, 2026x",
    contentsMarginLeft: "12px",
    contentsPadding: "5px 0px 4px 10px",
    contentsTextAlign: "left",
    contentsBorderBottom: "1px dashed rgb(204, 204, 204)",
    directContentsChildren: ["blockquote", "p"],
    blockquoteMargin: "0px 0px 10px",
    blockquotePadding: "0px 0px 0px 15px",
    blockquoteBorderLeft: "5px solid rgb(238, 238, 238)",
    blockquoteParagraphMargin: "0px",
    blockquoteParagraphPadding: "0px",
    blockquoteParagraphFontSize: "13px",
    blockquoteParagraphFontWeight: "300",
    blockquoteParagraphLineHeight: "16.25px",
    mentionColor: "rgb(14, 144, 210)",
    mentionDecoration: "none",
    mentionHref: `${basePath}/dev`,
    issueColor: "rgb(14, 144, 210)",
    issueHref: `${basePath}/admin/sample/issue/11`,
    issueStateBackground: "rgb(46, 160, 67)",
    issueStateBorderRadius: "3px",
    issueStateColor: "rgb(255, 255, 255)",
    issueStateMarginLeft: "3px",
    issueStatePadding: "0px 3px",
    issueStateUserSelect: "none",
    issueStateInsideLink: true,
    paragraphMargin: "0px",
    paragraphPadding: "0px",
    directParagraphChildren: [
      "#text:Nested ",
      "markdown-strong",
      "#text:-",
      "#text: ",
      "author-link",
      "#text: ",
      "ago-link",
      "delete",
    ],
    markdownStrongWeight: "700",
    authorClassName: expect.stringContaining("usf-group"),
    authorColor: "rgb(32, 32, 32)",
    authorDecoration: "none",
    authorOutline: "none",
    authorStrongWeight: "700",
    agoColor: "rgb(32, 32, 32)",
    agoDecoration: "none",
    agoOutline: "none",
    agoHref: `${basePath}/admin/sample/post/3#comment-22`,
    agoTitle: "Jul 4, 2026",
    deleteTagName: "button",
    deleteType: "button",
    deleteHref: null,
    deleteToggle: null,
    deleteTransportMarkerCount: 0,
    deleteTitle: "Delete comment",
    deleteDisplay: "inline-flex",
    deleteAlignItems: "center",
    deleteColor: "rgb(255, 0, 0)",
    formWrapClassName: expect.stringContaining("child-comment-input-form"),
    formWrapDisplay: "none",
    formAction: `${basePath}/admin/sample/post/3/comments`,
    formMethod: "post",
    formEnctype: "multipart/form-data",
    parentClassName: "parentCommentId",
    parentName: "parentCommentId",
    parentValue: "21",
    oneLineBoxClassName: expect.stringContaining("oneline-comment-box"),
    oneLineBoxDisplay: "flex",
    oneLineBoxMarginLeft: "12px",
    textareaClassName: expect.stringContaining("editorSeries"),
    textareaName: "contents",
    textareaMarkdown: "true",
    textareaRows: 1,
    textareaPlaceholder: `Reply (${submitKey} + ENTER)`,
    textareaMarginTop: "5px",
    textareaMarginBottom: "0px",
    textareaPaddingLeft: "10px",
    textareaOverflow: "hidden",
    textareaResize: "none",
    textareaBorderBottom: "1px solid rgb(204, 204, 204)",
    textareaBorderRadius: "0px",
    textareaWidth: "100%",
    submitText: "OK",
    submitClassName: expect.stringContaining("ybtn ybtn-success"),
    submitDisplay: "block",
    notificationClassName: expect.stringContaining("notification-receiver"),
    notificationDisplay: "none",
    notificationMarginLeft: "12px",
    notificationPadding: "5px 5px 5px 10px",
    notificationBackground: "rgb(247, 247, 247)",
    notificationText: "Notification receivers ",
  });
  expect(childCommentMetrics.contentsText).toContain(
    "@Dev Member references #11.Rich child MarkdownOpen, #12.Closed child MarkdownClosed, @Team, and @other/cross. Nested reply- Site Admin Jul 4, 2026x",
  );
  const batch817DesktopMetrics = await page.locator("#comment-21").evaluate((comment) => {
    const consumers = [
      "post-detail-child-comment-organization-link",
      "post-detail-child-comment-project-link",
      "post-detail-child-comment-issue-state-closed",
    ].map((owner) => comment.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!);
    const links = consumers.map((consumer) => consumer.closest("a") as HTMLAnchorElement);
    return consumers.map((consumer, index) => {
      const style = getComputedStyle(consumer);
      const linkRect = links[index].getBoundingClientRect();
      const rect = consumer.getBoundingClientRect();
      return {
        backgroundColor: style.backgroundColor,
        border: style.border,
        borderRadius: style.borderRadius,
        color: style.color,
        insideLink: rect.left >= linkRect.left && rect.right <= linkRect.right + 1,
        marginRight: style.marginRight,
        padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
        tagName: consumer.tagName.toLowerCase(),
        width: rect.width,
      };
    });
  });
  expect(batch817DesktopMetrics).toEqual([
    {
      backgroundColor: "rgb(151, 65, 255)",
      border: "1px solid rgb(151, 65, 255)",
      borderRadius: "3px",
      color: "rgb(255, 255, 255)",
      insideLink: true,
      marginRight: "3px",
      padding: "0px 2px 0px 2px",
      tagName: "span",
      width: expect.any(Number),
    },
    {
      backgroundColor: "rgb(151, 65, 255)",
      border: "1px solid rgb(151, 65, 255)",
      borderRadius: "3px",
      color: "rgb(255, 255, 255)",
      insideLink: true,
      marginRight: "3px",
      padding: "0px 2px 0px 2px",
      tagName: "span",
      width: expect.any(Number),
    },
    {
      backgroundColor: "rgb(218, 55, 51)",
      border: "0px none rgb(255, 255, 255)",
      borderRadius: "3px",
      color: "rgb(255, 255, 255)",
      insideLink: true,
      marginRight: "0px",
      padding: "0px 3px 0px 3px",
      tagName: "span",
      width: expect.any(Number),
    },
  ]);
  await expect(
    page.locator('[data-stylex-owner="post-detail-child-comment-organization-link"]'),
  ).toHaveText("@Team");
  await expect(
    page.locator('[data-stylex-owner="post-detail-child-comment-project-link"]'),
  ).toHaveText("@other/cross");
  await expect(
    page.locator('[data-stylex-owner="post-detail-child-comment-issue-state-closed"]'),
  ).toHaveText("Closed");
  await expect(
    page.locator('[data-stylex-owner="post-detail-child-comment-organization-link"]').locator(".."),
  ).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(
    page.locator('[data-stylex-owner="post-detail-child-comment-project-link"]').locator(".."),
  ).toHaveAttribute("href", `${basePath}/other/cross`);

  expect(await canonicalize(page, "#comment-21 > .subcomment-media-body")).toEqual(
    await canonicalizeHtml(
      page,
      POPULATED_CHILD_COMMENT_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  const screenshotDirectory = resolve(process.cwd(), "../output/playwright");
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(
      screenshotDirectory,
      "batch-817-local-board-post-child-rich-markdown-desktop.png",
    ),
  });

  const parent = page.locator("#comment-21");
  await expect(parent.locator(".subcomment-author")).toHaveCount(0);
  const metadataParagraph = parent.locator(".one-line-comment .contents > p");
  await expect(metadataParagraph.locator(":scope > .usf-group")).toHaveCount(1);
  await expect(metadataParagraph.locator(":scope > .ago")).toHaveCount(1);
  await expect(metadataParagraph.locator(":scope > .deleteButtonX")).toHaveCount(1);
  for (const owner of owners) {
    const consumer = parent.locator(`[data-stylex-owner="${owner}"]`);
    await expect(consumer).toHaveCount(1);
    await expect(consumer).not.toHaveAttribute("style", /.+/u);
  }
  for (const owner of batch816Owners) {
    const consumer = parent.locator(`[data-stylex-owner="${owner}"]`);
    const expectedCount = owner === "post-detail-child-comment-issue-link" ? 2 : 1;
    await expect(consumer).toHaveCount(expectedCount);
    for (let index = 0; index < expectedCount; index += 1) {
      await expect(consumer.nth(index)).not.toHaveAttribute("style", /.+/u);
    }
  }
  for (const owner of batch815Owners) {
    const consumer = parent.locator(`[data-stylex-owner="${owner}"]`);
    await expect(consumer).toHaveCount(1);
    await expect(consumer).not.toHaveAttribute("style", /.+/u);
  }
  await parent.hover();
  const reply = parent.locator('[data-stylex-owner="post-detail-child-comment-reply"]');
  await expect(reply).toBeVisible();
  await reply.click();
  const childForm = parent.locator(".child-comment-input-form");
  const childTextarea = parent.locator('[data-stylex-owner="post-detail-child-comment-textarea"]');
  await expect(childForm).toBeVisible();
  await expect(childTextarea).toBeFocused();
  await childTextarea.fill("Draft nested reply");
  const openMetrics = await parent.evaluate((comment) => {
    const body = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-media-body"]',
    )!;
    const box = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-oneline-box"]',
    )!;
    const textarea = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-textarea"]',
    )!;
    const submit = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-submit"]',
    )!;
    const bodyBox = body.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    const submitRect = submit.getBoundingClientRect();
    return {
      bodyLeft: bodyBox.left,
      bodyRight: bodyBox.right,
      boxLeft: boxRect.left,
      boxRight: boxRect.right,
      textareaLeft: textareaRect.left,
      textareaRight: textareaRect.right,
      submitLeft: submitRect.left,
      submitRight: submitRect.right,
      overlaps: textareaRect.right > submitRect.left,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(openMetrics.boxLeft).toBeGreaterThanOrEqual(openMetrics.bodyLeft);
  expect(openMetrics.boxRight).toBeLessThanOrEqual(openMetrics.bodyRight + 1);
  expect(openMetrics.textareaLeft).toBeGreaterThanOrEqual(openMetrics.boxLeft);
  expect(openMetrics.submitRight).toBeLessThanOrEqual(openMetrics.boxRight + 1);
  expect(openMetrics.overlaps).toBe(false);
  expect(openMetrics.overflow).toBe(false);
  await reply.click();
  await expect(childForm).toBeHidden();
  await reply.click();
  await expect(childTextarea).toHaveValue("Draft nested reply");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMetrics = await parent.evaluate((comment) => {
    const body = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-media-body"]',
    )!;
    const contents = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-contents"]',
    )!;
    const blockquote = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-blockquote"]',
    )!;
    const blockquoteParagraph = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-blockquote-paragraph"]',
    )!;
    const issueLink = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-issue-link"]',
    )!;
    const issueState = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-issue-state-open"]',
    )!;
    const organizationLink = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-organization-link"]',
    )!;
    const projectLink = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-project-link"]',
    )!;
    const closedIssueState = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-issue-state-closed"]',
    )!;
    const box = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-oneline-box"]',
    )!;
    const textarea = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-textarea"]',
    )!;
    const submit = comment.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-child-comment-submit"]',
    )!;
    const bodyRect = body.getBoundingClientRect();
    const contentsRect = contents.getBoundingClientRect();
    const blockquoteRect = blockquote.getBoundingClientRect();
    const blockquoteParagraphRect = blockquoteParagraph.getBoundingClientRect();
    const issueLinkRect = issueLink.getBoundingClientRect();
    const issueStateRect = issueState.getBoundingClientRect();
    const organizationRect = organizationLink.getBoundingClientRect();
    const organizationLinkRect = organizationLink.closest("a")!.getBoundingClientRect();
    const projectRect = projectLink.getBoundingClientRect();
    const projectAnchorRect = projectLink.closest("a")!.getBoundingClientRect();
    const closedIssueStateRect = closedIssueState.getBoundingClientRect();
    const closedIssueLinkRect = closedIssueState.closest("a")!.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    const submitRect = submit.getBoundingClientRect();
    const bodyStyle = getComputedStyle(body);
    const textareaStyle = getComputedStyle(textarea);
    const issueStateStyle = getComputedStyle(issueState);
    const organizationStyle = getComputedStyle(organizationLink);
    const projectStyle = getComputedStyle(projectLink);
    const closedIssueStateStyle = getComputedStyle(closedIssueState);
    return {
      bodyMarginLeft: bodyStyle.marginLeft,
      bodyTextAlign: bodyStyle.textAlign,
      contentsInside:
        contentsRect.left >= bodyRect.left && contentsRect.right <= bodyRect.right + 1,
      blockquoteInside:
        blockquoteRect.left >= contentsRect.left && blockquoteRect.right <= contentsRect.right + 1,
      blockquoteParagraphInside:
        blockquoteParagraphRect.left >= blockquoteRect.left &&
        blockquoteParagraphRect.right <= blockquoteRect.right + 1,
      issueStateBackground: issueStateStyle.backgroundColor,
      issueStateColor: issueStateStyle.color,
      issueStateInsideLink:
        issueStateRect.left >= issueLinkRect.left && issueStateRect.right <= issueLinkRect.right,
      organizationBackground: organizationStyle.backgroundColor,
      organizationColor: organizationStyle.color,
      organizationInsideLink:
        organizationRect.left >= organizationLinkRect.left &&
        organizationRect.right <= organizationLinkRect.right + 1,
      projectBackground: projectStyle.backgroundColor,
      projectColor: projectStyle.color,
      projectInsideLink:
        projectRect.left >= projectAnchorRect.left &&
        projectRect.right <= projectAnchorRect.right + 1,
      closedIssueBackground: closedIssueStateStyle.backgroundColor,
      closedIssueColor: closedIssueStateStyle.color,
      closedIssueInsideLink:
        closedIssueStateRect.left >= closedIssueLinkRect.left &&
        closedIssueStateRect.right <= closedIssueLinkRect.right + 1,
      formInside: boxRect.left >= bodyRect.left && boxRect.right <= bodyRect.right + 1,
      textareaWidth: textareaStyle.width,
      nonOverlap: textareaRect.right <= submitRect.left,
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
  });
  expect(mobileMetrics).toEqual({
    bodyMarginLeft: "0px",
    bodyTextAlign: "right",
    contentsInside: true,
    blockquoteInside: true,
    blockquoteParagraphInside: true,
    issueStateBackground: "rgb(46, 160, 67)",
    issueStateColor: "rgb(255, 255, 255)",
    issueStateInsideLink: true,
    organizationBackground: "rgb(151, 65, 255)",
    organizationColor: "rgb(255, 255, 255)",
    organizationInsideLink: true,
    projectBackground: "rgb(151, 65, 255)",
    projectColor: "rgb(255, 255, 255)",
    projectInsideLink: true,
    closedIssueBackground: "rgb(218, 55, 51)",
    closedIssueColor: "rgb(255, 255, 255)",
    closedIssueInsideLink: true,
    formInside: true,
    textareaWidth: expect.stringMatching(/px$/u),
    nonOverlap: true,
    noOverflow: true,
  });
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "batch-817-local-board-post-child-rich-markdown-mobile.png"),
  });

  const mentionLink = parent.locator(
    '[data-stylex-owner="post-detail-child-comment-no-text-decoration"]',
  );
  const issueLink = parent.locator('[data-stylex-owner="post-detail-child-comment-issue-link"]');
  const openIssueLink = issueLink.filter({ hasText: "#11.Rich child Markdown" });
  const closedIssueLink = issueLink.filter({ hasText: "#12.Closed child Markdown" });
  const issueState = openIssueLink.locator(
    '[data-stylex-owner="post-detail-child-comment-issue-state-open"]',
  );
  const closedIssueState = closedIssueLink.locator(
    '[data-stylex-owner="post-detail-child-comment-issue-state-closed"]',
  );
  await expect(mentionLink).toHaveText("@Dev Member");
  await expect(mentionLink).toHaveAttribute("href", `${basePath}/dev`);
  await expect(openIssueLink).toHaveCount(1);
  await expect(openIssueLink).toContainText("#11.Rich child Markdown");
  await expect(openIssueLink).toHaveAttribute("href", `${basePath}/admin/sample/issue/11`);
  await expect(issueState).toHaveText("Open");
  await expect(issueState).toHaveCSS("background-color", "rgb(46, 160, 67)");
  await expect(issueState).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(closedIssueLink).toHaveCount(1);
  await expect(closedIssueLink).toContainText("#12.Closed child Markdown");
  await expect(closedIssueLink).toHaveAttribute("href", `${basePath}/admin/sample/issue/12`);
  await expect(closedIssueState).toHaveText("Closed");
  await expect(closedIssueState).toHaveCSS("background-color", "rgb(218, 55, 51)");
  await expect(closedIssueState).toHaveCSS("color", "rgb(255, 255, 255)");
  await expectNoTanStackActiveAttrs(mentionLink);
  await expectNoTanStackActiveAttrs(openIssueLink);
  await expectNoTanStackActiveAttrs(closedIssueLink);
  await issueState.hover();
  await expect(issueState).toHaveCSS("text-decoration-line", "none");
  await closedIssueState.hover();
  await expect(closedIssueState).toHaveCSS("text-decoration-line", "none");
  await mentionLink.click();
  await expect(page).toHaveURL(`${basePath}/dev?daysAgo=14&selected=issues`);
  await page.goBack();
  await expect(page).toHaveURL(detailUrl);
  await openIssueLink.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await page.goBack();
  await expect(page).toHaveURL(detailUrl);

  const childMetadata = page.locator("#comment-21 .one-line-comment .contents > p");
  const authorLink = childMetadata.locator(":scope > .usf-group");
  const agoLink = childMetadata.locator(":scope > .ago");
  await expect(authorLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(agoLink).toHaveAttribute("href", `${basePath}/admin/sample/post/3#comment-22`);
  await expectNoTanStackActiveAttrs(authorLink);
  await expectNoTanStackActiveAttrs(agoLink);
  await authorLink.hover();
  await expect(authorLink).toHaveCSS("color", "rgb(0, 85, 128)");
  await expect(authorLink).toHaveCSS("text-decoration-line", "underline");
  await agoLink.focus();
  await expect(agoLink).toHaveCSS("color", "rgb(0, 85, 128)");
  await expect(agoLink).toHaveCSS("text-decoration-line", "underline");
  const childDeleteButton = childMetadata.locator('button[type="button"].deleteButtonX');
  await expect(childDeleteButton).toHaveText("x");
  await expect(childDeleteButton).not.toHaveAttribute("data-request-uri");
  await expect(childDeleteButton).not.toHaveAttribute("data-request-method");
  expect(await dispatchCancelableClick(childDeleteButton)).toBe(false);
  await expectRootModalBridgeUnused(page);
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute("data-request-uri");
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute("data-request-method");
  await expect(page).toHaveURL(detailUrl);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("post-child-comment-delete");
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
        className: element.className,
        color: style.color,
        dataCategoryId: element.getAttribute("data-category-id"),
        dataLabelId: element.getAttribute("data-label-id"),
        hasInlineBackgroundStyle: element.getAttribute("style")?.includes("background-color"),
        hasInlineColorStyle: element.getAttribute("style")?.includes("color"),
        href: element.getAttribute("href"),
        tagName: element.tagName.toLowerCase(),
        text: element.textContent?.trim(),
        type: element.getAttribute("type"),
      };
    });
}

async function boardTwoColumnMetrics(page: Page) {
  return page.locator("#option_form #two-column-mode-checkbox").evaluate((element) => {
    const wrapperStyle = window.getComputedStyle(element);
    const border = element.querySelector(".two-column-icon-border") as HTMLElement;
    const borderStyle = window.getComputedStyle(border);
    const input = element.querySelector("#two-column-mode") as HTMLInputElement;
    const inputStyle = window.getComputedStyle(input);
    const text = element.querySelector(".two-column-mode-text") as HTMLElement;
    const textStyle = window.getComputedStyle(text);
    const labels = document.querySelector("#option_form .board-labels");

    return {
      borderColor: borderStyle.borderColor,
      borderPadding: borderStyle.padding,
      borderRadius: borderStyle.borderRadius,
      borderTextColor: borderStyle.color,
      checkboxId: input.id,
      checkboxMargin: inputStyle.margin,
      dataContent: element.getAttribute("data-content"),
      display: wrapperStyle.display,
      followsLabels: Boolean(
        labels && labels.compareDocumentPosition(element) === Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      lineHeight: wrapperStyle.lineHeight,
      marginLeft: wrapperStyle.marginLeft,
      text: text.textContent?.trim(),
      textLineHeight: textStyle.lineHeight,
      textPadding: textStyle.padding,
      title: element.getAttribute("title"),
      wrapperClass: element.getAttribute("class"),
      wrapperPosition: wrapperStyle.position,
    };
  });
}

async function boardTwoColumnPopoverMetrics(page: Page) {
  return page.locator("#option_form #two-column-mode-checkbox").evaluate((wrapper) => {
    const popover = wrapper.querySelector(".popover.top") as HTMLElement;
    const title = popover.querySelector(".popover-title") as HTMLElement;
    const content = popover.querySelector(".popover-content") as HTMLElement;
    const popoverBox = popover.getBoundingClientRect();
    const wrapperBox = wrapper.getBoundingClientRect();

    return {
      className: popover.className,
      contentText: content.textContent?.trim(),
      isAboveWrapper: popoverBox.bottom <= wrapperBox.top + 2,
      placement: popover.classList.contains("top") ? "top" : "",
      titleText: title.textContent?.trim(),
    };
  });
}

async function boardDetailMetrics(page: Page) {
  return page.locator(".project-page-wrap.board-view").evaluate((element) => {
    const navbar = document.querySelector("[data-stylex-owner=global-gnb-outer]") as HTMLElement;
    const searchForm = document.querySelector(".gnb-search-form") as HTMLFormElement;
    const scope = document.querySelector("#gnb-search-scope-title") as HTMLElement;
    const searchBox = document.querySelector(
      '[data-stylex-owner="global-gnb-search-box"]',
    ) as HTMLElement;
    const projectHeader = document.querySelector(".project-header-outer") as HTMLElement;
    const projectMenu = document.querySelector(".project-menu-outer") as HTMLElement;
    const header = element.querySelector(".board-header.issue") as HTMLElement;
    const title = header.querySelector(".title") as HTMLElement;
    const body = element.querySelector(".board-body") as HTMLElement;
    const leftPane = element.querySelector(".span-left-pane") as HTMLElement;
    const rightPane = element.querySelector(".span-right-pane") as HTMLElement;
    const actionRow = element.querySelector(".board-actrow") as HTMLElement;
    const content = element.querySelector("#post-body-3 .content.markdown-wrap") as HTMLElement;
    const watchButton = element.querySelector("#watch-button") as HTMLButtonElement;
    const newPost = element.querySelector(".issue-info.board-labels .project-btn-item a");
    const deleteTransportMarkers = document.querySelectorAll(
      "#deleteConfirm [data-request-uri], #deleteConfirm [data-request-method]",
    );
    const templates = document.querySelectorAll("#tplAttachedFile, #tplDropFilesHere");
    const commentUpload = element.querySelector("#comment-form #upload") as HTMLElement;
    const commentUploadFile = commentUpload.querySelector("input.file") as HTMLInputElement;
    const commentUploadAttachedFiles = commentUpload.querySelector(
      ".attached-files",
    ) as HTMLElement;
    const keymap = element.querySelector(".board-footer button");
    const headerStyle = window.getComputedStyle(header);
    const titleStyle = window.getComputedStyle(title);
    const bodyStyle = window.getComputedStyle(body);
    const actionStyle = window.getComputedStyle(actionRow);
    const contentStyle = window.getComputedStyle(content);
    const navbarRect = navbar.getBoundingClientRect();
    const scopeRect = scope.getBoundingClientRect();
    const searchRect = searchBox.getBoundingClientRect();
    const projectHeaderRect = projectHeader.getBoundingClientRect();
    const projectMenuRect = projectMenu.getBoundingClientRect();
    const boardRect = element.getBoundingClientRect();

    return {
      actionRowTextAlign: actionStyle.textAlign,
      attachmentTemplateCount: templates.length,
      boardTopAtOrBelowMenu: Math.round(boardRect.top) >= Math.round(projectMenuRect.bottom),
      bodyDisplay: bodyStyle.display,
      bodyWidth: Math.round(body.getBoundingClientRect().width),
      commentUploadAttachedFilesClass: commentUploadAttachedFiles.className,
      commentUploadClass: commentUpload.className,
      commentUploadFileMultiple: commentUploadFile.multiple,
      commentUploadResourceType: commentUpload.getAttribute("data-resource-type"),
      contentAllowedUpdate: content.getAttribute("data-allowed-update"),
      contentLineHeight: contentStyle.lineHeight,
      deleteTransportMarkerCount: deleteTransportMarkers.length,
      documentTitle: document.title,
      footerKeyboardTarget: keymap?.getAttribute("data-target") ?? null,
      gnbClassName: navbar.className,
      gnbSearchAction: searchForm.getAttribute("action"),
      gnbSearchScopeDataActions: Array.from(
        document.querySelectorAll("[data-stylex-owner=global-gnb-search-scope-item] > button"),
      ).map((searchScope) => searchScope.getAttribute("data-action")),
      gnbSearchScopeLabels: Array.from(
        document.querySelectorAll("[data-stylex-owner=global-gnb-search-scope-item] > button"),
      ).map((searchScope) => searchScope.textContent?.trim() ?? ""),
      gnbSearchScopeTitle: scope.textContent?.trim() ?? null,
      headerMarginBottom: headerStyle.marginBottom,
      leftPaneWidth: Math.round(leftPane.getBoundingClientRect().width),
      newPostHref: newPost?.getAttribute("href") ?? null,
      postBodyId: element.querySelector("#post-body-3")?.id ?? null,
      postEditorId: element.querySelector("#post-3")?.id ?? null,
      projectHeaderProjectName:
        projectHeader.querySelector(".project-breadcrumb .project-name a")?.textContent?.trim() ??
        null,
      projectHeaderBottomBelowNavbar:
        Math.round(projectHeaderRect.bottom) > Math.round(navbarRect.bottom),
      projectMenuActiveCount: projectMenu.querySelectorAll(".project-menu-gruop li.active").length,
      projectMenuActiveText:
        projectMenu
          .querySelector(".project-menu-gruop li.active .menu-name")
          ?.textContent?.trim() ?? null,
      projectMenuTopAtOrBelowHeader:
        Math.round(projectMenuRect.top) >= Math.round(projectHeaderRect.bottom),
      rightPaneWidth: Math.round(rightPane.getBoundingClientRect().width),
      scopeBottomWithinNavbar: Math.round(scopeRect.bottom) <= Math.round(navbarRect.bottom),
      scopeTopWithinNavbar: Math.round(scopeRect.top) >= Math.round(navbarRect.top),
      searchBottomWithinNavbar: Math.round(searchRect.bottom) <= Math.round(navbarRect.bottom),
      searchLeftWithinNavbar: Math.round(searchRect.left) >= Math.round(navbarRect.left),
      searchRightWithinNavbar: Math.round(searchRect.right) <= Math.round(navbarRect.right),
      searchTopWithinNavbar: Math.round(searchRect.top) >= Math.round(navbarRect.top),
      titleFontSize: titleStyle.fontSize,
      watchButtonHeight: Math.round(watchButton.getBoundingClientRect().height),
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

async function postingHistoryMetrics(page: Page) {
  return page.locator("#-yona-posting-history").evaluate((modal) => {
    const rect = modal.getBoundingClientRect();
    const backdrop = document.querySelector<HTMLElement>(".modal-backdrop");
    const body = modal.querySelector<HTMLElement>(".modal-body");
    const button = modal.querySelector<HTMLButtonElement>(".modal-footer button.ybtn-info");
    const footer = modal.querySelector<HTMLElement>(".modal-footer");
    const header = modal.querySelector<HTMLElement>(".modal-header");
    const history = document.querySelector<HTMLElement>(".posting-history");
    return {
      backdropDisplay: backdrop ? window.getComputedStyle(backdrop).display : null,
      bodyPadding: body ? window.getComputedStyle(body).padding : null,
      confirmText: button?.textContent?.trim() ?? null,
      display: window.getComputedStyle(modal).display,
      footerTextAlign: footer ? window.getComputedStyle(footer).textAlign : null,
      headerBorderBottomWidth: header ? window.getComputedStyle(header).borderBottomWidth : null,
      historyDisplay: history ? window.getComputedStyle(history).display : null,
      historyMarginLeft: history ? window.getComputedStyle(history).marginLeft : null,
      title: header?.querySelector("h5")?.textContent?.trim() ?? null,
      top: Math.round((rect.top / window.innerHeight) * 100),
      width: Math.round(rect.width),
    };
  });
}

async function emptyBoardGeometry(page: Page) {
  return page.evaluate(() => {
    const pagination = document.querySelector<HTMLElement>("#pagination")!;
    const projectPage = document.querySelector<HTMLElement>(".post-list.project-page-wrap")!;
    const paginationStyle = getComputedStyle(pagination);
    const projectPageStyle = getComputedStyle(projectPage);
    return {
      borderTopWidth: projectPageStyle.borderTopWidth,
      documentWidth: document.documentElement.scrollWidth,
      paginationDisplay: paginationStyle.display,
      paginationMargin: paginationStyle.margin,
      projectPageHeight: Math.round(projectPage.getBoundingClientRect().height),
    };
  });
}

test("authenticated populated board post owns the comment-card skeleton in StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyResponsiveSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyBootstrapSource = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );

  expect(legacyCommentsSource).toMatch(
    /<ul class="comments">[\s\S]*?<li class="comment [^>]*id="comment-@comment\.id">[\s\S]*?<div class="comment-avatar">[\s\S]*?class="avatar-wrap"[\s\S]*?<div class="media-body">[\s\S]*?<div class="meta-info">/u,
  );
  expect(legacyPageSource).toMatch(
    /\.comments\s*\{\s*margin:\s*0;\s*padding:\s*0;\s*list-style:\s*none;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.comment\s*\{[\s\S]*?padding:\s*10px 0px;[\s\S]*?position:\s*relative;[\s\S]*?\.comment-avatar\s*\{\s*float:\s*left;\s*padding-left:\s*5px;/u,
  );
  expect(legacyCommonSource).toMatch(/\.avatar-wrap\s*\{[\s\S]*?display:\s*inline-block;/u);
  expect(legacyPageSource).toMatch(
    /\.media-body\s*\{[\s\S]*?margin-left:\s*52px;[\s\S]*?border:\s*1px solid #BDC3C7;[\s\S]*?\.border-radius\(3px\);[\s\S]*?&:before\s*\{[\s\S]*?top:\s*23px;[\s\S]*?left:\s*47px;[\s\S]*?width:\s*9px;[\s\S]*?height:\s*9px;[\s\S]*?border-width:\s*0 0 1px 1px;[\s\S]*?background-color:\s*#f8f8f8;[\s\S]*?\.rotate\(45deg\);[\s\S]*?&:hover\s*\{\s*box-shadow:\s*2px 2px 1px 0 rgb\(220, 220, 220\)/u,
  );
  expect(legacyPageSource).toMatch(
    /\.meta-info\s*\{\s*height:\s*22px;\s*padding:\s*5px 15px;\s*margin-bottom:\s*0;\s*background-color:\s*#F7F7F7;/u,
  );
  expect(legacyBootstrapSource).toMatch(/\.media,\s*\.media-body\s*\{\s*overflow:\s*hidden;/u);
  expect(legacyResponsiveSource).toMatch(
    /@media all and \(max-width:\s*720px\)[\s\S]*?\.media-body \.meta-info\s*\{\s*padding:\s*5px 5px !important;[\s\S]*?\.comment-avatar\s*\{\s*display:\s*none;[\s\S]*?\.media-body\s*\{\s*margin-left:\s*0 !important;[\s\S]*?&:before\s*\{\s*display:\s*none;/u,
  );
  expect(styleSource).toContain("commentList:");
  expect(styleSource).toContain("commentRow:");
  expect(styleSource).toContain("commentAvatar:");
  expect(styleSource).toContain("commentAvatarWrap:");
  expect(styleSource).toContain("commentMedia:");
  expect(styleSource).toContain("commentMeta:");
  for (const owner of [
    "post-detail-comment-list",
    "post-detail-comment-row",
    "post-detail-comment-avatar",
    "post-detail-comment-avatar-wrap",
    "post-detail-comment-media",
    "post-detail-comment-meta",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).not.toMatch(/style=\{|style:\s*\{/u);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await mockProjectPosts(page, "comment");
    await page.route("**/api/v1/projects/admin/sample/posts/1", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          authorId: "2",
          authorLabel: "Dev Member",
          authorLoginId: "dev",
          bodyHtml: "<p>Server HTML should not render</p>",
          bodyMarkdown: "Populated **board post**",
          commentCount: 1,
          comments: [
            {
              attachments: [],
              authorId: "2",
              authorLabel: "Dev Member",
              authorLoginId: "dev",
              contentsHtml: "<p>Server HTML should not render</p>",
              contentsMarkdown: "First **comment**",
              createdLabel: "Jul 3, 2026",
              id: "21",
              parentCommentId: "",
              viaEmail: false,
            },
          ],
          createdLabel: "Jul 2, 2026",
          historyHtml: "",
          historyMarkdown: "",
          id: "31",
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
            canUpdate: true,
            canWatch: true,
          },
          postNumber: "1",
          projectName: "sample",
          readme: false,
          title: "Populated board post",
          updatedLabel: "Jul 2, 2026",
          watcherCount: 0,
        }),
      });
    });
    await page.goto(`${basePath}/admin/sample/post/1`);

    const comment = page.locator('[data-stylex-owner="post-detail-comment-row"]');
    await expect(comment).toHaveCount(1);
    const normal = await comment.evaluate((row) => {
      const list = row.closest<HTMLElement>("ul.comments")!;
      const avatar = row.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-comment-avatar"]',
      )!;
      const avatarWrap = avatar.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-comment-avatar-wrap"]',
      )!;
      const media = row.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-comment-media"]',
      )!;
      const meta = row.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-comment-meta"]',
      )!;
      const listStyle = getComputedStyle(list);
      const rowStyle = getComputedStyle(row);
      const avatarStyle = getComputedStyle(avatar);
      const mediaStyle = getComputedStyle(media);
      const pointerStyle = getComputedStyle(media, "::before");
      const metaStyle = getComputedStyle(meta);
      const rowRect = row.getBoundingClientRect();
      const mediaRect = media.getBoundingClientRect();
      const metaRect = meta.getBoundingClientRect();
      return {
        listStyle: listStyle.listStyleType,
        listMargin: listStyle.margin,
        listPadding: listStyle.padding,
        rowPosition: rowStyle.position,
        rowPadding: rowStyle.padding,
        avatarDisplay: avatarStyle.display,
        avatarFloat: avatarStyle.float,
        avatarPaddingLeft: avatarStyle.paddingLeft,
        avatarWrapDisplay: getComputedStyle(avatarWrap).display,
        mediaMarginLeft: mediaStyle.marginLeft,
        mediaOverflow: mediaStyle.overflow,
        mediaBorder: mediaStyle.border,
        mediaRadius: mediaStyle.borderRadius,
        pointerDisplay: pointerStyle.display,
        pointerContent: pointerStyle.content,
        pointerTop: pointerStyle.top,
        pointerLeft: pointerStyle.left,
        pointerWidth: pointerStyle.width,
        pointerHeight: pointerStyle.height,
        pointerBorderColor: pointerStyle.borderColor,
        pointerBorderStyle: pointerStyle.borderStyle,
        pointerBorderWidth: pointerStyle.borderWidth,
        pointerBackground: pointerStyle.backgroundColor,
        pointerTransform: pointerStyle.transform,
        metaHeight: metaStyle.height,
        metaPadding: metaStyle.padding,
        metaMarginBottom: metaStyle.marginBottom,
        metaBackground: metaStyle.backgroundColor,
        mediaContained:
          mediaRect.left >= rowRect.left - 0.5 && mediaRect.right <= rowRect.right + 0.5,
        metaContained:
          metaRect.left >= mediaRect.left - 0.5 && metaRect.right <= mediaRect.right + 0.5,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(normal).toMatchObject({
      listStyle: "none",
      listMargin: "0px",
      listPadding: "0px",
      rowPosition: "relative",
      rowPadding: "10px 0px",
      avatarWrapDisplay: "inline-block",
      mediaOverflow: "hidden",
      mediaBorder: "1px solid rgb(189, 195, 199)",
      mediaRadius: "3px",
      metaHeight: "22px",
      metaMarginBottom: "0px",
      metaBackground: "rgb(247, 247, 247)",
      mediaContained: true,
      metaContained: true,
    });
    if (viewport.width > 720) {
      expect(normal).toMatchObject({
        avatarDisplay: "block",
        avatarFloat: "left",
        avatarPaddingLeft: "5px",
        mediaMarginLeft: "52px",
        pointerDisplay: "block",
        pointerContent: '" "',
        pointerTop: "23px",
        pointerLeft: "47px",
        pointerWidth: "9px",
        pointerHeight: "9px",
        pointerBorderColor: "rgb(189, 195, 199)",
        pointerBorderStyle: "solid",
        pointerBorderWidth: "0px 0px 1px 1px",
        pointerBackground: "rgb(248, 248, 248)",
        metaPadding: "5px 15px",
      });
      expect(normal.pointerTransform).not.toBe("none");
      await comment.locator('[data-stylex-owner="post-detail-comment-media"]').hover();
      await expect(comment.locator('[data-stylex-owner="post-detail-comment-media"]')).toHaveCSS(
        "box-shadow",
        "rgb(220, 220, 220) 2px 2px 1px 0px",
      );
    } else {
      expect(normal).toMatchObject({
        avatarDisplay: "none",
        mediaMarginLeft: "0px",
        pointerDisplay: "none",
        metaPadding: "5px",
      });
    }
    expect(normal.documentWidth).toBeLessThanOrEqual(normal.viewportWidth);

    await page.goto(`${basePath}/admin/sample/post/1#comment-21`);
    const targeted = await comment.evaluate((row) => {
      const media = row.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-comment-media"]',
      )!;
      return {
        border: getComputedStyle(media).border,
        pointerBorderColor: getComputedStyle(media, "::before").borderColor,
        pointerBorderWidth: getComputedStyle(media, "::before").borderWidth,
      };
    });
    expect(targeted.border).toBe("2px solid rgb(3, 169, 244)");
    if (viewport.width > 720) {
      expect(targeted.pointerBorderColor).toBe("rgb(3, 169, 244)");
      expect(targeted.pointerBorderWidth).toBe("0px 0px 2px 2px");
    }
  }
});

test("authenticated populated board post owns comment identity actions and body in StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyResponsiveSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyYobiUiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );
  const legacyVariablesSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const legacyMarkdownSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_markdown.less",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  const legacyYobiconSource = readFileSync(
    "../yona-original/public/stylesheets/yobicon/style.css",
    "utf8",
  );

  expect(legacyCommentsSource).toMatch(
    /<span class="comment_author">[\s\S]*?<span class="resp-comment-avatar">[\s\S]*?class="avatar-wrap"[\s\S]*?<a href="#comment-@comment\.id" class="ago"[\s\S]*?class="btn-transparent ml10"[\s\S]*?<i class="yobicon-edit-2">[\s\S]*?class="btn-transparent ml6"[\s\S]*?<i class="yobicon-trash">[\s\S]*?<div class="comment-body markdown-wrap"/u,
  );
  expect(legacyPageSource).toMatch(
    /\.comment_author\s*\{\s*font-size:\s*13px;\s*margin-right:\s*5px;\s*color:\s*#3f3e40;\s*vertical-align:\s*middle;/u,
  );
  expect(legacyPageSource).toMatch(/\.ago\s*\{\s*color:\s*#7F8C8D;/u);
  expect(legacyPageSource).toMatch(/\.resp-comment-avatar\s*\{\s*display:\s*none;/u);
  expect(legacyCommonSource).toMatch(
    /\.avatar-wrap\s*\{\s*width:\s*32px;\s*height:\s*32px;\s*vertical-align:\s*top;\s*overflow:\s*hidden;\s*display:\s*inline-block;/u,
  );
  expect(legacyResponsiveSource).toMatch(
    /\.media-body\s*\{[\s\S]*?\.resp-comment-avatar\s*\{\s*display:\s*inline-block;[\s\S]*?\.avatar-wrap\s*\{\s*width:\s*24px !important;\s*height:\s*24px !important;\s*margin-top:\s*-5px;/u,
  );
  expect(legacyCommonSource).toMatch(
    /\.btn-transparent\s*\{\s*border:\s*0;\s*padding:\s*0;\s*background:\s*transparent;/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /\.btn-transparent\s*\{\s*background:\s*transparent;\s*border:\s*0;\s*outline:\s*none;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.act-row\s*\{\s*overflow:\s*hidden;\s*i\s*\{\s*font-size:\s*20px;\s*line-height:\s*20px;\s*color:\s*#000;\s*\.opacity\(20\);[\s\S]*?&\.yobicon-edit-2\s*\{\s*margin-top:\s*2px;\s*\}[\s\S]*?&:hover\s*\{\s*color:\s*@yobi-link;\s*\.opacity\(100\);/u,
  );
  expect(legacyVariablesSource).toMatch(/@yobi-link\s*:\s*#51aacc;/u);
  expect(legacyYobiconSource).toMatch(
    /\[class\^="yobicon-"\],[\s\S]*?font-family:\s*'yobicon';[\s\S]*?font-style:\s*normal;[\s\S]*?font-variant:\s*normal;[\s\S]*?font-weight:\s*normal;[\s\S]*?line-height:\s*1;[\s\S]*?display:\s*inline-block;[\s\S]*?text-decoration:\s*none;[\s\S]*?background-image:\s*none;[\s\S]*?vertical-align:\s*baseline;/u,
  );
  expect(legacyYobiconSource).toMatch(/\.yobicon-edit-2:before\s*\{\s*content:\s*"\\e51d";/u);
  expect(legacyYobiconSource).toMatch(/\.yobicon-trash:before\s*\{\s*content:\s*"\\e838";/u);
  expect(legacyPageSource).toMatch(
    /\.comment-body\s*\{\s*font-size:\s*1\.1em;\s*padding:\s*5px 20px;/u,
  );
  expect(legacyResponsiveSource).toMatch(
    /@media all and \(max-width:\s*720px\)[\s\S]*?\.comment-body\s*\{\s*padding:\s*10px 10px !important;/u,
  );
  expect(legacyMarkdownSource).toMatch(
    /\.markdown-wrap\s*\{[\s\S]*?padding:\s*15px 20px !important;/u,
  );
  expect(legacyYobiSource).toMatch(
    /@import "less\/_page\.less";[\s\S]*?@import "less\/_responsive\.less";[\s\S]*?@import "less\/_markdown\.less";/u,
  );
  for (const styleName of [
    "commentAuthor",
    "commentResponsiveAvatar",
    "commentResponsiveAvatarWrap",
    "commentAgo",
    "commentActionButton",
    "commentActionIcon",
    "commentEditIcon",
    "commentBody",
  ]) {
    expect(styleSource).toContain(`${styleName}:`);
  }
  expect(styleSource).toMatch(
    /commentAuthor:\s*\{[^}]*color:\s*"#3f3e40"[^}]*fontSize:\s*"13px"[^}]*marginRight:\s*"5px"[^}]*verticalAlign:\s*"middle"/su,
  );
  expect(styleSource).toMatch(
    /commentResponsiveAvatar:\s*\{[^}]*display:\s*"none"[\s\S]*?max-width:\s*720px[^}]*display:\s*"inline-block"/u,
  );
  expect(styleSource).toMatch(
    /commentResponsiveAvatarWrap:\s*\{[^}]*display:\s*"inline-block"[^}]*height:\s*"32px"[^}]*overflow:\s*"hidden"[^}]*verticalAlign:\s*"top"[^}]*width:\s*"32px"[\s\S]*?height:\s*"24px"[^}]*marginTop:\s*"-5px"[^}]*width:\s*"24px"/u,
  );
  expect(styleSource).toMatch(/commentAgo:\s*\{\s*color:\s*"#7F8C8D"/u);
  expect(styleSource).toMatch(
    /commentActionButton:\s*\{[^}]*backgroundColor:\s*"transparent"[^}]*border:\s*0[^}]*outline:\s*"none"[^}]*padding:\s*0/su,
  );
  expect(styleSource).not.toMatch(
    /commentActionButton:\s*\{[^}]*(?:display|minHeight|minWidth|lineHeight):/su,
  );
  expect(styleSource).toMatch(
    /commentActionIcon:\s*\{[^}]*backgroundImage:\s*"none"[^}]*color:\s*"#000000"[^}]*display:\s*"inline-block"[^}]*fontFamily:\s*"yobicon"[^}]*fontSize:\s*"20px"[^}]*fontStyle:\s*"normal"[^}]*fontVariant:\s*"normal"[^}]*fontWeight:\s*400[^}]*lineHeight:\s*"20px"[^}]*opacity:\s*0\.2[^}]*textDecoration:\s*"none"[^}]*verticalAlign:\s*"baseline"[\s\S]*?":hover":\s*\{\s*color:\s*"#51aacc",\s*opacity:\s*1/u,
  );
  expect(styleSource).toMatch(
    /commentEditIcon:\s*\{\s*marginTop:\s*"2px",\s*"::before":\s*\{\s*content:\s*'"\\\\e51d"'/u,
  );
  expect(styleSource).toMatch(
    /commentDeleteIcon:\s*\{\s*"::before":\s*\{\s*content:\s*'"\\\\e838"'/u,
  );
  expect(styleSource).toMatch(
    /commentBody:\s*\{[^}]*fontSize:\s*"1\.1em"[^}]*padding:\s*"15px 20px"/u,
  );
  expect(styleSource).not.toContain("commentBodyResponsiveCascade");
  for (const owner of [
    "post-detail-comment-author",
    "post-detail-comment-responsive-avatar",
    "post-detail-comment-responsive-avatar-wrap",
    "post-detail-comment-ago",
    "post-detail-comment-edit-action",
    "post-detail-comment-delete-action",
    "post-detail-comment-edit-icon",
    "post-detail-comment-delete-icon",
    "post-detail-comment-body-content",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).not.toMatch(
    /data-stylex-owner="post-detail-comment-(?:author|responsive-avatar|responsive-avatar-wrap|ago|edit-action|delete-action|edit-icon|delete-icon|body-content)"[^>]*style=/su,
  );
  expect(routeSource).not.toContain("commentOutdated");

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await mockProjectPosts(page, "comment");
    await page.route("**/api/v1/projects/admin/sample/posts/1", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          authorId: "2",
          authorLabel: "Dev Member",
          authorLoginId: "dev",
          bodyMarkdown: "Populated **board post**",
          commentCount: 1,
          comments: [
            {
              attachments: [],
              authorId: "2",
              authorLabel: "Dev Member",
              authorLoginId: "dev",
              contentsMarkdown: "First **comment**",
              createdLabel: "Jul 3, 2026",
              id: "21",
              parentCommentId: "",
              viaEmail: false,
            },
          ],
          createdLabel: "Jul 2, 2026",
          historyHtml: "",
          historyMarkdown: "",
          id: "31",
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
            canUpdate: true,
            canWatch: true,
          },
          postNumber: "1",
          projectName: "sample",
          readme: false,
          title: "Populated board post",
          updatedLabel: "Jul 2, 2026",
          watcherCount: 0,
        }),
      });
    });
    await page.goto(`${basePath}/admin/sample/post/1`);

    const comment = page.locator("#comment-21");
    const author = comment.locator('[data-stylex-owner="post-detail-comment-author"]');
    const responsiveAvatar = comment.locator(
      '[data-stylex-owner="post-detail-comment-responsive-avatar"]',
    );
    const responsiveAvatarWrap = comment.locator(
      '[data-stylex-owner="post-detail-comment-responsive-avatar-wrap"]',
    );
    const ago = comment.locator('[data-stylex-owner="post-detail-comment-ago"]');
    const edit = comment.locator('[data-stylex-owner="post-detail-comment-edit-action"]');
    const remove = comment.locator('[data-stylex-owner="post-detail-comment-delete-action"]');
    const editIcon = comment.locator('[data-stylex-owner="post-detail-comment-edit-icon"]');
    const deleteIcon = comment.locator('[data-stylex-owner="post-detail-comment-delete-icon"]');
    const body = comment.locator('[data-stylex-owner="post-detail-comment-body-content"]');
    const metrics = await comment.evaluate((row) => {
      const get = (owner: string) =>
        row.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const author = get("post-detail-comment-author");
      const responsiveAvatar = get("post-detail-comment-responsive-avatar");
      const responsiveAvatarWrap = get("post-detail-comment-responsive-avatar-wrap");
      const ago = get("post-detail-comment-ago");
      const edit = get("post-detail-comment-edit-action");
      const remove = get("post-detail-comment-delete-action");
      const editIcon = get("post-detail-comment-edit-icon");
      const deleteIcon = get("post-detail-comment-delete-icon");
      const body = get("post-detail-comment-body-content");
      const meta = get("post-detail-comment-meta");
      const media = get("post-detail-comment-media");
      const rect = (element: HTMLElement) => element.getBoundingClientRect();
      const authorRect = rect(author),
        agoRect = rect(ago),
        editRect = rect(edit),
        removeRect = rect(remove);
      const bodyRect = rect(body),
        mediaRect = rect(media),
        metaRect = rect(meta);
      const button = getComputedStyle(edit),
        icon = getComputedStyle(editIcon),
        bodyStyle = getComputedStyle(body);
      return {
        author: {
          color: getComputedStyle(author).color,
          fontSize: getComputedStyle(author).fontSize,
          marginRight: getComputedStyle(author).marginRight,
          verticalAlign: getComputedStyle(author).verticalAlign,
        },
        responsiveAvatarDisplay: getComputedStyle(responsiveAvatar).display,
        responsiveAvatarWrap: {
          display: getComputedStyle(responsiveAvatarWrap).display,
          width: getComputedStyle(responsiveAvatarWrap).width,
          height: getComputedStyle(responsiveAvatarWrap).height,
          marginTop: getComputedStyle(responsiveAvatarWrap).marginTop,
          overflow: getComputedStyle(responsiveAvatarWrap).overflow,
          verticalAlign: getComputedStyle(responsiveAvatarWrap).verticalAlign,
        },
        agoColor: getComputedStyle(ago).color,
        button: {
          background: button.backgroundColor,
          borderStyle: button.borderStyle,
          borderWidth: button.borderWidth,
          outlineStyle: button.outlineStyle,
          padding: button.padding,
        },
        icon: {
          color: icon.color,
          fontSize: icon.fontSize,
          lineHeight: icon.lineHeight,
          marginTop: icon.marginTop,
          opacity: icon.opacity,
        },
        deleteIconClass: deleteIcon.className,
        editIconClass: editIcon.className,
        deleteIconStyle: {
          color: getComputedStyle(deleteIcon).color,
          fontSize: getComputedStyle(deleteIcon).fontSize,
          lineHeight: getComputedStyle(deleteIcon).lineHeight,
          opacity: getComputedStyle(deleteIcon).opacity,
        },
        body: { fontSize: bodyStyle.fontSize, padding: bodyStyle.padding },
        order: authorRect.right <= agoRect.right && editRect.left < removeRect.left,
        actionsInsideMeta: editRect.top >= metaRect.top && removeRect.bottom <= metaRect.bottom,
        actionsVisible:
          editRect.width > 0 &&
          editRect.height > 0 &&
          removeRect.width > 0 &&
          removeRect.height > 0,
        bodyInsideMedia: bodyRect.left >= mediaRect.left && bodyRect.right <= mediaRect.right,
        bodyBelowMeta: bodyRect.top >= metaRect.bottom,
        noActionBodyOverlap: removeRect.bottom <= bodyRect.top,
      };
    });
    expect(metrics.author).toEqual({
      color: "rgb(63, 62, 64)",
      fontSize: "13px",
      marginRight: "5px",
      verticalAlign: "middle",
    });
    expect(metrics.agoColor).toBe("rgb(127, 140, 141)");
    expect(metrics.button).toEqual({
      background: "rgba(0, 0, 0, 0)",
      borderStyle: "none",
      borderWidth: "0px",
      outlineStyle: "none",
      padding: "0px",
    });
    expect(metrics.icon).toEqual({
      color: "rgb(0, 0, 0)",
      fontSize: "20px",
      lineHeight: "20px",
      marginTop: "2px",
      opacity: "0.2",
    });
    expect(metrics.deleteIconStyle).toEqual({
      color: "rgb(0, 0, 0)",
      fontSize: "20px",
      lineHeight: "20px",
      opacity: "0.2",
    });
    expect(metrics.editIconClass).toContain("yobicon-edit-2");
    expect(metrics.deleteIconClass).toContain("yobicon-trash");
    expect(metrics.body.fontSize).toBe("14.3px");
    expect(metrics.body.padding).toBe("15px 20px");
    expect(metrics).toMatchObject({
      order: true,
      actionsInsideMeta: true,
      actionsVisible: true,
      bodyInsideMedia: true,
      bodyBelowMeta: true,
      noActionBodyOverlap: true,
    });
    expect(metrics.responsiveAvatarDisplay).toBe(viewport.width > 720 ? "none" : "inline-block");
    expect(metrics.responsiveAvatarWrap).toEqual(
      viewport.width > 720
        ? {
            display: "inline-block",
            width: "32px",
            height: "32px",
            marginTop: "0px",
            overflow: "hidden",
            verticalAlign: "top",
          }
        : {
            display: "inline-block",
            width: "24px",
            height: "24px",
            marginTop: "-5px",
            overflow: "hidden",
            verticalAlign: "top",
          },
    );

    if (viewport.width > 720) {
      await editIcon.hover();
      await expect(editIcon).toHaveCSS("color", "rgb(81, 170, 204)");
      await expect(editIcon).toHaveCSS("opacity", "1");
      await deleteIcon.hover();
      await expect(deleteIcon).toHaveCSS("color", "rgb(81, 170, 204)");
      await expect(deleteIcon).toHaveCSS("opacity", "1");
    }
    await author.locator(":scope > a").click();
    await expect(page).toHaveURL(new RegExp(`${basePath}/dev(?:\\?.*)?$`));
    await page.goBack();
    await ago.click();
    await expect(page).toHaveURL(new RegExp(`#comment-21$`));
    if (viewport.width > 720) {
      await edit.click();
      await expect(comment.locator("#comment-editform-21")).toBeVisible();
      await comment.getByRole("button", { name: /cancel/i }).click();
      await remove.click();
      await expect(
        page.locator('[data-stylex-owner="post-detail-comment-delete-modal"]'),
      ).toBeVisible();
    }
  }
});

test("authenticated populated board post owns comment section boundary and header in StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyViewSource = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyResponsiveSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyVariablesSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  const legacyYobiconSource = readFileSync(
    "../yona-original/public/stylesheets/yobicon/style.css",
    "utf8",
  );

  expect(legacyViewSource).toMatch(
    /<div id="comments" class="board-comment-wrap">[\s\S]*?@partial_comments\(project, post\)/u,
  );
  expect(legacyCommentsSource).toMatch(
    /<div class="comment-header"><i class="yobicon-comments"><\/i> <strong>@Messages\("common\.comment"\)<\/strong> <strong class="num">@post\.comments\.size<\/strong><\/div>\s*<hr class="nm" \/>\s*<ul class="comments">/u,
  );
  expect(legacyPageSource).toMatch(
    /\.board-comment-wrap\s*\{\s*display:block;\s*clear:both;\s*font-family:@base-font-family;[\s\S]*?\.comment-header\s*\{\s*color:\s*#222;\s*font-size:\s*16px;\s*line-height:\s*40px;/u,
  );
  expect(legacyResponsiveSource).toMatch(
    /@media all and \(max-width:\s*720px\)[\s\S]*?\.board-comment-wrap\s*\{\s*padding:\s*2px;/u,
  );
  expect(legacyCommonSource).toMatch(/\.nm\s*\{\s*margin:\s*0 !important;/u);
  expect(legacyVariablesSource).toMatch(
    /@base-font-family:\s*-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";/u,
  );
  expect(legacyYobiSource).toMatch(
    /@import "less\/_variables\.less";[\s\S]*?@import "less\/_common\.less";[\s\S]*?@import "less\/_page\.less";[\s\S]*?@import "less\/_responsive\.less";/u,
  );
  expect(legacyYobiconSource).toMatch(
    /\[class\^="yobicon-"\],[\s\S]*?font-family:\s*'yobicon';[\s\S]*?font-style:\s*normal;[\s\S]*?font-variant:\s*normal;[\s\S]*?font-weight:\s*normal;[\s\S]*?line-height:\s*1;[\s\S]*?display:\s*inline-block;[\s\S]*?text-decoration:\s*none;[\s\S]*?background-image:\s*none;[\s\S]*?vertical-align:\s*baseline;/u,
  );
  expect(legacyYobiconSource).toMatch(/\.yobicon-comments:before\s*\{\s*content:\s*"\\e4b7";/u);
  expect(styleSource).toMatch(
    /comments:\s*\{[^}]*clear:\s*"both"[^}]*display:\s*"block"[^}]*fontFamily:[\s\S]*?@media all and \(max-width:\s*720px\)[^}]*padding:\s*"2px"/u,
  );
  for (const styleName of ["commentHeader", "commentHeaderIcon", "commentDivider"]) {
    expect(styleSource).toContain(`${styleName}:`);
  }
  for (const owner of [
    "post-detail-comments",
    "post-detail-comment-header",
    "post-detail-comment-header-icon",
    "post-detail-comment-divider",
    "post-detail-comment-list",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).not.toMatch(
    /data-stylex-owner="post-detail-comment-(?:header|header-icon|divider)"[^>]*style=/su,
  );

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await mockProjectPosts(page, "comment");
    await page.route("**/api/v1/projects/admin/sample/posts/1", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          authorId: "2",
          authorLabel: "Dev Member",
          authorLoginId: "dev",
          bodyMarkdown: "Populated **board post**",
          commentCount: 1,
          comments: [
            {
              attachments: [],
              authorId: "2",
              authorLabel: "Dev Member",
              authorLoginId: "dev",
              contentsMarkdown: "First **comment**",
              createdLabel: "Jul 3, 2026",
              id: "21",
              parentCommentId: "",
              viaEmail: false,
            },
          ],
          createdLabel: "Jul 2, 2026",
          historyMarkdown: "",
          id: "31",
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
            canUpdate: true,
            canWatch: true,
          },
          postNumber: "1",
          projectName: "sample",
          readme: false,
          title: "Populated board post",
          updatedLabel: "Jul 2, 2026",
          watcherCount: 0,
        }),
      });
    });
    await page.goto(`${basePath}/admin/sample/post/1`);

    const boundary = page.locator('[data-stylex-owner="post-detail-comments"]');
    const header = boundary.locator('[data-stylex-owner="post-detail-comment-header"]');
    const icon = header.locator('[data-stylex-owner="post-detail-comment-header-icon"]');
    const divider = boundary.locator('[data-stylex-owner="post-detail-comment-divider"]');
    const list = boundary.locator('[data-stylex-owner="post-detail-comment-list"]');
    await expect(header).toContainText("Comment 1");
    await expect(header.locator(".num")).toHaveText("1");

    const metrics = await boundary.evaluate((wrapper) => {
      const get = (owner: string) =>
        wrapper.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const header = get("post-detail-comment-header");
      const icon = get("post-detail-comment-header-icon");
      const divider = get("post-detail-comment-divider");
      const list = get("post-detail-comment-list");
      const wrapperStyle = getComputedStyle(wrapper);
      const headerStyle = getComputedStyle(header);
      const iconStyle = getComputedStyle(icon);
      const iconPseudo = getComputedStyle(icon, "::before");
      const dividerStyle = getComputedStyle(divider);
      const wrapperRect = wrapper.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const dividerRect = divider.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      return {
        wrapper: {
          clear: wrapperStyle.clear,
          display: wrapperStyle.display,
          fontFamily: wrapperStyle.fontFamily,
          padding: wrapperStyle.padding,
        },
        header: {
          color: headerStyle.color,
          fontSize: headerStyle.fontSize,
          lineHeight: headerStyle.lineHeight,
        },
        icon: {
          backgroundImage: iconStyle.backgroundImage,
          display: iconStyle.display,
          fontFamily: iconStyle.fontFamily,
          fontStyle: iconStyle.fontStyle,
          fontVariant: iconStyle.fontVariant,
          fontWeight: iconStyle.fontWeight,
          lineHeight: iconStyle.lineHeight,
          textDecoration: iconStyle.textDecorationLine,
          verticalAlign: iconStyle.verticalAlign,
          glyph: iconPseudo.content,
          nonzeroGeometry: iconRect.width > 0 && iconRect.height > 0,
        },
        dividerMargin: dividerStyle.margin,
        order: headerRect.bottom <= dividerRect.top && dividerRect.bottom <= listRect.top,
        containment:
          headerRect.left >= wrapperRect.left &&
          headerRect.right <= wrapperRect.right &&
          dividerRect.left >= wrapperRect.left &&
          dividerRect.right <= wrapperRect.right &&
          listRect.left >= wrapperRect.left &&
          listRect.right <= wrapperRect.right,
        noOverlap: headerRect.bottom <= listRect.top,
      };
    });
    expect(metrics.wrapper).toEqual({
      clear: "both",
      display: "block",
      fontFamily:
        '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      padding: viewport.width > 720 ? "0px" : "2px",
    });
    expect(metrics.header).toEqual({
      color: "rgb(34, 34, 34)",
      fontSize: "16px",
      lineHeight: "40px",
    });
    expect(metrics.icon).toEqual({
      backgroundImage: "none",
      display: "inline-block",
      fontFamily: "yobicon",
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: "400",
      lineHeight: "16px",
      textDecoration: "none",
      verticalAlign: "baseline",
      glyph: '"\ue4b7"',
      nonzeroGeometry: true,
    });
    expect(metrics.dividerMargin).toBe("0px");
    expect(metrics).toMatchObject({ order: true, containment: true, noOverlap: true });
    await expect(icon).toBeVisible();
    await expect(divider).toBeVisible();
    await expect(list).toContainText("First comment");
  }
});

test("authenticated populated board post owns open parent comment update form in StyleX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyBoardSource = readFileSync(
    "../yona-original/app/views/board/view.scala.html",
    "utf8",
  );
  const legacyCommentsSource = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const legacyUpdateFormSource = readFileSync(
    "../yona-original/app/views/common/commentUpdateForm.scala.html",
    "utf8",
  );
  const legacyCommonSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyEditorSource = readFileSync(
    "../yona-original/app/views/common/editor.scala.html",
    "utf8",
  );
  const legacyPageSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyMixinsSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_mixins.less",
    "utf8",
  );
  const legacyVariablesSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const legacyResponsiveSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyBootstrapSource = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap.css",
    "utf8",
  );
  const legacyYobiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/yobi.less",
    "utf8",
  );
  const legacyYobiUiSource = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );
  const legacyYobiconSource = readFileSync(
    "../yona-original/public/stylesheets/yobicon/style.css",
    "utf8",
  );
  const legacyCommentScriptSource = readFileSync(
    "../yona-original/public/javascripts/common/yobi.Comment.js",
    "utf8",
  );
  const legacyTemporarySaveSource = readFileSync(
    "../yona-original/public/javascripts/service/yona.temporarySaveHandler.js",
    "utf8",
  );

  expect(legacyBoardSource).toContain("@partial_comments(project, post)");
  expect(legacyCommentsSource).toContain("@common.commentUpdateForm(comment,");
  expect(legacyUpdateFormSource).toMatch(
    /<div id="comment-editform-@comment\.id" class="comment-update-form">[\s\S]*?<form action="@action\/@comment\.id" method="post" enctype="multipart\/form-data">[\s\S]*?<input type="hidden" name="id" value="@comment\.id">[\s\S]*?<div class="write-comment-box">\s*<div class="write-comment-wrap">[\s\S]*?@common\.editor\("contents-" \+ comment\.id, contents,"", "update-comment-body"\)[\s\S]*?<div class="upload-drop-here">[\s\S]*?<div class="right-txt comment-update-button upload-button-line">/u,
  );
  expect(legacyUpdateFormSource).toMatch(
    /@Messages\("button\.upload"\)[\s\S]*?@Messages\("button\.cancel"\)[\s\S]*?@Messages\("button\.save"\)/u,
  );
  expect(legacyUpdateFormSource).toMatch(
    /<span class="file-upload">\s*<label for="upload-@comment\.id" class="file-upload__label ybtn">[\s\S]*?<input id="upload-@comment\.id" class="file-upload__input" type="file" name="filePath" multiple>/u,
  );
  expect(legacyUpdateFormSource).toMatch(
    /<div class="upload-drop-here">\s*<div class="msg-wrap">\s*<div class="msg">@Messages\("common\.attach\.dropFilesHere"\)<\/div>\s*<\/div>\s*<\/div>/u,
  );
  expect(legacyEditorSource).toMatch(
    /<div class="textarea-box">\s*<textarea name="@textareaName" class="editorSeries content comment nm" data-editor-mode="@editorMode" markdown="true" id="editor-@textareaName-@wrapId"/u,
  );
  expect(legacyEditorSource).toMatch(
    /<ul class="nav nav-tabs nm small">\s*<li class="active">\s*<a href="#edit-@wrapId" data-toggle="tab" data-mode="edit">@Messages\("common\.editor\.edit"\)<\/a>\s*<\/li>\s*<li>\s*<a href="#preview-@wrapId" data-toggle="tab" data-mode="preview">@Messages\("common\.editor\.preview"\)<\/a>[\s\S]*?<li>[\s\S]*?add-task-list-button[\s\S]*?<li>[\s\S]*?editor-clear-temporary[\s\S]*?<li>[\s\S]*?editor-notice-label/u,
  );
  expect(legacyEditorSource).toMatch(
    /<div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"><\/i> @Messages\("button\.add\.checklist"\)<\/button><\/div>/u,
  );
  expect(legacyEditorSource).toMatch(
    /<div class="editor-clear-temporary">\s*<div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">@Messages\("button\.clear\.temporary"\)<\/button><\/div>\s*<\/div>/u,
  );
  expect(legacyEditorSource).toMatch(
    /<div class="notification-receiver">\s*<span class="notification-receiver-title">@Messages\("notification\.receiver\.list\.title"\)<\/span>\s*<span class="notification-receiver-list"><\/span>\s*<\/div>/u,
  );
  expect(legacyCommonSource).toContain(".nm { margin: 0 !important; }");
  expect(legacyPageSource).toMatch(
    /\.comment-update-form\s*\{\s*display:none;\s*\.textarea-box\s*\{\s*padding-right:\s*2px;\s*margin-bottom:\s*10px;\s*\}\s*\.write-comment-box\s*\{\s*padding:\s*10px;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.write-comment-box\s*\{[\s\S]*?\.write-comment-wrap\s*\{[\s\S]*?\.comment-update-button\s*\{\s*margin-top:\s*10px;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.textarea-box\s*\{\s*padding:\s*0;\s*margin:\s*0;\s*display:\s*block;\s*padding-right:\s*14px;\s*position:relative;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.write-comment-box\s*\{[\s\S]*?\.comment\s*\{\s*height:\s*160px;\s*margin:\s*0;\s*resize:vertical;\s*\.box-shadow\(none\);\s*&:focus\s*\{\s*border:\s*1px solid @gray-cc;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.textarea-box\s*\{[\s\S]*?textarea\s*\{\s*\.border-radius\(0 0 3px 3px\);\s*width:\s*100%;\s*resize:vertical !important;\s*font-size:\s*1em;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.upload-button-line\s*\{\s*\.file-upload\s*\{\s*position:\s*relative;\s*display:\s*inline-block;\s*\}\s*\.file-upload__label\s*\{\s*display:\s*block;\s*border-radius:\s*2px;\s*transition:\s*background \.3s;\s*\}\s*\.file-upload__input\s*\{\s*position:\s*fixed;\s*left:\s*0;\s*top:\s*0;\s*right:\s*0;\s*height:\s*0;\s*bottom:\s*0;\s*width:0;\s*opacity:\s*0;/u,
  );
  expect(legacyMixinsSource).toMatch(
    /\.border-radius\(@radius: 5px\)[\s\S]*?border-radius:\s*@radius;/u,
  );
  expect(legacyMixinsSource).toMatch(/\.box-shadow\(@shadow:[\s\S]*?box-shadow:\s*@shadow;/u);
  expect(legacyVariablesSource).toContain("@gray-cc: #CCC;");
  expect(legacyVariablesSource).toContain("@orange : #F36C22;");
  expect(legacyVariablesSource).toContain("@primary         : @orange;");
  expect(legacyVariablesSource).toContain("@yobi-blue : #3A7EE5;");
  expect(legacyVariablesSource).toContain("@yobi-blue-dark :#206EE5;");
  expect(legacyVariablesSource).toContain("@yobi-btn-info : @yobi-blue;");
  expect(legacyVariablesSource).toContain("@yobi-btn-info-hover : @yobi-blue-dark;");
  expect(legacyVariablesSource).toContain("@yobi-red : #C93426;");
  expect(legacyVariablesSource).toContain("@yobi-btn-danger : @yobi-red;");
  expect(legacyResponsiveSource).toMatch(
    /@media all and \(max-width: 720px\) \{[\s\S]*?input\[type="text"\],[\s\S]*?textarea\s*\{\s*font-size:\s*16px !important;/u,
  );
  expect(legacyResponsiveSource).toMatch(
    /@media all and \(max-width: 720px\) \{[\s\S]*?\.nav-tabs li a\s*\{\s*padding-left:\s*5px !important;\s*padding-right:\s*5px !important;/u,
  );
  expect(legacyBootstrapSource).toMatch(
    /label,\s*input,\s*button,\s*select,\s*textarea\s*\{\s*font-size:\s*14px;[\s\S]*?textarea\s*\{\s*height:\s*auto;/u,
  );
  expect(legacyBootstrapSource).toMatch(
    /button,\s*input,\s*select,\s*textarea\s*\{\s*margin:\s*0;\s*font-size:\s*100%;\s*vertical-align:\s*middle;[\s\S]*?button,\s*input\s*\{[\s\S]*?line-height:\s*normal;/u,
  );
  expect(legacyBootstrapSource).toMatch(
    /\.nav\s*\{\s*margin-bottom:\s*20px;\s*margin-left:\s*0;\s*list-style:\s*none;[\s\S]*?\.nav-tabs:before,[\s\S]*?display:\s*table;\s*line-height:\s*0;\s*content:\s*"";[\s\S]*?\.nav-tabs:after,[\s\S]*?clear:\s*both;[\s\S]*?\.nav-tabs > li\s*\{\s*margin-bottom:\s*-1px;[\s\S]*?\.nav-tabs > li > a\s*\{[\s\S]*?padding-top:\s*8px;[\s\S]*?border-radius:\s*4px 4px 0 0;[\s\S]*?\.nav-tabs > \.active > a,[\s\S]*?border-bottom-color:\s*transparent;/u,
  );
  expect(legacyYobiSource).toMatch(
    /@import "less\/_variables\.less";[\s\S]*?@import "less\/_page\.less";[\s\S]*?@import "less\/_responsive\.less";[\s\S]*?@import "less\/_yobiUI\.less";/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /\.ybtn, \.flat > li > \.ybtn\s*\{[\s\S]*?\.border-radius\(3px\)\s*!important;/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /\.ybtn, \.flat > li > \.ybtn\s*\{[\s\S]*?padding:\s*4px 12px !important;[\s\S]*?margin-left:\s*\.3em;[\s\S]*?&:hover, &:focus, &:active,[\s\S]*?background-color:#f1f1f1;[\s\S]*?&\.ybtn-info\s*\{\s*background-color\s*:\s*@yobi-btn-info !important;\s*border:1px solid @yobi-btn-info-hover;[\s\S]*?&:hover, &:focus\s*\{\s*background-color:\s*@yobi-btn-info-hover !important;/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /&\.ybtn-small\s*\{\s*padding:\s*3px 10px !important;\s*font-size:\s*13px !important;[\s\S]*?&\.ybtn-danger-no-outline\s*\{\s*font-weight:\s*600;\s*box-shadow:\s*none;\s*color:\s*#666;\s*padding:\s*1px 10px !important;\s*border:\s*1px solid transparent;\s*background-color:\s*#eee;\s*&:hover, &:focus\s*\{\s*color:\s*@yobi-btn-danger;\s*background-color:\s*#fbe9e7;\s*border:\s*1px solid #EF9A9A;/u,
  );
  expect(legacyYobiUiSource).toMatch(/i \{ line-height:20px;\}/u);
  expect(legacyPageSource).toMatch(
    /\.task-list-button\s*\{\s*margin-top:\s*2px;\s*\.tasklist-icon\s*\{\s*vertical-align:\s*top;\s*\}\s*button\s*\{\s*margin-top:\s*1px;/u,
  );
  expect(legacyEditorSource).not.toContain('class="yobicon-list tasklist-icon"');
  expect(legacyYobiconSource).toMatch(
    /\[class\^="yobicon-"\],[\s\S]*?font-family:\s*'yobicon';[\s\S]*?line-height:\s*1;[\s\S]*?display:\s*inline-block;[\s\S]*?vertical-align:\s*baseline;/u,
  );
  expect(legacyYobiconSource).toMatch(/\.yobicon-list:before\s*\{\s*content:\s*"\\e25e";/u);
  expect(legacyYobiUiSource).toMatch(
    /label, input, button, select, textarea \{ font-size:12px; \}[\s\S]*?select, textarea,[\s\S]*?\.uneditable-input \{ font-size:12px; \}/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /textarea, input\[type="text"\],[\s\S]*?&:focus\s*\{\s*\.box-shadow\(none\);\s*border-color:@primary !important;/u,
  );
  expect(legacyYobiUiSource).toMatch(
    /\.nav-tabs\s*\{\s*li\s*\{\s*a\s*\{\s*padding-left:30px; padding-right:30px;\s*color: #3592b5;\s*font-weight: bold;[\s\S]*?&\.small\s*\{\s*height:29px;\s*li a \{ padding:4px 15px; \}/u,
  );
  expect(legacyPageSource).toMatch(
    /\.project-page-wrap\s*\{[\s\S]*?\.nav-tabs > li\s*\{\s*margin-bottom:\s*-2px;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.write-comment-box\s*\{[\s\S]*?\.write-comment-wrap\s*\{[\s\S]*?\.nav\s*\{\s*margin-bottom:\s*0;/u,
  );
  expect(legacyPageSource).toMatch(
    /\.upload-drop-here\s*\{\s*position:\s*absolute;\s*top:\s*2px;\s*left:\s*2px;\s*right:\s*2px;\s*bottom:\s*2px;\s*border:\s*3px dashed #FFB23D;\s*background:\s*rgba\(255,255,255,0\.8\);\s*z-index:\s*9999;\s*display:none;\s*pointer-events:\s*none;[\s\S]*?\.msg-wrap\s*\{\s*position:relative;\s*width:100%; height:100%;\s*\}[\s\S]*?\.msg\s*\{\s*position:\s*absolute;\s*top:\s*50%;\s*width:\s*100%;\s*margin-top:\s*-13px;\s*color:\s*#999;\s*font-size:\s*26px;\s*text-align:\s*center;\s*\}/u,
  );
  expect(legacyPageSource).toMatch(
    /\.editor-clear-temporary\s*\{\s*margin-left:\s*10px;\s*display:\s*none;\s*\}/u,
  );
  expect(legacyPageSource).toMatch(
    /\.notification-receiver\s*\{\s*background-color:\s*#F7F7F7;\s*display:\s*none;\s*text-align:\s*start;\s*padding:\s*5px 5px 5px 10px;[\s\S]*?\.notification-receiver-title\s*\{\s*color:\s*#999;/u,
  );
  expect(legacyBoardSource).not.toContain("notification-receiver");
  expect(legacyCommentScriptSource).toMatch(
    /commentEditforms\.each\(function \(i, item\) \{\s*temporarySaveHandler\(\$\(item\)\.find\('textarea'\), false\);\s*\}\);/u,
  );
  expect(legacyCommentScriptSource).not.toContain("getUploader");
  expect(legacyCommentScriptSource).not.toContain("yobi.Files");
  expect(legacyTemporarySaveSource).toMatch(
    /if\(\$textarea\.data\("editorMode"\) === "update-comment-body"\) \{[\s\S]*?localStorage\.setItem\(location\.pathname \+ '-last-comment-update-draft', \$textarea\.val\(\)\);\s*return;/u,
  );
  expect(legacyTemporarySaveSource).not.toContain("editor-clear-temporary");
  for (const styleName of [
    "commentUpdateForm",
    "commentUpdateFormVisible",
    "commentUpdateWriteBox",
    "commentUpdateTextareaBox",
    "commentUpdateTextareaControl",
    "commentUpdateFileUpload",
    "commentUpdateActionButton",
    "commentUpdateFileUploadLabel",
    "commentUpdateFileUploadInput",
    "commentUpdateSaveButton",
    "commentUpdateActions",
    "commentUpdateEditorNav",
    "commentUpdateEditorNavItem",
    "commentUpdateEditorTabLink",
    "commentUpdateEditorTabLinkActive",
    "commentUpdateChecklistWrap",
    "commentUpdateChecklistButton",
    "commentUpdateChecklistIcon",
    "commentUpdateDropOverlay",
    "commentUpdateDropMessageWrap",
    "commentUpdateDropMessage",
    "commentUpdateClearTemporary",
  ]) {
    expect(styleSource).toContain(`${styleName}:`);
  }
  expect(styleSource).toMatch(
    /commentUpdateTextareaControl:\s*\{[\s\S]*?fontSize:\s*"12px"[\s\S]*?width:\s*"100%"[\s\S]*?borderColor:\s*"#F36C22 !important"[\s\S]*?"@media all and \(max-width: 720px\)":\s*\{ fontSize:\s*"16px !important" \}/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateFileUploadLabel:\s*\{\s*display:\s*"block",\s*transition:\s*"background 0\.3s"/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateActionButton:\s*\{[\s\S]*?backgroundColor:\s*"#ffffff"[\s\S]*?padding:\s*"4px 12px !important"[\s\S]*?transition:\s*"all 0\.3s ease"[\s\S]*?":active":/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateSaveButton:\s*\{[\s\S]*?backgroundColor:\s*"#3A7EE5 !important"[\s\S]*?borderColor:\s*"#206EE5"[\s\S]*?":hover":\s*\{[\s\S]*?backgroundColor:\s*"#206EE5 !important"[\s\S]*?":active":\s*\{[\s\S]*?backgroundColor:\s*"#3A7EE5 !important"/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateEditorNav:\s*\{[\s\S]*?height:\s*"29px"[\s\S]*?margin:\s*"0px !important"[\s\S]*?"::before":[\s\S]*?"::after":/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateEditorTabLink:\s*\{[\s\S]*?color:\s*"#3592b5"[\s\S]*?padding:\s*"4px 15px"[\s\S]*?"@media all and \(max-width: 720px\)":\s*\{[\s\S]*?paddingLeft:\s*"5px !important",[\s\S]*?paddingRight:\s*"5px !important",/u,
  );
  expect(styleSource).toMatch(/commentUpdateChecklistWrap:\s*\{ marginTop:\s*"2px" \}/u);
  expect(styleSource).toMatch(
    /commentUpdateChecklistButton:\s*\{[\s\S]*?backgroundColor:\s*"#eeeeee"[\s\S]*?borderColor:\s*"transparent"[\s\S]*?boxShadow:\s*"none"[\s\S]*?fontSize:\s*"13px !important"[\s\S]*?marginTop:\s*"1px"[\s\S]*?padding:\s*"1px 10px !important"[\s\S]*?backgroundColor:\s*"#fbe9e7"[\s\S]*?borderColor:\s*"#EF9A9A"[\s\S]*?color:\s*"#C93426"/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateChecklistIcon:\s*\{[\s\S]*?fontFamily:\s*"yobicon"[\s\S]*?lineHeight:\s*"20px"[\s\S]*?verticalAlign:\s*"baseline"[\s\S]*?"::before":\s*\{ content:\s*'"\\\\e25e"' \}/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateDropOverlay:\s*\{[\s\S]*?backgroundColor:\s*"rgba\(255, 255, 255, 0\.8\)"[\s\S]*?borderColor:\s*"#FFB23D"[\s\S]*?borderStyle:\s*"dashed"[\s\S]*?borderWidth:\s*"3px"[\s\S]*?bottom:\s*"2px"[\s\S]*?display:\s*"none"[\s\S]*?left:\s*"2px"[\s\S]*?pointerEvents:\s*"none"[\s\S]*?position:\s*"absolute"[\s\S]*?right:\s*"2px"[\s\S]*?top:\s*"2px"[\s\S]*?zIndex:\s*9999/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateDropMessageWrap:\s*\{ height:\s*"100%", position:\s*"relative", width:\s*"100%" \}/u,
  );
  expect(styleSource).toMatch(
    /commentUpdateDropMessage:\s*\{[\s\S]*?color:\s*"#999999"[\s\S]*?fontSize:\s*"26px"[\s\S]*?marginTop:\s*"-13px"[\s\S]*?position:\s*"absolute"[\s\S]*?textAlign:\s*"center"[\s\S]*?top:\s*"50%"[\s\S]*?width:\s*"100%"/u,
  );
  expect(styleSource).toContain(
    'commentUpdateClearTemporary: { display: "none", marginLeft: "10px" }',
  );
  expect(styleSource).toMatch(
    /commentCreateNotificationReceiver:\s*\{\s*backgroundColor:\s*"#F7F7F7",\s*display:\s*"none",\s*padding:\s*"5px 5px 5px 10px",\s*textAlign:\s*"start",\s*\}/u,
  );
  expect(styleSource).toContain('commentCreateNotificationReceiverTitle: { color: "#999999" }');
  for (const owner of [
    "post-detail-comment-update-notification-receiver",
    "post-detail-comment-update-notification-receiver-title",
  ]) {
    expect(routeSource.match(new RegExp(`"${owner}"`, "g")) ?? []).toHaveLength(1);
  }
  expect(routeSource).toContain("styles.commentCreateNotificationReceiver");
  expect(routeSource).toContain("styles.commentCreateNotificationReceiverTitle");
  expect(styleSource).not.toContain("commentUpdateDropOverlayVisible");
  expect(styleSource).not.toContain("commentEditorVisible:");
  for (const owner of [
    "post-detail-comment-editor",
    "post-detail-comment-update-write-box",
    "post-detail-comment-update-textarea-box",
    "post-detail-comment-update-textarea",
    "post-detail-comment-update-file-upload",
    "post-detail-comment-update-file-upload-label",
    "post-detail-comment-update-file-upload-input",
    "post-detail-comment-update-cancel",
    "post-detail-comment-update-save",
    "post-detail-comment-update-actions",
    "post-detail-comment-update-editor-nav",
    "post-detail-comment-update-editor-nav-item",
    "post-detail-comment-update-editor-tab",
    "post-detail-comment-update-editor-tab-active",
    "post-detail-comment-update-checklist-wrap",
    "post-detail-comment-update-checklist-button",
    "post-detail-comment-update-checklist-icon",
    "post-detail-comment-update-drop-overlay",
    "post-detail-comment-update-drop-message-wrap",
    "post-detail-comment-update-drop-message",
    "post-detail-comment-update-clear-temporary",
  ]) {
    expect(routeSource).toContain(owner);
  }
  expect(routeSource).not.toContain("onDragEnter");
  expect(routeSource).not.toContain("onDragOver");

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const { commentUpdateRequests } = await mockProjectPosts(page, "commentUpdate");
    await page.route("**/api/v1/projects/admin/sample/posts/1/comments/21", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.fallback();
        return;
      }
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        attachmentIds?: string[];
        contentsMarkdown?: string;
        parentCommentId?: string | number | null;
      };
      const contentsMarkdown = body.contentsMarkdown ?? "";
      commentUpdateRequests.push({
        attachmentIds: body.attachmentIds ?? [],
        contentsMarkdown,
        parentCommentId: body.parentCommentId ?? null,
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          authorId: "2",
          authorLabel: "Dev Member",
          authorLoginId: "dev",
          bodyMarkdown: "Populated **board post**",
          commentCount: 1,
          comments: [
            {
              attachments: [],
              authorId: "2",
              authorLabel: "Dev Member",
              authorLoginId: "dev",
              contentsMarkdown,
              createdLabel: "Jul 3, 2026",
              id: "21",
              parentCommentId: "",
              viaEmail: false,
            },
          ],
          createdLabel: "Jul 2, 2026",
          historyMarkdown: "",
          id: "31",
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
            canUpdate: true,
            canWatch: true,
          },
          postNumber: "1",
          projectName: "sample",
          readme: false,
          title: "Populated board post",
          updatedLabel: "Jul 2, 2026",
          watcherCount: 0,
        }),
      });
    });
    await page.route("**/api/v1/projects/admin/sample/posts/1", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          authorId: "2",
          authorLabel: "Dev Member",
          authorLoginId: "dev",
          bodyMarkdown: "Populated **board post**",
          commentCount: 1,
          comments: [
            {
              attachments: [],
              authorId: "2",
              authorLabel: "Dev Member",
              authorLoginId: "dev",
              contentsMarkdown: "First **comment**",
              createdLabel: "Jul 3, 2026",
              id: "21",
              parentCommentId: "",
              viaEmail: false,
            },
          ],
          createdLabel: "Jul 2, 2026",
          historyMarkdown: "",
          id: "31",
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
            canUpdate: true,
            canWatch: true,
          },
          postNumber: "1",
          projectName: "sample",
          readme: false,
          title: "Populated board post",
          updatedLabel: "Jul 2, 2026",
          watcherCount: 0,
        }),
      });
    });
    await page.goto(`${basePath}/admin/sample/post/1`);

    const comment = page.locator("#comment-21");
    const formWrap = comment.locator('[data-stylex-owner="post-detail-comment-editor"]');
    const body = comment.locator("#comment-body-21");
    await expect(formWrap).toHaveCSS("display", "none");
    await expect(body).toBeVisible();
    await expect(
      page.locator('#comment-form [data-stylex-owner^="post-detail-comment-update-"]'),
    ).toHaveCount(0);

    await comment.locator('.act-row button[title="Edit comment"]').click();
    await expect(formWrap).toHaveCSS("display", "block");
    await expect(body).toBeHidden();
    const form = formWrap.locator(":scope > form");
    const writeBox = form.locator('[data-stylex-owner="post-detail-comment-update-write-box"]');
    const textareaBox = form.locator(
      '[data-stylex-owner="post-detail-comment-update-textarea-box"]',
    );
    const actions = form.locator('[data-stylex-owner="post-detail-comment-update-actions"]');
    const textarea = form.locator('[data-stylex-owner="post-detail-comment-update-textarea"]');
    const fileUpload = form.locator('[data-stylex-owner="post-detail-comment-update-file-upload"]');
    const fileUploadLabel = form.locator(
      '[data-stylex-owner="post-detail-comment-update-file-upload-label"]',
    );
    const fileUploadInput = form.locator(
      '[data-stylex-owner="post-detail-comment-update-file-upload-input"]',
    );
    const cancelButton = form.locator('[data-stylex-owner="post-detail-comment-update-cancel"]');
    const saveButton = form.locator('[data-stylex-owner="post-detail-comment-update-save"]');
    const editorNav = form.locator('[data-stylex-owner="post-detail-comment-update-editor-nav"]');
    const editorNavItems = editorNav.locator(
      ':scope > [data-stylex-owner="post-detail-comment-update-editor-nav-item"]',
    );
    const editTab = editorNav.getByRole("link", { name: "Edit" });
    const previewTab = editorNav.getByRole("link", { name: "Preview" });
    const checklistWrap = editorNav.locator(
      '[data-stylex-owner="post-detail-comment-update-checklist-wrap"]',
    );
    const checklistButton = checklistWrap.locator(
      '[data-stylex-owner="post-detail-comment-update-checklist-button"]',
    );
    const checklistIcon = checklistButton.locator(
      '[data-stylex-owner="post-detail-comment-update-checklist-icon"]',
    );
    const dropOverlay = form.locator(
      '[data-stylex-owner="post-detail-comment-update-drop-overlay"]',
    );
    const dropMessageWrap = dropOverlay.locator(
      '[data-stylex-owner="post-detail-comment-update-drop-message-wrap"]',
    );
    const dropMessage = dropMessageWrap.locator(
      '[data-stylex-owner="post-detail-comment-update-drop-message"]',
    );
    const clearTemporary = editorNav.locator(
      '[data-stylex-owner="post-detail-comment-update-clear-temporary"]',
    );
    const notificationReceiver = form.locator(
      ':scope .tab-content > [data-stylex-owner="post-detail-comment-update-notification-receiver"]',
    );
    const notificationReceiverTitle = notificationReceiver.locator(
      ':scope > [data-stylex-owner="post-detail-comment-update-notification-receiver-title"]',
    );
    await expect(form).toHaveAttribute("action", `${basePath}/admin/sample/post/1/comments/21`);
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("enctype", "multipart/form-data");
    await expect(form.locator('input[type="hidden"][name="id"]')).toHaveValue("21");
    await expect(textarea).toHaveValue("First **comment**");
    await expect(actions.locator("button")).toHaveText(["Cancel", "Save"]);
    await expect(editorNavItems).toHaveCount(5);
    await expect(editorNavItems.nth(0)).toContainText("Edit");
    await expect(editorNavItems.nth(1)).toContainText("Preview");
    await expect(editorNavItems.nth(2)).toContainText("Add checklist");
    await expect(editorNavItems.nth(3)).toContainText("Clear Temporary");
    await expect(editTab).toHaveAttribute("href", /#edit-21$/u);
    await expect(previewTab).toHaveAttribute("href", /#preview-21$/u);
    await expect(editTab).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-update-editor-tab-active",
    );
    await expect(previewTab).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-update-editor-tab",
    );
    await expect(checklistWrap).toHaveClass(/task-list-button/u);
    await expect(checklistButton).toHaveClass(
      /add-task-list-button ybtn ybtn-small ybtn-danger-no-outline/u,
    );
    await expect(checklistButton).toHaveText("Add checklist");
    await expect(checklistIcon).toHaveClass(/yobicon-list task-list-icon/u);
    await expect(
      page.locator('#comment-form [data-stylex-owner^="post-detail-comment-update-checklist-"]'),
    ).toHaveCount(0);
    await expect(
      form.locator(
        '[data-stylex-owner="post-detail-comment-update-drop-overlay"], [data-stylex-owner="post-detail-comment-update-drop-message-wrap"], [data-stylex-owner="post-detail-comment-update-drop-message"], [data-stylex-owner="post-detail-comment-update-clear-temporary"]',
      ),
    ).toHaveCount(4);
    await expect(
      page.locator(
        '#comment-form [data-stylex-owner="post-detail-comment-update-drop-overlay"], #comment-form [data-stylex-owner="post-detail-comment-update-drop-message-wrap"], #comment-form [data-stylex-owner="post-detail-comment-update-drop-message"], #comment-form [data-stylex-owner="post-detail-comment-update-clear-temporary"]',
      ),
    ).toHaveCount(0);
    await expect(dropOverlay).toHaveCSS("display", "none");
    await expect(clearTemporary).toHaveCSS("display", "none");
    await expect(dropOverlay).toContainText("Drag & Drop files here to upload.");
    await expect(clearTemporary).toContainText("Clear Temporary");
    await expect(notificationReceiver).toHaveCount(1);
    await expect(notificationReceiver).toHaveClass(/notification-receiver/u);
    await expect(notificationReceiver).not.toHaveAttribute("style");
    await expect(notificationReceiverTitle).toHaveCount(1);
    await expect(notificationReceiverTitle).toHaveClass(/notification-receiver-title/u);
    await expect(notificationReceiverTitle).not.toHaveAttribute("style");
    expect(await notificationReceiverTitle.evaluate((title) => title.textContent)).toBe(
      "Notification receivers ",
    );
    await expect(notificationReceiver).toHaveCSS("background-color", "rgb(247, 247, 247)");
    await expect(notificationReceiver).toHaveCSS("display", "none");
    await expect(notificationReceiver).toHaveCSS("padding", "5px 5px 5px 10px");
    await expect(notificationReceiver).toHaveCSS("text-align", "start");
    await expect(notificationReceiverTitle).toHaveCSS("color", "rgb(153, 153, 153)");
    expect(
      await notificationReceiver.evaluate((receiver) => ({
        childOrder: Array.from(receiver.children).map((child) =>
          child.classList.contains("notification-receiver-title")
            ? "notification-receiver-title"
            : "notification-receiver-list",
        ),
        height: receiver.getBoundingClientRect().height,
        previousId: receiver.previousElementSibling?.id,
        width: receiver.getBoundingClientRect().width,
      })),
    ).toEqual({
      childOrder: ["notification-receiver-title", "notification-receiver-list"],
      height: 0,
      previousId: "preview-21",
      width: 0,
    });
    await expect(
      page.locator(
        '[data-stylex-owner="post-detail-comment-update-notification-receiver"], [data-stylex-owner="post-detail-comment-update-notification-receiver-title"]',
      ),
    ).toHaveCount(2);
    await expect(
      page.locator(
        '#comment-form [data-stylex-owner^="post-detail-comment-update-notification-receiver"], .child-comment-input-form [data-stylex-owner^="post-detail-comment-update-notification-receiver"]',
      ),
    ).toHaveCount(0);
    await expect(
      form.locator('[data-stylex-owner^="post-detail-comment-create-notification-receiver"]'),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await textarea.focus();
    await expect(notificationReceiver).toHaveCSS("display", "none");
    expect(
      await notificationReceiver.evaluate((receiver) => ({
        height: receiver.getBoundingClientRect().height,
        width: receiver.getBoundingClientRect().width,
      })),
    ).toEqual({ height: 0, width: 0 });

    const hiddenAuxiliaryMetrics = await form.evaluate((formElement) => {
      const get = (owner: string) =>
        formElement.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const overlay = get("post-detail-comment-update-drop-overlay");
      const messageWrap = get("post-detail-comment-update-drop-message-wrap");
      const message = get("post-detail-comment-update-drop-message");
      const clear = get("post-detail-comment-update-clear-temporary");
      const overlayStyle = getComputedStyle(overlay);
      const messageWrapStyle = getComputedStyle(messageWrap);
      const messageStyle = getComputedStyle(message);
      const clearStyle = getComputedStyle(clear);
      const rect = (element: HTMLElement) => {
        const box = element.getBoundingClientRect();
        return { height: box.height, width: box.width };
      };
      return {
        overlay: {
          backgroundColor: overlayStyle.backgroundColor,
          border: overlayStyle.border,
          bottom: overlayStyle.bottom,
          display: overlayStyle.display,
          left: overlayStyle.left,
          pointerEvents: overlayStyle.pointerEvents,
          position: overlayStyle.position,
          right: overlayStyle.right,
          top: overlayStyle.top,
          zIndex: overlayStyle.zIndex,
        },
        messageWrap: {
          height: messageWrapStyle.height,
          position: messageWrapStyle.position,
          width: messageWrapStyle.width,
        },
        message: {
          color: messageStyle.color,
          fontSize: messageStyle.fontSize,
          marginTop: messageStyle.marginTop,
          position: messageStyle.position,
          textAlign: messageStyle.textAlign,
          top: messageStyle.top,
          width: messageStyle.width,
        },
        clear: { display: clearStyle.display, marginLeft: clearStyle.marginLeft },
        rects: {
          clear: rect(clear),
          message: rect(message),
          messageWrap: rect(messageWrap),
          overlay: rect(overlay),
        },
        order:
          Boolean(
            formElement.querySelector(".textarea-box")!.compareDocumentPosition(overlay) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ) &&
          Boolean(
            overlay.compareDocumentPosition(formElement.querySelector(".comment-update-button")!) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      };
    });
    expect(hiddenAuxiliaryMetrics).toEqual({
      overlay: {
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        border: "3px dashed rgb(255, 178, 61)",
        bottom: "2px",
        display: "none",
        left: "2px",
        pointerEvents: "none",
        position: "absolute",
        right: "2px",
        top: "2px",
        zIndex: "9999",
      },
      messageWrap: { height: "100%", position: "relative", width: "100%" },
      message: {
        color: "rgb(153, 153, 153)",
        fontSize: "26px",
        marginTop: "-13px",
        position: "absolute",
        textAlign: "center",
        top: "50%",
        width: "100%",
      },
      clear: { display: "none", marginLeft: "10px" },
      rects: {
        clear: { height: 0, width: 0 },
        message: { height: 0, width: 0 },
        messageWrap: { height: 0, width: 0 },
        overlay: { height: 0, width: 0 },
      },
      order: true,
    });

    const textareaBeforeDrag = await textarea.inputValue();
    await textarea.dispatchEvent("dragenter");
    await textarea.dispatchEvent("dragover");
    await expect(dropOverlay).toHaveCSS("display", "none");
    await expect(clearTemporary).toHaveCSS("display", "none");
    await expect(textarea).toHaveValue(textareaBeforeDrag);
    await expect(formWrap).toBeVisible();

    const metrics = await formWrap.evaluate((wrapper) => {
      const get = (owner: string) =>
        wrapper.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const writeBox = get("post-detail-comment-update-write-box");
      const textareaBox = get("post-detail-comment-update-textarea-box");
      const textarea = get("post-detail-comment-update-textarea");
      const fileUpload = get("post-detail-comment-update-file-upload");
      const fileUploadLabel = get("post-detail-comment-update-file-upload-label");
      const fileUploadInput = get("post-detail-comment-update-file-upload-input");
      const cancelButton = get("post-detail-comment-update-cancel");
      const saveButton = get("post-detail-comment-update-save");
      const actions = get("post-detail-comment-update-actions");
      const editorNav = get("post-detail-comment-update-editor-nav");
      const editorNavItems = Array.from(
        editorNav.querySelectorAll<HTMLElement>(
          ':scope > [data-stylex-owner="post-detail-comment-update-editor-nav-item"]',
        ),
      );
      const editTab = editorNavItems[0]!.querySelector<HTMLElement>("a")!;
      const previewTab = editorNavItems[1]!.querySelector<HTMLElement>("a")!;
      const checklistWrap = get("post-detail-comment-update-checklist-wrap");
      const checklistButton = get("post-detail-comment-update-checklist-button");
      const checklistIcon = get("post-detail-comment-update-checklist-icon");
      const upload = wrapper.querySelector<HTMLElement>(".upload-drop-here")!;
      const form = wrapper.querySelector<HTMLElement>(":scope > form")!;
      const formRect = form.getBoundingClientRect();
      const writeRect = writeBox.getBoundingClientRect();
      const textareaRect = textareaBox.getBoundingClientRect();
      const textareaControlRect = textarea.getBoundingClientRect();
      const fileUploadRect = fileUpload.getBoundingClientRect();
      const fileUploadLabelRect = fileUploadLabel.getBoundingClientRect();
      const cancelRect = cancelButton.getBoundingClientRect();
      const saveRect = saveButton.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      const editorNavRect = editorNav.getBoundingClientRect();
      const editorItemRects = editorNavItems.map((item) => item.getBoundingClientRect());
      const editTabRect = editTab.getBoundingClientRect();
      const previewTabRect = previewTab.getBoundingClientRect();
      const checklistWrapRect = checklistWrap.getBoundingClientRect();
      const checklistButtonRect = checklistButton.getBoundingClientRect();
      const checklistIconRect = checklistIcon.getBoundingClientRect();
      const controlStyle = (control: HTMLElement) => {
        const computed = getComputedStyle(control);
        return {
          backgroundColor: computed.backgroundColor,
          border: computed.border,
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow,
          color: computed.color,
          cursor: computed.cursor,
          display: computed.display,
          fontSize: computed.fontSize,
          lineHeight: computed.lineHeight,
          marginBottom: computed.marginBottom,
          marginLeft: computed.marginLeft,
          padding: computed.padding,
          position: computed.position,
          textAlign: computed.textAlign,
          textShadow: computed.textShadow,
          verticalAlign: computed.verticalAlign,
          whiteSpace: computed.whiteSpace,
          zIndex: computed.zIndex,
        };
      };
      return {
        formDisplay: getComputedStyle(wrapper).display,
        writePadding: getComputedStyle(writeBox).padding,
        textarea: {
          display: getComputedStyle(textareaBox).display,
          margin: getComputedStyle(textareaBox).margin,
          padding: getComputedStyle(textareaBox).padding,
          position: getComputedStyle(textareaBox).position,
        },
        textareaControl: {
          borderRadius: getComputedStyle(textarea).borderRadius,
          boxShadow: getComputedStyle(textarea).boxShadow,
          fontSize: getComputedStyle(textarea).fontSize,
          height: getComputedStyle(textarea).height,
          margin: getComputedStyle(textarea).margin,
          resize: getComputedStyle(textarea).resize,
        },
        fileUpload: {
          display: getComputedStyle(fileUpload).display,
          position: getComputedStyle(fileUpload).position,
        },
        fileUploadLabel: {
          ...controlStyle(fileUploadLabel),
          borderRadius: getComputedStyle(fileUploadLabel).borderRadius,
          display: getComputedStyle(fileUploadLabel).display,
          transition: getComputedStyle(fileUploadLabel).transition,
        },
        cancelButton: controlStyle(cancelButton),
        saveButton: controlStyle(saveButton),
        fileUploadInput: {
          bottom: getComputedStyle(fileUploadInput).bottom,
          height: getComputedStyle(fileUploadInput).height,
          left: getComputedStyle(fileUploadInput).left,
          opacity: getComputedStyle(fileUploadInput).opacity,
          position: getComputedStyle(fileUploadInput).position,
          right: getComputedStyle(fileUploadInput).right,
          top: getComputedStyle(fileUploadInput).top,
          width: getComputedStyle(fileUploadInput).width,
        },
        actions: {
          marginTop: getComputedStyle(actions).marginTop,
          textAlign: getComputedStyle(actions).textAlign,
        },
        editorNav: {
          borderBottom: getComputedStyle(editorNav).borderBottom,
          height: getComputedStyle(editorNav).height,
          listStyleType: getComputedStyle(editorNav).listStyleType,
          margin: getComputedStyle(editorNav).margin,
          padding: getComputedStyle(editorNav).padding,
          before: {
            content: getComputedStyle(editorNav, "::before").content,
            display: getComputedStyle(editorNav, "::before").display,
            lineHeight: getComputedStyle(editorNav, "::before").lineHeight,
          },
          after: {
            clear: getComputedStyle(editorNav, "::after").clear,
            content: getComputedStyle(editorNav, "::after").content,
            display: getComputedStyle(editorNav, "::after").display,
            lineHeight: getComputedStyle(editorNav, "::after").lineHeight,
          },
        },
        editorItems: editorNavItems.map((item) => ({
          float: getComputedStyle(item).float,
          marginBottom: getComputedStyle(item).marginBottom,
        })),
        editTab: {
          backgroundColor: getComputedStyle(editTab).backgroundColor,
          borderTop: getComputedStyle(editTab).borderTop,
          borderRight: getComputedStyle(editTab).borderRight,
          borderBottomColor: getComputedStyle(editTab).borderBottomColor,
          borderLeft: getComputedStyle(editTab).borderLeft,
          borderRadius: getComputedStyle(editTab).borderRadius,
          color: getComputedStyle(editTab).color,
          cursor: getComputedStyle(editTab).cursor,
          display: getComputedStyle(editTab).display,
          fontWeight: getComputedStyle(editTab).fontWeight,
          lineHeight: getComputedStyle(editTab).lineHeight,
          marginRight: getComputedStyle(editTab).marginRight,
          padding: getComputedStyle(editTab).padding,
        },
        previewTab: {
          backgroundColor: getComputedStyle(previewTab).backgroundColor,
          border: getComputedStyle(previewTab).border,
          borderRadius: getComputedStyle(previewTab).borderRadius,
          color: getComputedStyle(previewTab).color,
          cursor: getComputedStyle(previewTab).cursor,
          display: getComputedStyle(previewTab).display,
          fontWeight: getComputedStyle(previewTab).fontWeight,
          lineHeight: getComputedStyle(previewTab).lineHeight,
          marginRight: getComputedStyle(previewTab).marginRight,
          padding: getComputedStyle(previewTab).padding,
        },
        checklistWrap: { marginTop: getComputedStyle(checklistWrap).marginTop },
        checklistButton: {
          ...controlStyle(checklistButton),
          fontWeight: getComputedStyle(checklistButton).fontWeight,
          marginTop: getComputedStyle(checklistButton).marginTop,
        },
        checklistIcon: {
          backgroundImage: getComputedStyle(checklistIcon).backgroundImage,
          display: getComputedStyle(checklistIcon).display,
          fontFamily: getComputedStyle(checklistIcon).fontFamily,
          fontStyle: getComputedStyle(checklistIcon).fontStyle,
          fontVariant: getComputedStyle(checklistIcon).fontVariant,
          fontWeight: getComputedStyle(checklistIcon).fontWeight,
          glyph: getComputedStyle(checklistIcon, "::before").content,
          lineHeight: getComputedStyle(checklistIcon).lineHeight,
          textDecorationLine: getComputedStyle(checklistIcon).textDecorationLine,
          verticalAlign: getComputedStyle(checklistIcon).verticalAlign,
        },
        editorTabOrder:
          Boolean(editTab.compareDocumentPosition(previewTab) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          editorNavItems.every((item, index) =>
            index === 0
              ? true
              : Boolean(
                  editorNavItems[index - 1]!.compareDocumentPosition(item) &
                  Node.DOCUMENT_POSITION_FOLLOWING,
                ),
          ),
        editorTabsContained:
          editTabRect.left >= editorNavRect.left &&
          previewTabRect.right <= editorNavRect.right &&
          editTabRect.top >= editorNavRect.top &&
          previewTabRect.bottom <= editorNavRect.bottom + 2,
        editorTabsAligned:
          Math.abs(editTabRect.top - previewTabRect.top) <= 1 &&
          Math.abs(editTabRect.bottom - previewTabRect.bottom) <= 1,
        editorTabsDoNotOverlap: editTabRect.right <= previewTabRect.left,
        editorItemsFollowTabs: editorItemRects
          .slice(2)
          .every((rect, index) => rect.left >= editorItemRects[index + 1]!.right),
        checklistOrder:
          Boolean(
            previewTab.compareDocumentPosition(checklistWrap) & Node.DOCUMENT_POSITION_FOLLOWING,
          ) &&
          Boolean(
            checklistWrap.compareDocumentPosition(editorNavItems[3]!) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        checklistContained:
          checklistWrapRect.left >= editorItemRects[2]!.left &&
          checklistWrapRect.right <= editorItemRects[2]!.right &&
          checklistButtonRect.left >= checklistWrapRect.left &&
          checklistButtonRect.right <= checklistWrapRect.right &&
          checklistIconRect.left >= checklistButtonRect.left &&
          checklistIconRect.right <= checklistButtonRect.right,
        checklistAligned:
          Math.abs(checklistButtonRect.top - editTabRect.top) <= 3 &&
          Math.abs(checklistButtonRect.bottom - editTabRect.bottom) <= 3,
        checklistDoesNotOverlap: previewTabRect.right <= checklistButtonRect.left,
        order:
          Boolean(textareaBox.compareDocumentPosition(upload) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          Boolean(upload.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING),
        containment:
          writeRect.left >= formRect.left &&
          writeRect.right <= formRect.right &&
          textareaRect.left >= writeRect.left &&
          textareaRect.right <= writeRect.right &&
          actionsRect.left >= writeRect.left &&
          actionsRect.right <= writeRect.right,
        noOverlap: textareaRect.bottom <= actionsRect.top,
        actionRightAligned: actionsRect.right <= writeRect.right,
        textareaContained:
          textareaControlRect.left >= textareaRect.left &&
          textareaControlRect.right <= textareaRect.right,
        textareaWidthTracksBox:
          textareaControlRect.width > 0 &&
          Math.abs(textareaControlRect.width - textareaRect.width) <= 2,
        uploadLabelMatchesWrapper:
          fileUploadLabelRect.left === fileUploadRect.left &&
          fileUploadLabelRect.right === fileUploadRect.right &&
          fileUploadLabelRect.top === fileUploadRect.top &&
          fileUploadLabelRect.bottom === fileUploadRect.bottom,
        controlOrder:
          Boolean(
            fileUploadLabel.compareDocumentPosition(cancelButton) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ) &&
          Boolean(
            cancelButton.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        buttonsAligned:
          Math.abs(cancelRect.top - saveRect.top) <= 1 &&
          Math.abs(cancelRect.bottom - saveRect.bottom) <= 1,
        controlsContained:
          fileUploadLabelRect.left >= actionsRect.left &&
          fileUploadLabelRect.right <= actionsRect.right &&
          fileUploadLabelRect.top >= actionsRect.top &&
          fileUploadLabelRect.bottom <= actionsRect.bottom &&
          cancelRect.left >= actionsRect.left &&
          cancelRect.right <= actionsRect.right &&
          cancelRect.top >= actionsRect.top &&
          cancelRect.bottom <= actionsRect.bottom &&
          saveRect.left >= actionsRect.left &&
          saveRect.right <= actionsRect.right &&
          saveRect.top >= actionsRect.top &&
          saveRect.bottom <= actionsRect.bottom,
        controlsDoNotOverlap:
          fileUploadLabelRect.right <= cancelRect.left && cancelRect.right <= saveRect.left,
      };
    });
    expect(metrics).toEqual({
      formDisplay: "block",
      writePadding: "10px",
      textarea: {
        display: "block",
        margin: "0px 0px 10px",
        padding: "0px 2px 0px 0px",
        position: "relative",
      },
      textareaControl: {
        borderRadius: "0px 0px 3px 3px",
        boxShadow: "none",
        fontSize: viewport.width <= 720 ? "16px" : "12px",
        height: "160px",
        margin: "0px",
        resize: "vertical",
      },
      fileUpload: { display: "inline-block", position: "relative" },
      fileUploadLabel: {
        backgroundColor: "rgb(255, 255, 255)",
        border: "1px solid rgba(0, 0, 0, 0.15)",
        borderRadius: "3px",
        boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
        color: "rgb(51, 51, 51)",
        cursor: "pointer",
        display: "block",
        fontSize: "14px",
        lineHeight: "20px",
        marginBottom: "0px",
        marginLeft: "0px",
        padding: "4px 12px",
        position: "relative",
        textAlign: "center",
        textShadow: "none",
        transition: "background 0.3s",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        zIndex: "2",
      },
      cancelButton: {
        backgroundColor: "rgb(255, 255, 255)",
        border: "1px solid rgba(0, 0, 0, 0.15)",
        borderRadius: "3px",
        boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
        color: "rgb(51, 51, 51)",
        cursor: "pointer",
        display: "inline-block",
        fontSize: "14px",
        lineHeight: "20px",
        marginBottom: "0px",
        marginLeft: "4.2px",
        padding: "4px 12px",
        position: "relative",
        textAlign: "center",
        textShadow: "none",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        zIndex: "2",
      },
      saveButton: {
        backgroundColor: "rgb(58, 126, 229)",
        border: "1px solid rgb(32, 110, 229)",
        borderRadius: "3px",
        boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
        color: "rgb(255, 255, 255)",
        cursor: "pointer",
        display: "inline-block",
        fontSize: "14px",
        lineHeight: "20px",
        marginBottom: "0px",
        marginLeft: "4.2px",
        padding: "4px 12px",
        position: "relative",
        textAlign: "center",
        textShadow: "none",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        zIndex: "2",
      },
      fileUploadInput: {
        bottom: "0px",
        height: "0px",
        left: "0px",
        opacity: "0",
        position: "fixed",
        right: "0px",
        top: "0px",
        width: "0px",
      },
      actions: { marginTop: "10px", textAlign: "right" },
      editorNav: {
        borderBottom: "1px solid rgb(221, 221, 221)",
        height: "29px",
        listStyleType: "none",
        margin: "0px",
        padding: "0px",
        before: { content: '""', display: "table", lineHeight: "0px" },
        after: { clear: "both", content: '""', display: "table", lineHeight: "0px" },
      },
      editorItems: Array.from({ length: 5 }, () => ({ float: "left", marginBottom: "-2px" })),
      editTab: {
        backgroundColor: "rgb(255, 255, 255)",
        borderTop: "1px solid rgb(221, 221, 221)",
        borderRight: "1px solid rgb(221, 221, 221)",
        borderBottomColor: "rgba(0, 0, 0, 0)",
        borderLeft: "1px solid rgb(221, 221, 221)",
        borderRadius: "4px 4px 0px 0px",
        color: "rgb(85, 85, 85)",
        cursor: "default",
        display: "block",
        fontWeight: "700",
        lineHeight: "20px",
        marginRight: "2px",
        padding: viewport.width <= 720 ? "4px 5px" : "4px 15px",
      },
      previewTab: {
        backgroundColor: "rgba(0, 0, 0, 0)",
        border: "1px solid rgba(0, 0, 0, 0)",
        borderRadius: "4px 4px 0px 0px",
        color: "rgb(53, 146, 181)",
        cursor: "pointer",
        display: "block",
        fontWeight: "700",
        lineHeight: "20px",
        marginRight: "2px",
        padding: viewport.width <= 720 ? "4px 5px" : "4px 15px",
      },
      checklistWrap: { marginTop: "2px" },
      checklistButton: {
        backgroundColor: "rgb(238, 238, 238)",
        border: "1px solid rgba(0, 0, 0, 0)",
        borderRadius: "3px",
        boxShadow: "none",
        color: "rgb(102, 102, 102)",
        cursor: "pointer",
        display: "inline-block",
        fontSize: "13px",
        fontWeight: "600",
        lineHeight: "20px",
        marginBottom: "0px",
        marginLeft: "0px",
        marginTop: "1px",
        padding: "1px 10px",
        position: "relative",
        textAlign: "center",
        textShadow: "none",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        zIndex: "2",
      },
      checklistIcon: {
        backgroundImage: "none",
        display: "inline-block",
        fontFamily: "yobicon",
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: "400",
        glyph: '""',
        lineHeight: "20px",
        textDecorationLine: "none",
        verticalAlign: "baseline",
      },
      editorTabOrder: true,
      editorTabsContained: true,
      editorTabsAligned: true,
      editorTabsDoNotOverlap: true,
      editorItemsFollowTabs: true,
      checklistOrder: true,
      checklistContained: true,
      checklistAligned: true,
      checklistDoesNotOverlap: true,
      order: true,
      containment: true,
      noOverlap: true,
      actionRightAligned: true,
      textareaContained: true,
      textareaWidthTracksBox: true,
      uploadLabelMatchesWrapper: true,
      controlOrder: true,
      buttonsAligned: true,
      controlsContained: true,
      controlsDoNotOverlap: true,
    });

    await previewTab.hover();
    await expect(previewTab).toHaveCSS("background-color", "rgb(242, 242, 242)");
    await expect(previewTab).toHaveCSS(
      "border-color",
      "rgb(238, 238, 238) rgb(238, 238, 238) rgb(221, 221, 221)",
    );
    await previewTab.click();
    await expect(previewTab).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-update-editor-tab-active",
    );
    await expect(editTab).toHaveAttribute(
      "data-stylex-owner",
      "post-detail-comment-update-editor-tab",
    );
    await expect(previewTab).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(previewTab).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
    await expect(form.locator(`#preview-21`)).toBeVisible();
    await expect(form.locator(`#edit-21`)).toBeHidden();
    await editTab.click();
    await expect(form.locator(`#edit-21`)).toBeVisible();

    const checklistUrl = page.url();
    const checklistValue = await textarea.inputValue();
    await checklistButton.hover();
    await expect(checklistButton).toHaveCSS("background-color", "rgb(251, 233, 231)");
    await expect(checklistButton).toHaveCSS("border-color", "rgb(239, 154, 154)");
    await expect(checklistButton).toHaveCSS("color", "rgb(201, 52, 38)");
    await checklistButton.focus();
    await expect(checklistButton).toHaveCSS("background-color", "rgb(251, 233, 231)");
    await expect(checklistButton).toHaveCSS("border-color", "rgb(239, 154, 154)");
    await checklistButton.click();
    await expect(formWrap).toBeVisible();
    await expect(textarea).toHaveValue(checklistValue);
    expect(page.url()).toBe(checklistUrl);

    await fileUploadLabel.hover();
    await expect(fileUploadLabel).toHaveCSS("background-color", "rgb(241, 241, 241)");
    await expect(fileUploadLabel).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
    await cancelButton.hover();
    await expect(cancelButton).toHaveCSS("background-color", "rgb(241, 241, 241)");
    await expect(cancelButton).toHaveCSS("color", "rgb(41, 41, 41)");
    await saveButton.hover();
    await expect(saveButton).toHaveCSS("background-color", "rgb(32, 110, 229)");
    await expect(saveButton).toHaveCSS("color", "rgb(255, 255, 255)");
    await saveButton.focus();
    await expect(saveButton).toHaveCSS("background-color", "rgb(32, 110, 229)");
    await expect(saveButton).toHaveCSS("border-color", "rgb(32, 110, 229)");

    await textarea.focus();
    await expect(textarea).toHaveCSS("border", "1px solid rgb(243, 108, 34)");
    await expect(textarea).toHaveCSS("box-shadow", "none");
    await fileUploadInput.setInputFiles({
      name: `batch-797-${viewport.width}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from("batch 797"),
    });
    expect(await fileUploadInput.evaluate((input: HTMLInputElement) => input.files?.length)).toBe(
      1,
    );

    await actions.getByRole("button", { name: "Cancel" }).click();
    await expect(formWrap).toHaveCSS("display", "none");
    await expect(body).toBeVisible();
    await expect(body).toContainText("First comment");
    await comment.locator('.act-row button[title="Edit comment"]').click();
    await textarea.fill(`Updated at ${viewport.width}`);
    await actions.getByRole("button", { name: "Save" }).click();
    await expect
      .poll(() => commentUpdateRequests.at(-1)?.contentsMarkdown)
      .toBe(`Updated at ${viewport.width}`);
    await expect(formWrap).toHaveCSS("display", "none");
    await expect(body).toContainText(`Updated at ${viewport.width}`);
  }
});

async function mockProjectPosts(
  page: Page,
  state:
    | "default"
    | "paged"
    | "empty"
    | "prefix"
    | "editableLabel"
    | "readonlyLabel"
    | "comment"
    | "unauthorizedComment"
    | "commentUpdate"
    | "viaEmailComment"
    | "attachments"
    | "childComment"
    | "parentRichMarkdown"
    | "commitReferenceMarkdown" = "default",
  overrides: Record<string, unknown> = {},
) {
  const ownerName = String(overrides.__ownerName ?? "admin");
  const projectName = String(overrides.__projectName ?? "sample");
  const detailPostNumber = String(overrides.__postNumber ?? "3");
  const defaultLabelOptions = [
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
      color: "#e95e01",
      id: "9",
      name: "enhancement",
    },
    {
      categoryId: "4",
      categoryIsExclusive: true,
      categoryName: "priority",
      color: "#b13427",
      id: "10",
      name: "high",
    },
    {
      categoryId: "4",
      categoryIsExclusive: true,
      categoryName: "priority",
      color: "#666666",
      id: "11",
      name: "low",
    },
  ];
  const labelOptions = Array.isArray(overrides.__labelOptions)
    ? overrides.__labelOptions
    : defaultLabelOptions;
  const projectOverrides =
    overrides.__projectOverrides && typeof overrides.__projectOverrides === "object"
      ? (overrides.__projectOverrides as Record<string, unknown>)
      : {};
  const menuSettingOverrides =
    projectOverrides.menuSetting && typeof projectOverrides.menuSetting === "object"
      ? (projectOverrides.menuSetting as Record<string, unknown>)
      : {};
  const projectResponse = {
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
      ...menuSettingOverrides,
    },
    vcs: "GIT",
    viewerCanUpdate: true,
    ...projectOverrides,
    ownerName,
    projectName,
  };
  const commentCreateRequests: Array<{
    attachmentIds: string[];
    contentsMarkdown: string;
    parentCommentId: string | number | null;
  }> = [];
  const commentUpdateRequests: Array<{
    attachmentIds: string[];
    contentsMarkdown: string;
    parentCommentId: string | number | null;
  }> = [];
  const deleteRequests: string[] = [];
  const commentDeleteRequests: string[] = [];
  const watchRequests: string[] = [];
  const labelUpdateRequests: string[][] = [];
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
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(projectResponse),
      });
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/posts/form-options**`,
    async (route) => {
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
          labels: labelOptions,
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
    },
  );
  await page.route(`**/api/v1/projects/${ownerName}/${projectName}/posts?**`, async (route) => {
    const isEmpty = state === "empty";
    const requestUrl = new URL(route.request().url());
    const requestPageNum = Number(requestUrl.searchParams.get("pageNum")) || 1;
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
                ownerName,
                postNumber: "3",
                projectName,
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
                ownerName,
                postNumber: "2",
                projectName,
                readme: false,
                title: "Pinned notice",
                updatedLabel: "Jul 1, 2026",
              },
            ],
        ownerName,
        pageNum: state === "paged" ? requestPageNum : 1,
        pageSize: 15,
        projectName,
        readme: null,
        totalCount: isEmpty ? 0 : state === "paged" ? 45 : 2,
      }),
    });
  });
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/posts/${detailPostNumber}`,
    async (route) => {
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
          bodyHtml: "<p>Server HTML should not render</p>",
          bodyMarkdown: "Post **markdown**",
          commentCount:
            state === "comment" ||
            state === "commentUpdate" ||
            state === "viaEmailComment" ||
            state === "attachments" ||
            state === "parentRichMarkdown" ||
            state === "commitReferenceMarkdown"
              ? state === "commitReferenceMarkdown"
                ? 2
                : 1
              : state === "childComment"
                ? 2
                : 0,
          comments:
            state === "comment" ||
            state === "commentUpdate" ||
            state === "viaEmailComment" ||
            state === "attachments" ||
            state === "parentRichMarkdown" ||
            state === "childComment" ||
            state === "commitReferenceMarkdown"
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
                    contentsHtml: "<p>Server HTML should not render</p>",
                    contentsMarkdown:
                      state === "viaEmailComment"
                        ? "Reply before quoted mail.\n\n---- Original Message ----\nOriginal author wrote:\n\n> Quoted original line"
                        : state === "parentRichMarkdown"
                          ? "Parent @dev references @weblabs, @other/cross, #11, and #12."
                          : state === "commitReferenceMarkdown"
                            ? "Parent @0123456789abcdef and admin/sample@fedcba987654321."
                            : "First **comment**",
                    createdLabel: "Jul 3, 2026",
                    id: "21",
                    issueReferences:
                      state === "parentRichMarkdown"
                        ? [
                            {
                              issueNumber: 11,
                              ownerName,
                              projectName,
                              state: "Open",
                              title: "Open parent Markdown",
                            },
                            {
                              issueNumber: 12,
                              ownerName,
                              projectName,
                              state: "Closed",
                              title: "Closed parent Markdown",
                            },
                          ]
                        : undefined,
                    mentionReferences:
                      state === "parentRichMarkdown"
                        ? [
                            {
                              kind: "user",
                              label: "Dev Member",
                              loginId: "dev",
                              ownerName: "",
                              projectName: "",
                            },
                            {
                              kind: "organization",
                              label: "Team",
                              loginId: "weblabs",
                              ownerName: "",
                              projectName: "",
                            },
                            {
                              kind: "project",
                              label: "other/cross",
                              loginId: "other/cross",
                              ownerName: "other",
                              projectName: "cross",
                            },
                          ]
                        : undefined,
                    commitReferences:
                      state === "commitReferenceMarkdown"
                        ? [
                            {
                              commitId: "0123456789abcdef",
                              ownerName,
                              projectName,
                              shortId: "0123456",
                            },
                            {
                              commitId: "fedcba987654321",
                              ownerName: "admin",
                              projectName: "sample",
                              shortId: "fedcba9",
                            },
                          ]
                        : undefined,
                    parentCommentId: "",
                    viaEmail: state === "viaEmailComment",
                  },
                  ...(state === "childComment" || state === "commitReferenceMarkdown"
                    ? [
                        {
                          attachments: [],
                          authorId: "1",
                          authorLabel: "Site Admin",
                          authorLoginId: "admin",
                          contentsHtml: "<p>Server HTML should not render</p>",
                          contentsMarkdown:
                            state === "commitReferenceMarkdown"
                              ? "> @abcdef0123456789 and admin/sample@1234567890abcdef.\n\nNested reply"
                              : "> @dev references #11, #12, @weblabs, and @other/cross.\n\nNested **reply**",
                          createdLabel: "Jul 4, 2026",
                          id: "22",
                          issueReferences:
                            state === "childComment"
                              ? [
                                  {
                                    issueNumber: 11,
                                    ownerName: "admin",
                                    projectName: "sample",
                                    state: "Open",
                                    title: "Rich child Markdown",
                                  },
                                  {
                                    issueNumber: 12,
                                    ownerName: "admin",
                                    projectName: "sample",
                                    state: "Closed",
                                    title: "Closed child Markdown",
                                  },
                                ]
                              : undefined,
                          mentionReferences:
                            state === "childComment"
                              ? [
                                  {
                                    kind: "user",
                                    label: "Dev Member",
                                    loginId: "dev",
                                    ownerName: "",
                                    projectName: "",
                                  },
                                  {
                                    kind: "organization",
                                    label: "Team",
                                    loginId: "weblabs",
                                    ownerName: "",
                                    projectName: "",
                                  },
                                  {
                                    kind: "project",
                                    label: "other/cross",
                                    ownerName: "other",
                                    projectName: "cross",
                                    loginId: "other/cross",
                                  },
                                ]
                              : undefined,
                          commitReferences:
                            state === "commitReferenceMarkdown"
                              ? [
                                  {
                                    commitId: "abcdef0123456789",
                                    ownerName: "admin",
                                    projectName: "sample",
                                    shortId: "abcdef0",
                                  },
                                  {
                                    commitId: "1234567890abcdef",
                                    ownerName: "admin",
                                    projectName: "sample",
                                    shortId: "1234567",
                                  },
                                ]
                              : undefined,
                          parentCommentId: "21",
                          viaEmail: false,
                        },
                      ]
                    : []),
                ]
              : [],
          createdLabel: "Jul 2, 2026",
          historyHtml: "<p>Server HTML should not render</p>",
          historyMarkdown: "Edited **body**",
          id: "33",
          isWatching: false,
          labels:
            state === "readonlyLabel" || state === "editableLabel"
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
          ownerName,
          permissions: {
            canComment: state !== "unauthorizedComment",
            canCreate: true,
            canDelete: true,
            canRead: true,
            canSetNotice: true,
            canWatch: true,
            canUpdate: state !== "readonlyLabel",
          },
          postNumber: detailPostNumber,
          projectName,
          readme: false,
          title: "Release note",
          updatedLabel: "Jul 2, 2026",
          watcherCount: 0,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/posts/3/watch`,
    async (route) => {
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
          ownerName,
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
          projectName,
          readme: false,
          title: "Release note",
          updatedLabel: "Jul 2, 2026",
          watcherCount: isWatching ? 1 : 0,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/posts/3/labels`,
    async (route) => {
      if (route.request().method() === "PATCH") {
        const body = JSON.parse(route.request().postData() ?? "{}") as {
          labelIds?: string[];
        };
        const nextLabelIds = body.labelIds ?? [];
        labelUpdateRequests.push(nextLabelIds);
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
            labels: labelOptions.filter((label) => nextLabelIds.includes(label.id)),
            notice: false,
            ownerName,
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
            projectName,
            readme: false,
            title: "Release note",
            updatedLabel: "Jul 2, 2026",
            watcherCount: 0,
          }),
        });
        return;
      }
      await route.fallback();
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/posts/3/comments`,
    async (route) => {
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
            ownerName,
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
            projectName,
            readme: false,
            title: "Release note",
            updatedLabel: "Jul 2, 2026",
            watcherCount: 0,
          }),
        });
        return;
      }
      await route.fallback();
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/posts/3/comments/21`,
    async (route) => {
      if (route.request().method() === "PATCH") {
        const body = JSON.parse(route.request().postData() ?? "{}") as {
          attachmentIds?: string[];
          contentsMarkdown?: string;
          parentCommentId?: string | number | null;
        };
        commentUpdateRequests.push({
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
                authorId: "2",
                authorLabel: "Dev Member",
                authorLoginId: "dev",
                contentsHtml: "<p>Updated <strong>board</strong> comment</p>",
                contentsMarkdown: "Updated **board** comment",
                createdLabel: "Jul 3, 2026",
                id: "21",
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
            ownerName,
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
            projectName,
            readme: false,
            title: "Release note",
            updatedLabel: "Jul 2, 2026",
            watcherCount: 0,
          }),
        });
        return;
      }
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
            ownerName,
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
            projectName,
            readme: false,
            title: "Release note",
            updatedLabel: "Jul 2, 2026",
            watcherCount: 0,
          }),
        });
        return;
      }
      await route.fallback();
    },
  );
  return {
    commentCreateRequests,
    commentDeleteRequests,
    commentUpdateRequests,
    deleteRequests,
    labelUpdateRequests,
    watchRequests,
  };
}

async function protectedProjectPostsShellMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const search = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-gnb-search-box"]',
    );
    const board = document.querySelector<HTMLElement>(".post-list.project-page-wrap");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    if (!navbar || !scope || !search || !board || !menu) {
      throw new Error("Missing protected board shell elements");
    }
    const navbarRect = navbar.getBoundingClientRect();
    const scopeRect = scope.getBoundingClientRect();
    const searchRect = search.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    return {
      boardTopAtOrBelowMenu: Math.round(boardRect.top) >= Math.round(menuRect.bottom),
      gnbClassName: navbar.className,
      scopeBottomWithinNavbar: Math.round(scopeRect.bottom) <= Math.round(navbarRect.bottom),
      scopeTopWithinNavbar: Math.round(scopeRect.top) >= Math.round(navbarRect.top),
      searchBottomWithinNavbar: Math.round(searchRect.bottom) <= Math.round(navbarRect.bottom),
      searchLeftWithinNavbar: Math.round(searchRect.left) >= Math.round(navbarRect.left),
      searchRightWithinNavbar: Math.round(searchRect.right) <= Math.round(navbarRect.right),
      searchTopWithinNavbar: Math.round(searchRect.top) >= Math.round(navbarRect.top),
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
      if (node.id === "s2id_labelIds") {
        return "";
      }
      if (node.matches('link[href*="jquery.elevator.css"]')) {
        return "";
      }
      if (node.matches(".markdown-help-nav-button")) {
        return Array.from(node.childNodes)
          .map((child) => visit(child))
          .join("");
      }
      const editorModeLink = node.matches(
        "#comment-form .nav-tabs > li:nth-child(1) > a, #comment-form .nav-tabs > li:nth-child(2) > a",
      );
      const attrs = (
        editorModeLink ? [{ name: "type", value: "button" } as Attr] : Array.from(node.attributes)
      )
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            !(
              attr.name === "class" &&
              attr.value
                .split(/\s+/u)
                .filter(Boolean)
                .every(
                  (token) =>
                    token.startsWith("-post-detail__styles.") || /^x[a-z0-9]+$/u.test(token),
                )
            ) &&
            !(node.matches(".markdown-help-item") && attr.name === "id") &&
            attr.name !== "data-stylex-owner" &&
            attr.name !== "data-style-src" &&
            // TanStack Router annotates route-local active links; dedicated assertions cover
            // the shared project shell links that must remain legacy-clean.
            attr.name !== "aria-current" &&
            attr.name !== "data-status",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const tagName = editorModeLink ? "button" : node.tagName.toLowerCase();
      const open = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${tagName}>`;
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
              token && !token.startsWith("-post-detail__styles.") && !/^x[a-z0-9]+$/u.test(token),
          )
          .join(" ");
      }
      if (attr.name === "src" && attr.value.includes("/assets/")) {
        return attr.value.slice(attr.value.indexOf("/assets/"));
      }
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
        ".unsupported, [data-stylex-owner=global-gnb-outer], .project-header-outer, .project-menu-outer, .page-wrap-outer, [data-stylex-owner=site-footer]",
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
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            // TanStack Router annotates route-local active links; dedicated assertions cover
            // the shared project shell links that must remain legacy-clean.
            attr.name !== "aria-current" &&
            attr.name !== "data-status",
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

    function normalizeAttr(attr: Attr): string {
      if (
        attr.name === "class" &&
        (attr.ownerElement?.matches('[data-stylex-owner="global-gnb-inner"]') ||
          attr.ownerElement?.matches('[data-stylex-owner="global-gnb-outer"]') ||
          attr.ownerElement?.matches('[data-stylex-owner="site-footer"]') ||
          attr.ownerElement?.matches('[data-stylex-owner="site-footer-inner"]') ||
          attr.ownerElement?.matches('[data-stylex-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      if (
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("gnb-nav") &&
        attr.ownerElement.matches('[data-stylex-owner="global-gnb-nav"]')
      ) {
        const originalValue = attr.value;
        attr.value = originalValue
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
        try {
          return normalizeAttr(attr);
        } finally {
          attr.value = originalValue;
        }
      }
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

async function projectShellLinkActiveMarkers(page: Page) {
  return page.locator(".project-header-outer a, .project-menu-outer a").evaluateAll((links) =>
    links.flatMap((link) => {
      const leaked = ["class", "aria-current", "data-status"].filter((name) => {
        if (name === "class") {
          return link.classList.contains("active");
        }
        return link.hasAttribute(name);
      });
      return leaked.map((name) => `${link.getAttribute("href") ?? ""}:${name}`);
    }),
  );
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

    function normalizeAttr(attr: Attr): string {
      const isSiteLayoutHeader =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("gnb-outer") &&
        attr.ownerElement.matches("header.gnb-outer") &&
        attr.ownerElement.querySelector(':scope > div.gnb-inner form[name="gnb-search-form"]') !==
          null;
      const isSiteLayoutFooterOuter =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("page-footer-outer") &&
        attr.ownerElement.matches("footer.page-footer-outer") &&
        attr.ownerElement.querySelector(":scope > div.page-footer > span.provider") !== null;
      const isSiteLayoutFooterInner =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("page-footer") &&
        attr.ownerElement.matches("footer.page-footer-outer > div.page-footer") &&
        attr.ownerElement.querySelector(":scope > span.provider") !== null;
      const isSiteLayoutFooterProvider =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("provider") &&
        attr.ownerElement.matches("footer.page-footer-outer > div.page-footer > span.provider");
      const retiredToken = isSiteLayoutFooterOuter
        ? "page-footer-outer"
        : isSiteLayoutFooterInner
          ? "page-footer"
          : isSiteLayoutFooterProvider
            ? "provider"
            : isSiteLayoutHeader && attr.value.split(/\s+/u).includes("project-header")
              ? "project-header"
              : isSiteLayoutHeader
                ? "gnb-outer"
                : attr.name === "class" &&
                    attr.ownerElement &&
                    attr.value.split(/\s+/u).includes("gnb-inner") &&
                    attr.ownerElement.matches("header.gnb-outer > div.gnb-inner") &&
                    attr.ownerElement.querySelector('form[name="gnb-search-form"]') !== null
                  ? "gnb-inner"
                  : attr.name === "class" &&
                      attr.ownerElement &&
                      attr.value.split(/\s+/u).includes("gnb-nav") &&
                      attr.ownerElement.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                      attr.ownerElement.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-nav"
                    : null;
      if (retiredToken) {
        const originalValue = attr.value;
        attr.value = originalValue
          .split(/\s+/u)
          .filter((token) => token !== retiredToken)
          .join(" ");
        try {
          return normalizeAttr(attr);
        } finally {
          attr.value = originalValue;
        }
      }
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
