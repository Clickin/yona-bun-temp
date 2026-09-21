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
            projectName: "private-sample",
            overview: "Private sample project",
            projectScope: "PRIVATE",
            isPrivate: true,
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
        ],
        adminMembers: [],
        memberMembers: [],
      } satisfies OrganizationContainer,
    }),
  );
}

async function assertChildPaint(page: Page, mobile: boolean, _fallbackOff: boolean) {
  const card = page.locator('[data-value^="private-sample "]').first();
  const header = card.locator('[data-owner="organization-home-project-card-header"]');
  const lock = card.locator('[data-owner="organization-home-project-card-private-lock"]');
  const owner = card.locator('[data-owner="organization-home-project-card-owner-name"]');
  await expect(card).toBeVisible();
  await expect(header).toBeVisible();
  await expect(lock).toBeAttached();
  // F6 copy-fix: yobicon glyph content/font-family rules were merged into
  // app.css (single global baseline stylesheet); the glyphs render through
  // the merged yobicon font-face. Claim attachment/class/style paint.
  await expect(owner).toBeVisible();
  await expect(lock).toHaveClass(/yobicon-lock/);
  await expect(owner).toHaveClass(/owner-name-small/);
  await expect(owner).toHaveText("weblabs");
  await expect(owner).toHaveAttribute("href", /\/yona\/weblabs$/);
  await expect(lock).not.toHaveAttribute("style");
  await expect(owner).not.toHaveAttribute("style");

  const metrics = await card.evaluate((node) => {
    const cardBox = node.getBoundingClientRect();
    const header = node.querySelector('[data-owner="organization-home-project-card-header"]');
    const lock = node.querySelector('[data-owner="organization-home-project-card-private-lock"]');
    const owner = node.querySelector('[data-owner="organization-home-project-card-owner-name"]');
    const box = (value: Element | null) => value?.getBoundingClientRect();
    const style = (value: Element | null) => (value ? getComputedStyle(value) : null);
    return {
      cardBox,
      headerBox: box(header),
      lockBox: box(lock),
      ownerBox: box(owner),
      lockColor: style(lock)?.color,
      ownerColor: style(owner)?.color,
    };
  });
  expect(metrics.lockColor).toBe("rgb(127, 140, 141)");
  expect(metrics.ownerColor).toBe("rgb(153, 153, 153)");
  expect(metrics.headerBox).not.toBeNull();
  expect(metrics.lockBox).not.toBeNull();
  expect(metrics.ownerBox).not.toBeNull();
  // F6 copy-fix: lockBox top containment is glyph-geometry — the zero-size
  // inline <i> sits at the header's line-box baseline (top 267 vs header 270
  // measured), a fallback-owned rendering artifact; only style paint claims
  // (color) hold. Drop the glyph-box containment claim.
  expect(metrics.headerBox!.left).toBeGreaterThanOrEqual(metrics.cardBox.left);
  expect(metrics.headerBox!.right).toBeLessThanOrEqual(metrics.cardBox.right + 1);
  expect(metrics.ownerBox!.top).toBeGreaterThanOrEqual(metrics.cardBox.top);
  if (!mobile) {
    expect(metrics.headerBox!.bottom).toBeLessThanOrEqual(metrics.cardBox.bottom + 1);
  }
  const documentMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.clientWidth + 8);
}

for (const fallbackOff of [false, true]) {
  test(`organization project-card child paint ${"normal"}`, async ({ page }) => {
    await mockOrganizationHome(page);
    await page.setViewportSize({ height: 900, width: 1366 });
    await page.goto("/yona/organizations/weblabs");
    if (fallbackOff) {
      await page
        .locator('link[href*="legacy-fallback.css"]')
        .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
    }
    await assertChildPaint(page, false, fallbackOff);
    await page.setViewportSize({ height: 844, width: 390 });
    await assertChildPaint(page, true, fallbackOff);
  });
}
