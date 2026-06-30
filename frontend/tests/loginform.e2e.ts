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
    <form action="/users/login" method="POST">
      <input type="hidden" name="redirectUrl" value="/me">
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
          <input id="loginIdOrEmailD" name="loginIdOrEmail" type="text" class="text email" autocomplete="off" placeholder="Login ID or E-mail">
        </dd>
        <dd>
          <input id="password" name="password" type="password" class="text password" autocomplete="off" placeholder="Password">
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

test("anonymous login form matches legacy user/login.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  await expect(page.locator(".page.full")).toBeVisible();
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(page, expectedLoginScreen(basePath, DEFAULT_FORM_BODY));

  expect(actual).toEqual(expected);
  await expect(page.locator(".links-wrap a")).toHaveAttribute("href", `${basePath}/lostPassword`);
});

test("social-login-only form matches legacy user/login.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        emailVerificationEnabled: false,
        enabledSocialProviders: ["github", "google"],
        loginIdPlaceholder: "",
        passwordPlaceholder: "",
        signupRequireConfirm: false,
        socialLoginOnly: true,
      },
    });
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

function expectedLoginScreen(basePath: string, formBody: string) {
  return EXPECTED_LOGIN_SCREEN.replaceAll("__BASE_PATH__", basePath).replace(
    "__FORM_BODY__",
    formBody.replaceAll("__BASE_PATH__", basePath),
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
