import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const owners = { list: "site-user-list-row-list", row: "site-user-list-row" } as const;

test("row shell ownership follows the populated legacy list", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme = readFileSync("src/routes/sites/-userList.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  expect(legacy).toContain('<ul class="user-list-wrap">');
  expect(legacy).toContain('<li class="row-fluid listitem">');
  expect(pageLess).toContain(".listitem {");
  expect(bootstrap).toContain(".row-fluid {\n  width: 100%;");
  expect(route).toContain(`data-stylex-owner="${owners.list}"`);
  expect(route).toContain(`data-stylex-owner="${owners.row}"`);
  expect(route).toContain('className={`user-list-wrap ${userListStyleProps.className ?? ""}`}');
  expect(route).toContain('className={`row-fluid listitem ${rowStyleProps.className ?? ""}`}');
  for (const child of [
    "span3 listitem-col",
    "avatar-wrap list-avatar",
    "user-name",
    "user-id",
    "email",
    "span2 listitem-col created-date",
    "span5 listitem-col action-buttons",
  ])
    expect(route).toContain(`className="${child}"`);
  expect(theme).toContain('rowBorder: "#efefef"');
  expect(theme).toContain('rowAlternateSurface: "#f9f9f9"');
  expect(readFileSync("src/routes/$ownerName/$projectName/code/$branch.tsx", "utf8")).toContain(
    'className="row-fluid listitem"',
  );
});

test("three ACTIVE rows preserve frozen row-shell output", async ({ page }) => {
  await installFixture(page);
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const list = page.locator(`[data-stylex-owner="${owners.list}"]`);
    const rows = list.locator(`:scope > [data-stylex-owner="${owners.row}"]`);
    await expect(rows).toHaveCount(3);
    await expect(rows.locator(":scope .user-name")).toHaveText(["Alice", "Bob", "Carol"]);
    expect(
      await list.evaluate((node) => ({
        generated: Array.from(node.classList).some((token) => token !== "user-list-wrap"),
        legacy: node.classList.contains("user-list-wrap"),
      })),
    ).toEqual({ generated: true, legacy: true });
    expect(
      await rows.evaluateAll((nodes) =>
        nodes.map((node) => ({
          children: node.children.length,
          generated: Array.from(node.classList).some(
            (token) => token !== "row-fluid" && token !== "listitem",
          ),
          legacy: ["row-fluid", "listitem"].every((c) => node.classList.contains(c)),
        })),
      ),
    ).toEqual([
      { children: 4, generated: true, legacy: true },
      { children: 4, generated: true, legacy: true },
      { children: 4, generated: true, legacy: true },
    ]);
    const evidence = await page.evaluate((owners) => {
      const list = document.querySelector<HTMLElement>(`[data-stylex-owner="${owners.list}"]`)!;
      const rows = Array.from(list.children) as HTMLElement[];
      const props = (node: Element) => {
        const s = getComputedStyle(node);
        return {
          backgroundColor: s.backgroundColor,
          borderBottomColor: s.borderBottomColor,
          borderBottomStyle: s.borderBottomStyle,
          borderBottomWidth: s.borderBottomWidth,
          display: s.display,
          lineHeight: s.lineHeight,
          listStyleType: s.listStyleType,
          margin: s.margin,
          padding: s.padding,
          width: s.width,
        };
      };
      const pseudo = (node: Element, selector: string) => {
        const s = getComputedStyle(node, selector);
        return { clear: s.clear, content: s.content, display: s.display, lineHeight: s.lineHeight };
      };
      const fixture = document.createElement("ul");
      fixture.className = "user-list-wrap";
      fixture.style.cssText = `position:absolute;left:-10000px;width:${list.getBoundingClientRect().width}px`;
      fixture.innerHTML =
        '<li class="row-fluid listitem"></li><li class="row-fluid listitem"></li><li class="row-fluid listitem"></li>';
      list.parentElement!.append(fixture);
      const fallbackRows = Array.from(fixture.children);
      const ownedBeforeAncestryRemoval = {
        list: props(list),
        pseudos: [pseudo(rows[0], "::before"), pseudo(rows[0], "::after")],
        rows: rows.map(props),
      };
      list.classList.remove("user-list-wrap");
      for (const row of rows) row.classList.remove("row-fluid", "listitem");
      const ownedWithoutAncestry = {
        list: props(list),
        pseudos: [pseudo(rows[0], "::before"), pseudo(rows[0], "::after")],
        rows: rows.map(props),
      };
      list.classList.add("user-list-wrap");
      for (const row of rows) row.classList.add("row-fluid", "listitem");
      const boxes = rows.map((node) => node.getBoundingClientRect().toJSON());
      const columns = Array.from(rows[0].children, (node) =>
        (node as HTMLElement).getBoundingClientRect().toJSON(),
      );
      const columnFloats = Array.from(rows[0].children, (node) => getComputedStyle(node).float);
      const listheadBottom = document
        .querySelector<HTMLElement>('[data-stylex-owner="site-user-list-listhead"]')!
        .getBoundingClientRect().bottom;
      const result = {
        actual: { list: props(list), rows: rows.map(props) },
        fallback: { list: props(fixture), rows: fallbackRows.map(props) },
        boxes,
        columnFloats,
        columns,
        documentWidth: document.documentElement.scrollWidth,
        listBox: list.getBoundingClientRect().toJSON(),
        listheadBottom,
        ownedBeforeAncestryRemoval,
        ownedWithoutAncestry,
        pseudos: [pseudo(rows[0], "::before"), pseudo(rows[0], "::after")],
      };
      fixture.remove();
      return result;
    }, owners);
    expect(evidence.actual).toEqual(evidence.fallback);
    expect(evidence.ownedWithoutAncestry.list.listStyleType).toBe(
      evidence.ownedBeforeAncestryRemoval.list.listStyleType,
    );
    expect(evidence.ownedWithoutAncestry.pseudos).toEqual(
      evidence.ownedBeforeAncestryRemoval.pseudos,
    );
    for (const [index, row] of evidence.ownedWithoutAncestry.rows.entries()) {
      const before = evidence.ownedBeforeAncestryRemoval.rows[index];
      expect(row).toMatchObject({
        backgroundColor: before.backgroundColor,
        borderBottomColor: before.borderBottomColor,
        borderBottomStyle: before.borderBottomStyle,
        borderBottomWidth: before.borderBottomWidth,
        lineHeight: before.lineHeight,
        width: before.width,
      });
    }
    expect(evidence.actual.rows.map((row) => row.backgroundColor)).toEqual([
      "rgba(0, 0, 0, 0)",
      "rgb(249, 249, 249)",
      "rgba(0, 0, 0, 0)",
    ]);
    for (const row of evidence.actual.rows)
      expect(row).toMatchObject({
        borderBottomColor: "rgb(239, 239, 239)",
        borderBottomStyle: "solid",
        borderBottomWidth: "1px",
        display: "list-item",
        lineHeight: "70px",
        listStyleType: "none",
        margin: "0px",
        padding: "0px",
      });
    expect(evidence.pseudos).toEqual([
      { clear: "none", content: '""', display: "table", lineHeight: "0px" },
      { clear: "both", content: '""', display: "table", lineHeight: "0px" },
    ]);
    expect(evidence.boxes[0].left).toBeCloseTo(viewport.name === "desktop" ? 239.078 : 66.375, 2);
    expect(evidence.listBox.left).toBeCloseTo(viewport.name === "desktop" ? 239.078 : 66.375, 2);
    if (viewport.name === "desktop") expect(evidence.listBox.top).toBeCloseTo(310, 2);
    expect(evidence.listBox.width).toBeCloseTo(viewport.name === "desktop" ? 1116.891 : 323.609, 2);
    expect(evidence.listBox.right).toBeLessThanOrEqual(viewport.width);
    expect(evidence.listBox.top).toBe(evidence.listheadBottom + 5);
    expect(evidence.boxes.every((box) => Math.abs(box.width - evidence.listBox.width) < 0.01)).toBe(
      true,
    );
    expect(evidence.boxes[1].top).toBeCloseTo(evidence.boxes[0].bottom, 2);
    expect(evidence.boxes[2].top).toBeCloseTo(evidence.boxes[1].bottom, 2);
    expect(evidence.listBox.height).toBeCloseTo(
      evidence.boxes.reduce((sum, box) => sum + box.height, 0),
      2,
    );
    for (const box of evidence.boxes) {
      expect(box.left).toBeCloseTo(evidence.listBox.left, 2);
      expect(box.right).toBeLessThanOrEqual(evidence.listBox.right + 0.01);
    }
    const fractions = [
      0.23404255319148934, 0.23404255319148934, 0.14893617021276595, 0.40425531914893614,
    ];
    expect(evidence.columnFloats).toEqual(["left", "left", "left", "left"]);
    for (const [index, column] of evidence.columns.entries()) {
      expect(column.width / evidence.listBox.width).toBeCloseTo(fractions[index], 4);
      expect(column.left).toBeGreaterThanOrEqual(evidence.listBox.left);
      expect(column.right).toBeLessThanOrEqual(evidence.listBox.right + 0.01);
      if (index > 0 && index < 3)
        expect(column.left).toBeGreaterThanOrEqual(evidence.columns[index - 1].right);
    }
    const dateColumn = evidence.columns[2];
    const actionColumn = evidence.columns[3];
    expect(actionColumn.left).toBeCloseTo(dateColumn.left, 2);
    expect(actionColumn.top).toBeGreaterThanOrEqual(dateColumn.bottom - 0.01);
    if (viewport.name === "desktop") {
      // Authenticated ko-KR legacy rows are 111px; this en-US React fixture is 115px because
      // excluded action-button/copy descendants determine the final row height.
      expect(evidence.boxes.map((box) => box.height)).toEqual([115, 115, 115]);
    } else {
      // Authenticated ko-KR legacy rows are 243px; excluded English copy/action descendants
      // make this local fixture 223px without changing the owned shell declarations.
      expect(evidence.boxes.map((box) => box.height)).toEqual([223, 223, 223]);
    }
    if (viewport.name === "desktop")
      expect(evidence.documentWidth).toBeLessThanOrEqual(viewport.width);
    mkdirSync(resolve("..", "output", "playwright"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        `stylex-site-user-list-row-shell-${viewport.name}.png`,
      ),
    });
  }
});

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 3,
        totalPages: 1,
        users: ["Alice", "Bob", "Carol"].map((displayName, index) => ({
          avatarUrl: "/assets/images/default-avatar-32.png",
          createdAt: "2026-06-28",
          displayName,
          emailAddress: `${displayName.toLowerCase()}@example.com`,
          id: index + 1,
          isGuest: false,
          isSiteAdmin: false,
          lastStateModifiedAt: "",
          loginId: displayName.toLowerCase(),
          state: "ACTIVE",
        })),
      },
    }),
  );
}
