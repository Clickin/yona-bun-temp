import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SECRET_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/secret.tsx", import.meta.url),
  "utf8",
);

const EXPECTED_SECRET_SCREEN = `
<div class="page-wrap-outer">
  <div class="container page-wrap">
    <div class="page">
      <div class="secret-wrap">
        <a href="__ROOT_HREF__" class="logo"><span>Yona</span></a>
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

const EXPECTED_SECRET_NOT_FOUND_SCREEN = `
<header class="gnb-outer">
  <div class="gnb-inner">
    <a href="__ROOT_HREF__" class="logo"><h1 class="blind">Yona</h1></a>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/projects">Project list</a></li>
      <li><a href="__BASE_PATH__/_help">Help</a></li>
      <li><a href="https://github.com/nforge/yobi/issues?state=open" target="_blank">Feedback</a></li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="error-wrap">
      <i class="ico ico-err2"></i>
      <p>Page not found</p>
      <a href="__ROOT_HREF__" class="ybtn ybtn-info">Home</a>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright © <a href="http://navercorp.com/" target="_blank">NAVER Corp.</a> Supported by <a href="https://developers.naver.com/d2/" target="_blank" class="d2-program"><span class="d2">D2</span><span class="program"> Program</span></a></span>
  </div>
</footer>
`;

test("first-run secret setup matches legacy welcome/secret.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ secretSetupRequired: true }),
    });
  });
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
    EXPECTED_SECRET_SCREEN.replace("__ROOT_HREF__", tanStackRootHref(basePath)),
  );

  expect(actual).toEqual(expected);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
  );
  expect(await readDesktopSecretMetrics(page)).toEqual({
    buttonRowMarginBottom: "20px",
    formMarginTop: "14px",
    formWidth: "400px",
    inputHeight: "30px",
    inputMarginBottom: "15px",
    inputWidth: "386px",
    logoHeight: "55px",
    logoLineHeight: "55px",
    logoMarginBottom: "50px",
    logoMarginTop: "50px",
    logoWidth: "123px",
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px 0px",
    providerColor: "rgb(51, 51, 51)",
    providerFontSize: "9px",
    providerMarginLeft: "4px",
    secretBoxBackgroundColor: "rgb(252, 248, 227)",
    secretBoxBorderColor: "rgb(251, 238, 213)",
    secretBoxBorderRadius: "4px",
    secretBoxColor: "rgb(192, 152, 83)",
    secretBoxHeadingColor: "rgb(192, 152, 83)",
    secretBoxHeadingMargin: "0px",
    secretBoxMarginBottom: "20px",
    secretBoxMarginTop: "20px",
    secretBoxPaddingBottom: "14px",
    secretBoxPaddingLeft: "14px",
    secretBoxPaddingRight: "35px",
    secretBoxPaddingTop: "14px",
    secretBoxWidth: "640px",
  });

  await page.fill("#uname", "Site Admin");
  await page.fill("#email", "admin@example.com");
  await page.fill("#password", "secret-pass");
  await page.fill("#retypedPassword", "secret-pass");
  await page.locator(".signup-form-wrap").locator('button[type="submit"]').click();
  await expect(page).toHaveURL(`${basePath}/restart`);
});

test("first-run secret setup logo is SPA-owned internal navigation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ secretSetupRequired: true }),
    });
  });

  await page.goto(`${basePath}/secret`);
  await expect(page.locator(".secret-wrap .logo")).toHaveAttribute(
    "href",
    tanStackRootHref(basePath),
  );
  await expect(page.locator(".secret-wrap .logo span")).toHaveText("Yona");

  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });

  await page.locator(".secret-wrap .logo").click();
  await page.waitForFunction((expectedBasePath) => {
    const normalizedRoot = expectedBasePath === "/" ? "/" : `${expectedBasePath}/`;
    return (
      window.location.pathname === expectedBasePath || window.location.pathname === normalizedRoot
    );
  }, basePath);
  expect(documentRequests).toEqual([]);
});

test("first-run secret setup shows legacy field errors without setup REST call until valid", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let setupRequests = 0;
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ secretSetupRequired: true }),
    });
  });
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
    setupRequests += 1;
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
  await page.locator(".signup-form-wrap").locator('button[type="submit"]').click();

  const emailError = page.locator('dt:has(label[for="email"]) .label.label-important');
  await expect(emailError).toHaveText("Required field!");
  await expect(page.locator('dt:has(label[for="password"]) .label.label-important')).toHaveText(
    "Required field!",
  );
  await expect(
    page.locator('dt:has(label[for="retypedPassword"]) .label.label-important'),
  ).toHaveText("Required field!");
  await expect.poll(() => setupRequests).toBe(0);

  await page.fill("#uname", "Site Admin");
  await page.fill("#email", "admin@example.com");
  await page.fill("#password", "secret-pass");
  await page.fill("#retypedPassword", "secret-pass");
  await page.locator(".signup-form-wrap").locator('button[type="submit"]').click();

  await expect.poll(() => setupRequests).toBe(1);
  await expect(page).toHaveURL(`${basePath}/restart`);
});

test("first-run secret setup renders REST validation errors in legacy field labels", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ secretSetupRequired: true }),
    });
  });
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
    await route.fulfill({
      contentType: "application/json",
      status: 400,
      body: JSON.stringify({
        error: {
          code: "bad_request",
          message: "validation.tooShortPassword",
          status: 400,
        },
      }),
    });
  });

  await page.goto(`${basePath}/secret`);
  await page.fill("#uname", "Site Admin");
  await page.fill("#email", "admin@example.com");
  await page.fill("#password", "bad");
  await page.fill("#retypedPassword", "bad");
  await page.locator(".signup-form-wrap").locator('button[type="submit"]').click();

  await expect(page.locator('dt:has(label[for="password"]) .label.label-important')).toHaveText(
    "Password must be at least 4 characters in length.",
  );
  await expect(page.locator('dt:has(label[for="email"]) .label.label-important')).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/secret`);
});

test("first-run secret setup keeps legacy mobile standalone form proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ secretSetupRequired: true }),
    });
  });

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/secret`);
  await expect(page.locator(".secret-wrap")).toBeVisible();

  expect(await readMobileSecretMetrics(page)).toEqual({
    formDefinitionListTextAlign: "right",
    formWidth: "370.5px",
    inputWidth: "148.188px",
    pageFooterLineHeight: "34px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
    pageFooterWidth: 370,
    pageWrapOuterMinWidth: "10px",
    pageWrapOuterPadding: "0px",
    pageWrapOuterWidth: 390,
    providerFontSize: "9px",
    secretBoxBackgroundColor: "rgb(252, 248, 227)",
    secretBoxBorderColor: "rgb(251, 238, 213)",
    secretBoxBorderRadius: "4px",
    secretBoxColor: "rgb(192, 152, 83)",
    secretBoxHeadingColor: "rgb(192, 152, 83)",
    secretBoxHeadingMargin: "0px",
    secretBoxMarginBottom: "20px",
    secretBoxMarginTop: "20px",
    secretBoxPaddingBottom: "14px",
    secretBoxPaddingLeft: "14px",
    secretBoxPaddingRight: "35px",
    secretBoxPaddingTop: "14px",
    secretBoxStyleWidth: "195px",
    secretBoxWidth: 246,
  });
});

test("secret setup disabled matches legacy error/notfound_default.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ secretSetupRequired: false }),
    });
  });

  await page.goto(`${basePath}/secret`);
  await expect(page.locator(".error-wrap")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_SECRET_NOT_FOUND_SCREEN.replaceAll("__BASE_PATH__", basePath).replaceAll(
      "__ROOT_HREF__",
      tanStackRootHref(basePath),
    ),
  );

  expect(actual).toEqual(expected);
  await expect(page.locator(".gnb-nav a").nth(2)).toHaveAttribute(
    "href",
    "https://github.com/nforge/yobi/issues?state=open",
  );
  await expect(page.locator(".gnb-nav a").nth(2)).toHaveAttribute("target", "_blank");
  await expect(page.locator(".gnb-nav a").nth(2)).toHaveText("Feedback");
  await expect(page.locator(".page-footer .provider > a").nth(0)).toHaveAttribute(
    "href",
    "http://navercorp.com/",
  );
  await expect(page.locator(".page-footer .provider > a").nth(0)).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator(".page-footer .provider > a").nth(0)).toHaveText("NAVER Corp.");
  await expect(page.locator(".page-footer .provider > a").nth(1)).toHaveAttribute(
    "href",
    "https://developers.naver.com/d2/",
  );
  await expect(page.locator(".page-footer .provider > a").nth(1)).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator(".page-footer .provider > a").nth(1)).toHaveAttribute(
    "class",
    "d2-program",
  );
  await expect(page.locator(".page-footer .provider > a").nth(1)).toHaveText("D2 Program");
});

test("secret route source keeps anchors owned by TanStack Link", async () => {
  expect(SECRET_ROUTE_SOURCE).toContain('from "@tanstack/react-router"');
  expect(SECRET_ROUTE_SOURCE).toMatch(/<Link\s+to="\/"\s+className="logo">/u);
  expect(SECRET_ROUTE_SOURCE).toMatch(/<Link\s+to="\/projects">/u);
  expect(SECRET_ROUTE_SOURCE).toMatch(/<Link\s+to="\/_help">/u);
  expect(SECRET_ROUTE_SOURCE).toMatch(/<Link\s+to="\/"\s+className="ybtn ybtn-info">/u);
  expect(SECRET_ROUTE_SOURCE).toMatch(
    /to=\{"https:\/\/github\.com\/nforge\/yobi\/issues\?state=open" as never\}\s+target="_blank"/u,
  );
  expect(SECRET_ROUTE_SOURCE).toMatch(
    /to=\{"http:\/\/navercorp\.com\/" as never\}\s+target="_blank"/u,
  );
  expect(SECRET_ROUTE_SOURCE).toMatch(
    /to=\{"https:\/\/developers\.naver\.com\/d2\/" as never\}\s+target="_blank"\s+className="d2-program"/u,
  );
  expect(SECRET_ROUTE_SOURCE).not.toMatch(/<a\b/u);
  expect(SECRET_ROUTE_SOURCE).not.toMatch(/<a\s+[^>]*href=\{prefixBasePath\(/u);
  expect(SECRET_ROUTE_SOURCE).not.toMatch(/<a\s+[^>]*href=["']\/(?!\/)/u);
  expect(SECRET_ROUTE_SOURCE).not.toMatch(/document\./u);
  expect(SECRET_ROUTE_SOURCE).not.toMatch(/addEventListener/u);
  expect(SECRET_ROUTE_SOURCE).not.toMatch(/classList/u);
  expect(SECRET_ROUTE_SOURCE).not.toMatch(/style\.display/u);
  expect(SECRET_ROUTE_SOURCE).not.toMatch(/dangerouslySetInnerHTML/u);
});

async function readDesktopSecretMetrics(page: Page) {
  return page.evaluate(() => {
    const logo = document.querySelector<HTMLElement>(".secret-wrap .logo");
    const secretBox = document.querySelector<HTMLElement>(".secret-box");
    const secretBoxHeading = document.querySelector<HTMLElement>(".secret-box h4");
    const formWrap = document.querySelector<HTMLElement>(".signup-form-wrap");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    const buttonRow = document.querySelector<HTMLElement>(".signup-form-wrap .btns-row");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !logo ||
      !secretBox ||
      !secretBoxHeading ||
      !formWrap ||
      !passwordInput ||
      !buttonRow ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected secret setup metric targets are missing.");
    }

    const logoStyle = getComputedStyle(logo);
    const secretBoxStyle = getComputedStyle(secretBox);
    const secretBoxHeadingStyle = getComputedStyle(secretBoxHeading);
    const formWrapStyle = getComputedStyle(formWrap);
    const passwordInputStyle = getComputedStyle(passwordInput);
    const buttonRowStyle = getComputedStyle(buttonRow);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      buttonRowMarginBottom: buttonRowStyle.marginBottom,
      formMarginTop: formWrapStyle.marginTop,
      formWidth: formWrapStyle.width,
      inputHeight: passwordInputStyle.height,
      inputMarginBottom: passwordInputStyle.marginBottom,
      inputWidth: passwordInputStyle.width,
      logoHeight: logoStyle.height,
      logoLineHeight: logoStyle.lineHeight,
      logoMarginBottom: logoStyle.marginBottom,
      logoMarginTop: logoStyle.marginTop,
      logoWidth: logoStyle.width,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      secretBoxBackgroundColor: secretBoxStyle.backgroundColor,
      secretBoxBorderColor: secretBoxStyle.borderColor,
      secretBoxBorderRadius: secretBoxStyle.borderRadius,
      secretBoxColor: secretBoxStyle.color,
      secretBoxHeadingColor: secretBoxHeadingStyle.color,
      secretBoxHeadingMargin: secretBoxHeadingStyle.margin,
      secretBoxMarginBottom: secretBoxStyle.marginBottom,
      secretBoxMarginTop: secretBoxStyle.marginTop,
      secretBoxPaddingBottom: secretBoxStyle.paddingBottom,
      secretBoxPaddingLeft: secretBoxStyle.paddingLeft,
      secretBoxPaddingRight: secretBoxStyle.paddingRight,
      secretBoxPaddingTop: secretBoxStyle.paddingTop,
      secretBoxWidth: secretBoxStyle.width,
    };
  });
}

async function readMobileSecretMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const secretBox = document.querySelector<HTMLElement>(".secret-box");
    const secretBoxHeading = document.querySelector<HTMLElement>(".secret-box h4");
    const formWrap = document.querySelector<HTMLElement>(".signup-form-wrap");
    const definitionList = document.querySelector<HTMLElement>(".signup-form-wrap dl");
    const passwordInput = document.querySelector<HTMLElement>("#password");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !pageWrapOuter ||
      !secretBox ||
      !secretBoxHeading ||
      !formWrap ||
      !definitionList ||
      !passwordInput ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected secret setup mobile metric targets are missing.");
    }

    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const secretBoxStyle = getComputedStyle(secretBox);
    const secretBoxHeadingStyle = getComputedStyle(secretBoxHeading);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);

    return {
      formDefinitionListTextAlign: getComputedStyle(definitionList).textAlign,
      formWidth: getComputedStyle(formWrap).width,
      inputWidth: getComputedStyle(passwordInput).width,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterMinWidth: pageFooterOuterStyle.minWidth,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageFooterWidth: Math.round(pageFooter.getBoundingClientRect().width),
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      pageWrapOuterPadding: pageWrapOuterStyle.padding,
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      providerFontSize: getComputedStyle(provider).fontSize,
      secretBoxBackgroundColor: secretBoxStyle.backgroundColor,
      secretBoxBorderColor: secretBoxStyle.borderColor,
      secretBoxBorderRadius: secretBoxStyle.borderRadius,
      secretBoxColor: secretBoxStyle.color,
      secretBoxHeadingColor: secretBoxHeadingStyle.color,
      secretBoxHeadingMargin: secretBoxHeadingStyle.margin,
      secretBoxMarginBottom: secretBoxStyle.marginBottom,
      secretBoxMarginTop: secretBoxStyle.marginTop,
      secretBoxPaddingBottom: secretBoxStyle.paddingBottom,
      secretBoxPaddingLeft: secretBoxStyle.paddingLeft,
      secretBoxPaddingRight: secretBoxStyle.paddingRight,
      secretBoxPaddingTop: secretBoxStyle.paddingTop,
      secretBoxStyleWidth: secretBoxStyle.width,
      secretBoxWidth: Math.round(secretBox.getBoundingClientRect().width),
    };
  });
}

function tanStackRootHref(basePath: string) {
  return basePath === "/" ? "/" : `${basePath}/`;
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".gnb-outer, .page-wrap-outer, .page-footer-outer"),
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
        "placeholder",
        "href",
        "target",
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
          "target",
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
