import { expect, test, type Locator, type Page } from "@playwright/test";

const EXPECTED_RESET_PASSWORD_SCREEN = `
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
`;

test("reset password form matches legacy user/resetPassword.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/resetPassword?s=reset-token`);

  const actual = await canonicalizeLocator(page.locator(".page.full"));
  const expected = await canonicalizeHtml(page, EXPECTED_RESET_PASSWORD_SCREEN);

  expect(actual).toEqual(expected);
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

      return visit(element);
    },
    { markup: html },
  );
}
