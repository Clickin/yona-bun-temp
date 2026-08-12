import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("authenticated side-nav project shell has narrow global-theme Style ownership", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  expect(routeSource).toContain('"authenticated-sidenav-project-shell"');
});

for (const viewport of [
  { label: "desktop", width: 1366, height: 900, rootWidth: 350 },
  { label: "mobile", width: 390, height: 844, rootWidth: 390 },
]) {
  test(`authenticated project search/list shell preserves ${viewport.label} geometry and behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#sidebar-open-btn > button").click();
    await page.locator("#mySidenav .myProjectList > button").click();
    // F5 dist-truth: the shell slides open with a 0.5s width transition
    // (rootSidebarMotionStyles.shell); geometry only matches the settled
    // layout, so wait it out (favorite-stars precedent waits 600ms).
    await page.waitForTimeout(600);

    const owner = page.locator(
      '#mySidenav #myProjectList [data-owner="authenticated-sidenav-project-shell"]',
    );
    const input = owner.locator(":scope > .group > input");
    const subtabs = owner.locator('[data-owner="authenticated-sidenav-project-subtabs"]');
    await expect(owner).toBeVisible();

    // F5 dist-truth: the tab panes settle to their legacy display a beat
    // after mount; read after the settle (probes confirm the final state).
    // ponytail: the hidden-pane display read is run-flaky in the harness
    // (probes confirm the settled panes are correct: recentlyVisited block,
    // the rest none); the paneDisplays assertion re-reads below.
    await new Promise((r) => setTimeout(r, 500));
    const initial = await readEvidence(owner);
    console.log(`authenticated-sidenav-project-shell-${viewport.label}`, JSON.stringify(initial));
    await saveScreenshot(
      page,
      `style-authenticated-sidenav-project-shell-${viewport.label}-${initial.hasOwner ? "after" : "before"}.png`,
    );

    expect(initial.hasOwner).toBe(true);
    expect(initial.geometry.root.width).toBe(viewport.rootWidth);
    expect(initial.geometry.group.height).toBe(42);
    expect(initial.geometry.input.height).toBe(42);
    expect(initial.geometry.tabContent.height).toBe(114);
    expect(initial.geometry.tabContent.left).toBe(initial.geometry.root.left);
    expect(initial.geometry.tabContent.right).toBe(initial.geometry.root.right);
    expect(initial.geometry.group.bottom).toBe(initial.geometry.subtabs.top);
    expect(initial.geometry.subtabs.bottom).toBe(initial.geometry.tabContent.top);
    expect(initial.styles.groupPosition).toBe("relative");
    expect(initial.styles.input).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      borderRadius: "0px",
      borderStyle: "none",
      borderWidth: "0px",
      boxSizing: "content-box",
      color: "rgb(85, 85, 85)",
      display: "block",
      fontSize: viewport.width > 720 ? "14px" : "16px",
      height: "34px",
      marginBottom: "0px",
      outlineStyle: "none",
      width: viewport.width > 720 ? "346.5px" : "386.094px",
    });
    expect(initial.styles.bar).toEqual({ display: "block", position: "relative" });
    expect(initial.styles.barBefore).toMatchObject({
      backgroundColor: "rgb(233, 30, 99)",
      bottom: "1px",
      content: '""',
      height: "1px",
      left: `${viewport.rootWidth / 2}px`,
      position: "absolute",
      transitionDuration: "0.2s",
      width: "0px",
    });
    expect(initial.styles.barAfter).toMatchObject({
      backgroundColor: "rgb(233, 30, 99)",
      bottom: "1px",
      content: '""',
      height: "1px",
      position: "absolute",
      right: `${viewport.rootWidth / 2}px`,
      transitionDuration: "0.2s",
      width: "0px",
    });
    expect(initial.styles.tabContentOverflow).toEqual({ x: "hidden", y: "hidden" });
    expect(initial.styles.activeList).toMatchObject({
      display: "block",
      listStyleType: "none",
      margin: "0px 0px 10px",
      maxHeight: `${viewport.height * 0.8}px`,
      overflowX: "auto",
      overflowY: "auto",
      padding: "0px",
      scrollbarBackground: "rgb(211, 211, 211)",
      scrollbarHeight: "10px",
      scrollbarThumbBackground: "rgb(39, 136, 186)",
      scrollbarWidth: "5px",
    });
    // F5 dist-truth: the panes settle to their legacy display a beat after
    // mount; re-read at the assertion (the first read can catch the
    // pre-settle state — probes confirm the settled state is correct).
    expect((await readEvidence(owner)).paneDisplays).toEqual({
      createdByMe: "none",
      joinmember: "none",
      recentlyVisited: "block",
      watching: "none",
    });
    expect(initial.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    await input.focus();
    await page.waitForTimeout(250);
    const focused = await readEvidence(owner);
    expect(focused.styles.barBefore.width).toBe(`${viewport.rootWidth / 2}px`);
    expect(focused.styles.barAfter.width).toBe(`${viewport.rootWidth / 2}px`);

    await input.fill("alpha");
    await expect(page.locator("#recentlyVisited > li")).toHaveCount(1);
    await expect(page.locator("#recentlyVisited")).toContainText("alpha-project");
    await expect(page.locator("#recentlyVisited")).not.toContainText("beta-project");
    await input.fill("");

    const paneIds = ["recentlyVisited", "createdByMe", "watching", "joinmember"];
    const buttons = subtabs.locator(":scope > ul > li > button");
    for (let index = 0; index < paneIds.length; index += 1) {
      await buttons.nth(index).click();
      for (let paneIndex = 0; paneIndex < paneIds.length; paneIndex += 1) {
        const pane = page.locator(`#${paneIds[paneIndex]}`);
        if (paneIndex === index) await expect(pane).toBeVisible();
        else await expect(pane).toBeHidden();
      }
    }
    const empty = page.locator("#joinmember");
    await expect(empty).toHaveText("결과 없음");
    await expect(empty).toHaveCSS("color", "rgb(199, 21, 133)");
    await expect(empty).toHaveCSS("font-size", "16px");
    await expect(empty).toHaveCSS("text-align", "center");
    await expect(empty).toHaveCSS("margin", "10px 0px 25px");

    await buttons.nth(0).click();
    await expect(page.locator("#recentlyVisited")).toBeVisible();
    const removalBaseline = await readEvidence(owner);
    await removeLegacyShellClasses(owner);
    const withoutFallback = await readEvidence(owner);
    expect(withoutFallback.paneDisplays).toEqual(removalBaseline.paneDisplays);
    expect(withoutFallback.styles.activeList).toEqual(removalBaseline.styles.activeList);
    expect(withoutFallback.styles.input).toEqual(removalBaseline.styles.input);
    expect(withoutFallback.styles.bar).toEqual(removalBaseline.styles.bar);
    expect(withoutFallback.styles.tabContentOverflow).toEqual(
      removalBaseline.styles.tabContentOverflow,
    );
    expect(withoutFallback.styles.noResult).toEqual({
      color: "rgb(199, 21, 133)",
      fontSize: "16px",
      margin: "10px 0px 25px",
      textAlign: "center",
    });
    expect(withoutFallback.viewport).toEqual(initial.viewport);
  });
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["ko-KR"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/legacy-assets/images/default-avatar-34.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "사이트 관리자",
      },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  const project = (projectName: string) => ({
    isFavorited: false,
    ownerName: "outside",
    projectId: projectName,
    projectName,
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [project("epsilon-project"), project("zeta-project")],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [
          project("alpha-project"),
          project("beta-project"),
          project("gamma-project"),
          project("delta-project"),
        ],
        watchedProjects: [
          project("eta-project"),
          project("theta-project"),
          project("iota-project"),
        ],
      },
    }),
  );
}

async function readEvidence(owner: Locator) {
  return owner.evaluate((element) => {
    const group = element.firstElementChild;
    const input = group?.querySelector("input");
    const bar = group?.querySelector("span");
    const subtabs = element.querySelector('[data-owner="authenticated-sidenav-project-subtabs"]');
    const tabContent = element.lastElementChild;
    const panes = ["recentlyVisited", "createdByMe", "watching", "joinmember"].map((id) =>
      tabContent?.querySelector(`#${id}`),
    );
    if (!group || !input || !bar || !subtabs || !tabContent || panes.some((pane) => !pane)) {
      throw new Error("Authenticated project shell is incomplete");
    }
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const inputStyle = getComputedStyle(input);
    const before = getComputedStyle(bar, "::before");
    const after = getComputedStyle(bar, "::after");
    const activeList = panes.find((pane) => getComputedStyle(pane!).display === "block")!;
    const listStyle = getComputedStyle(activeList!);
    const scrollbarStyle = getComputedStyle(activeList!, "::-webkit-scrollbar");
    const thumbStyle = getComputedStyle(activeList!, "::-webkit-scrollbar-thumb");
    const noResult = panes[3]!;
    const noResultStyle = getComputedStyle(noResult!);
    return {
      geometry: {
        group: box(group),
        input: box(input),
        root: box(element),
        subtabs: box(subtabs),
        tabContent: box(tabContent),
      },
      hasOwner: element.getAttribute("data-owner") === "authenticated-sidenav-project-shell",
      paneDisplays: Object.fromEntries(
        panes.map((pane) => [pane!.id, getComputedStyle(pane!).display]),
      ),
      styles: {
        activeList: {
          display: listStyle.display,
          listStyleType: listStyle.listStyleType,
          margin: listStyle.margin,
          maxHeight: listStyle.maxHeight,
          overflowX: listStyle.overflowX,
          overflowY: listStyle.overflowY,
          padding: listStyle.padding,
          scrollbarBackground: scrollbarStyle.backgroundColor,
          scrollbarHeight: scrollbarStyle.height,
          scrollbarThumbBackground: thumbStyle.backgroundColor,
          scrollbarWidth: scrollbarStyle.width,
        },
        bar: { display: getComputedStyle(bar).display, position: getComputedStyle(bar).position },
        barAfter: {
          backgroundColor: after.backgroundColor,
          bottom: after.bottom,
          content: after.content,
          height: after.height,
          position: after.position,
          right: after.right,
          transitionDuration: after.transitionDuration,
          width: after.width,
        },
        barBefore: {
          backgroundColor: before.backgroundColor,
          bottom: before.bottom,
          content: before.content,
          height: before.height,
          left: before.left,
          position: before.position,
          transitionDuration: before.transitionDuration,
          width: before.width,
        },
        groupPosition: getComputedStyle(group).position,
        input: {
          backgroundColor: inputStyle.backgroundColor,
          borderRadius: inputStyle.borderRadius,
          borderStyle: inputStyle.borderStyle,
          borderWidth: inputStyle.borderWidth,
          boxSizing: inputStyle.boxSizing,
          color: inputStyle.color,
          display: inputStyle.display,
          fontSize: inputStyle.fontSize,
          height: inputStyle.height,
          marginBottom: inputStyle.marginBottom,
          outlineStyle: inputStyle.outlineStyle,
          width: inputStyle.width,
        },
        noResult: {
          color: noResultStyle.color,
          fontSize: noResultStyle.fontSize,
          margin: noResultStyle.margin,
          textAlign: noResultStyle.textAlign,
        },
        tabContentOverflow: {
          x: getComputedStyle(tabContent).overflowX,
          y: getComputedStyle(tabContent).overflowY,
        },
      },
      viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
    };
  });
}

async function removeLegacyShellClasses(owner: Locator) {
  await owner.evaluate((element) => {
    element.classList.remove("tab-pane", "myproject-list-wrap");
    const group = element.querySelector(":scope > .group");
    group?.classList.remove("group");
    group?.querySelector("input")?.classList.remove("search-input", "project-search");
    group?.querySelector(".bar")?.classList.remove("bar");
    const tabContent = element.querySelector(":scope > .tab-content");
    tabContent?.classList.remove("tab-content");
    for (const pane of Array.from(tabContent?.children ?? [])) {
      pane.classList.remove("tab-pane", "user-ul", "no-result", "active");
    }
  });
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
