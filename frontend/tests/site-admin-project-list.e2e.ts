import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const SITE_PROJECT_LIST_ROUTE_SOURCE = "src/routes/sites/projectList.tsx";

const EXPECTED_PROJECT_LIST_SCREEN = `
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
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
      <li class="divider"></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
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
          <span class="user-menu"><a href="__BASE_PATH__/siteboss">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li>
          <li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)">
        <a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" alt=""></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button>
        <ul class="dropdown-menu flat right">
          <li><a href="__BASE_PATH__/user/issues/new">New issue</a></li>
          <li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li>
          <li><hr class="no-margin"></li>
          <li><a href="__BASE_PATH__/projectform">Create new project</a></li>
          <li><a href="__BASE_PATH__/organizations/new">New Group</a></li>
        </ul>
      </li>
    </ul>
  </div>
</header>
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner">
    <h3>Site management</h3>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="site-setting-wrap">
    <div class="row-fluid">
      <div class="span2">
        <ul class="site-setting-nav">
          <li class=""><a href="__BASE_PATH__/sites/userList">Users</a></li>
          <li class=""><a href="__BASE_PATH__/sites/postList">Posts</a></li>
          <li class=""><a href="__BASE_PATH__/sites/issueList">Issues</a></li>
          <li class="active"><a href="__BASE_PATH__/sites/projectList">Projects</a></li>
          <li class=""><a href="__BASE_PATH__/sites/mail">Send email</a></li>
          <li class=""><a href="__BASE_PATH__/sites/massmail">Send mass emails</a></li>
          <li class=""><a href="__BASE_PATH__/sites/update">Software Update</a></li>
          <li class=""><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
        </ul>
      </div>
      <div class="span10">
        <div class="title_area">
          <h2 class="pull-left">Projects</h2>
          <form class="form-search pull-right" action="__BASE_PATH__/sites/projectList">
            <div class="search-bar">
              <input type="text" class="textbox" name="filter" placeholder="Search by keyword" value="road">
              <button type="submit" class="search-btn"><i class="yobicon-search"></i></button>
            </div>
          </form>
        </div>
        <div class="row-fluid listhead">
          <div class="span5 listhead-title"><strong>Project name</strong></div>
          <div class="span4 listhead-title"><strong>Description</strong></div>
          <div class="span2 listhead-title"><strong>Created date</strong></div>
          <div class="span1 listhead-title"><strong>&nbsp;</strong></div>
        </div>
        <ul class="project-list-wrap">
          <li class="row-fluid listitem">
            <div class="span5 listitem-col">
              <a href="__BASE_PATH__/acme/roadmap" class="avatar-wrap list-avatar">
                <img src="/assets/images/default-project-logo.png" alt="roadmap">acme/roadmap
              </a>
              <a href="__BASE_PATH__/acme/roadmap" class="project-name">acme/roadmap</a>
            </div>
            <div class="span4 listitem-col">Release planning</div>
            <div class="span2 listitem-col">2026-06-29</div>
            <div class="span1 listitem-col">
              <button class="ybtn ybtn-danger" data-project-name="acme/roadmap" data-toggle="delete-project" data-href="__BASE_PATH__/sites/project/delete/77">Delete</button>
            </div>
          </li>
        </ul>
        <div id="pagination" class="page-navigation-wrap">
          <ul class="page-nums">
            <li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li>
            <li class="page-num"><input class="input-mini nospinner" name="pageNum" type="number" value="1" max="2" min="1" pattern="[0-9]*"></li>
            <li class="page-num delimiter">/</li>
            <li class="page-num">2</li>
            <li class="page-num ikon"><a href="__BASE_PATH__/sites/projectList?filter=road&amp;pageNum=2" pjax-page=""><span>Next page</span><i class="ico btn-pg-next"></i></a></li>
          </ul>
        </div>
        <div id="alertDeletionWrap" class="modal fade">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">×</button>
            <span id="project-name"></span>Delete project
          </div>
          <div class="modal-body">
            <p>Do you really want to delete this project?</p>
          </div>
          <div class="modal-footer">
            <button type="button" id="projectDeleteBtn" class="ybtn ybtn-danger">Yes</button>
            <button type="button" class="ybtn" data-dismiss="modal">No</button>
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

test("site admin project list matches legacy site/projectList.scala.html populated DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockProjects(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/projectList?filter=road`);
  await expect(page).toHaveTitle("Project list");
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".gnb-nav a[href]")).toHaveText(["Y", "List All", "Feedback"]);
  await expect
    .poll(() =>
      page
        .locator(".gnb-nav a[href]")
        .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? "")),
    )
    .toEqual([
      `${basePath}`,
      `${basePath}/projects`,
      "https://github.com/yona-projects/yona/issues",
    ]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Projects");
  await expect(page.locator(".site-setting-nav a")).toHaveText([
    "Users",
    "Posts",
    "Issues",
    "Projects",
    "Send email",
    "Send mass emails",
    "Software Update",
    "Diagnostics",
  ]);
  await expect
    .poll(() =>
      page
        .locator(".site-setting-nav a")
        .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? "")),
    )
    .toEqual([
      `${basePath}/sites/userList`,
      `${basePath}/sites/postList`,
      `${basePath}/sites/issueList`,
      `${basePath}/sites/projectList`,
      `${basePath}/sites/mail`,
      `${basePath}/sites/massmail`,
      `${basePath}/sites/update`,
      `${basePath}/sites/diagnostic`,
    ]);
  await expect(page.locator(".site-setting-nav li").nth(3)).toHaveClass("active");
  await expect(page.locator(".site-setting-nav li.active")).toHaveCount(1);
  expect(await siteSettingNavActiveMarkerLeaks(page)).toEqual([]);
  await expect(page.locator(".project-list-wrap .listitem")).toHaveCount(1);
  await expect(page.locator(".project-list-wrap .list-avatar")).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator(".project-name")).toHaveAttribute("href", `${basePath}/acme/roadmap`);
  await expect(page.locator('[data-toggle="delete-project"]')).toHaveAttribute(
    "data-href",
    `${basePath}/sites/project/delete/77`,
  );
  await expect(
    page.locator(".site-setting-nav a", { hasText: "Send mass emails" }),
  ).toHaveAttribute("href", `${basePath}/sites/massmail`);
  await expect(page.locator("#pagination")).toHaveClass("page-navigation-wrap");
  await expect(page.locator("#pagination .page-nums .page-num")).toHaveCount(5);
  await expect(page.locator("#pagination.pagination")).toHaveCount(0);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  const nextPageLink = page.locator("#pagination a", { hasText: "Next page" });
  await expect(nextPageLink).toHaveAttribute(
    "href",
    `${basePath}/sites/projectList?filter=road&pageNum=2`,
  );
  await expect(nextPageLink).toHaveAttribute("pjax-page", "");
  await expectLegacyPaginationLink(nextPageLink, {
    href: `${basePath}/sites/projectList?filter=road&pageNum=2`,
    text: "Next page",
  });
  expect(await siteLayoutRootOrder(page)).toEqual([
    "unsupported hidden",
    "gnb-outer",
    "site-breadcrumb-outer",
    "page-wrap-outer",
    "page-footer-outer",
  ]);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_PROJECT_LIST_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await projectListMetrics(page)).toEqual({
    avatarHeight: 40,
    avatarWrapHeight: 45,
    avatarWrapMarginRight: 10,
    avatarWrapMarginTop: 3,
    avatarWrapWidth: 45,
    avatarWidth: 45,
    contentWidthRatio: 0.83,
    deleteButtonHeight: 30,
    filterInputWidth: 350,
    firstHeaderColumnRatio: 0.4,
    firstRowColumnRatio: 0.4,
    firstRowLineHeight: 70,
    listHeadHeight: 41,
    listItemColumnFontSize: 12,
    listItemColumnLineHeight: 20,
    listItemColumnPaddingBlock: 20,
    modalFooterButtonGap: 32,
    modalWidth: 562,
    paginationOffsetTop: 16,
    projectNameFontSize: 14,
    projectNameFontWeight: "700",
    projectNameOffsetTop: -2,
    searchFormOffsetTop: 0,
    sidebarWidthRatio: 0.15,
    titleAreaHeight: 39,
  });
  const navbarMetrics = await projectListNavbarMetrics(page);
  expect(navbarMetrics.feedbackGap).toBeGreaterThanOrEqual(8);
  expect(navbarMetrics.feedbackGap).toBeLessThanOrEqual(12);
  expect(navbarMetrics.searchBoxContainedInNavbar).toBe(true);
  expect(navbarMetrics.searchBoxDoesNotOverlapFeedback).toBe(true);
  expect(navbarMetrics.searchBoxTopOffset).toBeGreaterThanOrEqual(0);
  expect(navbarMetrics.searchBoxBottomOffset).toBeGreaterThanOrEqual(0);
  expect(navbarMetrics.searchBoxTopOffset + navbarMetrics.searchBoxBottomOffset).toBeLessThan(
    navbarMetrics.navbarHeight,
  );

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-project-pagination";
  });
  await nextPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBe("road");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Projects");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-project-pagination");

  await page.goto(`${basePath}/sites/projectList?filter=road&pageNum=2`);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("2");
  const prevPageLink = page.locator("#pagination a", { hasText: "Previous page" });
  await expect(prevPageLink).toHaveAttribute(
    "href",
    `${basePath}/sites/projectList?filter=road&pageNum=1`,
  );
  await expect(prevPageLink).toHaveAttribute("pjax-page", "");
  await expectLegacyPaginationLink(prevPageLink, {
    href: `${basePath}/sites/projectList?filter=road&pageNum=1`,
    text: "Previous page",
  });
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "site-project-pagination-prev";
  });
  await prevPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBe("road");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-project-pagination-prev");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "site-project-pagination-input";
  });
  await page.locator('#pagination input[name="pageNum"]').fill("7");
  await page.locator('#pagination input[name="pageNum"]').press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBe("road");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-project-pagination-input");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "site-project-pagination-nondigit";
  });
  await page.locator('#pagination input[name="pageNum"]').fill("1e2");
  await page.locator('#pagination input[name="pageNum"]').press("Enter");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("2");
  await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBe("road");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-project-pagination-nondigit");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-project-search";
  });
  await page.locator('.form-search input[name="filter"]').fill("board");
  await page.locator(".form-search").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Expected project search form");
    }
    form.requestSubmit();
  });
  await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBe("board");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBeNull();
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-project-search");

  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBe("road");
  await expect(page.locator('.form-search input[name="filter"]')).toHaveValue("road");

  await mockPosts(page);
  const postsLink = page.locator(".site-setting-nav a", { hasText: "Posts" });
  await expect(postsLink).toHaveAttribute("href", `${basePath}/sites/postList`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-posts-nav";
  });
  await postsLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/postList`);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Posts");
  await expect(page.locator(".post-list-wrap .listitem")).toHaveCount(1);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-posts-nav");
});

test("site admin project list keeps the bare default URL and legacy authenticated shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockProjects(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/projectList`);

  await expect(page).toHaveTitle("Project list");
  await expect(page).toHaveURL(`${basePath}/sites/projectList`);
  expect(new URL(page.url()).search).toBe("");
  await expect(page.locator('.form-search input[name="filter"]')).toHaveValue("");
  await expect(page.locator(".gnb-nav a[href]")).toHaveText(["Y", "List All", "Feedback"]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
});

test("site admin project list row project links use SPA navigation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockProjects(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/projectList?filter=road`);
  const projectNameLink = page.locator(".project-name");
  await expect(projectNameLink).toHaveAttribute("href", `${basePath}/acme/roadmap`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-project-row";
  });
  await projectNameLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/acme/roadmap`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-project-row");
});

test("site admin project delete modal source stays route-owned", () => {
  const routeSource = readFileSync(SITE_PROJECT_LIST_ROUTE_SOURCE, "utf8");
  const modalSource = routeSource.slice(
    routeSource.indexOf("function insulateProjectDeleteModalButtonClick"),
    routeSource.indexOf("function LegacyMessage"),
  );

  expect(modalSource).toContain(
    "function insulateProjectDeleteModalButtonClick(event: MouseEvent<HTMLButtonElement>) {",
  );
  expect(modalSource).toContain("event.preventDefault();");
  expect(modalSource).toContain("event.stopPropagation();");
  expect(modalSource).toContain(
    "const openDeleteModal = (selectedProject: SiteProject, event: MouseEvent<HTMLButtonElement>) => {",
  );
  expect(modalSource).toContain(
    "const dismissDeleteModal = (event: MouseEvent<HTMLButtonElement>) => {",
  );
  expect(modalSource).toContain(
    "const confirmDeleteProject = (event: MouseEvent<HTMLButtonElement>) => {",
  );
  expect(modalSource).toContain("setDeleteProject(selectedProject);");
  expect(modalSource).toContain("setDeleteModalClosed(false);");
  expect(modalSource).toContain("closeDeletionModal();");
  expect(modalSource).toContain('data-toggle="delete-project"');
  expect(modalSource).toContain('data-dismiss="modal"');
  expect(modalSource).toContain("onClick={dismissDeleteModal}");
  expect(modalSource).toContain(
    '{deleteProject ? <div className="modal-backdrop fade in"></div> : null}',
  );
  expect(modalSource).not.toContain("document.");
  expect(modalSource).not.toContain("classList");
  expect(modalSource).not.toContain("style.display");
  expect(modalSource).not.toContain("addEventListener(");
  expect(modalSource).not.toContain("router.history.go(0)");
});

test("site admin project delete modal opens, dismisses, deletes, and stays on the SPA route", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await auditSiteProjectDeleteNativeListeners(page);
  await mockSiteAdminSession(page);
  const requests = await mockProjects(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/projectList?filter=road`);
  await rememberSpaMarker(page, "site-project-delete-modal");
  const projectListUrl = page.url();
  const deleteButton = page.locator('[data-toggle="delete-project"]');
  const deleteModal = page.locator("#alertDeletionWrap");
  const closeButton = page.locator("#alertDeletionWrap .close");
  const noButton = page.locator("#alertDeletionWrap .modal-footer .ybtn").filter({
    hasText: "No",
  });
  await expect(deleteModal).toHaveClass("modal fade");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(projectListUrl);
  expect(await spaMarker(page)).toBe("site-project-delete-modal");

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(page.locator("#project-name")).toHaveText("acme/roadmap");
  await expect(deleteModal).toHaveClass("modal fade in");
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(closeButton).toHaveAttribute("data-dismiss", "modal");
  await expect(noButton).toHaveAttribute("data-dismiss", "modal");
  await expect(page).toHaveURL(projectListUrl);
  expect(await spaMarker(page)).toBe("site-project-delete-modal");
  expect(requests.deletedProjectIds).toEqual([]);

  expect(await dispatchCancelableClick(noButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal fade hide");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(projectListUrl);
  expect(await spaMarker(page)).toBe("site-project-delete-modal");
  expect(requests.deletedProjectIds).toEqual([]);

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal fade in");
  expect(await dispatchCancelableClick(closeButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal fade hide");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(projectListUrl);
  expect(await spaMarker(page)).toBe("site-project-delete-modal");

  await rememberSpaMarker(page, "kept");
  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/site/projects/77") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#projectDeleteBtn").click();
  await deleteResponsePromise;

  await expect.poll(() => requests.deletedProjectIds).toEqual(["77"]);
  await expect(page.locator(".project-list-wrap .listitem")).toHaveCount(0);
  await expect(deleteModal).toHaveClass("modal fade hide");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(projectListUrl);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Projects");
  await expect.poll(() => spaMarker(page)).toBe("kept");
  expect(await readSiteProjectDeleteNativeListenerAudit(page)).toEqual([]);
});

test("site admin project list renders legacy update notification badge", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockProjects(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isAvailable",
    releaseUrl: "https://example.test/yona-1.1.0",
    versionToUpdate: "1.1.0",
  });

  await page.goto(`${basePath}/sites/projectList?filter=road`);

  const updateLink = page.locator(".site-setting-nav a", { hasText: "Software Update" });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator(".notification-badge")).toHaveText("1");
});

test("site admin project list uses direct typed links", () => {
  const routeSource = readFileSync(SITE_PROJECT_LIST_ROUTE_SOURCE, "utf8");

  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toMatch(/<a(?:\s|>)/u);
  expect(routeSource).not.toContain("<a ");
  expect(routeSource).not.toContain("<a>");
  expect(routeSource).not.toContain("setAttribute");
  expect(routeSource).not.toContain("removeAttribute");
  expect(routeSource).not.toContain("activeProps={{ className: undefined }}");
  expect(routeSource).not.toContain("to={item.href}");
  expect(routeSource).not.toContain("navItems.map");
  expect(routeSource).toContain("const legacyLinkSuppressionProps = {");
  expect(routeSource).toContain("activeOptions: { exact: true");
  expect(routeSource).toContain("explicitUndefined: true");
  expect(routeSource).toContain("className: undefined");
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).toContain('to="/sites/projectList"');
  expect(routeSource).toContain('to="/$ownerName/$projectName"');
  expect(routeSource).toContain("showLegacyProjectHeaderLinks");
  expect(routeSource).toContain("key={filter}");
  expect(routeSource).not.toContain("<a href={projectPath}");
  expect(routeSource).toContain('pjax-page=""');
});

async function expectLegacyPaginationLink(link: Locator, expected: { href: string; text: string }) {
  await expect(link).toHaveText(expected.text);
  await expect(link).toHaveAttribute("href", expected.href);
  await expect(link).toHaveAttribute("pjax-page", "");
  await expect(link).not.toHaveAttribute("class", /.+/);
  await expect(link).not.toHaveAttribute("title", /.+/);
  await expect(link).not.toHaveAttribute("aria-current", /.+/);
  await expect(link).not.toHaveAttribute("data-status", /.+/);
}

async function auditSiteProjectDeleteNativeListeners(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const records: string[] = [];
    Element.prototype.addEventListener = function addEventListenerWithSiteProjectDeleteAudit(
      type,
      listener,
      options,
    ) {
      if (
        this instanceof Element &&
        (this.matches('[data-toggle="delete-project"]') ||
          this.id === "alertDeletionWrap" ||
          this.id === "projectDeleteBtn" ||
          Boolean(this.closest("#alertDeletionWrap")))
      ) {
        records.push(`${this.id || this.className}:${type}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    (
      window as Window & typeof globalThis & { __siteProjectDeleteNativeListenerAudit?: string[] }
    ).__siteProjectDeleteNativeListenerAudit = records;
  });
}

async function readSiteProjectDeleteNativeListenerAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __siteProjectDeleteNativeListenerAudit?: string[];
          }
      ).__siteProjectDeleteNativeListenerAudit ?? [],
  );
}

async function dispatchCancelableClick(locator: Locator) {
  return locator.evaluate((element) => {
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    return element.dispatchEvent(clickEvent);
  });
}

async function rememberSpaMarker(page: Page, marker: string) {
  await page.evaluate((nextMarker) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      nextMarker;
  }, marker);
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function mockSiteAdminSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: "1",
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
      }),
    });
  });
}

async function mockProjects(page: Page) {
  const requests = {
    deletedProjectIds: [] as string[],
  };
  const projects = [
    {
      createdAt: "2026-06-29",
      id: 77,
      ownerName: "acme",
      overview: "Release planning",
      projectLogoUrl: "/assets/images/default-project-logo.png",
      projectName: "roadmap",
    },
  ];
  let total = 2;
  let totalPages = 2;

  await page.route("**/api/v1/site/projects?*", async (route) => {
    const url = new URL(route.request().url());
    const pageNum =
      Number(url.searchParams.get("page") ?? url.searchParams.get("pageNum") ?? "1") || 1;
    const filter = url.searchParams.get("filter") ?? "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        filter,
        page: pageNum,
        pageSize: 20,
        projects,
        total,
        totalPages,
      }),
    });
  });
  await page.route("**/api/v1/site/projects/*", async (route) => {
    if (route.request().method() === "DELETE") {
      const deletedProjectId = new URL(route.request().url()).pathname.split("/").pop() ?? "";
      requests.deletedProjectIds.push(deletedProjectId);
      const deletedIndex = projects.findIndex((project) => String(project.id) === deletedProjectId);
      if (deletedIndex >= 0) {
        projects.splice(deletedIndex, 1);
      }
      total = 0;
      totalPages = 0;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, redirectPath: "/sites/projectList" }),
    });
  });

  return requests;
}

async function mockUpdate(
  page: Page,
  response: {
    currentVersion: string;
    error: string | null;
    message: string;
    releaseUrl: string | null;
    versionToUpdate: string | null;
  },
) {
  await page.route("**/api/v1/site/update", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

async function siteSettingNavActiveMarkerLeaks(page: Page) {
  return page.locator(".site-setting-nav a").evaluateAll((links) =>
    links.flatMap((link) => {
      const leaked = ["class", "aria-current", "data-status"].filter((name) =>
        link.hasAttribute(name),
      );
      return leaked.map((name) => `${link.textContent?.trim() ?? ""}:${name}`);
    }),
  );
}

async function mockPosts(page: Page) {
  await page.route("**/api/v1/site/posts?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: 1,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/avatars/alice.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            labels: [],
            notice: false,
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            readme: false,
            title: "Release checklist",
            updatedLabel: "1 day ago",
          },
        ],
        total: 1,
        totalPages: 1,
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

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "placeholder",
        "src",
        "alt",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "max",
        "min",
        "pattern",
        "data-toggle",
        "data-placement",
        "data-project-name",
        "data-href",
        "data-dismiss",
        "role",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }
  });
}

async function siteLayoutRootOrder(page: Page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      ),
      (element) => element.getAttribute("class"),
    ),
  );
}

async function projectListMetrics(page: Page) {
  return page.evaluate(() => {
    const titleArea = requireElement(".title_area");
    const title = requireElement(".title_area h2");
    const searchForm = requireElement(".title_area .form-search");
    const filterInput = requireElement('.title_area input[name="filter"]');
    const row = requireElement(".site-setting-wrap > .row-fluid");
    const sidebar = requireElement(".site-setting-wrap > .row-fluid > .span2");
    const content = requireElement(".site-setting-wrap > .row-fluid > .span10");
    const listHead = requireElement(".listhead");
    const firstHeaderColumn = requireElement(".listhead .span5");
    const firstRowColumn = requireElement(".project-list-wrap .listitem .span5");
    const firstRow = requireElement(".project-list-wrap .listitem");
    const avatarWrap = requireElement(".project-list-wrap .list-avatar");
    const avatar = requireElement(".project-list-wrap .list-avatar img");
    const projectName = requireElement(".project-list-wrap .project-name");
    const deleteButton = requireElement('[data-toggle="delete-project"]');
    const pagination = requireElement("#pagination");
    const modal = requireElement("#alertDeletionWrap");
    const modalYes = requireElement("#projectDeleteBtn");
    const modalNo = requireElement('#alertDeletionWrap [data-dismiss="modal"]');
    const titleAreaRect = titleArea.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const searchFormRect = searchForm.getBoundingClientRect();
    const filterInputRect = filterInput.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const listHeadRect = listHead.getBoundingClientRect();
    const firstHeaderColumnRect = firstHeaderColumn.getBoundingClientRect();
    const firstRowColumnRect = firstRowColumn.getBoundingClientRect();
    const firstRowRect = firstRow.getBoundingClientRect();
    const firstRowStyle = getComputedStyle(firstRow);
    const firstRowColumnStyle = getComputedStyle(firstRowColumn);
    const avatarWrapStyle = getComputedStyle(avatarWrap);
    const avatarWrapRect = avatarWrap.getBoundingClientRect();
    const avatarRect = avatar.getBoundingClientRect();
    const projectNameStyle = getComputedStyle(projectName);
    const projectNameRect = projectName.getBoundingClientRect();
    const deleteButtonRect = deleteButton.getBoundingClientRect();
    const paginationRect = pagination.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();
    const modalYesRect = modalYes.getBoundingClientRect();
    const modalNoRect = modalNo.getBoundingClientRect();

    return {
      avatarHeight: Math.round(avatarRect.height),
      avatarWrapHeight: Math.round(avatarWrapRect.height),
      avatarWrapMarginRight: Math.round(parseFloat(avatarWrapStyle.marginRight)),
      avatarWrapMarginTop: Math.round(parseFloat(avatarWrapStyle.marginTop)),
      avatarWrapWidth: Math.round(avatarWrapRect.width),
      avatarWidth: Math.round(avatarRect.width),
      contentWidthRatio: Number((contentRect.width / rowRect.width).toFixed(2)),
      deleteButtonHeight: Math.round(deleteButtonRect.height),
      filterInputWidth: Math.round(filterInputRect.width),
      firstHeaderColumnRatio: Number((firstHeaderColumnRect.width / listHeadRect.width).toFixed(2)),
      firstRowColumnRatio: Number((firstRowColumnRect.width / firstRowRect.width).toFixed(2)),
      firstRowLineHeight: Math.round(parseFloat(firstRowStyle.lineHeight)),
      listHeadHeight: Math.round(listHeadRect.height),
      listItemColumnFontSize: Math.round(parseFloat(firstRowColumnStyle.fontSize)),
      listItemColumnLineHeight: Math.round(parseFloat(firstRowColumnStyle.lineHeight)),
      listItemColumnPaddingBlock:
        Math.round(parseFloat(firstRowColumnStyle.paddingTop)) +
        Math.round(parseFloat(firstRowColumnStyle.paddingBottom)),
      modalFooterButtonGap: Math.round(modalNoRect.left - modalYesRect.right),
      modalWidth: Math.round(modalRect.width),
      paginationOffsetTop: Math.round(paginationRect.top - firstRowRect.bottom),
      projectNameFontSize: Math.round(parseFloat(projectNameStyle.fontSize)),
      projectNameFontWeight: projectNameStyle.fontWeight,
      projectNameOffsetTop: Math.round(projectNameRect.top - avatarRect.top),
      searchFormOffsetTop: Math.round(searchFormRect.top - titleRect.top),
      sidebarWidthRatio: Number((sidebarRect.width / rowRect.width).toFixed(2)),
      titleAreaHeight: Math.round(titleAreaRect.height),
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

async function projectListNavbarMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = requireElement(".gnb-outer");
    const feedback = requireElement(
      '.gnb-nav a[href="https://github.com/yona-projects/yona/issues"]',
    );
    const searchBox = requireElement(".gnb-search-form .search-box");
    const navbarRect = navbar.getBoundingClientRect();
    const feedbackRect = feedback.getBoundingClientRect();
    const searchBoxRect = searchBox.getBoundingClientRect();

    return {
      feedbackGap: Math.round(searchBoxRect.left - feedbackRect.right),
      navbarHeight: Math.round(navbarRect.height),
      searchBoxContainedInNavbar:
        searchBoxRect.top >= navbarRect.top &&
        searchBoxRect.bottom <= navbarRect.bottom &&
        searchBoxRect.left >= navbarRect.left &&
        searchBoxRect.right <= navbarRect.right,
      searchBoxDoesNotOverlapFeedback: searchBoxRect.left >= feedbackRect.right,
      searchBoxBottomOffset: Math.round(navbarRect.bottom - searchBoxRect.bottom),
      searchBoxTopOffset: Math.round(searchBoxRect.top - navbarRect.top),
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

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((source) => {
    const template = document.createElement("template");
    template.innerHTML = source;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "placeholder",
        "src",
        "alt",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "max",
        "min",
        "pattern",
        "data-toggle",
        "data-placement",
        "data-project-name",
        "data-href",
        "data-dismiss",
        "role",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }
  }, html);
}
