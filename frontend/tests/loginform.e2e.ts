import { expect, test, type Page } from "@playwright/test";

const EXPECTED_LOGIN_SCREEN = `
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
          <li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li>
          <li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li>
          <li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>
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
  <div class="center-wrap tag-line-wrap login">
    <h1 class="title">
      Log in to <span class="highlight">Yona</span>
    </h1>
    <p class="tag-line">Web-based platform for collaborative software development</p>
  </div>
  <div class="login-form-wrap frm-wrap">
    __EMAIL_VERIFICATION_HELP__
    <form action="/users/login" method="POST">
      <input type="hidden" name="redirectUrl" value="__REDIRECT_URL__">
      __FORM_BODY__
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

const DEFAULT_FORM_BODY = `
      <dl>
        <dd>
          <input id="loginIdOrEmailD" name="loginIdOrEmail" type="text" class="text email" autocomplete="off" placeholder="__LOGIN_PLACEHOLDER__">
        </dd>
        <dd>
          <input id="password" name="password" type="password" class="text password" autocomplete="off" placeholder="__PASSWORD_PLACEHOLDER__">
        </dd>
      </dl>
      <div class="btns-row">
        <button type="submit" class="ybtn ybtn-primary ybtn-large ybtn-fullsize">Log in</button>
      </div>
      <div class="btns-row nm"></div>
      <div class="act-row mt5">
        <div class="remember-me-wrap pull-left">
          <input id="remember-me" type="checkbox" name="rememberMe" class="checkbox" checked>
          <label for="remember-me" class="bg-checkbox">Stay logged in</label>
        </div>
        <div class="links-wrap pull-right">
          <a href="__BASE_PATH__/lostPassword">Password forgotten?</a>
        </div>
      </div>
`;

const SOCIAL_ONLY_FORM_BODY = `
      <div class="btns-row nm">
        Only allow sign-in via social login
      </div>
      <div class="btns-row nm">
        <a href="__BASE_PATH__/authenticate/github" class="ybtn oauth-login-btn"><span class="auth-provider-logo"><span class="github"><svg aria-hidden="true" height="24" version="1.1" viewBox="0 0 16 16" width="19"><path></path></svg></span> <span class="provider-name">Sign in with github</span></span></a>
        <a href="__BASE_PATH__/authenticate/google" class="ybtn oauth-login-btn"><span class="auth-provider-logo"><img src="__BASE_PATH__/assets/images/provider-logo/btn_google_light_normal_ios.svg" alt="login with Google"> Sign in with Google</span></a>
      </div>
`;

const SOCIAL_PROVIDERS_FORM_BODY = `
      <dl>
        <dd>
          <input id="loginIdOrEmailD" name="loginIdOrEmail" type="text" class="text email" autocomplete="off" placeholder="__LOGIN_PLACEHOLDER__">
        </dd>
        <dd>
          <input id="password" name="password" type="password" class="text password" autocomplete="off" placeholder="__PASSWORD_PLACEHOLDER__">
        </dd>
      </dl>
      <div class="btns-row">
        <button type="submit" class="ybtn ybtn-primary ybtn-large ybtn-fullsize">Log in</button>
      </div>
      <div class="btns-row nm">
        <div class="social-login-title-line"> or </div>
        <a href="__BASE_PATH__/authenticate/github" class="ybtn oauth-login-btn"><span class="auth-provider-logo"><span class="github"><svg aria-hidden="true" height="24" version="1.1" viewBox="0 0 16 16" width="19"><path></path></svg></span> <span class="provider-name">Sign in with github</span></span></a>
        <a href="__BASE_PATH__/authenticate/google" class="ybtn oauth-login-btn"><span class="auth-provider-logo"><img src="__BASE_PATH__/assets/images/provider-logo/btn_google_light_normal_ios.svg" alt="login with Google"> Sign in with Google</span></a>
      </div>
      <div class="act-row mt5">
        <div class="remember-me-wrap pull-left">
          <input id="remember-me" type="checkbox" name="rememberMe" class="checkbox" checked>
          <label for="remember-me" class="bg-checkbox">Stay logged in</label>
        </div>
        <div class="links-wrap pull-right">
          <a href="__BASE_PATH__/lostPassword">Password forgotten?</a>
        </div>
      </div>
`;

const EMAIL_VERIFICATION_HELP = `
    <div class="email-verification-help">If you are trying to login for the first time, a confirmation mail will be sent.</div>
`;

test("anonymous login form matches legacy user/login.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page.locator(".page.full")).toBeVisible();
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(page, expectedLoginScreen(basePath, defaultFormBody()));

  expect(actual).toEqual(expected);
  expect(await readDesktopLoginMetrics(page)).toEqual({
    actRowLineHeight: "22px",
    buttonRowMarginBottom: "20px",
    checkboxMarginLeft: "0px",
    checkboxMarginTop: "4px",
    formMarginTop: "54px",
    formWidth: "400px",
    gnbInnerHeight: "40px",
    gnbInnerWidth: 1254,
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
    textMarginBottom: "10px",
    textWidth: "386px",
    titleLineHeight: "42px",
  });
  expect(await readDialogMetrics(page)).toEqual({
    borderColor: "rgb(190, 190, 190)",
    borderRadius: "0px",
    borderWidth: "10px",
    descColor: "rgb(85, 85, 85)",
    descFontSize: "14px",
    descFontWeight: "400",
    descLineHeight: "21px",
    descMargin: "20px 0px 25px",
    descTextAlign: "center",
    dismissButtonBackground: "rgba(0, 0, 0, 0)",
    dismissButtonBorder: "0px none rgb(137, 137, 137)",
    dismissButtonColor: "rgb(137, 137, 137)",
    dismissButtonFontSize: "24px",
    dismissButtonFontWeight: "700",
    dismissClear: "both",
    dismissDisplay: "block",
    dismissPadding: "0px",
    dismissTextAlign: "right",
    dismissWidth: "100%",
    messageFontSize: "18px",
    messageFontWeight: "700",
    messageLineHeight: "27px",
    messageMarginBottom: "20px",
    messageTextAlign: "center",
    padding: "16px 20px",
    width: "500px",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileLoginMetrics(page)).toEqual({
    formWidth: "370.5px",
    gnbInnerWidth: 363,
    gnbOuterPadding: "0px 10px",
    loginInputWidth: "351.969px",
    passwordInputWidth: "351.969px",
  });
  expect(await readDialogMetrics(page)).toMatchObject({
    padding: "5px",
    width: "85%",
  });
  await expect(page.locator(".links-wrap a")).toHaveAttribute("href", `${basePath}/lostPassword`);
});

test("social-login-only form matches legacy user/login.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {
    enabledSocialProviders: ["github", "google"],
    socialLoginOnly: true,
  });
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page.locator(".oauth-login-btn")).toHaveCount(2);
  await expect(page.locator("#loginIdOrEmailD")).toHaveCount(0);
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedLoginScreen(basePath, SOCIAL_ONLY_FORM_BODY),
  );

  expect(actual).toEqual(expected);
});

test("configured social provider login form matches legacy user/login.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {
    enabledSocialProviders: ["github", "google"],
    socialLoginOnly: false,
  });
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page.locator(".oauth-login-btn")).toHaveCount(2);
  await expect(page.locator(".social-login-title-line")).toHaveText("or");
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedLoginScreen(basePath, socialProvidersFormBody()),
  );

  expect(actual).toEqual(expected);
  expect(await readSocialLoginMetrics(page)).toEqual({
    authProviderFontFamily: "Roboto, sans-serif",
    githubDisplay: "inline-block",
    githubMarginBottom: "3px",
    githubMarginLeft: "-4px",
    githubMarginTop: "3px",
    githubWidth: "30px",
    oauthButtonDisplay: "block",
    oauthButtonMargin: "10px 0px",
    socialTitleMarginBottom: "10px",
    socialTitleMarginTop: "12px",
    svgVerticalAlign: "middle",
  });
});

test("email-verification login help matches legacy user/login.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, { emailVerificationEnabled: true });
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page.locator(".email-verification-help")).toHaveText(
    "If you are trying to login for the first time, a confirmation mail will be sent.",
  );
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedLoginScreen(basePath, defaultFormBody(), "/me", EMAIL_VERIFICATION_HELP),
  );

  expect(actual).toEqual(expected);
});

test("configured login placeholders match legacy user/login.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {
    loginIdPlaceholder: "Corporate ID",
    passwordPlaceholder: "Directory password",
  });
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page.locator("#loginIdOrEmailD")).toHaveAttribute("placeholder", "Corporate ID");
  await expect(page.locator("#password")).toHaveAttribute("placeholder", "Directory password");
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedLoginScreen(basePath, defaultFormBody("Corporate ID", "Directory password")),
  );

  expect(actual).toEqual(expected);
});

test("password-reset login flash matches legacy common/scripts.scala.html notification", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/users/loginform?password=reset`);

  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText(
    "Please log in with the new password!",
  );
  const actual = await canonicalizeScreenAndToastRoots(page);
  const expected = await canonicalizeHtml(
    page,
    `${expectedLoginScreen(basePath, defaultFormBody(), "")}
    <div id="yobiToasts" class="yobiToasts">
      <div class="toast" tabindex="-1">
        <div class="btn-dismiss"><button type="button" class="btn-transparent">×</button></div>
        <div class="center-text"><span class="v"></span><div class="msg">Please log in with the new password!</div></div>
      </div>
    </div>`,
  );

  expect(actual).toEqual(expected);
  expect(await readToastMetrics(page)).toEqual({
    buttonColor: "rgb(0, 0, 0)",
    buttonDismissLeft: "420px",
    buttonDismissTop: "5px",
    buttonFontSize: "25px",
    buttonFontWeight: "700",
    containerBottom: "25px",
    containerMargin: "10px",
    containerOverflow: "hidden",
    containerPosition: "fixed",
    containerRight: "20px",
    containerZIndex: "9999",
    messageDisplay: "inline-block",
    messageFontSize: "15px",
    messageMargin: "0px",
    messageVerticalAlign: "middle",
    messageWidth: "369px",
    toastBackgroundColor: "rgb(205, 220, 57)",
    toastBorderRadius: "2px",
    toastBoxShadow: "rgb(0, 0, 0) 1px 1px 3px 0px",
    toastBoxSizing: "border-box",
    toastColor: "rgb(0, 0, 0)",
    toastFontWeight: "700",
    toastMargin: "10px",
    toastOpacity: "0.9",
    toastPadding: "10px 20px",
    toastWidth: "450px",
    verticalSpacerDisplay: "inline-block",
    verticalSpacerHeight: "50px",
    verticalSpacerWidth: "0px",
  });
});

function defaultFormBody(
  loginPlaceholder = "Login ID or E-mail",
  passwordPlaceholder = "Password",
) {
  return DEFAULT_FORM_BODY.replace("__LOGIN_PLACEHOLDER__", loginPlaceholder).replace(
    "__PASSWORD_PLACEHOLDER__",
    passwordPlaceholder,
  );
}

function socialProvidersFormBody(
  loginPlaceholder = "Login ID or E-mail",
  passwordPlaceholder = "Password",
) {
  return SOCIAL_PROVIDERS_FORM_BODY.replace("__LOGIN_PLACEHOLDER__", loginPlaceholder).replace(
    "__PASSWORD_PLACEHOLDER__",
    passwordPlaceholder,
  );
}

function expectedLoginScreen(
  basePath: string,
  formBody: string,
  redirectUrl = "/me",
  emailVerificationHelp = "",
) {
  return EXPECTED_LOGIN_SCREEN.replaceAll("__BASE_PATH__", basePath)
    .replace("__EMAIL_VERIFICATION_HELP__", emailVerificationHelp)
    .replace("__REDIRECT_URL__", redirectUrl)
    .replace("__FORM_BODY__", formBody.replaceAll("__BASE_PATH__", basePath));
}

async function mockCapabilities(
  page: Page,
  overrides: {
    emailVerificationEnabled?: boolean;
    enabledSocialProviders?: string[];
    loginIdPlaceholder?: string;
    passwordPlaceholder?: string;
    signupRequireConfirm?: boolean;
    socialLoginOnly?: boolean;
  },
) {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        emailVerificationEnabled: overrides.emailVerificationEnabled ?? false,
        enabledSocialProviders: overrides.enabledSocialProviders ?? [],
        loginIdPlaceholder: overrides.loginIdPlaceholder ?? "",
        passwordPlaceholder: overrides.passwordPlaceholder ?? "",
        signupRequireConfirm: overrides.signupRequireConfirm ?? false,
        socialLoginOnly: overrides.socialLoginOnly ?? false,
      },
    });
  });
}

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
        "src",
        "alt",
        "target",
        "title",
        "aria-hidden",
        "version",
        "data-toggle",
        "data-placement",
        "data-login",
        "for",
        "checked",
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
      document.querySelectorAll(".unsupported, .gnb-outer, .page.full, .page-footer-outer"),
    );
    return roots.map((root) => visit(root)).join("");
  });
}

async function canonicalizeScreenAndToastRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .page.full, .page-footer-outer, #yobiToasts",
      ),
    );
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
        "accesskey",
        "placeholder",
        "href",
        "src",
        "alt",
        "target",
        "title",
        "aria-hidden",
        "version",
        "data-toggle",
        "data-placement",
        "data-login",
        "for",
        "checked",
        "tabindex",
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
  });
}

async function readSocialLoginMetrics(page: Page) {
  return page.evaluate(() => {
    const title = document.querySelector<HTMLElement>(".social-login-title-line");
    const button = document.querySelector<HTMLElement>(".oauth-login-btn");
    const providerLogo = document.querySelector<HTMLElement>(".auth-provider-logo");
    const github = document.querySelector<HTMLElement>(".auth-provider-logo .github");
    const svg = document.querySelector<SVGElement>(".auth-provider-logo .github svg");
    if (!title || !button || !providerLogo || !github || !svg) {
      throw new Error("Expected social login metric targets are missing.");
    }

    const titleStyle = getComputedStyle(title);
    const buttonStyle = getComputedStyle(button);
    const providerLogoStyle = getComputedStyle(providerLogo);
    const githubStyle = getComputedStyle(github);
    const svgStyle = getComputedStyle(svg);

    return {
      authProviderFontFamily: providerLogoStyle.fontFamily,
      githubDisplay: githubStyle.display,
      githubMarginBottom: githubStyle.marginBottom,
      githubMarginLeft: githubStyle.marginLeft,
      githubMarginTop: githubStyle.marginTop,
      githubWidth: githubStyle.width,
      oauthButtonDisplay: buttonStyle.display,
      oauthButtonMargin: buttonStyle.margin,
      socialTitleMarginBottom: titleStyle.marginBottom,
      socialTitleMarginTop: titleStyle.marginTop,
      svgVerticalAlign: svgStyle.verticalAlign,
    };
  });
}

async function readDesktopLoginMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const tagLineWrap = document.querySelector<HTMLElement>(".tag-line-wrap.login");
    const title = document.querySelector<HTMLElement>(".tag-line-wrap .title");
    const formWrap = document.querySelector<HTMLElement>(".login-form-wrap");
    const loginInput = document.querySelector<HTMLElement>("#loginIdOrEmailD");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    const buttonRow = document.querySelector<HTMLElement>(".login-form-wrap .btns-row");
    const actRow = document.querySelector<HTMLElement>(".login-form-wrap .act-row");
    const checkbox = document.querySelector<HTMLElement>("#remember-me");
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
      !loginInput ||
      !passwordInput ||
      !buttonRow ||
      !actRow ||
      !checkbox ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected login metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const tagLineWrapStyle = getComputedStyle(tagLineWrap);
    const formWrapStyle = getComputedStyle(formWrap);
    const loginInputStyle = getComputedStyle(loginInput);
    const passwordInputStyle = getComputedStyle(passwordInput);
    const buttonRowStyle = getComputedStyle(buttonRow);
    const checkboxStyle = getComputedStyle(checkbox);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      actRowLineHeight: getComputedStyle(actRow).lineHeight,
      buttonRowMarginBottom: buttonRowStyle.marginBottom,
      checkboxMarginLeft: checkboxStyle.marginLeft,
      checkboxMarginTop: checkboxStyle.marginTop,
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
      textHeight: loginInputStyle.height,
      textMarginBottom: loginInputStyle.marginBottom,
      textWidth: loginInputStyle.width,
      titleLineHeight: getComputedStyle(title).lineHeight,
    };
  });
}

async function readMobileLoginMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const formWrap = document.querySelector<HTMLElement>(".login-form-wrap");
    const loginInput = document.querySelector<HTMLElement>("#loginIdOrEmailD");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    if (!gnbInner || !gnbOuter || !formWrap || !loginInput || !passwordInput) {
      throw new Error("Expected mobile login metric targets are missing.");
    }

    return {
      formWidth: getComputedStyle(formWrap).width,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterPadding: getComputedStyle(gnbOuter).padding,
      loginInputWidth: getComputedStyle(loginInput).width,
      passwordInputWidth: getComputedStyle(passwordInput).width,
    };
  });
}

async function readToastMetrics(page: Page) {
  return page.evaluate(() => {
    const container = document.querySelector<HTMLElement>("#yobiToasts");
    const toast = document.querySelector<HTMLElement>("#yobiToasts .toast");
    const dismiss = document.querySelector<HTMLElement>("#yobiToasts .btn-dismiss");
    const button = document.querySelector<HTMLElement>("#yobiToasts .btn-dismiss button");
    const verticalSpacer = document.querySelector<HTMLElement>("#yobiToasts .v");
    const message = document.querySelector<HTMLElement>("#yobiToasts .msg");
    if (!container || !toast || !dismiss || !button || !verticalSpacer || !message) {
      throw new Error("Expected toast metric targets are missing.");
    }

    const containerStyle = getComputedStyle(container);
    const toastStyle = getComputedStyle(toast);
    const dismissStyle = getComputedStyle(dismiss);
    const buttonStyle = getComputedStyle(button);
    const verticalSpacerStyle = getComputedStyle(verticalSpacer);
    const messageStyle = getComputedStyle(message);

    return {
      buttonColor: buttonStyle.color,
      buttonDismissLeft: dismissStyle.left,
      buttonDismissTop: dismissStyle.top,
      buttonFontSize: buttonStyle.fontSize,
      buttonFontWeight: buttonStyle.fontWeight,
      containerBottom: containerStyle.bottom,
      containerMargin: containerStyle.margin,
      containerOverflow: containerStyle.overflow,
      containerPosition: containerStyle.position,
      containerRight: containerStyle.right,
      containerZIndex: containerStyle.zIndex,
      messageDisplay: messageStyle.display,
      messageFontSize: messageStyle.fontSize,
      messageMargin: messageStyle.margin,
      messageVerticalAlign: messageStyle.verticalAlign,
      messageWidth: messageStyle.width,
      toastBackgroundColor: toastStyle.backgroundColor,
      toastBorderRadius: toastStyle.borderTopLeftRadius,
      toastBoxShadow: toastStyle.boxShadow,
      toastBoxSizing: toastStyle.boxSizing,
      toastColor: toastStyle.color,
      toastFontWeight: toastStyle.fontWeight,
      toastMargin: toastStyle.margin,
      toastOpacity: toastStyle.opacity,
      toastPadding: toastStyle.padding,
      toastWidth: toastStyle.width,
      verticalSpacerDisplay: verticalSpacerStyle.display,
      verticalSpacerHeight: verticalSpacerStyle.height,
      verticalSpacerWidth: verticalSpacerStyle.width,
    };
  });
}

async function readDialogMetrics(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>("#yobiDialog");
    const dismiss = document.querySelector<HTMLElement>("#yobiDialog .btn-dismiss");
    const dismissButton = document.querySelector<HTMLElement>("#yobiDialog .btn-dismiss button");
    const message = document.querySelector<HTMLElement>("#yobiDialog .message .msg");
    const desc = document.querySelector<HTMLElement>("#yobiDialog .message .desc");
    if (!dialog || !dismiss || !dismissButton || !message || !desc) {
      throw new Error("Expected dialog metric targets are missing.");
    }

    const dialogStyle = getComputedStyle(dialog);
    const dismissStyle = getComputedStyle(dismiss);
    const dismissButtonStyle = getComputedStyle(dismissButton);
    const messageStyle = getComputedStyle(message);
    const descStyle = getComputedStyle(desc);

    return {
      borderColor: dialogStyle.borderTopColor,
      borderRadius: dialogStyle.borderTopLeftRadius,
      borderWidth: dialogStyle.borderTopWidth,
      descColor: descStyle.color,
      descFontSize: descStyle.fontSize,
      descFontWeight: descStyle.fontWeight,
      descLineHeight: descStyle.lineHeight,
      descMargin: descStyle.margin,
      descTextAlign: descStyle.textAlign,
      dismissButtonBackground: dismissButtonStyle.backgroundColor,
      dismissButtonBorder: dismissButtonStyle.border,
      dismissButtonColor: dismissButtonStyle.color,
      dismissButtonFontSize: dismissButtonStyle.fontSize,
      dismissButtonFontWeight: dismissButtonStyle.fontWeight,
      dismissClear: dismissStyle.clear,
      dismissDisplay: dismissStyle.display,
      dismissPadding: dismissStyle.padding,
      dismissTextAlign: dismissStyle.textAlign,
      dismissWidth: dismissStyle.width,
      messageFontSize: messageStyle.fontSize,
      messageFontWeight: messageStyle.fontWeight,
      messageLineHeight: messageStyle.lineHeight,
      messageMarginBottom: messageStyle.marginBottom,
      messageTextAlign: messageStyle.textAlign,
      padding: dialogStyle.padding,
      width: dialogStyle.width,
    };
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      const element = template.content.firstElementChild;
      if (!element) {
        throw new Error("Expected login screen markup is empty.");
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
          "src",
          "alt",
          "target",
          "title",
          "aria-hidden",
          "version",
          "data-toggle",
          "data-placement",
          "data-login",
          "for",
          "checked",
          "tabindex",
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

      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
