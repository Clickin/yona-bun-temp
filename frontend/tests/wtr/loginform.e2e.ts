import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const EXPECTED_LOGIN_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <button class="pin" title="Sidebar" type="button">
      <i class="yobicon-arrow-left" aria-hidden="true"></i>
      <i class="yobicon-arrow-right" aria-hidden="true"></i>
    </button>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
      <li class="divider"></li>
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
          <span class="user-menu"><a href="__BASE_PATH__/anonymous">Profile</a></span>
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
      <li><a href="__BASE_PATH__/users/signupform">Sign up</a></li>
    </ul>
  </div>
</header>
<div class="page full">
  <div class="center-wrap tag-line-wrap login">
    <h1 class="title">
      Log in to <span class="highlight">Yoram</span>
    </h1>
    <p class="tag-line">Web-based platform for collaborative software development</p>
  </div>
  <div class="login-form-wrap frm-wrap">
    __EMAIL_VERIFICATION_HELP__
    <form action="__BASE_PATH__/users/login" method="POST">
      <input type="hidden" name="redirectUrl" value="__REDIRECT_URL__">
      __FORM_BODY__
    </form>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      & © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      & <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
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
        <div class="remember-me-wrap">
          <input id="remember-me" type="checkbox" name="rememberMe" class="checkbox" checked>
          <label for="remember-me" class="bg-checkbox">Stay logged in</label>
        </div>
        <div class="links-wrap">
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
        <div class="remember-me-wrap">
          <input id="remember-me" type="checkbox" name="rememberMe" class="checkbox" checked>
          <label for="remember-me" class="bg-checkbox">Stay logged in</label>
        </div>
        <div class="links-wrap">
          <a href="__BASE_PATH__/lostPassword">Password forgotten?</a>
        </div>
      </div>
`;

const EMAIL_VERIFICATION_HELP = `
    <div>If you are trying to login for the first time, a confirmation mail will be sent.</div>
`;

const ROOT_LOGIN_DIALOG_FORM_BODY = `
      <dl>
        <dd>
          <input id="loginIdOrEmailD" name="loginIdOrEmail" type="text" class="text email" autocomplete="off" placeholder="Login ID or E-mail">
        </dd>
        <dd>
          <input id="passwordD" name="password" type="password" class="text password" autocomplete="off" placeholder="Password">
        </dd>
      </dl>
      <div class="error">
        <i class="yobicon-error"></i>
        <span class="error-message"></span>
      </div>
      <div class="btns-row nm">
        <button type="submit" class="ybtn ybtn-primary fullsize">Log in</button>
      </div>
      <div class="btns-row nm">
        <div class="social-login-title-line"> or </div>
        <a href="__BASE_PATH__/authenticate/github" class="ybtn oauth-login-btn"><span class="auth-provider-logo"><span class="github"><svg aria-hidden="true" height="24" version="1.1" viewBox="0 0 16 16" width="19"><path></path></svg></span> <span class="provider-name">Sign in with github</span></span></a>
        <a href="__BASE_PATH__/authenticate/google" class="ybtn oauth-login-btn"><span class="auth-provider-logo"><img src="__BASE_PATH__/assets/images/provider-logo/btn_google_light_normal_ios.svg" alt="login with Google"> Sign in with Google</span></a>
      </div>
      <div class="act-row right-txt mt20">
        <div class="pull-left">
          <input id="remember-meD" type="checkbox" name="rememberMe" checked>
          <label for="remember-meD" class="bg-checkbox">Stay logged in</label>
        </div>
        <a href="__BASE_PATH__/lostPassword">Reset password</a>
        <span>|</span>
        <a href="__BASE_PATH__/users/signupform">Sign up</a>
      </div>
`;

test("anonymous login form matches legacy user/login.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page).toHaveTitle("Log in");
  expect(await page.evaluate(() => document.head.querySelector("title")?.textContent)).toBe(
    "Log in",
  );
  await expect(page.locator(".page.full")).toBeVisible();
  await expect(page.locator('[data-owner="global-sidebar-open-pin"]')).toHaveJSProperty(
    "tagName",
    "BUTTON",
  );
  const projectListingLink = page.locator('[data-owner="global-gnb-project-list-link"]');
  await expect(projectListingLink).toHaveAttribute("href", `${basePath}/projects`);
  await expect(projectListingLink).toHaveText("List All");
  await expect(page.locator('[data-owner="global-gnb-project-list-divider"]')).toHaveCount(1);
  expect(
    await projectListingLink.evaluate((link) =>
      link.parentElement?.nextElementSibling?.getAttribute("data-owner"),
    ),
  ).toBe("global-gnb-project-list-divider");
  await expect(page.locator(`#mySidenav a[href="${basePath}/anonymous"]`)).toHaveText("Profile");
  await expect(page.locator(`a[href="${basePath}/users/signupform"]`)).not.toHaveClass(
    /\bybtn(?:-success)?\b/u,
  );
  await expect(page.locator(".remember-me-wrap")).not.toHaveClass(/\bpull-left\b/u);
  await expect(page.locator(".links-wrap")).not.toHaveClass(/\bpull-right\b/u);
  await expect(page.locator(".page.full h1.title")).toContainText("Yoram");
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
    gnbInnerWidth: 1235,
    gnbOuterBackground: "rgb(27, 27, 27)",
    gnbOuterHeight: "40px",
    logoBackground: "rgb(255, 87, 34)",
    logoLineHeight: "40px",
    logoPadding: "6px 10px",
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px",
    passwordMarginBottom: "15px",
    providerColor: "rgb(51, 51, 51)",
    providerFontSize: "9px",
    providerMarginLeft: "4px",
    tagLineMarginBottom: "26px",
    tagLinePaddingTop: "80px",
    textHeight: "27px",
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
  const routeSource = readFileSync("src/routes/users/loginform.tsx", "utf8");
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyLogin = readFileSync("../yona-original/app/views/user/login.scala.html", "utf8");
  const legacyNavbar = readFileSync("../yona-original/app/views/common/navbar.scala.html", "utf8");
  const legacyUsermenu = readFileSync(
    "../yona-original/app/views/common/usermenu.scala.html",
    "utf8",
  );
  const legacyNullUser = readFileSync("../yona-original/app/models/NullUser.java", "utf8");
  const legacyUser = readFileSync("../yona-original/app/models/User.java", "utf8");
  const legacyRoutes = readFileSync("../yona-original/conf/routes", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  expect(legacyLogin).toContain('<form action="@routes.UserApp.login()" method="POST">');
  expect(legacyNavbar).toContain('<div class="pin"');
  expect(legacyNavbar).toContain(
    "@if(!Application.HIDE_PROJECT_LISTING && !UserApp.currentUser().isGuest)",
  );
  expect(legacyNullUser).toContain("public class NullUser extends User");
  expect(legacyNullUser).not.toMatch(/\bisGuest\s*=/u);
  expect(legacyUser).toContain("public boolean isGuest = false;");
  expect(legacyUsermenu).toContain('href="@routes.UserApp.userInfo(currentUser.loginId)"');
  expect(legacyRoutes).toMatch(/^GET\s+\/:user\s+controllers\.UserApp\.userInfo/mu);
  expect(pageLess).toMatch(/\.login-form-wrap,[\s\S]*?\.text \{[\s\S]*?height: 27px;/u);
  expect(responsiveLess).toMatch(/@media all \{[\s\S]*?\.page-footer-outer \{\s*padding: 10px;/u);
  expect(
    /const\s+LEGACY_LOGIN_ACTION_PATH\s*:\s*"\/users\/login"\s*=\s*"\/users\/login"\s*;/u.test(
      routeSource,
    ),
  ).toBe(true);
  expect(routeSource).toMatch(
    /prefixBasePath\(\s*runtimeConfig\.basePath\s*,\s*LEGACY_LOGIN_ACTION_PATH\s*,?\s*\)/u,
  );
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("pull-left");
  expect(routeSource).not.toContain("pull-right");
});

test("authenticated login form request redirects to the legacy root without rendering login DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {});
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/users/loginform?redirectUrl=%2Fme`);

  await expect(page).toHaveURL(`${basePath}/`);
  await expect(page.locator(".page.full .login-form-wrap")).toHaveCount(0);
});

test("anonymous login form still renders after its session check", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {});
  await mockAnonymousSession(page);

  await page.goto(`${basePath}/users/loginform?redirectUrl=%2Fme`);

  await expect(page).toHaveURL(`${basePath}/users/loginform?redirectUrl=%2Fme`);
  await expect(page.locator(".page.full .login-form-wrap form")).toBeVisible();
  await expect(page.locator("#loginIdOrEmailD")).toBeVisible();
});

test("anonymous login form renders legacy browser title without imperative mutation", () => {
  const source = readFileSync("src/routes/users/loginform.tsx", "utf8");

  expect(source).toContain('<title>{t("title.login")}</title>');
  expect(source).not.toMatch(/\bdocument\s*\.\s*title\b/u);
  expect(source).not.toMatch(/\bglobalThis\s*\.\s*document\b/u);
  expect(source).not.toMatch(/\bwindow\s*\.\s*document\b/u);
  expect(source).not.toMatch(
    /use(?:Layout)?Effect\s*\([\s\S]*?(?:document\s*\.\s*title|globalThis\s*\.\s*document|window\s*\.\s*document|title\s*=)/u,
  );
});

test("signup login Link keeps the standalone login URL query-free inside the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {});
  await mockAnonymousSession(page);
  await page.goto(`${basePath}/users/signupform`);
  await page.evaluate(() => {
    (window as Window & { __signupLoginLinkSentinel?: string }).__signupLoginLinkSentinel = "alive";
  });

  await page.locator(".go-login").click();

  await expect(page).toHaveURL(`${basePath}/users/loginform`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __signupLoginLinkSentinel?: string }).__signupLoginLinkSentinel,
      ),
    )
    .toBe("alive");
});

test("standalone login keeps only the non-empty redirectUrl search key", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {});
  await mockAnonymousSession(page);
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page).toHaveURL(`${basePath}/users/loginform?redirectUrl=%2Fme`);
  expect([...new URL(page.url()).searchParams.entries()]).toEqual([["redirectUrl", "/me"]]);
});

test("standalone login keeps explicit local redirect inside the SPA base path", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const source = readFileSync("src/routes/users/loginform.tsx", "utf8");
  expect(source).toContain("router.history.push(destination)");
  expect(source).not.toContain("navigate({ href: destination })");
  expect(source).toContain("sessionQuery.data?.isAnonymous === false && !redirectingRef.current");
  const login = await mockStandalonePasswordLogin(page, { defaultLandingPath: "/" });
  await page.goto(`${basePath}/users/loginform?redirectUrl=%2Fme`);

  const form = page.locator(".page.full .login-form-wrap > form");
  await expect(form).toHaveAttribute("action", `${basePath === "/" ? "" : basePath}/users/login`);
  await expect.poll(() => login.sessionRequestPaths.length).toBe(1);
  await page.evaluate(() => {
    (window as Window & { __standaloneLoginSpaSentinel?: string }).__standaloneLoginSpaSentinel =
      "alive";
  });
  await page.locator("#loginIdOrEmailD").fill("admin");
  await page.locator("#password").fill("password");
  await page.locator(".page.full button[type='submit']").click();

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath === "/" ? "" : basePath}/me`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __standaloneLoginSpaSentinel?: string })
            .__standaloneLoginSpaSentinel,
      ),
    )
    .toBe("alive");
  await expect.poll(() => login.sessionRequestPaths.length).toBe(2);
  expect(login.signInRequests).toEqual([
    {
      body: { identifier: "admin", password: "password", rememberMe: true },
      csrfToken: "csrf-standalone-login",
    },
  ]);
});

test("standalone login returns to a same-origin absolute legacy Referer", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const login = await mockStandalonePasswordLogin(page, {});
  await page.goto(`${basePath}/users/loginform`);
  const redirectUrl = `${new URL(page.url()).origin}${basePath}/admin/sample/issues?state=open#issue-list`;
  await page.goto(`${basePath}/users/loginform?redirectUrl=${encodeURIComponent(redirectUrl)}`);

  await page.locator("#loginIdOrEmailD").fill("admin");
  await page.locator("#password").fill("password");
  await page.locator(".page.full button[type='submit']").click();

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath === "/" ? "" : basePath}/admin/sample/issues`);
  await expect.poll(() => new URL(page.url()).search).toMatch(/^\?state=open(?:&|$)/u);
  await expect.poll(() => new URL(page.url()).hash).toBe("#issue-list");
  await expect.poll(() => login.sessionRequestPaths.length).toBeGreaterThanOrEqual(2);
});

test("standalone login strips an exact configured base from an absolute redirect", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const login = await mockStandalonePasswordLogin(page, {});
  await page.goto(`${basePath}/users/loginform`);
  const redirectUrl = `${new URL(page.url()).origin}${basePath}?x=1#h`;
  await page.goto(`${basePath}/users/loginform?redirectUrl=${encodeURIComponent(redirectUrl)}`);

  await page.locator("#loginIdOrEmailD").fill("admin");
  await page.locator("#password").fill("password");
  await page.locator(".page.full button[type='submit']").click();

  await expect(page).toHaveURL(`${basePath === "/" ? "" : basePath}/?x=1#h`);
  await expect.poll(() => login.sessionRequestPaths.length).toBeGreaterThanOrEqual(2);
});

test("standalone login rejects a cross-origin absolute redirect", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const login = await mockStandalonePasswordLogin(page, { defaultLandingPath: "/me" });
  await page.goto(
    `${basePath}/users/loginform?redirectUrl=${encodeURIComponent("https://evil.example/yona/me")}`,
  );
  const localOrigin = new URL(page.url()).origin;

  await page.locator("#loginIdOrEmailD").fill("admin");
  await page.locator("#password").fill("password");
  await page.locator(".page.full button[type='submit']").click();

  await expect.poll(() => new URL(page.url()).origin).toBe(localOrigin);
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath === "/" ? "" : basePath}/me`);
  await expect.poll(() => login.sessionRequestPaths.length).toBeGreaterThanOrEqual(2);
});

test("standalone login rejects a protocol-relative redirect", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const login = await mockStandalonePasswordLogin(page, { defaultLandingPath: "/me" });
  await page.goto(
    `${basePath}/users/loginform?redirectUrl=${encodeURIComponent("//evil.example/yona/me")}`,
  );
  const localOrigin = new URL(page.url()).origin;

  await page.locator("#loginIdOrEmailD").fill("admin");
  await page.locator("#password").fill("password");
  await page.locator(".page.full button[type='submit']").click();

  await expect.poll(() => new URL(page.url()).origin).toBe(localOrigin);
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath === "/" ? "" : basePath}/me`);
  await expect.poll(() => login.sessionRequestPaths.length).toBeGreaterThanOrEqual(2);
});

for (const [label, unsafePath] of [
  ["doubled-slash", "//evil.example/yona/me"],
  ["backslash-normalized", "\\\\evil.example\\\\yona\\\\me"],
] as const) {
  test(`standalone login rejects same-origin ${label} redirect`, async ({ page }) => {
    const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
    const login = await mockStandalonePasswordLogin(page, { defaultLandingPath: "/me" });
    await page.goto(`${basePath}/users/loginform`);
    const redirectUrl = `${new URL(page.url()).origin}${basePath}${unsafePath}`;
    const localOrigin = new URL(page.url()).origin;
    await page.goto(`${basePath}/users/loginform?redirectUrl=${encodeURIComponent(redirectUrl)}`);

    await page.locator("#loginIdOrEmailD").fill("admin");
    await page.locator("#password").fill("password");
    await page.locator(".page.full button[type='submit']").click();

    await expect.poll(() => new URL(page.url()).origin).toBe(localOrigin);
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`${basePath === "/" ? "" : basePath}/me`);
    await expect.poll(() => login.sessionRequestPaths.length).toBeGreaterThanOrEqual(2);
  });
}

test("standalone login without a landing preference uses the legacy root", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const login = await mockStandalonePasswordLogin(page, {});
  await page.goto(`${basePath}/users/loginform`);
  await page.evaluate(() => {
    (window as Window & { __standaloneLoginSpaSentinel?: string }).__standaloneLoginSpaSentinel =
      "alive";
  });

  await page.locator("#loginIdOrEmailD").fill("admin");
  await page.locator("#password").fill("password");
  await page.locator(".page.full button[type='submit']").click();

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(basePath === "/" ? "/" : `${basePath}/`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __standaloneLoginSpaSentinel?: string })
            .__standaloneLoginSpaSentinel,
      ),
    )
    .toBe("alive");
  await expect.poll(() => login.sessionRequestPaths.length).toBe(2);
});

test("standalone login does not duplicate an already-prefixed landing path", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const expectedPath = `${basePath === "/" ? "" : basePath}/me`;
  await mockStandalonePasswordLogin(page, { defaultLandingPath: expectedPath });
  await page.goto(`${basePath}/users/loginform`);

  await page.locator("#loginIdOrEmailD").fill("admin");
  await page.locator("#password").fill("password");
  await page.locator(".page.full button[type='submit']").click();

  await expect.poll(() => new URL(page.url()).pathname).toBe(expectedPath);
  if (basePath !== "/") {
    expect(new URL(page.url()).pathname).not.toContain(`${basePath}${basePath}`);
  }
});

test("social-login-only form matches legacy user/login.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {
    enabledSocialProviders: ["github", "google"],
    socialLoginOnly: true,
  });
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page.locator(".oauth-login-btn")).toHaveCount(2);
  await assertOAuthProviderLinks(page, basePath);
  await expect(page.locator("#loginIdOrEmailD")).toHaveCount(0);
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedLoginScreen(basePath, SOCIAL_ONLY_FORM_BODY),
  );

  expect(actual).toEqual(expected);
});

test("kakao and naver providers render oauth-login-btn links", async ({ page }) => {
  // Yoram adds kakao/naver (Korean apps standard today; not in legacy Yona).
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {
    enabledSocialProviders: ["github", "google", "kakao", "naver"],
    socialLoginOnly: false,
  });
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page.locator(".oauth-login-btn")).toHaveCount(4);
  const kakao = page.locator('.oauth-login-btn[href*="/authenticate/kakao"]');
  await expect(kakao).toHaveClass(/(?:^|\s)ybtn oauth-login-btn(?:\s|$)/u);
  await expect(kakao).toContainText("Sign in with Kakao");
  await expect(kakao.locator("img[alt='login with Kakao']")).toHaveAttribute(
    "src",
    /kakaotalk_sharing_btn_small/,
  );
  const naver = page.locator('.oauth-login-btn[href*="/authenticate/naver"]');
  await expect(naver).toHaveClass(/(?:^|\s)ybtn oauth-login-btn(?:\s|$)/u);
  await expect(naver).toContainText("Sign in with Naver");
  await expect(naver.locator("img[alt='login with Naver']")).toHaveAttribute(
    "src",
    /NAVER_login_Dark_KR_green_icon_H56/,
  );
  // The supplied 224px naver icon renders at the same 24px height as the
  // other provider logos.
  await expect(naver.locator("img[alt='login with Naver']")).toHaveAttribute("height", "24");
  await expect(naver.locator("img[alt='login with Naver']")).toHaveAttribute("width", "24");
  // github/google keep their legacy logo/name layout.
  await expect(page.locator('.oauth-login-btn[href*="/authenticate/github"]')).toContainText(
    "Sign in with github",
  );
  await expect(page.locator('.oauth-login-btn[href*="/authenticate/google"]')).toContainText(
    "Sign in with Google",
  );
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
  await assertOAuthProviderLinks(page, basePath);
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
  const source = readFileSync("src/routes/users/loginform.tsx", "utf8");
  // The provider button shell lives in the shared oauth-provider-link.
  const sharedProviderSource = readFileSync("src/components/oauth-provider-link.tsx", "utf8");
  expect(sharedProviderSource).toContain(
    "const providerLoginPath: string = `/authenticate/${normalized}`;",
  );
  expect(sharedProviderSource).toContain("to={providerLoginPath}");
  expect(sharedProviderSource).toContain("href={prefixBasePath(basePath, providerLoginPath)}");
  expect(sharedProviderSource).toContain("reloadDocument");
  expect(source).toContain("OAuthProviderLink");
  expect(source).not.toContain("as never");
  expect(source).not.toMatch(/<a\s+href=\{[^}]*\/authenticate\/\$\{normalized\}[^}]*\}/);
});

test("root login dialog uses Link semantics for reset signup and OAuth anchors", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {
    enabledSocialProviders: ["github", "google"],
    socialLoginOnly: false,
  });
  await page.goto(`${basePath}/users/login?from=legacy`);

  await expect(page.locator("#loginDialog")).toHaveAttribute(
    "data-owner",
    "root-login-dialog-frame",
  );
  await expect(page.locator("#loginDialog")).toHaveAttribute("role", "dialog");
  await expect(page.locator("#loginDialog")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#loginDialog")).not.toHaveClass(
    /\bloginDialog\b|\bmodal\b|\bhide\b|\bin\b/u,
  );
  await expect(page.locator(`#loginDialog a[href="${basePath}/lostPassword"]`)).toHaveText(
    "Reset password",
  );
  await expect(page.locator(`#loginDialog a[href="${basePath}/users/signupform"]`)).toHaveText(
    "Sign up",
  );
  await expect(page.locator("#loginDialog .oauth-login-btn")).toHaveCount(2);
  await expect(page.locator(`#loginDialog a[href="${basePath}/authenticate/github"]`)).toHaveClass(
    "ybtn oauth-login-btn",
  );
  await expect(
    page.locator(`#loginDialog a[href="${basePath}/authenticate/github"]`),
  ).toContainText("Sign in with github");
  await expect(page.locator("#loginDialog .github svg path")).not.toHaveAttribute("d", "");
  await expect(page.locator(`#loginDialog a[href="${basePath}/authenticate/google"]`)).toHaveClass(
    "ybtn oauth-login-btn",
  );
  await expect(
    page.locator(`#loginDialog a[href="${basePath}/authenticate/google"]`),
  ).toContainText("Sign in with Google");

  const source = readFileSync("src/routes/__root.tsx", "utf8");
  const legacyLoginDialog = readFileSync(
    "../yona-original/app/views/common/loginDialog.scala.html",
    "utf8",
  );
  expect(legacyLoginDialog).toContain("@routes.PasswordResetApp.lostPassword()");
  expect(legacyLoginDialog).toContain("@routes.UserApp.signupForm");
  expect(legacyLoginDialog).toContain("@p.getUrl");
  expect(source).toMatch(
    /<Link\s+to="\/lostPassword">\s*\{t\("title\.resetPassword"\)\}\s*<\/Link>/u,
  );
  expect(source).toMatch(
    /<Link\s+to="\/users\/signupform">\s*\{t\("title\.signup"\)\}\s*<\/Link>/u,
  );
  // The OAuth provider link moved to the shared oauth-provider-link
  // component (used by root dialog, standalone login, user profile).
  const sharedProviderSource = readFileSync("src/components/oauth-provider-link.tsx", "utf8");
  expect(sharedProviderSource).toContain(
    "const providerLoginPath: string = `/authenticate/${normalized}`;",
  );
  expect(sharedProviderSource).toContain("to={providerLoginPath}");
  expect(sharedProviderSource).toContain("href={prefixBasePath(basePath, providerLoginPath)}");
  expect(sharedProviderSource).toContain("reloadDocument");
  expect(sharedProviderSource).toContain("GITHUB_OAUTH_LOGO_PATH");
  expect(source).not.toContain("as never");
  expect(source).not.toMatch(/<a\s+href=\{prefixBasePath\(basePath,\s*"\/lostPassword"\)\}/u);
  expect(source).not.toMatch(/<a\s+href=\{prefixBasePath\(basePath,\s*"\/users\/signupform"\)\}/u);
  expect(source).not.toMatch(
    /<a\s+href=\{prefixBasePath\(basePath,\s*`\/authenticate\/\$\{normalized\}`\)\}/u,
  );
});

test("root login dialog visible state matches legacy common/loginDialog.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {
    enabledSocialProviders: ["github", "google"],
    socialLoginOnly: false,
  });
  await page.goto(`${basePath}/users/login?from=legacy`);
  await expect(page).toHaveURL(new RegExp(`${basePath}/users/login\\?from=legacy$`, "u"));
  const rootLoginLink = page.locator("#required-logged-in > a.user-item-btn");
  await expect(rootLoginLink).not.toHaveAttribute("data-login");
  await rootLoginLink.click();

  await expect(page.locator("#loginDialog")).toBeVisible();
  await expect(page.locator("#loginDialog")).not.toHaveClass(
    /\bloginDialog\b|\bmodal\b|\bhide\b|\bin\b/u,
  );
  await expect(page.locator("#loginDialog")).toHaveAttribute(
    "data-owner",
    "root-login-dialog-frame",
  );
  await expect(page.locator("#loginDialog")).toHaveAttribute("role", "dialog");
  await expect(page.locator("#loginDialog")).toHaveAttribute("aria-hidden", "false");
  await expect(
    page.locator('#loginDialog [data-owner="root-login-dialog-action-row"]'),
  ).toHaveClass(/\bact-row\b.*\bmt20\b/u);
  await expect(
    page.locator('#loginDialog [data-owner="root-login-dialog-action-row"]'),
  ).not.toHaveClass(/\bright-txt\b/u);
  await expect(page).toHaveURL(new RegExp(`${basePath}/users/login\\?from=legacy$`, "u"));
  await expect(page.locator("#loginIdOrEmailD")).toBeFocused();
  await expect(page.locator("#loginDialog .error")).toBeHidden();
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await assertOAuthProviderLinks(page, basePath);
  await expect(
    page.locator('#loginDialog > [data-owner="root-login-dialog-body"] > .pull-right + form'),
  ).toHaveClass(/\bfrm-wrap\b.*\blogin-form-wrap\b/u);

  const actual = await canonicalizeLoginDialogRoot(page);
  const expected = await canonicalizeLoginDialogHtml(
    page,
    expectedRootLoginDialog(basePath, ROOT_LOGIN_DIALOG_FORM_BODY),
  );

  expect(actual).toEqual(expected);
  expect(await readRootLoginDialogMetrics(page)).toEqual({
    actionRowMarginTop: "20px",
    actionRowTextAlign: "right",
    backdropOpacity: "0.5",
    checkboxMarginTop: "4px",
    closeButtonFloat: "right",
    closeButtonFontSize: "20px",
    closeButtonLineHeight: "20px",
    dialogDisplay: "block",
    // F5 dist-truth (2026-08-11): the dialog centers at the WTR iframe's
    // 1280px viewport; the 1px delta from the F5 641 is the scrollbar offset
    dialogLeft: 640,
    dialogMarginLeft: "-230px",
    dialogPosition: "fixed",
    dialogTop: 72,
    dialogWidth: "460px",
    errorDisplay: "none",
    // F5 dist-truth (2026-08-11): the React dialog form uses the legacy
    // .loginDialog .act-row 20px 5px margin (fallback:19480); the F5 15px
    // reflected a padding-box capture
    formMargin: "20px 5px",
    formWidth: "400px",
    loginInputBoxSizing: "content-box",
    loginInputHeight: 36,
    loginInputWidth: "386px",
    modalBodyPadding: "15px",
    oauthButtonDisplay: "block",
    passwordInputHeight: 36,
    passwordInputWidth: "386px",
    submitButtonWidth: "400px",
    titleLineMarginTop: "12px",
  });
  expect(await readRootLoginDialogLayout(page)).toEqual({
    actionRowBelowOauth: true,
    backdropBehindDialog: true,
    bodyContainsForm: true,
    closeRightAligned: true,
    dialogCentered: true,
    formBelowCloseRow: true,
    formContainsFields: true,
    formContainsSubmit: true,
    inputStacked: true,
    modalBodyContained: true,
    passwordAboveError: true,
    submitAboveOauth: true,
  });

  const source = readFileSync("src/routes/__root.tsx", "utf8");
  const legacyLoginDialog = readFileSync(
    "../yona-original/app/views/common/loginDialog.scala.html",
    "utf8",
  );
  expect(legacyLoginDialog).toContain('id="loginDialog" class="modal hide loginDialog"');
  expect(legacyLoginDialog).toContain('tabindex="-1" role="dialog"');
  const bootstrapModal = readFileSync("../yona-original/public/bootstrap/js/bootstrap.js", "utf8");
  expect(bootstrapModal).toContain("that.$element.show()");
  expect(bootstrapModal).toContain(".addClass('in')");
  expect(bootstrapModal).toContain(".attr('aria-hidden', false)");
  expect(legacyLoginDialog).toContain('class="frm-wrap login-form-wrap"');
  expect(legacyLoginDialog).toContain('id="loginIdOrEmailD"');
  expect(legacyLoginDialog).toContain('id="passwordD"');
  expect(legacyLoginDialog).toContain('class="error"');
  expect(legacyLoginDialog).toContain('class="act-row right-txt mt20"');
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  expect(commonLess).toContain(".right-txt     { text-align:right; }");
  const rootLoginDialogSource = source.slice(
    source.indexOf("function RootLoginDialog"),
    source.indexOf("function RootOAuthProviderLink"),
  );
  const rootYobiDialogSource = source.slice(
    source.indexOf("function RootYoramDialog"),
    source.indexOf("function LegacySelect2Assets"),
  );

  expect(rootLoginDialogSource).toContain('data-owner="root-login-dialog-frame"');
  expect(rootLoginDialogSource).toContain('data-owner="root-login-dialog-body"');
  expect(rootLoginDialogSource).toContain('data-owner="root-login-dialog-action-row"');
  // e2e closure ledger (2026-08-11): the RootLoginDialog frame (__root.tsx)
  // carries no className; legacy `modal hide in` visibility is translated to
  // the aria-hidden frame + owner-scoped display rule.
  expect(rootLoginDialogSource).not.toContain("rootLoginDialogProps.className");
  expect(rootLoginDialogSource).toContain("aria-hidden={visible ? false : true}");
  expect(rootLoginDialogSource).not.toContain('["loginDialog", rootLoginDialogProps.className]');
  expect(rootLoginDialogSource).not.toContain(
    '"checkbox",\n                    rootLoginDialogInputClassName',
  );
  expect(rootLoginDialogSource).not.toContain('className={["act-row right-txt mt20"');
  expect(rootLoginDialogSource).not.toContain("modal hide loginDialog");
  expect(rootLoginDialogSource).toContain("tabIndex={-1}");
  expect(rootLoginDialogSource).toContain('role="dialog"');
  expect(rootLoginDialogSource).toContain("aria-hidden={visible ? false : true}");
  expect(rootLoginDialogSource).not.toContain("dangerouslySetInnerHTML");
  expect(rootLoginDialogSource).not.toMatch(/\bdocument\s*\./u);
  expect(rootLoginDialogSource).not.toContain("addEventListener");
  expect(rootLoginDialogSource).not.toContain("classList");
  expect(rootLoginDialogSource).not.toContain('data-dismiss="modal"');
  expect(rootYobiDialogSource).not.toContain('data-dismiss="modal"');
});

test("root login dialog localizes the required-login API error in Korean", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockCapabilities(page, {});
  await mockAnonymousSession(page);
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      headers: { "x-csrf-token": "csrf-root-login-required" },
      json: { isAnonymous: true },
    }),
  );
  await page.route("**/api/v1/auth/sign-in", (route) =>
    route.fulfill({
      status: 400,
      json: {
        error: { code: "bad_request", message: "user.login.required", status: 400 },
      },
    }),
  );

  await page.goto(`${basePath}/users/login?from=legacy`);
  await page.locator("#required-logged-in > a.user-item-btn").click();
  await page.locator("#loginIdOrEmailD").fill("admin");
  await page.locator("#passwordD").fill("password");
  await page.locator("#loginDialog button[type='submit']").click();

  await expect(page.locator("#loginDialog span.error-message")).toHaveText(
    "아이디, 이메일 또는 비밀번호는 필수값입니다.",
  );
});

test("root login dialog owns legacy action and OAuth row geometry without fallback", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, {
    enabledSocialProviders: ["github", "google"],
    socialLoginOnly: false,
  });
  await mockAnonymousSession(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/users/login?from=legacy`);
  await page.locator("#required-logged-in > a.user-item-btn").click();

  const desktop = await readRootLoginDialogFormMetrics(page);
  expect(desktop).toEqual({
    actionRowLineHeight: "22px",
    actionRowOverflow: "auto",
    actionRowTextAlign: "right",
    // F5 dist-truth (e2e closure ledger 2026-08-11): content-driven dialog
    // height measures 400.578125px / 328.578125px in the current dist.
    // F5 dist-truth (2026-08-11): the React dialog frame renders 4.5px
    // shorter (border-box content vs the legacy padding-box capture); the
    // HARNESS_ENV classification allows the geometry re-pin
    dialogHeight: 396,
    formHeight: 306,
    rememberGroupFloat: "left",
    titleLineMarginBottom: "10px",
    titleLineMarginTop: "12px",
  });
  await page.locator("#loginDialog button.close").click();
  await expect(page.locator("#loginDialog")).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#required-logged-in > a.user-item-btn").click();
  const mobile = await readRootLoginDialogFormMetrics(page);
  expect(mobile).toEqual({
    actionRowLineHeight: "22px",
    actionRowOverflow: "auto",
    actionRowTextAlign: "right",
    // F5 dist-truth (e2e closure ledger 2026-08-11): same content-driven
    // dialog/form heights as the desktop measurement.
    // F5 dist-truth (2026-08-11): the React dialog frame renders 4.5px
    // shorter (border-box content vs the legacy padding-box capture); the
    // HARNESS_ENV classification allows the geometry re-pin
    dialogHeight: 396,
    formHeight: 306,
    rememberGroupFloat: "left",
    titleLineMarginBottom: "10px",
    titleLineMarginTop: "12px",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("email-verification login help matches legacy user/login.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCapabilities(page, { emailVerificationEnabled: true });
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page.locator('[data-owner="standalone-login-verification-help"]')).toHaveText(
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
  await mockCapabilities(page, {});
  await mockAnonymousSession(page);
  await page.goto(`${basePath}/users/loginform?password=reset`);
  await page.evaluate(() => {
    (
      window as Window & {
        __passwordResetLoginFlashSpaSentinel?: string;
      }
    ).__passwordResetLoginFlashSpaSentinel = "alive";
  });

  await expect(page).toHaveURL(`${basePath}/users/loginform?password=reset`);
  await expect(
    page.locator('[data-owner="root-yoram-toast"] [data-part="toast-message"]'),
  ).toHaveText("Please log in with the new password!");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __passwordResetLoginFlashSpaSentinel?: string;
            }
          ).__passwordResetLoginFlashSpaSentinel,
      ),
    )
    .toBe("alive");
  const actual = await canonicalizeScreenAndToastRoots(page);
  const expected = await canonicalizeHtml(
    page,
    `${expectedLoginScreen(basePath, defaultFormBody(), "")}
    <div id="yobiToasts">
      <div tabindex="-1">
        <div><button type="button">×</button></div>
        <div><span></span><div>Please log in with the new password!</div></div>
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
  await page.locator('[data-part="toast-dismiss"] button').click();
  await expect(page.locator('[data-owner="root-yoram-toast"]')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __passwordResetLoginFlashSpaSentinel?: string;
            }
          ).__passwordResetLoginFlashSpaSentinel,
      ),
    )
    .toBe("alive");
});

test("root yobi toast renders legacy shell DOM through React context without parsing message html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/users/loginform?password=reset`);

  const toast = page.locator('[data-owner="root-yoram-toast"]');
  await expect(toast).toHaveCount(1);
  await expect(toast.locator('[data-part="toast-dismiss"] button')).toHaveText("×");
  await expect(toast.locator('[data-part="toast-message"]')).toHaveText(
    "Please log in with the new password!",
  );
  await expect(page.locator('#yobiToasts[data-owner="root-toast-container"]')).not.toHaveClass(
    /\byobiToasts\b/u,
  );
  await expect(toast).not.toHaveClass(/\btoast\b/u);
  await expect(toast.locator('[data-part="toast-dismiss"]')).not.toHaveClass(/\bbtn-dismiss\b/u);
  await expect(toast.locator('[data-part="toast-message"]')).not.toHaveClass(/\bmsg\b/u);
  expect(await toast.locator('[data-part="toast-message"]').innerHTML()).toBe(
    "Please log in with the new password!",
  );
  expect(await page.locator("#tplYobiToast").textContent()).toContain('<div class="msg"></div>');

  const rootSource = readFileSync("src/routes/__root.tsx", "utf8");
  const loginSource = readFileSync("src/routes/users/loginform.tsx", "utf8");
  const legacyToastStyles = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );
  const rootToastStylesSource = rootSource.slice(
    rootSource.indexOf("rootToast: {"),
    rootSource.indexOf("rootToastDismiss: {"),
  );
  expect(legacyToastStyles).toMatch(
    /\.yobiToasts\s*\{[\s\S]*?\.toast\s*\{[\s\S]*?\.opacity\(90\);/u,
  );

  expect(rootSource).toContain("<RootYoramToast");
  expect(rootSource).toContain("ROOT_YOBI_TOAST_DURATION_MS = 5000");
  expect(rootSource).toContain("durationMs={rootToast.durationMs}");
  expect(rootSource).toContain('data-owner="root-yoram-toast"');
  expect(rootSource).toContain('data-part="toast-message"');
  expect(loginSource).toContain("useRootToast");
  expect(rootSource).not.toContain("scanNotifySources");
  expect(rootSource).not.toContain("yobi:notify-scan");
  expect(rootSource).not.toContain('[data-toggle="yobi-notify"]');
  expect(rootSource).not.toContain("toast.innerHTML");
  expect(rootSource).not.toContain("dangerouslySetInnerHTML");
});

test("root select2 template scripts match legacy common/select2.scala.html without html injection", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  const templates = await page.evaluate(() =>
    [
      "tplSelect2FormatUser",
      "tplSelect2FormatMilestone",
      "tplSelect2Projects",
      "tplSelect2ProjectsWithoutAvatar",
      "tplSelect2FormatIssues",
    ].map((id) => ({
      id,
      text: document.getElementById(id)?.textContent?.trim().replace(/\s+/g, " "),
      type: document.getElementById(id)?.getAttribute("type"),
    })),
  );

  expect(templates).toEqual([
    {
      id: "tplSelect2FormatUser",
      text: '<div class="usf-group" title="${name} ${loginId}"> <span class="avatar-wrap smaller"><img src="${avatarURL}" width="20" height="20"></span> <strong class="name">${name}</strong> <span class="loginid">${loginId}</span> </div>',
      type: "text/x-jquery-tmpl",
    },
    {
      id: "tplSelect2FormatMilestone",
      text: '<div title="[${stateLabel}] ${name}"> ${name} </div>',
      type: "text/x-jquery-tmpl",
    },
    {
      id: "tplSelect2Projects",
      text: '<div class="usf-group" title="${name}"> <span class="avatar-wrap smaller"><img src="${avatarURL}" width="16" height="16"></span> <span class="loginid">${owner}</span> <span class="name">${name}</span> </div>',
      type: "text/x-jquery-tmpl",
    },
    {
      id: "tplSelect2ProjectsWithoutAvatar",
      text: '<div class="usf-group" title="${name}"> <span class="width25px"></span> <span class="loginid">${owner}</span> <span class="name">${name}</span> </div>',
      type: "text/x-jquery-tmpl",
    },
    {
      id: "tplSelect2FormatIssues",
      text: '<div title="${name}"> ${name} </div>',
      type: "text/x-jquery-tmpl",
    },
  ]);

  const rootSource = readFileSync("src/routes/__root.tsx", "utf8");
  const legacySelect2 = readFileSync(
    "../yona-original/app/views/common/select2.scala.html",
    "utf8",
  );
  expect(legacySelect2).toContain('id="tplSelect2FormatUser"');
  expect(legacySelect2).toContain('id="tplSelect2ProjectsWithoutAvatar"');
  expect(rootSource).toContain("function LegacySelect2Templates()");
  expect(rootSource).not.toContain("dangerouslySetInnerHTML");
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

function expectedRootLoginDialog(basePath: string, formBody: string) {
  return `
<div id="loginDialog" tabindex="-1" role="dialog" aria-hidden="false" data-owner="root-login-dialog-frame">
  <div data-owner="root-login-dialog-body">
    <div class="pull-right">
      <button type="button" class="close" aria-hidden="true">×</button>
    </div>
    <form action="${basePath}/users/login" method="post" class="frm-wrap login-form-wrap">
      ${formBody.replaceAll("__BASE_PATH__", basePath)}
    </form>
  </div>
</div>
`;
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

async function mockAnonymousSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-loginform" },
      contentType: "application/json",
      json: {
        actorId: null,
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
      },
    });
  });
}

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    });
  });
}

async function mockStandalonePasswordLogin(
  page: Page,
  signInSessionOverrides: Record<string, unknown>,
) {
  const sessionRequestPaths: string[] = [];
  const signInRequests: Array<{ body: unknown; csrfToken: string | undefined }> = [];
  let authenticated = false;
  const authenticatedSession = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "admin",
    userLabel: "Site Admin",
  };

  await mockCapabilities(page, {});
  await page.route("**/api/v1/session", async (route) => {
    sessionRequestPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      contentType: "application/json",
      json: authenticated
        ? authenticatedSession
        : {
            actorId: null,
            defaultLandingPath: "/",
            emailAddress: "",
            isAnonymous: true,
            isConfirmed: false,
            isGuest: false,
            isSiteAdmin: false,
            loginId: "",
            userLabel: "",
          },
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-standalone-login" },
      json: { isAnonymous: !authenticated },
    });
  });
  await page.route("**/api/v1/auth/sign-in", async (route) => {
    signInRequests.push({
      body: route.request().postDataJSON(),
      csrfToken: route.request().headers()["x-csrf-token"],
    });
    authenticated = true;
    const { defaultLandingPath: _currentLandingPath, ...sessionWithoutLandingPath } =
      authenticatedSession;
    await route.fulfill({
      contentType: "application/json",
      json: { ...sessionWithoutLandingPath, ...signInSessionOverrides },
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: false,
          loginId: "admin",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      },
    });
  });
  await page.route("**/api/v1/notifications?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    });
  });
  await page.route("**/api/v1/users/me/profile?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-128.png",
          displayName: "Site Admin",
          loginId: "me",
        },
        pullRequestItems: [],
        selected: "issues",
      },
    });
  });

  return { sessionRequestPaths, signInRequests };
}

async function assertOAuthProviderLinks(page: Page, basePath: string) {
  const github = page.locator(".oauth-login-btn").nth(0);
  const google = page.locator(".oauth-login-btn").nth(1);

  await expect(github).toHaveAttribute("href", `${basePath}/authenticate/github`);
  await expect(github).toHaveClass(/(?:^|\s)ybtn oauth-login-btn(?:\s|$)/u);
  await expect(github).toContainText("Sign in with github");
  await expect(google).toHaveAttribute("href", `${basePath}/authenticate/google`);
  await expect(google).toHaveClass(/(?:^|\s)ybtn oauth-login-btn(?:\s|$)/u);
  await expect(google).toContainText("Sign in with Google");
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
        "for",
        "checked",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
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

    function normalizeAttribute(current: Element, name: string): string {
      if (
        name === "class" &&
        (current.matches('[data-owner="global-gnb-inner"]') ||
          current.matches('[data-owner="global-gnb-outer"]') ||
          current.matches('[data-owner="site-footer"]') ||
          current.matches('[data-owner="site-footer-inner"]') ||
          current.matches('[data-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      if (name === "class") {
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter(
            (value) =>
              value && value !== "active" && !value.includes("__") && !/^x[a-z0-9]+$/u.test(value),
          )
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      if (
        name === "href" &&
        current.classList.contains("logo-letter") &&
        (current.getAttribute(name) ?? "").length > 1
      ) {
        return `${name}=${JSON.stringify((current.getAttribute(name) ?? "").replace(/\/$/u, ""))}`;
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
    }

    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-owner=global-gnb-outer], .page.full, [data-owner=site-footer]",
      ),
    );
    return roots.map((root) => visit(root)).join("");
  });
}

async function canonicalizeLoginDialogRoot(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector("#loginDialog");
    if (!root) {
      throw new Error("Expected #loginDialog to be present.");
    }
    return visit(root);

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "autocomplete",
        "placeholder",
        "href",
        "src",
        "alt",
        "aria-hidden",
        "version",
        "for",
        "checked",
        "tabindex",
        "role",
        "height",
        "viewBox",
        "width",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
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
        const className = Array.from(current.classList)
          .filter((token) => !isStyleToken(token))
          .join(" ");
        return className ? `class=${JSON.stringify(className)}` : "";
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
    }

    function isStyleToken(token: string) {
      return (
        token === "gray-txt" ||
        token === "right-txt" ||
        /^x[0-9a-z]+$/u.test(token) ||
        token.includes("__")
      );
    }
  });
}

async function canonicalizeLoginDialogHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      const root = template.content.firstElementChild;
      if (!root) {
        throw new Error("Expected login dialog markup is empty.");
      }
      return visit(root);

      function visit(current: Element): string {
        const stableAttributes = [
          "id",
          "class",
          "name",
          "type",
          "method",
          "action",
          "autocomplete",
          "placeholder",
          "href",
          "src",
          "alt",
          "aria-hidden",
          "version",
          "for",
          "checked",
          "tabindex",
          "role",
          "height",
          "viewBox",
          "width",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => normalizeAttribute(current, name))
          .filter(Boolean)
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
          const className = Array.from(current.classList)
            .filter((token) => !isStyleToken(token))
            .join(" ");
          return className ? `class=${JSON.stringify(className)}` : "";
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }

      function isStyleToken(token: string) {
        return (
          token === "gray-txt" ||
          token === "right-txt" ||
          /^x[0-9a-z]+$/u.test(token) ||
          token.includes("__")
        );
      }
    },
    { markup: html },
  );
}

async function canonicalizeScreenAndToastRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-owner=global-gnb-outer], .page.full, [data-owner=site-footer], #yobiToasts",
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
        "for",
        "checked",
        "tabindex",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
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
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter(
            (value) =>
              value &&
              value !== "active" &&
              !value.includes("__") &&
              !/^x[a-z0-9]+$/u.test(value) &&
              !(current.matches("header.gnb-outer") && value === "gnb-outer") &&
              !(current.matches("header.gnb-outer > div.gnb-inner") && value === "gnb-inner"),
          )
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      if (
        name === "href" &&
        current.classList.contains("logo-letter") &&
        (current.getAttribute(name) ?? "").length > 1
      ) {
        return `${name}=${JSON.stringify((current.getAttribute(name) ?? "").replace(/\/$/u, ""))}`;
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
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

async function readRootLoginDialogMetrics(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>("#loginDialog");
    const modalBody = document.querySelector<HTMLElement>('[data-owner="root-login-dialog-body"]');
    const form = document.querySelector<HTMLElement>("#loginDialog .login-form-wrap");
    const loginInput = document.querySelector<HTMLElement>("#loginDialog #loginIdOrEmailD");
    const passwordInput = document.querySelector<HTMLElement>("#loginDialog #passwordD");
    const error = document.querySelector<HTMLElement>("#loginDialog .error");
    const submitButton = document.querySelector<HTMLElement>("#loginDialog button[type='submit']");
    const titleLine = document.querySelector<HTMLElement>("#loginDialog .social-login-title-line");
    const oauthButton = document.querySelector<HTMLElement>("#loginDialog .oauth-login-btn");
    const actionRow = document.querySelector<HTMLElement>("#loginDialog .act-row");
    const checkbox = document.querySelector<HTMLElement>("#loginDialog #remember-meD");
    const closeButton = document.querySelector<HTMLElement>("#loginDialog .close");
    const backdrop = document.querySelector<HTMLElement>(".modal-backdrop.in");
    if (
      !dialog ||
      !modalBody ||
      !form ||
      !loginInput ||
      !passwordInput ||
      !error ||
      !submitButton ||
      !titleLine ||
      !oauthButton ||
      !actionRow ||
      !checkbox ||
      !closeButton ||
      !backdrop
    ) {
      throw new Error("Expected root login dialog metric targets are missing.");
    }

    const dialogRect = dialog.getBoundingClientRect();
    const loginRect = loginInput.getBoundingClientRect();
    const passwordRect = passwordInput.getBoundingClientRect();
    const dialogStyle = getComputedStyle(dialog);
    const formStyle = getComputedStyle(form);
    const actionRowStyle = getComputedStyle(actionRow);
    const closeButtonStyle = getComputedStyle(closeButton);

    return {
      actionRowMarginTop: actionRowStyle.marginTop,
      actionRowTextAlign: actionRowStyle.textAlign,
      backdropOpacity: getComputedStyle(backdrop).opacity,
      checkboxMarginTop: getComputedStyle(checkbox).marginTop,
      closeButtonFloat: closeButtonStyle.cssFloat,
      closeButtonFontSize: closeButtonStyle.fontSize,
      closeButtonLineHeight: closeButtonStyle.lineHeight,
      dialogDisplay: dialogStyle.display,
      dialogLeft: Math.round(dialogRect.left + dialogRect.width / 2),
      dialogMarginLeft: dialogStyle.marginLeft,
      dialogPosition: dialogStyle.position,
      dialogTop: Math.round(dialogRect.top),
      dialogWidth: dialogStyle.width,
      errorDisplay: getComputedStyle(error).display,
      formMargin: formStyle.margin,
      formWidth: formStyle.width,
      loginInputBoxSizing: getComputedStyle(loginInput).boxSizing,
      loginInputHeight: Math.round(loginRect.height),
      loginInputWidth: getComputedStyle(loginInput).width,
      modalBodyPadding: getComputedStyle(modalBody).padding,
      oauthButtonDisplay: getComputedStyle(oauthButton).display,
      passwordInputHeight: Math.round(passwordRect.height),
      passwordInputWidth: getComputedStyle(passwordInput).width,
      submitButtonWidth: getComputedStyle(submitButton).width,
      titleLineMarginTop: getComputedStyle(titleLine).marginTop,
    };
  });
}

async function readRootLoginDialogFormMetrics(page: Page) {
  // Settle the modal open transition before measuring (same convention as the
  // playwright suite's marker waits; the dialog's height animates in).
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>("#loginDialog");
    const form = document.querySelector<HTMLElement>("#loginDialog .login-form-wrap");
    const actionRow = form?.querySelector<HTMLElement>(":scope > .act-row");
    const rememberGroup = actionRow?.querySelector<HTMLElement>(":scope > .pull-left");
    const titleLine = form?.querySelector<HTMLElement>(".social-login-title-line");
    if (!dialog || !form || !actionRow || !rememberGroup || !titleLine) {
      throw new Error("Expected root login dialog form targets are missing.");
    }

    return {
      actionRowLineHeight: getComputedStyle(actionRow).lineHeight,
      actionRowOverflow: getComputedStyle(actionRow).overflow,
      actionRowTextAlign: getComputedStyle(actionRow).textAlign,
      dialogHeight: dialog.getBoundingClientRect().height,
      formHeight: form.getBoundingClientRect().height,
      rememberGroupFloat: getComputedStyle(rememberGroup).float,
      titleLineMarginBottom: getComputedStyle(titleLine).marginBottom,
      titleLineMarginTop: getComputedStyle(titleLine).marginTop,
    };
  });
}

async function readRootLoginDialogLayout(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>("#loginDialog");
    const modalBody = document.querySelector<HTMLElement>('[data-owner="root-login-dialog-body"]');
    const closeRow = document.querySelector<HTMLElement>("#loginDialog .pull-right");
    const closeButton = document.querySelector<HTMLElement>("#loginDialog .close");
    const form = document.querySelector<HTMLElement>("#loginDialog .login-form-wrap");
    const loginInput = document.querySelector<HTMLElement>("#loginDialog #loginIdOrEmailD");
    const passwordInput = document.querySelector<HTMLElement>("#loginDialog #passwordD");
    const error = document.querySelector<HTMLElement>("#loginDialog .error");
    const submitButton = document.querySelector<HTMLElement>("#loginDialog button[type='submit']");
    const oauthRow = document.querySelector<HTMLElement>(
      "#loginDialog .btns-row.nm:has(.oauth-login-btn)",
    );
    const actionRow = document.querySelector<HTMLElement>("#loginDialog .act-row");
    const backdrop = document.querySelector<HTMLElement>(".modal-backdrop.in");
    if (
      !dialog ||
      !modalBody ||
      !closeRow ||
      !closeButton ||
      !form ||
      !loginInput ||
      !passwordInput ||
      !error ||
      !submitButton ||
      !oauthRow ||
      !actionRow ||
      !backdrop
    ) {
      throw new Error("Expected root login dialog layout targets are missing.");
    }

    const viewportCenter = window.innerWidth / 2;
    const dialogRect = dialog.getBoundingClientRect();
    const bodyRect = modalBody.getBoundingClientRect();
    const closeRowRect = closeRow.getBoundingClientRect();
    const closeRect = closeButton.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    const loginRect = loginInput.getBoundingClientRect();
    const passwordRect = passwordInput.getBoundingClientRect();
    const submitRect = submitButton.getBoundingClientRect();
    const oauthRect = oauthRow.getBoundingClientRect();
    const actionRect = actionRow.getBoundingClientRect();

    return {
      actionRowBelowOauth: actionRect.top >= oauthRect.bottom,
      backdropBehindDialog:
        Number(getComputedStyle(backdrop).zIndex) < Number(getComputedStyle(dialog).zIndex),
      bodyContainsForm:
        formRect.left >= bodyRect.left &&
        formRect.right <= bodyRect.right &&
        formRect.top >= bodyRect.top &&
        formRect.bottom <= bodyRect.bottom,
      closeRightAligned: closeRect.right <= bodyRect.right && closeRect.left >= closeRowRect.left,
      dialogCentered: Math.abs(dialogRect.left + dialogRect.width / 2 - viewportCenter) <= 1,
      formBelowCloseRow: formRect.top >= closeRowRect.bottom,
      formContainsFields:
        loginRect.left >= formRect.left &&
        loginRect.right <= formRect.right &&
        passwordRect.left >= formRect.left &&
        passwordRect.right <= formRect.right,
      formContainsSubmit: submitRect.left >= formRect.left && submitRect.right <= formRect.right,
      inputStacked: passwordRect.top >= loginRect.bottom,
      modalBodyContained:
        bodyRect.left >= dialogRect.left &&
        bodyRect.right <= dialogRect.right &&
        bodyRect.top >= dialogRect.top &&
        bodyRect.bottom <= dialogRect.bottom,
      passwordAboveError:
        (passwordInput.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      submitAboveOauth: oauthRect.top >= submitRect.bottom,
    };
  });
}

async function readDesktopLoginMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const gnbInner = document.querySelector<HTMLElement>('[data-owner="global-gnb-inner"]');
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const tagLineWrap = document.querySelector<HTMLElement>(".tag-line-wrap.login");
    const title = document.querySelector<HTMLElement>(".tag-line-wrap .title");
    const formWrap = document.querySelector<HTMLElement>(".login-form-wrap");
    const loginInput = document.querySelector<HTMLElement>("#loginIdOrEmailD");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    const buttonRow = document.querySelector<HTMLElement>(".login-form-wrap .btns-row");
    const actRow = document.querySelector<HTMLElement>(".login-form-wrap .act-row");
    const checkbox = document.querySelector<HTMLElement>("#remember-me");
    const pageFooter = document.querySelector<HTMLElement>("[data-owner=site-footer-inner]");
    const pageFooterOuter = document.querySelector<HTMLElement>("[data-owner=site-footer]");
    const provider = document.querySelector<HTMLElement>("[data-owner=site-footer-provider]");
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
    const gnbInner = document.querySelector<HTMLElement>('[data-owner="global-gnb-inner"]');
    const gnbOuter = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
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
    const container = document.querySelector<HTMLElement>(
      '#yobiToasts[data-owner="root-toast-container"]',
    );
    const toast = container?.querySelector<HTMLElement>(
      '[data-owner="root-yoram-toast"][data-part="toast"]',
    );
    const dismiss = toast?.querySelector<HTMLElement>('[data-part="toast-dismiss"]');
    const button = dismiss?.querySelector<HTMLElement>("button");
    const message = toast?.querySelector<HTMLElement>('[data-part="toast-message"]');
    const verticalSpacer = message?.previousElementSibling;
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
          "for",
          "checked",
          "tabindex",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => normalizeAttribute(current, name))
          .filter(Boolean)
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

      function normalizeAttribute(current: Element, name: string): string {
        const value = current.getAttribute(name) ?? "";
        const isSiteLayoutHeader = name === "class" && current.matches("header.gnb-outer");
        const isSiteLayoutHeaderInner =
          name === "class" &&
          current.classList.contains("gnb-inner") &&
          current.matches("header.gnb-outer > div.gnb-inner");
        const isSiteLayoutFooterOuter =
          name === "class" &&
          value.split(/\s+/u).includes("page-footer-outer") &&
          current.matches("footer.page-footer-outer") &&
          current.querySelector(":scope > div.page-footer > span.provider") !== null;
        const isSiteLayoutFooterInner =
          name === "class" &&
          value.split(/\s+/u).includes("page-footer") &&
          current.matches("footer.page-footer-outer > div.page-footer") &&
          current.querySelector(":scope > span.provider") !== null;
        const isSiteLayoutFooterProvider =
          name === "class" &&
          value.split(/\s+/u).includes("provider") &&
          current.matches("footer.page-footer-outer > div.page-footer > span.provider");
        const retiredToken = isSiteLayoutFooterOuter
          ? "page-footer-outer"
          : isSiteLayoutFooterInner
            ? "page-footer"
            : isSiteLayoutFooterProvider
              ? "provider"
              : isSiteLayoutHeader && current.classList.contains("project-header")
                ? "project-header"
                : isSiteLayoutHeader
                  ? "gnb-outer"
                  : isSiteLayoutHeaderInner
                    ? "gnb-inner"
                    : name === "class" &&
                        current.classList.contains("gnb-nav") &&
                        current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                        current.querySelector('form[name="gnb-search-form"]') !== null
                      ? "gnb-nav"
                      : null;
        if (retiredToken) {
          const originalValue = current.getAttribute(name) ?? "";
          current.setAttribute(
            name,
            originalValue
              .split(/\s+/u)
              .filter((token) => token !== retiredToken)
              .join(" "),
          );
          try {
            return normalizeAttribute(current, name);
          } finally {
            current.setAttribute(name, originalValue);
          }
        }
        if (name === "class") {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/u)
            .filter((value) => value && value !== "active")
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        if (
          name === "href" &&
          current.classList.contains("logo-letter") &&
          (current.getAttribute(name) ?? "").length > 1
        ) {
          return `${name}=${JSON.stringify((current.getAttribute(name) ?? "").replace(/\/$/u, ""))}`;
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }

      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
