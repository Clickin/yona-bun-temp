import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-project-list-listhead"]';
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
      headers: { "x-csrf-token": "csrf-site-project-list-listhead" },
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

test.describe("StyleX site project-list list header", () => {
  test("uses canonical list-header variables through the explicit owner", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="site-project-list-listhead"');
    expect(route).toContain("styles.listHead");
    expect(route).toContain("styles.listHeadTitle");
    expect(route).toContain("globalColors.siteProjectListHeadSurface");
    expect(route).toContain("globalColors.siteProjectListHeadColumnPadding");
    expect(route).toContain('`row-fluid listhead ${listHeadStyleProps.className ?? ""}`');
    expect(route).toContain('`span5 listhead-title ${listHeadTitleStyleProps.className ?? ""}`');
    expect(theme).toContain("siteProjectListHeadSurface");
    expect(theme).toContain("siteProjectListHeadColumnPadding");
  });

  test("keeps the legacy populated header column order and copy", async ({ page }) => {
    const owner = await openProjectList(page);

    await expect(owner.locator(":scope > .listhead-title strong")).toHaveText([
      "Project name",
      "Description",
      "Created date",
      "",
    ]);
    expect(
      await owner
        .locator(":scope > .listhead-title")
        .evaluateAll((columns) =>
          columns.map((column) =>
            column.className.split(" ").find((name) => name.startsWith("span")),
          ),
        ),
    ).toEqual(["span5", "span4", "span2", "span1"]);
  });

  test("composes generated classes with shared legacy list-header fallbacks", async ({ page }) => {
    const owner = await openProjectList(page);
    const classes = await owner.evaluate((listHead) => ({
      columns: Array.from(listHead.children, (column) => Array.from(column.classList)),
      listHead: Array.from(listHead.classList),
    }));

    expect(classes.listHead).toContain("row-fluid");
    expect(classes.listHead).toContain("listhead");
    expect(classes.listHead.some((token) => token.startsWith("x"))).toBe(true);
    for (const column of classes.columns) {
      expect(column).toContain("listhead-title");
      expect(column.some((token) => token.startsWith("x"))).toBe(true);
    }
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} list-header paint, containment, and surface capture`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const owner = await openProjectList(page);

      await expect(owner).toHaveCSS("background-color", "rgb(247, 247, 247)");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(239, 239, 239)");
      await expect(owner).toHaveCSS("border-bottom-width", "1px");
      await expect(owner).toHaveCSS("margin-bottom", "5px");
      await expect(owner).toHaveCSS("padding-top", "5px");
      await expect(owner).toHaveCSS("padding-bottom", "5px");
      await expect(owner).toHaveCSS("line-height", "30px");
      await expect(owner.locator(":scope > .listhead-title").first()).toHaveCSS(
        "padding-left",
        "20px",
      );
      const boxes = await owner.evaluate((listHead) => {
        const parent = listHead.parentElement?.getBoundingClientRect();
        const columns = Array.from(listHead.children, (column) => column.getBoundingClientRect());
        const head = listHead.getBoundingClientRect();
        return parent
          ? {
              columns: columns.map(({ left, right, top, bottom }) => ({
                bottom,
                left,
                right,
                top,
              })),
              head: { bottom: head.bottom, left: head.left, right: head.right, top: head.top },
              parent: {
                bottom: parent.bottom,
                left: parent.left,
                right: parent.right,
                top: parent.top,
              },
            }
          : null;
      });
      expect(boxes).not.toBeNull();
      for (const [index, column] of boxes!.columns.entries()) {
        expect(column.left).toBeGreaterThanOrEqual(boxes!.head.left - 1);
        expect(column.right).toBeLessThanOrEqual(boxes!.head.right + 1);
        if (index > 0) {
          const previous = boxes!.columns[index - 1]!;
          if (viewport.name === "desktop") {
            expect(previous.right).toBeLessThanOrEqual(column.left + 1);
          } else {
            expect(previous.top).toBeLessThanOrEqual(column.top);
          }
        }
      }
      expect(boxes!.head.left).toBeGreaterThanOrEqual(boxes!.parent.left - 1);
      expect(boxes!.head.right).toBeLessThanOrEqual(boxes!.parent.right + 1);
      expect((await owner.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }

  test("keeps generated classes within the list header or the existing title owner", async ({
    page,
  }) => {
    await openProjectList(page);
    const generatedOwnerIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".site-setting-wrap .span10 *"))
        .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
        .map((element) => element.closest("[data-stylex-owner]")?.getAttribute("data-stylex-owner"))
        .filter((owner): owner is string => Boolean(owner))
        .sort(),
    );

    expect(generatedOwnerIds).toEqual([
      "site-project-list-listhead",
      "site-project-list-listhead",
      "site-project-list-listhead",
      "site-project-list-listhead",
      "site-project-list-listhead",
      "site-project-list-title-strip",
      "site-project-list-title-strip",
    ]);
  });
});
