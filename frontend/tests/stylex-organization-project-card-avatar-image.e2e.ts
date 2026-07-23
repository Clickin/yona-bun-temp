import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const routeSource = new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/organization/view.scala.html",
  import.meta.url,
);
const yobiSource = new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url);
const pageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

const yobiImports = [
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
];

test("organization project-card owner avatar image preserves frozen declarations", async () => {
  const [route, legacy, yobi, pageLess] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(yobiSource, "utf8"),
    readFile(pageLessSource, "utf8"),
  ]);

  expect(legacy).toContain('<ul class="all-projects">');
  expect(legacy).toContain('<div class="owner-avatar-wrap hide-in-mobile">');
  expect(legacy).toContain("@if(hasProjectLogo(project)){");
  expect(legacy).toContain('<img src="@urlToProjectLogo(project)" alt="@project" +');
  expect(legacy).toContain('".name"/>');
  for (const importedFile of yobiImports) {
    expect(yobi).toContain(`@import "less/${importedFile}";`);
  }
  expect(pageLess).toMatch(
    /\.owner-avatar-wrap\s*\{[\s\S]*?overflow:hidden;[\s\S]*?display: inline;/,
  );
  expect(pageLess).toMatch(
    /\.owner-avatar-wrap\s*\{[\s\S]*?img\s*\{\s*vertical-align: top;\s*width: 100%;\s*height: 100%;/,
  );
  expect(route).toContain(
    "className={`${stylex.props(styles.projectCardOwnerAvatar).className} owner-avatar-wrap hide-in-mobile`}",
  );
  expect(route).toContain('data-stylex-owner="organization-home-project-card-owner-avatar-image"');
  expect(route).toContain('verticalAlign: "top"');
  expect(route).toContain('height: "100%"');
  expect(route).toContain('width: "100%"');
  expect(route).toContain("projectLogoUrl ? (");
  expect(route).toContain('data-item="project-item"');
  expect(route).toContain("data-value={dataValue}");
  expect(route).not.toContain("style={{");
});

async function mockOrganizationHome(page: Page) {
  const session = { isAnonymous: false, isGuest: false, isSiteAdmin: false, loginId: "admin" };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        description: "Web labs group",
        logoUrl: "",
        viewerCanUpdate: true,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanCreateProject: true,
        visibleProjects: [
          {
            ownerName: "weblabs",
            projectName: "sample",
            overview: "Custom logo project",
            projectScope: "PUBLIC",
            logoUrl: "/legacy-assets/images/project_default_logo.png",
            createdLabel: "today",
            memberCount: 3,
            watchCount: 4,
            isWatching: true,
            labels: [],
          },
          {
            ownerName: "weblabs",
            projectName: "blank",
            overview: "Blank logo project",
            projectScope: "PUBLIC",
            logoUrl: "",
            createdLabel: "yesterday",
            memberCount: 1,
            watchCount: 2,
            isWatching: false,
            labels: [],
          },
        ],
        adminMembers: [],
        memberMembers: [],
      },
    }),
  );
}

async function assertAvatarState(page: Page, mobile: boolean) {
  const sample = page.locator('[data-value^="sample "]').first();
  const blank = page.locator('[data-value^="blank "]').first();
  const surface = sample.locator(
    '[data-stylex-owner="organization-home-project-card-owner-avatar"]',
  );
  const image = surface.locator(
    '[data-stylex-owner="organization-home-project-card-owner-avatar-image"]',
  );
  await expect(sample).toBeVisible();
  await expect(blank).toBeVisible();
  await expect(surface).toHaveClass(/owner-avatar-wrap/);
  await expect(surface).toHaveAttribute(
    "data-stylex-owner",
    "organization-home-project-card-owner-avatar",
  );
  await expect(image).toHaveAttribute("src", /project_default_logo\.png$/);
  await expect(image).toHaveAttribute("alt", "sample.name");
  await expect(image).toHaveAttribute(
    "data-stylex-owner",
    "organization-home-project-card-owner-avatar-image",
  );
  await expect(image).not.toHaveAttribute("style");
  await expect(blank.locator("img")).toHaveCount(0);

  const metrics = await surface.evaluate((node) => {
    const image = node.querySelector("img");
    const surfaceStyle = getComputedStyle(node);
    const imageStyle = image ? getComputedStyle(image) : null;
    const surfaceBox = node.getBoundingClientRect();
    const imageBox = image?.getBoundingClientRect();
    return {
      surfaceDisplay: surfaceStyle.display,
      overflow: surfaceStyle.overflow,
      imageVerticalAlign: imageStyle?.verticalAlign,
      imageWidth: imageStyle?.width,
      imageHeight: imageStyle?.height,
      surfaceBox,
      imageBox,
    };
  });
  expect(metrics.overflow).toBe("hidden");
  expect(metrics.imageVerticalAlign).toBe("top");
  expect(metrics.imageBox).not.toBeNull();
  if (mobile) {
    expect(metrics.surfaceDisplay).toBe("none");
  } else {
    expect(metrics.surfaceDisplay).not.toBe("none");
    expect(metrics.imageBox!.width).toBeGreaterThan(0);
    expect(metrics.imageBox!.height).toBeGreaterThan(0);
    expect(metrics.imageBox!.left).toBeGreaterThanOrEqual(metrics.surfaceBox.left);
    expect(metrics.imageBox!.top).toBe(metrics.surfaceBox.top);
  }
  const documentMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.clientWidth + 8);
}

for (const fallbackOff of [false, true]) {
  test(`organization project-card avatar image ${fallbackOff ? "fallback-off" : "normal"}`, async ({
    page,
  }) => {
    await mockOrganizationHome(page);
    await page.setViewportSize({ height: 900, width: 1366 });
    await page.goto("/yona/organizations/weblabs");
    if (fallbackOff) {
      await page
        .locator('link[href*="legacy-fallback.css"]')
        .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
    }
    await assertAvatarState(page, false);
    await page.locator('[data-stylex-owner="organization-home-search-input"]').fill("Blank");
    await expect(page.locator('[data-value^="sample "]')).toBeHidden();
    await expect(page.locator('[data-value^="blank "]')).toBeVisible();
    await page.locator('[data-stylex-owner="organization-home-search-input"]').fill("");
    await page.setViewportSize({ height: 844, width: 390 });
    await assertAvatarState(page, true);
  });
}
