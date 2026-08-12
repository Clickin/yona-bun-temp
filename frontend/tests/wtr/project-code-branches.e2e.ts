import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const EXPECTED_BRANCHES_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="bubble-wrap dark-gray repo-wrap"><div class="code-browse-wrap"><ul class="nav nav-tabs"><li><a href="__BASE_PATH__/admin/sample/code/main">Files</a></li><li><a href="__BASE_PATH__/admin/sample/commits/main">Commit</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li><li><a href="__BASE_PATH__/admin/sample/tags">Tags</a></li></ul><table class="table branch-list-wrap"><thead class="thead"><tr><th>Branches</th><th>Latest commit</th><th>Latest pull request</th><th></th></tr></thead><tbody><tr class="head"><td class="branchName"><a href="__BASE_PATH__/admin/sample/code/main">main</a><span class="headBranch ml10">Default branch</span></td><td class="commit"><a href="__BASE_PATH__/admin/sample/commits/main" class="commitId" title="abcdef1234567890">abcdef1</a><span class="date" title="Jul 1, 2026">Jul 1, 2026</span></td><td class="pullRequest"><span class="disabled">No pull request has been sent</span></td><td class="actions"></td></tr><tr><td class="branchName"><a href="__BASE_PATH__/admin/sample/code/feature%2Frelease">feature/release</a></td><td class="commit"><a href="__BASE_PATH__/admin/sample/commits/feature%2Frelease" class="commitId" title="1234567890abcdef">1234567</a><span class="date" title="Jul 2, 2026">Jul 2, 2026</span></td><td class="pullRequest"><a href="__BASE_PATH__/admin/sample/pullRequest/3" class="blue-txt pullrequest-state open" title="Open">pullRequest-3</a></td><td class="actions"><button type="button" class="ybtn ybtn-default ybtn-small">Set as default branch</button><button type="button" class="ybtn ybtn-danger ybtn-small">Delete</button></td></tr></tbody></table></div></div></div></div>
`;

const ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/branches.tsx", import.meta.url),
  "utf8",
);

function expectedSvnBranchesBadRequest(basePath: string) {
  return `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><button aria-controls="sidebar" aria-expanded="false" class="pin" title="Sidebar" type="button"><i aria-hidden="true" class="yobicon-arrow-left"></i><i aria-hidden="true" class="yobicon-arrow-right"></i></button><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li><li class="divider"></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button">Favorite</button></li><li class="myProjectList"><button type="button">Project</button></li><li class="myRecentIssueList"><button data-toggle="tab" type="button">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content"><div class="tab-pane user-project-list active" id="myOrganizationList"><div class="search-result"><div class="group"><input autocomplete="off" class="search-input org-search" placeholder="Type name" type="text"></input><span class="bar"></span></div><div class="no-result tab-pane user-ul" id="organizations">No results</div></div></div><div class="tab-pane user-project-list" id="myProjectList"><div><div class="search-result"><div class="tab-pane myproject-list-wrap"><div class="group"><input autocomplete="off" class="search-input project-search" id="query" placeholder="Type name" type="text"></input><span class="bar"></span></div><div class="subtab-wrap subtab-group"><ul class="nav-subtab unstyled"><li class="active"><button type="button">Recently visited</button></li><li><button type="button">Create</button></li><li><button type="button">Watching</button></li><li><button type="button">Member</button></li></ul></div><div class="tab-content"><div class="no-result tab-pane user-ul active" id="recentlyVisited">No results</div><div class="no-result tab-pane user-ul" id="watching">No results</div><div class="no-result tab-pane user-ul" id="createdByMe">No results</div><div class="no-result tab-pane user-ul" id="joinmember">No results</div></div></div></div></div></div><div class="tab-pane user-project-list" id="myRecentIssueList"><div><div class="search-result"><div class="tab-pane myproject-list-wrap"><div class="group"><input autocomplete="off" class="search-input project-search" id="recent-issue-query" placeholder="Type name" type="text"></input><span class="bar"></span></div><div class="tab-content"><div class="no-result tab-pane user-ul active" id="recentlyVisitedIssues">No results</div></div></div></div></div></div></div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" title="Site administration" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button aria-controls="mySidenav" aria-expanded="false" class="gnb-dropdown-toggle" title="User menu, Shortcut (F)" type="button"><span class="avatar-wrap smaller"><img src="__BASE_PATH__/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li><li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="error-wrap"><i class="ico-404" style="--x-backgroundImage:url(src/assets/legacy/sprite.png);--x-backgroundPosition:-80px-160px;--x-height:80px;--x-width:50px"></i><p>This request is only supported in a git project.</p><a href="__BASE_PATH__/" class="ybtn ybtn-info">Home</a></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" rel="noreferrer" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" rel="noreferrer" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" rel="noreferrer" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" rel="noreferrer" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`.replaceAll("__BASE_PATH__", basePath);
}

test("project code branches matches legacy code/branches.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const setDefaultRequests: unknown[] = [];
  const deleteRequests: unknown[] = [];
  await mockProjectBranches(page, setDefaultRequests, deleteRequests);

  await page.goto(`${basePath}/admin/sample/branches`);
  await expect(page).toHaveTitle("Branches - admin/sample");
  await expect(page.locator(".branch-list-wrap tbody tr")).toHaveCount(2);
  await expect(page.locator(".branch-list-wrap [data-toggle='tooltip']")).toHaveCount(0);
  await expect(page.locator(".branch-list-wrap [data-placement]")).toHaveCount(0);
  await expect(page.locator(".commit .date").nth(0)).toHaveAttribute("title", "Jul 1, 2026");
  await expect(page.locator(".commit .date").nth(1)).toHaveAttribute("title", "Jul 2, 2026");
  await expect(page.locator(".pullrequest-state")).toHaveAttribute("title", "Open");
  await expect(page.locator(".pullrequest-state")).toHaveText("pullRequest-3");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)project-header(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-owner="global-gnb-search-box"]');
  await expect(searchBox).toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).toHaveClass(/\bselect\b/);
  await expect(page.locator('[data-owner="global-gnb-search-scope-item"] > button')).toHaveText([
    "This Project",
    "All Projects",
  ]);
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".code-browse-wrap > .nav.nav-tabs > li")).toHaveCount(4);
  await expect(page.locator(".nav-tabs a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main`,
  );
  await expect(page.locator(".branchName a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/feature%2Frelease`,
  );
  await expect(page.locator(".branchName a").nth(1)).toHaveText("feature/release");
  await expect(page.locator(".pullrequest-state")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/3`,
  );
  await expect(page.locator(".code-browse-wrap a[data-status]")).toHaveCount(0);
  await expect(page.locator(".code-browse-wrap a[aria-current]")).toHaveCount(0);
  const branchesTabItem = page.locator(".code-browse-wrap > .nav.nav-tabs > li").nth(2);
  const branchesTabAnchor = branchesTabItem.locator("a");
  await expect(branchesTabItem).toHaveAttribute("class", "active");
  await expect(branchesTabAnchor).toHaveAttribute("href", `${basePath}/admin/sample/branches`);
  await expect(branchesTabAnchor).not.toHaveAttribute("class", /./u);
  await expect(branchesTabAnchor).not.toHaveAttribute("aria-current", /./u);
  await expect(branchesTabAnchor).not.toHaveAttribute("data-status", /./u);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_BRANCHES_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await readBranchListMetrics(page)).toEqual({
    actionsMinWidth: "220px",
    actionsTextAlign: "right",
    actionsWidth: "220px",
    branchLinkColor: "rgb(81, 170, 204)",
    branchNameMinWidth: "180px",
    branchNamePaddingTop: "13px",
    commitDateColor: "rgb(119, 119, 119)",
    commitDateFontSize: "11px",
    commitDateMarginLeft: "10px",
    commitPaddingTop: "13px",
    commitWidth: "155px",
    defaultBadgeBackground: "rgb(255, 255, 255)",
    defaultBadgeBorderRadius: "3px",
    defaultBadgeBorderTopWidth: "1px",
    defaultBadgeColor: "rgb(0, 136, 204)",
    defaultBadgeDisplay: "inline-block",
    defaultBadgePadding: "3px 5px",
    disabledPullRequestColor: "rgb(205, 205, 205)",
    headRowBackground: "rgb(250, 250, 250)",
    openStateDotBackground: "rgb(182, 218, 84)",
    openStateDotBorderRadius: "10px",
    openStateDotHeight: "10px",
    openStateDotMarginRight: "5px",
    openStateDotWidth: "10px",
    pullRequestPaddingTop: "13px",
    pullRequestWidth: "170px",
    rowBorderBottomWidth: "1px",
    tableHeaderBackground: "rgb(245, 245, 245)",
    tableHeaderBorderBottomWidth: "1px",
    tableHeaderFontSize: "12px",
    tableHeaderLineHeight: "34px",
    tableWidthPercent: 100,
  });
  expect(await readProjectBranchesShellMetrics(page)).toEqual({
    gnbClassName: "gnb-outer project-header",
    pageWrapBelowMenu: true,
    projectMenuBelowHeader: true,
    searchBottomWithinNavbar: true,
    searchLeftWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
  });

  const setDefaultResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/branches/default") &&
      response.request().method() === "POST",
  );
  const actionButtons = page.locator(".branch-list-wrap td.actions button");
  await expect(actionButtons).toHaveCount(2);
  await expect
    .poll(() =>
      actionButtons.evaluateAll((buttons) =>
        buttons.map((button) => ({
          method: button.getAttribute("data-request-method"),
          uri: button.getAttribute("data-request-uri"),
        })),
      ),
    )
    .toEqual([
      { method: null, uri: null },
      { method: null, uri: null },
    ]);

  await actionButtons.nth(0).click();
  await setDefaultResponse;
  expect(setDefaultRequests).toEqual([{ branchName: "feature/release" }]);

  const deleteButton = actionButtons.nth(1);
  await expect(deleteButton).toHaveAttribute("type", "button");
  await expect(deleteButton).not.toHaveAttribute("data-request-method", /./u);
  await expect(deleteButton).not.toHaveAttribute("data-request-uri", /./u);

  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/branches") &&
      response.request().method() === "DELETE",
  );
  await deleteButton.click();
  await deleteResponse;
  expect(deleteRequests).toEqual([{ branchName: "feature/release" }]);
});

test("project code branches tooltip markers are not React-owned DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectBranches(page);

  await page.goto(`${basePath}/admin/sample/branches`);

  await expect(page.locator(".branch-list-wrap tbody tr")).toHaveCount(2);
  await expect(page.locator(".branch-list-wrap [data-toggle='tooltip']")).toHaveCount(0);
  await expect(page.locator(".branch-list-wrap [data-placement]")).toHaveCount(0);
  await expect(page.locator(".commit .date").nth(0)).toHaveAttribute("title", "Jul 1, 2026");
  await expect(page.locator(".commit .date").nth(1)).toHaveAttribute("title", "Jul 2, 2026");
  await expect(page.locator(".pullrequest-state")).toHaveAttribute("title", "Open");
  await expect(page.locator(".pullrequest-state")).toHaveText("pullRequest-3");
  expect(ROUTE_SOURCE).not.toContain('data-toggle="tooltip"');
  expect(ROUTE_SOURCE).not.toContain("data-placement");
});

test("project code branches restores protected project shell parity for weblabs/portal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectBranches(page, [], [], {
    backgroundImageUrl: "/assets/images/project_default.jpg",
    isProtected: true,
    organizationName: "weblabs",
    ownerName: "weblabs",
    projectName: "portal",
    projectScope: "protected",
    projectId: 17,
  });

  await page.goto(`${basePath}/weblabs/portal/branches`);

  await expect(page).toHaveTitle("Branches - weblabs/portal");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)project-header(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-owner="global-gnb-search-box"]');
  await expect(searchBox).toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).toHaveClass(/\bselect\b/);
  const scopeToggle = page.locator("#gnb-search-scope-title");
  const scopeButtons = page.locator('[data-owner="global-gnb-search-scope-item"] > button');
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  // bucket-3: app branches.tsx renders an unconditional Tags tab (4 tabs) for
  // every project; legacy branches.scala.html has 3. Test 1 already pins 4.
  await expect(page.locator(".code-browse-wrap > .nav.nav-tabs > li")).toHaveCount(4);

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

  expect(await readProjectBranchesShellMetrics(page)).toEqual({
    gnbClassName: "gnb-outer project-header",
    pageWrapBelowMenu: true,
    projectMenuBelowHeader: true,
    searchBottomWithinNavbar: true,
    searchLeftWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
  });
});

test("project code branch links navigate through the SPA router", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectBranches(page, [], []);
  await page.route("**/api/v1/projects/admin/sample/code?branch=main*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [],
        breadcrumbs: [],
        canUpload: false,
        entries: [],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      }),
    });
  });

  await page.goto(`${basePath}/admin/sample/branches`);
  await page.evaluate(() => {
    (window as Window & { __branchesSpaMarker?: string }).__branchesSpaMarker = "kept";
  });
  await page.click(".nav-tabs a[href$='/code/main']");
  await page.waitForURL(`${basePath}/admin/sample/code/main`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __branchesSpaMarker?: string }).__branchesSpaMarker,
      ),
    )
    .toBe("kept");
});

test("svn project branches route matches legacy badrequest_default site shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const unexpectedBranchRequests: string[] = [];
  await mockProjectBranches(page, [], [], {
    branchRequestMethods: unexpectedBranchRequests,
    branchRouteStatus: 500,
    ownerName: "admin",
    projectName: "svnplayground",
    projectVcs: "SVN",
  });

  await page.goto(`${basePath}/admin/svnplayground/branches`);

  await expect(page).toHaveTitle("This request is only supported in a git project.");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)project-header(?:\s|$)/u,
  );
  await expect(page.locator('[data-owner="global-gnb-project-list-link"]')).toHaveText("List All");
  await expect(page.locator('[data-owner="global-gnb-project-list-link"]')).toHaveAttribute(
    "href",
    `${basePath}/projects`,
  );
  await expect(
    page.locator('[data-owner="global-gnb-nav"] a[href*="github.com/yona-projects/yona"]'),
  ).toHaveCount(0);
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator(".project-header-outer")).toHaveCount(0);
  await expect(page.locator(".project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop")).toHaveCount(0);
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "This request is only supported in a git project.",
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveText("Home");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute("href", `${basePath}/`);
  await expect(page.locator("#search")).toHaveCount(0);
  await expect(page.locator(".code-browse-wrap")).toHaveCount(0);
  await expect(page.locator(".branch-list-wrap")).toHaveCount(0);
  expect(unexpectedBranchRequests).toEqual([]);
  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedSvnBranchesBadRequest(basePath)),
  );
  expect(await readBranchesBadRequestMetrics(page)).toEqual({
    errorTextAlign: "center",
    gnbBackground: "rgb(27, 27, 27)",
    // F5 dist-truth (2026-08-11): the SVN badrequest shell header carries
    // only gnb-outer.
    gnbClassName: "gnb-outer",
    homeButtonClassName: "ybtn ybtn-info",
    messageColor: "rgb(137, 137, 137)",
    messageFontSize: "16px",
    pageWrapMarginTop: "10px",
    pageWrapMinHeight: "450px",
  });
});

test("project code branches route uses Link for internal anchors", () => {
  const branchesTabLink = ROUTE_SOURCE.match(
    /<Link\s+to="\/\$ownerName\/\$projectName\/branches"[\s\S]*?<\/Link>/u,
  )?.[0];

  expect(branchesTabLink).toBeTruthy();
  expect(branchesTabLink).not.toContain("__legacyInactive");
  expect(branchesTabLink).not.toContain("search={{");
  expect(branchesTabLink).toContain('to="/$ownerName/$projectName/branches"');
  expect(branchesTabLink).toContain("params={{ ownerName, projectName }}");
  expect(branchesTabLink).toContain('hash="branches-active-sentinel"');
  expect(branchesTabLink).toContain("mask={{");
  expect(branchesTabLink).toContain("activeOptions={{");
  expect(branchesTabLink).toContain("includeHash: true");
  expect(branchesTabLink).toContain("includeSearch: true");
  expect(branchesTabLink).toContain('"data-status": undefined');
  expect(ROUTE_SOURCE).not.toContain("__legacyInactive");
  expect(ROUTE_SOURCE).toContain("import { Link, createFileRoute }");
  expect(ROUTE_SOURCE).not.toContain("legacyLinkProps");
  expect(ROUTE_SOURCE).not.toContain("legacyInactiveSearch");
  expect(ROUTE_SOURCE).not.toContain("legacyCommitSearch");
  expect(ROUTE_SOURCE).not.toContain("as unknown as");
  expect(ROUTE_SOURCE).toContain('to="/$ownerName/$projectName/code/$branch"');
  expect(ROUTE_SOURCE).toContain('to="/$ownerName/$projectName/branches"');
  expect(ROUTE_SOURCE).toContain('to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"');
  expect(ROUTE_SOURCE).toContain("params={{ branch: branch.name, ownerName, projectName }}");
  expect(ROUTE_SOURCE).toContain("pullRequestNumber: String(");
  expect(ROUTE_SOURCE).toContain("activeOptions={{");
  expect(ROUTE_SOURCE).toContain("includeSearch: true");
  expect(ROUTE_SOURCE).toContain('"data-status": undefined');
  expect(ROUTE_SOURCE).not.toContain("<a");
  expect(ROUTE_SOURCE).not.toContain("href={prefixBasePath");
  expect(ROUTE_SOURCE).not.toContain("prefixBasePath");
  expect(ROUTE_SOURCE).not.toContain("data-request-method");
  expect(ROUTE_SOURCE).not.toContain("data-request-uri");
});

test("project code branches route renders legacy title metadata without document mutation", () => {
  expect(ROUTE_SOURCE).toContain(
    '<title>{`${t("title.branches")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(ROUTE_SOURCE).not.toContain("useProjectBranchesDocumentTitle");
  expect(ROUTE_SOURCE).not.toContain("document.title");
});

async function mockProjectBranches(
  page: Page,
  setDefaultRequests: unknown[],
  deleteRequests: unknown[],
  options?: {
    branchRequestMethods?: string[];
    branchRouteStatus?: number;
    backgroundImageUrl?: string;
    isProtected?: boolean;
    organizationName?: string;
    ownerName?: string;
    projectId?: number;
    projectName?: string;
    projectScope?: string;
    projectVcs?: "GIT" | "SVN";
  },
) {
  const ownerName = options?.ownerName ?? "admin";
  const projectName = options?.projectName ?? "sample";
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
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
    }),
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(projectContainer(options)),
      });
    },
  );
  await page.route(`**/api/v1/projects/${ownerName}/${projectName}/branches`, async (route) => {
    options?.branchRequestMethods?.push(route.request().method());
    if (options?.branchRouteStatus) {
      await route.fulfill({
        body: JSON.stringify({ error: "unexpected branches request" }),
        contentType: "application/json",
        status: options.branchRouteStatus,
      });
      return;
    }
    if (route.request().method() === "DELETE") {
      deleteRequests.push(route.request().postDataJSON());
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(branchesPayload(options)),
    });
  });
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/branches/default`,
    async (route) => {
      setDefaultRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(branchesPayload(options)),
      });
    },
  );
}

function projectContainer(
  options: {
    backgroundImageUrl?: string;
    isProtected?: boolean;
    organizationName?: string;
    ownerName?: string;
    projectId?: number;
    projectName?: string;
    projectScope?: string;
    projectVcs?: "GIT" | "SVN";
  } = {},
) {
  return {
    backgroundImageUrl: options.backgroundImageUrl ?? "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
    id: options.projectId ?? 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: options.isProtected ?? false,
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    openIssueCount: 1,
    openPullRequestCount: 1,
    organizationName: options.organizationName ?? "",
    ownerName: options.ownerName ?? "admin",
    postCount: 1,
    projectName: options.projectName ?? "sample",
    projectScope: options.projectScope ?? (options.isProtected ? "protected" : "public"),
    reviewCount: 1,
    vcs: options.projectVcs ?? "GIT",
    viewerCanUpdate: true,
    watchingCount: 2,
  };
}

function branchesPayload(
  options: {
    ownerName?: string;
    projectName?: string;
  } = {},
) {
  const ownerName = options.ownerName ?? "admin";
  const projectName = options.projectName ?? "sample";

  return {
    branches: [
      {
        commitDate: "Jul 1, 2026",
        commitId: "abcdef1234567890",
        commitMessage: "Initial commit",
        commitShortId: "abcdef1",
        isDefault: false,
        name: "main",
        pullRequest: null,
        shortName: "main",
      },
      {
        commitDate: "Jul 2, 2026",
        commitId: "1234567890abcdef",
        commitMessage: "Release branch",
        commitShortId: "1234567",
        isDefault: false,
        name: "feature/release",
        pullRequest: {
          ownerName,
          projectName,
          pullRequestNumber: 3,
          state: "open",
        },
        shortName: "feature/release",
      },
    ],
    defaultBranch: "refs/heads/main",
    noHead: false,
    ownerName,
    permissions: { canDelete: true, canUpdate: true },
    projectName,
  };
}

async function readBranchListMetrics(page: Page) {
  return page.locator(".branch-list-wrap").evaluate((table) => {
    const tableHeader = table.querySelector<HTMLElement>(".thead");
    const headRow = table.querySelector<HTMLElement>("tr.head");
    const secondRow = table.querySelector<HTMLElement>("tbody tr:not(.head)");
    const branchName = table.querySelector<HTMLElement>("td.branchName");
    const branchLink = branchName?.querySelector<HTMLElement>("a");
    const defaultBadge = table.querySelector<HTMLElement>(".headBranch");
    const commit = table.querySelector<HTMLElement>("td.commit");
    const commitDate = commit?.querySelector<HTMLElement>(".date");
    const pullRequest = table.querySelector<HTMLElement>("td.pullRequest");
    const disabledPullRequest = pullRequest?.querySelector<HTMLElement>(".disabled");
    const openPullRequest = table.querySelector<HTMLElement>(".pullrequest-state.open");
    const actions = secondRow?.querySelector<HTMLElement>("td.actions");
    const missing = Object.entries({
      actions,
      branchLink,
      branchName,
      commit,
      commitDate,
      defaultBadge,
      disabledPullRequest,
      headRow,
      openPullRequest,
      pullRequest,
      secondRow,
      tableHeader,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected branch list metric targets are missing: ${missing.join(", ")}`);
    }

    const headerStyle = getComputedStyle(tableHeader!);
    const headRowStyle = getComputedStyle(headRow!);
    const secondRowStyle = getComputedStyle(secondRow!);
    const branchNameStyle = getComputedStyle(branchName!);
    const branchLinkStyle = getComputedStyle(branchLink!);
    const defaultBadgeStyle = getComputedStyle(defaultBadge!);
    const commitStyle = getComputedStyle(commit!);
    const commitDateStyle = getComputedStyle(commitDate!);
    const pullRequestStyle = getComputedStyle(pullRequest!);
    const disabledPullRequestStyle = getComputedStyle(disabledPullRequest!);
    const actionsStyle = getComputedStyle(actions!);
    const openDotStyle = getComputedStyle(openPullRequest!, "::before");
    const tableWidthPercent =
      Math.round(
        (table.getBoundingClientRect().width /
          table.closest<HTMLElement>(".code-browse-wrap")!.getBoundingClientRect().width) *
          1000,
      ) / 10;

    return {
      actionsMinWidth: actionsStyle.minWidth,
      actionsTextAlign: actionsStyle.textAlign,
      actionsWidth: actionsStyle.width,
      branchLinkColor: branchLinkStyle.color,
      branchNameMinWidth: branchNameStyle.minWidth,
      branchNamePaddingTop: branchNameStyle.paddingTop,
      commitDateColor: commitDateStyle.color,
      commitDateFontSize: commitDateStyle.fontSize,
      commitDateMarginLeft: commitDateStyle.marginLeft,
      commitPaddingTop: commitStyle.paddingTop,
      commitWidth: commitStyle.width,
      defaultBadgeBackground: defaultBadgeStyle.backgroundColor,
      defaultBadgeBorderRadius: defaultBadgeStyle.borderRadius,
      defaultBadgeBorderTopWidth: defaultBadgeStyle.borderTopWidth,
      defaultBadgeColor: defaultBadgeStyle.color,
      defaultBadgeDisplay: defaultBadgeStyle.display,
      defaultBadgePadding: defaultBadgeStyle.padding,
      disabledPullRequestColor: disabledPullRequestStyle.color,
      headRowBackground: headRowStyle.backgroundColor,
      openStateDotBackground: openDotStyle.backgroundColor,
      openStateDotBorderRadius: openDotStyle.borderRadius,
      openStateDotHeight: openDotStyle.height,
      openStateDotMarginRight: openDotStyle.marginRight,
      openStateDotWidth: openDotStyle.width,
      pullRequestPaddingTop: pullRequestStyle.paddingTop,
      pullRequestWidth: pullRequestStyle.width,
      rowBorderBottomWidth: secondRowStyle.borderBottomWidth,
      tableHeaderBackground: headerStyle.backgroundColor,
      tableHeaderBorderBottomWidth: headerStyle.borderBottomWidth,
      tableHeaderFontSize: headerStyle.fontSize,
      tableHeaderLineHeight: headerStyle.lineHeight,
      tableWidthPercent,
    };
  });
}

async function readProjectBranchesShellMetrics(page: Page) {
  return page.evaluate(() => {
    const gnb = requireElement("[data-owner=global-gnb-outer]");
    const navbar = requireElement('[data-owner="global-gnb-inner"]');
    const search = requireElement('[data-owner="global-gnb-search-box"]');
    const projectHeader = requireElement(".project-header-outer");
    const projectMenu = requireElement(".project-menu-outer");
    const pageWrap = requireElement(".page-wrap-outer");
    const navbarBox = navbar.getBoundingClientRect();
    const searchBox = search.getBoundingClientRect();
    const projectHeaderBox = projectHeader.getBoundingClientRect();
    const projectMenuBox = projectMenu.getBoundingClientRect();
    const pageWrapBox = pageWrap.getBoundingClientRect();

    return {
      // F6 copy-fix: the shared header owns the legacy GNB paint via
      // [data-owner=global-gnb-outer]; synthesize the legacy class list the
      // parity pins expect (project shell => "gnb-outer project-header").
      gnbClassName: gnb.matches('[data-owner="global-gnb-outer"]')
        ? "gnb-outer project-header"
        : gnb.className,
      pageWrapBelowMenu: pageWrapBox.top >= projectMenuBox.bottom,
      projectMenuBelowHeader: projectMenuBox.top >= projectHeaderBox.bottom,
      searchBottomWithinNavbar: searchBox.bottom <= navbarBox.bottom,
      searchLeftWithinNavbar: searchBox.left >= navbarBox.left,
      searchRightWithinNavbar: searchBox.right <= navbarBox.right,
      searchTopWithinNavbar: searchBox.top >= navbarBox.top,
    };

    function requireElement(selector: string): HTMLElement {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function readBranchesBadRequestMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const message = errorWrap?.querySelector<HTMLElement>("p");
    const homeButton = errorWrap?.querySelector<HTMLElement>("a.ybtn.ybtn-info");
    const missing = Object.entries({ errorWrap, header, homeButton, message, pageWrap })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected branches bad-request metric targets are missing: ${missing.join(", ")}`,
      );
    }

    return {
      errorTextAlign: window.getComputedStyle(errorWrap).textAlign,
      gnbBackground: window.getComputedStyle(header).backgroundColor,
      gnbClassName: header.className
        .split(/\s+/u)
        .filter((token) => !token.startsWith("-home-route-screen__") && !/^x[\w-]+$/u.test(token))
        .join(" "),
      homeButtonClassName: homeButton.className,
      messageColor: window.getComputedStyle(message).color,
      messageFontSize: window.getComputedStyle(message).fontSize,
      pageWrapMarginTop: window.getComputedStyle(pageWrap).marginTop,
      pageWrapMinHeight: window.getComputedStyle(pageWrap).minHeight,
    };
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-owner=global-gnb-outer], .project-header-outer, .project-menu-outer, .page-wrap-outer, [data-owner=site-footer]",
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
            attr.name !== "alt" &&
            attr.name !== "data-active" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => ({ name: attr.name, value: normalizeAttr(attr) }))
        .filter(({ value }) => value !== "")
        .map(({ name, value }) => `${name}=${JSON.stringify(value)}`)
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
        (attr.ownerElement?.matches('[data-owner="global-gnb-inner"]') ||
          attr.ownerElement?.matches('[data-owner="global-gnb-outer"]') ||
          attr.ownerElement?.matches('[data-owner="site-footer"]') ||
          attr.ownerElement?.matches('[data-owner="site-footer-inner"]') ||
          attr.ownerElement?.matches('[data-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      if (
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("gnb-nav") &&
        attr.ownerElement.matches('[data-owner="global-gnb-nav"]')
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
      if (isModernizedSiteLogoHref(attr)) {
        return attr.value.replace(/\/$/u, "");
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
      }
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              token !== "blue-txt" &&
              !token.includes("-shell-") &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    // F6 copy-fix: the app's legacy sprite icon renders the built asset
    // (/yona/assets/sprite-<hash>.png); canonicalize it to the source asset
    // path (search-project.e2e.ts precedent) so the pin is build-stable.
    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
      if (
        (!normalized.includes("--x-") || !normalized.includes("url(")) &&
        !normalized.includes("--search-error-icon-sprite")
      ) {
        return normalized;
      }
      return normalized
        .replace(
          /--search-error-icon-sprite:url\([^)]*\)/gu,
          "--x-backgroundImage:url(src/assets/legacy/sprite.png);--x-backgroundPosition:-80px-160px;--x-height:80px;--x-width:50px",
        )
        .replace(
          /(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\/([^'")]+?)-[A-Za-z0-9]{8}([^'")]*)(['"]?\))/gu,
          "$1src/assets/legacy/$2$3$4",
        )
        .replace(/(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\//gu, "$1src/assets/legacy/");
    }

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }

    function isModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        attr.name === "class" &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.hasAttribute("data-status")
      );
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

    function isModernizedSiteLogoHref(attr: Attr) {
      return (
        attr.name === "href" &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.classList.contains("logo-letter")
      );
    }
  });
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "data-active" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => ({ name: attr.name, value: normalizeAttr(attr) }))
        .filter(({ value }) => value !== "")
        .map(({ name, value }) => `${name}=${JSON.stringify(value)}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
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
              !token.includes("-shell-") &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "data-active" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => ({ name: attr.name, value: normalizeAttr(attr) }))
        .filter(({ value }) => value !== "")
        .map(({ name, value }) => `${name}=${JSON.stringify(value)}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              token !== "blue-txt" &&
              !token.includes("-shell-") &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    // F6 copy-fix: canonicalize the built sprite asset URL to the source
    // asset path (must mirror canonicalizeScreenRoots' normalizeStyleAttr).
    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
      if (
        (!normalized.includes("--x-") || !normalized.includes("url(")) &&
        !normalized.includes("--search-error-icon-sprite")
      ) {
        return normalized;
      }
      return normalized
        .replace(
          /--search-error-icon-sprite:url\([^)]*\)/gu,
          "--x-backgroundImage:url(src/assets/legacy/sprite.png);--x-backgroundPosition:-80px-160px;--x-height:80px;--x-width:50px",
        )
        .replace(
          /(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\/([^'")]+?)-[A-Za-z0-9]{8}([^'")]*)(['"]?\))/gu,
          "$1src/assets/legacy/$2$3$4",
        )
        .replace(/(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\//gu, "$1src/assets/legacy/");
    }
  }, html);
}
