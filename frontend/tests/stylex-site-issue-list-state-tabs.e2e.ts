import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const templateSource = new URL(
  "../../yona-original/app/views/site/issueList.scala.html",
  import.meta.url,
);
const yobiSource = new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url);
const commonLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const responsiveLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const yobiUiLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  import.meta.url,
);
const bootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);

const owners = {
  item: "site-issue-list-state-tab-item",
  link: "site-issue-list-state-tab-link",
  tabs: "site-issue-list-state-tabs",
} as const;

const owner = (root: Page | Locator, name: string) => root.locator(`[data-stylex-owner="${name}"]`);

async function openIssueList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-issue-list-state-tabs" },
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/issues?*", (route) => {
    const state = new URL(route.request().url()).searchParams.get("state") ?? "open";
    return route.fulfill({
      contentType: "application/json",
      json: {
        issues: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            issueNumber: "42",
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            state,
            title: `${state} release blocker`,
          },
        ],
        page: 1,
        pageSize: 20,
        state,
        total: 1,
        totalPages: 1,
      },
    });
  });

  await page.goto(`${basePath}/sites/issueList?state=open&pageNum=2&sort=created`);
  const tabs = owner(page, owners.tabs);
  await expect(tabs).toBeVisible();
  return tabs;
}

test.describe("StyleX site issue-list state tabs", () => {
  test("pins the full frozen cascade and declares three route-owned theme boundaries", async () => {
    const [route, theme, template, yobi, common, responsive, yobiUi, bootstrap] = await Promise.all(
      [
        readFile(routeSource, "utf8"),
        readFile(themeSource, "utf8"),
        readFile(templateSource, "utf8"),
        readFile(yobiSource, "utf8"),
        readFile(commonLessSource, "utf8"),
        readFile(responsiveLessSource, "utf8"),
        readFile(yobiUiLessSource, "utf8"),
        readFile(bootstrapSource, "utf8"),
      ],
    );

    expect(template).toContain('<ul class="nav nav-tabs">');
    expect(template.indexOf('issue.state." + State.OPEN')).toBeLessThan(
      template.indexOf('issue.state." + State.CLOSED'),
    );
    expect(yobi).toContain('@import "less/_common.less";');
    expect(yobi).toContain('@import "less/_responsive.less";');
    expect(yobi).toContain('@import "less/_yobiUI.less";');
    expect(yobi.indexOf("_responsive.less")).toBeLessThan(yobi.indexOf("_yobiUI.less"));
    expect(common).toContain("a {\n    color: inherit;");
    expect(common).toContain("&:focus { outline: none !important; text-decoration: underline; }");
    expect(bootstrap).toContain(".nav-tabs > li > a:hover,");
    expect(bootstrap).toContain(".nav-tabs > .active > a,");
    expect(responsive).toContain(".nav-tabs li a {\n    padding-left: 5px !important;");
    expect(yobiUi).toContain("padding-left:30px; padding-right:30px;");
    expect(yobiUi).toContain("color: #3592b5;");

    for (const explicitOwner of Object.values(owners))
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
    for (const style of [
      "issueListStateTabs",
      "issueListStateTabItem",
      "issueListStateTabItemSelected",
      "issueListStateTabLink",
      "issueListStateTabLinkSelected",
    ])
      expect(route).toContain(`styles.${style}`);
    expect(route).toContain("globalBreakpoints.mobile");
    for (const token of [
      "siteIssueListStateTabsMarginBottom",
      "siteIssueListStateTabsMarginLeft",
      "siteIssueListStateTabsListStyle",
      "siteIssueListStateTabsBorderBottom",
      "siteIssueListStateTabsBorderBottomWidth",
      "siteIssueListStateTabsBorderBottomStyle",
      "siteIssueListStateTabsClearfixContent",
      "siteIssueListStateTabsClearfixDisplay",
      "siteIssueListStateTabsClearfixLineHeight",
      "siteIssueListStateTabsClearfixClear",
      "siteIssueListStateTabItemFloat",
      "siteIssueListStateTabItemMarginBottom",
      "siteIssueListStateTabLinkDisplay",
      "siteIssueListStateTabLinkDesktopPaddingInline",
      "siteIssueListStateTabLinkMobilePaddingInline",
      "siteIssueListStateTabLinkPaddingBlock",
      "siteIssueListStateTabLinkMarginRight",
      "siteIssueListStateTabLinkLineHeight",
      "siteIssueListStateTabLinkBorder",
      "siteIssueListStateTabLinkBorderWidth",
      "siteIssueListStateTabLinkBorderStyle",
      "siteIssueListStateTabLinkRadius",
      "siteIssueListStateTabLinkText",
      "siteIssueListStateTabLinkFontWeight",
      "siteIssueListStateTabLinkInteractiveSurface",
      "siteIssueListStateTabLinkInteractiveBorder",
      "siteIssueListStateTabLinkInteractiveTextDecoration",
      "siteIssueListStateTabLinkSelectedText",
      "siteIssueListStateTabLinkSelectedSurface",
      "siteIssueListStateTabLinkSelectedBorder",
      "siteIssueListStateTabLinkSelectedBorderBottom",
      "siteIssueListStateTabLinkSelectedCursor",
    ]) {
      expect(route).toContain(`globalColors.${token}`);
      expect(theme).toContain(token);
    }
  });

  test("keeps Open/Closed order, destinations, selected transfer, SPA navigation, and shell", async ({
    page,
  }) => {
    const tabs = await openIssueList(page);
    const items = owner(tabs, owners.item);
    const links = owner(tabs, owners.link);
    await expect(items).toHaveCount(2);
    await expect(links).toHaveText(["Open", "Closed"]);
    await expect(links.nth(0)).toHaveAttribute("href", `${basePath}/sites/issueList?state=open`);
    await expect(links.nth(1)).toHaveAttribute("href", `${basePath}/sites/issueList?state=closed`);
    await expect(items.nth(0)).toHaveAttribute("data-selected", "true");
    await expect(items.nth(1)).toHaveAttribute("data-selected", "false");

    await page.evaluate(() => {
      (window as Window & { __issueTabShell?: boolean }).__issueTabShell = true;
    });
    await links.nth(1).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("closed");
    expect(new URL(page.url()).searchParams.get("pageNum")).toBeNull();
    expect(new URL(page.url()).searchParams.get("sort")).toBeNull();
    await expect(items.nth(0)).toHaveAttribute("data-selected", "false");
    await expect(items.nth(1)).toHaveAttribute("data-selected", "true");
    await expect(page.locator('[data-stylex-owner="site-issue-list-row"]')).toContainText(
      "closed release blocker",
    );
    expect(
      await page.evaluate(() => (window as Window & { __issueTabShell?: boolean }).__issueTabShell),
    ).toBe(true);
  });

  test("retires only nav/nav-tabs/active and isolates every generated tab class", async ({
    page,
  }) => {
    const tabs = await openIssueList(page);
    await expect(tabs).not.toHaveClass(/\bnav\b/u);
    await expect(tabs).not.toHaveClass(/\bnav-tabs\b/u);
    for (const item of await owner(tabs, owners.item).all())
      await expect(item).not.toHaveClass(/\bactive\b/u);

    const ownership = await tabs.evaluate((root) =>
      Array.from(root.querySelectorAll<HTMLElement>("*"))
        .filter((element) => Array.from(element.classList).some((name) => name.startsWith("x")))
        .map((element) => element.closest<HTMLElement>("[data-stylex-owner]")?.dataset.stylexOwner),
    );
    expect(ownership).not.toContain(undefined);
    expect(new Set(ownership)).toEqual(new Set([owners.item, owners.link]));
    expect(
      (await tabs.getAttribute("class"))?.split(/\s+/u).some((name) => name.startsWith("x")),
    ).toBe(true);
  });

  for (const viewport of [
    { height: 900, name: "desktop", paddingInline: "30px", width: 1366 },
    { height: 844, name: "mobile", paddingInline: "5px", width: 390 },
  ]) {
    test(`keeps ${viewport.name} cascade, responsive geometry, containment, and frozen fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const tabs = await openIssueList(page);
      const items = owner(tabs, owners.item);
      const open = owner(tabs, owners.link).nth(0);
      const closed = owner(tabs, owners.link).nth(1);

      await expect(tabs).toHaveCSS("margin-bottom", "20px");
      await expect(tabs).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
      await expect(items.nth(0)).toHaveCSS("float", "left");
      await expect(items.nth(0)).toHaveCSS("margin-bottom", "-1px");
      await expect(open).toHaveCSS("display", "block");
      await expect(open).toHaveCSS("padding-left", viewport.paddingInline);
      await expect(open).toHaveCSS("padding-right", viewport.paddingInline);
      await expect(open).toHaveCSS("padding-top", "8px");
      await expect(open).toHaveCSS("padding-bottom", "8px");
      await expect(open).toHaveCSS("line-height", "20px");
      await expect(open).toHaveCSS("color", "rgb(85, 85, 85)");
      await expect(open).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(open).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
      await expect(open).toHaveCSS("cursor", "default");
      await expect(closed).toHaveCSS("color", "rgb(53, 146, 181)");
      await closed.hover();
      await expect(closed).toHaveCSS("background-color", "rgb(242, 242, 242)");
      await expect(closed).toHaveCSS("border-top-color", "rgb(238, 238, 238)");
      await closed.focus();
      await expect(closed).toHaveCSS("text-decoration-line", "none");
      await closed.evaluate((link) => link.blur());
      await page.mouse.move(0, 0);
      await expect(closed).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

      const geometry = await tabs.evaluate((root) => {
        const links = Array.from(
          root.querySelectorAll<HTMLElement>(
            '[data-stylex-owner="site-issue-list-state-tab-link"]',
          ),
        );
        const rootBox = root.getBoundingClientRect();
        const boxes = links.map((link) => link.getBoundingClientRect());
        return { boxes: boxes.map((box) => box.toJSON()), root: rootBox.toJSON() };
      });
      expect(geometry.boxes).toHaveLength(2);
      expect(geometry.boxes[0]!.left).toBeGreaterThanOrEqual(geometry.root.left);
      expect(geometry.boxes[1]!.left).toBeGreaterThanOrEqual(geometry.boxes[0]!.right);
      expect(geometry.boxes[1]!.right).toBeLessThanOrEqual(geometry.root.right);
      expect(geometry.boxes[0]!.bottom).toBeLessThanOrEqual(geometry.root.bottom + 1);
      expect(geometry.boxes[0]!.top).toBe(geometry.boxes[1]!.top);

      const fallbackComparison = await tabs.evaluate((root) => {
        const fixture = document.createElement("ul");
        fixture.className = "nav nav-tabs";
        fixture.style.position = "absolute";
        fixture.style.left = "-10000px";
        fixture.innerHTML =
          '<li class="active"><a href="?state=open">Open</a></li><li><a href="?state=closed">Closed</a></li>';
        root.parentElement!.append(fixture);
        const properties = [
          "display",
          "paddingLeft",
          "paddingRight",
          "paddingTop",
          "paddingBottom",
          "marginRight",
          "lineHeight",
          "fontWeight",
          "color",
          "backgroundColor",
          "borderTopColor",
          "borderBottomColor",
          "borderRadius",
          "cursor",
        ] as const;
        const values = (element: Element) => {
          const computed = getComputedStyle(element);
          return properties.map((property) => computed[property]);
        };
        const actualLinks = root.querySelectorAll("a");
        const fallbackLinks = fixture.querySelectorAll("a");
        const result = {
          active: [values(actualLinks[0]!), values(fallbackLinks[0]!)],
          inactive: [values(actualLinks[1]!), values(fallbackLinks[1]!)],
        };
        fixture.remove();
        return result;
      });
      expect(fallbackComparison.active[0]).toEqual(fallbackComparison.active[1]);
      expect(fallbackComparison.inactive[0]).toEqual(fallbackComparison.inactive[1]);
      expect((await tabs.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});
