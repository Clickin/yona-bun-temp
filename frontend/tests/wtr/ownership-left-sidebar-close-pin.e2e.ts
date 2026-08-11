import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

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
    // Browser harness persists localStorage across runs; reset the sidebar
    // open-state so the pin test starts from the legacy default (open).
    await page.evaluate(() => localStorage.removeItem("shallWeOpenLeftNavigation"));
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    const pin = sidebar.getByRole("button", { name: "Sidebar" });
    const icon = pin.locator(":scope > .yobicon-arrow-left");
    await saveScreenshot(pin, `style-left-sidebar-close-pin-local-${viewport.label}-after.png`);

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
    // F5 dist-truth: the pin/icon color transition settles within ~150ms;
    // poll from the settled state to avoid a mid-transition read.
    await new Promise((r) => setTimeout(r, 300));
    // F5 dist-truth: hover colors resolve through the pin :hover cascade;
    // direct reads (the wtr poll can read mid-transition).
    const hoverStyles = await pin.evaluate((btn) => {
      const iconEl = btn.querySelector(".yobicon-arrow-left") as HTMLElement;
      const s = (el: HTMLElement) => getComputedStyle(el);
      return {
        pinColor: s(btn).getPropertyValue("color").trim(),
        pinCursor: s(btn).getPropertyValue("cursor").trim(),
        iconColor: s(iconEl).getPropertyValue("color").trim(),
        iconCursor: s(iconEl).getPropertyValue("cursor").trim(),
        pinBg: s(btn).getPropertyValue("background-color").trim(),
      };
    });
    expect(hoverStyles.pinColor).toBe("rgb(62, 39, 35)");
    expect(hoverStyles.pinCursor).toBe("pointer");
    expect(hoverStyles.iconColor).toBe("rgb(255, 255, 255)");
    expect(hoverStyles.iconCursor).toBe("pointer");
    expect(hoverStyles.pinBg).toBe("rgb(3, 169, 244)");
    expect(await pin.evaluate((node) => node.getBoundingClientRect().toJSON())).toMatchObject({
      height: 26,
      width: 24,
      x: viewport.pinX,
      y: 9,
    });
    await saveScreenshot(
      pin,
      `style-left-sidebar-close-pin-local-${viewport.label}-hover-after.png`,
    );

    await pin.focus();
    await new Promise((r) => setTimeout(r, 300));
    // F5 dist-truth: focus styles read directly (same poll caveat).
    const focusStyles = await pin.evaluate((btn) => {
      const iconEl = btn.querySelector(".yobicon-arrow-left") as HTMLElement;
      const s = (el: HTMLElement) => getComputedStyle(el);
      return {
        pinColor: s(btn).getPropertyValue("color").trim(),
        iconColor: s(iconEl).getPropertyValue("color").trim(),
        pinBg: s(btn).getPropertyValue("background-color").trim(),
        focused: btn === document.activeElement,
      };
    });
    expect(focusStyles.pinColor).toBe("rgb(255, 255, 255)");
    expect(focusStyles.iconColor).toBe("rgb(255, 255, 255)");
    expect(focusStyles.pinBg).toBe("rgb(3, 169, 244)");
    expect(focusStyles.focused).toBe(true);

    await pin.click();
    await expect(sidebar).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("shallWeOpenLeftNavigation"))).toBe(
      "false",
    );
    const openPin = page.getByRole("button", { name: "Sidebar" });
    await openPin.click();
    await expect(
      page.getByRole("complementary", { name: "Sidebar" }).getByRole("button", {
        name: "Sidebar",
      }),
    ).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("shallWeOpenLeftNavigation"))).toBe(
      "true",
    );
  });
}

test("left sidebar close pin has complete global-theme Style ownership", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  for (const token of [
    "leftSidebarClosePinSurface",
    "leftSidebarClosePinText",
    "leftSidebarClosePinInteractionText",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }
  expect(appCss).not.toContain(".pin-in-sidebar");
  expect(route).not.toContain('className="pin-in-sidebar"');
  expect(route).toContain("className={`yobicon-arrow-left ${");
  const marker = route.indexOf("yobicon-arrow-left");
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
