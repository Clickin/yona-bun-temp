import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

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
        viewerCanEditProfile: true,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: ["github"],
          displayName: "Admin User",
          englishName: "Admin",
          isBlocked: true,
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated public profile owns static whoami and since declarations", async ({ page }) => {
  const [source, _styleSource, scala, pageLess, variables, commonLess, responsiveLess, yobiLess] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      curatedAppCss(),
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
        new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/assets/stylesheets/less/_responsive.less",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
        "utf8",
      ),
    ]);

  expect(scala).toContain('<div class="whoami usf-group">');
  expect(scala).toContain('<span class="since">@user.getDateString</span>');
  expect(pageLess).toContain(".whoami {");
  expect(pageLess).toContain("margin-top:15px;");
  expect(pageLess).toContain(".user-since {");
  expect(pageLess).toContain(".since {");
  expect(pageLess).toContain("display:block;");
  expect(pageLess).toContain("font-size: 14px;");
  expect(pageLess).toContain("font-weight:bold;");
  expect(pageLess).toContain("margin-left: 5px;");
  expect(variables).toContain("@primary");
  expect(variables).toContain("@orange : #F36C22;");
  expect(variables).toContain("@primary         : @orange;");
  expect(commonLess).toContain(".avatar-wrap");
  expect(responsiveLess).toContain("@media");
  expect(yobiLess).toContain('@import "less/_variables.less"');
  expect(yobiLess).toContain('@import "less/_common.less"');
  expect(yobiLess).toContain('@import "less/_page.less"');
  expect(yobiLess).toContain('@import "less/_responsive.less"');
  expect(source).toContain('data-owner="user-profile-whoami"');
  expect(source).toContain('data-owner="user-profile-since"');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin`, { waitUntil: "domcontentloaded" });

  const whoami = page.locator('[data-owner="user-profile-whoami"]');
  const since = page.locator('[data-owner="user-profile-since"]');
  await expect(whoami).toHaveCount(1);
  await expect(since).toHaveCount(1);
  await expect(whoami).toContainText("Admin");
  await expect(whoami).toContainText("@admin");
  await expect(whoami).toContainText("admin@example.com");
  await expect(since).toContainText("2026-06-30");
  await expect(page.locator('[data-owner="user-profile-provider-github"]')).toBeVisible();
  await expect(
    whoami.locator(
      ':scope > [data-owner="user-profile-identity-edit"] [data-owner="user-profile-edit-control"]',
    ),
  ).toBeVisible();

  for (const node of [whoami, since]) {
    await expect(node).not.toHaveAttribute("style");
    await expect(node).not.toHaveAttribute("data-toggle");
    await expect(node).not.toHaveAttribute("data-target");
    await expect(node).not.toHaveAttribute("data-action");
  }

  const desktop = await page.evaluate(() => {
    const info = document.querySelector<HTMLElement>('[data-owner="user-profile-info"]');
    const whoami = document.querySelector<HTMLElement>('[data-owner="user-profile-whoami"]');
    const since = document.querySelector<HTMLElement>('[data-owner="user-profile-since"]');
    if (!info || !whoami || !since) throw new Error("static sidebar owners are missing");
    const infoBox = info.getBoundingClientRect();
    const contained = (node: HTMLElement) => {
      const box = node.getBoundingClientRect();
      return box.left >= infoBox.left && box.right <= infoBox.right + 1;
    };
    const sinceStyle = getComputedStyle(since);
    return {
      whoamiMarginTop: getComputedStyle(whoami).marginTop,
      since: {
        display: sinceStyle.display,
        fontSize: sinceStyle.fontSize,
        fontWeight: sinceStyle.fontWeight,
        color: sinceStyle.color,
        marginLeft: sinceStyle.marginLeft,
      },
      contained: contained(whoami) && contained(since),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop).toEqual({
    whoamiMarginTop: "15px",
    since: {
      display: "block",
      fontSize: "14px",
      fontWeight: "700",
      color: "rgb(243, 108, 34)",
      marginLeft: "5px",
    },
    contained: true,
    scrollWidth: 1366,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const info = document.querySelector<HTMLElement>('[data-owner="user-profile-info"]');
    const nodes = [
      document.querySelector<HTMLElement>('[data-owner="user-profile-whoami"]'),
      document.querySelector<HTMLElement>('[data-owner="user-profile-since"]'),
    ];
    if (!info || nodes.some((node) => !node)) throw new Error("mobile sidebar owners are missing");
    const infoBox = info.getBoundingClientRect();
    return {
      contained: nodes.every((node) => {
        const box = node!.getBoundingClientRect();
        return box.left >= infoBox.left && box.right <= infoBox.right + 1;
      }),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile.contained).toBe(true);
  expect(mobile.scrollWidth).toBe(mobile.viewportWidth);
});
