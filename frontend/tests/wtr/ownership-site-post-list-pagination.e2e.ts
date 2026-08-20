import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/postList.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const owners = {
  icon: '[data-owner="site-post-list-pagination-dynamic-sprite"]',
  input: '[data-owner="site-post-list-pagination-input"]',
  item: '[data-owner="site-post-list-pagination-item"]',
  label: '[data-owner="site-post-list-pagination-label"]',
  list: '[data-owner="site-post-list-pagination-list"]',
  wrapper: '[data-owner="site-post-list-pagination"]',
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
      headers: { "x-csrf-token": "csrf-site-post-list-pagination" },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) => {
    const requested = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
    return route.fulfill({
      contentType: "application/json",
      json: {
        page: requested,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            labels: [],
            notice: false,
            ownerName: "acme",
            postNumber: String(70 + requested),
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            readme: false,
            title: `Release checklist page ${requested}`,
            updatedLabel: "1 day ago",
          },
        ],
        total: 60,
        totalPages: 3,
      },
    });
  });

  await page.goto(`${basePath}/sites/postList?pageNum=${pageNum}`);
  const pagination = page.locator(owners.wrapper);
  await expect(pagination).toBeVisible();
  return pagination;
}

test.describe("Style site post-list pagination", () => {
  test("uses six stable owners and global theme variables", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      Promise.resolve(curatedAppCss()),
    ]);

    for (const owner of Object.values(owners)) {
      expect(route).toContain(owner.slice(1, -1));
    }
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
      "paginationPrevIconDisabled",
      "paginationNextIcon",
      "paginationNextIconDisabled",
    ]) {
    }

    expect(route).toContain('import legacySpriteUrl from "../../assets/legacy/sprite.png"');

    for (const token of [
      "sitePostListPaginationWrapperMargin",
      "sitePostListPaginationListDesktopMarginLeft",
      "sitePostListPaginationListMobileMarginLeft",
      "sitePostListPaginationItemText",
      "sitePostListPaginationInputBorder",
      "sitePostListPaginationInputInteractiveText",
      "sitePostListPaginationInputInteractiveShadow",
      "sitePostListPaginationLabelText",
      "sitePostListPaginationOffLabelText",
      "sitePostListPaginationIconWidth",
      "sitePostListPaginationIconHeight",
    ]) {
      expect(theme).not.toContain(token);
    }
  });

  test("keeps legacy order, copy, first-page state, SPA navigation, and input behavior", async ({
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
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker,
        ),
      )
      .toBe(true);
    await expect(page.locator(owners.input)).toHaveValue("2");

    const input = page.locator(owners.input);
    await input.fill("9");
    await input.press("Enter");
    await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
    await expect(input).toHaveValue("3");
    await expect(page.locator(owners.icon).first()).toHaveCSS(
      "background-position",
      "-136px -139px",
    );
    await expect(page.locator(owners.icon).last()).toHaveCSS("background-position", "-23px -13px");
    await input.fill("1.5");
    await input.press("Enter");
    await expect(input).toHaveValue("3");
  });

  test("removes all migrated pagination selectors", async ({ page }) => {
    const pagination = await openPagination(page);
    const classes = await pagination.evaluate((wrapper) =>
      [wrapper, ...wrapper.querySelectorAll<HTMLElement>("[data-owner]")].map((element) => ({
        classes: Array.from(element.classList),
        owner: element.getAttribute("data-owner"),
      })),
    );

    for (const entry of classes) {
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
    expect(classes.find(({ owner }) => owner?.endsWith("pagination-input"))?.classes).not.toContain(
      "nospinner",
    );
    expect(classes.find(({ owner }) => owner?.endsWith("pagination-input"))?.classes).not.toContain(
      "input-mini",
    );
    for (const icon of await pagination.locator(owners.icon).all()) {
      for (const token of ["ico", "btn-pg-prev", "btn-pg-next", "off"]) {
        await expect(icon).not.toHaveClass(new RegExp(`\\b${token}\\b`, "u"));
      }
    }
    for (const label of await pagination.locator(owners.label).all()) {
      await expect(label).not.toHaveClass(/\boff\b/u);
    }
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} paint, geometry, responsive offset, screenshot, and fallback equivalence`, async ({
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
        await expect(icon).toHaveCSS("background-image", /sprite[^)]*\.png/u);
        await expect(icon).toHaveCSS("background-repeat", "no-repeat");
        await expect(icon).toHaveCSS("width", "6px");
        await expect(icon).toHaveCSS("height", "9px");
        await expect(icon).toHaveCSS("display", "inline-block");
        await expect(icon).toHaveCSS("vertical-align", "middle");
      }
      await expect(icons.first()).toHaveCSS("background-position", "-164px -2px");
      await expect(icons.first()).toHaveCSS("margin-right", "10px");
      await expect(icons.last()).toHaveCSS("background-position", "-146px -139px");
      await expect(icons.last()).toHaveCSS("margin-left", "10px");

      const metrics = await pagination.evaluate((wrapper) => {
        const list = wrapper.querySelector<HTMLElement>(
          '[data-owner="site-post-list-pagination-list"]',
        )!;
        const items = Array.from(
          wrapper.querySelectorAll<HTMLElement>('[data-owner="site-post-list-pagination-item"]'),
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
      expect((await pagination.screenshot()).byteLength).toBeGreaterThan(0);

      const equivalence = await pagination.evaluate((wrapper) => {
        const capture = () => {
          const list = wrapper.querySelector<HTMLElement>(
            '[data-owner="site-post-list-pagination-list"]',
          )!;
          const input = wrapper.querySelector<HTMLElement>(
            '[data-owner="site-post-list-pagination-input"]',
          )!;
          const icons = wrapper.querySelectorAll<HTMLElement>(
            '[data-owner="site-post-list-pagination-dynamic-sprite"]',
          );
          const style = (element: Element) => {
            const value = getComputedStyle(element);
            return {
              backgroundImage: value.backgroundImage,
              backgroundPosition: value.backgroundPosition,
              backgroundRepeat: value.backgroundRepeat,
              color: value.color,
              display: value.display,
              fontSize: value.fontSize,
              height: value.height,
              margin: value.margin,
              marginLeft: value.marginLeft,
              marginRight: value.marginRight,
              padding: value.padding,
              width: value.width,
            };
          };
          return {
            icons: Array.from(icons, style),
            input: style(input),
            list: style(list),
            wrapper: style(wrapper),
          };
        };
        const migrated = capture();
        const classByOwner: Record<string, string[]> = {
          "site-post-list-pagination": ["page-navigation-wrap"],
          "site-post-list-pagination-list": ["page-nums"],
          "site-post-list-pagination-item": ["page-num"],
          "site-post-list-pagination-input": ["input-mini", "nospinner"],
        };
        for (const element of [wrapper, ...wrapper.querySelectorAll<HTMLElement>("[data-owner]")]) {
          for (const token of Array.from(element.classList)) {
            if (token.startsWith("x")) element.classList.remove(token);
          }
          element.classList.add(...(classByOwner[element.dataset.owner ?? ""] ?? []));
          if (element.dataset.paginationVariant === "icon") element.classList.add("ikon");
          if (element.dataset.paginationVariant === "delimiter") element.classList.add("delimiter");
          if (element.dataset.paginationState === "off") element.classList.add("off");
        }
        const icons = wrapper.querySelectorAll<HTMLElement>(
          '[data-owner="site-post-list-pagination-dynamic-sprite"]',
        );
        icons.item(0).classList.add("ico", "btn-pg-prev");
        icons.item(1).classList.add("ico", "btn-pg-next");
        return { fallback: capture(), migrated };
      });
      for (const icon of [...equivalence.fallback.icons, ...equivalence.migrated.icons]) {
        expect(icon.backgroundImage).toMatch(/sprite[^)]*\.png/u);
      }
      const normalizeAssetOwnershipUrl = (icons: typeof equivalence.migrated.icons) =>
        icons.map((icon) => ({ ...icon, backgroundImage: "sprite.png" }));
      expect(normalizeAssetOwnershipUrl(equivalence.fallback.icons)).toEqual(
        normalizeAssetOwnershipUrl(equivalence.migrated.icons),
      );
      expect(equivalence.fallback.input).toEqual(equivalence.migrated.input);
      expect(equivalence.fallback.wrapper).toEqual(equivalence.migrated.wrapper);
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
