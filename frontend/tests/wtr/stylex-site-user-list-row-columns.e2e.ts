import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const columnOwner = "site-user-list-row-column";

test("row columns own the legacy grid and column declarations", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  expect(legacy).toContain('<div class="span3 listitem-col">');
  expect(legacy).toContain('<div class="span2 listitem-col created-date">');
  expect(legacy).toContain('<div class="span5 listitem-col action-buttons">');
  expect(less).toContain(".listitem-col {");
  expect(bootstrap).toContain('.row-fluid [class*="span"] {');
  for (const owner of [
    columnOwner,
    "site-user-list-row-email",
    "site-user-list-row-date",
    "site-user-list-row-action",
    "site-user-list-row-leave-date",
  ])
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain('state === "DELETED" ? "row-fluid listitem "');
  for (const retired of [
    "span3 listitem-col",
    "span2 listitem-col created-date",
    "span5 listitem-col action-buttons",
  ])
    expect(route).not.toContain(`className="${retired}"`);
  expect(route).toContain('data-stylex-owner="site-user-list-row-action-button"');
  expect(route).not.toContain("action-buttons");
  expect(route).not.toContain('className="span4 listitem-col"');
  expect(route).not.toContain("globalColors.");
});

test("ACTIVE columns preserve desktop and mobile legacy geometry", async ({ page }) => {
  await installFixture(page);
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const row = page.locator('[data-stylex-owner="site-user-list-row"]').first();
    const columns = row.locator(
      `:scope > [data-stylex-owner="${columnOwner}"], :scope > [data-stylex-owner="site-user-list-row-date"], :scope > [data-stylex-owner="site-user-list-row-action"]`,
    );
    await expect(columns).toHaveCount(4);
    expect(
      await columns.evaluateAll((nodes) =>
        nodes.map((node) => ({
          generated: Array.from(node.classList).some((token) => token.startsWith("x")),
          retired: ["span3", "span2", "span5", "listitem-col", "created-date"].some((token) =>
            node.classList.contains(token),
          ),
        })),
      ),
    ).toEqual([
      { generated: true, retired: false },
      { generated: true, retired: false },
      { generated: true, retired: false },
      { generated: true, retired: false },
    ]);
    expect(await row.evaluate((node) => node.classList.contains("row-fluid"))).toBe(false);
    expect(
      await row
        .locator('[data-stylex-owner="site-user-list-row-email"]')
        .evaluate((node) => Array.from(node.classList).some((token) => token.startsWith("x"))),
    ).toBe(true);
    const evidence = await row.evaluate((row) => {
      const columns = Array.from(row.children) as HTMLElement[];
      const box = (node: Element) => node.getBoundingClientRect().toJSON();
      const style = (node: Element) => {
        const s = getComputedStyle(node);
        return {
          boxSizing: s.boxSizing,
          display: s.display,
          float: s.float,
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          marginLeft: s.marginLeft,
          minHeight: s.minHeight,
          padding: s.padding,
          textOverflow: s.textOverflow,
          width: s.width,
          wordBreak: s.wordBreak,
        };
      };
      const before = columns.map(style);
      const fixture = document.createElement("li");
      fixture.className = "row-fluid listitem";
      fixture.style.cssText = `position:absolute;left:-10000px;width:${row.getBoundingClientRect().width}px`;
      fixture.innerHTML =
        '<div class="span3 listitem-col"></div><div class="span3 listitem-col"><span class="email"></span></div><div class="span2 listitem-col created-date"></div><div class="span5 listitem-col action-buttons"></div>';
      row.parentElement!.append(fixture);
      const fallback = Array.from(fixture.children).map(style);
      row.classList.remove("row-fluid");
      for (const column of columns)
        column.classList.remove("span3", "span2", "span5", "listitem-col", "created-date");
      const withoutLegacy = columns.map(style);
      fixture.remove();
      return {
        before,
        boxes: columns.map(box),
        email: style(columns[1].querySelector('[data-stylex-owner="site-user-list-row-email"]')!),
        fallback,
        row: box(row),
        withoutLegacy,
      };
    });
    expect(evidence.withoutLegacy).toEqual(evidence.before);
    // F5 dist-truth: legacy .listitem-col (_page.less:5332-5340: fontSize 12px,
    // lineHeight 20px, padding 10px 0, textOverflow ellipsis, wordBreak break-all)
    // is ported to stylex; the frozen `div.span3/2/5.listitem-col` fixture is
    // unstyled in dist (no .listitem-col port in app.css), so the app's computed
    // values ARE the legacy truth — pin them (the explicit pins below re-assert
    // each legacy field).
    expect(evidence.before.map((style) => style.fontSize)).toEqual([
      "12px",
      "12px",
      "12px",
      "12px",
    ]);
    expect(evidence.before.map((style) => style.lineHeight)).toEqual([
      "20px",
      "20px",
      "20px",
      "20px",
    ]);
    const fractions = [
      0.23404255319148934, 0.23404255319148934, 0.14893617021276595, 0.4042553191489362,
    ];
    for (const [index, style] of evidence.before.entries()) {
      expect(style).toMatchObject({
        boxSizing: "border-box",
        display: "block",
        float: "left",
        fontSize: "12px",
        lineHeight: "20px",
        minHeight: "30px",
        textOverflow: "ellipsis",
        wordBreak: "break-all",
      });
      expect(Number.parseFloat(style.width) / evidence.row.width).toBeCloseTo(fractions[index], 4);
      expect(Number.parseFloat(style.marginLeft)).toBeCloseTo(
        index === 0 ? 0 : viewport.name === "desktop" ? 23.75 : 6.875,
        2,
      );
    }
    expect(evidence.before.map((style) => style.padding)).toEqual([
      "10px 0px",
      "10px 0px",
      "10px 0px",
      "0px 0px 10px",
    ]);
    expect(evidence.email).toMatchObject({ fontSize: "13px", lineHeight: "43px" });
    expect(evidence.boxes[3].left).toBeCloseTo(evidence.boxes[2].left, 2);
    expect(evidence.boxes[3].top).toBeGreaterThanOrEqual(evidence.boxes[2].bottom - 0.01);
    for (const box of evidence.boxes)
      expect(box.right).toBeLessThanOrEqual(evidence.row.right + 0.01);
    const expected =
      viewport.name === "desktop"
        ? {
            heights: [68, 63, 40],
            lefts: [239.078, 524.219, 809.359, 809.359],
            widths: [261.391, 261.391, 166.344, 451.5],
          }
        : {
            lefts: [66.375, 148.984, 231.594, 231.594],
            widths: [75.734, 75.734, 48.188, 130.813],
          };
    for (const [index, box] of evidence.boxes.entries()) {
      expect(box.left).toBeCloseTo(expected.lefts[index], 2);
      expect(box.width).toBeCloseTo(expected.widths[index], 2);
    }
    if ("heights" in expected) {
      expect(evidence.boxes.slice(0, 3).map((box) => box.height)).toEqual(expected.heights);
      // Legacy action height is 70px, while excluded React action-button descendants make the
      // local fixture 74px; this column wave owns its padding/width/wrap, not child-driven height.
    }
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
        total: 1,
        totalPages: 1,
        users: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2026-06-28",
            displayName: "Alice",
            emailAddress: "alice@example.com",
            id: 1,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "",
            loginId: "alice",
            state: "ACTIVE",
          },
        ],
      },
    }),
  );
}
