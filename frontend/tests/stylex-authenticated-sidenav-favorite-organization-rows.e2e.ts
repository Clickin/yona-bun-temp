import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated Favorite organization rows have narrow themed StyleX ownership", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource = readFileSync("src/theme.stylex.ts", "utf8");
  const start = routeSource.indexOf("const authenticatedSidenavFavoriteOrganizationRowStyles");
  const end = routeSource.indexOf("const authenticatedSidenavTabPanelStyles");

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const ownerSource = routeSource.slice(start, end);
  expect(ownerSource).toContain("stylex.create");
  expect(ownerSource).toContain("globalColors.sidenavOrganizationHoverSurface");
  expect(ownerSource).toContain("globalColors.sidenavOrganizationName");
  expect(ownerSource).toContain("globalColors.textOnAccent");
  expect(ownerSource).toContain("globalColors.sidenavAccountText");
  expect(ownerSource).toContain("globalColors.transparent");
  expect(ownerSource).not.toMatch(/#[\da-f]{3,8}\b|\brgb\(|\bhsl\(|\bwhite\b|\bgrey\b/i);
  expect(ownerSource).not.toMatch(/starred|starButton|starIcon|projectList|projectUl/i);
  expect(themeSource).toContain('sidenavOrganizationHoverSurface: "#f1f1f1"');
  expect(themeSource).toContain('sidenavOrganizationName: "#00bcd4"');
  expect(routeSource).toContain('"authenticated-sidenav-favorite-organization-rows"');
});

for (const viewport of [
  { label: "desktop", width: 1366, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  test(`authenticated Favorite organization rows preserve ${viewport.label} styles, geometry, and behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const interaction = await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();

    const rows = page
      .locator("#organizations")
      .locator(':scope > [data-stylex-owner="authenticated-sidenav-favorite-organization-rows"]');
    await expect(rows).toHaveCount(3);
    const own = await organizationRow(rows, "admin");
    const favorite = await organizationRow(rows, "weblabs");
    const regular = await organizationRow(rows, "example");
    await expect(own.toggle).toHaveAttribute("aria-expanded", "false");
    await expect(favorite.toggle).toHaveAttribute("aria-expanded", "false");

    const ownBase = await readRowEvidence(own);
    const favoriteBase = await readRowEvidence(favorite);
    const regularBase = await readRowEvidence(regular);
    console.log(
      `authenticated-sidenav-favorite-organization-rows-${viewport.label}`,
      JSON.stringify({ favorite: favoriteBase, own: ownBase, regular: regularBase }),
    );
    await saveScreenshot(
      page,
      `stylex-authenticated-sidenav-favorite-organization-rows-${viewport.label}-${ownBase.hasOwner ? "after" : "before"}.png`,
    );

    for (const evidence of [ownBase, favoriteBase, regularBase]) {
      expect(evidence.hasOwner).toBe(true);
      expect(evidence.pluginAttributes).toEqual([]);
      expect(evidence.rowStyles).toEqual({
        marginBottom: "8px",
        marginLeft: "0px",
        marginTop: "3px",
      });
      expect(evidence.headerStyles).toEqual({
        alignItems: "center",
        cursor: "auto",
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        paddingBottom: "1px",
        paddingTop: "1px",
        position: "relative",
      });
      expect(evidence.toggleStyles).toMatchObject({
        alignItems: "center",
        appearance: "none",
        backgroundColor: "rgba(0, 0, 0, 0)",
        backgroundImage: "none",
        borderBottomStyle: "none",
        borderBottomWidth: "0px",
        borderLeftStyle: "none",
        borderLeftWidth: "0px",
        borderRightStyle: "none",
        borderRightWidth: "0px",
        borderTopStyle: "none",
        borderTopWidth: "0px",
        boxShadow: "none",
        color: "rgb(0, 0, 0)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        fontSize: "13px",
        fontWeight: "400",
        justifyContent: "space-between",
        marginBottom: "0px",
        marginLeft: "0px",
        marginTop: "0px",
        minHeight: "0px",
        overflowX: "hidden",
        overflowY: "hidden",
        paddingBottom: "0px",
        paddingLeft: "0px",
        paddingRight: "0px",
        paddingTop: "0px",
        textAlign: "left",
      });
      expect(Number.parseFloat(evidence.toggleStyles.width)).toBe(evidence.geometry.toggle.width);
      expect(evidence.logoStyles).toEqual({
        flexShrink: "0",
        marginLeft: "2px",
        overflowX: "hidden",
        overflowY: "hidden",
        paddingTop: "3px",
        textAlign: "center",
        width: "26px",
      });
      expect(evidence.nameOwnerStyles).toEqual({
        alignItems: "center",
        color: "rgb(255, 255, 255)",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        fontWeight: "700",
        justifyContent: "space-between",
        overflowX: "hidden",
        overflowY: "hidden",
        paddingBottom: "1px",
        paddingTop: "1px",
      });
      expect(evidence.nameStyles).toEqual({
        color: "rgb(0, 188, 212)",
        fontSize: "14px",
        fontWeight: "700",
        maxWidth: "140px",
        minWidth: "50px",
        overflowX: "hidden",
        overflowY: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      });
      expect(evidence.ownerStyles).toEqual({
        color: "rgb(128, 128, 128)",
        flexShrink: "3",
        fontSize: "12px",
        maxWidth: "50px",
        minWidth: "40px",
        overflowX: "hidden",
        overflowY: "hidden",
        paddingRight: "10px",
        textAlign: "right",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      });
      expect(evidence.geometry.header.left).toBe(evidence.geometry.row.left);
      expect(evidence.geometry.header.right).toBe(evidence.geometry.row.right);
      expect(evidence.geometry.toggle.left).toBe(evidence.geometry.header.left);
      expect(evidence.geometry.logo.left).toBeGreaterThanOrEqual(evidence.geometry.toggle.left);
      expect(evidence.geometry.logo.right).toBeLessThanOrEqual(evidence.geometry.nameOwner.left);
      expect(evidence.geometry.name.left).toBe(evidence.geometry.nameOwner.left);
      expect(evidence.geometry.owner.right).toBe(evidence.geometry.nameOwner.right);
      expect(evidence.geometry.name.right).toBeLessThanOrEqual(evidence.geometry.owner.left);
      expect(evidence.geometry.row.right).toBeLessThanOrEqual(evidence.geometry.shell.right);
    }
    expect(ownBase.toggleStyles.marginRight).toBe("0px");
    expect(favoriteBase.toggleStyles.marginRight).toBe("29px");
    expect(regularBase.toggleStyles.marginRight).toBe("29px");
    expect(ownBase.geometry.toggle.right + 29).toBe(ownBase.geometry.header.right);
    expect(favoriteBase.geometry.toggle.right + 29).toBe(favoriteBase.geometry.header.right);
    expect(regularBase.geometry.toggle.right + 29).toBe(regularBase.geometry.header.right);
    expect(ownBase.geometry.row.top).toBe(
      favoriteBase.geometry.row.top - ownBase.geometry.row.height - 8,
    );
    expect(favoriteBase.geometry.row.top).toBe(
      regularBase.geometry.row.top - favoriteBase.geometry.row.height - 8,
    );
    expect(ownBase.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    for (const row of [own, favorite, regular]) {
      await row.header.hover();
      const hover = await readHoverEvidence(row.header);
      expect(hover).toEqual({ backgroundColor: "rgb(241, 241, 241)", cursor: "pointer" });
    }
    await page.mouse.move(0, 0);

    const ownProject = own.row.getByRole("link", { includeHidden: true, name: /own-project/ });
    await expect(ownProject).toBeHidden();
    await own.toggle.click();
    await expect(own.toggle).toHaveAttribute("aria-expanded", "true");
    await expect(ownProject).toBeVisible();
    await own.toggle.click();
    await expect(ownProject).toBeHidden();

    const organizationProject = favorite.row.getByRole("link", {
      includeHidden: true,
      name: /web-project/,
    });
    await expect(organizationProject).toBeHidden();
    await favorite.toggle.click();
    await expect(organizationProject).toBeVisible();
    await favorite.toggle.click();
    await expect(organizationProject).toBeHidden();

    const favoriteButton = favorite.row.getByRole("button", {
      name: "Remove weblabs from favorites",
    });
    await favoriteButton.click();
    await expect(
      favorite.row.getByRole("button", { name: "Add weblabs to favorites" }),
    ).toBeVisible();
    expect(interaction.organizationRequests).toEqual([
      {
        csrfToken: "csrf-organization-row",
        method: "POST",
        path: `${BASE_PATH}/api/v1/organizations/weblabs/favorite`,
      },
    ]);
    await expect(favorite.toggle).toHaveAttribute("aria-expanded", "false");

    const ownBeforeFallback = await readRowEvidence(own);
    const favoriteBeforeFallback = await readRowEvidence(favorite);
    const regularBeforeFallback = await readRowEvidence(regular);
    await removeOwnerStyleXClasses(own, "own");
    await removeOwnerStyleXClasses(favorite, "favorite");
    await removeOwnerStyleXClasses(regular, "regular");
    const ownFallback = await readRowEvidence(own);
    const favoriteFallback = await readRowEvidence(favorite);
    const regularFallback = await readRowEvidence(regular);
    for (const [before, fallback] of [
      [ownBeforeFallback, ownFallback],
      [favoriteBeforeFallback, favoriteFallback],
      [regularBeforeFallback, regularFallback],
    ]) {
      expect(fallback.rowStyles).toEqual(before.rowStyles);
      expect(fallback.headerStyles).toEqual(before.headerStyles);
      expect(fallback.toggleStyles).toEqual(before.toggleStyles);
      expect(fallback.logoStyles).toEqual(before.logoStyles);
      expect(fallback.nameOwnerStyles).toEqual(before.nameOwnerStyles);
      expect(fallback.nameStyles).toEqual(before.nameStyles);
      expect(fallback.ownerStyles).toEqual(before.ownerStyles);
      expect(fallback.geometry).toEqual(before.geometry);
    }
    for (const row of [own, favorite, regular]) {
      await row.header.hover();
      expect(await readHoverEvidence(row.header)).toEqual({
        backgroundColor: "rgb(241, 241, 241)",
        cursor: "pointer",
      });
    }
  });
}

type RowLocators = {
  header: Locator;
  logo: Locator;
  name: Locator;
  nameOwner: Locator;
  owner: Locator;
  row: Locator;
  toggle: Locator;
};

async function organizationRow(rows: Locator, name: string): Promise<RowLocators> {
  const toggle = rows.locator("[aria-expanded]").filter({ hasText: name });
  const row = toggle.locator("xpath=ancestor::li[1]");
  const header = toggle.locator("..");
  const logo = toggle.locator(":scope > div").nth(0);
  const nameOwner = toggle.locator(":scope > div").nth(1);
  const nameLocator = nameOwner.locator(":scope > div").nth(0);
  const owner = nameOwner.locator(":scope > div").nth(1);
  return { header, logo, name: nameLocator, nameOwner, owner, row, toggle };
}

async function readRowEvidence(row: RowLocators) {
  return row.row.evaluate(
    (element, targets) => {
      const [header, toggle, logo, nameOwner, name, owner] = targets as HTMLElement[];
      const shell = element.closest('[data-stylex-owner="authenticated-sidenav-favorite-shell"]');
      if (!shell) throw new Error("Organization row is outside the authenticated Favorite shell");
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
      const elementStyle = getComputedStyle(element);
      const headerStyle = getComputedStyle(header);
      const toggleStyle = getComputedStyle(toggle);
      const logoStyle = getComputedStyle(logo);
      const nameOwnerStyle = getComputedStyle(nameOwner);
      const nameStyle = getComputedStyle(name);
      const ownerStyle = getComputedStyle(owner);
      return {
        geometry: {
          header: box(header),
          logo: box(logo),
          name: box(name),
          nameOwner: box(nameOwner),
          owner: box(owner),
          row: box(element),
          shell: box(shell),
          toggle: box(toggle),
        },
        hasOwner:
          element.getAttribute("data-stylex-owner") ===
          "authenticated-sidenav-favorite-organization-rows",
        headerStyles: {
          alignItems: headerStyle.alignItems,
          cursor: headerStyle.cursor,
          display: headerStyle.display,
          flexDirection: headerStyle.flexDirection,
          flexWrap: headerStyle.flexWrap,
          justifyContent: headerStyle.justifyContent,
          paddingBottom: headerStyle.paddingBottom,
          paddingTop: headerStyle.paddingTop,
          position: headerStyle.position,
        },
        logoStyles: {
          flexShrink: logoStyle.flexShrink,
          marginLeft: logoStyle.marginLeft,
          overflowX: logoStyle.overflowX,
          overflowY: logoStyle.overflowY,
          paddingTop: logoStyle.paddingTop,
          textAlign: logoStyle.textAlign,
          width: logoStyle.width,
        },
        nameOwnerStyles: {
          alignItems: nameOwnerStyle.alignItems,
          color: nameOwnerStyle.color,
          display: nameOwnerStyle.display,
          flexDirection: nameOwnerStyle.flexDirection,
          flexGrow: nameOwnerStyle.flexGrow,
          flexWrap: nameOwnerStyle.flexWrap,
          fontWeight: nameOwnerStyle.fontWeight,
          justifyContent: nameOwnerStyle.justifyContent,
          overflowX: nameOwnerStyle.overflowX,
          overflowY: nameOwnerStyle.overflowY,
          paddingBottom: nameOwnerStyle.paddingBottom,
          paddingTop: nameOwnerStyle.paddingTop,
        },
        nameStyles: {
          color: nameStyle.color,
          fontSize: nameStyle.fontSize,
          fontWeight: nameStyle.fontWeight,
          maxWidth: nameStyle.maxWidth,
          minWidth: nameStyle.minWidth,
          overflowX: nameStyle.overflowX,
          overflowY: nameStyle.overflowY,
          textOverflow: nameStyle.textOverflow,
          whiteSpace: nameStyle.whiteSpace,
        },
        ownerStyles: {
          color: ownerStyle.color,
          flexShrink: ownerStyle.flexShrink,
          fontSize: ownerStyle.fontSize,
          maxWidth: ownerStyle.maxWidth,
          minWidth: ownerStyle.minWidth,
          overflowX: ownerStyle.overflowX,
          overflowY: ownerStyle.overflowY,
          paddingRight: ownerStyle.paddingRight,
          textAlign: ownerStyle.textAlign,
          textOverflow: ownerStyle.textOverflow,
          whiteSpace: ownerStyle.whiteSpace,
        },
        pluginAttributes: Array.from(
          element.querySelectorAll(
            "[data-toggle], [data-target], [data-action], [data-href], [data-url], [data-request-method]",
          ),
          (node) => node.tagName.toLowerCase(),
        ),
        rowStyles: {
          marginBottom: elementStyle.marginBottom,
          marginLeft: elementStyle.marginLeft,
          marginTop: elementStyle.marginTop,
        },
        toggleStyles: {
          alignItems: toggleStyle.alignItems,
          appearance: toggleStyle.appearance,
          backgroundColor: toggleStyle.backgroundColor,
          backgroundImage: toggleStyle.backgroundImage,
          borderBottomStyle: toggleStyle.borderBottomStyle,
          borderBottomWidth: toggleStyle.borderBottomWidth,
          borderLeftStyle: toggleStyle.borderLeftStyle,
          borderLeftWidth: toggleStyle.borderLeftWidth,
          borderRightStyle: toggleStyle.borderRightStyle,
          borderRightWidth: toggleStyle.borderRightWidth,
          borderTopStyle: toggleStyle.borderTopStyle,
          borderTopWidth: toggleStyle.borderTopWidth,
          boxShadow: toggleStyle.boxShadow,
          color: toggleStyle.color,
          cursor: toggleStyle.cursor,
          display: toggleStyle.display,
          flexDirection: toggleStyle.flexDirection,
          flexGrow: toggleStyle.flexGrow,
          flexWrap: toggleStyle.flexWrap,
          fontSize: toggleStyle.fontSize,
          fontWeight: toggleStyle.fontWeight,
          justifyContent: toggleStyle.justifyContent,
          marginBottom: toggleStyle.marginBottom,
          marginLeft: toggleStyle.marginLeft,
          marginRight: toggleStyle.marginRight,
          marginTop: toggleStyle.marginTop,
          minHeight: toggleStyle.minHeight,
          overflowX: toggleStyle.overflowX,
          overflowY: toggleStyle.overflowY,
          paddingBottom: toggleStyle.paddingBottom,
          paddingLeft: toggleStyle.paddingLeft,
          paddingRight: toggleStyle.paddingRight,
          paddingTop: toggleStyle.paddingTop,
          textAlign: toggleStyle.textAlign,
          width: toggleStyle.width,
        },
        viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
      };
    },
    [
      await row.header.elementHandle(),
      await row.toggle.elementHandle(),
      await row.logo.elementHandle(),
      await row.nameOwner.elementHandle(),
      await row.name.elementHandle(),
      await row.owner.elementHandle(),
    ],
  );
}

async function readHoverEvidence(header: Locator) {
  return header.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, cursor: style.cursor };
  });
}

async function removeOwnerStyleXClasses(row: RowLocators, kind: "own" | "favorite" | "regular") {
  await row.row.evaluate(
    (element, targets) => {
      const [header, toggle, logo, nameOwner, name, owner, rowClass, ownerClass] = targets as [
        HTMLElement,
        HTMLElement,
        HTMLElement,
        HTMLElement,
        HTMLElement,
        HTMLElement,
        string,
        string,
      ];
      element.className = rowClass;
      header.className = "org-list project-flex-container all-orgs";
      toggle.className = "project-item project-item-container organization-toggle";
      logo.className = "flex-item site-logo";
      nameOwner.className = "projectName-owner all-org-names flex-item";
      name.className = "project-name org-name flex-item";
      owner.className = ownerClass;
    },
    [
      await row.header.elementHandle(),
      await row.toggle.elementHandle(),
      await row.logo.elementHandle(),
      await row.nameOwner.elementHandle(),
      await row.name.elementHandle(),
      await row.owner.elementHandle(),
      kind === "favorite" ? "org-li favored" : "org-li",
      kind === "own" ? "project-owner flex-item sub-project-counter" : "project-owner flex-item",
    ],
  );
}

async function installAuthenticatedHome(page: Page) {
  const organizationRequests: Array<{
    csrfToken: string | undefined;
    method: string;
    path: string;
  }> = [];
  await page.addInitScript((basePath) => {
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
        avatarUrl: "/legacy-assets/images/default-avatar-34.png",
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
      headers: { "x-csrf-token": "csrf-organization-row" },
      json: { isAnonymous: false },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/organizations/*/favorite", (route) => {
    const request = route.request();
    organizationRequests.push({
      csrfToken: request.headers()["x-csrf-token"],
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
    return route.fulfill({
      contentType: "application/json",
      json: { favorited: false, organizationName: "weblabs" },
    });
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
            projects: [
              {
                isFavorited: false,
                ownerName: "weblabs",
                projectId: 32,
                projectName: "web-project",
              },
            ],
          },
        ],
        favoriteProjects: [],
        organizations: [
          { organizationId: 11, organizationName: "weblabs", projects: [] },
          {
            organizationId: 12,
            organizationName: "example",
            projectCount: 1,
            projects: [
              {
                isFavorited: false,
                ownerName: "example",
                projectId: 33,
                projectName: "example-project",
              },
            ],
          },
        ],
        ownProjects: [
          {
            isFavorited: false,
            ownerName: "admin",
            projectId: 31,
            projectName: "own-project",
          },
        ],
        profile: { loginId: "admin" },
        recentIssues: [],
      },
    }),
  );
  return { organizationRequests };
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
