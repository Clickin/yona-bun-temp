import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const owners = [
  "site-user-list-page-wrap-outer",
  "site-user-list-setting-wrap",
  "site-user-list-setting-grid",
  "site-user-list-setting-sidebar-column",
  "site-user-list-setting-content-column",
] as const;

test("moves only the active legacy user-list management shell to five StyleX owners", () => {
  const route = readFileSync(
    process.env.YONA_USER_LIST_ROUTE_SOURCE ?? "src/routes/sites/userList.tsx",
    "utf8",
  );
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const userList = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const builder = readFileSync("scripts/build-legacy-css.mjs", "utf8");
  const manifest = readFileSync(
    "public/legacy-assets/stylesheets/legacy-fallback.manifest.json",
    "utf8",
  );

  expect(userList).toContain("@siteMngLayout(message)");
  for (const token of ["page-wrap-outer", "site-setting-wrap", "row-fluid", "span2", "span10"])
    expect(layout).toContain(`class="${token}"`);
  expect(pageLess).toContain(".page-wrap-outer {");
  expect(pageLess).toContain(".site-setting-wrap {");
  expect(responsiveLess).toContain(".page-wrap-outer {");
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(bootstrap).toContain(".row-fluid {\n  width: 100%;");
  expect(bootstrap).toContain(".row-fluid .span10 {\n  width: 82.97872340425532%;");
  expect(bootstrap).toContain(".row-fluid .span2 {\n  width: 14.893617021276595%;");
  expect(bootstrapResponsive).toContain('[class*="span"]');
  expect(builder).toContain('activeFrozen: ["bootstrap", "usermenu", "yobi"]');
  expect(builder).toContain('id: "bootstrap-responsive"');
  expect(builder).toContain("inactive in legacy layout.scala.html and retained as parity evidence");
  expect(manifest).toContain('"id": "bootstrap-responsive"');
  expect(manifest).toContain(
    "inactive in legacy layout.scala.html and retained as parity evidence",
  );

  for (const owner of owners) expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain('className="page-wrap-outer"');
  expect(route).toContain(
    'className={`site-setting-wrap ${settingWrapStyleProps.className ?? ""}`}',
  );
  for (const retired of ['className="row-fluid"', 'className="span2"', 'className="span10"'])
    expect(route).not.toContain(retired);
  expect(route).toContain('className="row-fluid listhead"');
  expect(route).toContain('className="row-fluid listitem"');
  expect(route).not.toContain("globalColors.");
  expect(route).not.toContain("siteUserListColors.page");
});

test("preserves the populated ACTIVE shell across desktop and mobile in one browser", async ({
  page,
}) => {
  await installFixture(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const get = (owner: string) => page.locator(`[data-stylex-owner="${owner}"]`);
    const pageWrap = get(owners[0]);
    const setting = get(owners[1]);
    const grid = get(owners[2]);
    const sidebar = get(owners[3]);
    const content = get(owners[4]);
    await expect(pageWrap).not.toHaveClass(/\bpage-wrap-outer\b/u);
    await expect(setting).toHaveClass(/\bsite-setting-wrap\b/u);
    await expect(grid).not.toHaveClass(/\brow-fluid\b/u);
    await expect(sidebar).not.toHaveClass(/\bspan2\b/u);
    await expect(content).not.toHaveClass(/\bspan10\b/u);
    await expect(page.locator(".user-list-wrap > li.row-fluid.listitem")).toHaveCount(3);
    await expect(page.locator(".user-list-wrap > li > .span3")).toHaveCount(6);
    await expect(page.locator(".user-list-wrap > li > .span2")).toHaveCount(3);
    await expect(page.locator(".user-list-wrap > li > .span5")).toHaveCount(3);
    await expect(page.locator(".listhead > .span4")).toHaveCount(1);
    const userRows = page.locator(".user-list-wrap > li.row-fluid.listitem");
    for (const [index, visibleCopy] of [
      [0, ["Bob Park", "@bob", "bob@example.com"]],
      [1, ["Alice Kim", "@alice", "alice@example.com"]],
      [2, ["Carol Lee", "@carol", "carol@example.com"]],
    ] as const) {
      for (const copy of visibleCopy) await expect(userRows.nth(index)).toContainText(copy);
    }
    expect(
      await setting
        .locator(":scope > *")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-stylex-owner"))),
    ).toEqual([owners[2]]);
    expect(
      await grid
        .locator(":scope > *")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-stylex-owner"))),
    ).toEqual([owners[3], owners[4]]);

    const evidence = await page.evaluate((names) => {
      const find = (name: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
      const elements = names.map(find);
      const [pageWrap, setting, grid, sidebar, content] = elements;
      const rect = (element: HTMLElement) => element.getBoundingClientRect().toJSON();
      const column = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return {
          boxSizing: style.boxSizing,
          display: style.display,
          float: style.float,
          minHeight: style.minHeight,
        };
      };
      const pseudo = (name: string) => {
        const style = getComputedStyle(grid, name);
        return {
          clear: style.clear,
          content: style.content,
          display: style.display,
          lineHeight: style.lineHeight,
        };
      };
      const pageStyle = getComputedStyle(pageWrap);
      return {
        boxes: elements.map(rect),
        columns: [column(sidebar), column(content)],
        page: {
          boxSizing: pageStyle.boxSizing,
          marginTop: pageStyle.marginTop,
          minHeight: pageStyle.minHeight,
          minWidth: pageStyle.minWidth,
          padding: pageStyle.padding,
          width: pageStyle.width,
        },
        pseudos: [pseudo("::before"), pseudo("::after")],
        settingMargin: getComputedStyle(setting).margin,
      };
    }, owners);
    const [pageBox, settingBox, gridBox, sidebarBox, contentBox] = evidence.boxes;
    const expectedGridWidth = viewport.name === "desktop" ? 1346 : 390;
    expect(evidence.page).toEqual({
      boxSizing: "border-box",
      marginTop: "10px",
      minHeight: "450px",
      minWidth: viewport.name === "mobile" ? "10px" : "0px",
      padding: viewport.name === "mobile" ? "0px" : "0px 10px",
      width: `${viewport.width}px`,
    });
    expect(evidence.settingMargin).toBe("0px");
    expect(evidence.pseudos).toEqual([
      { clear: "none", content: '""', display: "table", lineHeight: "0px" },
      { clear: "both", content: '""', display: "table", lineHeight: "0px" },
    ]);
    expect(evidence.columns).toEqual([
      { boxSizing: "border-box", display: "block", float: "left", minHeight: "30px" },
      { boxSizing: "border-box", display: "block", float: "left", minHeight: "30px" },
    ]);
    expect(pageBox.x).toBe(0);
    expect(pageBox.width).toBe(viewport.width);
    expect(pageBox.left).toBeGreaterThanOrEqual(0);
    expect(pageBox.right).toBeLessThanOrEqual(viewport.width);
    expect(settingBox.x).toBe(viewport.name === "desktop" ? 10 : 0);
    expect(settingBox.width).toBe(expectedGridWidth);
    expect(settingBox.left).toBeGreaterThanOrEqual(pageBox.left);
    expect(settingBox.right).toBeLessThanOrEqual(pageBox.right);
    expect(gridBox.x).toBe(settingBox.x);
    expect(gridBox.width).toBe(expectedGridWidth);
    expect(gridBox.left).toBeGreaterThanOrEqual(settingBox.left);
    expect(gridBox.right).toBeLessThanOrEqual(settingBox.right);
    expect(sidebarBox.left).toBe(gridBox.left);
    expect(sidebarBox.left).toBeGreaterThanOrEqual(gridBox.left);
    expect(sidebarBox.right).toBeLessThanOrEqual(contentBox.left);
    expect(contentBox.left).toBeGreaterThanOrEqual(gridBox.left);
    expect(contentBox.right).toBeLessThanOrEqual(gridBox.right);
    expect(sidebarBox.width / gridBox.width).toBeCloseTo(0.14893617021276595, 4);
    expect((contentBox.left - sidebarBox.right) / gridBox.width).toBeCloseTo(
      0.02127659574468085,
      4,
    );
    expect(contentBox.width / gridBox.width).toBeCloseTo(0.8297872340425532, 4);
    mkdirSync(resolve("..", "output", "playwright"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        `stylex-site-user-list-page-management-shell-${viewport.name}.png`,
      ),
    });
  }
});

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: "1",
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
      },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 3,
        state: "ACTIVE",
        total: 3,
        totalPages: 1,
        users: [
          user(42, "Bob Park", "bob", "bob@example.com"),
          user(43, "Alice Kim", "alice", "alice@example.com"),
          user(44, "Carol Lee", "carol", "carol@example.com"),
        ],
      },
    }),
  );
}

function user(id: number, displayName: string, loginId: string, emailAddress: string) {
  return {
    avatarUrl: "/assets/images/default-avatar-32.png",
    createdAt: "2026-06-28 12:00:00",
    displayName,
    emailAddress,
    id,
    isGuest: false,
    isSiteAdmin: false,
    lastStateModifiedAt: "",
    loginId,
    state: "ACTIVE",
  };
}
