import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated side-nav shell uses global Style color variables", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  expect(routeSource).toContain('data-owner="authenticated-site-sidenav-shell"');

  expect(routeSource).toContain("sidenavUsesAdminAffixTop");
  expect(themeSource).not.toContain("sidenavBaseTop");
  expect(themeSource).not.toContain("sidenavAdminAffixTop");

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
  }
});

for (const viewport of [
  {
    affix: { height: 43, width: 1366, x: 0, y: 0 },
    closedShell: { width: 0, x: 1366, y: 84 },
    header: { height: 40, width: 1366, x: 0, y: 43 },
    label: "desktop",
    openShell: { width: 362, x: 1004, y: 84 },
    width: 1366,
    height: 900,
  },
  {
    affix: { height: 66, width: 390, x: 0, y: 0 },
    closedShell: { width: 0, x: 390, y: 84 },
    header: { height: 40, width: 390, x: 0, y: 66 },
    label: "mobile",
    openShell: { width: 392, x: -2, y: 84 },
    width: 390,
    height: 844,
  },
]) {
  test(`authenticated side-nav shell preserves ${viewport.label} open and closed parity`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const shell = page.locator("#mySidenav");
    const toggle = page.getByRole("button", { name: "User menu, Shortcut (F)" });
    await expect(shell).toHaveClass(/(?:^|\s)sidenav(?:\s|$)/);
    await expect(shell).not.toHaveClass(/sidenav-open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    const closed = await readShellEvidence(shell);
    const closedLayout = await readLayoutEvidence(page);
    console.log(`authenticated-sidenav-${viewport.label}-closed`, JSON.stringify(closed));
    expect(closed.styles.top).toBe("84px");
    expectBox(closedLayout.affix, viewport.affix);
    expectBox(closedLayout.header, viewport.header);
    expectShellBox(closedLayout.shell, viewport.closedShell);

    await toggle.click();
    await expect(shell).toHaveClass(/sidenav-open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await waitForTransitionEnd(shell, ["width"]);
    const open = await readShellEvidence(shell);
    const openLayout = await readLayoutEvidence(page);
    console.log(`authenticated-sidenav-${viewport.label}-open`, JSON.stringify(open));
    await saveScreenshot(page, `style-authenticated-sidenav-affix-top-local-${viewport.label}.png`);
    expect(open.styles.top).toBe("84px");
    expectBox(openLayout.affix, viewport.affix);
    expectBox(openLayout.header, viewport.header);
    expectShellBox(openLayout.shell, viewport.openShell);

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
      top: "84px",
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

    await removeStyleClass(shell);
    const fallbackOpen = await readShellEvidence(shell);
    expect(fallbackOpen.styles).toEqual({ ...open.styles, top: "40px" });
    expect(fallbackOpen.geometry.x).toBe(open.geometry.x);
    expect(fallbackOpen.geometry.y).toBe(40);
    expect(fallbackOpen.geometry.width).toBe(open.geometry.width);
    await restoreClass(shell);
  });
}

test("non-admin authenticated home and shared shell callers keep the base side-nav top", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await installAuthenticatedHome(page, { isSiteAdmin: false });
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-owner="site-admin-affix"]')).toHaveCount(0);
  await expect(page.locator("#mySidenav")).toHaveCSS("top", "40px");

  await installAuthenticatedHome(page, { isSiteAdmin: true });
  await page.goto(`${BASE_PATH}/projects`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-owner="site-admin-affix"]')).toBeVisible();
  await expect(page.locator("#mySidenav")).toHaveCSS("top", "40px");
});

async function installAuthenticatedHome(
  page: Page,
  { isSiteAdmin = true }: { isSiteAdmin?: boolean } = {},
) {
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
        isSiteAdmin,
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
  await page.route("**/api/v1/projects?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { items: [], pageNum: 1, totalPages: 1 },
    }),
  );
}

async function readLayoutEvidence(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing layout selector: ${selector}`);
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
    };
    return {
      affix: box('[data-owner="site-admin-affix"]'),
      header: box("[data-owner=global-gnb-outer]"),
      shell: box("#mySidenav"),
    };
  });
}

function expectBox(
  actual: { height: number; width: number; x: number; y: number },
  expected: { height: number; width: number; x: number; y: number },
) {
  expect(actual).toEqual(expected);
}

function expectShellBox(
  actual: { width: number; x: number; y: number },
  expected: { width: number; x: number; y: number },
) {
  expect({ width: actual.width, x: actual.x, y: actual.y }).toEqual(expected);
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
      hasOwner: element.getAttribute("data-owner") === "authenticated-site-sidenav-shell",
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

async function waitForTransitionEnd(shell: Locator, properties: readonly string[]) {
  await shell.evaluate(
    (element, transitionProperties) =>
      new Promise<void>((resolve) => {
        const handleTransitionEnd = (event: Event) => {
          const transitionEvent = event as TransitionEvent;
          if (
            transitionEvent.target !== element ||
            !transitionProperties.includes(transitionEvent.propertyName)
          ) {
            return;
          }
          element.removeEventListener("transitionend", handleTransitionEnd);
          resolve();
        };
        element.addEventListener("transitionend", handleTransitionEnd);
      }),
    properties,
  );
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}

async function removeStyleClass(shell: Locator) {
  await shell.evaluate((element) => {
    const target = element as HTMLElement;
    target.dataset.preStyleClass = target.className;
    target.className = Array.from(target.classList)
      .filter((className) => className === "sidenav" || className === "sidenav-open")
      .join(" ");
  });
}

async function restoreClass(shell: Locator) {
  await shell.evaluate((element) => {
    const target = element as HTMLElement;
    target.className = target.dataset.preStyleClass ?? "";
    delete target.dataset.preStyleClass;
  });
}
