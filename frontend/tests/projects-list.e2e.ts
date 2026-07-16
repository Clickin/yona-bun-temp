import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const SITE_PROJECT_LIST_ROUTE_SOURCE = new URL(
  "../src/routes/sites/projectList.tsx",
  import.meta.url,
);

const EXPECTED_PROJECTS_LIST = `
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
      <li class="active"><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
      <li class="divider"></li>
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
          <span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span>
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
      <li class="gnb-usermenu-item">
        <a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" data-toggle="tooltip" title="Site administration" data-placement="bottom">
          <i class="yobicon-wrench"></i>
        </a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
        <button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)">
          <span class="avatar-wrap smaller"><img alt="" src="/assets/images/default-avatar-32.png"></span><span class="caret"></span>
        </button>
      </li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown">
          <i class="yobicon-plus"></i><span class="caret"></span>
        </button>
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
    <div class="title_area">
      <ul class="nav nav-tabs">
        <li class="active"><a href="__BASE_PATH__/projects">PUBLICProject list</a></li>
        <li><a href="__BASE_PATH__/orgs">Group List</a></li>
      </ul>
    </div>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="search-wrap">
      <div id="search" class="pull-left">
        <form action="__BASE_PATH__/projects" method="get">
          <div class="search-bar">
            <input name="filter" class="textbox" type="text" placeholder="Search by keyword" value="sample">
            <button type="submit" class="search-btn"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </div>
    </div>
    <ul class="all-projects">
      <li class="project">
        <div class="info-wrap">
          <div class="owner-avatar-wrap">
            <a href="__BASE_PATH__/admin/sample"><img src="/assets/images/project_default_logo.png" alt="sample"></a>
          </div>
          <div style="float:left">
            <div class="header">
              <a href="__BASE_PATH__/admin/sample" class="black">sample</a>
              <a href="__BASE_PATH__/projects?labelIds=8" class="project-label bug">bug</a>
            </div>
            <div class="desc">Sample project</div>
            <p class="name-tag">by<a href="__BASE_PATH__/admin?daysAgo=14&amp;selected=issues" class="owner-name-small">admin</a>at<strong title="2026-06-30">just now</strong><span class="small-font">, Latest code update<strong>just now</strong></span></p>
          </div>
        </div>
        <div class="stats-wrap pull-right">
          <div class="members">
            <ul class="unstyled">
              <li><a href="__BASE_PATH__/member1" class="avatar-wrap"><img src="/assets/images/default-avatar-32.png" alt="Member One"></a></li>
              <li><a href="__BASE_PATH__/member2" class="avatar-wrap"><img src="/assets/images/default-avatar-32.png" alt="Member Two"></a></li>
            </ul>
            <p><i class="yobicon-friends yobicon-middle"></i><strong>2</strong> <i class="yobicon-eye yobicon-middle"></i> <strong>3</strong></p>
          </div>
        </div>
      </li>
      <li class="project" style="background-color:rgb(252,252,252)">
        <div class="info-wrap" style="opacity:0.3">
          <div class="owner-avatar-wrap">
            <img src="__BASE_PATH__/assets/images/project_default_logo.png" alt="hidden">
          </div>
          <div style="float:left;color:gray">You do not have permission to view this project's information</div>
        </div>
      </li>
    </ul>
    <div id="pagination" class="page-navigation-wrap">
      <ul class="page-nums">
        <li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li>
        <li class="page-num"><input class="input-mini nospinner" max="1" min="1" name="pageNum" pattern="[0-9]*" type="number" value="1"></li>
        <li class="page-num delimiter">/</li>
        <li class="page-num">1</li>
        <li class="page-num ikon"><span class="off">Next page</span><i class="ico btn-pg-next off"></i></li>
      </ul>
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

test("projects list matches legacy project/list.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator(".all-projects .project").first()).toBeVisible();
  await expect(page).toHaveTitle("Project list");
  await expect
    .poll(() =>
      page
        .locator("head > title")
        .evaluateAll((titles) => titles.map((title) => title.textContent ?? "")),
    )
    .toContain("Project list");

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_PROJECTS_LIST.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);

  expect(await readProjectsListMetrics(page)).toEqual({
    avatarBorderRadius: "3px",
    avatarDisplay: "block",
    avatarFloat: "left",
    avatarHeight: "50px",
    avatarImageHeight: "36px",
    avatarImageVerticalAlign: "top",
    avatarImageWidth: "50px",
    avatarMarginRight: "10px",
    avatarWidth: "50px",
    descriptionColor: "rgb(186, 186, 186)",
    descriptionMarginLeft: "10px",
    headerFontSize: "20px",
    headerFontWeight: "700",
    headerMarginBottom: "5px",
    headerMarginLeft: "10px",
    listClear: "both",
    listMargin: "0px 0px 20px",
    listStyleType: "none",
    nameTagColor: "rgb(153, 153, 153)",
    nameTagFontSize: "11px",
    nameTagMarginLeft: "10px",
    rowBorderBottomColor: "rgb(220, 220, 220)",
    rowBorderBottomStyle: "solid",
    rowOverflow: "hidden",
    rowPadding: "15px 0px 10px",
    statsTextAlign: "right",
    statsWidth: "120px",
  });
});

test("projects list filter input keeps legacy initial focus without lowercase autofocus injection", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);
  const autofocusWarnings: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("Invalid DOM property") || text.includes("autofocus autoFocus")) {
      autofocusWarnings.push(text);
    }
  });

  await page.goto(`${basePath}/projects?filter=sample`);
  const filterInput = page.locator('#search input[name="filter"]');
  await expect(filterInput).toBeFocused();
  expect(autofocusWarnings).toEqual([]);
});

test("unreadable project rows match legacy private fallback", async ({ page }) => {
  await mockAuthenticatedProjects(page);

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/projects?filter=sample`);
  await expect(page.locator(".all-projects .project")).toHaveCount(2);

  const unreadableRow = page.locator(".all-projects > .project").nth(1);
  const unreadableInfo = unreadableRow.locator(".info-wrap");
  const unreadableLogo = unreadableRow.locator(".owner-avatar-wrap img");
  const unreadableText = unreadableRow.locator(".info-wrap > div").nth(1);

  await expect(unreadableRow).toHaveCSS("background-color", "rgb(252, 252, 252)");
  await expect(unreadableInfo).toHaveCSS("opacity", "0.3");
  await expect(unreadableLogo).toHaveAttribute(
    "src",
    `${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/assets/images/project_default_logo.png`,
  );
  await expect(unreadableLogo).toHaveAttribute("alt", "hidden");
  await expect(unreadableText).toHaveCSS("color", "rgb(128, 128, 128)");
  await expect(unreadableText).toHaveText(
    "You do not have permission to view this project's information",
  );
  await expect(unreadableRow.locator("a")).toHaveCount(0);
});

test("project directory top tabs keep legacy hrefs without active marker leakage", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator(".all-projects .project").first()).toBeVisible();

  const tabItems = page.locator('[data-stylex-owner="projects-directory-tabs-item"]');
  const projectTabItem = tabItems.nth(0);
  const organizationTabItem = tabItems.nth(1);
  const projectTabLink = projectTabItem.locator(
    ':scope > [data-stylex-owner="projects-directory-tabs-link"]',
  );
  const organizationTabLink = organizationTabItem.locator(
    ':scope > [data-stylex-owner="projects-directory-tabs-link"]',
  );
  const navbarProjectLink = page.locator('[data-stylex-owner="global-gnb-project-list-link"]');

  await expect(projectTabItem).toHaveAttribute("data-selected", "true");
  await expect(organizationTabItem).toHaveAttribute("data-selected", "false");
  await expect(projectTabLink).toHaveAttribute("href", `${basePath}/projects`);
  await expect(organizationTabLink).toHaveAttribute("href", `${basePath}/orgs`);
  await expect(projectTabLink).not.toHaveAttribute("class", /active/);
  await expect(projectTabLink).not.toHaveAttribute("data-status", /./);
  await expect(projectTabLink).not.toHaveAttribute("aria-current", /./);
  await expect(organizationTabLink).not.toHaveAttribute("class", /active/);
  await expect(organizationTabLink).not.toHaveAttribute("data-status", /./);
  await expect(organizationTabLink).not.toHaveAttribute("aria-current", /./);
  await expect(navbarProjectLink).toHaveAttribute("href", `${basePath}/projects`);
  await expect(navbarProjectLink).not.toHaveClass(/(?:^|\s)show-progress-bar(?:\s|$)/u);
  await expect(navbarProjectLink).not.toHaveAttribute("data-status");
  await expect(navbarProjectLink).not.toHaveAttribute("aria-current");
});

test("project directory card links keep legacy hrefs while using SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);
  await mockProjectCardDestinations(page);

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator(".all-projects .project").first()).toBeVisible();

  const projectLogoLink = page.locator(".all-projects .owner-avatar-wrap a");
  const projectNameLink = page.locator('[data-stylex-owner="projects-directory-title-link"]');
  const ownerNameLink = page.locator('[data-stylex-owner="projects-directory-owner-link"]');

  await expect(projectLogoLink).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectNameLink).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(ownerNameLink).toHaveAttribute(
    "href",
    `${basePath}/admin?daysAgo=14&selected=issues`,
  );
  await expect(projectNameLink).not.toHaveClass(/(?:^|\s)black(?:\s|$)/u);
  await expect(ownerNameLink).not.toHaveClass(/(?:^|\s)owner-name-small(?:\s|$)/u);
  await expectNoActiveMarker(projectLogoLink);
  await expectNoActiveMarker(projectNameLink);
  await expectNoActiveMarker(ownerNameLink);

  await page.evaluate(() => {
    (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker = "project";
  });
  await projectNameLink.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker,
      ),
    )
    .toBe("project");

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator(".all-projects .project").first()).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker = "owner";
  });
  await ownerNameLink.click();
  await expect(page).toHaveURL(`${basePath}/admin?daysAgo=14&selected=issues`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker,
      ),
    )
    .toBe("owner");
});

test("project directory labels keep legacy header links and query", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const projectRequests: Array<{ filter: string | null; labelIds: string | null }> = [];
  await mockAuthenticatedProjects(page, (requestUrl) => {
    const queryState = {
      filter: requestUrl.searchParams.get("filter"),
      labelIds: requestUrl.searchParams.get("labelIds"),
    };
    projectRequests.push(queryState);

    if (queryState.labelIds === "8") {
      return {
        items: [
          makeReadableProjectDirectoryItem({
            overview: "Bug-only project list",
            projectName: "sample-bug",
          }),
        ],
        pageNum: 1,
        totalPages: 1,
      };
    }

    return {
      items: [makeReadableProjectDirectoryItem(), makeUnreadableProjectDirectoryItem()],
      pageNum: 1,
      totalPages: 1,
    };
  });

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator(".all-projects .project").first()).toBeVisible();
  expect(projectRequests).toContainEqual({ filter: "sample", labelIds: null });

  const projectLabel = page.locator(".all-projects .header a.project-label");
  await expect(projectLabel).toHaveCount(1);
  await expect(projectLabel).toHaveClass("project-label bug");
  await expect(projectLabel).toHaveText("bug");
  await expect(projectLabel).toHaveAttribute("href", `${basePath}/projects?labelIds=8`);
  await expectNoActiveMarker(projectLabel);

  await page.evaluate(() => {
    (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker = "label";
  });
  await projectLabel.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/projects`);
  await expect.poll(() => new URL(page.url()).searchParams.get("labelIds")).toBe("8");
  await expect.poll(() => new URL(page.url()).searchParams.has("filter")).toBe(false);
  await expect(page.locator(".all-projects .project")).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="projects-directory-title-link"]')).toHaveText(
    "sample-bug",
  );
  expect(projectRequests).toContainEqual({ filter: null, labelIds: "8" });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker,
      ),
    )
    .toBe("label");
});

test("projects list applies filter, labelIds, and pageNum query state to API requests and results", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const projectRequests: Array<{
    filter: string | null;
    labelIds: string | null;
    pageNum: string | null;
  }> = [];
  await mockAuthenticatedProjects(page, (requestUrl) => {
    const queryState = {
      filter: requestUrl.searchParams.get("filter"),
      labelIds: requestUrl.searchParams.get("labelIds"),
      pageNum: requestUrl.searchParams.get("pageNum"),
    };
    projectRequests.push(queryState);

    if (
      queryState.filter === "sample" &&
      queryState.labelIds === "8" &&
      queryState.pageNum === "2"
    ) {
      return {
        items: [
          makeReadableProjectDirectoryItem({
            overview: "Legacy query page two",
            projectName: "sample-page-two",
          }),
        ],
        pageNum: 2,
        totalPages: 3,
      };
    }

    if (
      queryState.filter === "sample" &&
      queryState.labelIds === "8" &&
      queryState.pageNum === "1"
    ) {
      return {
        items: [
          makeReadableProjectDirectoryItem({
            overview: "Legacy query page one",
            projectName: "sample-page-one",
          }),
        ],
        pageNum: 1,
        totalPages: 3,
      };
    }

    return {
      items: [
        makeReadableProjectDirectoryItem({
          overview: "Plain query fallback",
          projectName: "unexpected-plain",
        }),
      ],
      pageNum: 1,
      totalPages: 1,
    };
  });

  await page.goto(`${basePath}/projects?filter=sample&labelIds=8&pageNum=2`);
  await expect(page.locator(".all-projects .project")).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="projects-directory-title-link"]')).toHaveText(
    "sample-page-two",
  );
  await expect(page.locator('[data-stylex-owner="projects-directory-description"]')).toHaveText(
    "Legacy query page two",
  );
  await expect(page.locator(".all-projects .header a.project-label")).toHaveText("bug");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("2");
  expect(projectRequests).toContainEqual({ filter: "sample", labelIds: "8", pageNum: "2" });

  const previousPageLink = page.locator("#pagination a", { hasText: "Previous page" });
  await previousPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  await expect(page.locator('[data-stylex-owner="projects-directory-title-link"]')).toHaveText(
    "sample-page-one",
  );
  await expect(page.locator('[data-stylex-owner="projects-directory-description"]')).toHaveText(
    "Legacy query page one",
  );
  expect(projectRequests).toContainEqual({ filter: "sample", labelIds: "8", pageNum: "1" });
});

test("projects list renders legacy pagination controls for multi-page project lists", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page, { pageNum: 1, totalPages: 3 });

  await page.goto(`${basePath}/projects?filter=sample&labelIds=8&pageNum=1`);
  await expect(page.locator(".all-projects .project").first()).toBeVisible();

  const pagination = page.locator('[data-stylex-owner="projects-directory-pagination"]');
  await expect(pagination).not.toHaveClass(/(?:^|\s)page-navigation-wrap(?:\s|$)/u);
  await expect(
    pagination.locator(':scope > [data-stylex-owner="projects-directory-pagination-list"]'),
  ).toHaveCount(1);
  const paginationItems = pagination.locator(
    '[data-stylex-owner="projects-directory-pagination-item"]',
  );
  await expect(paginationItems).toHaveCount(5);
  await expect(
    pagination.locator(
      '[data-stylex-owner="projects-directory-pagination-prev-icon"][data-disabled="true"]',
    ),
  ).toHaveCount(1);
  await expect(
    pagination.locator(
      '[data-stylex-owner="projects-directory-pagination-label"][data-disabled="true"]',
    ),
  ).toHaveText("Previous page");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "3");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
  await expect(paginationItems.nth(2)).toHaveText("/");
  await expect(paginationItems.nth(3)).toHaveText("3");

  const nextPageLink = pagination.locator("a", { hasText: "Next page" });
  await expectNoActiveMarker(nextPageLink);

  const nextHref = await nextPageLink.getAttribute("href");
  expect(nextHref).not.toBeNull();
  const nextUrl = new URL(nextHref ?? "", page.url());
  expect(nextUrl.pathname).toBe(`${basePath}/projects`);
  expect(nextUrl.searchParams.get("filter")).toBe("sample");
  expect(nextUrl.searchParams.get("labelIds")).toBe("8");
  expect(nextUrl.searchParams.get("pageNum")).toBe("2");

  await page.evaluate(() => {
    (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker =
      "pagination";
  });
  await nextPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker,
      ),
    )
    .toBe("pagination");

  const prevPageLink = pagination.locator("a", { hasText: "Previous page" });
  await expectNoActiveMarker(prevPageLink);

  const prevHref = await prevPageLink.getAttribute("href");
  expect(prevHref).not.toBeNull();
  const prevUrl = new URL(prevHref ?? "", page.url());
  expect(prevUrl.pathname).toBe(`${basePath}/projects`);
  expect(prevUrl.searchParams.get("filter")).toBe("sample");
  expect(prevUrl.searchParams.get("labelIds")).toBe("8");
  expect(prevUrl.searchParams.get("pageNum")).toBe("1");

  const pageInput = pagination.locator('input[name="pageNum"]');
  await pageInput.fill("9");
  await pageInput.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(pageInput).toHaveValue("3");
  await expect(
    pagination.locator(
      '[data-stylex-owner="projects-directory-pagination-next-icon"][data-disabled="true"]',
    ),
  ).toHaveCount(1);
});

test("projects route source uses Link for project directory card navigation", () => {
  const source = readFileSync(new URL("../src/routes/projects.tsx", import.meta.url), "utf8");

  expect(source).toContain("import { queryOptions, useQuery } from");
  expect(source).toMatch(/import \{[^}]*createFileRoute[^}]*Link[^}]*useRouter[^}]*\} from/u);
  expect(source).toContain("apiQueryKeys");
  expect(source).toContain("restFetch");
  expect(source).toContain("projectsDirectoryQueryOptions(runtimeConfig, search)");
  expect(source).toContain("queryFn: () => listProjectsDirectoryRest(runtimeConfig, input)");
  expect(source).toContain("queryKey: [...apiQueryKeys.project.list(), input] as const");
  expect(source).toContain('params.set("filter", input.filter)');
  expect(source).toContain('params.set("labelIds", input.labelIds)');
  expect(source).toContain('params.set("pageNum", String(input.pageNum))');
  expect(source).toContain('return query ? `/projects?${query}` : "/projects";');
  expect(source).toContain('to="/projects"');
  expect(source).toContain('to="/orgs"');
  expect(source).toContain('to="/$ownerName/$projectName"');
  expect(source).toContain('to="/$user"');
  expect(source).toContain("labelIds: number | string");
  expect(source).toContain("labelIdSearchValue(label.id)");
  expect(source).toContain("router.history.push(");
  expect(source).toContain("prefixBasePath(");
  expect(source).toContain("`/projects?labelIds=${encodeURIComponent(label.id)}`");
  expect(source).toContain("pageSearch(pageNum)");
  expect(source).toContain("pageNum?: number");
  expect(source).toContain('name="pageNum"');
  expect(source).toContain("router.navigate");
  expect(source).toContain('"data-status": undefined');
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain("autoFocus");
  expect(source).toContain('<title>{t("title.projectList")}</title>');
  expect(source).not.toContain('autofocus: ""');
  expect(source).not.toMatch(/setAttribute\(['"]autofocus['"]/);
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).not.toContain("window.document");
  expect(source).not.toMatch(/use(?:Layout)?Effect\s*\([\s\S]*?(?:document|title)/u);
  expect(source).not.toContain('<a href={prefixBasePath(runtimeConfig.basePath, "/projects")}');
  expect(source).not.toContain('<a href={prefixBasePath(runtimeConfig.basePath, "/orgs")}');
  expect(source).not.toContain("const projectHref =");
  expect(source).not.toContain("const ownerHref =");
  expect(source).not.toContain("<a href={projectHref}");
  expect(source).not.toContain("<a href={ownerHref}");
});

test("site admin project delete button drops legacy delegated hooks while React owns delete", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  const requests = await mockSiteProjects(page);
  await mockSiteUpdate(page);

  await page.goto(`${basePath}/sites/projectList?filter=road`);
  await expect(page.locator('[data-stylex-owner="site-project-list-row"]')).toHaveCount(1);

  const deleteButton = page.locator('[data-stylex-owner="site-project-list-delete-action"]');
  await expect(deleteButton).toHaveText("Delete");
  await expect(deleteButton).toHaveAttribute("data-project-name", "acme/roadmap");
  await expect(deleteButton).not.toHaveAttribute("data-href", /.+/);
  await expect(deleteButton).not.toHaveAttribute("data-toggle", /.+/);
  await expect(
    page.locator('[data-toggle="delete-project"], [data-href*="/sites/project/delete"]'),
  ).toHaveCount(0);

  await page.evaluate(() => {
    (
      window as Window & { __siteAdminProjectDeleteSpaMarker?: string }
    ).__siteAdminProjectDeleteSpaMarker = "kept";
  });
  const projectListUrl = page.url();
  await deleteButton.click();

  const deleteModal = page.locator("#alertDeletionWrap");
  await expect(deleteModal).toHaveAttribute("data-stylex-owner", "site-project-list-delete-modal");
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#project-name")).toHaveText("acme/roadmap");
  await expect(
    page.locator('[data-stylex-owner="site-project-list-delete-modal-header"]'),
  ).toHaveText("×acme/roadmapDelete project");
  await expect(
    page.locator('[data-stylex-owner="site-project-list-delete-modal-body"] p'),
  ).toHaveText("Do you really want to delete this project?");
  await expect(
    page.locator('[data-stylex-owner="site-project-list-delete-modal-footer"] > button'),
  ).toHaveText(["Yes", "No"]);

  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/site/projects/77") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#projectDeleteBtn").click();
  await deleteResponse;

  await expect.poll(() => requests.deletedProjectIds).toEqual(["77"]);
  expect(requests.deleteRequests).toEqual([
    {
      hasCsrfHeader: true,
      method: "DELETE",
      pathname: `${basePath}/api/v1/site/projects/77`,
    },
  ]);
  await expect(page.locator('[data-stylex-owner="site-project-list-row"]')).toHaveCount(0);
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(page).toHaveURL(projectListUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __siteAdminProjectDeleteSpaMarker?: string })
            .__siteAdminProjectDeleteSpaMarker,
      ),
    )
    .toBe("kept");
});

test("site admin project delete source has no legacy data-href delegated hook", () => {
  const source = readFileSync(SITE_PROJECT_LIST_ROUTE_SOURCE, "utf8");
  const projectListItemSource = source.slice(
    source.indexOf("function ProjectListItem"),
    source.indexOf("function LegacyMessage"),
  );

  expect(projectListItemSource).toContain('data-stylex-owner="site-project-list-delete-action"');
  expect(projectListItemSource).toContain("data-project-name=");
  expect(projectListItemSource).toContain("onClick={(event) => onDelete(project, event)}");
  expect(projectListItemSource).not.toContain("data-href");
  expect(projectListItemSource).not.toContain('data-toggle="delete-project"');
  expect(projectListItemSource).not.toContain("/sites/project/delete/");
  expect(source).toContain("deleteSiteProjectRest(runtimeConfig, csrfToken, projectId)");
  expect(source).not.toContain("document.");
  expect(source).not.toContain("classList");
  expect(source).not.toContain("addEventListener(");
  expect(source).not.toContain("dangerouslySetInnerHTML");
});

async function expectNoActiveMarker(locator: ReturnType<Page["locator"]>) {
  await expect(locator).not.toHaveAttribute("aria-current", /./);
  await expect(locator).not.toHaveAttribute("data-status", /./);
}

type ProjectsDirectoryMockPayload = Record<string, unknown>;
type ProjectsDirectoryMockResolver = (requestUrl: URL) => ProjectsDirectoryMockPayload;

async function mockAuthenticatedProjects(
  page: Page,
  payload: ProjectsDirectoryMockPayload | ProjectsDirectoryMockResolver = {},
) {
  const resolvePayload: ProjectsDirectoryMockResolver =
    typeof payload === "function" ? payload : () => payload;
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
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
  await page.route("**/api/v1/projects**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const resolvedPayload = resolvePayload(requestUrl);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [makeReadableProjectDirectoryItem(), makeUnreadableProjectDirectoryItem()],
        ...resolvedPayload,
      }),
    });
  });
}

function makeReadableProjectDirectoryItem(
  overrides: ProjectsDirectoryMockPayload = {},
): ProjectsDirectoryMockPayload {
  return {
    createdLabel: "just now",
    createdTitle: "2026-06-30",
    labels: [
      {
        category: "BUG",
        id: 8,
        name: "bug",
      },
    ],
    lastPushedLabel: "just now",
    logoUrl: "/assets/images/project_default_logo.png",
    memberCount: 2,
    members: [
      {
        avatarUrl: "/assets/images/default-avatar-32.png",
        loginId: "member1",
        userLabel: "Member One",
      },
      {
        avatarUrl: "/assets/images/default-avatar-32.png",
        loginId: "member2",
        userLabel: "Member Two",
      },
    ],
    overview: "Sample project",
    ownerName: "admin",
    projectName: "sample",
    projectScope: "public",
    watchCount: 3,
    ...overrides,
  };
}

function makeUnreadableProjectDirectoryItem(): ProjectsDirectoryMockPayload {
  return {
    ownerName: "admin",
    projectName: "hidden",
    projectScope: "private",
    viewerCanRead: false,
  };
}

async function mockProjectCardDestinations(page: Page) {
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        allowEnroll: false,
        allowLeave: false,
        allowManage: false,
        allowWatch: true,
        codeBrowserUrl: "/admin/sample/code",
        createdLabel: "just now",
        createdTitle: "2026-06-30",
        isFavorite: false,
        isWatching: false,
        lastPushedLabel: "just now",
        lastPushedTitle: "2026-06-30",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        members: [],
        ownerName: "admin",
        projectName: "sample",
        projectScope: "public",
        readme: "",
        repositoryUrl: "",
      }),
    });
  });
  await page.route("**/api/v1/users/admin/profile?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        daysAgo: 14,
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
          sinceLabel: "just now",
        },
        pullRequestItems: [],
        selected: "issues",
        viewerCanEditProfile: true,
      }),
    });
  });
}

async function mockSiteAdminSession(page: Page) {
  const sessionBody = {
    actorId: 1,
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

async function mockSiteProjects(page: Page) {
  const requests = {
    deletedProjectIds: [] as string[],
    deleteRequests: [] as Array<{ hasCsrfHeader: boolean; method: string; pathname: string }>,
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

  await page.route("**/api/v1/site/projects?*", async (route) => {
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("page") ?? "1") || 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        filter: url.searchParams.get("filter") ?? "",
        page: pageNum,
        pageSize: 20,
        projects,
        total: projects.length,
        totalPages: projects.length > 0 ? 1 : 0,
      }),
    });
  });
  await page.route("**/api/v1/site/projects/*", async (route) => {
    if (route.request().method() === "DELETE") {
      const url = new URL(route.request().url());
      const deletedProjectId = url.pathname.split("/").pop() ?? "";
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
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, redirectPath: "/sites/projectList" }),
    });
  });

  return requests;
}

async function mockSiteUpdate(page: Page) {
  await page.route("**/api/v1/site/update", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        currentVersion: "1.0.0",
        error: null,
        message: "site.update.isNotNecessary",
        releaseUrl: null,
        versionToUpdate: null,
      }),
    });
  });
}

async function readProjectsListMetrics(page: Page) {
  return page.evaluate(() => {
    const list = document.querySelector<HTMLElement>(".all-projects");
    const row = document.querySelector<HTMLElement>(".all-projects > .project");
    const avatar = document.querySelector<HTMLElement>(".all-projects .owner-avatar-wrap");
    const avatarImage = document.querySelector<HTMLElement>(".all-projects .owner-avatar-wrap img");
    const header = document.querySelector<HTMLElement>(".all-projects .header");
    const description = document.querySelector<HTMLElement>(
      '[data-stylex-owner="projects-directory-description"]',
    );
    const nameTag = document.querySelector<HTMLElement>(
      '[data-stylex-owner="projects-directory-name-tag"]',
    );
    const stats = document.querySelector<HTMLElement>(
      '[data-stylex-owner="projects-directory-stats"]',
    );
    const members = document.querySelector<HTMLElement>(
      '[data-stylex-owner="projects-directory-members"]',
    );
    if (
      !list ||
      !row ||
      !avatar ||
      !avatarImage ||
      !header ||
      !description ||
      !nameTag ||
      !stats ||
      !members
    ) {
      throw new Error("Expected projects list metric targets are missing.");
    }

    const listStyle = getComputedStyle(list);
    const rowStyle = getComputedStyle(row);
    const avatarStyle = getComputedStyle(avatar);
    const avatarImageStyle = getComputedStyle(avatarImage);
    const headerStyle = getComputedStyle(header);
    const descriptionStyle = getComputedStyle(description);
    const nameTagStyle = getComputedStyle(nameTag);
    const statsStyle = getComputedStyle(stats);
    const membersStyle = getComputedStyle(members);

    return {
      avatarBorderRadius: avatarStyle.borderRadius,
      avatarDisplay: avatarStyle.display,
      avatarFloat: avatarStyle.cssFloat,
      avatarHeight: avatarStyle.height,
      avatarImageHeight: avatarImageStyle.height,
      avatarImageVerticalAlign: avatarImageStyle.verticalAlign,
      avatarImageWidth: avatarImageStyle.width,
      avatarMarginRight: avatarStyle.marginRight,
      avatarWidth: avatarStyle.width,
      descriptionColor: descriptionStyle.color,
      descriptionMarginLeft: descriptionStyle.marginLeft,
      headerFontSize: headerStyle.fontSize,
      headerFontWeight: headerStyle.fontWeight,
      headerMarginBottom: headerStyle.marginBottom,
      headerMarginLeft: headerStyle.marginLeft,
      listClear: listStyle.clear,
      listMargin: listStyle.margin,
      listStyleType: listStyle.listStyleType,
      nameTagColor: nameTagStyle.color,
      nameTagFontSize: nameTagStyle.fontSize,
      nameTagMarginLeft: nameTagStyle.marginLeft,
      rowBorderBottomColor: rowStyle.borderBottomColor,
      rowBorderBottomStyle: rowStyle.borderBottomStyle,
      rowOverflow: rowStyle.overflow,
      rowPadding: rowStyle.padding,
      statsTextAlign: statsStyle.textAlign,
      statsWidth: membersStyle.width,
    };
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        "[data-stylex-owner=projects-breadcrumb-outer], [data-stylex-owner=projects-directory-page-wrap]",
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
            attr.name !== "data-style-src" &&
            attr.name !== "data-stylex-owner" &&
            attr.name !== "data-disabled" &&
            attr.name !== "data-pagination-kind" &&
            attr.name !== "data-projects-directory-tabs-scope" &&
            !(
              attr.name === "data-selected" &&
              attr.ownerElement?.matches('[data-stylex-owner="projects-directory-tabs-item"]')
            ) &&
            !(
              attr.name === "class" &&
              (attr.ownerElement?.matches('[data-stylex-owner="projects-directory-tabs-link"]') ||
                attr.ownerElement?.matches(
                  '[data-stylex-owner="projects-directory-search-form"]',
                ) ||
                attr.ownerElement?.matches(
                  '[data-stylex-owner="projects-directory-member-item"]',
                ) ||
                attr.ownerElement?.matches(
                  '[data-stylex-owner="projects-directory-member-count"]',
                ) ||
                attr.ownerElement?.matches(
                  '[data-stylex-owner="projects-directory-member-avatar-image"]',
                ) ||
                (attr.ownerElement?.matches(
                  '[data-stylex-owner="projects-directory-pagination-label"]',
                ) &&
                  attr.ownerElement.getAttribute("data-disabled") === "false") ||
                (attr.ownerElement?.matches('[data-stylex-owner="projects-directory-tabs-item"]') &&
                  attr.ownerElement.getAttribute("data-selected") === "false"))
            ) &&
            !(
              attr.name === "style" &&
              attr.ownerElement?.matches(
                '[data-stylex-owner="projects-directory-pagination-next-icon"], [data-stylex-owner="projects-directory-pagination-prev-icon"]',
              )
            ) &&
            !attr.name.startsWith("data-v-"),
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}="${normalizeAttr(attr)}"`)
        .join(" ");
      const canonicalAttrs = node.matches("[data-projects-directory-tabs-scope]")
        ? 'class="title_area"'
        : attrs;
      const open = canonicalAttrs
        ? `<${node.tagName.toLowerCase()} ${canonicalAttrs}>`
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
      const owner = attr.ownerElement?.getAttribute("data-stylex-owner");
      if (attr.name === "class" && owner === "projects-breadcrumb-outer")
        return "site-breadcrumb-outer";
      if (attr.name === "class" && owner === "projects-breadcrumb-inner")
        return "site-breadcrumb-inner";
      if (attr.name === "class" && owner === "projects-directory-page-wrap")
        return "page-wrap-outer";
      if (attr.name === "class" && owner === "projects-directory-page") return "project-page-wrap";
      if (attr.name === "class" && owner === "projects-directory-tabs-list") return "nav nav-tabs";
      if (
        attr.name === "class" &&
        owner === "projects-directory-tabs-item" &&
        attr.ownerElement?.getAttribute("data-selected") === "true"
      )
        return "active";
      if (attr.name === "class" && owner === "projects-directory-search-wrap") return "search-wrap";
      if (attr.name === "class" && owner === "projects-directory-search-container")
        return "pull-left";
      if (attr.name === "class" && owner === "projects-directory-search-bar") return "search-bar";
      if (attr.name === "class" && owner === "projects-directory-search-input") return "textbox";
      if (attr.name === "class" && owner === "projects-directory-search-button")
        return "search-btn";
      if (attr.name === "class" && owner === "projects-directory-list") return "all-projects";
      if (attr.name === "class" && owner === "projects-directory-row") return "project";
      if (attr.name === "class" && owner === "projects-directory-owner-avatar")
        return "owner-avatar-wrap";
      if (attr.name === "class" && owner === "projects-directory-header") return "header";
      if (attr.name === "class" && owner === "projects-directory-description") return "desc";
      if (attr.name === "class" && owner === "projects-directory-name-tag") return "name-tag";
      if (attr.name === "class" && owner === "projects-directory-title-link") return "black";
      if (attr.name === "class" && owner === "projects-directory-owner-link")
        return "owner-name-small";
      if (attr.name === "class" && owner === "projects-directory-code-update") return "small-font";
      if (attr.name === "class" && owner === "projects-directory-stats")
        return "stats-wrap pull-right";
      if (attr.name === "class" && owner === "projects-directory-members") return "members";
      if (attr.name === "class" && owner === "projects-directory-members-list") return "unstyled";
      if (attr.name === "class" && owner === "projects-directory-member-avatar")
        return "avatar-wrap";
      if (attr.name === "class" && owner === "projects-directory-stats-icon")
        return attr.value.includes("yobicon-friends")
          ? "yobicon-friends yobicon-middle"
          : "yobicon-eye yobicon-middle";
      if (attr.name === "class" && owner === "projects-directory-pagination-input")
        return "input-mini nospinner";
      if (attr.name === "class" && owner === "projects-directory-pagination")
        return "page-navigation-wrap";
      if (attr.name === "class" && owner === "projects-directory-pagination-list")
        return "page-nums";
      if (attr.name === "class" && owner === "projects-directory-pagination-item") {
        const kind = attr.ownerElement?.getAttribute("data-pagination-kind");
        return kind === "icon"
          ? "page-num ikon"
          : kind === "delimiter"
            ? "page-num delimiter"
            : "page-num";
      }
      if (attr.name === "class" && owner === "projects-directory-pagination-label")
        return attr.ownerElement?.getAttribute("data-disabled") === "true" ? "off" : "";
      if (attr.name === "class" && owner === "projects-directory-pagination-prev-icon")
        return `ico btn-pg-prev${attr.ownerElement?.getAttribute("data-disabled") === "true" ? " off" : ""}`;
      if (attr.name === "class" && owner === "projects-directory-pagination-next-icon")
        return `ico btn-pg-next${attr.ownerElement?.getAttribute("data-disabled") === "true" ? " off" : ""}`;
      if (attr.name === "class" && owner === "global-gnb-project-list-item") return "active";
      if (attr.name === "class" && owner === "global-gnb-project-list-divider") return "divider";
      if (attr.name === "class" && owner === "global-gnb-project-list-link")
        return "show-progress-bar";
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .filter((element) => element.matches(".site-breadcrumb-outer, .page-wrap-outer"))
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
        .filter((attr) => !attr.name.startsWith("data-v-"))
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
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
