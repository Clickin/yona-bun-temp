import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const EXPECTED_PROJECT_HOME = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li><li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class="active"><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-breadcrumb hide show-in-mobile"><span class="project-author"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span></div><div class="project-home-header row-fluid"><div class="project-overview span9 span-hard-wrap"><div class="project-description" data-toggle="project-description-tab"><h3><span id="project-description" class="markdown-wrap">Sample overview</span><button type="button" class="ybtn ybtn-minimum" data-toggle="description-edit"><i class="yobicon-edit"></i></button></h3></div><div class="project-description-edit hidden" data-toggle="project-description-tab"><form action="__BASE_PATH__/admin/sample/projectOverviewUpdate"><input type="text" id="project-description-input" class="span6" placeholder="Enter project description" value="Sample overview"><button type="button" class="ybtn ybtn-success" id="descriptionSaveBtn">Save</button> <button type="button" class="ybtn" data-toggle="description-cancel">Cancel</button></form></div></div><div class="project-clone-wrap span3 hide-in-mobile"><input type="text" class="project-clone-url" id="cloneURL" readonly="" value="https://example.com/admin/sample.git"><button class="ybtn project-clone-button" data-clipboard-target="cloneURL" id="cloneURLBtn">Copy URL</button></div></div><div class="row-fluid"><div class="span9 span-left-pane"><ul class="nav nav-tabs"><li class="active"><a href="__BASE_PATH__/admin/sample">README</a></li><li class=""><a href="__BASE_PATH__/admin/sample?tabId=history">History</a></li><li class=""><a href="__BASE_PATH__/admin/sample?tabId=dashboard">Dashboard</a></li></ul><div class="tab-content"><div class="tab-pane active"><div class="bubble-wrap gray readme"><p class="default"><span>README.md will be shown here if you add it to the code repository's root directory.</span><br><br><a href="__BASE_PATH__/admin/sample/postform?readme=true" class="ybtn">create README</a></p></div></div></div></div><div class="span3 span-right-pane"><div class="bubble-wrap gray project-home"><div class="project-btn-wrap"><span class="project-btn-item"><a href="__BASE_PATH__/admin/sample/issueform" class="ybtn ybtn-success">New issue</a></span><span class="project-btn-item"><a href="__BASE_PATH__/admin/sample/newFork" class="ybtn ybtn-inverse">Fork</a></span></div><div class="inner member-info"><header><h3>Project members</h3><a href="__BASE_PATH__/admin/sample/members" class="ybtn ybtn-minimum" id="member-add-link"><i class="yobicon-addfriend"></i> Add</a></header><div class="member-wrap"><ul class="project-members"><li class="member"><a href="__BASE_PATH__/admin" class="avatar-wrap img-rounded pull-left small"><img src="/assets/images/default-avatar-32.png" width="24" height="24"></a><a href="__BASE_PATH__/admin" class="name"><strong>Site Admin (admin)</strong></a></li></ul></div></div><button type="button" class="ybtn ybtn-minimum ybtn-danger pull-right" id="projectLeaveBtn" data-href="__BASE_PATH__/admin/sample/members/1">Leave project</button></div></div></div><div id="alertLeave" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Leave project</h3></div><div class="modal-body"><p>Do you want to leave this project?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-mini" id="leaveBtn">Yes</button><button type="button" class="ybtn ybtn-mini" data-dismiss="modal">No</button></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project home README tab matches legacy project/home.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page);

  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator("#project-description")).toBeVisible();
  await expect(page.locator(".bubble-wrap.gray.readme")).toBeVisible();
  await expect(page.locator("#alertLeave")).toHaveClass(/hide/);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_HOME.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project home README tab keeps legacy desktop and mobile proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page, {
    readmeFile: {
      bodyHtml: "<p>Server HTML should not render</p>",
      bodyMarkdown: "Project **README**",
      name: "README.md",
    },
  });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator(".project-home-header")).toBeVisible();

  const desktop = await projectHomeLayoutMetrics(page);
  expect(desktop.viewportWidth).toBe(1280);
  expect(desktop.mobileMediaMatches).toBe(false);
  expect(desktop.pageWrapMarginTop).toBe(20);
  expect(desktop.homeHeaderPaddingTop).toBe(5);
  expect(desktop.homeHeaderPaddingBottom).toBe(5);
  expect(desktop.homeHeaderMarginBottom).toBe(20);
  expect(desktop.overviewBorderLeftWidth).toBe(3);
  expect(desktop.overviewPaddingLeft).toBe(10);
  expect(desktop.descriptionFontSize).toBe(14);
  expect(desktop.descriptionLineHeight).toBe(30);
  expect(desktop.cloneUrlWidth).toBe(175);
  expect(desktop.readmePadding).toBe(5);
  expect(desktop.readmeHeaderPadding).toBe("10px 25px");
  expect(desktop.readmeBodyPadding).toBe("25px");
  expect(desktop.leftPanePercent).toBeCloseTo(74.47, 1);
  expect(desktop.rightPanePercent).toBeCloseTo(23.4, 1);
  expect(desktop.rightPaneDisplay).not.toBe("none");

  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator(".project-home-header")).toBeVisible();

  const mobile = await projectHomeLayoutMetrics(page);
  expect(mobile.pageWrapMarginTop).toBe(5);
  expect(mobile.pageWrapWidth).toBe(390);
  expect(mobile.leftPanePercent).toBeCloseTo(100, 1);
  expect(mobile.rightPaneDisplay).toBe("none");
  expect(mobile.readmeBodyPadding).toBe("0px");
});

test("project home README tab renders README Markdown instead of compatibility HTML", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page, {
    readmeFile: {
      bodyHtml: "<p>Server HTML should not render</p>",
      bodyMarkdown: "Project **README**",
      name: "README.md",
    },
  });

  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator("#project-description")).toBeVisible();
  await expect(page.locator(".readme-body")).toBeVisible();

  const expected = EXPECTED_PROJECT_HOME.replace(
    '<div class="bubble-wrap gray readme"><p class="default"><span>README.md will be shown here if you add it to the code repository\'s root directory.</span><br><br><a href="__BASE_PATH__/admin/sample/postform?readme=true" class="ybtn">create README</a></p></div>',
    '<div class="bubble-wrap gray readme"><div class="readme-wrap"><header><i class="yobicon-book-open vmiddle"></i><strong class="vmiddle"> README.md</strong><a href="__BASE_PATH__/admin/sample/postform?readme=true" class="ybtn vmiddle ml5">Edit</a></header><div class="readme-body markdown-wrap"><p>Project <strong>README</strong></p></div></div></div>',
  );
  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expected.replaceAll("__BASE_PATH__", basePath)),
  );
  await expect(page.locator(".readme-body")).not.toContainText("Server HTML should not render");
});

test("project home README tab treats an empty README file as an existing README", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page, {
    readmeFile: {
      bodyHtml: "",
      bodyMarkdown: "",
      name: "README.md",
    },
  });

  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator(".readme-wrap")).toBeVisible();
  await expect(page.locator(".readme-body.markdown-wrap")).toBeVisible();

  expect(await canonicalizeLocator(page, ".bubble-wrap.gray.readme")).toEqual(
    await canonicalizeHtml(
      page,
      `<div class="bubble-wrap gray readme"><div class="readme-wrap"><header><i class="yobicon-book-open vmiddle"></i><strong class="vmiddle"> README.md</strong><a href="${basePath}/admin/sample/postform?readme=true" class="ybtn vmiddle ml5">Edit</a></header><div class="readme-body markdown-wrap"></div></div></div>`,
    ),
  );
  await expect(page.locator(".bubble-wrap.gray.readme p.default")).toHaveCount(0);
});

test("project home leave modal posts legacy leave action", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const leaveRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectHome(page, { leaveRequests });

  await page.goto(`${basePath}/admin/sample`);
  await page.locator("#projectLeaveBtn").click();
  await expect(page.locator("#alertLeave")).not.toHaveClass(/hide/);

  await page.locator('#alertLeave [data-dismiss="modal"]').last().click();
  await expect(page.locator("#alertLeave")).toHaveClass(/hide/);
  expect(leaveRequests).toEqual([]);

  await page.locator("#projectLeaveBtn").click();
  await expect(page.locator("#alertLeave")).not.toHaveClass(/hide/);
  await page.locator("#leaveBtn").click();
  await expect(page).toHaveURL(`${basePath}/admin`);
  expect(leaveRequests).toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
});

test("project home description edit mirrors legacy toggle and save", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const overviewRequests: { hasCsrfToken: boolean; method: string; overview: string }[] = [];
  await mockProjectHome(page, { overviewRequests });

  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator(".project-description")).not.toHaveClass(/hidden/);
  await expect(page.locator(".project-description-edit")).toHaveClass(/hidden/);

  await page.locator('[data-toggle="description-edit"]').click();
  await expect(page.locator(".project-description")).toHaveClass(/hidden/);
  await expect(page.locator(".project-description-edit")).not.toHaveClass(/hidden/);
  await expect(page.locator("#project-description-input")).toBeFocused();

  await page.locator('[data-toggle="description-cancel"]').click();
  await expect(page.locator(".project-description")).not.toHaveClass(/hidden/);
  await expect(page.locator(".project-description-edit")).toHaveClass(/hidden/);
  expect(overviewRequests).toEqual([]);

  await page.locator('[data-toggle="description-edit"]').click();
  await page.locator("#project-description-input").fill("Updated overview");
  await page.locator("#descriptionSaveBtn").click();
  await expect(page.locator(".project-description")).not.toHaveClass(/hidden/);
  await expect(page.locator(".project-description-edit")).toHaveClass(/hidden/);
  await expect(page.locator("#project-description")).toHaveText("Updated overview");
  expect(overviewRequests).toEqual([
    { hasCsrfToken: true, method: "PATCH", overview: "Updated overview" },
  ]);
});

test("project home clone URL input selects the full URL on click", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page);

  await page.goto(`${basePath}/admin/sample`);
  await page.locator("#cloneURL").click();

  expect(await selectedInputValue(page, "#cloneURL")).toBe("https://example.com/admin/sample.git");
});

test("project home clone URL copy button writes URL and shows legacy toast", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text: string) {
          (window as unknown as { __copiedText?: string }).__copiedText = text;
          return Promise.resolve();
        },
      },
    });
  });
  await mockProjectHome(page);

  await page.goto(`${basePath}/admin/sample`);
  await page.locator("#cloneURLBtn").click();

  expect(await copiedText(page)).toBe("https://example.com/admin/sample.git");
  await expect(page.locator(".project-clone-wrap .yobiToasts .toast .msg")).toHaveText(
    "URL is copied",
  );
});

test("project home header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectHome(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample`);
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

test("project home header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectHome(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: {
      isFavorited: true,
    },
  });

  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).not.toHaveClass(/starred/);
});

test("project home header renders legacy watch utility for watchable projects", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHome(page, {
    project: {
      isWatching: false,
      viewerCanWatch: true,
      watchingCount: 5,
    },
  });

  await page.goto(`${basePath}/admin/sample`);

  expect(await canonicalizeLocator(page, ".project-util")).toEqual(
    await canonicalizeHtml(
      page,
      `<ul class="project-util"><li><div class="btn-group dropdown watch-btn"><a class="btn watcher-count no-border " data-toggle="tooltip" title="number of watcher" href="${basePath}/admin/sample/watchers">5</a><div class="dropdown-menu flat right title"><div class="pop-title">You are not watching the sample project.</div><div class="pop-content"><p>You will receive notifications, when the following events occur:</p><ul class="icons-ul"><li><i class="yobicon-li yobicon-ok"></i>when new posts, issues, and pull-requests are added.</li><li><i class="yobicon-li yobicon-ok"></i>when comments are added to your post, issue, or code.</li><li><i class="yobicon-li yobicon-ok"></i>when the issue of which you are author or assignee is changed.</li><li><i class="yobicon-li yobicon-ok"></i>when the pull request status is changed.</li></ul></div><div class="pop-content btn-wrap"><a class="ybtn" href="${basePath}/user/editform/notifications#7"><i class="yobicon-alert2"></i> Notification settings</a><button class="ybtn ybtn-watching watchBtn" type="button"><i class="yobicon-eye"></i> Watch</button></div></div><button class="btn nofocus no-border down-arrow" type="button" data-toggle="dropdown">Watch</button></div></li></ul>`,
    ),
  );

  const watchItem = page.locator(".project-util > li").first();
  await page.locator(".watch-btn .down-arrow").click();
  await expect(watchItem).toHaveClass(/open/);
  await page.locator(".watch-btn .down-arrow").click();
  await expect(watchItem).not.toHaveClass(/open/);
});

test("project home header renders and posts legacy enrollment utility for guest projects", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const enrollRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectHome(page, {
    enrollRequests,
    project: {
      enrollmentRequested: false,
      viewerCanEnroll: true,
      viewerCanLeave: false,
      viewerCanWatch: false,
    },
  });

  await page.goto(`${basePath}/admin/sample`);

  expect(await canonicalizeLocator(page, ".project-util")).toEqual(
    await canonicalizeHtml(
      page,
      `<ul class="project-util"><li><button class="ybtn ybtn-small dropdown-toggle" type="button" data-toggle="dropdown"><i class="yobicon-addfriend"></i>Member enrollment request</button><div class="dropdown-menu flat right title"><div class="pop-title">You can send a sign-up request for the sample project.</div><div class="pop-content">The project manager or other members of this project will check your sign-up request.</div><div class="pop-content btn-wrap"><button class="ybtn ybtn-info enrollBtn" id="enrollBtn" type="button"><i class="yobicon-addfriend"></i> Send sign-up request</button></div></div></li></ul>`,
    ),
  );

  const enrollmentItem = page.locator(".project-util > li").first();
  await expect(page.locator("a#enrollBtn")).toHaveCount(0);
  await expect(page.locator("button#enrollBtn")).toHaveAttribute("type", "button");
  await page.locator(".project-util .dropdown-toggle").click();
  await expect(enrollmentItem).toHaveClass(/open/);
  await page.locator(".project-util .dropdown-toggle").click();
  await expect(enrollmentItem).not.toHaveClass(/open/);
  await page.locator(".project-util .dropdown-toggle").click();
  await expect(enrollmentItem).toHaveClass(/open/);
  await rememberSpaMarker(page, "project-home-enroll");
  const enrollResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/enroll") &&
      response.request().method() === "POST",
  );
  await page.locator("#enrollBtn").click();
  await enrollResponsePromise;

  expect(enrollRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(enrollmentItem).not.toHaveClass(/open/);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  expect(await spaMarker(page)).toBe("project-home-enroll");
  expect(await canonicalizeLocator(page, ".project-util")).toEqual(
    await canonicalizeHtml(
      page,
      `<ul class="project-util"><li><button class="ybtn ybtn-small ybtn-info dropdown-toggle" type="button" data-toggle="dropdown"><i class="yobicon-addfriend"></i></button><div class="dropdown-menu flat right title"><div class="pop-title">You have sent a sign-up request for the sample project.</div><div class="pop-content">You will be a member of this project when the project manager or other members accept your request.</div><div class="pop-content btn-wrap"><button class="ybtn enrollBtn" id="enrollBtn" type="button"><i class="yobicon-removefriend"></i> Cancel sign-up request</button></div></div></li></ul>`,
    ),
  );
});

test("project home header enrollment utility cancels pending guest request", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const enrollRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectHome(page, {
    enrollRequests,
    project: {
      enrollmentRequested: true,
      viewerCanEnroll: true,
      viewerCanLeave: false,
      viewerCanWatch: false,
    },
  });

  await page.goto(`${basePath}/admin/sample`);
  const enrollmentItem = page.locator(".project-util > li").first();
  await expect(page.locator("a#enrollBtn")).toHaveCount(0);
  await expect(page.locator("button#enrollBtn")).toHaveAttribute("type", "button");
  await page.locator(".project-util .dropdown-toggle").click();
  await expect(enrollmentItem).toHaveClass(/open/);
  await rememberSpaMarker(page, "project-home-cancel-enroll");
  const enrollResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/enroll") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#enrollBtn").click();
  await enrollResponsePromise;

  expect(enrollRequests).toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
  await expect(enrollmentItem).not.toHaveClass(/open/);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  expect(await spaMarker(page)).toBe("project-home-cancel-enroll");
  expect(await canonicalizeLocator(page, ".project-util")).toEqual(
    await canonicalizeHtml(
      page,
      `<ul class="project-util"><li><button class="ybtn ybtn-small dropdown-toggle" type="button" data-toggle="dropdown"><i class="yobicon-addfriend"></i>Member enrollment request</button><div class="dropdown-menu flat right title"><div class="pop-title">You can send a sign-up request for the sample project.</div><div class="pop-content">The project manager or other members of this project will check your sign-up request.</div><div class="pop-content btn-wrap"><button class="ybtn ybtn-info enrollBtn" id="enrollBtn" type="button"><i class="yobicon-addfriend"></i> Send sign-up request</button></div></div></li></ul>`,
    ),
  );
});

test("project home header watch action posts and renders watching branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const watchRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectHome(page, {
    project: {
      isWatching: false,
      viewerCanWatch: true,
      watchingCount: 5,
    },
    watchRequests,
  });

  await page.goto(`${basePath}/admin/sample`);
  const watchItem = page.locator(".project-util > li").first();
  await expect(page.locator("a.watchBtn")).toHaveCount(0);
  await expect(page.locator("button.watchBtn")).toHaveAttribute("type", "button");
  await page.locator(".watch-btn .down-arrow").click();
  await expect(watchItem).toHaveClass(/open/);
  await rememberSpaMarker(page, "project-home-watch");
  const watchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/watch") &&
      response.request().method() === "POST",
  );
  await page.locator(".watchBtn").click();
  await watchResponsePromise;

  expect(watchRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(watchItem).not.toHaveClass(/open/);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  expect(await spaMarker(page)).toBe("project-home-watch");
  expect(await canonicalizeLocator(page, ".project-util")).toEqual(
    await canonicalizeHtml(
      page,
      `<ul class="project-util"><li><div class="btn-group dropdown watch-btn"><a class="btn watcher-count no-border watch-on" data-toggle="tooltip" title="number of watcher" href="${basePath}/admin/sample/watchers">6</a><div class="dropdown-menu flat right title"><div class="pop-title">You are watching the sample project.</div><div class="pop-content"><p>You will receive notifications, when the following events occur:</p><ul class="icons-ul"><li><i class="yobicon-li yobicon-ok"></i>when new posts, issues, and pull-requests are added.</li><li><i class="yobicon-li yobicon-ok"></i>when comments are added to your post, issue, or code.</li><li><i class="yobicon-li yobicon-ok"></i>when the issue of which you are author or assignee is changed.</li><li><i class="yobicon-li yobicon-ok"></i>when the pull request status is changed.</li></ul></div><div class="pop-content btn-wrap"><a class="ybtn" href="${basePath}/user/editform/notifications#7"><i class="yobicon-alert2"></i> Notification settings</a><button class="ybtn ybtn-watching watchBtn" type="button"><i class="yobicon-eye-off"></i> Unwatch</button></div></div><button class="btn nofocus no-border down-arrow" type="button" data-toggle="dropdown">Unwatch</button></div></li></ul>`,
    ),
  );
});

test("project home header unwatch action deletes and renders not-watching branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const watchRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectHome(page, {
    project: {
      isWatching: true,
      viewerCanWatch: true,
      watchingCount: 5,
    },
    watchRequests,
    watchResponseCount: 0,
  });

  await page.goto(`${basePath}/admin/sample`);
  const watchItem = page.locator(".project-util > li").first();
  await expect(page.locator("a.watchBtn")).toHaveCount(0);
  await expect(page.locator("button.watchBtn")).toHaveAttribute("type", "button");
  await page.locator(".watch-btn .down-arrow").click();
  await expect(watchItem).toHaveClass(/open/);
  await rememberSpaMarker(page, "project-home-unwatch");
  const watchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/watch") &&
      response.request().method() === "DELETE",
  );
  await page.locator(".watchBtn").click();
  await watchResponsePromise;

  expect(watchRequests).toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
  await expect(watchItem).not.toHaveClass(/open/);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  expect(await spaMarker(page)).toBe("project-home-unwatch");
  expect(await canonicalizeLocator(page, ".project-util")).toEqual(
    await canonicalizeHtml(
      page,
      `<ul class="project-util"><li><div class="btn-group dropdown watch-btn"><a class="btn watcher-count no-border " data-toggle="tooltip" title="number of watcher" href="${basePath}/admin/sample/watchers">0</a><div class="dropdown-menu flat right title"><div class="pop-title">You are not watching the sample project.</div><div class="pop-content"><p>You will receive notifications, when the following events occur:</p><ul class="icons-ul"><li><i class="yobicon-li yobicon-ok"></i>when new posts, issues, and pull-requests are added.</li><li><i class="yobicon-li yobicon-ok"></i>when comments are added to your post, issue, or code.</li><li><i class="yobicon-li yobicon-ok"></i>when the issue of which you are author or assignee is changed.</li><li><i class="yobicon-li yobicon-ok"></i>when the pull request status is changed.</li></ul></div><div class="pop-content btn-wrap"><a class="ybtn" href="${basePath}/user/editform/notifications#7"><i class="yobicon-alert2"></i> Notification settings</a><button class="ybtn ybtn-watching watchBtn" type="button"><i class="yobicon-eye"></i> Watch</button></div></div><button class="btn nofocus no-border down-arrow" type="button" data-toggle="dropdown">Watch</button></div></li></ul>`,
    ),
  );
});

test("project home route owns project-util dropdown state and explicit Link semantics", async () => {
  const source = await readFile("src/routes/$ownerName/$projectName.tsx", "utf8");

  expect(source).not.toMatch(/<a\b/u);
  expect(source).not.toMatch(/<\/a>/u);
  expect(source).not.toContain("LegacyLink");
  expect(source).not.toContain("RoutedLegacyLink");
  expect(source).not.toContain("useLinkProps");
  expect(source).not.toContain("function isRoutedHref");
  expect(source).not.toContain("createElement");
  expect(source).not.toContain("document.dispatchEvent");
  expect(source).not.toContain("yobi:notify-scan");
  expect(source).not.toContain('data-toggle="yobi-notify"');
  expect(source).not.toContain("onMouseDown=");
  expect(source).toContain("<YobiToast notice={cloneCopyNotice} />");
  expect(source).toContain("createFileRoute, Link, Outlet");
  expect(source).toContain("<Link activeProps={{}} to={toRoutePath(");
  expect(source).toContain("function HistoryLink(");
  expect(source).toContain('<HistoryLink basePath={basePath} href={actorUrl} className="actor">');
  expect(source).toContain('<HistoryLink basePath={basePath} href={itemUrl} className="where">');
  expect(source).not.toContain('<Link href={actorUrl} className="actor">');
  expect(source).not.toContain('<Link href={itemUrl} className="where">');
  expect(source).toContain("function toRoutePath(basePath: string, href: string)");
  expect(source).not.toContain("function toggleProjectUtilDropdown(toggle: HTMLElement)");
  expect(source).not.toContain("function closeProjectUtilDropdown");
  expect(source).not.toContain('querySelectorAll(".project-util li.open")');
  expect(source).not.toContain(".classList");
  expect(source).toContain('useState<"enrollment" | "watch" | null>');
  expect(source).toContain('className={projectUtilDropdown === "enrollment" ? "open" : undefined}');
  expect(source).toContain('className={projectUtilDropdown === "watch" ? "open" : undefined}');
  expect(source).not.toMatch(/<a\s+className="ybtn enrollBtn"/u);
  expect(source).not.toMatch(/<a\s+className="ybtn ybtn-info enrollBtn"/u);
  expect(source).not.toMatch(/<a\s+className="ybtn ybtn-watching watchBtn"/u);
});

async function rememberSpaMarker(page: Page, marker: string) {
  await page.evaluate((value) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = value;
  }, marker);
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
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

async function mockProjectHome(
  page: Page,
  overrides: Partial<{
    enrollRequests: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited: boolean;
    favoriteRequests: { hasCsrfToken: boolean; method: string }[];
    leaveRequests: { hasCsrfToken: boolean; method: string }[];
    overviewRequests: { hasCsrfToken: boolean; method: string; overview: string }[];
    project: Record<string, unknown>;
    readmeFile: unknown;
    watchResponseCount: number;
    watchRequests: { hasCsrfToken: boolean; method: string }[];
  }> = {},
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
      headers: { "x-csrf-token": "csrf-project-home" },
      body: JSON.stringify({
        session: {
          csrfToken: "csrf-project-home",
          projection: {},
          userId: 1,
        },
        user: {
          emailAddress: "admin@example.com",
          id: 1,
          isConfirmed: true,
          isSiteAdmin: true,
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    const request = route.request();
    overrides.favoriteRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-project-home",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favorited: overrides.favoriteResponseFavorited ?? true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/enroll", async (route) => {
    const request = route.request();
    overrides.enrollRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-project-home",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrollmentRequested: request.method() === "POST",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/members/1", async (route) => {
    const request = route.request();
    overrides.leaveRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-project-home",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ redirectPath: "/admin" }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/watch", async (route) => {
    const request = route.request();
    overrides.watchRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-project-home",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        isWatching: request.method() === "POST",
        watchingCount: overrides.watchResponseCount ?? (request.method() === "POST" ? 6 : 5),
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/overview", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as { overview?: string };
    overrides.overviewRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-project-home",
      method: request.method(),
      overview: body.overview ?? "",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        overview: body.overview ?? "",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        cloneUrl: "https://example.com/admin/sample.git",
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          noMilestoneOpenIssueCount: 0,
          pullRequests: [],
          unassignedOpenIssueCount: 0,
        },
        enrollmentRequestCount: 0,
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "admin",
            userId: 1,
            userLabel: "Site Admin",
          },
        ],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: overrides.readmeFile ?? null,
        vcs: "GIT",
        viewerCanCreateCommitResource: true,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        ...overrides.project,
      }),
    });
  });
}

async function selectedInputValue(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    if (!(element instanceof HTMLInputElement)) {
      return "";
    }
    return element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0);
  });
}

async function copiedText(page: Page) {
  return page.evaluate(() => (window as unknown as { __copiedText?: string }).__copiedText ?? "");
}

async function projectHomeLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    const numberStyle = (selector: string, property: string) =>
      Number.parseFloat(style(selector).getPropertyValue(property));
    const style = (selector: string) =>
      getComputedStyle(document.querySelector(selector) as Element);
    const rect = (selector: string) =>
      (document.querySelector(selector) as HTMLElement).getBoundingClientRect();
    const pageWrap = rect(".project-page-wrap");
    const leftPane = rect(".span-left-pane");
    const rightPane = rect(".span-right-pane");

    return {
      cloneUrlWidth: rect("#cloneURL").width,
      descriptionFontSize: numberStyle(".project-overview h3", "font-size"),
      descriptionLineHeight: numberStyle(".project-overview h3", "line-height"),
      homeHeaderMarginBottom: numberStyle(".project-home-header", "margin-bottom"),
      homeHeaderPaddingBottom: numberStyle(".project-home-header", "padding-bottom"),
      homeHeaderPaddingTop: numberStyle(".project-home-header", "padding-top"),
      leftPanePercent: (leftPane.width / pageWrap.width) * 100,
      overviewBorderLeftWidth: numberStyle(".project-overview", "border-left-width"),
      overviewPaddingLeft: numberStyle(".project-overview", "padding-left"),
      pageWrapMarginTop: numberStyle(".project-page-wrap", "margin-top"),
      pageWrapWidth: pageWrap.width,
      readmeBodyPadding: style(".readme .readme-wrap .readme-body").padding,
      readmeHeaderPadding: style(".readme .readme-wrap header").padding,
      readmePadding: numberStyle(".bubble-wrap.gray.readme", "padding-top"),
      rightPaneDisplay: style(".span-right-pane").display,
      rightPanePercent: (rightPane.width / pageWrap.width) * 100,
      mobileMediaMatches: window.matchMedia("(max-width: 900px)").matches,
      viewportWidth: window.innerWidth,
    };
  });
}

async function canonicalizeLocator(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

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
        .map((attr) => normalizeSerializedAttr(node, attr))
        .filter(Boolean)
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

    function normalizeSerializedAttr(node: Element, attr: Attr) {
      if (attr.name === "aria-current" || attr.name === "data-status") {
        return "";
      }
      if (node.matches("#mySidenav .user-menu > a") && attr.name === "class") {
        const className = attr.value
          .split(/\s+/u)
          .filter((name) => name && name !== "active")
          .join(" ");
        return className ? `${attr.name}=${JSON.stringify(className)}` : "";
      }
      return `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`;
    }
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
        .map((attr) => normalizeSerializedAttr(node, attr))
        .filter(Boolean)
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

    function normalizeSerializedAttr(node: Element, attr: Attr) {
      if (attr.name === "aria-current" || attr.name === "data-status") {
        return "";
      }
      if (node.matches("#mySidenav .user-menu > a") && attr.name === "class") {
        const className = attr.value
          .split(/\s+/u)
          .filter((name) => name && name !== "active")
          .join(" ");
        return className ? `${attr.name}=${JSON.stringify(className)}` : "";
      }
      return `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`;
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
