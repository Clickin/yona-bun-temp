import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

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
        selected: "issues",
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
            ownerName: "other",
            projectName: "sample",
            projectScope: "public",
            logoUrl: "",
            overview: "A sample project",
            memberCount: 3,
            createdLabel: "today",
            viewerCanWatch: true,
            isWatching: false,
            watchCount: 2,
            viewerCanLeave: true,
            notifications: [],
          },
        ],
        pullRequestItems: [],
      },
    }),
  );
});

test("populated Projects tab project row owns legacy float geometry", async ({ page }) => {
  const source = await readFile("../src/routes/$user.tsx");
  const styleSource = await readFile("../src/routes/-user-profile.stylex.ts");
  const legacy = await readFile(
    new URL("../../yona-original/app/views/user/partial_projectlist.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const yobi = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
    "utf8",
  );
  const bootstrap = await readFile(
    new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
    "utf8",
  );

  expect(legacy).toContain('<li class="project">');
  expect(legacy).toContain('<div class="pull-left" style="margin-left: 10px;">');
  expect(legacy).toContain('<div class="stats-wrap pull-right">');
  expect(less).toContain(".stats-wrap {");
  expect(less).toContain("margin-top: 0px;");
  expect(less).toContain("text-align: right;");
  expect(yobi).toContain('@import "less/_page.less";');
  expect(bootstrap).toContain(".pull-left {\n  float: left;\n}");
  expect(bootstrap).toContain(".pull-right {\n  float: right;\n}");

  expect(source).toContain('data-stylex-owner="user-profile-project-info"');
  // Wave-33: app retains legacy classes (667398a04 legacy-parity restore).
  expect(source).toContain("styles.projectInfo).className} pull-left");
  expect(source).toContain('data-stylex-owner="user-profile-project-stats"');
  expect(source).toContain("styles.projectStats).className} stats-wrap");
  expect(source).toContain("styles.projectStats).className} stats-wrap pull-right");
  expect(styleSource).toContain('float: "left"');
  expect(styleSource).toContain('float: "right"');
  expect(styleSource).toContain('marginLeft: "10px"');
  expect(styleSource).toContain('marginTop: "0px"');
  expect(styleSource).toContain('textAlign: "right"');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/yona/admin");
  await page.getByRole("button", { name: /Projects/i }).click();

  const projectInfo = page.locator('[data-stylex-owner="user-profile-project-info"]');
  const projectStats = page.locator('[data-stylex-owner="user-profile-project-stats"]');
  const projectRow = projectInfo.locator(
    "xpath=ancestor::li[@data-stylex-owner='user-profile-project-row']",
  );
  await expect(projectRow).toHaveCount(1);
  await expect(projectRow).toContainText("A sample project");
  await expect(projectInfo).toHaveClass(/pull-left/u);
  await expect(projectStats).toHaveClass(/stats-wrap/u);
  await expect(projectStats).toHaveClass(/pull-right/u);
  await expect(
    projectRow.locator(
      '[data-stylex-owner="user-profile-project-info-wrap"] > [data-stylex-owner="user-profile-project-avatar-rail"]',
    ),
  ).toHaveCount(1);
  await expect(projectRow.getByRole("link", { name: "sample", exact: true })).toBeVisible();
  await expect(
    projectRow.locator('[data-stylex-owner="user-profile-project-watch-button"]'),
  ).toBeVisible();
  await expect(
    projectRow.locator('[data-stylex-owner="user-profile-project-leave-link"]'),
  ).toBeVisible();

  for (const [locator, expected] of [
    [projectInfo, { float: "left", marginLeft: "10px" }],
    [projectStats, { float: "right", marginTop: "0px", textAlign: "right" }],
  ] as const) {
    const geometry = await locator.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const stream = node
        .closest<HTMLElement>('[data-stylex-owner="user-profile-projects-list"]')
        ?.getBoundingClientRect();
      const computed = getComputedStyle(node);
      return {
        hasInlineStyle: node.hasAttribute("style"),
        float: computed.float,
        marginLeft: computed.marginLeft,
        marginTop: computed.marginTop,
        textAlign: computed.textAlign,
        left: rect.left,
        right: rect.right,
        stream: stream ? { left: stream.left, right: stream.right } : null,
      };
    });
    expect(geometry.hasInlineStyle).toBe(false);
    expect(geometry.float).toBe(expected.float);
    if ("marginLeft" in expected) expect(geometry.marginLeft).toBe(expected.marginLeft);
    if ("marginTop" in expected) expect(geometry.marginTop).toBe(expected.marginTop);
    if ("textAlign" in expected) expect(geometry.textAlign).toBe(expected.textAlign);
    expect(geometry.stream).not.toBeNull();
    expect(geometry.left).toBeGreaterThanOrEqual(geometry.stream!.left);
    expect(geometry.right).toBeLessThanOrEqual(geometry.stream!.right);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileGeometry = await projectRow.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { right: rect.right, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobileGeometry.right).toBeLessThanOrEqual(390);
  expect(mobileGeometry.scrollWidth).toBe(390);
  for (const locator of [projectInfo, projectStats]) {
    const geometry = await locator.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const stream = node
        .closest<HTMLElement>('[data-stylex-owner="user-profile-projects-list"]')
        ?.getBoundingClientRect();
      const computed = getComputedStyle(node);
      return {
        hasInlineStyle: node.hasAttribute("style"),
        float: computed.float,
        marginLeft: computed.marginLeft,
        marginTop: computed.marginTop,
        textAlign: computed.textAlign,
        left: rect.left,
        right: rect.right,
        stream: stream ? { left: stream.left, right: stream.right } : null,
      };
    });
    expect(geometry.hasInlineStyle).toBe(false);
    expect(geometry.float).toBe(locator === projectInfo ? "left" : "right");
    expect(geometry.stream).not.toBeNull();
    expect(geometry.left).toBeGreaterThanOrEqual(geometry.stream!.left);
    expect(geometry.right).toBeLessThanOrEqual(geometry.stream!.right);
  }
});
