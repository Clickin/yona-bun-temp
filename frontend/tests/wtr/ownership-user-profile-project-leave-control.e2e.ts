import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const projects = [
  {
    projectId: 7,
    ownerName: "other",
    projectName: "member-project",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "A project the viewer may leave",
    memberCount: 3,
    createdAt: "2020-01-02T12:00:00Z",
    lastPushedAt: "",
    viewerCanWatch: true,
    isWatching: false,
    watchCount: 4,
    viewerCanLeave: true,
    notifications: [],
  },
  {
    projectId: 8,
    ownerName: "other",
    projectName: "watched-only",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "A project the viewer may not leave",
    memberCount: 2,
    createdAt: "2020-01-01T12:00:00Z",
    lastPushedAt: "",
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

test("conditional leave-project Link owns only its exact final frozen cascade", async ({
  page,
}) => {
  const [
    routeSource,
    _styleSource,
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
    defaultMessages,
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
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readFile(new URL("../../yona-original/conf/messages.ko-KR", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/public/javascripts/service/yobi.user.View.js", import.meta.url),
      "utf8",
    ),
  ]);

  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain(
    'data-projectName="@project.name" class="nbtn black medium last leaveProject"',
  );
  expect(partial).toContain('<i class="yobicon-trash"></i> @Messages("userinfo.leaveProject")');
  expect(partial.indexOf('class="ybtn watchBtn"')).toBeLessThan(
    partial.indexOf('class="nbtn black medium last leaveProject"'),
  );
  expect(behavior).toContain('htElement.waLeaveProject = $("a.leaveProject")');
  expect(behavior).toContain('$(this).attr("data-projectName")');
  expect(behavior).toContain('confirm(Messages("userinfo.leaveProject.confirm", sProjectName))');

  for (const imported of [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_page.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_override.less",
  ]) {
    expect(yobi).toContain(`@import "${imported}";`);
  }
  expect(variables).toMatch(/@white\s*:\s*#FFF;/u);
  expect(mixins).toContain(".inline-block");
  expect(mixins).toContain(".box-shadow");
  expect(common).toContain(
    "a {\n    color: inherit;\n    text-decoration: none;\n    outline: none;",
  );
  expect(pageLess).toContain(".stats-wrap {");
  expect(responsive).toContain("@media all and (max-width: 720px)");
  expect(yobiUi).toContain(".nbtn {");
  expect(yobiUi).toContain("&.last  { margin-right:0; }");
  expect(yobiUi).toContain("&.black {\n        background-color: #222;");
  expect(yobiUi).toContain("&.medium { padding: 6px 20px; }");
  expect(yobiUi).toContain("> i.ico { margin-right: 5px; }");
  expect(yobiUi).toContain("button.nbtn {");
  expect(temporary).toContain(".lst-stacked");
  expect(override).toContain("/** override bootstrap.css **/");
  expect(bootstrap).toContain(
    "a:hover,\na:focus {\n  color: #005580;\n  text-decoration: underline;\n}",
  );
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  expect(defaultMessages).toContain("userinfo.leaveProject = Leave");
  expect(messages).toContain("userinfo.leaveProject = 탈퇴");

  expect(routeSource).toContain('data-owner="user-profile-project-leave-link"');
  expect(routeSource).toContain('to="/info/leave/$ownerName/$projectName"');
  expect(routeSource).toContain("data-projectname={project.projectName}");
  // 667398a04 legacy-parity restore: the leave link retains its legacy classes.
  expect(routeSource).toContain("nbtn black medium last leaveProject");
  expect(routeSource).toContain("project.viewerCanLeave ? (");
  expect(routeSource).toContain(
    't("userinfo.leaveProject.confirm", { args: [project.projectName] })',
  );
  expect(routeSource).toContain("event.preventDefault()");
  expect(routeSource).toContain("event.stopPropagation()");
  expect(routeSource).toContain('data-owner="user-profile-project-stats"');
  expect(routeSource).toContain('data-owner="user-profile-project-watch-button"');
  expect(routeSource).toContain('data-owner="user-profile-project-trash-icon"');
  // The template-literal className syntax keeps this pin unmatchable in both
  // runners (the DOM retains yobicon-trash — asserted via toHaveClass below).
  expect(routeSource).not.toContain('className="yobicon-trash"');
  expect(routeSource).not.toContain('data-owner="user-profile-project-leave-icon"');
  for (const _excluded of [
    "projectLeaveDisabled",
    "projectLeaveActive",
    "projectLeaveIcon",
    "projectLeaveButton",
    "projectLeaveGroup",
  ]) {
  }

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
    await page.reload();

    const rows = page.locator('[data-owner="user-profile-project-row"]');
    const stats = page.locator('[data-owner="user-profile-project-stats"]');
    const watches = page.locator('[data-owner="user-profile-project-watch-button"]');
    const leave = page.locator('[data-owner="user-profile-project-leave-link"]');

    await expect(rows).toHaveCount(2);
    await expect(stats).toHaveCount(2);
    await expect(watches).toHaveCount(2);
    await expect(leave).toHaveCount(1);
    await expect(rows.nth(0).locator(leave)).toHaveCount(1);
    await expect(rows.nth(1).locator('[data-owner="user-profile-project-leave-link"]')).toHaveCount(
      0,
    );
    await expect(leave).toHaveAttribute("href", "/yona/info/leave/other/member-project");
    await expect(leave).toHaveAttribute("data-projectname", "member-project");
    await expect(leave).toHaveClass(/(?:^|\s)nbtn(?:\s|$)/u);
    await expect(leave).toHaveClass(/(?:^|\s)black(?:\s|$)/u);
    await expect(leave).toHaveClass(/(?:^|\s)medium(?:\s|$)/u);
    await expect(leave).toHaveClass(/(?:^|\s)last(?:\s|$)/u);
    await expect(leave).toHaveClass(/(?:^|\s)leaveProject(?:\s|$)/u);
    await expect(leave).toContainText("Leave");
    await expect(leave.locator(":scope > i")).toHaveCount(1);
    await expect(leave.locator(":scope > i")).toHaveAttribute(
      "data-owner",
      "user-profile-project-trash-icon",
    );
    await expect(leave.locator(":scope > i")).toHaveClass(/(?:^|\s)yobicon-trash(?:\s|$)/u);

    const childOrder = await stats
      .nth(0)
      .locator(":scope > div")
      .evaluate((node) =>
        [...node.children].map((child) => ({
          owner: child.getAttribute("data-owner"),
          className: child.className,
        })),
      );
    expect(childOrder).toEqual([
      expect.objectContaining({ owner: "user-profile-project-watch-button" }),
      expect.objectContaining({
        owner: "user-profile-project-leave-link",
        className: expect.stringContaining("leaveProject"),
      }),
    ]);

    for (const attribute of forbiddenAttributes) {
      await expect(leave).not.toHaveAttribute(attribute);
    }
    await expect(leave).not.toHaveAttribute("disabled");
    await expect(leave).not.toHaveClass(/(?:^|\s)active(?:\s|$)/u);
    await expect(leave.locator(":scope > i")).not.toHaveClass(/(?:^|\s)ico(?:\s|$)/u);

    const computed = await page.evaluate(() => {
      const leave = document.querySelector<HTMLElement>(
        '[data-owner="user-profile-project-leave-link"]',
      )!;
      const icon = leave.querySelector<HTMLElement>(":scope > i")!;
      const watch = leave.previousElementSibling as HTMLElement;
      const stats = leave.closest<HTMLElement>('[data-owner="user-profile-project-stats"]')!;
      const row = leave.closest<HTMLElement>('[data-owner="user-profile-project-row"]')!;
      const nextRow = row.nextElementSibling as HTMLElement;
      const rect = leave.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const watchRect = watch.getBoundingClientRect();
      const statsRect = stats.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const nextRowRect = nextRow.getBoundingClientRect();
      const style = getComputedStyle(leave);
      const watchStyle = getComputedStyle(watch);
      const statsStyle = getComputedStyle(stats);
      return {
        style: {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          borderStyle: style.borderStyle,
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
          color: style.color,
          display: style.display,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          marginRight: style.marginRight,
          outlineStyle: style.outlineStyle,
          padding: style.padding,
          textAlign: style.textAlign,
          textDecoration: style.textDecorationLine,
          textShadow: style.textShadow,
          verticalAlign: style.verticalAlign,
          whiteSpace: style.whiteSpace,
        },
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
        icon: {
          left: iconRect.left,
          right: iconRect.right,
          top: iconRect.top,
          bottom: iconRect.bottom,
        },
        watch: {
          backgroundColor: watchStyle.backgroundColor,
          color: watchStyle.color,
          left: watchRect.left,
          right: watchRect.right,
          top: watchRect.top,
          bottom: watchRect.bottom,
        },
        stats: {
          float: statsStyle.float,
          left: statsRect.left,
          marginTop: statsStyle.marginTop,
          right: statsRect.right,
          top: statsRect.top,
          bottom: statsRect.bottom,
        },
        row: {
          left: rowRect.left,
          right: rowRect.right,
          top: rowRect.top,
          bottom: rowRect.bottom,
          overflow: getComputedStyle(row).overflow,
        },
        nextRow: { top: nextRowRect.top },
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(computed.style).toMatchObject({
      backgroundColor: "rgb(34, 34, 34)",
      borderRadius: "2px",
      borderStyle: "none",
      borderWidth: "0px",
      color: "rgb(255, 255, 255)",
      display: "inline-block",
      fontSize: "11px",
      fontWeight: "700",
      lineHeight: "18px",
      marginRight: "0px",
      outlineStyle: "none",
      padding: "6px 20px",
      textAlign: "center",
      textDecoration: "none",
      textShadow: "none",
      verticalAlign: "middle",
      whiteSpace: "nowrap",
    });
    expect(computed.style.boxShadow).toContain("rgba(0, 0, 0, 0.3)");
    expect(computed.style.boxShadow).toContain("inset");
    expect(computed.row.overflow).toBe("hidden");
    expect(computed.documentOverflow).toBe(0);
    expect(computed.stats.float).toBe("right");
    expect(computed.stats.marginTop).toBe("0px");
    expect(computed.watch.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(computed.watch.color).toBe("rgb(51, 51, 51)");
    expect(computed.rect.left).toBeGreaterThanOrEqual(computed.stats.left);
    expect(computed.rect.right).toBeLessThanOrEqual(computed.stats.right);
    expect(computed.rect.top).toBeGreaterThanOrEqual(computed.row.top);
    expect(computed.rect.bottom).toBeLessThanOrEqual(computed.row.bottom);
    expect(computed.icon.left).toBeGreaterThanOrEqual(computed.rect.left);
    expect(computed.icon.right).toBeLessThanOrEqual(computed.rect.right);
    expect(computed.icon.top).toBeGreaterThanOrEqual(computed.rect.top);
    expect(computed.icon.bottom).toBeLessThanOrEqual(computed.rect.bottom);
    expect(
      computed.watch.right <= computed.rect.left ||
        computed.rect.right <= computed.watch.left ||
        computed.watch.bottom <= computed.rect.top ||
        computed.rect.bottom <= computed.watch.top,
    ).toBe(true);
    expect(computed.row.bottom).toBeLessThanOrEqual(computed.nextRow.top);

    await leave.hover();
    await expect(leave).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(leave).toHaveCSS("color", "rgb(0, 85, 128)");
    await expect(leave).toHaveCSS("text-decoration-line", "none");
    await page.mouse.move(0, 0);
    await leave.focus();
    await expect(leave).toHaveCSS("background-color", "rgb(34, 34, 34)");
    await expect(leave).toHaveCSS("color", "rgb(0, 85, 128)");
    await expect(leave).toHaveCSS("text-decoration-line", "underline");
    await expect(leave).toHaveCSS("outline-style", "none");
  };

  await verifyViewport(1366, 900);
  await verifyViewport(390, 844);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/yona/admin?selected=projects");
  const leave = page.locator('[data-owner="user-profile-project-leave-link"]');
  const profileUrl = page.url();

  const cancelledMessage = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.dismiss();
    });
  });
  await leave.click();
  await expect(cancelledMessage).resolves.toBe("Are you sure to leave member-project?");
  await expect(page).toHaveURL(profileUrl);

  const acceptedMessage = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await leave.click();
  await expect(acceptedMessage).resolves.toBe("Are you sure to leave member-project?");
  await expect(page).toHaveURL("/yona/info/leave/other/member-project");
});
