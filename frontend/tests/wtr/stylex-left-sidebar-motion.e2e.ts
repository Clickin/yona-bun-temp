import { expect, test, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SIDEBAR = '[data-stylex-owner="left-sidebar-outer-shell"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright", "stylex-left-sidebar-motion");
type TransitionEvidence = {
  ended: boolean;
  properties: string[];
  started: boolean;
};

test.use({ locale: "en-US" });

test("left framed sidebar keeps legacy geometry while opening and closing with CSS motion", async ({
  page,
}) => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const legacyPage = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyResponsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyUsermenu = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_usermenu.less",
    "utf8",
  );
  const legacyUsermenuJs = readFileSync(
    "../yona-original/public/javascripts/common/yona.Usermenu.js",
    "utf8",
  );

  expect(routeSource).toContain('data-stylex-owner="left-sidebar-outer-shell"');
  expect(routeSource).toContain(
    'transitionProperty: "border-right-width, flex-basis, max-width, width"',
  );
  expect(legacyPage).toContain(".sidebar");
  expect(legacyResponsive).toContain(".sidebar");
  expect(legacyUsermenu).toContain("overflow-x: hidden");
  expect(legacyUsermenuJs).toContain("function closeSidebar($sidebar)");
  expect(legacyUsermenuJs).toContain('$sidebar.width("0")');

  for (const viewport of [
    { height: 900, label: "desktop", openWidth: 271, width: 1366 },
    { height: 844, label: "mobile", openWidth: 318.6875, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const openPin = page.locator('[data-stylex-owner="global-sidebar-open-pin"]');
    await expect(openPin).toBeVisible();
    await expect(page.locator("#sidebar")).toHaveCount(0);

    const openingTransition = observeSidebarTransition(page);
    await openPin.click();
    const sidebar = page.locator(SIDEBAR);
    await expect(sidebar).toHaveAttribute("data-stylex-owner", "left-sidebar-outer-shell");
    await expect(sidebar).toHaveCSS("transition-duration", "0.5s");
    expect(
      await sidebar.evaluate((element) => getComputedStyle(element).transitionProperty),
    ).toContain("width");
    const openingEvidence = await openingTransition;
    expect(openingEvidence).toMatchObject({ ended: true, started: true });
    expect(openingEvidence.properties).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(?:flex-basis|max-width|width)$/u)]),
    );
    await expect(sidebar).toHaveAttribute("data-sidebar-motion", "open");
    await expect
      .poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().width))
      .toBe(viewport.openWidth);
    await expect(sidebar.locator('[data-stylex-owner="left-sidebar-close-pin"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await saveScreenshot(page, `stylex-left-sidebar-motion-${viewport.label}-open.png`);

    const closingTransition = observeSidebarTransition(page);
    await sidebar.locator('[data-stylex-owner="left-sidebar-close-pin"]').click();
    await expect(sidebar).toHaveAttribute("data-sidebar-motion", "closing");
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await expect(sidebar).toHaveAttribute("inert", "");
    const closingEvidence = await closingTransition;
    expect(closingEvidence).toMatchObject({ ended: true, started: true });
    expect(closingEvidence.properties).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(?:flex-basis|max-width|width)$/u)]),
    );
    await expect(sidebar).toHaveCount(0);
    await expect(openPin).toBeVisible();
    await expect(openPin).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await saveScreenshot(page, `stylex-left-sidebar-motion-${viewport.label}-closed.png`);
  }
});

function observeSidebarTransition(page: Page): Promise<TransitionEvidence> {
  return page.evaluate((selector) => {
    const transitionProperties = new Set(["flex-basis", "max-width", "width"]);
    return new Promise<TransitionEvidence>((resolve) => {
      let element: HTMLElement | null = null;
      let attached = false;
      let started = false;
      let finished = false;
      const properties: string[] = [];

      const cleanup = () => {
        observer.disconnect();
        element?.removeEventListener("transitionrun", onTransitionRun);
        element?.removeEventListener("transitionend", onTransitionEnd);
      };
      const finish = (ended: boolean) => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve({ ended, properties, started });
      };
      const onTransitionRun = (event: Event) => {
        if (!(event instanceof TransitionEvent) || event.target !== element) return;
        if (!transitionProperties.has(event.propertyName)) return;
        started = true;
        properties.push(event.propertyName);
      };
      const onTransitionEnd = (event: Event) => {
        if (!(event instanceof TransitionEvent) || event.target !== element) return;
        if (!transitionProperties.has(event.propertyName)) return;
        finish(true);
      };
      const attach = () => {
        if (attached) return;
        const candidate = document.querySelector(selector);
        if (!(candidate instanceof HTMLElement)) return;
        element = candidate;
        attached = true;
        element.addEventListener("transitionrun", onTransitionRun);
        element.addEventListener("transitionend", onTransitionEnd);
      };
      const observer = new MutationObserver(attach);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      attach();
    });
  }, SIDEBAR);
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
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
        avatarUrl: "/legacy-assets/images/default-avatar-34.png",
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
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}

function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return page.screenshot({
    fullPage: false,
    path: resolve(SCREENSHOT_DIRECTORY, filename),
  });
}
