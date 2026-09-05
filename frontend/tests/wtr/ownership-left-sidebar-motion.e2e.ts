import { expect, test, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SIDEBAR = '[data-owner="left-sidebar-outer-shell"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright", "style-left-sidebar-motion");
const SESSION = {
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
};
const WORKSPACE = {
  emails: [],
  favoriteOrganizations: [],
  favoriteProjects: [],
  issueItems: [],
  memberProjects: [],
  organizations: [],
  ownProjects: [],
  profile: {
    avatarUrl: "/legacy-assets/images/default-avatar-34.png",
    connectedSocialProviders: [],
    displayName: "Site Admin",
    englishName: "",
    isBlocked: false,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    primaryEmailAddress: "admin@example.com",
    sinceLabel: "",
  },
  pullRequestItems: [],
  recentIssues: [],
  recentProjects: [],
  watchedProjects: [],
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

  expect(routeSource).toContain('data-owner="left-sidebar-outer-shell"');

  expect(legacyPage).toContain(".sidebar");
  expect(legacyResponsive).toContain(".sidebar");
  expect(legacyUsermenu).toContain("overflow-x: hidden");
  expect(legacyUsermenuJs).toContain("function closeSidebar($sidebar)");
  expect(legacyUsermenuJs).toContain('$sidebar.width("0")');

  await installAuthenticatedHome(page);
  for (const viewport of [
    { height: 900, label: "desktop", openWidth: 271, width: 1366 },
    { height: 844, label: "mobile", openWidth: 318.6875, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await navigateToReadyAuthenticatedHome(page);
    await page.evaluate(() => document.fonts.ready);

    const openPin = page.locator('[data-owner="global-sidebar-open-pin"]');
    await expect(openPin).toBeVisible();
    await expect(page.locator("#sidebar")).toHaveCount(0);
    const sidebar = page.locator(SIDEBAR);
    const opening = await completeSidebarTransition(page, {
      terminalMotion: "open",
      terminalWidth: viewport.openWidth,
      triggerSelector: '[data-owner="global-sidebar-open-pin"]',
      viewportWidth: viewport.width,
    });
    const { animationCount: openingAnimationCount, ...openingStart } = opening.start;
    expect(openingAnimationCount).toBeGreaterThan(0);
    expect(openingStart).toEqual({
      ariaHidden: null,
      inert: true,
      motion: "opening",
      transitionDuration: "0.5s",
      transitionProperty: "border-right-width, flex-basis, max-width, width",
    });
    expect(opening.terminal).toEqual({
      main: null,
      motion: "open",
      sidebarPresent: true,
      width: viewport.openWidth,
    });
    await expect(sidebar).toHaveAttribute("data-owner", "left-sidebar-outer-shell");
    await expect(sidebar.locator('[data-owner="left-sidebar-close-pin"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await saveScreenshot(page, `style-left-sidebar-motion-${viewport.label}-open.png`);

    const closing = await completeSidebarTransition(page, {
      terminalMotion: "closed",
      terminalWidth: 0,
      triggerSelector: '[data-owner="left-sidebar-close-pin"]',
      viewportWidth: viewport.width,
    });
    const { animationCount: closingAnimationCount, ...closingStart } = closing.start;
    expect(closingAnimationCount).toBeGreaterThan(0);
    expect(closingStart).toEqual({
      ariaHidden: "true",
      inert: true,
      motion: "closing",
      transitionDuration: "0.5s",
      transitionProperty: "border-right-width, flex-basis, max-width, width",
    });
    expect(closing.terminal).toEqual({
      main: { width: viewport.width, x: 0, y: 0 },
      motion: "closed",
      sidebarPresent: false,
      width: 0,
    });
    await expect(sidebar).toHaveCount(0);
    await expect(openPin).toBeVisible();
    await expect(openPin).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await saveScreenshot(page, `style-left-sidebar-motion-${viewport.label}-closed.png`);
  }
});

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
      json: SESSION,
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
      json: WORKSPACE,
    }),
  );
}

async function navigateToReadyAuthenticatedHome(page: Page) {
  await establishSidebarState(page, false);
  const sessionReady = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `${BASE_PATH}/api/v1/session` &&
      response.status() === 200,
  );
  const workspaceReady = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `${BASE_PATH}/api/v1/workspace` &&
      response.status() === 200,
  );
  await page.goto(`${BASE_PATH}/`);
  await Promise.all([sessionReady, workspaceReady]);
  await expect(page.locator("#root > #main")).toHaveCount(1);
  await expect(page.locator('#root > #main [data-owner="framed-site-shell"]')).toHaveAttribute(
    "data-sidebar-open",
    "false",
  );
  await expect(page.locator('[data-owner="authenticated-home-page-wrap-outer"]')).toHaveCount(1);
}

async function completeSidebarTransition(
  page: Page,
  input: {
    terminalMotion: "closed" | "open";
    terminalWidth: number;
    triggerSelector: string;
    viewportWidth: number;
  },
) {
  const token = crypto.randomUUID();
  const completion = new Promise<{
    start: {
      animationCount: number;
      ariaHidden: string | null;
      inert: boolean;
      motion: string | null;
      transitionDuration: string;
      transitionProperty: string;
    };
    terminal: {
      main: null | { width: number; x: number; y: number };
      motion: "closed" | "open";
      sidebarPresent: boolean;
      width: number;
    };
  }>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data as {
        error?: string;
        result?: {
          start: {
            animationCount: number;
            ariaHidden: string | null;
            inert: boolean;
            motion: string | null;
            transitionDuration: string;
            transitionProperty: string;
          };
          terminal: {
            main: null | { width: number; x: number; y: number };
            motion: "closed" | "open";
            sidebarPresent: boolean;
            width: number;
          };
        };
        token?: string;
      };
      if (message.token !== token) return;
      window.removeEventListener("message", onMessage);
      if (message.error) reject(new Error(message.error));
      else if (message.result) resolve(message.result);
    };
    window.addEventListener("message", onMessage);
  });

  await page.evaluate(
    (options) => {
      const { terminalMotion, terminalWidth, token, triggerSelector, viewportWidth } = options;
      const sidebarSelector = '[data-owner="left-sidebar-outer-shell"]';
      const root = document.querySelector("#root");
      const trigger = document.querySelector(triggerSelector);
      if (!root || !(trigger instanceof HTMLButtonElement)) {
        parent.postMessage(
          {
            error: !root
              ? "Sidebar transition requires the mounted app root."
              : `Missing sidebar transition trigger: ${triggerSelector}`,
            token,
          },
          location.origin,
        );
        return;
      }

      let start:
        | {
            animationCount: number;
            ariaHidden: string | null;
            inert: boolean;
            motion: string | null;
            transitionDuration: string;
            transitionProperty: string;
          }
        | undefined;
      let observer: MutationObserver;
      const finishIfTerminal = () => {
        if (!start) return;
        const sidebar = document.querySelector(sidebarSelector);
        let terminal:
          | {
              main: null | { width: number; x: number; y: number };
              motion: "closed" | "open";
              sidebarPresent: boolean;
              width: number;
            }
          | undefined;
        if (terminalMotion === "open" && sidebar instanceof HTMLElement) {
          const width = sidebar.getBoundingClientRect().width;
          if (sidebar.dataset.sidebarMotion === "open" && Math.abs(width - terminalWidth) < 0.01) {
            terminal = { main: null, motion: terminalMotion, sidebarPresent: true, width };
          }
        } else if (terminalMotion === "closed" && !sidebar) {
          const main = document.querySelector('[data-owner="framed-site-main"]');
          if (main instanceof HTMLElement) {
            const { width, x, y } = main.getBoundingClientRect();
            if (width === viewportWidth && x === 0 && y === 0) {
              terminal = {
                main: { width, x, y },
                motion: terminalMotion,
                sidebarPresent: false,
                width: terminalWidth,
              };
            }
          }
        }
        if (!terminal) return;
        observer.disconnect();
        document.removeEventListener("transitionend", onTransitionEnd, true);
        document.removeEventListener("transitionrun", onTransitionRun, true);
        parent.postMessage({ result: { start, terminal }, token }, location.origin);
      };
      const onTransitionEnd = (event: TransitionEvent) => {
        if (!(event.target instanceof HTMLElement) || !event.target.matches(sidebarSelector))
          return;
        queueMicrotask(finishIfTerminal);
      };
      const onTransitionRun = (event: TransitionEvent) => {
        if (
          start ||
          !(event.target instanceof HTMLElement) ||
          !event.target.matches(sidebarSelector)
        ) {
          return;
        }
        const style = getComputedStyle(event.target);
        start = {
          animationCount: event.target.getAnimations().length,
          ariaHidden: event.target.getAttribute("aria-hidden"),
          inert: event.target.hasAttribute("inert"),
          motion: event.target.dataset.sidebarMotion ?? null,
          transitionDuration: style.transitionDuration,
          transitionProperty: style.transitionProperty,
        };
        finishIfTerminal();
      };
      observer = new MutationObserver(finishIfTerminal);
      observer.observe(root, { attributes: true, childList: true, subtree: true });
      document.addEventListener("transitionrun", onTransitionRun, true);
      document.addEventListener("transitionend", onTransitionEnd, true);
      trigger.click();
    },
    { ...input, token },
  );

  return completion;
}

async function establishSidebarState(page: Page, open: boolean) {
  await page.setContent("<!doctype html>");
  await page.evaluate((isOpen) => {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem("shallWeOpenLeftNavigation");
      storage.removeItem("sidebarActiveMenu");
    }
    localStorage.setItem("shallWeOpenLeftNavigation", String(isOpen));
    localStorage.setItem("sidebarActiveMenu", "myProjectList");
  }, open);
}

function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return page.screenshot({
    fullPage: false,
    path: resolve(SCREENSHOT_DIRECTORY, filename),
  });
}
