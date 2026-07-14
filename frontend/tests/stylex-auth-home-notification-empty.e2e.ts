import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const LIST = '[data-stylex-owner="authenticated-home-notification-list"]';
const EMPTY = '[data-stylex-owner="authenticated-home-notification-empty"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("authenticated Home empty notification has bounded global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/theme.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const start = route.indexOf("const authenticatedHomeNotificationStyles");
  const end = route.indexOf("const siteFooterStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);

  for (const token of [
    "authenticatedHomeNotificationZero",
    "authenticatedHomeNotificationListStyle",
    "authenticatedHomeNotificationEmptyPadding",
    "authenticatedHomeNotificationEmptyText",
    "authenticatedHomeNotificationEmptyFontSize",
    "authenticatedHomeNotificationEmptyTextAlign",
    "authenticatedHomeNotificationEmptySurface",
    "authenticatedHomeNotificationEmptyBorderStyle",
    "authenticatedHomeNotificationEmptyBorderWidth",
    "authenticatedHomeNotificationEmptyRadius",
  ]) {
    expect(styles).toContain(`globalColors.${token}`);
    expect(theme).toContain(`${token}:`);
  }
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|\b-?\d+(?:\.\d+)?(?:px|%)\b/iu);
  expect(styles).not.toMatch(/:\s*"(?:none|center|solid)"/u);

  const markupStart = route.indexOf('data-stylex-owner="authenticated-home-notification-list"');
  const markupEnd = route.indexOf("{notificationHasMore ?", markupStart);
  const markup = route.slice(route.lastIndexOf("<ul", markupStart), markupEnd);
  expect(markup).toContain("className={`activity-streams ");
  expect(markup).not.toMatch(/\b(?:notification-wrap|unstyled|warning-none)\b/u);
  expect(markup).toContain('data-stylex-owner="authenticated-home-notification-empty"');
  expect(markup).toContain('className="yobicon-danger"');
  expect(appCss).not.toContain(".content-container .main-stream .activity-streams .warning-none {");

  // Generic/remaining consumers stay in fallback; only this owner retires its classes.
  expect(appCss).toContain(".unstyled {");
  expect(appCss).toContain(".warning-none {");
  expect(appCss).toContain(".content-container .main-stream .activity-streams {");
  expect(appCss).toContain(".notification-stream {");
  expect(bootstrap).toContain("ul.unstyled,\nol.unstyled {");
  expect(yobi).toContain(".notification-stream {");
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 900, label: "intermediate", width: 800 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`authenticated Home empty notification preserves ${viewport.label} legacy geometry and paint`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const list = page.locator(LIST);
    const empty = page.locator(EMPTY);
    await expect(list).toHaveCount(1);
    await expect(list).toHaveClass(/\bactivity-streams\b/u);
    await expect(list).not.toHaveClass(/\b(?:notification-wrap|unstyled)\b/u);
    await expect(empty).toHaveCount(1);
    await expect(empty).not.toHaveClass(/\bwarning-none\b/u);
    await expect(list.locator(`:scope > ${EMPTY}`)).toHaveCount(1);
    await expect(empty).toContainText("알림 메시지가 없습니다.");
    await expect(empty.locator(":scope > i.yobicon-danger")).toHaveCount(1);

    const evidence = await list.evaluate((listElement) => {
      const emptyElement = listElement.firstElementChild as HTMLElement;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const listStyle = getComputedStyle(listElement);
      const emptyStyle = getComputedStyle(emptyElement);
      return {
        empty: {
          backgroundColor: emptyStyle.backgroundColor,
          border: emptyStyle.border,
          borderRadius: emptyStyle.borderRadius,
          box: box(emptyElement),
          color: emptyStyle.color,
          fontSize: emptyStyle.fontSize,
          padding: emptyStyle.padding,
          textAlign: emptyStyle.textAlign,
        },
        list: {
          box: box(listElement as HTMLElement),
          listStyleType: listStyle.listStyleType,
          margin: listStyle.margin,
          padding: listStyle.padding,
        },
      };
    });
    const expected =
      viewport.width === 1366
        ? { width: 887.78125, x: 10, y: 174.078125 }
        : viewport.width === 800
          ? { width: 514.453125, x: 10, y: 174.078125 }
          : { width: 390, x: 0, y: 181 };
    expect(evidence.list.box).toMatchObject({ height: 50, ...expected });
    expect(evidence.empty.box).toMatchObject({ height: 50, ...expected });
    expect(evidence.list).toMatchObject({ listStyleType: "none", margin: "0px", padding: "0px" });
    expect(evidence.empty).toMatchObject({
      backgroundColor: "rgb(139, 139, 139)",
      border: "0px none rgb(255, 255, 255)",
      borderRadius: "6px",
      color: "rgb(255, 255, 255)",
      fontSize: "16px",
      padding: "15px 20px",
      textAlign: "center",
    });

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await list.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `stylex-auth-home-notification-empty-${viewport.label}.png`,
      ),
    });
  });
}

test("authenticated Home notification list keeps populated activity-stream fallback ancestry", async ({
  page,
}) => {
  await installAuthenticatedHome(page, true);
  await page.goto(`${BASE_PATH}/notifications`);
  const list = page.locator(LIST);
  await expect(list).toHaveClass(/\bactivity-streams\b/u);
  await expect(list.locator(":scope > li.notification-stream")).toHaveCount(1);
  const colors = await list.evaluate((listElement) => {
    const streamType = listElement.querySelector<HTMLElement>(".stream-type.info");
    if (!streamType) {
      throw new Error("Expected populated info notification stream type.");
    }
    const color = () => getComputedStyle(streamType).color;
    const retained = color();
    listElement.classList.remove("activity-streams");
    const withoutAncestry = color();
    listElement.classList.add("activity-streams");
    return { restored: color(), retained, withoutAncestry };
  });
  expect(colors).toEqual({
    restored: "rgb(153, 153, 153)",
    retained: "rgb(153, 153, 153)",
    withoutAncestry: "rgb(76, 175, 80)",
  });
});

async function installAuthenticatedHome(page: Page, populated = false) {
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
      json: {
        hasMore: false,
        items: populated
          ? [
              {
                actor: {
                  avatarUrl: `${BASE_PATH}/assets/images/default-avatar-64.png`,
                  displayName: "Site Admin",
                  loginId: "admin",
                },
                createdAt: "2026-07-14T00:00:00Z",
                createdLabel: "방금 전",
                eventType: "NEW_COMMENT",
                id: "notification-1",
                message: "알림 본문",
                targetHref: "",
                targetTitle: "알림 제목",
                typeIcon: "info",
              },
            ]
          : [],
        total: populated ? 1 : 0,
      },
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
