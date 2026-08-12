import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const RESTRICTED_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/restricted.tsx", import.meta.url),
  "utf8",
);

const EXPECTED_RESTRICTED_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header>
  <div>
    <div class="pin" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </div>
    <ul>
      <li><a class="logo" href="__BASE_PATH__">Y</a></li>
      <li>
        <form action="__BASE_PATH__/search" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div>
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
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      & © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      & <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

test("restricted page matches legacy restricted.scala.html rendered screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockRestrictedSession(page);

  await page.goto(`${basePath}/restricted`);
  await expect(page.locator('[data-owner="restricted-gnb-outer"]')).toBeVisible();
  await expect(page).toHaveTitle("Yoram");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.head.querySelectorAll("title"), (title) => title.textContent ?? ""),
      ),
    )
    .toContain("Yoram");
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/9bZkp7q19f0",
  );
  const sidebarPin = page.locator('[data-owner="restricted-sidebar-pin"]');
  await expect(sidebarPin).not.toHaveAttribute("data-toggle");
  await expect(sidebarPin).not.toHaveAttribute("data-placement");
  await expect(sidebarPin).toHaveAttribute("title", "Sidebar");

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_RESTRICTED_SCREEN.replaceAll("__BASE_PATH__", rootHref(basePath)).replace(
      `action="${rootHref(basePath)}/search"`,
      `action="${basePath}/search"`,
    ),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopRestrictedMetrics(page)).toEqual({
    footerLineHeight: "34px",
    footerPaddingBottom: "10px",
    footerPaddingTop: "10px",
    gnbInnerHeight: "40px",
    gnbInnerWidth: 1235,
    gnbOuterBackground: "rgb(27, 27, 27)",
    gnbOuterHeight: "40px",
    iframeHeight: "315px",
    iframeWidth: "560px",
    logoBackground: "rgb(255, 87, 34)",
    logoLineHeight: "40px",
    logoPadding: "6px 10px",
    pageWrapOuterMarginTop: "10px",
    pageWrapOuterMinHeight: "450px",
    pageWrapOuterMinWidth: "1100px",
    providerColor: "rgb(51, 51, 51)",
    providerFontSize: "9px",
    providerMarginLeft: "4px",
  });
});

test("restricted logo link preserves SPA navigation to site home", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockRestrictedSession(page);
  await page.addInitScript(() => {
    const key = "__restricted_doc_loads";
    sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? "0") + 1));
  });

  await page.goto(`${basePath}/restricted`);
  const logoLink = page.locator('[data-owner="restricted-gnb-brand"]');
  await expectLegacyAnchor(logoLink, {
    className: null,
    href: rootHref(basePath),
    target: null,
    text: "Y",
  });
  await logoLink.click();

  await expect
    .poll(() => page.evaluate(() => `${location.pathname}${location.hash}`))
    .toBe(rootHref(basePath));
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("__restricted_doc_loads")))
    .toBe("1");
});

test("restricted footer renders the legacy attribution with upstream links", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockRestrictedSession(page);

  await page.goto(`${basePath}/restricted`);

  await expect(page.locator(".page-footer .provider")).toContainText("Yona authors");
  await expect(page.locator(".page-footer .provider")).not.toContainText("Yoram");
  await expect(page.locator(".page-footer .provider a")).toHaveCount(4);
});

test("restricted route source keeps internal navigation out of raw anchors", async () => {
  expect(RESTRICTED_ROUTE_SOURCE).toContain(
    'import { Link, createFileRoute } from "@tanstack/react-router";',
  );
  expect(RESTRICTED_ROUTE_SOURCE).toContain('data-owner="restricted-gnb-brand"');
  expect(RESTRICTED_ROUTE_SOURCE).toContain("activeProps={legacyPlainLinkActiveProps}");
  expect(RESTRICTED_ROUTE_SOURCE).toContain('to="/"');
  expect(RESTRICTED_ROUTE_SOURCE).toContain("<Link");
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain("createLink");
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain("reactJsx");
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain("jsx as");
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain("useLinkProps");
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain("useRouter");
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain("router.history");
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain("LegacyRootLink");
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain("LegacyHrefAnchor");
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain('className="logo logo-letter"');
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain('className="input-prepend gnb-search-form"');
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain('className="search-box"');
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain("React.createElement");
  expect(RESTRICTED_ROUTE_SOURCE).not.toMatch(/<a(?:\s|>)/u);
  expect(RESTRICTED_ROUTE_SOURCE).not.toMatch(/<a\s+[^>]*href=\{prefixBasePath\([^}]*["'`]\/["'`]/);
});

test("restricted route source renders legacy site title without imperative mutation", async () => {
  expect(RESTRICTED_ROUTE_SOURCE).toContain(
    'const browserTitle = runtimeConfig.siteName ?? "Yoram";',
  );
  expect(RESTRICTED_ROUTE_SOURCE).toContain("<title>{browserTitle}</title>");
  expect(RESTRICTED_ROUTE_SOURCE).not.toMatch(/\bdocument\s*\.\s*title\b/u);
  expect(RESTRICTED_ROUTE_SOURCE).not.toMatch(/\bglobalThis\s*\.\s*document\b/u);
  expect(RESTRICTED_ROUTE_SOURCE).not.toMatch(/\bwindow\s*\.\s*document\b/u);
  expect(RESTRICTED_ROUTE_SOURCE).not.toMatch(
    /useEffect\s*\([\s\S]*?(?:document\s*\.\s*title|globalThis\s*\.\s*document|window\s*\.\s*document|title\s*=)/u,
  );
});

test("restricted route source keeps the legacy footer attribution", async () => {
  expect(RESTRICTED_ROUTE_SOURCE).toContain(
    '<span className="provider">\n            Copyright{" "}\n            <Link',
  );
  expect(RESTRICTED_ROUTE_SOURCE).toContain("Yona authors");
  expect(RESTRICTED_ROUTE_SOURCE).toContain("github.com/yona-projects/yona/blob/master/AUTHORS");
  expect(RESTRICTED_ROUTE_SOURCE).toContain("navercorp.com");
  expect(RESTRICTED_ROUTE_SOURCE).toContain("naverlabs.com");
  expect(RESTRICTED_ROUTE_SOURCE).toContain("ncloud.com");
});

test("restricted route source drops route-owned tooltip initializer marker", async () => {
  expect(RESTRICTED_ROUTE_SOURCE).toContain('data-owner="restricted-sidebar-pin"');
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain('className="pin"');
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain('data-placement="bottom"');
  expect(RESTRICTED_ROUTE_SOURCE).toContain('title="Sidebar"');
  expect(RESTRICTED_ROUTE_SOURCE).not.toContain('data-toggle="tooltip"');
});

test("restricted page keeps legacy mobile shell and fixed iframe proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockRestrictedSession(page);

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/restricted`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();

  expect(await readMobileRestrictedMetrics(page)).toEqual({
    footerLineHeight: "34px",
    footerOuterMinWidth: "10px",
    footerOuterPadding: "10px",
    footerWidth: 370,
    gnbInnerWidth: 363,
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    iframeHeight: "315px",
    iframeWidth: "560px",
    pageWrapOuterMinWidth: "10px",
    pageWrapOuterPadding: "0px",
    pageWrapOuterWidth: 390,
    providerFontSize: "9px",
  });
});

async function mockRestrictedSession(page: Page) {
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
}

async function expectLegacyAnchor(
  locator: ReturnType<Page["locator"]>,
  expected: {
    className: null | string;
    href: string;
    target: null | string;
    text: string;
  },
) {
  await expect(locator).toHaveText(expected.text);
  await expect(locator).toHaveAttribute("href", expected.href);
  if (expected.target === null) {
    await expect(locator).not.toHaveAttribute("target");
  } else {
    await expect(locator).toHaveAttribute("target", expected.target);
  }
  if (expected.className === null) {
    await expect(locator).toHaveAttribute("class");
  } else {
    await expect(locator).toHaveAttribute("class", expected.className);
  }
  await expect(locator).not.toHaveAttribute("aria-current");
  await expect(locator).not.toHaveAttribute("data-status");
}

async function readDesktopRestrictedMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>('[data-owner="restricted-gnb-outer"]');
    const gnbInner = document.querySelector<HTMLElement>('[data-owner="restricted-gnb-inner"]');
    const logo = document.querySelector<HTMLElement>('[data-owner="restricted-gnb-brand"]');
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const iframe = document.querySelector<HTMLElement>("iframe");
    const footerOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const footer = document.querySelector<HTMLElement>(".page-footer");
    const provider = document.querySelector<HTMLElement>(".page-footer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !pageWrapOuter ||
      !iframe ||
      !footerOuter ||
      !footer ||
      !provider
    ) {
      throw new Error("Expected restricted metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const iframeStyle = getComputedStyle(iframe);
    const footerOuterStyle = getComputedStyle(footerOuter);
    const footerStyle = getComputedStyle(footer);
    const providerStyle = getComputedStyle(provider);

    return {
      footerLineHeight: footerStyle.lineHeight,
      footerPaddingBottom: footerOuterStyle.paddingBottom,
      footerPaddingTop: footerOuterStyle.paddingTop,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      iframeHeight: iframeStyle.height,
      iframeWidth: iframeStyle.width,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
    };
  });
}

async function readMobileRestrictedMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>('[data-owner="restricted-gnb-outer"]');
    const gnbInner = document.querySelector<HTMLElement>('[data-owner="restricted-gnb-inner"]');
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const iframe = document.querySelector<HTMLElement>("iframe");
    const footerOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const footer = document.querySelector<HTMLElement>(".page-footer");
    const provider = document.querySelector<HTMLElement>(".page-footer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !pageWrapOuter ||
      !iframe ||
      !footerOuter ||
      !footer ||
      !provider
    ) {
      throw new Error("Expected restricted mobile metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const iframeStyle = getComputedStyle(iframe);
    const footerOuterStyle = getComputedStyle(footerOuter);

    return {
      footerLineHeight: getComputedStyle(footer).lineHeight,
      footerOuterMinWidth: footerOuterStyle.minWidth,
      footerOuterPadding: footerOuterStyle.padding,
      footerWidth: Math.round(footer.getBoundingClientRect().width),
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      iframeHeight: iframeStyle.height,
      iframeWidth: iframeStyle.width,
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      pageWrapOuterPadding: pageWrapOuterStyle.padding,
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      providerFontSize: getComputedStyle(provider).fontSize,
    };
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        '.unsupported, [data-owner="restricted-gnb-outer"], .page-wrap-outer, .page-footer-outer',
      ),
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
        "target",
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
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
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

    function normalizeAttribute(current: Element, name: string) {
      if (
        (name === "data-toggle" || name === "data-placement") &&
        current.closest('.pin, [data-owner="restricted-sidebar-pin"]')
      ) {
        return "";
      }
      if (name === "class" && current.closest('.pin, [data-owner="restricted-sidebar-pin"]')) {
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter(
            (value) =>
              value && value !== "pin" && !value.startsWith("x") && !value.includes("restricted__"),
          )
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      if (name === "class" && current.closest('[data-owner^="restricted-gnb-"]')) {
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter((value) => value && !value.startsWith("x") && !value.includes("restricted__"))
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
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
          "target",
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
          .map((name) => normalizeAttribute(current, name))
          .filter(Boolean)
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

      function normalizeAttribute(current: Element, name: string) {
        if (
          (name === "data-toggle" || name === "data-placement") &&
          current.closest('.pin, [data-owner="restricted-sidebar-pin"]')
        ) {
          return "";
        }
        if (name === "class" && current.closest('.pin, [data-owner="restricted-sidebar-pin"]')) {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/u)
            .filter(
              (value) =>
                value &&
                value !== "pin" &&
                !value.startsWith("x") &&
                !value.includes("restricted__"),
            )
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        if (name === "class" && current.closest('[data-owner^="restricted-gnb-"]')) {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/u)
            .filter((value) => value && !value.startsWith("x") && !value.includes("restricted__"))
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }
    },
    { markup: html },
  );
}

function rootHref(basePath: string) {
  return basePath.endsWith("/") ? basePath : `${basePath}/`;
}
