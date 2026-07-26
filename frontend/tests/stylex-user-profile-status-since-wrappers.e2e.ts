import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const statusOwner = "user-profile-user-status";
const sinceOwner = "user-profile-user-since";
let statusState = { isBlocked: true, isSiteAdmin: true };

test.beforeEach(async ({ page }) => {
  statusState = { isBlocked: true, isSiteAdmin: true };
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({ contentType: "application/json", json: profileResponse() }),
  );
  await page.route("**/api/v1/users/missing/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { message: "not found" },
      status: 404,
    }),
  );
});

test("status and since wrapper retirement records the exact Scala and frozen ownership", () => {
  const route = readFileSync("src/routes/$user.tsx", "utf8");
  const styles = readFileSync("src/routes/-user-profile.stylex.ts", "utf8");
  const view = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(view).toContain(
    '<div class="user-status">@if(user.isSiteManager){<span class="badge label-success">SITE ADMIN</span>}</div>',
  );
  expect(view).toContain(
    '<div class="user-status">@if(user.isLocked){<span class="badge label-important">BLOCKED</span>}</div>',
  );
  expect(view).toContain(
    '<div class="user-since">\n                    <strong>@Messages("userinfo.since")</strong>',
  );
  expect(view).toContain(
    '<div class="user-since">\n                    <div>\n                        <strong>@Messages("user.connected.social.login")</strong>',
  );
  expect(pageLess).toContain(
    ".user-status {\n        margin-top:20px;\n\n        p {\n            display:inline-block;",
  );
  expect(pageLess).toContain(
    ".user-since {\n        margin-top: 10px;\n        padding:0 10px;\n\n        .since {",
  );
  expect(yobi).toContain('@import "less/_page.less";');
  expect(styles).toContain('userStatus: { marginTop: "20px" }');
  expect(styles).toContain('userSince: { marginTop: "10px", padding: "0px 10px" }');
  expect(styles).toContain("since: {");
  expect(route.match(new RegExp(`data-stylex-owner="${statusOwner}"`, "gu"))).toHaveLength(2);
  expect(route.match(new RegExp(`data-stylex-owner="${sinceOwner}"`, "gu"))).toHaveLength(2);
  expect(route).not.toContain(
    "className={`${stylex.props(styles.userStatus).className} user-status`}",
  );
  expect(route).not.toContain(
    "className={`${stylex.props(styles.userSince).className} user-since`}",
  );
  expect(route).not.toContain("} badge label-success`}");
  expect(route).not.toContain("} badge label-important`}");
  expect(route).not.toContain("} since`}");
  expect(route).not.toContain("} auth-provider-logo`}");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`four identity wrappers preserve ${viewport.name} output and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const state of [
      { isBlocked: true, isSiteAdmin: true },
      { isBlocked: false, isSiteAdmin: true },
      { isBlocked: true, isSiteAdmin: false },
      { isBlocked: false, isSiteAdmin: false },
    ]) {
      statusState = state;
      await page.goto(
        `${basePath}/admin?state=${Number(state.isSiteAdmin)}${Number(state.isBlocked)}`,
      );
      await assertIdentityWrappers(page, state);
    }

    statusState = { isBlocked: true, isSiteAdmin: true };
    await page.goto(`${basePath}/admin?screenshot=${viewport.name}`);
    const identityRail = page.locator('[data-stylex-owner="user-profile-info"]');
    await expect(identityRail).toBeVisible();
    await expect(
      identityRail.locator('[data-stylex-owner="user-profile-provider-logo"]'),
    ).toBeVisible();
    mkdirSync(resolve("output/playwright/stylex-user-profile-status-since-wrappers"), {
      recursive: true,
    });
    const screenshot = await identityRail.screenshot({
      path: resolve(
        "output/playwright/stylex-user-profile-status-since-wrappers",
        `${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}

test("missing profile omits all status and since wrapper owners", async ({ page }) => {
  await page.goto(`${basePath}/missing`);
  await expect(
    page.locator('[data-stylex-owner="user-profile-notfound-error-wrap"]'),
  ).toBeVisible();
  await expect(page.locator(`[data-stylex-owner="${statusOwner}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-stylex-owner="${sinceOwner}"]`)).toHaveCount(0);
});

async function assertIdentityWrappers(
  page: Page,
  state: { isBlocked: boolean; isSiteAdmin: boolean },
) {
  const statuses = page.locator(`[data-stylex-owner="${statusOwner}"]`);
  const sinceWrappers = page.locator(`[data-stylex-owner="${sinceOwner}"]`);
  const adminBadge = page.locator('[data-stylex-owner="user-profile-site-admin-badge"]');
  const blockedBadge = page.locator('[data-stylex-owner="user-profile-blocked-badge"]');
  const since = page.locator('[data-stylex-owner="user-profile-since"]');
  const providerLogo = page.locator('[data-stylex-owner="user-profile-provider-logo"]');

  await expect(statuses).toHaveCount(2);
  await expect(sinceWrappers).toHaveCount(2);
  await expect(page.locator(".user-status")).toHaveCount(0);
  await expect(page.locator(".user-since")).toHaveCount(0);
  await expect(adminBadge).toHaveCount(state.isSiteAdmin ? 1 : 0);
  await expect(blockedBadge).toHaveCount(state.isBlocked ? 1 : 0);
  await expect(statuses.nth(0).locator(":scope > span")).toHaveCount(state.isSiteAdmin ? 1 : 0);
  await expect(statuses.nth(1).locator(":scope > span")).toHaveCount(state.isBlocked ? 1 : 0);
  await expect(sinceWrappers.nth(0).locator(":scope > strong")).toHaveText("Member since");
  await expect(since).not.toHaveClass(/(?:^|\s)since(?:\s|$)/u);
  await expect(since).toHaveText("2026-06-30");
  await expect(sinceWrappers.nth(1).locator(":scope > div:first-child > strong")).toHaveText(
    "Connected Social Login",
  );
  await expect(providerLogo).not.toHaveClass(/(?:^|\s)auth-provider-logo(?:\s|$)/u);
  await expect(providerLogo.locator(":scope > *")).toHaveCount(2);
  await expect(providerLogo.locator(":scope > *").nth(0)).toHaveAttribute(
    "data-stylex-owner",
    "user-profile-provider-github",
  );
  await expect(providerLogo.locator(":scope > *").nth(1)).toHaveAttribute(
    "data-stylex-owner",
    "user-profile-provider-google",
  );

  const geometry = await page.evaluate(
    ({ sinceOwner, statusOwner }) => {
      const info = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-info"]');
      const statuses = [
        ...document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${statusOwner}"]`),
      ];
      const sinceWrappers = [
        ...document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${sinceOwner}"]`),
      ];
      const since = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-since"]');
      const provider = document.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-provider-logo"]',
      );
      if (!info || statuses.length !== 2 || sinceWrappers.length !== 2 || !since || !provider) {
        throw new Error("identity wrapper contract is missing");
      }
      const infoBox = info.getBoundingClientRect();
      const wrappers = [...statuses, ...sinceWrappers];
      const boxes = wrappers.map((node) => node.getBoundingClientRect());
      const statusStyles = statuses.map((node) => getComputedStyle(node));
      const sinceStyles = sinceWrappers.map((node) => getComputedStyle(node));
      const sinceStyle = getComputedStyle(since);
      const providerStyle = getComputedStyle(provider);
      return {
        contained: boxes.every((box) => box.left >= infoBox.left && box.right <= infoBox.right + 1),
        noOverlap: boxes.every(
          (box, index) => index === 0 || boxes[index - 1]!.bottom <= box.top + 1,
        ),
        order: wrappers.every(
          (node, index) =>
            index === wrappers.length - 1 ||
            Boolean(
              node.compareDocumentPosition(wrappers[index + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
            ),
        ),
        overflow: document.documentElement.scrollWidth - innerWidth,
        providerFontFamily: providerStyle.fontFamily,
        sincePaint: {
          color: sinceStyle.color,
          display: sinceStyle.display,
          fontSize: sinceStyle.fontSize,
          fontWeight: sinceStyle.fontWeight,
          marginLeft: sinceStyle.marginLeft,
        },
        sinceStyles: sinceStyles.map((style) => ({
          marginTop: style.marginTop,
          padding: style.padding,
        })),
        statusMargins: statusStyles.map((style) => style.marginTop),
      };
    },
    { sinceOwner, statusOwner },
  );

  expect(geometry.statusMargins).toEqual(["20px", "20px"]);
  expect(geometry.sinceStyles).toEqual([
    { marginTop: "10px", padding: "0px 10px" },
    { marginTop: "10px", padding: "0px 10px" },
  ]);
  expect(geometry.sincePaint).toEqual({
    color: "rgb(243, 108, 34)",
    display: "block",
    fontSize: "14px",
    fontWeight: "700",
    marginLeft: "5px",
  });
  expect(geometry.providerFontFamily).toContain("Roboto");
  expect(geometry.contained).toBe(true);
  expect(geometry.order).toBe(true);
  expect(geometry.noOverlap).toBe(true);
  expect(geometry.overflow).toBeLessThanOrEqual(0);
}

function profileResponse() {
  return {
    daysAgo: 14,
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "",
      connectedSocialProviders: ["github", "google"],
      displayName: "Admin User",
      englishName: "Admin",
      isBlocked: statusState.isBlocked,
      isGuest: false,
      isSiteAdmin: statusState.isSiteAdmin,
      loginId: "admin",
      primaryEmailAddress: "",
      sinceLabel: "2026-06-30",
    },
    pullRequestItems: [],
    selected: "issues",
    viewerCanEditProfile: false,
  };
}
