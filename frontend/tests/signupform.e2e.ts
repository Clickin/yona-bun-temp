import { expect, test, type Page } from "@playwright/test";

const EXPECTED_SIGNUP_SCREEN = `
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
  <div class="center-wrap tag-line-wrap signup">
    <h1 class="title">
      Sign up for <span class="highlight">Yona</span>
    </h1>
    <p class="tag-line">Web-based platform for collaborative software development</p>
  </div>
  __CONFIRM__
  <div class="signup-form-wrap frm-wrap">
    <form action="/users/signup" method="post" name="signup">
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
        <dt>
          <label for="loginId">User ID (lower case)</label>
        </dt>
        <dd>
          <input id="loginId" type="text" name="loginId" class="text password" placeholder="" autocomplete="off">
        </dd>
        <dt>
          <label for="uname">Name</label>
        </dt>
        <dd>
          <input id="uname" type="text" name="name" class="text password" placeholder="" autocomplete="off">
        </dd>
        <dt>
          <label for="email">Email address</label>
        </dt>
        <dd>
          <input id="email" type="text" name="email" class="text password" placeholder="" autocomplete="off">
        </dd>
        <dt>
          <label for="password">Password</label>
        </dt>
        <dd>
          <input id="password" type="password" name="password" class="text password" placeholder="" autocomplete="off">
        </dd>
        <dt>
          <label for="retypedPassword">Password confirmation</label>
        </dt>
        <dd>
          <input id="retypedPassword" type="password" name="retypedPassword" class="text password" placeholder="" autocomplete="off">
        </dd>
      </dl>
      <div class="btns-row">
        <button type="submit" class="ybtn ybtn-primary ybtn-large ybtn-fullsize">Sign up</button>
      </div>
      <div class="act-row">
        Already signed up? <a href="__BASE_PATH__/users/loginform" class="go-login">Log in</a>
      </div>
`;

const SIGNUP_CONFIRM = `
  <div class="center-txt">
    <p>Administrator admission is required for activation.</p>
    <p>If needed, please contact <span class="obfuscate">moc.elpmaxe@nimda</span></p>
  </div>
`;

const SOCIAL_ONLY_FORM_BODY = `
      <div class="btns-row nm">
        Only allow sign-in via social login
      </div>
`;

const EXPECTED_PUBLIC_LANDING = `
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
<div class="siteintro-bg row">
  <div class="siteintro">
    <div class="siteintro-cover">
      <div class="siteintro-wrap">
        <h1 class="site-heading">21st Century Software Development Platform</h1>
        <ul class="site-features">
          <li>Just focus on what you have to do</li>
        </ul>
      </div>
      <div class="signup-btn">
        <a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success ybtn-padding">Sign up for Yona</a>
      </div>
    </div>
  </div>
  <div class="feature">
    <h2><span>Key features</span></h2>
    <ul class="feature-wrap row">
      <li>
        <div class="feature-image"><i class="yobicon-cgicenter"></i></div>
        <div class="feature-info">
          <h3 class="feature-title">Project / Organization</h3>
          <p class="feature-desc">Work based on projects/organizations supported by proper roles</p>
        </div>
      </li>
      <li>
        <div class="feature-image"><i class="yobicon-code"></i></div>
        <div class="feature-info">
          <h3 class="feature-title">Code management</h3>
          <p class="feature-desc">Your code is safely stored in a version controlled system.</p>
        </div>
      </li>
      <li>
        <div class="feature-image"><i class="yobicon-articles"></i></div>
        <div class="feature-info">
          <h3 class="feature-title">Issue tracker</h3>
          <p class="feature-desc">Yona provides an issue tracker to help you deal with your issues more easily and clearly.</p>
        </div>
      </li>
      <li>
        <div class="feature-image"><i class="yobicon-lock"></i></div>
        <div class="feature-info">
          <h3 class="feature-title">Private repositories</h3>
          <p class="feature-desc">Keep your code private at your private repositories.</p>
        </div>
      </li>
      <li>
        <div class="feature-image"><i class="yobicon-preview"></i></div>
        <div class="feature-info">
          <h3 class="feature-title">Code review</h3>
          <p class="feature-desc">Review all changes in the code with your team before merging. Code discussion will help improve your code.</p>
        </div>
      </li>
      <li>
        <div class="feature-image"><i class="yobicon-friends"></i></div>
        <div class="feature-info">
          <h3 class="feature-title">Team play</h3>
          <p class="feature-desc">Yona provides a simple and easy team management tool to help you build teams for projects.</p>
        </div>
      </li>
    </ul>
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
<div id="yobiToasts" class="yobiToasts">
  <div class="toast" tabindex="-1">
    <div class="btn-dismiss"><button type="button" class="btn-transparent">×</button></div>
    <div class="center-text"><span class="v"></span><div class="msg">__TOAST_MESSAGE__</div></div>
  </div>
</div>
`;

test("anonymous signup form matches legacy user/signup.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/users/signupform`);

  await expect(page.locator(".page.full")).toBeVisible();
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedSignupScreen(basePath, "", DEFAULT_FORM_BODY),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopSignupMetrics(page)).toEqual({
    actionLinkColor: "rgb(92, 92, 92)",
    actionLinkFontWeight: "700",
    actionRowColor: "rgb(153, 153, 153)",
    actionRowTextAlign: "right",
    buttonRowMarginBottom: "20px",
    formMarginTop: "14px",
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
    tagLineFontSize: "14px",
    tagLineMarginBottom: "26px",
    tagLinePaddingTop: "40px",
    textHeight: "30px",
    textMarginBottom: "15px",
    textWidth: "386px",
    titleLineHeight: "42px",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileSignupMetrics(page)).toEqual({
    formWidth: "370.5px",
    gnbInnerWidth: 363,
    gnbOuterPadding: "0px 10px",
    loginInputWidth: "148.188px",
    passwordInputWidth: "148.188px",
    signupDefinitionListTextAlign: "right",
  });
  await expect(page.locator(".go-login")).toHaveAttribute("href", `${basePath}/users/loginform`);
});

test("signup confirmation contact matches legacy user/signup.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {
    defaultAdminContact: "moc.elpmaxe@nimda",
    signupRequireConfirm: true,
  });
  await page.goto(`${basePath}/users/signupform`);

  await expect(page.locator(".center-txt .obfuscate")).toHaveText("moc.elpmaxe@nimda");
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedSignupScreen(basePath, SIGNUP_CONFIRM, DEFAULT_FORM_BODY),
  );

  expect(actual).toEqual(expected);
});

test("social-login-only signup matches legacy user/signup.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, { socialLoginOnly: true });
  await page.goto(`${basePath}/users/signupform`);

  await expect(page.locator(".signup-form-wrap form > .btns-row.nm")).toHaveText(
    "Only allow sign-in via social login",
  );
  await expect(page.locator("#loginId")).toHaveCount(0);
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedSignupScreen(basePath, "", SOCIAL_ONLY_FORM_BODY),
  );

  expect(actual).toEqual(expected);
});

test("signup requiring admin confirmation redirects to legacy flash landing state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, { signupRequireConfirm: true });
  await mockAnonymousSession(page);
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "signup-csrf" },
      json: {},
    });
  });
  await page.route("**/api/v1/auth/register", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: true },
    });
  });
  await page.goto(`${basePath}/users/signupform`);

  await page.fill("#loginId", "door");
  await page.fill("#uname", "Door");
  await page.fill("#email", "door@example.com");
  await page.fill("#password", "passw0rd");
  await page.fill("#retypedPassword", "passw0rd");
  await page.locator('form[name="signup"] button[type="submit"]').click();

  await expect(page).toHaveURL(new RegExp(`${basePath}/\\?signup=requested$`));
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText(
    "Sign-up request has been sent. Site admin will review and accept your request. Thanks.",
  );

  const actual = await canonicalizeScreenAndToastRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedPublicLanding(
      basePath,
      "Sign-up request has been sent. Site admin will review and accept your request. Thanks.",
    ),
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

test("signup requiring email verification redirects to legacy flash landing state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, { emailVerificationEnabled: true });
  await mockAnonymousSession(page);
  await mockSessionBootstrap(page);
  await page.route("**/api/v1/auth/register", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: true },
    });
  });
  await page.goto(`${basePath}/users/signupform`);

  await page.fill("#loginId", "door");
  await page.fill("#uname", "Door");
  await page.fill("#email", "door@example.com");
  await page.fill("#password", "passw0rd");
  await page.fill("#retypedPassword", "passw0rd");
  await page.locator('form[name="signup"] button[type="submit"]').click();

  await expect(page).toHaveURL(new RegExp(`${basePath}/\\?verify=sent$`));
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText(
    "User verification mail was sent.",
  );

  const actual = await canonicalizeScreenAndToastRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedPublicLanding(basePath, "User verification mail was sent."),
  );

  expect(actual).toEqual(expected);
});

async function mockCapabilities(
  page: Page,
  overrides: {
    defaultAdminContact?: string;
    emailVerificationEnabled?: boolean;
    signupRequireConfirm?: boolean;
    socialLoginOnly?: boolean;
  },
) {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        defaultAdminContact: overrides.defaultAdminContact ?? "",
        emailVerificationEnabled: overrides.emailVerificationEnabled ?? false,
        enabledSocialProviders: [],
        loginIdPlaceholder: "",
        passwordPlaceholder: "",
        signupRequireConfirm: overrides.signupRequireConfirm ?? false,
        socialLoginOnly: overrides.socialLoginOnly ?? false,
      },
    });
  });
}

async function mockSessionBootstrap(page: Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "signup-csrf" },
      json: {},
    });
  });
}

async function mockAnonymousSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { defaultLandingPath: "", isAnonymous: true },
    });
  });
}

function expectedSignupScreen(basePath: string, confirmHtml: string, formBody: string) {
  return EXPECTED_SIGNUP_SCREEN.replaceAll("__BASE_PATH__", basePath)
    .replace("__CONFIRM__", confirmHtml)
    .replace("__FORM_BODY__", formBody.replaceAll("__BASE_PATH__", basePath));
}

function expectedPublicLanding(basePath: string, toastMessage: string) {
  return EXPECTED_PUBLIC_LANDING.replaceAll("__BASE_PATH__", basePath).replace(
    "__TOAST_MESSAGE__",
    toastMessage,
  );
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
        "target",
        "title",
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
        ".unsupported, .gnb-outer, .siteintro-bg, .page-footer-outer, #yobiToasts",
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
        "href",
        "target",
        "title",
        "tabindex",
        "data-toggle",
        "data-placement",
        "data-login",
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

async function readDesktopSignupMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const tagLineWrap = document.querySelector<HTMLElement>(".tag-line-wrap.signup");
    const title = document.querySelector<HTMLElement>(".tag-line-wrap .title");
    const tagLine = document.querySelector<HTMLElement>(".tag-line-wrap .tag-line");
    const formWrap = document.querySelector<HTMLElement>(".signup-form-wrap");
    const loginInput = document.querySelector<HTMLElement>("#loginId");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    const buttonRow = document.querySelector<HTMLElement>(".signup-form-wrap .btns-row");
    const actRow = document.querySelector<HTMLElement>(".signup-form-wrap .act-row");
    const actionLink = document.querySelector<HTMLElement>(".signup-form-wrap .go-login");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !tagLineWrap ||
      !title ||
      !tagLine ||
      !formWrap ||
      !loginInput ||
      !passwordInput ||
      !buttonRow ||
      !actRow ||
      !actionLink ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected signup metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const tagLineWrapStyle = getComputedStyle(tagLineWrap);
    const formWrapStyle = getComputedStyle(formWrap);
    const loginInputStyle = getComputedStyle(loginInput);
    const passwordInputStyle = getComputedStyle(passwordInput);
    const buttonRowStyle = getComputedStyle(buttonRow);
    const actionLinkStyle = getComputedStyle(actionLink);
    const actRowStyle = getComputedStyle(actRow);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      actionLinkColor: actionLinkStyle.color,
      actionLinkFontWeight: actionLinkStyle.fontWeight,
      actionRowColor: actRowStyle.color,
      actionRowTextAlign: actRowStyle.textAlign,
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
      tagLineFontSize: getComputedStyle(tagLine).fontSize,
      tagLineMarginBottom: tagLineWrapStyle.marginBottom,
      tagLinePaddingTop: tagLineWrapStyle.paddingTop,
      textHeight: loginInputStyle.height,
      textMarginBottom: loginInputStyle.marginBottom,
      textWidth: loginInputStyle.width,
      titleLineHeight: getComputedStyle(title).lineHeight,
    };
  });
}

async function readMobileSignupMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const formWrap = document.querySelector<HTMLElement>(".signup-form-wrap");
    const definitionList = document.querySelector<HTMLElement>(".signup-form-wrap dl");
    const loginInput = document.querySelector<HTMLElement>("#loginId");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    if (!gnbInner || !gnbOuter || !formWrap || !definitionList || !loginInput || !passwordInput) {
      throw new Error("Expected mobile signup metric targets are missing.");
    }

    return {
      formWidth: getComputedStyle(formWrap).width,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterPadding: getComputedStyle(gnbOuter).padding,
      loginInputWidth: getComputedStyle(loginInput).width,
      passwordInputWidth: getComputedStyle(passwordInput).width,
      signupDefinitionListTextAlign: getComputedStyle(definitionList).textAlign,
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
      throw new Error("Expected signup toast metric targets are missing.");
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

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      const element = template.content.firstElementChild;
      if (!element) {
        throw new Error("Expected signup screen markup is empty.");
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
          "tabindex",
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

      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
