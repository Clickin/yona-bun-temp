import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_TRANSFER_FORM = `
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
      <li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/issue/labelsform">Issue Label</a></li>
      <li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li>
      <li id="subMenuProjectTransfer" class="active"><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li>
      <li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li>
      <li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li>
    </ul>
    <div class="bubble-wrap gray wp">
      <div class="row-fluid"><div class="cu-label">new owner or group</div><div class="cu-desc"><p><input type="text" id="owner" name="owner"></p></div></div>
      <div class="row-fluid"><div class="cu-label">Transfer</div><div class="cu-desc"><ul><li class="notice"><strong>This transfer will be done when the new owner or the group's admin accepts the request.</strong></li><li class="notice"><strong>This project will be owned by the new owner or group.</strong></li><li class="notice"><strong>When it's done, the project's current owner will be changed to a member of this project.</strong></li><li class="notice"><strong>The URL of all resources of this project will be changed including issues, postings and others.</strong></li><li class="notice"><strong>The URL of the repository of this project will be changed.</strong></li></ul><p><input type="checkbox" class="checkbox" autocomplete="off" id="accept"><label for="accept" class="bg-checkbox label-agreement">I agree with the transfer of this project.</label></p></div></div>
    </div>
    <div class="box-wrap bottom"><button id="btnTransfer" type="button" class="ybtn ybtn-danger"><i class="yobicon-database"></i> Transfer this project</button></div>
    <div id="alertTransfer" class="modal hide">
      <div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Do you want to transfer this project?</h3></div>
      <div class="modal-body"><p>If this project is transferred, the new owner or the group's admin will take all the rights of this project.</p><p>Are you sure?</p></div>
      <div class="modal-footer"><button id="btnTransferExec" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn" data-dismiss="modal">No</button></div>
    </div>
  </div>
</div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project transfer form matches legacy project/transfer.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator("#btnTransfer")).toBeVisible();
  await expect(page.locator("#alertTransfer")).toHaveClass(/hide/);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_TRANSFER_FORM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readDesktopTransferMetrics(page)).toEqual({
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
    descWidth: 206,
    labelWidth: 205,
    modalDisplay: "none",
    modalFooterPadding: "14px 15px 15px",
    modalHeaderPadding: "9px 15px",
    modalWidth: "560px",
    ownerInputHeight: "30px",
    ownerInputWidth: "206px",
    pageWrapMinWidth: "1100px",
    projectPageMarginTop: "20px",
    projectPageWidth: 1260,
    rowMinHeight: "0px",
    tabsMarginBottom: "15px",
  });
});

test("project transfer project navigation anchors keep legacy hrefs without route-local native listeners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installProjectNavigationNativeLinkAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator(".project-breadcrumb .project-name a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );

  const projectMenuLinks = page.locator(".project-menu-gruop > li > a");
  await expect(projectMenuLinks).toHaveCount(7);
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
  await expect(page.locator(".project-setting a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/setting`,
  );

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
  expect(await readProjectNavigationNativeLinkAudit(page)).toEqual([]);

  const projectSettingLink = page.locator(".project-setting a");
  await expect(projectSettingLink).toHaveAttribute("href", `${basePath}/admin/sample/setting`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await projectSettingLink.click();

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

test("project transfer settings tabs use direct TanStack Link targets", () => {
  const source = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/transfer.tsx", import.meta.url),
    "utf8",
  );

  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("ProjectSettingLink");
  expect(source).not.toContain("as never");
  expect(source).not.toContain("onMouseDown=");
  expect(source).not.toContain("search={undefined");
  expect(source).not.toContain("<a href={prefixBasePath");
  expect(source).not.toContain("<a href={projectHref");
  expect(source).toContain('to="/$user"');
  expect(source).toContain('to="/$ownerName/$projectName"');
  expect(source).toContain('to="/$ownerName/$projectName/code"');
  expect(source).toContain('to="/$ownerName/$projectName/issues"');
  expect(source).toContain('to="/$ownerName/$projectName/pullRequests"');
  expect(source).toContain('to="/$ownerName/$projectName/reviews"');
  expect(source).toContain('to="/$ownerName/$projectName/milestones"');
  expect(source).toContain('to="/$ownerName/$projectName/posts"');
  expect(source).toContain('to="/$ownerName/$projectName/setting"');
  expect(source).toContain('to="/$ownerName/$projectName/issue/labelsform"');
  expect(source).toContain('to="/$ownerName/$projectName/transfer"');
  expect(source).toContain("params={{ ownerName, projectName }}");
});

test("project transfer confirmation follows legacy accept gate and REST redirect flow", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const transferRequests: {
    body: unknown;
    hasCsrfToken: boolean;
    method: string;
    url: string;
  }[] = [];
  await guardTransferControlsAgainstNativeListeners(page);
  await mockProjectAdmin(page, { transferRequests });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });

  const alertTransfer = page.locator("#alertTransfer");
  await expect(alertTransfer).toHaveClass("modal hide");
  await expect(alertTransfer).toBeHidden();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  const alertPromise = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      resolve(message);
    });
  });
  await page.locator("#btnTransfer").click();
  await expect(alertPromise).resolves.toBe("You should agree with the transfer of this project.");
  await expect(alertTransfer).toHaveClass("modal hide");
  await expect(alertTransfer).toBeHidden();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.locator("#accept").check();
  await page.locator("#btnTransfer").click();
  await expect(alertTransfer).toHaveClass("modal in");
  await expect(alertTransfer).toBeVisible();
  await expect(alertTransfer).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);

  await page.locator('#alertTransfer [data-dismiss="modal"]').last().click();
  await expect(alertTransfer).toHaveClass("modal hide");
  await expect(alertTransfer).toBeHidden();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.locator("#btnTransfer").click();
  await expect(alertTransfer).toHaveClass("modal in");
  await page.locator("#alertTransfer .close").click();
  await expect(alertTransfer).toHaveClass("modal hide");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.locator("#owner").fill("target-owner");
  await page.locator("#btnTransfer").click();
  const transferResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/transfer") &&
      response.request().method() === "POST",
  );
  await page.locator("#btnTransferExec").click();
  await transferResponsePromise;

  expect(transferRequests).toEqual([
    {
      body: { destination: "target-owner" },
      hasCsrfToken: true,
      method: "POST",
      url: `${basePath}/api/v1/owners/admin/projects/sample/transfer`,
    },
  ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  expect(await readTransferNativeListenerCounts(page)).toEqual({
    alertTransferClick: 0,
    alertTransferMousedown: 0,
    btnTransferClick: 0,
    btnTransferMousedown: 0,
  });
});

test("project transfer confirmation sends only one request on repeated Yes clicks", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const transferRequests: {
    body: unknown;
    hasCsrfToken: boolean;
    method: string;
    url: string;
  }[] = [];
  await mockProjectAdmin(page, { transferRequests, transferResponseDelayMs: 250 });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await page.locator("#owner").fill("target-owner");
  await page.locator("#accept").check();
  await page.locator("#btnTransfer").click();
  await expect(page.locator("#alertTransfer")).toHaveClass("modal in");

  const transferResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/transfer") &&
      response.request().method() === "POST",
  );
  await page.locator("#btnTransferExec").dblclick();
  await expect(page.locator("#btnTransferExec")).toBeDisabled();
  await transferResponsePromise;
  await expect(page).toHaveURL(`${basePath}/admin/sample`);

  expect(transferRequests).toEqual([
    {
      body: { destination: "target-owner" },
      hasCsrfToken: true,
      method: "POST",
      url: `${basePath}/api/v1/owners/admin/projects/sample/transfer`,
    },
  ]);
});

test("project transfer confirmation reloads when success has no redirect path", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, { transferResponseWithoutRedirect: true });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await page.locator("#owner").fill("target-owner");
  await page.locator("#accept").check();
  await page.locator("#btnTransfer").click();
  await expect(page.locator("#alertTransfer")).toHaveClass("modal in");

  await page.locator("#btnTransferExec").click();
  await page.waitForFunction(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return navigation?.type === "reload";
  });
  await expect(page).toHaveURL(`${basePath}/admin/sample/transfer`);
});

test("project transfer header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/transfer`);
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
  await favoriteToggle.click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project transfer header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/transfer`);
  const favoriteToggle = page.locator(".project-breadcrumb .user-project-list");
  const favoriteStar = favoriteToggle.locator("i");
  await expect(favoriteToggle).toHaveAttribute("data-project-id", "7");
  await expect(favoriteStar).toHaveClass(/(?:^|\s)star(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)material-icons(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)va-text-top(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await favoriteToggle.click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).not.toHaveClass(/starred/);
});

test("project transfer header favorite star has no route-local native listener", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

async function readDesktopTransferMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const activeTab = requireElement("#subMenuProjectTransfer");
    const bubble = requireElement(".bubble-wrap.gray.wp");
    const firstRow = requireElement(".bubble-wrap.gray.wp > .row-fluid:first-child");
    const firstLabel = requireElement(".bubble-wrap.gray.wp .cu-label");
    const firstDesc = requireElement(".bubble-wrap.gray.wp .cu-desc");
    const ownerInput = requireElement("#owner");
    const accept = requireElement("#accept");
    const agreement = requireElement(".label-agreement");
    const bottom = requireElement(".box-wrap.bottom");
    const transferButton = requireElement("#btnTransfer");
    const modal = requireElement("#alertTransfer");
    const modalHeader = requireElement("#alertTransfer .modal-header");
    const modalFooter = requireElement("#alertTransfer .modal-footer");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const tabsStyle = getComputedStyle(tabs);
    const activeTabStyle = getComputedStyle(activeTab);
    const bubbleStyle = getComputedStyle(bubble);
    const rowStyle = getComputedStyle(firstRow);
    const descStyle = getComputedStyle(firstDesc);
    const ownerStyle = getComputedStyle(ownerInput);
    const acceptStyle = getComputedStyle(accept);
    const agreementStyle = getComputedStyle(agreement);
    const bottomStyle = getComputedStyle(bottom);
    const buttonStyle = getComputedStyle(transferButton);
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
      descWidth: Math.round(firstDesc.getBoundingClientRect().width),
      labelWidth: Math.round(firstLabel.getBoundingClientRect().width),
      modalDisplay: modalStyle.display,
      modalFooterPadding: modalFooterStyle.padding,
      modalHeaderPadding: modalHeaderStyle.padding,
      modalWidth: modalStyle.width,
      ownerInputHeight: ownerStyle.height,
      ownerInputWidth: ownerStyle.width,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      rowMinHeight: rowStyle.minHeight,
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
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    project?: Partial<ReturnType<typeof transferProject>>;
    transferRequests?: {
      body: unknown;
      hasCsrfToken: boolean;
      method: string;
      url: string;
    }[];
    transferResponseDelayMs?: number;
    transferResponseWithoutRedirect?: boolean;
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
      headers: { "x-csrf-token": "csrf-transfer" },
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
  await page.route("**/api/v1/owners/admin/projects/sample/transfer", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      options.transferRequests?.push({
        body: request.postDataJSON(),
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-transfer",
        method: request.method(),
        url: new URL(request.url()).pathname,
      });
      if (options.transferResponseDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.transferResponseDelayMs));
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...transferProject(),
          destination: "target-owner",
          ...(options.transferResponseWithoutRedirect ? {} : { redirectPath: "/admin/sample" }),
          transferId: 91,
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...transferProject(), ...options.project }),
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
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-transfer",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
    });
  });
}

async function guardTransferControlsAgainstNativeListeners(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const counts = {
      alertTransferClick: 0,
      alertTransferMousedown: 0,
      btnTransferClick: 0,
      btnTransferMousedown: 0,
    };
    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (this instanceof Element) {
        if (this.id === "btnTransfer" && type === "click") {
          counts.btnTransferClick += 1;
        }
        if (this.id === "btnTransfer" && type === "mousedown") {
          counts.btnTransferMousedown += 1;
        }
        if (this.id === "alertTransfer" && type === "click") {
          counts.alertTransferClick += 1;
        }
        if (this.id === "alertTransfer" && type === "mousedown") {
          counts.alertTransferMousedown += 1;
        }
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    (
      window as Window &
        typeof globalThis & {
          __transferNativeListenerCounts?: typeof counts;
        }
    ).__transferNativeListenerCounts = counts;
  });
}

async function readTransferNativeListenerCounts(page: Page) {
  return page.evaluate(() => {
    return (
      window as Window &
        typeof globalThis & {
          __transferNativeListenerCounts?: {
            alertTransferClick: number;
            alertTransferMousedown: number;
            btnTransferClick: number;
            btnTransferMousedown: number;
          };
        }
    ).__transferNativeListenerCounts;
  });
}

async function installProjectNavigationNativeLinkAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectNavigationNativeLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithProjectNavigationAudit(
      type,
      listener,
      options,
    ) {
      if (
        this.matches(
          ".project-breadcrumb a, .project-menu-outer a, .project-page-wrap > .nav.nav-tabs a",
        )
      ) {
        const parentId = this.parentElement?.id ?? "";
        (
          window as Window &
            typeof globalThis & { __projectNavigationNativeLinkListeners: string[] }
        ).__projectNavigationNativeLinkListeners.push(`${parentId}:${String(type)}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readProjectNavigationNativeLinkAudit(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __projectNavigationNativeLinkListeners?: string[] })
        .__projectNavigationNativeLinkListeners ?? [],
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

function transferProject() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    destination: "",
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
    ownerName: "admin",
    projectName: "sample",
    vcs: "GIT",
    viewerCanTransfer: true,
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
