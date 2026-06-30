import { expect, test, type Page } from "@playwright/test";

const EXPECTED_NOT_FOUND_SCREEN = `
<header class="gnb-outer">
  <div class="gnb-inner">
    <a href="__BASE_HOME__" class="logo"><h1 class="blind">Yona</h1></a>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/projects">Project list</a></li>
      <li><a href="__BASE_PATH__/_help">Help</a></li>
      <li><a href="https://github.com/nforge/yobi/issues?state=open" target="_blank">Feedback</a></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account settings</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Logout</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorites</a></li>
          <li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Projects</a></li>
          <li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recently visited issues</a></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" id="required-logged-in">
        <a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Login</a>
      </li>
      <li class="divider"></li>
      <li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="error-wrap">
      <i class="ico ico-err2"></i>
      <p>Page not found</p>
      <a href="__BASE_HOME__" class="ybtn ybtn-info">Home</a>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright © <a href="http://navercorp.com/" target="_blank">NAVER Corp.</a> Supported by <a href="https://developers.naver.com/d2/" target="_blank" class="d2-program"><span class="d2">D2</span><span class="program"> Program</span></a></span>
  </div>
</footer>
`;

test("unmatched route matches legacy error/notfound_default.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/missing-legacy-route`);
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator(".error-wrap")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_NOT_FOUND_SCREEN.replaceAll("__BASE_HOME__", `${basePath}/`).replaceAll(
      "__BASE_PATH__",
      basePath,
    ),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopNotFoundMetrics(page)).toEqual({
    errorIconHeight: "80px",
    errorIconWidth: "50px",
    errorPaddingBottom: "100px",
    errorPaddingTop: "100px",
    errorTextColor: "rgb(137, 137, 137)",
    errorTextFontSize: "16px",
    errorTextFontWeight: "700",
    errorTextMarginBottom: "30px",
    errorTextMarginTop: "30px",
    footerLineHeight: "34px",
    footerPaddingBottom: "10px",
    footerPaddingTop: "10px",
    gnbInnerHeight: "40px",
    gnbInnerWidth: 1254,
    gnbOuterBackground: "rgb(27, 27, 27)",
    gnbOuterHeight: "40px",
    homeButtonHeight: "20px",
    logoAfterMarginLeft: "40px",
    logoHeight: "40px",
    logoWidth: "44px",
    pageWrapOuterMarginTop: "10px",
    pageWrapOuterMinHeight: "450px",
    projectPageWrapMarginTop: "20px",
    providerFontSize: "9px",
  });
});

test("unmatched route keeps legacy mobile error shell proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/missing-legacy-route`);
  await expect(page.locator(".error-wrap")).toBeVisible();

  expect(await readMobileNotFoundMetrics(page)).toEqual({
    errorIconHeight: "80px",
    errorIconWidth: "50px",
    errorPaddingBottom: "100px",
    errorPaddingTop: "100px",
    errorTextColor: "rgb(137, 137, 137)",
    errorTextFontSize: "16px",
    errorTextFontWeight: "700",
    errorTextMarginBottom: "30px",
    errorTextMarginTop: "30px",
    footerLineHeight: "34px",
    gnbInnerWidth: 363,
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    homeButtonHeight: "20px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
    pageFooterWidth: 370,
    pageWrapOuterMinWidth: "10px",
    pageWrapOuterPadding: "0px",
    pageWrapOuterWidth: 390,
    projectPageWrapMarginTop: "5px",
    projectPageWrapWidth: 390,
    providerFontSize: "9px",
  });
});

async function readDesktopNotFoundMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".gnb-inner .logo");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const projectPageWrap = document.querySelector<HTMLElement>(".project-page-wrap");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const errorIcon = document.querySelector<HTMLElement>(".error-wrap .ico-err2");
    const errorText = document.querySelector<HTMLElement>(".error-wrap p");
    const homeButton = document.querySelector<HTMLElement>(".error-wrap .ybtn");
    const footerOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const footer = document.querySelector<HTMLElement>(".page-footer");
    const provider = document.querySelector<HTMLElement>(".page-footer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !pageWrapOuter ||
      !projectPageWrap ||
      !errorWrap ||
      !errorIcon ||
      !errorText ||
      !homeButton ||
      !footerOuter ||
      !footer ||
      !provider
    ) {
      throw new Error("Expected not-found metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const errorWrapStyle = getComputedStyle(errorWrap);
    const errorIconStyle = getComputedStyle(errorIcon);
    const errorTextStyle = getComputedStyle(errorText);
    const footerOuterStyle = getComputedStyle(footerOuter);

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
      footerLineHeight: getComputedStyle(footer).lineHeight,
      footerPaddingBottom: footerOuterStyle.paddingBottom,
      footerPaddingTop: footerOuterStyle.paddingTop,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      homeButtonHeight: getComputedStyle(homeButton).height,
      logoAfterMarginLeft: getComputedStyle(logo, "::after").marginLeft,
      logoHeight: logoStyle.height,
      logoWidth: logoStyle.width,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      projectPageWrapMarginTop: getComputedStyle(projectPageWrap).marginTop,
      providerFontSize: getComputedStyle(provider).fontSize,
    };
  });
}

async function readMobileNotFoundMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const projectPageWrap = document.querySelector<HTMLElement>(".project-page-wrap");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const errorIcon = document.querySelector<HTMLElement>(".error-wrap .ico-err2");
    const errorText = document.querySelector<HTMLElement>(".error-wrap p");
    const homeButton = document.querySelector<HTMLElement>(".error-wrap .ybtn");
    const footerOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const footer = document.querySelector<HTMLElement>(".page-footer");
    const provider = document.querySelector<HTMLElement>(".page-footer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !pageWrapOuter ||
      !projectPageWrap ||
      !errorWrap ||
      !errorIcon ||
      !errorText ||
      !homeButton ||
      !footerOuter ||
      !footer ||
      !provider
    ) {
      throw new Error("Expected not-found mobile metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const projectPageWrapStyle = getComputedStyle(projectPageWrap);
    const errorWrapStyle = getComputedStyle(errorWrap);
    const errorIconStyle = getComputedStyle(errorIcon);
    const errorTextStyle = getComputedStyle(errorText);
    const footerOuterStyle = getComputedStyle(footerOuter);

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
      footerLineHeight: getComputedStyle(footer).lineHeight,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      homeButtonHeight: getComputedStyle(homeButton).height,
      pageFooterOuterMinWidth: footerOuterStyle.minWidth,
      pageFooterOuterPadding: footerOuterStyle.padding,
      pageFooterWidth: Math.round(footer.getBoundingClientRect().width),
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      pageWrapOuterPadding: pageWrapOuterStyle.padding,
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      projectPageWrapMarginTop: projectPageWrapStyle.marginTop,
      projectPageWrapWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      providerFontSize: getComputedStyle(provider).fontSize,
    };
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".gnb-outer, .page-wrap-outer, .page-footer-outer"),
    );
    return roots.map((root) => visit(root)).join("");

    function visit(current: Element): string {
      const stableAttributes = ["id", "class", "href", "target", "data-toggle", "data-login"];
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

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");

      function visit(current: Element): string {
        const stableAttributes = ["id", "class", "href", "target", "data-toggle", "data-login"];
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
    },
    { markup: html },
  );
}
