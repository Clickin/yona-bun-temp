import { expect, test, type Page } from "@playwright/test";

const EXPECTED_USER_FILES_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div>
        <ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul>
        <div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <ul class="nav nav-tabs">
      <li><a href="__BASE_PATH__/notifications">Notification</a></li>
      <li><a href="__BASE_PATH__/user/issues">My Issues</a></li>
      <li class="active"><a href="__BASE_PATH__/user/files">My Files</a></li>
      <li></li>
    </ul>
    <form action="__BASE_PATH__/user/files">
      <div class="user-file-search search search-bar">
        <input name="filter" class="textbox" type="text" placeholder="Search" value="avatar">
        <button type="submit" class="search-btn"><i class="yobicon-search"></i></button>
      </div>
    </form>
    <div class="attachment-files">
      <div class="attachment-files-header row">
        <div class="span1 header-preview">Preview</div><div class="span5 header-file-name">Filename</div><div class="span1 header-size">Size</div><div class="span1">Download</div><div class="span2 file-date">Date</div><div class="span4 header-location">Location</div>
      </div>
      <div class="attachment-file-detail row">
        <div class="file-preview span1"><a href="__BASE_PATH__/files/7" target="_blank"><img src="__BASE_PATH__/files/7"></a></div>
        <div class="span5 file-name"><a href="__BASE_PATH__/files/7" target="_blank"><i class="icon png-icon font-larger"></i>avatar.png</a></div>
        <div class="span1 file-size">12.3 kB</div>
        <div class="span1 file-download"><a href="__BASE_PATH__/files/7?action=download"><button type="button" class="ybtn"><i class="yobicon-cloud-download"></i></button></a></div>
        <div class="span2 file-date">2026-06-30 7:05 PM</div>
        <div class="span4 file-location"><a href="__BASE_PATH__/admin/sample/issue/1" target="_blank">/admin/sample/issue/1</a></div>
      </div>
    </div>
  </div>
  <div id="pagination"><a href="__BASE_PATH__/user/files?filter=avatar&pageNum=1">1</a><a href="__BASE_PATH__/user/files?filter=avatar&pageNum=2" class="active">2</a></div>
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
  await page.route("**/api/v1/workspace/files?filter=avatar&pageNum=2", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        files: [
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
        ],
        filter: "avatar",
        page: 2,
        pageSize: 50,
        total: 51,
        totalPages: 2,
      }),
    });
  });

  await page.goto(`${basePath}/user/files?filter=avatar&pageNum=2`);
  await expect(page.locator(".attachment-files")).toBeVisible();
  await expect(page.locator(".attachment-file-detail")).toHaveCount(1);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_USER_FILES_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);

  expect(await readUserFilesMetrics(page)).toEqual({
    attachmentFontSize: "13px",
    firstRowDisplay: "grid",
    footerPadding: "10px 0px",
    gnbOuterHeight: "40px",
    pageWrapMarginTop: "10px",
    searchMargin: "12px 0px 16px",
  });
});

async function readUserFilesMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const search = document.querySelector<HTMLElement>(".user-file-search");
    const files = document.querySelector<HTMLElement>(".attachment-files");
    const firstRow = document.querySelector<HTMLElement>(".attachment-files .row");
    const footer = document.querySelector<HTMLElement>(".page-footer-outer");
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
        "data-toggle",
        "data-placement",
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

    return Array.from(
      document.querySelectorAll(".unsupported, .gnb-outer, .page-wrap-outer, .page-footer-outer"),
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
          "data-toggle",
          "data-placement",
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
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
