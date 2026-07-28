import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const routeSource = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
const legacyNotFoundSource = readFileSync(
  new URL("../../yona-original/app/views/error/notfound_default.scala.html", import.meta.url),
  "utf8",
);
const legacyLayoutSource = readFileSync(
  new URL("../../yona-original/app/views/layout.scala.html", import.meta.url),
  "utf8",
);
const legacyUsermenuSource = readFileSync(
  new URL("../../yona-original/app/views/common/usermenu.scala.html", import.meta.url),
  "utf8",
);
const legacyYobiLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const legacyPageLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const legacySpritesLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_sprites.less", import.meta.url),
  "utf8",
);
const legacyBootstrapSource = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
  "utf8",
);

const EXPECTED_NOT_FOUND_SCREEN = `
<header class="gnb-outer">
  <div class="gnb-inner">
    <a href="__MOUNTED_ROOT__" class="logo"><h1 class="blind">Yoram</h1></a>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/projects">Project list</a></li>
      <li><a href="__BASE_PATH__/_help">Help</a></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button">Favorite</button></li>
          <li class="myProjectList"><button type="button">Project</button></li>
          <li class="myRecentIssueList"><button type="button">Recent History</button></li>
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
      <li><a href="__BASE_PATH__/users/signupform">Sign up</a></li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="error-wrap">
      <i class="ico ico-err2"></i>
      <p>Page not found</p>
      <a href="__MOUNTED_ROOT__" class="ybtn ybtn-info">Home</a>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Yoram authors</span>
  </div>
</footer>
`;

test("unmatched route matches legacy error/notfound_default.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mountedRootHref = basePath === "/" ? "/" : `${basePath}/`;

  expect(legacyNotFoundSource).toContain('@layout(Messages(messageKey))("")');
  expect(legacyNotFoundSource).toContain('<div class="page-wrap-outer">');
  expect(legacyNotFoundSource).toContain('<div class="project-page-wrap">');
  expect(legacyNotFoundSource).toContain('<div class="error-wrap">');
  expect(legacyNotFoundSource).toContain('<i class="ico ico-err2"></i>');
  expect(legacyNotFoundSource).toContain("@Messages(messageKey)");
  expect(legacyNotFoundSource).toContain('@Messages("menu.home")');
  expect(legacyLayoutSource.indexOf("bootstrap/css/bootstrap.css")).toBeLessThan(
    legacyLayoutSource.indexOf("stylesheets/yobi.css"),
  );
  expect(legacyYobiLessSource.indexOf('@import "less/_sprites.less";')).toBeLessThan(
    legacyYobiLessSource.indexOf('@import "less/_page.less";'),
  );
  expect(legacyYobiLessSource.indexOf('@import "less/_page.less";')).toBeLessThan(
    legacyYobiLessSource.indexOf('@import "less/_responsive.less";'),
  );
  expect(legacyPageLessSource).toMatch(
    /\.error-wrap\s*\{[\s\S]*?padding:\s*100px 0px;[\s\S]*?text-align:\s*center;/u,
  );
  expect(legacySpritesLessSource).toMatch(
    /\.ico-err2\s*\{[\s\S]*?width:\s*50px;[\s\S]*?height:\s*80px;[\s\S]*?background-position:\s*-80px -160px;/u,
  );
  expect(legacyBootstrapSource).toContain("p {\n  margin: 0 0 10px;");
  expect(legacyUsermenuSource).toContain('href="@routes.UserApp.userInfo(currentUser.loginId)"');
  expect(routeSource).toContain(
    "const rootNotFoundErrorWrapStyleProps = stylex.props(rootNotFoundStyles.errorWrap);",
  );
  expect(routeSource).toContain(
    "const rootNotFoundGnbOuterStyleProps = stylex.props(styles.rootNotFoundGnbOuter);",
  );
  expect(routeSource).toContain("rootNotFoundErrorIconStyleProps");
  expect(routeSource).toContain("rootNotFoundErrorMessageStyleProps");
  expect(routeSource).toContain("const feedbackUrl = runtimeConfig.feedbackUrl?.trim();");
  expect(routeSource).toContain("feedbackUrl ? (");
  expect(routeSource).not.toContain("github.com/nforge/yobi");
  expect(routeSource).not.toContain("navercorp.com");
  expect(routeSource).not.toContain("developers.naver.com");

  await page.goto(`${basePath}/missing-legacy-route/unknown/screen`);
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator(".error-wrap")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_NOT_FOUND_SCREEN.replaceAll("__MOUNTED_ROOT__", mountedRootHref).replaceAll(
      "__BASE_PATH__",
      basePath,
    ),
  );

  expect(actual).toEqual(expected);
  await expect(page.locator(".gnb-inner > .logo h1")).toHaveText("Yoram");
  await expect(page.locator(".gnb-nav > li > a")).toHaveText(["Project list", "Help"]);
  await expect(page.locator('.gnb-nav a[href*="github.com/nforge/yobi"]')).toHaveCount(0);
  await expect(page.locator(`#mySidenav a[href="${basePath}/anonymous"]`)).toHaveText("Profile");
  await expect(page.locator(".page-footer .provider")).toHaveText("Yoram authors");
  for (const attribute of ["data-toggle", "data-login", "data-placement"]) {
    await expect(page.locator(`.gnb-outer [${attribute}]`)).toHaveCount(0);
  }
  await expect(page.locator(".error-wrap")).toHaveAttribute("class", /(?:^|\s)error-wrap(?:\s|$)/u);
  await expect(page.locator(".error-wrap > .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p")).toHaveText("Page not found");
  await expect(page.locator(".error-wrap > .ybtn.ybtn-info")).toHaveText("Home");
  expect(
    await page
      .locator(".error-wrap")
      .evaluate((node) => [...node.children].map((child) => child.tagName.toLowerCase())),
  ).toEqual(["i", "p", "a"]);
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
    gnbInnerWidth: 1235,
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

test("unmatched route logo and home links preserve bare base path href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mountedRootHref = basePath === "/" ? "/" : `${basePath}/`;
  const missingRoutePath = `${basePath}/missing-legacy-route/unknown/screen`;

  await page.goto(missingRoutePath);
  const logoLink = page.locator(".gnb-inner > .logo");
  const homeLink = page.locator(".error-wrap > .ybtn.ybtn-info");

  await expect(logoLink).toHaveAttribute("href", mountedRootHref);
  await expect(homeLink).toHaveAttribute("href", mountedRootHref);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await homeLink.click();

  await expect(page).toHaveURL(mountedRootHref);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.goto(missingRoutePath);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await logoLink.dispatchEvent("click");

  await expect(page).toHaveURL(mountedRootHref);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("unmatched route keeps legacy mobile error shell proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/missing-legacy-route/unknown/screen`);
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

test("unmatched route usermenu tabs are route-owned buttons", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/missing-legacy-route/unknown/screen`);
  await expect(page.locator("#usermenu-tab-content-list")).toHaveText("Loading...");

  const tabAnchors = page.locator(
    '#mySidenav .nav.nav-tabs.nm li.myOrganizationList > a[href="#myOrganizationList"], ' +
      '#mySidenav .nav.nav-tabs.nm li.myProjectList > a[href="#myProjectList"], ' +
      '#mySidenav .nav.nav-tabs.nm li.myRecentIssueList > a[href="#myRecentIssueList"]',
  );
  await expect(tabAnchors).toHaveCount(0);

  const tabButtons = page.locator("#mySidenav .nav.nav-tabs.nm > li > button");
  await expect(tabButtons).toHaveText(["Favorite", "Project", "Recent History"]);
  await expect(tabButtons).toHaveCount(3);
  for (const button of await tabButtons.all()) {
    await expect(button).toHaveAttribute("type", "button");
    await expect(button).not.toHaveAttribute("data-toggle");
  }

  const originalUrl = page.url();
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "not-found-usermenu-tabs";
  });

  await page.locator("#mySidenav .myProjectList > button").dispatchEvent("click");
  await expect(page.locator("#mySidenav .myOrganizationList")).not.toHaveClass(/active/);
  await expect(page.locator("#mySidenav .myProjectList")).toHaveClass(/active/);
  expect(page.url()).toBe(originalUrl);

  await page.locator("#mySidenav .myRecentIssueList > button").dispatchEvent("click");
  await expect(page.locator("#mySidenav .myProjectList")).not.toHaveClass(/active/);
  await expect(page.locator("#mySidenav .myRecentIssueList")).toHaveClass(/active/);
  expect(page.url()).toBe(originalUrl);

  await page.locator("#mySidenav .myOrganizationList > button").dispatchEvent("click");
  await expect(page.locator("#mySidenav .myRecentIssueList")).not.toHaveClass(/active/);
  await expect(page.locator("#mySidenav .myOrganizationList")).toHaveClass(/active/);
  expect(page.url()).toBe(originalUrl);
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
    )
    .toBe("not-found-usermenu-tabs");
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
      const stableAttributes = ["id", "class", "href", "target", "type"];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => {
          const value = current.getAttribute(name) ?? "";
          if (name !== "class") return `${name}=${JSON.stringify(value)}`;
          const stableClassName = value
            .split(/\s+/u)
            .filter((token) => token && !/^x[a-z0-9]+$/u.test(token) && !token.includes("__"))
            .join(" ");
          return stableClassName ? `class=${JSON.stringify(stableClassName)}` : "";
        })
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
        const stableAttributes = ["id", "class", "href", "target", "type"];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => {
            const value = current.getAttribute(name) ?? "";
            if (name !== "class") return `${name}=${JSON.stringify(value)}`;
            const stableClassName = value
              .split(/\s+/u)
              .filter((token) => token && !/^x[a-z0-9]+$/u.test(token) && !token.includes("__"))
              .join(" ");
            return stableClassName ? `class=${JSON.stringify(stableClassName)}` : "";
          })
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
    },
    { markup: html },
  );
}
