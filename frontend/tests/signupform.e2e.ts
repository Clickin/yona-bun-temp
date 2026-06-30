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
            <input type="text" name="keyword" autocomplete="off">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
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
            <input type="text" name="keyword" autocomplete="off">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
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
    passwordMarginBottom: "15px",
    tagLineFontSize: "14px",
    tagLineMarginBottom: "26px",
    tagLinePaddingTop: "40px",
    textHeight: "30px",
    textMarginBottom: "15px",
    textWidth: "386px",
    titleLineHeight: "42px",
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

  await expect(page.locator(".btns-row.nm")).toHaveText("Only allow sign-in via social login");
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
        "placeholder",
        "href",
        "target",
        "title",
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
        "href",
        "target",
        "title",
        "tabindex",
        "data-toggle",
        "data-placement",
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
    const tagLineWrap = document.querySelector<HTMLElement>(".tag-line-wrap.signup");
    const title = document.querySelector<HTMLElement>(".tag-line-wrap .title");
    const tagLine = document.querySelector<HTMLElement>(".tag-line-wrap .tag-line");
    const formWrap = document.querySelector<HTMLElement>(".signup-form-wrap");
    const loginInput = document.querySelector<HTMLElement>("#loginId");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    const buttonRow = document.querySelector<HTMLElement>(".signup-form-wrap .btns-row");
    const actRow = document.querySelector<HTMLElement>(".signup-form-wrap .act-row");
    const actionLink = document.querySelector<HTMLElement>(".signup-form-wrap .go-login");
    if (
      !tagLineWrap ||
      !title ||
      !tagLine ||
      !formWrap ||
      !loginInput ||
      !passwordInput ||
      !buttonRow ||
      !actRow ||
      !actionLink
    ) {
      throw new Error("Expected signup metric targets are missing.");
    }

    const tagLineWrapStyle = getComputedStyle(tagLineWrap);
    const formWrapStyle = getComputedStyle(formWrap);
    const loginInputStyle = getComputedStyle(loginInput);
    const passwordInputStyle = getComputedStyle(passwordInput);
    const buttonRowStyle = getComputedStyle(buttonRow);
    const actionLinkStyle = getComputedStyle(actionLink);
    const actRowStyle = getComputedStyle(actRow);

    return {
      actionLinkColor: actionLinkStyle.color,
      actionLinkFontWeight: actionLinkStyle.fontWeight,
      actionRowColor: actRowStyle.color,
      actionRowTextAlign: actRowStyle.textAlign,
      buttonRowMarginBottom: buttonRowStyle.marginBottom,
      formMarginTop: formWrapStyle.marginTop,
      formWidth: formWrapStyle.width,
      passwordMarginBottom: passwordInputStyle.marginBottom,
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
          "placeholder",
          "href",
          "target",
          "title",
          "tabindex",
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

      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
