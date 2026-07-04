import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_ORGANIZATION_PULLREQUESTS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li><li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/organization_default_logo.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/organization_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author"><span class="group-title-head">group</span><a href="__BASE_PATH__/organizations/weblabs">weblabs</a></span></div></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/organizations/weblabs">Group Home</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/issues">Issue</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/boards">Board</a></li><li class="active"><a href="__BASE_PATH__/organizations/weblabs/pullrequests">Pull request</a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform"><i class="yobicon-cog"></i><span class="blind">Project configuration</span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div pjax-container="" class="row-fluid cb"><div class="left-menu span2 search-wrap hide-in-mobile" style="padding-top:0px"><form id="search" name="search" action="__BASE_PATH__/organizations/weblabs/pullrequests" method="get"><div class="search"><div class="search-bar"><input name="filter" class="textbox full" type="text" value="fix"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></div></form></div><div class="span10 span-hard-wrap" id="span10"><ul class="nav nav-tabs nm pullrequeset-tab-menu"><li class="active"><button type="button" data-url="__BASE_PATH__/organizations/weblabs/pullrequests" data-type="state">Open<span class="num-badge">1</span></button></li><li class=""><button type="button" data-url="__BASE_PATH__/organizations/weblabs/closedPullrequests" data-type="state">Closed<span class="num-badge">2</span></button></li></ul><div class="tab-content" style="clear:both;padding-top:15px"><div id="list" class="row-fluid tab-pane active"><ul class="post-list-wrap"><li class="post-item title" href="__BASE_PATH__/weblabs/sample/pullRequest/3"><div class="span10 span-hard-wrap"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png"></a><div class="title-wrap"><span class="post-id">3</span><a href="__BASE_PATH__/weblabs/sample/pullRequest/3" class="title ">Fix login redirect</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><a href="__BASE_PATH__/weblabs/sample" class="infos-link-item group-project-name">sample</a><div class="infos-item" style="margin-right:20px"><i class="infos-icon yobicon-post2 vmiddle"></i><div class="upload-progress"><div class="bar orange" style="width:50%"></div></div><a href="__BASE_PATH__/weblabs/sample/pullRequest/3/changes" data-toggle="tooltip" title="Closed review / Total review"><span>1</span><span class="gray-txt">/</span><span class="size total">2</span></a></div></div></div><div class="span2 hide-in-mobile"><div class="mt5 pull-right hide-in-mobile"><a href="__BASE_PATH__/admin" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="" data-original-title="Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li><div id="pagination" class="page-navigation-wrap"><ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li><li class="page-num"><input class="input-mini nospinner" max="2" min="1" name="pageNum" pattern="[0-9]*" type="number" value="1"></li><li class="page-num delimiter">/</li><li class="page-num">2</li><li class="page-num ikon"><a href="__BASE_PATH__/organizations/weblabs/pullrequests?filter=fix&amp;pageNum=2"><span>Next page</span><i class="ico btn-pg-next"></i></a></li></ul></div></ul></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_ORGANIZATION_CLOSED_PULLREQUESTS = EXPECTED_ORGANIZATION_PULLREQUESTS.replace(
  'action="__BASE_PATH__/organizations/weblabs/pullrequests"',
  'action="__BASE_PATH__/organizations/weblabs/closedPullrequests"',
)
  .replace('value="fix"', 'value="done"')
  .replace(
    '<li class="active"><button type="button" data-url="__BASE_PATH__/organizations/weblabs/pullrequests" data-type="state">Open<span class="num-badge">1</span></button></li><li class=""><button type="button" data-url="__BASE_PATH__/organizations/weblabs/closedPullrequests" data-type="state">Closed<span class="num-badge">2</span></button></li>',
    '<li class=""><button type="button" data-url="__BASE_PATH__/organizations/weblabs/pullrequests" data-type="state">Open<span class="num-badge">1</span></button></li><li class="active"><button type="button" data-url="__BASE_PATH__/organizations/weblabs/closedPullrequests" data-type="state">Closed<span class="num-badge">2</span></button></li>',
  )
  .replaceAll("/pullRequest/3", "/pullRequest/4")
  .replaceAll(">3<", ">4<")
  .replace("Fix login redirect", "Ship release")
  .replace(
    "/organizations/weblabs/pullrequests?filter=fix&amp;pageNum=2",
    "/organizations/weblabs/closedPullrequests?filter=done&amp;pageNum=2",
  )
  .replaceAll("Jul 1, 2026", "Jul 2, 2026")
  .replace('style="width:50%"', 'style="width:100%"')
  .replace("<span>1</span>", "<span>2</span>")
  .replace('state open pull-right">Open', 'state merged pull-right">Merged');

function expectedOrganizationPullRequestsEmpty() {
  const listStart = EXPECTED_ORGANIZATION_PULLREQUESTS.indexOf('<li class="post-item title" href=');
  const listEnd = EXPECTED_ORGANIZATION_PULLREQUESTS.indexOf("</ul>", listStart);
  return `${EXPECTED_ORGANIZATION_PULLREQUESTS.slice(0, listStart)
    .replace('value="fix"', 'value="empty"')
    .replace('<span class="num-badge">1</span>', '<span class="num-badge">0</span>')
    .replace(
      '<span class="num-badge">2</span>',
      '<span class="num-badge">0</span>',
    )}<div class="error-wrap"><i class="ico ico-err1"></i><p>No pull requests have been received</p></div>${EXPECTED_ORGANIZATION_PULLREQUESTS.slice(
    listEnd,
  )}`;
}

test("organization pull request aggregate matches legacy group_pullrequest_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationPullRequests(page);

  await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=fix`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Pull request");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_PULLREQUESTS.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("organization pull request aggregate empty state matches legacy group_pullrequest_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationPullRequests(page);

  await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=empty`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".error-wrap")).toHaveText("No pull requests have been received");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap #pagination")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedOrganizationPullRequestsEmpty().replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("organization closed pull request aggregate matches legacy group_pullrequest_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationPullRequests(page);

  await page.goto(`${basePath}/organizations/weblabs/closedPullrequests?filter=done`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Pull request");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_CLOSED_PULLREQUESTS.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("organization pull request breadcrumb organization link keeps legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationPullRequests(page);

  await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=fix`);
  const breadcrumbLink = page.locator(".project-breadcrumb .project-author > a");
  await expect(breadcrumbLink).toHaveText("weblabs");
  await expect(breadcrumbLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(breadcrumbLink).not.toHaveAttribute("aria-current", /.*/u);
  await expect(breadcrumbLink).not.toHaveAttribute("data-status", /.*/u);
  await expect(breadcrumbLink).not.toHaveAttribute("class", /.*/u);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await breadcrumbLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#mylist-filter")).toBeVisible();
});

test("organization pull request closed tab preserves legacy data-url with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationPullRequestNativeLinkAudit(page);
  await mockOrganizationPullRequests(page);

  await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=fix`);
  await expect.poll(() => readOrganizationPullRequestNativeLinkAudit(page)).toEqual([]);
  await expect(page.locator('.pullrequeset-tab-menu a[href="#"]')).toHaveCount(0);
  const closedTab = page.locator(".pullrequeset-tab-menu button").filter({ hasText: "Closed" });
  await expect(closedTab).toHaveAttribute("type", "button");
  await expect(closedTab).toHaveAttribute("data-type", "state");
  await expect(closedTab).toHaveAttribute(
    "data-url",
    `${basePath}/organizations/weblabs/closedPullrequests`,
  );
  await expect(closedTab).toHaveText("Closed2");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await closedTab.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/closedPullrequests`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".pullrequeset-tab-menu li.active button")).toHaveText("Closed2");
  await expect(page.locator("#search")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/closedPullrequests`,
  );
  expect(await readOrganizationPullRequestNativeLinkAudit(page)).toEqual([]);
});

test("organization pull request pagination matches legacy link and input behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationPullRequests(page);

  await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=fix&pageNum=1`);
  const pagination = page.locator(".post-list-wrap #pagination");
  await expect(pagination).toHaveClass("page-navigation-wrap");
  await expect(pagination.locator("ul.page-nums > li.page-num")).toHaveCount(5);
  await expect(pagination.locator(".btn-pg-prev.off")).toHaveCount(1);
  await expect(pagination.locator(".page-num").nth(1).locator("input")).toHaveAttribute(
    "name",
    "pageNum",
  );
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
  await expect(pagination.locator(".page-num.delimiter")).toHaveText("/");
  await expect(pagination.locator(".page-num").nth(3)).toHaveText("2");
  await expect(pagination.locator(".page-num.ikon").last().locator("a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/pullrequests?filter=fix&pageNum=2`,
  );

  const input = pagination.locator('input[name="pageNum"]');
  await input.evaluate((element) => {
    const inputElement = element as HTMLInputElement;
    inputElement.value = "not-a-page";
    inputElement.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
  });
  await expect(page).toHaveURL(
    `${basePath}/organizations/weblabs/pullrequests?filter=fix&pageNum=1`,
  );
  await expect(input).toHaveValue("1");

  await input.fill("9");
  await input.press("Enter");
  await expect(page).toHaveURL(
    `${basePath}/organizations/weblabs/pullrequests?filter=fix&pageNum=2`,
  );
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("2");
  await expect(page.locator("#pagination .page-num.ikon").first().locator("a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/pullrequests?filter=fix&pageNum=1`,
  );
  await expect(page.locator("#pagination .btn-pg-next.off")).toHaveCount(1);

  await page.goto(`${basePath}/organizations/weblabs/closedPullrequests?filter=done&pageNum=1`);
  await expect(page.locator("#pagination .page-num.ikon").last().locator("a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/closedPullrequests?filter=done&pageNum=2`,
  );
});

test("organization pullrequests menu board link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationPullRequestNativeLinkAudit(page);
  await mockOrganizationPullRequests(page);

  await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=fix`);
  await expect.poll(() => readOrganizationPullRequestNativeLinkAudit(page)).toEqual([]);
  await expect(page.locator(".project-menu-gruop a[data-status]")).toHaveCount(0);
  await expect(page.locator(".project-setting a[data-status]")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/issues`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(2)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(3)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/pullrequests`,
  );
  await expect(page.locator(".project-setting a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );
  const boardLink = page.locator(".project-menu-gruop a").filter({ hasText: "Board" });
  await expect(boardLink).toHaveAttribute("href", `${basePath}/organizations/weblabs/boards`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await boardLink.click();

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe(`${basePath}/organizations/weblabs/boards`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Board");
  await expect(page.locator("#option_form")).toBeVisible();
  expect(await readOrganizationPullRequestNativeLinkAudit(page)).toEqual([]);
});

test("organization pull request row links preserve legacy hrefs with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationPullRequests(page);

  await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=fix`);

  await expect(page.locator(".post-item .avatar-wrap.mlarge")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator(".title-wrap a.title")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/pullRequest/3`,
  );
  await expect(page.locator(".infos > a.infos-item")).toHaveAttribute("href", `${basePath}/dev`);
  await expect(page.locator(".group-project-name")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample`,
  );
  await expect(page.locator('.infos-item a[data-toggle="tooltip"]')).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/pullRequest/3/changes`,
  );
  await expect(page.locator(".avatar-wrap.assinee")).toHaveAttribute("href", `${basePath}/admin`);

  await expectOrganizationPullRequestSpaClick(
    page,
    ".title-wrap a.title",
    `${basePath}/weblabs/sample/pullRequest/3`,
    "organization-pr-title",
  );
  await expectOrganizationPullRequestSpaClick(
    page,
    ".infos > a.infos-item",
    `${basePath}/dev`,
    "organization-pr-contributor",
  );
  await expectOrganizationPullRequestSpaClick(
    page,
    ".group-project-name",
    `${basePath}/weblabs/sample`,
    "organization-pr-project",
  );
  await expectOrganizationPullRequestSpaClick(
    page,
    '.infos-item a[data-toggle="tooltip"]',
    `${basePath}/weblabs/sample/pullRequest/3/changes`,
    "organization-pr-changes",
  );
});

test("organization pull request title prefix filters the current legacy list", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationPullRequests(page);

  await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=prefix-source`);
  const prefix = page.locator(".title-wrap .title-prefix");
  await expect(prefix).toHaveText("[UI]");
  await expect(page.locator(".title-wrap a.title")).toHaveText("Fix login redirect");
  await expect(prefix).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/pullrequests?filter=%5BUI%5D&pageNum=1`,
  );
  await expect(prefix).not.toHaveAttribute("href", /javascript/u);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await prefix.click();

  await expect
    .poll(() => {
      const url = new URL(page.url());
      return {
        filter: url.searchParams.get("filter"),
        pathname: url.pathname,
      };
    })
    .toEqual({
      filter: "[UI]",
      pathname: `${basePath}/organizations/weblabs/pullrequests`,
    });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization pull request route source keeps direct typed row links", async () => {
  const source = await readFile(
    "src/routes/organizations/$organizationName/pullrequests.tsx",
    "utf8",
  );
  const headerBreadcrumb = source.match(
    /<span className="project-author">[\s\S]*?<\/span>\s*<\/div>\s*<\/div>/u,
  )?.[0];

  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("OrganizationRouteLink");
  expect(source).not.toContain("function organizationHref");
  expect(source).not.toContain("href={organizationHref(basePath, organizationName)}");
  expect(source).not.toContain("projectHref");
  expect(source).not.toContain("pullRequestHref");
  expect(source).not.toContain("changesHref");
  expect(source).not.toContain("contributorHref");
  expect(source).not.toContain("receiverHref");
  expect(source).not.toContain("const pjaxContainer");
  expect(source).not.toContain("const legacyHref");
  expect(source).not.toContain('declare module "react"');
  expect(source).not.toContain("LiHTMLAttributes");
  expect(source).not.toContain("<a\n          href={");
  expect(source).not.toContain("as unknown");
  expect(source).toContain("type LegacyPjaxContainerAttrs");
  expect(source).toContain("type LegacyListItemHrefAttrs");
  expect(source).toContain('{ "pjax-container": "" } satisfies LegacyPjaxContainerAttrs');
  expect(source).toContain("{ href: pullRequestRowHref } satisfies LegacyListItemHrefAttrs");
  expect(source).toContain('<div {...legacyPjaxAttrs} className="row-fluid cb">');
  expect(source).toContain('<li className="post-item title" {...pullRequestRowAttrs}>');
  expect(source).toContain('to="/$user"');
  expect(source).toContain('to="/$ownerName/$projectName"');
  expect(source).toContain('to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"');
  expect(source).toContain('to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"');
  expect(source).toContain("to={`/organizations/${organizationName}`}");
  expect(source).toContain("to={`/organizations/${organizationName}/issues`}");
  expect(source).toContain("to={`/organizations/${organizationName}/boards`}");
  expect(source).toContain("to={`/organizations/${organizationName}/pullrequests`}");
  expect(source).toContain("to={`/organizations/${organizationName}/settingform`}");
  expect(source).toContain("function splitHeaderWordsInBrackets");
  expect(source).toContain('className="title-prefix"');
  expect(source).toContain('"data-status": undefined');
  expect(headerBreadcrumb).toContain("<Link");
  expect(headerBreadcrumb).toContain("to={`/organizations/${organizationName}`}");
});

async function installOrganizationPullRequestNativeLinkAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const auditedSelectors = [
      ".project-menu-gruop",
      ".project-menu-gruop a",
      ".pullrequeset-tab-menu",
      ".pullrequeset-tab-menu button",
    ];
    Object.defineProperty(window, "__organizationPullRequestNativeLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithOrganizationPullRequestAudit(
      type,
      listener,
      options,
    ) {
      const selector = auditedSelectors.find((candidate) => this.matches(candidate));
      if (selector) {
        (
          window as Window &
            typeof globalThis & { __organizationPullRequestNativeLinkListeners: string[] }
        ).__organizationPullRequestNativeLinkListeners.push(`${selector}:${String(type)}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readOrganizationPullRequestNativeLinkAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __organizationPullRequestNativeLinkListeners?: string[] }
      ).__organizationPullRequestNativeLinkListeners ?? [],
  );
}

async function expectOrganizationPullRequestSpaClick(
  page: Page,
  selector: string,
  expectedUrl: string,
  marker: string,
) {
  await page.goto(
    `${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/organizations/weblabs/pullrequests?filter=fix`,
  );
  await expect(page.locator(selector).first()).toHaveAttribute("href", expectedUrl);
  await page.evaluate((value) => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = value;
  }, marker);
  await page.locator(selector).first().click();
  await expect
    .poll(() => {
      const actual = new URL(page.url());
      return `${actual.pathname}${actual.hash}`;
    })
    .toBe(`${new URL(expectedUrl, page.url()).pathname}${new URL(expectedUrl, page.url()).hash}`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe(marker);
}

async function mockOrganizationPullRequests(page: Page) {
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
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "/assets/images/organization_default_logo.png",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanUpdate: true,
        visibleProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/pull-requests**", async (route) => {
    const url = new URL(route.request().url());
    const category = url.searchParams.get("category") === "closed" ? "closed" : "open";
    const filter = url.searchParams.get("filter");
    const pageNum = Number(url.searchParams.get("pageNum") || "1");
    const isEmpty = url.searchParams.get("filter") === "empty";
    const isClosed = category === "closed";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        category,
        closedCount: isEmpty ? 0 : 2,
        items: isEmpty
          ? []
          : [
              {
                closedCommentThreadCount: isClosed ? 2 : 1,
                commentThreadCount: 2,
                conflict: false,
                contributorLabel: "Dev Member",
                contributorLoginId: "dev",
                createdLabel: isClosed ? "Jul 2, 2026" : "Jul 1, 2026",
                fromBranch: "feature/login",
                fromOwnerName: "weblabs",
                fromProjectName: "sample",
                id: isClosed ? 4 : 3,
                ownerName: "weblabs",
                projectName: "sample",
                pullRequestNumber: isClosed ? 4 : 3,
                receiverLabel: "Site Admin",
                receiverLoginId: "admin",
                reviewerCount: 1,
                state: isClosed ? "merged" : "open",
                title:
                  !isClosed && filter === "prefix-source"
                    ? "[UI] Fix login redirect"
                    : isClosed
                      ? "Ship release"
                      : "Fix login redirect",
                toBranch: "main",
                updatedLabel: isClosed ? "Jul 2, 2026" : "Jul 1, 2026",
              },
            ],
        openCount: isEmpty ? 0 : 1,
        pageNum,
        pageSize: 20,
        totalCount: isEmpty ? 0 : 40,
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/boards**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, .page-footer-outer",
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
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
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
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  }, html);
}
