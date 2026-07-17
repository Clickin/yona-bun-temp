import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project create select controls own the legacy 220px inline widths", async ({ page }) => {
  const routeSource = readFileSync("src/routes/projectform.tsx", "utf8");
  const styleSource = readFileSync("src/routes/-projectform.stylex.ts", "utf8");
  const legacySource = readFileSync("../yona-original/app/views/project/create.scala.html", "utf8");
  expect(legacySource).toContain('id="project-owner"');
  expect(legacySource).toContain('id="vcs"');
  expect(legacySource).toContain('style="min-width: 220px;"');
  expect(routeSource).toContain('data-stylex-owner="project-form-owner"');
  expect(routeSource).toContain('data-stylex-owner="project-form-vcs"');
  expect(routeSource).not.toContain('style={{ minWidth: "220px" }}');
  expect(styleSource).toContain('select: {\n    minWidth: "220px",');

  await mockProjectCreate(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/projectform`, { waitUntil: "domcontentloaded" });
    const owner = page.locator('[data-stylex-owner="project-form-owner"]');
    const vcs = page.locator('[data-stylex-owner="project-form-vcs"]');
    await expect(owner).toHaveCSS("min-width", "220px");
    await expect(vcs).toHaveCSS("min-width", "220px");
    await expect(owner).not.toHaveAttribute("style", /min-width/u);
    await expect(vcs).not.toHaveAttribute("style", /min-width/u);
    const geometry = await page.evaluate(() => {
      const owner = document.querySelector('[data-stylex-owner="project-form-owner"]');
      const vcs = document.querySelector('[data-stylex-owner="project-form-vcs"]');
      const form = document.querySelector('[data-stylex-owner="project-form"]');
      if (!owner || !vcs || !form) return null;
      return {
        ownerRight: owner.getBoundingClientRect().right,
        vcsRight: vcs.getBoundingClientRect().right,
        formRight: form.getBoundingClientRect().right,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.ownerRight).toBeLessThanOrEqual(geometry!.formRight + 1);
    expect(geometry!.vcsRight).toBeLessThanOrEqual(geometry!.formRight + 1);

    await owner.selectOption("weblabs");
    await expect(page.locator("#opt-protected")).toBeVisible();
    await vcs.selectOption("SUBVERSION");
    await expect(page.locator("#svn")).toBeVisible();
    await expect(page.locator('[data-stylex-owner="project-form-vcs"]')).toHaveValue("SUBVERSION");
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
