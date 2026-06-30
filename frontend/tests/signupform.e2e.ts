import { expect, test, type Locator, type Page } from "@playwright/test";

const EXPECTED_SIGNUP_SCREEN = `
<div class="page full">
  <div class="center-wrap tag-line-wrap signup">
    <h1 class="title">
      Sign up for <span class="highlight">Yona</span>
    </h1>
    <p class="tag-line">Web-based platform for collaborative software development</p>
  </div>
  <div class="signup-form-wrap frm-wrap">
    <form action="/users/signup" method="post" name="signup">
      <dl>
        <dt>
          <label for="loginId">User ID (lower case)</label>
        </dt>
        <dd>
          <input id="loginId" type="text" name="loginId" class="text password" placeholder="" autocomplete="off">
        </dd>
        <dt>
          <label for="uname">Name</label>
        </dt>
        <dd>
          <input id="uname" type="text" name="name" class="text password" placeholder="" autocomplete="off">
        </dd>
        <dt>
          <label for="email">Email address</label>
        </dt>
        <dd>
          <input id="email" type="text" name="email" class="text password" placeholder="" autocomplete="off">
        </dd>
        <dt>
          <label for="password">Password</label>
        </dt>
        <dd>
          <input id="password" type="password" name="password" class="text password" placeholder="" autocomplete="off">
        </dd>
        <dt>
          <label for="retypedPassword">Password confirmation</label>
        </dt>
        <dd>
          <input id="retypedPassword" type="password" name="retypedPassword" class="text password" placeholder="" autocomplete="off">
        </dd>
      </dl>
      <div class="btns-row">
        <button type="submit" class="ybtn ybtn-primary ybtn-large ybtn-fullsize">Sign up</button>
      </div>
      <div class="act-row">
        Already signed up? <a href="__BASE_PATH__/users/loginform" class="go-login">Log in</a>
      </div>
    </form>
  </div>
</div>
`;

test("anonymous signup form matches legacy user/signup.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/users/signupform`);

  const actual = await canonicalizeLocator(page.locator(".page.full"));
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_SIGNUP_SCREEN.replace("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  await expect(page.locator(".go-login")).toHaveAttribute("href", `${basePath}/users/loginform`);
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
        throw new Error("Expected signup screen markup is empty.");
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
