import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_NOTIFICATION_ROUTE_TABS = `
<ul class="nav nav-tabs">
  <li class="active"><a href="__BASE_PATH__/notifications">Notification</a></li>
  <li><a href="__BASE_PATH__/user/issues">My Issues</a></li>
  <li><a href="__BASE_PATH__/user/files">My Files</a></li>
  <li><button id="setDefaultLoginPage" class="ybtn hide-in-mobile" type="button" data-url="notification" title="Set to default page" data-trigger="hover" data-placement="bottom" data-toggle="popover" data-content="Make current page the index page when logged in">Set to default page</button></li>
</ul>
`;

const EXPECTED_NOTIFICATION_ROUTE_EMPTY_STREAM = `
<ul class="activity-streams notification-wrap unstyled">
  <div class="warning-none"><i class="yobicon-danger"></i>No notification has been received.</div>
</ul>
`;

const EXPECTED_EMPTY_NOTIFICATION_DESKTOP_METRICS = {
  activityStreamsMarginTop: "0px",
  gnbInnerHeight: "40px",
  gnbInnerWidth: 1235,
  gnbOuterBackground: "rgb(27, 27, 27)",
  gnbOuterHeight: "40px",
  guideToggleButtonBorderBottomLeftRadius: "6px",
  guideToggleButtonBorderBottomRightRadius: "6px",
  guideToggleButtonPaddingLeft: "25px",
  logoBackground: "rgb(255, 87, 34)",
  logoLineHeight: "40px",
  logoPadding: "6px 10px",
  mainStreamMarginBottom: "15px",
  navLinkColor: "rgb(85, 85, 85)",
  navLinkFontWeight: "700",
  navLinkPaddingLeft: "30px",
  pageFooterLineHeight: "34px",
  pageFooterOuterPadding: "10px 0px",
  pageWrapOuterMarginTop: "10px",
  pageWrapOuterMinHeight: "450px",
  providerColor: "rgb(51, 51, 51)",
  providerFontSize: "9px",
  providerMarginLeft: "4px",
  warningBackground: "rgb(139, 139, 139)",
  warningBorderRadius: "6px",
  warningColor: "rgb(255, 255, 255)",
  warningFontSize: "16px",
  warningPaddingTop: "15px",
};

test("legacy singular notification browser route renders the shared notification shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedNotifications(page, []);

  await page.goto(`${basePath}/notification?from=0&limit=20`);

  await expect(page).toHaveURL(`${basePath}/notification?from=0&limit=20`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".activity-streams.notification-wrap")).toBeVisible();
  await expect(page.locator(".warning-none")).toContainText("No notification has been received.");
  await expect(page.locator("#setDefaultLoginPage")).toHaveAttribute("data-url", "notification");
  await expect(
    page.locator(
      ".myOrganizationList, .myProjectList, .myRecentIssueList, #usermenu-tab-content-list",
    ),
  ).toHaveCount(4);

  expect(await canonicalizeSelector(page, ".main-stream > .nav-tabs")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_NOTIFICATION_ROUTE_TABS.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await canonicalizeSelector(page, ".activity-streams.notification-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_NOTIFICATION_ROUTE_EMPTY_STREAM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readDesktopAuthenticatedHomeMetrics(page)).toEqual(
    EXPECTED_EMPTY_NOTIFICATION_DESKTOP_METRICS,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileAuthenticatedHomeMetrics(page)).toEqual({
    defaultLandingButtonDisplay: "none",
    mainStreamWidth: 390,
    pageWrapOuterWidth: 390,
    siteGuideOuterMargin: "40px 0px 0px",
  });

  const routeSource = readFileSync("src/routes/notification.tsx", "utf8");
  expect(routeSource).toContain('createFileRoute("/notification")');
  expect(routeSource).toContain('routePath="/notification"');
});

test("root default landing redirects to the singular notification route", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedNotifications(page, [], { defaultLandingPath: "/notification" });

  await page.goto(`${basePath}/`);

  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/notification`);
  await expect(page.locator(".activity-streams.notification-wrap")).toBeVisible();
  await expect(page.locator("#setDefaultLoginPage")).toHaveCount(0);
});

async function mockAuthenticatedNotifications(
  page: Page,
  items: unknown[],
  sessionOverrides: Record<string, unknown> = {},
) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
        ...sessionOverrides,
      }),
    });
  });
  await page.route("**/api/v1/notifications?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        hasMore: false,
        items,
        total: items.length,
      }),
    });
  });
}

async function readDesktopAuthenticatedHomeMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const mainStream = document.querySelector<HTMLElement>(".main-stream");
    const activityStreams = document.querySelector<HTMLElement>(".activity-streams");
    const warning = document.querySelector<HTMLElement>(".warning-none");
    const guideToggleButton = document.querySelector<HTMLElement>(".guide-toggle button");
    const navLink = document.querySelector<HTMLElement>(".nav-tabs > li > a");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !pageWrapOuter ||
      !mainStream ||
      !activityStreams ||
      !warning ||
      !guideToggleButton ||
      !navLink ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected authenticated home metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const mainStreamStyle = getComputedStyle(mainStream);
    const activityStreamsStyle = getComputedStyle(activityStreams);
    const warningStyle = getComputedStyle(warning);
    const guideToggleButtonStyle = getComputedStyle(guideToggleButton);
    const navLinkStyle = getComputedStyle(navLink);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      activityStreamsMarginTop: activityStreamsStyle.marginTop,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      guideToggleButtonBorderBottomLeftRadius: guideToggleButtonStyle.borderBottomLeftRadius,
      guideToggleButtonBorderBottomRightRadius: guideToggleButtonStyle.borderBottomRightRadius,
      guideToggleButtonPaddingLeft: guideToggleButtonStyle.paddingLeft,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      mainStreamMarginBottom: mainStreamStyle.marginBottom,
      navLinkColor: navLinkStyle.color,
      navLinkFontWeight: navLinkStyle.fontWeight,
      navLinkPaddingLeft: navLinkStyle.paddingLeft,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      warningBackground: warningStyle.backgroundColor,
      warningBorderRadius: warningStyle.borderTopLeftRadius,
      warningColor: warningStyle.color,
      warningFontSize: warningStyle.fontSize,
      warningPaddingTop: warningStyle.paddingTop,
    };
  });
}

async function readMobileAuthenticatedHomeMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const siteGuideOuter = document.querySelector<HTMLElement>(".site-guide-outer");
    const mainStream = document.querySelector<HTMLElement>(".main-stream");
    const defaultLandingButton = document.querySelector<HTMLElement>("#setDefaultLoginPage");
    if (!pageWrapOuter || !siteGuideOuter || !mainStream) {
      throw new Error("Expected mobile authenticated home metric targets are missing.");
    }

    return {
      defaultLandingButtonDisplay: defaultLandingButton
        ? getComputedStyle(defaultLandingButton).display
        : null,
      mainStreamWidth: Math.round(mainStream.getBoundingClientRect().width),
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      siteGuideOuterMargin: getComputedStyle(siteGuideOuter).margin,
    };
  });
}

async function canonicalizeSelector(page: Page, selector: string) {
  return page.evaluate((targetSelector) => {
    const root = document.querySelector(targetSelector);
    if (!root) {
      throw new Error(`Missing selector: ${targetSelector}`);
    }
    return visit(root);

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
        "placeholder",
        "href",
        "src",
        "target",
        "title",
        "data-location",
        "data-organization-id",
        "data-project-id",
        "data-toggle",
        "data-placement",
        "data-trigger",
        "data-content",
        "data-target",
        "data-url",
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
      if (name === "class") {
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/)
          .filter((value, index, values) => value && values.indexOf(value) === index)
          .filter(
            (value) =>
              !(
                value === "active" &&
                current.tagName.toLowerCase() === "a" &&
                current.closest(".main-stream > .nav-tabs")
              ),
          )
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
    }
  }, selector);
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
          "placeholder",
          "href",
          "src",
          "target",
          "title",
          "data-location",
          "data-organization-id",
          "data-project-id",
          "data-toggle",
          "data-placement",
          "data-trigger",
          "data-content",
          "data-target",
          "data-url",
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
        if (name === "class") {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/)
            .filter((value, index, values) => value && values.indexOf(value) === index)
            .filter(
              (value) =>
                !(
                  value === "active" &&
                  current.tagName.toLowerCase() === "a" &&
                  current.closest(".main-stream > .nav-tabs")
                ),
            )
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }
    },
    { markup: html },
  );
}
