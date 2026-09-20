import { readFile, readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
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
    createdAt: "2020-01-02T12:00:00Z",
    lastPushedAt: "2020-01-03T12:00:00Z",
    viewerCanWatch: false,
    isWatching: false,
    watchCount: 2,
    viewerCanLeave: false,
    notifications: [],
  },
  {
    projectId: 8,
    ownerName: "fork-owner",
    projectName: "forked-project",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Forked project",
    memberCount: 2,
    createdAt: "2020-01-01T12:00:00Z",
    lastPushedAt: "",
    originOwnerName: "origin-owner",
    originProjectName: "origin-project",
    viewerCanWatch: true,
    isWatching: true,
    watchCount: 4,
    viewerCanLeave: true,
    notifications: [],
  },
  {
    projectId: 9,
    ownerName: "public-owner",
    projectName: "public-project",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Public project",
    memberCount: 1,
    createdAt: "2019-12-30T12:00:00Z",
    lastPushedAt: "",
    viewerCanWatch: true,
    isWatching: false,
    watchCount: 1,
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

test("profile Projects pane retires only Style-owned header, desc, and name-tag classes", async ({
  page,
}) => {
  const [
    route,
    styles,
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
    messages,
    behavior,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    curatedAppCss(),
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
    Promise.resolve(curatedAppCss()),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/public/javascripts/service/yobi.user.View.js", import.meta.url),
      "utf8",
    ),
  ]);

  expect(view).toContain('<div id="projects" class="tab-pane @isActiveTab("projects")">');
  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain('<div class="header">');
  expect(partial).toContain('<div class="desc">@project.overview</div>');
  expect(partial).toContain('<div class="name-tag">');
  expect(partial.indexOf('<div class="header">')).toBeLessThan(
    partial.indexOf('<div class="desc">'),
  );
  expect(partial.indexOf('<div class="desc">')).toBeLessThan(
    partial.indexOf('<div class="name-tag">'),
  );
  expect(partial).toContain('class="yobicon-lock yobicon-small"');
  expect(partial).toContain('class="yobicon-split yobicon-white vmiddle"');
  expect(partial).toContain('class="owner-name-small"');
  expect(partial).toContain('class="ybtn watchBtn"');
  expect(partial).toContain('class="nbtn black medium last leaveProject"');

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
  const leafRules = [
    ".header {\n                font-size: 20px;\n                font-weight: bold;\n                margin-bottom: 5px;\n                margin-left: 10px;",
    ".desc {\n                margin-left:10px;\n                overflow-y: auto;\n                max-height: 100px;\n                max-width: 647px;\n                text-overflow:ellipsis;\n                color: #bababa;",
    ".name-tag {\n                margin: 0;\n                margin-left:10px;\n                font-size: 11px;\n                color: #999;",
  ];
  for (const rule of leafRules) expect(pageLess).toContain(rule);
  expect(pageLess).toContain(".all-projects {");
  expect(pageLess).toContain(".project {");
  expect(pageLess).toContain(".info-wrap {");
  for (const laterSource of [responsive, yobiUi, temporary, markdown, migration, override]) {
    expect(laterSource).not.toMatch(/\.all-projects[\s\S]{0,300}\.(?:header|desc|name-tag)\s*\{/u);
  }
  expect(bootstrap).not.toMatch(/(?:^|\n)\.(?:header|desc|name-tag)\s*\{/u);
  expect(bootstrapResponsive).not.toMatch(/(?:^|\n)\.(?:header|desc|name-tag)\s*\{/u);
  expect(appCss).not.toMatch(
    /\.all-projects \.project \.info-wrap \.(?:header|desc|name-tag)\s*\{/u,
  );
  expect(appCss).toContain(".all-projects .project .info-wrap .header .yobicon-lock {");
  expect(messages).toContain("notification.watch = Watch");
  expect(messages).toContain("notification.unwatch = Unwatch");
  expect(messages).toContain("userinfo.leaveProject = Leave");
  expect(behavior).toContain('htElement.waBtnWatch   = $(".watchBtn");');
  expect(behavior).toContain('htElement.waLeaveProject = $("a.leaveProject");');

  expect(route).toContain('data-owner="user-profile-project-private-icon"');
  for (const [owner, style, legacyClass] of [
    ["user-profile-project-header", "projectHeader", "header"],
    ["user-profile-project-description", "projectDescription", "desc"],
    ["user-profile-project-name-tag", "projectNameTag", "name-tag"],
  ] as const) {
    expect(route).toContain(`data-owner="${owner}"`);

    // 667398a04 legacy-parity restore: header/desc/name-tag retain their classes.
  }

  const output = "output/playwright/style-user-profile-project-leaf-classes";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/yona/admin?selected=projects");

    const rows = page.locator('[data-owner="user-profile-project-row"]');
    const headers = page.locator('[data-owner="user-profile-project-header"]');
    const descriptions = page.locator('[data-owner="user-profile-project-description"]');
    const nameTags = page.locator('[data-owner="user-profile-project-name-tag"]');
    await expect(rows).toHaveCount(3);
    await expect(headers).toHaveCount(3);
    await expect(descriptions).toHaveCount(3);
    await expect(nameTags).toHaveCount(3);
    await expect(headers).toHaveText([
      "private-project",
      "forked-project origin-owner/origin-project",
      "public-project",
    ]);
    await expect(descriptions).toHaveText(["Private project", "Forked project", "Public project"]);
    await expect(nameTags.locator("strong")).toHaveText(["3", "2", "1"]);
    await expect(nameTags.locator(".owner-name-small")).toHaveText([
      "private-owner",
      "fork-owner",
      "public-owner",
    ]);
    for (const [owner, legacyClass] of [
      ["user-profile-project-header", "header"],
      ["user-profile-project-description", "desc"],
      ["user-profile-project-name-tag", "name-tag"],
    ] as const) {
      const nodes = page.locator(`[data-owner="${owner}"]`);
      await expect(nodes).toHaveCount(3);
      for (let index = 0; index < 3; index += 1) {
        await expect(nodes.nth(index)).toHaveClass(
          new RegExp(`(?:^|\\s)${legacyClass}(?:\\s|$)`, "u"),
        );
      }
    }
    await expect(rows.locator(".header, .desc, .name-tag")).toHaveCount(9);
    await expect(
      rows.nth(0).locator('[data-owner="user-profile-project-private-icon"]'),
    ).toHaveCount(1);
    await expect(
      rows.nth(1).locator('[data-owner="user-profile-project-private-icon"]'),
    ).toHaveCount(0);
    await expect(rows.nth(1).locator('[data-owner="user-profile-project-fork-icon"]')).toHaveCount(
      1,
    );
    await expect(rows.nth(1).locator('[data-owner="user-profile-project-origin-link"]')).toHaveText(
      "origin-owner/origin-project",
    );
    await expect(
      rows.nth(1).locator('[data-owner="user-profile-project-watch-button"]'),
    ).toContainText("Unwatch");
    await expect(
      rows.nth(1).locator('[data-owner="user-profile-project-leave-link"]'),
    ).toContainText("Leave");
    await expect(
      rows.nth(2).locator('[data-owner="user-profile-project-watch-button"]'),
    ).toContainText("Watch");

    const metrics = await rows.evaluateAll((nodes) =>
      nodes.map((row) => {
        const info = row.querySelector<HTMLElement>('[data-owner="user-profile-project-info"]')!;
        const header = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-header"]',
        )!;
        const description = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-description"]',
        )!;
        const nameTag = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-name-tag"]',
        )!;
        const rect = (element: HTMLElement) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        };
        const children = [...info.children] as HTMLElement[];
        const headerStyle = getComputedStyle(header);
        const descriptionStyle = getComputedStyle(description);
        const nameTagStyle = getComputedStyle(nameTag);
        return {
          order: children.map((child) => child.dataset.owner),
          tags: children.map((child) => child.tagName),
          classMatches: [header, description, nameTag].map((element) => ({
            header: element.classList.contains("header"),
            desc: element.classList.contains("desc"),
            nameTag: element.classList.contains("name-tag"),
          })),
          header: {
            fontSize: headerStyle.fontSize,
            fontWeight: headerStyle.fontWeight,
            marginBottom: headerStyle.marginBottom,
            marginLeft: headerStyle.marginLeft,
            rect: rect(header),
          },
          description: {
            color: descriptionStyle.color,
            marginLeft: descriptionStyle.marginLeft,
            maxHeight: descriptionStyle.maxHeight,
            maxWidth: descriptionStyle.maxWidth,
            overflowY: descriptionStyle.overflowY,
            textOverflow: descriptionStyle.textOverflow,
            rect: rect(description),
          },
          nameTag: {
            color: nameTagStyle.color,
            fontSize: nameTagStyle.fontSize,
            marginLeft: nameTagStyle.marginLeft,
            rect: rect(nameTag),
          },
          info: rect(info),
          row: rect(row as HTMLElement),
        };
      }),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    for (const metric of metrics) {
      expect(metric.order).toEqual([
        "user-profile-project-header",
        "user-profile-project-description",
        "user-profile-project-name-tag",
      ]);
      expect(metric.tags).toEqual(["DIV", "DIV", "DIV"]);
      // 667398a04 restore: each leaf retains exactly its own legacy class.
      expect(metric.classMatches).toEqual([
        { header: true, desc: false, nameTag: false },
        { header: false, desc: true, nameTag: false },
        { header: false, desc: false, nameTag: true },
      ]);
      expect(metric.header.fontSize).toBe("20px");
      expect(metric.header.fontWeight).toBe("700");
      expect(metric.header.marginBottom).toBe("5px");
      expect(metric.header.marginLeft).toBe("10px");
      expect(metric.description.color).toBe("rgb(186, 186, 186)");
      expect(metric.description.marginLeft).toBe("10px");
      expect(metric.description.maxHeight).toBe("100px");
      expect(metric.description.maxWidth).toBe("647px");
      expect(metric.description.overflowY).toBe("auto");
      expect(metric.description.textOverflow).toBe("ellipsis");
      expect(metric.nameTag.color).toBe("rgb(153, 153, 153)");
      expect(metric.nameTag.fontSize).toBe("11px");
      expect(metric.nameTag.marginLeft).toBe("10px");
      expect(metric.header.rect.left).toBeGreaterThanOrEqual(metric.info.left);
      expect(metric.header.rect.right).toBeLessThanOrEqual(metric.info.right);
      expect(metric.description.rect.top).toBeGreaterThanOrEqual(metric.header.rect.bottom);
      expect(metric.nameTag.rect.top).toBeGreaterThanOrEqual(metric.description.rect.bottom);
      expect(metric.nameTag.rect.bottom).toBeLessThanOrEqual(metric.row.bottom);
      expect(metric.row.left).toBeGreaterThanOrEqual(0);
      expect(metric.row.right).toBeLessThanOrEqual(viewport.width);
    }
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
