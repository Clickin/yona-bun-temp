import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = "output/playwright/stylex-user-profile-guest-badge";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/guest/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Guest User",
          englishName: "Guest",
          isBlocked: false,
          isGuest: true,
          isSiteAdmin: false,
          loginId: "guest",
          primaryEmailAddress: null,
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated guest profile owns the legacy guest badge geometry", async ({ page }) => {
  const [source, styleSource, scala, pageLess, variables, yobiLess] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
  ]);

  expect(scala).toContain('<div class="whoami-wrap"');
  expect(scala).toContain('<div class="guest-user">');
  expect(scala).toContain('<span class="left-mark">OUR GUEST</span>');
  expect(pageLess).toContain(".guest-user {");
  expect(pageLess).toContain("background-color: rgba(255, 165, 0, 0.8);");
  expect(pageLess).toContain("width: 20px;");
  expect(pageLess).toContain("border-radius: 3px;");
  expect(pageLess).toContain(".left-mark {");
  expect(pageLess).toContain("writing-mode: vertical-rl;");
  expect(pageLess).toContain("text-orientation: upright;");
  expect(pageLess).toContain("font-size: 10px;");
  expect(pageLess).toContain("margin-left: 10px;");
  expect(pageLess).toContain("padding-top: 5px;");
  expect(variables).toContain("@orange");
  expect(yobiLess).toContain('@import "less/_variables.less"');
  expect(yobiLess).toContain('@import "less/_page.less"');
  expect(yobiLess).toContain('@import "less/_responsive.less"');
  expect(source).toContain('data-stylex-owner="user-profile-guest-badge"');
  expect(source).toContain('data-stylex-owner="user-profile-guest-badge-mark"');
  expect(source).toContain("{profile.isGuest ? (");
  expect(source).not.toContain(
    "className={`${stylex.props(styles.guestUser).className} guest-user`}",
  );
  expect(source).not.toContain(
    "className={`${stylex.props(styles.guestLeftMark).className} left-mark`}",
  );
  expect(styleSource).toContain('backgroundColor: "rgba(255, 165, 0, 0.8)"');
  expect(styleSource).toContain('WebkitWritingMode: "vertical-rl"');
  expect(styleSource).toContain('WebkitTextOrientation: "upright"');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/guest`, { waitUntil: "domcontentloaded" });

  const badge = page.locator('[data-stylex-owner="user-profile-guest-badge"]');
  const mark = page.locator('[data-stylex-owner="user-profile-guest-badge-mark"]');
  await expect(badge).toHaveCount(1);
  await expect(mark).toHaveCount(1);
  await expect(badge).toBeVisible();
  await expect(mark).toBeVisible();
  await expect(mark).toHaveText("OUR GUEST");
  await expect(badge).not.toHaveClass(/(^|\s)guest-user(\s|$)/);
  await expect(mark).not.toHaveClass(/(^|\s)left-mark(\s|$)/);
  expect(await badge.evaluate((node) => node.tagName)).toBe("DIV");
  expect(await mark.evaluate((node) => node.tagName)).toBe("SPAN");
  expect(await mark.evaluate((node) => node.parentElement?.dataset.stylexOwner)).toBe(
    "user-profile-guest-badge",
  );

  for (const node of [badge, mark]) {
    await expect(node).not.toHaveAttribute("style");
    await expect(node).not.toHaveAttribute("data-toggle");
    await expect(node).not.toHaveAttribute("data-target");
    await expect(node).not.toHaveAttribute("data-action");
    await expect(node).not.toHaveAttribute("data-request-url");
  }

  const desktop = await page.evaluate(() => {
    const info = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-info"]');
    const badge = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-guest-badge"]',
    );
    const mark = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-guest-badge-mark"]',
    );
    if (!info || !badge || !mark) throw new Error("guest badge owners are missing");
    const infoBox = info.getBoundingClientRect();
    const badgeBox = badge.getBoundingClientRect();
    const markBox = mark.getBoundingClientRect();
    const badgeStyle = getComputedStyle(badge);
    const markStyle = getComputedStyle(mark);
    return {
      badge: {
        backgroundColor: badgeStyle.backgroundColor,
        color: badgeStyle.color,
        textAlign: badgeStyle.textAlign,
        width: badgeStyle.width,
        borderRadius: badgeStyle.borderRadius,
      },
      mark: {
        width: markStyle.width,
        writingMode: markStyle.writingMode,
        textOrientation: markStyle.textOrientation,
        fontSize: markStyle.fontSize,
        marginLeft: markStyle.marginLeft,
        paddingTop: markStyle.paddingTop,
      },
      geometry: {
        badgeWidth: badgeBox.width,
        markHeight: markBox.height,
        contained: badgeBox.left >= infoBox.left && badgeBox.right <= infoBox.right + 1,
        markInsideBadge: markBox.left >= badgeBox.left && markBox.right <= badgeBox.right + 1,
      },
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop).toEqual({
    badge: {
      backgroundColor: "rgba(255, 165, 0, 0.8)",
      color: "rgb(255, 255, 255)",
      textAlign: "center",
      width: "20px",
      borderRadius: "3px",
    },
    mark: {
      width: "10px",
      writingMode: "vertical-rl",
      textOrientation: "upright",
      fontSize: "10px",
      marginLeft: "10px",
      paddingTop: "5px",
    },
    geometry: {
      badgeWidth: 20,
      markHeight: 113,
      contained: true,
      markInsideBadge: true,
    },
    scrollWidth: 1366,
  });
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: `${screenshotDirectory}/desktop-1366x900.png`,
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const info = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-info"]');
    const badge = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-guest-badge"]',
    );
    const mark = document.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-guest-badge-mark"]',
    );
    if (!info || !badge || !mark) throw new Error("mobile guest badge owners are missing");
    const infoBox = info.getBoundingClientRect();
    const badgeBox = badge.getBoundingClientRect();
    const markBox = mark.getBoundingClientRect();
    const badgeStyle = getComputedStyle(badge);
    const markStyle = getComputedStyle(mark);
    return {
      badge: {
        backgroundColor: badgeStyle.backgroundColor,
        color: badgeStyle.color,
        textAlign: badgeStyle.textAlign,
        width: badgeStyle.width,
        borderRadius: badgeStyle.borderRadius,
      },
      mark: {
        width: markStyle.width,
        writingMode: markStyle.writingMode,
        textOrientation: markStyle.textOrientation,
        fontSize: markStyle.fontSize,
        marginLeft: markStyle.marginLeft,
        paddingTop: markStyle.paddingTop,
      },
      geometry: {
        badgeWidth: badgeBox.width,
        markHeight: markBox.height,
        contained: badgeBox.left >= infoBox.left && badgeBox.right <= infoBox.right + 1,
        markInsideBadge: markBox.left >= badgeBox.left && markBox.right <= badgeBox.right + 1,
      },
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile.badge).toEqual(desktop.badge);
  expect(mobile.mark).toEqual(desktop.mark);
  expect(mobile.geometry).toEqual(desktop.geometry);
  expect(mobile.scrollWidth).toBe(mobile.viewportWidth);
  await page.screenshot({
    path: `${screenshotDirectory}/mobile-390x844.png`,
    fullPage: true,
  });
});
