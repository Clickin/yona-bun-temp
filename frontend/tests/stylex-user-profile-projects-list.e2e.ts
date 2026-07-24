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
            createdLabel: "today",
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
            createdLabel: "yesterday",
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

test("authenticated profile projects list owns the legacy all-projects shell", async ({ page }) => {
  const route = await readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  const styleSource = await readFile(
    new URL("../src/routes/-user-profile.stylex.ts", import.meta.url),
    "utf8",
  );
  const scala = await readFile(
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

  expect(scala).toContain('<div id="projects" class="tab-pane @isActiveTab("projects")">');
  expect(scala).toContain('<ul class="user-streams all-projects">');
  expect(partial).toContain('<li class="project">');
  expect(pageLess).toContain(".all-projects {");
  expect(pageLess).toContain("margin: 0 0 20px;");
  expect(pageLess).toContain("list-style: none;");
  expect(pageLess).toContain("clear:both;");
  expect(commonLess).toContain(".avatar-wrap");
  expect(responsiveLess).toContain("@media");
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_common.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(bootstrap).toContain("ul,");
  expect(bootstrapResponsive).toContain("@media");

  expect(route).toContain('data-stylex-owner="user-profile-projects-list"');
  expect(route).toContain("styles.projectsList");
  expect(styleSource).toContain(
    'projectsList: {\n    margin: "0px 0px 20px",\n    listStyle: "none",\n    clear: "both",\n  }',
  );

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/yona/admin");
  const projectsTab = page.getByRole("button", { name: /Projects/i });
  await expect(projectsTab).toBeVisible();
  await projectsTab.click();

  const list = page.locator('[data-stylex-owner="user-profile-projects-list"]');
  await expect(list).toBeVisible();
  await expect(list).toHaveClass(/user-streams/u);
  await expect(list).toHaveClass(/all-projects/u);
  await expect(list).not.toHaveAttribute("style");
  await expect(list).not.toHaveAttribute("data-toggle");
  await expect(list.locator(":scope > li.project")).toHaveCount(2);
  await expect(list.locator(":scope > li.project").nth(0)).toContainText("sample");
  await expect(list.locator(":scope > li.project").nth(1)).toContainText("second");

  const desktop = await list.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const tabPane = node.closest(".tab-pane")?.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      clear: style.clear,
      listStyle: style.listStyleType,
      margin: style.margin,
      left: rect.left,
      right: rect.right,
      tabPane: tabPane ? { left: tabPane.left, right: tabPane.right } : null,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop.clear).toBe("both");
  expect(desktop.listStyle).toBe("none");
  expect(desktop.margin).toBe("0px 0px 20px");
  expect(desktop.tabPane).not.toBeNull();
  expect(desktop.left).toBeGreaterThanOrEqual(desktop.tabPane!.left);
  expect(desktop.right).toBeLessThanOrEqual(desktop.tabPane!.right);
  expect(desktop.scrollWidth).toBe(1366);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await list.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const tabPane = node.closest(".tab-pane")?.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      clear: style.clear,
      listStyle: style.listStyleType,
      margin: style.margin,
      left: rect.left,
      right: rect.right,
      tabPane: tabPane ? { left: tabPane.left, right: tabPane.right } : null,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(mobile.clear).toBe("both");
  expect(mobile.listStyle).toBe("none");
  expect(mobile.margin).toBe("0px 0px 20px");
  expect(mobile.tabPane).not.toBeNull();
  expect(mobile.left).toBeGreaterThanOrEqual(mobile.tabPane!.left);
  expect(mobile.right).toBeLessThanOrEqual(mobile.tabPane!.right);
  expect(mobile.right).toBeLessThanOrEqual(390);
  expect(mobile.scrollWidth).toBe(390);
});
