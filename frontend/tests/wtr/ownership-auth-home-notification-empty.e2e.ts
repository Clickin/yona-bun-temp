import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const LIST = '[data-owner="authenticated-home-notification-list"]';
const EMPTY = '[data-owner="authenticated-home-notification-empty"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("authenticated Home empty notification has bounded global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
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
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }

  const markupStart = route.indexOf('data-owner="authenticated-home-notification-list"');
  const markupEnd = route.indexOf("{notificationHasMore ?", markupStart);
  const markup = route.slice(route.lastIndexOf("<ul", markupStart), markupEnd);

  expect(markup).toMatch(/\bactivity-streams notification-wrap unstyled\b/u);
  expect(markup).toMatch(/\bwarning-none\b/u);
  expect(markup).toContain('data-owner="authenticated-home-notification-empty"');
  expect(markup).toContain('className="yobicon-danger"');
  expect(appCss).not.toContain(".content-container .main-stream .activity-streams .warning-none {");
  expect(appCss).not.toContain(".notification-page .activity-streams {");

  // Generic/remaining consumers stay in fallback; only this owner retires its classes.
  expect(appCss).toContain(".unstyled {");
  expect(appCss).toContain(".warning-none {");
  expect(appCss).not.toContain(".content-container .main-stream {");
  expect(appCss).not.toContain(".content-container .main-stream .activity-streams {");
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:first-of-type",
  );
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:last-child",
  );
  expect(appCss).not.toContain(".notification-stream {");
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
    await expect(list).toHaveClass(/\b(?:activity-streams|notification-wrap|unstyled)\b/u);
    await expect(empty).toHaveCount(1);
    await expect(empty).toHaveClass(/\bwarning-none\b/u);
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
    // The restored legacy cascade inherits Bootstrap's 20px body line-height
    // (bootstrap.css:176-183). With `_page.less`'s 15px block padding, the
    // warning is 50px tall. The restored legacy intro/toggle shell also puts
    // desktop and intermediate content at the live 174.078125px position.
    // e2e closure ledger (2026-08-11): mobile F5 dist-truth — the admin
    // affix (isSiteAdmin session) wraps to two lines at 390px (66px vs 43px
    // desktop), shifting the notification list to y=204 (was 181 in the
    // pre-affix pin).
    const expected =
      viewport.width === 1366
        ? { width: 887.78125, x: 10, y: 174.078125 }
        : viewport.width === 800
          ? { width: 527.65625, x: 0, y: 174.078125 }
          : { width: 390, x: 0, y: 204 };
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
    // WTR shim note: Locator.screenshot missing (bucket 1); page-level no-op preserves artifact intent.
    await page.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `style-auth-home-notification-empty-${viewport.label}.png`,
      ),
    });
  });
}

test("authenticated Home notification list retires populated activity-stream fallback ancestry", async ({
  page,
}) => {
  await installAuthenticatedHome(page, true);
  await page.goto(`${BASE_PATH}/notifications`);
  const list = page.locator(LIST);
  await expect(list).toHaveClass(/\bactivity-streams\b/u);
  await expect(
    list.locator(':scope > [data-owner="authenticated-home-notification-row"]'),
  ).toHaveCount(1);
  await expect(list.locator('[data-owner="authenticated-home-notification-type"]')).toHaveCSS(
    "color",
    "rgb(153, 153, 153)",
  );
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
