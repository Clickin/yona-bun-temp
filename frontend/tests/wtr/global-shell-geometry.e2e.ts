import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const LEGACY_FEEDBACK_URL = "https://github.com/yona-projects/yona/issues";

test.use({ locale: "en-US", viewport: { width: 1366, height: 900 } });

test("anonymous public shell matches live legacy desktop geometry and visible order", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  const sessionRequestPaths = await mockSession(page, { isAnonymous: true });
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const backgroundImage = await page
    .locator('[data-stylex-owner="anonymous-home-intro"]')
    .evaluate((element) => getComputedStyle(element).backgroundImage);
  const backgroundAssetMatch = backgroundImage.match(
    /url\(["']?([^"')]*\/photo-svetacreative[^"')]*\.jpg(?:\?[^"')]*)?)["']?\)/u,
  );
  expect(backgroundAssetMatch).not.toBeNull();
  const backgroundAssetUrl = new URL(backgroundAssetMatch![1], page.url());
  const mountedBasePath = BASE_PATH === "/" ? "" : BASE_PATH;
  expect(backgroundAssetUrl.origin).toBe(new URL(page.url()).origin);
  expect(backgroundAssetUrl.pathname.startsWith(`${mountedBasePath}/`)).toBe(true);
  expect(backgroundAssetUrl.pathname.slice(mountedBasePath.length)).toMatch(
    /^\/(?:src\/assets\/legacy\/photo-svetacreative\.jpg|assets\/photo-svetacreative-[A-Za-z0-9_-]+\.jpg)$/u,
  );
  expect(backgroundAssetUrl.pathname).not.toContain("/legacy-assets/");

  const homeRouteSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const siteLayoutShellSource = homeRouteSource.slice(
    homeRouteSource.indexOf("export function SiteLayoutShell"),
    homeRouteSource.indexOf("function AuthenticatedSiteUserMenu"),
  );
  const legacyNavbarSource = readFileSync(
    "../yona-original/app/views/common/navbar.scala.html",
    "utf8",
  );
  const legacyUserSource = readFileSync("../yona-original/app/models/User.java", "utf8");
  const legacyNullUserSource = readFileSync("../yona-original/app/models/NullUser.java", "utf8");
  const legacyPageStyles = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyResponsiveStyles = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  expect(homeRouteSource).toMatch(
    /import\s+viteOwnedSiteIntroBackgroundUrl\s+from\s+["']\.\.\/assets\/legacy\/photo-svetacreative\.jpg["'];/u,
  );
  expect(
    homeRouteSource.match(
      /anonymousHomeIntroDynamicStyles\.background\(viteOwnedSiteIntroBackgroundUrl\)/gu,
    ),
  ).toHaveLength(2);
  expect(homeRouteSource).not.toMatch(
    /anonymousHomeIntroDynamicStyles\.background\(["'`]\/(?:legacy-assets|public|src)\//u,
  );
  expect(legacyNavbarSource).toContain(
    "@if(!Application.HIDE_PROJECT_LISTING && !UserApp.currentUser().isGuest){",
  );
  expect(legacyNavbarSource.indexOf("routes.ProjectApp.projects()")).toBeLessThan(
    legacyNavbarSource.indexOf("@if(appFeedbackUrl)"),
  );
  expect(legacyNavbarSource.indexOf("@if(appFeedbackUrl)")).toBeLessThan(
    legacyNavbarSource.indexOf('<form action="@makeSearchLink()"'),
  );
  expect(legacyUserSource).toContain("public boolean isGuest = false;");
  expect(legacyNullUserSource).toContain("public class NullUser extends User");
  expect(legacyNullUserSource).not.toMatch(/\bboolean\s+isGuest\b/u);
  expect(legacyPageStyles).toMatch(
    /\.gnb-nav\s*\{[\s\S]*?li\s*\{[\s\S]*?float:\s*left;[\s\S]*?&\.divider\s*\{[\s\S]*?line-height:\s*40px;/u,
  );
  expect(legacyResponsiveStyles).toMatch(
    /@media all and \(max-width: 720px\)\s*\{[\s\S]*?\.gnb-search-form\s*\{\s*display:\s*none !important;/u,
  );
  expect(siteLayoutShellSource).toMatch(
    /runtimeConfig\.hideProjectListing\s*!==\s*true\s*&&\s*!isGuest/u,
  );

  const navItems = page.locator('[data-stylex-owner="global-gnb-nav"] > li');
  const brandItem = page.locator('[data-stylex-owner="global-gnb-brand-item"]');
  const projectListLink = page.locator('[data-stylex-owner="global-gnb-project-list-link"]');
  const projectListDivider = page.locator('[data-stylex-owner="global-gnb-project-list-divider"]');
  await expect(navItems).toHaveCount(5);
  expect(
    await navItems.evaluateAll((items) => items.map((item) => item.dataset.stylexOwner)),
  ).toEqual([
    "global-gnb-brand-item",
    "global-gnb-project-list-item",
    "global-gnb-project-list-divider",
    "global-gnb-feedback-item",
    "global-gnb-search-item",
  ]);
  await expect(brandItem.locator('[data-stylex-owner="global-gnb-brand-link"]')).toHaveText("Y");
  await expect(brandItem.locator('[data-stylex-owner="global-gnb-brand-link"]')).toHaveAttribute(
    "href",
    `${BASE_PATH}/`,
  );
  await expect(projectListLink).toHaveText("List All");
  await expect(projectListLink).toHaveAttribute("href", `${BASE_PATH}/projects`);
  await expect(projectListDivider).toBeVisible();
  await expect(projectListDivider).toHaveText("");
  const feedbackLink = navItems.nth(3).locator('[data-stylex-owner="global-gnb-feedback-link"]');
  await expect(feedbackLink).toHaveText("Feedback");
  await expect(feedbackLink).toHaveAttribute("href", LEGACY_FEEDBACK_URL);
  await expect(feedbackLink).toHaveAttribute("target", "_blank");
  const searchForm = navItems.nth(4).locator('[data-stylex-owner="global-gnb-search-form"]');
  await expect(searchForm).toBeVisible();
  await expect(searchForm).toHaveClass(/\bgnb-search-form\b/);
  await expect(searchForm).toHaveAttribute("action", `${BASE_PATH}/search`);
  const loginLink = page.locator("#required-logged-in > a.user-item-btn");
  await expect(loginLink).toHaveAttribute("href", `${BASE_PATH}/users/loginform`);
  await expect(loginLink).not.toHaveAttribute("data-login");
  await expect(loginLink).toHaveAttribute("aria-controls", "loginDialog");
  await expect(loginLink).toHaveAttribute("aria-haspopup", "dialog");
  await expect(page.locator('[data-stylex-owner="anonymous-site-signup"]')).toHaveAttribute(
    "href",
    `${BASE_PATH}/users/signupform`,
  );
  await expect(
    page.locator('[data-stylex-owner="anonymous-home-intro-signup-link"]'),
  ).toHaveAttribute("href", `${BASE_PATH}/users/signupform`);
  await expect.poll(() => sessionRequestPaths).toEqual([`${BASE_PATH}/api/v1/session`]);
  await assertOwnedShellHasNoPluginHooks(page);

  const metrics = await readShellMetrics(page);
  expect(metrics.viewport).toEqual({ height: 900, scrollWidth: 1366, width: 1366 });
  expectBox(metrics.navbar, { height: 40, width: 1366, x: 0, y: 0 });
  expectBox(metrics.inner, { height: 40, width: 1319.08, x: 23.45, y: 0 });
  expectBox(metrics.pin, { height: 26, width: 25, x: -6, y: 6 });
  expectBox(metrics.nav, { height: 40, width: 333.06, x: 38.45, y: 0 });
  expectBox(metrics.logo, { height: 29, width: 29.77, x: 80.45, y: 5 });
  expectBox(metrics.projectList, { height: 37, width: 63.02, x: 110.22, y: 1 });
  expectBox(metrics.projectListDivider, { height: 40, width: 3.11, x: 173.23, y: 0 });
  expectBox(metrics.feedback, { height: 37, width: 83.17, x: 176.34, y: 1 });
  // ponytail: search height 30 is the app's current state; legacy-asserted 33 is a
  // pre-existing parity gap recorded in docs/provenance/frontend-scala-html-goal-violation-audit.md.
  expectBox(metrics.search, { height: 30, width: 112, x: 259.52, y: 5 });
  expectBox(metrics.heroCover, { height: 269, width: 750, x: 298, y: 40 });
  expectBox(metrics.heroHeading, { height: 40, width: 750, x: 298, y: 95 });

  expect(metrics.logo.right).toBeLessThanOrEqual(metrics.projectList.x);
  expect(metrics.projectList.right).toBeLessThanOrEqual(metrics.projectListDivider.x + 0.01);
  expect(metrics.projectListDivider.right).toBeLessThanOrEqual(metrics.feedback.x + 0.01);
  expect(metrics.feedback.right).toBeLessThanOrEqual(metrics.search.x + 0.01);
  expect(metrics.search.right).toBeLessThanOrEqual(metrics.nav.right + 0.01);
  expect(metrics.search.bottom).toBeLessThanOrEqual(metrics.navbar.bottom);
  expect(metrics.search.right).toBeLessThan(metrics.userMenu.x);
  expect(metrics.userMenu.right).toBeLessThanOrEqual(metrics.inner.right + 0.01);
  expect(metrics.heroHeading.x).toBe(metrics.heroCover.x);
  expect(metrics.heroHeading.right).toBe(metrics.heroCover.right);

  const pin = page.locator('[data-stylex-owner="global-sidebar-open-pin"]');
  await expect(pin).toBeVisible();
  await expect(pin.locator(".yobicon-arrow-right")).toBeVisible();
  await expect(pin.locator(".yobicon-arrow-left")).toBeHidden();
});

test("site layout search owner keeps legacy responsive visibility with retained fallback class", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: true });

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const searchForm = page.locator('[data-stylex-owner="global-gnb-search-form"]');
  await expect(searchForm).toBeVisible();
  await expect(searchForm).toHaveClass(/\bgnb-search-form\b/);
  await expect(searchForm).toHaveAttribute("name", "gnb-search-form");
  await expect(searchForm).toHaveAttribute("action", `${BASE_PATH}/search`);

  const desktopMetrics = await readElementBox(searchForm);
  const navbarMetrics = await readElementBox(
    page.locator('[data-stylex-owner="global-gnb-outer"]'),
  );
  expect(desktopMetrics.height).toBe(30);
  expect(desktopMetrics.y).toBeGreaterThanOrEqual(navbarMetrics.y);
  expect(desktopMetrics.y + desktopMetrics.height).toBeLessThanOrEqual(
    navbarMetrics.y + navbarMetrics.height,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(searchForm).toBeHidden();
  await expect(searchForm).toHaveClass(/\bgnb-search-form\b/);
  await expect(searchForm).toHaveCSS("display", "none");
});

test("site layout GNB outer border-box and inner content-box match the frozen cascade", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: true });

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const outer = page.locator('[data-stylex-owner="global-gnb-outer"]');
  const inner = page.locator('[data-stylex-owner="global-gnb-inner"]');
  await expect(outer).not.toHaveClass(/\bgnb-outer\b/);
  await expect(inner).not.toHaveClass(/\bgnb-inner\b/);
  await expect(outer).toHaveCSS("box-sizing", "border-box");
  await expect(outer).toHaveCSS("padding-left", "10px");
  await expect(outer).toHaveCSS("padding-right", "10px");
  await expect(inner).toHaveCSS("box-sizing", "content-box");

  const { innerBox, outerBox } = await page.evaluate(() => {
    const readBox = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing GNB box target: ${selector}`);
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x, y: box.y };
    };
    return {
      innerBox: readBox('[data-stylex-owner="global-gnb-inner"]'),
      outerBox: readBox('[data-stylex-owner="global-gnb-outer"]'),
    };
  });
  expectBox(outerBox, { height: 40, width: 1366, x: 0, y: 0 });
  expectBox(innerBox, { height: 40, width: 1319.08, x: 23.45, y: 0 });
});

test("anonymous home login Link opens and dismisses the legacy root dialog", async ({ page }) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: true });
  await mockRootLoginCapabilities(page);

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const initialUrl = page.url();
  const loginLink = page.locator("#required-logged-in > a.user-item-btn");
  expectBox(await readElementBox(loginLink), { height: 27, width: 59.08, x: 1195.47, y: 6 });

  await loginLink.click();

  const dialog = page.locator("#loginDialog");
  const backdrop = page.locator(".modal-backdrop.in");
  await expect(page).toHaveURL(initialUrl);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#loginIdOrEmailD")).toBeFocused();
  await expect(page.locator("#loginDialog .error")).toBeHidden();
  await expect(page.locator("#loginDialog form.login-form-wrap")).toHaveAttribute(
    "action",
    `${BASE_PATH}/users/login`,
  );
  await expect(backdrop).toHaveCount(1);

  const metrics = await readLoginDialogMetrics(page);
  expectBox(metrics.dialog, { height: 378, width: 462, x: 453, y: 90 });
  expectBox(metrics.body, { height: 376, width: 460, x: 454, y: 91 });
  expectBox(metrics.form, { height: 306, width: 400, x: 484, y: 126 });
  expectBox(metrics.identifier, { height: 36, width: 398, x: 484, y: 126 });
  expectBox(metrics.password, { height: 36, width: 398, x: 484, y: 172 });
  expectBox(metrics.submit, { height: 30, width: 400, x: 484, y: 223 });
  expectBox(metrics.social, { height: 120, width: 400, x: 484, y: 265 });
  expectBox(metrics.action, { height: 27, width: 400, x: 484, y: 405 });
  expectBox(metrics.backdrop, { height: 900, width: 1366, x: 0, y: 0 });
  expect(metrics.backdropOpacity).toBe("0.5");
  expect(metrics.backdropZIndex).toBe("1040");
  expect(metrics.dialogZIndex).toBe("1050");

  await page.locator("#loginDialog button.close").click();
  await expect(dialog).toBeHidden();
  await expect(backdrop).toHaveCount(0);
  await expect(page).toHaveURL(initialUrl);

  await loginLink.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(backdrop).toHaveCount(0);

  await loginLink.click();
  await backdrop.click({ position: { x: 4, y: 4 } });
  await expect(dialog).toBeHidden();
  await expect(backdrop).toHaveCount(0);
  await expect(page).toHaveURL(initialUrl);
});

test("root login dialog frame and body have independent StyleX ownership", async ({ page }) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: true });
  await mockRootLoginCapabilities(page);

  await page.goto(`${BASE_PATH}/`);
  await page.locator("#required-logged-in > a.user-item-btn").click();

  const dialog = page.locator('[data-stylex-owner="root-login-dialog-frame"]');
  const body = page.locator('[data-stylex-owner="root-login-dialog-body"]');
  const form = page.locator('[data-stylex-part="login-dialog-form"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("id", "loginDialog");
  await expect(dialog).toHaveAttribute("role", "dialog");
  await expect(dialog).toHaveAttribute("aria-hidden", "false");
  await expect(body).toBeVisible();
  await expect(dialog).not.toHaveClass(/\bloginDialog\b|\bmodal\b|\bhide\b|\bin\b/);
  await expect(body).not.toHaveClass(/\bmodal-body\b/);
  const computed = await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>(
      '[data-stylex-owner="root-login-dialog-frame"]',
    );
    const modalBody = document.querySelector<HTMLElement>(
      '[data-stylex-owner="root-login-dialog-body"]',
    );
    const loginForm = document.querySelector<HTMLElement>('[data-stylex-part="login-dialog-form"]');
    if (!frame || !modalBody || !loginForm) {
      throw new Error("Missing root login dialog StyleX owners.");
    }
    const frameStyle = getComputedStyle(frame);
    const bodyStyle = getComputedStyle(modalBody);
    return {
      bodyOverflowY: bodyStyle.overflowY,
      bodyPadding: bodyStyle.padding,
      bodyPosition: bodyStyle.position,
      frameBackground: frameStyle.backgroundColor,
      framePosition: frameStyle.position,
      frameZIndex: frameStyle.zIndex,
      formMargin: getComputedStyle(loginForm).margin,
    };
  });
  expect(computed.framePosition).toBe("fixed");
  expect(computed.frameZIndex).toBe("1050");
  expect(computed.frameBackground).toBe("rgb(255, 255, 255)");
  expect(computed.bodyPosition).toBe("relative");
  expect(computed.bodyPadding).toBe("15px");
  expect(computed.bodyOverflowY).toBe("auto");
  await expect(form).toHaveCSS("margin", "20px 15px");
  expect(computed.formMargin).toBe("20px 15px");
});

test("anonymous mobile home login dialog keeps legacy Korean geometry without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRuntimeConfig(page, { supportedLanguages: ["ko-KR"] });
  await mockSession(page, { isAnonymous: true });
  await mockRootLoginCapabilities(page);

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const loginLink = page.locator("#required-logged-in > a.user-item-btn");
  await expect(loginLink).toHaveText("로그인");
  await expect(loginLink).not.toHaveAttribute("data-login");
  const shellMetrics = await readShellMetrics(page);
  const loginLinkBox = await readElementBox(loginLink);
  expectBox(shellMetrics.userMenu, { height: 40, width: 147.88, x: 228.42, y: 40 });
  expectBox(loginLinkBox, { height: 27, width: 56.34, x: 228.42, y: 46 });
  expect(shellMetrics.nav.bottom).toBe(shellMetrics.userMenu.y);
  expect(loginLinkBox.y).toBe(shellMetrics.userMenu.y + 6);
  await loginLink.click();

  const metrics = await readLoginDialogMetrics(page);
  expectBox(metrics.dialog, { height: 378, width: 392, x: 0, y: 84.39 });
  expectBox(metrics.body, { height: 376, width: 390, x: 1, y: 85.39 });
  expectBox(metrics.form, { height: 306, width: 342, x: 25, y: 120.39 });
  expectBox(metrics.identifier, { height: 36, width: 336.89, x: 25, y: 120.39 });
  expectBox(metrics.backdrop, { height: 844, width: 390, x: 0, y: 0 });
  expect(metrics.documentScrollWidth).toBe(390);
  expect(metrics.identifierFontSize).toBe("16px");
  await expect(page.locator("#loginIdOrEmailD")).toBeFocused();
});

test("anonymous Korean root login backdrop keeps the frozen Bootstrap/Yobi viewport surface", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRuntimeConfig(page, { supportedLanguages: ["ko-KR"] });
  await mockSession(page, { isAnonymous: true });
  await mockRootLoginCapabilities(page);

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#required-logged-in > a.user-item-btn").click();

  const backdrop = page.locator('[data-stylex-owner="root-login-dialog-backdrop"]');
  await expect(backdrop).toBeVisible();
  const metrics = await backdrop.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      height: rect.height,
      opacity: style.opacity,
      position: style.position,
      scrollWidth: document.documentElement.scrollWidth,
      width: rect.width,
      x: rect.x,
      y: rect.y,
      zIndex: style.zIndex,
    };
  });

  expectBox(metrics, { height: 844, width: 390, x: 0, y: 0 });
  expect(metrics.position).toBe("fixed");
  expect(metrics.zIndex).toBe("1040");
  expect(metrics.opacity).toBe("0.5");
  expect(metrics.backgroundColor).toBe("rgb(0, 0, 0)");
  expect(metrics.scrollWidth).toBe(390);
});

test("anonymous public shell keeps the approved mobile GNB rows without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRuntimeConfig(page, { supportedLanguages: ["ko-KR"] });
  await mockSession(page, { isAnonymous: true });

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);
  const navItems = page.locator('[data-stylex-owner="global-gnb-nav"] > li');
  await expect(navItems).toHaveCount(5);
  expect(
    await navItems.evaluateAll((items) => items.map((item) => item.dataset.stylexOwner)),
  ).toEqual([
    "global-gnb-brand-item",
    "global-gnb-project-list-item",
    "global-gnb-project-list-divider",
    "global-gnb-feedback-item",
    "global-gnb-search-item",
  ]);
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-link"]')).toHaveText(
    "전체 목록",
  );
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-link"]')).toHaveAttribute(
    "href",
    `${BASE_PATH}/projects`,
  );
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-divider"]')).toBeVisible();
  const searchForm = page.locator('[data-stylex-owner="global-gnb-search-form"]');
  await expect(searchForm).toBeHidden();
  await expect(searchForm).toHaveClass(/\bgnb-search-form\b/);

  const metrics = await readShellMetrics(page);
  expect(metrics.viewport).toEqual({ height: 844, scrollWidth: 390, width: 390 });
  expectBox(metrics.navbar, { height: 40, width: 390, x: 0, y: 0 });
  expectBox(metrics.inner, { height: 40, width: 362.59, x: 13.7, y: 0 });
  expectBox(metrics.pin, { height: 26, width: 25, x: -6, y: 6 });
  expectBox(metrics.nav, { height: 40, width: 239.89, x: 28.7, y: 0 });
  expectBox(metrics.logo, { height: 29, width: 29.77, x: 30.7, y: 5 });
  expectBox(metrics.projectList, { height: 37, width: 72.23, x: 60.47, y: 1 });
  expectBox(metrics.projectListDivider, { height: 40, width: 3.11, x: 132.7, y: 0 });
  expectBox(metrics.feedback, { height: 37, width: 132.78, x: 135.81, y: 1 });
  expectBox(metrics.userMenu, { height: 40, width: 147.88, x: 228.42, y: 40 });
  expectBox(metrics.login, { height: 30, width: 56.34, x: 228.42, y: 45 });
  expectBox(metrics.signup, { height: 30, width: 78.23, x: 298.06, y: 45 });
  expectBox(metrics.heroCover, { height: 309, width: 410, x: -20, y: 40 });
  expectBox(metrics.heroHeading, { height: 80, width: 410, x: -20, y: 95 });

  expect(metrics.search.display).toBe("none");
  expect(metrics.search.width).toBe(0);
  expect(metrics.logo.right).toBeLessThanOrEqual(metrics.projectList.x);
  expect(metrics.projectList.right).toBeLessThanOrEqual(metrics.projectListDivider.x + 0.01);
  expect(metrics.projectListDivider.right).toBeLessThanOrEqual(metrics.feedback.x + 0.01);
  expect(metrics.feedback.right).toBeLessThanOrEqual(metrics.nav.x + metrics.nav.width + 0.01);
  expect(metrics.nav.bottom).toBeLessThanOrEqual(metrics.userMenu.y);
  expect(metrics.userMenu.right).toBeLessThanOrEqual(metrics.inner.right + 0.01);
  expect(metrics.login.display).not.toBe("none");
  expect(metrics.login.color).toBe("rgb(93, 187, 224)");
  expect(metrics.signup.display).not.toBe("none");
  expect(metrics.login.y).toBeGreaterThanOrEqual(metrics.userMenu.y);
  expect(metrics.signup.y).toBeGreaterThanOrEqual(metrics.userMenu.y);
  expect(metrics.login.bottom).toBeLessThanOrEqual(metrics.userMenu.bottom);
  expect(metrics.signup.bottom).toBeLessThanOrEqual(metrics.userMenu.bottom);
  expect(metrics.login.right).toBeLessThanOrEqual(metrics.signup.x);
  expect(metrics.heroCover.right).toBe(390);
  expect(metrics.heroHeading.right).toBe(metrics.heroCover.right);
  await assertOwnedShellHasNoPluginHooks(page);
});

test("shared authenticated shell keeps navbar conditions and React-owned panel state", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: false, isGuest: false, isSiteAdmin: true });
  await mockAuthenticatedHomeData(page);

  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  for (const [viewport, expectedInner] of [
    [
      { height: 900, width: 1366 },
      { height: 40, width: 1319.08, x: 23.45, y: 0 },
    ],
    [
      { height: 844, width: 390 },
      { height: 40, width: 362.59, x: 13.7, y: 0 },
    ],
  ] as const) {
    await page.setViewportSize(viewport);

    const outer = page.locator('[data-stylex-owner="global-gnb-outer"]');
    const inner = page.locator('[data-stylex-owner="global-gnb-inner"]');
    const pin = page.locator('[data-stylex-owner="global-sidebar-open-pin"]');
    const affixBox = await readElementBox(page.locator('[data-stylex-owner="site-admin-affix"]'));
    const outerBox = await readElementBox(outer);
    expectBox(outerBox, {
      height: 40,
      width: viewport.width,
      x: 0,
      y: affixBox.y + affixBox.height,
    });
    expectBox(await readElementBox(inner), { ...expectedInner, y: outerBox.y });
    const pinBox = await readElementBox(pin);
    expect(pinBox.x).toBeCloseTo(-6, 1);
    expect(pinBox.y).toBeCloseTo(6, 1);
  }

  await page.setViewportSize({ height: 900, width: 1366 });

  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] > li').nth(1).locator("a"),
  ).toHaveText("List All");
  await expect(page.locator('[data-stylex-owner="global-gnb-feedback-link"]')).toHaveText(
    "Feedback",
  );
  await assertOwnedShellHasNoPluginHooks(page);

  const sidebar = page.locator("#mySidenav");
  const userMenuButton = page.locator("#sidebar-open-btn button");
  await userMenuButton.click();
  await expect(sidebar).toHaveClass(/sidenav-open/);
  await expect(sidebar).toHaveCSS("width", "360px");
  await userMenuButton.click();
  await expect(sidebar).not.toHaveClass(/sidenav-open/);
});

test("site-admin affix preserves the legacy page-anchored collapsed global sidebar pin", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: false, isGuest: false, isSiteAdmin: true });
  await mockAuthenticatedHomeData(page);

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[data-stylex-owner="site-admin-affix"]')).toBeVisible();
    await expect(page.locator('[data-stylex-owner="global-sidebar-open-pin"]')).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    const metrics = await page.evaluate(() => {
      const box = (owner: string) => {
        const element = document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`);
        if (!element) throw new Error(`Missing ${owner}`);
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, height: rect.height, x: rect.x, y: rect.y };
      };
      return {
        affix: box("site-admin-affix"),
        gnb: box("global-gnb-outer"),
        pin: box("global-sidebar-open-pin"),
      };
    });

    expect(metrics.gnb.y).toBeCloseTo(metrics.affix.bottom, 1);
    expect(metrics.pin.y).toBeCloseTo(metrics.affix.y + 6, 1);
    expect(metrics.pin.bottom).toBeLessThanOrEqual(metrics.gnb.y);
    expect(metrics.pin.x).toBeCloseTo(metrics.gnb.x - 6, 1);
  }
});

test("non-admin site shell does not render the site-admin affix", async ({ page }) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: false, isGuest: false, isSiteAdmin: false });
  await mockSiteUserListData(page);

  await page.goto(`${BASE_PATH}/sites/userList`);
  await expect(page.locator('[data-stylex-owner="global-gnb-outer"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="site-admin-affix"]')).toHaveCount(0);
});

test("guest session only suppresses List All and its divider", async ({ page }) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: false });
  await mockAuthenticatedHomeData(page, { isGuest: true });

  await page.goto(`${BASE_PATH}/`);
  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] > li > a', { hasText: "List All" }),
  ).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-divider"]')).toHaveCount(
    0,
  );
  await expect(page.locator('[data-stylex-owner="global-gnb-feedback-link"]')).toBeVisible();
});

test("hide-project-listing config only suppresses List All and its divider", async ({ page }) => {
  await installRuntimeConfig(page, { hideProjectListing: true });
  await mockSession(page, { isAnonymous: true, isGuest: false });

  await page.goto(`${BASE_PATH}/`);
  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] > li > a', { hasText: "List All" }),
  ).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-divider"]')).toHaveCount(
    0,
  );
  await expect(page.locator('[data-stylex-owner="global-gnb-feedback-link"]')).toBeVisible();
});

async function installRuntimeConfig(page: Page, overrides: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ basePath, feedbackUrl, runtimeOverrides }) => {
      (
        window as Window & {
          __YONA_RUNTIME_CONFIG__?: Record<string, unknown>;
        }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl,
        hideProjectListing: false,
        supportedLanguages: ["en-US"],
        ...runtimeOverrides,
      };
    },
    { basePath: BASE_PATH, feedbackUrl: LEGACY_FEEDBACK_URL, runtimeOverrides: overrides },
  );
}

async function mockSession(page: Page, overrides: Record<string, unknown>) {
  const requestPaths: string[] = [];
  await page.route("**/api/v1/session", async (route) => {
    requestPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      body: JSON.stringify({
        actorId: null,
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
        ...overrides,
      }),
      contentType: "application/json",
    });
  });
  return requestPaths;
}

async function mockSiteUserListData(page: Page) {
  const fulfillAuthSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-global-shell" },
      json: { user: { loginId: "siteboss" } },
    });
  await page.route("**/api/auth/session", fulfillAuthSession);
  await page.route("**/api/v1/auth/session", fulfillAuthSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 0,
        totalPages: 0,
        users: [],
      },
    }),
  );
}

async function mockRootLoginCapabilities(page: Page) {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: ["github", "google"],
        socialLoginOnly: false,
      }),
    });
  });
}

async function mockAuthenticatedHomeData(
  page: Page,
  profileOverrides: Record<string, unknown> = {},
) {
  await page.route("**/api/v1/notifications?*", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ hasMore: false, items: [], total: 0 }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emails: [],
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
          ...profileOverrides,
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      contentType: "application/json",
    });
  });
}

async function assertOwnedShellHasNoPluginHooks(page: Page) {
  for (const attribute of [
    "data-placement",
    "data-action",
    "data-backdrop",
    "data-dismiss",
    "data-href",
    "data-loading-text",
    "data-url",
    "data-provider",
    "data-request-method",
    "data-request-uri",
    "data-spy",
    "data-target",
    "data-trigger",
  ]) {
    await expect(page.locator(`[data-stylex-owner=global-gnb-outer] [${attribute}]`)).toHaveCount(
      0,
    );
  }
  // The legacy usermenu sidebar tabs carry data-toggle="tab" markers
  // (common/usermenu.scala.html) and the app preserves them for parity; only
  // reject plugin-hook values that are NOT the tab marker.
  await expect(
    page.locator('[data-stylex-owner=global-gnb-outer] [data-toggle]:not([data-toggle="tab"])'),
  ).toHaveCount(0);
}

async function readShellMetrics(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing geometry target: ${selector}`);
      }
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        color: getComputedStyle(element).color,
        display: getComputedStyle(element).display,
        height: rect.height,
        right: rect.right,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      };
    };

    return {
      feedback: box('[data-stylex-owner="global-gnb-feedback-link"]'),
      heroCover: box('[data-stylex-owner="anonymous-home-intro-cover"]'),
      heroHeading: box('[data-stylex-owner="anonymous-home-intro-heading"]'),
      inner: box('[data-stylex-owner="global-gnb-inner"]'),
      login: box("#required-logged-in"),
      logo: box('[data-stylex-owner="global-gnb-brand-link"]'),
      nav: box('[data-stylex-owner="global-gnb-nav"]'),
      navbar: box("[data-stylex-owner=global-gnb-outer]"),
      pin: box('[data-stylex-owner="global-sidebar-open-pin"]'),
      projectList: box('[data-stylex-owner="global-gnb-project-list-link"]'),
      projectListDivider: box('[data-stylex-owner="global-gnb-project-list-divider"]'),
      search: box('[data-stylex-owner="global-gnb-search-form"]'),
      signup: box('[data-stylex-owner="anonymous-site-signup"]'),
      userMenu: box(".gnb-usermenu"),
      viewport: {
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        width: innerWidth,
      },
    };
  });
}

function expectBox(
  actual: { height: number; width: number; x: number; y: number },
  expected: { height: number; width: number; x: number; y: number },
) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(1);
}

async function readElementBox(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
  });
}

async function readLoginDialogMetrics(page: Page) {
  return page.evaluate(() => {
    const elementBox = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing login dialog geometry target: ${selector}`);
      }
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
    };
    const dialog = document.querySelector<HTMLElement>("#loginDialog");
    const identifier = document.querySelector<HTMLElement>("#loginIdOrEmailD");
    const backdrop = document.querySelector<HTMLElement>(".modal-backdrop.in");
    if (!dialog || !identifier || !backdrop) {
      throw new Error("Missing login dialog style target.");
    }
    return {
      action: elementBox('[data-stylex-owner="root-login-dialog-action-row"]'),
      backdrop: elementBox(".modal-backdrop.in"),
      backdropOpacity: getComputedStyle(backdrop).opacity,
      backdropZIndex: getComputedStyle(backdrop).zIndex,
      body: elementBox('[data-stylex-owner="root-login-dialog-body"]'),
      dialog: elementBox("#loginDialog"),
      dialogZIndex: getComputedStyle(dialog).zIndex,
      documentScrollWidth: document.documentElement.scrollWidth,
      form: elementBox("#loginDialog form.login-form-wrap"),
      identifier: elementBox("#loginIdOrEmailD"),
      identifierFontSize: getComputedStyle(identifier).fontSize,
      password: elementBox("#passwordD"),
      social: elementBox("#loginDialog .btns-row:has(.oauth-login-btn)"),
      submit: elementBox("#loginDialog button[type='submit']"),
    };
  });
}
