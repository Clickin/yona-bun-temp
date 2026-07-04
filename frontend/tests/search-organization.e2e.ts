import { expect, test, type Page } from "@playwright/test";

const EXPECTED_ORGANIZATION_SEARCH = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/organization_default_logo.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/organization_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author"><span class="group-title-head">group</span><a href="__BASE_PATH__/organizations/weblabs">weblabs</a></span></div></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/organizations/weblabs">Group Home</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/issues">Issue</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/boards">Board</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/pullrequests">Pull request</a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform"><i class="yobicon-cog"></i><span class="blind">Project configuration</span></a></li></ul></div></div></div>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class="active empty"><a href="#" data-toggle="search-category" data-type="project">Projects<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/organizations/weblabs/search"><input type="hidden" name="searchType" value="project"><input type="text" id="searchKeyword" name="keyword" class="span11" value="missing"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>0</strong> result(s) in Projects</h3></div><div class="search-result-wrap"><div class="empty-result"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("organization search matches legacy search/result.scala.html organization empty project DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSearch(page);

  await page.goto(`${basePath}/organizations/weblabs/search?keyword=missing&searchType=project`);
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();
  expect(
    await page
      .locator(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      )
      .evaluateAll((roots) => roots.map((root) => root.className)),
  ).toEqual([
    "unsupported hidden",
    "gnb-outer",
    "project-header-outer",
    "project-menu-outer",
    "site-breadcrumb-outer",
    "page-wrap-outer",
    "page-footer-outer",
  ]);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("organization search without required query renders legacy badrequest_default.scala.html shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockOrganizationSearch(page);

  await page.goto(`${basePath}/organizations/weblabs/search`);
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "The request cannot be fulfilled due to bad syntax",
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute("href", `${basePath}/`);
  await expect(page.locator(".project-header-outer, .project-menu-outer")).toHaveCount(0);
  await expect(page.locator("#searchInnerForm")).toHaveCount(0);
  expect(searchApi.count).toBe(0);
});

test("organization search preserves whitespace-only keyword and still calls scoped API", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockOrganizationSearch(page);

  await page.goto(`${basePath}/organizations/weblabs/search?keyword=%20%20&searchType=project`);
  await expect(page.locator("#searchKeyword")).toHaveValue("  ");
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();
  await expect.poll(() => searchApi.count).toBe(1);
});

test("organization search category button stays inside the React SPA", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSearch(page);

  await page.goto(`${basePath}/organizations/weblabs/search?keyword=missing&searchType=project`);
  await page.locator("#searchKeyword").fill("fresh");
  await expect(page.locator('.search-category-wrap a[href="#"]')).toHaveCount(0);
  await expect(page.locator(".search-category-wrap a")).toHaveCount(0);
  const issueCategory = page.locator(".search-category-wrap button", { hasText: "Issues" });
  await expect(issueCategory).toHaveAttribute("type", "button");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await issueCategory.click();

  await expect(page).toHaveURL(new RegExp(`${basePath}/organizations/weblabs/search\\?`));
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

async function mockOrganizationSearch(page: Page) {
  const apiCalls = { count: 0 };

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
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Web labs group",
        logoUrl: "/assets/images/organization_default_logo.png",
        managers: [],
        members: [],
        organizationName: "weblabs",
        visibleProjects: [],
        viewerCanCreateProject: true,
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/search?**", async (route) => {
    apiCalls.count += 1;
    const url = new URL(route.request().url());
    const keyword = url.searchParams.get("keyword") ?? "missing";
    const searchType = url.searchParams.get("searchType") ?? "project";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        context: {
          organizationName: "weblabs",
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
        requestedSearchType: searchType,
        scope: "organization",
        searchType,
        totalCount: 0,
      }),
    });
  });

  return apiCalls;
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
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
            !isModernizedLegacySearchCategoryButtonType(attr) &&
            !isModernizedLegacyTabButtonType(attr) &&
            !isModernizedLegacyDropdownButtonType(attr) &&
            !isModernizedSiteAdminTooltipAttr(attr) &&
            attr.name !== "data-login" &&
            attr.name !== "role" &&
            attr.name !== "tabindex" &&
            attr.name !== "alt",
        )
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .concat(isModernizedLegacySearchCategoryButton(node) ? [`href=${JSON.stringify("#")}`] : [])
        .concat(
          isModernizedLegacyTabButton(node) ? [`href=${JSON.stringify(legacyTabHref(node))}`] : [],
        )
        .concat(
          isModernizedLegacyDropdownButton(node)
            ? [`href=${JSON.stringify("javascript:void(0);")}`]
            : [],
        )
        .sort()
        .join(" ");
      const tagName =
        isModernizedLegacySearchCategoryButton(node) ||
        isModernizedLegacyTabButton(node) ||
        isModernizedLegacyDropdownButton(node)
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
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

    function isModernizedLegacyDropdownButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyDropdownButton(attr.ownerElement);
    }

    function isModernizedSiteAdminTooltipAttr(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-placement" || attr.name === "title") &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("usermenu-icon-button")
      );
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

    function isModernizedLegacyDropdownButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.classList.contains("gnb-dropdown-toggle") &&
        node.closest(".gnb-usermenu") !== null
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
            !isModernizedLegacySearchCategoryButtonType(attr) &&
            !isModernizedLegacyTabButtonType(attr) &&
            !isModernizedLegacyDropdownButtonType(attr) &&
            !isModernizedSiteAdminTooltipAttr(attr) &&
            attr.name !== "data-login" &&
            attr.name !== "role" &&
            attr.name !== "tabindex" &&
            attr.name !== "alt",
        )
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .concat(isModernizedLegacySearchCategoryButton(node) ? [`href=${JSON.stringify("#")}`] : [])
        .concat(
          isModernizedLegacyTabButton(node) ? [`href=${JSON.stringify(legacyTabHref(node))}`] : [],
        )
        .concat(
          isModernizedLegacyDropdownButton(node)
            ? [`href=${JSON.stringify("javascript:void(0);")}`]
            : [],
        )
        .sort()
        .join(" ");
      const tagName =
        isModernizedLegacySearchCategoryButton(node) ||
        isModernizedLegacyTabButton(node) ||
        isModernizedLegacyDropdownButton(node)
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
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

    function isModernizedLegacyDropdownButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyDropdownButton(attr.ownerElement);
    }

    function isModernizedSiteAdminTooltipAttr(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-placement" || attr.name === "title") &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("usermenu-icon-button")
      );
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

    function isModernizedLegacyDropdownButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.classList.contains("gnb-dropdown-toggle") &&
        node.closest(".gnb-usermenu") !== null
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
  }, html);
}
