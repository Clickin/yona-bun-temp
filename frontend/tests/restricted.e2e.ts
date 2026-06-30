import { expect, test, type Page } from "@playwright/test";

const EXPECTED_RESTRICTED_SCREEN = `
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
<div class="page-wrap-outer">
  <div class="page-wrap">
    <h1>Sshhh...don't tell anyone!</h1>
    <p>
      <iframe title="Gangnam Style" width="560" height="315" src="https://www.youtube.com/embed/9bZkp7q19f0" frameborder="0" allowfullscreen=""></iframe>
    </p>
    <p>
      Your name is Site Admin and your email address is admin@example.com
      <i>(unverified)</i>!
      <br>
      Logged in with provider 'password' and the user ID 'admin'
      <br>
      Your session expires never
    </p>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Powered by <strong>Yona</strong></span>
  </div>
</footer>
`;

test("restricted page matches legacy restricted.scala.html rendered screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        localUser: {
          email: "admin@example.com",
          emailValidated: false,
          loginId: "admin",
          name: "Site Admin",
        },
        currentAuth: {
          expires: -1,
          id: "admin",
          provider: "password",
        },
      }),
    });
  });

  await page.goto(`${basePath}/restricted`);
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/9bZkp7q19f0",
  );

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_RESTRICTED_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
});

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".unsupported, .gnb-outer, .page-wrap-outer, .page-footer-outer"),
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
        "accesskey",
        "href",
        "title",
        "data-toggle",
        "data-placement",
        "width",
        "height",
        "src",
        "frameborder",
        "allowfullscreen",
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
          "accesskey",
          "href",
          "title",
          "data-toggle",
          "data-placement",
          "width",
          "height",
          "src",
          "frameborder",
          "allowfullscreen",
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
