import { expect, test, type Page } from "@playwright/test";

const EXPECTED_SECRET_SCREEN = `
<div class="page-wrap-outer">
  <div class="container page-wrap">
    <div class="page">
      <div class="secret-wrap">
        <a href="__BASE_PATH__" class="logo"><span>Yona</span></a>
        <h3>Tada! Welcome to Yona!</h3>
        <div class="alert alert-block secret-box">
          <h4>Create website-admin account</h4>
          Caution: Password MUST be kept secret.
        </div>
      </div>
      <div class="signup-form-wrap frm-wrap">
        <form action="/" method="post" class="input-append">
          <dl>
            <dt><label for="loginId">User ID (lower case)</label></dt>
            <dd>
              <input id="loginId" type="text" name="loginId" class="text password" placeholder="" autocomplete="off" readonly value="admin">
            </dd>
            <dt><label for="uname">Name</label></dt>
            <dd>
              <input id="uname" type="text" name="name" class="text password" placeholder="" autocomplete="off" value="">
            </dd>
            <dt><label for="email">Email address</label></dt>
            <dd>
              <input id="email" type="text" name="email" class="text password" placeholder="" autocomplete="off" value="">
            </dd>
            <dt><label for="password">Password</label></dt>
            <dd>
              <input id="password" type="password" name="password" class="text password" placeholder="" autocomplete="off">
            </dd>
            <dt><label for="retypedPassword">Password confirmation</label></dt>
            <dd>
              <input id="retypedPassword" type="password" name="retypedPassword" class="text password" placeholder="" autocomplete="off">
            </dd>
          </dl>
          <div class="btns-row">
            <button type="submit" class="ybtn ybtn-success">Submit</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Powered by <strong>Yona</strong></span>
  </div>
</footer>
`;

test("first-run secret setup matches legacy welcome/secret.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: {
        "x-csrf-token": "csrf-secret",
      },
      body: JSON.stringify({ csrfToken: "csrf-secret" }),
    });
  });
  await page.route("**/api/v1/auth/secret", async (route) => {
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-secret");
    expect(route.request().postDataJSON()).toEqual({
      emailAddress: "admin@example.com",
      name: "Site Admin",
      password: "secret-pass",
      retypedPassword: "secret-pass",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ restartPath: "/restart" }),
    });
  });

  await page.goto(`${basePath}/secret`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();
  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_SECRET_SCREEN.replace("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);

  await page.fill("#uname", "Site Admin");
  await page.fill("#email", "admin@example.com");
  await page.fill("#password", "secret-pass");
  await page.fill("#retypedPassword", "secret-pass");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(`${basePath}/restart`);
});

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(document.querySelectorAll(".page-wrap-outer, .page-footer-outer"));
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
        "placeholder",
        "href",
        "for",
        "checked",
        "required",
        "readonly",
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
          "placeholder",
          "href",
          "for",
          "checked",
          "required",
          "readonly",
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
