import type { OrganizationContainer } from "../../src/api/types";
import { expect, test } from "../wtr-compat.ts";

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
            createdAt: "2026-06-01T10:00:00Z",
            lastPushedAt: "",
            memberCount: 3,
            members: [
              {
                avatarUrl: "",
                loginId: "carol",
                role: "member",
                userId: 35,
                userLabel: "Carol Lee",
              },
              {
                avatarUrl: "",
                loginId: "weblabs",
                role: "manager",
                userId: 36,
                userLabel: "Web Labs",
              },
              {
                avatarUrl: "",
                loginId: "admin",
                role: "manager",
                userId: 1,
                userLabel: "Administrator",
              },
            ],
            watchCount: 4,
            isWatching: true,
            labels: [],
          },
          {
            ownerName: "weblabs",
            projectName: "unwatched",
            overview: "Unwatched project",
            projectScope: "PUBLIC",
            createdAt: "2026-05-31T10:00:00Z",
            lastPushedAt: "",
            memberCount: 1,
            members: [
              {
                avatarUrl: "",
                loginId: "admin",
                role: "manager",
                userId: 1,
                userLabel: "Administrator",
              },
            ],
            watchCount: 2,
            isWatching: false,
            labels: [],
          },
        ],
        adminMembers: [],
        memberMembers: [],
      } satisfies OrganizationContainer,
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
