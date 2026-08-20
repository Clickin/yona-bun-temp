import { readFile, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const owners = { list: "site-user-list-row-list", row: "site-user-list-row" } as const;

test("row shell ownership follows the populated legacy list", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const appCss = curatedAppCss();
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  expect(legacy).toContain('<ul class="user-list-wrap">');
  expect(legacy).toContain('<li class="row-fluid listitem">');
  expect(pageLess).toContain(".listitem {");
  expect(bootstrap).toContain(".row-fluid {\n  width: 100%;");
  expect(route).toContain(`data-owner="${owners.list}"`);
  expect(route).toContain(`data-owner="${owners.row}"`);
  expect(route).toContain('data-owner="site-user-list-row-leave-date"');
  expect(route).not.toContain('state === "DELETED" ? "row-fluid listitem "');
  expect(route).not.toContain('className="span4 listitem-col"');
  for (const retiredSelector of [
    ".site-admin-page .user-list-wrap",
    ".site-admin-page .user-list-wrap .listitem",
    ".site-admin-page .user-list-wrap .listitem:last-child",
  ])
    expect(appCss).not.toContain(retiredSelector);
  for (const owner of [
    "site-user-list-row-avatar",
    "site-user-list-row-avatar-image",
    "site-user-list-row-user-name",
    "site-user-list-row-user-id",
  ])
    expect(route).toContain(`data-owner="${owner}"`);
  expect(route).toContain('data-owner="site-user-list-row-action"');
  expect(route).toContain('data-owner="site-user-list-row-action-button"');
  expect(route).not.toContain("action-buttons");
  expect(pageLess).toContain("&.action-buttons {");
  expect(pageLess).toContain("margin: 2px !important;");
});

test("three ACTIVE rows preserve frozen row-shell output", async ({ page }) => {
  await installFixture(page);
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const list = page.locator(`[data-owner="${owners.list}"]`);
    const rows = list.locator(`:scope > [data-owner="${owners.row}"]`);
    await expect(rows).toHaveCount(3);
    await expect(rows.locator(':scope [data-owner="site-user-list-row-user-name"]')).toHaveText([
      "Alice",
      "Bob",
      "Carol",
    ]);
    // e2e closure ledger (2026-08-11): ROUTE_DOM — legacy site/userList.scala.html:73,75
    // renders <ul class="user-list-wrap"> > <li class="row-fluid listitem">; the
    // route owns the classes (data-owner styling carries the row-shell geometry).
    expect(await list.evaluate((node) => node.classList.contains("user-list-wrap"))).toBe(true);
    expect(
      await rows.evaluateAll((nodes) =>
        nodes.map((node) => ({
          children: node.children.length,
          listitem: node.classList.contains("listitem"),
          rowFluid: node.classList.contains("row-fluid"),
        })),
      ),
    ).toEqual([
      { children: 4, listitem: true, rowFluid: true },
      { children: 4, listitem: true, rowFluid: true },
      { children: 4, listitem: true, rowFluid: true },
    ]);
    const evidence = await page.evaluate((owners) => {
      const list = document.querySelector<HTMLElement>(`[data-owner="${owners.list}"]`)!;
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
        .querySelector<HTMLElement>('[data-owner="site-user-list-listhead"]')!
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
    // F5 dist-truth: legacy .user-list-wrap { list-style:none } (_page.less:5363) and
    // .listitem (border-bottom 1px solid #efefef, line-height 70px — _page.less:5318-5320)
    // are ported to style; the frozen `ul.user-list-wrap > li.row-fluid.listitem`
    // fixture is unstyled in dist (no user-list-wrap/listitem port in app.css), so the
    // app's computed values ARE the legacy truth — pin them (row fields re-pinned below).
    expect(evidence.actual.list).toMatchObject({
      display: "block",
      lineHeight: "20px",
      listStyleType: "none",
      margin: "0px",
      padding: "0px",
    });
    expect(evidence.actual.rows.map((row) => row.listStyleType)).toEqual(["none", "none", "none"]);
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
    // F5 dist-truth (2026-08-13): absolute list top = listheadBottom + 5 (legacy
    // .listhead margin-bottom:5px, _page.less:5309); measured dist value is 310
    // (verified by the listheadBottom+5 equality below).
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
      // Authenticated ko-KR legacy rows are 243px; this English fixture is exactly 231px after
      // Slice 166 restored frozen `_page.less` 2px margins on all five action controls.
      expect(evidence.boxes.map((box) => box.height)).toEqual([231, 231, 231]);
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
        `style-site-user-list-row-shell-${viewport.name}.png`,
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
