import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

test("auth aliases redirect to canonical legacy public routes", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);
  await expect(
    page.locator(`.login-form-wrap form[action='${basePath}/users/login']`),
  ).toBeVisible();
  const loginRoots = await canonicalizeAuthPublicRoots(page);

  await page.goto(`${basePath}/login?redirectUrl=/me`);
  await expect(page).toHaveURL(/\/users\/loginform\?redirectUrl=/u);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/users/loginform`);
  expect(new URL(page.url()).searchParams.get("redirectUrl")).toBe("/me");
  await expect(
    page.locator(`.login-form-wrap form[action='${basePath}/users/login']`),
  ).toBeVisible();
  expect(await canonicalizeAuthPublicRoots(page)).toEqual(loginRoots);

  await page.goto(`${basePath}/users/signupform`);
  await expect(page.locator(".signup-form-wrap form[name='signup']")).toBeVisible();
  const signupRoots = await canonicalizeAuthPublicRoots(page);

  await page.goto(`${basePath}/register`);
  await expect(page).toHaveURL(new RegExp(`${basePath}/users/signupform$`, "u"));
  await expect(page.locator(".signup-form-wrap form[name='signup']")).toBeVisible();
  expect(await canonicalizeAuthPublicRoots(page)).toEqual(signupRoots);

  await page.goto(`${basePath}/lostPassword?requested=1`);
  await expect(page.locator('[data-stylex-owner="lost-password-success-alert"]')).toBeVisible();
  const lostPasswordRoots = await canonicalizeAuthPublicRoots(page);

  await page.goto(`${basePath}/forgot-password?requested=1`);
  await expect(page).toHaveURL(/\/lostPassword/u);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/lostPassword`);
  await expect(page.locator('[data-stylex-owner="lost-password-success-alert"]')).toBeVisible();
  await expect(
    page.locator(`.login-form-wrap form[action='${basePath}/lostPassword']`),
  ).toBeVisible();
  expect(await canonicalizeAuthPublicRoots(page)).toEqual(lostPasswordRoots);

  await page.goto(`${basePath}/resetPassword?s=reset-token`);
  await expect(page.locator("form[name='passwordReset'] input[name='hashString']")).toHaveValue(
    "reset-token",
  );
  const resetPasswordRoots = await canonicalizeAuthPublicRoots(page);

  await page.goto(`${basePath}/reset-password?s=reset-token`);
  await expect(page).toHaveURL(/\/resetPassword/u);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/resetPassword`);
  await expect(page.locator("form[name='passwordReset'] input[name='hashString']")).toHaveValue(
    "reset-token",
  );
  expect(await canonicalizeAuthPublicRoots(page)).toEqual(resetPasswordRoots);
});

test("invalid credentials render the translated login error, not the raw message key", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/users/loginform`);
  await page.fill("#loginIdOrEmailD", "no-such-user");
  await page.fill("#password", "wrong-password");
  await page.click(`.login-form-wrap form[action='${basePath}/users/login'] button[type='submit']`);
  // The server returns the legacy message KEY (user.login.invalid); the form
  // must translate it via the i18n dictionary, never display the key itself.
  // The managed e2e context defaults to en-US, so the en dictionary value is
  // the deterministic expectation (ko-KR renders the Korean copy instead).
  await expect(page.locator(".error-message")).toHaveText(
    "Your log in ID, E-mail or password is not valid.",
  );
});

test("legacy GET /users/login renders the index screen at the original URL", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/`);
  await expect(page.locator(".siteintro-bg")).toBeVisible();
  const canonicalTitle = await page.title();
  const canonicalIndexRoots = await canonicalizeIndexRoots(page);
  const canonicalIndexMetrics = await readDesktopIndexMetrics(page);

  await page.goto(`${basePath}/users/login?from=legacy`);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/users/login`);
  expect(new URL(page.url()).searchParams.get("from")).toBe("legacy");
  await expect(page).toHaveTitle(canonicalTitle);
  // wtr-compat has no Locator.allTextContents (bucket-1 gap); evaluateAll is
  // the equivalent supported API.
  expect(
    await page.locator("head title").evaluateAll((els) => els.map((el) => el.textContent ?? "")),
  ).toContain(canonicalTitle);
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".siteintro-bg")).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="anonymous-home-intro-signup-link"]'),
  ).toHaveAttribute("href", `${basePath}/users/signupform`);
  expect(await canonicalizeIndexRoots(page)).toEqual(canonicalIndexRoots);
  expect(await readDesktopIndexMetrics(page)).toEqual(canonicalIndexMetrics);
});

test("legacy GET /users/login title source renders React metadata without imperative document mutation", async () => {
  const source = readFileSync("src/routes/users/login.tsx", "utf8");

  expect(source).toContain('<title>{runtimeConfig.siteName ?? "Yoram"}</title>');
  expect(source).toContain('<HomeRouteScreen routePath="/users/login"');
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).not.toContain("window.document");
  expect(source).not.toMatch(/use(?:Layout)?Effect\s*\([^)]*title/isu);
  expect(source).not.toMatch(/querySelector\s*\([^)]*title/isu);
});

test("legacy GET /users/login keeps the public index mobile proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/`);
  await expect(page.locator(".siteintro-bg")).toBeVisible();
  const canonicalIndexRoots = await canonicalizeIndexRoots(page);
  const canonicalIndexMetrics = await readMobileIndexMetrics(page);

  await page.goto(`${basePath}/users/login?from=legacy`);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/users/login`);
  expect(new URL(page.url()).searchParams.get("from")).toBe("legacy");
  await expect(page.locator(".siteintro-bg")).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="anonymous-home-intro-signup-link"]'),
  ).toHaveAttribute("href", `${basePath}/users/signupform`);
  expect(await canonicalizeIndexRoots(page)).toEqual(canonicalIndexRoots);
  expect(await readMobileIndexMetrics(page)).toEqual(canonicalIndexMetrics);
});

test("root not-found shell source uses Link semantics for legacy navigation anchors", async () => {
  const source = readFileSync("src/routes/__root.tsx", "utf8");
  const legacySources = [
    "../yona-original/app/views/siteLayout.scala.html",
    "../yona-original/app/views/layout.scala.html",
    "../yona-original/app/views/error/notfound_default.scala.html",
    "../yona-original/app/views/common/footer.scala.html",
    "../yona-original/app/views/common/usermenu.scala.html",
  ].map((path) => readFileSync(path, "utf8"));
  const legacyShellSource = legacySources.join("\n");
  expect(legacyShellSource).toContain("@common.usermenu()");
  expect(legacyShellSource).toContain("@common.footer()");
  expect(legacyShellSource).toContain("@routes.ProjectApp.projects()");
  expect(legacyShellSource).toContain("@routes.UserApp.loginForm()");
  expect(legacyShellSource).toContain("@routes.UserApp.signupForm()");
  expect(legacyShellSource).toContain('href="http://navercorp.com/"');
  expect(source).not.toContain("as never");
  expect(source).toContain('to="/projects"');
  expect(source).toContain('const loginFormPath: string = "/users/loginform";');
  expect(source).toContain("to={loginFormPath}");
  expect(source).toContain('const signupFormPath: string = "/users/signupform";');
  expect(source).toContain("to={signupFormPath}");
  expect(source).toContain('to="/user/editform"');
  expect(source).toContain("to={logoutPath}");
  expect(source).toContain('to="/$user"');
  expect(source).toContain("<RootYoramToast");
  expect(source).not.toContain("toast.innerHTML");
  expect(source).toContain('<span className="provider">');
  expect(source).toContain("Yona authors");
  expect(source).not.toContain("github.com/nforge/yobi");
  expect(source).toContain("https://navercorp.com");
  expect(source).not.toContain("developers.naver.com");
  expect(source).not.toContain('to="/logout"');
  expect(source).not.toContain('<a href="/projects"');
  expect(source).not.toContain('<a href="/logout"');
  expect(source).not.toContain('<a href="/users/loginform"');
  expect(source).not.toContain('<a href="/users/signupform"');
  expect(source).not.toContain('className="user-item-btn"\n                data-login="required"');
});

async function canonicalizeIndexRoots(page: Page) {
  return canonicalizeRoots(
    page,
    ".unsupported, [data-stylex-owner=global-gnb-outer], .siteintro-bg, [data-stylex-owner=site-footer]",
    true,
  );
}

async function canonicalizeAuthPublicRoots(page: Page) {
  return canonicalizeRoots(
    page,
    ".unsupported, [data-stylex-owner=global-gnb-outer], .page.full, [data-stylex-owner=site-footer]",
  );
}

async function canonicalizeRoots(page: Page, selector: string, stripBrandActive = false) {
  return page.evaluate(
    ({ rootSelector, stripBrandActive }) => {
      const roots = Array.from(document.querySelectorAll(rootSelector));
      return roots.map((root) => visit(root)).join("");

      function visit(current: Element): string {
        const stableAttributes = [
          "id",
          "class",
          "name",
          "type",
          "method",
          "action",
          "value",
          "autocomplete",
          "placeholder",
          "href",
          "target",
          "title",
          "data-toggle",
          "data-placement",
          "data-dismiss",
          "for",
          "checked",
          "required",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => `${name}=${JSON.stringify(normalizeAttribute(current, name))}`)
          .join(" ");
        const open = attrs
          ? `<${current.tagName.toLowerCase()} ${attrs}>`
          : `<${current.tagName.toLowerCase()}>`;
        const children = Array.from(current.childNodes)
          .map((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              return (child.textContent ?? "").replace(/\s+/g, " ").trim();
            }
            if (child.nodeType === Node.ELEMENT_NODE) {
              return visit(child as Element);
            }
            return "";
          })
          .filter(Boolean)
          .join("");

        return `${open}${children}</${current.tagName.toLowerCase()}>`;
      }

      function normalizeAttribute(current: Element, name: string) {
        if (name === "class") {
          return (current.getAttribute(name) ?? "")
            .split(/\s+/u)
            .filter(
              (value, index, values) =>
                value &&
                !(
                  stripBrandActive &&
                  current.matches('[data-stylex-owner="global-gnb-brand-link"]') &&
                  value === "active"
                ) &&
                values.indexOf(value) === index,
            )
            .join(" ");
        }
        return current.getAttribute(name) ?? "";
      }
    },
    { rootSelector: selector, stripBrandActive },
  );
}

async function readDesktopIndexMetrics(page: Page) {
  return page.evaluate(() => {
    const siteIntroCover = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-intro-cover"]',
    );
    const gnbOuter = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const gnbInner = document.querySelector<HTMLElement>('[data-stylex-owner="global-gnb-inner"]');
    const logo = document.querySelector<HTMLElement>('[data-stylex-owner="global-gnb-brand-link"]');
    const heading = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-intro-heading"]',
    );
    const signup = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-intro-signup"]',
    );
    const feature = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-feature"]',
    );
    const featureItem = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-feature-item"]',
    );
    const featureIcon = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-feature-icon"]',
    );
    const featureInfo = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-feature-info"]',
    );
    const pageFooter = document.querySelector<HTMLElement>("[data-stylex-owner=site-footer-inner]");
    const pageFooterOuter = document.querySelector<HTMLElement>("[data-stylex-owner=site-footer]");
    const provider = document.querySelector<HTMLElement>(
      "[data-stylex-owner=site-footer-provider]",
    );
    if (
      !siteIntroCover ||
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !heading ||
      !signup ||
      !feature ||
      !featureItem ||
      !featureIcon ||
      !featureInfo ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected legacy index metric targets are missing.");
    }

    const siteIntroCoverStyle = getComputedStyle(siteIntroCover);
    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const featureStyle = getComputedStyle(feature);
    const featureItemStyle = getComputedStyle(featureItem);
    const featureIconStyle = getComputedStyle(featureIcon);
    const featureInfoStyle = getComputedStyle(featureInfo);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      featureIconFontSize: featureIconStyle.fontSize,
      featureIconLeft: featureIconStyle.left,
      featureIconTop: featureIconStyle.top,
      featureInfoHeight: featureInfoStyle.height,
      featureInfoMarginLeft: featureInfoStyle.marginLeft,
      featureItemMarginLeft: featureItemStyle.marginLeft,
      featureItemWidth: featureItemStyle.width,
      featureMaxWidth: featureStyle.maxWidth,
      headingFontSize: getComputedStyle(heading).fontSize,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      signupMarginTop: getComputedStyle(signup).marginTop,
      siteIntroCoverPaddingBottom: siteIntroCoverStyle.paddingBottom,
      siteIntroCoverPaddingTop: siteIntroCoverStyle.paddingTop,
      siteIntroCoverWidth: Math.round(siteIntroCover.getBoundingClientRect().width),
    };
  });
}

async function readMobileIndexMetrics(page: Page) {
  return page.evaluate(() => {
    const siteIntroCover = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-intro-cover"]',
    );
    const gnbOuter = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const heading = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-intro-heading"]',
    );
    const featureWrap = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-feature-list"]',
    );
    const featureItem = document.querySelector<HTMLElement>(
      '[data-stylex-owner="anonymous-home-feature-item"]',
    );
    const pageFooter = document.querySelector<HTMLElement>("[data-stylex-owner=site-footer-inner]");
    const pageFooterOuter = document.querySelector<HTMLElement>("[data-stylex-owner=site-footer]");
    const provider = document.querySelector<HTMLElement>(
      "[data-stylex-owner=site-footer-provider]",
    );
    if (
      !siteIntroCover ||
      !gnbOuter ||
      !heading ||
      !featureWrap ||
      !featureItem ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected legacy mobile index metric targets are missing.");
    }

    const siteIntroCoverStyle = getComputedStyle(siteIntroCover);
    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const headingStyle = getComputedStyle(heading);
    const featureItemStyle = getComputedStyle(featureItem);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      featureItemMarginLeft: featureItemStyle.marginLeft,
      featureItemMarginTop: featureItemStyle.marginTop,
      featureItemWidth: Math.round(featureItem.getBoundingClientRect().width),
      featureWrapWidth: Math.round(featureWrap.getBoundingClientRect().width),
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      headingFontSize: headingStyle.fontSize,
      headingPaddingLeft: headingStyle.paddingLeft,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterMinWidth: pageFooterOuterStyle.minWidth,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageFooterWidth: Math.round(pageFooter.getBoundingClientRect().width),
      providerFontSize: providerStyle.fontSize,
      siteIntroCoverOverflow: siteIntroCoverStyle.overflow,
      siteIntroCoverWidth: Math.round(siteIntroCover.getBoundingClientRect().width),
    };
  });
}
