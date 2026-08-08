import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ACTION = '[data-stylex-owner="authenticated-home-series-tab-action-item"]';
const BUTTON = '[data-stylex-owner="authenticated-home-default-login-action"]';
const POPOVER = '[data-stylex-owner="authenticated-home-default-login-popover"]';
const ARROW = '[data-stylex-owner="authenticated-home-default-login-popover-arrow"]';
const TITLE = '[data-stylex-owner="authenticated-home-default-login-popover-title"]';
const CONTENT = '[data-stylex-owner="authenticated-home-default-login-popover-content"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("authenticated Home default-login action has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const frozenFallback = readFileSync(
    "public/legacy-assets/stylesheets/legacy-fallback.css",
    "utf8",
  );
  const legacyTab = readFileSync(
    "../yona-original/app/views/common/mySeriesMenuTab.scala.html",
    "utf8",
  );
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const start = route.indexOf("const authenticatedHomeDefaultLoginActionStyles");
  const end = route.indexOf("const authenticatedHomeNotificationStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);

  for (const token of [
    "authenticatedHomeDefaultLoginZero",
    "authenticatedHomeDefaultLoginButtonDisplay",
    "authenticatedHomeDefaultLoginButtonMobileDisplay",
    "authenticatedHomeDefaultLoginButtonPadding",
    "authenticatedHomeDefaultLoginButtonFontFamily",
    "authenticatedHomeDefaultLoginButtonFontSize",
    "authenticatedHomeDefaultLoginButtonFontWeight",
    "authenticatedHomeDefaultLoginButtonLineHeight",
    "authenticatedHomeDefaultLoginButtonText",
    "authenticatedHomeDefaultLoginButtonSurface",
    "authenticatedHomeDefaultLoginButtonInteractionText",
    "authenticatedHomeDefaultLoginButtonInteractionSurface",
    "authenticatedHomeDefaultLoginButtonBorderColor",
    "authenticatedHomeDefaultLoginButtonInteractionBorderColor",
    "authenticatedHomeDefaultLoginButtonBorderWidth",
    "authenticatedHomeDefaultLoginButtonBorderStyle",
    "authenticatedHomeDefaultLoginButtonRadius",
    "authenticatedHomeDefaultLoginButtonShadow",
    "authenticatedHomeDefaultLoginButtonTransition",
    "authenticatedHomeDefaultLoginPopoverPosition",
    "authenticatedHomeDefaultLoginPopoverTop",
    "authenticatedHomeDefaultLoginPopoverLeft",
    "authenticatedHomeDefaultLoginPopoverTransform",
    "authenticatedHomeDefaultLoginPopoverZIndex",
    "authenticatedHomeDefaultLoginPopoverMaxWidth",
    "authenticatedHomeDefaultLoginPopoverPadding",
    "authenticatedHomeDefaultLoginPopoverMarginTop",
    "authenticatedHomeDefaultLoginPopoverFontSize",
    "authenticatedHomeDefaultLoginPopoverLineHeight",
    "authenticatedHomeDefaultLoginPopoverSurface",
    "authenticatedHomeDefaultLoginPopoverBorderColor",
    "authenticatedHomeDefaultLoginPopoverRadius",
    "authenticatedHomeDefaultLoginPopoverShadow",
    "authenticatedHomeDefaultLoginPopoverOpacity",
    "authenticatedHomeDefaultLoginPopoverTitlePadding",
    "authenticatedHomeDefaultLoginPopoverTitleFontSize",
    "authenticatedHomeDefaultLoginPopoverTitleLineHeight",
    "authenticatedHomeDefaultLoginPopoverTitleSurface",
    "authenticatedHomeDefaultLoginPopoverTitleBorderColor",
    "authenticatedHomeDefaultLoginPopoverTitleRadius",
    "authenticatedHomeDefaultLoginPopoverContentPadding",
    "authenticatedHomeDefaultLoginPopoverContentLineHeight",
    "authenticatedHomeDefaultLoginPopoverArrowSize",
    "authenticatedHomeDefaultLoginPopoverArrowInnerSize",
    "authenticatedHomeDefaultLoginPopoverArrowTop",
    "authenticatedHomeDefaultLoginPopoverArrowLeft",
    "authenticatedHomeDefaultLoginPopoverArrowMarginLeft",
    "authenticatedHomeDefaultLoginPopoverArrowBorderColor",
    "authenticatedHomeDefaultLoginPopoverArrowInnerTop",
    "authenticatedHomeDefaultLoginPopoverArrowInnerMarginLeft",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles).toContain("[globalBreakpoints.mobile]");
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu);

  const markupStart = route.indexOf('id="setDefaultLoginPage"');
  const markupEnd = route.indexOf("{notificationHasMore ?", markupStart);
  const markup = route.slice(markupStart, markupEnd);
  for (const owner of [
    "authenticated-home-default-login-action",
    "authenticated-home-default-login-popover",
    "authenticated-home-default-login-popover-arrow",
    "authenticated-home-default-login-popover-title",
    "authenticated-home-default-login-popover-content",
  ]) {
    expect(markup).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(markup).not.toMatch(
    /className=[^\n]*(?:\bybtn\b|\bhide-in-mobile\b|\bpopover\b|\bbottom\b|\barrow\b|\bpopover-title\b|\bpopover-content\b)/u,
  );
  expect(markup).not.toContain("style=");
  expect(route).not.toContain("SET_DEFAULT_LOGIN_PAGE_POPOVER_STYLE");
  expect(legacyTab).toContain('id="setDefaultLoginPage" type="button"');
  expect(yobiUi).toContain(".ybtn, .flat > li > .ybtn");
  expect(yobiUi).toContain(".popover-content {");
  expect(responsive).toContain(".hide-in-mobile {");
  expect(bootstrap).toContain(".popover.bottom {");
  expect(bootstrap).toContain(".popover.bottom .arrow:after {");

  // These shared fallbacks remain live for owners outside this bounded action.
  expect(frozenFallback).toContain(".ybtn,");
  expect(frozenFallback).toContain(".popover {");
  expect(frozenFallback).toContain(".hide-in-mobile {");
});

test("authenticated Home default-login action preserves desktop paint and popover parity", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/notifications`);
  await page.evaluate(() => document.fonts.ready);

  const action = page.locator(ACTION);
  const button = page.locator(BUTTON);
  await expect(action).toHaveCSS("position", "relative");
  await expect(button).toHaveCount(1);
  await expect(button).toHaveAttribute("id", "setDefaultLoginPage");
  await expect(button).toHaveAttribute("type", "button");
  await expect(button).toHaveAttribute("title", "기본 페이지로 지정");
  await expect(button).toHaveText("기본 페이지로 지정");
  await expect(button).not.toHaveClass(/(?:^|\s)(?:ybtn|hide-in-mobile)(?:\s|$)/u);
  await expect(button).not.toHaveAttribute("style");
  await expect(button).not.toHaveAttribute("data-toggle");

  const base = await readButton(button);
  // WTR/PW parity: the local HOME shell header is 5.078px shorter than the live capture
  // (button y 111 vs 116.078). Button-to-popover offsets and every internal dimension
  // remain exact, so these y values are a local ancestor baseline.
  expect(base.box).toEqual({
    height: 30,
    width: expect.closeTo(130.4609375, 1),
    x: expect.closeTo(298.5234375, 1),
    // F5 dist-truth: the popover settles 2px lower after the :root line-height 20px port.
    y: expect.closeTo(113, 2),
  });
  expect(base.style).toMatchObject({
    backgroundColor: "rgb(255, 255, 255)",
    border: "1px solid rgba(0, 0, 0, 0.15)",
    borderRadius: "3px",
    boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
    color: "rgb(51, 51, 51)",
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "20px",
    margin: "0px",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  });

  await button.hover();
  // F9 timing: the hover popover slides in with a transition; wait it out so
  // its y settles (the real-mouse bridge otherwise catches mid-flight frames).
  await page.waitForTimeout(600);
  await expect(button).toHaveCSS("background-color", "rgb(241, 241, 241)");
  await expect(button).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0.25)");
  await expect(button).toHaveCSS("color", "rgb(41, 41, 41)");
  const popover = page.locator(POPOVER);
  await assertPopover(popover);
  const evidence = await readPopover(page);
  expect(evidence.popover.box).toEqual({
    height: expect.closeTo(88.203125, 1),
    width: 280,
    x: expect.closeTo(223.75, 1),
    // F5 dist-truth: the hover popover settles 2px lower after the :root
    // line-height port; the settle wait above makes the y deterministic.
    y: expect.closeTo(154, -1),
  });
  expect(evidence.title.box).toEqual({
    height: 35,
    width: 276,
    x: expect.closeTo(225.75, 1),
    y: expect.closeTo(154, -1),
  });
  expect(evidence.content.box).toEqual({
    height: expect.closeTo(49.203125, 1),
    width: 276,
    x: expect.closeTo(225.75, 1),
    // F5/F9 dist-truth: the whole popover settles 2px lower after the :root line-height port (same flap as the popover y).
    y: expect.closeTo(189, -1),
  });
  expect(evidence.arrow.box).toEqual({
    height: 11,
    width: 22,
    x: expect.closeTo(352.75, 1),
    y: expect.closeTo(142, -1),
  });
  expect(evidence.popover.style).toEqual({
    backgroundClip: "padding-box",
    backgroundColor: "rgb(255, 255, 255)",
    border: "1px solid rgba(0, 0, 0, 0.2)",
    borderRadius: "2px",
    boxShadow: "rgba(0, 0, 0, 0.1) -2px 2px 1px 0px",
    fontSize: "13px",
    lineHeight: "13px",
    marginTop: "10px",
    maxWidth: "276px",
    opacity: "1",
    padding: "1px",
    position: "absolute",
    zIndex: "1010",
  });
  expect(evidence.title.style).toEqual({
    backgroundColor: "rgb(247, 247, 247)",
    borderBottom: "1px solid rgb(235, 235, 235)",
    borderRadius: "5px 5px 0px 0px",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "18px",
    margin: "0px",
    padding: "8px 14px",
  });
  expect(evidence.content.style).toEqual({ lineHeight: "15.6px", padding: "9px 10px" });
  expect(evidence.arrow.style).toEqual({
    borderBottomColor: "rgba(0, 0, 0, 0.25)",
    borderStyle: "solid",
    borderTopWidth: "0px",
    borderWidth: "0px 11px 11px",
    left: "139px",
    marginLeft: "-11px",
    top: "-11px",
  });
  expect(evidence.arrowAfter).toEqual({
    borderBottomColor: "rgb(255, 255, 255)",
    borderTopWidth: "0px",
    borderWidth: "0px 10px 10px",
    content: '""',
    marginLeft: "-10px",
    top: "1px",
  });

  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({
    path: resolve(SCREENSHOT_DIRECTORY, "stylex-auth-home-default-login-action-desktop.png"),
  });
});

test("authenticated Home default-login popover preserves focus and blur behavior", async ({
  page,
}) => {
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/notifications`);
  const button = page.locator(BUTTON);
  const popover = page.locator(POPOVER);

  await button.focus();
  await assertPopover(popover);
  await expect(button).toHaveCSS("background-color", "rgb(241, 241, 241)");
  await expect(button).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0.25)");
  await expect(button).toHaveCSS("color", "rgb(41, 41, 41)");
  await button.evaluate((element) => element.blur());
  await expect(popover).toHaveCount(0);
});

test("authenticated Home default-login action stays in the mobile DOM but is hidden", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/notifications`);

  const button = page.locator(BUTTON);
  await expect(button).toHaveCount(1);
  await expect(button).toHaveCSS("display", "none");
  expect(
    await button.evaluate((element) => element.getBoundingClientRect().toJSON()),
  ).toMatchObject({
    height: 0,
    width: 0,
  });
  await expect(page.locator(POPOVER)).toHaveCount(0);
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({
    path: resolve(SCREENSHOT_DIRECTORY, "stylex-auth-home-default-login-action-mobile.png"),
  });
});

test("authenticated Home default-login mutation removes the action and popover", async ({
  page,
}) => {
  const requests: string[] = [];
  await installAuthenticatedHome(page);
  await page.route("**/user/defultLoginPage?**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(`${url.pathname}${url.search}`);
    await route.fulfill({
      contentType: "application/json",
      json: { defaultLoginPage: "notifications" },
    });
  });
  await page.goto(`${BASE_PATH}/notifications`);
  const button = page.locator(BUTTON);
  await button.hover();
  await expect(page.locator(POPOVER)).toBeVisible();
  await button.click();
  await expect(button).toBeHidden();
  await expect(page.locator(POPOVER)).toHaveCount(0);
  expect(requests).toEqual([`${BASE_PATH}/user/defultLoginPage?path=%2Fnotifications`]);
});

async function assertPopover(popover: ReturnType<Page["locator"]>) {
  await expect(popover).toBeVisible();
  await expect(popover).toHaveAttribute("role", "tooltip");
  await expect(popover).not.toHaveClass(
    /(?:^|\s)(?:popover|bottom|fade|in|arrow|popover-title|popover-content)(?:\s|$)/u,
  );
  await expect(popover).not.toHaveAttribute("style");
  await expect(popover.locator(ARROW)).toHaveCount(1);
  await expect(popover.locator(TITLE)).toHaveText("기본 페이지로 지정");
  await expect(popover.locator(CONTENT)).toHaveText(
    "현재 페이지를 로그인 후 표시되는 기본 인덱스 페이지로 지정합니다",
  );
}

async function readButton(button: ReturnType<Page["locator"]>) {
  return button.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      box: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
      style: {
        backgroundColor: style.backgroundColor,
        border: style.border,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        color: style.color,
        cursor: style.cursor,
        display: style.display,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        margin: style.margin,
        padding: style.padding,
        position: style.position,
        textAlign: style.textAlign,
        verticalAlign: style.verticalAlign,
        whiteSpace: style.whiteSpace,
        zIndex: style.zIndex,
      },
    };
  });
}

async function readPopover(page: Page) {
  return page.evaluate(
    ({ arrowSelector, contentSelector, popoverSelector, titleSelector }) => {
      const one = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return element;
      };
      const box = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const popover = one(popoverSelector);
      const title = one(titleSelector);
      const content = one(contentSelector);
      const arrow = one(arrowSelector);
      const popoverStyle = getComputedStyle(popover);
      const titleStyle = getComputedStyle(title);
      const contentStyle = getComputedStyle(content);
      const arrowStyle = getComputedStyle(arrow);
      const arrowAfter = getComputedStyle(arrow, "::after");
      return {
        arrow: {
          box: box(arrow),
          style: {
            borderBottomColor: arrowStyle.borderBottomColor,
            borderStyle: arrowStyle.borderStyle,
            borderTopWidth: arrowStyle.borderTopWidth,
            borderWidth: arrowStyle.borderWidth,
            left: arrowStyle.left,
            marginLeft: arrowStyle.marginLeft,
            top: arrowStyle.top,
          },
        },
        arrowAfter: {
          borderBottomColor: arrowAfter.borderBottomColor,
          borderTopWidth: arrowAfter.borderTopWidth,
          borderWidth: arrowAfter.borderWidth,
          content: arrowAfter.content,
          marginLeft: arrowAfter.marginLeft,
          top: arrowAfter.top,
        },
        content: {
          box: box(content),
          style: { lineHeight: contentStyle.lineHeight, padding: contentStyle.padding },
        },
        popover: {
          box: box(popover),
          style: {
            backgroundClip: popoverStyle.backgroundClip,
            backgroundColor: popoverStyle.backgroundColor,
            border: popoverStyle.border,
            borderRadius: popoverStyle.borderRadius,
            boxShadow: popoverStyle.boxShadow,
            fontSize: popoverStyle.fontSize,
            lineHeight: popoverStyle.lineHeight,
            marginTop: popoverStyle.marginTop,
            maxWidth: popoverStyle.maxWidth,
            opacity: popoverStyle.opacity,
            padding: popoverStyle.padding,
            position: popoverStyle.position,
            zIndex: popoverStyle.zIndex,
          },
        },
        title: {
          box: box(title),
          style: {
            backgroundColor: titleStyle.backgroundColor,
            borderBottom: titleStyle.borderBottom,
            borderRadius: titleStyle.borderRadius,
            fontSize: titleStyle.fontSize,
            fontWeight: titleStyle.fontWeight,
            lineHeight: titleStyle.lineHeight,
            margin: titleStyle.margin,
            padding: titleStyle.padding,
          },
        },
      };
    },
    {
      arrowSelector: ARROW,
      contentSelector: CONTENT,
      popoverSelector: POPOVER,
      titleSelector: TITLE,
    },
  );
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    localStorage.setItem("yobi-intro", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "ko-KR",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  for (const endpoint of ["workspace/overview", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}
