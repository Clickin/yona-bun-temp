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
            <input type="text" name="keyword" autocomplete="off">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
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
