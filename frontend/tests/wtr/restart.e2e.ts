import { expect, test, type Page } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

const EXPECTED_RESTART_SCREEN = `
<div class="page-wrap-outer">
  <div class="container page-wrap">
    <div class="page">
      <div class="secret-wrap">
        <a href="__HOME_HREF__" class="logo"><span>Yoram</span></a>
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
    <span class="provider">Powered by <strong>Yoram</strong></span>
  </div>
</footer>
`;

const EXPECTED_FAILED_SECRET_RESTART_SCREEN = `
<div class="page-wrap-outer">
  <div class="container page-wrap">
    <div class="page">
      <div class="secret-wrap">
        <a href="__HOME_HREF__" class="logo"><span>Yoram</span></a>
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
    <span class="provider">Powered by <strong>Yoram</strong></span>
  </div>
</footer>
`;

test("restart notice matches legacy welcome/restart.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const canonicalRootHref = rootHrefForBasePath(basePath);
  await page.goto(`${basePath}/restart`);
  await expect(page).toHaveTitle("Welcome!");
  await expectHeadTitle(page, "Welcome!");
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_RESTART_SCREEN.replace("__HOME_HREF__", canonicalRootHref),
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
  const canonicalRootHref = rootHrefForBasePath(basePath);
  await page.goto(`${basePath}/restart?hasFailedToUpdateSecret=true`);
  await expect(page).toHaveTitle("Welcome!");
  await expectHeadTitle(page, "Welcome!");
  await expect(page.locator(".page-wrap-outer")).toBeVisible();

  await expect(page.locator(".secret-box")).toHaveText(
    "Server needs to be restarted.Please update application.secret with random text.",
  );

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_FAILED_SECRET_RESTART_SCREEN.replace("__HOME_HREF__", canonicalRootHref),
  );

  expect(actual).toEqual(expected);
  expect(await readRestartContainmentMetrics(page)).toEqual({
    footerBelowPage: true,
    logoInsideSecretWrap: true,
    secretBoxInsidePage: true,
    secretBoxInsideSecretWrap: true,
    secretBoxTopBelowHeading: true,
  });
});

test("restart logo uses TanStack navigation for the internal home href", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/restart`);

  const logo = page.locator(".secret-wrap .logo");
  const canonicalRootHref = rootHrefForBasePath(basePath);
  await expect(logo).toHaveAttribute("href", canonicalRootHref);
  await expect(logo).not.toHaveAttribute("aria-current", "page");
  await expect(logo).not.toHaveAttribute("data-status", "active");

  await page.evaluate(() => {
    (window as Window & { __restartLogoSpaMarker?: string }).__restartLogoSpaMarker = "kept";
  });
  await logo.click({ noWaitAfter: true });

  await expect
    .poll(() => page.evaluate(() => window.location.pathname), { timeout: 5_000 })
    .toBe(canonicalRootHref);

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __restartLogoSpaMarker?: string }).__restartLogoSpaMarker,
      ),
    )
    .toBe("kept");
});

test("restart route source keeps TanStack-owned home navigation without a route-local anchor adapter", async () => {
  const source = await readFile(new URL("../src/routes/restart.tsx", import.meta.url), "utf8");

  expect(source).toContain('import { Link, createFileRoute } from "@tanstack/react-router";');
  expect(source).toContain("hasFailedToUpdateSecret");
  expect(source).toContain('<title>{t("app.restart.welcome")}</title>');
  expect(source).toContain("<Link");
  expect(source).toContain('to="/"');
  expect(source).toContain("activeOptions={{ exact: true, explicitUndefined: true }}");
  expect(source).toContain("activeProps={legacyLogoLinkActiveProps}");
  expect(source).toContain("className={`logo ${restartLogoClassName}`}");
  expect(source).not.toContain("useLinkProps");
  expect(source).not.toContain("<a ");
  expect(source).not.toContain("<a{");
  expect(source).not.toContain("reactJsx");
  expect(source).not.toContain("createLink");
  expect(source).not.toContain("LegacyLogoLink");
  expect(source).not.toContain("LegacyLogoLinkAnchor");
  expect(source).not.toContain("LegacyRootLink");
  expect(source).not.toContain("LegacyRootLinkAnchor");
  expect(source).not.toContain("legacyHref");
  expect(source).not.toContain("router.history.push");
  expect(source).not.toContain("useRouter");
  expect(source).not.toContain("LegacyHrefAnchor");
  expect(source).not.toContain("React.createElement");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).not.toContain("window.document");
  expect(source).not.toMatch(
    /dangerouslySetInnerHTML|__html|document\.|addEventListener|classList|style\.display/,
  );
  expect(source).not.toMatch(
    /(?:useEffect|useLayoutEffect|React\.useEffect|React\.useLayoutEffect)\s*\([\s\S]*?(?:document\s*\.\s*title|globalThis\s*\.\s*document|window\s*\.\s*document|\btitle\s*=)/u,
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

function rootHrefForBasePath(basePath: string) {
  return basePath === "/" ? "/" : `${basePath}/`;
}

async function expectHeadTitle(page: Page, expected: string) {
  await expect
    .poll(() =>
      page
        .locator("head > title")
        .first()
        .evaluate((node) => node.textContent),
    )
    .toBe(expected);
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

async function readRestartContainmentMetrics(page: Page) {
  return page.evaluate(() => {
    const pageRoot = document.querySelector<HTMLElement>(".page-wrap-outer");
    const secretWrap = document.querySelector<HTMLElement>(".secret-wrap");
    const logo = document.querySelector<HTMLElement>(".secret-wrap .logo");
    const heading = document.querySelector<HTMLElement>(".secret-wrap h3");
    const secretBox = document.querySelector<HTMLElement>(".secret-box");
    const footer = document.querySelector<HTMLElement>(".page-footer-outer");
    if (!pageRoot || !secretWrap || !logo || !heading || !secretBox || !footer) {
      throw new Error("Expected restart containment targets are missing.");
    }

    const pageBox = pageRoot.getBoundingClientRect();
    const wrapBox = secretWrap.getBoundingClientRect();
    const logoBox = logo.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    const secretBoxRect = secretBox.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();

    return {
      footerBelowPage: footerBox.top >= pageBox.bottom,
      logoInsideSecretWrap:
        logoBox.top >= wrapBox.top &&
        logoBox.left >= wrapBox.left &&
        logoBox.right <= wrapBox.right &&
        logoBox.bottom <= wrapBox.bottom,
      secretBoxInsidePage:
        secretBoxRect.top >= pageBox.top &&
        secretBoxRect.left >= pageBox.left &&
        secretBoxRect.right <= pageBox.right &&
        secretBoxRect.bottom <= pageBox.bottom,
      secretBoxInsideSecretWrap:
        secretBoxRect.top >= wrapBox.top &&
        secretBoxRect.left >= wrapBox.left &&
        secretBoxRect.right <= wrapBox.right &&
        secretBoxRect.bottom <= wrapBox.bottom,
      secretBoxTopBelowHeading: secretBoxRect.top >= headingBox.bottom,
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
        .map((name) => {
          const value =
            name === "class" && current.closest('[data-owner="restart-notice"]')
              ? (current.getAttribute(name) ?? "")
                  .split(/\s+/u)
                  .filter(
                    (classToken) =>
                      classToken &&
                      !classToken.startsWith("x") &&
                      !classToken.includes("__styles."),
                  )
                  .join(" ")
              : (current.getAttribute(name) ?? "");
          return `${name}=${JSON.stringify(value)}`;
        })
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
