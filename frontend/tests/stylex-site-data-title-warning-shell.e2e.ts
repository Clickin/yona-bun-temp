import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/data.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-data.stylex.ts", import.meta.url);
const templateSource = new URL(
  "../../yona-original/app/views/site/data.scala.html",
  import.meta.url,
);
const layoutSource = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
  import.meta.url,
);
const yobiSource = new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url);
const pageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const overrideLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_override.less",
  import.meta.url,
);
const bootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);

const owners = {
  heading: "site-data-title-heading",
  item: "site-data-warning-item",
  surface: "site-data-warning-surface",
  title: "site-data-title-strip",
} as const;

const warnings = [
  "Before importing or exporting data, you should block other user's access and only allow the site admin.",
  "After clicking the export button please wait until the file download finishes.",
  "Please backup database before import data, in some cases you can lose existing data.",
];

const owner = (root: Page | Locator, name: string) => root.locator(`[data-stylex-owner="${name}"]`);

async function openData(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-data-title-warning-shell" },
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
  await page.goto(`${basePath}/sites/data`);
  const title = owner(page, owners.title);
  await expect(title).toBeVisible();
  return title;
}

test.describe("StyleX site data title/warning shell", () => {
  test("pins the Scala shell, active cascade, and four owner/theme boundaries", async () => {
    const [route, theme, template, layout, yobi, pageLess, override, bootstrap] = await Promise.all(
      [
        readFile(routeSource, "utf8"),
        readFile(themeSource, "utf8"),
        readFile(templateSource, "utf8"),
        readFile(layoutSource, "utf8"),
        readFile(yobiSource, "utf8"),
        readFile(pageLessSource, "utf8"),
        readFile(overrideLessSource, "utf8"),
        readFile(bootstrapSource, "utf8"),
      ],
    );

    expect(template).toContain('<div class="title_area">');
    expect(template).toContain('<h2 class="pull-left">');
    expect(template).toContain('<div class="cu-desc">');
    expect(template.match(/<li class="notice">/gu)).toHaveLength(3);
    expect(layout).toContain('<div class="span10">');
    expect(yobi).toContain('@import "less/_page.less";');
    expect(yobi).toContain('@import "less/_responsive.less";');
    expect(yobi).toContain('@import "less/_yobiUI.less";');
    expect(yobi).toContain('@import "less/_override.less";');
    expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
    expect(yobi.indexOf("_responsive.less")).toBeLessThan(yobi.indexOf("_yobiUI.less"));
    expect(yobi.indexOf("_yobiUI.less")).toBeLessThan(yobi.indexOf("_override.less"));
    expect(pageLess).toContain(".title_area {\n      overflow:hidden;");
    expect(pageLess).toContain(".cu-desc {");
    expect(pageLess).toContain(".notice {");
    expect(bootstrap).toContain(".pull-left {\n  float: left;");
    expect(override).toContain(".title_area {\n    .nav {");
    expect(override).toContain("ul {\n        li {");

    for (const explicitOwner of Object.values(owners))
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
    expect(route.match(/data-stylex-owner="site-data-warning-item"/gu)).toHaveLength(3);
    for (const token of ["titleBorder", "titleText", "warningText"]) {
      expect(route).toContain(`siteDataColors.${token}`);
      expect(theme).toContain(token);
    }
    expect(route).toContain('overflow: "hidden"');
    expect(route).toContain('marginBottom: "29px"');
    expect(route).toContain('float: "left"');
    expect(route).not.toContain("globalColors.");
  });

  test("keeps exact DIV > H2 and warning UL > three LI order/copy", async ({ page }) => {
    const title = await openData(page);
    await expect(owner(title, owners.heading)).toHaveText("Data");
    expect(
      await title.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["H2"]);
    const surface = owner(page, owners.surface);
    await expect(surface.locator(":scope > ul")).toHaveCount(1);
    const items = owner(surface, owners.item);
    await expect(items).toHaveCount(3);
    await expect(items).toHaveText(warnings);
    expect(
      await surface
        .locator(":scope > ul > *")
        .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["LI", "LI", "LI"]);
    expect(
      await page
        .locator(".site-setting-wrap > .row-fluid > .span10 > *")
        .evaluateAll((nodes) => nodes.slice(0, 3).map((node) => node.tagName)),
    ).toEqual(["DIV", "DIV", "H3"]);
  });

  test("retires only four target classes and isolates generated owners", async ({ page }) => {
    const title = await openData(page);
    const heading = owner(title, owners.heading);
    const surface = owner(page, owners.surface);
    const items = owner(surface, owners.item);
    await expect(title).not.toHaveClass(/\btitle_area\b/u);
    await expect(heading).not.toHaveClass(/\bpull-left\b/u);
    await expect(surface).not.toHaveClass(/\bcu-desc\b/u);
    for (const item of await items.all()) await expect(item).not.toHaveClass(/\bnotice\b/u);
    expect(
      await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-stylex-owner="site-data-title-strip"], [data-stylex-owner="site-data-title-strip"] *, [data-stylex-owner="site-data-warning-surface"], [data-stylex-owner="site-data-warning-surface"] *',
          ),
        )
          .filter((element) => Array.from(element.classList).some((name) => name.startsWith("x")))
          .map(
            (element) =>
              element.closest<HTMLElement>("[data-stylex-owner]")?.dataset.stylexOwner ??
              "missing-owner",
          ),
      ),
    ).toEqual([
      owners.title,
      owners.heading,
      owners.surface,
      owners.item,
      owners.item,
      owners.item,
    ]);
    await expect(title.locator("a, form, input, button")).toHaveCount(0);
    await expect(surface.locator("a, form, input, button")).toHaveCount(0);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} paint, geometry, screenshot, and frozen equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const title = await openData(page);
      const heading = owner(title, owners.heading);
      const surface = owner(page, owners.surface);
      const items = owner(surface, owners.item);
      await expect(title).toHaveCSS("overflow", "hidden");
      await expect(title).toHaveCSS("margin-bottom", "29px");
      await expect(title).toHaveCSS("padding-bottom", "8px");
      await expect(title).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("float", "left");
      await expect(heading).toHaveCSS("margin", "0px");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(surface).toHaveCSS("display", "inline-block");
      for (const item of await items.all())
        await expect(item).toHaveCSS("color", "rgb(219, 58, 103)");

      const geometry = await page.evaluate((ownerNames) => {
        const get = (name: string) =>
          document
            .querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!
            .getBoundingClientRect();
        const itemBoxes = Array.from(
          document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${ownerNames.item}"]`),
        ).map((item) => item.getBoundingClientRect().toJSON());
        return {
          heading: get(ownerNames.heading).toJSON(),
          items: itemBoxes,
          surface: get(ownerNames.surface).toJSON(),
          title: get(ownerNames.title).toJSON(),
        };
      }, owners);
      expect(geometry.heading.height).toBe(30);
      expect(geometry.heading.left).toBeGreaterThanOrEqual(geometry.title.left);
      expect(geometry.heading.bottom).toBeLessThanOrEqual(geometry.title.bottom);
      expect(geometry.surface.top).toBeGreaterThanOrEqual(geometry.title.bottom + 28);
      for (const item of geometry.items) {
        expect(item.left).toBeGreaterThanOrEqual(geometry.surface.left);
        expect(item.right).toBeLessThanOrEqual(geometry.surface.right + 1);
        expect(item.top).toBeGreaterThanOrEqual(geometry.surface.top);
        expect(item.bottom).toBeLessThanOrEqual(geometry.surface.bottom + 1);
      }
      for (let index = 1; index < geometry.items.length; index += 1)
        expect(geometry.items[index]!.top).toBeGreaterThanOrEqual(
          geometry.items[index - 1]!.bottom,
        );

      const fallback = await title.evaluate((actualTitle, ownerNames) => {
        const fixture = document.createElement("div");
        fixture.style.position = "absolute";
        fixture.style.left = "-10000px";
        fixture.style.width = `${actualTitle.getBoundingClientRect().width}px`;
        fixture.innerHTML =
          '<div class="title_area"><h2 class="pull-left">Data</h2></div><div class="cu-desc"><ul><li class="notice">Warning</li></ul></div>';
        actualTitle.parentElement!.append(fixture);
        const actual = (name: string) =>
          document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
        const values = (element: HTMLElement, properties: string[]) => {
          const computed = getComputedStyle(element);
          return properties.map((property) => computed.getPropertyValue(property));
        };
        const result = {
          heading: [
            values(actual(ownerNames.heading), [
              "float",
              "margin",
              "font-size",
              "line-height",
              "color",
            ]),
            values(fixture.querySelector<HTMLElement>(".pull-left")!, [
              "float",
              "margin",
              "font-size",
              "line-height",
              "color",
            ]),
          ],
          item: [
            values(actual(ownerNames.item), ["color"]),
            values(fixture.querySelector<HTMLElement>(".notice")!, ["color"]),
          ],
          surface: [
            values(actual(ownerNames.surface), ["display"]),
            values(fixture.querySelector<HTMLElement>(".cu-desc")!, ["display"]),
          ],
          title: [
            values(actualTitle, [
              "overflow",
              "margin-bottom",
              "padding-bottom",
              "border-bottom-width",
              "border-bottom-style",
              "border-bottom-color",
            ]),
            values(fixture.querySelector<HTMLElement>(".title_area")!, [
              "overflow",
              "margin-bottom",
              "padding-bottom",
              "border-bottom-width",
              "border-bottom-style",
              "border-bottom-color",
            ]),
          ],
        };
        fixture.remove();
        return result;
      }, owners);
      expect(fallback.title[0]).toEqual(fallback.title[1]);
      expect(fallback.heading[0]).toEqual(fallback.heading[1]);
      expect(fallback.surface[0]).toEqual(fallback.surface[1]);
      expect(fallback.item[0]).toEqual(fallback.item[1]);
      expect((await title.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await surface.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});
