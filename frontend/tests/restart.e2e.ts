import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const EXPECTED_RESTART_SCREEN = `
<div class="page-wrap-outer">
  <div class="container page-wrap">
    <div class="page">
      <div class="secret-wrap">
        <a href="__BASE_PATH__" class="logo"><span>Yona</span></a>
        <h3>Welcome!</h3>
        <p class="secret-box txt-center">
          Server needs to be restarted.
        </p>
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

const EXPECTED_FAILED_SECRET_RESTART_SCREEN = `
<div class="page-wrap-outer">
  <div class="container page-wrap">
    <div class="page">
      <div class="secret-wrap">
        <a href="__BASE_PATH__" class="logo"><span>Yona</span></a>
        <h3>Welcome!</h3>
        <p class="secret-box txt-center">
          Server needs to be restarted.Please update application.secret with random text.
        </p>
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

test("restart notice matches legacy welcome/restart.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/restart`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_RESTART_SCREEN.replace("__BASE_PATH__", `${basePath}/`),
  );

  expect(actual).toEqual(expected);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
  );
  expect(await readDesktopRestartMetrics(page)).toEqual({
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px 0px",
    providerColor: "rgb(51, 51, 51)",
    providerFontSize: "9px",
    providerMarginLeft: "4px",
    logoHeight: "55px",
    logoLineHeight: "55px",
    logoMarginBottom: "50px",
    logoMarginTop: "50px",
    logoWidth: "123px",
    secretBoxMarginBottom: "20px",
    secretBoxMarginTop: "20px",
    secretBoxWidth: "640px",
    secretWrapPaddingBottom: "50px",
    secretWrapPaddingTop: "50px",
  });
});

test("restart failed secret state adds the legacy manual update notice", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/restart?hasFailedToUpdateSecret=true`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();

  await expect(page.locator(".secret-box")).toHaveText(
    "Server needs to be restarted. Please update application.secret with random text.",
  );

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_FAILED_SECRET_RESTART_SCREEN.replace("__BASE_PATH__", `${basePath}/`),
  );

  expect(actual).toEqual(expected);
});

test("restart logo uses TanStack navigation for the internal home href", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/restart`);

  const logo = page.locator(".secret-wrap .logo");
  await expect(logo).toHaveAttribute("href", `${basePath}/`);

  await page.evaluate(() => {
    (window as Window & { __restartLogoSpaMarker?: string }).__restartLogoSpaMarker = "kept";
  });
  await logo.click({ noWaitAfter: true });

  await expect
    .poll(() => page.evaluate(() => window.location.pathname), { timeout: 5_000 })
    .toMatch(new RegExp(`^${escapeRegExp(basePath)}/?$`));

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __restartLogoSpaMarker?: string }).__restartLogoSpaMarker,
      ),
    )
    .toBe("kept");
});

test("restart route source keeps internal home navigation out of raw anchors", async () => {
  const source = await readFile(new URL("../src/routes/restart.tsx", import.meta.url), "utf8");

  expect(source).toContain('import { Link, createFileRoute } from "@tanstack/react-router";');
  expect(source).toContain("hasFailedToUpdateSecret");
  expect(source).toContain('<Link to="/" className="logo">');
  expect(source).not.toMatch(/<a\s+[^>]*href=\{[^}]*prefixBasePath\([^}]*,\s*["']\/["'][^}]*\}/);
  expect(source).not.toMatch(
    /dangerouslySetInnerHTML|__html|document\.|addEventListener|classList|style\.display/,
  );
});

test("restart notice keeps legacy mobile standalone proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/restart`);
  await expect(page.locator(".secret-wrap")).toBeVisible();

  expect(await readMobileRestartMetrics(page)).toEqual({
    pageFooterLineHeight: "34px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
    pageFooterWidth: 370,
    pageWrapOuterMinWidth: "10px",
    pageWrapOuterPadding: "0px",
    pageWrapOuterWidth: 390,
    providerFontSize: "9px",
    logoHeight: "55px",
    logoMarginBottom: "50px",
    logoMarginTop: "50px",
    logoWidth: "123px",
    secretBoxMarginBottom: "20px",
    secretBoxMarginTop: "20px",
    secretBoxWidth: 195,
    secretWrapPaddingBottom: "50px",
    secretWrapPaddingTop: "50px",
  });
});

async function readDesktopRestartMetrics(page: Page) {
  return page.evaluate(() => {
    const secretWrap = document.querySelector<HTMLElement>(".secret-wrap");
    const logo = document.querySelector<HTMLElement>(".secret-wrap .logo");
    const secretBox = document.querySelector<HTMLElement>(".secret-box");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (!secretWrap || !logo || !secretBox || !pageFooter || !pageFooterOuter || !provider) {
      throw new Error("Expected restart metric targets are missing.");
    }

    const secretWrapStyle = getComputedStyle(secretWrap);
    const logoStyle = getComputedStyle(logo);
    const secretBoxStyle = getComputedStyle(secretBox);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      logoHeight: logoStyle.height,
      logoLineHeight: logoStyle.lineHeight,
      logoMarginBottom: logoStyle.marginBottom,
      logoMarginTop: logoStyle.marginTop,
      logoWidth: logoStyle.width,
      secretBoxMarginBottom: secretBoxStyle.marginBottom,
      secretBoxMarginTop: secretBoxStyle.marginTop,
      secretBoxWidth: secretBoxStyle.width,
      secretWrapPaddingBottom: secretWrapStyle.paddingBottom,
      secretWrapPaddingTop: secretWrapStyle.paddingTop,
    };
  });
}

async function readMobileRestartMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const secretWrap = document.querySelector<HTMLElement>(".secret-wrap");
    const logo = document.querySelector<HTMLElement>(".secret-wrap .logo");
    const secretBox = document.querySelector<HTMLElement>(".secret-box");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !pageWrapOuter ||
      !secretWrap ||
      !logo ||
      !secretBox ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected restart mobile metric targets are missing.");
    }

    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const secretWrapStyle = getComputedStyle(secretWrap);
    const logoStyle = getComputedStyle(logo);
    const secretBoxStyle = getComputedStyle(secretBox);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);

    return {
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterMinWidth: pageFooterOuterStyle.minWidth,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageFooterWidth: Math.round(pageFooter.getBoundingClientRect().width),
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      pageWrapOuterPadding: pageWrapOuterStyle.padding,
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      providerFontSize: getComputedStyle(provider).fontSize,
      logoHeight: logoStyle.height,
      logoMarginBottom: logoStyle.marginBottom,
      logoMarginTop: logoStyle.marginTop,
      logoWidth: logoStyle.width,
      secretBoxMarginBottom: secretBoxStyle.marginBottom,
      secretBoxMarginTop: secretBoxStyle.marginTop,
      secretBoxWidth: Math.round(secretBox.getBoundingClientRect().width),
      secretWrapPaddingBottom: secretWrapStyle.paddingBottom,
      secretWrapPaddingTop: secretWrapStyle.paddingTop,
    };
  });
}

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
