import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-owner="site-project-list-title-strip"]';
const routeSource = new URL("../src/routes/sites/projectList.tsx", import.meta.url);

async function openProjectList(page: Page) {
  const session = {
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "siteboss",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-project-list-title" },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/sites/projectList?filter=road`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style site project-list title strip", () => {
  test("keeps title geometry inline and paint in the route theme", async () => {
    const [route, globalTheme] = await Promise.all([
      readFile(routeSource, "utf8"),
      Promise.resolve(curatedAppCss()),
    ]);

    expect(route).toContain('data-owner="site-project-list-title-strip"');
    expect(route).toContain('data-owner="site-project-list-title-heading"');

    expect(globalTheme).not.toMatch(/^\s+siteProjectList[A-Z]/m);
  });

  test("keeps the legacy title before the search form", async ({ page }) => {
    const owner = await openProjectList(page);

    await expect(
      owner.locator(':scope > h2[data-owner="site-project-list-title-heading"]'),
    ).toHaveText("Projects");
    const search = owner.locator(':scope > form[data-owner="site-project-list-search"]');
    await expect(search).toHaveCount(1);
    // F5 route renders the legacy pull-right form — projectList.scala.html:12.
    await expect(search).toHaveClass(/\bpull-right\b/);
    expect(
      await owner.evaluate((titleArea) =>
        Array.from(titleArea.children).map((child) => child.tagName),
      ),
    ).toEqual(["H2", "FORM"]);
  });

  test("owns the generated title classes without legacy title fallbacks", async ({ page }) => {
    const owner = await openProjectList(page);
    const classes = await owner.evaluate((titleArea) => {
      const title = titleArea.querySelector("h2");
      return {
        title: Array.from(title?.classList ?? []),
        titleArea: Array.from(titleArea.classList),
      };
    });

    // title_area/pull-left are migrated to the data-owner layout (route renders
    // neither); the search form keeps legacy form-search pull-right — projectList.scala.html:10-12.
    expect(classes.titleArea).not.toContain("title_area");
    expect(classes.title).not.toContain("pull-left");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} title geometry and captures its surface`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const owner = await openProjectList(page);
      const title = owner.locator('[data-owner="site-project-list-title-heading"]');

      await expect(owner).toHaveCSS("overflow", "hidden");
      await expect(owner).toHaveCSS("margin-bottom", "29px");
      await expect(owner).toHaveCSS("padding-bottom", "8px");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
      await expect(title).toHaveCSS("font-size", "19.5px");
      await expect(title).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(title).toHaveCSS("line-height", "30px");
      const boxes = await page.evaluate((selector) => {
        const owner = document.querySelector<HTMLElement>(selector);
        const title = owner?.querySelector<HTMLElement>(
          '[data-owner="site-project-list-title-heading"]',
        );
        const search = owner?.querySelector<HTMLElement>(
          ':scope > form[data-owner="site-project-list-search"]',
        );
        if (!owner || !title || !search) return null;
        return {
          owner: owner.getBoundingClientRect().toJSON(),
          search: search.getBoundingClientRect().toJSON(),
          title: title.getBoundingClientRect().toJSON(),
        };
      }, ownerSelector);
      expect(boxes).not.toBeNull();
      expect(boxes!.title.left).toBeGreaterThanOrEqual(boxes!.owner.left);
      expect(boxes!.title.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
      expect(boxes!.search.right).toBeLessThanOrEqual(boxes!.owner.right + 1);
      expect((await owner.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});
