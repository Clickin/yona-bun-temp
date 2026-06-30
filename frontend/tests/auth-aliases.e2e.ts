import { expect, test, type Page } from "@playwright/test";

test("auth aliases redirect to canonical legacy public routes", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);
  await expect(page.locator(".login-form-wrap form[action='/users/login']")).toBeVisible();
  const loginRoots = await canonicalizeAuthPublicRoots(page);

  await page.goto(`${basePath}/login?redirectUrl=/me`);
  await expect(page).toHaveURL(/\/users\/loginform\?redirectUrl=/u);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/users/loginform`);
  expect(new URL(page.url()).searchParams.get("redirectUrl")).toBe("/me");
  await expect(page.locator(".login-form-wrap form[action='/users/login']")).toBeVisible();
  expect(await canonicalizeAuthPublicRoots(page)).toEqual(loginRoots);

  await page.goto(`${basePath}/users/signupform`);
  await expect(page.locator(".signup-form-wrap form[name='signup']")).toBeVisible();
  const signupRoots = await canonicalizeAuthPublicRoots(page);

  await page.goto(`${basePath}/register`);
  await expect(page).toHaveURL(new RegExp(`${basePath}/users/signupform$`, "u"));
  await expect(page.locator(".signup-form-wrap form[name='signup']")).toBeVisible();
  expect(await canonicalizeAuthPublicRoots(page)).toEqual(signupRoots);

  await page.goto(`${basePath}/lostPassword?requested=1`);
  await expect(page.locator(".alert.alert-success")).toBeVisible();
  const lostPasswordRoots = await canonicalizeAuthPublicRoots(page);

  await page.goto(`${basePath}/forgot-password?requested=1`);
  await expect(page).toHaveURL(/\/lostPassword/u);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/lostPassword`);
  await expect(page.locator(".alert.alert-success")).toBeVisible();
  await expect(page.locator(".login-form-wrap form[action='/lostPassword']")).toBeVisible();
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

test("legacy GET /users/login renders the index screen at the original URL", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/`);
  await expect(page.locator(".siteintro-bg")).toBeVisible();
  const canonicalIndexRoots = await canonicalizeIndexRoots(page);
  const canonicalIndexMetrics = await readDesktopIndexMetrics(page);

  await page.goto(`${basePath}/users/login?from=legacy`);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/users/login`);
  expect(new URL(page.url()).searchParams.get("from")).toBe("legacy");
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator(".siteintro-bg")).toBeVisible();
  await expect(page.locator(".signup-btn a")).toHaveAttribute(
    "href",
    `${basePath}/users/signupform`,
  );
  expect(await canonicalizeIndexRoots(page)).toEqual(canonicalIndexRoots);
  expect(await readDesktopIndexMetrics(page)).toEqual(canonicalIndexMetrics);
});

async function canonicalizeIndexRoots(page: Page) {
  return canonicalizeRoots(page, ".unsupported, .gnb-outer, .siteintro-bg, .page-footer-outer");
}

async function canonicalizeAuthPublicRoots(page: Page) {
  return canonicalizeRoots(page, ".unsupported, .gnb-outer, .page.full, .page-footer-outer");
}

async function canonicalizeRoots(page: Page, selector: string) {
  return page.evaluate((rootSelector) => {
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
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
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
  }, selector);
}

async function readDesktopIndexMetrics(page: Page) {
  return page.evaluate(() => {
    const siteIntroCover = document.querySelector<HTMLElement>(".siteintro-cover");
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const heading = document.querySelector<HTMLElement>(".site-heading");
    const signup = document.querySelector<HTMLElement>(".signup-btn");
    const feature = document.querySelector<HTMLElement>(".feature");
    const featureItem = document.querySelector<HTMLElement>(".feature-wrap li");
    const featureIcon = document.querySelector<HTMLElement>(".feature-image");
    const featureInfo = document.querySelector<HTMLElement>(".feature-info");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
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
