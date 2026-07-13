import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated side-nav shell uses global StyleX color variables", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource = readFileSync("src/theme.stylex.ts", "utf8");
  const ownerSource = routeSource.slice(
    routeSource.indexOf("const authenticatedSidenavShellStyles"),
    routeSource.indexOf("const authenticatedSiteUserMenuStyles"),
  );

  expect(ownerSource).toContain("stylex.create");
  expect(routeSource).toContain('data-stylex-owner="authenticated-site-sidenav-shell"');
  expect(ownerSource).toContain("globalColors.sidenavSurface");
  expect(ownerSource).toContain("globalColors.sidenavText");
  expect(ownerSource).toContain("globalColors.sidenavBorder");
  expect(ownerSource).toContain("globalColors.sidenavShadow");
  expect(themeSource).toContain("stylex.defineVars");

  for (const color of [
    "#fff",
    "#ffffff",
    "white",
    "#000",
    "#000000",
    "black",
    "#ccc",
    "#cccccc",
    "#888",
    "#888888",
  ]) {
    expect(ownerSource.toLowerCase()).not.toContain(color);
  }
});

for (const viewport of [
  { label: "desktop", width: 1366, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  test(`authenticated side-nav shell preserves ${viewport.label} open and closed parity`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const shell = page.locator("#mySidenav");
    const toggle = page.locator("#sidebar-open-btn button.gnb-dropdown-toggle");
    await expect(shell).toHaveClass(/(?:^|\s)sidenav(?:\s|$)/);
    await expect(shell).not.toHaveClass(/sidenav-open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    const closed = await readShellEvidence(shell);
    console.log(`authenticated-sidenav-${viewport.label}-closed`, JSON.stringify(closed));
    await saveScreenshot(
      page,
      `stylex-authenticated-sidenav-${viewport.label}-closed-${closed.hasOwner ? "after" : "before"}.png`,
    );

    await toggle.click();
    await expect(shell).toHaveClass(/sidenav-open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const open = await readShellEvidence(shell);
    console.log(`authenticated-sidenav-${viewport.label}-open`, JSON.stringify(open));
    await saveScreenshot(
      page,
      `stylex-authenticated-sidenav-${viewport.label}-open-${open.hasOwner ? "after" : "before"}.png`,
    );

    expect(open.hasOwner).toBe(true);
    expect(closed.styles).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      borderStyle: "none",
      borderWidth: "0px",
      boxShadow: "rgb(136, 136, 136) 2px 2px 10px 0px",
      color: "rgb(0, 0, 0)",
      overflowX: "hidden",
      overflowY: "auto",
      position: "absolute",
      right: "0px",
      top: "40px",
      width: "0px",
      zIndex: "999",
    });
    expect(open.styles).toEqual({
      ...closed.styles,
      borderColor: "rgb(204, 204, 204)",
      borderStyle: "solid",
      borderWidth: "1px",
      width: `${viewport.width > 720 ? 360 : viewport.width}px`,
    });
    expect(closed.geometry.width).toBe(0);
    expect(open.geometry.width).toBe(viewport.width > 720 ? 362 : viewport.width + 2);
    expect(open.geometry.right).toBeLessThanOrEqual(viewport.width);
    expect(open.contentGeometry.x).toBeGreaterThanOrEqual(open.geometry.x);
    if (viewport.width > 720) {
      expect(open.contentGeometry.right).toBeLessThanOrEqual(open.geometry.right);
    } else {
      expect(open.contentGeometry.right - open.geometry.right).toBe(9);
    }
    expect(open.geometry.bottom).toBeLessThanOrEqual(viewport.height);
    expect(open.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    await removeStyleXClass(shell);
    const fallbackOpen = await readShellEvidence(shell);
    expect(fallbackOpen.styles).toEqual(open.styles);
    expect(fallbackOpen.geometry).toEqual(open.geometry);
    await restoreClass(shell);

    await toggle.click();
    await expect(shell).toHaveClass(/(?:^|\s)sidenav(?:\s|$)/);
    await expect(shell).not.toHaveClass(/sidenav-open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect((await readShellEvidence(shell)).styles).toEqual(closed.styles);
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

async function readShellEvidence(shell: Locator) {
  return shell.evaluate((element) => {
    const content = element.firstElementChild;
    if (!content) throw new Error("Side-nav content is missing");
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        right: rect.right,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      };
    };
    const style = getComputedStyle(element);
    return {
      contentGeometry: box(content),
      geometry: box(element),
      hasOwner: element.getAttribute("data-stylex-owner") === "authenticated-site-sidenav-shell",
      styles: {
        backgroundColor: style.backgroundColor,
        ...(style.borderStyle === "none" ? {} : { borderColor: style.borderColor }),
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        color: style.color,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        position: style.position,
        right: style.right,
        top: style.top,
        width: style.width,
        zIndex: style.zIndex,
      },
      viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
    };
  });
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}

async function removeStyleXClass(shell: Locator) {
  await shell.evaluate((element) => {
    const target = element as HTMLElement;
    target.dataset.preStylexClass = target.className;
    target.className = Array.from(target.classList)
      .filter((className) => className === "sidenav" || className === "sidenav-open")
      .join(" ");
  });
}

async function restoreClass(shell: Locator) {
  await shell.evaluate((element) => {
    const target = element as HTMLElement;
    target.className = target.dataset.preStylexClass ?? "";
    delete target.dataset.preStylexClass;
  });
}
