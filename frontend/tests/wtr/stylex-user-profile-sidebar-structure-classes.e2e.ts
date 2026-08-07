import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = "output/playwright/stylex-user-profile-sidebar-structure-classes";

async function mockProfile(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/*/profile**", (route) => {
    const loginId = route
      .request()
      .url()
      .match(/\/users\/([^/]+)\/profile/u)?.[1];
    if (loginId === "missing") {
      return route.fulfill({
        contentType: "application/json",
        status: 404,
        json: { error: { code: "not_found", message: "User exists not", status: 404 } },
      });
    }
    return route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-256.png",
          connectedSocialProviders: [],
          displayName: loginId === "guest" ? "Guest User" : "Profile User",
          englishName: loginId === "guest" ? "Guest" : "Profile",
          isBlocked: false,
          isGuest: loginId === "guest",
          isSiteAdmin: false,
          loginId,
          primaryEmailAddress: null,
          sinceLabel: "2026-06-30",
        },
        pullRequestItems: [],
        selected: "issues",
        viewerCanEditProfile: false,
      },
    });
  });
}

test.beforeEach(async ({ page }) => mockProfile(page));

test("populated public profile sidebar structure is fully owned by StyleX", async ({ page }) => {
  const [routeSource, scala, pageLess, mixins, yobi, appCss, bootstrap, responsive] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_mixins.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../src/app.css", import.meta.url), "utf8"),
      readFile(
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  expect(scala).toContain(
    '<section class="user-box">\n            <div class="user-info-box">\n                <div class="whoami-wrap" style="background-image:url(\'@user.avatarUrl(256)\')">',
  );
  expect(pageLess).toMatch(
    /\.user-info-box\s*\{\s*float:\s*left;\s*width:200px;[\s\S]*?\.whoami-wrap\s*\{\s*position:relative;\s*overflow:hidden;\s*width:200px;\s*height:200px;\s*background-color:#ccc;\s*background-position:center;\s*\.background-size\(cover\);\s*\.border-radius\(4px\);/u,
  );
  expect(mixins).toMatch(/\.border-radius\(@radius: 5px\)\{[\s\S]*?border-radius: @radius;/u);
  expect(mixins).toMatch(/\.background-size\(@param:cover\)\{[\s\S]*?background-size: @param;/u);
  expect(yobi.indexOf('@import "less/_mixins.less"')).toBeLessThan(
    yobi.indexOf('@import "less/_page.less"'),
  );
  expect(yobi).toContain('@import "less/_responsive.less"');
  for (const nonmatchingSource of [appCss, bootstrap, responsive]) {
    expect(nonmatchingSource).not.toMatch(/\.user-info-box|\.whoami-wrap/u);
  }
  expect(routeSource).toContain('data-stylex-owner="user-profile-info"');
  expect(routeSource).toContain('data-stylex-owner="user-profile-avatar-background"');
  expect(routeSource).toContain('backgroundSize: "cover"');
  expect(routeSource).not.toMatch(/className=\{[^}\n]*(?:user-info-box|whoami-wrap)/u);

  for (const viewport of [
    { name: "desktop-1366x900", width: 1366, height: 900 },
    { name: "mobile-390x844", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/profile`, { waitUntil: "domcontentloaded" });

    const box = page.locator('[data-stylex-owner="user-profile-box"]');
    const info = page.locator('[data-stylex-owner="user-profile-info"]');
    const avatar = page.locator('[data-stylex-owner="user-profile-avatar-background"]');
    await expect(box).toHaveCount(1);
    await expect(info).toHaveCount(1);
    await expect(avatar).toHaveCount(1);
    // Wave-33: the app retains user-info-box/whoami-wrap (667398a04
    // legacy-parity restore) — assert retention, not retirement.
    await expect(info).toHaveClass(/(?:^|\s)user-info-box(?:\s|$)/u);
    await expect(avatar).toHaveClass(/(?:^|\s)whoami-wrap(?:\s|$)/u);
    expect(await box.evaluate((node) => node.tagName)).toBe("SECTION");
    expect(await info.evaluate((node) => node.tagName)).toBe("DIV");
    expect(await avatar.evaluate((node) => node.tagName)).toBe("DIV");
    expect(await info.evaluate((node) => node.parentElement?.dataset.stylexOwner)).toBe(
      "user-profile-box",
    );
    expect(await avatar.evaluate((node) => node.parentElement?.dataset.stylexOwner)).toBe(
      "user-profile-info",
    );
    await expect(avatar).toHaveCSS("background-image", /default-avatar-256\.png/u);
    await expect(page.locator('[data-stylex-owner="user-profile-guest-badge"]')).toHaveCount(0);

    const metrics = await page.evaluate(() => {
      const box = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-box"]');
      const info = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-info"]');
      const avatar = document.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-avatar-background"]',
      );
      const stream = document.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-stream"]',
      );
      if (!box || !info || !avatar || !stream) throw new Error("profile owners missing");
      const boxRect = box.getBoundingClientRect();
      const infoRect = info.getBoundingClientRect();
      const avatarRect = avatar.getBoundingClientRect();
      const streamRect = stream.getBoundingClientRect();
      const infoStyle = getComputedStyle(info);
      const avatarStyle = getComputedStyle(avatar);
      return {
        info: {
          float: infoStyle.float,
          width: infoStyle.width,
        },
        avatar: {
          backgroundColor: avatarStyle.backgroundColor,
          backgroundPosition: avatarStyle.backgroundPosition,
          backgroundSize: avatarStyle.backgroundSize,
          borderRadius: avatarStyle.borderRadius,
          height: avatarStyle.height,
          overflow: avatarStyle.overflow,
          position: avatarStyle.position,
          width: avatarStyle.width,
        },
        geometry: {
          avatarInsideInfo:
            avatarRect.left >= infoRect.left &&
            avatarRect.right <= infoRect.right + 1 &&
            avatarRect.top >= infoRect.top,
          avatarSize: [avatarRect.width, avatarRect.height],
          infoInsideBox:
            infoRect.left >= boxRect.left &&
            infoRect.right <= boxRect.right + 1 &&
            infoRect.top >= boxRect.top,
          infoWidth: infoRect.width,
          noStreamOverlap: streamRect.left >= infoRect.right || streamRect.top >= infoRect.bottom,
          streamAfterInfo:
            (stream.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
        },
        overflow: {
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        },
      };
    });
    expect(metrics.info).toEqual({ float: "left", width: "200px" });
    expect(metrics.avatar).toEqual({
      backgroundColor: "rgb(204, 204, 204)",
      backgroundPosition: "50% 50%",
      backgroundSize: "cover",
      borderRadius: "4px",
      height: "200px",
      overflow: "hidden",
      position: "relative",
      width: "200px",
    });
    expect(metrics.geometry).toEqual({
      avatarInsideInfo: true,
      avatarSize: [200, 200],
      infoInsideBox: true,
      infoWidth: 200,
      noStreamOverlap: true,
      streamAfterInfo: true,
    });
    expect(metrics.overflow.scrollWidth).toBe(metrics.overflow.viewportWidth);

    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: `${screenshotDirectory}/${viewport.name}.png`,
    });
  }

  await page.goto(`${basePath}/guest`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-stylex-owner="user-profile-guest-badge"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="user-profile-guest-badge-mark"]')).toHaveText(
    "OUR GUEST",
  );

  await page.goto(`${basePath}/missing`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-stylex-owner="user-profile-info"]')).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="user-profile-avatar-background"]')).toHaveCount(0);
});
