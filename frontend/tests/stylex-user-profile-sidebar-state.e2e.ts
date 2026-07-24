import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: ["github"],
          displayName: "Admin User",
          englishName: "Admin",
          isBlocked: true,
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
          primaryEmailAddress: "",
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated public profile owns static user sidebar spacing", async ({ page }) => {
  const [
    source,
    styleSource,
    scala,
    pageLess,
    commonLess,
    responsiveLess,
    yobiLess,
    bootstrap,
    bootstrapResponsive,
  ] = await Promise.all([
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
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
  ]);

  expect(scala).toContain('<div class="user-status">@if(user.isSiteManager)');
  expect(scala).toContain('<div class="user-status">@if(user.isLocked)');
  expect(scala).toContain('<div class="user-since">');
  expect(scala).toContain('Messages("userinfo.since")');
  expect(scala).toContain('Messages("user.connected.social.login")');
  expect(pageLess).toContain(".user-status {");
  expect(pageLess).toContain("margin-top:20px;");
  expect(pageLess).toContain(".user-since {");
  expect(pageLess).toContain("margin-top: 10px;");
  expect(pageLess).toContain("padding:0 10px;");
  expect(commonLess).toContain(".avatar-wrap");
  expect(responsiveLess).toContain("@media");
  expect(yobiLess).toContain('@import "less/_common.less"');
  expect(yobiLess).toContain('@import "less/_page.less"');
  expect(yobiLess).toContain('@import "less/_responsive.less"');
  expect(bootstrap).toContain(".badge");
  expect(bootstrapResponsive).toContain("@media");
  expect(source).toContain('data-stylex-owner="user-profile-user-status"');
  expect(source).toContain('data-stylex-owner="user-profile-user-since"');
  expect(styleSource).toContain('userStatus: { marginTop: "20px" }');
  expect(styleSource).toContain('userSince: { marginTop: "10px", padding: "0px 10px" }');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin`, { waitUntil: "domcontentloaded" });

  const statuses = page.locator('[data-stylex-owner="user-profile-user-status"]');
  const since = page.locator('[data-stylex-owner="user-profile-user-since"]');
  await expect(statuses).toHaveCount(2);
  await expect(since).toHaveCount(2);
  await expect(statuses.nth(0)).toContainText("SITE ADMIN");
  await expect(statuses.nth(1)).toContainText("BLOCKED");
  await expect(since.nth(0)).toContainText("2026-06-30");
  await expect(since.nth(1)).toContainText("Connected");
  await expect(page.locator('[data-stylex-owner="user-profile-provider-github"]')).toBeVisible();

  for (const node of [statuses.nth(0), statuses.nth(1), since.nth(0), since.nth(1)]) {
    await expect(node).not.toHaveAttribute("style");
    await expect(node).not.toHaveAttribute("data-toggle");
    await expect(node).not.toHaveAttribute("data-target");
  }

  const desktop = await page.evaluate(() => {
    const info = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-info"]');
    const status = [
      ...document.querySelectorAll<HTMLElement>('[data-stylex-owner="user-profile-user-status"]'),
    ];
    const since = [
      ...document.querySelectorAll<HTMLElement>('[data-stylex-owner="user-profile-user-since"]'),
    ];
    if (!info || status.length !== 2 || since.length !== 2)
      throw new Error("sidebar state is missing");
    const infoBox = info.getBoundingClientRect();
    const metrics = (node: HTMLElement) => {
      const box = node.getBoundingClientRect();
      const computed = getComputedStyle(node);
      return {
        marginTop: computed.marginTop,
        padding: computed.padding,
        inside: box.left >= infoBox.left && box.right <= infoBox.right + 1,
      };
    };
    return {
      status: status.map(metrics),
      since: since.map(metrics),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop.status).toEqual([
    { marginTop: "20px", padding: "0px", inside: true },
    { marginTop: "20px", padding: "0px", inside: true },
  ]);
  expect(desktop.since).toEqual([
    { marginTop: "10px", padding: "0px 10px", inside: true },
    { marginTop: "10px", padding: "0px 10px", inside: true },
  ]);
  expect(desktop.scrollWidth).toBe(1366);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const info = document.querySelector<HTMLElement>('[data-stylex-owner="user-profile-info"]');
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-stylex-owner="user-profile-user-status"], [data-stylex-owner="user-profile-user-since"]',
      ),
    ];
    if (!info) throw new Error("profile info is missing");
    const infoBox = info.getBoundingClientRect();
    return {
      contained: nodes.every((node) => {
        const box = node.getBoundingClientRect();
        return box.left >= infoBox.left && box.right <= infoBox.right + 1;
      }),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile.contained).toBe(true);
  expect(mobile.scrollWidth).toBe(mobile.viewportWidth);
});
