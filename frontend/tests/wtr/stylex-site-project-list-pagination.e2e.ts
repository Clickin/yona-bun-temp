import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/projectList.tsx", import.meta.url);
const owners = {
  // Icons lost data-stylex-owner in the sprite migration (6d48c8b80); they are
  // the <i> children of the [data-pagination-variant="icon"] list items.
  icon: '[data-pagination-variant="icon"] i',
  input: '[data-stylex-owner="site-project-list-pagination-input"]',
  item: '[data-stylex-owner="site-project-list-pagination-item"]',
  label: '[data-stylex-owner="site-project-list-pagination-label"]',
  list: '[data-stylex-owner="site-project-list-pagination-list"]',
  wrapper: '[data-stylex-owner="site-project-list-pagination"]',
};

async function openPagination(page: Page, pageNum = 1) {
  const session = {
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "siteboss",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-project-list-pagination" },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) => {
    const requested = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
    return route.fulfill({
      contentType: "application/json",
      json: {
        filter: "road",
        page: requested,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 70 + requested,
            ownerName: "acme",
            overview: `Release planning page ${requested}`,
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: `roadmap-${requested}`,
          },
        ],
        total: 60,
        totalPages: 3,
      },
    });
  });

  await page.goto(`${basePath}/sites/projectList?filter=road&pageNum=${pageNum}`);
  const pagination = page.locator(owners.wrapper);
  await expect(pagination).toBeVisible();
  return pagination;
}

test.describe("StyleX site project-list pagination", () => {
  test("uses six stable owners with inline geometry and a route paint theme", async () => {
    const route = await readFile(routeSource, "utf8");

    for (const owner of Object.values(owners)) {
      if (owner.includes("data-pagination-variant")) continue; // icon owner retired (6d48c8b80)
      expect(route).toContain(owner.slice(1, -1));
    }
    expect(route).toContain('data-pagination-variant="icon"');
    expect(route).toContain('data-disabled="true"');
    expect(route).toContain('data-disabled="false"');
    for (const style of [
      "paginationWrapper",
      "paginationList",
      "paginationItem",
      "paginationIconItem",
      "paginationDelimiter",
      "paginationInput",
      "paginationLabel",
      "paginationOffLabel",
      "paginationIcon",
      "paginationPrevIcon",
      "paginationPrevDisabledIcon",
      "paginationNextIcon",
      "paginationNextDisabledIcon",
    ]) {
      expect(route).toContain(`styles.${style}`);
    }
    expect(route).toContain("globalBreakpoints.mobile");
    expect(route).toContain('margin: "20px 0px"');
    expect(route).toContain('default: "-120px"');
    expect(route).toContain("color: siteProjectListTheme.paginationText");
    expect(route).toContain("default: siteProjectListTheme.paginationInputBorder");
    expect(route).toContain("siteProjectListTheme.paginationInputInteractiveShadow");
    expect(route).toContain('width: "6px"');
    expect(route).toContain('MozAppearance: "textfield"');
    expect(route).toContain('import legacySpriteUrl from "../../assets/legacy/sprite.png"');
    expect(route).toContain("--site-project-list-pagination-sprite");
    expect(route).not.toContain("className={`nospinner");
    expect(route).not.toContain("className={`ico btn-pg-prev");
    expect(route).not.toContain("className={`ico btn-pg-next");
    expect(route).not.toContain("globalColors.");
  });

  test("keeps legacy order, copy, query-preserving SPA navigation, and input behavior", async ({
    page,
  }) => {
    const pagination = await openPagination(page);
    await expect(pagination.locator(`${owners.item}`)).toHaveCount(5);
    await expect(pagination.locator(owners.label)).toHaveText(["Previous page", "Next page"]);
    await expect(pagination.locator(owners.input)).toHaveValue("1");
    await expect(pagination.locator(owners.item).nth(2)).toHaveText("/");
    await expect(pagination.locator(owners.item).nth(3)).toHaveText("3");

    await page.evaluate(() => {
      (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker = true;
    });
    await pagination.locator("a", { hasText: "Next page" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
    await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBe("road");
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker,
        ),
      )
      .toBe(true);
    await expect(page.locator(owners.input)).toHaveValue("2");
    await expect(page.locator(owners.icon).nth(0)).toHaveCSS(
      "background-position",
      "-136px -139px",
    );
    await expect(page.locator(owners.icon).nth(1)).toHaveCSS(
      "background-position",
      "-146px -139px",
    );

    const input = page.locator(owners.input);
    await input.fill("9");
    await input.press("Enter");
    await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
    await expect(input).toHaveValue("3");
    await expect(page.locator(owners.icon).nth(1)).toHaveCSS("background-position", "-23px -13px");
    await input.fill("1.5");
    await input.press("Enter");
    await expect(input).toHaveValue("3");
  });

  test("directly owns sprite and Firefox input residuals without legacy classes", async ({
    page,
  }) => {
    const pagination = await openPagination(page);
    const classes = await pagination.evaluate((wrapper) =>
      [wrapper, ...wrapper.querySelectorAll<HTMLElement>("[data-stylex-owner]")].map((element) => ({
        classes: Array.from(element.classList),
        owner: element.getAttribute("data-stylex-owner"),
      })),
    );

    for (const entry of classes) {
      expect(entry.classes.some((token) => token.startsWith("x"))).toBe(true);
      expect(entry.classes).not.toEqual(
        expect.arrayContaining([
          "page-navigation-wrap",
          "page-nums",
          "page-num",
          "ikon",
          "delimiter",
        ]),
      );
    }
    const inputClasses = classes.find(({ owner }) => owner?.endsWith("pagination-input"))?.classes;
    expect(inputClasses).not.toContain("input-mini");
    expect(inputClasses).not.toContain("nospinner");
    for (const icon of await pagination.locator(owners.icon).all()) {
      await expect(icon).not.toHaveClass(/\b(?:ico|btn-pg-prev|btn-pg-next|off)\b/u);
    }
    await expect(pagination.locator(owners.icon).nth(0)).toHaveAttribute("data-disabled", "true");
    await expect(pagination.locator(owners.icon).nth(1)).toHaveAttribute("data-disabled", "false");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} pagination paint, geometry, responsive offset, and fallback equivalence`, async ({
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
      await expect(list).toHaveCSS("list-style-type", "none");
      await expect(list).toHaveCSS("margin-left", viewport.name === "desktop" ? "-120px" : "0px");
      await expect(input).toHaveCSS("width", "30px");
      await expect(input).toHaveCSS("appearance", "auto");
      await expect(input).toHaveCSS("font-size", viewport.name === "desktop" ? "12px" : "16px");
      await expect(input).toHaveCSS("font-weight", "700");
      await expect(input).toHaveCSS("border-color", "rgb(238, 238, 238)");
      await input.hover();
      await expect(input).toHaveCSS("color", "rgb(243, 108, 34)");
      await expect(input).toHaveCSS("border-color", "rgb(243, 108, 34)");
      await input.focus();
      await expect(input).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset");
      await expect(labels.first()).toHaveCSS("font-size", "11px");
      await expect(labels.first()).toHaveCSS("color", "rgb(142, 144, 148)");
      await expect(labels.last()).toHaveCSS("color", "rgb(243, 108, 34)");
      for (const icon of await icons.all()) {
        await expect(icon).toHaveCSS("width", "6px");
        await expect(icon).toHaveCSS("height", "9px");
        await expect(icon).toHaveCSS("display", "inline-block");
        await expect(icon).toHaveCSS("vertical-align", "middle");
        await expect(icon).toHaveCSS("background-repeat", "no-repeat");
      }
      await expect(icons.nth(0)).toHaveCSS("background-position", "-164px -2px");
      await expect(icons.nth(0)).toHaveCSS("margin-right", "10px");
      await expect(icons.nth(1)).toHaveCSS("background-position", "-146px -139px");
      await expect(icons.nth(1)).toHaveCSS("margin-left", "10px");
      await expect(input).toHaveJSProperty("offsetWidth", 44);
      await expect(input).toHaveJSProperty("offsetHeight", 30);

      const metrics = await pagination.evaluate((wrapper) => {
        const list = wrapper.querySelector<HTMLElement>(
          '[data-stylex-owner="site-project-list-pagination-list"]',
        )!;
        const items = Array.from(
          wrapper.querySelectorAll<HTMLElement>(
            '[data-stylex-owner="site-project-list-pagination-item"]',
          ),
        );
        const wrapBox = wrapper.getBoundingClientRect();
        const listBox = list.getBoundingClientRect();
        return {
          itemBoxes: items.map((item) => {
            const box = item.getBoundingClientRect();
            return { bottom: box.bottom, left: box.left, right: box.right, top: box.top };
          }),
          list: {
            bottom: listBox.bottom,
            left: listBox.left,
            right: listBox.right,
            top: listBox.top,
          },
          wrapper: {
            bottom: wrapBox.bottom,
            left: wrapBox.left,
            right: wrapBox.right,
            top: wrapBox.top,
          },
        };
      });
      for (const item of metrics.itemBoxes) {
        expect(item.left).toBeGreaterThanOrEqual(metrics.list.left - 1);
        expect(item.right).toBeLessThanOrEqual(metrics.list.right + 1);
        expect(item.top).toBeGreaterThanOrEqual(metrics.list.top - 1);
        expect(item.bottom).toBeLessThanOrEqual(metrics.list.bottom + 1);
      }
      expect(metrics.list.left).toBeGreaterThanOrEqual(metrics.wrapper.left - 121);
      expect(metrics.list.right).toBeLessThanOrEqual(metrics.wrapper.right + 1);
      expect(metrics.wrapper.right - metrics.wrapper.left).toBeGreaterThan(0);
      mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
      const screenshot = await pagination.screenshot({
        path: resolve(
          "..",
          "output",
          "playwright",
          "visual-sweep",
          `stylex-site-project-list-pagination-${viewport.name}.png`,
        ),
      });
      expect(screenshot.byteLength).toBeGreaterThan(0);

      const equivalence = await pagination.evaluate((wrapper) => {
        const capture = () => {
          const list = wrapper.querySelector<HTMLElement>(
            '[data-stylex-owner="site-project-list-pagination-list"]',
          )!;
          const input = wrapper.querySelector<HTMLElement>(
            '[data-stylex-owner="site-project-list-pagination-input"]',
          )!;
          const style = (element: Element) => {
            const value = getComputedStyle(element);
            return {
              appearance: value.appearance,
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
            wrapper.querySelectorAll<HTMLElement>('[data-pagination-variant="icon"] i'),
          ).map((icon) => {
            const value = getComputedStyle(icon);
            const box = icon.getBoundingClientRect();
            return {
              backgroundImage: value.backgroundImage,
              backgroundPosition: value.backgroundPosition,
              backgroundRepeat: value.backgroundRepeat,
              display: value.display,
              height: box.height,
              marginLeft: value.marginLeft,
              marginRight: value.marginRight,
              verticalAlign: value.verticalAlign,
              width: box.width,
            };
          });
          return { icons, input: style(input), list: style(list), wrapper: style(wrapper) };
        };
        const migrated = capture();
        const classByOwner: Record<string, string[]> = {
          "site-project-list-pagination": ["page-navigation-wrap"],
          "site-project-list-pagination-list": ["page-nums"],
          "site-project-list-pagination-item": ["page-num"],
          "site-project-list-pagination-input": ["input-mini", "nospinner"],
        };
        for (const element of [
          wrapper,
          ...wrapper.querySelectorAll<HTMLElement>("[data-stylex-owner]"),
        ]) {
          for (const token of Array.from(element.classList)) {
            if (token.startsWith("x")) element.classList.remove(token);
          }
          element.classList.add(...(classByOwner[element.dataset.stylexOwner ?? ""] ?? []));
          if (element.dataset.paginationVariant === "icon") element.classList.add("ikon");
          if (element.dataset.paginationVariant === "delimiter") element.classList.add("delimiter");
          if (element.dataset.paginationState === "off") element.classList.add("off");
        }
        const icons = wrapper.querySelectorAll<HTMLElement>('[data-pagination-variant="icon"] i');
        icons[0]?.classList.add("ico", "btn-pg-prev");
        icons[1]?.classList.add("ico", "btn-pg-next");
        return { fallback: capture(), migrated };
      });
      expect(equivalence.fallback.input).toEqual(equivalence.migrated.input);
      expect(equivalence.fallback.wrapper).toEqual(equivalence.migrated.wrapper);
      const omitSpriteUrl = ({
        backgroundImage: _backgroundImage,
        ...icon
      }: (typeof equivalence.migrated.icons)[number]) => icon;
      expect(equivalence.fallback.icons.map(omitSpriteUrl)).toEqual(
        equivalence.migrated.icons.map(omitSpriteUrl),
      );
      for (const icon of [...equivalence.fallback.icons, ...equivalence.migrated.icons])
        expect(icon.backgroundImage).toMatch(/sprite(?:-[^)]+)?\.png/u);
      if (viewport.name === "desktop") {
        expect(equivalence.fallback.list).toEqual(equivalence.migrated.list);
      } else {
        const {
          margin: fallbackMargin,
          marginLeft: fallbackMarginLeft,
          ...fallbackList
        } = equivalence.fallback.list;
        const {
          margin: migratedMargin,
          marginLeft: migratedMarginLeft,
          ...migratedList
        } = equivalence.migrated.list;
        expect(fallbackList).toEqual(migratedList);
        expect(fallbackMargin).toBe("0px 0px 0px -120px");
        expect(fallbackMarginLeft).toBe("-120px");
        expect(migratedMargin).toBe("0px");
        expect(migratedMarginLeft).toBe("0px");
      }
    });
  }
});
