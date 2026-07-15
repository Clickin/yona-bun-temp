import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const rowSelector = '[data-stylex-owner="site-project-list-row"]';
const routeSource = new URL("../src/routes/sites/projectList.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);

async function openProjectList(page: Page) {
  const session = {
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "siteboss",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-project-list-row" },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
          {
            createdAt: "2026-06-30",
            id: 78,
            ownerName: "yona",
            overview: "Migration tracking",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "conversion",
          },
        ],
        total: 2,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/sites/projectList?filter=road`);
  const rows = page.locator(rowSelector);
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toBeVisible();
  return rows;
}

test.describe("StyleX site project-list populated rows", () => {
  test("uses canonical row, avatar, and column variables through explicit owners", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="site-project-list-row"');
    expect(route).toContain('data-stylex-owner="site-project-list-row-avatar"');
    expect(route).toContain('data-stylex-owner="site-project-list-row-avatar-image"');
    expect(route).toContain('data-stylex-owner="site-project-list-row-columns"');
    expect(route).toContain("styles.projectRow");
    expect(route).toContain("styles.projectRowAvatar");
    expect(route).toContain("styles.projectRowAvatarImage");
    expect(route).toContain("styles.projectRowColumn");
    expect(route).toContain("globalColors.siteProjectListRowBorder");
    expect(route).toContain("globalColors.siteProjectListRowAvatarWidth");
    expect(route).toContain("globalColors.siteProjectListRowEvenSurface");
    expect(route).toContain("globalColors.siteProjectListRowAvatarDisplay");
    expect(route).toContain("globalColors.siteProjectListRowAvatarVerticalAlign");
    expect(route).toContain("globalColors.siteProjectListRowAvatarOverflow");
    expect(route).toContain("globalColors.siteProjectListRowAvatarSurface");
    expect(route).toContain("globalColors.siteProjectListRowAvatarBorderRadius");
    expect(route).toContain("globalColors.siteProjectListRowAvatarImageWidth");
    expect(route).toContain("globalColors.siteProjectListRowAvatarImageVerticalAlign");
    expect(route).toContain("globalColors.siteProjectListRowColumnFontSize");
    expect(theme).toContain("siteProjectListRowLineHeight");
    expect(theme).toContain("siteProjectListRowAvatarFloat");
    expect(theme).toContain("siteProjectListRowEvenSurface");
    expect(theme).toContain("siteProjectListRowAvatarDisplay");
    expect(theme).toContain("siteProjectListRowAvatarImageVerticalAlign");
    expect(theme).toContain("siteProjectListRowColumnWordBreak");
  });

  test("keeps populated project link, copy, column, and action order", async ({ page }) => {
    const rows = await openProjectList(page);
    const first = rows.first();

    await expect(
      first.locator(':scope > [data-stylex-owner="site-project-list-row-columns"]'),
    ).toHaveCount(4);
    await expect(
      first.locator(':scope > [data-stylex-owner="site-project-list-row-columns"]'),
    ).toHaveText([/acme\/roadmap/, "Release planning", "2026-06-29", "Delete"]);
    expect(
      await first
        .locator(':scope > [data-stylex-owner="site-project-list-row-columns"]')
        .evaluateAll((columns) =>
          columns.map((column) =>
            column.className.split(" ").find((name) => name.startsWith("span")),
          ),
        ),
    ).toEqual(["span5", "span4", "span2", "span1"]);
    await expect(
      first.locator('[data-stylex-owner="site-project-list-row-avatar"]'),
    ).toHaveAttribute("href", /\/acme\/roadmap$/);
    await expect(
      first.locator('[data-stylex-owner="site-project-list-project-name"]'),
    ).toHaveAttribute("href", /\/acme\/roadmap$/);
    await first.locator('[data-stylex-owner="site-project-list-project-name"]').click();
    await expect(page).toHaveURL(/\/acme\/roadmap$/);
  });

  test("retires row and avatar fallbacks while preserving shared grid classes", async ({
    page,
  }) => {
    const rows = await openProjectList(page);
    const classes = await rows.first().evaluate((row) => ({
      avatar: Array.from(
        row.querySelector('[data-stylex-owner="site-project-list-row-avatar"]')!.classList,
      ),
      avatarImage: Array.from(
        row.querySelector('[data-stylex-owner="site-project-list-row-avatar-image"]')!.classList,
      ),
      columns: Array.from(
        row.querySelectorAll(':scope > [data-stylex-owner="site-project-list-row-columns"]'),
        (column) => Array.from(column.classList),
      ),
      row: Array.from(row.classList),
    }));

    expect(classes.row).toContain("row-fluid");
    expect(classes.row).not.toContain("listitem");
    expect(classes.row.some((token) => token.startsWith("x"))).toBe(true);
    expect(classes.avatar).not.toContain("avatar-wrap");
    expect(classes.avatar).not.toContain("list-avatar");
    expect(classes.avatar.some((token) => token.startsWith("x"))).toBe(true);
    expect(classes.avatarImage.some((token) => token.startsWith("x"))).toBe(true);
    for (const column of classes.columns) {
      expect(column).toContain("listitem-col");
      expect(column.some((token) => token.startsWith("x"))).toBe(true);
    }
    await expect(rows.first()).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(rows.nth(1)).toHaveCSS("background-color", "rgb(249, 249, 249)");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} row paint, typography, geometry, and capture`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const rows = await openProjectList(page);
      const row = rows.first();
      const avatar = row.locator('[data-stylex-owner="site-project-list-row-avatar"]');
      const avatarImage = row.locator('[data-stylex-owner="site-project-list-row-avatar-image"]');
      const columns = row.locator(':scope > [data-stylex-owner="site-project-list-row-columns"]');

      await expect(rows.first()).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(rows.nth(1)).toHaveCSS("background-color", "rgb(249, 249, 249)");
      await expect(row).toHaveCSS("border-bottom-color", "rgb(239, 239, 239)");
      await expect(row).toHaveCSS("border-bottom-width", "1px");
      await expect(row).toHaveCSS("border-bottom-style", "solid");
      await expect(row).toHaveCSS("line-height", "70px");
      await expect(avatar).toHaveCSS("width", "45px");
      await expect(avatar).toHaveCSS("height", "45px");
      await expect(avatar).toHaveCSS("margin-right", "10px");
      await expect(avatar).toHaveCSS("margin-top", "3px");
      await expect(avatar).toHaveCSS("float", "left");
      // The frozen `display:inline-block` declaration is blockified by `float:left`.
      await expect(avatar).toHaveCSS("display", "block");
      await expect(avatar).toHaveCSS("vertical-align", "middle");
      await expect(avatar).toHaveCSS("overflow", "hidden");
      await expect(avatar).toHaveCSS("background-color", "rgb(221, 221, 221)");
      await expect(avatar).toHaveCSS("border-radius", "3px");
      await expect(avatarImage).toHaveCSS("width", "45px");
      await expect(avatarImage).toHaveCSS("vertical-align", "top");
      for (const column of await columns.all()) {
        await expect(column).toHaveCSS("font-size", "12px");
        await expect(column).toHaveCSS("padding-top", "10px");
        await expect(column).toHaveCSS("padding-right", "0px");
        await expect(column).toHaveCSS("padding-bottom", "10px");
        await expect(column).toHaveCSS("padding-left", "0px");
        await expect(column).toHaveCSS("text-overflow", "ellipsis");
        await expect(column).toHaveCSS("word-break", "break-all");
        await expect(column).toHaveCSS("line-height", "20px");
      }

      const boxes = await row.evaluate((element) => {
        const rowBox = element.getBoundingClientRect();
        const columnBoxes = Array.from(
          element.querySelectorAll(':scope > [data-stylex-owner="site-project-list-row-columns"]'),
          (column) => column.getBoundingClientRect(),
        );
        const avatarBox = element
          .querySelector('[data-stylex-owner="site-project-list-row-avatar"]')!
          .getBoundingClientRect();
        const avatarImageBox = element
          .querySelector('[data-stylex-owner="site-project-list-row-avatar-image"]')!
          .getBoundingClientRect();
        return {
          avatar: {
            bottom: avatarBox.bottom,
            left: avatarBox.left,
            right: avatarBox.right,
            top: avatarBox.top,
          },
          avatarImage: {
            bottom: avatarImageBox.bottom,
            left: avatarImageBox.left,
            right: avatarImageBox.right,
            top: avatarImageBox.top,
          },
          columns: columnBoxes.map(({ bottom, left, right, top }) => ({
            bottom,
            left,
            right,
            top,
          })),
          row: { bottom: rowBox.bottom, left: rowBox.left, right: rowBox.right, top: rowBox.top },
        };
      });
      for (const [index, column] of boxes.columns.entries()) {
        expect(column.left).toBeGreaterThanOrEqual(boxes.row.left - 1);
        expect(column.right).toBeLessThanOrEqual(boxes.row.right + 1);
        expect(column.top).toBeGreaterThanOrEqual(boxes.row.top - 1);
        expect(column.bottom).toBeLessThanOrEqual(boxes.row.bottom + 1);
        if (index > 0) {
          const previous = boxes.columns[index - 1]!;
          if (viewport.name === "desktop") {
            expect(previous.right).toBeLessThanOrEqual(column.left + 1);
          } else {
            expect(previous.top).toBeLessThanOrEqual(column.top);
          }
        }
      }
      expect(boxes.avatar.left).toBeGreaterThanOrEqual(boxes.columns[0]!.left - 1);
      expect(boxes.avatar.right).toBeLessThanOrEqual(boxes.columns[0]!.right + 1);
      expect(boxes.avatar.top).toBeGreaterThanOrEqual(boxes.columns[0]!.top - 1);
      expect(boxes.avatar.bottom).toBeLessThanOrEqual(boxes.columns[0]!.bottom + 1);
      expect(boxes.avatarImage.left).toBeCloseTo(boxes.avatar.left, 0);
      expect(boxes.avatarImage.right).toBeCloseTo(boxes.avatar.right, 0);
      expect(boxes.avatarImage.top).toBeGreaterThanOrEqual(boxes.avatar.top - 1);
      expect(boxes.avatarImage.bottom).toBeLessThanOrEqual(boxes.avatar.bottom + 1);
      expect(
        (await page.locator('[data-stylex-owner="site-project-list-container"]').screenshot())
          .byteLength,
      ).toBeGreaterThan(0);
    });
  }

  test("keeps generated row classes inside the explicit row owners", async ({ page }) => {
    await openProjectList(page);
    const owners = await page
      .locator('[data-stylex-owner="site-project-list-container"]')
      .evaluate((list) =>
        Array.from(list.querySelectorAll(":scope > li, :scope > li *"))
          .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
          .map((element) =>
            element.closest("[data-stylex-owner]")?.getAttribute("data-stylex-owner"),
          ),
      );

    expect(new Set(owners)).toEqual(
      new Set([
        "site-project-list-row",
        "site-project-list-row-avatar",
        "site-project-list-row-avatar-image",
        "site-project-list-row-columns",
        "site-project-list-project-name",
        "site-project-list-delete-action",
      ]),
    );
  });
});
