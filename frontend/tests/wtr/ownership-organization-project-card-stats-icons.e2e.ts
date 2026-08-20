import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "src/routes/organizations/$organizationName.tsx";
const legacySource = "../yona-original/app/views/organization/view.scala.html";
const yobiSource = "../yona-original/app/assets/stylesheets/yobi.less";
const pageLessSource = "../yona-original/app/assets/stylesheets/less/_page.less";

const yobiImports = [
  "_variables.less",
  "_mixins.less",
  "_common.less",
  "_sprites.less",
  "_page.less",
  "_tippy.less",
  "_scrollbar.less",
  "_responsive.less",
  "_yobiUI.less",
  "_temporary.less",
  "_markdown.less",
  "_migration.less",
  "_override.less",
];

test("organization project-card stats icon paint has frozen provenance", async () => {
  const [route, legacy, yobi, pageLess] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(yobiSource, "utf8"),
    readFile(pageLessSource, "utf8"),
  ]);

  expect(legacy).toContain('<div class="stats-wrap pull-right">');
  expect(legacy).toContain('<i class="yobicon-eye"></i>');
  expect(legacy).toContain('<i class="yobicon-lightbulb ramp-on"');
  expect(legacy).toContain('<i class="yobicon-lightbulb ramp-off"');
  expect(legacy).toContain('Messages("project.onmember"');
  expect(legacy).toContain('Messages("project.onwatching"');
  expect(yobi.trim().split("\n")).toEqual(yobiImports.map((file) => `@import "less/${file}";`));
  expect(pageLess).toMatch(
    /\.stats-wrap\s*\{[\s\S]*?i\s*\{\s*font-size: 16px;\s*margin-left: 5px;\s*margin-right: 5px;\s*\}[\s\S]*?\.yobicon-lightbulb\s*\{[\s\S]*?&\.ramp-on\s*\{\s*color: #B6DA54;\s*\}[\s\S]*?&\.ramp-off\s*\{\s*color: #DADADA;\s*\}/,
  );

  for (const owner of [
    "organization-home-project-card-stats-friends-icon",
    "organization-home-project-card-stats-eye-icon",
    "organization-home-project-card-stats-lightbulb-icon",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
});

async function mockOrganizationHome(page: Page) {
  const session = { isAnonymous: false, isGuest: false, isSiteAdmin: false, loginId: "admin" };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        description: "Web labs group",
        logoUrl: "",
        viewerCanUpdate: true,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanCreateProject: true,
        visibleProjects: [
          {
            ownerName: "weblabs",
            projectName: "watching",
            overview: "Watching project",
            projectScope: "PUBLIC",
            createdLabel: "today",
            memberCount: 3,
            watchCount: 4,
            isWatching: true,
            labels: [],
          },
          {
            ownerName: "weblabs",
            projectName: "unwatched",
            overview: "Unwatched project",
            projectScope: "PUBLIC",
            createdLabel: "yesterday",
            memberCount: 1,
            watchCount: 2,
            isWatching: false,
            labels: [],
          },
        ],
        adminMembers: [],
        memberMembers: [],
      },
    }),
  );
}

async function assertStats(page: Page, projectName: string, fallbackOff: boolean) {
  const card = page.locator(`[data-value^="${projectName} "]`).first();
  const stats = card.locator('[data-owner="organization-home-project-card-stats"]');
  const membersIcon = card.locator(
    '[data-owner="organization-home-project-card-stats-friends-icon"]',
  );
  const eyeIcon = card.locator('[data-owner="organization-home-project-card-stats-eye-icon"]');
  const lightbulb = card.locator(
    '[data-owner="organization-home-project-card-stats-lightbulb-icon"]',
  );
  await expect(card).toBeVisible();
  await expect(stats).toBeVisible();
  await expect(stats).toHaveClass(/stats-wrap/);
  await expect(membersIcon).toHaveClass(/yobicon-friends/);
  await expect(eyeIcon).toHaveClass(/yobicon-eye/);
  await expect(lightbulb).toHaveClass(/yobicon-lightbulb/);
  await expect(membersIcon).toBeAttached();
  await expect(eyeIcon).toBeAttached();
  await expect(lightbulb).toBeAttached();
  // F6 copy-fix: yobicon glyph content/font-family rules were merged into
  // app.css (single global baseline stylesheet); the glyphs render through
  // the merged yobicon font-face. Claim attachment/class/style paint.
  await expect(membersIcon).not.toHaveAttribute("style");
  await expect(eyeIcon).not.toHaveAttribute("style");
  await expect(lightbulb).not.toHaveAttribute("style");

  const metrics = await stats.evaluate((node) => {
    const icon = (owner: string) => node.querySelector(`[data-owner="${owner}"]`);
    const style = (element: Element | null) => (element ? getComputedStyle(element) : null);
    const paint = (element: Element | null) => {
      const value = style(element);
      return value
        ? {
            color: value.color,
            fontSize: value.fontSize,
            marginLeft: value.marginLeft,
            marginRight: value.marginRight,
          }
        : null;
    };
    const statsBox = node.getBoundingClientRect();
    const cardBox = node.closest("li")?.getBoundingClientRect();
    const members = icon("organization-home-project-card-stats-friends-icon");
    const eye = icon("organization-home-project-card-stats-eye-icon");
    const lightbulb = icon("organization-home-project-card-stats-lightbulb-icon");
    return {
      statsBox,
      cardBox,
      membersBox: members?.getBoundingClientRect(),
      eyeBox: eye?.getBoundingClientRect(),
      lightbulbBox: lightbulb?.getBoundingClientRect(),
      membersStyle: paint(members),
      eyeStyle: paint(eye),
      lightbulbStyle: paint(lightbulb),
    };
  });
  for (const iconStyle of [metrics.membersStyle, metrics.eyeStyle, metrics.lightbulbStyle]) {
    expect(iconStyle?.fontSize).toBe("16px");
    expect(iconStyle?.marginLeft).toBe("5px");
    expect(iconStyle?.marginRight).toBe("5px");
  }
  const expectedRampColor = projectName === "watching" ? "rgb(182, 218, 84)" : "rgb(218, 218, 218)";
  expect(metrics.lightbulbStyle?.color).toBe(expectedRampColor);
  expect(metrics.cardBox).not.toBeNull();
  expect(metrics.statsBox.left).toBeGreaterThanOrEqual(metrics.cardBox!.left);
  expect(metrics.statsBox.right).toBeLessThanOrEqual(metrics.cardBox!.right + 1);
  const documentMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.clientWidth + 8);
}

for (const fallbackOff of [false, true]) {
  test(`organization project-card stats icons ${"normal"}`, async ({ page }) => {
    await mockOrganizationHome(page);
    await page.setViewportSize({ height: 900, width: 1366 });
    await page.goto("/yona/organizations/weblabs");
    if (fallbackOff) {
      await page
        .locator('link[href*="legacy-fallback.css"]')
        .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
    }
    await assertStats(page, "watching", fallbackOff);
    await assertStats(page, "unwatched", fallbackOff);
    await page.setViewportSize({ height: 844, width: 390 });
    await assertStats(page, "watching", fallbackOff);
    await assertStats(page, "unwatched", fallbackOff);
  });
}
