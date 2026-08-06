import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const owners = {
  column: "site-user-list-listhead-column",
  root: "site-user-list-listhead",
} as const;

test("listhead owns only the direct row and four repeated columns", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme = readFileSync("src/routes/sites/-userList.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");

  expect(legacy).toContain('<div class="row-fluid listhead">');
  expect(bootstrap).toContain(".row-fluid {\n  width: 100%;");
  expect(bootstrap).toContain('.row-fluid [class*="span"] {');
  expect(pageLess).toContain(".listhead {\n        background:#f7f7f7;");
  expect(pageLess).toContain(".listhead-title{\n            padding:0 20px;");
  expect(appCss).not.toContain(".site-setting-wrap .listhead {");
  expect(route).toContain('data-stylex-owner="site-user-list-listhead"');
  expect(route).toContain('data-stylex-owner="site-user-list-listhead-column"');
  for (const retired of [
    "row-fluid listhead",
    "span3 listhead-title",
    "span2 listhead-title",
    "span4 listhead-title",
  ])
    expect(route).not.toContain(`className="${retired}"`);
  expect(route).toContain("siteUserListColors.listheadSurface");
  expect(route).toContain("siteUserListColors.listheadBorder");
  expect(theme).toContain("listheadSurface");
  expect(theme).toContain("listheadBorder");
  expect(route).not.toContain("globalColors.");
  expect(readFileSync("src/routes/$ownerName/$projectName/code/$branch.tsx", "utf8")).toContain(
    "row-fluid listhead",
  );
});

test("populated ACTIVE listhead preserves desktop and mobile frozen output", async ({ page }) => {
  await installFixture(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const root = page.locator(`[data-stylex-owner="${owners.root}"]`);
    const columns = root.locator(`:scope > [data-stylex-owner="${owners.column}"]`);
    await expect(columns).toHaveCount(4);
    expect(
      await root.evaluate((element) =>
        ["row-fluid", "listhead"].filter((token) => element.classList.contains(token)),
      ),
    ).toEqual([]);
    expect(
      await columns.evaluateAll((elements) =>
        elements.flatMap((element) =>
          ["span3", "span2", "span4", "listhead-title"]
            .filter((token) => element.classList.contains(token))
            .map((token) => `${element.tagName}:${token}`),
        ),
      ),
    ).toEqual([]);
    await expect(columns.locator(":scope > strong").nth(0)).toHaveText("Name");
    await expect(columns.locator(":scope > strong").nth(1)).toHaveText("Email address");
    await expect(columns.locator(":scope > strong").nth(2)).toHaveText("Member since");
    expect(await columns.locator(":scope > strong").nth(3).textContent()).toBe("\u00a0");
    expect(
      await columns.evaluateAll((nodes) => nodes.map((node) => node.children[0]?.tagName)),
    ).toEqual(["STRONG", "STRONG", "STRONG", "STRONG"]);

    const evidence = await page.evaluate((names) => {
      const root = document.querySelector<HTMLElement>(`[data-stylex-owner="${names.root}"]`)!;
      const columns = Array.from(
        root.querySelectorAll<HTMLElement>(`:scope > [data-stylex-owner="${names.column}"]`),
      );
      const rect = (element: HTMLElement) => element.getBoundingClientRect().toJSON();
      const properties = [
        "backgroundColor",
        "borderBottomColor",
        "borderBottomStyle",
        "borderBottomWidth",
        "boxSizing",
        "display",
        "float",
        "lineHeight",
        "marginBottom",
        "marginLeft",
        "minHeight",
        "padding",
        "width",
      ] as const;
      const values = (element: Element) => {
        const computed = getComputedStyle(element);
        return properties.map((property) => computed[property]);
      };
      const fixture = document.createElement("div");
      fixture.className = "row-fluid listhead";
      fixture.style.cssText = `position:absolute;left:-10000px;width:${root.getBoundingClientRect().width}px`;
      fixture.innerHTML =
        '<div class="span3 listhead-title"></div><div class="span3 listhead-title"></div><div class="span2 listhead-title"></div><div class="span4 listhead-title"></div>';
      root.parentElement!.append(fixture);
      const fallbackColumns = Array.from(fixture.children);
      const pseudo = (name: string) => {
        const style = getComputedStyle(root, name);
        return {
          clear: style.clear,
          content: style.content,
          display: style.display,
          lineHeight: style.lineHeight,
        };
      };
      const result = {
        actual: { columns: columns.map(values), root: values(root) },
        boxes: { columns: columns.map(rect), root: rect(root) },
        fallback: { columns: fallbackColumns.map(values), root: values(fixture) },
        pseudos: [pseudo("::before"), pseudo("::after")],
        tabsBottom: document
          .querySelector<HTMLElement>('[data-stylex-owner="site-user-list-state-tabs"]')!
          .getBoundingClientRect().bottom,
        userListTop: document
          .querySelector<HTMLElement>('[data-stylex-owner="site-user-list-row-list"]')!
          .getBoundingClientRect().top,
      };
      fixture.remove();
      return result;
    }, owners);
    expect(evidence.actual).toEqual(evidence.fallback);
    expect(evidence.pseudos).toEqual([
      { clear: "none", content: '""', display: "table", lineHeight: "0px" },
      { clear: "both", content: '""', display: "table", lineHeight: "0px" },
    ]);
    const expectedWidth = viewport.name === "desktop" ? 1116.891 : 323.609;
    expect(evidence.actual.root.slice(0, 12)).toEqual([
      "rgb(247, 247, 247)",
      "rgb(239, 239, 239)",
      "solid",
      "1px",
      "content-box",
      "block",
      "none",
      "30px",
      "5px",
      "0px",
      "0px",
      "5px 0px",
    ]);
    expect(Number.parseFloat(evidence.actual.root[12])).toBeCloseTo(expectedWidth, 2);
    const expectedGutter = viewport.name === "desktop" ? 23.75 : 6.875;
    for (const [index, column] of evidence.actual.columns.entries()) {
      expect(column[4]).toBe("border-box");
      expect(column[5]).toBe("block");
      expect(column[6]).toBe("left");
      expect(Number.parseFloat(column[9])).toBeCloseTo(index === 0 ? 0 : expectedGutter, 3);
      expect(column[10]).toBe("30px");
      expect(column[11]).toBe("0px 20px");
    }
    expect(evidence.boxes.root.width).toBeCloseTo(expectedWidth, 2);
    expect(evidence.boxes.root.left).toBeCloseTo(viewport.name === "desktop" ? 239.078 : 66.375, 2);
    if (viewport.name === "desktop") expect(evidence.boxes.root.top).toBeCloseTo(264, 2);
    expect(evidence.boxes.root.top).toBe(evidence.tabsBottom + 20);
    const [span3a, span3b, span2, span4] = evidence.boxes.columns;
    if (viewport.name === "desktop") {
      expect(evidence.boxes.root.height).toBe(41);
      expect(evidence.boxes.columns.map((column) => column.height)).toEqual([30, 30, 30, 30]);
    } else {
      // The local en-US fixture wraps both “Email address” and “Member since” into two 30px
      // lines; the authenticated ko-KR legacy capture has its own three-line/101px copy case.
      expect(evidence.boxes.root.height).toBe(71);
      expect(evidence.boxes.columns.map((column) => column.height)).toEqual([30, 60, 60, 30]);
    }
    expect(span3a.left).toBe(evidence.boxes.root.left);
    expect(span3a.width / evidence.boxes.root.width).toBeCloseTo(0.23404255319148934, 4);
    expect(span3b.width / evidence.boxes.root.width).toBeCloseTo(0.23404255319148934, 4);
    expect(span2.width / evidence.boxes.root.width).toBeCloseTo(0.14893617021276595, 4);
    expect(span4.width / evidence.boxes.root.width).toBeCloseTo(0.3191489361702128, 4);
    for (const [previous, current] of [
      [span3a, span3b],
      [span3b, span2],
      [span2, span4],
    ]) {
      expect(current.left).toBeGreaterThanOrEqual(previous.right);
      expect((current.left - previous.right) / evidence.boxes.root.width).toBeCloseTo(
        0.02127659574468085,
        4,
      );
    }
    expect(span4.right).toBeLessThanOrEqual(evidence.boxes.root.right);
    expect(evidence.userListTop).toBe(evidence.boxes.root.bottom + 5);
    mkdirSync(resolve("..", "output", "playwright"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        `stylex-site-user-list-listhead-${viewport.name}.png`,
      ),
    });
  }
});

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
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
        siteAdminCount: 3,
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
