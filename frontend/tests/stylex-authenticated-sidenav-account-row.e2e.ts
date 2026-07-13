import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated side-nav account actions use global StyleX color variables", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource = readFileSync("src/theme.stylex.ts", "utf8");
  const ownerSource = routeSource.slice(
    routeSource.indexOf("const authenticatedSidenavAccountActionStyles"),
    routeSource.indexOf("const authenticatedSidenavShellStyles"),
  );

  expect(ownerSource).toContain("stylex.create");
  expect(routeSource).toContain('data-stylex-owner="authenticated-sidenav-account-actions"');
  expect(ownerSource).toContain("globalColors.sidenavText");
  expect(ownerSource).toContain("globalColors.sidenavAccountText");
  expect(ownerSource).toContain("globalColors.sidenavLogoutHover");
  expect(ownerSource).not.toContain("fontWeight");
  expect(ownerSource).not.toContain("textOnAccent");
  expect(themeSource).toContain("stylex.defineVars");

  for (const color of [
    "gray",
    "grey",
    "#808080",
    "white",
    "#fff",
    "#ffffff",
    "black",
    "#000",
    "#000000",
    "#9c27b0",
  ]) {
    expect(ownerSource.toLowerCase()).not.toContain(color);
  }
});

for (const viewport of [
  { label: "desktop", width: 1366, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  test(`authenticated side-nav account actions preserve ${viewport.label} parity`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const toggle = page.getByRole("button", { name: "User menu, Shortcut (F)" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const profile = page.getByRole("link", { name: "Profile", exact: true });
    const account = page.getByRole("link", { name: "Account", exact: true });
    const logout = page.getByRole("link", { name: "Log out", exact: true });
    const row = profile.locator("xpath=../..");
    const profileSpan = profile.locator("xpath=..");
    const accountSpan = account.locator("xpath=..");
    const logoutSpan = logout.locator("xpath=span");

    await expect(profile).toHaveAttribute("href", `${BASE_PATH}/admin`);
    await expect(account).toHaveAttribute("href", `${BASE_PATH}/user/editform`);
    await expect(logout).toHaveAttribute("href", `${BASE_PATH}/users/logout`);
    await expect(row).toContainText("ProfileAccountLog out");

    const beforeHover = await readAccountActionEvidence(row, profileSpan, accountSpan, logoutSpan);
    console.log(`authenticated-account-actions-${viewport.label}`, JSON.stringify(beforeHover));
    await saveScreenshot(
      page,
      `stylex-authenticated-sidenav-account-actions-${viewport.label}-${beforeHover.hasOwner ? "after" : "before"}.png`,
    );

    const hoverBackground = await forceHoverAndReadBackground(page, "#mySidenav .logout");

    expect(beforeHover.hasOwner).toBe(true);
    expect(beforeHover.rowStyles).toEqual({
      boxSizing: "border-box",
      color: "rgb(128, 128, 128)",
      padding: "10px",
      textAlign: "right",
    });
    expect(beforeHover.profileStyles).toEqual({
      color: "rgb(0, 0, 0)",
      fontSize: "12px",
      marginLeft: "5px",
      marginRight: "5px",
      padding: "3px",
    });
    expect(beforeHover.accountStyles).toEqual(beforeHover.profileStyles);
    // Bootstrap `.label` still owns its primitive box/text declarations, while legacy
    // `.logout !important` still owns color and font weight; StyleX owns only hover here.
    expect(beforeHover.logoutStyles).toEqual({
      ...beforeHover.profileStyles,
      backgroundColor: "rgb(153, 153, 153)",
      borderRadius: "3px",
      color: "rgb(255, 255, 255)",
      display: "inline-block",
      fontSize: "12px",
      fontWeight: "400",
      lineHeight: "14px",
      textShadow: "rgba(0, 0, 0, 0.25) 0px -1px 0px",
      verticalAlign: "baseline",
      whiteSpace: "nowrap",
    });
    expect(hoverBackground).toBe("rgb(156, 39, 176)");
    expect(beforeHover.order).toEqual(["Profile", "Account", "Log out"]);
    expect(beforeHover.geometry.profile.right).toBeLessThanOrEqual(
      beforeHover.geometry.account.left,
    );
    expect(beforeHover.geometry.account.right).toBeLessThanOrEqual(
      beforeHover.geometry.logout.left,
    );
    expect(beforeHover.geometry.row.left).toBeGreaterThanOrEqual(beforeHover.geometry.shell.left);
    if (viewport.width > 720) {
      expect(beforeHover.geometry.row.right).toBeLessThanOrEqual(beforeHover.geometry.shell.right);
    } else {
      expect(beforeHover.geometry.row.right - beforeHover.geometry.shell.right).toBe(9);
      expect(beforeHover.geometry.logout.right).toBeLessThanOrEqual(viewport.width);
    }
    expect(beforeHover.geometry.row.top).toBeGreaterThanOrEqual(beforeHover.geometry.shell.top);
    expect(beforeHover.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    await removeStyleXClasses(row, [profileSpan, accountSpan, logoutSpan]);
    await clearForcedHover(page, "#mySidenav .logout");
    const fallback = await readAccountActionEvidence(row, profileSpan, accountSpan, logoutSpan);
    expect(fallback.rowStyles).toEqual(beforeHover.rowStyles);
    expect(fallback.profileStyles).toEqual(beforeHover.profileStyles);
    expect(fallback.accountStyles).toEqual(beforeHover.accountStyles);
    expect(fallback.logoutStyles).toEqual(beforeHover.logoutStyles);
    expect(await forceHoverAndReadBackground(page, "#mySidenav .logout")).toBe(hoverBackground);
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
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        organizations: [],
        profile: { avatarUrl: "/legacy-assets/images/default-avatar-34.png", isGuest: false },
        recentIssues: [],
      },
    }),
  );
}

async function readAccountActionEvidence(
  row: Locator,
  profile: Locator,
  account: Locator,
  logout: Locator,
) {
  return row.evaluate(
    (element, elements) => {
      const [profileElement, accountElement, logoutElement] = elements as HTMLElement[];
      const styleValues = (target: HTMLElement) => {
        const style = getComputedStyle(target);
        return {
          color: style.color,
          fontSize: style.fontSize,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
          padding: style.padding,
        };
      };
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      const rowStyle = getComputedStyle(element);
      const logoutStyle = getComputedStyle(logoutElement);
      const shell = element.closest("#mySidenav");
      if (!shell) throw new Error("Side-nav shell is missing");
      return {
        accountStyles: styleValues(accountElement),
        geometry: {
          account: box(accountElement),
          logout: box(logoutElement),
          profile: box(profileElement),
          row: box(element),
          shell: box(shell),
        },
        hasOwner:
          element.getAttribute("data-stylex-owner") === "authenticated-sidenav-account-actions",
        logoutStyles: {
          ...styleValues(logoutElement),
          backgroundColor: logoutStyle.backgroundColor,
          borderRadius: logoutStyle.borderRadius,
          display: logoutStyle.display,
          fontWeight: logoutStyle.fontWeight,
          lineHeight: logoutStyle.lineHeight,
          textShadow: logoutStyle.textShadow,
          verticalAlign: logoutStyle.verticalAlign,
          whiteSpace: logoutStyle.whiteSpace,
        },
        order: Array.from(element.querySelectorAll("a")).map((link) => link.textContent?.trim()),
        profileStyles: styleValues(profileElement),
        rowStyles: {
          boxSizing: rowStyle.boxSizing,
          color: rowStyle.color,
          padding: rowStyle.padding,
          textAlign: rowStyle.textAlign,
        },
        viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
      };
    },
    [await profile.elementHandle(), await account.elementHandle(), await logout.elementHandle()],
  );
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}

async function removeStyleXClasses(row: Locator, spans: Locator[]) {
  await row.evaluate(
    (element, targets) => {
      element.className = "row-fluid user-menu-wrap";
      for (const target of targets as HTMLElement[]) {
        target.className = target.classList.contains("logout")
          ? "user-menu logout label"
          : "user-menu";
      }
    },
    await Promise.all(spans.map((span) => span.elementHandle())),
  );
}

async function forceHoverAndReadBackground(page: Page, selector: string) {
  const session = await page.context().newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const { root } = await session.send("DOM.getDocument");
  const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  await session.send("CSS.forcePseudoState", { forcedPseudoClasses: ["hover"], nodeId });
  const background = await page
    .locator(selector)
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await session.detach();
  return background;
}

async function clearForcedHover(page: Page, selector: string) {
  const session = await page.context().newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const { root } = await session.send("DOM.getDocument");
  const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  await session.send("CSS.forcePseudoState", { forcedPseudoClasses: [], nodeId });
  await session.detach();
}
