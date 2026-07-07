import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const STATISTICS_ROUTE_SOURCE = readFileSync(
  "src/routes/$ownerName/$projectName/statistics.tsx",
  "utf8",
);

const EXPECTED_PROJECT_STATISTICS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer project-header">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Project</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/admin/sample/search">This Project</button></li><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" data-placement="bottom" data-toggle="tooltip" title="Site administration"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"><li><div class="btn-group dropdown watch-btn"><a class="btn watcher-count no-border " href="__BASE_PATH__/admin/sample/watchers" title="number of watcher">3</a><div class="dropdown-menu flat right title"><div class="pop-title">You are not watching the sample project.</div><div class="pop-content"><p>You will receive notifications, when the following events occur:</p><ul class="icons-ul"><li><i class="yobicon-li yobicon-ok"></i>when new posts, issues, and pull-requests are added.</li><li><i class="yobicon-li yobicon-ok"></i>when comments are added to your post, issue, or code.</li><li><i class="yobicon-li yobicon-ok"></i>when the issue of which you are author or assignee is changed.</li><li><i class="yobicon-li yobicon-ok"></i>when the pull request status is changed.</li></ul></div><div class="pop-content btn-wrap"><a class="ybtn" href="__BASE_PATH__/user/editform/notifications#7"><i class="yobicon-alert2"></i> Notification settings</a><button class="ybtn ybtn-watching watchBtn" type="button"><i class="yobicon-eye"></i> Watch</button></div></div><button class="btn nofocus no-border down-arrow" data-toggle="dropdown" type="button">Watch</button></div></li></ul></div></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><h1>Under Construction</h1></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project statistics matches legacy project/statistics.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/statistics`);
  await expect(page.getByRole("heading", { name: "Under Construction" })).toBeVisible();
  await expect(page).toHaveTitle("statistics - admin/sample");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_STATISTICS.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await readDesktopStatisticsMetrics(page)).toEqual({
    headingFontSize: "26px",
    headingFontWeight: "400",
    headingLineHeight: "32.5px",
    headingMarginBottom: "18px",
    headingMarginTop: "0px",
    headingContainedInProjectPage: true,
    pageWrapMinWidth: "1100px",
    projectHeaderHeight: "120px",
    projectPageBelowProjectHeader: true,
    projectPageMarginTop: "20px",
    projectPageWidth: 1260,
  });
});

test("project statistics header links keep legacy hrefs without TanStack active markers", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/statistics`);
  await expect(page.getByRole("heading", { name: "Under Construction" })).toBeVisible();

  expect(await attributes(page, ".project-breadcrumb a", "href")).toEqual([
    `${basePath}/admin`,
    `${basePath}/admin/sample`,
  ]);
  await expect(page.locator(".project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".project-header-outer a[aria-current]")).toHaveCount(0);
  await expect(page.locator(".project-header-outer a[data-status]")).toHaveCount(0);
});

test("project statistics navbar uses legacy project search scope", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/statistics`);
  await expect(page.getByRole("heading", { name: "Under Construction" })).toBeVisible();

  await assertStatisticsProjectSearchShell(page, {
    actions: [`${basePath}/admin/sample/search`, `${basePath}/search`],
    basePath,
    currentUrl: `${basePath}/admin/sample/statistics`,
    groupAction: null,
    projectAction: `${basePath}/admin/sample/search`,
  });
});

test("protected org-owned project statistics expose legacy group search scope", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProtectedPortalStatistics(page);

  await page.goto(`${basePath}/weblabs/portal/statistics`);
  await expect(page.getByRole("heading", { name: "Under Construction" })).toBeVisible();
  await expect(page).toHaveTitle("statistics - weblabs/portal");

  await assertStatisticsProjectSearchShell(page, {
    actions: [
      `${basePath}/weblabs/portal/search`,
      `${basePath}/organizations/weblabs/search`,
      `${basePath}/search`,
    ],
    basePath,
    currentUrl: `${basePath}/weblabs/portal/statistics`,
    groupAction: `${basePath}/organizations/weblabs/search`,
    projectAction: `${basePath}/weblabs/portal/search`,
  });
  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-util .watcher-count")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/watchers`,
  );
  await expect(page.locator(".project-util .watcher-count")).toHaveText("3");
});

test("project statistics breadcrumb links navigate through the SPA history marker", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installPushStateAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/statistics`);
  await expect(page.getByRole("heading", { name: "Under Construction" })).toBeVisible();
  await page.locator(".project-breadcrumb .project-name a").click();

  await expect.poll(() => pushStateCalls(page)).toBeGreaterThan(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
});

test("project statistics route TSX has no route-local raw anchor elements", () => {
  expect(STATISTICS_ROUTE_SOURCE).toContain("Link");
  expect(STATISTICS_ROUTE_SOURCE).toContain("projectSearchScope={projectSearchScope}");
  expect(STATISTICS_ROUTE_SOURCE).toContain(
    "organizationName: projectSearchScopeOrganizationName(project, ownerName)",
  );
  expect(STATISTICS_ROUTE_SOURCE).toContain(
    "function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string)",
  );
  expect(STATISTICS_ROUTE_SOURCE).toContain(
    "return projectIsProtected(project) ? ownerName : undefined;",
  );
  expect(STATISTICS_ROUTE_SOURCE).toContain(
    "function projectIsProtected(project: ProjectContainer)",
  );
  expect(STATISTICS_ROUTE_SOURCE).toContain(
    'stringField(project.projectScope, "") === "protected"',
  );
  expect(STATISTICS_ROUTE_SOURCE).toContain('"data-status": undefined');
  expect(STATISTICS_ROUTE_SOURCE).toContain(
    "<title>{`statistics - ${ownerName}/${projectName}`}</title>",
  );
  expect(STATISTICS_ROUTE_SOURCE).toContain("onClick=");
  expect(STATISTICS_ROUTE_SOURCE).toContain("event.preventDefault();");
  expect(STATISTICS_ROUTE_SOURCE).not.toContain("onMouseDown=");
  expect(STATISTICS_ROUTE_SOURCE).not.toContain("document.");
  expect(STATISTICS_ROUTE_SOURCE).not.toContain("addEventListener");
  expect(STATISTICS_ROUTE_SOURCE).not.toContain("classList");
  expect(STATISTICS_ROUTE_SOURCE).not.toContain("style.display");
  expect(STATISTICS_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(STATISTICS_ROUTE_SOURCE).not.toContain("<a ");
  expect(STATISTICS_ROUTE_SOURCE).not.toContain("</a>");
});

test("project statistics header favorite star posts and toggles starred class", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/statistics`);
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
  await favoriteToggle.dispatchEvent("click");
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project statistics header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/statistics`);
  const favoriteStar = page.locator(".project-breadcrumb .user-project-list i");
  await expect(favoriteStar).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").dispatchEvent("click");
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).not.toHaveClass(/starred/);
});

test("project statistics header favorite star has no route-local native listener", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/statistics`);
  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project statistics header renders legacy watch dropdown and toggles project watch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const watchRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installProjectWatchDropdownBubbleAudit(page);
  await mockProjectAdmin(page, { watchRequests });

  await page.goto(`${basePath}/admin/sample/statistics`);
  const watchButton = page.locator(".project-util .watch-btn .down-arrow");
  const watcherCount = page.locator(".project-util .watcher-count");

  await expect(watcherCount).toHaveAttribute("href", `${basePath}/admin/sample/watchers`);
  await expect(watcherCount).toHaveText("3");
  await expect(watchButton).toHaveText("Watch");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "project-statistics-watch-dropdown";
  });
  const urlBeforeWatchDropdown = page.url();

  await watchButton.click();
  await expect(page.locator(".project-util > li")).toHaveClass("open");
  await expect(page.locator(".project-util .watch-btn")).toHaveClass(
    "btn-group dropdown watch-btn open",
  );
  await expect(page.locator(".project-util .pop-title")).toHaveText(
    "You are not watching the sample project.",
  );
  expect(page.url()).toBe(urlBeforeWatchDropdown);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("project-statistics-watch-dropdown");
  await expect.poll(() => projectWatchDropdownBubbleClicks(page)).toEqual([]);

  await watchButton.click();
  await expect(page.locator(".project-util > li")).not.toHaveClass("open");
  await expect(page.locator(".project-util .watch-btn")).toHaveClass(
    "btn-group dropdown watch-btn",
  );
  expect(page.url()).toBe(urlBeforeWatchDropdown);
  await expect.poll(() => projectWatchDropdownBubbleClicks(page)).toEqual([]);

  await watchButton.click();
  await expect(page.locator(".project-util > li")).toHaveClass("open");
  await expect(page.locator(".project-util .watch-btn")).toHaveClass(
    "btn-group dropdown watch-btn open",
  );
  await expect(page.locator(".project-util .btn-wrap .ybtn").first()).toHaveAttribute(
    "href",
    `${basePath}/user/editform/notifications#7`,
  );

  const watchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/watch") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-util .watchBtn").click();
  await watchResponsePromise;

  expect(watchRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  expect(page.url()).toBe(urlBeforeWatchDropdown);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("project-statistics-watch-dropdown");
  await expect.poll(() => projectWatchDropdownBubbleClicks(page)).toEqual([]);
  await expect(page.locator(".project-util > li")).not.toHaveClass("open");
  await expect(watcherCount).toHaveText("4");
  await expect(watcherCount).toHaveClass(/watch-on/);
  await expect(watchButton).toHaveText("Unwatch");
});

async function readDesktopStatisticsMetrics(page: Page) {
  return page.evaluate(() => {
    const projectHeader = requireElement(".project-header-outer");
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const heading = requireElement(".project-page-wrap h1");
    const projectHeaderStyle = getComputedStyle(projectHeader);
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const headingStyle = getComputedStyle(heading);
    const projectHeaderBox = projectHeader.getBoundingClientRect();
    const pageWrapBox = pageWrapOuter.getBoundingClientRect();
    const projectPageBox = projectPageWrap.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    return {
      headingFontSize: headingStyle.fontSize,
      headingFontWeight: headingStyle.fontWeight,
      headingLineHeight: headingStyle.lineHeight,
      headingMarginBottom: headingStyle.marginBottom,
      headingMarginTop: headingStyle.marginTop,
      headingContainedInProjectPage:
        headingBox.top >= projectPageBox.top &&
        headingBox.left >= projectPageBox.left &&
        headingBox.right <= projectPageBox.right &&
        headingBox.bottom <= projectPageBox.bottom,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      projectHeaderHeight: projectHeaderStyle.height,
      projectPageBelowProjectHeader: pageWrapBox.top >= projectHeaderBox.bottom,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
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

async function assertStatisticsProjectSearchShell(
  page: Page,
  {
    actions,
    currentUrl,
    groupAction,
    projectAction,
  }: {
    actions: string[];
    basePath: string;
    currentUrl: string;
    groupAction: string | null;
    projectAction: string;
  },
) {
  await expect(page.locator(".gnb-outer")).toHaveClass("gnb-outer project-header");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", projectAction);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form .search-box")).toHaveClass("search-box select");
  await expect(
    attributes(page, ".gnb-search-form [data-toggle='search-scope']", "data-action"),
  ).resolves.toEqual(actions);

  if (groupAction) {
    await page.locator("#gnb-search-scope-title").click();
    await page.locator(".gnb-search-form [data-toggle='search-scope']").nth(1).click();
    await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
    await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", groupAction);
    await expect(page).toHaveURL(currentUrl);
  }

  await page.locator("#gnb-search-scope-title").click();
  await page.locator(".gnb-search-form [data-toggle='search-scope']").last().click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    actions[actions.length - 1],
  );
  await expect(page).toHaveURL(currentUrl);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator(".gnb-search-form [data-toggle='search-scope']").first().click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", projectAction);
  await expect(page).toHaveURL(currentUrl);

  expect(await readStatisticsSearchMetrics(page)).toEqual({
    formBottomWithinNavbar: true,
    formRightWithinNavbar: true,
    formTopWithinNavbar: true,
    inputWithinSearchBox: true,
    scopeButtonWithinNavbar: true,
    submitWithinSearchBox: true,
  });
}

async function readStatisticsSearchMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector(".gnb-outer.project-header");
    const form = document.querySelector(".gnb-search-form");
    const searchBox = document.querySelector(".gnb-search-form .search-box");
    const scopeButton = document.querySelector("#gnb-search-scope-title");
    const input = document.querySelector('.gnb-search-form input[name="keyword"]');
    const submit = document.querySelector('.gnb-search-form button[type="submit"]');
    if (!navbar || !form || !searchBox || !scopeButton || !input || !submit) {
      return null;
    }
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    };
    const navbarBox = rect(navbar);
    const formBox = rect(form);
    const searchBoxBox = rect(searchBox);
    const scopeButtonBox = rect(scopeButton);
    const inputBox = rect(input);
    const submitBox = rect(submit);
    return {
      formBottomWithinNavbar: formBox.bottom <= navbarBox.bottom,
      formRightWithinNavbar: formBox.right <= navbarBox.right,
      formTopWithinNavbar: formBox.top >= navbarBox.top,
      inputWithinSearchBox:
        inputBox.top >= searchBoxBox.top &&
        inputBox.bottom <= searchBoxBox.bottom &&
        inputBox.right <= searchBoxBox.right,
      scopeButtonWithinNavbar:
        scopeButtonBox.top >= navbarBox.top && scopeButtonBox.bottom <= navbarBox.bottom,
      submitWithinSearchBox:
        submitBox.top >= searchBoxBox.top &&
        submitBox.bottom <= searchBoxBox.bottom &&
        submitBox.right <= searchBoxBox.right,
    };
  });
}

async function attributes(page: Page, selector: string, name: string) {
  return page
    .locator(selector)
    .evaluateAll(
      (elements, attrName) => elements.map((element) => element.getAttribute(attrName)),
      name,
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

async function installPushStateAudit(page: Page) {
  await page.addInitScript(() => {
    const originalPushState = history.pushState;
    Object.defineProperty(window, "__yonaPushStateCalls", {
      configurable: true,
      value: [] as string[],
    });
    history.pushState = function pushStateWithAudit(data, unused, url) {
      (
        window as Window & typeof globalThis & { __yonaPushStateCalls: string[] }
      ).__yonaPushStateCalls.push(String(url ?? ""));
      return originalPushState.call(this, data, unused, url);
    };
  });
}

async function pushStateCalls(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __yonaPushStateCalls?: string[] })
        .__yonaPushStateCalls?.length ?? 0,
  );
}

async function installProjectWatchDropdownBubbleAudit(page: Page) {
  await page.addInitScript(() => {
    const dropdownClicks: string[] = [];
    Object.defineProperty(window, "__yonaProjectWatchDropdownBubbleClicks", {
      configurable: true,
      value: dropdownClicks,
    });
    document.addEventListener("click", (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(
          ".project-util .watch-btn .down-arrow[data-toggle='dropdown'], .project-util .watch-btn .watchBtn",
        )
      ) {
        dropdownClicks.push(
          event.target.closest("[data-toggle='dropdown']") ? "watch:toggle" : "watch:action",
        );
      }
    });
  });
}

async function projectWatchDropdownBubbleClicks(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __yonaProjectWatchDropdownBubbleClicks?: string[] })
        .__yonaProjectWatchDropdownBubbleClicks ?? [],
  );
}

async function mockProjectAdmin(
  page: Page,
  options: {
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    project?: Partial<ReturnType<typeof projectContainer>>;
    watchRequests?: { hasCsrfToken: boolean; method: string }[];
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
      headers: { "x-csrf-token": "csrf-statistics" },
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
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    const request = route.request();
    options.favoriteRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-statistics",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/watch", async (route) => {
    const request = route.request();
    options.watchRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-statistics",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectContainer(), isWatching: true, watchingCount: 4 }),
    });
  });
}

async function mockProtectedPortalStatistics(page: Page) {
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
      headers: { "x-csrf-token": "csrf-statistics" },
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
  await page.route("**/api/v1/owners/weblabs/projects/portal/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...projectContainer(),
        id: 2,
        isProtected: true,
        organizationName: "weblabs",
        ownerName: "weblabs",
        projectName: "portal",
        projectScope: "protected",
      }),
    });
  });
}

function projectContainer() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    isWatching: false,
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
    viewerCanWatch: true,
    watchingCount: 3,
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
