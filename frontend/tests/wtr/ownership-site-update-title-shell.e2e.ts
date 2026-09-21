import { readFile } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/update.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const templateSource = new URL(
  "../../yona-original/app/views/site/update.scala.html",
  import.meta.url,
);
const layoutSource = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
  import.meta.url,
);
const messagesSource = new URL("../../yona-original/conf/messages", import.meta.url);
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
  heading: "site-update-title-heading",
  title: "site-update-title-strip",
} as const;

const owner = (root: Page | Locator, name: string) => root.locator(`[data-owner="${name}"]`);

async function openUpdate(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-update-title-shell" },
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
    route.fulfill({
      contentType: "application/json",
      json: {
        currentVersion: "1.0.0",
        error: null,
        message: "site.update.isNotNecessary",
        releaseUrl: null,
        versionToUpdate: null,
      },
    }),
  );
  await page.goto(`${basePath}/sites/update`);
  const title = owner(page, owners.title);
  await expect(title).toBeVisible();
  return title;
}

test.describe("Style site update no-update title shell", () => {
  test("pins the Scala shell, full cascade, and exactly two title boundaries", async () => {
    const [route, _theme, template, layout, messages, yobi, pageLess, override, bootstrap] =
      await Promise.all([
        readFile(routeSource, "utf8"),
        readFile(themeSource, "utf8"),
        readFile(templateSource, "utf8"),
        readFile(layoutSource, "utf8"),
        readFile(messagesSource, "utf8"),
        readFile(yobiSource, "utf8"),
        readFile(pageLessSource, "utf8"),
        readFile(overrideLessSource, "utf8"),
        readFile(bootstrapSource, "utf8"),
      ]);

    expect(template).toContain('<div class="title_area">');
    expect(template).toContain('<h2 class="pull-left">');
    expect(template).toContain('Messages("site.update.currentVersion", currentVersion)');
    expect(template).toContain('Messages("site.update.isNotNecessary", currentVersion)');
    expect(layout).toContain('<div class="span10">');
    expect(messages).toContain("site.sidebar.update = Software Update");
    expect(messages).toContain("site.update.currentVersion");
    expect(messages).toContain("site.update.isNotNecessary");
    expect(yobi).toContain('@import "less/_page.less";');
    expect(yobi).toContain('@import "less/_responsive.less";');
    expect(yobi).toContain('@import "less/_yobiUI.less";');
    expect(yobi).toContain('@import "less/_override.less";');
    expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
    expect(yobi.indexOf("_responsive.less")).toBeLessThan(yobi.indexOf("_yobiUI.less"));
    expect(yobi.indexOf("_yobiUI.less")).toBeLessThan(yobi.indexOf("_override.less"));
    expect(pageLess).toContain(".title_area {\n      overflow:hidden;");
    expect(bootstrap).toContain(".pull-left {\n  float: left;");
    expect(override).toContain(".title_area {\n    .nav {");
    expect(override).toContain("ul {\n        li {");

    for (const explicitOwner of Object.values(owners))
      expect(route).toContain(`data-owner="${explicitOwner}"`);
  });

  test("keeps exact DIV > H2 then current-version and no-update paragraphs", async ({ page }) => {
    const title = await openUpdate(page);
    const messages = await readFile(messagesSource, "utf8");
    await expect(owner(title, owners.heading)).toHaveText("Software Update");
    expect(
      await title.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["H2"]);
    const contentChildren = page.locator(".site-setting-wrap > .row-fluid > .span10 > *");
    expect(
      await contentChildren.evaluateAll((nodes) => nodes.slice(0, 3).map((node) => node.tagName)),
    ).toEqual(["DIV", "P", "P"]);
    await expect(contentChildren.nth(1)).toHaveText("Current version is Yoram 1.0.0");
    await expect(contentChildren.nth(2)).toHaveText(
      legacyMessage(messages, "site.update.isNotNecessary").replace("{0}", "1.0.0"),
    );
  });

  test("keeps title_area/pull-left and isolates generated title owners", async ({ page }) => {
    const title = await openUpdate(page);
    const heading = owner(title, owners.heading);
    await expect(title).toHaveClass(/\btitle_area\b/u);
    await expect(heading).toHaveClass(/\bpull-left\b/u);
    expect(
      await title.evaluate((root) =>
        [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]
          .filter((element) => Array.from(element.classList).some((name) => name.startsWith("x")))
          .map(
            (element) =>
              element.closest<HTMLElement>("[data-owner]")?.dataset.owner ?? "missing-owner",
          ),
      ),
    ).toEqual([]);
    await expect(title.locator("p, pre, a, button, form, input")).toHaveCount(0);
    await expect(page.locator(".site-setting-wrap > .row-fluid > .span10")).toHaveCount(1);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} paint, float, geometry, screenshot, and frozen equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const title = await openUpdate(page);
      const heading = owner(title, owners.heading);
      await expect(title).toHaveCSS("overflow", "hidden");
      await expect(title).toHaveCSS("margin-bottom", "29px");
      await expect(title).toHaveCSS("padding-bottom", "8px");
      await expect(title).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("float", "left");
      await expect(heading).toHaveCSS("margin", "0px");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");

      const geometry = await page.evaluate((ownerNames) => {
        const get = (name: string) =>
          document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!.getBoundingClientRect();
        const title = get(ownerNames.title);
        const heading = get(ownerNames.heading);
        const paragraph = document
          .querySelector<HTMLElement>(".site-setting-wrap > .row-fluid > .span10 > p")!
          .getBoundingClientRect();
        return { heading: heading.toJSON(), paragraph: paragraph.toJSON(), title: title.toJSON() };
      }, owners);
      expect(geometry.title.height).toBe(39);
      expect(geometry.heading.height).toBe(30);
      expect(geometry.heading.left).toBeGreaterThanOrEqual(geometry.title.left);
      expect(geometry.heading.bottom).toBeLessThanOrEqual(geometry.title.bottom);
      expect(geometry.paragraph.top).toBeGreaterThanOrEqual(geometry.title.bottom + 28);
      expect(geometry.paragraph.left).toBeGreaterThanOrEqual(geometry.title.left);

      const fallback = await title.evaluate((actualTitle, ownerNames) => {
        const fixture = document.createElement("div");
        fixture.style.position = "absolute";
        fixture.style.left = "-10000px";
        fixture.style.width = `${actualTitle.getBoundingClientRect().width}px`;
        // The dist build drops the legacy .title_area/.pull-left CSS rules (the style
        // migration owns those declarations now), so the fixture carries the frozen
        // legacy values inline to stay equivalent with the styled actual element.
        fixture.innerHTML =
          '<div class="title_area" style="overflow:hidden;margin-bottom:29px;padding-bottom:8px;border-bottom:1px solid #ddd"><h2 class="pull-left" style="float:left;margin:0;font-size:19.5px;line-height:30px;color:#4c4c4c">Software Update</h2></div>';
        actualTitle.parentElement!.append(fixture);
        const actualHeading = actualTitle.querySelector<HTMLElement>(
          `[data-owner="${ownerNames.heading}"]`,
        )!;
        const fallbackTitle = fixture.querySelector<HTMLElement>(".title_area")!;
        const fallbackHeading = fixture.querySelector<HTMLElement>(".pull-left")!;
        const values = (element: HTMLElement, properties: string[]) => {
          const computed = getComputedStyle(element);
          return properties.map((property) => computed.getPropertyValue(property));
        };
        const result = {
          heading: [
            values(actualHeading, ["float", "margin", "font-size", "line-height", "color"]),
            values(fallbackHeading, ["float", "margin", "font-size", "line-height", "color"]),
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
            values(fallbackTitle, [
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
      expect((await title.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});

function legacyMessage(source: string, key: string) {
  const escapedKey = key.replaceAll(".", "\\.");
  const value = source.match(new RegExp(`^${escapedKey}\\s*=\\s*(.*)$`, "mu"))?.[1];
  if (!value) throw new Error(`Missing legacy message ${key}`);
  return value.replaceAll("''", "'");
}
