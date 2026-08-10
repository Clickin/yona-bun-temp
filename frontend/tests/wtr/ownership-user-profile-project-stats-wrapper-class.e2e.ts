import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const projects = [
  {
    projectId: 7,
    ownerName: "other",
    projectName: "member-project",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Member project",
    memberCount: 3,
    createdLabel: "today",
    viewerCanWatch: true,
    isWatching: false,
    watchCount: 4,
    viewerCanLeave: true,
    notifications: [],
  },
  {
    projectId: 8,
    ownerName: "other",
    projectName: "watched-project",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Watched project",
    memberCount: 2,
    createdLabel: "yesterday",
    viewerCanWatch: true,
    isWatching: true,
    watchCount: 2,
    viewerCanLeave: false,
    notifications: [],
  },
];

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
        memberProjects: projects,
        pullRequestItems: [],
      },
    }),
  );
});

test("profile project stats wrapper retires only its literal legacy class", async ({ page }) => {
  const [
    routeSource,
    styleSource,
    view,
    partial,
    yobi,
    pageLess,
    responsive,
    yobiUi,
    temporary,
    markdown,
    migration,
    override,
    bootstrap,
    bootstrapResponsive,
    appCss,
    behavior,
    defaultMessages,
    messages,
  ] = await Promise.all([
    readFile("../src/routes/$user.tsx"),
    readFileSync("src/app.css", "utf8") +
      readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8"),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/user/partial_projectlist.scala.html", import.meta.url),
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
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_temporary.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_markdown.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_migration.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_override.less", import.meta.url),
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
    readFile("../src/app.css"),
    readFile(
      new URL("../../yona-original/public/javascripts/service/yobi.user.View.js", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readFile(new URL("../../yona-original/conf/messages.ko-KR", import.meta.url), "utf8"),
  ]);

  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain('<div class="stats-wrap pull-right">');
  expect(partial).toContain('<div class="stats">');
  expect(partial.indexOf('<div class="stats-wrap pull-right">')).toBeLessThan(
    partial.indexOf('<div class="stats">'),
  );
  expect(partial).not.toContain('class="like"');
  expect(partial).not.toContain('class="members"');

  const imports = [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ];
  expect(yobi.match(/@import "less\/[^"]+";/gu)).toEqual(
    imports.map((path) => `@import "${path}";`),
  );
  expect(pageLess).toContain(
    ".stats-wrap {\n            margin-top: 0px;\n            text-align: right;",
  );
  expect(pageLess).toContain(".like {");
  expect(pageLess).toContain(".members {");
  expect(pageLess).toContain(
    ".stats-wrap {\n    i {\n        font-size: 16px;\n        margin-left: 5px;\n        margin-right: 5px;",
  );
  expect(responsive).not.toMatch(/\.all-projects[\s\S]{0,200}\.stats-wrap/u);
  for (const laterSource of [yobiUi, temporary, markdown, migration, override]) {
    expect(laterSource).not.toMatch(/\.all-projects[\s\S]{0,200}\.stats-wrap/u);
  }
  expect(bootstrap).toContain(".pull-right {\n  float: right;\n}");
  expect(bootstrapResponsive).not.toMatch(/\.all-projects[\s\S]{0,200}\.stats-wrap/u);
  expect(appCss).toContain(".all-projects .project .stats-wrap .members {");
  expect(appCss).not.toContain(".all-projects .project .stats-wrap {");
  expect(behavior).toContain('htElement.waBtnWatch   = $(".watchBtn");');
  expect(behavior).toContain('htElement.waLeaveProject = $("a.leaveProject")');
  expect(defaultMessages).toContain("notification.watch = Watch");
  expect(defaultMessages).toContain("userinfo.leaveProject = Leave");
  expect(messages).toContain("notification.watch = 지켜보기");
  expect(messages).toContain("userinfo.leaveProject = 탈퇴");

  expect(routeSource).toContain('data-owner="user-profile-project-stats"');
  // Wave-33: app retains legacy classes (667398a04 legacy-parity restore).

  expect(routeSource).toContain('className="stats"');

  const verifyViewport = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.goto("/yona/admin?selected=projects");

    const rows = page.locator('[data-owner="user-profile-project-row"]');
    const wrappers = page.locator('[data-owner="user-profile-project-stats"]');
    const stats = wrappers.locator(":scope > div");
    const watches = page.locator('[data-owner="user-profile-project-watch-button"]');
    const leave = page.locator('[data-owner="user-profile-project-leave-link"]');

    await expect(rows).toHaveCount(2);
    await expect(wrappers).toHaveCount(2);
    await expect(stats).toHaveCount(2);
    await expect(wrappers.nth(0)).toHaveClass(/(?:^|\s)stats-wrap(?:\s|$)/u);
    await expect(wrappers.nth(0)).toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
    await expect(wrappers.locator(".like")).toHaveCount(0);
    await expect(wrappers.locator(".members")).toHaveCount(0);
    await expect(watches).toHaveCount(2);
    await expect(watches.nth(0)).toHaveAttribute("href", "/yona/other/member-project/watch");
    await expect(watches.nth(1)).toHaveAttribute("href", "/yona/other/watched-project/unwatch");
    await expect(watches.nth(0)).toContainText("Watch");
    await expect(watches.nth(1)).toContainText("Unwatch");
    await expect(leave).toHaveCount(1);
    await expect(leave).toHaveAttribute("href", "/yona/info/leave/other/member-project");
    await expect(rows.nth(0).locator('[data-owner="user-profile-project-leave-link"]')).toHaveCount(
      1,
    );
    await expect(rows.nth(1).locator('[data-owner="user-profile-project-leave-link"]')).toHaveCount(
      0,
    );

    const childOrder = await stats
      .nth(0)
      .evaluate((node) => [...node.children].map((child) => child.getAttribute("data-owner")));
    expect(childOrder).toEqual([
      "user-profile-project-watch-button",
      "user-profile-project-leave-link",
    ]);

    const computed = await wrappers.evaluateAll((nodes) => ({
      wrappers: nodes.map((node) => {
        const element = node as HTMLElement;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const rowRect = element
          .closest('[data-owner="user-profile-project-row"]')!
          .getBoundingClientRect();
        const statsRect = element.querySelector(":scope > div")!.getBoundingClientRect();
        return {
          tag: element.tagName,
          float: style.float,
          marginTop: style.marginTop,
          textAlign: style.textAlign,
          inlineStyle: element.hasAttribute("style"),
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          row: {
            left: rowRect.left,
            right: rowRect.right,
            top: rowRect.top,
            bottom: rowRect.bottom,
          },
          stats: {
            left: statsRect.left,
            right: statsRect.right,
            top: statsRect.top,
            bottom: statsRect.bottom,
          },
        };
      }),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));

    expect(computed.overflow).toBe(0);
    for (const item of computed.wrappers) {
      expect(item).toMatchObject({
        tag: "DIV",
        float: "right",
        marginTop: "0px",
        textAlign: "right",
        inlineStyle: false,
      });
      expect(item.rect.left).toBeGreaterThanOrEqual(item.row.left);
      expect(item.rect.right).toBeLessThanOrEqual(item.row.right);
      expect(item.rect.top).toBeGreaterThanOrEqual(item.row.top);
      expect(item.rect.bottom).toBeLessThanOrEqual(item.row.bottom);
      expect(item.stats.left).toBeGreaterThanOrEqual(item.rect.left);
      expect(item.stats.right).toBeLessThanOrEqual(item.rect.right);
      expect(item.stats.top).toBeGreaterThanOrEqual(item.rect.top);
      expect(item.stats.bottom).toBeLessThanOrEqual(item.rect.bottom);
    }
    expect(computed.wrappers[0].rect.bottom).toBeLessThanOrEqual(computed.wrappers[1].row.top);

    const screenshotDirectory = new URL(
      "../output/playwright/style-user-profile-project-stats-wrapper-class/",
      import.meta.url,
    );
    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: new URL(
        width === 1366 ? "desktop-1366x900.png" : "mobile-390x844.png",
        screenshotDirectory,
      ).pathname,
    });
  };

  await verifyViewport(1366, 900);
  await verifyViewport(390, 844);
});
