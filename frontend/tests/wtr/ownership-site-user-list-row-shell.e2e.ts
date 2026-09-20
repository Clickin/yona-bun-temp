import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const owners = { list: "site-user-list-row-list", row: "site-user-list-row" } as const;

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
      // site/userList.scala.html:75-120: same data/width, including the three
      // anchor-origin actions, two native buttons, and inter-control whitespace.
      const reference = document.createElement("ul");
      reference.className = "user-list-wrap";
      reference.style.cssText = `position:absolute;left:-10000px;width:${list.getBoundingClientRect().width}px`;
      reference.innerHTML = ["Alice", "Bob", "Carol"]
        .map(
          (name) => `
        <li class="row-fluid listitem">
          <div class="span3 listitem-col">
            <a class="avatar-wrap list-avatar"><img src="/assets/images/default-avatar-32.png"></a>
            <a class="user-name">${name}</a>
            <a class="user-id">@${name.toLowerCase()}</a>
          </div>
          <div class="span3 listitem-col"><span class="email">${name.toLowerCase()}@example.com</span></div>
          <div class="span2 listitem-col created-date"><span></span></div>
          <div class="span5 listitem-col action-buttons">
            <a class="ybtn ybtn-small">Make Guest</a>
            <a class="ybtn ybtn-small">Lock account</a>
            <button class="ybtn ybtn-small">Reset password</button>
            <a class="ybtn ybtn-small label-info">Upgrade to Site admin</a>
            <button class="ybtn ybtn-small ybtn-danger">Delete</button>
          </div>
        </li>`,
        )
        .join("");
      for (const [index, row] of Array.from(reference.children).entries()) {
        row.querySelector(".created-date span")!.textContent = rows[index].querySelector(
          '[data-owner="site-user-list-row-date"] span',
        )!.textContent;
      }
      list.parentElement!.append(reference);
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
        boxes,
        columnFloats,
        columns,
        documentWidth: document.documentElement.scrollWidth,
        listBox: list.getBoundingClientRect().toJSON(),
        listheadBottom,
        pseudos: [pseudo(rows[0], "::before"), pseudo(rows[0], "::after")],
        referenceHeights: Array.from(
          reference.children,
          (row) => row.getBoundingClientRect().height,
        ),
      };
      reference.remove();
      return result;
    }, owners);
    // _page.less:5318-5320 and 5363 preserve border, line-height, and marker-free rows.
    expect(evidence.actual.list).toMatchObject({
      display: "block",
      lineHeight: "20px",
      listStyleType: "none",
      margin: "0px",
      padding: "0px",
    });
    expect(evidence.actual.rows.map((row) => row.listStyleType)).toEqual(["none", "none", "none"]);
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
    expect(evidence.boxes.map((box) => box.height)).toEqual(evidence.referenceHeights);
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

test("user creation dates switch from relative time to full local time after one day", async ({
  page,
}) => {
  const createdDates = [
    new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    "2020-01-02T03:04:05Z",
  ];
  await installFixture(page, createdDates);
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
  const absoluteLabels = await page.evaluate(
    (values) =>
      values.map((value) => {
        const date = new Date(value);
        const day = date.toLocaleDateString("sv-SE");
        const time = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        return `${day} ${time}`;
      }),
    createdDates.slice(1),
  );
  await expect(page.locator('[data-owner="site-user-list-row-date"]')).toHaveText([
    "2 hours ago",
    ...absoluteLabels,
  ]);
});

async function installFixture(page: Page, createdDates?: string[]) {
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
          createdAt: createdDates?.[index] ?? "2026-06-28",
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
