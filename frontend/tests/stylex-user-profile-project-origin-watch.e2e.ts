import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

const projects = [
  {
    projectId: 7,
    ownerName: "other",
    projectName: "forked",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Forked project",
    memberCount: 3,
    createdLabel: "today",
    viewerCanWatch: true,
    isWatching: true,
    watchCount: 4,
    viewerCanLeave: false,
    originOwnerName: "upstream",
    originProjectName: "source",
    notifications: [],
  },
  {
    projectId: 8,
    ownerName: "other",
    projectName: "plain",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Plain project",
    memberCount: 2,
    createdLabel: "yesterday",
    viewerCanWatch: true,
    isWatching: false,
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

test("profile project origin and watch controls own their exact final frozen cascade", async ({
  page,
}) => {
  const [
    routeSource,
    styleSource,
    view,
    partial,
    yobi,
    variables,
    mixins,
    common,
    pageLess,
    responsive,
    yobiUi,
    temporary,
    override,
    bootstrap,
    bootstrapResponsive,
    appCss,
    defaultMessages,
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
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_mixins.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
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
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readFile(new URL("../../yona-original/conf/messages.ko-KR", import.meta.url), "utf8"),
  ]);

  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain(
    '<span> <a href="@routes.ProjectApp.project(project.originalProject.owner, project.originalProject.name)">@project.originalProject.owner/@project.originalProject.name</a></span>',
  );
  expect(partial).toContain('class="ybtn watchBtn"');
  expect(partial).toContain("yobicon-eye-open yobicon-middle yobicon-white");
  expect(partial).toContain("yobicon-eye-close yobicon-middle yobicon-white");
  expect(partial).toContain('<span class="num-badge">@project.getWatchingCount</span>');
  expect(partial.indexOf("yobicon-eye-open")).toBeLessThan(
    partial.indexOf('@Messages("notification.unwatch")'),
  );
  expect(partial.indexOf('@Messages("notification.unwatch")')).toBeLessThan(
    partial.indexOf('<span class="num-badge">'),
  );

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
  for (const [index, imported] of imports.entries()) {
    expect(yobi).toContain(`@import "${imported}";`);
    if (index > 0) {
      expect(yobi.indexOf(imports[index - 1])).toBeLessThan(yobi.indexOf(imported));
    }
  }
  expect(variables).toContain("@base-font-family:");
  expect(variables).toContain("@yobi-btn-default : @yobi-white;");
  expect(mixins).toContain(".border-radius");
  expect(common).toContain(
    "a {\n    color: inherit;\n    text-decoration: none;\n    outline: none;",
  );
  expect(common).toContain(
    ".yobicon-middle{\n    vertical-align: bottom;\n    margin-bottom: 3px;\n}",
  );
  expect(pageLess).toContain(".stats-wrap {");
  expect(pageLess).toContain("margin-top: 0px;");
  expect(responsive).toContain("@media all and (max-width: 720px)");
  expect(yobiUi).toContain(".num-badge {");
  expect(yobiUi).toContain(".num-badge { background-color:#fff; color:@blue2; }");
  expect(yobiUi).toContain(".ybtn, .flat > li > .ybtn");
  expect(yobiUi).toContain("i { line-height:20px;}");
  expect(temporary).toContain(".lst-stacked");
  expect(temporary).toContain(".num-badge { padding:0 2px; }");
  expect(override).toContain("/** override bootstrap.css **/");
  expect(bootstrap).toContain(
    "a:hover,\na:focus {\n  color: #005580;\n  text-decoration: underline;\n}",
  );
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  expect(bootstrap).not.toMatch(/\.num-badge(?:[\s,{:.]|$)/u);
  expect(bootstrapResponsive).not.toMatch(/\.num-badge(?:[\s,{:.]|$)/u);
  expect(appCss).toContain(".lst-stacked li .num-badge {");
  expect(appCss).toContain(".lst-stacked li.active .num-badge {");
  expect(defaultMessages).toContain("notification.unwatch = Unwatch");
  expect(defaultMessages).toContain("notification.watch = Watch");
  expect(messages).toContain("notification.unwatch = 그만 지켜보기");
  expect(messages).toContain("notification.watch = 지켜보기");

  for (const owner of [
    "projectOriginLink",
    "projectWatchButton",
    "projectWatchIcon",
    "projectWatchBadge",
  ]) {
    expect(styleSource).toContain(`${owner}: {`);
  }
  for (const owner of [
    "user-profile-project-origin-link",
    "user-profile-project-watch-button",
    "user-profile-project-watch-icon",
    "user-profile-project-watch-badge",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('data-stylex-owner="user-profile-project-leave-link"');
  expect(routeSource).not.toContain(
    "className={`${stylex.props(styles.projectWatchBadge).className} num-badge`}",
  );

  const forbiddenAttributes = [
    "style",
    "data-toggle",
    "data-placement",
    "data-action",
    "data-href",
    "data-url",
    "data-request-method",
    "data-dismiss",
    "data-target",
    "data-trigger",
    "data-backdrop",
    "data-spy",
    "data-provider",
    "data-loading-text",
  ];

  const verifyViewport = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.goto("/yona/admin?selected=projects");

    const rows = page.locator('[data-stylex-owner="user-profile-project-row"]');
    const origin = page.locator('[data-stylex-owner="user-profile-project-origin-link"]');
    const buttons = page.locator('[data-stylex-owner="user-profile-project-watch-button"]');
    const icons = page.locator('[data-stylex-owner="user-profile-project-watch-icon"]');
    const badges = page.locator('[data-stylex-owner="user-profile-project-watch-badge"]');

    await expect(rows).toHaveCount(2);
    await expect(origin).toHaveCount(1);
    await expect(buttons).toHaveCount(2);
    await expect(icons).toHaveCount(2);
    await expect(badges).toHaveCount(2);
    await expect(origin).toHaveText("upstream/source");
    await expect(origin).toHaveAttribute("href", "/yona/upstream/source");
    await expect(
      rows.nth(1).locator('[data-stylex-owner="user-profile-project-origin-link"]'),
    ).toHaveCount(0);

    await expect(buttons.nth(0)).toHaveAttribute("href", "/yona/other/forked/unwatch");
    await expect(buttons.nth(1)).toHaveAttribute("href", "/yona/other/plain/watch");
    await expect(buttons.nth(0)).toContainText("Unwatch");
    await expect(buttons.nth(1)).toContainText("Watch");
    await expect(buttons.nth(0)).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    await expect(buttons.nth(0)).toHaveClass(/(?:^|\s)watchBtn(?:\s|$)/u);
    await expect(icons.nth(0)).toHaveClass(/yobicon-eye-open/u);
    await expect(icons.nth(1)).toHaveClass(/yobicon-eye-close/u);
    await expect(icons.nth(0)).toHaveClass(/yobicon-middle/u);
    await expect(icons.nth(0)).toHaveClass(/yobicon-white/u);
    await expect(badges).toHaveText(["4", "2"]);
    await expect(badges.nth(0)).not.toHaveClass(/(?:^|\s)num-badge(?:\s|$)/u);
    await expect(badges.nth(1)).not.toHaveClass(/(?:^|\s)num-badge(?:\s|$)/u);

    const firstChildren = await buttons.nth(0).evaluate((node) =>
      [...node.children].map((child) => ({
        tag: child.tagName,
        className: child.className,
        text: child.textContent,
      })),
    );
    expect(firstChildren).toEqual([
      expect.objectContaining({ tag: "I", className: expect.stringContaining("yobicon-eye-open") }),
      expect.objectContaining({
        tag: "SPAN",
        className: expect.not.stringMatching(/(?:^|\s)num-badge(?:\s|$)/u),
        text: "4",
      }),
    ]);

    for (const element of [
      origin,
      ...[0, 1].flatMap((index) => [buttons.nth(index), icons.nth(index), badges.nth(index)]),
    ]) {
      for (const attribute of forbiddenAttributes) {
        await expect(element).not.toHaveAttribute(attribute);
      }
    }

    const computed = await page.evaluate(() => {
      const css = (selector: string) => {
        const node = document.querySelector<HTMLElement>(selector)!;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const row = node.closest(".project")!.getBoundingClientRect();
        const button = node.closest(".watchBtn")?.getBoundingClientRect() ?? null;
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          borderStyle: style.borderStyle,
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
          cursor: style.cursor,
          display: style.display,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          marginBottom: style.marginBottom,
          marginLeft: style.marginLeft,
          outlineStyle: style.outlineStyle,
          padding: style.padding,
          position: style.position,
          textAlign: style.textAlign,
          textDecoration: style.textDecorationLine,
          textShadow: style.textShadow,
          verticalAlign: style.verticalAlign,
          whiteSpace: style.whiteSpace,
          zIndex: style.zIndex,
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          row: { left: row.left, right: row.right, top: row.top, bottom: row.bottom },
          button: button
            ? { left: button.left, right: button.right, top: button.top, bottom: button.bottom }
            : null,
          rowOverflow: getComputedStyle(node.closest<HTMLElement>(".project")!).overflow,
        };
      };
      return {
        origin: css('[data-stylex-owner="user-profile-project-origin-link"]'),
        button: css('[data-stylex-owner="user-profile-project-watch-button"]'),
        icon: css('[data-stylex-owner="user-profile-project-watch-icon"]'),
        badge: css('[data-stylex-owner="user-profile-project-watch-badge"]'),
        rows: [
          ...document.querySelectorAll<HTMLElement>(
            '[data-stylex-owner="user-profile-project-row"]',
          ),
        ].map((row) => {
          const rect = row.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        }),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(computed.origin).toMatchObject({
      color: "rgb(51, 51, 51)",
      outlineStyle: "none",
      textDecoration: "none",
    });
    expect(computed.button).toMatchObject({
      color: "rgb(51, 51, 51)",
      backgroundColor: "rgb(255, 255, 255)",
      borderRadius: "3px",
      borderStyle: "solid",
      borderWidth: "1px",
      cursor: "pointer",
      display: "inline-block",
      fontSize: "14px",
      lineHeight: "20px",
      marginBottom: "0px",
      marginLeft: "0px",
      outlineStyle: "none",
      padding: "4px 12px",
      position: "relative",
      textAlign: "center",
      textDecoration: "none",
      textShadow: "none",
      verticalAlign: "middle",
      whiteSpace: "nowrap",
      zIndex: "2",
    });
    expect(computed.button.borderColor).toBe("rgba(0, 0, 0, 0.15)");
    expect(computed.button.boxShadow).toContain("rgba(0, 0, 0, 0.05)");
    expect(computed.icon).toMatchObject({
      lineHeight: "20px",
      marginBottom: "3px",
      verticalAlign: "bottom",
    });
    expect(computed.badge).toMatchObject({
      borderRadius: "2px",
      fontSize: "13px",
      fontWeight: "700",
      marginLeft: "3px",
      padding: "2px 4px",
      textShadow: "none",
      verticalAlign: "top",
    });
    expect(computed.badge.fontFamily).toContain("-apple-system");
    expect(computed.overflow).toBe(0);
    expect(computed.rows).toHaveLength(2);
    expect(computed.rows[0].bottom).toBeLessThanOrEqual(computed.rows[1].top);
    expect(computed.button.rowOverflow).toBe("hidden");
    for (const item of [computed.origin, computed.button]) {
      expect(item.rect.left).toBeGreaterThanOrEqual(item.row.left);
      expect(Math.min(item.rect.right, item.row.right)).toBeLessThanOrEqual(item.row.right);
    }
    for (const item of [computed.icon, computed.badge]) {
      expect(item.button).not.toBeNull();
      expect(item.rect.left).toBeGreaterThanOrEqual(item.button!.left);
      expect(item.rect.right).toBeLessThanOrEqual(item.button!.right);
      expect(item.rect.top).toBeGreaterThanOrEqual(item.button!.top);
      expect(item.rect.bottom).toBeLessThanOrEqual(item.button!.bottom);
    }
    for (const item of [computed.origin, computed.button]) {
      expect(item.rect.left).toBeGreaterThanOrEqual(item.row.left);
      expect(item.rect.top).toBeGreaterThanOrEqual(item.row.top);
      expect(item.rect.bottom).toBeLessThanOrEqual(item.row.bottom);
    }

    const screenshotDirectory = new URL(
      "../output/playwright/stylex-user-profile-project-watch-badge-class/",
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

    await origin.hover();
    await expect(origin).toHaveCSS("color", "rgb(0, 85, 128)");
    await expect(origin).toHaveCSS("text-decoration-line", "underline");
    await origin.focus();
    await expect(origin).toHaveCSS("color", "rgb(0, 85, 128)");
    await expect(origin).toHaveCSS("text-decoration-line", "underline");
    await expect(origin).toHaveCSS("outline-style", "none");

    const button = buttons.nth(0);
    await button.hover();
    await expect(button).toHaveCSS("background-color", "rgb(241, 241, 241)");
    await expect(button).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
    await expect(button).toHaveCSS("color", "rgb(41, 41, 41)");
    await expect(button).toHaveCSS("text-decoration-line", "none");
    await button.focus();
    await expect(button).toHaveCSS("background-color", "rgb(241, 241, 241)");
    await expect(button).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
    await expect(button).toHaveCSS("color", "rgb(41, 41, 41)");
    await expect(button).toHaveCSS("outline-style", "none");

    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await expect(button).toHaveCSS("background-color", "rgb(241, 241, 241)");
    await expect(button).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
    await expect(button).toHaveCSS("color", "rgb(41, 41, 41)");
    await page.mouse.up();
  };

  await verifyViewport(1366, 900);
  await verifyViewport(390, 844);
});
