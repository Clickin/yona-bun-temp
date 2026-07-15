import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const PAGINATION = '[data-stylex-owner="authenticated-home-notification-pagination"]';
const ROW = '[data-stylex-owner="authenticated-home-notification-row"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("authenticated Home notification pagination has bounded global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const partial = readFileSync(
    "../yona-original/app/views/index/partial_notifications.scala.html",
    "utf8",
  );
  const start = route.indexOf("const authenticatedHomeNotificationPaginationStyles");
  const end = route.indexOf("const authenticatedHomeNotificationRowStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);

  for (const token of [
    "authenticatedHomeNotificationPaginationMarginTop",
    "authenticatedHomeNotificationPaginationWidth",
    "authenticatedHomeNotificationPaginationBoxSizing",
    "authenticatedHomeNotificationPaginationSurface",
    "authenticatedHomeNotificationPaginationInteractionSurface",
    "authenticatedHomeNotificationPaginationText",
    "authenticatedHomeNotificationPaginationInteractionText",
    "authenticatedHomeNotificationPaginationTextShadow",
    "authenticatedHomeNotificationPaginationBorderRadius",
    "authenticatedHomeNotificationPaginationDisplay",
    "authenticatedHomeNotificationPaginationPadding",
    "authenticatedHomeNotificationPaginationVerticalAlign",
    "authenticatedHomeNotificationPaginationCursor",
    "authenticatedHomeNotificationPaginationLineHeight",
    "authenticatedHomeNotificationPaginationFontSize",
    "authenticatedHomeNotificationPaginationTransition",
    "authenticatedHomeNotificationPaginationOutline",
    "authenticatedHomeNotificationPaginationPosition",
    "authenticatedHomeNotificationPaginationZero",
    "authenticatedHomeNotificationPaginationBorderColor",
    "authenticatedHomeNotificationPaginationInteractionBorderColor",
    "authenticatedHomeNotificationPaginationBorderStyle",
    "authenticatedHomeNotificationPaginationBorderWidth",
    "authenticatedHomeNotificationPaginationBoxShadow",
    "authenticatedHomeNotificationPaginationZIndex",
    "authenticatedHomeNotificationPaginationTextAlign",
    "authenticatedHomeNotificationPaginationInteractiveTextDecoration",
    "authenticatedHomeNotificationPaginationWhiteSpace",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu);
  expect(styles).toContain('boxSizing: "content-box"');
  expect(theme).not.toContain("authenticatedHomeNotificationPaginationBoxSizing:");
  const paginationOwners = [
    ...route.matchAll(/data-stylex-owner="authenticated-home-notification-pagination"/gu),
  ];
  expect(paginationOwners).toHaveLength(2);
  const paginationButtonBlocks = paginationOwners.map(({ index }) =>
    route.slice(route.lastIndexOf("<button", index ?? -1), route.indexOf(">", index ?? -1) + 1),
  );
  for (const buttonBlock of paginationButtonBlocks) {
    expect(buttonBlock).toContain(
      "{...stylex.props(authenticatedHomeNotificationPaginationStyles.button)}",
    );
    expect(buttonBlock).not.toMatch(/\bybtn\b/u);
  }
  expect(route).not.toContain(
    "className={`ybtn ${stylex.props(authenticatedHomeNotificationPaginationStyles.button).className}`}",
  );
  expect(route).not.toContain('style={{ boxSizing: "content-box" }}');
  expect(pageLess).toContain("#notification-more {\n    margin-top: 20px;\n    width: 95%;\n}");
  expect(partial).toContain('id="notification-more" class="ybtn">More</a>');
});

for (const routePath of ["/", "/notifications"] as const) {
  test(`authenticated Home ${routePath} pagination preserves legacy structure and behavior`, async ({
    page,
  }) => {
    const requests = await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}${routePath}`);

    const pagination = page.locator(PAGINATION);
    await expect(page.locator(ROW)).toHaveCount(1);
    await expect(pagination).toHaveCount(1);
    await expect(pagination).toHaveText("More");
    await expect(pagination).toHaveAttribute("id", "notification-more");
    await expect(pagination).toHaveAttribute("type", "button");
    await expect(pagination).not.toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    await expect(pagination).not.toHaveAttribute("style");
    await expect(pagination.locator("xpath=parent::li")).toHaveCount(1);
    await expect(page.locator("a#notification-more")).toHaveCount(0);
    await expectOwnedStyle(pagination);
    if (routePath === "/notifications") {
      await expect(pagination).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(pagination).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0.15)");
      await expect(pagination).toHaveCSS("color", "rgb(51, 51, 51)");
      await expect(pagination).toHaveCSS("display", "inline-block");
      await expect(pagination).toHaveCSS("font-size", "14px");
      await expect(pagination).toHaveCSS("line-height", "20px");
      await expect(pagination).toHaveCSS("text-align", "center");
      await expect(pagination).toHaveCSS("white-space", "nowrap");
      await expect(pagination).toHaveCSS("text-shadow", "none");
      await expect(pagination).toHaveCSS("border-radius", "3px");
      await expect(pagination).toHaveCSS("vertical-align", "middle");
      await expect(pagination).toHaveCSS("cursor", "pointer");
      await expect(pagination).toHaveCSS("transition-property", "all");
      await expect(pagination).toHaveCSS("transition-duration", "0.3s");
      await expect(pagination).toHaveCSS("transition-timing-function", "ease");
      await expect(pagination).toHaveCSS("transition-delay", "0s");
      await expect(pagination).toHaveCSS("outline-style", "none");
      await expect(pagination).toHaveCSS("position", "relative");
      await expect(pagination).toHaveCSS("margin", "20px 0px 0px");
      await expect(pagination).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px");
      await expect(pagination).toHaveCSS("z-index", "2");
      await expect(pagination).toHaveCSS("text-decoration-line", "none");
      await expect(pagination).toHaveCSS("padding", "4px 12px");
      await pagination.hover();
      await expect(pagination).toHaveCSS("background-color", "rgb(241, 241, 241)");
      await expect(pagination).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0.25)");
      await expect(pagination).toHaveCSS("color", "rgb(41, 41, 41)");
      await expect(pagination).toHaveCSS("text-decoration-line", "none");
      await page.mouse.move(0, 0);
      await pagination.focus();
      await expect(pagination).toHaveCSS("background-color", "rgb(241, 241, 241)");
      await expect(pagination).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0.25)");
      await expect(pagination).toHaveCSS("color", "rgb(41, 41, 41)");
      await expect(pagination).toHaveCSS("text-decoration-line", "none");
      await pagination.hover();
      await page.mouse.down();
      await expect(pagination).toHaveCSS("background-color", "rgb(241, 241, 241)");
      await expect(pagination).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0.25)");
      await expect(pagination).toHaveCSS("color", "rgb(41, 41, 41)");
      await expect(pagination).toHaveCSS("text-decoration-line", "none");
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }

    const beforeUrl = page.url();
    await pagination.click();
    await expect(page.locator(ROW)).toHaveCount(2);
    await expect(page.locator(ROW, { hasText: "알림 제목 2" })).toHaveCount(1);
    await expect(pagination).toHaveCount(0);
    expect(page.url()).toBe(beforeUrl);
    expect(requests).toContain(`${BASE_PATH}/api/v1/notifications?from=1&size=20`);
  });
}

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`authenticated Home pagination preserves ${viewport.label} legacy-relative geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/notifications`);
    await page.evaluate(() => document.fonts.ready);

    const pagination = page.locator(PAGINATION);
    await expectOwnedStyle(pagination);
    const evidence = await pagination.evaluate((button) => {
      const item = button.parentElement;
      const list = item?.parentElement;
      if (!item || !list) throw new Error("notification pagination ancestry is missing");
      const box = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          right: rect.right,
          width: rect.width,
          x: rect.x,
          y: rect.y,
        };
      };
      const style = getComputedStyle(button);
      return {
        button: box(button),
        contentWidth: Number.parseFloat(style.width),
        item: box(item),
        list: box(list),
        style: {
          borderLeftWidth: style.borderLeftWidth,
          borderRightWidth: style.borderRightWidth,
          boxSizing: style.boxSizing,
          margin: style.margin,
          marginTop: style.marginTop,
          padding: style.padding,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          width: style.width,
        },
      };
    });
    const horizontalChrome =
      Number.parseFloat(evidence.style.paddingLeft) +
      Number.parseFloat(evidence.style.paddingRight) +
      Number.parseFloat(evidence.style.borderLeftWidth) +
      Number.parseFloat(evidence.style.borderRightWidth);
    const expected =
      viewport.label === "desktop"
        ? {
            button: { height: 30, width: 869.390625, x: 10, y: 287.078125 },
            item: { height: 50, width: 887.78125, x: 10, y: 267.078125 },
            list: { height: 143, width: 887.78125, x: 10, y: 174.078125 },
          }
        : {
            button: { height: 30, width: 396.5, x: 0, y: 326 },
            item: { height: 50, width: 390, x: 0, y: 306 },
            list: { height: 175, width: 390, x: 0, y: 181 },
          };
    // The one-row fixture changes total list height and pagination y. Against the live legacy
    // baseline, the existing shell contributes only desktop +6.59375px/mobile +10px list width
    // and -1px list y drift; the owned 50px item, 20px offset, and 30px button remain exact.
    for (const key of ["button", "item", "list"] as const) {
      expect(evidence[key].height).toBeCloseTo(expected[key].height, 1);
      expect(evidence[key].width).toBeCloseTo(expected[key].width, 1);
      expect(evidence[key].x).toBeCloseTo(expected[key].x, 1);
      expect(evidence[key].y).toBeCloseTo(expected[key].y, 1);
    }
    expect(evidence.style).toMatchObject({
      boxSizing: "content-box",
      margin: "20px 0px 0px",
      marginTop: "20px",
      padding: "4px 12px",
    });
    expect(evidence.button.height).toBe(30);
    expect(evidence.item.height).toBe(50);
    expect(evidence.button.x).toBeCloseTo(evidence.item.x, 1);
    expect(evidence.button.y - evidence.item.y).toBeCloseTo(20, 1);
    expect(evidence.contentWidth).toBeCloseTo(evidence.item.width * 0.95, 1);
    expect(evidence.button.width).toBeCloseTo(evidence.contentWidth + horizontalChrome, 1);
    expect(evidence.item.width).toBeCloseTo(evidence.list.width, 1);

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await pagination.locator("xpath=parent::li").screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `stylex-auth-home-notification-more-${viewport.label}.png`,
      ),
    });
  });
}

test("singular notification fragment uses the same pagination owner and appends results", async ({
  page,
}) => {
  const requests = await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/notification?from=0&limit=20`);

  const pagination = page.locator(PAGINATION);
  await expect(page.locator(ROW)).toHaveCount(1);
  await expect(pagination).toHaveCount(1);
  await expect(pagination).toHaveText("More");
  await expect(pagination).not.toHaveAttribute("style");
  await expectOwnedStyle(pagination);
  await pagination.click();
  await expect(page.locator(ROW)).toHaveCount(2);
  await expect(pagination).toHaveCount(0);
  expect(requests).toContain(`${BASE_PATH}/api/v1/notifications?from=1&size=20`);
});

async function expectOwnedStyle(pagination: ReturnType<Page["locator"]>) {
  await expect(pagination).toHaveCSS("box-sizing", "content-box");
  await expect(pagination).toHaveCSS("margin-top", "20px");
  await expect(pagination).toHaveCSS("width", /.+/u);
}

async function installAuthenticatedHome(page: Page) {
  const requests: string[] = [];
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
  await page.route("**/api/v1/notifications**", (route) => {
    const url = new URL(route.request().url());
    requests.push(`${url.pathname}${url.search}`);
    const nextPage = url.searchParams.get("from") === "1";
    return route.fulfill({
      contentType: "application/json",
      json: {
        hasMore: !nextPage,
        items: [notification(nextPage ? "2" : "1")],
        total: 2,
      },
    });
  });
  for (const endpoint of ["workspace/overview", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
  return requests;
}

function notification(id: string) {
  return {
    actor: {
      avatarUrl: `${BASE_PATH}/assets/images/default-avatar-64.png`,
      displayName: "Site Admin",
      loginId: "admin",
    },
    createdAt: "2026-07-14T00:00:00Z",
    createdLabel: "방금 전",
    eventType: "NEW_COMMENT",
    id: `notification-${id}`,
    message: "알림 본문",
    targetHref: "",
    targetTitle: `알림 제목 ${id}`,
    typeIcon: "comment2",
  };
}
