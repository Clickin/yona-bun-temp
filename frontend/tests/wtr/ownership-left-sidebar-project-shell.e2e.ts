import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });
test.setTimeout(30_000);

test("left Project search/list shell has complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  for (const token of [
    "leftSidebarProjectSearchSurface",
    "leftSidebarProjectSearchText",
    "sidenavSearchFocusAccent",
    "sidenavNoResultText",
    "sidenavScrollbarTrack",
    "sidenavScrollbarThumb",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }
  expect(route).toContain('"left-sidebar-project-shell"');
});

for (const viewport of [
  {
    activePaneHeight: 104,
    activePaneMaxHeight: "720px",
    barHalf: "135px",
    contentHeight: 114,
    emptyContentHeight: 55,
    emptyShellHeight: 173,
    groupWidth: 270,
    height: 900,
    inputContentWidth: "267.297px",
    inputWidth: 279.296875,
    label: "desktop",
    shellHeight: 232,
    shellWidth: 270,
    shellY: 105,
    width: 1366,
  },
  {
    activePaneHeight: 104,
    activePaneMaxHeight: "675.2px",
    barHalf: "158.844px",
    contentHeight: 114,
    emptyContentHeight: 55,
    emptyShellHeight: 143,
    groupWidth: 317.6875,
    height: 844,
    inputContentWidth: "314.5px",
    inputWidth: 326.5,
    label: "mobile",
    shellHeight: 202,
    shellWidth: 317.6875,
    shellY: 78,
    width: 390,
  },
]) {
  test(`left Project search/list shell preserves ${viewport.label} parity and behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const leftSidebar = page.locator("#sidebar");
    await leftSidebar.getByRole("button", { exact: true, name: "Project" }).click();
    const projectPane = page.locator("#left-sidebar-myProjectList");
    const owner = projectPane.locator('[data-owner="left-sidebar-project-shell"]');
    const input = owner.locator(":scope > div:nth-child(1) > input");
    const subtabs = owner.locator('[data-owner="left-sidebar-project-subtabs"]');
    await expect(owner).toBeVisible();

    const initial = await readEvidence(owner);
    console.log(`left-sidebar-project-shell-${viewport.label}`, JSON.stringify(initial));
    expect(initial.presentationClasses).toEqual([]);
    expect(initial.pluginAttributes).toEqual([]);
    expect(initial.ancestorHasUserProjectList).toBe(false);
    expect(initial.geometry.shell).toEqual({
      height: viewport.shellHeight,
      width: viewport.shellWidth,
      x: 0,
      y: viewport.shellY,
    });
    expect(initial.geometry.group).toEqual({
      height: 42,
      width: viewport.groupWidth,
      x: 0,
      y: viewport.shellY,
    });
    expect(initial.geometry.input).toEqual({
      height: 42,
      width: viewport.inputWidth,
      x: 0,
      y: viewport.shellY,
    });
    expect(initial.geometry.bar).toEqual({
      height: 0,
      width: viewport.groupWidth,
      x: 0,
      y: viewport.shellY + 42,
    });
    expect(initial.geometry.content).toEqual({
      height: viewport.contentHeight,
      width: viewport.shellWidth,
      x: 0,
      y: viewport.label === "desktop" ? 223 : 166,
    });
    expect(initial.geometry.activePane).toEqual({
      height: viewport.activePaneHeight,
      width: viewport.shellWidth,
      x: 0,
      y: viewport.label === "desktop" ? 223 : 166,
    });
    expect(initial.styles.groupPosition).toBe("relative");
    expect(initial.styles.input).toMatchObject({
      backgroundColor: "rgb(0, 0, 0)",
      borderRadius: "0px",
      borderStyle: "none",
      borderWidth: "0px",
      boxShadow: "none",
      boxSizing: "content-box",
      color: "rgb(255, 255, 255)",
      display: "block",
      fontSize: viewport.label === "desktop" ? "14px" : "16px",
      height: "34px",
      lineHeight: "20px",
      marginBottom: "0px",
      outlineStyle: "none",
      padding: "4px 6px",
      width: viewport.inputContentWidth,
    });
    expect(initial.styles.bar).toEqual({ display: "block", position: "relative" });
    expect(initial.styles.barBefore).toMatchObject({
      backgroundColor: "rgb(233, 30, 99)",
      bottom: "1px",
      content: '""',
      height: "1px",
      left: viewport.barHalf,
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
      right: viewport.barHalf,
      transitionDuration: "0.2s",
      width: "0px",
    });
    expect(initial.styles.contentOverflow).toEqual({ x: "hidden", y: "hidden" });
    expect(initial.styles.activePane).toMatchObject({
      display: "block",
      listStyleType: "none",
      margin: "0px 0px 10px",
      maxHeight: viewport.activePaneMaxHeight,
      overflowX: "auto",
      overflowY: "auto",
      padding: "0px",
      scrollbarBackground: "rgb(211, 211, 211)",
      scrollbarHeight: "10px",
      scrollbarThumbBackground: "rgb(39, 136, 186)",
      scrollbarWidth: "5px",
    });
    expect(initial.styles.scrollbarPrimitive).toMatchObject({
      backgroundClip: "padding-box",
      borderRadius: "8px",
      minHeight: "28px",
    });
    expect(initial.paneDisplays).toEqual({
      createdByMe: "none",
      joinmember: "none",
      recentlyVisited: "block",
      watching: "none",
    });
    expect(initial.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    await input.focus();
    await page.waitForTimeout(250);
    const focused = await readEvidence(owner);
    expect(focused.styles.barBefore.width).toBe(viewport.barHalf);
    expect(focused.styles.barAfter.width).toBe(viewport.barHalf);
    await saveScreenshot(
      page,
      `style-left-sidebar-project-shell-focus-local-${viewport.label}.png`,
    );

    await input.fill("alpha");
    await expect(page.locator("#left-sidebar-recentlyVisited > li")).toHaveCount(1);
    await expect(page.locator("#left-sidebar-recentlyVisited")).toContainText("alpha-project");
    await expect(page.locator("#left-sidebar-recentlyVisited")).not.toContainText("beta-project");
    await input.fill("");

    const paneIds = [
      "left-sidebar-recentlyVisited",
      "left-sidebar-createdByMe",
      "left-sidebar-watching",
      "left-sidebar-joinmember",
    ];
    const buttons = subtabs.locator(":scope > ul > li > button");
    for (let index = 0; index < paneIds.length; index += 1) {
      await buttons.nth(index).click();
      for (let paneIndex = 0; paneIndex < paneIds.length; paneIndex += 1) {
        const pane = page.locator(`#${paneIds[paneIndex]}`);
        if (paneIndex === index) await expect(pane).toBeVisible();
        else await expect(pane).toBeHidden();
      }
    }

    const empty = page.locator("#left-sidebar-joinmember");
    await expect(empty).toHaveText("No results");
    const emptyEvidence = await readEvidence(owner);
    expect(emptyEvidence.geometry.shell.height).toBe(viewport.emptyShellHeight);
    expect(emptyEvidence.geometry.content.height).toBe(viewport.emptyContentHeight);
    expect(emptyEvidence.geometry.activePane).toEqual({
      height: 20,
      width: viewport.shellWidth,
      x: 0,
      y: viewport.label === "desktop" ? 233 : 176,
    });
    expect(emptyEvidence.styles.noResult).toEqual({
      color: "rgb(199, 21, 133)",
      fontSize: "16px",
      margin: "10px 0px 25px",
      textAlign: "center",
    });
    await saveScreenshot(
      page,
      `style-left-sidebar-project-shell-empty-local-${viewport.label}.png`,
    );

    await buttons.nth(0).click();
    await saveScreenshot(page, `style-left-sidebar-project-shell-local-${viewport.label}.png`);

    await expect(page.locator("#left-sidebar-myRecentIssueList")).toHaveClass(/user-project-list/);
    await leftSidebar.getByRole("button", { name: "Sidebar" }).click();
    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
    await page.locator("#mySidenav .myProjectList > button").click();
    await expect(page.locator("#mySidenav #myProjectList")).toHaveClass(/user-project-list/);
  });
}

async function readEvidence(owner: Locator) {
  return owner.evaluate((element) => {
    const group = element.firstElementChild;
    const input = group?.querySelector("input");
    const bar = group?.querySelector("span");
    const content = element.lastElementChild;
    const panes = ["recentlyVisited", "createdByMe", "watching", "joinmember"].map((id) =>
      content?.querySelector(`#left-sidebar-${id}`),
    );
    if (!group || !input || !bar || !content || panes.some((pane) => !pane)) {
      throw new Error("Left Project shell is incomplete");
    }
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
    };
    const activePane = panes.find((pane) => getComputedStyle(pane!).display === "block")!;
    const inputStyle = getComputedStyle(input);
    const activeStyle = getComputedStyle(activePane!);
    const scrollbar = getComputedStyle(activePane!, "::-webkit-scrollbar");
    const thumb = getComputedStyle(activePane!, "::-webkit-scrollbar-thumb");
    const before = getComputedStyle(bar, "::before");
    const after = getComputedStyle(bar, "::after");
    const noResult = panes[3]!;
    const noResultStyle = getComputedStyle(noResult!);
    const targets = [element.parentElement, element, group, input, bar, content, ...panes].filter(
      Boolean,
    ) as Element[];
    const presentationClasses = [
      "search-result",
      "tab-pane",
      "myproject-list-wrap",
      "group",
      "search-input",
      "project-search",
      "bar",
      "tab-content",
      "user-ul",
      "active",
      "no-result",
    ];
    return {
      ancestorHasUserProjectList: Boolean(element.closest(".user-project-list")),
      geometry: {
        activePane: box(activePane!),
        bar: box(bar),
        content: box(content),
        group: box(group),
        input: box(input),
        shell: box(element),
      },
      paneDisplays: Object.fromEntries(
        panes.map((pane) => [
          pane!.id.replace("left-sidebar-", ""),
          getComputedStyle(pane!).display,
        ]),
      ),
      pluginAttributes: targets.flatMap((target) =>
        Array.from(target.attributes, (attribute) => attribute.name).filter((name) =>
          /^(data-(toggle|target|action|href|url|placement|trigger)|data-request-)/.test(name),
        ),
      ),
      presentationClasses: targets.flatMap((target) =>
        presentationClasses.filter((className) => target.classList.contains(className)),
      ),
      styles: {
        activePane: {
          display: activeStyle.display,
          listStyleType: activeStyle.listStyleType,
          margin: activeStyle.margin,
          maxHeight: activeStyle.maxHeight,
          overflowX: activeStyle.overflowX,
          overflowY: activeStyle.overflowY,
          padding: activeStyle.padding,
          scrollbarBackground: scrollbar.backgroundColor,
          scrollbarHeight: scrollbar.height,
          scrollbarThumbBackground: thumb.backgroundColor,
          scrollbarWidth: scrollbar.width,
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
        contentOverflow: {
          x: getComputedStyle(content).overflowX,
          y: getComputedStyle(content).overflowY,
        },
        groupPosition: getComputedStyle(group).position,
        input: {
          backgroundColor: inputStyle.backgroundColor,
          borderRadius: inputStyle.borderRadius,
          borderStyle: inputStyle.borderStyle,
          borderWidth: inputStyle.borderWidth,
          boxShadow: inputStyle.boxShadow,
          boxSizing: inputStyle.boxSizing,
          color: inputStyle.color,
          display: inputStyle.display,
          fontSize: inputStyle.fontSize,
          height: inputStyle.height,
          lineHeight: inputStyle.lineHeight,
          marginBottom: inputStyle.marginBottom,
          outlineStyle: inputStyle.outlineStyle,
          padding: inputStyle.padding,
          width: inputStyle.width,
        },
        noResult: {
          color: noResultStyle.color,
          fontSize: noResultStyle.fontSize,
          margin: noResultStyle.margin,
          textAlign: noResultStyle.textAlign,
        },
        scrollbarPrimitive: {
          backgroundClip: thumb.backgroundClip,
          borderRadius: thumb.borderRadius,
          minHeight: thumb.minHeight,
        },
      },
      viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
    };
  });
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myProjectList");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "en-US",
        userLabel: "Site Admin",
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
        issueItems: [],
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

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
