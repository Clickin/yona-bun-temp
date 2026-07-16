import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  expect(route).toContain(`data-stylex-owner="${rowOwner}"`);
  expect(route).toContain(`data-stylex-owner="${leaveOwner}"`);
  expect(route).toContain('userLeaveDateColumn: { width: "31.914893617021278%" }');
  expect(route).not.toContain('state === "DELETED" ? "row-fluid listitem "');
  expect(route).not.toContain('className="span4 listitem-col"');
  expect(route).not.toContain("globalColors.");
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
      page.locator('[data-stylex-owner="site-user-list-state-tab-item"][data-selected="true"] a'),
    ).toHaveText("Deleted user");
    await expect(
      page.locator(
        '[data-stylex-owner="site-user-list-listhead"] > [data-stylex-owner="site-user-list-listhead-column"] > strong',
      ),
    ).toHaveText(["Name", "Email address", "Member since", "Date of leaving"]);
    const row = page.locator(`[data-stylex-owner="${rowOwner}"]`);
    await expect(row).toHaveCount(1);
    await expect(row).not.toHaveClass(/\b(?:row-fluid|listitem)\b/u);
    const columns = row.locator(
      ':scope > [data-stylex-owner="site-user-list-row-column"], :scope > [data-stylex-owner="site-user-list-row-date"], :scope > [data-stylex-owner="site-user-list-row-leave-date"]',
    );
    await expect(columns).toHaveCount(4);
    await expect(page.locator(`[data-stylex-owner="${leaveOwner}"]`)).toHaveText("2026-07-01");
    await expect(row.locator('[data-stylex-owner="site-user-list-row-action"]')).toHaveCount(0);
    await expect(row.locator('[data-stylex-owner="site-user-list-row-action-button"]')).toHaveCount(
      0,
    );
    await expect(
      row.locator("[data-request-method], [data-request-uri], [data-toggle], [data-href]"),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-stylex-owner="site-user-list-row-user-name"]'),
    ).toHaveAttribute("href", `${basePath}/alice`);

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
        `stylex-site-user-list-deleted-row-${viewport.name}.png`,
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
    expect(await computed(row)).toEqual(await computed(frozenRow));
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
    expect(await columnStyles(columns)).toEqual(await columnStyles(frozenColumns));
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
    expect(actualGeometry).toEqual(frozenGeometry);
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
