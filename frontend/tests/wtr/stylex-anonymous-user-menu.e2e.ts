import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("anonymous user menu consumes its route-local StyleX color variables", () => {
  const ownerSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");

  expect(ownerSource).toContain("homeColors,");
  expect(ownerSource).toContain('} from "./-home-route-screen.stylex";');
  expect(ownerSource).not.toContain("globalColors");
  expect(themeSource).toContain("export const homeColors = stylex.defineVars({");
  expect(ownerSource).toContain("homeColors.textMuted");
  expect(ownerSource).toContain("homeColors.navigationAccent");
  expect(ownerSource).toContain("homeColors.textOnDarkHover");
  expect(ownerSource).toContain("homeColors.navigationDivider");
  expect(themeSource).toContain("stylex.defineVars");
  for (const color of ["#a2a2a2", "#5dbbe0", "#fcfcfc", "#788ba7"]) {
    expect(themeSource).toContain(color);
    expect(ownerSource).not.toContain(color);
  }
});

test("StyleX owns the anonymous desktop user menu and preserves its fallback and behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await installAnonymousHome(page, ["en-US"]);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const menu = page.locator('[data-stylex-owner="anonymous-site-user-menu"]');
  const login = page.getByRole("link", { name: "Log in", exact: true });
  const signup = page.getByRole("link", { name: "Sign up", exact: true });
  await expect(menu).toBeVisible();
  await expect(login).toHaveAttribute("href", `${BASE_PATH}/users/loginform`);
  await expect(signup).toHaveAttribute("href", `${BASE_PATH}/users/signupform`);

  const before = await readMenuEvidence(menu, login, signup);
  console.log("anonymous-user-menu-desktop", JSON.stringify(before.geometry));
  expect(before.styleClassCounts[0]).toBeGreaterThan(1);
  expect(before.styleClassCounts[1]).toBeGreaterThan(1);
  expect(before.styleClassCounts[2]).toBeGreaterThan(1);
  expect(before.styleClassCounts[3]).toBeGreaterThan(0);
  expect(before.styleClassCounts[4]).toBeGreaterThan(1);
  expect(before.styles).toEqual({
    dividerAfterColor: "rgb(120, 139, 167)",
    dividerAfterContent: '"|"',
    dividerAfterOpacity: "0.35",
    dividerLineHeight: "30px",
    itemColor: "rgb(162, 162, 162)",
    itemFloat: "left",
    itemFontSize: "14px",
    itemMargin: "5px 0px",
    itemPosition: "relative",
    linkColor: "rgb(162, 162, 162)",
    linkLineHeight: "30px",
    linkPadding: "5px 10px",
    linkTextDecoration: "none",
    menuFloat: "right",
    menuListStyle: "none",
    menuPadding: "0px",
    signupMarginLeft: "10px",
  });
  expectBox(before.geometry.menu, { height: 40, width: 147.06, x: 1195.47, y: 0 });
  expectBox(before.geometry.login, { height: 27, width: 59.08, x: 1195.47, y: 6 });
  expectBox(before.geometry.signup, { height: 30, width: 74.69, x: 1267.84, y: 5 });

  await removeStyleXClasses(menu);
  const fallback = await readMenuEvidence(menu, login, signup);
  expect(fallback.styles).toEqual({ ...before.styles, signupMarginLeft: "0px" });
  expect(fallback.geometry.menu.right).toBe(before.geometry.menu.right);
  expect(fallback.geometry.menu.x).toBe(before.geometry.menu.x + 10);
  expect(fallback.geometry.menu.width).toBe(before.geometry.menu.width - 10);
  expect(fallback.geometry.login.x).toBe(before.geometry.login.x + 10);
  expect(fallback.geometry.login.right).toBe(before.geometry.login.right + 10);
  expect(fallback.geometry.login.y).toBe(before.geometry.login.y);
  expect(fallback.geometry.login.width).toBe(before.geometry.login.width);
  expect(fallback.geometry.login.height).toBe(before.geometry.login.height);
  expect(fallback.geometry.signup).toEqual(before.geometry.signup);
  expect(fallback.geometry.login.right).toBeLessThanOrEqual(fallback.geometry.signup.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await restoreClasses(menu);
  const restored = await readMenuEvidence(menu, login, signup);
  expect(restored.styles).toEqual(before.styles);
  expect(restored.geometry).toEqual(before.geometry);

  await login.hover();
  await expect(login).toHaveCSS("color", "rgb(252, 252, 252)");

  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(SCREENSHOT_DIRECTORY, "stylex-anonymous-user-menu-desktop.png"),
  });

  const initialUrl = page.url();
  await login.click();
  await expect(page).toHaveURL(initialUrl);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("StyleX preserves the anonymous 390px user-menu wrap and responsive color", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installAnonymousHome(page, ["ko-KR"]);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const menu = page.locator('[data-stylex-owner="anonymous-site-user-menu"]');
  const login = page.getByRole("link", { name: "로그인", exact: true });
  const signup = page.getByRole("link", { name: "멤버 가입", exact: true });
  const evidence = await readMenuEvidence(menu, login, signup);
  console.log("anonymous-user-menu-mobile", JSON.stringify(evidence.geometry));

  expect(evidence.styles.itemColor).toBe("rgb(93, 187, 224)");
  expect(evidence.styles.linkColor).toBe("rgb(93, 187, 224)");
  expectBox(evidence.geometry.menu, { height: 40, width: 147.88, x: 228.42, y: 40 });
  expectBox(evidence.geometry.login, { height: 27, width: 56.34, x: 228.42, y: 46 });
  expectBox(evidence.geometry.signup, { height: 30, width: 78.23, x: 298.06, y: 45 });
  expect(evidence.geometry.menu.right).toBeLessThanOrEqual(390);
  expect(evidence.geometry.login.right).toBeLessThanOrEqual(evidence.geometry.signup.x);

  await removeStyleXClasses(menu);
  const fallback = await readMenuEvidence(menu, login, signup);
  expect(fallback.styles).toEqual({
    ...evidence.styles,
    linkColor: "rgb(162, 162, 162)",
    signupMarginLeft: "0px",
  });
  expect(fallback.geometry.menu.right).toBe(evidence.geometry.menu.right);
  expect(fallback.geometry.menu.x).toBe(evidence.geometry.menu.x + 10);
  expect(fallback.geometry.menu.width).toBe(evidence.geometry.menu.width - 10);
  expect(fallback.geometry.login.x).toBe(evidence.geometry.login.x + 10);
  expect(fallback.geometry.login.right).toBe(evidence.geometry.login.right + 10);
  expect(fallback.geometry.login.y).toBe(evidence.geometry.login.y);
  expect(fallback.geometry.login.width).toBe(evidence.geometry.login.width);
  expect(fallback.geometry.login.height).toBe(evidence.geometry.login.height);
  expect(fallback.geometry.signup).toEqual(evidence.geometry.signup);
  expect(fallback.geometry.login.right).toBeLessThanOrEqual(fallback.geometry.signup.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await restoreClasses(menu);
  const restored = await readMenuEvidence(menu, login, signup);
  expect(restored.styles).toEqual(evidence.styles);
  expect(restored.geometry).toEqual(evidence.geometry);

  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(SCREENSHOT_DIRECTORY, "stylex-anonymous-user-menu-mobile.png"),
  });
});

async function installAnonymousHome(page: Page, supportedLanguages: string[]) {
  await page.addInitScript(
    ({ basePath, languages }) => {
      (
        window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl: "https://github.com/yona-projects/yona/issues",
        hideProjectListing: false,
        supportedLanguages: languages,
      };
    },
    { basePath: BASE_PATH, languages: supportedLanguages },
  );
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        defaultLandingPath: "/",
        isAnonymous: true,
        isGuest: false,
        isSiteAdmin: false,
      },
    });
  });
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        socialLoginOnly: false,
      },
    });
  });
}

async function readMenuEvidence(menu: Locator, login: Locator, signup: Locator) {
  return menu.evaluate(
    (element, labels) => {
      const items = Array.from(element.children) as HTMLElement[];
      const loginLink = Array.from(element.querySelectorAll("a")).find(
        (link) => link.textContent?.trim() === labels.login,
      );
      const signupLink = Array.from(element.querySelectorAll("a")).find(
        (link) => link.textContent?.trim() === labels.signup,
      );
      if (!(loginLink instanceof HTMLElement) || !(signupLink instanceof HTMLElement)) {
        throw new Error("Anonymous user-menu links are missing");
      }
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
      const menuStyle = getComputedStyle(element);
      const itemStyle = getComputedStyle(items[0]);
      const linkStyle = getComputedStyle(loginLink);
      const dividerStyle = getComputedStyle(items[1]);
      const dividerAfterStyle = getComputedStyle(items[1], "::after");
      const signupItemStyle = getComputedStyle(items[2]);
      return {
        geometry: {
          login: box(loginLink),
          menu: box(element),
          signup: box(signupLink),
        },
        styles: {
          dividerAfterColor: dividerAfterStyle.color,
          dividerAfterContent: dividerAfterStyle.content,
          dividerAfterOpacity: dividerAfterStyle.opacity,
          dividerLineHeight: dividerStyle.lineHeight,
          itemColor: itemStyle.color,
          itemFloat: itemStyle.cssFloat,
          itemFontSize: itemStyle.fontSize,
          itemMargin: itemStyle.margin,
          itemPosition: itemStyle.position,
          linkColor: linkStyle.color,
          linkLineHeight: linkStyle.lineHeight,
          linkPadding: linkStyle.padding,
          linkTextDecoration: linkStyle.textDecorationLine,
          menuFloat: menuStyle.cssFloat,
          menuListStyle: menuStyle.listStyleType,
          menuPadding: menuStyle.padding,
          signupMarginLeft: signupItemStyle.marginLeft,
        },
        styleClassCounts: [
          element.classList.length,
          items[0].classList.length,
          items[1].classList.length,
          items[2].classList.length,
          loginLink.classList.length,
        ],
      };
    },
    { login: await login.innerText(), signup: await signup.innerText() },
  );
}

async function removeStyleXClasses(menu: Locator) {
  await menu.evaluate((element) => {
    for (const target of [
      element,
      ...Array.from(element.children),
      ...element.querySelectorAll("a"),
    ].filter((target) => target.getAttribute("data-stylex-owner") !== "anonymous-site-signup")) {
      const htmlTarget = target as HTMLElement & { dataset: DOMStringMap };
      htmlTarget.dataset.preStylexClass = htmlTarget.className;
      const legacyClass = htmlTarget.classList.item(0);
      htmlTarget.className = legacyClass ?? "";
    }
    const signupItem = element.lastElementChild as HTMLElement | null;
    if (signupItem) signupItem.className = "";
  });
}

async function restoreClasses(menu: Locator) {
  await menu.evaluate((element) => {
    for (const target of [
      element,
      ...Array.from(element.children),
      ...element.querySelectorAll("a"),
    ].filter((target) => target.getAttribute("data-stylex-owner") !== "anonymous-site-signup")) {
      const htmlTarget = target as HTMLElement & { dataset: DOMStringMap };
      htmlTarget.className = htmlTarget.dataset.preStylexClass ?? "";
      delete htmlTarget.dataset.preStylexClass;
    }
  });
}

function expectBox(
  actual: { height: number; width: number; x: number; y: number },
  expected: { height: number; width: number; x: number; y: number },
) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(0.02);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(0.02);
  expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(0.02);
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(0.02);
}
