import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const routeSource = new URL("../src/routes/user/files.tsx", import.meta.url);
const styleSource = new URL("../src/routes/user/-files.stylex.ts", import.meta.url);
const fallbackSource = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockSession(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      },
    }),
  );
}

function fileResponse(filter: string, page: number) {
  return {
    files:
      filter === "avatar"
        ? [
            {
              containerId: 1,
              containerType: "ISSUE_POST",
              createdLabel: "2026-07-19 7:05 PM",
              downloadUrl: "/files/7?action=download",
              id: 7,
              locationHref: "/admin/sample/issue/1",
              locationLabel: "/admin/sample/issue/1",
              mimeType: "image/png",
              name: "avatar.png",
              previewUrl: "/files/7",
              size: 12345,
              sizeLabel: "12.3 kB",
              url: "/files/7",
            },
          ]
        : [],
    filter,
    page,
    pageSize: 50,
    total: filter === "avatar" ? 51 : 0,
    totalPages: filter === "avatar" ? 2 : 0,
  };
}

test.describe("StyleX user files screen family", () => {
  test("declares six route-local owners from the frozen user-files rules", async () => {
    const [route, styles, fallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(styleSource, "utf8"),
      readFile(fallbackSource, "utf8"),
    ]);

    for (const owner of [
      "user-files-files",
      "user-files-header",
      "user-files-row",
      "user-files-search",
      "user-files-search-action",
      "user-files-pagination",
    ]) {
      expect(route).toContain(`data-stylex-owner="${owner}"`);
    }
    expect(route).toContain("userFilesStyles.row, isHovered && userFilesStyles.rowHovered");
    expect(styles).toContain("export const userFilesColors = stylex.defineVars");
    expect(styles).toContain('rowHoverBorder: "#10a2e4"');
    expect(styles).toContain("fontFamily: \"Monaco, Menlo, Consolas, 'Courier New', monospace\"");
    expect(styles).toContain('maxWidth: "40px"');
    expect(styles).toContain('textOverflow: "ellipsis"');
    expect(styles).not.toMatch(/(?:width|height|margin|padding|fontSize):\s*userFilesColors/u);
    expect(fallback).toContain(".attachment-files .row {");
    expect(fallback).toContain(".attachment-file-detail.hover,");
  });

  test("owns empty, populated, search, action, and pagination states", async ({ page }) => {
    await mockSession(page);
    await page.route("**/api/v1/workspace/files**", (route) => {
      const url = new URL(route.request().url());
      const filter = url.searchParams.get("filter") ?? "";
      const page = Number(url.searchParams.get("pageNum") ?? "1");
      return route.fulfill({ contentType: "application/json", json: fileResponse(filter, page) });
    });
    await page.setViewportSize({ height: 900, width: 1366 });

    await page.goto(`${basePath}/user/files`);
    const files = page.locator('[data-stylex-owner="user-files-files"]');
    await expect(files).toBeVisible();
    await expect(files.locator('[data-stylex-owner="user-files-header"]')).toBeVisible();
    await expect(files.locator('[data-stylex-owner="user-files-row"]')).toHaveCount(0);
    await expect(page.locator("#pagination")).toBeEmpty();

    await page.locator('[data-stylex-owner="user-files-search-input"]').fill("avatar");
    await page.locator('[data-stylex-owner="user-files-search-action"]').click();
    await expect(page).toHaveURL(`${basePath}/user/files?filter=avatar&pageNum=1`);
    const row = files.locator('[data-stylex-owner="user-files-row"]');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveCSS("border-bottom-color", "rgb(238, 238, 238)");
    await expect(row.locator(".file-name")).toHaveCSS("font-weight", "700");
    await expect(row.locator(".file-preview img")).toHaveCSS("max-width", "40px");
    await row.hover();
    await expect(row).toHaveCSS("border-color", "rgb(16, 162, 228)");

    const pagination = page.locator('[data-stylex-owner="user-files-pagination"]');
    await expect(pagination).toBeVisible();
    await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
    await pagination.getByText("Next page").click();
    await expect(page).toHaveURL(`${basePath}/user/files?filter=avatar&pageNum=2`);
    await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");

    const boxes = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-stylex-owner="user-files-header"]');
      const row = document.querySelector<HTMLElement>('[data-stylex-owner="user-files-row"]');
      const preview = row?.querySelector<HTMLElement>(".file-preview");
      const name = row?.querySelector<HTMLElement>(".file-name");
      if (!header || !row || !preview || !name) return null;
      const h = header.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      const p = preview.getBoundingClientRect();
      const n = name.getBoundingClientRect();
      return {
        headerBottom: h.bottom,
        nameLeft: n.left,
        previewRight: p.right,
        rowLeft: r.left,
        rowRight: r.right,
        rowTop: r.top,
      };
    });
    expect(boxes).not.toBeNull();
    expect(boxes!.rowTop).toBeGreaterThanOrEqual(boxes!.headerBottom);
    expect(boxes!.previewRight).toBeLessThanOrEqual(boxes!.nameLeft);
    expect(boxes!.rowLeft).toBeGreaterThanOrEqual(0);
    expect(boxes!.rowRight).toBeLessThanOrEqual(1366);
  });
});
