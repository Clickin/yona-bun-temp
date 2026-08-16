import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const EXPECTED_USER_FILES_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <button class="pin" type="button" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></button>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
      <li class="divider"></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div>
        <ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button">Favorite</button></li><li class="myProjectList"><button type="button">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul>
        <div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <ul class="nav nav-tabs">
      <li><a href="__BASE_PATH__/notifications">Notification</a></li>
      <li><a href="__BASE_PATH__/user/issues?filter=assigned&amp;orderBy=updatedDate&amp;orderDir=desc&amp;pageNum=1&amp;state=open">My Issues</a></li>
      <li class="active"><a href="__BASE_PATH__/user/files">My Files</a></li>
      <li></li>
    </ul>
    <form action="__BASE_PATH__/user/files">
      <div class="user-file-search search search-bar">
        <input name="filter" class="textbox" type="text" placeholder="Search" value="">
        <button type="submit" class="search-btn"><i class="yobicon-search"></i></button>
      </div>
    </form>
    <div class="attachment-files">
      <div class="attachment-files-header row">
        <div class="span1 header-preview">Preview</div><div class="span5 header-file-name">Filename</div><div class="span1 header-size">Size</div><div class="span1">Download</div><div class="span2 file-date">Date</div><div class="span4 header-location">Location</div>
      </div>
      <div class="attachment-file-detail row">
        <div class="file-preview span1"><a href="__BASE_PATH__/files/7" target="_blank"><img src="__BASE_PATH__/files/7"></a></div>
        <div class="span5 file-name"><a href="__BASE_PATH__/files/7" target="_blank"><i class="icon image-icon light-orange font-larger"></i>avatar.png</a></div>
        <div class="span1 file-size">12.3 kB</div>
        <div class="span1 file-download"><a href="__BASE_PATH__/files/7?action=download"><button type="button" class="ybtn"><i class="yobicon-cloud-download"></i></button></a></div>
        <div class="span2 file-date">2026-06-30 7:05 PM</div>
        <div class="span4 file-location"><a href="__BASE_PATH__/admin/sample/issue/1" target="_blank">/admin/sample/issue/1</a></div>
      </div>
    </div>
  </div>
  <div id="pagination" class="page-navigation-wrap"><ul class="page-nums"><li class="page-num ikon"><a href="__BASE_PATH__/user/files?filter=avatar&amp;pageNum=1"><i class="ico btn-pg-prev"></i><span>Previous page</span></a></li><li class="page-num"><input class="input-mini nospinner" name="pageNum" type="number" value="2"></li><li class="page-num delimiter">/</li><li class="page-num">2</li><li class="page-num ikon"><span class="off">Next page</span><i class="ico btn-pg-next off"></i></li></ul></div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div>
</footer>
`;

test("current-user files page matches legacy user/userFiles.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
  await page.route("**/api/v1/workspace/files**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const filter = requestUrl.searchParams.get("filter") ?? "";
    const pageNum = Number(requestUrl.searchParams.get("pageNum") ?? "1");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        files:
          filter === "avatar" && pageNum === 2
            ? [
                {
                  containerId: 1,
                  containerType: "ISSUE_POST",
                  createdLabel: "2026-06-30 7:05 PM",
                  downloadUrl: "/files/7?action=download",
                  id: 7,
                  locationHref: "/admin/sample/issue/1",
                  locationLabel: "/admin/sample/issue/1",
                  mimeType: "image/png",
                  name: "avatar.png",
                  previewUrl: "/files/7",
                  size: 12345,
                  sizeLabel: "12.3 kB",
                  url: "/files/7",
                },
              ]
            : [],
        filter,
        page: pageNum,
        pageSize: 50,
        total: filter === "avatar" ? 51 : 0,
        totalPages: 2,
      }),
    });
  });

  await page.goto(`${basePath}/user/files?filter=avatar&pageNum=2`);
  await expect(page).toHaveTitle("My Files");
  await expect(
    page.locator('head link[rel="stylesheet"][href$="/assets/stylesheets/filetype.css"]'),
  ).toHaveAttribute("media", "all");
  await expect(
    page.locator('head link[rel="stylesheet"][href$="/assets/stylesheets/filetype.css"]'),
  ).toHaveAttribute("type", "text/css");
  await expect(page.locator(".attachment-files")).toBeVisible();
  await expect(page.locator(".attachment-file-detail")).toHaveCount(1);
  const fileRow = page.locator(".attachment-file-detail").first();
  await expect(fileRow).toHaveClass(/attachment-file-detail row/);
  await fileRow.hover();
  await expect(fileRow).toHaveClass(/attachment-file-detail row hover/);
  await page.locator(".attachment-files-header").hover();
  await expect(fileRow).toHaveClass(/attachment-file-detail row/);
  await expect(page.locator('[data-owner="user-files-search-input"]')).toHaveAttribute("value", "");
  await expect(page.locator('[data-owner="user-files-search-input"]')).toHaveValue("");

  const previewLink = page.locator(".attachment-file-detail .file-preview > a");
  await expect(previewLink).toHaveAttribute("href", `${basePath}/files/7`);
  await expect(previewLink).toHaveAttribute("target", "_blank");
  await expect(previewLink).not.toHaveAttribute("class", /./);
  await expect(previewLink).not.toHaveAttribute("data-status", /./);
  await expect(previewLink.locator("img")).toHaveAttribute("src", `${basePath}/files/7`);

  const fileNameLink = page.locator(".attachment-file-detail .file-name > a");
  await expect(fileNameLink).toHaveAttribute("href", `${basePath}/files/7`);
  await expect(fileNameLink).toHaveAttribute("target", "_blank");
  await expect(fileNameLink).not.toHaveAttribute("class", /./);
  await expect(fileNameLink).not.toHaveAttribute("data-status", /./);
  await expect(fileNameLink).toHaveText("avatar.png");
  await expect(fileNameLink.locator("i")).toHaveClass(/icon image-icon light-orange font-larger/);

  const downloadLink = page.locator(".attachment-file-detail .file-download > a");
  await expect(downloadLink).toHaveAttribute("href", `${basePath}/files/7?action=download`);
  await expect(downloadLink).not.toHaveAttribute("target", /./);
  await expect(downloadLink).not.toHaveAttribute("class", /./);
  await expect(downloadLink).not.toHaveAttribute("data-status", /./);
  await expect(downloadLink.locator("button")).toHaveClass(/ybtn/);

  const locationLink = page.locator(".attachment-file-detail .file-location > a");
  await expect(locationLink).toHaveAttribute("href", `${basePath}/admin/sample/issue/1`);
  await expect(locationLink).toHaveAttribute("target", "_blank");
  await expect(locationLink).not.toHaveAttribute("class", /./);
  await expect(locationLink).not.toHaveAttribute("data-status", /./);
  await expect(locationLink).toHaveText("/admin/sample/issue/1");

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_USER_FILES_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);

  expect(await readUserFilesMetrics(page)).toEqual({
    attachmentFontSize: "13px",
    firstRowDisplay: "grid",
    footerPadding: "10px",
    gnbOuterHeight: "40px",
    pageWrapMarginTop: "10px",
    searchMargin: "0px 0px 10px",
  });

  await expect(page.locator(".page-wrap > .nav-tabs > li")).toHaveClass(["", "", "active", ""]);
  await expect(page.locator('.page-wrap > .nav-tabs a:has-text("Notification")')).toHaveAttribute(
    "href",
    `${basePath}/notifications`,
  );
  await expect(page.locator('.page-wrap > .nav-tabs a:has-text("My Issues")')).toHaveAttribute(
    "href",
    `${basePath}/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=1&state=open`,
  );
  await expect(page.locator('.page-wrap > .nav-tabs a:has-text("My Files")')).toHaveAttribute(
    "href",
    `${basePath}/user/files`,
  );
  for (const tabText of ["Notification", "My Issues", "My Files"]) {
    await expectLegacyPlainAnchor(page.locator(".page-wrap > .nav-tabs a", { hasText: tabText }));
  }
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "files-my-issues";
  });
  await page.locator('.page-wrap > .nav-tabs a:has-text("My Issues")').click();
  await expect(page).toHaveURL(/\/user\/issues/);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/user/issues`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("files-my-issues");

  await page.goto(`${basePath}/user/files?filter=avatar&pageNum=2`);
  const pagination = page.locator("#pagination");
  // the pagination is style-owned (data-owner, no legacy classes in the real
  // DOM — ownership contract); canonicalizeScreenRoots injects the legacy
  // classes for the DOM-parity compare. Behavior pins use the owners.
  await expect(pagination).not.toHaveClass(/page-navigation-wrap/);
  await expect(pagination.locator('[data-owner="user-files-pagination-list"]')).toHaveCount(1);
  await expect(pagination.locator('[data-owner="user-files-pagination-item"]')).toHaveCount(5);
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(
    pagination.locator(
      '[data-owner="user-files-pagination-item"][data-pagination-variant="delimiter"]',
    ),
  ).toHaveText("/");
  await expect(pagination.locator('[data-owner="user-files-pagination-item"]').nth(3)).toHaveText(
    "2",
  );
  await expect(
    pagination.locator('[data-owner="user-files-pagination-icon"][data-disabled]'),
  ).toHaveCount(1);
  await expect(
    pagination.locator('[data-owner="user-files-pagination-label"][data-disabled]'),
  ).toHaveText("Next page");
  const prevHref = await pagination.locator("a", { hasText: "Previous page" }).getAttribute("href");
  expect(prevHref).not.toBeNull();
  const prevUrl = new URL(prevHref ?? "", page.url());
  expect(prevUrl.pathname).toBe(`${basePath}/user/files`);
  expect(prevUrl.searchParams.get("filter")).toBe("avatar");
  expect(prevUrl.searchParams.get("pageNum")).toBe("1");
  await expect(pagination.locator("a[href][aria-current]")).toHaveCount(0);
  await expectLegacyPlainAnchor(pagination.locator("a", { hasText: "Previous page" }));
  await expect(
    pagination.locator('[data-owner="user-files-pagination-item"]').nth(1).locator("a"),
  ).toHaveCount(0);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "files-page-1";
  });
  await pagination.locator("a", { hasText: "Previous page" }).click();
  await expect(page).toHaveURL(`${basePath}/user/files?filter=avatar&pageNum=1`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("files-page-1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
  await expect(
    pagination.locator('[data-owner="user-files-pagination-icon"][data-disabled]'),
  ).toHaveCount(1);
  const nextHref = await pagination.locator("a", { hasText: "Next page" }).getAttribute("href");
  expect(nextHref).not.toBeNull();
  const nextUrl = new URL(nextHref ?? "", page.url());
  expect(nextUrl.pathname).toBe(`${basePath}/user/files`);
  expect(nextUrl.searchParams.get("filter")).toBe("avatar");
  expect(nextUrl.searchParams.get("pageNum")).toBe("2");
  await expect(
    pagination.locator('[data-owner="user-files-pagination-item"]').first(),
  ).not.toHaveClass(/page-num/);
  await expect(
    pagination.locator('[data-owner="user-files-pagination-item"]').first().locator("a"),
  ).toHaveCount(0);
  await expectLegacyPlainAnchor(pagination.locator("a", { hasText: "Next page" }));

  await pagination.locator('input[name="pageNum"]').click();
  await pagination.locator('input[name="pageNum"]').fill("9");
  await pagination.locator('input[name="pageNum"]').press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");

  const pageTwoUrl = page.url();
  await pagination.locator('input[name="pageNum"]').fill("1.5");
  await pagination.locator('input[name="pageNum"]').press("Enter");
  await expect(page).toHaveURL(pageTwoUrl);
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");

  await page.goto(`${basePath}/user/files?filter=avatar&pageNum=2`);
  await page.locator('[data-owner="user-files-search-input"]').fill("fresh");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "files-search";
  });
  await page.locator('[data-owner="user-files-search-action"]').click();
  await expect(page).toHaveURL(`${basePath}/user/files?filter=fresh&pageNum=1`);
  await expect(page.locator('[data-owner="user-files-search-input"]')).toHaveValue("");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("files-search");
});

test("current-user files leaves location cell empty when source URL is missing", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
  await page.route("**/api/v1/workspace/files**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        files: [
          {
            containerId: 0,
            containerType: "ISSUE_POST",
            createdLabel: "2026-07-04 9:15 AM",
            downloadUrl: "/files/8?action=download",
            id: 8,
            locationHref: null,
            locationLabel: "",
            mimeType: "text/plain",
            name: "detached.txt",
            previewUrl: "/files/8",
            size: 42,
            sizeLabel: "42 B",
            url: "/files/8",
          },
          {
            containerId: 1,
            containerType: "ISSUE_POST",
            createdLabel: "2026-07-04 9:16 AM",
            downloadUrl: "/files/9?action=download",
            id: 9,
            locationHref: "/admin/sample/issue/1",
            locationLabel: "/admin/sample/issue/1",
            mimeType: "text/plain",
            name: "attached.txt",
            previewUrl: "/files/9",
            size: 43,
            sizeLabel: "43 B",
            url: "/files/9",
          },
        ],
        filter: "",
        page: 1,
        pageSize: 50,
        total: 2,
        totalPages: 1,
      }),
    });
  });

  await page.goto(`${basePath}/user/files`);
  await expect(page.locator(".attachment-file-detail")).toHaveCount(2);
  const pagination = page.locator("#pagination");
  await expect(pagination).not.toHaveClass(/page-navigation-wrap/u);
  await expect(pagination).toBeEmpty();

  const missingLocationCell = page
    .locator(".attachment-file-detail")
    .first()
    .locator(".file-location");
  await expect(missingLocationCell).toBeEmpty();
  await expect(missingLocationCell.locator("a")).toHaveCount(0);
  await expect(
    page.locator(".attachment-file-detail").first().locator(".file-preview img"),
  ).toHaveCount(0);
  const textFileIcon = page.locator(".attachment-file-detail").first().locator(".file-name i");
  await expect(textFileIcon).toHaveClass(/icon text-icon medium-blue font-larger/);

  const normalLocationLink = page
    .locator(".attachment-file-detail")
    .nth(1)
    .locator(".file-location > a");
  await expect(normalLocationLink).toHaveAttribute("href", `${basePath}/admin/sample/issue/1`);
  await expect(normalLocationLink).toHaveAttribute("target", "_blank");
  await expect(normalLocationLink).toHaveText("/admin/sample/issue/1");
});

test("current-user files route uses direct typed links for tabs and pagination", () => {
  const routeSource = readFileSync("src/routes/user/files.tsx", "utf8");
  expect(routeSource).not.toContain("LegacyInternalLink");
});

test("current-user files route renders legacy browser title without DOM mutation", () => {
  const routeSource = readFileSync("src/routes/user/files.tsx", "utf8");
  const screenSource = routeSource.match(
    /function UserFilesScreen[\s\S]*?\n}\n\nfunction UserFileRow/,
  )?.[0];
  expect(screenSource).toBeTruthy();
  expect(screenSource).toContain('<title>{t("user.files")}</title>');
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain("globalThis.document");
  expect(routeSource).not.toContain('globalThis["document"]');
  expect(routeSource).not.toMatch(/\buseEffect\b[\s\S]*?\btitle\b/u);
});

test("current-user files route owns legacy filetype stylesheet asset", () => {
  const routeSource = readFileSync("src/routes/user/files.tsx", "utf8");
  expect(routeSource).toContain('media="all"');
  expect(routeSource).toContain('precedence="legacy-filetype"');
  expect(routeSource).toContain(
    'href={prefixBasePath(basePath, "/assets/stylesheets/filetype.css")}',
  );
});

test("current-user files row uses href semantics for backend file URLs", () => {
  const routeSource = readFileSync("src/routes/user/files.tsx", "utf8");
  const rowSource = routeSource.match(
    /function UserFileRow[\s\S]*?\n}\n\nfunction Pagination/,
  )?.[0];
  expect(rowSource).toBeTruthy();
  expect(rowSource).not.toContain("<a ");
  expect(rowSource).not.toContain(" as never");
  expect(rowSource?.match(/<Link href=\{/g)).toHaveLength(4);
  expect(rowSource?.match(/\breloadDocument\b/g)).toHaveLength(4);
  expect(rowSource).toContain('<Link href={fileHref} reloadDocument target="_blank" to={fileTo}>');
  expect(rowSource).toContain("<Link href={downloadHref} reloadDocument to={downloadTo}>");
  expect(rowSource).toContain(
    '<Link href={locationHref} reloadDocument target="_blank" to={locationTo}>',
  );
});

async function readUserFilesMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const search = document.querySelector<HTMLElement>('[data-owner="user-files-search"]');
    const files = document.querySelector<HTMLElement>(".attachment-files");
    const firstRow = document.querySelector<HTMLElement>(".attachment-files .row");
    const footer = document.querySelector<HTMLElement>("[data-owner=site-footer]");
    if (!gnbOuter || !pageWrapOuter || !search || !files || !firstRow || !footer) {
      throw new Error("Expected user files metric targets are missing.");
    }
    return {
      attachmentFontSize: getComputedStyle(files).fontSize,
      firstRowDisplay: getComputedStyle(firstRow).display,
      footerPadding: getComputedStyle(footer).padding,
      gnbOuterHeight: getComputedStyle(gnbOuter).height,
      pageWrapMarginTop: getComputedStyle(pageWrapOuter).marginTop,
      searchMargin: getComputedStyle(search).margin,
    };
  });
}

async function expectLegacyPlainAnchor(locator: Locator) {
  await expect(locator).not.toHaveAttribute("class", /./);
  await expect(locator).not.toHaveAttribute("aria-current", /./);
  await expect(locator).not.toHaveAttribute("data-status", /./);
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
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
        "placeholder",
        "href",
        "target",
        "title",
        "data-placement",
      ];
      const attrs = stableAttributes
        .filter(
          (name) =>
            current.hasAttribute(name) ||
            (name === "class" && filesOwnerClassName(current) !== null),
        )
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      if (current.id === "usermenu-tab-content-list") {
        return `${open}Loading...</${current.tagName.toLowerCase()}>`;
      }
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
    function filesOwnerClassName(current: Element): string | null {
      const owner = current.getAttribute("data-owner");
      if (owner === "user-files-search") return "user-file-search search search-bar";
      if (owner === "user-files-search-input") return "textbox";
      if (owner === "user-files-search-action") return "search-btn";
      if (owner === "user-files-pagination") return "page-navigation-wrap";
      if (owner === "user-files-pagination-list") return "page-nums";
      if (owner === "user-files-pagination-item") {
        const variant = current.getAttribute("data-pagination-variant");
        if (variant === "icon") return "page-num ikon";
        if (variant === "delimiter") return "page-num delimiter";
        return "page-num";
      }
      if (owner === "user-files-pagination-input") return "input-mini nospinner";
      if (owner === "user-files-pagination-icon") {
        const disabled = current.hasAttribute("data-disabled");
        const isNext =
          current.closest("li")?.querySelector("span") !== null &&
          current.previousElementSibling?.tagName === "SPAN";
        const base = isNext ? "ico btn-pg-next" : "ico btn-pg-prev";
        return disabled ? `${base} off` : base;
      }
      if (owner === "user-files-pagination-label") {
        return current.hasAttribute("data-disabled") ? "off" : null;
      }
      return null;
    }
    function normalizeAttribute(current: Element, name: string): string {
      if (name === "class") {
        const className = filesOwnerClassName(current);
        if (className !== null) return `class="${className}"`;
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
      if (
        name === "class" &&
        current.classList.contains("gnb-nav") &&
        current.matches('[data-owner="global-gnb-nav"]')
      ) {
        const originalValue = current.getAttribute(name) ?? "";
        current.setAttribute(
          name,
          originalValue
            .split(/\s+/u)
            .filter((token) => token !== "gnb-nav")
            .join(" "),
        );
        try {
          return normalizeAttribute(current, name);
        } finally {
          current.setAttribute(name, originalValue);
        }
      }
      if (name === "class") {
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/)
          .filter((value, index, values) => value && values.indexOf(value) === index)
          .filter(
            (value) =>
              !(
                value === "active" &&
                current.tagName.toLowerCase() === "a" &&
                current.closest(".page-wrap .nav-tabs")
              ),
          )
          .filter(
            (value) =>
              value !== "gray-txt" &&
              value !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(value) &&
              !value.includes("__"),
          )
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      if (name === "title" && current.closest(".gnb-usermenu") !== null) {
        return "";
      }
      if (
        (name === "data-toggle" || name === "data-placement") &&
        current.classList.contains("usermenu-icon-button")
      ) {
        return "";
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
    }

    return Array.from(
      document.querySelectorAll(
        ".unsupported, [data-owner=global-gnb-outer], .page-wrap-outer, [data-owner=site-footer]",
      ),
    )
      .map((root) => visit(root))
      .join("");
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
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
          "placeholder",
          "href",
          "target",
          "title",
          "data-placement",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => normalizeAttribute(current, name))
          .filter(Boolean)
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
      function normalizeAttribute(current: Element, name: string): string {
        const value = current.getAttribute(name) ?? "";
        const isSiteLayoutHeader =
          name === "class" &&
          current.classList.contains("gnb-outer") &&
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
              : isSiteLayoutHeader && current.classList.contains("project-header")
                ? "project-header"
                : isSiteLayoutHeader
                  ? "gnb-outer"
                  : name === "class" &&
                      current.classList.contains("gnb-inner") &&
                      current.matches("header.gnb-outer > div.gnb-inner") &&
                      current.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-inner"
                    : name === "class" &&
                        current.classList.contains("gnb-nav") &&
                        current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                        current.querySelector('form[name="gnb-search-form"]') !== null
                      ? "gnb-nav"
                      : null;
        if (retiredToken) {
          const originalValue = current.getAttribute(name) ?? "";
          current.setAttribute(
            name,
            originalValue
              .split(/\s+/u)
              .filter((token) => token !== retiredToken)
              .join(" "),
          );
          try {
            return normalizeAttribute(current, name);
          } finally {
            current.setAttribute(name, originalValue);
          }
        }
        if (name === "class") {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/)
            .filter((value, index, values) => value && values.indexOf(value) === index)
            .filter(
              (value) =>
                !(
                  value === "active" &&
                  current.tagName.toLowerCase() === "a" &&
                  current.closest(".page-wrap .nav-tabs")
                ),
            )
            .filter(
              (value) =>
                value !== "gray-txt" &&
                value !== "right-txt" &&
                !/^x[0-9a-z]+$/u.test(value) &&
                !value.includes("__"),
            )
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
