import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const SITE_PROJECT_LIST_ROUTE_SOURCE = "src/routes/sites/projectList.tsx";

const EXPECTED_PROJECT_LIST_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <button class="pin" title="Sidebar" type="button">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </button>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
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
        <ul data-owner="site-project-list-container">
          <li class="row-fluid" data-owner="site-project-list-row">
            <div class="span5 listitem-col">
              <a href="__BASE_PATH__/acme/roadmap" data-owner="site-project-list-row-avatar">
                <img src="/assets/images/default-project-logo.png" alt="roadmap" data-owner="site-project-list-row-avatar-image">acme/roadmap
              </a>
              <a href="__BASE_PATH__/acme/roadmap" data-owner="site-project-list-project-name">acme/roadmap</a>
            </div>
            <div class="span4 listitem-col">Release planning</div>
            <div class="span2 listitem-col">2026-06-29</div>
            <div class="span1 listitem-col">
              <button data-owner="site-project-list-delete-action" data-project-name="acme/roadmap">Delete</button>
            </div>
          </li>
        </ul>
        <div id="pagination" class="page-navigation-wrap">
          <ul class="page-nums">
            <li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li>
            <li class="page-num"><input class="input-mini nospinner" name="pageNum" type="number" value="1" max="2" min="1" pattern="[0-9]*"></li>
            <li class="page-num delimiter">/</li>
            <li class="page-num">2</li>
            <li class="page-num ikon"><a href="__BASE_PATH__/sites/projectList?filter=road&amp;pageNum=2"><span>Next page</span><i class="ico btn-pg-next"></i></a></li>
          </ul>
        </div>
        <div id="alertDeletionWrap" data-owner="site-project-list-delete-modal">
          <div data-owner="site-project-list-delete-modal-header">
            <button type="button" data-owner="site-project-list-delete-modal-close">×</button>
            <span id="project-name"></span>Delete project
          </div>
          <div data-owner="site-project-list-delete-modal-body">
            <p>Do you really want to delete this project?</p>
          </div>
          <div data-owner="site-project-list-delete-modal-footer">
            <button type="button" id="projectDeleteBtn" data-owner="site-project-list-delete-modal-confirm-action">Yes</button>
            <button type="button" data-owner="site-project-list-delete-modal-cancel-action">No</button>
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
  await expect
    .poll(() =>
      page
        .locator("head > title")
        .first()
        .evaluate((title) => title.textContent),
    )
    .toBe("Project list");
  await expect(page.locator('[data-owner="site-project-list-setting-wrap"]')).toBeVisible();
  // F6 copy-fix: legacy authenticated GNB renders 3 anchors (Y/List All/Feedback,
  // yona-original/app/views/common/navbar.scala.html:50-54) — pin was stale at 2.
  await expect(page.locator('[data-owner="global-gnb-nav"] a[href]')).toHaveText([
    "Y",
    "List All",
    "Feedback",
  ]);
  await expect
    .poll(() =>
      page
        .locator('[data-owner="global-gnb-nav"] a[href]')
        .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? "")),
    )
    .toEqual([
      `${basePath}/`,
      `${basePath}/projects`,
      "https://github.com/yona-projects/yona/issues",
    ]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(
    page.locator(
      '[data-owner="site-project-list-sidebar-item"][data-selected="true"] > [data-owner="site-project-list-sidebar-link"]',
    ),
  ).toHaveText("Projects");
  await expect(page.locator('[data-owner="site-project-list-sidebar-link"]')).toHaveText([
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
        .locator('[data-owner="site-project-list-sidebar-link"]')
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
  await expect(
    page.locator('[data-owner="site-project-list-sidebar-item"]').nth(3),
  ).toHaveAttribute("data-selected", "true");
  await expect(
    page.locator('[data-owner="site-project-list-sidebar-item"][data-selected="true"]'),
  ).toHaveCount(1);
  expect(await siteSettingNavActiveMarkerLeaks(page)).toEqual([]);
  await expect(page.locator('[data-owner="site-project-list-row"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="site-project-list-row-avatar"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator('[data-owner="site-project-list-project-name"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator('[data-owner="site-project-list-delete-action"]')).toHaveAttribute(
    "data-project-name",
    "acme/roadmap",
  );
  await expect(
    page.locator('[data-owner="site-project-list-sidebar-link"]', {
      hasText: "Send mass emails",
    }),
  ).toHaveAttribute("href", `${basePath}/sites/massmail`);
  await expect(page.locator('[data-owner="site-project-list-pagination"]')).toHaveCount(1);
  await expect(
    page.locator(
      '[data-owner="site-project-list-pagination-list"] > [data-owner="site-project-list-pagination-item"]',
    ),
  ).toHaveCount(5);
  await expect(page.locator("#pagination.pagination")).toHaveCount(0);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  const nextPageLink = page.locator("#pagination a", { hasText: "Next page" });
  await expect(nextPageLink).toHaveAttribute(
    "href",
    `${basePath}/sites/projectList?filter=road&pageNum=2`,
  );
  await expectReactPaginationLink(nextPageLink, {
    href: `${basePath}/sites/projectList?filter=road&pageNum=2`,
    text: "Next page",
  });
  expect(await siteLayoutRootOrder(page)).toEqual([
    "unsupported hidden",
    "gnb-outer",
    "site-breadcrumb-outer",
    "page-wrap-outer",
    "site-footer",
  ]);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_PROJECT_LIST_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await projectListMetrics(page)).toEqual({
    avatarHeight: 45,
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
    modalFooterButtonGap: 0,
    modalWidth: 0,
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
  await expect(
    page.locator(
      '[data-owner="site-project-list-sidebar-item"][data-selected="true"] > [data-owner="site-project-list-sidebar-link"]',
    ),
  ).toHaveText("Projects");
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
  await expectReactPaginationLink(prevPageLink, {
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
  await page
    .locator('[data-owner="site-project-list-search-textbox"][name="filter"]')
    .fill("board");
  await page.locator('[data-owner="site-project-list-search"]').evaluate((form) => {
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
  await expect(
    page.locator('[data-owner="site-project-list-search-textbox"][name="filter"]'),
  ).toHaveValue("road");

  await mockPosts(page);
  const postsLink = page.locator('[data-owner="site-project-list-sidebar-link"]', {
    hasText: "Posts",
  });
  await expect(postsLink).toHaveAttribute("href", `${basePath}/sites/postList`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-posts-nav";
  });
  await postsLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/postList`);
  await expect(page.locator('[data-owner="site-post-list-sidebar-item"]').nth(1)).toContainText(
    "Posts",
  );
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
  await expect(
    page.locator('[data-owner="site-project-list-search-textbox"][name="filter"]'),
  ).toHaveValue("");
  // F6 copy-fix: legacy authenticated GNB renders 3 anchors (Y/List All/Feedback,
  // yona-original/app/views/common/navbar.scala.html:50-54) — pin was stale at 2.
  await expect(page.locator('[data-owner="global-gnb-nav"] a[href]')).toHaveText([
    "Y",
    "List All",
    "Feedback",
  ]);
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
  const projectNameLink = page.locator('[data-owner="site-project-list-project-name"]');
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
    routeSource.indexOf("function insulateProjectDeleteModalClick"),
    routeSource.indexOf("function LegacyMessage"),
  );

  expect(modalSource).toContain(
    "function insulateProjectDeleteModalClick(event: SyntheticEvent<HTMLElement>) {",
  );
  expect(modalSource).toContain("event.preventDefault();");
  expect(modalSource).toContain("event.stopPropagation();");
  expect(modalSource).toContain(
    "const openDeleteModal = (selectedProject: SiteProject, event: MouseEvent<HTMLButtonElement>) => {",
  );
  expect(modalSource).toContain(
    "const dismissDeleteModal = (event: SyntheticEvent<HTMLElement>) => {",
  );
  expect(modalSource).toContain(
    "const confirmDeleteProject = (event: MouseEvent<HTMLButtonElement>) => {",
  );
  expect(modalSource).toContain("setDeleteProject(selectedProject);");
  expect(modalSource).toContain("setDeleteModalClosed(false);");
  expect(modalSource).toContain("closeDeletionModal();");
  expect(modalSource).toContain('data-owner="site-project-list-delete-modal"');
  // F6 copy-fix: the modal visibility moved to style (projectList.tsx:778,
  // deleteModalVisible/deleteModalHidden) — still route-owned, no app deviation.

  expect(modalSource).toContain(
    'aria-hidden={deleteProject ? "false" : deleteModalClosed ? "true" : undefined}',
  );
  expect(modalSource).toContain("useMutation({");
  expect(modalSource).toContain("deleteSiteProjectRest(runtimeConfig, csrfToken, projectId)");
  expect(modalSource).toContain("readSessionBootstrap(runtimeConfig)");
  expect(modalSource).toContain("queryClient.setQueryData<SiteProjectListResponse>");
  expect(modalSource).toContain("apiQueryKeys.siteAdmin.projectsBase()");
  expect(modalSource).toContain('data-owner="site-project-list-delete-action"');
  expect(modalSource).not.toContain('data-dismiss="modal"');
  expect(modalSource).toContain("onClick={dismissDeleteModal}");
  expect(modalSource).toContain('data-owner="site-project-list-delete-modal-backdrop"');
  expect(modalSource).toContain("onKeyDown={(event) => {");
  expect(modalSource).toContain('if (event.key === "Escape") dismissDeleteModal(event);');
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
  const requests = await mockProjects(page, { deleteDelayMs: 150 });
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
  const deleteButton = page.locator('[data-owner="site-project-list-delete-action"]');
  const deleteModal = page.locator("#alertDeletionWrap");
  const closeButton = page.locator('[data-owner="site-project-list-delete-modal-close"]');
  const noButton = page.locator('[data-owner="site-project-list-delete-modal-cancel-action"]');
  await expect(deleteModal).toHaveAttribute("data-owner", "site-project-list-delete-modal");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(deleteModal).not.toHaveAttribute("aria-hidden", /.+/);
  await expect(page.locator('[data-owner="site-project-list-delete-modal-backdrop"]')).toHaveCount(
    0,
  );
  await expect(page).toHaveURL(projectListUrl);
  expect(await spaMarker(page)).toBe("site-project-delete-modal");
  expect(await projectListDeleteModalStateMetrics(page)).toMatchObject({
    closedModalHasStableOwner: true,
    deleteButtonAfterCreatedColumn: true,
    deleteButtonVerticallyOverlapsRow: true,
    modalInsideContentColumn: true,
    searchInsideTitleArea: true,
    searchDoesNotOverlapTitle: true,
    deleteButtonDoesNotOverlapProjectName: true,
  });

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(page.locator("#project-name")).toHaveText("acme/roadmap");
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator('[data-owner="site-project-list-delete-modal-backdrop"]')).toHaveCount(
    1,
  );
  await expect(page.locator('[data-owner="site-project-list-delete-modal-header"]')).toHaveText(
    "×acme/roadmapDelete project",
  );
  await expect(page.locator('[data-owner="site-project-list-delete-modal-body"] p')).toHaveText(
    "Do you really want to delete this project?",
  );
  const footerButtons = page.locator(
    '[data-owner="site-project-list-delete-modal-footer"] > button',
  );
  await expect(footerButtons).toHaveText(["Yes", "No"]);
  await expect(footerButtons.first()).toHaveAttribute("id", "projectDeleteBtn");
  await expect(footerButtons.first()).toHaveAttribute(
    "data-owner",
    "site-project-list-delete-modal-confirm-action",
  );
  await expect(footerButtons.nth(1)).toHaveAttribute(
    "data-owner",
    "site-project-list-delete-modal-cancel-action",
  );
  await expect(footerButtons.first()).not.toHaveClass(/(?:^|\s)ybtn(?:-danger)?(?:\s|$)/);
  await expect(footerButtons.nth(1)).not.toHaveClass(/(?:^|\s)ybtn(?:-danger)?(?:\s|$)/);
  expect(await projectListDeleteModalStateMetrics(page)).toMatchObject({
    openBackdropCoversContent: true,
    openModalCentered: true,
    openModalFooterButtonsAligned: true,
    yesBeforeNo: true,
  });
  await expect(closeButton).not.toHaveAttribute("data-dismiss", /.+/);
  await expect(noButton).not.toHaveAttribute("data-dismiss", /.+/);
  await expect(deleteModal.locator('[data-dismiss="modal"]')).toHaveCount(0);
  await expect(page).toHaveURL(projectListUrl);
  expect(await spaMarker(page)).toBe("site-project-delete-modal");
  expect(requests.deletedProjectIds).toEqual([]);

  expect(await dispatchCancelableClick(noButton)).toBe(false);
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('[data-owner="site-project-list-delete-modal-backdrop"]')).toHaveCount(
    0,
  );
  await expect(page).toHaveURL(projectListUrl);
  expect(await spaMarker(page)).toBe("site-project-delete-modal");
  expect(requests.deletedProjectIds).toEqual([]);

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  expect(await dispatchCancelableClick(closeButton)).toBe(false);
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('[data-owner="site-project-list-delete-modal-backdrop"]')).toHaveCount(
    0,
  );
  await expect(page).toHaveURL(projectListUrl);
  expect(await spaMarker(page)).toBe("site-project-delete-modal");

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  expect(
    await dispatchCancelableClick(
      page.locator('[data-owner="site-project-list-delete-modal-backdrop"]'),
    ),
  ).toBe(false);
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('[data-owner="site-project-list-delete-modal-backdrop"]')).toHaveCount(
    0,
  );
  await expect(page).toHaveURL(projectListUrl);
  expect(await spaMarker(page)).toBe("site-project-delete-modal");

  await rememberSpaMarker(page, "kept");
  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/site/projects/77") &&
      response.request().method() === "DELETE",
  );
  await page.locator('[data-owner="site-project-list-delete-modal-confirm-action"]').click();
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#project-name")).toHaveText("acme/roadmap");
  await deleteResponsePromise;

  await expect.poll(() => requests.deletedProjectIds).toEqual(["77"]);
  expect(requests.deleteRequests).toEqual([
    {
      hasCsrfHeader: true,
      method: "DELETE",
      pathname: `${basePath}/api/v1/site/projects/77`,
    },
  ]);
  await expect(page.locator('[data-owner="site-project-list-row"]')).toHaveCount(0);
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('[data-owner="site-project-list-delete-modal-backdrop"]')).toHaveCount(
    0,
  );
  await expect(page).toHaveURL(projectListUrl);
  await expect(
    page.locator(
      '[data-owner="site-project-list-sidebar-item"][data-selected="true"] > [data-owner="site-project-list-sidebar-link"]',
    ),
  ).toHaveText("Projects");
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

  const updateLink = page.locator('[data-owner="site-project-list-sidebar-link"]', {
    hasText: "Software Update",
  });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(
    updateLink.locator('[data-owner="site-project-list-notification-badge"]'),
  ).toHaveText("1");
});

test("site admin project list falls back to the legacy default project logo for blank logo URLs", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await mockSiteAdminSession(page);
  await mockProjects(page, {
    projectLogoUrl: "",
  });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/projectList?filter=road`);

  await expect(page.locator('[data-owner="site-project-list-row-avatar-image"]')).toHaveAttribute(
    "src",
    "/assets/images/project_default_logo.png",
  );
  expect(
    consoleErrors.filter((entry) =>
      entry.includes('An empty string ("") was passed to the %s attribute.'),
    ),
  ).toEqual([]);
});

test("site admin project list uses direct typed links", () => {
  const routeSource = readFileSync(SITE_PROJECT_LIST_ROUTE_SOURCE, "utf8");

  expect(routeSource).toContain('<title>{t("title.projectList")}</title>');
  expect(routeSource).not.toContain("useLegacySiteProjectListDocumentTitle");
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain('globalThis["document"]');
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

  expect(routeSource).toContain("explicitUndefined: true");
  expect(routeSource).toContain("className: undefined");
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).toContain('to="/sites/projectList"');
  expect(routeSource).toContain('to="/$ownerName/$projectName"');
  expect(routeSource).toContain("showLegacyProjectHeaderLinks");
  expect(routeSource).toContain("key={filter}");
  expect(routeSource).not.toContain("<a href={projectPath}");
  expect(routeSource).not.toContain("pjax-page");
});

async function expectReactPaginationLink(link: Locator, expected: { href: string; text: string }) {
  await expect(link).toHaveText(expected.text);
  await expect(link).toHaveAttribute("href", expected.href);
  expect(await link.getAttribute("pjax-page")).toBeNull();
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
        (this.matches('[data-owner="site-project-list-delete-action"]') ||
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

async function projectListDeleteModalStateMetrics(page: Page) {
  return page.evaluate(() => {
    const content = requireElement('[data-owner="site-project-list-setting-content-column"]');
    const title = requireElement('[data-owner="site-project-list-title-heading"]');
    const titleArea = requireElement('[data-owner="site-project-list-title-strip"]');
    const searchForm = requireElement('[data-owner="site-project-list-search"]');
    const firstRow = requireElement('[data-owner="site-project-list-row"]');
    const projectName = requireElement('[data-owner="site-project-list-project-name"]');
    const createdColumn = requireElement('[data-owner="site-project-list-row-created-column"]');
    const deleteButton = requireElement('[data-owner="site-project-list-delete-action"]');
    const modal = requireElement("#alertDeletionWrap");
    const modalFooter = requireElement('[data-owner="site-project-list-delete-modal-footer"]');
    const yes = requireElement('[data-owner="site-project-list-delete-modal-confirm-action"]');
    const no = requireElement('[data-owner="site-project-list-delete-modal-cancel-action"]');
    const backdrop = document.querySelector<HTMLElement>(
      '[data-owner="site-project-list-delete-modal-backdrop"]',
    );

    const contentRect = content.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const titleAreaRect = titleArea.getBoundingClientRect();
    const searchFormRect = searchForm.getBoundingClientRect();
    const firstRowRect = firstRow.getBoundingClientRect();
    const projectNameRect = projectName.getBoundingClientRect();
    const createdColumnRect = createdColumn.getBoundingClientRect();
    const deleteButtonRect = deleteButton.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();
    const modalFooterRect = modalFooter.getBoundingClientRect();
    const yesRect = yes.getBoundingClientRect();
    const noRect = no.getBoundingClientRect();
    const backdropRect = backdrop?.getBoundingClientRect();
    const modalStyle = getComputedStyle(modal);

    return {
      closedModalHasStableOwner:
        modalStyle.display === "none" &&
        modal.getAttribute("data-owner") === "site-project-list-delete-modal",
      deleteButtonDoesNotOverlapProjectName: deleteButtonRect.left >= projectNameRect.right,
      deleteButtonAfterCreatedColumn: deleteButtonRect.left >= createdColumnRect.right,
      deleteButtonVerticallyOverlapsRow:
        deleteButtonRect.top < firstRowRect.bottom && deleteButtonRect.bottom > firstRowRect.top,
      deleteButtonInsideRow:
        deleteButtonRect.top >= firstRowRect.top &&
        deleteButtonRect.bottom <= firstRowRect.bottom &&
        deleteButtonRect.right <= firstRowRect.right,
      modalDoesNotOverlapProjectRow:
        modalStyle.display === "none" || modalRect.top >= firstRowRect.bottom,
      modalInsideContentColumn:
        modalStyle.display === "none" ||
        (modalRect.left >= contentRect.left &&
          modalRect.right <= contentRect.right + modalRect.width),
      openBackdropCoversContent:
        Boolean(backdropRect) &&
        backdropRect!.left <= contentRect.left &&
        backdropRect!.right >= contentRect.right &&
        backdropRect!.top <= contentRect.top,
      openModalCentered:
        modalStyle.display !== "none" &&
        Math.abs(modalRect.left + modalRect.width / 2 - window.innerWidth / 2) <= 2,
      openModalFooterButtonsAligned:
        Math.abs(yesRect.top - noRect.top) <= 1 &&
        Math.abs(yesRect.bottom - noRect.bottom) <= 1 &&
        yesRect.top >= modalFooterRect.top &&
        noRect.bottom <= modalFooterRect.bottom,
      searchDoesNotOverlapTitle: searchFormRect.left >= titleRect.right,
      searchInsideTitleArea:
        searchFormRect.top >= titleAreaRect.top &&
        searchFormRect.bottom <= titleAreaRect.bottom &&
        searchFormRect.right <= titleAreaRect.right,
      yesBeforeNo: yesRect.right <= noRect.left,
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

async function mockSiteAdminSession(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
    };
  }, process.env.YONA_DEV_BASE_PATH ?? "/yona");
  const sessionBody = {
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
  };
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify(sessionBody),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify(sessionBody),
    });
  });
}

async function mockProjects(
  page: Page,
  overrides: Partial<{
    createdAt: string;
    deleteDelayMs: number;
    ownerName: string;
    overview: string;
    projectLogoUrl: string;
    projectName: string;
  }> = {},
) {
  const requests = {
    deletedProjectIds: [] as string[],
    deleteRequests: [] as Array<{ hasCsrfHeader: boolean; method: string; pathname: string }>,
  };
  const projects = [
    {
      createdAt: overrides.createdAt ?? "2026-06-29",
      id: 77,
      ownerName: overrides.ownerName ?? "acme",
      overview: overrides.overview ?? "Release planning",
      projectLogoUrl: overrides.projectLogoUrl ?? "/assets/images/default-project-logo.png",
      projectName: overrides.projectName ?? "roadmap",
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
      const url = new URL(route.request().url());
      const deletedProjectId = new URL(route.request().url()).pathname.split("/").pop() ?? "";
      requests.deleteRequests.push({
        hasCsrfHeader: Boolean(route.request().headers()["x-csrf-token"]),
        method: route.request().method(),
        pathname: url.pathname,
      });
      requests.deletedProjectIds.push(deletedProjectId);
      const deletedIndex = projects.findIndex((project) => String(project.id) === deletedProjectId);
      if (deletedIndex >= 0) {
        projects.splice(deletedIndex, 1);
      }
      total = 0;
      totalPages = 0;
    }
    if (overrides.deleteDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, overrides.deleteDelayMs));
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
  return page.locator('[data-owner="site-project-list-sidebar-link"]').evaluateAll((links) =>
    links.flatMap((link) => {
      const label = link.textContent?.trim() ?? "";
      const leakedClassTokens = Array.from(link.classList)
        .filter((token) => !token.startsWith("x") && !token.includes("__styles."))
        .map((token) => `${label}:class:${token}`);
      const leakedStateAttributes = ["aria-current", "data-status"]
        .filter((name) => link.hasAttribute(name))
        .map((name) => `${label}:${name}`);
      return [...leakedClassTokens, ...leakedStateAttributes];
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
        '.unsupported, [data-owner=global-gnb-outer], [data-owner="site-project-list-breadcrumb-outer"], [data-owner="site-project-list-page-wrap-outer"], [data-owner=site-footer]',
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      const owner = current.getAttribute("data-owner");
      const canonicalLayoutClass = new Map<string, string>([
        ["site-project-list-page-wrap-outer", "page-wrap-outer"],
        ["site-project-list-setting-wrap", "site-setting-wrap"],
        ["site-project-list-setting-grid", "row-fluid"],
        ["site-project-list-setting-sidebar-column", "span2"],
        ["site-project-list-setting-content-column", "span10"],
        ["site-project-list-sidebar-nav", "site-setting-nav"],
        [
          "site-project-list-sidebar-item",
          current.getAttribute("data-selected") === "true" ? "active" : "",
        ],
        ["site-project-list-sidebar-link", ""],
        ["site-project-list-listhead", "row-fluid listhead"],
        ["site-project-list-listhead-name-column", "span5 listhead-title"],
        ["site-project-list-listhead-description-column", "span4 listhead-title"],
        ["site-project-list-listhead-created-column", "span2 listhead-title"],
        ["site-project-list-listhead-action-column", "span1 listhead-title"],
        ["site-project-list-row-name-column", "span5 listitem-col"],
        ["site-project-list-row-description-column", "span4 listitem-col"],
        ["site-project-list-row-created-column", "span2 listitem-col"],
        ["site-project-list-row-action-column", "span1 listitem-col"],
      ]).get(owner ?? "");
      if (name === "class" && canonicalLayoutClass !== undefined) {
        return canonicalLayoutClass;
      }
      if (
        name === "class" &&
        (current.matches(".site-breadcrumb-outer, .site-breadcrumb-inner") ||
          (current.getAttribute("data-owner") ?? "").startsWith("site-project-list-breadcrumb-"))
      ) {
        return (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter(
            (token) =>
              !token.startsWith("x") &&
              !token.includes("__styles.") &&
              token !== "site-breadcrumb-outer" &&
              token !== "site-breadcrumb-inner",
          )
          .join(" ");
      }
      if (
        name === "class" &&
        (current.matches('[data-owner="global-gnb-inner"]') ||
          current.matches('[data-owner="global-gnb-outer"]') ||
          current.matches('[data-owner="site-footer"]') ||
          current.matches('[data-owner="site-footer-inner"]') ||
          current.matches('[data-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      const value = current.getAttribute(name) ?? "";
      if (
        name === "class" &&
        new Set(["site-project-list-title-strip", "site-project-list-title-heading"]).has(
          current.getAttribute("data-owner") ?? "",
        )
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => !token.startsWith("x") && !token.includes("__styles."))
          .join(" ");
      }
      if (
        name === "class" &&
        value.split(/\s+/u).includes("gnb-nav") &&
        current.matches('[data-owner="global-gnb-nav"]')
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
      }
      if (name === "class") {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return value;
    }

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
        "data-owner",
        "role",
      ];
      const residualOwner = current.getAttribute("data-owner");
      const isResidualOwner =
        residualOwner === "site-project-list-container" ||
        residualOwner === "site-project-list-row" ||
        residualOwner === "site-project-list-row-avatar" ||
        residualOwner === "site-project-list-row-avatar-image" ||
        residualOwner === "site-project-list-project-name" ||
        residualOwner === "site-project-list-delete-action" ||
        residualOwner === "site-project-list-delete-modal" ||
        residualOwner === "site-project-list-delete-modal-header" ||
        residualOwner === "site-project-list-delete-modal-close" ||
        residualOwner === "site-project-list-delete-modal-body" ||
        residualOwner === "site-project-list-delete-modal-footer" ||
        residualOwner === "site-project-list-delete-modal-backdrop" ||
        residualOwner === "site-project-list-delete-modal-confirm-action" ||
        residualOwner === "site-project-list-delete-modal-cancel-action";
      const attrs = stableAttributes
        .filter(
          (name) =>
            current.hasAttribute(name) &&
            !(name === "class" && isResidualOwner) &&
            !(
              name === "class" &&
              (residualOwner === "site-project-list-sidebar-link" ||
                (residualOwner === "site-project-list-sidebar-item" &&
                  current.getAttribute("data-selected") !== "true"))
            ) &&
            !(name === "class" && normalizeSiteLayoutGnbNavAttribute(current, name) === "") &&
            !(name === "data-owner" && !isResidualOwner),
        )
        .map(
          (name) => `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
        )
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
        '.unsupported, [data-owner=global-gnb-outer], [data-owner="site-project-list-breadcrumb-outer"], [data-owner="site-project-list-page-wrap-outer"], [data-owner=site-footer]',
      ),
      (element) =>
        element.getAttribute("data-owner") === "global-gnb-outer"
          ? "gnb-outer"
          : element.getAttribute("data-owner") === "site-project-list-breadcrumb-outer"
            ? "site-breadcrumb-outer"
            : element.getAttribute("data-owner") === "site-project-list-page-wrap-outer"
              ? "page-wrap-outer"
              : element.getAttribute("data-owner") === "site-footer" &&
                  !element.classList.contains("page-footer-outer")
                ? "site-footer"
                : element.getAttribute("class"),
    ),
  );
}

async function projectListMetrics(page: Page) {
  return page.evaluate(() => {
    const titleArea = requireElement('[data-owner="site-project-list-title-strip"]');
    const title = requireElement('[data-owner="site-project-list-title-heading"]');
    const searchForm = requireElement('[data-owner="site-project-list-search"]');
    const filterInput = requireElement(
      '[data-owner="site-project-list-search-textbox"][name="filter"]',
    );
    const row = requireElement('[data-owner="site-project-list-setting-grid"]');
    const sidebar = requireElement('[data-owner="site-project-list-setting-sidebar-column"]');
    const content = requireElement('[data-owner="site-project-list-setting-content-column"]');
    const listHead = requireElement('[data-owner="site-project-list-listhead"]');
    const firstHeaderColumn = requireElement(
      '[data-owner="site-project-list-listhead-name-column"]',
    );
    const firstRowColumn = requireElement('[data-owner="site-project-list-row-name-column"]');
    const firstRow = requireElement('[data-owner="site-project-list-row"]');
    const avatarWrap = requireElement('[data-owner="site-project-list-row-avatar"]');
    const avatar = requireElement('[data-owner="site-project-list-row-avatar-image"]');
    const projectName = requireElement('[data-owner="site-project-list-project-name"]');
    const deleteButton = requireElement('[data-owner="site-project-list-delete-action"]');
    const pagination = requireElement("#pagination");
    const modal = requireElement("#alertDeletionWrap");
    const modalYes = requireElement('[data-owner="site-project-list-delete-modal-confirm-action"]');
    const modalNo = requireElement('[data-owner="site-project-list-delete-modal-cancel-action"]');
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
    const navbar = requireElement("[data-owner=global-gnb-outer]");
    const feedback = requireElement(
      '[data-owner="global-gnb-nav"] a[href="https://github.com/yona-projects/yona/issues"]',
    );
    const searchBox = requireElement('[data-owner="global-gnb-search-box"]');
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

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      if (
        name === "class" &&
        (current.matches(".site-breadcrumb-outer, .site-breadcrumb-inner") ||
          (current.getAttribute("data-owner") ?? "").startsWith("site-project-list-breadcrumb-"))
      ) {
        return (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter(
            (token) =>
              !token.startsWith("x") &&
              token !== "site-breadcrumb-outer" &&
              token !== "site-breadcrumb-inner",
          )
          .join(" ");
      }
      let value = current.getAttribute(name) ?? "";
      if (name === "class") {
        const retiredTitleToken = current.matches(
          ".site-setting-wrap > .row-fluid > .span10 > div.title_area",
        )
          ? "title_area"
          : current.matches(
                ".site-setting-wrap > .row-fluid > .span10 > div.title_area > h2.pull-left",
              )
            ? "pull-left"
            : null;
        value = value
          .split(/\s+/u)
          .filter((token) => token !== retiredTitleToken)
          .join(" ");
      }
      const isSiteLayoutHeader =
        name === "class" &&
        value.split(/\s+/u).includes("gnb-outer") &&
        current.matches("header.gnb-outer") &&
        current.querySelector(':scope > div.gnb-inner form[name="gnb-search-form"]') !== null;
      const isSiteLayoutFooterOuter =
        name === "class" &&
        value.split(/\s+/u).includes("page-footer-outer") &&
        current.matches("footer.page-footer-outer") &&
        current.querySelector(":scope > div.page-footer > span.provider") !== null;
      const isSiteLayoutFooterInner =
        name === "class" &&
        value.split(/\s+/u).includes("page-footer") &&
        current.matches("footer.page-footer-outer > div.page-footer") &&
        current.querySelector(":scope > span.provider") !== null;
      const isSiteLayoutFooterProvider =
        name === "class" &&
        value.split(/\s+/u).includes("provider") &&
        current.matches("footer.page-footer-outer > div.page-footer > span.provider");
      const retiredToken = isSiteLayoutFooterOuter
        ? "page-footer-outer"
        : isSiteLayoutFooterInner
          ? "page-footer"
          : isSiteLayoutFooterProvider
            ? "provider"
            : isSiteLayoutHeader && value.split(/\s+/u).includes("project-header")
              ? "project-header"
              : isSiteLayoutHeader
                ? "gnb-outer"
                : name === "class" &&
                    value.split(/\s+/u).includes("gnb-inner") &&
                    current.matches("header.gnb-outer > div.gnb-inner") &&
                    current.querySelector('form[name="gnb-search-form"]') !== null
                  ? "gnb-inner"
                  : name === "class" &&
                      value.split(/\s+/u).includes("gnb-nav") &&
                      current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                      current.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-nav"
                    : null;
      if (retiredToken) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== retiredToken)
          .join(" ");
      }
      return value;
    }

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
        "data-owner",
        "role",
      ];
      const residualOwner = current.getAttribute("data-owner");
      const isResidualOwner =
        residualOwner === "site-project-list-container" ||
        residualOwner === "site-project-list-row" ||
        residualOwner === "site-project-list-row-avatar" ||
        residualOwner === "site-project-list-row-avatar-image" ||
        residualOwner === "site-project-list-project-name" ||
        residualOwner === "site-project-list-delete-action" ||
        residualOwner === "site-project-list-delete-modal" ||
        residualOwner === "site-project-list-delete-modal-header" ||
        residualOwner === "site-project-list-delete-modal-close" ||
        residualOwner === "site-project-list-delete-modal-body" ||
        residualOwner === "site-project-list-delete-modal-footer" ||
        residualOwner === "site-project-list-delete-modal-backdrop" ||
        residualOwner === "site-project-list-delete-modal-confirm-action" ||
        residualOwner === "site-project-list-delete-modal-cancel-action";
      const attrs = stableAttributes
        .filter(
          (name) =>
            current.hasAttribute(name) &&
            !(name === "class" && isResidualOwner) &&
            !(name === "class" && normalizeSiteLayoutGnbNavAttribute(current, name) === "") &&
            !(name === "data-owner" && !isResidualOwner),
        )
        .map(
          (name) => `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
        )
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
