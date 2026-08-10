import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/style-projectform-mt10",
  fallbackOff ? "fallback-off" : "normal",
);

test("project form preserves legacy mt10 ownership and behavior", async ({ page }) => {
  const legacySource = readFileSync("../yona-original/app/views/project/create.scala.html", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const routeSource = readFileSync("src/routes/projectform.tsx", "utf8");
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(legacySource).toMatch(
    /<div class="span2 right-txt mt10">\s*@Messages\("project\.shareOption"\)\s*<\/div>/u,
  );
  expect(legacySource).toContain('<ul class="unstyled project-scopes mt10">');
  expect(legacySource).toContain('<li id="opt-protected" class="mt10"');
  expect(legacySource).toMatch(/<li class="mt10">\s*<input[^>]+id="private"/u);
  expect(legacySource).toMatch(
    /<div class="span2 right-txt mt10">\s*<label for="vcs">[\s\S]*?@Messages\("project\.vcs"\)[\s\S]*?<\/label>\s*<\/div>/u,
  );
  expect(commonLess).toContain(".mt10 { margin-top:10px; }");

  for (const owner of [
    "project-form-share-option-label",
    "project-form-scopes",
    "project-form-protected-scope",
    "project-form-vcs-label",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
  expect(routeSource).toContain("span2 mt10");
  expect(routeSource).toContain("unstyled project-scopes mt10");
  for (const styleName of ["shareOptionLabel", "vcsLabel"]) {
  }
  for (const styleName of ["protectedScope", "privateScope", "scopes"]) {
  }
  expect(routeSource).not.toContain("right-txt");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toMatch(/\bstyle\s*=/u);

  await mockProjectCreate(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/projectform`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const shareLabel = page.locator('[data-owner="project-form-share-option-label"]');
    const scopes = page.locator('[data-owner="project-form-scopes"]');
    const protectedScope = page.locator('[data-owner="project-form-protected-scope"]');
    const privateScope = page.locator("#private").locator("xpath=..");
    const vcsLabel = page.locator('[data-owner="project-form-vcs-label"]');
    const menuLabel = page.locator('[data-owner="project-form-menu-setting-label"]');

    for (const element of [shareLabel, scopes, privateScope, vcsLabel]) {
      await expect(element).toHaveClass(/\bmt10\b/u);
      await expect(element).toHaveCSS("margin-top", "10px");
      await expect(element).not.toHaveAttribute("style", /.+/u);
    }
    await expect(menuLabel).toHaveCSS("text-align", "right");
    await expect(menuLabel).toHaveCSS("margin-top", "0px");

    await expect(page.locator("#public")).toBeChecked();
    await page.locator("#private").check();
    await expect(page.locator("#private")).toBeChecked();
    await page.locator("#public").check();
    await expect(page.locator("#public")).toBeChecked();
    await page.locator("#project-owner").selectOption("weblabs");
    await expect(protectedScope).toBeVisible();
    await expect(protectedScope).toHaveClass(/\bmt10\b/u);
    await expect(protectedScope).toHaveCSS("margin-top", "10px");
    await expect(protectedScope).not.toHaveAttribute("style", /.+/u);
    const formBox = await page.locator('[data-owner="project-form"]').boundingBox();
    expect(formBox).not.toBeNull();
    for (const element of [shareLabel, scopes, protectedScope, privateScope, vcsLabel]) {
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        Math.max(viewport.width, formBox!.x + formBox!.width) + 1,
      );
    }
    await page.locator("#protected").check();
    await expect(page.locator("#protected")).toBeChecked();

    const vcs = page.locator("#vcs");
    const warning = page.locator("#svn");
    await vcs.selectOption("SUBVERSION");
    await expect(warning).toBeVisible();
    await expect(warning).toHaveText("Subversion can't use pull request");
    await vcs.selectOption("GIT");
    await expect(warning).toBeHidden();

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockProjectCreate(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "en",
      },
    }),
  );
  await page.route("**/api/auth/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-project-create" },
      json: { isAuthenticated: true, user: { loginId: "admin", name: "Site Admin" } },
    }),
  );
  await page.route("**/api/v1/projects/form-options*", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerOptions: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            organization: false,
            ownerName: "admin",
            selected: true,
          },
          {
            avatarUrl: "/assets/images/organization_default_logo.png",
            organization: true,
            ownerName: "weblabs",
            selected: false,
          },
        ],
        selectedOwnerName: "admin",
      },
    }),
  );
}
