import { expect, test, type Locator, type Page } from "@playwright/test";

const EXPECTED_LOGIN_SCREEN = `
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
    </form>
  </div>
</div>
`;

test("anonymous login form matches legacy user/login.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/users/loginform?redirectUrl=/me`);

  const actual = await canonicalizeLocator(page.locator(".page.full"));
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_LOGIN_SCREEN.replace("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  await expect(page.locator(".links-wrap a")).toHaveAttribute("href", `${basePath}/lostPassword`);
});

async function canonicalizeLocator(locator: Locator) {
  return locator.evaluate((element) => {
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

    return visit(element);
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

      return visit(element);
    },
    { markup: html },
  );
}
