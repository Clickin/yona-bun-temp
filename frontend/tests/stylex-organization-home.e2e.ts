import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("organization home owns legacy small-font typography in route-local StyleX", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  const route = readFileSync("src/routes/organizations/$organizationName.tsx", "utf8");
  const stylex = readFileSync("src/routes/organizations/-organization-home.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");

  expect(legacy).toContain(".small-font{");
  expect(legacy).toContain("font-size: 10px;");
  expect(legacy).toContain("font-weight: normal;");
  expect(appCss).not.toContain(".small-font");
  expect(route).not.toContain("small-font");
  expect(route).toContain('data-stylex-owner="organization-home-project-origin"');
  expect(route).toContain('data-stylex-owner="organization-home-project-code-update"');
  expect(stylex).toContain('smallFont: { fontSize: "10px", fontWeight: "normal" }');
});

test("organization home renders legacy project and member panels", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/organizations/acme/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "acme",
        description: "Acme projects",
        logoUrl: "",
        viewerCanUpdate: true,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanCreateProject: true,
        visibleProjects: [
          {
            ownerName: "acme",
            projectName: "sample",
            overview: "Sample project",
            projectScope: "PUBLIC",
            createdLabel: "today",
            labels: [],
          },
        ],
        adminMembers: [{ loginId: "admin", userLabel: "Admin", avatarUrl: "" }],
        memberMembers: [],
      },
    }),
  );
  await page.goto("/yona/organizations/acme");
  await expect(page.locator('[data-stylex-owner="organization-home-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="organization-home-overview"]')).toContainText(
    "Acme projects",
  );
  await expect(page.locator('[data-stylex-owner="organization-home-projects"]')).toContainText(
    "sample",
  );
  await expect(page.locator('[data-stylex-owner="organization-home-members"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const containment = await page
    .locator('[data-stylex-owner="organization-home-page"]')
    .evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
  expect(containment.width).toBeGreaterThan(0);
  expect(containment.scrollWidth).toBe(390);
});
