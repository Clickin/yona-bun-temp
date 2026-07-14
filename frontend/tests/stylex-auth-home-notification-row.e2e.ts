import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const LIST = '[data-stylex-owner="authenticated-home-notification-list"]';
const ROW = '[data-stylex-owner="authenticated-home-notification-row"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("authenticated Home notification row has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/theme.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const start = route.indexOf("const authenticatedHomeNotificationRowStyles");
  const end = route.indexOf("const siteFooterStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);

  for (const token of [
    "authenticatedHomeNotificationRowPadding",
    "authenticatedHomeNotificationRowBorder",
    "authenticatedHomeNotificationRowCursor",
    "authenticatedHomeNotificationRowHoverSurface",
    "authenticatedHomeNotificationTypeBaseText",
    "authenticatedHomeNotificationTypeClosedText",
    "authenticatedHomeNotificationTypeChangedText",
    "authenticatedHomeNotificationTypeRejectedText",
    "authenticatedHomeNotificationTypeWarningText",
    "authenticatedHomeNotificationTypeMergedText",
    "authenticatedHomeNotificationTypeCommentText",
    "authenticatedHomeNotificationTypeInfoText",
    "authenticatedHomeNotificationTypeListText",
    "authenticatedHomeNotificationTypeEllipsisText",
    "authenticatedHomeNotificationUpdatedSurface",
    "authenticatedHomeNotificationTitleText",
    "authenticatedHomeNotificationMessageTransition",
    "authenticatedHomeNotificationMessageMaxHeight",
    "authenticatedHomeNotificationMoreSurface",
    "authenticatedHomeNotificationMetaText",
    "authenticatedHomeNotificationAuthorText",
    "authenticatedHomeNotificationAuthorHoverText",
  ]) {
    expect(styles).toContain(`globalColors.${token}`);
    expect(theme).toContain(`${token}:`);
  }
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|\b-?\d+(?:\.\d+)?(?:px|%)\b/iu);
  expect(styles).not.toMatch(/:\s*"(?:relative|both|pointer|inline-block|hidden|nowrap|right)"/u);

  const itemStart = route.indexOf("function NotificationStreamItem");
  const itemEnd = route.indexOf("function LegacyNotificationMessage", itemStart);
  const item = route.slice(itemStart, itemEnd);
  expect(item).toContain('data-stylex-owner="authenticated-home-notification-row"');
  expect(item).toContain('notification.eventType === "ISSUE_BODY_CHANGED"');
  expect(item).toContain('notification.eventType === "COMMENT_UPDATED"');
  expect(item).not.toMatch(
    /className=(?:"|\{`)[^\n]*(?:notification-stream|stream-type|stream-desc|stream-info|title|message-wrap|nowrap|message|more|meta|author|ago|pull-right)/u,
  );
  expect(item).not.toMatch(
    /data-(?:target|toggle)=|document\.|classList|addEventListener|dangerouslySetInnerHTML/u,
  );
  expect(item).toContain("`avatar-wrap smaller ${stylex.props(");
  expect(item).toContain('const notificationTypeTokens = notification.typeIcon.split(" ")');
  expect(item).toContain("yobicon-${notificationGlyph}");
  expect(appCss).not.toContain(".notification-stream {");
  expect(less).toContain(".notification-stream {");

  const homeList = route.slice(
    route.lastIndexOf("<div", route.indexOf('data-stylex-owner="authenticated-home-content-grid"')),
    route.indexOf('data-stylex-owner="authenticated-home-index-rail"'),
  );
  expect(homeList).not.toMatch(
    /className=[^\n]*\b(?:content-container|main-stream|activity-streams)\b/u,
  );
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`authenticated Home notification row preserves ${viewport.label} geometry and paint`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const seededNotification = notification("NEW_COMMENT", "comment2");
    seededNotification.actor = {
      avatarUrl: `${BASE_PATH}/assets/images/default-avatar-128.png`,
      displayName: "Alice Kim",
      loginId: "alice",
    };
    seededNotification.createdLabel = "7일 전";
    seededNotification.message = [
      "Board seed confirmed from the fork contributor side.",
      "--- Original posting from @admin at 11:24 오전 ---",
      "This board post exists to seed the legacy board list and detail flows.",
    ].join("\n\n\n\n");
    seededNotification.targetHref = "/admin/sample/post/1#comment-1";
    seededNotification.targetTitle = "Re: [sample] Seed notes (1)";
    await installAuthenticatedHome(page, [seededNotification]);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const row = page.locator(ROW);
    await expect(row).toHaveCount(1);
    await expect(row).not.toHaveClass(/\bnotification-stream\b/u);
    await expect(
      row.locator('[data-stylex-owner="authenticated-home-notification-type"]'),
    ).toHaveCount(1);
    await expect(row.locator("i.yobicon-comment2")).toHaveCount(1);
    await expect(row.locator("a.avatar-wrap.smaller img")).toHaveCount(1);
    await expect(
      row.locator('[data-stylex-owner="authenticated-home-notification-author"]'),
    ).toHaveText("Alice Kim");

    const evidence = await row.evaluate((element) => {
      const one = (owner: string) =>
        element.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`) as HTMLElement;
      const box = (target: HTMLElement) => {
        const rect = target.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const type = one("authenticated-home-notification-type");
      const desc = one("authenticated-home-notification-desc");
      const title = one("authenticated-home-notification-title");
      const message = one("authenticated-home-notification-message-wrap");
      const meta = one("authenticated-home-notification-meta");
      const avatar = meta.querySelector<HTMLElement>(".avatar-wrap.smaller") as HTMLElement;
      const rowStyle = getComputedStyle(element);
      return {
        avatar: box(avatar),
        desc: box(desc),
        message: { box: box(message), maxHeight: getComputedStyle(message).maxHeight },
        meta: box(meta),
        row: {
          background: rowStyle.backgroundColor,
          borderBottom: rowStyle.borderBottom,
          box: box(element),
          cursor: rowStyle.cursor,
          padding: rowStyle.padding,
          position: rowStyle.position,
          pseudoAfter: getComputedStyle(element, "::after").content,
          pseudoBefore: getComputedStyle(element, "::before").content,
        },
        title: box(title),
        type: { box: box(type), color: getComputedStyle(type).color },
      };
    });
    // The live legacy shell is 881.1875/380px; the pre-slice local StyleX grid is
    // 887.78125/390px, so widths below pin that documented surrounding-shell drift.
    const expected =
      viewport.width === 1366
        ? {
            descHeight: 242,
            descWidth: 786,
            innerWidth: 772,
            messageHeight: 180,
            rowHeight: 253,
            rowWidth: 887.78125,
            rowX: 10,
            rowY: 174.078125,
            typeX: 35,
          }
        : {
            descHeight: 262,
            descWidth: 338,
            innerWidth: 324,
            messageHeight: 200,
            // Live is 304px; local's pre-slice Yobicon line box is 30px instead of 29px.
            rowHeight: 305,
            rowWidth: 390,
            rowX: 0,
            rowY: 181,
            typeX: 25,
          };
    expect(evidence.row).toMatchObject({
      background: "rgba(0, 0, 0, 0)",
      borderBottom: "1px solid rgb(221, 221, 221)",
      cursor: "pointer",
      padding: "5px 5px 5px 25px",
      position: "relative",
      pseudoAfter: "none",
      pseudoBefore: "none",
    });
    expect(evidence.row.box.height).toBe(expected.rowHeight);
    expect(evidence.row.box.width).toBeCloseTo(expected.rowWidth, 1);
    expect(evidence.row.box.x).toBeCloseTo(expected.rowX, 1);
    expect(evidence.row.box.y).toBeCloseTo(expected.rowY, 1);
    // Local pre-slice bridge renders this glyph line box at 30px (live legacy: 29px).
    expect(evidence.type.box).toMatchObject({ height: 30, width: 32 });
    expect(evidence.type.box.x).toBeCloseTo(expected.typeX, 1);
    expect(evidence.type.color).toBe("rgb(139, 0, 139)");
    expect(evidence.desc.height).toBe(expected.descHeight);
    expect(evidence.desc.width).toBeCloseTo(expected.descWidth, 1);
    expect(evidence.title.height).toBe(20);
    expect(evidence.title.width).toBeCloseTo(expected.innerWidth, 1);
    expect(evidence.message.box.height).toBe(expected.messageHeight);
    expect(evidence.message.box.width).toBeCloseTo(expected.innerWidth, 1);
    expect(evidence.message.maxHeight).toBe("200px");
    expect(evidence.meta.height).toBe(23);
    expect(evidence.meta.width).toBeCloseTo(expected.innerWidth, 1);
    expect(evidence.avatar).toMatchObject({ height: 20, width: 20 });

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await row.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `stylex-auth-home-notification-row-${viewport.label}.png`,
      ),
    });

    await row.hover();
    await expect(row).toHaveCSS("background-color", "rgb(245, 245, 245)");
    const author = row.locator('[data-stylex-owner="authenticated-home-notification-author"]');
    await expect(author).toHaveCSS("color", "rgb(102, 102, 102)");
    await author.hover();
    await expect(author).toHaveCSS("color", "rgb(243, 108, 34)");
  });
}

test("authenticated Home notification variants and React-owned expansion preserve legacy behavior", async ({
  page,
}) => {
  const variants = [
    notification("NEW_COMMIT", "push"),
    notification("ISSUE_STATE_CHANGED", "list-alt closed"),
    notification("ISSUE_ASSIGNEE_CHANGED", "friends changed"),
    notification("MEMBER_ENROLL_REQUEST", "addfriend rejected"),
    notification("PROJECT_STATE_CHANGED", "megaphone warning"),
    notification("PULL_REQUEST_STATE_CHANGED", "merge merged"),
    notification("NEW_COMMENT", "comment2"),
    notification("UNKNOWN", "info"),
    notification("NEW_ISSUE", "list-alt"),
    notification("UNKNOWN_CLOSED", "merge closed"),
    notification("UNKNOWN_ELLIPSIS", "ellipsis-horizontal"),
    notification("ISSUE_BODY_CHANGED", "ellipsis-horizontal"),
    notification("COMMENT_UPDATED", "ellipsis-horizontal"),
  ];
  variants[0]!.targetHref = "/admin/sample/issue/1";
  variants[0]!.targetTitle = "Linked title";
  variants[1]!.targetHref = "/admin/sample/issue/2";
  variants[1]!.targetTitle = "Long linked title";
  variants[1]!.message = Array.from({ length: 30 }, (_, index) => `line ${index}`).join("\n");
  await installAuthenticatedHome(page, variants);
  await page.goto(`${BASE_PATH}/notifications`);

  const rows = page.locator(ROW);
  await expect(rows).toHaveCount(13);
  await expect(
    rows.nth(0).locator('[data-stylex-owner="authenticated-home-notification-title"] a'),
  ).toHaveText("Linked title");
  await expect(
    rows.nth(1).locator('[data-stylex-owner="authenticated-home-notification-title"] a'),
  ).toHaveAttribute("href", `${BASE_PATH}/admin/sample/issue/2`);
  await expect(
    rows.nth(2).locator('[data-stylex-owner="authenticated-home-notification-title"] a'),
  ).toHaveCount(0);
  const expectedColors = [
    "rgb(76, 175, 80)",
    "rgb(121, 85, 72)",
    "rgb(101, 201, 223)",
    "rgb(253, 134, 88)",
    "rgb(252, 198, 102)",
    "rgb(101, 201, 223)",
    "rgb(139, 0, 139)",
    "rgb(153, 153, 153)",
    "rgb(121, 85, 72)",
    "rgb(253, 105, 86)",
    "rgb(128, 128, 128)",
  ];
  for (const [index, color] of expectedColors.entries()) {
    await expect(
      rows.nth(index).locator('[data-stylex-owner="authenticated-home-notification-type"]'),
    ).toHaveCSS("color", color);
  }
  for (const index of [11, 12]) {
    const type = rows
      .nth(index)
      .locator('[data-stylex-owner="authenticated-home-notification-type"]');
    await expect(type).toHaveText("Edit");
    await expect(type.locator("i")).toHaveCount(0);
    await expect(type).toHaveCSS("background-color", "rgb(255, 152, 0)");
  }

  const overflowRow = rows.nth(1);
  const wrap = overflowRow.locator(
    '[data-stylex-owner="authenticated-home-notification-message-wrap"]',
  );
  const more = overflowRow.locator('[data-stylex-owner="authenticated-home-notification-more"]');
  await expect(more).toBeVisible();
  await expect(wrap).toHaveCSS("max-height", "200px");
  await overflowRow
    .locator('[data-stylex-owner="authenticated-home-notification-title"] a')
    .evaluate((link) => {
      link.addEventListener("click", (event) => event.preventDefault(), { once: true });
      link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
  await expect(wrap).toHaveCSS("max-height", "200px");
  await overflowRow.locator('[data-stylex-owner="authenticated-home-notification-desc"]').click();
  await expect(more).toBeHidden();
  await expect(wrap).toHaveCSS("max-height", "none");
  await overflowRow.locator('[data-stylex-owner="authenticated-home-notification-desc"]').click();
  await expect(more).toBeVisible();

  await expect(page.locator(LIST)).not.toHaveClass(/\bactivity-streams\b/u);
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-content-grid"]'),
  ).not.toHaveClass(/\bcontent-container\b/u);
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-main-stream"]'),
  ).not.toHaveClass(/\bmain-stream\b/u);
});

test("authenticated Home notification pagination appends StyleX-owned rows", async ({ page }) => {
  const firstPage = Array.from({ length: 20 }, (_, index) =>
    notification("NEW_COMMENT", "comment2", String(index + 1)),
  );
  const nextPage = [notification("NEW_COMMENT", "comment2", "21")];
  await installAuthenticatedHome(page, firstPage, nextPage);
  await page.goto(`${BASE_PATH}/notifications`);

  await expect(page.locator(ROW)).toHaveCount(20);
  const more = page.locator("#notification-more");
  await expect(more).toBeVisible();
  const beforeUrl = page.url();
  await more.click();
  await expect(page.locator(ROW)).toHaveCount(21);
  await expect(page.locator(ROW, { hasText: "알림 제목 21" })).toHaveCount(1);
  await expect(more).toHaveCount(0);
  expect(page.url()).toBe(beforeUrl);
});

function notification(eventType: string, typeIcon: string, suffix = "") {
  return {
    actor: {
      avatarUrl: `${BASE_PATH}/assets/images/default-avatar-64.png`,
      displayName: "Site Admin",
      loginId: "admin",
    },
    createdAt: "2026-07-14T00:00:00Z",
    createdLabel: "방금 전",
    eventType,
    id: `${eventType}-${typeIcon}-${suffix}`.replaceAll(" ", "-"),
    message: "알림 본문",
    targetHref: "",
    targetTitle: suffix ? `알림 제목 ${suffix}` : "알림 제목",
    typeIcon,
  };
}

async function installAuthenticatedHome(
  page: Page,
  items: ReturnType<typeof notification>[],
  nextItems: ReturnType<typeof notification>[] = [],
) {
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
    const isNextPage =
      new URL(route.request().url()).searchParams.get("from") === String(items.length);
    const responseItems = isNextPage ? nextItems : items;
    return route.fulfill({
      contentType: "application/json",
      json: {
        hasMore: !isNextPage && nextItems.length > 0,
        items: responseItems,
        total: items.length + nextItems.length,
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
}
