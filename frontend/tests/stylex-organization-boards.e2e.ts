import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/organizations/$organizationName/boards.tsx", import.meta.url),
  ),
  "utf8",
);
const twoColumnComponentSource = readFileSync(
  fileURLToPath(new URL("../src/components/two-column-mode-checkbox.tsx", import.meta.url)),
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
const legacyFallbackDisabled = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
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
  "organization-boards-empty",
  "organization-boards-empty-icon",
  "organization-boards-empty-message",
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

test("organization boards keeps search geometry in the route and empty-state geometry in its owner", () => {
  expect(routeSource).toContain('padding: "4px 6px"');
  expect(routeSource).toContain("pageSearch");
  expect(routeSource).toContain("requestSubmit");
  expect(styleSource).toContain("organizationBoardsEmptyStyles");
  expect(styleSource).toContain('padding: "100px 0px"');
  expect(styleSource).toContain('backgroundPosition: "-5px -160px"');
});

test("organization boards empty state preserves legacy image, position, size, and message on desktop and mobile", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
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

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/boards`);
    const state = await page
      .locator('[data-stylex-owner="organization-boards-empty"]')
      .evaluate((empty) => {
        const icon = empty.querySelector<HTMLElement>(
          '[data-stylex-owner="organization-boards-empty-icon"]',
        );
        const message = empty.querySelector<HTMLElement>(
          '[data-stylex-owner="organization-boards-empty-message"]',
        );
        if (!icon || !message) return null;
        const emptyBox = empty.getBoundingClientRect();
        const iconBox = icon.getBoundingClientRect();
        const iconStyle = getComputedStyle(icon);
        const messageStyle = getComputedStyle(message);
        return {
          emptyLeft: emptyBox.left,
          emptyWidth: emptyBox.width,
          iconBackgroundImage: iconStyle.backgroundImage,
          iconBackgroundPosition: iconStyle.backgroundPosition,
          iconHeight: iconBox.height,
          iconLeft: iconBox.left,
          iconWidth: iconBox.width,
          message: message.textContent?.trim(),
          messageColor: messageStyle.color,
          messageFontSize: messageStyle.fontSize,
          messageFontWeight: messageStyle.fontWeight,
        };
      });
    expect(state).not.toBeNull();
    expect(state!.emptyWidth).toBeGreaterThan(0);
    expect(state!.emptyWidth).toBeLessThanOrEqual(viewport.width);
    expect(state!.iconBackgroundImage).toContain("sprite");
    expect(state!.iconBackgroundPosition).toBe("-5px -160px");
    expect(state!.iconWidth).toBe(62);
    expect(state!.iconHeight).toBe(82);
    expect(state!.iconLeft).toBeGreaterThanOrEqual(state!.emptyLeft);
    expect(state!.iconLeft + state!.iconWidth).toBeLessThanOrEqual(
      state!.emptyLeft + state!.emptyWidth,
    );
    expect(state!.message).toBe("No post has been added.");
    expect(state!.messageColor).toBe("rgb(137, 137, 137)");
    expect(state!.messageFontSize).toBe("16px");
    expect(state!.messageFontWeight).toBe("700");
  }
});

test("organization boards translates legacy filters and two-column controls to React", () => {
  expect(routeSource).toContain("BoardFilters");
  expect(twoColumnComponentSource).toContain("function TwoColumnModeCheckbox");
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
        notices: [
          {
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            commentCount: 0,
            createdLabel: "Yesterday",
            ownerName: "admin",
            postNumber: 3,
            projectName: "sample",
            title: "Pinned release notice",
          },
        ],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 15,
        totalCount: 2,
        visibleProjects: [{ ownerName: "admin", projectName: "sample" }],
      }),
    });
  });
  await page.goto(`${basePath}/organizations/weblabs/boards`);
  const boardList = page.locator('[data-stylex-owner="organization-boards-list"]');
  const boardRow = boardList.locator('[data-stylex-owner="organization-boards-row"]');
  await expect(boardList).toBeVisible();
  await expect(page.locator('[data-stylex-owner="organization-boards-row"]')).toHaveCount(2);
  await expect(boardList.locator('[data-stylex-owner="organization-boards-title"]')).toHaveText(
    "Release notes",
  );
  await page.locator('[data-stylex-owner="organization-boards-search-input"]').fill("release");
  await expect(page.locator('[data-stylex-owner="organization-boards-search-input"]')).toHaveValue(
    "release",
  );
  await page.locator('[data-stylex-owner="organization-boards-search-input"]').press("Enter");
  await expect(page).toHaveURL(/filter=release/);
  const geometry = await boardRow.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, width: rect.width };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.width).toBeGreaterThan(0);
  await expect(
    boardRow.locator('[data-stylex-owner="organization-boards-row-avatar"]'),
  ).toBeVisible();
  await expect(
    boardRow.locator('[data-stylex-owner="organization-boards-row-title-wrap"]'),
  ).toBeVisible();
  await expect(
    boardRow.locator('[data-stylex-owner="organization-boards-row-post-id"]'),
  ).toHaveText("#4");
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

  await expect(page.locator('[data-stylex-owner="organization-boards-notice-list"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="organization-boards-filters"]')).toBeVisible();
  await page.getByRole("link", { name: "Created" }).click();
  await expect(page).toHaveURL(/orderBy=createdDate/);

  const fallbackOffStyles = await page.evaluate(() => {
    const search = document.querySelector<HTMLElement>(
      '[data-stylex-owner="organization-boards-search"]',
    );
    const filterInput = document.querySelector<HTMLInputElement>(
      '[data-stylex-owner="organization-boards-search-input"]',
    );
    const filters = document.querySelector<HTMLElement>(
      '[data-stylex-owner="organization-boards-filters"]',
    );
    const noticeList = document.querySelector<HTMLElement>(
      '[data-stylex-owner="organization-boards-notice-list"]',
    );
    const list = document.querySelector<HTMLElement>(
      '[data-stylex-owner="organization-boards-list"]',
    );
    const title = document.querySelector<HTMLElement>(
      '[data-stylex-owner="organization-boards-title"]',
    );
    if (!search || !filterInput || !filters || !noticeList || !list || !title) return null;
    const searchStyle = getComputedStyle(search);
    const inputStyle = getComputedStyle(filterInput);
    const filtersStyle = getComputedStyle(filters);
    const noticeStyle = getComputedStyle(noticeList);
    const listStyle = getComputedStyle(list);
    const titleStyle = getComputedStyle(title);
    return {
      filterInputColor: inputStyle.color,
      filterInputPadding: inputStyle.padding,
      filtersColor: filtersStyle.color,
      listMargin: listStyle.margin,
      listPadding: listStyle.padding,
      listStyleType: listStyle.listStyleType,
      noticeListMargin: noticeStyle.margin,
      noticeListPadding: noticeStyle.padding,
      searchBorderBottomWidth: searchStyle.borderBottomWidth,
      titleColor: titleStyle.color,
      titleTextDecorationLine: titleStyle.textDecorationLine,
    };
  });
  expect(fallbackOffStyles).toEqual({
    filterInputColor: "rgb(102, 102, 102)",
    filterInputPadding: "4px 6px",
    filtersColor: "rgb(102, 102, 102)",
    listMargin: "0px",
    listPadding: "0px",
    listStyleType: "none",
    noticeListMargin: "0px",
    noticeListPadding: "0px",
    searchBorderBottomWidth: "1px",
    titleColor: "rgb(51, 51, 51)",
    titleTextDecorationLine: "none",
  });

  const twoColumn = page.locator('[data-stylex-owner="organization-boards-two-column-anchor"]');
  await twoColumn.hover();
  const popover = page.locator('[data-stylex-owner="organization-boards-two-column-popover"]');
  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS("position", "absolute");
  await expect(popover).toHaveCSS("display", "block");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMetrics = await page.evaluate(() => {
    const search = document.querySelector<HTMLElement>(
      '[data-stylex-owner="organization-boards-search"]',
    );
    const list = document.querySelector<HTMLElement>(
      '[data-stylex-owner="organization-boards-list"]',
    );
    if (!search || !list) return null;
    const searchBox = search.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    return {
      listRight: Math.round(listBox.right),
      searchBorderBottomWidth: getComputedStyle(search).borderBottomWidth,
      searchRight: Math.round(searchBox.right),
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobileMetrics).toEqual({
    listRight: 390,
    searchBorderBottomWidth: legacyFallbackDisabled ? "1px" : "0px",
    searchRight: 390,
    viewportWidth: 390,
  });
});
