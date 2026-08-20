import { readFile, mergedLegacyBlock } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const statusOwner = "user-profile-user-status";
const sinceOwner = "user-profile-user-since";
let statusState = { isBlocked: true, isSiteAdmin: true };

test.beforeEach(async ({ page }) => {
  statusState = { isBlocked: true, isSiteAdmin: true };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
      }),
    );
  }
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({ contentType: "application/json", json: profileResponse() }),
  );
  await page.route("**/api/v1/users/missing/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { error: { code: "not_found", message: "User exists not", status: 404 } },
      status: 404,
    }),
  );
});

test("status and since wrapper retirement records the exact Scala and frozen ownership", () => {
  const route = readFileSync("src/routes/$user.tsx", "utf8");
  const styles = readFileSync("src/app.css", "utf8");
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
  expect(route.match(new RegExp(`data-owner="${statusOwner}"`, "gu"))).toHaveLength(2);
  expect(route.match(new RegExp(`data-owner="${sinceOwner}"`, "gu"))).toHaveLength(2);
  // 667398a04 legacy-parity restore: the app retains the legacy wrapper classes.
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
    const identityRail = page.locator('[data-owner="user-profile-info"]');
    await expect(identityRail).toBeVisible();
    await expect(identityRail.locator('[data-owner="user-profile-provider-logo"]')).toBeVisible();
    mkdirSync(resolve("output/playwright/style-user-profile-status-since-wrappers"), {
      recursive: true,
    });
    const screenshot = await identityRail.screenshot({
      path: resolve(
        "output/playwright/style-user-profile-status-since-wrappers",
        `${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}

test("missing profile omits all status and since wrapper owners", async ({ page }) => {
  await page.goto(`${basePath}/missing`);
  await expect(page.locator('[data-owner="user-profile-notfound-error-wrap"]')).toBeVisible();
  await expect(page.locator(`[data-owner="${statusOwner}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-owner="${sinceOwner}"]`)).toHaveCount(0);
});

async function assertIdentityWrappers(
  page: Page,
  state: { isBlocked: boolean; isSiteAdmin: boolean },
) {
  const statuses = page.locator(`[data-owner="${statusOwner}"]`);
  const sinceWrappers = page.locator(`[data-owner="${sinceOwner}"]`);
  const adminBadge = page.locator('[data-owner="user-profile-site-admin-badge"]');
  const blockedBadge = page.locator('[data-owner="user-profile-blocked-badge"]');
  const since = page.locator('[data-owner="user-profile-since"]');
  const providerLogo = page.locator('[data-owner="user-profile-provider-logo"]');

  await expect(statuses).toHaveCount(2);
  await expect(sinceWrappers).toHaveCount(2);
  // 667398a04 legacy-parity restore: the app retains the legacy wrapper classes.
  await expect(page.locator(".user-status")).toHaveCount(2);
  await expect(page.locator(".user-since")).toHaveCount(2);
  await expect(adminBadge).toHaveCount(state.isSiteAdmin ? 1 : 0);
  await expect(blockedBadge).toHaveCount(state.isBlocked ? 1 : 0);
  // wtr-compat scopedChild resolution ignores the parent index (bucket-1
  // gap): nth(N).locator(":scope …") returns matches of ALL parents.
  // evaluate on the indexed element is the equivalent supported API.
  await expect(
    await statuses.nth(0).evaluate((node) => node.querySelectorAll(":scope > span").length),
  ).toBe(state.isSiteAdmin ? 1 : 0);
  await expect(
    await statuses.nth(1).evaluate((node) => node.querySelectorAll(":scope > span").length),
  ).toBe(state.isBlocked ? 1 : 0);
  await expect(
    await sinceWrappers
      .nth(0)
      .evaluate((node) => node.querySelector(":scope > strong")?.textContent ?? ""),
  ).toBe("Member since");
  // 667398a04 legacy-parity restore: the app retains the legacy since class.
  await expect(since).toHaveClass(/(?:^|\s)since(?:\s|$)/u);
  await expect(since).toHaveText("2026-06-30");
  await expect(
    await sinceWrappers
      .nth(1)
      .evaluate(
        (node) => node.querySelector(":scope > div:first-child > strong")?.textContent ?? "",
      ),
  ).toBe("Connected Social Login");
  // 667398a04 legacy-parity restore: the app retains the legacy auth-provider-logo class.
  await expect(providerLogo).toHaveClass(/(?:^|\s)auth-provider-logo(?:\s|$)/u);
  await expect(providerLogo.locator(":scope > *")).toHaveCount(2);
  await expect(providerLogo.locator(":scope > *").nth(0)).toHaveAttribute(
    "data-owner",
    "user-profile-provider-github",
  );
  await expect(providerLogo.locator(":scope > *").nth(1)).toHaveAttribute(
    "data-owner",
    "user-profile-provider-google",
  );

  const geometry = await page.evaluate(
    ({ sinceOwner, statusOwner }) => {
      const info = document.querySelector<HTMLElement>('[data-owner="user-profile-info"]');
      const statuses = [...document.querySelectorAll<HTMLElement>(`[data-owner="${statusOwner}"]`)];
      const sinceWrappers = [
        ...document.querySelectorAll<HTMLElement>(`[data-owner="${sinceOwner}"]`),
      ];
      const since = document.querySelector<HTMLElement>('[data-owner="user-profile-since"]');
      const provider = document.querySelector<HTMLElement>(
        '[data-owner="user-profile-provider-logo"]',
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
