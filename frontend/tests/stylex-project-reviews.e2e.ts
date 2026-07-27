import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/reviews.tsx", import.meta.url)),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-reviews.stylex.ts", import.meta.url),
  ),
  "utf8",
);
const owners = [
  "project-reviews-sidebar",
  "project-reviews-search-input",
  "project-reviews-sort",
  "project-reviews-tabs",
  "project-reviews-list-wrap",
  "project-reviews-list",
  "project-reviews-row",
  "project-reviews-title",
];
const emptyOwners = [
  "project-reviews-empty-state",
  "project-reviews-empty-icon",
  "project-reviews-empty-message",
] as const;

test("reviews route exposes direct StyleX owners for sidebar, filters, and review rows", () => {
  expect(new Set([...owners, ...emptyOwners]).size).toBe(11);
  for (const owner of [...owners, ...emptyOwners]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-reviews.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
});

test("reviews route keeps geometry in route declarations and theme variables paint-only", () => {
  const themeSource = styleSource.slice(
    styleSource.indexOf("stylex.defineVars({"),
    styleSource.indexOf("export const reviewsLayout"),
  );
  for (const geometryProperty of ["margin:", "padding:", "width:", "height:", "top:", "left:"]) {
    expect(themeSource).not.toContain(geometryProperty);
  }
  expect(routeSource).toContain('padding: "4px 6px"');
  expect(routeSource).toContain("pushReviews");
  expect(routeSource).toContain("reviewThreadRoute");
});

test("reviews route translates legacy filters, sorting, and pagination to router state", () => {
  expect(routeSource).toContain("filterClick");
  expect(routeSource).toContain("nextCreatedDateOrderDir");
  expect(routeSource).toContain("SitePagination");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("reviews list renders populated row and preserves filter/sort interaction", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerUserId: 1,
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/reviews**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        allCount: 1,
        authorCount: 1,
        closedCount: 0,
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            comments: [
              { authorLabel: "Alice", authorLoginId: "alice", contentsMarkdown: "Needs review" },
            ],
            commitId: "abc123",
            createdLabel: "Today",
            id: 3,
            isOutdated: false,
            path: "src/App.ts",
            prevCommitId: "",
            state: "open",
          },
        ],
        openCount: 1,
        pageNum: 1,
        pageSize: 15,
        participantCount: 1,
        state: "open",
        totalCount: 1,
      }),
    });
  });
  await page.goto(`${basePath}/admin/sample/reviews`);
  const ownerSelectors = [
    "project-reviews-sidebar",
    "project-reviews-search-input",
    "project-reviews-tabs",
    "project-reviews-list",
  ] as const;
  for (const owner of ownerSelectors) {
    const locator = page.locator(`[data-stylex-owner="${owner}"]`);
    await expect(locator).toBeVisible();
    expect(await locator.getAttribute("class")).toMatch(/\bx[\w-]+\b/u);
  }
  await expect(page.locator('[data-stylex-owner="project-reviews-list"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-reviews-row"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="project-reviews-title"]')).toHaveText(
    "Needs review",
  );
  await page.locator('[data-stylex-owner="project-reviews-search-input"]').fill("review");
  await page.locator("#search button[type=submit]").click();
  await expect(page).toHaveURL(/filter=review/);
  await page.locator('[data-stylex-owner="project-reviews-sort"]').click();
  await expect(page).toHaveURL(/orderDir=asc/);
  const geometry = await page
    .locator('[data-stylex-owner="project-reviews-row"]')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.width).toBeGreaterThan(0);

  const styleSnapshot = await page.evaluate(() => {
    const owner = (name: string) => {
      const element = document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`);
      if (!element) throw new Error(`Missing ${name}`);
      return getComputedStyle(element);
    };
    const sidebar = owner("project-reviews-sidebar");
    const input = owner("project-reviews-search-input");
    const tabs = owner("project-reviews-tabs");
    const list = owner("project-reviews-list");
    return {
      inputBorderTopWidth: input.borderTopWidth,
      inputPaddingLeft: input.paddingLeft,
      listStyleType: list.listStyleType,
      sidebarBorderTopStyle: sidebar.borderTopStyle,
      sidebarBorderTopWidth: sidebar.borderTopWidth,
      tabsBorderBottomStyle: tabs.borderBottomStyle,
      tabsBorderBottomWidth: tabs.borderBottomWidth,
    };
  });
  expect(styleSnapshot.sidebarBorderTopStyle).toBe("solid");
  expect(styleSnapshot.sidebarBorderTopWidth).toBe("1px");
  expect(styleSnapshot.inputBorderTopWidth).toBe("1px");
  expect(styleSnapshot.inputPaddingLeft).toBe("6px");
  expect(styleSnapshot.tabsBorderBottomStyle).toBe("solid");
  expect(styleSnapshot.tabsBorderBottomWidth).toBe("1px");
  expect(styleSnapshot.listStyleType).toBe("none");

  await page.setViewportSize({ width: 390, height: 844 });
  for (const owner of ownerSelectors) {
    const locator = page.locator(`[data-stylex-owner="${owner}"]`);
    await expect(locator).toBeVisible();
    expect(await locator.getAttribute("class")).toMatch(/\bx[\w-]+\b/u);
  }
});

test("reviews empty state preserves legacy error geometry on desktop and mobile", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerUserId: 1,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/reviews**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        allCount: 0,
        authorCount: 0,
        closedCount: 0,
        items: [],
        openCount: 0,
        pageNum: 1,
        pageSize: 15,
        participantCount: 0,
        state: "open",
        totalCount: 0,
      }),
    });
  });

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/reviews`);
    await expect(page.locator('[data-stylex-owner="project-reviews-empty-state"]')).toBeVisible();
    await expect(page.locator(".error-wrap")).toHaveClass(/x[\w-]+/u);
    await expect(page.locator(".error-wrap")).toHaveText("No review has been added.");

    const computed = await page.evaluate(() => {
      const required = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return element;
      };
      const state = required('[data-stylex-owner="project-reviews-empty-state"]');
      const icon = required('[data-stylex-owner="project-reviews-empty-icon"]');
      const message = required('[data-stylex-owner="project-reviews-empty-message"]');
      const stateStyle = getComputedStyle(state);
      const iconStyle = getComputedStyle(icon);
      const messageStyle = getComputedStyle(message);
      const stateRect = state.getBoundingClientRect();
      const messageRect = message.getBoundingClientRect();
      return {
        stateWidth: stateRect.width,
        messageCenter: messageRect.left + messageRect.width / 2,
        stateCenter: stateRect.left + stateRect.width / 2,
        paddingTop: stateStyle.paddingTop,
        paddingBottom: stateStyle.paddingBottom,
        textAlign: stateStyle.textAlign,
        iconWidth: iconStyle.width,
        iconHeight: iconStyle.height,
        iconImage: iconStyle.backgroundImage,
        iconPosition: iconStyle.backgroundPosition,
        iconDisplay: iconStyle.display,
        messageColor: messageStyle.color,
        messageFontSize: messageStyle.fontSize,
        messageFontWeight: messageStyle.fontWeight,
        messageMargin: messageStyle.margin,
      };
    });
    expect(computed.paddingTop).toBe("100px");
    expect(computed.paddingBottom).toBe("100px");
    expect(computed.textAlign).toBe("center");
    expect(computed.iconWidth).toBe("62px");
    expect(computed.iconHeight).toBe("82px");
    expect(computed.iconImage).not.toBe("none");
    expect(computed.iconPosition).toBe("-5px -160px");
    expect(computed.iconDisplay).toBe("inline-block");
    expect(computed.messageColor).toBe("rgb(137, 137, 137)");
    expect(computed.messageFontSize).toBe("16px");
    expect(computed.messageFontWeight).toBe("700");
    expect(computed.messageMargin).toBe("30px 0px");
    expect(computed.messageCenter).toBeCloseTo(computed.stateCenter, 0);
  }
});
