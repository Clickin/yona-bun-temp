import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const ORGANIZATION_MEMBERS_ROUTE_SOURCE = readFileSync(
  "src/routes/organizations/$organizationName/members.tsx",
  "utf8",
);

const EXPECTED_ORGANIZATION_MEMBERS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li><li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/organization_default_logo.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/organization_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author"><span class="group-title-head">group</span><a href="__BASE_PATH__/organizations/weblabs">weblabs</a></span></div></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/organizations/weblabs">Group Home</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/issues">Issue</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/boards">Board</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/pullrequests">Pull request</a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform"><i class="yobicon-cog"></i><span class="blind">Project configuration</span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><ul class="nav nav-tabs"><li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform">Setting</a></li><li class="active"><a href="__BASE_PATH__/organizations/weblabs/members">Group member</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/deleteForm">Group Delete</a></li></ul><div class="inner-bubble"><form class="nm" action="__BASE_PATH__/organizations/weblabs/members" method="post" id="addNewMember"><input type="text" class="text uname" id="loginId" name="loginId" required="required" data-provider="typeahead" autocomplete="off" placeholder="Add new member ID." pattern="^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$" title="Enter Valid ID"><button type="submit" class="ybtn ybtn-success"><i class="yobicon-addfriend"></i> Add</button></form></div><ul class="members project row-fluid"><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/admin" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-64.png" width="64" height="64"></a><div class="member-name">Site Admin</div><div class="member-id">@admin</div><div class="member-setting"><div class="btn-group" data-name="roleof-admin"><button class="btn dropdown-toggle large" data-toggle="dropdown"><span class="d-label">Group Manager</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="org_admin" data-selected="true" class="active"><button type="button" data-action="apply" data-href="__BASE_PATH__/organizations/weblabs/member/1/edit" data-loginId="admin">Group Manager</button></li><li data-value="org_member"><button type="button" data-action="apply" data-href="__BASE_PATH__/organizations/weblabs/member/1/edit" data-loginId="admin">Group Member</button></li></ul></div><button type="button" data-action="delete" data-href="__BASE_PATH__/organizations/weblabs/member/1/delete" class="ybtn ybtn-danger ybtn-small">Delete</button></div></li><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-64.png" width="64" height="64"></a><div class="member-name">Dev Member</div><div class="member-id">@dev</div><div class="member-setting"><div class="btn-group" data-name="roleof-dev"><button class="btn dropdown-toggle large" data-toggle="dropdown"><span class="d-label">Group Member</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="org_admin"><button type="button" data-action="apply" data-href="__BASE_PATH__/organizations/weblabs/member/2/edit" data-loginId="dev">Group Manager</button></li><li data-value="org_member" data-selected="true" class="active"><button type="button" data-action="apply" data-href="__BASE_PATH__/organizations/weblabs/member/2/edit" data-loginId="dev">Group Member</button></li></ul></div><button type="button" data-action="delete" data-href="__BASE_PATH__/organizations/weblabs/member/2/delete" class="ybtn ybtn-danger ybtn-small">Delete</button></div></li></ul><div id="alertDeletion" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Delete a group member</h3></div><div class="modal-body"><p>Are you sure this user should leave this group?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-mini" id="deleteBtn">Yes</button><button type="button" class="ybtn ybtn-mini" data-dismiss="modal">No</button></div></div><legend><h3>Sign-up request(1)</h3></legend><div class="row-fluid"><div class="span2"><div class="pull-left mr10"><a href="__BASE_PATH__/pending"><img src="/assets/images/default-avatar-64.png" height="65" width="65" class="img-circle"></a></div><div class="pull-left" style="width: 60px;"><span><a href="__BASE_PATH__/pending"><strong>Pending User</strong></a></span><span>(pending)</span><button type="button" class="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn" data-loginId="pending"><i class="yobicon-addfriend"></i>Add</button></div></div></div></div></div>
<link rel="stylesheet" type="text/css" media="screen" href="__MENTION_STYLESHEET_HREF__">
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("organization members matches legacy organization/members.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mentionStylesheetHref = legacyMentionStylesheetHref(basePath);
  await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  await expect(page.locator("#addNewMember")).toBeVisible();
  await expect(page.locator(".members.project .member")).toHaveCount(2);
  await expect(page.locator("#alertDeletion")).toHaveClass(/hide/);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_MEMBERS.replaceAll("__BASE_PATH__", basePath).replaceAll(
        "__MENTION_STYLESHEET_HREF__",
        mentionStylesheetHref,
      ),
    ),
  );
  expect(await organizationMemberMetrics(page)).toEqual({
    addButtonOffsetLeft: 384,
    addInputWidth: 384,
    avatarHeight: 40,
    avatarWidth: 40,
    deleteHrefSuffix: "/organizations/weblabs/member/1/delete",
    enrollmentButtonDataLoginid: "pending",
    enrollmentImageHeight: 65,
    firstMemberBorderBottom: "rgb(221, 221, 221)",
    firstMemberPaddingBlock: 20,
    memberListMarginLeft: 0,
    memberListStyle: "none",
    memberNameFontWeight: "700",
    memberRoleDataName: "roleof-admin",
    memberRowWidthRatio: 0.49,
    memberSettingOffsetTop: 15,
    roleApplyLoginId: "admin",
  });
});

test("organization members mention stylesheet keeps the configured base path", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mentionStylesheetHref = legacyMentionStylesheetHref(basePath);
  await mockOrganizationMembers(page);

  const mentionRequestPromise = page.waitForRequest(
    (request) =>
      request.resourceType() === "stylesheet" && request.url().endsWith(mentionStylesheetHref),
  );

  await page.goto(`${basePath}/organizations/weblabs/members`);

  const mentionRequest = await mentionRequestPromise;
  await expect(page.locator(`link[href="${mentionStylesheetHref}"]`)).toHaveAttribute(
    "media",
    "screen",
  );
  expect(new URL(mentionRequest.url()).pathname).toBe(mentionStylesheetHref);
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).toMatch(
    /const mentionStylesheetHref = prefixBasePath\(\s*runtimeConfig\.basePath,\s*"\/assets\/javascripts\/lib\/mentionjs\/mention\.css",?\s*\);/,
  );
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).not.toContain(
    'href="/assets/javascripts/lib/mentionjs/mention.css"',
  );
});

test("organization members forbidden response renders legacy organization error shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationMembers(page, { adminStatus: 403 });

  await page.goto(`${basePath}/organizations/weblabs/members`);

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".project-page-wrap > .error-wrap")).toBeVisible();
  await expect(page.locator(".project-page-wrap > .error-wrap p")).toHaveText(
    "You are not authorized",
  );
  await expect(page.locator(".project-page-wrap > .error-wrap .ico.ico-err2")).toBeVisible();
  await expect(page.locator("#addNewMember")).toHaveCount(0);
  await expect(page.locator(".members.project .member")).toHaveCount(0);
  await expect(page.locator(".project-page-wrap .ybtn")).toHaveCount(0);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs")).toHaveCount(0);

  expect(await organizationForbiddenMetrics(page)).toEqual({
    errorPaddingBlock: 200,
    iconClass: "ico ico-err2",
    iconTextAlign: "center",
    messageFontSize: "16px",
    messageFontWeight: "700",
    messageMarginTop: 30,
    messageTextAlign: "center",
    menuHasSettingLink: true,
    pageWrapChildCount: 1,
  });
});

test("organization members mutation controls preserve legacy data hooks", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests = await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  await page.locator("#loginId").fill("jane");
  await page.locator("#addNewMember").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect.poll(() => requests.addedLoginIds).toEqual(["jane"]);

  await page
    .locator('[data-name="roleof-dev"] [data-value="org_admin"] [data-action="apply"]')
    .evaluate((anchor: HTMLElement) => anchor.click());
  await expect.poll(() => requests.roleUpdates).toEqual([{ role: "org_admin", userId: "2" }]);

  await page.locator(".enrollAcceptBtn").click();
  await expect(page.locator("#loginId")).toHaveValue("pending");
  await expect.poll(() => requests.addedLoginIds).toEqual(["jane", "pending"]);
  expect(requests.acceptedUserIds).toEqual([]);
});

test("organization members add-member input performs legacy typeahead lookup, render, and select on #loginId", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests = await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  const addInput = page.locator("#loginId");
  await addInput.fill("car");

  await expect.poll(() => requests.userSearchQueries.at(-1) ?? "").toBe("car");
  const typeaheadMenu = page.locator(".inner-bubble .typeahead.dropdown-menu");
  await expect(typeaheadMenu).toBeVisible();
  await expect(typeaheadMenu.locator("li")).toHaveCount(2);
  await expect(typeaheadMenu.locator("li").nth(0)).toHaveClass("active");
  await expect(typeaheadMenu.locator("li").nth(0).locator(".mention_image")).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-128.png",
  );
  await expect(typeaheadMenu.locator("li").nth(0).locator(".mention_name")).toHaveText(
    "Carol Jones",
  );
  await expect(typeaheadMenu.locator("li").nth(0).locator(".mention_username")).toHaveText(
    "@carol",
  );
  await expect(typeaheadMenu.locator("li").nth(1).locator(".mention_name")).toHaveText(
    "Carmine Poe",
  );

  const typeaheadMetrics = await page.evaluate(() => {
    const input = document.querySelector<HTMLElement>("#loginId");
    const menu = document.querySelector<HTMLElement>(".typeahead.dropdown-menu");
    if (!input || !menu) {
      return null;
    }
    const inputRect = input.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    return {
      inputBottom: Math.round(inputRect.bottom),
      inputLeft: Math.round(inputRect.left),
      menuLeft: Math.round(menuRect.left),
      menuTop: Math.round(menuRect.top),
    };
  });
  expect(typeaheadMetrics).not.toBeNull();
  expect(typeaheadMetrics!.menuLeft).toBeGreaterThanOrEqual(typeaheadMetrics!.inputLeft - 2);
  expect(typeaheadMetrics!.menuLeft).toBeLessThanOrEqual(typeaheadMetrics!.inputLeft + 2);
  expect(typeaheadMetrics!.menuTop).toBeGreaterThanOrEqual(typeaheadMetrics!.inputBottom - 1);

  await addInput.press("ArrowDown");
  await expect(typeaheadMenu.locator("li").nth(1)).toHaveClass("active");
  await addInput.press("Enter");

  await expect(addInput).toHaveValue("carmine");
  await expect(typeaheadMenu).toHaveCount(0);
  await expect.poll(() => requests.addedLoginIds).toEqual([]);

  await page.locator("#addNewMember .ybtn.ybtn-success").click();
  await expect.poll(() => requests.addedLoginIds).toEqual(["carmine"]);
});

test("organization members role dropdown uses route-owned open state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests = await mockOrganizationMembers(page);
  await installOrganizationMembersRoleDropdownDocumentAudit(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });

  const roleGroup = page.locator('.members.project .btn-group[data-name="roleof-dev"]');
  const toggle = roleGroup.locator('button.dropdown-toggle[data-toggle="dropdown"]');
  await expect(roleGroup).not.toHaveClass(/open/);
  await toggle.click();

  await expect(roleGroup).toHaveClass(/\bopen\b/);
  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/members`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window &
              typeof globalThis & { __yonaOrganizationMembersRoleDropdownDocumentClicks?: number }
          ).__yonaOrganizationMembersRoleDropdownDocumentClicks ?? 0,
      ),
    )
    .toBe(0);

  await expect(roleGroup.locator("ul.dropdown-menu")).toBeVisible();
  await expect(roleGroup.locator("li")).toHaveCount(2);
  await expect(roleGroup.locator('li[data-value="org_member"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(roleGroup.locator('li[data-value="org_member"]')).toHaveClass(/active/);
  await expect(roleGroup.locator('[data-value="org_admin"] [data-action="apply"]')).toHaveAttribute(
    "data-href",
    `${basePath}/organizations/weblabs/member/2/edit`,
  );
  await expect(roleGroup.locator('[data-value="org_admin"] [data-action="apply"]')).toHaveAttribute(
    "data-loginid",
    "dev",
  );
  await expect(roleGroup.locator('a[href="#"], a[href="javascript:void(0)"]')).toHaveCount(0);

  await roleGroup.locator('[data-value="org_admin"] [data-action="apply"]').click();
  await expect.poll(() => requests.roleUpdates).toEqual([{ role: "org_admin", userId: "2" }]);
  await expect(roleGroup).not.toHaveClass(/open/);
  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/members`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization members anchors preserve legacy navigation and action boundaries", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationMembersAnchorNativeListenerAudit(page);
  await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);

  await expect(page.locator(".project-menu-gruop a")).toHaveCount(4);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a")).toHaveCount(3);
  await expect(page.locator(".project-breadcrumb a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs`,
  );
  await expect(page.locator(".project-breadcrumb a")).not.toHaveAttribute("data-status");
  await expect(page.locator('.members.project .avatar-wrap[href$="/admin"]')).toHaveCount(1);
  await expect(page.locator('.members.project .avatar-wrap[href$="/dev"]')).toHaveCount(1);
  await expect(page.locator('.row-fluid .span2 a[href$="/pending"]')).toHaveCount(2);
  await expect(page.locator(".members.project .avatar-wrap[data-status]")).toHaveCount(0);
  await expect(page.locator(".row-fluid .span2 a[data-status]")).toHaveCount(0);
  expect(await organizationMembersAnchorNativeListeners(page)).toEqual([]);
  await expect(page.locator(".project-menu-gruop a").filter({ hasText: "Board" })).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards`,
  );
  await expect(page.locator(".project-menu-gruop a[data-status]")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop a[aria-current]")).toHaveCount(0);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a[data-status]")).toHaveCount(0);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a[aria-current]")).toHaveCount(0);

  const roleApply = page
    .locator('.members.project [data-name="roleof-admin"] [data-action="apply"]')
    .first();
  await expect(roleApply).toHaveJSProperty("tagName", "BUTTON");
  await expect(roleApply).toHaveAttribute("type", "button");
  await expect(roleApply).not.toHaveAttribute("href", /.+/);
  await expect(roleApply).toHaveAttribute(
    "data-href",
    `${basePath}/organizations/weblabs/member/1/edit`,
  );
  await expect(roleApply).toHaveAttribute("data-loginid", "admin");

  const deleteControl = page.locator('.members.project [data-action="delete"]').first();
  await expect(deleteControl).toHaveJSProperty("tagName", "BUTTON");
  await expect(deleteControl).toHaveAttribute("type", "button");
  await expect(deleteControl).not.toHaveAttribute("href", /.+/);
  await expect(deleteControl).toHaveAttribute(
    "data-href",
    `${basePath}/organizations/weblabs/member/1/delete`,
  );
  await expect(deleteControl).toHaveClass(/ybtn-danger/);
});

test("organization members profile and breadcrumb links use SPA navigation with legacy hrefs", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  const memberProfileLink = page.locator('.members.project .avatar-wrap[href$="/dev"]');
  await expect(memberProfileLink).toHaveAttribute("href", `${basePath}/dev`);
  await expect(memberProfileLink.locator("img")).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-64.png",
  );
  await expect(memberProfileLink.locator("img")).toHaveAttribute("width", "64");
  await expect(memberProfileLink.locator("img")).toHaveAttribute("height", "64");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await memberProfileLink.click();
  await expect(page).toHaveURL(`${basePath}/dev`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.goto(`${basePath}/organizations/weblabs/members`);
  const breadcrumbLink = page.locator(".project-breadcrumb a");
  await expect(breadcrumbLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "breadcrumb";
  });
  await breadcrumbLink.click();
  await expect(page).toHaveURL(`${basePath}/organizations/weblabs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("breadcrumb");
  await expect(page.locator(".project-menu-gruop li").first()).toHaveClass("active");
});

test("organization members route source keeps internal navigation out of raw anchors", () => {
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).toContain("Link");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).toContain("searchLegacyMemberUsers");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).toContain('className="typeahead dropdown-menu"');
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).toContain('data-provider="typeahead"');
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).toContain('to="/$user"');
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).toContain(
    'to="/organizations/$organizationName/members"',
  );
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).not.toContain("acceptOrganizationEnrollmentRest");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).toContain("params={{ organizationName }}");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).toContain('"data-status": undefined');
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).not.toContain("LegacyOrganizationLinkProps");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).not.toContain("LegacyUserLinkProps");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).not.toContain("legacyOrganizationLinkProps");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).not.toContain("legacyUserLinkProps");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).not.toContain("<a ");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).not.toContain("</a>");
  expect(ORGANIZATION_MEMBERS_ROUTE_SOURCE).not.toContain("organizationHref(");
});

test("organization members delete modal stays route-owned across open dismiss and confirm", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests = await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  await installOrganizationMembersDeleteModalBridgeAudit(page, ["alertDeletion"]);
  await rememberSpaMarker(page, "organization-members-delete-modal");
  const membersUrl = page.url();
  const deleteButton = '.members.project [data-action="delete"]';
  const deleteModal = page.locator("#alertDeletion");
  const closeButton = '#alertDeletion .modal-header [data-dismiss="modal"]';
  const noButton = '#alertDeletion .modal-footer [data-dismiss="modal"]';

  await expect(deleteModal).toHaveClass("modal hide");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(membersUrl);
  await expect.poll(() => spaMarker(page)).toBe("organization-members-delete-modal");

  expect(await dispatchCancelableClick(page, deleteButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal hide in");
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(page.locator(closeButton)).toHaveAttribute("data-dismiss", "modal");
  await expect(page.locator(noButton)).toHaveAttribute("data-dismiss", "modal");
  await expect(page).toHaveURL(membersUrl);
  await expect.poll(() => spaMarker(page)).toBe("organization-members-delete-modal");
  await expect
    .poll(() => organizationMembersDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });
  expect(requests.deletedUserIds).toEqual([]);

  expect(await dispatchCancelableClick(page, noButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal hide");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(membersUrl);
  await expect.poll(() => spaMarker(page)).toBe("organization-members-delete-modal");
  await expect
    .poll(() => organizationMembersDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });
  expect(requests.deletedUserIds).toEqual([]);

  expect(await dispatchCancelableClick(page, deleteButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal hide in");
  expect(await dispatchCancelableClick(page, closeButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal hide");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(membersUrl);
  await expect.poll(() => spaMarker(page)).toBe("organization-members-delete-modal");
  await expect
    .poll(() => organizationMembersDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });
  expect(requests.deletedUserIds).toEqual([]);

  await rememberSpaMarker(page, "kept");
  expect(await dispatchCancelableClick(page, deleteButton)).toBe(false);
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/organizations/weblabs/members/1") &&
      response.request().method() === "DELETE",
  );
  expect(await dispatchCancelableClick(page, "#deleteBtn")).toBe(false);
  await deleteResponsePromise;

  await expect(deleteModal).toHaveClass("modal hide");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(membersUrl);
  await expect.poll(() => spaMarker(page)).toBe("kept");
  await expect
    .poll(() => organizationMembersDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });
  await expect.poll(() => requests.deletedUserIds).toEqual(["1"]);
});

test("organization members delete failure shows legacy alert mapping", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests = await mockOrganizationMembers(page, {
    deleteErrorMessage: "Project owner cannot leave his own project.",
    deleteStatus: 403,
  });

  await page.goto(`${basePath}/organizations/weblabs/members`);
  await installOrganizationMembersDeleteModalBridgeAudit(page, ["alertDeletion"]);
  await rememberSpaMarker(page, "organization-members-delete-failure");
  const membersUrl = page.url();

  expect(await dispatchCancelableClick(page, '.members.project [data-action="delete"]')).toBe(
    false,
  );
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide in");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(page).toHaveURL(membersUrl);
  await expect.poll(() => spaMarker(page)).toBe("organization-members-delete-failure");
  await expect
    .poll(() => organizationMembersDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });

  const alertMessage = page.waitForEvent("dialog").then(async (dialog) => {
    const message = dialog.message();
    await dialog.accept();
    return message;
  });
  expect(await dispatchCancelableClick(page, "#deleteBtn")).toBe(false);

  await expect(alertMessage).resolves.toBe("Project owner cannot leave his own project.");
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide");
  await expect(page.locator("#alertDeletion")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(membersUrl);
  await expect.poll(() => spaMarker(page)).toBe("organization-members-delete-failure");
  await expect
    .poll(() => organizationMembersDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });
  await expect.poll(() => requests.deletedUserIds).toEqual(["1"]);
});

test("organization members delete modal source insulates delegated modal bridge", () => {
  const modalSource = ORGANIZATION_MEMBERS_ROUTE_SOURCE.slice(
    ORGANIZATION_MEMBERS_ROUTE_SOURCE.indexOf(
      "function insulateOrganizationMembersDeleteModalButtonClick",
    ),
    ORGANIZATION_MEMBERS_ROUTE_SOURCE.indexOf("function OrganizationHeader"),
  );

  expect(modalSource).toContain("function insulateOrganizationMembersDeleteModalButtonClick");
  expect(modalSource).toContain("event.preventDefault();");
  expect(modalSource).toContain("event.stopPropagation();");
  expect(modalSource).toContain("const openDeleteMemberModal");
  expect(modalSource).toContain("const dismissDeleteMemberModal");
  expect(modalSource).toContain("const submitDeleteMember");
  expect(modalSource).toContain("closeDeleteMemberModal();");
  expect(modalSource).toContain(
    'className={deleteUserId === null ? "modal hide" : "modal hide in"}',
  );
  expect(modalSource).toContain('className="modal-backdrop fade in"');
  expect(modalSource).toContain("onDelete={openDeleteMemberModal}");
  expect(modalSource).toContain("onClick={dismissDeleteMemberModal}");
  expect(modalSource).toContain("onClick={submitDeleteMember}");
  expect(modalSource).not.toContain("document.");
  expect(modalSource).not.toContain("classList");
  expect(modalSource).not.toContain("addEventListener(");
});

test("organization members menu settings link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  const settingsLink = page.locator(".project-page-wrap > .nav.nav-tabs a").filter({
    hasText: "Setting",
  });
  await expect(settingsLink).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await settingsLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/settingform`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs li").first()).toHaveClass("active");
  await expect(page.locator("#saveSetting")).toBeVisible();
});

test("organization members menu home link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  const homeLink = page.locator(".project-menu-gruop a").filter({ hasText: "Group Home" });
  await expect(homeLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await homeLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-menu-gruop li").first()).toHaveClass("active");
  await expect(page.locator("#mylist-filter")).toBeVisible();
});

test("organization members menu board link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationMembers(page);

  await page.goto(`${basePath}/organizations/weblabs/members`);
  const boardLink = page.locator(".project-menu-gruop a").filter({ hasText: "Board" });
  await expect(boardLink).toHaveAttribute("href", `${basePath}/organizations/weblabs/boards`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await boardLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/boards`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Board");
  await expect(page.locator("#option_form")).toBeVisible();
});

async function mockOrganizationMembers(
  page: Page,
  options: { adminStatus?: number; deleteErrorMessage?: string; deleteStatus?: number } = {},
) {
  const requests = {
    acceptedUserIds: [] as string[],
    addedLoginIds: [] as string[],
    deletedUserIds: [] as string[],
    roleUpdates: [] as Array<{ role: string; userId: string }>,
    userSearchQueries: [] as string[],
  };

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
  await page.route("**/api/v1/organizations/weblabs", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Web labs group",
        id: 42,
        logoUrl: "/assets/images/organization_default_logo.png",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/admin", async (route) => {
    if (options.adminStatus === 403) {
      await route.fulfill({
        contentType: "application/json",
        status: 403,
        body: JSON.stringify({
          error: {
            code: "forbidden",
            message: "You are not authorized",
            status: 403,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(organizationAdminPayload()),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Web labs group",
        id: 42,
        logoUrl: "/assets/images/organization_default_logo.png",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(organizationContainerPayload()),
    });
  });
  await page.route("**/api/v1/users/dev/profile**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-64.png",
          connectedSocialProviders: [],
          displayName: "Dev Member",
          englishName: "",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "dev",
          primaryEmailAddress: "",
          sinceLabel: "",
        },
        pullRequestItems: [],
        viewerCanEditProfile: false,
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
  await page.route("**/-_-api/v1/users?*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("query") ?? "";
    requests.userSearchQueries.push(query);
    await route.fulfill({
      contentType: "application/json",
      headers: {
        "Content-Range": "items 2/2",
      },
      body: JSON.stringify([
        {
          info: legacyMemberSearchInfo("Carol Jones", "carol"),
          loginId: "carol",
        },
        {
          info: legacyMemberSearchInfo("Carmine Poe", "carmine"),
          loginId: "carmine",
        },
      ]),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/members", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { loginId?: string };
      requests.addedLoginIds.push(body.loginId ?? "");
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(organizationAdminPayload()),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/members/*", async (route) => {
    const request = route.request();
    if (request.method() === "DELETE") {
      requests.deletedUserIds.push(new URL(request.url()).pathname.split("/").pop() ?? "");
      if (options.deleteStatus) {
        await route.fulfill({
          contentType: "application/json",
          status: options.deleteStatus,
          body: JSON.stringify({
            error: {
              code: "delete_failed",
              message:
                options.deleteErrorMessage ?? `REST request failed with ${options.deleteStatus}.`,
              status: options.deleteStatus,
            },
          }),
        });
        return;
      }
    }
    if (request.method() === "PATCH") {
      const body = request.postDataJSON() as { role?: string };
      requests.roleUpdates.push({
        role: body.role ?? "",
        userId: new URL(request.url()).pathname.split("/").pop() ?? "",
      });
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(organizationAdminPayload()),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/enrollments/*/accept", async (route) => {
    if (route.request().method() === "POST") {
      const parts = new URL(route.request().url()).pathname.split("/");
      requests.acceptedUserIds.push(parts.at(-2) ?? "");
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(organizationAdminPayload()),
    });
  });

  return requests;
}

function organizationContainerPayload() {
  return {
    adminMembers: [
      {
        avatarUrl: "/assets/images/default-avatar-45.png",
        loginId: "admin",
        role: "org_admin",
        userLabel: "Site Admin",
      },
    ],
    description: "Web labs group",
    logoUrl: "/assets/images/organization_default_logo.png",
    memberMembers: [],
    organizationName: "weblabs",
    viewerCanCreateProject: true,
    viewerCanLeave: true,
    viewerCanUpdate: true,
    visibleProjects: [],
  };
}

function organizationAdminPayload() {
  return {
    deleteAllowed: true,
    enrollmentRequests: [
      {
        avatarUrl: "/assets/images/default-avatar-64.png",
        loginId: "pending",
        userId: 3,
        userLabel: "Pending User",
      },
    ],
    id: 42,
    logoUrl: "/assets/images/organization_default_logo.png",
    members: [
      {
        avatarUrl: "/assets/images/default-avatar-64.png",
        loginId: "admin",
        role: "org_admin",
        userId: 1,
        userLabel: "Site Admin",
      },
      {
        avatarUrl: "/assets/images/default-avatar-64.png",
        loginId: "dev",
        role: "org_member",
        userId: 2,
        userLabel: "Dev Member",
      },
    ],
    organizationName: "weblabs",
    roleOptions: [
      { label: "Group Manager", role: "org_admin" },
      { label: "Group Member", role: "org_member" },
    ],
    viewerCanUpdate: true,
  };
}

function legacyMemberSearchInfo(userLabel: string, loginId: string) {
  return `<img class='mention_image' src='/assets/images/default-avatar-128.png'><b class='mention_name'>${userLabel}</b><span class='mention_username'> @${loginId}</span>`;
}

async function organizationMemberMetrics(page: Page) {
  return page.evaluate(() => {
    const addButton = requireElement("#addNewMember button");
    const addInput = requireElement("#loginId");
    const deleteAnchor = requireElement('.members.project [data-action="delete"]');
    const enrollmentButton = requireElement(".enrollAcceptBtn");
    const enrollmentImage = requireElement(".row-fluid .span2 .img-circle");
    const memberList = requireElement(".members.project");
    const firstMember = requireElement(".members.project .member");
    const memberName = requireElement(".members.project .member .member-name");
    const avatar = requireElement(".members.project .member .avatar-wrap.mlarge");
    const memberSetting = requireElement(".members.project .member .member-setting");
    const roleControl = requireElement('.members.project .btn-group[data-name="roleof-admin"]');
    const roleApply = requireElement(
      '.members.project .btn-group[data-name="roleof-admin"] [data-action="apply"]',
    );
    const addButtonRect = addButton.getBoundingClientRect();
    const addInputRect = addInput.getBoundingClientRect();
    const addInputStyle = getComputedStyle(addInput);
    const avatarRect = avatar.getBoundingClientRect();
    const enrollmentImageRect = enrollmentImage.getBoundingClientRect();
    const firstMemberRect = firstMember.getBoundingClientRect();
    const firstMemberStyle = getComputedStyle(firstMember);
    const memberListRect = memberList.getBoundingClientRect();
    const memberListStyle = getComputedStyle(memberList);
    const memberNameStyle = getComputedStyle(memberName);
    const memberSettingRect = memberSetting.getBoundingClientRect();

    return {
      addButtonOffsetLeft: Math.round(addButtonRect.left - addInputRect.left),
      addInputWidth: Math.round(parseFloat(addInputStyle.width)),
      avatarHeight: Math.round(avatarRect.height),
      avatarWidth: Math.round(avatarRect.width),
      deleteHrefSuffix: deleteAnchor
        .getAttribute("data-href")
        ?.replace(/^.*\/organizations/u, "/organizations"),
      enrollmentButtonDataLoginid: enrollmentButton.getAttribute("data-loginid"),
      enrollmentImageHeight: Math.round(enrollmentImageRect.height),
      firstMemberBorderBottom: firstMemberStyle.borderBottomColor,
      firstMemberPaddingBlock:
        Math.round(parseFloat(firstMemberStyle.paddingTop)) +
        Math.round(parseFloat(firstMemberStyle.paddingBottom)),
      memberListMarginLeft: Math.round(parseFloat(memberListStyle.marginLeft)),
      memberListStyle: memberListStyle.listStyleType,
      memberNameFontWeight: memberNameStyle.fontWeight,
      memberRoleDataName: roleControl.getAttribute("data-name"),
      memberRowWidthRatio: Number((firstMemberRect.width / memberListRect.width).toFixed(2)),
      memberSettingOffsetTop: Math.round(memberSettingRect.top - firstMemberRect.top),
      roleApplyLoginId: roleApply.getAttribute("data-loginid"),
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

async function organizationForbiddenMetrics(page: Page) {
  return page.evaluate(() => {
    const errorWrap = requireElement(".project-page-wrap > .error-wrap");
    const icon = requireElement(".project-page-wrap > .error-wrap .ico.ico-err2");
    const message = requireElement(".project-page-wrap > .error-wrap p");
    const pageWrap = requireElement(".project-page-wrap");
    const errorStyle = getComputedStyle(errorWrap);
    const messageStyle = getComputedStyle(message);

    return {
      errorPaddingBlock:
        Math.round(parseFloat(errorStyle.paddingTop)) +
        Math.round(parseFloat(errorStyle.paddingBottom)),
      iconClass: icon.getAttribute("class"),
      iconTextAlign: getComputedStyle(icon).textAlign,
      messageFontSize: messageStyle.fontSize,
      messageFontWeight: messageStyle.fontWeight,
      messageMarginTop: Math.round(parseFloat(messageStyle.marginTop)),
      messageTextAlign: messageStyle.textAlign,
      menuHasSettingLink:
        document.querySelector(
          '.project-setting a[href$="/organizations/weblabs/settingform"] .yobicon-cog',
        ) !== null,
      pageWrapChildCount: pageWrap.children.length,
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

async function installOrganizationMembersAnchorNativeListenerAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const anchorListeners: string[] = [];
    Object.defineProperty(window, "__yonaOrganizationMembersAnchorNativeListeners", {
      configurable: true,
      value: anchorListeners,
    });
    Element.prototype.addEventListener = function addEventListenerWithOrganizationMembersAudit(
      type,
      listener,
      options,
    ) {
      if (
        this instanceof Element &&
        this.matches(".project-menu-gruop a, .project-page-wrap > .nav.nav-tabs a")
      ) {
        anchorListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function organizationMembersAnchorNativeListeners(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __yonaOrganizationMembersAnchorNativeListeners?: string[] }
      ).__yonaOrganizationMembersAnchorNativeListeners ?? [],
  );
}

async function installOrganizationMembersRoleDropdownDocumentAudit(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__yonaOrganizationMembersRoleDropdownDocumentClicks", {
      configurable: true,
      value: 0,
      writable: true,
    });
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          '.members.project .btn-group[data-name="roleof-dev"] [data-toggle="dropdown"]',
        )
      ) {
        (
          window as Window &
            typeof globalThis & { __yonaOrganizationMembersRoleDropdownDocumentClicks: number }
        ).__yonaOrganizationMembersRoleDropdownDocumentClicks += 1;
      }
    });
  });
}

async function installOrganizationMembersDeleteModalBridgeAudit(page: Page, modalIds: string[]) {
  await page.evaluate((ids) => {
    type GuardedWindow = typeof window & {
      __organizationMembersDeleteModalBridgeAudit?: {
        documentClicks: string[];
        getElementById: string[];
      };
      __organizationMembersDeleteModalBridgeAuditArmed?: boolean;
      __organizationMembersDeleteModalBridgeNativeGetElementById?: typeof Document.prototype.getElementById;
    };
    const guardedWindow = window as GuardedWindow;
    guardedWindow.__organizationMembersDeleteModalBridgeAudit = {
      documentClicks: [],
      getElementById: [],
    };
    guardedWindow.__organizationMembersDeleteModalBridgeNativeGetElementById ??=
      Document.prototype.getElementById;
    const nativeGetElementById =
      guardedWindow.__organizationMembersDeleteModalBridgeNativeGetElementById;

    Document.prototype.getElementById = function guardedGetElementById(id: string) {
      if (ids.includes(id)) {
        guardedWindow.__organizationMembersDeleteModalBridgeAudit?.getElementById.push(id);
      }
      return nativeGetElementById.call(this, id);
    };

    if (guardedWindow.__organizationMembersDeleteModalBridgeAuditArmed) {
      return;
    }

    guardedWindow.__organizationMembersDeleteModalBridgeAuditArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }
      if (target.closest('.members.project [data-action="delete"]')) {
        guardedWindow.__organizationMembersDeleteModalBridgeAudit?.documentClicks.push(
          "member-delete",
        );
        return;
      }
      if (target.closest("#deleteBtn")) {
        guardedWindow.__organizationMembersDeleteModalBridgeAudit?.documentClicks.push(
          "modal-confirm",
        );
        return;
      }
      if (target.closest('#alertDeletion .modal-header [data-dismiss="modal"]')) {
        guardedWindow.__organizationMembersDeleteModalBridgeAudit?.documentClicks.push(
          "header-dismiss",
        );
        return;
      }
      if (target.closest('#alertDeletion .modal-footer [data-dismiss="modal"]')) {
        guardedWindow.__organizationMembersDeleteModalBridgeAudit?.documentClicks.push(
          "footer-dismiss",
        );
      }
    });
  }, modalIds);
}

async function organizationMembersDeleteModalBridgeAuditHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __organizationMembersDeleteModalBridgeAudit?: {
              documentClicks: string[];
              getElementById: string[];
            };
          }
      ).__organizationMembersDeleteModalBridgeAudit ?? { documentClicks: [], getElementById: [] },
  );
}

async function rememberSpaMarker(page: Page, marker: string) {
  await page.evaluate((nextMarker) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      nextMarker;
  }, marker);
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function dispatchCancelableClick(page: Page, selector: string) {
  return page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Missing selector: ${targetSelector}`);
    }
    return element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );
  }, selector);
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, link[href$='/assets/javascripts/lib/mentionjs/mention.css'], .page-footer-outer",
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
      if (attr.name === "required") {
        return "required";
      }
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  });
}

function legacyMentionStylesheetHref(basePath: string) {
  return basePath === "/"
    ? "/assets/javascripts/lib/mentionjs/mention.css"
    : `${basePath}/assets/javascripts/lib/mentionjs/mention.css`;
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
      if (attr.name === "required") {
        return "required";
      }
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  }, html);
}
