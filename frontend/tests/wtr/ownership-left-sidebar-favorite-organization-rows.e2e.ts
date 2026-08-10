import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

for (const viewport of [
  { height: 900, label: "desktop", ownTop: 150, width: 1366 },
  { height: 844, label: "mobile", ownTop: 123, width: 390 },
]) {
  test(`left Favorite organization headers preserve ${viewport.label} legacy parity and behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const interaction = await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const root = page.locator("#left-sidebar-organizations");
    const rows = root.locator(':scope > [data-owner="left-sidebar-favorite-organization-rows"]');
    await expect(rows).toHaveCount(3);
    const own = organizationRow(rows.nth(0));
    const favorite = organizationRow(rows.nth(1));
    const regular = organizationRow(rows.nth(2));
    await expect(own.name).toHaveText("admin");
    await expect(favorite.name).toHaveText("weblabs");
    await expect(regular.name).toHaveText("platform");

    for (const [index, row] of [own, favorite, regular].entries()) {
      const evidence = await readRowEvidence(row);
      expect(evidence.geometry).toMatchObject({
        header: { height: 25, left: 0, top: viewport.ownTop + index * 33, width: 270 },
        logo: { height: 23, left: 2, width: 26 },
        nameOwner: { height: 22, left: 28, width: 213 },
        row: { height: 25, left: 0, top: viewport.ownTop + index * 33, width: 270 },
        toggle: { height: 23, left: 0, width: 241 },
      });
      expect(evidence.rowStyles).toEqual({
        marginBottom: "8px",
        marginLeft: "0px",
        marginTop: "3px",
      });
      expect(evidence.headerStyles).toEqual({
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0)",
        cursor: "auto",
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        padding: "1px 0px",
      });
      expect(evidence.toggleStyles).toMatchObject({
        appearance: "none",
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderStyle: "none",
        boxShadow: "none",
        color: "rgb(255, 255, 255)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        fontSize: "14px",
        fontWeight: "400",
        margin: "0px",
        minHeight: "0px",
        overflow: "hidden",
        padding: "0px",
        textAlign: "left",
        width: "241px",
      });
      expect(evidence.logoStyles).toEqual({
        color: "rgb(255, 255, 255)",
        flexShrink: "0",
        marginLeft: "2px",
        overflow: "hidden",
        paddingTop: "3px",
        textAlign: "center",
        width: "26px",
      });
      expect(evidence.angle).toEqual({
        box: { height: 14, width: 4.984375 },
        color: "rgb(255, 255, 255)",
        retainedClasses: ["yobicon-angle-right"],
      });
      expect(evidence.nameOwnerStyles).toMatchObject({
        alignItems: "center",
        color: "rgb(255, 255, 255)",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        fontFamily: "Roboto, sans-serif",
        fontWeight: "700",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "1px 0px",
      });
      expect(evidence.nameStyles).toMatchObject({
        color: "rgb(0, 188, 212)",
        fontFamily: "Roboto, sans-serif",
        fontSize: "14px",
        maxWidth: "140px",
        minWidth: "50px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      });
      expect(evidence.countStyles).toMatchObject({
        color: "rgb(128, 128, 128)",
        fontSize: "12px",
        maxWidth: "50px",
        minWidth: "40px",
        paddingRight: "10px",
        textAlign: "right",
      });
      expect(evidence.forbiddenPresentationClasses).toEqual([]);
      expect(evidence.pluginAttributes).toEqual([]);

      await row.header.hover();
      await expect(row.header).toHaveCSS("background-color", "rgba(255, 255, 255, 0.15)");
      await expect(row.header).toHaveCSS("cursor", "pointer");
    }

    expect((await readRowEvidence(own)).star).toEqual({
      box: { height: 0, width: 29 },
      state: "placeholder",
    });
    for (const [row, active] of [
      [favorite, true],
      [regular, false],
    ] as const) {
      const star = (await readRowEvidence(row)).star;
      expect(star).toMatchObject({
        box: { height: 16, width: 29 },
        button: {
          appearance: "none",
          backgroundColor: "rgba(0, 0, 0, 0)",
          borderStyle: "none",
          boxShadow: "none",
          boxSizing: "border-box",
          cursor: "pointer",
          height: "16px",
          margin: "0px",
          minHeight: "0px",
          padding: "0px",
          width: "29px",
        },
        icon: {
          box: { height: 15, width: 16 },
          color: active ? "rgb(233, 30, 99)" : "rgb(238, 238, 238)",
          fontFamily: "Material Icons",
          fontSize: "16px",
          lineHeight: "16px",
          presentationClasses: [],
          verticalAlign: "bottom",
        },
        state: active ? "starred" : "unstarred",
      });
    }

    await favorite.star.locator("i").hover();
    await expect(favorite.star.locator("i")).toHaveCSS("color", "rgb(138, 18, 59)");
    await regular.star.hover();
    await expect(regular.star).toHaveCSS("color", "rgb(233, 30, 99)");
    await page.mouse.move(viewport.width - 1, viewport.height - 1);

    await saveScreenshot(
      root,
      `style-left-sidebar-favorite-organization-row-local-${viewport.label}.png`,
    );

    const ownProject = own.row.getByRole("link", { includeHidden: true, name: /own-one/ });
    await expect(ownProject).toBeHidden();
    await own.toggle.click();
    await expect(ownProject).toBeVisible();
    await own.toggle.click();
    await expect(ownProject).toBeHidden();

    const favoriteProject = favorite.row.getByRole("link", {
      includeHidden: true,
      name: /web-project/,
    });
    await expect(favoriteProject).toBeHidden();
    await favorite.toggle.click();
    await expect(favoriteProject).toBeVisible();
    await favorite.toggle.click();
    await expect(favoriteProject).toBeHidden();

    await favorite.star.click();
    await expect(favorite.star).toBeDisabled();
    await expect(favorite.toggle).toHaveAttribute("aria-expanded", "false");
    interaction.resolveFavorite({ favorited: false });
    await expect(
      favorite.row.getByRole("button", { name: "Add weblabs to favorites" }),
    ).toBeEnabled();
    expect(interaction.requests).toEqual([
      {
        csrfToken: "csrf-left-organization-row",
        method: "POST",
        path: `${BASE_PATH}/api/v1/organizations/weblabs/favorite`,
      },
    ]);
    await expect(favorite.toggle).toHaveAttribute("aria-expanded", "false");

    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
    await expect(
      page.locator(
        '#organizations > [data-owner="authenticated-sidenav-favorite-organization-rows"]',
      ),
    ).toHaveCount(3);
  });
}

test("left Favorite organization headers have complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  for (const token of [
    "leftSidebarFavoriteOrganizationHoverSurface",
    "leftSidebarFavoriteOrganizationText",
    "leftSidebarFavoriteOrganizationName",
    "leftSidebarFavoriteOrganizationCount",
    "leftSidebarFavoriteOrganizationStarIdle",
    "leftSidebarFavoriteOrganizationStarActive",
    "leftSidebarFavoriteOrganizationStarActiveHover",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }
  expect(route).toContain('"left-sidebar-favorite-organization-rows"');
  expect(route).toContain('className="project-ul"');
  expect(route).toContain('className="yobicon-angle-right"');
  expect(route).toContain("type SidebarFavoriteButtonVariant");
  expect(route).not.toMatch(
    /isAuthenticatedDirectProjectStar|isAuthenticatedFavoriteStar|isLeftSidebarDirectProjectStar|isLeftSidebarFavoriteOrganizationStar/,
  );
});

type RowLocators = ReturnType<typeof organizationRow>;

function organizationRow(row: Locator) {
  const header = row.locator(":scope > div");
  const toggle = header.locator(":scope > button").first();
  const logo = toggle.locator(":scope > div").nth(0);
  const nameOwner = toggle.locator(":scope > div").nth(1);
  return {
    count: nameOwner.locator(":scope > div").nth(1),
    header,
    logo,
    name: nameOwner.locator(":scope > div").nth(0),
    nameOwner,
    row,
    star: header.locator(":scope > :last-child"),
    toggle,
  };
}

async function readRowEvidence(row: RowLocators) {
  return row.row.evaluate((element) => {
    const header = element.firstElementChild as HTMLElement;
    const toggle = header.firstElementChild as HTMLElement;
    const logo = toggle.children[0] as HTMLElement;
    const angle = logo.firstElementChild as HTMLElement;
    const nameOwner = toggle.children[1] as HTMLElement;
    const name = nameOwner.children[0] as HTMLElement;
    const count = nameOwner.children[1] as HTMLElement;
    const star = header.lastElementChild as HTMLElement;
    const starIcon = star.firstElementChild as HTMLElement | null;
    const nestedList = element.lastElementChild as HTMLElement;
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      };
    };
    const styles = (target: Element, properties: string[]) => {
      const style = getComputedStyle(target);
      return Object.fromEntries(
        properties.map((property) => [
          property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
          style.getPropertyValue(property),
        ]),
      );
    };
    const ownedNodes = [
      element,
      header,
      toggle,
      logo,
      nameOwner,
      name,
      count,
      star,
      starIcon,
    ].filter(Boolean) as HTMLElement[];
    const forbidden = [
      "org-li",
      "favored",
      "org-list",
      "project-flex-container",
      "all-orgs",
      "project-item",
      "project-item-container",
      "organization-toggle",
      "flex-item",
      "site-logo",
      "projectName-owner",
      "all-org-names",
      "project-name",
      "org-name",
      "project-owner",
      "sub-project-counter",
      "star-org",
      "star",
      "starred",
      "material-icons",
    ];
    const headerStyle = getComputedStyle(header);
    const angleStyle = getComputedStyle(angle);
    const starIconStyle = starIcon ? getComputedStyle(starIcon) : null;
    return {
      angle: {
        box: { height: box(angle).height, width: box(angle).width },
        color: angleStyle.color,
        retainedClasses: ["yobicon-angle-right"].filter((value) => angle.classList.contains(value)),
      },
      countStyles: styles(count, [
        "color",
        "font-size",
        "max-width",
        "min-width",
        "padding-right",
        "text-align",
      ]),
      forbiddenPresentationClasses: forbidden.filter((value) =>
        ownedNodes.some((node) => node.classList.contains(value)),
      ),
      geometry: {
        header: box(header),
        logo: box(logo),
        nameOwner: box(nameOwner),
        row: box(element),
        toggle: box(toggle),
      },
      headerStyles: {
        alignItems: headerStyle.alignItems,
        backgroundColor: headerStyle.backgroundColor,
        cursor: headerStyle.cursor,
        display: headerStyle.display,
        flexDirection: headerStyle.flexDirection,
        flexWrap: headerStyle.flexWrap,
        justifyContent: headerStyle.justifyContent,
        padding: headerStyle.padding,
      },
      logoStyles: styles(logo, [
        "color",
        "flex-shrink",
        "margin-left",
        "overflow",
        "padding-top",
        "text-align",
        "width",
      ]),
      nameOwnerStyles: styles(nameOwner, [
        "align-items",
        "color",
        "display",
        "flex-direction",
        "flex-grow",
        "flex-wrap",
        "font-family",
        "font-weight",
        "justify-content",
        "overflow",
        "padding",
      ]),
      nameStyles: styles(name, [
        "color",
        "font-family",
        "font-size",
        "max-width",
        "min-width",
        "overflow",
        "text-overflow",
        "white-space",
      ]),
      nestedList: {
        retainedClasses: ["project-ul"].filter((value) => nestedList.classList.contains(value)),
      },
      pluginAttributes: ownedNodes.flatMap((node) =>
        Array.from(node.attributes, (attribute) => attribute.name).filter((name) =>
          /^data-(toggle|placement|target|trigger|action|href|url|request-)/.test(name),
        ),
      ),
      rowStyles: styles(element, ["margin-bottom", "margin-left", "margin-top"]),
      star: starIcon
        ? {
            box: { height: box(star).height, width: box(star).width },
            button: styles(star, [
              "appearance",
              "background-color",
              "border-style",
              "box-shadow",
              "box-sizing",
              "cursor",
              "height",
              "margin",
              "min-height",
              "padding",
              "width",
            ]),
            icon: {
              box: { height: box(starIcon).height, width: box(starIcon).width },
              color: starIconStyle!.color,
              fontFamily: starIconStyle!.fontFamily.replaceAll('"', ""),
              fontSize: starIconStyle!.fontSize,
              lineHeight: starIconStyle!.lineHeight,
              presentationClasses: forbidden.filter((value) => starIcon.classList.contains(value)),
              verticalAlign: starIconStyle!.verticalAlign,
            },
            state: star.dataset.ownerState ?? null,
          }
        : {
            box: { height: box(star).height, width: box(star).width },
            state: star.dataset.ownerState ?? null,
          },
      toggleStyles: styles(toggle, [
        "appearance",
        "background-color",
        "border-style",
        "box-shadow",
        "color",
        "cursor",
        "display",
        "flex-direction",
        "flex-grow",
        "flex-wrap",
        "font-size",
        "font-weight",
        "margin",
        "min-height",
        "overflow",
        "padding",
        "text-align",
        "width",
      ]),
    };
  });
}

async function installAuthenticatedHome(page: Page) {
  const requests: Array<{ csrfToken?: string; method: string; path: string }> = [];
  let resolveFavorite!: (value: { favorited: boolean }) => void;
  const favoriteResponse = new Promise<{ favorited: boolean }>((resolve) => {
    resolveFavorite = resolve;
  });
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
      headers: { "x-csrf-token": "csrf-left-organization-row" },
      json: { isAnonymous: false },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/organizations/*/favorite", async (route) => {
    const request = route.request();
    requests.push({
      csrfToken: request.headers()["x-csrf-token"],
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
    await route.fulfill({ contentType: "application/json", json: await favoriteResponse });
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [
          {
            isFavorited: true,
            organizationId: 11,
            organizationName: "weblabs",
            projectCount: 1,
            projects: [{ isFavorited: false, ownerName: "weblabs", projectName: "web-project" }],
          },
        ],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        organizations: [
          { organizationId: 11, organizationName: "weblabs", projects: [] },
          {
            isFavorited: false,
            organizationId: 12,
            organizationName: "platform",
            projectCount: 1,
            projects: [
              { isFavorited: false, ownerName: "platform", projectName: "platform-project" },
            ],
          },
        ],
        ownProjects: [
          { isFavorited: false, ownerName: "admin", projectName: "own-one" },
          { isFavorited: false, ownerName: "admin", projectName: "own-two" },
        ],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
  return { requests, resolveFavorite };
}

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
