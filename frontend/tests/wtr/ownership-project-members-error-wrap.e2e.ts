import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("project members error-wrap preserves forbidden and bad-request parity", async ({ page }) => {
  await mockProjectHome(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const state of [
      { project: "sample-401", copy: "You are not authorized", login: true },
      { project: "sample-403", copy: "You are not authorized", login: false },
      {
        project: "sample-400",
        copy: "The request cannot be fulfilled due to bad syntax",
        login: false,
      },
    ]) {
      await page.goto(`${basePath}/admin/${state.project}/members`, { waitUntil: "commit" });
      const wrap = page.locator('[data-owner="project-members-error-wrap"]');
      const icon = page.locator('[data-owner="project-members-error-icon"]');
      const message = page.locator('[data-owner="project-members-error-message"]');
      await expect(wrap).toBeVisible();
      await expect(message).toHaveText(state.copy);
      await expect(page.locator('[data-owner="project-members-error-login"]')).toHaveCount(
        state.login ? 1 : 0,
      );
      await expect(wrap).toHaveCSS("padding-top", "100px");
      await expect(wrap).toHaveCSS("padding-bottom", "100px");
      await expect(wrap).toHaveCSS("text-align", "center");
      await expect(icon).toHaveCSS("display", "inline-block");
      await expect(icon).toHaveCSS("width", "50px");
      await expect(icon).toHaveCSS("height", "80px");
      await expect(icon).toHaveCSS("background-position", "-80px -160px");
      await expect(icon).toHaveCSS("background-repeat", "no-repeat");
      await expect(icon).toHaveCSS("vertical-align", "middle");
      await expect(message).toHaveCSS("font-weight", "700");
      await expect(message).toHaveCSS("font-size", "16px");
      await expect(message).toHaveCSS("color", "rgb(137, 137, 137)");
      await expect(message).toHaveCSS("margin-top", "30px");
      await expect(message).toHaveCSS("margin-bottom", "30px");

      const geometry = await wrap.evaluate((element) => {
        const wrapBox = element.getBoundingClientRect();
        const iconBox = element.querySelector<HTMLElement>("i")?.getBoundingClientRect();
        if (!iconBox) throw new Error("project home error icon missing");
        return {
          iconLeft: iconBox.left,
          iconRight: iconBox.right,
          wrapBottom: wrapBox.bottom,
          wrapLeft: wrapBox.left,
          wrapRight: wrapBox.right,
          wrapTop: wrapBox.top,
          viewportWidth: window.innerWidth,
        };
      });
      expect(geometry.wrapLeft).toBeGreaterThanOrEqual(0);
      expect(geometry.wrapRight).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(geometry.iconLeft).toBeGreaterThanOrEqual(geometry.wrapLeft);
      expect(geometry.iconRight).toBeLessThanOrEqual(geometry.wrapRight);
      expect(geometry.wrapTop).toBeGreaterThanOrEqual(0);
      expect(geometry.wrapBottom).toBeGreaterThan(geometry.wrapTop);

      const fallback = page.locator('link[href*="legacy-fallback.css"]');
      await expect(fallback).toHaveCount(0);
      if (await fallback.count()) await fallback.evaluate((element) => element.remove());
      await expect(wrap).toHaveCSS("padding-top", "100px");
      await expect(icon).toHaveCSS("background-position", "-80px -160px");

      if (state.login) {
        const login = page.locator('[data-owner="project-members-error-login"]');
        await expect(login).toHaveAttribute("href", /users\/loginform.*redirectUrl/);
        await login.click();
        await expect(page).toHaveURL(/users\/loginform/);
      }
    }
  }
});

async function mockProjectHome(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const sessionJson = {
    actorId: null,
    isAnonymous: true,
    isConfirmed: false,
    isGuest: false,
    loginId: "",
    preferredLanguage: "en-US",
    userLabel: "",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: sessionJson,
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/*/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        ownerName: "admin",
        projectName: route.request().url().split("/").at(-2),
        projectScope: "PUBLIC",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        vcs: "GIT",
        viewerCanUpdate: true,
        showBoard: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/*/members", (route: Route) => {
    const project = route.request().url().split("/").at(-2) ?? "";
    const status = project.endsWith("401") ? 401 : project.endsWith("403") ? 403 : 400;
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ status, error: { status } }),
    });
  });
}
