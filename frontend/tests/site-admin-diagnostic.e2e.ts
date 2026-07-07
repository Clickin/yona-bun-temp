import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const EXPECTED_DIAGNOSTIC_NO_ERROR_SCREEN = `
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
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
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
          <li class=""><a href="__BASE_PATH__/sites/projectList">Projects</a></li>
          <li class=""><a href="__BASE_PATH__/sites/mail">Send email</a></li>
          <li class=""><a href="__BASE_PATH__/sites/massmail">Send mass emails</a></li>
          <li class=""><a href="__BASE_PATH__/sites/update">Software Update</a></li>
          <li class="active"><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
        </ul>
      </div>
      <div class="span10">
        <div class="title_area">
          <h2 class="pull-left">Diagnostics</h2>
        </div>
        <p>No errors were found</p>
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

test("site admin diagnostics matches legacy site/diagnostic.scala.html no-error screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockDiagnostics(page, { errorCount: 0, errors: [] });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/diagnostic`);
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page).toHaveTitle("Site settings");
  await expect
    .poll(() =>
      page
        .locator("head > title")
        .first()
        .evaluate((title) => title.textContent),
    )
    .toBe("Site settings");
  await expect(page.locator(".gnb-nav > li > a")).toHaveText(["Y", "List All", "Feedback"]);
  expect(
    await page
      .locator(".gnb-nav > li > a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}`,
    `${basePath}/projects`,
    "https://github.com/yona-projects/yona/issues",
  ]);
  await expect(page.locator(".gnb-nav > li > a").nth(2)).toHaveAttribute("target", "_blank");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator(".site-setting-nav li")).toHaveText([
    "Users",
    "Posts",
    "Issues",
    "Projects",
    "Send email",
    "Send mass emails",
    "Software Update",
    "Diagnostics",
  ]);
  expect(
    await page
      .locator(".site-setting-nav a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/sites/userList`,
    `${basePath}/sites/postList`,
    `${basePath}/sites/issueList`,
    `${basePath}/sites/projectList`,
    `${basePath}/sites/mail`,
    `${basePath}/sites/massmail`,
    `${basePath}/sites/update`,
    `${basePath}/sites/diagnostic`,
  ]);
  expect(
    await page.locator(".site-setting-nav a").evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        className: link.getAttribute("class"),
        dataStatus: link.getAttribute("data-status"),
      })),
    ),
  ).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
  ]);
  await expect(page.locator(".site-setting-nav li")).toHaveClass([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "active",
  ]);
  await expect(page.locator(".site-setting-nav li").nth(7)).toHaveClass("active");
  const updateLink = page.locator(".site-setting-nav a", { hasText: "Software Update" });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  const siteAdminShellLink = page.locator(".gnb-usermenu .usermenu-icon-button.show-progress-bar");
  await expect(siteAdminShellLink).toHaveAttribute("href", `${basePath}/sites/userList`);
  await expect(siteAdminShellLink).toHaveAttribute("title", "Site administration");
  await expect(siteAdminShellLink).toHaveAttribute("data-toggle", "tooltip");
  await expect(siteAdminShellLink).toHaveAttribute("data-placement", "bottom");
  const navbarMetrics = await diagnosticNavbarMetrics(page);
  expect(navbarMetrics.navLinkTexts).toEqual(["Y", "List All", "Feedback"]);
  expect(navbarMetrics.navSearchGap).toBeGreaterThanOrEqual(80);
  expect(navbarMetrics.navSearchGap).toBeLessThanOrEqual(110);
  expect(navbarMetrics.searchBottomWithinNavbar).toBe(true);
  expect(navbarMetrics.searchRightWithinNavbar).toBe(true);
  expect(navbarMetrics.searchTopWithinNavbar).toBe(true);
  expect(navbarMetrics.scopeTitlePresent).toBe(false);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_DIAGNOSTIC_NO_ERROR_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-diagnostic-sidebar";
  });
  await updateLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/update`);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Software Update");
  await expect(page.locator(".title_area h2")).toHaveText("Software Update");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-diagnostic-sidebar");
});

test("site admin diagnostics renders legacy error pre blocks", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockDiagnostics(page, {
    errorCount: 99,
    errors: ["database probe failed", "repository path is unavailable"],
  });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/diagnostic`);
  await expect(page.getByText("2 errors were found")).toBeVisible();
  await expect(page.locator(".site-setting-wrap .span10 > ul li pre")).toHaveText([
    "database probe failed",
    "repository path is unavailable",
  ]);
  expect(await diagnosticErrorMetrics(page)).toEqual({
    contentWidthRatio: 0.83,
    errorPreBackground: "rgb(245, 245, 245)",
    errorPreBorderRadius: 4,
    errorPreBorderTopWidth: 1,
    errorPreFontSize: 13,
    errorPreLineHeight: 20,
    errorPreMarginBottom: 10,
    errorPrePaddingBlock: 20,
    errorPrePaddingInline: 20,
    errorPreWhiteSpace: "pre-wrap",
    messageLineHeight: 20,
    sidebarWidthRatio: 0.15,
    titleAreaBorderBottomWidth: 1,
    titleAreaMarginBottom: 29,
    titleAreaPaddingBottom: 8,
    titleLineHeight: 30,
  });
});

test("site admin diagnostics renders legacy update notification badge", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockDiagnostics(page, { errorCount: 0, errors: [] });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isAvailable",
    releaseUrl: "https://example.test/yona-1.1.0",
    versionToUpdate: "1.1.0",
  });

  await page.goto(`${basePath}/sites/diagnostic`);

  const updateLink = page.locator(".site-setting-nav a", { hasText: "Software Update" });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator(".notification-badge")).toHaveText("1");
});

test("site admin diagnostics sidebar uses typed route Links without a route-local generic adapter", async () => {
  const source = readFileSync("src/routes/sites/diagnostic.tsx", "utf8");
  expect(source).toContain('<title>{t("title.siteSetting")}</title>');
  expect(source).not.toContain("useLegacySiteDiagnosticDocumentTitle");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain('globalThis["document"]');
  expect(source).not.toMatch(/useEffect\s*\(/u);
  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("AnchorHTMLAttributes");
  expect(source).not.toContain("ComponentType");
  expect(source).not.toContain("to={item.href}");
  expect(source).toContain(
    "<SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>",
  );
  expect(source).toContain("const legacySiteSidebarLinkProps = {");
  expect(source).toContain(
    'activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined }',
  );
  expect(source).toContain("const legacyDiagnosticSidebarSearch = {");
  expect(source).toContain("search={legacyDiagnosticSidebarSearch}");
});

async function diagnosticNavbarMetrics(page: Page) {
  return page.evaluate(() => {
    const requireElement = <T extends Element>(selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof Element)) {
        throw new Error(`Missing element: ${selector}`);
      }
      return element as T;
    };

    const navbar = requireElement<HTMLElement>(".gnb-outer");
    const searchForm = requireElement<HTMLFormElement>('form[name="gnb-search-form"]');
    const navLinks = Array.from(document.querySelectorAll(".gnb-nav > li > a"));
    const navLinkTexts = navLinks.map((link) => link.textContent?.trim() ?? "");
    const navbarRect = navbar.getBoundingClientRect();
    const searchRect = searchForm.getBoundingClientRect();
    const listAllLink = navLinks[1];
    const listAllRect = listAllLink?.getBoundingClientRect();

    return {
      navLinkTexts,
      navSearchGap: listAllRect ? Math.round(searchRect.left - listAllRect.right) : null,
      searchBottomWithinNavbar: searchRect.bottom <= navbarRect.bottom,
      searchRightWithinNavbar: searchRect.right <= navbarRect.right,
      searchTopWithinNavbar: searchRect.top >= navbarRect.top,
      scopeTitlePresent: Boolean(document.querySelector("#gnb-search-scope-title")),
    };
  });
}

async function diagnosticErrorMetrics(page: Page) {
  return page.evaluate(() => {
    const requireElement = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing element: ${selector}`);
      }
      return element;
    };

    const row = requireElement(".site-setting-wrap .row-fluid");
    const sidebar = requireElement(".site-setting-wrap .span2");
    const content = requireElement(".site-setting-wrap .span10");
    const titleArea = requireElement(".site-setting-wrap .title_area");
    const title = requireElement(".site-setting-wrap .title_area h2");
    const message = requireElement(".site-setting-wrap .span10 > p");
    const pre = requireElement(".site-setting-wrap .span10 > ul li pre");

    const rowRect = row.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const titleAreaStyle = getComputedStyle(titleArea);
    const titleStyle = getComputedStyle(title);
    const messageStyle = getComputedStyle(message);
    const preStyle = getComputedStyle(pre);

    return {
      contentWidthRatio: Number((contentRect.width / rowRect.width).toFixed(2)),
      errorPreBackground: preStyle.backgroundColor,
      errorPreBorderRadius: Math.round(parseFloat(preStyle.borderTopLeftRadius)),
      errorPreBorderTopWidth: Math.round(parseFloat(preStyle.borderTopWidth)),
      errorPreFontSize: Math.round(parseFloat(preStyle.fontSize)),
      errorPreLineHeight: Math.round(parseFloat(preStyle.lineHeight)),
      errorPreMarginBottom: Math.round(parseFloat(preStyle.marginBottom)),
      errorPrePaddingBlock:
        Math.round(parseFloat(preStyle.paddingTop)) +
        Math.round(parseFloat(preStyle.paddingBottom)),
      errorPrePaddingInline:
        Math.round(parseFloat(preStyle.paddingLeft)) +
        Math.round(parseFloat(preStyle.paddingRight)),
      errorPreWhiteSpace: preStyle.whiteSpace,
      messageLineHeight: Math.round(parseFloat(messageStyle.lineHeight)),
      sidebarWidthRatio: Number((sidebarRect.width / rowRect.width).toFixed(2)),
      titleAreaBorderBottomWidth: Math.round(parseFloat(titleAreaStyle.borderBottomWidth)),
      titleAreaMarginBottom: Math.round(parseFloat(titleAreaStyle.marginBottom)),
      titleAreaPaddingBottom: Math.round(parseFloat(titleAreaStyle.paddingBottom)),
      titleLineHeight: Math.round(parseFloat(titleStyle.lineHeight)),
    };
  });
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

async function mockDiagnostics(
  page: Page,
  response: {
    errorCount: number;
    errors: string[];
  },
) {
  await page.route("**/api/v1/site/diagnostics", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
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
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
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
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
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
