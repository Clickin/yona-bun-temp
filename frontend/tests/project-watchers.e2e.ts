import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const PROJECT_WATCHERS_ROUTE_SOURCE = "src/routes/$ownerName/$projectName/watchers.tsx";

const EXPECTED_PROJECT_WATCHERS = `
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
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"><li><div class="btn-group dropdown watch-btn"><a href="__BASE_PATH__/admin/sample/watchers" class="btn watcher-count no-border watch-on" data-toggle="tooltip" title="number of watcher">2</a><div class="dropdown-menu flat right title"><div class="pop-title">You are watching the sample project.</div><div class="pop-content"><p>You will receive notifications, when the following events occur:</p><ul class="icons-ul"><li><i class="yobicon-li yobicon-ok"></i>when new posts, issues, and pull-requests are added.</li><li><i class="yobicon-li yobicon-ok"></i>when comments are added to your post, issue, or code.</li><li><i class="yobicon-li yobicon-ok"></i>when the issue of which you are author or assignee is changed.</li><li><i class="yobicon-li yobicon-ok"></i>when the pull request status is changed.</li></ul></div><div class="pop-content btn-wrap"><a href="__BASE_PATH__/user/editform/notifications#7" class="ybtn"><i class="yobicon-alert2"></i> Notification settings</a><button type="button" class="ybtn ybtn-watching watchBtn"><i class="yobicon-eye-off"></i> Unwatch</button></div></div><button class="btn nofocus no-border down-arrow" type="button" data-toggle="dropdown">Unwatch</button></div></li></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><h4><strong>This projects watcher list.</strong></h4><p>* This list contains only those who can access this project.</p><ul class="members project row-fluid"><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/alice" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-32.png" width="64" height="64"></a><div class="member-name">Alice Doe</div><div class="member-id">@alice</div></li><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/bob" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-32.png" width="64" height="64"></a><div class="member-name">Bob Smith</div><div class="member-id">@bob</div></li></ul></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project watchers matches legacy project/watchers.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/watchers`);
  await expect(page.getByText("This projects watcher list.")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_WATCHERS.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await readDesktopWatchersMetrics(page)).toEqual({
    avatarHeight: "40px",
    avatarImageHeight: "64",
    avatarImageWidth: "64",
    avatarMarginRight: "10px",
    avatarWidth: "40px",
    descriptionMarginBottom: "0px",
    descriptionMarginTop: "0px",
    firstMemberFloat: "left",
    firstMemberMinHeight: "30px",
    firstMemberWidth: 617,
    memberIdColor: "rgb(204, 204, 204)",
    memberIdLineHeight: "20px",
    memberListMarginLeft: "0px",
    memberNameLineHeight: "20px",
    pageWrapMinWidth: "1100px",
    projectPageMarginTop: "20px",
    titleLineHeight: "30px",
    titlePadding: "10px 0px",
  });
});

test("project watchers internal links render legacy hrefs and navigate through the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/watchers`);
  await expect(page.getByText("This projects watcher list.")).toBeVisible();

  await expect(page.locator(".project-author a")).toHaveAttribute("href", `${basePath}/admin`);
  await expect(page.locator(".project-name a")).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(page.locator(".project-menu-gruop a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code`,
  );
  const firstWatcherAvatar = page.locator(".members.project .avatar-wrap").first();
  await expect(firstWatcherAvatar).toHaveAttribute("href", `${basePath}/alice`);
  await expect(firstWatcherAvatar).toHaveClass("avatar-wrap mlarge pull-left mr10");
  await expect(firstWatcherAvatar).not.toHaveAttribute("aria-current", /.+/);
  await expect(firstWatcherAvatar).not.toHaveAttribute("data-status", /.+/);
  await expect(page.locator(".project-author a")).not.toHaveAttribute("aria-current", /.+/);
  await expect(page.locator(".project-author a")).not.toHaveAttribute("data-status", /.+/);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __watchersSpaMarker?: string }).__watchersSpaMarker =
      "kept";
  });
  await page.locator(".project-name a").click();
  await page.waitForURL(`${basePath}/admin/sample`);

  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __watchersSpaMarker?: string })
          .__watchersSpaMarker,
    ),
  ).toBe("kept");
});

test("project watchers route source uses Link for internal app navigation", () => {
  const source = readFileSync(PROJECT_WATCHERS_ROUTE_SOURCE, "utf8");

  expect(source).toContain("import { Link, createFileRoute }");
  expect(source).toContain('to="/$user"');
  expect(source).toContain('to="/$ownerName/$projectName"');
  expect(source).toContain('to="/$ownerName/$projectName/watchers"');
  expect(source).toContain('to="/$ownerName/$projectName/code"');
  expect(source).toContain('to="/$ownerName/$projectName/setting"');
  expect(source).toContain("toggleProjectWatchRest");
  expect(source).toContain("onClick={(event) =>");
  expect(source).not.toContain("onMouseDown=");
  expect(source).not.toContain("legacyUserSearch");
  expect(source).not.toContain("daysAgo: undefined");
  expect(source).not.toContain("selected: undefined");
  expect(source).not.toContain("search={legacyUserSearch}");
  expect(source).not.toContain("legacyLinkProps");
  expect(source).not.toContain("{...legacyLinkProps}");
  expect(source).toContain("activeOptions={{");
  expect(source).toContain("activeProps={{");
  expect(source).toContain("includeSearch: true");
  expect(source).toContain('"data-status": undefined');
  expect(source).not.toContain("<a ");
  expect(source).not.toContain("<a\n");
  expect(source).not.toContain("href={prefixBasePath");
  expect(source).not.toContain("href={projectHref");
  expect(source).not.toContain("function projectHref");
});

test("project watchers header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/watchers`);
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

test("project watchers header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/watchers`);
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

test("project watchers header favorite star has no route-local native listener", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/watchers`);
  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project watchers header renders legacy watch dropdown and toggles project watch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const watchRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, { watchRequests, watchResponseCount: 1 });

  await page.goto(`${basePath}/admin/sample/watchers`);
  const watchButtonGroup = page.locator(".project-util .watch-btn");
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/watchers`,
  );
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveText("2");
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveClass(/watch-on/);
  await expect(watchButtonGroup.locator(".down-arrow")).toHaveText("Unwatch");

  await watchButtonGroup.locator(".down-arrow").click();
  await expect(watchButtonGroup).toHaveClass(/open/);
  await expect(watchButtonGroup.locator(".pop-title")).toHaveText(
    "You are watching the sample project.",
  );
  await expect(watchButtonGroup.locator(".pop-content.btn-wrap a.ybtn")).toHaveAttribute(
    "href",
    `${basePath}/user/editform/notifications#7`,
  );

  const watchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/watch") &&
      response.request().method() === "DELETE",
  );
  await watchButtonGroup.locator(".watchBtn").click();
  await watchResponsePromise;

  expect(watchRequests).toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveText("1");
  await expect(watchButtonGroup.locator(".watcher-count")).not.toHaveClass(/watch-on/);
  await expect(watchButtonGroup.locator(".down-arrow")).toHaveText("Watch");
});

async function readDesktopWatchersMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const title = requireElement(".project-page-wrap h4");
    const description = requireElement(".project-page-wrap > p");
    const memberList = requireElement(".members.project.row-fluid");
    const firstMember = requireElement(".members.project .member");
    const firstAvatar = requireElement(".members.project .avatar-wrap");
    const firstImage = requireElement(".members.project img");
    const firstName = requireElement(".members.project .member-name");
    const firstId = requireElement(".members.project .member-id");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const titleStyle = getComputedStyle(title);
    const descriptionStyle = getComputedStyle(description);
    const memberStyle = getComputedStyle(firstMember);
    const avatarStyle = getComputedStyle(firstAvatar);
    const nameStyle = getComputedStyle(firstName);
    const idStyle = getComputedStyle(firstId);
    return {
      avatarHeight: avatarStyle.height,
      avatarImageHeight: firstImage.getAttribute("height"),
      avatarImageWidth: firstImage.getAttribute("width"),
      avatarMarginRight: avatarStyle.marginRight,
      avatarWidth: avatarStyle.width,
      descriptionMarginBottom: descriptionStyle.marginBottom,
      descriptionMarginTop: descriptionStyle.marginTop,
      firstMemberFloat: memberStyle.float,
      firstMemberMinHeight: memberStyle.minHeight,
      firstMemberWidth: Math.round(firstMember.getBoundingClientRect().width),
      memberIdColor: idStyle.color,
      memberIdLineHeight: idStyle.lineHeight,
      memberListMarginLeft: getComputedStyle(memberList).marginLeft,
      memberNameLineHeight: nameStyle.lineHeight,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      projectPageMarginTop: projectPageStyle.marginTop,
      titleLineHeight: titleStyle.lineHeight,
      titlePadding: titleStyle.padding,
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
    watchRequests?: { hasCsrfToken: boolean; method: string }[];
    watchResponseCount?: number;
    project?: Partial<ReturnType<typeof projectContainer>>;
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
      headers: { "x-csrf-token": "csrf-watchers" },
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
  await page.route("**/api/v1/owners/admin/projects/sample/watchers", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerName: "admin",
        projectName: "sample",
        totalCount: 2,
        watchers: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "alice",
            userId: 2,
            userLabel: "Alice Doe",
          },
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "bob",
            userId: 3,
            userLabel: "Bob Smith",
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    const request = route.request();
    options.favoriteRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-watchers",
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
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-watchers",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        isWatching: request.method() === "POST",
        watchingCount: options.watchResponseCount ?? (request.method() === "POST" ? 3 : 1),
      }),
    });
  });
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

function projectContainer() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
    isForkedFromOrigin: false,
    isWatching: true,
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
    viewerCanWatch: true,
    viewerCanUpdate: true,
    watchingCount: 2,
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
