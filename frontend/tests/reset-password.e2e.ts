import { expect, test, type Page } from "@playwright/test";

const EXPECTED_RESET_PASSWORD_SCREEN = `
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
  <div class="center-wrap tag-line-wrap reset-password">
    <h1 class="title">
      Reset password for <span class="highlight">Yona</span>
    </h1>
    <p class="tag-line">Web-based platform for collaborative software development</p>
  </div>
  <div class="login-form-wrap frm-wrap">
    <form action="/resetPassword" method="post" name="passwordReset">
      <input type="hidden" name="hashString" value="reset-token">
      <dl>
        <dd>
          <input id="password" type="password" name="password" class="text password" placeholder="Password" autocomplete="off">
        </dd>
        <dd>
          <input id="retypedPassword" type="password" name="retypedPassword" class="text password" placeholder="Password confirmation" autocomplete="off">
        </dd>
      </dl>
      <div class="btns-row">
        <button type="submit" class="ybtn ybtn-primary ybtn-fullsize">Confirm</button>
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

const EXPECTED_RESET_BAD_REQUEST_SCREEN = `
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
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="error-wrap">
      <i class="ico-404"></i>
      <p>Wrong url to reset password.</p>
      <a href="__BASE_PATH__" class="ybtn ybtn-info">Home</a>
    </div>
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

test("reset password form matches legacy user/resetPassword.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/resetPassword?s=reset-token`);
  await expect(page.locator(".page.full")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_RESET_PASSWORD_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopResetPasswordMetrics(page)).toEqual({
    buttonRowMarginBottom: "20px",
    formMarginTop: "54px",
    formWidth: "400px",
    passwordMarginBottom: "15px",
    tagLineMarginBottom: "26px",
    tagLinePaddingTop: "80px",
    textHeight: "30px",
    textWidth: "386px",
    titleLineHeight: "42px",
  });
});

test("invalid reset password link matches legacy error/badrequest_default.scala.html shell DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/resetPassword?error=invalid&s=reset-token`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_RESET_BAD_REQUEST_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
});

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
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .page.full, .page-wrap-outer, .page-footer-outer",
      ),
    );
    return roots.map((root) => visit(root)).join("");
  });
}

async function readDesktopResetPasswordMetrics(page: Page) {
  return page.evaluate(() => {
    const tagLineWrap = document.querySelector<HTMLElement>(".tag-line-wrap.reset-password");
    const title = document.querySelector<HTMLElement>(".tag-line-wrap .title");
    const formWrap = document.querySelector<HTMLElement>(".login-form-wrap");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    const buttonRow = document.querySelector<HTMLElement>(".login-form-wrap .btns-row");
    if (!tagLineWrap || !title || !formWrap || !passwordInput || !buttonRow) {
      throw new Error("Expected reset-password metric targets are missing.");
    }

    const tagLineWrapStyle = getComputedStyle(tagLineWrap);
    const formWrapStyle = getComputedStyle(formWrap);
    const passwordInputStyle = getComputedStyle(passwordInput);
    const buttonRowStyle = getComputedStyle(buttonRow);

    return {
      buttonRowMarginBottom: buttonRowStyle.marginBottom,
      formMarginTop: formWrapStyle.marginTop,
      formWidth: formWrapStyle.width,
      passwordMarginBottom: passwordInputStyle.marginBottom,
      tagLineMarginBottom: tagLineWrapStyle.marginBottom,
      tagLinePaddingTop: tagLineWrapStyle.paddingTop,
      textHeight: passwordInputStyle.height,
      textWidth: passwordInputStyle.width,
      titleLineHeight: getComputedStyle(title).lineHeight,
    };
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      const elements = Array.from(template.content.children);
      if (elements.length === 0) {
        throw new Error("Expected reset-password screen markup is empty.");
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

      return elements.map((element) => visit(element)).join("");
    },
    { markup: html },
  );
}
