import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");
const OWNER = '[data-owner="site-admin-affix"]';

test.use({ locale: "en-US" });

for (const viewport of [
  { affix: { height: 43, width: 1366, x: 0, y: 0 }, headerY: 43, label: "desktop" },
  { affix: { height: 66, width: 390, x: 0, y: 0 }, headerY: 66, label: "mobile" },
]) {
  test(`site-admin affix preserves ${viewport.label} legacy surface`, async ({ page }) => {
    await page.setViewportSize({
      height: viewport.label === "desktop" ? 900 : 844,
      width: viewport.affix.width,
    });
    await installAuthenticatedHome(page, true);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const owner = page.locator(OWNER);
    const detail = owner.locator(":scope > span");
    await expect(owner).toHaveCount(1);
    await expect(owner).toHaveText(
      "You are Admin now! With great power comes great responsibility",
    );
    await expect(detail).toHaveText("With great power comes great responsibility");
    await expect(owner).not.toHaveClass(/admin-logged-in-affix/);
    await expect(detail).not.toHaveClass(/small-font/);
    expect(
      await owner.evaluate((element) =>
        element.nextElementSibling?.matches("header[data-owner=global-gnb-outer]"),
      ),
    ).toBe(true);

    const evidence = await readAffixEvidence(owner);
    expect(evidence.box).toEqual(viewport.affix);
    expect(evidence.headerY).toBe(viewport.headerY);
    expect(evidence.styles).toEqual({
      backgroundColor: "rgb(173, 0, 0)",
      boxSizing: "border-box",
      color: "rgb(255, 255, 255)",
      fontSize: "20px",
      fontWeight: "700",
      padding: "10px",
      textAlign: "center",
      width: `${viewport.affix.width}px`,
      zIndex: "1000",
    });
    expect(evidence.detailStyles).toEqual({ fontSize: "10px", fontWeight: "400" });
    // Legacy `common/navbar.scala.html` places `.pin` in a static `.gnb-outer`.
    // `_page.less` therefore keeps its absolute `top: 6px` against the page,
    // even when `layout.scala.html` renders the admin affix before the header.
    expect(evidence.headerPosition).toBe("static");
    expect(evidence.sidebarOpenPinY).toBe(6);
    await expect(page.locator("#mySidenav")).toHaveCSS("top", "84px");

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(SCREENSHOT_DIRECTORY, `style-site-admin-affix-local-${viewport.label}.png`),
    });

    await removeStyleClasses(owner);
    const fallback = await readAffixEvidence(owner);
    expect(fallback.styles).not.toEqual(evidence.styles);
    expect(fallback.styles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(fallback.styles.padding).toBe("0px");
    await restoreClasses(owner);
  });
}

test("site-admin banner leaves and re-enters document flow at the legacy 30px scroll boundary", async ({
  page,
}) => {
  await page.setViewportSize({ height: 300, width: 1366 });
  await installAuthenticatedHome(page, true);
  await page.addInitScript(() => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    localStorage.setItem("yobi-intro", "true");
  });
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const banner = page.locator(OWNER);
  const header = page.locator('[data-owner="global-gnb-outer"]');
  await expect(banner).toBeVisible();
  const bannerHeight = await banner.evaluate((element) => element.getBoundingClientRect().height);
  const headerDocumentTop = () =>
    header.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  const initialHeaderTop = await headerDocumentTop();

  // layout.scala.html:57 and bootstrap.js:2220 keep scrollTop <= 30 in flow.
  await page.evaluate(() => window.scrollTo(0, 30));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(30);
  await expect(banner).toHaveCSS("position", "static");
  expect(await headerDocumentTop()).toBeCloseTo(initialHeaderTop, 1);

  await page.evaluate(() => window.scrollTo(0, 31));
  await expect(banner).toHaveCSS("position", "fixed");
  expect(await headerDocumentTop()).toBeCloseTo(initialHeaderTop - bannerHeight, 1);

  await page.evaluate(() => window.scrollTo(0, 30));
  await expect(banner).toHaveCSS("position", "static");
  expect(await headerDocumentTop()).toBeCloseTo(initialHeaderTop, 1);
});

test("site-admin affix stays absent for a non-admin home session", async ({ page }) => {
  await installAuthenticatedHome(page, false);
  await page.goto(`${BASE_PATH}/`);
  await expect(page.locator(OWNER)).toHaveCount(0);
  await expect(page.locator("#mySidenav")).toHaveCSS("top", "40px");
});

async function installAuthenticatedHome(page: Page, isSiteAdmin: boolean) {
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
}

async function readAffixEvidence(owner: Locator) {
  return owner.evaluate((element) => {
    const detail = element.firstElementChild;
    const header = element.nextElementSibling;
    const sidebarOpenPin = header?.querySelector('[data-owner="global-sidebar-open-pin"]');
    if (!detail || !header || !sidebarOpenPin) {
      throw new Error("Affix detail, sibling header, or sidebar-open pin is missing");
    }
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const detailStyle = getComputedStyle(detail);
    return {
      box: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
      detailStyles: { fontSize: detailStyle.fontSize, fontWeight: detailStyle.fontWeight },
      headerY: header.getBoundingClientRect().y,
      headerPosition: getComputedStyle(header).position,
      sidebarOpenPinY: sidebarOpenPin.getBoundingClientRect().y,
      styles: {
        backgroundColor: style.backgroundColor,
        boxSizing: style.boxSizing,
        color: style.color,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        padding: style.padding,
        textAlign: style.textAlign,
        width: style.width,
        zIndex: style.zIndex,
      },
    };
  });
}

async function removeStyleClasses(owner: Locator) {
  await owner.evaluate((element) => {
    const targets = [element, ...element.querySelectorAll("*")];
    for (const target of targets) {
      const htmlTarget = target as HTMLElement;
      htmlTarget.dataset.preStyleClass = htmlTarget.className;
      htmlTarget.className = "";
    }
  });
}

async function restoreClasses(owner: Locator) {
  await owner.evaluate((element) => {
    const targets = [element, ...element.querySelectorAll("*")];
    for (const target of targets) {
      const htmlTarget = target as HTMLElement;
      htmlTarget.className = htmlTarget.dataset.preStyleClass ?? "";
      delete htmlTarget.dataset.preStyleClass;
    }
  });
}
