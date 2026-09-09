import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const PROJECT_WATCHERS_ROUTE_SOURCE = "src/routes/$ownerName/$projectName/watchers.tsx";

const EXPECTED_PROJECT_WATCHERS_BODY = `<div class="page-wrap-outer"><div class="project-page-wrap"><h4><strong>This projects watcher list.</strong></h4><p>* This list contains only those who can access this project.</p><ul class="members project row-fluid"><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/alice" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-32.png" width="64" height="64"></a><div class="member-name">Alice Doe</div><div class="member-id">@alice</div></li><li class="member span6 span-hard-wrap"><a href="__BASE_PATH__/bob" class="avatar-wrap mlarge pull-left mr10"><img src="/assets/images/default-avatar-32.png" width="64" height="64"></a><div class="member-name">Bob Smith</div><div class="member-id">@bob</div></li></ul></div></div>`;

test("project watchers matches legacy project/watchers.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/watchers`);
  await expect(page.getByText("This projects watcher list.")).toBeVisible();

  expect(await canonicalizeWatchersBody(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_WATCHERS_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  for (const owner of [
    "project-watchers-list",
    "project-watchers-member",
    "project-watchers-avatar",
    "project-watchers-avatar-image",
    "project-watchers-member-name",
    "project-watchers-member-id",
  ]) {
    // F5 (2026-08-15): the app renders the frozen legacy watcher classes on
    // the data-owner elements (members.tsx pattern); the nested-layout spec
    // checks the live DOM for the grid. Assert per-owner (avatar-image has
    // no legacy class).
    const legacyClassByOwner: Record<string, string> = {
      "project-watchers-list": "members project row-fluid",
      "project-watchers-member": "member span6 span-hard-wrap",
      "project-watchers-avatar": "avatar-wrap mlarge pull-left mr10",
      "project-watchers-avatar-image": "",
      "project-watchers-member-name": "member-name",
      "project-watchers-member-id": "member-id",
    };
    const expectedClass = legacyClassByOwner[owner];
    if (expectedClass) {
      await expect(page.locator(`[data-owner="${owner}"]`).first()).toHaveClass(expectedClass);
    }
  }
  const desktopMetrics = await readDesktopWatchersMetrics(page);
  expect(desktopMetrics).toEqual({
    avatarBackground: "rgb(221, 221, 221)",
    avatarBorderRadius: "3px",
    avatarFloat: "left",
    avatarHeight: "40px",
    avatarImageHeight: "64",
    avatarImageRenderedHeight: 40,
    avatarImageRenderedWidth: 40,
    avatarImageVerticalAlign: "top",
    avatarImageWidth: "64",
    avatarMarginRight: "10px",
    avatarWidth: "40px",
    descriptionMarginBottom: "0px",
    descriptionMarginTop: "0px",
    firstMemberFloat: "left",
    firstMemberMinHeight: "30px",
    firstMemberBorderBottom: "1px solid rgb(221, 221, 221)",
    firstMemberBoxSizing: "border-box",
    firstMemberMarginLeft: "5px",
    firstMemberPadding: "10px 5px",
    firstMemberPosition: "relative",
    firstMemberWidth: 617,
    memberIdColor: "rgb(204, 204, 204)",
    memberIdLineHeight: "20px",
    memberListMarginLeft: "0px",
    memberListWidth: 1260,
    memberNameFontWeight: "700",
    memberNameLineHeight: "20px",
    pageWrapMinWidth: "1100px",
    projectMenuWidth: 684,
    // F5 5px — yona-original/app/assets/stylesheets/less/_responsive.less:617-619
    projectPageMarginTop: "5px",
    titleLineHeight: "30px",
    titlePadding: "10px 0px",
    // Live frozen legacy header, English Unwatch and two watchers at 1366px.
    // Preserve template whitespace before the down-arrow pseudo-element.
    watchActionWidth: 86,
    watcherCountWidth: 31,
    watcherUtilWidth: 132,
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
  const firstWatcherAvatar = page.locator('[data-owner="project-watchers-avatar"]').first();
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

test("project watchers empty avatar URL loads the Vite-managed legacy fallback under context path", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    watchers: [{ ...watcherFixture("alice", 2, "Alice Doe"), avatarUrl: "" }],
  });

  await page.goto(`${basePath}/admin/sample/watchers`);
  const avatar = page.locator('[data-owner="project-watchers-avatar-image"]').first();
  await expect(avatar).toBeVisible();

  expect(
    await avatar.evaluate((image: HTMLImageElement, expectedBasePath) => {
      const url = new URL(image.currentSrc || image.src);
      return {
        complete: image.complete,
        insideContextPath: url.pathname.startsWith(`${expectedBasePath}/`),
        naturalHeight: image.naturalHeight,
        naturalWidth: image.naturalWidth,
        // F6 copy-fix: the Vite-imported fallback is emitted hashed
        // (dist/assets/default-avatar-128-<hash>.png), not the raw filename.
        usesImportedFilename: /\/assets\/default-avatar-128-[\w-]+\.png$/.test(url.pathname),
      };
    }, basePath),
  ).toEqual({
    complete: true,
    insideContextPath: true,
    naturalHeight: 128,
    naturalWidth: 128,
    usesImportedFilename: true,
  });
});

test("project watchers admin cog badge uses enrolled member count instead of enrollment requests", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      enrolledUsers: [{ id: 1 }, { id: 2 }],
      enrollmentRequestCount: 5,
    },
  });

  await page.goto(`${basePath}/admin/sample/watchers`);
  const adminCogBadge = page.locator(".project-setting .project-menu-count");

  await expect(adminCogBadge).toHaveText("2");
  await expect(adminCogBadge).not.toHaveText("5");
});

test("project watchers preserves the legacy empty member-list state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, { watchers: [] });

  await page.goto(`${basePath}/admin/sample/watchers`);

  await expect(page.locator(".project-page-wrap h4")).toHaveText("This projects watcher list.");
  await expect(page.locator('[data-owner="project-watchers-list"]')).toBeAttached();
  await expect(page.locator('[data-owner="project-watchers-member"]')).toHaveCount(0);
});

test("project watchers mobile member list stays inside the legacy page wrapper", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/watchers`);
  await expect(page.locator(".project-page-wrap h4")).toHaveText("This projects watcher list.");

  expect(await readMobileWatchersMetrics(page)).toEqual({
    bodyHasHorizontalOverflow: false,
    firstMemberInsidePage: true,
    firstMemberWidth: 371,
    menuHasActiveItem: false,
    twoMembersStackVertically: true,
  });
});

test("project watchers ko-KR menu preserves Scala whitespace before issue and board badges", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockProjectAdmin(page, {
    project: { boardCount: 1, openIssueCount: 2 },
  });

  await page.goto(`${basePath}/admin/sample/watchers`);
  await expect(page.locator(".project-page-wrap h4")).toHaveText("이 프로젝트를 지켜보는 사람");

  expect(await readKoreanBadgeMenuMetrics(page)).toEqual({
    boardHasLiteralSpace: true,
    boardLabel: "게시판",
    issueHasLiteralSpace: true,
    issueLabel: "이슈",
    menuWidth: 573,
  });
});

test("protected org-owned project watchers expose legacy project-header search scope on localhost", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProtectedPortalWatchers(page);

  await page.goto(`${basePath}/weblabs/portal/watchers`);
  await expect(page.getByText("This projects watcher list.")).toBeVisible();
  await expect(page).toHaveTitle("Watcher list - weblabs/portal");

  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)project-header(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-owner="global-gnb-search-box"]');
  // wave-33 retained-class retention (667398a04): legacy navbar.scala.html:105
  // <div class="search-box @if(project != null || org != null) {select}">
  await expect(searchBox).toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).toHaveClass(/\bselect\b/);
  const searchScopeButtons = page.locator("[data-owner=global-gnb-search-scope-item] > button");
  await expect(searchScopeButtons).toHaveCount(3);
  expect(
    await searchScopeButtons.evaluateAll((buttons) =>
      buttons.map((button) => ({
        action: button.getAttribute("data-action"),
        toggle: button.getAttribute("data-toggle"),
      })),
    ),
  ).toEqual([
    { action: null, toggle: null },
    { action: null, toggle: null },
    { action: null, toggle: null },
  ]);

  await page.locator("#gnb-search-scope-title").click();
  await searchScopeButtons.nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await searchScopeButtons.nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-util .watcher-count")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/watchers`,
  );
  await expect(page.locator(".project-util .watcher-count")).toHaveAttribute(
    "title",
    "number of watcher",
  );
  await expect(page.locator(".project-util .watcher-count")).not.toHaveAttribute(
    "data-toggle",
    /.+/,
  );
  await expect(page.locator(".project-util .watcher-count")).toHaveText("2");
  await expect(page.locator(".project-util .watcher-count")).toHaveClass(/watch-on/);

  expect(await readProtectedPortalWatchersShellMetrics(page)).toEqual({
    pageWrapBelowMenu: true,
    projectMenuBelowHeader: true,
    searchBottomWithinNavbar: true,
    searchLeftWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
  });
});

test("project watchers route source uses Link for internal app navigation", () => {
  const source = readFileSync(PROJECT_WATCHERS_ROUTE_SOURCE, "utf8");

  expect(source).toContain("import { Link, createFileRoute }");
  expect(source).toContain("projectSearchScope={projectSearchScope}");
  expect(source).toContain(
    "organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName)",
  );
  expect(source).toContain(
    "function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string)",
  );
  expect(source).toContain("return projectIsProtected(project) ? ownerName : undefined;");
  expect(source).toContain("function projectIsProtected(project: ProjectContainer)");
  expect(source).toContain('stringField(record.projectScope, "") === "protected"');
  expect(source).toContain('to="/$user"');
  expect(source).toContain(
    'import { ProjectHeader, ProjectMenu, ProjectNestedShellContext } from "../$projectName";',
  );
  expect(source).toContain("const nestedProjectShell = use(ProjectNestedShellContext);");
  expect(source).toContain("return <ProjectWatchersScreen nestedProjectShell");
  expect(source).toContain(
    'import defaultAvatarUrl from "../../../assets/legacy/default-avatar-128.png";',
  );
  expect(source).toContain("prefixBasePath(basePath, defaultAvatarUrl)");
  expect(source).not.toContain("/legacy-assets/images/default-avatar-32.png");
  expect(source).toContain(
    "<ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />",
  );
  expect(source).toContain(
    "<ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />",
  );
  expect(source).not.toContain("function ProjectHeader(");
  expect(source).not.toContain("function ProjectMenu(");
  expect(source).toContain(
    '<title>{`${t("title.projectWatchers")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(source).not.toContain('data-toggle="dropdown"');
  expect(source).not.toContain('data-toggle="tooltip"');
  expect(source).not.toContain("document.");
  expect(source).not.toContain("useProjectWatchersDocumentTitle");
  expect(source).not.toContain("onMouseDown=");
  expect(source).not.toContain("legacyUserSearch");
  expect(source).not.toContain("daysAgo: undefined");
  expect(source).not.toContain("selected: undefined");
  expect(source).not.toContain("search={legacyUserSearch}");
  expect(source).not.toContain("legacyLinkProps");
  expect(source).not.toContain("{...legacyLinkProps}");
  expect(source).toContain("activeOptions={legacyLinkActiveOptions}");
  expect(source).toContain("activeProps={legacyLinkActiveProps}");
  expect(source).toContain("includeSearch: true");
  expect(source).toContain('"data-status": undefined');
  for (const owner of [
    "project-watchers-list",
    "project-watchers-member",
    "project-watchers-avatar",
    "project-watchers-avatar-image",
    "project-watchers-member-name",
    "project-watchers-member-id",
  ]) {
    expect(source).toContain(`data-owner="${owner}"`);
  }
  expect(source).not.toContain('className="members project row-fluid"');
  expect(source).not.toContain('className="member span6 span-hard-wrap"');
  expect(source).not.toContain('className="avatar-wrap mlarge pull-left mr10"');
  expect(source).not.toContain('className="member-name"');
  expect(source).not.toContain('className="member-id"');
  expect(source).not.toContain("<a ");
  expect(source).not.toContain("<a\n");
  expect(source).not.toContain("href={prefixBasePath");
  expect(source).not.toContain("href={projectHref");
  expect(source).not.toContain("function projectHref");
  expect(source).not.toContain("project.enrollmentRequestCount");
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
  await installWatchDropdownDelegatedClickTrap(page);
  await mockProjectAdmin(page, { watchRequests, watchResponseCount: 1 });

  await page.goto(`${basePath}/admin/sample/watchers`);
  const initialUrl = page.url();
  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __watchDropdownSpaMarker?: string }
    ).__watchDropdownSpaMarker = "kept";
  });
  const watchButtonGroup = page.locator(".project-util .watch-btn");
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/watchers`,
  );
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveAttribute(
    "title",
    "number of watcher",
  );
  await expect(watchButtonGroup.locator(".watcher-count")).not.toHaveAttribute("data-toggle", /.+/);
  await expect(watchButtonGroup.locator('[data-toggle="tooltip"]')).toHaveCount(0);
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveText("2");
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveClass(/watch-on/);
  await expect(watchButtonGroup.locator(".down-arrow")).toHaveText("Unwatch");
  await expect(watchButtonGroup.locator(".down-arrow")).toHaveClass(
    "btn nofocus no-border down-arrow",
  );
  await expect(watchButtonGroup.locator(".down-arrow")).not.toHaveAttribute("data-toggle", /.+/);
  await expect(watchButtonGroup.locator('[data-toggle="dropdown"]')).toHaveCount(0);

  await watchButtonGroup.locator(".down-arrow").click();
  await expect(watchButtonGroup).toHaveClass(/open/);
  expect(page.url()).toBe(initialUrl);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __watchDropdownSpaMarker?: string })
          .__watchDropdownSpaMarker,
    ),
  ).toBe("kept");
  await expect.poll(() => watchDropdownDelegatedClickTrapHits(page)).toEqual([]);
  await watchButtonGroup.locator(".down-arrow").click();
  await expect(watchButtonGroup).not.toHaveClass(/open/);
  expect(page.url()).toBe(initialUrl);
  await expect.poll(() => watchDropdownDelegatedClickTrapHits(page)).toEqual([]);
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
  expect(page.url()).toBe(initialUrl);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __watchDropdownSpaMarker?: string })
          .__watchDropdownSpaMarker,
    ),
  ).toBe("kept");
  await expect.poll(() => watchDropdownDelegatedClickTrapHits(page)).toEqual([]);
  await expect(watchButtonGroup.locator(".watcher-count")).toHaveText("1");
  await expect(watchButtonGroup.locator(".watcher-count")).not.toHaveClass(/watch-on/);
  await expect(watchButtonGroup).not.toHaveClass(/open/);
  await expect(watchButtonGroup.locator(".down-arrow")).toHaveText("Watch");
});

async function readDesktopWatchersMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const title = requireElement(".project-page-wrap h4");
    const description = requireElement(".project-page-wrap > p");
    const memberList = requireElement('[data-owner="project-watchers-list"]');
    const firstMember = requireElement('[data-owner="project-watchers-member"]');
    const firstAvatar = requireElement('[data-owner="project-watchers-avatar"]');
    const firstImage = requireElement('[data-owner="project-watchers-avatar-image"]');
    const firstName = requireElement('[data-owner="project-watchers-member-name"]');
    const firstId = requireElement('[data-owner="project-watchers-member-id"]');
    const projectMenu = requireElement(".project-menu-gruop");
    const watcherCount = requireElement(".project-util .watcher-count");
    const watchAction = requireElement(".project-util .down-arrow");
    const watcherUtil = requireElement(".project-util-wrap");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const titleStyle = getComputedStyle(title);
    const descriptionStyle = getComputedStyle(description);
    const memberStyle = getComputedStyle(firstMember);
    const avatarStyle = getComputedStyle(firstAvatar);
    const imageStyle = getComputedStyle(firstImage);
    const nameStyle = getComputedStyle(firstName);
    const idStyle = getComputedStyle(firstId);
    return {
      avatarBackground: avatarStyle.backgroundColor,
      avatarBorderRadius: avatarStyle.borderRadius,
      avatarFloat: avatarStyle.float,
      avatarHeight: avatarStyle.height,
      avatarImageHeight: firstImage.getAttribute("height"),
      avatarImageRenderedHeight: Math.round(firstImage.getBoundingClientRect().height),
      avatarImageRenderedWidth: Math.round(firstImage.getBoundingClientRect().width),
      avatarImageVerticalAlign: imageStyle.verticalAlign,
      avatarImageWidth: firstImage.getAttribute("width"),
      avatarMarginRight: avatarStyle.marginRight,
      avatarWidth: avatarStyle.width,
      descriptionMarginBottom: descriptionStyle.marginBottom,
      descriptionMarginTop: descriptionStyle.marginTop,
      firstMemberFloat: memberStyle.float,
      firstMemberBorderBottom: memberStyle.borderBottom,
      firstMemberBoxSizing: memberStyle.boxSizing,
      firstMemberMarginLeft: memberStyle.marginLeft,
      firstMemberMinHeight: memberStyle.minHeight,
      firstMemberPadding: memberStyle.padding,
      firstMemberPosition: memberStyle.position,
      firstMemberWidth: Math.round(firstMember.getBoundingClientRect().width),
      memberIdColor: idStyle.color,
      memberIdLineHeight: idStyle.lineHeight,
      memberListMarginLeft: getComputedStyle(memberList).marginLeft,
      memberListWidth: Math.round(memberList.getBoundingClientRect().width),
      memberNameFontWeight: nameStyle.fontWeight,
      memberNameLineHeight: nameStyle.lineHeight,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      projectMenuWidth: Math.round(projectMenu.getBoundingClientRect().width),
      projectPageMarginTop: projectPageStyle.marginTop,
      titleLineHeight: titleStyle.lineHeight,
      titlePadding: titleStyle.padding,
      watchActionWidth: Math.round(watchAction.getBoundingClientRect().width),
      watcherCountWidth: Math.round(watcherCount.getBoundingClientRect().width),
      watcherUtilWidth: Math.round(watcherUtil.getBoundingClientRect().width),
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



async function readProtectedPortalWatchersShellMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = requireElement('[data-owner="global-gnb-inner"]');
    const search = requireElement('[data-owner="global-gnb-search-box"]');
    const projectHeader = requireElement(".project-header-outer");
    const projectMenu = requireElement(".project-menu-outer");
    const pageWrap = requireElement(".page-wrap-outer");
    const navbarBox = navbar.getBoundingClientRect();
    const searchBox = search.getBoundingClientRect();
    const projectHeaderBox = projectHeader.getBoundingClientRect();
    const projectMenuBox = projectMenu.getBoundingClientRect();
    const pageWrapBox = pageWrap.getBoundingClientRect();

    return {
      pageWrapBelowMenu: pageWrapBox.top >= projectMenuBox.bottom,
      projectMenuBelowHeader: projectMenuBox.top >= projectHeaderBox.bottom,
      searchBottomWithinNavbar: searchBox.bottom <= navbarBox.bottom,
      searchLeftWithinNavbar: searchBox.left >= navbarBox.left,
      searchRightWithinNavbar: searchBox.right <= navbarBox.right,
      searchTopWithinNavbar: searchBox.top >= navbarBox.top,
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

async function readMobileWatchersMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrap = requireElement(".project-page-wrap");
    const members = Array.from(
      document.querySelectorAll<HTMLElement>('[data-owner="project-watchers-member"]'),
    );
    const first = members[0];
    const second = members[1];
    if (!first || !second) {
      throw new Error("Missing watcher members");
    }
    const pageBox = pageWrap.getBoundingClientRect();
    const firstBox = first.getBoundingClientRect();
    const secondBox = second.getBoundingClientRect();
    return {
      bodyHasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      firstMemberInsidePage: firstBox.left >= pageBox.left && firstBox.right <= pageBox.right,
      firstMemberWidth: Math.round(firstBox.width),
      menuHasActiveItem: document.querySelector(".project-menu-gruop > li.active") !== null,
      twoMembersStackVertically: secondBox.top >= firstBox.bottom,
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

async function readKoreanBadgeMenuMetrics(page: Page) {
  return page.evaluate(() => {
    const menu = requireElement(".project-menu-gruop");
    const issue = requireElement(".project-menu-gruop > li:nth-child(3) > a");
    const board = requireElement(".project-menu-gruop > li:nth-child(7) > a");
    return {
      boardHasLiteralSpace: hasBadgeSpace(board),
      boardLabel: requireChild(board, ".menu-name").textContent,
      issueHasLiteralSpace: hasBadgeSpace(issue),
      issueLabel: requireChild(issue, ".menu-name").textContent,
      menuWidth: Math.round(menu.getBoundingClientRect().width),
    };

    function hasBadgeSpace(link: HTMLElement) {
      const badge = requireChild(link, ".project-menu-count");
      return (
        badge.previousSibling?.nodeType === Node.TEXT_NODE &&
        badge.previousSibling.textContent === " "
      );
    }

    function requireChild(parent: HTMLElement, selector: string): HTMLElement {
      const element = parent.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }

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
    watchers?: ReturnType<typeof watcherFixture>[];
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
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
        watchers: options.watchers ?? [
          watcherFixture("alice", 2, "Alice Doe"),
          watcherFixture("bob", 3, "Bob Smith"),
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

async function mockProtectedPortalWatchers(page: Page) {
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
  await page.route("**/api/v1/owners/weblabs/projects/portal/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...projectContainer(),
        id: 2,
        organizationName: "weblabs",
        ownerName: "weblabs",
        isProtected: true,
        projectScope: "protected",
        projectName: "portal",
      }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/watchers", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerName: "weblabs",
        projectName: "portal",
        totalCount: 2,
        watchers: [
          {
            avatarUrl: "/assets/images/default-avatar-128.png",
            loginId: "carol",
            userId: 35,
            userLabel: "Carol Lee",
          },
          {
            avatarUrl: "/assets/images/default-avatar-128.png",
            loginId: "admin",
            userId: 1,
            userLabel: "Site Admin",
          },
        ],
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

async function installWatchDropdownDelegatedClickTrap(page: Page) {
  await page.addInitScript(() => {
    const hits: string[] = [];
    Object.defineProperty(window, "__yonaWatchDropdownDelegatedClickTrapHits", {
      configurable: true,
      value: hits,
    });
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const delegatedTarget = target.closest(".watch-btn .down-arrow, .watch-btn .watchBtn");
      if (delegatedTarget) {
        hits.push(
          delegatedTarget.matches(".down-arrow")
            ? `trigger:${delegatedTarget.getAttribute("data-toggle") ?? "none"}`
            : "watch-action",
        );
      }
    });
  });
}

async function watchDropdownDelegatedClickTrapHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __yonaWatchDropdownDelegatedClickTrapHits?: string[] }
      ).__yonaWatchDropdownDelegatedClickTrapHits ?? [],
  );
}

function projectContainer() {
  return {
    enrolledUsers: [],
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

function watcherFixture(loginId: string, userId: number, userLabel: string) {
  return {
    avatarUrl: "/assets/images/default-avatar-32.png",
    loginId,
    userId,
    userLabel,
  };
}

async function canonicalizeWatchersBody(page: Page) {
  return page.evaluate(() => {
    const legacyClassesByOwner: Record<string, string> = {
      "project-watchers-list": "members project row-fluid",
      "project-watchers-member": "member span6 span-hard-wrap",
      "project-watchers-avatar": "avatar-wrap mlarge pull-left mr10",
      "project-watchers-avatar-image": "",
      "project-watchers-member-name": "member-name",
      "project-watchers-member-id": "member-id",
    };
    const roots = Array.from(document.querySelectorAll(".page-wrap-outer"));
    return roots.map((root) => visit(root)).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const owner = node.getAttribute("data-owner");
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "data-style-src" &&
            attr.name !== "alt" &&
            attr.name !== "data-owner" &&
            !(owner && attr.name === "class" && !legacyClassesByOwner[owner]),
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(
          (attr) =>
            `${attr.name}=${JSON.stringify(
              owner && attr.name === "class" ? legacyClassesByOwner[owner] : normalizeAttr(attr),
            )}`,
        )
        .join(" ");
      const legacyClass = owner && legacyClassesByOwner[owner];
      const classAttr =
        legacyClass && !node.hasAttribute("class") ? `class=${JSON.stringify(legacyClass)}` : null;
      // keep the injected legacy class at its sorted position so the anchor
      // canonicalizes the same as canonicalizeHtml (class before href)
      const normalizedAttrs =
        classAttr === null
          ? attrs
          : [classAttr, ...attrs.split(" ").filter((token) => token && !token.startsWith("class="))]
              .sort((left, right) => left.localeCompare(right))
              .join(" ");
      const open = normalizedAttrs
        ? `<${node.tagName.toLowerCase()} ${normalizedAttrs}>`
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
        .map((attr) => [attr.name, normalizeAttr(attr)] as const)
        .filter(([name, value]) => !(name === "class" && value === ""))
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
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
