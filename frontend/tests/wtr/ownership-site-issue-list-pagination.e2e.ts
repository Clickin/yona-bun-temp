import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const legacyTemplateSource = new URL(
  "../../yona-original/app/views/site/issueList.scala.html",
  import.meta.url,
);
const legacyJsSource = new URL(
  "../../yona-original/public/javascripts/yona-lib.js",
  import.meta.url,
);
const legacyCommonLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const legacyPageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const legacyResponsiveLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const legacySpritesLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_sprites.less",
  import.meta.url,
);
const owners = {
  icon: '[data-owner="site-issue-list-pagination-prev"], [data-owner="site-issue-list-pagination-next"], [data-owner="site-issue-list-pagination-first"], [data-owner="site-issue-list-pagination-last"]',
  input: '[data-owner="site-issue-list-pagination-input"]',
  item: '[data-owner="site-issue-list-pagination-item"]',
  label: '[data-owner="site-issue-list-pagination-label"]',
  list: '[data-owner="site-issue-list-pagination-list"]',
  wrapper: '[data-owner="site-issue-list-pagination"]',
};

async function openPagination(page: Page, pageNum = 1) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-issue-list-pagination" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/issues?*", (route) => {
    const url = new URL(route.request().url());
    const requested = Number(url.searchParams.get("page") ?? "1");
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
            issueNumber: String(40 + requested),
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: `Release blocker page ${requested}`,
          },
        ],
        page: requested,
        pageSize: 20,
        state: url.searchParams.get("state") ?? "open",
        total: 60,
        totalPages: 3,
      },
    });
  });

  await page.goto(
    `${basePath}/sites/issueList?state=open&pageNum=${pageNum}&sort=created&filter=mine`,
  );
  const pagination = page.locator(owners.wrapper);
  await expect(pagination).toBeVisible();
  return pagination;
}

test.describe("Style site issue-list pagination", () => {
  test("pins the frozen pagination source and declares six owners with route theme variables", async () => {
    const [route, theme, template, legacyJs, commonLess, pageLess, responsiveLess, spritesLess] =
      await Promise.all([
        readFile(routeSource, "utf8"),
        Promise.resolve(curatedAppCss()),
        readFile(legacyTemplateSource, "utf8"),
        readFile(legacyJsSource, "utf8"),
        readFile(legacyCommonLessSource, "utf8"),
        readFile(legacyPageLessSource, "utf8"),
        readFile(legacyResponsiveLessSource, "utf8"),
        readFile(legacySpritesLessSource, "utf8"),
      ]);
    expect(template).toContain('<div id="pagination"></div>');
    expect(legacyJs).toContain('c.addClass("page-navigation-wrap")');
    expect(legacyJs).toContain("y.append([d,a,v,b,g])");
    expect(commonLess).toContain(".page-navigation-wrap {");
    expect(commonLess).toContain(".input-mini {");
    expect(commonLess).toContain(".nospinner { -moz-appearance:textfield; }");
    expect(pageLess).toContain("margin-left: -120px !important;");
    expect(responsiveLess).toContain("margin-left: 0;");
    expect(spritesLess).toContain(".ico {");
    expect(spritesLess).toContain(".btn-pg-prev {");
    expect(spritesLess).toContain("background-position: -136px -139px;");
    expect(spritesLess).toContain("background-position: -164px -2px;");
    expect(spritesLess).toContain(".btn-pg-next {");
    expect(spritesLess).toContain("background-position: -146px -139px;");
    expect(spritesLess).toContain("background-position: -23px -13px;");

    for (const ownerName of [
      "site-issue-list-pagination",
      "site-issue-list-pagination-list",
      "site-issue-list-pagination-item",
      "site-issue-list-pagination-input",
      "site-issue-list-pagination-label",
      "site-issue-list-pagination-prev",
      "site-issue-list-pagination-next",
      "site-issue-list-pagination-first",
      "site-issue-list-pagination-last",
    ])
      expect(route).toContain(`data-owner="${ownerName}"`);
    for (const style of [
      "issueListPaginationWrapper",
      "issueListPaginationList",
      "issueListPaginationItem",
      "issueListPaginationIconItem",
      "issueListPaginationDelimiter",
      "issueListPaginationInput",
      "issueListPaginationLabel",
      "issueListPaginationOffLabel",
      "issueListPaginationIcon",
      "issueListPaginationPrevIcon",
      "issueListPaginationPrevDisabledIcon",
      "issueListPaginationNextIcon",
      "issueListPaginationNextDisabledIcon",
    ])
      expect(route).toContain('import legacySpriteUrl from "../../assets/legacy/sprite.png"');
    expect(route).toContain("--site-issue-list-pagination-sprite");
    expect(route).not.toContain("nospinner");
    expect(route).not.toContain("className={`ico btn-pg-prev");
    expect(route).not.toContain("className={`ico btn-pg-next");
    for (const token of [
      "siteIssueListPaginationWrapperMargin",
      "siteIssueListPaginationListDesktopMarginLeft",
      "siteIssueListPaginationListMobileMarginLeft",
      "siteIssueListPaginationItemText",
      "siteIssueListPaginationInputBorder",
      "siteIssueListPaginationInputInteractiveText",
      "siteIssueListPaginationInputInteractiveShadow",
      "siteIssueListPaginationLabelText",
      "siteIssueListPaginationOffLabelText",
      "siteIssueListPaginationIconWidth",
      "siteIssueListPaginationIconHeight",
    ]) {
      expect(theme).not.toContain(token);
    }
  });

  test("keeps five-item order, copy, state, SPA links, query params, and number input behavior", async ({
    page,
  }) => {
    const pagination = await openPagination(page);
    await expect(pagination.locator(owners.item)).toHaveCount(5);
    await expect(pagination.locator(owners.label)).toHaveText(["Previous page", "Next page"]);
    await expect(pagination.locator(owners.input)).toHaveValue("1");
    await expect(pagination.locator(owners.item).nth(2)).toHaveText("/");
    await expect(pagination.locator(owners.item).nth(3)).toHaveText("3");
    await expect(pagination.locator("a", { hasText: "Previous page" })).toHaveCount(0);

    await page.evaluate(() => {
      (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker = true;
    });
    await pagination.locator("a", { hasText: "Next page" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
    expect(new URL(page.url()).searchParams.get("state")).toBe("open");
    expect(new URL(page.url()).searchParams.get("sort")).toBe("created");
    expect(new URL(page.url()).searchParams.get("filter")).toBe("mine");
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker,
        ),
      )
      .toBe(true);
    await expect(page.locator(owners.input)).toHaveValue("2");

    const input = page.locator(owners.input);
    await page.evaluate(() => {
      const original = HTMLInputElement.prototype.select;
      HTMLInputElement.prototype.select = function selectWithMarker() {
        this.dataset.selectCalled = "true";
        original.call(this);
      };
    });
    await input.click();
    await expect(input).toHaveAttribute("data-select-called", "true");
    await input.fill("9");
    await input.press("Enter");
    await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
    await expect(input).toHaveValue("3");
    await input.fill("1.5");
    await input.press("Enter");
    await expect(input).toHaveValue("3");
  });

  test("retires migrated pagination and sprite classes", async ({ page }) => {
    const pagination = await openPagination(page);
    const owned = pagination.locator("[data-owner]");
    for (const element of await owned.all()) {
      const classes = (await element.getAttribute("class"))?.split(/\s+/u) ?? [];

      expect(classes).not.toEqual(
        expect.arrayContaining([
          "page-navigation-wrap",
          "page-nums",
          "page-num",
          "ikon",
          "delimiter",
          "input-mini",
        ]),
      );
    }
    await expect(pagination.locator(owners.input)).not.toHaveClass(/\bnospinner\b/u);
    await expect(pagination.locator(owners.input)).toHaveCSS("appearance", "auto");
    for (const icon of await pagination.locator(owners.icon).all()) {
      await expect(icon).not.toHaveClass(/\b(?:ico|btn-pg-prev|btn-pg-next|off)\b/u);
    }
    await expect(pagination.locator(owners.icon).nth(0)).toHaveAttribute(
      "data-pagination-state",
      "off",
    );
    await expect(pagination.locator(owners.icon).nth(1)).not.toHaveAttribute(
      "data-pagination-state",
    );
    for (const label of await pagination.locator(owners.label).all())
      await expect(label).not.toHaveClass(/\boff\b/u);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} responsive paint, geometry, containment, screenshot, and fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const pagination = await openPagination(page);
      const list = pagination.locator(owners.list);
      const input = pagination.locator(owners.input);
      const labels = pagination.locator(owners.label);
      const icons = pagination.locator(owners.icon);
      await expect(pagination).toHaveCSS("text-align", "center");
      await expect(pagination).toHaveCSS("margin-top", "20px");
      await expect(pagination).toHaveCSS("margin-bottom", "20px");
      await expect(pagination).toHaveCSS("clear", "both");
      await expect(list).toHaveCSS("display", "inline-block");
      await expect(list).toHaveCSS("font-size", "0px");
      await expect(list).toHaveCSS("margin-left", viewport.name === "desktop" ? "-120px" : "0px");
      await expect(input).toHaveCSS("width", "30px");
      await expect(input).toHaveCSS("border-color", "rgb(238, 238, 238)");
      await input.hover();
      await expect(input).toHaveCSS("color", "rgb(243, 108, 34)");
      await expect(input).toHaveCSS("border-color", "rgb(243, 108, 34)");
      await input.focus();
      await expect(input).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset");
      await expect(labels.first()).toHaveCSS("color", "rgb(142, 144, 148)");
      await expect(labels.last()).toHaveCSS("color", "rgb(243, 108, 34)");
      for (const icon of await icons.all()) {
        await expect(icon).toHaveCSS("background-image", /sprite[^)]*\.png/u);
        await expect(icon).toHaveCSS("width", "6px");
        await expect(icon).toHaveCSS("height", "9px");
        await expect(icon).toHaveCSS("display", "inline-block");
        await expect(icon).toHaveCSS("background-repeat", "no-repeat");
        await expect(icon).toHaveCSS("vertical-align", "middle");
      }
      await expect(icons.nth(0)).toHaveCSS("background-position", "-164px -2px");
      await expect(icons.nth(1)).toHaveCSS("background-position", "-146px -139px");

      const metrics = await pagination.evaluate((wrapper) => {
        const list = wrapper.querySelector<HTMLElement>(
          '[data-owner="site-issue-list-pagination-list"]',
        )!;
        const items = Array.from(
          wrapper.querySelectorAll<HTMLElement>('[data-owner="site-issue-list-pagination-item"]'),
        );
        const w = wrapper.getBoundingClientRect();
        const l = list.getBoundingClientRect();
        return {
          items: items.map((item) => {
            const b = item.getBoundingClientRect();
            return { bottom: b.bottom, left: b.left, right: b.right, top: b.top };
          }),
          list: { bottom: l.bottom, left: l.left, right: l.right, top: l.top },
          wrapper: { bottom: w.bottom, left: w.left, right: w.right, top: w.top },
        };
      });
      for (const item of metrics.items) {
        expect(item.left).toBeGreaterThanOrEqual(metrics.list.left - 1);
        expect(item.right).toBeLessThanOrEqual(metrics.list.right + 1);
        expect(item.top).toBeGreaterThanOrEqual(metrics.list.top - 1);
        expect(item.bottom).toBeLessThanOrEqual(metrics.list.bottom + 1);
      }
      expect(metrics.list.left).toBeGreaterThanOrEqual(metrics.wrapper.left - 121);
      expect(metrics.list.right).toBeLessThanOrEqual(metrics.wrapper.right + 1);
      expect((await pagination.screenshot()).byteLength).toBeGreaterThan(0);

      const equivalence = await pagination.evaluate((wrapper) => {
        const capture = () => {
          const list = wrapper.querySelector<HTMLElement>(
            '[data-owner="site-issue-list-pagination-list"]',
          )!;
          const input = wrapper.querySelector<HTMLElement>(
            '[data-owner="site-issue-list-pagination-input"]',
          )!;
          const style = (element: Element) => {
            const value = getComputedStyle(element);
            return {
              color: value.color,
              display: value.display,
              fontSize: value.fontSize,
              margin: value.margin,
              marginLeft: value.marginLeft,
              padding: value.padding,
              width: value.width,
            };
          };
          const icons = Array.from(
            wrapper.querySelectorAll<HTMLElement>('[data-owner="site-issue-list-pagination-icon"]'),
          );
          return {
            icons: icons.map((icon) => {
              const value = getComputedStyle(icon);
              return {
                backgroundPosition: value.backgroundPosition,
                backgroundRepeat: value.backgroundRepeat,
                display: value.display,
                height: value.height,
                marginLeft: value.marginLeft,
                marginRight: value.marginRight,
                verticalAlign: value.verticalAlign,
                width: value.width,
              };
            }),
            input: style(input),
            list: style(list),
            wrapper: style(wrapper),
          };
        };
        const migrated = capture();
        const classes: Record<string, string[]> = {
          "site-issue-list-pagination": ["page-navigation-wrap"],
          "site-issue-list-pagination-list": ["page-nums"],
          "site-issue-list-pagination-item": ["page-num"],
          "site-issue-list-pagination-input": ["input-mini", "nospinner"],
        };
        for (const element of [wrapper, ...wrapper.querySelectorAll<HTMLElement>("[data-owner]")]) {
          for (const token of Array.from(element.classList))
            if (token.startsWith("x")) element.classList.remove(token);
          element.classList.add(...(classes[element.dataset.owner ?? ""] ?? []));
          if (element.dataset.paginationVariant === "icon") element.classList.add("ikon");
          if (element.dataset.paginationVariant === "delimiter") element.classList.add("delimiter");
          if (element.dataset.paginationState === "off") element.classList.add("off");
        }
        const icons = wrapper.querySelectorAll<HTMLElement>(
          '[data-owner="site-issue-list-pagination-icon"]',
        );
        icons[0]?.classList.add("ico", "btn-pg-prev");
        icons[1]?.classList.add("ico", "btn-pg-next");
        return { fallback: capture(), migrated };
      });
      expect(equivalence.fallback.icons).toEqual(equivalence.migrated.icons);
      expect(equivalence.fallback.input).toEqual(equivalence.migrated.input);
      expect(equivalence.fallback.wrapper).toEqual(equivalence.migrated.wrapper);
      if (viewport.name === "desktop")
        expect(equivalence.fallback.list).toEqual(equivalence.migrated.list);
      else {
        expect(equivalence.fallback.list.marginLeft).toBe("-120px");
        expect(equivalence.migrated.list.marginLeft).toBe("0px");
      }
    });
  }
});
