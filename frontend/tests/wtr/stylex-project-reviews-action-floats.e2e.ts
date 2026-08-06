import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallback = process.env.VITE_DISABLE_LEGACY_FALLBACK ? "fallback-off" : "normal";
const screenshotDir = resolve(`output/playwright/stylex-project-reviews-action-floats/${fallback}`);
const route = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
const stylex = readFileSync("src/routes/$ownerName/$projectName/-reviews.stylex.ts", "utf8");
const legacy = readFileSync("../yona-original/app/views/reviewthread/list.scala.html", "utf8");
const partial = readFileSync(
  "../yona-original/app/views/reviewthread/partial_list.scala.html",
  "utf8",
);
const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
const responsive = readFileSync(
  "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  "utf8",
);
const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
const yobiResponsiveLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_responsive.less",
  "utf8",
);
const messages = readFileSync("../yona-original/conf/messages", "utf8");

test("reviews action wrappers translate legacy floats and preserve source evidence", () => {
  expect(legacy).toContain('<div class="pull-right filters">');
  expect(legacy).toContain('<div class="pull-left" style="padding:10px;">');
  expect(partial).toContain('<ul class="post-list-wrap">');
  expect(bootstrap).toMatch(/\.pull-right\s*\{[^}]*float:\s*right;/u);
  expect(bootstrap).toMatch(/\.pull-left\s*\{[^}]*float:\s*left;/u);
  for (const imported of [
    "_variables.less",
    "_mixins.less",
    "_common.less",
    "_sprites.less",
    "_page.less",
    "_tippy.less",
    "_scrollbar.less",
    "_responsive.less",
    "_yobiUI.less",
    "_temporary.less",
    "_markdown.less",
    "_migration.less",
    "_override.less",
  ])
    expect(yobi).toContain(`@import "less/${imported}"`);
  expect(responsive).toContain("@media");
  expect(pageLess).toContain(".post-list-wrap");
  expect(yobiResponsiveLess).toContain(".post-list-wrap");
  expect(messages).toContain("issue.downloadAsExcel = Download as Excel file");
  expect(route).toContain('data-stylex-owner="project-reviews-filters"');
  expect(route).toContain('data-stylex-owner="project-reviews-export-action"');
  expect(route).not.toMatch(
    /data-stylex-owner="project-reviews-(filters|export-action)"[^>]*pull-(?:right|left)/u,
  );
  expect(stylex).toContain('float: "right"');
  expect(stylex).toContain('float: "left"');
});

test(`reviews filters and export action float parity (${fallback})`, async ({ page }) => {
  mkdirSync(screenshotDir, { recursive: true });
  await page.route("**/api/v1/session", async (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Admin",
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
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
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/reviews**", async (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        allCount: 1,
        authorCount: 1,
        closedCount: 0,
        openCount: 1,
        participantCount: 1,
        pageNum: 1,
        pageSize: 15,
        state: "open",
        totalCount: 1,
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            comments: [
              {
                authorLabel: "Admin",
                authorLoginId: "admin",
                contentsMarkdown: "Review export action",
              },
            ],
            commitId: "abc123",
            createdLabel: "Jul 18, 2026",
            id: 1,
            path: "src/main.rs",
            pullRequestNumber: 1,
            state: "open",
          },
        ],
      }),
    }),
  );
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/reviews`);
  const filters = page.locator('[data-stylex-owner="project-reviews-filters"]');
  const exportAction = page.locator('[data-stylex-owner="project-reviews-export-action"]');
  await expect(filters).toHaveCSS("float", "right");
  await expect(exportAction).toHaveCSS("float", "left");
  await expect(filters).not.toHaveClass(/pull-right/u);
  await expect(exportAction).not.toHaveClass(/pull-left/u);
  await expect(exportAction.locator('a[href$="format=xls"]')).toHaveText("Download as Excel file");
  await expect(exportAction).toHaveCSS("padding-top", "10px");
  await expect(exportAction.locator("a")).toHaveAttribute("href", /format=xls/u);
  await expect(filters.locator("button")).toHaveText(/Created/u);
  await filters.locator("button").click();
  await expect(page).toHaveURL(/orderDir=asc/u);
  await expect(exportAction).toBeVisible();
  for (const owner of [filters, exportAction]) {
    await expect(owner).not.toHaveAttribute("style");
    await expect(owner).not.toHaveAttribute("data-toggle");
    await expect(owner).not.toHaveAttribute("data-action");
  }
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const currentExportAction = page.locator('[data-stylex-owner="project-reviews-export-action"]');
    await expect(currentExportAction).toBeVisible();
    await expect.poll(async () => (await currentExportAction.boundingBox()) !== null).toBe(true);
    const box = await currentExportAction.boundingBox();
    const parent = await currentExportAction.locator("..").boundingBox();
    expect(box).not.toBeNull();
    expect(parent).not.toBeNull();
    if (!box || !parent) throw new Error("Expected visible review export action geometry");
    expect(box.x).toBeGreaterThanOrEqual(parent.x);
    expect(box.x + box.width).toBeLessThanOrEqual(parent.x + parent.width);
    await page.screenshot({
      path: resolve(screenshotDir, `${width === 390 ? "mobile" : "desktop"}.png`),
      fullPage: true,
    });
  }
});
