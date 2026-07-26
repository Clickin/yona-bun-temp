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

test("Projects rows retire only project and stats literals under fallback-off", async ({
  page,
}) => {
  test.setTimeout(60_000);
  expect(process.env.VITE_DISABLE_LEGACY_FALLBACK).toBe("1");
  expect(process.env.YONA_E2E_FALLBACK_MODE).toBe("fallback-off");
  expect(process.env.PW_CHANNEL).toBe("chrome");

  const [route, styles, view, partial, fallback, focusedTest] = await Promise.all([
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
      new URL("../public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL(import.meta.url), "utf8"),
  ]);

  expect(view).toContain('<ul class="user-streams all-projects">');
  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain('<li class="project">');
  expect(partial).toContain('<div class="stats-wrap pull-right">');
  expect(partial).toContain('<div class="stats">');
  expect(fallback).toContain(
    ".all-projects .project {\n  padding: 15px 0 10px 0;\n  overflow: hidden;\n  border-bottom: 1px solid #DCDCDC;\n}",
  );
  expect(fallback).toContain(
    ".all-projects.user-streams .project:first-of-type {\n  padding-top: 5px;\n}",
  );
  expect(fallback).not.toMatch(/(?:^|[}\n])\s*\.stats\s*\{/u);
  expect(focusedTest).not.toContain(["page", "addStyleTag"].join("."));

  const rowStyle = styles.slice(styles.indexOf("projectRow:"), styles.indexOf("projectHeader:"));
  expect(rowStyle).toContain('borderBottom: "1px solid #dcdcdc"');
  expect(rowStyle).toContain('overflow: "hidden"');
  expect(rowStyle).toContain('padding: "15px 0px 10px"');
  expect(rowStyle).toContain('firstProjectRow: { paddingTop: "5px" }');
  expect(styles).toContain(
    'projectStats: {\n    float: "right",\n    marginTop: "0px",\n    textAlign: "right",\n  }',
  );

  const projectRowSource = route.slice(
    route.indexOf("function ProfileProjectRow("),
    route.indexOf("function TwoColumnModeCheckbox("),
  );
  expect(projectRowSource).toContain('data-stylex-owner="user-profile-project-row"');
  expect(projectRowSource).toContain('data-stylex-owner="user-profile-project-stats"');
  expect(projectRowSource).not.toMatch(
    /className=\{`\$\{stylex\.props\(styles\.projectRow,[^}]+\.className\}\s+project`\}/u,
  );
  expect(projectRowSource).not.toContain('className="stats"');
  expect(projectRowSource).toContain("yobicon-lock");
  expect(projectRowSource).toContain("yobicon-split yobicon-white");
  expect(projectRowSource).toContain("nbtn black medium last leaveProject");
  expect(projectRowSource).not.toMatch(/\byobicon-(?:friends|eye-open|eye-close|middle|trash)\b/u);

  const output = "output/playwright/stylex-user-profile-project-row-stats-classes";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/yona/admin?selected=projects");
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);

    const rows = page.locator('[data-stylex-owner="user-profile-project-row"]');
    const statsOwners = page.locator('[data-stylex-owner="user-profile-project-stats"]');
    await expect(rows).toHaveCount(3);
    await expect(statsOwners).toHaveCount(3);
    for (let index = 0; index < projects.length; index += 1) {
      const row = rows.nth(index);
      const statsOwner = statsOwners.nth(index);
      await expect(row).not.toHaveClass(/(?:^|\s)project(?:\s|$)/u);
      await expect(statsOwner.locator(":scope > div")).toHaveCount(1);
      await expect(statsOwner.locator(":scope > div")).not.toHaveClass(/(?:^|\s)stats(?:\s|$)/u);
      await expect(row.locator('[data-stylex-owner="user-profile-project-title-link"]')).toHaveText(
        projects[index].projectName,
      );
      await expect(
        row.locator('[data-stylex-owner="user-profile-project-description"]'),
      ).toHaveText(projects[index].overview);
    }

    await expect(
      rows.nth(0).locator('[data-stylex-owner="user-profile-project-private-icon"]'),
    ).toHaveCount(1);
    await expect(
      rows.nth(1).locator('[data-stylex-owner="user-profile-project-origin-link"]'),
    ).toHaveText("origin-owner/origin-project");
    await expect(
      rows.nth(0).locator('[data-stylex-owner="user-profile-project-watch-button"]'),
    ).toHaveCount(0);
    await expect(
      rows.nth(1).locator('[data-stylex-owner="user-profile-project-watch-button"]'),
    ).toContainText("Unwatch4");
    await expect(
      rows.nth(2).locator('[data-stylex-owner="user-profile-project-watch-button"]'),
    ).toContainText("Watch1");
    await expect(
      rows.nth(1).locator('[data-stylex-owner="user-profile-project-leave-link"]'),
    ).toContainText("Leave");
    await expect(
      rows.nth(2).locator('[data-stylex-owner="user-profile-project-leave-link"]'),
    ).toHaveCount(0);

    const metrics = await rows.evaluateAll((nodes) => ({
      rows: nodes.map((row) => {
        const rowElement = row as HTMLElement;
        const statsOwner = row.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-project-stats"]',
        )!;
        const statsChild = statsOwner.querySelector<HTMLElement>(":scope > div")!;
        const rowStyle = getComputedStyle(rowElement);
        const statsStyle = getComputedStyle(statsOwner);
        const rowBox = rowElement.getBoundingClientRect();
        const statsBox = statsOwner.getBoundingClientRect();
        const childBox = statsChild.getBoundingClientRect();
        return {
          rowClass: rowElement.classList.contains("project"),
          statsClass: statsChild.classList.contains("stats"),
          rowStyle: {
            overflow: rowStyle.overflow,
            paddingTop: rowStyle.paddingTop,
            paddingRight: rowStyle.paddingRight,
            paddingBottom: rowStyle.paddingBottom,
            paddingLeft: rowStyle.paddingLeft,
          },
          statsStyle: {
            float: statsStyle.float,
            marginTop: statsStyle.marginTop,
            textAlign: statsStyle.textAlign,
          },
          rowBox: {
            left: rowBox.left,
            right: rowBox.right,
            top: rowBox.top,
            bottom: rowBox.bottom,
          },
          statsBox: {
            left: statsBox.left,
            right: statsBox.right,
            top: statsBox.top,
            bottom: statsBox.bottom,
          },
          childBox: {
            left: childBox.left,
            right: childBox.right,
            top: childBox.top,
            bottom: childBox.bottom,
          },
        };
      }),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));

    expect(metrics.overflow).toBe(0);
    for (const [index, metric] of metrics.rows.entries()) {
      expect(metric.rowClass).toBe(false);
      expect(metric.statsClass).toBe(false);
      expect(metric.rowStyle).toEqual({
        overflow: "hidden",
        paddingTop: index === 0 ? "5px" : "15px",
        paddingRight: "0px",
        paddingBottom: "10px",
        paddingLeft: "0px",
      });
      expect(metric.statsStyle).toEqual({
        float: "right",
        marginTop: "0px",
        textAlign: "right",
      });
      expect(metric.rowBox.left).toBeGreaterThanOrEqual(0);
      expect(metric.rowBox.right).toBeLessThanOrEqual(viewport.width);
      expect(metric.statsBox.left).toBeGreaterThanOrEqual(metric.rowBox.left);
      expect(metric.statsBox.right).toBeLessThanOrEqual(metric.rowBox.right);
      expect(metric.statsBox.top).toBeGreaterThanOrEqual(metric.rowBox.top);
      expect(metric.statsBox.bottom).toBeLessThanOrEqual(metric.rowBox.bottom);
      expect(metric.childBox.left).toBeGreaterThanOrEqual(metric.statsBox.left);
      expect(metric.childBox.right).toBeLessThanOrEqual(metric.statsBox.right);
    }
    for (let index = 1; index < metrics.rows.length; index += 1) {
      expect(metrics.rows[index].rowBox.top).toBeGreaterThanOrEqual(
        metrics.rows[index - 1].rowBox.bottom,
      );
    }

    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
