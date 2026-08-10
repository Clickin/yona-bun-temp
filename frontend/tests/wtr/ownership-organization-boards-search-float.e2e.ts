import { expect, test } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op);
// resolve builds fixture/screenshot paths — wave-8 pattern strips leading slashes so
// root-joined legacy paths stay bare-relative for the readFileSync mapping.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

// wave-8 precedent: repoRoot=".." keeps "../yona-original/..." bare-relative.
const root = "..";
const legacy = (path: string) => readFileSync(resolve(root, path), "utf8");
const screenshotDirectory = resolve(
  root,
  "output/playwright/style-organization-boards-search-float",
  process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal",
);

test("organization boards search owner preserves legacy float and responsive bounds", async ({
  page,
}) => {
  expect(legacy("yona-original/app/views/organization/group_board_list.scala.html")).toContain(
    '<form id="option_form" method="get" class="pull-left">',
  );
  expect(legacy("yona-original/public/bootstrap/css/bootstrap.css")).toContain(
    ".pull-left {\n  float: left;",
  );
  expect(legacy("yona-original/app/assets/stylesheets/less/_page.less")).toContain(
    ".search-wrap {",
  );
  const responsive = legacy("yona-original/app/assets/stylesheets/less/_responsive.less");
  expect(responsive).toContain(".project-selects {\n    width: 100px !important;");
  expect(responsive).toContain(".post-list {");
  expect(responsive).toContain(".search-wrap form {");
  expect(responsive).toContain(".search-bar {\n        width: 120px !important;");
  const bootstrapResponsive = legacy("yona-original/public/bootstrap/css/bootstrap-responsive.css");
  expect(bootstrapResponsive.trim()).not.toBe("");
  expect(bootstrapResponsive).toContain("@media");
  expect(bootstrapResponsive).toContain(".media .pull-left");
  const yobi = legacy("yona-original/app/assets/stylesheets/yobi.less");
  const yobiImports = [
    "_variables",
    "_mixins",
    "_common",
    "_sprites",
    "_page",
    "_tippy",
    "_scrollbar",
    "_responsive",
    "_yobiUI",
    "_temporary",
    "_markdown",
    "_migration",
    "_override",
  ];
  for (const importLine of yobiImports) {
    expect(yobi).toContain(`@import "less/${importLine}.less";`);
    expect(legacy(`yona-original/app/assets/stylesheets/less/${importLine}.less`).trim()).not.toBe(
      "",
    );
  }
  expect(legacy("yona-original/conf/messages")).toContain("organization.choose.projects");
  expect(legacy("yona-original/conf/messages")).toContain("title.searchByKeyword");

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
        items: [
          {
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            commentCount: 1,
            createdLabel: "Today",
            ownerName: "admin",
            postNumber: 4,
            projectName: "sample",
            title: "Release notes",
          },
          {
            authorLabel: "Bob",
            authorLoginId: "bob",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            commentCount: 0,
            createdLabel: "Yesterday",
            ownerName: "admin",
            postNumber: 3,
            projectName: "sample",
            title: "Deployment notes",
          },
        ],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 15,
        totalCount: 2,
        visibleProjects: [{ ownerName: "admin", projectName: "sample" }],
      },
    }),
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/boards`);
    const owner = page.locator('[data-owner="organization-boards-search-form"]');
    await expect(owner).toBeVisible();
    await expect(page.locator('[data-owner="organization-boards-row"]')).toHaveCount(2);
    const metrics = await owner.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const pluginOnlyNames = new Set([
        "data-toggle",
        "data-placement",
        "data-action",
        "data-href",
        "data-url",
        "data-dismiss",
        "data-target",
        "data-trigger",
        "data-backdrop",
        "data-spy",
        "data-provider",
        "data-loading-text",
      ]);
      const attributes = [...element.attributes].map((attribute) => attribute.name);
      return {
        float: style.float,
        className: element.className,
        left: box.left,
        right: box.right,
        width: box.width,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        pluginOnlyAttributes: attributes.filter(
          (name) => pluginOnlyNames.has(name) || name.startsWith("data-request-"),
        ),
      };
    });
    expect(metrics.float).toBe("left");
    expect(metrics.className).not.toMatch(/pull-(left|right)/);
    expect(metrics.pluginOnlyAttributes).toEqual([]);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(viewport.width);
    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.width}px.png`),
    });
    const input = owner.locator('input[name="filter"]');
    await input.fill("release");
    await expect(input).toHaveValue("release");
    await owner.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/filter=release/);
  }
});
