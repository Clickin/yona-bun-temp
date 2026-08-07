import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const projects = [
  {
    projectId: 7,
    ownerName: "private-owner",
    projectName: "private-project",
    projectScope: "private",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Private project",
    memberCount: 3,
    createdLabel: "today",
    lastPushedLabel: "an hour ago",
    viewerCanWatch: false,
    isWatching: false,
    watchCount: 2,
    viewerCanLeave: false,
    notifications: [],
  },
  {
    projectId: 8,
    ownerName: "other",
    projectName: "forked-project",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Forked project",
    memberCount: 2,
    createdLabel: "yesterday",
    originOwnerName: "origin-owner",
    originProjectName: "origin-project",
    viewerCanWatch: true,
    isWatching: true,
    watchCount: 4,
    viewerCanLeave: true,
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

test("profile project info wrapper retires only its declaration-free legacy class", async ({
  page,
}) => {
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
    messages,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
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
    readFile(new URL("../src/app.css", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/public/javascripts/service/yobi.user.View.js", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain('<div class="info-wrap">');
  expect(partial).toContain('<div class="header">');
  expect(partial).toContain('<div class="desc">@project.overview</div>');
  expect(partial).toContain('<div class="name-tag">');
  const infoRule = pageLess.match(/ {8}\.info-wrap \{([\s\S]*?)\n {8}\}/u);
  expect(infoRule).not.toBeNull();
  expect(infoRule![1].replace(/[\s\S]*?\{[\s\S]*?\}/gu, "").trim()).toBe("");
  expect(pageLess).toContain(".yobicon-lock { color:#7F8C8D;}");
  expect(pageLess).toContain(".owner-name-small{ color:#999; font-size: 19px; }");
  expect(pageLess).toContain(".forked{");
  expect(pageLess).toContain(".owner-avatar-wrap {");

  const imports = [
    "_variables",
    "_mixins",
    "_common",
    "_sprites",
    "_page",
    "_tippy",
    "_scrollbar",
    "_responsive",
    "_yobiUI",
    "_temporary",
    "_markdown",
    "_migration",
    "_override",
  ];
  expect(yobi.match(/@import "less\/[^"]+";/gu)).toEqual(
    imports.map((name) => `@import "less/${name}.less";`),
  );
  for (const laterSource of [
    responsive,
    yobiUi,
    temporary,
    markdown,
    migration,
    override,
    bootstrap,
    bootstrapResponsive,
  ]) {
    expect(laterSource).not.toMatch(/\.all-projects[\s\S]{0,200}\.info-wrap\s*\{/u);
  }
  expect(appCss).not.toContain(".all-projects .project .info-wrap {");
  expect(appCss).toContain(".all-projects .project .info-wrap .header .yobicon-lock {");
  expect(behavior).toContain('htElement.waBtnWatch   = $(".watchBtn");');
  expect(behavior).toContain('htElement.waLeaveProject = $("a.leaveProject");');
  expect(messages).toContain("notification.unwatch = Unwatch");
  expect(messages).toContain("userinfo.leaveProject = Leave");

  for (const owner of [
    "user-profile-project-header",
    "user-profile-project-description",
    "user-profile-project-name-tag",
    "user-profile-project-private-icon",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const style of [
    "projectHeader",
    "projectDescription",
    "projectNameTag",
    "projectPrivateIcon",
  ]) {
    expect(styleSource).toContain(`${style}:`);
  }
  expect(routeSource).toContain('data-stylex-owner="user-profile-project-info-wrap"');
  // 667398a04 legacy-parity restore: the info wrapper retains its legacy class.
  expect(routeSource).toContain('className="info-wrap"');

  const output = "output/playwright/stylex-user-profile-project-info-wrapper-class";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/yona/admin?selected=projects");

    const rows = page.locator('[data-stylex-owner="user-profile-project-row"]');
    const wrappers = page.locator('[data-stylex-owner="user-profile-project-info-wrap"]');
    await expect(rows).toHaveCount(2);
    await expect(wrappers).toHaveCount(2);
    await expect(wrappers.nth(0)).toHaveClass(/(?:^|\s)info-wrap(?:\s|$)/u);
    await expect(
      wrappers.locator(
        '.owner-avatar-wrap, .forked, [data-stylex-owner="user-profile-project-header"] .owner-name-small',
      ),
    ).toHaveCount(0);
    await expect(
      rows.nth(0).locator('[data-stylex-owner="user-profile-project-private-icon"]'),
    ).toHaveCount(1);
    await expect(
      rows.nth(1).locator('[data-stylex-owner="user-profile-project-private-icon"]'),
    ).toHaveCount(0);
    await expect(
      rows.nth(1).locator('[data-stylex-owner="user-profile-project-origin-link"]'),
    ).toHaveText("origin-owner/origin-project");
    await expect(
      rows.nth(1).locator('[data-stylex-owner="user-profile-project-watch-button"]'),
    ).toContainText("Unwatch");
    await expect(
      rows.nth(1).locator('[data-stylex-owner="user-profile-project-leave-link"]'),
    ).toContainText("Leave");

    const metrics = await wrappers.evaluateAll((nodes) => ({
      wrappers: nodes.map((node) => {
        const wrapper = node as HTMLElement;
        const row = wrapper.closest('[data-stylex-owner="user-profile-project-row"]')!;
        const children = [...wrapper.children] as HTMLElement[];
        const boxes = [wrapper, row, ...children].map((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
        return {
          directOwners: children.map((child) => child.dataset.stylexOwner),
          wrapper: boxes[0],
          row: boxes[1],
          avatar: boxes[2],
          info: boxes[3],
          headerOwners: [
            ...wrapper.querySelectorAll(
              ':scope [data-stylex-owner="user-profile-project-header"], :scope [data-stylex-owner="user-profile-project-description"], :scope [data-stylex-owner="user-profile-project-name-tag"]',
            ),
          ].map((child) => child.getAttribute("data-stylex-owner")),
        };
      }),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(metrics.overflow).toBe(0);
    for (const metric of metrics.wrappers) {
      expect(metric.directOwners).toEqual([
        "user-profile-project-avatar-rail",
        "user-profile-project-info",
      ]);
      expect(metric.headerOwners).toEqual([
        "user-profile-project-header",
        "user-profile-project-description",
        "user-profile-project-name-tag",
      ]);
      expect(metric.wrapper.left).toBeGreaterThanOrEqual(metric.row.left);
      expect(metric.wrapper.right).toBeLessThanOrEqual(metric.row.right);
      expect(metric.avatar.left).toBeGreaterThanOrEqual(metric.wrapper.left);
      expect(metric.info.left).toBeGreaterThanOrEqual(metric.wrapper.left);
      expect(metric.avatar.bottom).toBeLessThanOrEqual(metric.row.bottom);
      expect(metric.info.bottom).toBeLessThanOrEqual(metric.row.bottom);
    }
    const rowBoxes = await rows.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }),
    );
    expect(rowBoxes[0].bottom).toBeLessThanOrEqual(rowBoxes[1].top);
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
