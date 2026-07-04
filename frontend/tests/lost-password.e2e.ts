import { expect, test, type Page } from "@playwright/test";

const EXPECTED_LOST_PASSWORD_SCREEN = `
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
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
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
        <a href="__BASE_PATH__/users/loginform" class="user-item-btn">Log in</a>
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
    __ALERT__
    <form method="post" action="/lostPassword">
      <dl>
        <dd>
          <input type="text" id="loginId" name="loginId" required="required" placeholder="Login ID" class="text">
        </dd>
        <dd>
          <input type="text" id="emailAddress" name="emailAddress" required="" placeholder="Email address" class="text">
        </dd>
      </dl>
      <div class="btns-row">
        <button type="submit" class="ybtn ybtn-primary ybtn-large ybtn-fullsize">Confirm</button>
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

const SUCCESS_ALERT = `
<div class="alert alert-success">
  <button type="button" class="close" data-dismiss="alert">&times;</button>
  <h4>Mail has been sent.</h4>
</div>
`;

const ERROR_ALERT = `
<div class="alert alert-error">
  <button type="button" class="close" data-dismiss="alert">&times;</button>
  <h4>Failed to send mail.</h4>
  Invalid password reset request
</div>
`;

test("anonymous lost-password form matches legacy site/lostPassword.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/lostPassword`);

  await expect(page.locator(".page.full")).toBeVisible();
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(page, expectedLostPasswordScreen(basePath, ""));

  expect(actual).toEqual(expected);
  expect(await readDesktopLostPasswordMetrics(page)).toEqual({
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
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileLostPasswordMetrics(page)).toEqual({
    emailInputFontSize: "16px",
    formWidth: "370.5px",
    gnbInnerWidth: 363,
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    loginInputFontSize: "16px",
    loginInputWidth: "351.969px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
  });
});

test("authenticated lost-password form prefills current user like legacy", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/lostPassword`);
  await expect(page.locator("#loginId")).toHaveValue("doortts");
  await expect(page.locator("#loginId")).toHaveAttribute("value", "doortts");
  await expect(page.locator("#emailAddress")).toHaveValue("doortts@example.com");
  await expect(page.locator("#emailAddress")).toHaveAttribute("value", "doortts@example.com");
});

test("lost-password requested alert matches legacy site/lostPassword.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/lostPassword?requested=1`);

  await expect(page.locator(".alert.alert-success")).toBeVisible();
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    expectedLostPasswordScreen(basePath, SUCCESS_ALERT),
  );

  expect(actual).toEqual(expected);
  expect(await readLostPasswordAlertMetrics(page, ".alert-success")).toEqual({
    alertBackgroundColor: "rgb(223, 240, 216)",
    alertBorderColor: "rgb(214, 233, 198)",
    alertBorderRadius: "4px",
    alertColor: "rgb(70, 136, 71)",
    alertMarginBottom: "20px",
    alertPadding: "8px 35px 8px 14px",
    alertWidth: 400,
    closeLineHeight: "20px",
    closeRight: "-21px",
    closeTop: "-2px",
    headingColor: "rgb(70, 136, 71)",
    headingFontSize: "15px",
    headingMargin: "0px",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readLostPasswordAlertMetrics(page, ".alert-success")).toEqual({
    alertBackgroundColor: "rgb(223, 240, 216)",
    alertBorderColor: "rgb(214, 233, 198)",
    alertBorderRadius: "4px",
    alertColor: "rgb(70, 136, 71)",
    alertMarginBottom: "20px",
    alertPadding: "8px 35px 8px 14px",
    alertWidth: 371,
    closeLineHeight: "20px",
    closeRight: "-21px",
    closeTop: "-2px",
    headingColor: "rgb(70, 136, 71)",
    headingFontSize: "15px",
    headingMargin: "0px",
  });
});

test("lost-password requested alert close follows legacy Bootstrap data-dismiss behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/lostPassword?requested=1`);

  const alert = page.locator(".login-form-wrap .alert.alert-success");
  await expect(alert).toBeVisible();
  await expect(alert.locator('[data-dismiss="alert"]')).toHaveCount(1);

  await alert.locator('[data-dismiss="alert"]').click();

  await expect(page.locator(".login-form-wrap .alert.alert-success")).toHaveCount(0);
  await expect(page.locator(".login-form-wrap form")).toBeVisible();
});

test("lost-password invalid-request alert matches legacy site/lostPassword.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/lostPassword?error=site.resetPasswordEmail.invalidRequest`);

  await expect(page.locator(".alert.alert-error")).toBeVisible();
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(page, expectedLostPasswordScreen(basePath, ERROR_ALERT));

  expect(actual).toEqual(expected);
  expect(await readLostPasswordAlertMetrics(page, ".alert-error")).toEqual({
    alertBackgroundColor: "rgb(242, 222, 222)",
    alertBorderColor: "rgb(238, 211, 215)",
    alertBorderRadius: "4px",
    alertColor: "rgb(185, 74, 72)",
    alertMarginBottom: "20px",
    alertPadding: "8px 35px 8px 14px",
    alertWidth: 400,
    closeLineHeight: "20px",
    closeRight: "-21px",
    closeTop: "-2px",
    headingColor: "rgb(185, 74, 72)",
    headingFontSize: "15px",
    headingMargin: "0px",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readLostPasswordAlertMetrics(page, ".alert-error")).toEqual({
    alertBackgroundColor: "rgb(242, 222, 222)",
    alertBorderColor: "rgb(238, 211, 215)",
    alertBorderRadius: "4px",
    alertColor: "rgb(185, 74, 72)",
    alertMarginBottom: "20px",
    alertPadding: "8px 35px 8px 14px",
    alertWidth: 371,
    closeLineHeight: "20px",
    closeRight: "-21px",
    closeTop: "-2px",
    headingColor: "rgb(185, 74, 72)",
    headingFontSize: "15px",
    headingMargin: "0px",
  });
});

test("lost-password invalid error token renders legacy invalid-request copy", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/lostPassword?error=invalid`);

  const alert = page.locator(".login-form-wrap .alert.alert-error");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Failed to send mail.");
  await expect(alert).toContainText("Invalid password reset request");
  await expect(alert).not.toContainText("invalid");
});

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: "42",
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "doortts@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "doortts",
        userLabel: "Door TTS",
      }),
    });
  });
}

function expectedLostPasswordScreen(basePath: string, alertHtml: string) {
  return EXPECTED_LOST_PASSWORD_SCREEN.replaceAll("__BASE_PATH__", basePath).replace(
    "__ALERT__",
    alertHtml,
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

    const roots = Array.from(
      document.querySelectorAll(".unsupported, .gnb-outer, .page.full, .page-footer-outer"),
    );
    return roots.map((root) => visit(root)).join("");
  });
}

async function readDesktopLostPasswordMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const tagLineWrap = document.querySelector<HTMLElement>(".tag-line-wrap.reset-password");
    const title = document.querySelector<HTMLElement>(".tag-line-wrap .title");
    const formWrap = document.querySelector<HTMLElement>(".login-form-wrap");
    const loginInput = document.querySelector<HTMLElement>("#loginId");
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
      !loginInput ||
      !buttonRow ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected lost-password metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const tagLineWrapStyle = getComputedStyle(tagLineWrap);
    const formWrapStyle = getComputedStyle(formWrap);
    const loginInputStyle = getComputedStyle(loginInput);
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

async function readMobileLostPasswordMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const formWrap = document.querySelector<HTMLElement>(".login-form-wrap");
    const loginInput = document.querySelector<HTMLElement>("#loginId");
    const emailInput = document.querySelector<HTMLElement>("#emailAddress");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    if (!gnbOuter || !gnbInner || !formWrap || !loginInput || !emailInput || !pageFooterOuter) {
      throw new Error("Expected mobile lost-password metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const loginInputStyle = getComputedStyle(loginInput);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    return {
      emailInputFontSize: getComputedStyle(emailInput).fontSize,
      formWidth: getComputedStyle(formWrap).width,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      loginInputFontSize: loginInputStyle.fontSize,
      loginInputWidth: loginInputStyle.width,
      pageFooterOuterMinWidth: pageFooterOuterStyle.minWidth,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
    };
  });
}

async function readLostPasswordAlertMetrics(page: Page, selector: string) {
  return page.evaluate((alertSelector) => {
    const alert = document.querySelector<HTMLElement>(alertSelector);
    const close = alert?.querySelector<HTMLElement>(".close");
    const heading = alert?.querySelector<HTMLElement>("h4");
    if (!alert || !close || !heading) {
      throw new Error(`Expected lost-password alert metric targets for ${alertSelector}.`);
    }

    const alertStyle = getComputedStyle(alert);
    const closeStyle = getComputedStyle(close);
    const headingStyle = getComputedStyle(heading);

    return {
      alertBackgroundColor: alertStyle.backgroundColor,
      alertBorderColor: alertStyle.borderTopColor,
      alertBorderRadius: alertStyle.borderTopLeftRadius,
      alertColor: alertStyle.color,
      alertMarginBottom: alertStyle.marginBottom,
      alertPadding: alertStyle.padding,
      alertWidth: Math.round(alert.getBoundingClientRect().width),
      closeLineHeight: closeStyle.lineHeight,
      closeRight: closeStyle.right,
      closeTop: closeStyle.top,
      headingColor: headingStyle.color,
      headingFontSize: headingStyle.fontSize,
      headingMargin: headingStyle.margin,
    };
  }, selector);
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      const element = template.content.firstElementChild;
      if (!element) {
        throw new Error("Expected lost-password screen markup is empty.");
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

      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
