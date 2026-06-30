import { expect, test, type Page } from "@playwright/test";

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
`;

test("anonymous public landing matches legacy index partial intro screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/`);
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator(".siteintro-bg")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();
  await expect(page.locator(".signup-btn a")).toHaveAttribute(
    "href",
    `${basePath}/users/signupform`,
  );

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_PUBLIC_LANDING.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopLandingMetrics(page)).toEqual({
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
    gnbInnerWidth: 1254,
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
    signupMarginTop: "35px",
    siteIntroCoverPaddingBottom: "65px",
    siteIntroCoverPaddingTop: "55px",
    siteIntroCoverWidth: 750,
  });
});

test("anonymous public landing keeps legacy mobile intro proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/`);
  await expect(page.locator(".siteintro-bg")).toBeVisible();

  expect(await readMobileLandingMetrics(page)).toEqual({
    featureItemMarginLeft: "10px",
    featureItemMarginTop: "10px",
    featureItemWidth: 333,
    featureWrapWidth: 350,
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
    siteIntroCoverWidth: 390,
  });
});

async function readDesktopLandingMetrics(page: Page) {
  return page.evaluate(() => {
    const siteIntroCover = document.querySelector<HTMLElement>(".siteintro-cover");
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const heading = document.querySelector<HTMLElement>(".site-heading");
    const signup = document.querySelector<HTMLElement>(".signup-btn");
    const feature = document.querySelector<HTMLElement>(".feature");
    const featureItem = document.querySelector<HTMLElement>(".feature-wrap li");
    const featureIcon = document.querySelector<HTMLElement>(".feature-image");
    const featureInfo = document.querySelector<HTMLElement>(".feature-info");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
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
    const siteIntroCover = document.querySelector<HTMLElement>(".siteintro-cover");
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const heading = document.querySelector<HTMLElement>(".site-heading");
    const featureWrap = document.querySelector<HTMLElement>(".feature-wrap");
    const featureItem = document.querySelector<HTMLElement>(".feature-wrap li");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
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
      document.querySelectorAll(".unsupported, .gnb-outer, .siteintro-bg, .page-footer-outer"),
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

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");

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
    },
    { markup: html },
  );
}
