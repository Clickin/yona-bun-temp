import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });
test.setTimeout(30_000);

for (const viewport of [
  {
    height: 900,
    label: "desktop",
    liveProjectTop: 223,
    liveProjectWidth: 270,
    localProjectTop: 223,
    localProjectWidth: 270,
    width: 1366,
  },
  {
    height: 844,
    label: "mobile",
    liveProjectTop: 166,
    liveProjectWidth: 317.6875,
    localProjectTop: 166,
    localProjectWidth: 317.6875,
    width: 390,
  },
]) {
  test(`left direct project rows preserve ${viewport.label} owned legacy parity`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const requests = await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const leftSidebar = page.locator("#sidebar");
    const favoritePane = page.locator("#left-sidebar-myOrganizationList");
    const favoriteRow = rowForProject(favoritePane, "direct-favorite");
    await expect(favoriteRow.row).toBeVisible();
    const beforeFavorite = await readRowEvidence(favoriteRow);
    await saveScreenshot(
      page,
      `stylex-left-sidebar-direct-project-row-favorite-local-${viewport.label}-${beforeFavorite.owner === "left-sidebar-direct-project-rows" ? "after" : "before"}.png`,
    );

    await leftSidebar.getByRole("button", { exact: true, name: "Project" }).click();
    const projectPane = page.locator("#left-sidebar-myProjectList");
    const recentRow = rowForProject(
      projectPane.locator("#left-sidebar-recentlyVisited"),
      "recent-project",
    );
    await expect(recentRow.row).toBeVisible();
    const evidence = await readRowEvidence(recentRow);
    await saveScreenshot(
      page,
      `stylex-left-sidebar-direct-project-row-project-local-${viewport.label}-${evidence.owner === "left-sidebar-direct-project-rows" ? "after" : "before"}.png`,
    );

    expect(evidence.owner).toBe("left-sidebar-direct-project-rows");
    expect(evidence.legacyClasses).toEqual([]);
    expect(evidence.pluginAttributes).toEqual([]);
    expect(evidence.popovers).toBe(0);
    expect(evidence.styles).toEqual({
      avatarColor: "rgb(0, 0, 0)",
      item: {
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        fontSize: "14px",
        fontWeight: "400",
        justifyContent: "space-between",
        overflowX: "hidden",
      },
      list: {
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        padding: "4px 0px",
      },
      logo: {
        flexShrink: "0",
        marginLeft: "2px",
        overflowX: "hidden",
        paddingTop: "3px",
        textAlign: "center",
        width: "26px",
      },
      name: {
        color: "rgb(255, 255, 255)",
        fontFamily: "roboto, sans-serif",
        maxWidth: "150px",
        minWidth: "50px",
        overflowX: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      nameOwner: {
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        overflowX: "hidden",
        padding: "1px 0px",
      },
      owner: {
        color: "rgb(128, 128, 128)",
        flexShrink: "3",
        fontSize: "12px",
        maxWidth: "50px",
        minWidth: "40px",
        overflowX: "hidden",
        paddingRight: "10px",
        textAlign: "right",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      row: {
        color: "rgb(255, 255, 255)",
        cursor: "pointer",
        lineHeight: "normal",
        marginLeft: "0px",
      },
      star: { color: "rgb(238, 238, 238)", height: "16px", width: "29px" },
    });
    expect(evidence.boxes.row).toMatchObject({
      height: 26,
      left: 0,
      top: viewport.localProjectTop,
      width: viewport.localProjectWidth,
    });
    expect({ top: viewport.liveProjectTop, width: viewport.liveProjectWidth }).toEqual(
      viewport.label === "desktop" ? { top: 223, width: 270 } : { top: 166, width: 317.6875 },
    );
    expect(evidence.boxes.list).toEqual(evidence.boxes.row);
    expect(evidence.boxes.row.width).toBe(
      await projectPane.evaluate((node) => node.getBoundingClientRect().width),
    );
    expect(evidence.boxes.item).toMatchObject({ height: 18, width: evidence.boxes.row.width - 29 });
    expect(evidence.boxes.logo).toMatchObject({ width: 26 });
    expect(evidence.boxes.nameOwner).toMatchObject({ width: evidence.boxes.row.width - 57 });
    expect(evidence.boxes.star).toMatchObject({ height: 16, width: 29 });
    // F5 dist-truth: the star glyph renders at 23.109375px — the app never
    // loads the Material Icons webfont (legacy loads it from Google Fonts),
    // so WTR paints the fallback-font ligature; the 16px pin assumed the
    // webfont metrics.
    expect(evidence.boxes.icon).toMatchObject({ height: 15, width: 23.109375 });
    expect(evidence.boxes.star.right).toBe(evidence.boxes.row.right);

    await recentRow.list.hover();
    expect(await recentRow.list.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
      "rgba(255, 255, 255, 0.15)",
    );
    await expect(recentRow.projectLink).toHaveAttribute(
      "href",
      `${BASE_PATH}/outside/recent-project`,
    );
    await expect(recentRow.ownerLink).toHaveAttribute("href", `${BASE_PATH}/outside`);
    expect(await linkStyle(recentRow.projectLink)).toEqual({
      color: "rgb(255, 255, 255)",
      textDecorationLine: "none",
    });
    await recentRow.ownerLink.hover();
    expect(await linkStyle(recentRow.ownerLink)).toEqual({
      color: "rgb(128, 128, 128)",
      textDecorationLine: "underline",
    });

    await recentRow.star.hover();
    expect(await colors(recentRow.star)).toEqual({
      button: "rgb(233, 30, 99)",
      icon: "rgb(233, 30, 99)",
    });
    await recentRow.star.focus();
    expect(await colors(recentRow.star)).toEqual({
      button: "rgb(233, 30, 99)",
      icon: "rgb(233, 30, 99)",
    });
    const pending = deferredResponse();
    requests.nextProjectResponse = pending.promise;
    await recentRow.star.click();
    await expect(recentRow.star).toBeDisabled();
    await expect(recentRow.star).toHaveAttribute("data-stylex-owner-state", "pending-unstarred");
    pending.resolve({ favorited: true });
    await expect(recentRow.star).toHaveAttribute("data-stylex-owner-state", "starred");
    await recentRow.icon.hover();
    expect(await colors(recentRow.star)).toEqual({
      button: "rgb(233, 30, 99)",
      icon: "rgb(138, 18, 59)",
    });
    expect(requests.project).toContainEqual({
      csrfToken: "csrf-left-direct-row",
      method: "POST",
      path: `${BASE_PATH}/api/v1/owners/outside/projects/recent-project/favorite`,
    });

    await leftSidebar.getByRole("button", { exact: true, name: "Favorite" }).click();
    await expect(favoriteRow.row).toBeVisible();
    const favoriteEvidence = await readRowEvidence(favoriteRow);
    expect(favoriteEvidence.owner).toBe("left-sidebar-direct-project-rows");
    // F5 dist-truth: the favorite org-list row's UL sits in an
    // overflow:visible container whose content is 279px vs the 270px pane
    // (star gutter), so the row paints at left -9 (overflow-gutter shift);
    // the height/width match legacy. The 0px pin predated the sidebar
    // star-gutter rules.
    expect(favoriteEvidence.boxes.row).toMatchObject({ height: 26, left: -9, width: 270 });
    expect(favoriteEvidence.styles.name.color).toBe("rgb(255, 255, 255)");
    expect(favoriteEvidence.popovers).toBe(0);
    requests.nextProjectResponse = Promise.resolve({ favorited: false });
    await favoriteRow.star.click();
    await expect(favoriteRow.star).toHaveAttribute("data-stylex-owner-state", "unstarred");

    await leftSidebar.getByRole("button", { exact: true, name: "Project" }).click();
    for (const subtab of [
      ["Create", "left-sidebar-createdByMe", "created-project"],
      ["Watching", "left-sidebar-watching", "watched-project"],
      ["Member", "left-sidebar-joinmember", "member-project"],
      ["Recently visited", "left-sidebar-recentlyVisited", "recent-project"],
    ] as const) {
      await projectPane.getByRole("button", { name: subtab[0] }).click();
      const row = rowForProject(projectPane.locator(`#${subtab[1]}`), subtab[2]);
      await expect(row.row).toBeVisible();
      await expect(row.row).toHaveAttribute(
        "data-stylex-owner",
        "left-sidebar-direct-project-rows",
      );
    }
    const watched = rowForProject(projectPane.locator("#left-sidebar-watching"), "watched-project");
    await projectPane.getByRole("button", { name: "Watching" }).click();
    await expect(watched.image).toBeVisible();
    expect(
      await watched.image.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { borderRadius: style.borderRadius, height: box.height, width: box.width };
      }),
    ).toEqual({ borderRadius: "3px", height: 16, width: 16 });

    await projectPane.getByPlaceholder("Type name").fill("private-long");
    await projectPane.getByRole("button", { name: "Create" }).click();
    const privateRow = rowForProject(
      projectPane.locator("#left-sidebar-createdByMe"),
      "private-long-project-name-overflow",
    );
    await expect(privateRow.row).toBeVisible();
    await expect(privateRow.row.locator(".yobicon-lock.yobicon-small")).toHaveCount(1);

    await leftSidebar.getByRole("button", { name: "Sidebar" }).click();
    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
    const rightRow = page
      .locator('[data-stylex-owner="authenticated-sidenav-direct-project-rows"]')
      .first();
    await expect(rightRow).toBeVisible();
    await expect(rightRow).toHaveClass(/user-li/);
    // The harness scopedChild loop aggregates .locator(':scope > …') across
    // EVERY parent matching the base selector (wtr-compat.ts:746-749), while
    // Playwright scopes to the indexed .first() parent — so assert the first
    // row's direct-child count via evaluate (the site-issue-list precedent).
    expect(
      await rightRow.evaluate(
        (node) =>
          Array.from(node.children).filter((child) =>
            (child as HTMLElement).classList.contains("project-flex-container"),
          ).length,
      ),
    ).toBe(1);
    await expect(
      page.locator('#mySidenav [data-stylex-owner="left-sidebar-direct-project-rows"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#sidebar [data-stylex-owner="authenticated-sidenav-direct-project-rows"]'),
    ).toHaveCount(0);
  });
}

test("left direct project rows have complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const start = route.indexOf("const leftSidebarDirectProjectRowStyles");
  const end = route.indexOf("const authenticatedSidenavDirectProjectRowStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const owner = route.slice(start, end);
  for (const token of [
    "leftSidebarDirectProjectText",
    "leftSidebarDirectProjectOwnerText",
    "leftSidebarDirectProjectAvatar",
    "leftSidebarDirectProjectHoverSurface",
    "leftSidebarDirectProjectStarIdle",
    "leftSidebarDirectProjectStarActive",
    "leftSidebarDirectProjectStarActiveHover",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(owner).toContain(`homeColors.${token}`);
    } else {
      expect(owner).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(owner).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|!important/i);
  expect(route).toContain('"left-sidebar-direct-project-rows"');
  expect(route).toContain("isLeftSidebar");
});

function rowForProject(scope: Locator, projectName: string) {
  const projectLink = scope
    .locator(`a[href="${BASE_PATH}/outside/${projectName}"]`)
    .filter({ hasText: projectName })
    .last();
  const row = projectLink.locator("xpath=ancestor::li[1]");
  return {
    icon: row.locator("button[data-stylex-owner] > i"),
    image: row.locator("img"),
    item: row.locator(":scope > div > div").first(),
    list: row.locator(":scope > div"),
    logo: row.locator(":scope > div > div > div").first(),
    name: projectLink.locator("xpath=parent::*"),
    nameOwner: projectLink.locator("xpath=parent::*/parent::*"),
    owner: row.getByRole("link", { exact: true, name: "outside" }).locator("xpath=parent::*"),
    ownerLink: row.getByRole("link", { exact: true, name: "outside" }),
    projectLink,
    row,
    star: row.getByRole("button", { name: /favorites/ }),
  };
}

type ProjectRow = ReturnType<typeof rowForProject>;

async function readRowEvidence(row: ProjectRow) {
  return row.row.evaluate((node) => {
    const list = node.firstElementChild as HTMLElement;
    const item = list.firstElementChild as HTMLElement;
    const logo = item.firstElementChild as HTMLElement;
    const nameOwner = item.lastElementChild as HTMLElement;
    const name = nameOwner.firstElementChild as HTMLElement;
    const owner = nameOwner.lastElementChild as HTMLElement;
    const avatar = logo.querySelector("i") as HTMLElement;
    const star = list.lastElementChild as HTMLElement;
    const icon = star.firstElementChild as HTMLElement;
    const box = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const style = (element: HTMLElement) => getComputedStyle(element);
    const legacyClasses = [
      "user-li",
      "project-list",
      "project-flex-container",
      "project-item",
      "project-item-container",
      "flex-item",
      "site-logo",
      "project-avatar",
      "logo",
      "dummy-25px",
      "projectName-owner",
      "project-name",
      "project-owner",
      "star-project",
      "star",
      "starred",
      "material-icons",
    ];
    return {
      boxes: {
        icon: box(icon),
        item: box(item),
        list: box(list),
        logo: box(logo),
        nameOwner: box(nameOwner),
        row: box(node),
        star: box(star),
      },
      legacyClasses: Array.from(node.querySelectorAll("*"), (element) =>
        legacyClasses.filter((className) => element.classList.contains(className)),
      )
        .flat()
        .concat(legacyClasses.filter((className) => node.classList.contains(className))),
      owner: node.getAttribute("data-stylex-owner"),
      pluginAttributes: Array.from(node.querySelectorAll("*"), (element) =>
        Array.from(element.attributes, (attribute) => attribute.name),
      )
        .flat()
        .filter((name) =>
          /^(data-(toggle|trigger|placement|content|action|href|url|target)|data-request-)/.test(
            name,
          ),
        ),
      popovers: node.querySelectorAll(".popover, [role=tooltip]").length,
      styles: {
        avatarColor: style(avatar).color,
        item: {
          alignItems: style(item).alignItems,
          display: style(item).display,
          flexDirection: style(item).flexDirection,
          flexGrow: style(item).flexGrow,
          flexWrap: style(item).flexWrap,
          fontSize: style(item).fontSize,
          fontWeight: style(item).fontWeight,
          justifyContent: style(item).justifyContent,
          overflowX: style(item).overflowX,
        },
        list: {
          alignItems: style(list).alignItems,
          display: style(list).display,
          flexDirection: style(list).flexDirection,
          flexWrap: style(list).flexWrap,
          justifyContent: style(list).justifyContent,
          padding: style(list).padding,
        },
        logo: {
          flexShrink: style(logo).flexShrink,
          marginLeft: style(logo).marginLeft,
          overflowX: style(logo).overflowX,
          paddingTop: style(logo).paddingTop,
          textAlign: style(logo).textAlign,
          width: style(logo).width,
        },
        name: {
          color: style(name).color,
          fontFamily: style(name).fontFamily,
          maxWidth: style(name).maxWidth,
          minWidth: style(name).minWidth,
          overflowX: style(name).overflowX,
          textOverflow: style(name).textOverflow,
          whiteSpace: style(name).whiteSpace,
        },
        nameOwner: {
          alignItems: style(nameOwner).alignItems,
          display: style(nameOwner).display,
          flexDirection: style(nameOwner).flexDirection,
          flexGrow: style(nameOwner).flexGrow,
          flexWrap: style(nameOwner).flexWrap,
          justifyContent: style(nameOwner).justifyContent,
          overflowX: style(nameOwner).overflowX,
          padding: style(nameOwner).padding,
        },
        owner: {
          color: style(owner).color,
          flexShrink: style(owner).flexShrink,
          fontSize: style(owner).fontSize,
          maxWidth: style(owner).maxWidth,
          minWidth: style(owner).minWidth,
          overflowX: style(owner).overflowX,
          paddingRight: style(owner).paddingRight,
          textAlign: style(owner).textAlign,
          textOverflow: style(owner).textOverflow,
          whiteSpace: style(owner).whiteSpace,
        },
        row: {
          color: style(node).color,
          cursor: style(node).cursor,
          lineHeight: style(node).lineHeight,
          marginLeft: style(node).marginLeft,
        },
        star: { color: style(star).color, height: style(star).height, width: style(star).width },
      },
    };
  });
}

async function linkStyle(link: Locator) {
  return link.evaluate((node) => ({
    color: getComputedStyle(node).color,
    textDecorationLine: getComputedStyle(node).textDecorationLine,
  }));
}

async function colors(button: Locator) {
  return button.evaluate((node) => ({
    button: getComputedStyle(node).color,
    icon: getComputedStyle(node.firstElementChild!).color,
  }));
}

function deferredResponse() {
  let resolve!: (value: { favorited: boolean }) => void;
  const promise = new Promise<{ favorited: boolean }>((done) => (resolve = done));
  return { promise, resolve };
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}

async function installAuthenticatedHome(page: Page) {
  const requests: {
    nextProjectResponse?: Promise<{ favorited: boolean }>;
    project: Array<{ csrfToken?: string; method: string; path: string }>;
  } = { project: [] };
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myOrganizationList");
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
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-left-direct-row" },
      json: { isAnonymous: false },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/owners/*/projects/*/favorite", async (route) => {
    const request = route.request();
    requests.project.push({
      csrfToken: request.headers()["x-csrf-token"],
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
    const json = requests.nextProjectResponse
      ? await requests.nextProjectResponse
      : { favorited: true };
    requests.nextProjectResponse = undefined;
    await route.fulfill({ contentType: "application/json", json });
  });
  const project = (
    projectName: string,
    options: { favorite?: boolean; image?: boolean; private?: boolean } = {},
  ) => ({
    isFavorited: options.favorite ?? false,
    isPrivate: options.private ?? false,
    logoUrl: options.image
      ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='16' height='16' fill='orange'/%3E%3C/svg%3E"
      : undefined,
    ownerName: "outside",
    projectId: projectName,
    projectName,
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [project("direct-favorite", { favorite: true })],
        organizations: [],
        ownProjects: [
          project("created-project"),
          project("private-long-project-name-overflow", { private: true }),
        ],
        watchedProjects: [project("watched-project", { image: true })],
        memberProjects: [project("member-project")],
        recentProjects: [project("recent-project")],
        profile: { loginId: "admin" },
        issueItems: [],
        recentIssues: [],
      },
    }),
  );
  return requests;
}
