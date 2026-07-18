import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/organizations/$organizationName/boards.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/organizations/$organizationName/-organization-boards.stylex.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);
const owners = [
  "organization-boards-search",
  "organization-boards-page",
  "organization-boards-shell",
  "organization-boards-search-input",
  "organization-boards-filters",
  "organization-boards-notice-list",
  "organization-boards-list",
  "organization-boards-row",
  "organization-boards-row-avatar",
  "organization-boards-row-title-wrap",
  "organization-boards-row-post-id",
  "organization-boards-title",
  "organization-boards-pagination",
] as const;

test("organization boards exposes direct StyleX owners for search, filters, and rows", () => {
  expect(new Set(owners).size).toBe(owners.length);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-organization-boards.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
});

test("organization boards keeps geometry in route declarations and theme variables paint-only", () => {
  for (const geometryProperty of ["margin:", "padding:", "width:", "height:", "top:", "left:"]) {
    expect(styleSource).not.toContain(geometryProperty);
  }
  expect(routeSource).toContain('padding: "4px 6px"');
  expect(routeSource).toContain("pageSearch");
  expect(routeSource).toContain("requestSubmit");
});

test("organization boards translates legacy filters and two-column controls to React", () => {
  expect(routeSource).toContain("BoardFilters");
  expect(routeSource).toContain("TwoColumnModeCheckbox");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("organization boards keeps the visible shell within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { organizationName: "weblabs", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/boards**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 15,
        totalCount: 0,
        visibleProjects: [],
      },
    }),
  );
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/organizations/weblabs/boards`);
  const pageOwner = page.locator('[data-stylex-owner="organization-boards-page"]');
  await expect(pageOwner).toBeVisible();
  const rect = await pageOwner.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width };
  });
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.right).toBeLessThanOrEqual(390);
});

test("organization boards renders populated post and submits filter through router state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ organizationName: "weblabs", viewerCanUpdate: true }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/boards**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            commentCount: 2,
            createdLabel: "Today",
            ownerName: "admin",
            postNumber: 4,
            projectName: "sample",
            title: "Release notes",
          },
        ],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 15,
        totalCount: 1,
        visibleProjects: [{ ownerName: "admin", projectName: "sample" }],
      }),
    });
  });
  await page.goto(`${basePath}/organizations/weblabs/boards`);
  await expect(page.locator('[data-stylex-owner="organization-boards-list"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="organization-boards-row"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="organization-boards-title"]')).toHaveText(
    "Release notes",
  );
  await page.locator('[data-stylex-owner="organization-boards-search-input"]').fill("release");
  await expect(page.locator('[data-stylex-owner="organization-boards-search-input"]')).toHaveValue(
    "release",
  );
  await page.locator('[data-stylex-owner="organization-boards-search-input"]').press("Enter");
  await expect(page).toHaveURL(/filter=release/);
  const geometry = await page
    .locator('[data-stylex-owner="organization-boards-row"]')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.width).toBeGreaterThan(0);
  await expect(page.locator('[data-stylex-owner="organization-boards-row-avatar"]')).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="organization-boards-row-title-wrap"]'),
  ).toBeVisible();
  await expect(page.locator('[data-stylex-owner="organization-boards-row-post-id"]')).toHaveText(
    "#4",
  );
  const rowStyles = await page.evaluate(() => {
    const avatar = document.querySelector('[data-stylex-owner="organization-boards-row-avatar"]');
    const titleWrap = document.querySelector(
      '[data-stylex-owner="organization-boards-row-title-wrap"]',
    );
    const postId = document.querySelector('[data-stylex-owner="organization-boards-row-post-id"]');
    if (!avatar || !titleWrap || !postId) return null;
    const avatarStyle = getComputedStyle(avatar);
    const titleStyle = getComputedStyle(titleWrap);
    const postIdStyle = getComputedStyle(postId);
    return {
      avatarFloat: avatarStyle.float,
      avatarMarginRight: avatarStyle.marginRight,
      titleOverflow: titleStyle.overflow,
      titleWhiteSpace: titleStyle.whiteSpace,
      postIdColor: postIdStyle.color,
      postIdMarginRight: postIdStyle.marginRight,
    };
  });
  expect(rowStyles).toEqual({
    avatarFloat: "left",
    avatarMarginRight: "10px",
    titleOverflow: "hidden",
    titleWhiteSpace: "nowrap",
    postIdColor: "rgb(153, 153, 153)",
    postIdMarginRight: "5px",
  });
});
