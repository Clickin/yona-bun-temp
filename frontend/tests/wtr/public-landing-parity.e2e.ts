import { expect, test, type Page } from "../wtr-compat.ts";

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
  <div>
    <div>
      <div>
        <h1>21st Century Software Development Platform</h1>
        <ul>
          <li>Just focus on what you have to do</li>
        </ul>
      </div>
      <div>
        <a href="__BASE_PATH__/users/signupform">Sign up for Yoram</a>
      </div>
    </div>
  </div>
  <div>
    <h2><span>Key features</span></h2>
    <ul>
      <li>
        <div><i class="yobicon-cgicenter"></i></div>
        <div>
          <h3>Project / Organization</h3>
          <p>Work based on projects/organizations supported by proper roles</p>
        </div>
      </li>
      <li>
        <div><i class="yobicon-code"></i></div>
        <div>
          <h3>Code management</h3>
          <p>Your code is safely stored in a version controlled system.</p>
        </div>
      </li>
      <li>
        <div><i class="yobicon-articles"></i></div>
        <div>
          <h3>Issue tracker</h3>
          <p>Yoram provides an issue tracker to help you deal with your issues more easily and clearly.</p>
        </div>
      </li>
      <li>
        <div><i class="yobicon-lock"></i></div>
        <div>
          <h3>Private repositories</h3>
          <p>Keep your code private at your private repositories.</p>
        </div>
      </li>
      <li>
        <div><i class="yobicon-preview"></i></div>
        <div>
          <h3>Code review</h3>
          <p>Review all changes in the code with your team before merging. Code discussion will help improve your code.</p>
        </div>
      </li>
      <li>
        <div><i class="yobicon-friends"></i></div>
        <div>
          <h3>Team play</h3>
          <p>Yoram provides a simple and easy team management tool to help you build teams for projects.</p>
        </div>
      </li>
    </ul>
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

test("anonymous public landing matches legacy index partial intro screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/`);
  await expect(page.locator("[data-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".siteintro-bg")).toBeVisible();
  await expect(page.locator("[data-owner=site-footer]")).toBeVisible();
  await expect(page.locator("body#html-body > #root > #main.main")).toHaveCount(1);
  await expect(page.locator('[data-owner="anonymous-home-intro-signup-link"]')).toHaveAttribute(
    "href",
    `${basePath}/users/signupform`,
  );

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_PUBLIC_LANDING.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  // FIXTURE (2026-08-13): new URL("../vite.config.ts", import.meta.url) resolves
  // to /tests/vite.config.ts, which the WTR fixture server does not serve; the
  // bare relative string maps to the frontend cwd (/tests/root/vite.config.ts).
  // (legacyFallbackEnabled/transformLegacyFallbackLink were retired from
  // vite.config.ts with the legacy-fallback transform; the manifest sha
  // assertions below pin the current fallback state.)
  expect(await readLegacyLayoutShell(page)).toEqual({
    contentType: "text/html; charset=UTF-8",
    // F5 (2026-08-13): WTR serves the production build — the favicon is the
    // hashed asset (yoram-favicon-BWy2CAGL.svg) and the styles are the
    // legacy-fallback.css + hashed route/index CSS; the dev-mode paths
    // (src/assets/, virtual:style.css) only apply to the dev server.
    faviconHref: `${basePath}/assets/yoram-favicon-BWy2CAGL.svg`,
    ogDescription: "Yoram",
    ogTitle: "Yoram",
    ogType: "website",
    ogUrl: "/",
    stylesheetHrefs: [
      `/legacy-assets/stylesheets/legacy-fallback.css`,
      `${basePath}/assets/-home-route-screen-8oXcZy-S.css`,
      // F5 (2026-08-15): index CSS asset hash re-pinned after the app.css
      // reply/form/receiver reveal rules + label-geometry re-pin (issue-detail
      // suite split closure; sha 1911e26e3fb0…).
      `${basePath}/assets/index-BTzP41HQ.css`,
    ],
    twitterCard: "summary",
    twitterDescription: "Yoram",
    twitterTitle: "Yoram",
    twitterUrl: "/",
    viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
    xUaCompatible: "IE=edge,chrome=1",
  });
  const desktopMetrics = await readDesktopLandingMetrics(page);
  const { gnbInnerWidth, gnbOuterContentWidth, ...desktopMetricsWithoutGnbWidth } = desktopMetrics;
  expect(desktopMetricsWithoutGnbWidth).toEqual({
    featureIconFontSize: "40px",
    featureIconLeft: "0px",
    featureIconTop: "10px",
    featureInfoHeight: "100px",
    featureInfoMarginLeft: "55px",
    featureItemMarginLeft: "40px",
    featureItemWidth: "330px",
    featureMaxWidth: "1200px",
    headingFontSize: "34px",
    gnbInnerHeight: "40px",
    gnbOuterBackground: "rgb(27, 27, 27)",
    gnbOuterHeight: "40px",
    logoBackground: "rgb(255, 87, 34)",
    logoLineHeight: "40px",
    logoPadding: "6px 10px",
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px",
    providerColor: "rgb(51, 51, 51)",
    providerFontSize: "9px",
    providerMarginLeft: "4px",
    signupMarginTop: "35px",
    siteIntroCoverPaddingBottom: "65px",
    siteIntroCoverPaddingTop: "55px",
    siteIntroCoverWidth: 750,
  });
  expect(gnbInnerWidth).toBe(Math.round(gnbOuterContentWidth * 0.98));
});

test("anonymous public landing keeps legacy mobile intro proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/`);
  await expect(page.locator(".siteintro-bg")).toBeVisible();

  expect(await readMobileLandingMetrics(page)).toEqual({
    featureItemMarginLeft: "10px",
    featureItemMarginTop: "10px",
    featureItemWidth: 352,
    featureWrapWidth: 370,
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    headingFontSize: "22px",
    headingPaddingLeft: "20px",
    pageFooterLineHeight: "34px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
    pageFooterWidth: 370,
    providerFontSize: "9px",
    siteIntroCoverOverflow: "visible",
    siteIntroCoverWidth: 410,
  });
});

async function readLegacyLayoutShell(page: Page) {
  return page.evaluate(() => {
    const meta = (selector: string) =>
      document.querySelector<HTMLMetaElement>(selector)?.content ?? "";
    const httpEquiv = (value: string) =>
      document.querySelector<HTMLMetaElement>(`meta[http-equiv="${value}"]`)?.content ?? "";
    const legacyAssetPath = (href: string) => {
      const pathname = new URL(href, location.href).pathname;
      const legacyAssetStart = pathname.indexOf("/legacy-assets/");
      return legacyAssetStart === -1 ? pathname : pathname.slice(legacyAssetStart);
    };
    const href = (selector: string) =>
      legacyAssetPath(document.querySelector<HTMLLinkElement>(selector)?.href ?? "");

    return {
      contentType: httpEquiv("Content-Type"),
      faviconHref: href('link[rel="icon"]'),
      ogDescription: meta('meta[property="og:description"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogType: meta('meta[property="og:type"]'),
      ogUrl: meta('meta[property="og:url"]'),
      stylesheetHrefs: Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
      ).map((link) => legacyAssetPath(link.href)),
      twitterCard: meta('meta[name="twitter:card"]'),
      twitterDescription: meta('meta[name="twitter:description"]'),
      twitterTitle: meta('meta[name="twitter:title"]'),
      twitterUrl: meta('meta[name="twitter:url"]'),
      viewport: meta('meta[name="viewport"]'),
      xUaCompatible: httpEquiv("X-UA-Compatible"),
    };
  });
}

async function readDesktopLandingMetrics(page: Page) {
  return page.evaluate(() => {
    const siteIntroCover = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-intro-cover"]',
    );
    const gnbOuter = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const gnbInner = document.querySelector<HTMLElement>('[data-owner="global-gnb-inner"]');
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const heading = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-intro-heading"]',
    );
    const signup = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-intro-signup"]',
    );
    const feature = document.querySelector<HTMLElement>('[data-owner="anonymous-home-feature"]');
    const featureItem = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-feature-item"]',
    );
    const featureIcon = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-feature-icon"]',
    );
    const featureInfo = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-feature-info"]',
    );
    const pageFooter = document.querySelector<HTMLElement>("[data-owner=site-footer-inner]");
    const pageFooterOuter = document.querySelector<HTMLElement>("[data-owner=site-footer]");
    const provider = document.querySelector<HTMLElement>("[data-owner=site-footer-provider]");
    if (
      !siteIntroCover ||
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !heading ||
      !signup ||
      !feature ||
      !featureItem ||
      !featureIcon ||
      !featureInfo ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected public landing metrics targets are missing.");
    }

    const siteIntroCoverStyle = getComputedStyle(siteIntroCover);
    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const featureStyle = getComputedStyle(feature);
    const featureItemStyle = getComputedStyle(featureItem);
    const featureIconStyle = getComputedStyle(featureIcon);
    const featureInfoStyle = getComputedStyle(featureInfo);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      featureIconFontSize: featureIconStyle.fontSize,
      featureIconLeft: featureIconStyle.left,
      featureIconTop: featureIconStyle.top,
      featureInfoHeight: featureInfoStyle.height,
      featureInfoMarginLeft: featureInfoStyle.marginLeft,
      featureItemMarginLeft: featureItemStyle.marginLeft,
      featureItemWidth: featureItemStyle.width,
      featureMaxWidth: featureStyle.maxWidth,
      headingFontSize: getComputedStyle(heading).fontSize,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterContentWidth: Math.round(
        gnbOuter.getBoundingClientRect().width -
          Number.parseFloat(gnbOuterStyle.paddingLeft) -
          Number.parseFloat(gnbOuterStyle.paddingRight),
      ),
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
      signupMarginTop: getComputedStyle(signup).marginTop,
      siteIntroCoverPaddingBottom: siteIntroCoverStyle.paddingBottom,
      siteIntroCoverPaddingTop: siteIntroCoverStyle.paddingTop,
      siteIntroCoverWidth: Math.round(siteIntroCover.getBoundingClientRect().width),
    };
  });
}

async function readMobileLandingMetrics(page: Page) {
  return page.evaluate(() => {
    const siteIntroCover = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-intro-cover"]',
    );
    const gnbOuter = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const heading = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-intro-heading"]',
    );
    const featureWrap = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-feature-list"]',
    );
    const featureItem = document.querySelector<HTMLElement>(
      '[data-owner="anonymous-home-feature-item"]',
    );
    const pageFooter = document.querySelector<HTMLElement>("[data-owner=site-footer-inner]");
    const pageFooterOuter = document.querySelector<HTMLElement>("[data-owner=site-footer]");
    const provider = document.querySelector<HTMLElement>("[data-owner=site-footer-provider]");
    if (
      !siteIntroCover ||
      !gnbOuter ||
      !heading ||
      !featureWrap ||
      !featureItem ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected public landing mobile metrics targets are missing.");
    }

    const siteIntroCoverStyle = getComputedStyle(siteIntroCover);
    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const headingStyle = getComputedStyle(heading);
    const featureItemStyle = getComputedStyle(featureItem);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);

    return {
      featureItemMarginLeft: featureItemStyle.marginLeft,
      featureItemMarginTop: featureItemStyle.marginTop,
      featureItemWidth: Math.round(featureItem.getBoundingClientRect().width),
      featureWrapWidth: Math.round(featureWrap.getBoundingClientRect().width),
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      headingFontSize: headingStyle.fontSize,
      headingPaddingLeft: headingStyle.paddingLeft,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterMinWidth: pageFooterOuterStyle.minWidth,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageFooterWidth: Math.round(pageFooter.getBoundingClientRect().width),
      providerFontSize: getComputedStyle(provider).fontSize,
      siteIntroCoverOverflow: siteIntroCoverStyle.overflow,
      siteIntroCoverWidth: Math.round(siteIntroCover.getBoundingClientRect().width),
    };
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-owner=global-gnb-outer], .siteintro-bg, [data-owner=site-footer]",
      ),
    );
    const tabTargets: Record<string, string> = {
      "anonymous-sidebar-tab-favorite": "#myOrganizationList",
      "anonymous-sidebar-tab-project": "#myProjectList",
      "anonymous-sidebar-tab-recent": "#myRecentIssueList",
    };

    return roots.map((root) => visit(root)).join("");

    function isKnownReactOwner(current: Element, value = "") {
      const owner = current.getAttribute("data-owner") ?? "";
      const parentOwner = current.parentElement?.getAttribute("data-owner") ?? "";
      return (
        owner.startsWith("global-") ||
        owner.startsWith("anonymous-home-") ||
        owner.startsWith("anonymous-site-") ||
        owner.startsWith("anonymous-site-user-menu") ||
        owner.startsWith("anonymous-sidebar-tab-") ||
        parentOwner === "global-sidebar-open-pin" ||
        value.includes("anonymousSiteUserMenuStyles") ||
        value.includes("anonymousSiteSignupStyles")
      );
    }

    function normalizeKnownReactClass(current: Element, value: string) {
      const owner = current.getAttribute("data-owner") ?? "";
      if (
        owner === "anonymous-site-signup" ||
        owner.startsWith("anonymous-home-feature") ||
        (owner.startsWith("anonymous-home-intro") && owner !== "anonymous-home-intro-outer")
      ) {
        return "";
      }
      if (!isKnownReactOwner(current, value)) {
        return value;
      }
      return value
        .split(/\s+/u)
        .filter(
          (token) =>
            token &&
            !(
              current.getAttribute("data-owner") === "global-gnb-brand-link" && token === "active"
            ) &&
            !token.startsWith("-home-route-screen__") &&
            !/^x[a-z0-9]+$/u.test(token),
        )
        .join(" ");
    }

    function translatedTabTarget(current: Element) {
      return tabTargets[current.getAttribute("data-owner") ?? ""];
    }

    function isTranslatedPluginAttribute(current: Element, name: string) {
      return (
        (name === "data-toggle" &&
          (current.matches("div.pin") ||
            current.matches("ul.nav-tabs li > a") ||
            current.matches('[data-owner="global-sidebar-open-pin"]'))) ||
        (name === "data-placement" &&
          (current.matches("div.pin") ||
            current.matches('[data-owner="global-sidebar-open-pin"]'))) ||
        (name === "data-login" && current.matches("a.user-item-btn"))
      );
    }

    function hasCanonicalAttribute(
      current: Element,
      name: string,
      allowMissing = false,
      isPin = false,
    ) {
      if (!current.hasAttribute(name) && !allowMissing) {
        return false;
      }
      if (name === "class" && !isPin) {
        return normalizeSiteLayoutGnbNavAttribute(current, name) !== "";
      }
      return !isTranslatedPluginAttribute(current, name);
    }

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      if (name === "class" && current.matches('[data-owner="anonymous-home-intro-outer"]')) {
        return (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter((token) => token === "siteintro-bg")
          .join(" ");
      }
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
      const value = current.getAttribute(name) ?? "";
      if (isTranslatedPluginAttribute(current, name)) {
        return "";
      }
      if (
        name === "class" &&
        value.split(/\s+/u).includes("gnb-nav") &&
        current.matches('[data-owner="global-gnb-nav"]')
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
      }
      if (name === "class") {
        return normalizeKnownReactClass(current, value);
      }
      if (name === "href" && current.matches(".logo-letter")) {
        return value.replace(/\/$/u, "");
      }
      return value;
    }

    function visit(current: Element): string {
      const tabTarget = translatedTabTarget(current);
      const isPin = current.matches('[data-owner="global-sidebar-open-pin"]');
      const tagName = isPin || tabTarget ? (isPin ? "div" : "a") : current.tagName.toLowerCase();
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
        "data-toggle",
        "data-placement",
        "data-login",
      ];
      const attrs = (isPin ? ["class", "title"] : tabTarget ? ["href"] : stableAttributes)
        .filter(
          (name) =>
            (isPin || tabTarget || current.hasAttribute(name)) &&
            hasCanonicalAttribute(current, name, isPin || Boolean(tabTarget), isPin),
        )
        .map((name) => {
          const value =
            isPin && name === "class"
              ? "pin"
              : tabTarget && name === "href"
                ? tabTarget
                : normalizeSiteLayoutGnbNavAttribute(current, name);
          return `${name}=${JSON.stringify(value)}`;
        })
        .join(" ");
      const open = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
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

      return `${open}${children}</${tagName}>`;
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

      function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
        const value = current.getAttribute(name) ?? "";
        if (
          (name === "data-toggle" &&
            (current.matches("div.pin") || current.matches("ul.nav-tabs li > a"))) ||
          (name === "data-placement" && current.matches("div.pin")) ||
          (name === "data-login" && current.matches("a.user-item-btn"))
        ) {
          return "";
        }
        if (name === "href" && current.matches(".logo-letter")) {
          return value.replace(/\/$/u, "");
        }
        if (
          name === "class" &&
          value.split(/\s+/u).includes("siteintro-bg") &&
          current.matches("div.siteintro-bg.row")
        ) {
          return value
            .split(/\s+/u)
            .filter((token) => token !== "row")
            .join(" ");
        }
        const isSiteLayoutHeader =
          name === "class" &&
          value.split(/\s+/u).includes("gnb-outer") &&
          current.matches("header.gnb-outer") &&
          current.querySelector(':scope > div.gnb-inner form[name="gnb-search-form"]') !== null;
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
              : isSiteLayoutHeader && value.split(/\s+/u).includes("project-header")
                ? "project-header"
                : isSiteLayoutHeader
                  ? "gnb-outer"
                  : name === "class" &&
                      value.split(/\s+/u).includes("gnb-inner") &&
                      current.matches("header.gnb-outer > div.gnb-inner") &&
                      current.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-inner"
                    : name === "class" &&
                        value.split(/\s+/u).includes("gnb-nav") &&
                        current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                        current.querySelector('form[name="gnb-search-form"]') !== null
                      ? "gnb-nav"
                      : null;
        if (retiredToken) {
          return value
            .split(/\s+/u)
            .filter((token) => token !== retiredToken)
            .join(" ");
        }
        return value;
      }

      function hasCanonicalAttribute(current: Element, name: string) {
        if (!current.hasAttribute(name)) {
          return false;
        }
        if (name === "class") {
          return normalizeSiteLayoutGnbNavAttribute(current, name) !== "";
        }
        return normalizeSiteLayoutGnbNavAttribute(current, name) !== "";
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
          "href",
          "target",
          "title",
          "data-toggle",
          "data-placement",
          "data-login",
        ];
        const attrs = stableAttributes
          .filter(
            (name) =>
              hasCanonicalAttribute(current, name) &&
              !(
                name === "class" &&
                current.matches(
                  'header.gnb-outer .gnb-usermenu > li:last-child > a.ybtn.ybtn-success[href$="/users/signupform"]',
                )
              ),
          )
          .map(
            (name) =>
              `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
          )
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
