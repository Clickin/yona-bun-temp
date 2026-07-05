import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const PROJECT_FORK_ROUTE_SOURCE = "src/routes/$ownerName/$projectName/newFork.tsx";
const PROJECT_FORK_OWNER_ROUTE_SOURCE =
  "src/routes/$ownerName/$projectName/newFork/$forkOwnerName.tsx";

const EXPECTED_PROJECT_FORK_FORM = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__ROOT_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class="active"><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/fork" method="post" class="form-horizontal nm"><input type="hidden" name="owner" value="admin"><fieldset><legend><h4 style="padding-top:10px">admin / sample Fork</h4></legend><div id="helpMessage" class="well"><div class="row-fluid"><div class="pull-left"><img class="img-polaroid" src="/assets/images/fork-pull/fork.jpg"><br></div><div class="pull-left help-messages"><p class="lead">Fork this project's repository.</p><p>"Forking" is a great way to contribute to someone else's project even without write access to it.</p><p>Once you fork a project, you can contribute your code by sending pull requests.</p></div></div></div><div class="control-group"><label class="control-label" for="inputOwner">Owner Name</label><div class="controls"><select id="project-owner" name="owner"><option data-url="__BASE_PATH__/admin/sample/newFork/admin" value="admin">admin</option><option data-url="__BASE_PATH__/admin/sample/newFork/devs" value="devs">devs</option></select></div></div><div class="control-group"><label class="control-label" for="inputName">Project name</label><div class="controls"><input type="text" id="inputName" name="name" value="sample"><span class="help-inline">Enter name in alphabetnumerical or symbol characters(_-.)</span></div></div><div class="control-group"><label class="control-label">Share Options</label><div class="controls"><input name="projectScope" type="radio" id="public" value="PUBLIC" class="radio-btn" checked=""><label for="public" class="bg-radiobtn label-public">PUBLIC</label><input name="projectScope" type="radio" id="private" value="PRIVATE" class="radio-btn"><label for="private" class="bg-radiobtn label-private">PRIVATE</label></div></div><div class="control-group"><div class="controls"><button type="submit" class="ybtn ybtn-info">Fork</button><a href="__BASE_PATH__/admin/sample/pullRequests" class="ybtn">Cancel</a></div></div></fieldset></form></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_PROJECT_FORK_CLONE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="content-wrap frm-wrap"><legend>Forking admin / sample project into admin / sample-fork project</legend><p>Please wait. This process may take a long time depending on the number of files and the history of the original project.</p><p>You will be moved automatically to the new project after this process ends.</p></div></div></div>
`;

const EXPECTED_PROJECT_FORK_EXISTING_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/fork" method="post" class="form-horizontal nm"><input type="hidden" name="owner" value="devs"><fieldset><legend><h4 style="padding-top:10px">admin / sample Fork</h4></legend><div id="helpMessage" class="well"><div class="row-fluid"><div class="help-messages center-txt"><i class="ico ico-err2"></i><p>Same forked project already exists.</p><p><strong class="vmiddle">admin / sample</strong><i class="yobicon-right vmiddle"></i><a href="__BASE_PATH__/devs/sample" class="vmiddle primary-txt">devs / sample</a></p></div></div></div><div class="control-group"><label class="control-label" for="inputOwner">Owner Name</label><div class="controls"><select id="project-owner" name="owner"><option data-url="__BASE_PATH__/admin/sample/newFork/admin" value="admin">admin</option><option data-url="__BASE_PATH__/admin/sample/newFork/devs" value="devs" selected="">devs</option></select></div></div><div class="control-group"><label class="control-label" for="inputName">Project name</label><div class="controls"><input type="text" id="inputName" name="name" value="sample"><span class="help-inline">Enter name in alphabetnumerical or symbol characters(_-.)</span></div></div><div class="control-group"><label class="control-label">Share Options</label><div class="controls"><input name="projectScope" type="radio" id="public" value="PUBLIC" class="radio-btn" checked=""><label for="public" class="bg-radiobtn label-public">PUBLIC</label><input name="projectScope" type="radio" id="protected" value="PROTECTED" class="radio-btn"><label for="protected" class="bg-radiobtn label-protected">GROUP PUBLIC</label><input name="projectScope" type="radio" id="private" value="PRIVATE" class="radio-btn"><label for="private" class="bg-radiobtn label-private">PRIVATE</label></div></div><div class="control-group"><div class="controls"><button type="submit" class="ybtn ybtn-info">Fork</button><a href="__BASE_PATH__/admin/sample/pullRequests" class="ybtn">Cancel</a></div></div></fieldset></form></div></div></div>
`;

test("project fork form matches legacy git/fork.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const rootPath = basePath.endsWith("/") ? basePath : `${basePath}/`;
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/newFork`);
  await expect(page.locator("#helpMessage")).toBeVisible();
  await expect(page.locator(".content-wrap.frm-wrap form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/fork`,
  );

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_FORK_FORM.replaceAll("__BASE_PATH__", basePath).replaceAll(
        "__ROOT_PATH__",
        rootPath,
      ),
    ),
  );
});

test("project fork owner route renders legacy existing-fork state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdminWithExistingFork(page);

  await page.goto(`${basePath}/admin/sample/newFork/devs`);

  await expect(page.locator("#project-owner")).toHaveValue("devs");
  expect(await canonicalizePageWrap(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_FORK_EXISTING_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project fork owner route remounts the legacy fork form for concrete owner state", async () => {
  const source = readFileSync(PROJECT_FORK_OWNER_ROUTE_SOURCE, "utf8");

  expect(source).toContain('createFileRoute("/$ownerName/$projectName/newFork/$forkOwnerName")');
  expect(source).toContain("key={`${ownerName}/${projectName}/${forkOwnerName}`}");
  expect(source).toContain("forkOwnerName={forkOwnerName}");
  expect(source).not.toMatch(/<a(?:\s|>)/u);
  expect(source).not.toContain("</a>");
  expect(source).not.toContain('href="#"');
  expect(source).not.toContain("javascript:");
});

test("project fork route-local links preserve legacy hrefs and navigate in the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdminWithExistingFork(page);
  await mockPullRequestsDestination(page);

  await page.goto(`${basePath}/admin/sample/newFork/devs`);

  const existingForkLink = page.locator("#helpMessage a.vmiddle.primary-txt", {
    hasText: "devs / sample",
  });
  await expect(existingForkLink).toHaveAttribute("href", `${basePath}/devs/sample`);
  await expect(existingForkLink).toHaveClass("vmiddle primary-txt");
  await expect(existingForkLink).toHaveText("devs / sample");

  const cancelLink = page.locator(".content-wrap.frm-wrap a.ybtn", { hasText: "Cancel" });
  await expect(cancelLink).toHaveAttribute("href", `${basePath}/admin/sample/pullRequests`);
  await expect(cancelLink).toHaveClass("ybtn");
  await expect(cancelLink).toHaveText("Cancel");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "fork-link";
  });
  await cancelLink.click();

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath}/admin/sample/pullRequests`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("fork-link");
});

test("project fork shell anchors keep legacy active state on owning list items", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdminWithExistingFork(page);

  await page.goto(`${basePath}/admin/sample/newFork/devs`);

  const breadcrumbOwnerLink = page.locator(".project-breadcrumb .project-author a");
  await expect(breadcrumbOwnerLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(breadcrumbOwnerLink).toHaveText("admin");
  await expectNoTanStackActiveMarkers(breadcrumbOwnerLink);

  const breadcrumbProjectLink = page.locator(".project-breadcrumb .project-name a");
  await expect(breadcrumbProjectLink).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(breadcrumbProjectLink).toHaveText("sample");
  await expectNoTanStackActiveMarkers(breadcrumbProjectLink);

  const pullRequestMenuItem = page.locator(".project-menu-gruop > li", {
    has: page.locator('a[href$="/admin/sample/pullRequests"]'),
  });
  await expect(pullRequestMenuItem).toHaveClass("active");
  const pullRequestMenuLink = pullRequestMenuItem.locator("a");
  await expect(pullRequestMenuLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequests`,
  );
  await expect(pullRequestMenuLink.locator(".menu-name")).toHaveText("Pull request");
  await expect(pullRequestMenuLink).not.toHaveAttribute("class", /active/u);
  await expectNoTanStackActiveMarkers(pullRequestMenuLink);

  const projectAdminItem = page.locator(".project-setting .project-menu-nav > li");
  await expect(projectAdminItem).toHaveClass("");
  const projectAdminLink = projectAdminItem.locator("a");
  await expect(projectAdminLink).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(projectAdminLink.locator(".menu-name")).toHaveText("Project configuration");
  await expectNoTanStackActiveMarkers(projectAdminLink);

  const existingForkLink = page.locator("#helpMessage a.vmiddle.primary-txt", {
    hasText: "devs / sample",
  });
  await expect(existingForkLink).toHaveAttribute("href", `${basePath}/devs/sample`);
  await expect(existingForkLink).toHaveClass("vmiddle primary-txt");
  await expect(existingForkLink).toHaveText("devs / sample");
  await expectNoTanStackActiveMarkers(existingForkLink);

  const cancelLink = page.locator(".content-wrap.frm-wrap a.ybtn", { hasText: "Cancel" });
  await expect(cancelLink).toHaveAttribute("href", `${basePath}/admin/sample/pullRequests`);
  await expect(cancelLink).toHaveClass("ybtn");
  await expect(cancelLink).toHaveText("Cancel");
  await expectNoTanStackActiveMarkers(cancelLink);
});

test("project fork route has no raw route-local internal anchors", async () => {
  const source = readFileSync(PROJECT_FORK_ROUTE_SOURCE, "utf8");

  expect(source).not.toMatch(/<a(?:\s|>)/u);
  expect(source).not.toContain("</a>");
  expect(source).not.toContain("href={prefixBasePath");
  expect(source).not.toContain("href={projectHref");
  expect(source).not.toContain("as unknown as ProjectContainer");
  expect(source).not.toContain("onMouseDown=");
});

test("project fork owner select navigates by legacy data-url without full reload", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let forkOptionsRequests = 0;
  await mockProjectAdmin(page, {
    forkOptionsResponse: () =>
      forkOptionsRequests++ === 0 ? projectForkOptions() : existingProjectForkOptions(),
  });

  await page.goto(`${basePath}/admin/sample/newFork`);
  await expect(page.locator("#project-owner")).toHaveValue("admin");
  const devsOption = page.locator("#project-owner option[value=devs]");
  await expect(devsOption).toHaveAttribute("data-url", `${basePath}/admin/sample/newFork/devs`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });

  await page.selectOption("#project-owner", "devs");

  await expect(page).toHaveURL(`${basePath}/admin/sample/newFork/devs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#project-owner")).toHaveValue("devs");
  await expect(page.locator("#helpMessage")).toContainText("Same forked project already exists.");
});

test("project fork submit renders legacy git/clone.scala.html progress state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);
  await mockForkSubmit(page);
  await page.clock.install();

  await page.goto(`${basePath}/admin/sample/newFork`);
  await page.fill("#inputName", "sample-fork");
  await page.click(".content-wrap.frm-wrap button[type=submit]");

  await expect(page.locator(".content-wrap.frm-wrap legend")).toHaveText(
    "Forking admin / sample project into admin / sample-fork project",
  );
  expect(await canonicalizePageWrap(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_FORK_CLONE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await forkCloneProgressMetrics(page)).toEqual({
    contentMargin: "0px",
    contentPadding: "0px",
    contentWidth: 1260,
    firstMessageMargin: "0px",
    firstMessageText:
      "Please wait. This process may take a long time depending on the number of files and the history of the original project.",
    legendBorderBottomWidth: "1px",
    legendFontSize: "21px",
    legendLineHeight: "40px",
    legendMarginBottom: "20px",
    legendText: "Forking admin / sample project into admin / sample-fork project",
    outerMinHeight: "450px",
    projectWrapMarginTop: "20px",
  });
});

test("project fork header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/newFork`);
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

test("project fork header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, {
    favoriteRequests,
    source: { isFavorite: true, isFavorited: true },
    favoriteResponseFavorited: false,
  });

  await page.goto(`${basePath}/admin/sample/newFork`);
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

test("project fork header favorite star has no route-local native listener", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/newFork`);
  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

async function expectNoTanStackActiveMarkers(locator: Locator) {
  await expect(locator).not.toHaveAttribute("aria-current", /.+/u);
  await expect(locator).not.toHaveAttribute("data-status", /.+/u);
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

async function mockForkSubmit(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/fork", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        redirectPath: "/admin/sample-fork",
        project: {
          ownerName: "admin",
          projectName: "sample-fork",
        },
      }),
    });
  });
}

async function mockProjectAdminWithExistingFork(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/fork-options", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(existingProjectForkOptions()),
    });
  });
}

async function mockPullRequestsDestination(page: Page) {
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(sourceProject()),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        acceptedCount: 0,
        category: "open",
        closedCount: 0,
        contributors: [],
        currentUserId: 1,
        items: [],
        openCount: 0,
        pageNum: 1,
        pageSize: 25,
        recentlyPushedBranches: [],
        sentCount: 0,
        totalCount: 0,
      }),
    });
  });
}

async function mockProjectAdmin(
  page: Page,
  options: {
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    forkOptionsResponse?: () => unknown;
    source?: Partial<ReturnType<typeof sourceProject>>;
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
      headers: { "x-csrf-token": "csrf-fork" },
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
  await page.route("**/api/v1/owners/admin/projects/sample/fork-options", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(options.forkOptionsResponse?.() ?? projectForkOptions(options.source)),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    const request = route.request();
    options.favoriteRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-fork",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
    });
  });
}

function projectForkOptions(source: Partial<ReturnType<typeof sourceProject>> = {}) {
  return {
    canFork: true,
    existingForks: [],
    ownerOptions: [
      { organization: false, ownerName: "admin", selected: true },
      { organization: true, ownerName: "devs", selected: false },
    ],
    selected: {
      ownerName: "admin",
      projectName: "sample",
      projectScope: "PUBLIC",
    },
    source: { ...sourceProject(), ...source },
  };
}

function existingProjectForkOptions() {
  return {
    ...projectForkOptions(),
    existingForks: [{ ownerName: "devs", projectName: "sample" }],
    ownerOptions: [
      { organization: false, ownerName: "admin", selected: false },
      { organization: true, ownerName: "devs", selected: true },
    ],
    selected: {
      ownerName: "devs",
      projectName: "sample",
      projectScope: "PUBLIC",
    },
  };
}

function sourceProject() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
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
    projectScope: "PUBLIC",
    vcs: "GIT",
    viewerCanUpdate: true,
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
        .filter((attr) => !isModernizedTanStackRouterAttr(attr) && attr.name !== "alt")
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

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }
  });
}

async function canonicalizePageWrap(page: Page) {
  return page.locator(".page-wrap-outer").evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !isModernizedTanStackRouterAttr(attr) && attr.name !== "alt")
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

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }
  });
}

async function forkCloneProgressMetrics(page: Page) {
  return page.locator(".page-wrap-outer").evaluate((outer) => {
    const projectWrap = outer.querySelector<HTMLElement>(".project-page-wrap");
    const content = outer.querySelector<HTMLElement>(".content-wrap.frm-wrap");
    const legend = outer.querySelector<HTMLElement>("legend");
    const firstMessage = outer.querySelector<HTMLElement>("p");
    const missing = Object.entries({ content, firstMessage, legend, projectWrap })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected fork clone metric targets are missing: ${missing.join(", ")}`);
    }

    const contentStyle = getComputedStyle(content);
    const legendStyle = getComputedStyle(legend);
    const messageStyle = getComputedStyle(firstMessage);
    const outerStyle = getComputedStyle(outer);
    return {
      contentMargin: contentStyle.margin,
      contentPadding: contentStyle.padding,
      contentWidth: Math.round(content.getBoundingClientRect().width),
      firstMessageMargin: messageStyle.margin,
      firstMessageText: firstMessage.textContent?.trim(),
      legendBorderBottomWidth: legendStyle.borderBottomWidth,
      legendFontSize: legendStyle.fontSize,
      legendLineHeight: legendStyle.lineHeight,
      legendMarginBottom: legendStyle.marginBottom,
      legendText: legend.textContent?.trim(),
      outerMinHeight: outerStyle.minHeight,
      projectWrapMarginTop: getComputedStyle(projectWrap).marginTop,
    };
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
        .filter((attr) => !isModernizedTanStackRouterAttr(attr) && attr.name !== "alt")
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

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }
  }, html);
}
