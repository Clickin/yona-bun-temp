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
    logoUrl: "",
    overview: "Private project overview",
    memberCount: 3,
    createdAt: "2020-01-02T12:00:00Z",
    lastPushedAt: "",
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
    logoUrl: "",
    overview: "Public project overview",
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

test("Projects final presentation classes are direct Style owners", async ({ page }) => {
  test.setTimeout(60_000);

  const [route, _styles, view, partial, legacyJs, focusedTest] = await Promise.all([
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
      new URL("../../yona-original/public/javascripts/service/yobi.user.View.js", import.meta.url),
      "utf8",
    ),
    readFile(new URL(import.meta.url), "utf8"),
  ]);

  expect(view).toContain('<ul class="user-streams all-projects">');
  expect(partial).toContain('class="yobicon-lock yobicon-small"');
  expect(partial).toContain('class="yobicon-split yobicon-white vmiddle"');
  expect(partial).toContain('class="nbtn black medium last leaveProject"');
  expect(legacyJs).toContain("a.leaveProject");
  expect(focusedTest).not.toContain(["page", "addStyleTag"].join("."));

  const projectsPaneSource = route.slice(
    route.indexOf('id="projects"'),
    route.indexOf("function ProfileTab("),
  );
  const projectRowSource = route.slice(
    route.indexOf("function ProfileProjectRow("),
    route.indexOf("function ShowSubtasksCheckbox("),
  );
  // 667398a04 legacy-parity restore: the pane/list and row retain the legacy
  // classes (user-streams all-projects, yobicon-*, nbtn … leaveProject).
  expect(projectsPaneSource).toMatch(/\b(?:user-streams|all-projects)\b/u);
  for (const literal of [
    "yobicon-lock",
    "yobicon-split yobicon-white",
    "nbtn black medium last leaveProject",
  ]) {
    expect(projectRowSource).toContain(literal);
  }
  for (const owner of [
    "user-profile-projects-list",
    "user-profile-project-private-icon",
    "user-profile-project-fork-icon",
    "user-profile-project-leave-link",
    "user-profile-project-trash-icon",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
  expect(projectRowSource).toContain("data-projectname={project.projectName}");
  expect(projectRowSource).toContain('to="/info/leave/$ownerName/$projectName"');
  expect(projectRowSource).toContain(
    't("userinfo.leaveProject.confirm", { args: [project.projectName] })',
  );

  const output = "output/playwright/style-user-profile-project-final-classes";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/yona/admin?selected=projects");
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);

    const list = page.locator('[data-owner="user-profile-projects-list"]');
    const rows = page.locator('[data-owner="user-profile-project-row"]');
    const privateIcon = page.locator('[data-owner="user-profile-project-private-icon"]');
    const forkIcon = page.locator('[data-owner="user-profile-project-fork-icon"]');
    const leave = page.locator('[data-owner="user-profile-project-leave-link"]');
    await expect(rows).toHaveCount(3);
    await expect(privateIcon).toHaveCount(1);
    await expect(forkIcon).toHaveCount(1);
    await expect(leave).toHaveCount(1);
    await expect(list).toHaveClass(/\b(?:user-streams|all-projects)\b/u);
    await expect(privateIcon).toHaveClass(/\byobicon-lock\b/u);
    await expect(forkIcon).toHaveClass(/\b(?:yobicon-split|yobicon-white)\b/u);
    await expect(leave).toHaveClass(/\b(?:nbtn|black|medium|last|leaveProject)\b/u);
    await expect(leave).toHaveAttribute("href", "/yona/info/leave/fork-owner/forked-project");
    await expect(leave).toHaveAttribute("data-projectname", "forked-project");
    await expect(leave).toContainText("Leave");
    await expect(
      rows.nth(1).locator('[data-owner="user-profile-project-watch-button"]'),
    ).toContainText("Unwatch4");
    await expect(
      rows.nth(2).locator('[data-owner="user-profile-project-watch-button"]'),
    ).toContainText("Watch1");

    const metrics = await page.evaluate(() => {
      const owner = (name: string) =>
        document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const list = owner("user-profile-projects-list");
      const rows = [
        ...document.querySelectorAll<HTMLElement>('[data-owner="user-profile-project-row"]'),
      ];
      const privateIcon = owner("user-profile-project-private-icon");
      const forkIcon = owner("user-profile-project-fork-icon");
      const leave = owner("user-profile-project-leave-link");
      const listStyle = getComputedStyle(list);
      const privateStyle = getComputedStyle(privateIcon);
      const forkStyle = getComputedStyle(forkIcon);
      const leaveStyle = getComputedStyle(leave);
      const privateBefore = getComputedStyle(privateIcon, "::before");
      const forkBefore = getComputedStyle(forkIcon, "::before");
      return {
        list: {
          clear: listStyle.clear,
          listStyleType: listStyle.listStyleType,
          margin: listStyle.margin,
        },
        rowPaddingTop: rows.map((row) => getComputedStyle(row).paddingTop),
        privateIcon: {
          color: privateStyle.color,
          display: privateStyle.display,
          fontFamily: privateStyle.fontFamily,
          fontSize: privateStyle.fontSize,
          verticalAlign: privateStyle.verticalAlign,
          before: privateBefore.content,
          beforeFont: privateBefore.fontFamily,
        },
        forkIcon: {
          display: forkStyle.display,
          fontFamily: forkStyle.fontFamily,
          verticalAlign: forkStyle.verticalAlign,
          before: forkBefore.content,
          beforeFont: forkBefore.fontFamily,
        },
        leave: {
          backgroundColor: leaveStyle.backgroundColor,
          borderRadius: leaveStyle.borderRadius,
          color: leaveStyle.color,
          display: leaveStyle.display,
          fontSize: leaveStyle.fontSize,
          fontWeight: leaveStyle.fontWeight,
          lineHeight: leaveStyle.lineHeight,
          marginRight: leaveStyle.marginRight,
          padding: leaveStyle.padding,
          textAlign: leaveStyle.textAlign,
          verticalAlign: leaveStyle.verticalAlign,
          whiteSpace: leaveStyle.whiteSpace,
        },
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        contained: rows.every((row) => {
          const rowBox = row.getBoundingClientRect();
          const listBox = list.getBoundingClientRect();
          return rowBox.left >= listBox.left && rowBox.right <= listBox.right + 0.5;
        }),
      };
    });

    expect(metrics.list).toEqual({
      clear: "both",
      listStyleType: "none",
      margin: "0px 0px 20px",
    });
    expect(metrics.rowPaddingTop).toEqual(["5px", "15px", "15px"]);
    expect(metrics.privateIcon).toMatchObject({
      color: "rgb(127, 140, 141)",
      display: "inline-block",
      fontFamily: "yobicon",
      fontSize: "14px",
      verticalAlign: "baseline",
      before: JSON.stringify(String.fromCodePoint(0xe21e)),
      beforeFont: "yobicon",
    });
    expect(metrics.forkIcon).toMatchObject({
      display: "inline-block",
      fontFamily: "yobicon",
      verticalAlign: "middle",
      before: JSON.stringify(String.fromCodePoint(0xe450)),
      beforeFont: "yobicon",
    });
    expect(metrics.leave).toEqual({
      backgroundColor: "rgb(34, 34, 34)",
      borderRadius: "2px",
      color: "rgb(255, 255, 255)",
      display: "inline-block",
      fontSize: "11px",
      fontWeight: "700",
      lineHeight: "18px",
      marginRight: "0px",
      padding: "6px 20px",
      textAlign: "center",
      verticalAlign: "middle",
      whiteSpace: "nowrap",
    });
    expect(metrics.overflow).toBe(0);
    expect(metrics.contained).toBe(true);

    page.once("dialog", (dialog) => dialog.dismiss());
    const beforeClickUrl = page.url();
    await leave.click();
    await expect(page).toHaveURL(beforeClickUrl);
    await page.mouse.move(0, 0);
    await leave.evaluate((element) => element.blur());
    expect(
      await leave.evaluate((element) => ({
        active: document.activeElement === element,
        backgroundColor: getComputedStyle(element).backgroundColor,
        color: getComputedStyle(element).color,
        textDecoration: getComputedStyle(element).textDecorationLine,
      })),
    ).toEqual({
      active: false,
      backgroundColor: "rgb(34, 34, 34)",
      color: "rgb(255, 255, 255)",
      textDecoration: "none",
    });
    await page.screenshot({
      path: `${output}/${viewport.name}.png`,
      fullPage: true,
    });
  }
});
