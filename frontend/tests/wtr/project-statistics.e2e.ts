import { expect, test, type Page } from "../wtr-compat.ts";

test("project statistics matches legacy project/statistics.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/statistics`);
  await expect(page.getByRole("heading", { name: "Under Construction" })).toBeVisible();
  await expect(page).toHaveTitle("statistics - admin/sample");

  expect(await readStatisticsMetrics(page)).toEqual({
    documentScrollWidth: 1366,
    headingBox: { height: 40, left: 10, width: 1346 },
    headingTopEqualsPageWrapTop: true,
    headingFontSize: "38.5px",
    headingFontWeight: "700",
    headingLineHeight: "40px",
    headingMarginBottom: "0px",
    headingMarginTop: "0px",
    headingContainedInProjectPage: true,
    pageWrapMinWidth: "1100px",
    pageWrapBox: { height: 450, left: 0, width: 1366 },
    pageWrapTopGapFromProjectHeader: 10,
    projectHeaderHeight: "120px",
    projectPageBelowProjectHeader: true,
    projectPageMarginTop: "5px",
    projectPageBox: { height: 40, left: 10, width: 1346 },
    projectPageWidth: 1346,
    projectPageTopEqualsPageWrapTop: true,
  });
});

test("project statistics body keeps the frozen max-720 shell geometry", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/statistics`);
  await expect(page.getByRole("heading", { name: "Under Construction" })).toBeVisible();
  expect(await readStatisticsMetrics(page)).toEqual({
    documentScrollWidth: 390,
    headingBox: { height: 40, left: 0, width: 390 },
    headingTopEqualsPageWrapTop: true,
    headingFontSize: "38.5px",
    headingFontWeight: "700",
    headingLineHeight: "40px",
    headingMarginBottom: "0px",
    headingMarginTop: "0px",
    headingContainedInProjectPage: true,
    pageWrapMinWidth: "10px",
    pageWrapBox: { height: 450, left: 0, width: 390 },
    pageWrapTopGapFromProjectHeader: 10,
    projectHeaderHeight: "120px",
    projectPageBelowProjectHeader: true,
    projectPageMarginTop: "5px",
    projectPageBox: { height: 40, left: 0, width: 390 },
    projectPageWidth: 390,
    projectPageTopEqualsPageWrapTop: true,
  });
});

test("project statistics empty header assets stay inside configured application context", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mountPrefix = configuredBasePath === "/" ? "" : configuredBasePath;
  await mockProjectAdmin(page, {
    project: { logoUrl: "", backgroundImageUrl: "" },
  });

  await page.goto(`${mountPrefix}/admin/sample/statistics`);
  await expect(page.getByRole("heading", { name: "Under Construction" })).toBeVisible();

  expect(await page.locator(".project-header-avatar img").getAttribute("src")).toContain(
    "project_default_logo",
  );
  expect(await page.locator(".project-header-outer").getAttribute("style")).toContain(
    "project_default",
  );
  expect(await page.locator(".project-header-outer").getAttribute("style")).not.toContain(
    "url('/assets/",
  );
});

test("project statistics empty header assets stay contextual on mobile", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mountPrefix = configuredBasePath === "/" ? "" : configuredBasePath;
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectAdmin(page, {
    project: { logoUrl: "", backgroundImageUrl: "" },
  });

  await page.goto(`${mountPrefix}/admin/sample/statistics`);
  await expect(page.getByRole("heading", { name: "Under Construction" })).toBeVisible();
  expect(await page.locator(".project-header-avatar img").getAttribute("src")).toContain(
    "project_default_logo",
  );
  expect(await page.locator(".project-header-outer").getAttribute("style")).toContain(
    "project_default",
  );
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
  await expect(watchButton).not.toHaveAttribute("data-toggle", "dropdown");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "project-statistics-watch-dropdown";
  });
  const urlBeforeWatchDropdown = page.url();

  await watchButton.click();
  await expect(page.locator(".project-util > li")).toHaveClass(/open/);
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
  await expect(page.locator(".project-util > li")).toHaveClass(/open/);
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

async function readStatisticsMetrics(page: Page) {
  return page.evaluate(() => {
    const projectHeader = requireElement(".project-header-outer");
    const pageWrapOuter = requireElement('[data-owner="project-statistics-page-outer"]');
    const projectPageWrap = requireElement('[data-owner="project-statistics-page"]');
    const heading = requireElement('[data-owner="project-statistics-page"] > h1');
    const projectHeaderStyle = getComputedStyle(projectHeader);
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const headingStyle = getComputedStyle(heading);
    const projectHeaderBox = projectHeader.getBoundingClientRect();
    const pageWrapBox = pageWrapOuter.getBoundingClientRect();
    const projectPageBox = projectPageWrap.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    return {
      documentScrollWidth: document.documentElement.scrollWidth,
      headingBox: box(headingBox),
      headingTopEqualsPageWrapTop: headingBox.top === pageWrapBox.top,
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
      pageWrapBox: box(pageWrapBox),
      pageWrapTopGapFromProjectHeader: Math.round(pageWrapBox.top - projectHeaderBox.bottom),
      projectHeaderHeight: projectHeaderStyle.height,
      projectPageBelowProjectHeader: pageWrapBox.top >= projectHeaderBox.bottom,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageBox: box(projectPageBox),
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      projectPageTopEqualsPageWrapTop: projectPageBox.top === pageWrapBox.top,
    };

    function box(rect: DOMRect) {
      return {
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
      };
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
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)project-header(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", projectAction);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-owner="global-gnb-search-box"]');
  // wave-33 retained-class retention (667398a04): legacy navbar.scala.html:105
  // <div class="search-box @if(project != null || org != null) {select}">
  await expect(searchBox).toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).toHaveClass(/\bselect\b/);
  const scopeControls = page.locator(
    '[data-owner=global-gnb-search-scope-item] > button[type="button"]',
  );
  await expect(scopeControls).toHaveCount(actions.length);
  await expect(scopeControls).toHaveText(
    groupAction ? ["This Project", "This Group", "All Projects"] : ["This Project", "All Projects"],
  );
  await expect(scopeControls.first()).not.toHaveAttribute("data-action", /.+/);

  if (groupAction) {
    await page.locator("#gnb-search-scope-title").click();
    await scopeControls.nth(1).click();
    await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
    await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", groupAction);
    await expect(page).toHaveURL(currentUrl);
  }

  await page.locator("#gnb-search-scope-title").click();
  await scopeControls.last().click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    actions[actions.length - 1],
  );
  await expect(page).toHaveURL(currentUrl);

  await page.locator("#gnb-search-scope-title").click();
  await scopeControls.first().click();
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
    const navbar = document.querySelector("[data-owner=global-gnb-outer]");
    const form = document.querySelector(".gnb-search-form");
    const searchBox = document.querySelector('[data-owner="global-gnb-search-box"]');
    const scopeButton = document.querySelector("#gnb-search-scope-title");
    const input = document.querySelector('[data-owner="global-gnb-search-input"]');
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
  // WTR fast path stringifies the callback and drops evaluateAll's extra arg;
  // bake the attribute name into the callback body instead.
  return page
    .locator(selector)
    .evaluateAll(
      new Function(
        "elements",
        `return elements.map((element) => element.getAttribute(${JSON.stringify(name)}));`,
      ) as (elements: Element[]) => unknown,
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
          ".project-util .watch-btn .down-arrow, .project-util .watch-btn .watchBtn",
        )
      ) {
        dropdownClicks.push(
          event.target.closest(".project-util .watch-btn .down-arrow")
            ? "watch:toggle"
            : "watch:action",
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
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
  await page.route("**/api/v1/owners/weblabs/projects/portal/container**", async (route) => {
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
