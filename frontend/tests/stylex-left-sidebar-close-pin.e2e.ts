import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

for (const viewport of [
  { height: 900, label: "desktop", pinX: 246, width: 1366 },
  { height: 844, label: "mobile", pinX: 293.6875, width: 390 },
]) {
  test(`left sidebar close pin preserves ${viewport.label} legacy parity`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    const sidebarShell = page.locator('[data-stylex-owner="left-sidebar-outer-shell"]');
    const pin = sidebar.getByRole("button", { name: "Sidebar" });
    const icon = pin.locator(":scope > .yobicon-arrow-left");
    await expect(pin).toHaveAttribute("data-stylex-owner", "left-sidebar-close-pin");
    await saveScreenshot(pin, `stylex-left-sidebar-close-pin-local-${viewport.label}-after.png`);

    expect(await readEvidence(pin)).toEqual({
      icon: {
        box: { height: 26, width: 22, x: viewport.pinX + 1, y: 9 },
        className: "yobicon-arrow-left",
        styles: {
          color: "rgb(62, 39, 35)",
          cursor: "auto",
          display: "inline-block",
          fontSize: "18px",
          lineHeight: "18px",
          padding: "4px 2px",
        },
      },
      owner: "left-sidebar-close-pin",
      pin: {
        box: { height: 26, width: 24, x: viewport.pinX, y: 9 },
        presentationClasses: [],
        styles: {
          appearance: "none",
          backgroundColor: "rgb(3, 169, 244)",
          border: "0px none rgb(62, 39, 35)",
          borderRadius: "3px 0px 0px 3px",
          boxShadow: "none",
          boxSizing: "content-box",
          color: "rgb(62, 39, 35)",
          cursor: "auto",
          display: "block",
          fontSize: "18px",
          lineHeight: "20px",
          margin: "0px 5px 0px 0px",
          padding: "0px 1px",
          position: "absolute",
          right: "-5px",
          top: "9px",
        },
      },
      pluginAttributes: [],
    });
    await expect(pin).toHaveAttribute("type", "button");
    await expect(pin).toHaveAttribute("title", "Sidebar");
    await expect(pin).toHaveAttribute("aria-controls", "sidebar");
    await expect(pin).toHaveAttribute("aria-expanded", "true");
    await expect(icon).toHaveAttribute("aria-hidden", "true");

    await icon.hover();
    await expect(pin).toHaveCSS("color", "rgb(62, 39, 35)");
    await expect(pin).toHaveCSS("cursor", "pointer");
    await expect(icon).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(icon).toHaveCSS("cursor", "pointer");
    await expect(pin).toHaveCSS("background-color", "rgb(3, 169, 244)");
    expect(await pin.evaluate((node) => node.getBoundingClientRect().toJSON())).toMatchObject({
      height: 26,
      width: 24,
      x: viewport.pinX,
      y: 9,
    });
    await saveScreenshot(
      pin,
      `stylex-left-sidebar-close-pin-local-${viewport.label}-hover-after.png`,
    );

    await pin.focus();
    await expect(pin).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(icon).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(pin).toHaveCSS("background-color", "rgb(3, 169, 244)");
    await expect(pin).toBeFocused();

    await pin.click();
    await expect(sidebarShell).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("shallWeOpenLeftNavigation"))).toBe(
      "false",
    );
    const openPin = page.locator('[data-stylex-owner="global-sidebar-open-pin"]');
    await openPin.click();
    await expect(
      page.getByRole("complementary", { name: "Sidebar" }).getByRole("button", {
        name: "Sidebar",
      }),
    ).toHaveAttribute("data-stylex-owner", "left-sidebar-close-pin");
    expect(await page.evaluate(() => localStorage.getItem("shallWeOpenLeftNavigation"))).toBe(
      "true",
    );
  });
}

test("left sidebar close pin has complete global-theme StyleX ownership", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const start = route.indexOf("const leftSidebarClosePinStyles");
  const end = route.indexOf("function LegacyFramedSidebar", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const owner = route.slice(start, end);
  for (const token of [
    "leftSidebarClosePinSurface",
    "leftSidebarClosePinText",
    "leftSidebarClosePinInteractionText",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(owner).toContain(`homeColors.${token}`);
    } else {
      expect(owner).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(owner).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i);
  expect(appCss).not.toContain(".pin-in-sidebar");
  expect(route).toContain('data-stylex-owner="left-sidebar-close-pin"');
  expect(route).not.toContain('className="pin-in-sidebar"');
  expect(route).toContain("className={`yobicon-arrow-left ${");
  const marker = route.indexOf('data-stylex-owner="left-sidebar-close-pin"');
  const jsxStart = route.lastIndexOf("<button", marker);
  const jsxEnd = route.indexOf("</button>", marker);
  expect(marker).toBeGreaterThanOrEqual(0);
  expect(jsxStart).toBeGreaterThanOrEqual(0);
  expect(jsxEnd).toBeGreaterThan(marker);
  expect(route.slice(jsxStart, jsxEnd)).not.toMatch(/data-(toggle|placement|target|trigger)=/);
});

async function readEvidence(pin: Locator) {
  return pin.evaluate((element) => {
    const iconElement = element.firstElementChild as HTMLElement;
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
    };
    const style = getComputedStyle(element);
    const iconStyle = getComputedStyle(iconElement);
    return {
      icon: {
        box: box(iconElement),
        className: iconElement.classList.contains("yobicon-arrow-left") ? "yobicon-arrow-left" : "",
        styles: {
          color: iconStyle.color,
          cursor: iconStyle.cursor,
          display: iconStyle.display,
          fontSize: iconStyle.fontSize,
          lineHeight: iconStyle.lineHeight,
          padding: iconStyle.padding,
        },
      },
      owner: element.getAttribute("data-stylex-owner"),
      pin: {
        box: box(element),
        presentationClasses: ["pin-in-sidebar"].filter((name) => element.classList.contains(name)),
        styles: {
          appearance: style.appearance,
          backgroundColor: style.backgroundColor,
          border: style.border,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          boxSizing: style.boxSizing,
          color: style.color,
          cursor: style.cursor,
          display: style.display,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          margin: style.margin,
          padding: style.padding,
          position: style.position,
          right: style.right,
          top: style.top,
        },
      },
      pluginAttributes: Array.from(element.attributes, (attribute) => attribute.name).filter(
        (name) => /^(data-(toggle|placement|target|trigger))$/.test(name),
      ),
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
        ownProjects: [],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [project("recent-project")],
        watchedProjects: [],
      },
    }),
  );
}

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
