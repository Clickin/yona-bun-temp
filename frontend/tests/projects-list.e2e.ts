import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

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
      <li class="active"><a href="__BASE_PATH__/projects" class="show-progress-bar active" data-status="active" aria-current="page">List All</a></li>
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
            <input name="filter" class="textbox" type="text" placeholder="Search by keyword" value="sample" autofocus>
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
            <p class="name-tag">by<a href="__BASE_PATH__/admin" class="owner-name-small">admin</a>at<strong title="2026-06-30">just now</strong><span class="small-font">,Latest code update<strong>just now</strong></span></p>
          </div>
        </div>
        <div class="stats-wrap pull-right">
          <div class="members">
            <ul class="unstyled"></ul>
            <p><i class="yobicon-friends yobicon-middle"></i><strong>2</strong> <i class="yobicon-eye yobicon-middle"></i> <strong>3</strong></p>
          </div>
        </div>
      </li>
      <li class="project" style="background-color:rgb(252,252,252)">
        <div class="info-wrap" style="opacity:0.3">
          <div class="owner-avatar-wrap">
            <img src="/assets/images/project_default_logo.png" alt="hidden">
          </div>
          <div style="float:left;color:gray">You do not have permission to view this project's information</div>
        </div>
      </li>
    </ul>
    <div id="pagination"></div>
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
  await expect(page.locator('#search input[name="filter"]')).toHaveAttribute("autofocus", "");

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
    statsWidth: "76.1094px",
  });
});

test("projects list filter input preserves legacy autofocus declaratively", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);

  await page.goto(`${basePath}/projects?filter=sample`);
  const filterInput = page.locator('#search input[name="filter"]');
  await expect(filterInput).toHaveAttribute("autofocus", "");
  await expect(filterInput).toBeFocused();
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
  await expect(unreadableLogo).toHaveAttribute("src", "/assets/images/project_default_logo.png");
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

  const projectTabItem = page.locator(".title_area > .nav.nav-tabs > li").nth(0);
  const organizationTabItem = page.locator(".title_area > .nav.nav-tabs > li").nth(1);
  const projectTabLink = projectTabItem.locator("a");
  const organizationTabLink = organizationTabItem.locator("a");

  await expect(projectTabItem).toHaveAttribute("class", "active");
  await expect(organizationTabItem).not.toHaveAttribute("class", /active/);
  await expect(projectTabLink).toHaveAttribute("href", `${basePath}/projects`);
  await expect(organizationTabLink).toHaveAttribute("href", `${basePath}/orgs`);
  await expect(projectTabLink).not.toHaveAttribute("class", /active/);
  await expect(projectTabLink).not.toHaveAttribute("data-status", /./);
  await expect(projectTabLink).not.toHaveAttribute("aria-current", /./);
  await expect(organizationTabLink).not.toHaveAttribute("class", /active/);
  await expect(organizationTabLink).not.toHaveAttribute("data-status", /./);
  await expect(organizationTabLink).not.toHaveAttribute("aria-current", /./);
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
  const projectNameLink = page.locator(".all-projects .header a.black");
  const ownerNameLink = page.locator(".all-projects .name-tag a.owner-name-small");

  await expect(projectLogoLink).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectNameLink).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(ownerNameLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(projectNameLink).toHaveClass("black");
  await expect(ownerNameLink).toHaveClass("owner-name-small");
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
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/admin`);
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
  await mockAuthenticatedProjects(page);

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator(".all-projects .project").first()).toBeVisible();

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
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker,
      ),
    )
    .toBe("label");
});

test("projects list renders legacy pagination controls for multi-page project lists", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page, { pageNum: 1, totalPages: 3 });

  await page.goto(`${basePath}/projects?filter=sample&labelIds=8&pageNum=1`);
  await expect(page.locator(".all-projects .project").first()).toBeVisible();

  const pagination = page.locator("#pagination");
  await expect(pagination).toHaveClass("page-navigation-wrap");
  await expect(pagination.locator("ul.page-nums")).toHaveCount(1);
  await expect(pagination.locator("li.page-num")).toHaveCount(5);
  await expect(pagination.locator(".btn-pg-prev.off")).toHaveCount(1);
  await expect(pagination.locator("span.off")).toHaveText("Previous page");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "3");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
  await expect(pagination.locator(".page-num").nth(2)).toHaveText("/");
  await expect(pagination.locator(".page-num").nth(3)).toHaveText("3");

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
  await expect(pagination.locator(".btn-pg-next.off")).toHaveCount(1);
});

test("projects route source uses Link for project directory card navigation", () => {
  const source = readFileSync(new URL("../src/routes/projects.tsx", import.meta.url), "utf8");

  expect(source).toContain("import { createFileRoute, Link, useRouter } from");
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
  expect(source).toContain('autofocus: ""');
  expect(source).not.toMatch(/setAttribute\(['"]autofocus['"]/);
  expect(source).not.toContain('<a href={prefixBasePath(runtimeConfig.basePath, "/projects")}');
  expect(source).not.toContain('<a href={prefixBasePath(runtimeConfig.basePath, "/orgs")}');
  expect(source).not.toContain("const projectHref =");
  expect(source).not.toContain("const ownerHref =");
  expect(source).not.toContain("<a href={projectHref}");
  expect(source).not.toContain("<a href={ownerHref}");
});

async function expectNoActiveMarker(locator: ReturnType<Page["locator"]>) {
  await expect(locator).not.toHaveAttribute("aria-current", /./);
  await expect(locator).not.toHaveAttribute("data-status", /./);
}

async function mockAuthenticatedProjects(page: Page, payload: Record<string, unknown> = {}) {
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
  await page.route("**/api/v1/projects", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            createdLabel: "just now",
            createdTitle: "2026-06-30",
            lastPushedLabel: "just now",
            logoUrl: "/assets/images/project_default_logo.png",
            memberCount: 2,
            overview: "Sample project",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            labels: [
              {
                category: "BUG",
                id: 8,
                name: "bug",
              },
            ],
            watchCount: 3,
          },
          {
            ownerName: "admin",
            projectName: "hidden",
            projectScope: "private",
            viewerCanRead: false,
          },
        ],
        ...payload,
      }),
    });
  });
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

async function readProjectsListMetrics(page: Page) {
  return page.evaluate(() => {
    const list = document.querySelector<HTMLElement>(".all-projects");
    const row = document.querySelector<HTMLElement>(".all-projects > .project");
    const avatar = document.querySelector<HTMLElement>(".all-projects .owner-avatar-wrap");
    const avatarImage = document.querySelector<HTMLElement>(".all-projects .owner-avatar-wrap img");
    const header = document.querySelector<HTMLElement>(".all-projects .header");
    const description = document.querySelector<HTMLElement>(".all-projects .desc");
    const nameTag = document.querySelector<HTMLElement>(".all-projects .name-tag");
    const stats = document.querySelector<HTMLElement>(".all-projects .stats-wrap");
    const members = document.querySelector<HTMLElement>(".all-projects .members");
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

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
