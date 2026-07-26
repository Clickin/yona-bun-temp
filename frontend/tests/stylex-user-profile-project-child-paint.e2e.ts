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
            ownerName: "public-owner",
            projectName: "public-project",
            projectScope: "public",
            logoUrl: "/assets/images/project_default_logo.png",
            overview: "Public project",
            memberCount: 2,
            createdLabel: "yesterday",
            viewerCanWatch: false,
            isWatching: false,
            watchCount: 1,
            viewerCanLeave: false,
            notifications: [],
          },
        ],
        pullRequestItems: [],
      },
    }),
  );
});

test("Projects tab owns only the applied private icon and project avatar paint", async ({
  page,
}) => {
  const routeSource = await readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  const styleSource = await readFile(
    new URL("../src/routes/-user-profile.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = await readFile(
    new URL("../../yona-original/app/views/user/partial_projectlist.scala.html", import.meta.url),
    "utf8",
  );
  const legacyRoot = await readFile(
    new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
    "utf8",
  );
  const yobiLess = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
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
  const yobiUiLess = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
    "utf8",
  );
  const responsiveLess = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
    "utf8",
  );
  const overrideLess = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_override.less", import.meta.url),
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
  const messages = await readFile(
    new URL("../../yona-original/conf/messages", import.meta.url),
    "utf8",
  );

  expect(legacyRoot).toContain('<li class="@isActiveTab("projects")">');
  expect(legacyRoot).toContain('<div id="projects" class="tab-pane @isActiveTab("projects")">');
  expect(legacyRoot).toContain('<ul class="user-streams all-projects">');
  expect(legacyRoot).toContain("@partial_projectlist(project, user)");
  expect(legacyRoot.indexOf('<div id="projects"')).toBeLessThan(
    legacyRoot.indexOf('<ul class="user-streams all-projects">'),
  );
  expect(legacyRoot.indexOf('<ul class="user-streams all-projects">')).toBeLessThan(
    legacyRoot.indexOf("@partial_projectlist(project, user)"),
  );
  expect(legacy).toContain('<div class="header">');
  expect(legacy.indexOf('<div class="pull-left">')).toBeLessThan(
    legacy.indexOf('<div class="pull-left" style="margin-left: 10px;">'),
  );
  expect(legacy.indexOf('class="avatar-wrap small"')).toBeLessThan(
    legacy.indexOf('<div class="header">'),
  );
  expect(legacy.indexOf('class="project-name"')).toBeLessThan(
    legacy.indexOf('class="yobicon-lock yobicon-small"'),
  );
  expect(legacy).toContain('@if(project.isPrivate){ <i class="yobicon-lock yobicon-small"></i> }');
  expect(legacy.indexOf('<div class="name-tag">')).toBeLessThan(
    legacy.indexOf('class="owner-name-small"'),
  );
  expect(legacy.indexOf('class="owner-name-small"')).toBeLessThan(
    legacy.indexOf('<span title="@getDateString(project.createdDate)">'),
  );
  expect(legacy).toContain('class="owner-name-small"');
  const importOrder = [
    '@import "less/_common.less";',
    '@import "less/_page.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_override.less";',
  ].map((statement) => yobiLess.indexOf(statement));
  expect(importOrder.every((index) => index >= 0)).toBe(true);
  expect(importOrder).toEqual([...importOrder].sort((left, right) => left - right));
  expect(pageLess).toContain(".yobicon-lock { color:#7F8C8D;}");
  expect(pageLess).toContain(".owner-name-small{ color:#999; font-size: 19px; }");
  expect(commonLess).toContain("&.small { width:24px; height:24px;");
  expect(responsiveLess).toContain("@media");
  expect(yobiUiLess).toContain("vertical-align:middle;");
  expect(yobiUiLess).toContain("background:#ddd;");
  expect(yobiUiLess).toContain(".border-radius(3px) !important;");
  expect(overrideLess).toContain("/** override bootstrap.css **/");
  expect(overrideLess).toContain(".avatar-wrap { margin-top:0; }");
  expect(bootstrap).toContain(".pull-left {");
  expect(bootstrap).toContain("float: left;");
  expect(bootstrap).toContain("img {");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  expect(bootstrapResponsive).toContain("box-sizing: border-box;");
  expect(messages).toContain(
    'project.onmember = <i class="yobicon-friends yobicon-middle"></i><strong>{0}</strong>',
  );
  expect(messages).toContain("project.codeUpdate = Latest code update");
  expect(styleSource).toContain("projectPrivateIcon");
  expect(styleSource).toContain('color: "#7F8C8D"');
  expect(styleSource).toContain("projectAvatarLink");
  expect(routeSource).toContain('data-stylex-owner="user-profile-project-private-icon"');
  expect(routeSource).toContain('data-stylex-owner="user-profile-project-avatar-link"');
  expect(routeSource).not.toMatch(
    /owner-name-small"[^>]*data-stylex-owner|data-stylex-owner[^>]*owner-name-small"/u,
  );

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/yona/admin?selected=projects");

  const rows = page.locator('[data-stylex-owner="user-profile-project-row"]');
  await expect(rows).toHaveCount(2);
  const privateRow = rows.nth(0);
  const publicRow = rows.nth(1);
  const privateIcon = privateRow.locator('[data-stylex-owner="user-profile-project-private-icon"]');
  await expect(privateIcon).toHaveCount(1);
  await expect(
    publicRow.locator('[data-stylex-owner="user-profile-project-private-icon"]'),
  ).toHaveCount(0);
  await expect(privateIcon).toHaveClass(/yobicon-lock/u);
  await expect(privateIcon).toHaveClass(/yobicon-small/u);
  await expect(privateRow.locator(".header > .project-name + i")).toBeAttached();
  await expect(privateRow.locator(".name-tag")).toContainText(
    "3 private-owner today, Latest code update an hour ago",
  );
  await expect(privateRow.locator(".name-tag .owner-name-small")).toHaveText("private-owner");
  await expect(privateRow.locator(".owner-name-small[data-stylex-owner]")).toHaveCount(0);

  const forbiddenAttributes = [
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
    "pjax-container",
    "data-type",
  ];
  for (const owner of ["user-profile-project-private-icon", "user-profile-project-avatar-link"]) {
    const targets = page.locator(`[data-stylex-owner="${owner}"]`);
    const forbiddenUsage = await targets.evaluateAll(
      (elements, attributes) =>
        elements.map((element) => ({
          inlineStyle: element.hasAttribute("style"),
          pluginAttributes: attributes.filter((attribute) => element.hasAttribute(attribute)),
        })),
      forbiddenAttributes,
    );
    expect(forbiddenUsage.length).toBeGreaterThan(0);
    expect(forbiddenUsage).toEqual(
      forbiddenUsage.map(() => ({ inlineStyle: false, pluginAttributes: [] })),
    );
  }

  for (const [row, ownerName, projectName] of [
    [privateRow, "private-owner", "private-project"],
    [publicRow, "public-owner", "public-project"],
  ] as const) {
    const avatar = row.locator('[data-stylex-owner="user-profile-project-avatar-link"]');
    await expect(avatar).toHaveClass(/avatar-wrap/u);
    await expect(avatar).toHaveClass(/small/u);
    await expect(avatar).toHaveAttribute("href", `/yona/${ownerName}/${projectName}`);
    await expect(avatar.locator("img")).toHaveCount(1);
    const structure = await row.evaluate((element) => {
      const infoWrap = element.querySelector(".info-wrap")!;
      const avatarRail = element.querySelector(
        '[data-stylex-owner="user-profile-project-avatar-rail"]',
      )!;
      const projectInfo = element.querySelector('[data-stylex-owner="user-profile-project-info"]')!;
      const avatarLink = element.querySelector(
        '[data-stylex-owner="user-profile-project-avatar-link"]',
      )!;
      const projectNameLink = element.querySelector(".header > .project-name")!;
      const privateIcon = element.querySelector(
        '[data-stylex-owner="user-profile-project-private-icon"]',
      );
      const nameTag = element.querySelector(".name-tag")!;
      const owner = nameTag.querySelector(".owner-name-small")!;
      const date = owner.nextElementSibling!;
      return {
        avatarRailBeforeInfo: Boolean(
          avatarRail.compareDocumentPosition(projectInfo) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        bothInsideInfoWrap: infoWrap.contains(avatarRail) && infoWrap.contains(projectInfo),
        imageFirst: avatarLink.firstElementChild?.tagName === "IMG",
        projectNameBeforePrivateIcon:
          privateIcon === null ||
          Boolean(
            projectNameLink.compareDocumentPosition(privateIcon) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        ownerBeforeDate: Boolean(
          owner.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        ownerAndDateInsideNameTag: nameTag.contains(owner) && nameTag.contains(date),
      };
    });
    expect(structure).toEqual({
      avatarRailBeforeInfo: true,
      bothInsideInfoWrap: true,
      imageFirst: true,
      projectNameBeforePrivateIcon: true,
      ownerBeforeDate: true,
      ownerAndDateInsideNameTag: true,
    });
  }

  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const values = await privateRow.evaluate((row) => {
      const icon = row.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-project-private-icon"]',
      )!;
      const avatar = row.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-project-avatar-link"]',
      )!;
      const image = avatar.querySelector("img")!;
      const rowRect = row.getBoundingClientRect();
      const avatarRect = avatar.getBoundingClientRect();
      const iconStyle = getComputedStyle(icon);
      const avatarStyle = getComputedStyle(avatar);
      return {
        icon: {
          color: iconStyle.color,
          inline: icon.hasAttribute("style"),
          parentClass: icon.parentElement?.className ?? "",
        },
        avatar: {
          width: avatarStyle.width,
          height: avatarStyle.height,
          display: avatarStyle.display,
          verticalAlign: avatarStyle.verticalAlign,
          overflow: avatarStyle.overflow,
          backgroundColor: avatarStyle.backgroundColor,
          borderRadius: avatarStyle.borderRadius,
          inline: avatar.hasAttribute("style"),
          imageFirst: avatar.firstElementChild === image,
          left: avatarRect.left,
          right: avatarRect.right,
        },
        row: { left: rowRect.left, right: rowRect.right },
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    expect(values.icon).toEqual({
      color: "rgb(127, 140, 141)",
      inline: false,
      parentClass: expect.stringContaining("header"),
    });
    expect(values.avatar).toMatchObject({
      width: "24px",
      height: "24px",
      display: "inline-block",
      verticalAlign: "middle",
      overflow: "hidden",
      backgroundColor: "rgb(221, 221, 221)",
      borderRadius: "3px",
      inline: false,
      imageFirst: true,
    });
    expect(values.avatar.left).toBeGreaterThanOrEqual(values.row.left);
    expect(values.avatar.right).toBeLessThanOrEqual(values.row.right);
    expect(values.row.right).toBeLessThanOrEqual(width);
    expect(values.documentWidth).toBe(width);
  }
});
