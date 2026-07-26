import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

const projects = [
  {
    projectId: 7,
    ownerName: "private-owner",
    projectName: "private-project",
    projectScope: "private",
    logoUrl: "",
    overview: "Private project overview",
    memberCount: 3,
    createdLabel: "today",
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
    logoUrl: "",
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
    logoUrl: "",
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

test("Projects residual member, watch, and trash icons are direct StyleX owners", async ({
  page,
}) => {
  test.setTimeout(60_000);
  expect(process.env.VITE_DISABLE_LEGACY_FALLBACK).toBe("1");
  expect(process.env.YONA_E2E_FALLBACK_MODE).toBe("fallback-off");
  expect(process.env.PW_CHANNEL).toBe("chrome");

  const [route, styles, view, partial, messages, yobicon, common, yobiUi, focusedTest] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/views/user/partial_projectlist.scala.html",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
      readFile(
        new URL("../../yona-original/public/stylesheets/yobicon/style.css", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
        "utf8",
      ),
      readFile(new URL(import.meta.url), "utf8"),
    ]);

  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain('@Html(Messages("project.onmember"');
  expect(messages).toContain(
    'project.onmember = <i class="yobicon-friends yobicon-middle"></i><strong>{0}</strong>',
  );
  expect(partial).toContain("yobicon-eye-open yobicon-middle yobicon-white");
  expect(partial).toContain("yobicon-eye-close yobicon-middle yobicon-white");
  expect(partial).toContain('<i class="yobicon-trash"></i>');
  expect(yobicon).toContain(
    '[class^="yobicon-"],\n[class*=" yobicon-"] {\n    font-family: \'yobicon\';',
  );
  expect(yobicon).toContain('.yobicon-friends:before {\n    content: "\\e27b";\n}');
  expect(yobicon).toContain('.yobicon-trash:before {\n    content: "\\e838";\n}');
  expect(yobicon).not.toMatch(/\.yobicon-eye-(?:open|close):before/u);
  expect(common).toContain(
    ".yobicon-middle{\n    vertical-align: bottom;\n    margin-bottom: 3px;\n}",
  );
  expect(yobiUi).toContain("i { line-height:20px;}");
  expect(focusedTest).not.toContain(["page", "addStyleTag"].join("."));

  const projectRowSource = route.slice(
    route.indexOf("function ProfileProjectRow("),
    route.indexOf("function TwoColumnModeCheckbox("),
  );
  for (const owner of [
    "user-profile-project-member-icon",
    "user-profile-project-watch-icon",
    "user-profile-project-trash-icon",
  ]) {
    expect(projectRowSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(projectRowSource).not.toMatch(/\byobicon-(?:friends|eye-open|eye-close|middle|trash)\b/u);
  expect(projectRowSource).not.toMatch(/\byobicon-white\b/u);
  expect(projectRowSource).not.toContain("yobicon-split yobicon-white");
  expect(projectRowSource).not.toContain("nbtn black medium last leaveProject");
  expect(projectRowSource).toContain("project.viewerCanWatch ? (");
  expect(projectRowSource).toContain("project.viewerCanLeave ? (");
  expect(projectRowSource).toContain(
    't("userinfo.leaveProject.confirm", { args: [project.projectName] })',
  );

  const memberStyle = styles.slice(
    styles.indexOf("projectMemberIcon:"),
    styles.indexOf("projectOwnerLink:"),
  );
  const watchStyle = styles.slice(
    styles.indexOf("projectWatchIcon:"),
    styles.indexOf("projectWatchBadge:"),
  );
  const trashStyle = styles.slice(
    styles.indexOf("projectTrashIcon:"),
    styles.indexOf("projectLeaveLink:"),
  );
  for (const iconStyle of [memberStyle, watchStyle, trashStyle]) {
    for (const declaration of [
      'backgroundImage: "none"',
      'display: "inline-block"',
      'fontFamily: "yobicon"',
      'fontStyle: "normal"',
      'fontVariant: "normal"',
      'fontWeight: "normal"',
      'textDecoration: "none"',
      'WebkitFontSmoothing: "antialiased"',
      'MozOsxFontSmoothing: "grayscale"',
    ]) {
      expect(iconStyle).toContain(declaration);
    }
  }
  expect(memberStyle).toContain("lineHeight: 1");
  expect(memberStyle).toContain('verticalAlign: "bottom"');
  expect(memberStyle).toContain('marginBottom: "3px"');
  expect(memberStyle).toContain("content: '\"\\\\e27b\"'");
  expect(watchStyle).toContain('lineHeight: "20px"');
  expect(watchStyle).toContain('verticalAlign: "bottom"');
  expect(watchStyle).toContain('marginBottom: "3px"');
  expect(watchStyle).not.toContain("::before");
  expect(trashStyle).toContain("lineHeight: 1");
  expect(trashStyle).toContain('verticalAlign: "baseline"');
  expect(trashStyle).toContain("content: '\"\\\\e838\"'");

  const output = "output/playwright/stylex-user-profile-project-residual-icons";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/yona/admin?selected=projects");
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
    expect(
      await page.locator("style").evaluateAll((nodes) =>
        nodes.some((node) => {
          const css = node.textContent || "";
          return (
            css.includes('[class^="yobicon-"]') ||
            css.includes(".yobicon-friends:before") ||
            css.includes(".yobicon-trash:before")
          );
        }),
      ),
    ).toBe(false);

    const rows = page.locator('[data-stylex-owner="user-profile-project-row"]');
    const members = page.locator('[data-stylex-owner="user-profile-project-member-icon"]');
    const watches = page.locator('[data-stylex-owner="user-profile-project-watch-icon"]');
    const trash = page.locator('[data-stylex-owner="user-profile-project-trash-icon"]');
    await expect(rows).toHaveCount(3);
    await expect(members).toHaveCount(3);
    await expect(watches).toHaveCount(2);
    await expect(trash).toHaveCount(1);
    for (const icon of await page
      .locator(
        '[data-stylex-owner="user-profile-project-member-icon"], [data-stylex-owner="user-profile-project-watch-icon"], [data-stylex-owner="user-profile-project-trash-icon"]',
      )
      .all()) {
      await expect(icon).not.toHaveClass(/(?:^|\s)yobicon-/u);
    }

    await expect(
      rows.nth(0).locator('[data-stylex-owner="user-profile-project-watch-icon"]'),
    ).toHaveCount(0);
    await expect(
      rows.nth(1).locator('[data-stylex-owner="user-profile-project-watch-button"]'),
    ).toContainText("Unwatch4");
    await expect(
      rows.nth(2).locator('[data-stylex-owner="user-profile-project-watch-button"]'),
    ).toContainText("Watch1");
    const leave = rows.nth(1).locator('[data-stylex-owner="user-profile-project-leave-link"]');
    await expect(leave).not.toHaveClass(/(?:^|\s)nbtn(?:\s|$)/u);
    await expect(leave).not.toHaveClass(/(?:^|\s)black(?:\s|$)/u);
    await expect(leave).not.toHaveClass(/(?:^|\s)medium(?:\s|$)/u);
    await expect(leave).not.toHaveClass(/(?:^|\s)last(?:\s|$)/u);
    await expect(leave).not.toHaveClass(/(?:^|\s)leaveProject(?:\s|$)/u);
    await expect(leave).toContainText("Leave");

    const metrics = await page.evaluate(() => {
      const select = (owner: string) => [
        ...document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${owner}"]`),
      ];
      const capture = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        const before = getComputedStyle(element, "::before");
        const box = element.getBoundingClientRect();
        const row = element
          .closest<HTMLElement>('[data-stylex-owner="user-profile-project-row"]')!
          .getBoundingClientRect();
        return {
          style: {
            backgroundImage: style.backgroundImage,
            display: style.display,
            fontFamily: style.fontFamily,
            fontStyle: style.fontStyle,
            fontVariant: style.fontVariant,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            marginBottom: style.marginBottom,
            textDecorationLine: style.textDecorationLine,
            verticalAlign: style.verticalAlign,
          },
          before: { content: before.content, fontFamily: before.fontFamily },
          contained:
            box.left >= row.left &&
            box.right <= row.right &&
            box.top >= row.top &&
            box.bottom <= row.bottom,
        };
      };
      return {
        members: select("user-profile-project-member-icon").map(capture),
        watches: select("user-profile-project-watch-icon").map(capture),
        trash: select("user-profile-project-trash-icon").map(capture),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(metrics.overflow).toBe(0);
    for (const member of metrics.members) {
      expect(member.style).toMatchObject({
        backgroundImage: "none",
        display: "inline-block",
        fontFamily: "yobicon",
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: "400",
        marginBottom: "3px",
        textDecorationLine: "none",
        verticalAlign: "bottom",
      });
      expect(member.before).toEqual({
        content: JSON.stringify(String.fromCodePoint(0xe27b)),
        fontFamily: "yobicon",
      });
      expect(member.contained).toBe(true);
    }
    for (const watch of metrics.watches) {
      expect(watch.style).toMatchObject({
        backgroundImage: "none",
        display: "inline-block",
        fontFamily: "yobicon",
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: "400",
        lineHeight: "20px",
        marginBottom: "3px",
        textDecorationLine: "none",
        verticalAlign: "bottom",
      });
      expect(watch.before.content).toBe("none");
      expect(watch.contained).toBe(true);
    }
    expect(metrics.trash).toHaveLength(1);
    expect(metrics.trash[0].style).toMatchObject({
      backgroundImage: "none",
      display: "inline-block",
      fontFamily: "yobicon",
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: "400",
      textDecorationLine: "none",
      verticalAlign: "baseline",
    });
    expect(metrics.trash[0].before).toEqual({
      content: JSON.stringify(String.fromCodePoint(0xe838)),
      fontFamily: "yobicon",
    });
    expect(metrics.trash[0].contained).toBe(true);

    page.once("dialog", (dialog) => dialog.dismiss());
    const beforeClickUrl = page.url();
    await leave.click();
    await expect(page).toHaveURL(beforeClickUrl);
    await page.mouse.move(0, 0);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });

    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
