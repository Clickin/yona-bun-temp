import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const repoRoot = resolve("..");
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const routeSource = "src/routes/organizations/$organizationName/settingform.tsx";
const themeSource = "src/routes/organizations/$organizationName/-settingform.stylex.ts";
const owners = [
  "organization-setting-bubble",
  "organization-setting-logo-point",
  "organization-setting-name-field",
  "organization-setting-warning",
  "organization-setting-save",
  "organization-setting-save-footer",
] as const;

test("organization setting form records the route-local StyleX paint boundary", () => {
  const route = readFileSync(routeSource, "utf8");
  const theme = readFileSync(themeSource, "utf8");
  const legacyTemplate = readFileSync(
    resolve(repoRoot, "yona-original/app/views/organization/setting.scala.html"),
    "utf8",
  );
  const legacyPage = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_page.less"),
    "utf8",
  );
  const legacyResponsive = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_responsive.less"),
    "utf8",
  );
  const legacyYobi = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/yobi.less"),
    "utf8",
  );
  expect(route).toContain("setting.scala.html");
  for (const owner of owners) expect(route).toContain(`data-stylex-owner=\"${owner}\"`);
  expect(theme).toContain("organizationSettingColors");
  expect(theme).toContain("saveFooter");
  expect(theme).toContain('default: "20px 0"');
  expect(theme).toContain('[globalBreakpoints.mobile]: "10px 0"');
  expect(theme).toContain('default: "12px"');
  expect(theme).toContain('[globalBreakpoints.mobile]: "10px"');
  expect(theme).toContain('borderBottom: "0 none"');
  expect(theme).toContain('textAlign: "center"');
  expect(legacyTemplate).toContain('<form id="saveSetting"');
  expect(legacyTemplate).toContain('<div class="box-wrap bottom">');
  expect(legacyTemplate).toContain('<button id="save" class="ybtn ybtn-success">');
  expect(legacyPage).toContain("&.bottom {");
  expect(legacyPage).toContain("padding: 20px 0;");
  expect(legacyPage).toContain("padding-bottom:12px;");
  expect(legacyPage).toContain("border-bottom: 0 none;");
  expect(legacyPage).toContain("text-align: center;");
  expect(legacyResponsive).toContain(".box-wrap {");
  expect(legacyResponsive).toContain("padding: 10px 0 !important;");
  for (const importedStylesheet of [
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]) {
    expect(legacyYobi).toContain(importedStylesheet);
  }
});

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`organization setting form preserves legacy form structure on ${viewport.name}`, async ({
    page,
  }) => {
    await mockSettings(page);
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/settingform`);
    await expect(page.locator("#saveSetting")).toBeVisible();
    await expect(page.locator("#project-name")).toHaveValue("weblabs");
    await expect(page.locator("#project-desc")).toHaveValue("Web labs group");
    await expect(page.locator("#save")).toHaveText("Save");
    await expect(page.locator("[data-stylex-owner=organization-setting-logo-point]")).toHaveText(
      "bmp, jpg, gif, png",
    );
    await expect(page.locator("[data-stylex-owner=organization-setting-bubble]")).toHaveCSS(
      "background-color",
      "rgb(247, 247, 247)",
    );
    await expect(page.locator("[data-stylex-owner=organization-setting-save]")).toHaveCSS(
      "background-color",
      "rgb(255, 115, 50)",
    );
    const footer = page.locator("[data-stylex-owner=organization-setting-save-footer]");
    await expect(footer).toBeVisible();
    await expect(footer).toHaveClass(/\bbox-wrap\b.*\bbottom\b/u);
    await expect(footer).not.toHaveAttribute("style", /.+/u);
    const responsivePadding = viewport.name === "mobile" ? "10px" : "20px";
    const responsiveBottomPadding = viewport.name === "mobile" ? "10px" : "12px";
    await expect(footer).toHaveCSS("padding-top", responsivePadding);
    await expect(footer).toHaveCSS("padding-right", "0px");
    await expect(footer).toHaveCSS("padding-bottom", responsiveBottomPadding);
    await expect(footer).toHaveCSS("padding-left", "0px");
    await expect(footer).toHaveCSS("border-bottom-style", "none");
    await expect(footer).toHaveCSS("border-bottom-width", "0px");
    await expect(footer).toHaveCSS("text-align", "center");
    const geometry = await page.locator("#saveSetting").evaluate((form) => {
      const rect = form.getBoundingClientRect();
      const bubble = form
        .querySelector("[data-stylex-owner=organization-setting-bubble]")!
        .getBoundingClientRect();
      const footer = form
        .querySelector("[data-stylex-owner=organization-setting-save-footer]")!
        .getBoundingClientRect();
      const save = form.querySelector<HTMLButtonElement>("#save")!.getBoundingClientRect();
      return {
        form: { left: rect.left, right: rect.right },
        bubble: { left: bubble.left, right: bubble.right },
        footer: { bottom: footer.bottom, left: footer.left, right: footer.right, top: footer.top },
        save: { bottom: save.bottom, left: save.left, right: save.right, top: save.top },
      };
    });
    expect(geometry.bubble.left).toBeGreaterThanOrEqual(geometry.form.left);
    expect(geometry.bubble.right).toBeLessThanOrEqual(geometry.form.right);
    expect(geometry.footer.left).toBeGreaterThanOrEqual(geometry.form.left);
    expect(geometry.footer.right).toBeLessThanOrEqual(geometry.form.right);
    expect(geometry.save.left).toBeGreaterThanOrEqual(geometry.footer.left);
    expect(geometry.save.right).toBeLessThanOrEqual(geometry.footer.right);
    expect((geometry.save.left + geometry.save.right) / 2).toBeCloseTo(
      (geometry.footer.left + geometry.footer.right) / 2,
      0,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-organization-setting-form-${viewport.name}.png`),
    });
  });
}

test("organization setting Save preserves the PATCH interaction boundary", async ({ page }) => {
  const updates = await mockSettings(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  const saveRequest = page.waitForRequest(
    (request) =>
      request.method() === "PATCH" && request.url().includes("/api/v1/organizations/weblabs"),
  );
  await page.locator("[data-stylex-owner=organization-setting-save]").click();
  await saveRequest;
  await expect.poll(() => updates).toEqual(["weblabs"]);
});

async function mockSettings(page: Page) {
  const updates: string[] = [];
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/settings", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { description: "Web labs group", id: 42, logoUrl: "", organizationName: "weblabs" },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as { organizationName?: string };
      updates.push(body.organizationName ?? "");
      await route.fulfill({
        contentType: "application/json",
        json: {
          description: "Web labs group",
          id: 42,
          logoUrl: "",
          organizationName: body.organizationName ?? "weblabs",
        },
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      json: {
        description: "Web labs group",
        id: 42,
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      },
    });
  });
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Web labs group",
        enrollmentRequested: false,
        id: 42,
        logoUrl: "",
        members: [],
        organizationName: "weblabs",
        viewerCanEnroll: false,
        viewerCanUpdate: true,
      },
    }),
  );
  return updates;
}
