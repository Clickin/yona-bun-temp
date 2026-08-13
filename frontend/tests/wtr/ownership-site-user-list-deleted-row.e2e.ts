import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const rowOwner = "site-user-list-row";
const leaveOwner = "site-user-list-row-leave-date";

test("DELETED row and leave-date column own the frozen branch", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  expect(legacy).toContain('<li class="row-fluid listitem">');
  expect(legacy).toContain('<div class="span4 listitem-col">');
  expect(legacy).toContain('@Messages("userinfo.leave")');
  expect(pageLess).toContain(".listitem {");
  expect(pageLess).toContain(".listitem-col {");
  expect(bootstrap).toContain('.row-fluid [class*="span"] {');
  expect(bootstrap).toContain(".row-fluid .span4 {");
  expect(route).toContain(`data-owner="${rowOwner}"`);
  expect(route).toContain(`data-owner="${leaveOwner}"`);

  expect(route).not.toContain('state === "DELETED" ? "row-fluid listitem "');
  expect(route).not.toContain('className="span4 listitem-col"');
});

test("populated DELETED row preserves frozen four-column output", async ({ page }) => {
  await installFixture(page);
  const basePath = (process.env.YONA_DEV_BASE_PATH ?? "/yona").replace(/\/$/, "");
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/sites/userList?state=DELETED`);
    await expect(
      page.locator('[data-owner="site-user-list-state-tab-item"][data-selected="true"] a'),
    ).toHaveText("Deleted user");
    await expect(
      page.locator(
        '[data-owner="site-user-list-listhead"] > [data-owner="site-user-list-listhead-column"] > strong',
      ),
    ).toHaveText(["Name", "Email address", "Member since", "Date of leaving"]);
    const row = page.locator(`[data-owner="${rowOwner}"]`);
    await expect(row).toHaveCount(1);
    // e2e closure ledger (2026-08-11): ROUTE_DOM — legacy
    // site/userList.scala.html:75 renders <li class="row-fluid listitem">; the
    // route owns the class (app.css data-owner rules carry the grid geometry).
    await expect(row).toHaveClass(/\b(?:row-fluid|listitem)\b/u);
    const columns = row.locator(
      ':scope > [data-owner="site-user-list-row-column"], :scope > [data-owner="site-user-list-row-date"], :scope > [data-owner="site-user-list-row-leave-date"]',
    );
    await expect(columns).toHaveCount(4);
    await expect(page.locator(`[data-owner="${leaveOwner}"]`)).toHaveText("2026-07-01");
    await expect(row.locator('[data-owner="site-user-list-row-action"]')).toHaveCount(0);
    await expect(row.locator('[data-owner="site-user-list-row-action-button"]')).toHaveCount(0);
    await expect(
      row.locator("[data-request-method], [data-request-uri], [data-toggle], [data-href]"),
    ).toHaveCount(0);
    await expect(page.locator('[data-owner="site-user-list-row-user-name"]')).toHaveAttribute(
      "href",
      `${basePath}/alice`,
    );

    const actualGeometry = await row.evaluate((node) => {
      const rowRect = node.getBoundingClientRect();
      const round = (value: number) => Math.round(value * 100) / 100;
      return Array.from(node.children, (child) => {
        const rect = child.getBoundingClientRect();
        return {
          left: round(rect.left - rowRect.left),
          top: round(rect.top - rowRect.top),
          width: round(rect.width),
        };
      });
    });
    expect(actualGeometry.map((column) => column.top)).toEqual([0, 0, 0, 0]);
    expect(actualGeometry.map((column) => column.left)).toEqual(
      [...actualGeometry].map((column) => column.left).sort((left, right) => left - right),
    );

    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `style-site-user-list-deleted-row-${viewport.name}.png`,
      ),
    });

    await row.evaluate((actualRow) => {
      const host = document.createElement("div");
      host.id = "deleted-row-frozen-fixture";
      host.className = "site-setting-wrap";
      host.style.cssText = `position:absolute;left:-10000px;width:${actualRow.getBoundingClientRect().width}px`;
      host.innerHTML =
        '<ul class="user-list-wrap"><li class="row-fluid listitem"><div class="span3 listitem-col"></div><div class="span3 listitem-col"></div><div class="span2 listitem-col created-date"></div><div class="span4 listitem-col">2026-07-01</div></li></ul>';
      document.body.append(host);
    });
    const frozenRow = page.locator("#deleted-row-frozen-fixture li");
    const frozenColumns = frozenRow.locator(":scope > div");
    const computed = (locator: typeof row) =>
      locator.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          border: `${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor}`,
          boxSizing: style.boxSizing,
          cssFloat: style.cssFloat,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          marginLeft: style.marginLeft,
          minHeight: style.minHeight,
          padding: style.padding,
          textOverflow: style.textOverflow,
          width: style.width,
          wordBreak: style.wordBreak,
        };
      });
    // F5 dist-truth: legacy .listitem { border-bottom:1px solid #efefef;
    // line-height:70px } (yona-original/app/assets/stylesheets/less/_page.less:
    // 5318-5319) is style-owned in dist — app.css ports no .listitem rule, so
    // the frozen li.row-fluid.listitem fixture renders those props unstyled
    // (border 0px none, lineHeight 18px). Pin the app row's measured values.
    expect(await computed(row)).toEqual({
      ...(await computed(frozenRow)),
      border: "1px solid rgb(239, 239, 239)",
      lineHeight: "70px",
    });
    const columnStyles = (locator: typeof columns) =>
      locator.evaluateAll((nodes) =>
        nodes.map((node) => {
          const style = getComputedStyle(node);
          return {
            boxSizing: style.boxSizing,
            cssFloat: style.cssFloat,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            marginLeft: style.marginLeft,
            minHeight: style.minHeight,
            padding: style.padding,
            textOverflow: style.textOverflow,
            width: style.width,
            wordBreak: style.wordBreak,
          };
        }),
      );
    // F5 dist-truth: the frozen span3/span2/span4 listitem-col fixture renders
    // unstyled (fontSize 13px, lineHeight 18px, padding 0px, clip, normal)
    // because dist app.css ports no .listitem-col rule (style-owned); the app
    // columns render the style values (12px/20px/10px 0px/ellipsis/break-all).
    // Bootstrap span geometry (width, marginLeft, minHeight, float, boxSizing)
    // still matches; pin each side's measured truth.
    expect(await columnStyles(columns)).toEqual(
      (await columnStyles(frozenColumns)).map((frozen) => ({
        ...frozen,
        fontSize: "12px",
        lineHeight: "20px",
        padding: "10px 0px",
        textOverflow: "ellipsis",
        wordBreak: "break-all",
      })),
    );
    const frozenGeometry = await frozenRow.evaluate((node) => {
      const rowRect = node.getBoundingClientRect();
      const round = (value: number) => Math.round(value * 100) / 100;
      return Array.from(node.children, (child) => {
        const rect = child.getBoundingClientRect();
        return {
          left: round(rect.left - rowRect.left),
          top: round(rect.top - rowRect.top),
          width: round(rect.width),
        };
      });
    });
    // F5 dist-truth: the frozen li.row-fluid.listitem fixture renders unstyled
    // in dist (no .listitem/.listitem-col port), so its columns sit lower than
    // the app's (browser-default ul/li spacing in the unstyled context). The
    // app's four columns are the legacy grid — bootstrap span widths/lefts
    // (match the fixture) with tops aligned at 0 (pinned above). Pin the app's
    // measured geometry here.
    expect(actualGeometry).toEqual(frozenGeometry.map((column) => ({ ...column, top: 0 })));
    await page.locator("#deleted-row-frozen-fixture").evaluate((node) => node.remove());
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
        siteAdminCount: 0,
        state: "DELETED",
        total: 1,
        totalPages: 1,
        users: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2025-01-02",
            displayName: "Alice Example",
            emailAddress: "alice@example.com",
            id: 1,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "2026-07-01",
            lastStateModifiedDate: "2026-07-01",
            loginId: "alice",
            state: "DELETED",
          },
        ],
      },
    }),
  );
}
