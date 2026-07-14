import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_UPDATE_NO_UPDATE_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <button type="button" class="pin" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </button>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
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
          <span class="user-menu"><a href="__BASE_PATH__/siteboss">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button">Favorite</button></li>
          <li class="myProjectList"><button type="button">Project</button></li>
          <li class="myRecentIssueList"><button type="button">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" title="Shortcut (A)">
        <a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" title="Site administration" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn"><i class="yobicon-plus"></i><span class="caret"></span></button>
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
          <li class="active"><a href="__BASE_PATH__/sites/update">Software Update</a></li>
          <li class=""><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
        </ul>
      </div>
      <div class="span10">
        <div class="title_area">
          <h2 class="pull-left">Software Update</h2>
        </div>
        <p>Current version is Yoram 1.0.0</p>
        <p>You are using the latest version</p>
      </div>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Yoram authors</span>
  </div>
</footer>
`;

test("site admin update matches legacy site/update.scala.html no-update screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });
  await mockDiagnostics(page, { errorCount: 0, errors: [] });

  await page.goto(`${basePath}/sites/update`);
  await expect(page).toHaveTitle("Site settings");
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/update`);
  await expect.poll(() => new URL(page.url()).search).toBe("");
  await expect(page.locator('[data-stylex-owner="global-gnb-nav"] a[href]')).toHaveText([
    "Y",
    "List All",
  ]);
  expect(
    await page
      .locator('[data-stylex-owner="global-gnb-nav"] a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([`${basePath}/`, `${basePath}/projects`]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Software Update");
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
  await expect(page.locator(".site-setting-nav li").nth(6)).toHaveClass("active");
  await expect(page.locator(".site-setting-nav li.active")).toHaveCount(1);
  const shellBoxes = await page.evaluate(() => {
    const navbar = document.querySelector(".gnb-outer");
    const searchForm = document.querySelector('form[name="gnb-search-form"]');
    const searchBox = document.querySelector('[data-stylex-owner="global-gnb-search-box"]');
    const listAllLink = document.querySelector(
      '[data-stylex-owner="global-gnb-nav"] a[href$="/projects"]',
    );
    if (
      !(navbar instanceof HTMLElement) ||
      !(searchForm instanceof HTMLElement) ||
      !(searchBox instanceof HTMLElement) ||
      !(listAllLink instanceof HTMLElement)
    ) {
      return null;
    }
    const navbarRect = navbar.getBoundingClientRect();
    const searchFormRect = searchForm.getBoundingClientRect();
    const searchBoxRect = searchBox.getBoundingClientRect();
    const listAllRect = listAllLink.getBoundingClientRect();
    return {
      listAll: {
        left: listAllRect.left,
        right: listAllRect.right,
        top: listAllRect.top,
      },
      navbar: {
        bottom: navbarRect.bottom,
        left: navbarRect.left,
        right: navbarRect.right,
        top: navbarRect.top,
      },
      searchBox: {
        bottom: searchBoxRect.bottom,
        left: searchBoxRect.left,
        right: searchBoxRect.right,
        top: searchBoxRect.top,
      },
      searchBoxDoesNotOverlapListAll: searchBoxRect.left >= listAllRect.right,
      searchForm: {
        bottom: searchFormRect.bottom,
        right: searchFormRect.right,
        top: searchFormRect.top,
      },
    };
  });
  expect(shellBoxes).not.toBeNull();
  expect(shellBoxes!.searchForm.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.searchForm.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.searchForm.right).toBeLessThanOrEqual(shellBoxes!.navbar.right);
  expect(shellBoxes!.searchBox.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.searchBox.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.listAll.left).toBeGreaterThan(shellBoxes!.navbar.left);
  expect(shellBoxes!.listAll.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.searchBoxDoesNotOverlapListAll).toBe(true);
  await expect
    .poll(() => siteSettingSidebarAnchorMarkers(page))
    .toEqual([
      { ariaCurrent: null, className: null, dataStatus: null },
      { ariaCurrent: null, className: null, dataStatus: null },
      { ariaCurrent: null, className: null, dataStatus: null },
      { ariaCurrent: null, className: null, dataStatus: null },
      { ariaCurrent: null, className: null, dataStatus: null },
      { ariaCurrent: null, className: null, dataStatus: null },
      { ariaCurrent: null, className: null, dataStatus: null },
      { ariaCurrent: null, className: null, dataStatus: null },
    ]);
  const diagnosticsLink = page.locator(".site-setting-nav a", { hasText: "Diagnostics" });
  await expect(diagnosticsLink).toHaveAttribute("href", `${basePath}/sites/diagnostic`);
  const routeSource = readFileSync("src/routes/sites/update.tsx", "utf8");
  expect(routeSource).toContain("showLegacyProjectHeaderLinks");
  expect(routeSource).toContain('<title>{t("title.siteSetting")}</title>');
  expect(routeSource).not.toContain("useLegacySiteUpdateDocumentTitle");
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain("useEffect");
  expect(routeSource).not.toContain('globalThis["document"]');
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("to={item.href}");
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
    EXPECTED_UPDATE_NO_UPDATE_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-update-sidebar";
  });
  await diagnosticsLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/diagnostic`);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Diagnostics");
  await expect(page.locator(".title_area h2")).toHaveText("Diagnostics");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-update-sidebar");
});

test("site admin update renders the legacy available-version branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isAvailable",
    releaseUrl: "https://example.test/yona-1.1.0",
    versionToUpdate: "1.1.0",
  });

  await page.goto(`${basePath}/sites/update`);
  await expect(page.locator("strong")).toHaveText("Yoram 1.1.0 is available");
  const updateSidebarLink = page.locator(".site-setting-nav li.active a");
  await expect(updateSidebarLink).toHaveText("Software Update1");
  await expect(updateSidebarLink.locator(".notification-badge")).toHaveText("1");
  await expect(page.locator("a.ybtn.ybtn-success")).toHaveText("Download");
  await expect(page.locator("a.ybtn.ybtn-success")).toHaveAttribute(
    "href",
    "https://example.test/yona-1.1.0",
  );
  await expect(page.locator("a.ybtn.ybtn-success")).not.toHaveAttribute("target", /.*/);
  await expect
    .poll(async () => downloadLinkDom(page))
    .toEqual({
      className: "ybtn ybtn-success",
      href: "https://example.test/yona-1.1.0",
      tagName: "A",
      target: null,
      text: "Download",
    });
  const routeSource = readFileSync("src/routes/sites/update.tsx", "utf8");
  expect(routeSource).not.toContain("<a href={response.releaseUrl");
  expect(routeSource).toContain("const releaseUrl = response.releaseUrl?.trim()");
  expect(routeSource).not.toContain("href={releaseUrl}");
  expect(routeSource).toContain("to={releaseUrl}");
  expect(routeSource).not.toContain("externalReleaseUrl");
  expect(routeSource).not.toContain("as never");
  expect(routeSource).not.toContain("reloadDocument");
  await expect(page.getByText("Current version is Yoram 1.0.0")).toBeVisible();
  await expect(page.getByText("You are using the latest version")).toHaveCount(0);
  expect(await updateAvailableMetrics(page)).toEqual({
    contentWidthRatio: 0.83,
    downloadButtonBackground: "rgb(255, 115, 50)",
    downloadButtonBorderColor: "rgb(233, 94, 1)",
    downloadButtonHeight: 30,
    downloadButtonMarginLeft: 0,
    downloadButtonPaddingInline: 24,
    downloadButtonTextColor: "rgb(255, 255, 255)",
    firstParagraphLineHeight: 20,
    sidebarWidthRatio: 0.15,
    strongFontWeight: "700",
    titleAreaMarginBottom: 29,
    titleAreaPaddingBottom: 8,
    titleLineHeight: 30,
  });
});

test("site admin update omits the download link when no Yoram release URL exists", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isAvailable",
    releaseUrl: null,
    versionToUpdate: "1.1.0",
  });

  await page.goto(`${basePath}/sites/update`);
  await expect(page.locator("strong")).toHaveText("Yoram 1.1.0 is available");
  await expect(page.locator("a.ybtn.ybtn-success")).toHaveCount(0);
  await expect(page.getByText("Download", { exact: true })).toHaveCount(0);
  const routeSource = readFileSync("src/routes/sites/update.tsx", "utf8");
  expect(routeSource).toContain("const releaseUrl = response.releaseUrl?.trim()");
  expect(routeSource).not.toContain("github.com/yona-projects/yona/releases/tag");
  await expect(page.getByText("Current version is Yoram 1.0.0")).toBeVisible();
  await expect(page.getByText("You are using the latest version")).toHaveCount(0);
});

test("site admin update renders the legacy error branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: "java.lang.IllegalStateException: update feed failed",
    message: "site.update.error",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/update`);
  await expect(
    page.getByText("Failed to check for updates because of the following error:"),
  ).toBeVisible();
  await expect(page.locator(".span10 pre")).toHaveText(
    "java.lang.IllegalStateException: update feed failed",
  );
  expect(await updateErrorMetrics(page)).toEqual({
    errorMessageLineHeight: 20,
    preBackground: "rgb(245, 245, 245)",
    preBorderRadius: 4,
    preBorderTopWidth: 1,
    preFontSize: 13,
    preLineHeight: 20,
    preMarginBottom: 10,
    prePaddingBlock: 20,
    prePaddingInline: 20,
    preWhiteSpace: "pre-wrap",
  });
});

async function updateAvailableMetrics(page: Page) {
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
    const firstParagraph = requireElement(".site-setting-wrap .span10 > p");
    const strong = requireElement(".site-setting-wrap .span10 > p strong");
    const downloadButton = requireElement(".site-setting-wrap a.ybtn.ybtn-success");

    const rowRect = row.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const titleAreaStyle = getComputedStyle(titleArea);
    const titleStyle = getComputedStyle(title);
    const firstParagraphStyle = getComputedStyle(firstParagraph);
    const strongStyle = getComputedStyle(strong);
    const downloadButtonStyle = getComputedStyle(downloadButton);
    const downloadButtonRect = downloadButton.getBoundingClientRect();

    return {
      contentWidthRatio: Number((contentRect.width / rowRect.width).toFixed(2)),
      downloadButtonBackground: downloadButtonStyle.backgroundColor,
      downloadButtonBorderColor: downloadButtonStyle.borderTopColor,
      downloadButtonHeight: Math.round(downloadButtonRect.height),
      downloadButtonMarginLeft: Math.round(parseFloat(downloadButtonStyle.marginLeft)),
      downloadButtonPaddingInline:
        Math.round(parseFloat(downloadButtonStyle.paddingLeft)) +
        Math.round(parseFloat(downloadButtonStyle.paddingRight)),
      downloadButtonTextColor: downloadButtonStyle.color,
      firstParagraphLineHeight: Math.round(parseFloat(firstParagraphStyle.lineHeight)),
      sidebarWidthRatio: Number((sidebarRect.width / rowRect.width).toFixed(2)),
      strongFontWeight: strongStyle.fontWeight,
      titleAreaMarginBottom: Math.round(parseFloat(titleAreaStyle.marginBottom)),
      titleAreaPaddingBottom: Math.round(parseFloat(titleAreaStyle.paddingBottom)),
      titleLineHeight: Math.round(parseFloat(titleStyle.lineHeight)),
    };
  });
}

async function downloadLinkDom(page: Page) {
  return page.locator(".site-setting-wrap a.ybtn.ybtn-success").evaluate((link) => ({
    className: link.getAttribute("class"),
    href: link.getAttribute("href"),
    tagName: link.tagName,
    target: link.getAttribute("target"),
    text: link.textContent?.trim() ?? "",
  }));
}

async function updateErrorMetrics(page: Page) {
  return page.evaluate(() => {
    const requireElement = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing element: ${selector}`);
      }
      return element;
    };

    const message = requireElement(".site-setting-wrap .span10 > p");
    const pre = requireElement(".site-setting-wrap .span10 pre");
    const messageStyle = getComputedStyle(message);
    const preStyle = getComputedStyle(pre);

    return {
      errorMessageLineHeight: Math.round(parseFloat(messageStyle.lineHeight)),
      preBackground: preStyle.backgroundColor,
      preBorderRadius: Math.round(parseFloat(preStyle.borderTopLeftRadius)),
      preBorderTopWidth: Math.round(parseFloat(preStyle.borderTopWidth)),
      preFontSize: Math.round(parseFloat(preStyle.fontSize)),
      preLineHeight: Math.round(parseFloat(preStyle.lineHeight)),
      preMarginBottom: Math.round(parseFloat(preStyle.marginBottom)),
      prePaddingBlock:
        Math.round(parseFloat(preStyle.paddingTop)) +
        Math.round(parseFloat(preStyle.paddingBottom)),
      prePaddingInline:
        Math.round(parseFloat(preStyle.paddingLeft)) +
        Math.round(parseFloat(preStyle.paddingRight)),
      preWhiteSpace: preStyle.whiteSpace,
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

async function siteSettingSidebarAnchorMarkers(page: Page) {
  return page.locator(".site-setting-nav a").evaluateAll((links) =>
    links.map((link) => ({
      ariaCurrent: link.getAttribute("aria-current"),
      className: link.getAttribute("class"),
      dataStatus: link.getAttribute("data-status"),
    })),
  );
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      const value = current.getAttribute(name) ?? "";
      if (
        name === "class" &&
        value.split(/\s+/u).includes("gnb-nav") &&
        current.matches('[data-stylex-owner="global-gnb-nav"]')
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
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
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      ),
      (element) => element.getAttribute("class"),
    ),
  );
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((source) => {
    const template = document.createElement("template");
    template.innerHTML = source;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      const value = current.getAttribute(name) ?? "";
      if (
        name === "class" &&
        value.split(/\s+/u).includes("gnb-nav") &&
        current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
        current.querySelector('form[name="gnb-search-form"]') !== null
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
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
