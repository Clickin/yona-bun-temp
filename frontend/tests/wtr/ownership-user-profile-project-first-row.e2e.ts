import { readFile, readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

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
          loginId: "admin",
          displayName: "Admin",
          englishName: "Admin",
          avatarUrl: "",
          primaryEmailAddress: "",
          sinceLabel: "2026-01-01",
          isGuest: false,
          isBlocked: false,
          isSiteAdmin: false,
          connectedSocialProviders: [],
        },
        issueItems: [],
        memberProjects: [
          {
            projectId: 7,
            ownerName: "other",
            projectName: "sample",
            projectScope: "public",
            logoUrl: "",
            overview: "A sample project",
            memberCount: 3,
            createdAt: "2020-01-02T12:00:00Z",
            lastPushedAt: "",
            viewerCanWatch: true,
            isWatching: false,
            watchCount: 2,
            viewerCanLeave: true,
            notifications: [],
          },
          {
            projectId: 8,
            ownerName: "other",
            projectName: "second",
            projectScope: "public",
            logoUrl: "",
            overview: "Another sample project",
            memberCount: 4,
            createdAt: "2020-01-01T12:00:00Z",
            lastPushedAt: "",
            viewerCanWatch: true,
            isWatching: true,
            watchCount: 4,
            viewerCanLeave: true,
            notifications: [],
          },
        ],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated profile first Projects row owns the legacy top padding", async ({ page }) => {
  const route = await readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  const styleSource = await curatedAppCss();
  const view = await readFile(
    new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
    "utf8",
  );
  const partial = await readFile(
    new URL("../../yona-original/app/views/user/partial_projectlist.scala.html", import.meta.url),
    "utf8",
  );
  const pageLess = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const commonLess = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
    "utf8",
  );
  const responsiveLess = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
    "utf8",
  );
  const yobi = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
    "utf8",
  );
  const bootstrap = await readFile(
    new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
    "utf8",
  );
  const bootstrapResponsive = await readFile(
    new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
    "utf8",
  );

  expect(view).toContain('<ul class="user-streams all-projects">');
  expect(partial).toContain('<li class="project">');
  const userStreamsRule = pageLess.indexOf("&.user-streams");
  expect(userStreamsRule).toBeGreaterThanOrEqual(0);
  const firstProjectRule = pageLess.indexOf("&:first-of-type", userStreamsRule);
  expect(firstProjectRule).toBeGreaterThan(userStreamsRule);
  expect(pageLess.slice(firstProjectRule, firstProjectRule + 100)).toContain("padding-top:5px;");
  expect(commonLess).toContain(".avatar-wrap");
  expect(responsiveLess).toContain("@media");
  expect(yobi).toContain('@import "less/_common.less";');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(bootstrap).toContain("ul,");
  expect(bootstrapResponsive).toContain("@media");

  expect(route).toContain("index === 0");

  expect(route).toContain('data-owner="user-profile-project-row"');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/yona/admin");
  await page.getByRole("button", { name: /Projects/i }).click();

  const list = page.locator('[data-owner="user-profile-projects-list"]');
  const rows = list.locator(':scope > li[data-owner="user-profile-project-row"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("sample");
  await expect(rows.nth(1)).toContainText("second");
  for (const row of [rows.nth(0), rows.nth(1)]) {
    await expect(row).not.toHaveAttribute("style");
    await expect(row).not.toHaveAttribute("data-toggle");
    await expect(row).not.toHaveAttribute("data-placement");
    await expect(row).not.toHaveAttribute("data-action");
  }
  await expect(rows.nth(0)).toHaveCSS("padding-top", "5px");
  await expect(rows.nth(1)).toHaveCSS("padding-top", "15px");
  await expect(rows.nth(0).getByRole("link", { name: "sample", exact: true })).toBeVisible();
  await expect(rows.nth(1).getByRole("link", { name: "second", exact: true })).toBeVisible();

  for (const width of [1366, 390]) {
    if (width === 390) await page.setViewportSize({ width, height: 844 });
    const geometry = await list.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const pane = node
        .closest('[data-owner="user-profile-pane-projects"]')
        ?.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        paneLeft: pane?.left ?? null,
        paneRight: pane?.right ?? null,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(geometry.paneLeft).not.toBeNull();
    expect(geometry.left).toBeGreaterThanOrEqual(geometry.paneLeft!);
    expect(geometry.right).toBeLessThanOrEqual(Math.min(width, geometry.paneRight!));
    expect(geometry.scrollWidth).toBe(width);
  }
});
