import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const TABS = '[data-stylex-owner="authenticated-home-series-tabs"]';
const ITEMS = ':scope > [data-stylex-owner="authenticated-home-series-tab-item"]';
const LINKS = ':scope > li > [data-stylex-owner="authenticated-home-series-tab-link"]';
const ACTION = ':scope > [data-stylex-owner="authenticated-home-series-tab-action-item"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("authenticated Home series tabs have bounded global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const projectRoute = readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8");
  const styleStart = route.indexOf("const authenticatedHomeSeriesTabStyles");
  const styleEnd = route.indexOf("const siteFooterStyles", styleStart);
  expect(styleStart).toBeGreaterThanOrEqual(0);
  expect(styleEnd).toBeGreaterThan(styleStart);
  const styles = route.slice(styleStart, styleEnd);

  for (const token of [
    "authenticatedHomeSeriesTabsZero",
    "authenticatedHomeSeriesTabsMarginBottom",
    "authenticatedHomeSeriesTabsListStyle",
    "authenticatedHomeSeriesTabsBorderColor",
    "authenticatedHomeSeriesTabsTransparentBorder",
    "authenticatedHomeSeriesTabsBorderStyle",
    "authenticatedHomeSeriesTabsBorderWidth",
    "authenticatedHomeSeriesTabsPseudoDisplay",
    "authenticatedHomeSeriesTabsPseudoContent",
    "authenticatedHomeSeriesTabsPseudoClear",
    "authenticatedHomeSeriesTabItemFloat",
    "authenticatedHomeSeriesTabItemMarginBottom",
    "authenticatedHomeSeriesTabActionPosition",
    "authenticatedHomeSeriesTabLinkDisplay",
    "authenticatedHomeSeriesTabLinkPaddingBlock",
    "authenticatedHomeSeriesTabLinkPaddingInline",
    "authenticatedHomeSeriesTabLinkMobilePaddingInline",
    "authenticatedHomeSeriesTabLinkMarginRight",
    "authenticatedHomeSeriesTabLinkLineHeight",
    "authenticatedHomeSeriesTabLinkRadius",
    "authenticatedHomeSeriesTabLinkText",
    "authenticatedHomeSeriesTabLinkFontWeight",
    "authenticatedHomeSeriesTabLinkCursor",
    "authenticatedHomeSeriesTabLinkTextDecoration",
    "authenticatedHomeSeriesTabLinkHoverSurface",
    "authenticatedHomeSeriesTabLinkFocusSurface",
    "authenticatedHomeSeriesTabLinkInteractionBorderBlockStart",
    "authenticatedHomeSeriesTabLinkInteractionBorderInline",
    "authenticatedHomeSeriesTabLinkInteractionBorderBlockEnd",
    "authenticatedHomeSeriesTabActiveText",
    "authenticatedHomeSeriesTabActiveSurface",
    "authenticatedHomeSeriesTabActiveCursor",
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
  expect(styles).toMatch(/display: "block"/u);
  expect(styles).toMatch(/position: "relative"/u);
  expect(styles).toMatch(/cursor: "pointer"/u);

  const markupStart = route.indexOf('data-stylex-owner="authenticated-home-series-tabs"');
  const notificationOwner = route.indexOf(
    'data-stylex-owner="authenticated-home-notification-list"',
    markupStart,
  );
  const markupEnd = route.lastIndexOf("<ul", notificationOwner);
  const markup = route.slice(route.lastIndexOf("<ul", markupStart), markupEnd);
  expect(markup).not.toMatch(/className=[^\n]*(?:\bnav\b|\bnav-tabs\b|\bactive\b)/u);
  expect(markup).not.toContain('style={{ position: "relative" }}');
  expect(markup.match(/authenticated-home-series-tab-item/g)).toHaveLength(3);
  expect(markup).toContain("authenticated-home-series-tab-action-item");
  expect(markup.match(/authenticated-home-series-tab-link/g)).toHaveLength(3);
  expect(markup).toContain('to="/notifications"');
  expect(markup).toContain('to="/user/issues"');
  expect(markup).toContain('to="/user/files"');
  expect(markup).toContain("LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS");

  // The generic fallback remains live for project tabs outside this owner.
  expect(projectRoute).toContain('<ul className="nav nav-tabs">');
  expect(appCss).toContain(".nav-tabs {");
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 900, label: "intermediate", width: 800 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`authenticated Home series tabs preserve ${viewport.label} legacy geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const tabs = page.locator(TABS);
    await assertSeriesTabDom(tabs);
    const evidence = await readSeriesTabEvidence(tabs);
    const mobile = viewport.width <= 720;
    const expected = mobile
      ? {
          itemWidths: [36.4921875, 51.015625, 51.015625],
          linkWidths: [34.4921875, 49.015625, 49.015625],
          x: 0,
          width: 380,
        }
      : viewport.width === 800
        ? {
            itemWidths: [86.4921875, 101.015625, 101.015625],
            linkWidths: [84.4921875, 99.015625, 99.015625],
            x: 10,
            width: 507.8671875,
          }
        : {
            itemWidths: [86.4921875, 101.015625, 101.015625],
            linkWidths: [84.4921875, 99.015625, 99.015625],
            x: 10,
            width: 881.1875,
          };

    expect(evidence.box.x).toBeCloseTo(evidence.parentBox.x, 3);
    expect(evidence.box.y).toBeCloseTo(evidence.parentBox.y, 3);
    expect(evidence.box.width).toBeCloseTo(evidence.parentBox.width, 3);
    expect(evidence.box.x).toBeCloseTo(expected.x, 3);
    expect(evidence.box.width).toBeGreaterThanOrEqual(expected.width);
    expect(evidence.box.height).toBe(38);
    expect(evidence.list).toEqual({
      borderBottomColor: "rgb(221, 221, 221)",
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      listStyleType: "none",
      marginBottom: "20px",
      marginLeft: "0px",
      padding: "0px",
    });
    expect(evidence.pseudo).toEqual({
      after: { clear: "both", content: '""', display: "table", lineHeight: "0px" },
      before: { clear: "none", content: '""', display: "table", lineHeight: "0px" },
    });
    expect(evidence.itemWidths).toHaveLength(4);
    expect(evidence.itemWidths.slice(0, 3)).toEqual(
      expected.itemWidths.map((width) => expect.closeTo(width, 1)),
    );
    expect(evidence.itemWidths[3]).toBe(0);
    expect(evidence.itemStyles.slice(0, 3)).toEqual([
      { float: "left", marginBottom: "-1px" },
      { float: "left", marginBottom: "-1px" },
      { float: "left", marginBottom: "-1px" },
    ]);
    expect(evidence.linkWidths).toEqual(
      expected.linkWidths.map((width) => expect.closeTo(width, 1)),
    );
    expect(evidence.linkStyles[0]).toMatchObject({
      backgroundColor: "rgb(255, 255, 255)",
      borderBottomColor: "rgba(0, 0, 0, 0)",
      borderLeftColor: "rgb(221, 221, 221)",
      borderRightColor: "rgb(221, 221, 221)",
      borderTopColor: "rgb(221, 221, 221)",
      borderRadius: "4px 4px 0px 0px",
      color: "rgb(85, 85, 85)",
      cursor: "default",
      display: "block",
      fontWeight: "700",
      lineHeight: "20px",
      marginRight: "2px",
      padding: mobile ? "8px 5px" : "8px 30px",
    });
    for (const style of evidence.linkStyles.slice(1)) {
      expect(style).toMatchObject({
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderBottomColor: "rgba(0, 0, 0, 0)",
        borderLeftColor: "rgba(0, 0, 0, 0)",
        borderRightColor: "rgba(0, 0, 0, 0)",
        borderTopColor: "rgba(0, 0, 0, 0)",
        borderRadius: "4px 4px 0px 0px",
        color: "rgb(53, 146, 181)",
        cursor: "pointer",
        display: "block",
        fontWeight: "700",
        lineHeight: "20px",
        marginRight: "2px",
        padding: mobile ? "8px 5px" : "8px 30px",
      });
    }

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await tabs.screenshot({
      path: resolve(SCREENSHOT_DIRECTORY, `stylex-auth-home-series-tabs-${viewport.label}.png`),
    });
  });
}

test("authenticated Home series tab interaction states preserve the final frozen cascade", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);
  const tabs = page.locator(TABS);
  const active = tabs.locator(LINKS).nth(0);
  const inactive = tabs.locator(LINKS).nth(1);

  await inactive.hover();
  expect(await readLinkPaint(inactive)).toMatchObject({
    backgroundColor: "rgb(242, 242, 242)",
    borderBottomColor: "rgb(221, 221, 221)",
    borderLeftColor: "rgb(238, 238, 238)",
    borderRightColor: "rgb(238, 238, 238)",
    borderTopColor: "rgb(238, 238, 238)",
    textDecorationLine: "none",
  });
  await page.mouse.move(1, 1);
  await inactive.focus();
  expect(await readLinkPaint(inactive)).toMatchObject({
    backgroundColor: "rgb(238, 238, 238)",
    borderBottomColor: "rgb(221, 221, 221)",
    borderLeftColor: "rgb(238, 238, 238)",
    borderRightColor: "rgb(238, 238, 238)",
    borderTopColor: "rgb(238, 238, 238)",
    textDecorationLine: "none",
  });
  await active.hover();
  expect(await readLinkPaint(active)).toMatchObject({
    backgroundColor: "rgb(255, 255, 255)",
    borderBottomColor: "rgba(0, 0, 0, 0)",
    borderLeftColor: "rgb(221, 221, 221)",
    borderRightColor: "rgb(221, 221, 221)",
    borderTopColor: "rgb(221, 221, 221)",
    color: "rgb(85, 85, 85)",
    cursor: "default",
  });
  await page.mouse.move(1, 1);
  await active.focus();
  expect(await readLinkPaint(active)).toMatchObject({
    backgroundColor: "rgb(255, 255, 255)",
    borderBottomColor: "rgba(0, 0, 0, 0)",
    borderLeftColor: "rgb(221, 221, 221)",
    borderRightColor: "rgb(221, 221, 221)",
    borderTopColor: "rgb(221, 221, 221)",
    color: "rgb(85, 85, 85)",
    cursor: "default",
    outlineStyle: "none",
  });

  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __seriesTabSpaMarker?: string }
    ).__seriesTabSpaMarker = "notification-link";
  });
  await active.click();
  await expect(page).toHaveURL(`${BASE_PATH}/notifications`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & typeof globalThis & { __seriesTabSpaMarker?: string })
            .__seriesTabSpaMarker,
      ),
    )
    .toBe("notification-link");
});

test("notifications keeps the React-owned default-login action behavior outside tab paint", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.setViewportSize({ height: 900, width: 1366 });
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

  const tabs = page.locator(TABS);
  await assertSeriesTabDom(tabs, false);
  const action = tabs.locator(ACTION);
  const button = action.locator("#setDefaultLoginPage");
  await expect(action).toHaveCSS("position", "relative");
  await expect(button).toHaveText("기본 페이지로 지정");
  await expect(button).toHaveAttribute(
    "data-stylex-owner",
    "authenticated-home-default-login-action",
  );
  await expect(button).not.toHaveClass(/(?:^|\s)(?:ybtn|hide-in-mobile)(?:\s|$)/u);
  await expect(button).not.toHaveAttribute("data-toggle");
  await button.hover();
  const popup = action.locator('[data-stylex-owner="authenticated-home-default-login-popover"]');
  await expect(popup).toBeVisible();
  await expect(popup).not.toHaveClass(/(?:^|\s)(?:popover|bottom)(?:\s|$)/u);
  await expect(
    popup.locator('[data-stylex-owner="authenticated-home-default-login-popover-title"]'),
  ).toHaveText("기본 페이지로 지정");
  await expect(
    popup.locator('[data-stylex-owner="authenticated-home-default-login-popover-content"]'),
  ).toHaveText("현재 페이지를 로그인 후 표시되는 기본 인덱스 페이지로 지정합니다");
  await page.mouse.move(1, 1);
  await expect(popup).toHaveCount(0);
  await button.click();
  await expect(button).toBeHidden();
  expect(requests).toEqual([`${BASE_PATH}/user/defultLoginPage?path=%2Fnotifications`]);
});

test("authenticated Home series tab paint is isolated from retired classes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);
  const tabs = page.locator(TABS);
  await expect(tabs).toBeVisible();
  const result = await tabs.evaluate((list) => {
    const links = [...list.querySelectorAll<HTMLElement>(":scope > li > a")];
    const snapshot = () => ({
      active: [getComputedStyle(links[0]).backgroundColor, getComputedStyle(links[0]).color],
      inactive: [getComputedStyle(links[1]).padding, getComputedStyle(links[1]).color],
      list: [getComputedStyle(list).marginBottom, getComputedStyle(list, "::after").clear],
    });
    const owned = snapshot();
    list.classList.add("nav", "nav-tabs");
    list.firstElementChild?.classList.add("active");
    return { owned, withRetiredClasses: snapshot() };
  });
  expect(result.withRetiredClasses).toEqual(result.owned);
});

async function assertSeriesTabDom(tabs: Locator, actionIsEmpty = true) {
  await expect(tabs).toBeVisible();
  await expect(tabs).not.toHaveClass(/(?:^|\s)(?:nav|nav-tabs)(?:\s|$)/u);
  await expect(tabs.locator(ITEMS)).toHaveCount(3);
  await expect(tabs.locator(ACTION)).toHaveCount(1);
  await expect(tabs.locator(":scope > li")).toHaveCount(4);
  await expect(tabs.locator(LINKS)).toHaveText(["알림", "내 이슈", "내 파일"]);
  await expect(tabs.locator(LINKS).nth(0)).toHaveAttribute("href", `${BASE_PATH}/notifications`);
  await expect(tabs.locator(LINKS).nth(1)).toHaveAttribute("href", `${BASE_PATH}/user/issues`);
  await expect(tabs.locator(LINKS).nth(2)).toHaveAttribute("href", `${BASE_PATH}/user/files`);
  if (actionIsEmpty) {
    await expect(tabs.locator(ACTION)).toBeEmpty();
  }
  for (const item of await tabs.locator(":scope > li").all()) {
    await expect(item).not.toHaveClass(/(?:^|\s)active(?:\s|$)/u);
  }
  for (const link of await tabs.locator(LINKS).all()) {
    await expect(link).not.toHaveAttribute("aria-current");
    await expect(link).not.toHaveAttribute("data-status");
    await expect(link).not.toHaveClass(/(?:^|\s)active(?:\s|$)/u);
  }
}

async function readSeriesTabEvidence(tabs: Locator) {
  return tabs.evaluate((list) => {
    const rect = list.getBoundingClientRect();
    const items = [...list.querySelectorAll<HTMLElement>(":scope > li")];
    const links = [...list.querySelectorAll<HTMLElement>(":scope > li > a")];
    const listStyle = getComputedStyle(list);
    const before = getComputedStyle(list, "::before");
    const after = getComputedStyle(list, "::after");
    const box = (element: HTMLElement) => {
      const value = element.getBoundingClientRect();
      return { height: value.height, width: value.width, x: value.x, y: value.y };
    };
    const linkStyle = (element: HTMLElement) => {
      const value = getComputedStyle(element);
      return {
        backgroundColor: value.backgroundColor,
        borderBottomColor: value.borderBottomColor,
        borderLeftColor: value.borderLeftColor,
        borderRadius: value.borderRadius,
        borderRightColor: value.borderRightColor,
        borderTopColor: value.borderTopColor,
        color: value.color,
        cursor: value.cursor,
        display: value.display,
        fontWeight: value.fontWeight,
        lineHeight: value.lineHeight,
        marginRight: value.marginRight,
        padding: value.padding,
      };
    };
    return {
      box: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
      parentBox: box(list.parentElement as HTMLElement),
      itemStyles: items.map((item) => ({
        float: getComputedStyle(item).float,
        marginBottom: getComputedStyle(item).marginBottom,
      })),
      itemWidths: items.map((item) => box(item).width),
      linkStyles: links.map(linkStyle),
      linkWidths: links.map((link) => box(link).width),
      list: {
        borderBottomColor: listStyle.borderBottomColor,
        borderBottomStyle: listStyle.borderBottomStyle,
        borderBottomWidth: listStyle.borderBottomWidth,
        listStyleType: listStyle.listStyleType,
        marginBottom: listStyle.marginBottom,
        marginLeft: listStyle.marginLeft,
        padding: listStyle.padding,
      },
      pseudo: {
        after: {
          clear: after.clear,
          content: after.content,
          display: after.display,
          lineHeight: after.lineHeight,
        },
        before: {
          clear: before.clear,
          content: before.content,
          display: before.display,
          lineHeight: before.lineHeight,
        },
      },
    };
  });
}

async function readLinkPaint(link: Locator) {
  return link.evaluate((element) => {
    const value = getComputedStyle(element);
    return {
      backgroundColor: value.backgroundColor,
      borderBottomColor: value.borderBottomColor,
      borderLeftColor: value.borderLeftColor,
      borderRightColor: value.borderRightColor,
      borderTopColor: value.borderTopColor,
      color: value.color,
      cursor: value.cursor,
      outlineStyle: value.outlineStyle,
      textDecorationLine: value.textDecorationLine,
    };
  });
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
  for (const endpoint of ["workspace/overview", "notifications", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}
