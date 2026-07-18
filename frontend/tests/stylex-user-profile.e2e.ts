import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("public user profile renders legacy info and stream owners", async ({ page }) => {
  const source = await readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  expect(source).toContain('data-stylex-owner="user-profile-days-ago-input"');
  expect(source).toContain("daysAgoInput");
  expect(source).not.toContain('style={{ margin: "0px 5px", verticalAlign: "bottom" }}');

  await page.setViewportSize({ width: 1366, height: 900 });
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
        issueItems: [
          {
            id: 1,
            number: 1,
            title: "Sample issue",
            state: "open",
            projectOwnerName: "admin",
            projectName: "sample",
            authorLoginId: "admin",
            authorLabel: "Admin",
            createdLabel: "today",
            labels: [],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
  await page.goto("/yona/admin");
  await expect(page.locator('[data-stylex-owner="user-profile-box"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-info"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-stream"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-tabs"]')).toBeVisible();
  const desktopDaysAgo = await page
    .locator('[data-stylex-owner="user-profile-days-ago-input"]')
    .evaluate((node) => {
      const input = node.getBoundingClientRect();
      const stream = node
        .closest('[data-stylex-owner="user-profile-stream"]')
        ?.getBoundingClientRect();
      const computed = getComputedStyle(node);
      return {
        hasInlineStyle: node.hasAttribute("style"),
        margin: computed.margin,
        verticalAlign: computed.verticalAlign,
        input: { left: input.left, right: input.right },
        stream: stream ? { left: stream.left, right: stream.right } : null,
      };
    });
  expect(desktopDaysAgo.hasInlineStyle).toBe(false);
  expect(desktopDaysAgo.margin).toBe("0px 5px");
  expect(desktopDaysAgo.verticalAlign).toBe("bottom");
  expect(desktopDaysAgo.stream).not.toBeNull();
  expect(desktopDaysAgo.input.left).toBeGreaterThanOrEqual(desktopDaysAgo.stream!.left);
  expect(desktopDaysAgo.input.right).toBeLessThanOrEqual(desktopDaysAgo.stream!.right);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-stylex-owner="user-profile-box"]')).toBeVisible();
  const width = await page.locator('[data-stylex-owner="user-profile-box"]').evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(width.width).toBeGreaterThan(0);
  expect(width.scrollWidth).toBe(390);
  const mobileDaysAgo = await page
    .locator('[data-stylex-owner="user-profile-days-ago-input"]')
    .evaluate((node) => {
      const input = node.getBoundingClientRect();
      const stream = node
        .closest('[data-stylex-owner="user-profile-stream"]')
        ?.getBoundingClientRect();
      const computed = getComputedStyle(node);
      return {
        hasInlineStyle: node.hasAttribute("style"),
        margin: computed.margin,
        verticalAlign: computed.verticalAlign,
        input: { left: input.left, right: input.right },
        stream: stream ? { left: stream.left, right: stream.right } : null,
      };
    });
  expect(mobileDaysAgo.hasInlineStyle).toBe(false);
  expect(mobileDaysAgo.margin).toBe("0px 5px");
  expect(mobileDaysAgo.verticalAlign).toBe("bottom");
  expect(mobileDaysAgo.stream).not.toBeNull();
  expect(mobileDaysAgo.input.left).toBeGreaterThanOrEqual(mobileDaysAgo.stream!.left);
  expect(mobileDaysAgo.input.right).toBeLessThanOrEqual(mobileDaysAgo.stream!.right);
});
