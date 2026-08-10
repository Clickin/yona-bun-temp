import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ apiBaseUrl, mountedBasePath }) => {
      (
        window as Window & {
          __YONA_RUNTIME_CONFIG__?: {
            apiBaseUrl: string;
            basePath: string;
            showUserEmail: boolean;
          };
        }
      ).__YONA_RUNTIME_CONFIG__ = {
        apiBaseUrl,
        basePath: mountedBasePath,
        showUserEmail: true,
      };
    },
    { apiBaseUrl: `${basePath}/api`, mountedBasePath: basePath },
  );
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
    const emailVisible = loginId === "paint";
    return route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: ["github"],
          displayName: "Paint User",
          englishName: "Paint",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: loginId ?? "paint",
          primaryEmailAddress: emailVisible ? "paint@example.com" : null,
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    });
  });
});

test("authenticated public-profile sidebar identity follows the final frozen paint cascade", async ({
  page,
}) => {
  const [
    routeSource,
    styleSource,
    scala,
    yobiLess,
    pageLess,
    yobiUiLess,
    commonLess,
    overrideLess,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../src/app.css", import.meta.url), "utf8") +
      readFileSync(
        new URL(
          "../frontend/public/legacy-assets/stylesheets/legacy-fallback.css",
          import.meta.url,
        ),
        "utf8",
      ),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_override.less", import.meta.url),
      "utf8",
    ),
  ]);

  expect(scala).toContain('<div class="whoami usf-group">');
  expect(scala).toContain('<span class="name">@user.englishName</span>');
  expect(scala).toContain('<span class="loginid">@{"@"}@user.loginId</span>');
  expect(scala).toContain("@if(Application.SHOW_USER_EMAIL)");
  expect(scala).toContain('<span class="email">@user.email</span>');
  expect(yobiLess.indexOf('@import "less/_page.less"')).toBeLessThan(
    yobiLess.indexOf('@import "less/_yobiUI.less"'),
  );
  expect(yobiLess.indexOf('@import "less/_yobiUI.less"')).toBeLessThan(
    yobiLess.indexOf('@import "less/_override.less"'),
  );

  const userInfoBlock = pageLess.slice(
    pageLess.indexOf(".user-info-box {"),
    pageLess.indexOf("\n.user-stream-box {"),
  );
  const userInfoDeclarations = userInfoBlock.slice(0, userInfoBlock.indexOf(".whoami-wrap {"));
  expect(userInfoDeclarations).toContain("float: left;");
  expect(userInfoDeclarations).toContain("width:200px;");
  expect(userInfoDeclarations).not.toContain("color:");
  expect(userInfoBlock).toContain("font-size:18px;");
  expect(userInfoBlock).toContain("font-weight:bold;");
  expect(yobiUiLess).toContain(".usf-group {");
  expect(yobiUiLess).toContain(".loginid     { color:#999; }");
  expect(commonLess).toContain("a {");
  expect(overrideLess).toContain(".select2-highlighted");
  expect(overrideLess).toContain(".loginid { color:#fff; }");

  const infoStyle = styleSource.slice(
    styleSource.indexOf("info: {"),
    styleSource.indexOf("\n  // Frozen less/_page.less .user-info-box .whoami."),
  );
  expect(infoStyle).not.toContain("color:");

  for (const identityOwner of [
    "user-profile-identity-name",
    "user-profile-identity-loginid",
    "user-profile-identity-email",
  ]) {
    expect(routeSource).toContain(`data-owner="${identityOwner}"`);
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/paint`, { waitUntil: "domcontentloaded" });

  const info = page.locator('[data-owner="user-profile-info"]');
  const whoami = page.locator('[data-owner="user-profile-whoami"]');
  const name = page.locator('[data-owner="user-profile-identity-name"]');
  const loginId = page.locator('[data-owner="user-profile-identity-loginid"]');
  const email = page.locator('[data-owner="user-profile-identity-email"]');
  // Wave-33: the legacy identity classes are retained in the current DOM
  // (667398a04 legacy-parity restore) — assert retention, not retirement.
  await expect(info).toHaveClass(/(?:^|\s)user-info-box(?:\s|$)/u);
  await expect(whoami).toHaveClass(/(?:^|\s)whoami(?:\s|$)/u);
  await expect(whoami).toHaveClass(/(?:^|\s)usf-group(?:\s|$)/u);
  await expect(name).toHaveClass(/(?:^|\s)name(?:\s|$)/u);
  await expect(loginId).toHaveClass(/(?:^|\s)loginid(?:\s|$)/u);
  await expect(email).toHaveClass(/(?:^|\s)email(?:\s|$)/u);
  await expect(whoami.locator(":scope > span")).toHaveCount(3);
  await expect(whoami.locator(":scope > span").nth(0)).toHaveText("Paint");
  await expect(whoami.locator(":scope > span").nth(1)).toHaveText("@paint");
  await expect(whoami.locator(":scope > span").nth(2)).toHaveText("paint@example.com");

  for (const node of [info, whoami, name, loginId, email]) {
    await expect(node).not.toHaveAttribute("style");
    await expect(node).not.toHaveAttribute("data-toggle");
    await expect(node).not.toHaveAttribute("data-target");
    await expect(node).not.toHaveAttribute("data-action");
    await expect(node).not.toHaveAttribute("data-request-url");
  }

  await assertIdentityPaintAndGeometry(page, 1366);
  await expect(page.locator('[data-owner="user-profile-since"]')).toHaveCSS(
    "color",
    "rgb(243, 108, 34)",
  );
  await expect(page.locator('[data-owner="user-profile-provider-github"]')).toBeVisible();
  await expect(page.locator('[data-owner="user-profile-tabs"]')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await assertIdentityPaintAndGeometry(page, 390);

  await page.goto(`${basePath}/hidden-email`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-owner="user-profile-identity-email"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="user-profile-identity-name"]')).toHaveText("Paint");
  await expect(page.locator('[data-owner="user-profile-identity-loginid"]')).toHaveText(
    "@hidden-email",
  );
});

async function assertIdentityPaintAndGeometry(page: Page, viewportWidth: number) {
  const result = await page.evaluate(() => {
    const required = (selector: string) => {
      const node = document.querySelector<HTMLElement>(selector);
      if (!node) throw new Error(`missing ${selector}`);
      return node;
    };
    const info = required('[data-owner="user-profile-info"]');
    const whoami = required('[data-owner="user-profile-whoami"]');
    const name = required('[data-owner="user-profile-identity-name"]');
    const loginId = required('[data-owner="user-profile-identity-loginid"]');
    const email = required('[data-owner="user-profile-identity-email"]');
    const avatar = required('[data-owner="user-profile-avatar-background"]');
    const since = required('[data-owner="user-profile-user-since"]');
    const infoBox = info.getBoundingClientRect();
    const whoamiBox = whoami.getBoundingClientRect();
    const avatarBox = avatar.getBoundingClientRect();
    const sinceBox = since.getBoundingClientRect();
    const insideInfo = (node: HTMLElement) => {
      const box = node.getBoundingClientRect();
      return box.left >= infoBox.left && box.right <= infoBox.right + 1;
    };
    return {
      paint: {
        info: getComputedStyle(info).color,
        name: {
          color: getComputedStyle(name).color,
          fontSize: getComputedStyle(name).fontSize,
          fontWeight: getComputedStyle(name).fontWeight,
        },
        loginId: getComputedStyle(loginId).color,
        email: getComputedStyle(email).color,
      },
      geometry: {
        contained: {
          whoami: insideInfo(whoami),
          name: insideInfo(name),
          loginId: insideInfo(loginId),
          email: insideInfo(email),
        },
        avatarBeforeIdentity: avatarBox.bottom <= whoamiBox.top,
        identityBeforeSince: whoamiBox.bottom <= sinceBox.top,
        noHorizontalOverflow: document.documentElement.scrollWidth === window.innerWidth,
      },
      scrollWidth: document.documentElement.scrollWidth,
    };
  });

  expect(result.paint).toEqual({
    info: "rgb(51, 51, 51)",
    name: {
      color: "rgb(51, 51, 51)",
      fontSize: "18px",
      fontWeight: "700",
    },
    loginId: "rgb(153, 153, 153)",
    email: "rgb(51, 51, 51)",
  });
  expect(result.geometry).toEqual({
    contained: {
      whoami: true,
      name: true,
      loginId: true,
      email: true,
    },
    avatarBeforeIdentity: true,
    identityBeforeSince: true,
    noHorizontalOverflow: true,
  });
  expect(result.scrollWidth).toBe(viewportWidth);
}
