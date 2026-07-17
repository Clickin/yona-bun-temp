import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-issueList.stylex.ts", import.meta.url);

async function openPopulatedIssueList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-issue-list-residual" },
      json: {
        actorId: "1",
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
      },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: "9.9.9" } }),
  );
  await page.route("**/api/v1/site/issues?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        issues: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            issueNumber: "42",
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: "Release blocker",
          },
        ],
        page: 1,
        pageSize: 20,
        state: "open",
        total: 21,
        totalPages: 2,
      },
    }),
  );
  await page.goto(`${basePath}/sites/issueList?state=open`);
  await expect(page.locator('[data-stylex-owner="site-issue-list-row"]')).toBeVisible();
}

test.describe("StyleX site issue-list residual effects", () => {
  test("keeps shadows as route declarations instead of theme variables", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-stylex-owner="site-issue-list-sidebar-badge"');
    expect(route).toContain('data-stylex-owner="site-issue-list-pagination-input"');
    expect(route).toContain(
      'boxShadow: "0px 1px 1px rgba(0,0,0,0.2), inset 0px 1px 1px rgba(0,0,0,0.1)"',
    );
    expect(route).toContain('\":hover\": "inset -1px -1px 2px rgba(0, 0, 0, 0.1)"');
    expect(theme).not.toContain("badgeShadow");
    expect(theme).not.toContain("inputShadow");
  });

  test("preserves badge and page-input shadow output across desktop/mobile", async ({ page }) => {
    await openPopulatedIssueList(page);
    for (const viewport of [
      { height: 900, width: 1366 },
      { height: 844, width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.locator('[data-stylex-owner="site-issue-list-sidebar-badge"]')).toHaveCSS(
        "box-shadow",
        "rgba(0, 0, 0, 0.2) 0px 1px 1px 0px, rgba(0, 0, 0, 0.1) 0px 1px 1px 0px inset",
      );
      const input = page.locator('[data-stylex-owner="site-issue-list-pagination-input"]');
      await input.hover();
      await page.waitForTimeout(500);
      await expect(input).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset");
    }
  });
});
