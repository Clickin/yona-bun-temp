import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
        selected: "projects",
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
            createdLabel: "today",
            viewerCanWatch: true,
            isWatching: false,
            watchCount: 2,
            viewerCanLeave: true,
            notifications: [],
          },
        ],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated profile project avatar rail owns the legacy left float", async ({ page }) => {
  const route = await readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  const styleSource = await readFile(
    new URL("../src/routes/-user-profile.stylex.ts", import.meta.url),
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

  expect(partial).toContain('<div class="pull-left">');
  expect(partial).toContain(
    '<a href="@routes.ProjectApp.project(project.owner, project.name)" class="avatar-wrap small">',
  );
  expect(pageLess).toContain(".all-projects {");
  expect(pageLess).toContain(".info-wrap {");
  expect(commonLess).toContain(".avatar-wrap");
  expect(responsiveLess).toContain("@media");
  expect(yobi).toContain('@import "less/_common.less";');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(bootstrap).toContain(".pull-left {\n  float: left;\n}");

  expect(route).toContain('data-stylex-owner="user-profile-project-avatar-rail"');
  expect(route).not.toContain("styles.projectAvatarRail).className} pull-left");
  expect(styleSource).toContain('projectAvatarRail: { float: "left" }');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/yona/admin");
  await page.getByRole("button", { name: /Projects/i }).click();

  const rail = page.locator('[data-stylex-owner="user-profile-project-avatar-rail"]');
  const row = rail.locator("xpath=ancestor::li[contains(@class, 'project')]");
  await expect(rail).toBeVisible();
  await expect(rail).not.toHaveClass(/pull-left/u);
  await expect(rail).not.toHaveAttribute("style");
  await expect(rail).not.toHaveAttribute("data-toggle");
  await expect(rail.locator("a.avatar-wrap.small")).toHaveAttribute("href", "/yona/other/sample");
  await expect(rail.locator("img")).toHaveAttribute("alt", "");
  await expect(rail.locator("img")).toHaveAttribute("src", /project_default_logo\.png/u);
  await expect(row).toContainText("A sample project");

  const desktop = await rail.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const stream = node.closest(".user-streams")?.getBoundingClientRect();
    return {
      float: getComputedStyle(node).float,
      left: rect.left,
      right: rect.right,
      stream: stream ? { left: stream.left, right: stream.right } : null,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop.float).toBe("left");
  expect(desktop.stream).not.toBeNull();
  expect(desktop.left).toBeGreaterThanOrEqual(desktop.stream!.left);
  expect(desktop.right).toBeLessThanOrEqual(desktop.stream!.right);
  expect(desktop.scrollWidth).toBe(1366);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await rail.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const stream = node.closest(".user-streams")?.getBoundingClientRect();
    return {
      float: getComputedStyle(node).float,
      left: rect.left,
      right: rect.right,
      stream: stream ? { left: stream.left, right: stream.right } : null,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(mobile.float).toBe("left");
  expect(mobile.stream).not.toBeNull();
  expect(mobile.left).toBeGreaterThanOrEqual(mobile.stream!.left);
  expect(mobile.right).toBeLessThanOrEqual(mobile.stream!.right);
  expect(mobile.right).toBeLessThanOrEqual(390);
  expect(mobile.scrollWidth).toBe(390);
});
