import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("public user profile renders legacy info and stream owners", async ({ page }) => {
  const source = await readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  const legacy = await readFile(
    new URL("../../yona-original/app/views/user/partial_projectlist.scala.html", import.meta.url),
    "utf8",
  );
  const twoColumnLegacy = await readFile(
    new URL(
      "../../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const subtasksLegacy = await readFile(
    new URL(
      "../../yona-original/app/views/common/showSubtasksCheckbox.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const styleSource = await readFile(
    new URL("../src/routes/-user-profile.stylex.ts", import.meta.url),
    "utf8",
  );
  expect(legacy).toContain('<div class="pull-left" style="margin-left: 10px;">');
  expect(source).toContain('data-stylex-owner="user-profile-project-info"');
  expect(source).toContain("projectInfo");
  expect(source).not.toContain('style={{ marginLeft: "10px" }}');
  expect(source).toContain('data-stylex-owner="user-profile-days-ago-input"');
  expect(source).toContain("daysAgoInput");
  expect(source).not.toContain('style={{ margin: "0px 5px", verticalAlign: "bottom" }}');
  expect(twoColumnLegacy).toContain('class="two-column-icon mr10 hide-in-mobile"');
  expect(subtasksLegacy).toContain('class="show-subtasks mr10"');
  expect(source).toContain('data-stylex-owner="user-profile-two-column-popover-anchor"');
  expect(source).toContain('data-stylex-owner="user-profile-show-subtasks-popover-anchor"');
  expect(source).not.toContain('style={{ position: "relative" }}');
  expect(styleSource).toContain('popoverAnchor: { position: "relative" }');

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
  await page.goto("/yona/admin");
  await expect(page.locator('[data-stylex-owner="user-profile-box"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-info"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-stream"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-tabs"]')).toBeVisible();
  for (const owner of [
    "user-profile-two-column-popover-anchor",
    "user-profile-show-subtasks-popover-anchor",
  ]) {
    const anchor = page.locator(`[data-stylex-owner="${owner}"]`);
    await expect(anchor).toHaveCSS("position", "relative");
    await expect(anchor).not.toHaveAttribute("style", /position/u);
  }
  await page.getByRole("button", { name: /Projects/i }).click();
  const projectInfo = page.locator('[data-stylex-owner="user-profile-project-info"]');
  await expect(projectInfo).toBeVisible();
  await expect(projectInfo.getByRole("link", { name: "sample", exact: true })).toBeVisible();
  const projectRow = projectInfo.locator("xpath=ancestor::li[contains(@class, 'project')]");
  await expect(projectRow.locator("a.watchBtn")).toBeVisible();
  await expect(projectRow.locator("a.leaveProject")).toBeVisible();
  const projectGeometry = await projectInfo.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const stream = node.closest(".user-streams")?.getBoundingClientRect();
    const computed = getComputedStyle(node);
    return {
      hasInlineStyle: node.hasAttribute("style"),
      marginLeft: computed.marginLeft,
      left: rect.left,
      right: rect.right,
      stream: stream ? { left: stream.left, right: stream.right } : null,
    };
  });
  expect(projectGeometry.hasInlineStyle).toBe(false);
  expect(projectGeometry.marginLeft).toBe("10px");
  expect(projectGeometry.stream).not.toBeNull();
  expect(projectGeometry.left).toBeGreaterThanOrEqual(projectGeometry.stream!.left);
  expect(projectGeometry.right).toBeLessThanOrEqual(projectGeometry.stream!.right);
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
  const mobileProjectGeometry = await page
    .locator('[data-stylex-owner="user-profile-project-info"]')
    .evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const stream = node.closest(".user-streams")?.getBoundingClientRect();
      return {
        hasInlineStyle: node.hasAttribute("style"),
        marginLeft: getComputedStyle(node).marginLeft,
        left: rect.left,
        right: rect.right,
        stream: stream ? { left: stream.left, right: stream.right } : null,
      };
    });
  expect(mobileProjectGeometry.hasInlineStyle).toBe(false);
  expect(mobileProjectGeometry.marginLeft).toBe("10px");
  expect(mobileProjectGeometry.stream).not.toBeNull();
  expect(mobileProjectGeometry.left).toBeGreaterThanOrEqual(mobileProjectGeometry.stream!.left);
  expect(mobileProjectGeometry.right).toBeLessThanOrEqual(mobileProjectGeometry.stream!.right);
});
