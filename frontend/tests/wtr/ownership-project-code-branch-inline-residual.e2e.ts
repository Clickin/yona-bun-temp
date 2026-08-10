import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test("moves code branch spinner and empty-folder alert residuals into Style", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/code/$branch.tsx", "utf8");
  const style =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const view = readFileSync("../yona-original/app/views/code/view.scala.html", "utf8");
  const folder = readFileSync(
    "../yona-original/app/views/code/partial_view_folder.scala.html",
    "utf8",
  );

  expect(view).toContain('<div id="spin" style="position:fixed; top:50%; left:50%"></div>');
  expect(folder).toContain(
    'class="alert alert-warning nm" style="border-top:0; padding-left:23px;"',
  );
  expect(route).toContain('data-owner="project-code-branch-spinner"');
  expect(route).toContain('data-owner="project-code-branch-empty"');

  await mockEmptyFolder(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/code/main`, { waitUntil: "commit" });
    const spinner = owner(page, "project-code-branch-spinner");
    const empty = owner(page, "project-code-branch-empty");
    await expect(spinner).toHaveCSS("position", "fixed");
    await expect(spinner).toHaveCSS("top", `${viewport.height / 2}px`);
    await expect(spinner).toHaveCSS("left", `${viewport.width / 2}px`);
    await expect(empty).toHaveCSS("border-top-width", "0px");
    await expect(empty).toHaveCSS("padding-left", "23px");
    expect(await spinner.getAttribute("style")).toBeNull();
    expect(await empty.getAttribute("style")).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  }
});

async function mockEmptyFolder(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", defaultBranch: "main" },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [],
        entries: [],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );
}
