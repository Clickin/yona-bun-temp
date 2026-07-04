import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_CHANGE_VCS_FORM = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class="active"><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <ul class="nav nav-tabs">
      <li id="subMenuProjectSetting" class=""><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li>
      <li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li>
      <li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/labels">Issue Label</a></li>
      <li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li>
      <li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li>
      <li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li>
      <li id="subMenuProjectChangeVCS" class="active"><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li>
    </ul>
    <div class="bubble-wrap gray wp">
      <div class="row-fluid">
        <h3>GIT <i class="yobicon-right-2 vmiddle"></i> Subversion</h3>
        <div class="cu-desc">
          <ul><li class="notice"><strong>Changing the repository to Subversion.</strong></li><li class="notice"><strong>If the repository is changed, all code and history will be deleted.</strong></li></ul>
          <p><input id="acceptChangeVCS" type="checkbox" class="checkbox" autocomplete="off"><label for="acceptChangeVCS" class="bg-checkbox label-agreement">I agree with changing the repository type.</label></p>
        </div>
      </div>
    </div>
    <div class="box-wrap bottom"><button id="btnChangeVCS" type="button" class="ybtn ybtn-danger"><i class="yobicon-database"></i> Change Repository Type.</button></div>
    <div id="alertChangeVCS" class="modal hide">
      <div class="modal-header"><button type="button" class="close">×</button><h3>Do you want to change the repository to Subversion?</h3></div>
      <div class="modal-body"><p>If the repository is changed, all code and history will be deleted.</p><p>Are you sure?</p></div>
      <div class="modal-footer"><button id="btnChangeVCSExec" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn">No</button></div>
    </div>
  </div>
</div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project change-VCS form matches legacy project/change_vcs.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  await expect(page.locator("#btnChangeVCS")).toBeVisible();
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/hide/);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_CHANGE_VCS_FORM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readDesktopChangeVcsMetrics(page)).toEqual({
    activeTabClass: "active",
    activeTabHeight: "38px",
    agreementLineHeight: "20px",
    agreementMarginLeft: "0px",
    bottomPadding: "20px 0px 12px",
    bubbleBackground: "rgb(247, 247, 247)",
    bubblePadding: "20px 20px 10px",
    bubbleWidth: 1260,
    buttonHeight: "31px",
    buttonLineHeight: "20px",
    buttonPadding: "4px 12px",
    checkboxMargin: "2px",
    descMarginLeft: "0px",
    descWidth: 413,
    headingFontSize: "24.5px",
    headingLineHeight: "40px",
    headingMargin: "0px",
    modalDisplay: "none",
    modalFooterPadding: "14px 15px 15px",
    modalHeaderPadding: "9px 15px",
    modalWidth: "560px",
    pageWrapMinWidth: "1100px",
    projectPageMarginTop: "20px",
    projectPageWidth: 1260,
    tabsMarginBottom: "15px",
  });
});

test("project change-VCS confirmation modal opens, closes, posts, and redirects through SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const changeVcsRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await auditChangeVcsNativeListeners(page);
  await mockProjectAdmin(page, { changeVcsRequests });

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe("You should agree with changing the repository type.");
    await dialog.accept();
  });
  await page.locator("#btnChangeVCS").click();
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.locator("#acceptChangeVCS").check();
  await page.locator("#btnChangeVCS").click();
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide in");
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);

  await page.locator("#alertChangeVCS .modal-footer .ybtn").filter({ hasText: "No" }).click();
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.locator("#btnChangeVCS").click();
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide in");
  await page.locator("#alertChangeVCS .close").click();
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await page.locator("#btnChangeVCS").click();
  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/change-vcs") &&
      response.request().method() === "POST",
  );
  await page.locator("#btnChangeVCSExec").click();
  await postResponsePromise;

  expect(changeVcsRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  expect(await readChangeVcsNativeListenerAudit(page)).toEqual([]);
});

test("project change-VCS POST failure hides modal and alerts the legacy error", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const changeVcsRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, { changeVcsPostStatus: 500, changeVcsRequests });

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  await page.locator("#acceptChangeVCS").check();
  await page.locator("#btnChangeVCS").click();
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide in");

  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/change-vcs") &&
      response.request().method() === "POST",
  );
  const dialogPromise = new Promise<void>((resolve) => {
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe("Can't change repository type");
      await dialog.accept();
      resolve();
    });
  });
  await page.locator("#btnChangeVCSExec").click();
  await postResponsePromise;
  await dialogPromise;

  expect(changeVcsRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/changeVCS`);
});

test("project change-VCS internal project links keep legacy hrefs without route-local native listeners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installProjectChangeVcsInternalLinkNativeAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  const headerLinks = page.locator(".project-header-outer a");
  await expect(headerLinks).toHaveCount(2);
  await expect(headerLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin`);
  await expect(headerLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample`);

  const projectMenuLinks = page.locator(".project-menu-outer a");
  await expect(projectMenuLinks).toHaveCount(8);
  await expect(projectMenuLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectMenuLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/code`);
  await expect(projectMenuLinks.nth(2)).toHaveAttribute("href", `${basePath}/admin/sample/issues`);
  await expect(projectMenuLinks.nth(3)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequests`,
  );
  await expect(projectMenuLinks.nth(4)).toHaveAttribute("href", `${basePath}/admin/sample/reviews`);
  await expect(projectMenuLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones`,
  );
  await expect(projectMenuLinks.nth(6)).toHaveAttribute("href", `${basePath}/admin/sample/posts`);
  await expect(projectMenuLinks.nth(7)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);

  const settingTabLinks = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(settingTabLinks).toHaveCount(7);
  await expect(settingTabLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(settingTabLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/members`);
  await expect(settingTabLinks.nth(2)).toHaveAttribute("href", `${basePath}/admin/sample/labels`);
  await expect(settingTabLinks.nth(3)).toHaveAttribute("href", `${basePath}/admin/sample/webhooks`);
  await expect(settingTabLinks.nth(4)).toHaveAttribute("href", `${basePath}/admin/sample/transfer`);
  await expect(settingTabLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/deleteform`,
  );
  await expect(settingTabLinks.nth(6)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/changeVCS`,
  );
  expect(await readProjectChangeVcsInternalLinkNativeAudit(page)).toEqual([]);

  const projectSettingsCogLink = page.locator(".project-setting a");
  await expect(projectSettingsCogLink).toHaveAttribute("href", `${basePath}/admin/sample/setting`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await projectSettingsCogLink.click();

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

test("project change-VCS settings tabs use direct TanStack Link targets", () => {
  const source = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/changeVCS.tsx", import.meta.url),
    "utf8",
  );

  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("ProjectSettingLink");
  expect(source).not.toMatch(/<a\s+href=\{(?:prefixBasePath|projectHref)/);
  expect(source).toContain('to="/$user"');
  expect(source).toContain('to="/$ownerName/$projectName"');
  expect(source).toContain('to="/$ownerName/$projectName/code"');
  expect(source).toContain('to="/$ownerName/$projectName/setting"');
  expect(source).toContain('to="/$ownerName/$projectName/changeVCS"');
  expect(source).toContain("params={{ ownerName, projectName }}");
});

test("project change-VCS header favorite star posts and toggles starred class", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  const favoriteToggle = page.locator(".project-breadcrumb .user-project-list");
  const favoriteStar = favoriteToggle.locator("i");
  await expect(favoriteToggle).toHaveAttribute("data-project-id", "7");
  await expect(favoriteStar).toHaveClass(/(?:^|\s)star(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)material-icons(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)va-text-top(?:\s|$)/);
  await expect(favoriteStar).not.toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await favoriteToggle.dispatchEvent("mousedown");
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project change-VCS header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  const favoriteStar = page.locator(".project-breadcrumb .user-project-list i");
  await expect(favoriteStar).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").dispatchEvent("mousedown");
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).not.toHaveClass(/starred/);
});

test("project change-VCS header favorite star has no route-local native listener", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/changeVCS`);

  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

async function readDesktopChangeVcsMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const activeTab = requireElement("#subMenuProjectChangeVCS");
    const bubble = requireElement(".bubble-wrap.gray.wp");
    const heading = requireElement(".bubble-wrap.gray.wp h3");
    const desc = requireElement(".bubble-wrap.gray.wp .cu-desc");
    const accept = requireElement("#acceptChangeVCS");
    const agreement = requireElement(".label-agreement");
    const bottom = requireElement(".box-wrap.bottom");
    const changeButton = requireElement("#btnChangeVCS");
    const modal = requireElement("#alertChangeVCS");
    const modalHeader = requireElement("#alertChangeVCS .modal-header");
    const modalFooter = requireElement("#alertChangeVCS .modal-footer");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const tabsStyle = getComputedStyle(tabs);
    const activeTabStyle = getComputedStyle(activeTab);
    const bubbleStyle = getComputedStyle(bubble);
    const headingStyle = getComputedStyle(heading);
    const descStyle = getComputedStyle(desc);
    const acceptStyle = getComputedStyle(accept);
    const agreementStyle = getComputedStyle(agreement);
    const bottomStyle = getComputedStyle(bottom);
    const buttonStyle = getComputedStyle(changeButton);
    const modalStyle = getComputedStyle(modal);
    const modalHeaderStyle = getComputedStyle(modalHeader);
    const modalFooterStyle = getComputedStyle(modalFooter);
    return {
      activeTabClass: activeTab.className,
      activeTabHeight: activeTabStyle.height,
      agreementLineHeight: agreementStyle.lineHeight,
      agreementMarginLeft: agreementStyle.marginLeft,
      bottomPadding: bottomStyle.padding,
      bubbleBackground: bubbleStyle.backgroundColor,
      bubblePadding: bubbleStyle.padding,
      bubbleWidth: Math.round(bubble.getBoundingClientRect().width),
      buttonHeight: buttonStyle.height,
      buttonLineHeight: buttonStyle.lineHeight,
      buttonPadding: buttonStyle.padding,
      checkboxMargin: acceptStyle.margin,
      descMarginLeft: descStyle.marginLeft,
      descWidth: Math.round(desc.getBoundingClientRect().width),
      headingFontSize: headingStyle.fontSize,
      headingLineHeight: headingStyle.lineHeight,
      headingMargin: headingStyle.margin,
      modalDisplay: modalStyle.display,
      modalFooterPadding: modalFooterStyle.padding,
      modalHeaderPadding: modalHeaderStyle.padding,
      modalWidth: modalStyle.width,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      tabsMarginBottom: tabsStyle.marginBottom,
    };

    function requireElement(selector: string): HTMLElement {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function mockProjectAdmin(
  page: Page,
  options: {
    changeVcsPostStatus?: number;
    changeVcsRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    project?: Partial<ReturnType<typeof projectChangeVcs>>;
  } = {},
) {
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
      headers: { "x-csrf-token": "csrf-change-vcs" },
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
  await page.route("**/api/v1/owners/admin/projects/sample/change-vcs", async (route) => {
    if (route.request().method() === "POST") {
      const request = route.request();
      options.changeVcsRequests?.push({
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-change-vcs",
        method: request.method(),
      });
      if (options.changeVcsPostStatus && options.changeVcsPostStatus >= 400) {
        await route.fulfill({
          contentType: "application/json",
          status: options.changeVcsPostStatus,
          body: JSON.stringify({ message: "change VCS failed" }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...projectChangeVcs(),
          ...options.project,
          redirectPath: "/admin/sample",
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectChangeVcs(), ...options.project }),
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
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-change-vcs",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
    });
  });
}

async function auditChangeVcsNativeListeners(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const records: string[] = [];
    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (
        this instanceof Element &&
        (this.id === "btnChangeVCS" ||
          this.id === "alertChangeVCS" ||
          Boolean(this.closest("#alertChangeVCS")))
      ) {
        records.push(`${this.id || this.className}:${type}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    (
      window as Window & typeof globalThis & { __changeVcsNativeListenerAudit?: typeof records }
    ).__changeVcsNativeListenerAudit = records;
  });
}

async function readChangeVcsNativeListenerAudit(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __changeVcsNativeListenerAudit?: string[] })
        .__changeVcsNativeListenerAudit ?? [],
  );
}

async function installProjectChangeVcsInternalLinkNativeAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectChangeVcsInternalLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithChangeVcsSettingsTabAudit(
      type,
      listener,
      options,
    ) {
      if (
        this.matches(
          ".project-header-outer a, .project-menu-outer a, .project-page-wrap > .nav.nav-tabs a",
        )
      ) {
        (
          window as Window &
            typeof globalThis & { __projectChangeVcsInternalLinkListeners: string[] }
        ).__projectChangeVcsInternalLinkListeners.push(
          `${this.getAttribute("href") ?? ""}:${String(type)}`,
        );
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readProjectChangeVcsInternalLinkNativeAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __projectChangeVcsInternalLinkListeners?: string[] }
      ).__projectChangeVcsInternalLinkListeners ?? [],
  );
}

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

function projectChangeVcs() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    currentVcs: "GIT",
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
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
    nextVcs: "Subversion",
    ownerName: "admin",
    projectName: "sample",
    vcs: "GIT",
    viewerCanChange: true,
    viewerCanUpdate: true,
  };
}

function projectSettings() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    backgroundUrl: "/assets/images/bg-default-project.png",
    codeMemberOnly: false,
    defaultReviewerCount: 2,
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    isUsingReviewerCount: true,
    logoUrl: "/assets/images/project_default_logo.png",
    maxReviewerCount: 3,
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    organizationName: "",
    overview: "Sample overview",
    ownerName: "admin",
    projectId: 7,
    projectName: "sample",
    projectScope: "PUBLIC",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanUpdate: true,
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
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .filter((attr) => attr.name !== "aria-current" && attr.name !== "data-status")
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
        .filter((attr) => attr.name !== "aria-current" && attr.name !== "data-status")
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
