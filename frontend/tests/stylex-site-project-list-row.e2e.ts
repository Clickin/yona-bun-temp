import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const rowSelector = '[data-stylex-owner="site-project-list-row"]';
const columnSelector =
  ':scope > [data-stylex-owner^="site-project-list-row-"][data-stylex-owner$="-column"]';
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
      headers: { "x-csrf-token": "csrf-site-project-list-row" },
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
          {
            createdAt: "2026-06-30",
            id: 78,
            ownerName: "yona",
            overview: "Migration tracking",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "conversion",
          },
        ],
        total: 2,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/sites/projectList?filter=road`);
  const rows = page.locator(rowSelector);
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toBeVisible();
  return rows;
}

test.describe("StyleX site project-list populated rows", () => {
  test("keeps row geometry inline and paint in the route theme", async () => {
    const route = await readFile(routeSource, "utf8");

    expect(route).toContain('data-stylex-owner="site-project-list-row"');
    expect(route).toContain('data-stylex-owner="site-project-list-row-avatar"');
    expect(route).toContain('data-stylex-owner="site-project-list-row-avatar-image"');
    for (const owner of ["name", "description", "created", "action"])
      expect(route).toContain(`data-stylex-owner="site-project-list-row-${owner}-column"`);
    expect(route).toContain("styles.projectRow");
    expect(route).toContain("styles.projectRowAvatar");
    expect(route).toContain("styles.projectRowAvatarImage");
    expect(route).toContain("styles.projectRowColumn");
    expect(route).toContain("borderBottomColor: siteProjectListTheme.listBorder");
    expect(route).toContain("backgroundColor: siteProjectListTheme.rowEvenSurface");
    expect(route).toContain('width: "45px"');
    expect(route).toContain('display: "inline-block"');
    expect(route).toContain('wordBreak: "break-all"');
    expect(route).not.toContain("className={`row-fluid ${rowStyleProps.className");
    for (const retired of [
      "span5 listitem-col",
      "span4 listitem-col",
      "span2 listitem-col",
      "span1 listitem-col",
    ])
      expect(route).not.toContain(retired);
    expect(route).not.toContain("globalColors.");
  });

  test("keeps populated project link, copy, column, and action order", async ({ page }) => {
    const rows = await openProjectList(page);
    const first = rows.first();

    await expect(first.locator(columnSelector)).toHaveCount(4);
    await expect(first.locator(columnSelector)).toHaveText([
      /acme\/roadmap/,
      "Release planning",
      "2026-06-29",
      "Delete",
    ]);
    expect(
      await first
        .locator(columnSelector)
        .evaluateAll((columns) =>
          columns.map((column) => column.getAttribute("data-stylex-owner")),
        ),
    ).toEqual([
      "site-project-list-row-name-column",
      "site-project-list-row-description-column",
      "site-project-list-row-created-column",
      "site-project-list-row-action-column",
    ]);
    await expect(
      first.locator('[data-stylex-owner="site-project-list-row-avatar"]'),
    ).toHaveAttribute("href", /\/acme\/roadmap$/);
    await expect(
      first.locator('[data-stylex-owner="site-project-list-project-name"]'),
    ).toHaveAttribute("href", /\/acme\/roadmap$/);
    await first.locator('[data-stylex-owner="site-project-list-project-name"]').click();
    await expect(page).toHaveURL(/\/acme\/roadmap$/);
  });

  test("retires row and avatar fallbacks while preserving shared grid classes", async ({
    page,
  }) => {
    const rows = await openProjectList(page);
    const classes = await rows.first().evaluate((row) => ({
      avatar: Array.from(
        row.querySelector('[data-stylex-owner="site-project-list-row-avatar"]')!.classList,
      ),
      avatarImage: Array.from(
        row.querySelector('[data-stylex-owner="site-project-list-row-avatar-image"]')!.classList,
      ),
      columns: Array.from(
        row.querySelectorAll(
          ':scope > [data-stylex-owner^="site-project-list-row-"][data-stylex-owner$="-column"]',
        ),
        (column) => Array.from(column.classList),
      ),
      row: Array.from(row.classList),
    }));

    expect(classes.row).not.toContain("row-fluid");
    expect(classes.row).not.toContain("listitem");
    expect(classes.row.some((token) => token.startsWith("x"))).toBe(true);
    expect(classes.avatar).not.toContain("avatar-wrap");
    expect(classes.avatar).not.toContain("list-avatar");
    expect(classes.avatar.some((token) => token.startsWith("x"))).toBe(true);
    expect(classes.avatarImage.some((token) => token.startsWith("x"))).toBe(true);
    for (const column of classes.columns) {
      expect(column).not.toContain("listitem-col");
      expect(column.some((token) => token.startsWith("x"))).toBe(true);
    }
    await expect(rows.first()).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(rows.nth(1)).toHaveCSS("background-color", "rgb(249, 249, 249)");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} row paint, typography, geometry, and capture`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const rows = await openProjectList(page);
      const row = rows.first();
      const avatar = row.locator('[data-stylex-owner="site-project-list-row-avatar"]');
      const avatarImage = row.locator('[data-stylex-owner="site-project-list-row-avatar-image"]');
      const columns = row.locator(columnSelector);

      await expect(rows.first()).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(rows.nth(1)).toHaveCSS("background-color", "rgb(249, 249, 249)");
      await expect(row).toHaveCSS("border-bottom-color", "rgb(239, 239, 239)");
      await expect(row).toHaveCSS("border-bottom-width", "1px");
      await expect(row).toHaveCSS("border-bottom-style", "solid");
      await expect(row).toHaveCSS("line-height", "70px");
      await expect(avatar).toHaveCSS("width", "45px");
      await expect(avatar).toHaveCSS("height", "45px");
      await expect(avatar).toHaveCSS("margin-right", "10px");
      await expect(avatar).toHaveCSS("margin-top", "3px");
      await expect(avatar).toHaveCSS("float", "left");
      // The frozen `display:inline-block` declaration is blockified by `float:left`.
      await expect(avatar).toHaveCSS("display", "block");
      await expect(avatar).toHaveCSS("vertical-align", "middle");
      await expect(avatar).toHaveCSS("overflow", "hidden");
      await expect(avatar).toHaveCSS("background-color", "rgb(221, 221, 221)");
      await expect(avatar).toHaveCSS("border-radius", "3px");
      await expect(avatarImage).toHaveCSS("width", "45px");
      await expect(avatarImage).toHaveCSS("vertical-align", "top");
      for (const column of await columns.all()) {
        await expect(column).toHaveCSS("font-size", "12px");
        await expect(column).toHaveCSS("padding-top", "10px");
        await expect(column).toHaveCSS("padding-right", "0px");
        await expect(column).toHaveCSS("padding-bottom", "10px");
        await expect(column).toHaveCSS("padding-left", "0px");
        await expect(column).toHaveCSS("text-overflow", "ellipsis");
        await expect(column).toHaveCSS("word-break", "break-all");
        await expect(column).toHaveCSS("line-height", "20px");
      }

      const gridEvidence = await row.evaluate((element) => {
        const columns = Array.from(
          element.querySelectorAll<HTMLElement>(
            ':scope > [data-stylex-owner^="site-project-list-row-"][data-stylex-owner$="-column"]',
          ),
        );
        const capture = () => {
          const rowRect = element.getBoundingClientRect();
          return {
            columns: columns.map((column) => {
              const rect = column.getBoundingClientRect();
              const style = getComputedStyle(column);
              return {
                boxSizing: style.boxSizing,
                float: style.float,
                height: rect.height,
                left: rect.left,
                marginLeft: Number.parseFloat(style.marginLeft),
                minHeight: Number.parseFloat(style.minHeight),
                padding: style.padding,
                textOverflow: style.textOverflow,
                width: rect.width,
                wordBreak: style.wordBreak,
              };
            }),
            pseudos: {
              after: getComputedStyle(element, "::after").clear,
              before: getComputedStyle(element, "::before").display,
            },
            row: {
              height: rowRect.height,
              left: rowRect.left,
              top: rowRect.top,
              width: rowRect.width,
            },
          };
        };
        const actual = capture();
        const nodes = [element, ...columns];
        const originals = nodes.map((node) => node.className);
        nodes.forEach((node) => {
          Array.from(node.classList).forEach((token) => {
            if (token.startsWith("x") || token.includes("__styles.")) node.classList.remove(token);
          });
        });
        element.classList.add("row-fluid", "listitem");
        ["span5", "span4", "span2", "span1"].forEach((span, index) =>
          columns[index]!.classList.add(span, "listitem-col"),
        );
        const fallback = capture();
        nodes.forEach((node, index) => {
          node.className = originals[index]!;
        });
        return { actual, fallback };
      });
      expect(gridEvidence.fallback).toEqual(gridEvidence.actual);
      const expected =
        viewport.name === "desktop"
          ? {
              columns: [
                [239.078125, 451.5, 68, 0],
                [714.328125, 356.453125, 40, 23.75],
                [1094.53125, 166.34375, 40, 23.75],
                [1284.625, 71.28125, 50, 23.75],
              ],
              row: [239.078125, 252, 1116.890625, 69],
            }
          : {
              columns: [
                [66.375, 130.8125, 68, 0],
                [204.0625, 103.265625, 40, 6.875],
                [314.203125, 48.1875, 60, 6.875],
                [369.265625, 20.640625, 50, 6.875],
              ],
              row: [66.375, 345, 323.609375, 69],
            };
      expect([
        gridEvidence.actual.row.left,
        gridEvidence.actual.row.top,
        gridEvidence.actual.row.width,
        gridEvidence.actual.row.height,
      ]).toEqual(expected.row);
      gridEvidence.actual.columns.forEach((column, index) => {
        const expectedColumn = expected.columns[index]!;
        expect([column.left, column.width, column.height, column.marginLeft]).toEqual(
          expectedColumn,
        );
        expect(column).toMatchObject({
          boxSizing: "border-box",
          float: "left",
          minHeight: 30,
          padding: "10px 0px",
          textOverflow: "ellipsis",
          wordBreak: "break-all",
        });
      });
      expect(gridEvidence.actual.pseudos).toEqual({ after: "both", before: "table" });

      const boxes = await row.evaluate((element) => {
        const rowBox = element.getBoundingClientRect();
        const columnBoxes = Array.from(
          element.querySelectorAll(
            ':scope > [data-stylex-owner^="site-project-list-row-"][data-stylex-owner$="-column"]',
          ),
          (column) => column.getBoundingClientRect(),
        );
        const avatarBox = element
          .querySelector('[data-stylex-owner="site-project-list-row-avatar"]')!
          .getBoundingClientRect();
        const avatarImageBox = element
          .querySelector('[data-stylex-owner="site-project-list-row-avatar-image"]')!
          .getBoundingClientRect();
        return {
          avatar: {
            bottom: avatarBox.bottom,
            left: avatarBox.left,
            right: avatarBox.right,
            top: avatarBox.top,
          },
          avatarImage: {
            bottom: avatarImageBox.bottom,
            left: avatarImageBox.left,
            right: avatarImageBox.right,
            top: avatarImageBox.top,
          },
          columns: columnBoxes.map(({ bottom, left, right, top }) => ({
            bottom,
            left,
            right,
            top,
          })),
          row: { bottom: rowBox.bottom, left: rowBox.left, right: rowBox.right, top: rowBox.top },
        };
      });
      for (const [index, column] of boxes.columns.entries()) {
        expect(column.left).toBeGreaterThanOrEqual(boxes.row.left - 1);
        expect(column.right).toBeLessThanOrEqual(boxes.row.right + 1);
        expect(column.top).toBeGreaterThanOrEqual(boxes.row.top - 1);
        expect(column.bottom).toBeLessThanOrEqual(boxes.row.bottom + 1);
        if (index > 0) {
          const previous = boxes.columns[index - 1]!;
          if (viewport.name === "desktop") {
            expect(previous.right).toBeLessThanOrEqual(column.left + 1);
          } else {
            expect(previous.top).toBeLessThanOrEqual(column.top);
          }
        }
      }
      expect(boxes.avatar.left).toBeGreaterThanOrEqual(boxes.columns[0]!.left - 1);
      expect(boxes.avatar.right).toBeLessThanOrEqual(boxes.columns[0]!.right + 1);
      expect(boxes.avatar.top).toBeGreaterThanOrEqual(boxes.columns[0]!.top - 1);
      expect(boxes.avatar.bottom).toBeLessThanOrEqual(boxes.columns[0]!.bottom + 1);
      expect(boxes.avatarImage.left).toBeCloseTo(boxes.avatar.left, 0);
      expect(boxes.avatarImage.right).toBeCloseTo(boxes.avatar.right, 0);
      expect(boxes.avatarImage.top).toBeGreaterThanOrEqual(boxes.avatar.top - 1);
      expect(boxes.avatarImage.bottom).toBeLessThanOrEqual(boxes.avatar.bottom + 1);
      const outputDirectory = resolve("../output/playwright/visual-sweep");
      await mkdir(outputDirectory, { recursive: true });
      await row.screenshot({
        path: resolve(outputDirectory, `stylex-site-project-list-row-${viewport.name}.png`),
      });
    });
  }

  test("keeps generated row classes inside the explicit row owners", async ({ page }) => {
    await openProjectList(page);
    const owners = await page
      .locator('[data-stylex-owner="site-project-list-container"]')
      .evaluate((list) =>
        Array.from(list.querySelectorAll(":scope > li, :scope > li *"))
          .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
          .map((element) =>
            element.closest("[data-stylex-owner]")?.getAttribute("data-stylex-owner"),
          ),
      );

    expect(new Set(owners)).toEqual(
      new Set([
        "site-project-list-row",
        "site-project-list-row-avatar",
        "site-project-list-row-avatar-image",
        "site-project-list-row-name-column",
        "site-project-list-row-description-column",
        "site-project-list-row-created-column",
        "site-project-list-row-action-column",
        "site-project-list-project-name",
        "site-project-list-delete-action",
      ]),
    );
  });
});
