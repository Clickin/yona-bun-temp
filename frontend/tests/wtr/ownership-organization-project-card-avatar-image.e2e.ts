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
            projectName: "sample",
            overview: "Custom logo project",
            projectScope: "PUBLIC",
            logoUrl: "/legacy-assets/images/project_default_logo.png",
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
            projectName: "blank",
            overview: "Blank logo project",
            projectScope: "PUBLIC",
            logoUrl: "",
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

async function assertAvatarState(page: Page, mobile: boolean) {
  const sample = page.locator('[data-value^="sample "]').first();
  const blank = page.locator('[data-value^="blank "]').first();
  const surface = sample.locator('[data-owner="organization-home-project-card-owner-avatar"]');
  const image = surface.locator('[data-owner="organization-home-project-card-owner-avatar-image"]');
  await expect(sample).toBeVisible();
  await expect(blank).toBeVisible();
  await expect(surface).toHaveClass(/owner-avatar-wrap/);
  await expect(surface).toHaveAttribute(
    "data-owner",
    "organization-home-project-card-owner-avatar",
  );
  await expect(image).toHaveAttribute("src", /project_default_logo\.png$/);
  await expect(image).toHaveAttribute("alt", "sample.name");
  await expect(image).toHaveAttribute(
    "data-owner",
    "organization-home-project-card-owner-avatar-image",
  );
  await expect(image).not.toHaveAttribute("style");
  await expect(
    blank.locator('[data-owner="organization-home-project-card-owner-avatar"] img'),
  ).toHaveCount(0);
  const members = sample.locator('[data-owner="organization-home-project-card-members-list"] a');
  await expect(members).toHaveCount(2);
  await expect(members.nth(0)).toHaveAttribute("href", "/yona/carol");
  await expect(members.nth(1)).toHaveAttribute("href", "/yona/admin");
  await expect(
    blank.locator('[data-owner="organization-home-project-card-members-list"] img'),
  ).toHaveCount(1);

  const metrics = await surface.evaluate((node) => {
    const image = node.querySelector("img");
    const surfaceStyle = getComputedStyle(node);
    const imageStyle = image ? getComputedStyle(image) : null;
    const surfaceBox = node.getBoundingClientRect();
    const imageBox = image?.getBoundingClientRect();
    return {
      surfaceDisplay: surfaceStyle.display,
      overflow: surfaceStyle.overflow,
      imageVerticalAlign: imageStyle?.verticalAlign,
      imageWidth: imageStyle?.width,
      imageHeight: imageStyle?.height,
      surfaceBox,
      imageBox,
    };
  });
  expect(metrics.overflow).toBe("hidden");
  expect(metrics.imageVerticalAlign).toBe("top");
  expect(metrics.imageBox).not.toBeNull();
  if (mobile) {
    expect(metrics.surfaceDisplay).toBe("none");
  } else {
    expect(metrics.surfaceDisplay).not.toBe("none");
    expect(metrics.imageBox!.width).toBeGreaterThan(0);
    expect(metrics.imageBox!.height).toBeGreaterThan(0);
    expect(metrics.imageBox!.left).toBeGreaterThanOrEqual(metrics.surfaceBox.left);
    expect(metrics.imageBox!.top).toBe(metrics.surfaceBox.top);
  }
  const documentMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.clientWidth + 8);
}

for (const fallbackOff of [false, true]) {
  test(`organization project-card avatar image ${"normal"}`, async ({ page }) => {
    await mockOrganizationHome(page);
    await page.setViewportSize({ height: 900, width: 1366 });
    await page.goto("/yona/organizations/weblabs");
    if (fallbackOff) {
      await page
        .locator('link[href*="legacy-fallback.css"]')
        .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
    }
    await assertAvatarState(page, false);
    await page.locator('[data-owner="organization-home-search-input"]').fill("Blank");
    await expect(page.locator('[data-value^="sample "]')).toBeHidden();
    await expect(page.locator('[data-value^="blank "]')).toBeVisible();
    await page.locator('[data-owner="organization-home-search-input"]').fill("");
    await page.setViewportSize({ height: 844, width: 390 });
    await assertAvatarState(page, true);
  });
}
