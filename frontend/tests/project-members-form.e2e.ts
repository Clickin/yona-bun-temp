import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const PROJECT_MEMBERS_ROUTE_SOURCE = new URL(
  "../src/routes/$ownerName/$projectName/members.tsx",
  import.meta.url,
);

const EXPECTED_PROJECT_MEMBERS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" data-toggle="tooltip" data-placement="bottom" title="Site administration"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class="active"><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span><span class="project-menu-count">1</span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><ul class="nav nav-tabs"><li id="subMenuProjectSetting" class=""><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li><li id="subMenuProjectMember" class="active"><a href="__BASE_PATH__/admin/sample/members">Member<span class="num-badge">1</span></a></li><li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/issue/labelsform">Issue Label</a></li><li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li><li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li><li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li><li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li></ul><div class="inner-bubble"><form class="nm" action="__BASE_PATH__/admin/sample/members" method="post" id="addNewMember"><input type="text" class="text uname" id="loginId" name="loginId" required data-provider="typeahead" autocomplete="off" placeholder="Add new member ID." pattern="^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$" title="Enter Valid ID"><button type="submit" class="ybtn ybtn-success"><i class="yobicon-addfriend"></i>Add</button></form></div><ul class="members project row-fluid"><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/admin" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-32.png" width="64" height="64"></a><div class="member-name">Site Admin</div><div class="member-id">@admin</div><div class="member-setting"><span class="label owner">Project owner</span></div></li><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/alice" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-32.png" width="64" height="64"></a><div class="member-name">Alice Doe</div><div class="member-id">@alice</div><div class="member-setting"><div class="btn-group" data-name="roleof-alice"><button class="btn dropdown-toggle large" data-toggle="dropdown"><span class="d-label">Member</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="1"><button type="button" data-action="apply" data-href="__BASE_PATH__/admin/sample/member/2/edit" data-loginid="alice">Manager</button></li><li data-value="2" data-selected="true" class="active"><button type="button" data-action="apply" data-href="__BASE_PATH__/admin/sample/member/2/edit" data-loginid="alice">Member</button></li></ul></div><button type="button" data-action="delete" data-href="__BASE_PATH__/admin/sample/member/2/delete" class="ybtn ybtn-danger ybtn-small">Delete</button></div></li></ul><legend><h3>Sign-up request (1)</h3></legend><div class="row-fluid"><div class="span2"><div class="pull-left mr10"><a href="__BASE_PATH__/bob"><img src="/assets/images/default-avatar-32.png" height="65" width="65" class="img-circle"></a></div><div class="pull-left" style="width: 60px;"><span><a href="__BASE_PATH__/bob"><strong>Bob Smith</strong></a></span><span>(bob)</span><button type="button" class="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn" data-loginid="bob"><i class="yobicon-addfriend"></i>Add</button></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project members matches legacy project/members.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMembers(page);

  await page.goto(`${basePath}/admin/sample/members`);
  await expect(page.locator("#addNewMember")).toBeVisible();
  await expect(page.locator(".members.project .member")).toHaveCount(2);
  await expect(page.locator("legend")).toContainText("Sign-up request (1)");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_MEMBERS.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await memberPageMetrics(page)).toEqual({
    addInputWidth: 384,
    avatarHeight: 40,
    avatarWidth: 40,
    firstMemberBorderBottom: "rgb(221, 221, 221)",
    firstMemberPaddingBlock: 20,
    memberListMarginLeft: 0,
    memberListStyle: "none",
    memberNameFontWeight: "700",
    memberRoleDataName: "roleof-alice",
    memberRowWidthRatio: 0.49,
    memberSettingOffsetTop: 15,
    ownerPadding: 5,
  });
});

test("project members focuses add member input on load like legacy member module", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMembers(page);

  await page.goto(`${basePath}/admin/sample/members`);

  await expect(page.locator("#loginId")).toBeFocused();
});

test("project members settings tab anchors keep legacy hrefs without route-local native listeners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installProjectSettingsTabNativeLinkAudit(page);
  await mockProjectMembers(page);

  await page.goto(`${basePath}/admin/sample/members`);
  const settingsTabLinks = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(settingsTabLinks).toHaveCount(7);
  await expect(settingsTabLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(settingsTabLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/members`);
  await expect(settingsTabLinks.nth(2)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(settingsTabLinks.nth(3)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/webhooks`,
  );
  await expect(settingsTabLinks.nth(4)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/transfer`,
  );
  await expect(settingsTabLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/deleteform`,
  );
  await expect(settingsTabLinks.nth(6)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/changeVCS`,
  );
  expect(
    await settingsTabLinks.evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        className: link.getAttribute("class"),
        dataStatus: link.getAttribute("data-status"),
      })),
    ),
  ).toEqual(
    Array.from({ length: 7 }, () => ({ ariaCurrent: null, className: null, dataStatus: null })),
  );
  await expect(page.locator("#subMenuProjectMember")).toHaveClass("active");
  expect(await readProjectSettingsTabNativeLinkAudit(page)).toEqual([]);

  const settingsLink = page.locator("#subMenuProjectSetting a");
  await expect(settingsLink).toHaveAttribute("href", `${basePath}/admin/sample/setting`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await settingsLink.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/setting`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#subMenuProjectSetting")).toHaveClass("active");
  await expect(page.locator("#saveSetting")).toBeVisible();
});

test("project members converted internal links render legacy hrefs and navigate in the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMembers(page);

  await page.goto(`${basePath}/admin/sample/members`);
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator(".project-breadcrumb .project-name a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code`,
  );
  await expect(page.locator(".project-setting .project-menu-nav a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/setting`,
  );
  await expect(page.locator(".members.project .avatar-wrap").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator(".members.project .avatar-wrap").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );
  await expect(page.locator(".row-fluid .span2 .pull-left a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/bob`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await page.locator(".project-breadcrumb .project-name a").click();

  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("project members route source keeps navigation in Link and mutation URLs in data-href", () => {
  const source = readFileSync(PROJECT_MEMBERS_ROUTE_SOURCE, "utf8");

  expect(source).not.toMatch(/<a\b/);
  expect(source).not.toContain("as never");
  expect(source).not.toContain("search={undefined");
  expect(source).not.toContain("${projectName}/labels");
  expect(source).not.toMatch(/\/labels[`"]/);
  expect(source).not.toMatch(/(?<!data-)\bhref=\{prefixBasePath/);
  expect(source).not.toMatch(/(?<!data-)\bhref=\{projectHref/);
  expect(source).not.toContain('href="javascript:void(0)"');
  expect(source).not.toContain('href="#"');
  expect(source).toContain("data-href={prefixBasePath(");
  expect(source).toContain('to="/$ownerName/$projectName/setting"');
  expect(source).toContain('to="/$ownerName/$projectName/issue/labelsform"');
  expect(source).toContain('to="/$user"');
});

test("project members enrollment Add posts selected login like legacy member module", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests = await mockProjectMembers(page);

  await page.goto(`${basePath}/admin/sample/members`);
  await page.locator(".enrollAcceptBtn").click();

  await expect.poll(() => requests.addedLoginIds).toEqual(["bob"]);
  await expect(page.locator("#loginId")).toHaveValue("bob");
});

test("project members role and delete side effects use React buttons", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installDocumentDropdownBubbleAudit(page);
  const requests = await mockProjectMembers(page);

  await page.goto(`${basePath}/admin/sample/members`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });

  const roleGroup = page.locator('.members.project [data-name="roleof-alice"]');
  const roleToggle = roleGroup.locator(".dropdown-toggle");
  const roleApply = page
    .locator('.members.project [data-name="roleof-alice"] [data-action="apply"]')
    .first();
  await expect(roleGroup).toHaveAttribute("class", "btn-group");
  await expect(roleGroup).toHaveAttribute("data-name", "roleof-alice");
  await expect(roleToggle).toHaveAttribute("class", "btn dropdown-toggle large");
  await expect(roleToggle).toHaveAttribute("data-toggle", "dropdown");
  await expect(roleToggle.locator(".d-label")).toHaveText("Member");
  await expect(roleToggle.locator(".d-caret .caret")).toHaveCount(1);
  await expect(roleGroup.locator(".dropdown-menu li")).toHaveCount(2);
  await expect(roleGroup.locator('li[data-value="1"]')).not.toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(roleGroup.locator('li[data-value="2"]')).toHaveAttribute("data-selected", "true");
  await expect(roleGroup.locator('li[data-value="2"]')).toHaveClass("active");
  await expect(roleApply).toHaveJSProperty("tagName", "BUTTON");
  await expect(roleApply).toHaveAttribute("type", "button");
  await expect(roleApply).not.toHaveAttribute("href", /.+/);
  await expect(roleApply).toHaveAttribute("data-href", `${basePath}/admin/sample/member/2/edit`);
  await expect(roleApply).toHaveAttribute("data-loginid", "alice");
  await expect(roleApply).toHaveText("Manager");
  await expect(page.locator('[data-action="apply"][href="javascript:void(0)"]')).toHaveCount(0);
  await expect(roleGroup.locator('a[href="#"], a[href="javascript:void(0);"]')).toHaveCount(0);
  await roleToggle.click();
  await expect(roleGroup).toHaveClass("btn-group open");
  await expect(page).toHaveURL(`${basePath}/admin/sample/members`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect.poll(() => documentDropdownBubbleClicks(page)).toEqual([]);
  await expect
    .poll(() => roleButtonMetrics(roleApply))
    .toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderTopWidth: "0px",
      color: "rgb(51, 51, 51)",
      display: "block",
      lineHeight: "20px",
      padding: "3px 20px",
      textAlign: "left",
      width: 160,
    });

  const deleteControl = page.locator('.members.project [data-action="delete"]');
  await expect(deleteControl).toHaveJSProperty("tagName", "BUTTON");
  await expect(deleteControl).toHaveAttribute("type", "button");
  await expect(deleteControl).not.toHaveAttribute("href", /.+/);
  await expect(deleteControl).toHaveAttribute(
    "data-href",
    `${basePath}/admin/sample/member/2/delete`,
  );
  await expect(deleteControl).toHaveAttribute("class", "ybtn ybtn-danger ybtn-small");
  await expect(deleteControl).toHaveText("Delete");
  await expect(page.locator('[data-action="delete"][href="javascript:void(0)"]')).toHaveCount(0);

  const roleResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/members/2") &&
      response.request().method() === "PATCH",
  );
  await roleApply.click();
  await roleResponse;

  await expect
    .poll(() => requests.roleUpdates)
    .toEqual([{ hasCsrfToken: true, method: "PATCH", role: "manager", userId: "2" }]);
  await expect(page.locator('[data-name="roleof-alice"] .d-label')).toHaveText("Manager");
  await expect(page.locator('[data-name="roleof-alice"] li[data-value="1"]')).toHaveClass("active");
  await expect(page.locator('[data-name="roleof-alice"] li[data-value="1"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.locator('[data-name="roleof-alice"]')).toHaveAttribute("class", "btn-group");
  await expect(page).toHaveURL(`${basePath}/admin/sample/members`);

  const confirmMessage = page.waitForEvent("dialog").then(async (dialog) => {
    const message = dialog.message();
    await dialog.accept();
    return message;
  });
  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/members/2") &&
      response.request().method() === "DELETE",
  );
  await deleteControl.click();
  await expect(confirmMessage).resolves.toBe(
    "Are you sure you want this user to leave this project?",
  );
  await deleteResponse;

  await expect.poll(() => requests.deletedUserIds).toEqual(["2"]);
  await expect(page.locator(".members.project .member")).toHaveCount(1);
  await expect(page.locator(".members.project .member-id", { hasText: "@alice" })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("project members delete cancel and errors preserve legacy confirm alert UX", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests = await mockProjectMembers(page, {
    deleteMessage: "Project owner cannot leave his own project.",
    deleteStatus: 403,
  });

  await page.goto(`${basePath}/admin/sample/members`);
  const deleteControl = page.locator('.members.project [data-action="delete"]');

  const cancelConfirm = page.waitForEvent("dialog").then(async (dialog) => {
    const message = dialog.message();
    await dialog.dismiss();
    return message;
  });
  await deleteControl.click();
  await expect(cancelConfirm).resolves.toBe(
    "Are you sure you want this user to leave this project?",
  );
  await expect.poll(() => requests.deletedUserIds).toEqual([]);
  await expect(page.locator(".members.project .member")).toHaveCount(2);

  const dialogMessages: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogMessages.push(dialog.message());
    await dialog.accept();
  });
  await deleteControl.click();
  await expect
    .poll(() => dialogMessages)
    .toEqual([
      "Are you sure you want this user to leave this project?",
      "Project owner cannot leave his own project.",
    ]);
  await expect.poll(() => requests.deletedUserIds).toEqual(["2"]);
  await expect(page.locator(".members.project .member")).toHaveCount(2);
});

async function roleButtonMetrics(locator: ReturnType<Page["locator"]>) {
  return locator.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      backgroundColor: style.backgroundColor,
      borderTopWidth: style.borderTopWidth,
      color: style.color,
      display: style.display,
      lineHeight: style.lineHeight,
      padding: style.padding,
      textAlign: style.textAlign,
      width: Math.round(button.getBoundingClientRect().width),
    };
  });
}

test("project members renders legacy error/badrequest.scala.html shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMembers(page, { membersStatus: 400 });

  await page.goto(`${basePath}/admin/sample/members`);
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "The request cannot be fulfilled due to bad syntax",
  );
  await expect(page.locator("#addNewMember")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedProjectMembersErrorScreen({
        activeMenu: "setting",
        basePath,
        message: "The request cannot be fulfilled due to bad syntax",
      }),
    ),
  );
  expect(await projectMemberErrorMetrics(page)).toEqual({
    errorIconHeight: "80px",
    errorIconWidth: "50px",
    errorPaddingBottom: "100px",
    errorPaddingTop: "100px",
    errorTextAlign: "center",
    errorTextColor: "rgb(137, 137, 137)",
    errorTextFontSize: "16px",
    errorTextFontWeight: "700",
    errorTextMarginBottom: "30px",
    errorTextMarginTop: "30px",
    pageWrapOuterMinHeight: "450px",
    projectPageWrapMarginTop: "20px",
  });
});

test("project members renders legacy error/forbidden.scala.html shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMembers(page, { membersStatus: 403 });

  await page.goto(`${basePath}/admin/sample/members`);
  await expect(page.locator(".project-menu-gruop > li").first()).toHaveClass("active");
  await expect(page.locator(".project-setting .project-menu-nav > li")).toHaveClass("");
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText("You are not authorized");
  await expect(page.locator("#addNewMember")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedProjectMembersErrorScreen({
        activeMenu: "home",
        basePath,
        message: "You are not authorized",
      }),
    ),
  );
  expect(await projectMemberErrorMetrics(page)).toEqual({
    errorIconHeight: "80px",
    errorIconWidth: "50px",
    errorPaddingBottom: "100px",
    errorPaddingTop: "100px",
    errorTextAlign: "center",
    errorTextColor: "rgb(137, 137, 137)",
    errorTextFontSize: "16px",
    errorTextFontWeight: "700",
    errorTextMarginBottom: "30px",
    errorTextMarginTop: "30px",
    pageWrapOuterMinHeight: "450px",
    projectPageWrapMarginTop: "20px",
  });
});

test("project members header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectMembers(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/members`);
  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
  const favoriteStar = page.locator(".project-breadcrumb .user-project-list i");
  await expect(favoriteStar).not.toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project members header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectMembers(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/members`);
  const favoriteStar = page.locator(".project-breadcrumb .user-project-list i");
  await expect(favoriteStar).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).not.toHaveClass(/starred/);
});

async function installFavoriteSpanNativeListenerAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const favoriteListeners: string[] = [];
    Object.defineProperty(window, "__yonaFavoriteSpanNativeListeners", {
      configurable: true,
      value: favoriteListeners,
    });
    Element.prototype.addEventListener = function addEventListenerWithFavoriteAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof Element && this.matches(".project-breadcrumb .user-project-list")) {
        favoriteListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function favoriteSpanNativeListeners(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __yonaFavoriteSpanNativeListeners?: string[] })
        .__yonaFavoriteSpanNativeListeners ?? [],
  );
}

async function installProjectSettingsTabNativeLinkAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectSettingsTabNativeLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithProjectSettingsTabAudit(
      type,
      listener,
      options,
    ) {
      if (this.matches(".project-page-wrap > .nav.nav-tabs a")) {
        const parentId = this.parentElement?.id ?? "";
        (
          window as Window &
            typeof globalThis & { __projectSettingsTabNativeLinkListeners: string[] }
        ).__projectSettingsTabNativeLinkListeners.push(`${parentId}:${String(type)}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readProjectSettingsTabNativeLinkAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __projectSettingsTabNativeLinkListeners?: string[] }
      ).__projectSettingsTabNativeLinkListeners ?? [],
  );
}

async function installDocumentDropdownBubbleAudit(page: Page) {
  await page.addInitScript(() => {
    const dropdownClicks: string[] = [];
    Object.defineProperty(window, "__yonaDocumentDropdownBubbleClicks", {
      configurable: true,
      value: dropdownClicks,
    });
    document.addEventListener("click", (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('.members.project [data-name="roleof-alice"] [data-toggle="dropdown"]')
      ) {
        dropdownClicks.push("roleof-alice");
      }
    });
  });
}

async function documentDropdownBubbleClicks(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __yonaDocumentDropdownBubbleClicks?: string[] })
        .__yonaDocumentDropdownBubbleClicks ?? [],
  );
}

async function mockProjectMembers(
  page: Page,
  options: {
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    deleteMessage?: string;
    deleteStatus?: number;
    membersStatus?: number;
    project?: Partial<ReturnType<typeof projectContainer>>;
  } = {},
) {
  const requests = {
    addedLoginIds: [] as string[],
    deletedUserIds: [] as string[],
    roleUpdates: [] as {
      hasCsrfToken: boolean;
      method: string;
      role: string;
      userId: string;
    }[],
  };
  let currentMembers = [
    {
      avatarUrl: "/assets/images/default-avatar-32.png",
      isOwner: true,
      loginId: "admin",
      role: "manager",
      userId: 1,
      userLabel: "Site Admin",
    },
    {
      avatarUrl: "/assets/images/default-avatar-32.png",
      isOwner: false,
      loginId: "alice",
      role: "member",
      userId: 2,
      userLabel: "Alice Doe",
    },
  ];
  const memberDirectoryResponse = () => ({
    enrollmentRequests: [
      {
        avatarUrl: "/assets/images/default-avatar-32.png",
        loginId: "bob",
        userId: 3,
        userLabel: "Bob Smith",
      },
    ],
    members: currentMembers,
    ownerName: "admin",
    projectName: "sample",
    roleOptions: [
      { label: "Manager", role: "manager" },
      { label: "Member", role: "member" },
    ],
    viewerCanUpdate: true,
  });

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
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-members" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectContainer(), ...options.project }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/members/*", async (route) => {
    const request = route.request();
    const userId = new URL(request.url()).pathname.split("/").pop() ?? "";
    if (request.method() === "PATCH") {
      const body = request.postDataJSON() as { role?: string };
      requests.roleUpdates.push({
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-members",
        method: request.method(),
        role: body.role ?? "",
        userId,
      });
      currentMembers = currentMembers.map((member) =>
        String(member.userId) === userId ? { ...member, role: body.role ?? member.role } : member,
      );
    }
    if (request.method() === "DELETE") {
      requests.deletedUserIds.push(userId);
      if (options.deleteStatus) {
        await route.fulfill({
          status: options.deleteStatus,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "delete_failed",
              message: options.deleteMessage ?? "delete failed",
              status: options.deleteStatus,
            },
          }),
        });
        return;
      }
      currentMembers = currentMembers.filter((member) => String(member.userId) !== userId);
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(memberDirectoryResponse()),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/members", async (route) => {
    if (route.request().method() === "GET" && options.membersStatus) {
      await route.fulfill({
        status: options.membersStatus,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: options.membersStatus === 403 ? "forbidden" : "bad_request",
            message:
              options.membersStatus === 403
                ? "You are not authorized"
                : "The request cannot be fulfilled due to bad syntax",
            status: options.membersStatus,
          },
        }),
      });
      return;
    }
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { loginId?: string };
      requests.addedLoginIds.push(body.loginId ?? "");
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(memberDirectoryResponse()),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectSettings()),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [
          { isDefault: true, name: "main", shortName: "main" },
          { isDefault: false, name: "develop", shortName: "develop" },
        ],
        defaultBranch: "main",
        noHead: false,
        ownerName: "admin",
        permissions: { canDelete: true, canUpdate: true },
        projectName: "sample",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    const request = route.request();
    options.favoriteRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-members",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
    });
  });

  return requests;
}

function expectedProjectMembersErrorScreen({
  activeMenu,
  basePath,
  message,
}: {
  activeMenu: "home" | "setting";
  basePath: string;
  message: string;
}) {
  let html = EXPECTED_PROJECT_MEMBERS.replaceAll("__BASE_PATH__", basePath);
  if (activeMenu === "home") {
    html = html
      .replace(
        `<li class=""><a href="${basePath}/admin/sample"><span class="menu-name">Project home</span>`,
        `<li class="active"><a href="${basePath}/admin/sample"><span class="menu-name">Project home</span>`,
      )
      .replace(
        `<div class="project-setting"><ul class="project-menu-nav"><li class="active">`,
        `<div class="project-setting"><ul class="project-menu-nav"><li class="">`,
      );
  }
  const start = html.indexOf('<div class="page-wrap-outer">');
  const end = html.indexOf("<footer", start);
  return `${html.slice(0, start)}<div class="page-wrap-outer"><div class="project-page-wrap"><div class="error-wrap"><i class="ico ico-err2"></i><p>${message}</p></div></div></div>${html.slice(end)}`;
}

function projectContainer() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 1,
    id: 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    ownerName: "admin",
    projectName: "sample",
    vcs: "GIT",
    viewerCanUpdate: true,
  };
}

function projectSettings() {
  return {
    ...projectContainer(),
    backgroundUrl: "/assets/images/bg-default-project.png",
    codeMemberOnly: false,
    defaultReviewerCount: 2,
    isFavorited: false,
    isUsingReviewerCount: true,
    maxReviewerCount: 3,
    organizationName: "",
    overview: "Sample overview",
    projectId: 7,
    projectScope: "PUBLIC",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    watchCount: 5,
  };
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            (isProjectSettingMenuAnchor(node) ||
              (attr.name !== "aria-current" && attr.name !== "data-status")),
        )
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
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/, "").replaceAll('"', "'");
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }

    function isProjectSettingMenuAnchor(node: Element) {
      return node.matches(".project-page-wrap > .nav.nav-tabs a");
    }
  });
}

async function memberPageMetrics(page: Page) {
  return page.evaluate(() => {
    const addInput = requireElement("#loginId");
    const memberList = requireElement(".members.project");
    const firstMember = requireElement(".members.project .member");
    const memberName = requireElement(".members.project .member .member-name");
    const ownerLabel = requireElement(".members.project .member .owner");
    const avatar = requireElement(".members.project .member .avatar-wrap.mlarge");
    const memberSetting = requireElement(".members.project .member .member-setting");
    const roleControl = requireElement('.members.project .btn-group[data-name="roleof-alice"]');
    const addInputStyle = getComputedStyle(addInput);
    const memberListStyle = getComputedStyle(memberList);
    const firstMemberStyle = getComputedStyle(firstMember);
    const memberNameStyle = getComputedStyle(memberName);
    const ownerLabelStyle = getComputedStyle(ownerLabel);
    const avatarRect = avatar.getBoundingClientRect();
    const firstMemberRect = firstMember.getBoundingClientRect();
    const memberListRect = memberList.getBoundingClientRect();
    const memberSettingRect = memberSetting.getBoundingClientRect();

    return {
      addInputWidth: Math.round(parseFloat(addInputStyle.width)),
      avatarHeight: Math.round(avatarRect.height),
      avatarWidth: Math.round(avatarRect.width),
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
      ownerPadding: Math.round(parseFloat(ownerLabelStyle.paddingTop)),
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

async function projectMemberErrorMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const errorWrap = requireElement(".error-wrap");
    const errorIcon = requireElement(".error-wrap .ico-err2");
    const errorText = requireElement(".error-wrap p");
    const errorWrapStyle = getComputedStyle(errorWrap);
    const errorIconStyle = getComputedStyle(errorIcon);
    const errorTextStyle = getComputedStyle(errorText);

    return {
      errorIconHeight: errorIconStyle.height,
      errorIconWidth: errorIconStyle.width,
      errorPaddingBottom: errorWrapStyle.paddingBottom,
      errorPaddingTop: errorWrapStyle.paddingTop,
      errorTextAlign: errorWrapStyle.textAlign,
      errorTextColor: errorTextStyle.color,
      errorTextFontSize: errorTextStyle.fontSize,
      errorTextFontWeight: errorTextStyle.fontWeight,
      errorTextMarginBottom: errorTextStyle.marginBottom,
      errorTextMarginTop: errorTextStyle.marginTop,
      pageWrapOuterMinHeight: getComputedStyle(pageWrapOuter).minHeight,
      projectPageWrapMarginTop: getComputedStyle(projectPageWrap).marginTop,
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

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup;
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            (isProjectSettingMenuAnchor(node) ||
              (attr.name !== "aria-current" && attr.name !== "data-status")),
        )
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
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/, "").replaceAll('"', "'");
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }

    function isProjectSettingMenuAnchor(node: Element) {
      return node.matches(".project-page-wrap > .nav.nav-tabs a");
    }
  }, html);
}
