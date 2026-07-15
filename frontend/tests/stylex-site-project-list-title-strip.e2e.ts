import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-project-list-title-strip"]';
const routeSource = new URL("../src/routes/sites/projectList.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);

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

test.describe("StyleX site project-list title strip", () => {
  test("reuses canonical global title variables through the explicit owner", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="site-project-list-title-strip"');
    expect(route).toContain("styles.titleArea");
    expect(route).toContain("styles.title");
    expect(route).toContain("globalColors.siteDiagnosticNoErrorTitleBorder");
    expect(route).toContain('`title_area ${titleAreaStyleProps.className ?? ""}`');
    expect(route).toContain('`pull-left ${titleStyleProps.className ?? ""}`');
    expect(theme).toContain("siteDiagnosticNoErrorHeadingText");
  });

  test("keeps the legacy title before the search form", async ({ page }) => {
    const owner = await openProjectList(page);

    await expect(owner.locator(":scope > h2.pull-left")).toHaveText("Projects");
    await expect(owner.locator(":scope > form.form-search.pull-right")).toHaveCount(1);
    expect(
      await owner.evaluate((titleArea) =>
        Array.from(titleArea.children).map((child) => child.tagName),
      ),
    ).toEqual(["H2", "FORM"]);
  });

  test("composes generated classes with shared legacy title fallbacks", async ({ page }) => {
    const owner = await openProjectList(page);
    const classes = await owner.evaluate((titleArea) => {
      const title = titleArea.querySelector("h2");
      return {
        title: Array.from(title?.classList ?? []),
        titleArea: Array.from(titleArea.classList),
      };
    });

    expect(classes.titleArea).toContain("title_area");
    expect(classes.title).toContain("pull-left");
    expect(classes.titleArea.some((token) => token.startsWith("x"))).toBe(true);
    expect(classes.title.some((token) => token.startsWith("x"))).toBe(true);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} title geometry and captures its surface`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const owner = await openProjectList(page);
      const title = owner.locator("h2.pull-left");

      await expect(owner).toHaveCSS("overflow", "hidden");
      await expect(owner).toHaveCSS("margin-bottom", "29px");
      await expect(owner).toHaveCSS("padding-bottom", "8px");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
      await expect(title).toHaveCSS("font-size", "19.5px");
      await expect(title).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(title).toHaveCSS("line-height", "30px");
      const boxes = await page.evaluate((selector) => {
        const owner = document.querySelector<HTMLElement>(selector);
        const title = owner?.querySelector<HTMLElement>("h2.pull-left");
        const search = owner?.querySelector<HTMLElement>("form.form-search");
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

  test("keeps generated classes inside the explicit title owner", async ({ page }) => {
    await openProjectList(page);
    const generatedDirectChildren = await page.evaluate(
      (selector) =>
        Array.from(document.querySelectorAll(".site-setting-wrap .span10 > *"))
          .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
          .filter((element) => !element.matches(selector))
          .map((element) => ({
            owner: element.getAttribute("data-stylex-owner"),
            tagName: element.tagName,
          })),
      ownerSelector,
    );
    expect(generatedDirectChildren).toEqual([
      { owner: "site-project-list-listhead", tagName: "DIV" },
      { owner: "site-project-list-container", tagName: "UL" },
      { owner: "site-project-list-pagination", tagName: "DIV" },
    ]);
  });
});
