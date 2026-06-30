import { expect, test, type Page } from "@playwright/test";

const EXPECTED_VERIFIED_SCREEN = `
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
  </div>
</header>
<div class="page full">
  <div class="center-wrap tag-line-wrap reset-password">
    <h1 class="title">Verified User</h1>
    <p>door</p>
    <hr>
    <p class="tag-line">User is verified. Try logging in.</p>
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

test("verification success matches legacy user/verified.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/auth/verify", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      loginId: "door",
      verificationCode: "ok-code",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ loginId: "door" }),
    });
  });
  await page.goto(`${basePath}/verify/door/ok-code`);
  await expect(page.locator(".page.full")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_VERIFIED_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopVerifiedMetrics(page)).toEqual({
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
    tagLineColor: "rgb(124, 124, 124)",
    tagLineFontSize: "15.6px",
    tagLineMarginBottom: "15.6px",
    tagLineMarginTop: "10px",
    tagLinePaddingTop: "80px",
    tagLineWrapMarginBottom: "26px",
    titleLineHeight: "42px",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileVerifiedMetrics(page)).toEqual({
    footerMinWidth: "10px",
    gnbInnerWidth: 363,
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    pageFooterPadding: "10px",
    tagLinePaddingTop: "80px",
    titleLineHeight: "42px",
  });
});

test("invalid verification renders legacy plain not-found body", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/auth/verify", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      loginId: "door",
      verificationCode: "bad-code",
    });
    await route.fulfill({
      contentType: "application/json",
      status: 404,
      body: JSON.stringify({
        error: {
          code: "not_found",
          message: "Invalid verification",
          status: 404,
        },
      }),
    });
  });
  await page.goto(`${basePath}/verify/door/bad-code`);

  await expect(page.locator("body")).toHaveText("Invalid verification");
  await expect(
    page.locator(
      ".unsupported, .gnb-outer, .page.full, .page-footer-outer, #yobiDialog, #yobiToasts",
    ),
  ).toHaveCount(0);
});

async function readDesktopVerifiedMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const tagLineWrap = document.querySelector<HTMLElement>(".tag-line-wrap.reset-password");
    const title = document.querySelector<HTMLElement>(".tag-line-wrap .title");
    const tagLine = document.querySelector<HTMLElement>(".tag-line-wrap .tag-line");
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
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected verified metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const tagLineWrapStyle = getComputedStyle(tagLineWrap);
    const tagLineStyle = getComputedStyle(tagLine);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
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
      tagLineColor: tagLineStyle.color,
      tagLineFontSize: tagLineStyle.fontSize,
      tagLineMarginBottom: tagLineStyle.marginBottom,
      tagLineMarginTop: tagLineStyle.marginTop,
      tagLinePaddingTop: tagLineWrapStyle.paddingTop,
      tagLineWrapMarginBottom: tagLineWrapStyle.marginBottom,
      titleLineHeight: getComputedStyle(title).lineHeight,
    };
  });
}

async function readMobileVerifiedMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const tagLineWrap = document.querySelector<HTMLElement>(".tag-line-wrap.reset-password");
    const title = document.querySelector<HTMLElement>(".tag-line-wrap .title");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    if (!gnbOuter || !gnbInner || !tagLineWrap || !title || !pageFooterOuter) {
      throw new Error("Expected mobile verified metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const tagLineWrapStyle = getComputedStyle(tagLineWrap);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    return {
      footerMinWidth: pageFooterOuterStyle.minWidth,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      pageFooterPadding: pageFooterOuterStyle.padding,
      tagLinePaddingTop: tagLineWrapStyle.paddingTop,
      titleLineHeight: getComputedStyle(title).lineHeight,
    };
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
        "accesskey",
        "placeholder",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
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

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      const elements = Array.from(template.content.children);
      if (elements.length === 0) {
        throw new Error("Expected verified screen markup is empty.");
      }
      return elements.map((element) => visit(element)).join("");

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
    },
    { markup: html },
  );
}
