import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated side-nav content frame has narrow StyleX ownership", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const start = routeSource.indexOf("const authenticatedSidenavContentFrameStyles");
  const end = routeSource.indexOf("const authenticatedSidenavAccountActionStyles");

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const ownerSource = routeSource.slice(start, end);
  expect(ownerSource).toContain("stylex.create");
  expect(ownerSource).toContain('marginTop: "10px"');
  expect(ownerSource).toContain('marginLeft: "10px"');
  expect(ownerSource).toContain('default: "350px"');
  expect(ownerSource).toContain('"@media (max-width: 720px)": "100%"');
  expect(ownerSource).toContain('"@media (max-width: 720px)": 0');
  expect(ownerSource).not.toMatch(/color|background|border|shadow/i);
  expect(routeSource).toContain('data-stylex-owner="authenticated-sidenav-content-frame"');
});

for (const viewport of [
  { label: "desktop", width: 1366, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  test(`authenticated side-nav content frame preserves ${viewport.label} parity`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const toggle = page.getByRole("button", { name: "User menu, Shortcut (F)" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const profile = page.getByRole("link", { name: "Profile", exact: true });
    const account = page.getByRole("link", { name: "Account", exact: true });
    const favoriteTab = page.getByRole("button", { name: "Favorite", exact: true });
    const favorite = page.getByRole("button", { name: "Remove weblabs from favorites" });
    const frame = profile.locator("xpath=../../..");
    await expect(account).toBeVisible();
    await expect(favoriteTab).toBeVisible();
    await expect(favorite).toBeVisible();

    const evidence = await readFrameEvidence(frame, profile, favoriteTab, favorite);
    console.log(`authenticated-sidenav-content-frame-${viewport.label}`, JSON.stringify(evidence));
    await saveScreenshot(
      page,
      `stylex-authenticated-sidenav-content-frame-${viewport.label}-${evidence.hasOwner ? "after" : "before"}.png`,
    );

    expect(evidence.hasOwner).toBe(true);
    expect(evidence.styles).toEqual({
      cssFloat: "left",
      marginLeft: "10px",
      marginTop: "10px",
      minHeight: "1px",
      minWidth: "0px",
      width: `${viewport.width > 720 ? 350 : viewport.width}px`,
    });
    expect(evidence.order).toEqual(["account-row", "tabs", "tab-content"]);
    expect(evidence.geometry.frame.width).toBe(viewport.width > 720 ? 350 : viewport.width);
    expect(evidence.geometry.frame.top - evidence.geometry.shell.top).toBe(11);
    expect(evidence.geometry.account.left).toBe(evidence.geometry.frame.left);
    expect(evidence.geometry.account.right).toBe(evidence.geometry.frame.right);
    expect(evidence.geometry.tabs.left).toBe(evidence.geometry.frame.left);
    expect(evidence.geometry.tabs.right).toBe(evidence.geometry.frame.right);
    expect(evidence.geometry.content.left).toBe(evidence.geometry.frame.left);
    expect(evidence.geometry.content.right).toBe(evidence.geometry.frame.right);
    expect(evidence.geometry.account.bottom).toBeLessThanOrEqual(evidence.geometry.tabs.top);
    expect(evidence.geometry.tabs.bottom).toBeLessThanOrEqual(evidence.geometry.content.top);
    expect(evidence.geometry.profile.left).toBeGreaterThanOrEqual(evidence.geometry.frame.left);
    expect(evidence.geometry.favorite.right).toBeLessThanOrEqual(evidence.geometry.frame.right);
    if (viewport.width > 720) {
      expect(evidence.geometry.frame.right).toBeLessThanOrEqual(evidence.geometry.shell.right);
    } else {
      expect(evidence.geometry.frame.right - evidence.geometry.shell.right).toBe(9);
    }
    expect(evidence.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    await removeStyleXClass(frame);
    const fallback = await readFrameEvidence(frame, profile, favoriteTab, favorite);
    expect(fallback.styles).toEqual(evidence.styles);
    expect(fallback.geometry).toEqual(evidence.geometry);
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
        favoriteOrganizations: [
          {
            isFavorited: true,
            organizationId: 11,
            organizationName: "weblabs",
            projectCount: 0,
            projects: [],
          },
        ],
        favoriteProjects: [],
        organizations: [],
        profile: {
          avatarUrl: "/legacy-assets/images/default-avatar-34.png",
          isGuest: false,
          loginId: "admin",
        },
        recentIssues: [],
      },
    }),
  );
}

async function readFrameEvidence(
  frame: Locator,
  profile: Locator,
  favoriteTab: Locator,
  favorite: Locator,
) {
  return frame.evaluate(
    (element, targets) => {
      const [profileElement, favoriteTabElement, favoriteElement] = targets as HTMLElement[];
      const shell = element.closest("#mySidenav");
      const accountRow = profileElement.closest(
        '[data-stylex-owner="authenticated-sidenav-account-actions"]',
      );
      const tabs = favoriteTabElement.closest("ul");
      const tabContent = tabs?.nextElementSibling;
      if (!shell || !accountRow || !tabs || !tabContent) {
        throw new Error("Authenticated side-nav frame structure is incomplete");
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
      const style = getComputedStyle(element);
      return {
        geometry: {
          account: box(accountRow),
          content: box(tabContent),
          favorite: box(favoriteElement),
          frame: box(element),
          profile: box(profileElement),
          shell: box(shell),
          tabs: box(tabs),
        },
        hasOwner:
          element.getAttribute("data-stylex-owner") === "authenticated-sidenav-content-frame",
        order: Array.from(element.children).map((child) => {
          if (child === accountRow) return "account-row";
          if (child === tabs) return "tabs";
          if (child === tabContent) return "tab-content";
          return child.tagName.toLowerCase();
        }),
        styles: {
          cssFloat: style.cssFloat,
          marginLeft: style.marginLeft,
          marginTop: style.marginTop,
          minHeight: style.minHeight,
          minWidth: style.minWidth,
          width: style.width,
        },
        viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
      };
    },
    [
      await profile.elementHandle(),
      await favoriteTab.elementHandle(),
      await favorite.elementHandle(),
    ],
  );
}

async function removeStyleXClass(frame: Locator) {
  await frame.evaluate((element) => {
    element.className = "span5 right-menu span-hard-wrap";
  });
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
