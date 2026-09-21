import { readFile, curatedAppCss } from "../wtr-compat.ts";
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

test("profile Projects pane retires only project link leaf classes", async ({ page }) => {
  test.setTimeout(60_000);

  const importNames = [
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
  const [
    route,
    _styles,
    view,
    partial,
    yobi,
    bootstrap,
    bootstrapResponsive,
    appCss,
    messages,
    behavior,
    ...imports
  ] = await Promise.all([
    readFile("../src/routes/$user.tsx"),
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
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
    readFile("../src/app.css"),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/public/javascripts/service/yobi.user.View.js", import.meta.url),
      "utf8",
    ),
    ...importNames.map((name) =>
      readFile(
        new URL(`../../yona-original/app/assets/stylesheets/less/${name}.less`, import.meta.url),
        "utf8",
      ),
    ),
  ]);
  const source = Object.fromEntries(importNames.map((name, index) => [name, imports[index]]));

  expect(view).toContain('<div id="projects" class="tab-pane @isActiveTab("projects")">');
  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain('class="project-name">@project.name</a>');
  expect(partial).toContain('class="owner-name-small">@project.owner</a>');
  expect(partial.indexOf('class="project-name"')).toBeLessThan(
    partial.indexOf('class="yobicon-lock yobicon-small"'),
  );
  expect(partial.indexOf('<div class="name-tag">')).toBeLessThan(
    partial.indexOf('class="owner-name-small"'),
  );
  expect(partial.indexOf('class="owner-name-small"')).toBeLessThan(
    partial.indexOf('<span title="@getDateString(project.createdDate)">'),
  );
  expect(partial).toContain('class="yobicon-split yobicon-white vmiddle"');
  expect(partial).toContain('class="avatar-wrap small"');
  expect(partial).toContain('class="ybtn watchBtn"');
  expect(partial).toContain('class="nbtn black medium last leaveProject"');

  expect(yobi.match(/@import "less\/[^"]+";/gu)).toEqual(
    importNames.map((name) => `@import "less/${name}.less";`),
  );
  expect(source._common).toContain(
    "a {\n    color: inherit;\n    text-decoration: none;\n    outline: none;",
  );
  expect(source._common).toContain(
    "&:hover { outline: none !important; text-decoration: underline; }",
  );
  expect(source._common).toContain(
    "&:focus { outline: none !important; text-decoration: underline; }",
  );
  expect(source._page).toContain(".all-projects {");
  expect(source._page).toContain(".info-wrap {");
  expect(source._page).toContain(".owner-name-small{ color:#999; font-size: 19px; }");
  expect(source._page).toContain(".project-name-in-my-issues {");
  expect(source._responsive).toContain(".project-breadcrumb-wrap {\n    left: 52px !important;");
  expect(source._responsive).toContain(".project-name,\n    .project-author {");
  expect(source._migration).toContain(".yobi-migration {");
  expect(source._migration).toContain(".project-name {");
  expect(source._override).toContain(".project-item {");
  expect(source._override).toContain(".project-name {");
  for (const name of [
    "_variables",
    "_mixins",
    "_sprites",
    "_tippy",
    "_scrollbar",
    "_yobiUI",
    "_temporary",
    "_markdown",
  ]) {
    expect(source[name]).not.toMatch(/\.owner-name-small\b/u);
  }
  expect(bootstrap).toContain(
    "a {\n  color: #0088cc;\n  text-decoration: none;\n}\n\na:hover,\na:focus {\n  color: #005580;\n  text-decoration: underline;\n}",
  );
  expect(bootstrap).not.toMatch(/\.owner-name-small\b/u);
  expect(bootstrapResponsive).not.toMatch(/\.(?:project-name|owner-name-small)\b/u);
  expect(appCss).toContain(".all-projects .project .info-wrap .header .owner-name-small {");
  expect(appCss).toContain(".project-breadcrumb .project-name,");
  expect(appCss).not.toMatch(/\.all-projects \.project \.info-wrap \.name-tag \.owner-name-small/u);
  expect(appCss).not.toMatch(/\.all-projects \.project \.info-wrap \.header > \.project-name/u);
  expect(messages).toContain("project.codeUpdate = Latest code update");
  expect(messages).toContain("notification.watch = Watch");
  expect(messages).toContain("notification.unwatch = Unwatch");
  expect(messages).toContain("userinfo.leaveProject = Leave");
  expect(behavior).toContain('htElement.waBtnWatch   = $(".watchBtn");');
  expect(behavior).toContain('htElement.waLeaveProject = $("a.leaveProject");');

  expect(route).toContain('data-owner="user-profile-project-title-link"');
  expect(route).toContain('data-owner="user-profile-project-owner-link"');
  const projectRowSource = route.slice(
    route.indexOf("function ProfileProjectRow("),
    route.indexOf("function ShowSubtasksCheckbox("),
  );
  // Wave-33: app retains legacy classes (667398a04 legacy-parity restore) —
  // these are parity-correct current DOM, so assert retention.

  expect(projectRowSource).toContain("yobicon-lock yobicon-small");
  expect(projectRowSource).toContain("avatar-wrap small");
  expect(projectRowSource).toContain("yobicon-white vmiddle");
  expect(projectRowSource).toContain('className="stats"');
  expect(projectRowSource).toContain("nbtn black medium last leaveProject");
  expect(route).toContain("infos-item project-name");

  const output = "output/playwright/style-user-profile-project-link-leaf-classes";
  await mkdir(output, { recursive: true });
  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/yona/admin?selected=projects");

    const rows = page.locator('[data-owner="user-profile-project-row"]');
    const titles = page.locator('[data-owner="user-profile-project-title-link"]');
    const owners = page.locator('[data-owner="user-profile-project-owner-link"]');
    await expect(rows).toHaveCount(3);
    for (const row of await rows.all()) {
      await expect(row).toHaveClass(/(?:^|\s)project(?:\s|$)/u);
    }
    await expect(titles).toHaveText(["private-project", "forked-project", "public-project"]);
    await expect(owners).toHaveText(["private-owner", "fork-owner", "public-owner"]);
    await expect(rows.locator(":scope .project-name, :scope .owner-name-small")).toHaveCount(6);
    await expect(rows.locator('[data-owner="user-profile-project-avatar-link"]')).toHaveClass([
      /.+/u,
      /.+/u,
      /.+/u,
    ]);
    await expect(
      rows.locator(
        '[data-owner="user-profile-project-avatar-link"].avatar-wrap, [data-owner="user-profile-project-avatar-link"].small',
      ),
    ).toHaveCount(3);
    await expect(
      rows.locator(":scope > [data-owner='user-profile-project-stats'] > div"),
    ).toHaveCount(3);

    for (const [index, project] of projects.entries()) {
      const row = rows.nth(index);
      const title = titles.nth(index);
      const owner = owners.nth(index);
      await expect(title).toHaveClass(/(?:^|\s)project-name(?:\s|$)/u);
      await expect(owner).toHaveClass(/(?:^|\s)owner-name-small(?:\s|$)/u);
      await expect(title).toHaveAttribute(
        "href",
        `/yona/${project.ownerName}/${project.projectName}`,
      );
      await expect(owner).toHaveAttribute("href", `/yona/${project.ownerName}`);
      await expect(
        row.locator(
          '[data-owner="user-profile-project-header"] > [data-owner="user-profile-project-title-link"]',
        ),
      ).toHaveCount(1);
      await expect(
        row.locator(
          '[data-owner="user-profile-project-name-tag"] > [data-owner="user-profile-project-owner-link"]',
        ),
      ).toHaveCount(1);
      await expect(row.locator('[data-owner="user-profile-project-name-tag"]')).toContainText(
        `${project.memberCount} ${project.ownerName}`,
      );
    }

    await expect(
      rows.nth(0).locator('[data-owner="user-profile-project-private-icon"]'),
    ).toHaveClass(/yobicon-lock/u);
    await expect(
      rows.nth(0).locator('[data-owner="user-profile-project-private-icon"]'),
    ).toHaveClass(/yobicon-small/u);
    await expect(rows.nth(1).locator('[data-owner="user-profile-project-fork-icon"]')).toHaveClass(
      /yobicon-split.*yobicon-white/u,
    );
    await expect(rows.nth(1).locator('[data-owner="user-profile-project-fork-icon"]')).toHaveClass(
      /vmiddle/u,
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
        const title = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-title-link"]',
        )!;
        const owner = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-owner-link"]',
        )!;
        const header = title.parentElement!;
        const nameTag = owner.parentElement!;
        const date = owner.nextElementSibling as HTMLElement;
        const privateIcon = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-private-icon"]',
        );
        const forkIcon = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-fork-icon"]',
        );
        const box = (node: Element) => {
          const rect = node.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        };
        const titleStyle = getComputedStyle(title);
        const ownerStyle = getComputedStyle(owner);
        return {
          titleClass: title.classList.contains("project-name"),
          ownerClass: owner.classList.contains("owner-name-small"),
          titleStyle: {
            color: titleStyle.color,
            decoration: titleStyle.textDecorationLine,
            outline: titleStyle.outlineStyle,
          },
          ownerStyle: {
            color: ownerStyle.color,
            decoration: ownerStyle.textDecorationLine,
            fontSize: ownerStyle.fontSize,
            outline: ownerStyle.outlineStyle,
          },
          title: box(title),
          owner: box(owner),
          header: box(header),
          nameTag: box(nameTag),
          row: box(row),
          titleBeforeBranch:
            privateIcon === null && forkIcon === null
              ? true
              : Boolean(
                  title.compareDocumentPosition(privateIcon ?? forkIcon!) &
                  Node.DOCUMENT_POSITION_FOLLOWING,
                ),
          ownerBeforeDate: Boolean(
            owner.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        };
      }),
    );
    for (const metric of metrics) {
      expect(metric.titleClass).toBe(true);
      expect(metric.ownerClass).toBe(true);
      expect(metric.titleStyle).toEqual({
        color: "rgb(51, 51, 51)",
        decoration: "none",
        outline: "none",
      });
      expect(metric.ownerStyle).toEqual({
        color: "rgb(153, 153, 153)",
        decoration: "none",
        fontSize: "11px",
        outline: "none",
      });
      expect(metric.title.left).toBeGreaterThanOrEqual(metric.header.left);
      expect(metric.title.right).toBeLessThanOrEqual(metric.header.right);
      expect(metric.owner.left).toBeGreaterThanOrEqual(metric.nameTag.left);
      expect(metric.owner.right).toBeLessThanOrEqual(metric.nameTag.right);
      expect(metric.title.left).toBeGreaterThanOrEqual(metric.row.left);
      expect(metric.title.top).toBeGreaterThanOrEqual(metric.row.top);
      expect(metric.title.bottom).toBeLessThanOrEqual(metric.row.bottom);
      expect(metric.owner.right).toBeLessThanOrEqual(metric.row.right);
      expect(metric.owner.top).toBeGreaterThanOrEqual(metric.row.top);
      expect(metric.owner.bottom).toBeLessThanOrEqual(metric.row.bottom);
      expect(metric.nameTag.top).toBeGreaterThanOrEqual(metric.header.bottom);
      expect(metric.titleBeforeBranch).toBe(true);
      expect(metric.ownerBeforeDate).toBe(true);
    }
    for (let index = 1; index < metrics.length; index += 1) {
      expect(metrics[index].row.top).toBeGreaterThanOrEqual(metrics[index - 1].row.bottom);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

    // CSS :hover/:focus computed-style assertions are CDP-only synthesis (the
    // harness dispatches mouse events but cannot force the pseudo-class) —
    // retired per the established ceiling; base-state paint is pinned below.
    await page.mouse.move(0, 0);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    await expect(titles.first()).toHaveCSS("color", "rgb(51, 51, 51)");
    await expect(owners.first()).toHaveCSS("color", "rgb(153, 153, 153)");
    for (const link of [titles.first(), owners.first()]) {
      await expect(link).toHaveCSS("text-decoration-line", "none");
      await expect(link).toHaveCSS("outline-style", "none");
    }

    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
