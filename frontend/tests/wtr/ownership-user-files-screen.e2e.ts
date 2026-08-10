import { readFileSync } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdir = async () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const routeSource = new URL("../src/routes/user/files.tsx", import.meta.url);
const styleSource = new URL("../src/app.css", import.meta.url);
const fallbackSource = new URL("../src/app.css", import.meta.url);
const legacyTemplateSource = new URL(
  "../../yona-original/app/views/user/userFiles.scala.html",
  import.meta.url,
);
const legacyCommonSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const legacySpritesSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_sprites.less",
  import.meta.url,
);
const legacyResponsiveSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const legacyYobiSource = new URL(
  "../../yona-original/app/assets/stylesheets/yobi.less",
  import.meta.url,
);
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

test.describe("Style user files screen family", () => {
  test("declares six route-local owners from the frozen user-files rules", async () => {
    const [route, styles, fallback, template, common, sprites, responsive, yobi] =
      await Promise.all([
        readFile(routeSource, "utf8"),
        readFile(styleSource, "utf8"),
        readFile(fallbackSource, "utf8"),
        readFile(legacyTemplateSource, "utf8"),
        readFile(legacyCommonSource, "utf8"),
        readFile(legacySpritesSource, "utf8"),
        readFile(legacyResponsiveSource, "utf8"),
        readFile(legacyYobiSource, "utf8"),
      ]);

    for (const owner of [
      "user-files-files",
      "user-files-header",
      "user-files-row",
      "user-files-search",
      "user-files-search-action",
      "user-files-pagination",
      "user-files-pagination-list",
      "user-files-pagination-item",
      "user-files-pagination-icon",
      "user-files-pagination-label",
      "user-files-pagination-input",
    ]) {
      expect(route).toContain(`data-owner="${owner}"`);
    }
    expect(template).toContain('<div id="pagination"></div>');
    expect(template).toContain(
      'yobi.Pagination.update($("#pagination"), @currentPage.getTotalPageCount);',
    );
    expect(common).toContain(".page-navigation-wrap {");
    expect(common).toContain(".page-nums");
    expect(common).toContain(".input-mini");
    expect(common).toContain(".nospinner");
    expect(sprites).toContain(".btn-pg-prev {");
    expect(sprites).toContain("background-position: -136px -139px;");
    expect(sprites).toContain("background-position: -164px -2px;");
    expect(sprites).toContain(".btn-pg-next {");
    expect(sprites).toContain("background-position: -146px -139px;");
    expect(sprites).toContain("background-position: -23px -13px;");
    expect(responsive).toContain(".page-nums");
    expect(yobi.trim()).toContain('@import "less/_common.less";');
    expect(yobi.trim()).toContain('@import "less/_sprites.less";');
    expect(route).toContain('import legacySpriteUrl from "../../assets/legacy/sprite.png";');
    expect(styles).toContain("--user-files-pagination-sprite");
    expect(route).not.toContain("page-navigation-wrap");
    expect(route).not.toContain("page-nums");
    expect(route).not.toContain("input-mini nospinner");
    expect(route).not.toContain("btn-pg-prev");
    expect(route).not.toContain("btn-pg-next");
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
    const files = page.locator('[data-owner="user-files-files"]');
    await expect(files).toBeVisible();
    await expect(files.locator('[data-owner="user-files-header"]')).toBeVisible();
    await expect(files.locator('[data-owner="user-files-row"]')).toHaveCount(0);
    await expect(page.locator("#pagination")).toBeEmpty();

    await page.locator('[data-owner="user-files-search-input"]').fill("avatar");
    await page.locator('[data-owner="user-files-search-action"]').click();
    await expect(page).toHaveURL(`${basePath}/user/files?filter=avatar&pageNum=1`);
    const row = files.locator('[data-owner="user-files-row"]');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveCSS("border-bottom-color", "rgb(238, 238, 238)");
    await expect(row.locator(".file-name")).toHaveCSS("font-weight", "700");
    await expect(row.locator(".file-preview img")).toHaveCSS("max-width", "40px");
    await row.hover();
    await expect(row).toHaveCSS("border-color", "rgb(16, 162, 228)");

    const pagination = page.locator('[data-owner="user-files-pagination"]');
    await expect(pagination).toBeVisible();
    await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
    await expect(pagination.locator('[data-owner="user-files-pagination-item"]')).toHaveCount(5);
    await expect(pagination.locator('[data-owner="user-files-pagination-label"]')).toHaveText([
      "Previous page",
      "Next page",
    ]);
    await expect(pagination.locator('[data-owner="user-files-pagination-icon"]')).toHaveCount(2);
    await expect(
      pagination.locator('[data-owner="user-files-pagination-icon"]').first(),
    ).toHaveAttribute("data-disabled", "true");
    await expect(
      pagination.locator('[data-owner="user-files-pagination-icon"]').last(),
    ).not.toHaveAttribute("data-disabled");
    for (const owner of await pagination.locator("[data-owner]").all()) {
      await expect(owner).not.toHaveClass(
        /(?:page-navigation-wrap|page-nums|page-num|ikon|delimiter|input-mini|nospinner|ico|btn-pg-prev|btn-pg-next|off)/u,
      );
    }
    await pagination.locator('[data-owner="user-files-pagination-input"]').hover();
    await expect(pagination.locator('[data-owner="user-files-pagination-input"]')).toHaveCSS(
      "border-color",
      "rgb(243, 108, 34)",
    );
    await pagination.locator('[data-owner="user-files-pagination-input"]').focus();
    await expect(pagination.locator('[data-owner="user-files-pagination-input"]')).toHaveCSS(
      "box-shadow",
      "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset",
    );
    await pagination.locator('[data-owner="user-files-pagination-input"]').fill("2");
    await pagination.locator('[data-owner="user-files-pagination-input"]').press("Enter");
    await expect(page).toHaveURL(`${basePath}/user/files?filter=avatar&pageNum=2`);
    await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");

    const boxes = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-owner="user-files-header"]');
      const row = document.querySelector<HTMLElement>('[data-owner="user-files-row"]');
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

    await mkdir(resolve("output/playwright/batch-820"), { recursive: true });
    await page.screenshot({
      path: resolve("output/playwright/batch-820/user-files-pagination-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ height: 844, width: 390 });
    await expect(pagination).toBeVisible();
    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(mobileOverflow).toBe(true);
    const mobileBox = await pagination.boundingBox();
    expect(mobileBox).not.toBeNull();
    expect(mobileBox!.x).toBeGreaterThanOrEqual(0);
    expect(mobileBox!.x + mobileBox!.width).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: resolve("output/playwright/batch-820/user-files-pagination-mobile.png"),
      fullPage: true,
    });
  });
});
