import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const RESET_PASSWORD_ROUTE_SOURCE = readFileSync("src/routes/resetPassword.tsx", "utf8");
const HOME_ROUTE_SCREEN_SOURCE = readFileSync("src/routes/-home-route-screen.tsx", "utf8");

const EXPECTED_RESET_PASSWORD_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li>
        <form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div class="search-box">
            <input type="text" name="keyword" autocomplete="off" accesskey="S">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li>
          <li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" id="required-logged-in">
        <a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a>
      </li>
      <li class="divider"></li>
      <li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li>
    </ul>
  </div>
</header>
<div class="page full">
  <div class="center-wrap tag-line-wrap reset-password">
    <h1 class="title">
      Reset password for <span class="highlight">Yona</span>
    </h1>
    <p class="tag-line">Web-based platform for collaborative software development</p>
  </div>
  <div class="login-form-wrap frm-wrap">
    <form action="/resetPassword" method="post" name="passwordReset">
      <input type="hidden" name="hashString" value="reset-token">
      <dl>
        <dd>
          <input id="password" type="password" name="password" class="text password" placeholder="Password" autocomplete="off">
        </dd>
        <dd>
          <input id="retypedPassword" type="password" name="retypedPassword" class="text password" placeholder="Password confirmation" autocomplete="off">
        </dd>
      </dl>
      <div class="btns-row">
        <button type="submit" class="ybtn ybtn-primary ybtn-fullsize">Confirm</button>
      </div>
    </form>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

const EXPECTED_RESET_BAD_REQUEST_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li>
        <form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div class="search-box">
            <input type="text" name="keyword" autocomplete="off" accesskey="S">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li>
          <li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" id="required-logged-in">
        <a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a>
      </li>
      <li class="divider"></li>
      <li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="error-wrap">
      <i class="ico-404"></i>
      <p>Wrong url to reset password.</p>
      <a href="__BASE_PATH__" class="ybtn ybtn-info">Home</a>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

test("reset password form matches legacy user/resetPassword.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/resetPassword?s=reset-token`);
  await expect(page.locator(".page.full")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_RESET_PASSWORD_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopResetPasswordMetrics(page)).toEqual({
    buttonRowMarginBottom: "20px",
    formMarginTop: "54px",
    formWidth: "400px",
    gnbInnerHeight: "40px",
    gnbInnerWidth: 1235,
    gnbOuterBackground: "rgb(27, 27, 27)",
    gnbOuterHeight: "40px",
    logoBackground: "rgb(255, 87, 34)",
    logoLineHeight: "40px",
    logoPadding: "6px 10px",
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px 0px",
    passwordMarginBottom: "15px",
    providerColor: "rgb(51, 51, 51)",
    providerFontSize: "9px",
    providerMarginLeft: "4px",
    tagLineMarginBottom: "26px",
    tagLinePaddingTop: "80px",
    textHeight: "30px",
    textWidth: "386px",
    titleLineHeight: "42px",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileResetPasswordMetrics(page)).toEqual({
    formWidth: "370.5px",
    gnbInnerWidth: 363,
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
    passwordFontSize: "16px",
    passwordInputWidth: "351.969px",
    retypedPasswordFontSize: "16px",
  });
});

test("invalid reset password link matches legacy error/badrequest_default.scala.html shell DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/resetPassword?error=invalid&s=reset-token`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_RESET_BAD_REQUEST_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopResetBadRequestMetrics(page)).toEqual({
    errorIconHeight: "80px",
    errorIconWidth: "50px",
    errorPaddingBottom: "100px",
    errorPaddingTop: "100px",
    errorTextColor: "rgb(137, 137, 137)",
    errorTextFontSize: "16px",
    errorTextFontWeight: "700",
    errorTextMarginBottom: "30px",
    errorTextMarginTop: "30px",
    gnbInnerHeight: "40px",
    gnbInnerWidth: 1235,
    gnbOuterBackground: "rgb(27, 27, 27)",
    gnbOuterHeight: "40px",
    logoBackground: "rgb(255, 87, 34)",
    logoLineHeight: "40px",
    logoPadding: "6px 10px",
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px 0px",
    pageWrapOuterMarginTop: "10px",
    pageWrapOuterMinHeight: "450px",
    projectPageWrapMarginTop: "20px",
    providerFontSize: "9px",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileResetBadRequestMetrics(page)).toEqual({
    errorPaddingTop: "100px",
    errorTextFontSize: "16px",
    gnbInnerWidth: 363,
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
    pageFooterWidth: 370,
    pageWrapOuterMinWidth: "10px",
    pageWrapOuterPadding: "0px",
    pageWrapOuterWidth: 390,
    projectPageWrapMarginTop: "5px",
    projectPageWrapWidth: 390,
  });
});

test("reset password form blocks invalid passwords with legacy left popovers", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let resetCompleteCalls = 0;
  await page.route("**/api/v1/auth/password-reset/complete", async (route) => {
    resetCompleteCalls += 1;
    await route.fulfill({ status: 500, body: "unexpected reset complete" });
  });

  await page.goto(`${basePath}/resetPassword?s=reset-token`);
  await page.locator("#password").focus();
  await page.locator("#password").blur();
  await expectResetPasswordValidationPopovers(page, ["Required field!", "Required field!"]);
  await expectResetPasswordPopoverPlacement(page, "password");

  await page.locator("#password").fill("abc");
  await page.locator("#password").blur();
  await expectResetPasswordValidationPopovers(page, [
    "Password must be at least 4 characters in length.",
    "Required field!",
  ]);

  await page.locator("#password").fill("new-pass");
  await page.locator("#retypedPassword").fill("different");
  await page.locator("#retypedPassword").blur();
  await expectResetPasswordValidationPopovers(page, ["Retyped password doesn't match"]);

  await page.locator('form[name="passwordReset"] button[type="submit"]').click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/resetPassword`);
  expect(new URL(page.url()).searchParams.get("s")).toBe("reset-token");
  expect(resetCompleteCalls).toBe(0);
});

test("reset password error home link is SPA navigation with legacy rendered href", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/resetPassword?error=invalid&s=reset-token`);

  const homeLink = page.locator(".error-wrap .ybtn-info", { hasText: "Home" });
  await expect(homeLink).toHaveAttribute("href", basePath);
  await expect(homeLink).toHaveText("Home");

  await page.evaluate(() => {
    (window as typeof window & { __resetPasswordSpaMarker?: string }).__resetPasswordSpaMarker =
      "home-link";
  });
  await homeLink.click();

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toMatch(new RegExp(`^${escapeRegExp(basePath)}/?$`, "u"));
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __resetPasswordSpaMarker?: string })
            .__resetPasswordSpaMarker,
      ),
    )
    .toBe("home-link");
});

test("reset password route keeps route-local internal anchors on TanStack Link", () => {
  expect(RESET_PASSWORD_ROUTE_SOURCE).not.toMatch(/<a\s[^>]*href=\{?prefixBasePath/u);
  expect(RESET_PASSWORD_ROUTE_SOURCE).not.toMatch(/<a\s[^>]*href=(?:["'`]\s*\/|\{["'`]\s*\/)/u);
  expect(RESET_PASSWORD_ROUTE_SOURCE).not.toContain(["use", "Link", "Props"].join(""));
  expect(RESET_PASSWORD_ROUTE_SOURCE).not.toContain(["Legacy", "Href", "Anchor"].join(""));
  expect(RESET_PASSWORD_ROUTE_SOURCE).not.toContain(["React", "createElement"].join("."));
  expect(RESET_PASSWORD_ROUTE_SOURCE).not.toContain(["forward", "Ref"].join(""));
  expect(RESET_PASSWORD_ROUTE_SOURCE).toContain(
    'const homeHref = prefixBasePath(runtimeConfig.basePath, "")',
  );
  expect(RESET_PASSWORD_ROUTE_SOURCE).toContain("function ResetPasswordRootLinkAnchor({");
  expect(RESET_PASSWORD_ROUTE_SOURCE).toContain(
    "const ResetPasswordRootLink = createLink(ResetPasswordRootLinkAnchor);",
  );
  expect(RESET_PASSWORD_ROUTE_SOURCE).toContain("legacyRootHref={homeHref}");
  expect(RESET_PASSWORD_ROUTE_SOURCE).toContain('to="/"');
  expect(RESET_PASSWORD_ROUTE_SOURCE).toContain("router.history.push(homeHref);");
});

test("reset password shared site shell keeps legacy navbar and login-link attributes", () => {
  expect(HOME_ROUTE_SCREEN_SOURCE).toContain(
    'const legacyHomeHref = prefixBasePath(runtimeConfig.basePath, "/");',
  );
  expect(HOME_ROUTE_SCREEN_SOURCE).toContain("function LegacyLogoLinkAnchor({");
  expect(HOME_ROUTE_SCREEN_SOURCE).toContain(
    "const LegacyLogoLink = createLink(LegacyLogoLinkAnchor);",
  );
  expect(HOME_ROUTE_SCREEN_SOURCE).toContain("ref?: React.Ref<HTMLAnchorElement>;");
  expect(HOME_ROUTE_SCREEN_SOURCE).toContain(
    'return reactJsx("a", { ...props, ref, href: legacyHref });',
  );
  expect(HOME_ROUTE_SCREEN_SOURCE).toContain("<LegacyLogoLink");
  expect(HOME_ROUTE_SCREEN_SOURCE).toContain("legacyHref={legacyHomeHref}");
  expect(HOME_ROUTE_SCREEN_SOURCE).not.toContain(["use", "Link", "Props"].join(""));
  expect(HOME_ROUTE_SCREEN_SOURCE).not.toContain(["Legacy", "Href", "Anchor"].join(""));
  expect(HOME_ROUTE_SCREEN_SOURCE).not.toContain(["React", "createElement"].join("."));
  expect(HOME_ROUTE_SCREEN_SOURCE).not.toContain(["forward", "Ref"].join(""));
  expect(HOME_ROUTE_SCREEN_SOURCE).toContain('data-login="required"');
});

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
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
        "accesskey",
        "placeholder",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
        "data-login",
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

    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .page.full, .page-wrap-outer, .page-footer-outer",
      ),
    );
    return roots.map((root) => visit(root)).join("");
  });
}

async function readDesktopResetPasswordMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const tagLineWrap = document.querySelector<HTMLElement>(".tag-line-wrap.reset-password");
    const title = document.querySelector<HTMLElement>(".tag-line-wrap .title");
    const formWrap = document.querySelector<HTMLElement>(".login-form-wrap");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    const buttonRow = document.querySelector<HTMLElement>(".login-form-wrap .btns-row");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !tagLineWrap ||
      !title ||
      !formWrap ||
      !passwordInput ||
      !buttonRow ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected reset-password metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const tagLineWrapStyle = getComputedStyle(tagLineWrap);
    const formWrapStyle = getComputedStyle(formWrap);
    const passwordInputStyle = getComputedStyle(passwordInput);
    const buttonRowStyle = getComputedStyle(buttonRow);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      buttonRowMarginBottom: buttonRowStyle.marginBottom,
      formMarginTop: formWrapStyle.marginTop,
      formWidth: formWrapStyle.width,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      passwordMarginBottom: passwordInputStyle.marginBottom,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      tagLineMarginBottom: tagLineWrapStyle.marginBottom,
      tagLinePaddingTop: tagLineWrapStyle.paddingTop,
      textHeight: passwordInputStyle.height,
      textWidth: passwordInputStyle.width,
      titleLineHeight: getComputedStyle(title).lineHeight,
    };
  });
}

async function readMobileResetPasswordMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const formWrap = document.querySelector<HTMLElement>(".login-form-wrap");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    const retypedPasswordInput = document.querySelector<HTMLElement>("#retypedPassword");
    if (
      !gnbOuter ||
      !gnbInner ||
      !formWrap ||
      !pageFooterOuter ||
      !passwordInput ||
      !retypedPasswordInput
    ) {
      throw new Error("Expected mobile reset-password metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const passwordStyle = getComputedStyle(passwordInput);
    return {
      formWidth: getComputedStyle(formWrap).width,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      pageFooterOuterMinWidth: pageFooterOuterStyle.minWidth,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      passwordFontSize: passwordStyle.fontSize,
      passwordInputWidth: passwordStyle.width,
      retypedPasswordFontSize: getComputedStyle(retypedPasswordInput).fontSize,
    };
  });
}

async function readDesktopResetBadRequestMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const projectPageWrap = document.querySelector<HTMLElement>(".project-page-wrap");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const errorIcon = document.querySelector<HTMLElement>(".error-wrap .ico-404");
    const errorText = document.querySelector<HTMLElement>(".error-wrap p");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !pageWrapOuter ||
      !projectPageWrap ||
      !errorWrap ||
      !errorIcon ||
      !errorText ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected reset bad-request metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const errorWrapStyle = getComputedStyle(errorWrap);
    const errorIconStyle = getComputedStyle(errorIcon);
    const errorTextStyle = getComputedStyle(errorText);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);

    return {
      errorIconHeight: errorIconStyle.height,
      errorIconWidth: errorIconStyle.width,
      errorPaddingBottom: errorWrapStyle.paddingBottom,
      errorPaddingTop: errorWrapStyle.paddingTop,
      errorTextColor: errorTextStyle.color,
      errorTextFontSize: errorTextStyle.fontSize,
      errorTextFontWeight: errorTextStyle.fontWeight,
      errorTextMarginBottom: errorTextStyle.marginBottom,
      errorTextMarginTop: errorTextStyle.marginTop,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      projectPageWrapMarginTop: getComputedStyle(projectPageWrap).marginTop,
      providerFontSize: getComputedStyle(provider).fontSize,
    };
  });
}

async function readMobileResetBadRequestMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const projectPageWrap = document.querySelector<HTMLElement>(".project-page-wrap");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const errorText = document.querySelector<HTMLElement>(".error-wrap p");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    if (
      !gnbOuter ||
      !gnbInner ||
      !pageWrapOuter ||
      !projectPageWrap ||
      !errorWrap ||
      !errorText ||
      !pageFooter ||
      !pageFooterOuter
    ) {
      throw new Error("Expected mobile reset bad-request metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const projectPageWrapStyle = getComputedStyle(projectPageWrap);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);

    return {
      errorPaddingTop: getComputedStyle(errorWrap).paddingTop,
      errorTextFontSize: getComputedStyle(errorText).fontSize,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      pageFooterOuterMinWidth: pageFooterOuterStyle.minWidth,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageFooterWidth: Math.round(pageFooter.getBoundingClientRect().width),
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      pageWrapOuterPadding: pageWrapOuterStyle.padding,
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      projectPageWrapMarginTop: projectPageWrapStyle.marginTop,
      projectPageWrapWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
    };
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      const elements = Array.from(template.content.children);
      if (elements.length === 0) {
        throw new Error("Expected reset-password screen markup is empty.");
      }
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
          "accesskey",
          "placeholder",
          "href",
          "target",
          "title",
          "data-toggle",
          "data-placement",
          "data-login",
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

      return elements.map((element) => visit(element)).join("");
    },
    { markup: html },
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectResetPasswordValidationPopovers(page: Page, messages: string[]) {
  const popovers = page.locator('form[name="passwordReset"] .popover.left.in .popover-content');
  await expect(popovers).toHaveText(messages);
}

async function expectResetPasswordPopoverPlacement(
  page: Page,
  fieldName: "password" | "retypedPassword",
) {
  const boxes = await page.evaluate((name) => {
    const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    const popover = input?.parentElement?.querySelector<HTMLElement>(".popover.left.in");
    const formWrap = document.querySelector<HTMLElement>(".login-form-wrap");
    if (!input || !popover || !formWrap) return null;
    const inputBox = input.getBoundingClientRect();
    const popoverBox = popover.getBoundingClientRect();
    const formBox = formWrap.getBoundingClientRect();
    return {
      formLeft: formBox.left,
      inputLeft: inputBox.left,
      inputMiddle: inputBox.top + inputBox.height / 2,
      popoverMiddle: popoverBox.top + popoverBox.height / 2,
      popoverRight: popoverBox.right,
    };
  }, fieldName);

  expect(boxes).not.toBeNull();
  expect(boxes!.popoverRight).toBeLessThanOrEqual(boxes!.inputLeft - 8);
  expect(boxes!.popoverMiddle).toBeCloseTo(boxes!.inputMiddle, 0);
  expect(boxes!.popoverRight).toBeLessThan(boxes!.formLeft + 10);
}
