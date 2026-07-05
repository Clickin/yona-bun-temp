import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_DATA_SCREEN = `
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
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" data-toggle="tooltip" title="Site administration" data-placement="bottom"><i class="yobicon-wrench"></i></a></li>
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
          <li class=""><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
        </ul>
      </div>
      <div class="span10">
        <div class="title_area">
          <h2 class="pull-left">Data</h2>
        </div>
        <div class="cu-desc">
          <ul>
            <li class="notice"><strong>Before importing or exporting data, you should block other user's access and only allow the site admin.</strong></li>
            <li class="notice"><strong>After clicking the export button please wait until the file download finishes.</strong></li>
            <li class="notice"><strong>Please backup database before import data, in some cases you can lose existing data.</strong></li>
          </ul>
        </div>
        <h3>Export</h3>
        <p>All data read from DB will be exported to a file.</p>
        <a href="__BASE_PATH__/sites/export" class="ybtn ybtn-primary"><strong>Export</strong></a>
        <h3>Import</h3>
        <p>Replace existing data with exported yobi data file.</p>
        <form action="__BASE_PATH__/sites/import" method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrfToken" value="csrf-site-data">
          <input type="file" name="data">
          <p><input type="submit"></p>
        </form>
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

test("site admin data matches legacy site/data.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page);

  await page.goto(`${basePath}/sites/data`);
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".span10 h2")).toHaveText("Data");
  await expectSiteAdminSidebar(page, basePath);
  const mailLink = page.locator(".site-setting-nav a", { hasText: "Send email" });
  await expect(mailLink).toHaveAttribute("href", `${basePath}/sites/mail`);
  await expect(
    page.locator(".site-setting-nav a", { hasText: "Send mass emails" }),
  ).toHaveAttribute("href", `${basePath}/sites/massmail`);
  const exportLink = page.locator("a.ybtn.ybtn-primary", { hasText: "Export" });
  await expect(exportLink).toHaveAttribute("href", `${basePath}/sites/export`);
  await expect(exportLink).toHaveAttribute("class", "ybtn ybtn-primary");
  await expect(exportLink).toHaveText("Export");
  await expect(page.locator('form[action$="/sites/import"]')).toHaveAttribute(
    "enctype",
    "multipart/form-data",
  );
  await expect(page.locator('input[type="hidden"][name="csrfToken"]')).toHaveValue(
    "csrf-site-data",
  );
  await expect(page.locator('input[type="file"][name="data"]')).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_DATA_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readSiteDataMetrics(page)).toEqual({
    contentColumnWidthRatio: 0.83,
    cuDescDisplay: "inline-block",
    exportButtonBackground: "rgb(255, 115, 50)",
    exportButtonBorderRadius: 3,
    exportButtonLineHeight: 20,
    exportButtonPaddingBlock: 8,
    exportButtonPaddingInline: 24,
    navAnchorDisplay: "block",
    navAnchorPaddingBlock: 10,
    navAnchorPaddingInline: 20,
    navFirstItemMarginTop: 0,
    navItemBorderLeftColor: "rgb(238, 238, 238)",
    navItemBorderLeftWidth: 4,
    navItemFontSize: 14,
    navItemLineHeight: 30,
    noticeColor: "rgb(219, 58, 103)",
    sidebarWidthRatio: 0.15,
    siteBreadcrumbHeadingLineHeight: 30,
    siteBreadcrumbHeadingPaddingBottom: 5,
    siteBreadcrumbHeadingPaddingTop: 10,
    titleAreaBorderBottomWidth: 1,
    titleAreaMarginBottom: 29,
    titleAreaPaddingBottom: 8,
    titleColor: "rgb(76, 76, 76)",
    titleFontSize: 19.5,
    titleLineHeight: 30,
  });

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-data-sidebar";
  });
  await mailLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/mail`);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Send email");
  await expect(page.locator(".title_area h2")).toHaveText("Send email");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-data-sidebar");
});

test("site admin data renders legacy update notification badge", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockAvailableUpdate(page);

  await page.goto(`${basePath}/sites/data`);
  const updateLink = page.locator(".site-setting-nav a", { hasText: "Software Update" });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator(".notification-badge")).toHaveText("1");
});

test("site admin data export link preserves legacy download href", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockMailOptions(page);

  await page.goto(`${basePath}/sites/data`);
  const exportLink = page.locator("a.ybtn.ybtn-primary", { hasText: "Export" });

  await expect(exportLink).toHaveAttribute("href", `${basePath}/sites/export`);
  await expect(exportLink).toHaveAttribute("class", "ybtn ybtn-primary");
  await expect(exportLink).toHaveText("Export");
});

test("site admin data source keeps export as legacy href without route escape", () => {
  const routeSource = readFileSync("src/routes/sites/data.tsx", "utf8");

  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("AnchorHTMLAttributes");
  expect(routeSource).not.toContain("ComponentType");
  expect(routeSource).not.toContain("to={item.href}");
  expect(routeSource).toContain("<Link");
  expect(routeSource).toContain('href={prefixBasePath(runtimeConfig.basePath, "/sites/export")}');
  expect(routeSource).toContain("reloadDocument");
  expect(routeSource).not.toContain("to={exportPath as never}");
  expect(routeSource).not.toContain('to={"/sites/export" as never}');
  expect(routeSource).not.toContain("as never");
  expect(routeSource).not.toMatch(/<a\b[\s\S]*\/sites\/export/u);
  expect(routeSource).toContain('to="/sites/export"');
});

async function expectSiteAdminSidebar(page: Page, basePath: string) {
  const links = page.locator(".site-setting-nav a");
  await expect(links).toHaveText([
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
      links.evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? "")),
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
  await expect(links).toHaveClass(["", "", "", "", "", "", "", ""]);
  await expect(page.locator(".site-setting-nav a[class]")).toHaveCount(0);
  await expect(page.locator(".site-setting-nav a[aria-current]")).toHaveCount(0);
  await expect(page.locator(".site-setting-nav a[data-status]")).toHaveCount(0);
  await expect(page.locator(".site-setting-nav li")).toHaveClass(["", "", "", "", "", "", "", ""]);
  await expect(page.locator(".site-setting-nav li.active")).toHaveCount(0);
}

async function mockSiteAdminSession(page: Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-data" },
      body: JSON.stringify({}),
    });
  });

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

async function mockAvailableUpdate(page: Page) {
  await page.route("**/api/v1/site/update", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        currentVersion: "1.0.0",
        error: null,
        message: "site.update.isAvailable",
        releaseUrl: "https://example.test/yona-1.1.0",
        versionToUpdate: "1.1.0",
      }),
    });
  });
}

async function mockMailOptions(page: Page) {
  await page.route("**/api/v1/site/mail", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        notConfiguredItems: ["smtp.host", "smtp.port"],
        sender: "noreply@example.com",
        sent: false,
      }),
    });
  });
}

async function readSiteDataMetrics(page: Page) {
  return page.evaluate(() => {
    const row = requireElement(".site-setting-wrap > .row-fluid");
    const sidebar = requireElement(".site-setting-wrap .span2");
    const content = requireElement(".site-setting-wrap .span10");
    const breadcrumbHeading = requireElement(".site-breadcrumb-inner h3");
    const cuDesc = requireElement(".cu-desc");
    const navItem = requireElement(".site-setting-nav li");
    const navAnchor = requireElement(".site-setting-nav li a");
    const notice = requireElement(".cu-desc .notice");
    const titleArea = requireElement(".title_area");
    const title = requireElement(".title_area h2");
    const exportButton = requireElement("a.ybtn.ybtn-primary");
    const rowRect = row.getBoundingClientRect();
    const breadcrumbHeadingStyle = getComputedStyle(breadcrumbHeading);
    const navItemStyle = getComputedStyle(navItem);
    const navAnchorStyle = getComputedStyle(navAnchor);
    const titleAreaStyle = getComputedStyle(titleArea);
    const titleStyle = getComputedStyle(title);
    const exportButtonStyle = getComputedStyle(exportButton);

    return {
      contentColumnWidthRatio: Number(
        (content.getBoundingClientRect().width / rowRect.width).toFixed(2),
      ),
      cuDescDisplay: getComputedStyle(cuDesc).display,
      exportButtonBackground: exportButtonStyle.backgroundColor,
      exportButtonBorderRadius: Math.round(parseFloat(exportButtonStyle.borderTopLeftRadius)),
      exportButtonLineHeight: Math.round(parseFloat(exportButtonStyle.lineHeight)),
      exportButtonPaddingBlock:
        Math.round(parseFloat(exportButtonStyle.paddingTop)) +
        Math.round(parseFloat(exportButtonStyle.paddingBottom)),
      exportButtonPaddingInline:
        Math.round(parseFloat(exportButtonStyle.paddingLeft)) +
        Math.round(parseFloat(exportButtonStyle.paddingRight)),
      navAnchorDisplay: navAnchorStyle.display,
      navAnchorPaddingBlock:
        Math.round(parseFloat(navAnchorStyle.paddingTop)) +
        Math.round(parseFloat(navAnchorStyle.paddingBottom)),
      navAnchorPaddingInline:
        Math.round(parseFloat(navAnchorStyle.paddingLeft)) +
        Math.round(parseFloat(navAnchorStyle.paddingRight)),
      navFirstItemMarginTop: Math.round(parseFloat(navItemStyle.marginTop)),
      navItemBorderLeftColor: navItemStyle.borderLeftColor,
      navItemBorderLeftWidth: Math.round(parseFloat(navItemStyle.borderLeftWidth)),
      navItemFontSize: Math.round(parseFloat(navItemStyle.fontSize)),
      navItemLineHeight: Math.round(parseFloat(navItemStyle.lineHeight)),
      noticeColor: getComputedStyle(notice).color,
      sidebarWidthRatio: Number((sidebar.getBoundingClientRect().width / rowRect.width).toFixed(2)),
      siteBreadcrumbHeadingLineHeight: Math.round(parseFloat(breadcrumbHeadingStyle.lineHeight)),
      siteBreadcrumbHeadingPaddingBottom: Math.round(
        parseFloat(breadcrumbHeadingStyle.paddingBottom),
      ),
      siteBreadcrumbHeadingPaddingTop: Math.round(parseFloat(breadcrumbHeadingStyle.paddingTop)),
      titleAreaBorderBottomWidth: Math.round(parseFloat(titleAreaStyle.borderBottomWidth)),
      titleAreaMarginBottom: Math.round(parseFloat(titleAreaStyle.marginBottom)),
      titleAreaPaddingBottom: Math.round(parseFloat(titleAreaStyle.paddingBottom)),
      titleColor: titleStyle.color,
      titleFontSize: Number(parseFloat(titleStyle.fontSize).toFixed(1)),
      titleLineHeight: Math.round(parseFloat(titleStyle.lineHeight)),
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
        "enctype",
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
        "enctype",
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
