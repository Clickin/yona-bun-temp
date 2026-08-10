import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const projects = [
  {
    projectId: 7,
    ownerName: "private-owner",
    projectName: "private-project",
    projectScope: "private",
    logoUrl: "/assets/images/private-project.png",
    overview: "Private project overview",
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
    ownerName: "fork-owner",
    projectName: "forked-project",
    projectScope: "public",
    logoUrl: "/assets/images/forked-project.png",
    overview: "Forked project overview",
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
  {
    projectId: 9,
    ownerName: "public-owner",
    projectName: "public-project",
    projectScope: "public",
    logoUrl: "/assets/images/public-project.png",
    overview: "Public project overview",
    memberCount: 1,
    createdLabel: "Monday",
    viewerCanWatch: true,
    isWatching: false,
    watchCount: 1,
    viewerCanLeave: false,
    notifications: [],
  },
];

test.beforeEach(async ({ page }) => {
  await page.route(/\/assets\/images\/(?:private|forked|public)-project\.png$/u, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
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

test("Projects pane retires only avatar, lock-size, and fork-alignment utility classes", async ({
  page,
}) => {
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
    styles,
    view,
    partial,
    yobi,
    yobicon,
    bootstrap,
    bootstrapResponsive,
    appCss,
    messages,
    behavior,
    focusedTest,
    siteLayout,
    fontFace,
    ...imports
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../src/app.css", import.meta.url), "utf8") +
      readFileSync(
        new URL(
          "../frontend/public/legacy-assets/stylesheets/legacy-fallback.css",
          import.meta.url,
        ),
        "utf8",
      ),
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
      new URL("../../yona-original/public/stylesheets/yobicon/style.css", import.meta.url),
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
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/public/javascripts/service/yobi.user.View.js", import.meta.url),
      "utf8",
    ),
    readFile(new URL(import.meta.url), "utf8"),
    readFile(new URL("../src/routes/-home-route-screen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/yobicon-font.css", import.meta.url), "utf8"),
    ...importNames.map((name) =>
      readFile(
        new URL(`../../yona-original/app/assets/stylesheets/less/${name}.less`, import.meta.url),
        "utf8",
      ),
    ),
  ]);
  const source = Object.fromEntries(importNames.map((name, index) => [name, imports[index]]));

  expect(view).toContain('<div id="projects" class="tab-pane @isActiveTab("projects")">');
  expect(view).toContain('<ul class="user-streams all-projects">');
  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain('<li class="project">');
  expect(partial).toContain(
    '<a href="@routes.ProjectApp.project(project.owner, project.name)" class="avatar-wrap small">',
  );
  expect(partial).toContain('<img src="@urlToProjectLogo(project)">');
  expect(partial).toContain('<i class="yobicon-lock yobicon-small"></i>');
  expect(partial).toContain('<i class="yobicon-split yobicon-white vmiddle"></i>');
  expect(partial).toContain('class="ybtn watchBtn"');
  expect(partial).toContain('class="nbtn black medium last leaveProject"');
  expect(partial.indexOf('class="avatar-wrap small"')).toBeLessThan(
    partial.indexOf('<div class="header">'),
  );
  expect(partial.indexOf("project.isPrivate")).toBeLessThan(
    partial.indexOf("project.isForkedFromOrigin"),
  );
  expect(partial.indexOf('<div class="info-wrap">')).toBeLessThan(
    partial.indexOf('<div class="stats-wrap pull-right">'),
  );

  expect(yobi.match(/@import "less\/[^"]+";/gu)).toEqual(
    importNames.map((name) => `@import "less/${name}.less";`),
  );
  for (const importedSource of imports) {
    expect(importedSource).not.toMatch(/^\s*@import\s+/mu);
  }
  expect(source._common).toContain(
    ".avatar-wrap {\n    width:32px; height:32px;\n    vertical-align:top;\n    overflow:hidden; display:inline-block;",
  );
  expect(source._common).toContain("&.small { width:24px; height:24px;");
  expect(source._common).toContain(".vmiddle  { vertical-align:middle !important; }");
  expect(source._page).toContain(".yobicon-lock { color:#7F8C8D;}");
  expect(source._yobiUI).toContain(
    ".avatar-wrap {\n    width:32px; height:32px; /* default size: medium */\n    display:inline-block;\n    vertical-align:middle;\n    overflow:hidden;\n    background:#ddd;",
  );
  expect(source._yobiUI).toContain("&.small   { width:24px; height:24px; }");
  expect(source._yobiUI).toContain(
    "img {\n        width:100%;\n        vertical-align:top;\n    }",
  );
  expect(source._responsive).not.toMatch(/\.avatar-wrap\.small\b/u);
  for (const name of [
    "_variables",
    "_mixins",
    "_sprites",
    "_tippy",
    "_scrollbar",
    "_temporary",
    "_markdown",
    "_migration",
    "_override",
  ]) {
    expect(source[name]).not.toMatch(/\.avatar-wrap\.small|\.yobicon-small\b|\.vmiddle\s*\{/u);
  }
  expect(bootstrap).not.toMatch(/\.avatar-wrap\b|\.yobicon-small\b|\.vmiddle\b/u);
  expect(bootstrapResponsive).not.toMatch(/\.avatar-wrap\.small|\.yobicon-small\b|\.vmiddle\b/u);
  expect(appCss).toContain(".avatar-wrap {");
  expect(appCss).toContain(".avatar-wrap img {");
  expect(appCss).toContain(".vmiddle {");
  expect(appCss).toContain(".all-projects .project .info-wrap .header .yobicon-lock {");

  expect(yobicon).toContain(
    '[class^="yobicon-"],\n[class*=" yobicon-"] {\n    font-family: \'yobicon\';',
  );
  expect(yobicon).toContain(".yobicon-small {\n    font-size:0.7em;\n}");

  expect(yobicon).not.toMatch(/\.yobicon-white\s*\{/u);
  expect(messages).toContain("project.codeUpdate = Latest code update");
  expect(messages).toContain("notification.watch = Watch");
  expect(messages).toContain("notification.unwatch = Unwatch");
  expect(messages).toContain("userinfo.leaveProject = Leave");
  expect(behavior).toContain('htElement.waBtnWatch   = $(".watchBtn");');
  expect(behavior).toContain('htElement.waLeaveProject = $("a.leaveProject");');

  const projectRowSource = route.slice(
    route.indexOf("function ProfileProjectRow("),
    route.indexOf("function ShowSubtasksCheckbox("),
  );

  expect(route).toContain('import { SiteLayoutShell } from "./-home-route-screen";');
  expect(siteLayout).toContain('import "../yobicon-font.css";');

  expect(fontFace).not.toMatch(
    /\[class\^="yobicon-"\]|\.yobicon-(?:lock|split):before|font-size:\s*0\.7em/u,
  );
  expect(focusedTest).not.toContain(["page", "addStyleTag"].join("."));
  expect(projectRowSource).toContain('data-owner="user-profile-project-avatar-link"');
  expect(projectRowSource).toContain('data-owner="user-profile-project-private-icon"');
  expect(projectRowSource).toContain('data-owner="user-profile-project-fork-icon"');
  // 667398a04 legacy-parity restore: ProfileProjectRow retains avatar-wrap small,
  // yobicon-* utility classes and the vmiddle/friends/eye-close/trash icons.
  expect(projectRowSource).toMatch(/\bavatar-wrap\b|\byobicon-small\b|\bvmiddle\b/u);
  expect(projectRowSource).toContain("yobicon-lock");
  expect(projectRowSource).toContain("yobicon-split yobicon-white");
  expect(projectRowSource).toContain('className="stats"');
  expect(projectRowSource).toContain("nbtn black medium last leaveProject");
  expect(projectRowSource).toMatch(/\byobicon-(?:friends|eye-open|eye-close|middle|trash)\b/u);

  const output = "output/playwright/style-user-profile-project-avatar-lock-fork-classes";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/yona/admin?selected=projects");
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
    );
    await expect(page.locator('link[href*="yobicon/style.css"]')).toHaveCount(0);
    expect(
      await page.locator("style").evaluateAll((nodes) =>
        nodes.some((node) => {
          const css = node.textContent || "";
          return (
            css.includes('[class^="yobicon-"]') ||
            css.includes(".yobicon-lock:before") ||
            css.includes(".yobicon-split:before")
          );
        }),
      ),
    ).toBe(false);
    await page.evaluate(() => document.fonts.load("16px yobicon"));
    expect(await page.evaluate(() => document.fonts.check("16px yobicon"))).toBe(true);

    const rows = page.locator('[data-owner="user-profile-project-row"]');
    const avatars = page.locator('[data-owner="user-profile-project-avatar-link"]');
    const privateIcon = rows.nth(0).locator('[data-owner="user-profile-project-private-icon"]');
    const forkIcon = rows.nth(1).locator('[data-owner="user-profile-project-fork-icon"]');
    await expect(rows).toHaveCount(3);
    for (const row of await rows.all()) {
      await expect(row).toHaveClass(/(?:^|\s)project(?:\s|$)/u);
    }
    await expect(avatars).toHaveCount(3);
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      const row = rows.nth(index);
      const avatar = avatars.nth(index);
      await expect(avatar).toHaveClass(/(?:^|\s)(?:avatar-wrap|small)(?:\s|$)/u);
      await expect(avatar).toHaveAttribute(
        "href",
        `/yona/${project.ownerName}/${project.projectName}`,
      );
      await expect(avatar.locator(":scope > img")).toHaveAttribute("src", project.logoUrl);
      await expect(avatar.locator(":scope > img")).toHaveAttribute("alt", "");
      // nth(N).locator(':scope …') aggregates all parents (documented harness
      // behavior); assert the direct stats child per row via evaluate instead.
      expect(
        await row.evaluate(
          (element) =>
            element.querySelectorAll(":scope > [data-owner='user-profile-project-stats'] > div")
              .length,
        ),
      ).toBe(1);
      await expect(row.locator('[data-owner="user-profile-project-name-tag"]')).toContainText(
        `${project.memberCount} ${project.ownerName} ${project.createdLabel}`,
      );
    }

    await expect(privateIcon).toHaveClass(/(?:^|\s)yobicon-lock(?:\s|$)/u);
    await expect(privateIcon).toHaveClass(/(?:^|\s)yobicon-small(?:\s|$)/u);
    await expect(
      rows.nth(1).locator('[data-owner="user-profile-project-private-icon"]'),
    ).toHaveCount(0);
    await expect(
      rows.nth(2).locator('[data-owner="user-profile-project-private-icon"]'),
    ).toHaveCount(0);
    await expect(forkIcon).toHaveClass(/(?:^|\s)yobicon-split(?:\s|$)/u);
    await expect(forkIcon).toHaveClass(/(?:^|\s)yobicon-white(?:\s|$)/u);
    await expect(forkIcon).toHaveClass(/(?:^|\s)vmiddle(?:\s|$)/u);
    await expect(rows.nth(0).locator('[data-owner="user-profile-project-fork-icon"]')).toHaveCount(
      0,
    );
    await expect(rows.nth(2).locator('[data-owner="user-profile-project-fork-icon"]')).toHaveCount(
      0,
    );
    await expect(
      rows.nth(1).locator('[data-owner="user-profile-project-origin-link"]'),
    ).toHaveAttribute("href", "/yona/origin-owner/origin-project");
    await expect(rows.nth(1).locator('[data-owner="user-profile-project-origin-link"]')).toHaveText(
      "origin-owner/origin-project",
    );
    await expect(
      rows.nth(1).locator('[data-owner="user-profile-project-watch-button"]'),
    ).toContainText("Unwatch4");
    await expect(
      rows.nth(1).locator('[data-owner="user-profile-project-leave-link"]'),
    ).toContainText("Leave");
    await expect(
      rows.nth(2).locator('[data-owner="user-profile-project-watch-button"]'),
    ).toContainText("Watch1");

    // Native <img> loads bypass the fetch mock (loadFixtureLogo precedent), so
    // swap the fixture logo for a data: URI before computed-size assertions.
    await page.evaluate(() => {
      const dataUri =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='45'/%3E";
      for (const img of document.querySelectorAll<HTMLImageElement>(
        '[data-owner="user-profile-project-avatar-link"] img',
      ))
        img.src = dataUri;
    });

    const metrics = await rows.evaluateAll((nodes) =>
      nodes.map((row) => {
        const avatar = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-avatar-link"]',
        )!;
        const image = avatar.querySelector<HTMLImageElement>(":scope > img")!;
        const header = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-header"]',
        )!;
        const privateIcon = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-private-icon"]',
        );
        const forkIcon = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-fork-icon"]',
        );
        const origin = row.querySelector<HTMLElement>(
          '[data-owner="user-profile-project-origin-link"]',
        );
        const stats = row.querySelector<HTMLElement>('[data-owner="user-profile-project-stats"]')!;
        const rect = (element: Element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        };
        const avatarBox = rect(avatar);
        const imageBox = rect(image);
        const rowBox = rect(row);
        const headerBox = rect(header);
        const statsBox = rect(stats);
        const avatarStyle = getComputedStyle(avatar);
        const imageStyle = getComputedStyle(image);
        return {
          avatarClassContract: {
            avatarWrap: avatar.classList.contains("avatar-wrap"),
            small: avatar.classList.contains("small"),
          },
          avatarStyle: {
            backgroundColor: avatarStyle.backgroundColor,
            borderRadius: avatarStyle.borderRadius,
            display: avatarStyle.display,
            height: avatarStyle.height,
            overflow: avatarStyle.overflow,
            verticalAlign: avatarStyle.verticalAlign,
            width: avatarStyle.width,
          },
          imageStyle: {
            verticalAlign: imageStyle.verticalAlign,
            width: imageStyle.width,
          },
          imageContained:
            imageBox.left >= avatarBox.left &&
            imageBox.right <= avatarBox.right &&
            imageBox.top >= avatarBox.top &&
            imageBox.bottom <= avatarBox.bottom,
          privateIcon: privateIcon
            ? {
                color: getComputedStyle(privateIcon).color,
                fontSize: getComputedStyle(privateIcon).fontSize,
                beforeContent: getComputedStyle(privateIcon, "::before").content,
                beforeFontFamily: getComputedStyle(privateIcon, "::before").fontFamily,
              }
            : null,
          forkIcon: forkIcon
            ? {
                verticalAlign: getComputedStyle(forkIcon).verticalAlign,
                beforeContent: getComputedStyle(forkIcon, "::before").content,
                beforeFontFamily: getComputedStyle(forkIcon, "::before").fontFamily,
                beforeOrigin:
                  origin !== null &&
                  Boolean(
                    forkIcon.compareDocumentPosition(origin) & Node.DOCUMENT_POSITION_FOLLOWING,
                  ),
              }
            : null,
          rowBox,
          headerBox,
          statsBox,
          noHeaderStatsOverlap:
            headerBox.right <= statsBox.left ||
            statsBox.right <= headerBox.left ||
            headerBox.bottom <= statsBox.top ||
            statsBox.bottom <= headerBox.top,
        };
      }),
    );

    expect(metrics).toHaveLength(3);
    for (const metric of metrics) {
      expect(metric.avatarClassContract).toEqual({ avatarWrap: true, small: true });
      expect(metric.avatarStyle).toEqual({
        backgroundColor: "rgb(221, 221, 221)",
        borderRadius: "3px",
        display: "inline-block",
        height: "24px",
        overflow: "hidden",
        verticalAlign: "middle",
        width: "24px",
      });
      expect(metric.imageStyle).toEqual({ verticalAlign: "top", width: "24px" });
      expect(metric.imageContained).toBe(true);
      expect(metric.rowBox.left).toBeGreaterThanOrEqual(0);
      expect(metric.rowBox.right).toBeLessThanOrEqual(viewport.width);
      expect(metric.headerBox.top).toBeGreaterThanOrEqual(metric.rowBox.top);
      expect(metric.headerBox.bottom).toBeLessThanOrEqual(metric.rowBox.bottom);
      expect(metric.statsBox.top).toBeGreaterThanOrEqual(metric.rowBox.top);
      expect(metric.statsBox.bottom).toBeLessThanOrEqual(metric.rowBox.bottom);
      expect(metric.noHeaderStatsOverlap).toBe(true);
    }
    expect(metrics[0].privateIcon).toEqual({
      color: "rgb(127, 140, 141)",
      fontSize: "14px",
      beforeContent: JSON.stringify(String.fromCodePoint(0xe21e)),
      beforeFontFamily: "yobicon",
    });
    expect(metrics[1].privateIcon).toBeNull();
    expect(metrics[2].privateIcon).toBeNull();
    expect(metrics[0].forkIcon).toBeNull();
    expect(metrics[1].forkIcon).toEqual({
      verticalAlign: "middle",
      beforeContent: JSON.stringify(String.fromCodePoint(0xe450)),
      beforeFontFamily: "yobicon",
      beforeOrigin: true,
    });
    expect(metrics[2].forkIcon).toBeNull();
    for (let index = 1; index < metrics.length; index += 1) {
      expect(metrics[index].rowBox.top).toBeGreaterThanOrEqual(metrics[index - 1].rowBox.bottom);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

    await page.mouse.move(0, 0);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
