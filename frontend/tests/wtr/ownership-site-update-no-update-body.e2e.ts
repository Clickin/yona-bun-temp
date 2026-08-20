import { readFile, curatedAppCss } from "../wtr-compat.ts";
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
const commonLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const bootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);

const owners = {
  current: "site-update-current-version",
  latest: "site-update-latest-version",
} as const;

const owner = (root: Page | Locator, name: string) => root.locator(`[data-owner="${name}"]`);

async function openNoUpdate(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-update-no-update-body" },
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
  const current = owner(page, owners.current);
  await expect(current).toBeVisible();
  return current;
}

test.describe("Style site update no-update body", () => {
  test("pins the Scala body, final frozen paragraph reset, and two theme owners", async () => {
    const [route, theme, template, layout, messages, yobi, commonLess, bootstrap] =
      await Promise.all([
        readFile(routeSource, "utf8"),
        Promise.resolve(curatedAppCss()),
        readFile(templateSource, "utf8"),
        readFile(layoutSource, "utf8"),
        readFile(messagesSource, "utf8"),
        readFile(yobiSource, "utf8"),
        readFile(commonLessSource, "utf8"),
        readFile(bootstrapSource, "utf8"),
      ]);

    expect(template).toContain('Messages("site.update.currentVersion", currentVersion)');
    expect(template).toContain('Messages("site.update.isNotNecessary", currentVersion)');
    expect(layout).toContain('<div class="span10">');
    expect(messages).toContain("site.update.currentVersion");
    expect(messages).toContain("site.update.isNotNecessary");
    expect(yobi).toContain('@import "less/_common.less";');
    expect(yobi).toContain('@import "less/_page.less";');
    expect(yobi).toContain('@import "less/_override.less";');
    expect(yobi.indexOf("_common.less")).toBeLessThan(yobi.indexOf("_page.less"));
    expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_override.less"));
    expect(bootstrap).toContain("p {\n  margin: 0 0 10px;");
    expect(commonLess).toContain("body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{");
    expect(commonLess).toContain("margin:0;\n    padding:0");
    const frozenCascadeEvidence = `${bootstrap}\n/* yobi.less -> _common.less */\n${commonLess}`;
    expect(frozenCascadeEvidence.indexOf("p {\n  margin: 0 0 10px;")).toBeLessThan(
      frozenCascadeEvidence.indexOf(
        "body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{",
      ),
    );

    for (const explicitOwner of Object.values(owners))
      expect(route).toContain(`data-owner="${explicitOwner}"`);

    expect(theme).not.toContain("siteUpdateNoUpdate");
  });

  test("keeps exact direct current/latest paragraph order and canonical copy", async ({ page }) => {
    const current = await openNoUpdate(page);
    const latest = owner(page, owners.latest);
    await expect(current).toHaveText("Current version is Yoram 1.0.0");
    const messages = await readFile(messagesSource, "utf8");
    await expect(latest).toHaveText(
      legacyMessage(messages, "site.update.isNotNecessary").replace("{0}", "1.0.0"),
    );
    expect(
      await page
        .locator(".site-setting-wrap > .row-fluid > .span10 > *")
        .evaluateAll((nodes) =>
          nodes.slice(0, 3).map((node) => node.getAttribute("data-owner") ?? node.tagName),
        ),
    ).toEqual(["site-update-title-strip", owners.current, owners.latest]);
    await expect(current).toHaveJSProperty("tagName", "P");
    await expect(latest).toHaveJSProperty("tagName", "P");
  });

  test("isolates generated ownership to the two direct no-update paragraphs", async ({ page }) => {
    const current = await openNoUpdate(page);
    const latest = owner(page, owners.latest);
    for (const paragraph of [current, latest]) {
      await expect(paragraph.locator("a, button, pre, form, input")).toHaveCount(0);
    }
    expect(
      await page.evaluate(
        (ownerNames) =>
          Array.from(
            document.querySelectorAll<HTMLElement>(
              `[data-owner="${ownerNames.current}"], [data-owner="${ownerNames.latest}"]`,
            ),
          ).map((paragraph) => ({
            owner: paragraph.dataset.owner,
            parentOwner: paragraph.parentElement?.dataset.owner ?? null,
            tagName: paragraph.tagName,
          })),
        owners,
      ),
    ).toEqual([
      { owner: owners.current, parentOwner: "site-update-setting-content-column", tagName: "P" },
      { owner: owners.latest, parentOwner: "site-update-setting-content-column", tagName: "P" },
    ]);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} reset margin, geometry, screenshot, and fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const current = await openNoUpdate(page);
      const latest = owner(page, owners.latest);
      await expect(current).toHaveCSS("margin", "0px");
      await expect(latest).toHaveCSS("margin", "0px");

      const geometry = await page.evaluate((ownerNames) => {
        const content = document
          .querySelector<HTMLElement>(".site-setting-wrap > .row-fluid > .span10")!
          .getBoundingClientRect();
        const get = (name: string) =>
          document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!.getBoundingClientRect();
        return {
          content: content.toJSON(),
          current: get(ownerNames.current).toJSON(),
          latest: get(ownerNames.latest).toJSON(),
        };
      }, owners);
      for (const paragraph of [geometry.current, geometry.latest]) {
        expect(paragraph.left).toBeGreaterThanOrEqual(geometry.content.left);
        expect(paragraph.right).toBeLessThanOrEqual(geometry.content.right + 1);
      }
      expect(geometry.latest.top).toBeGreaterThanOrEqual(geometry.current.bottom);
      expect(geometry.latest.top - geometry.current.bottom).toBeCloseTo(0, 0);

      const equivalence = await current.evaluate((actualCurrent, ownerNames) => {
        const actualLatest = document.querySelector<HTMLElement>(
          `[data-owner="${ownerNames.latest}"]`,
        )!;
        const parent = actualCurrent.parentElement!;
        const fallbackCurrent = document.createElement("p");
        fallbackCurrent.textContent = "Current";
        fallbackCurrent.style.position = "absolute";
        fallbackCurrent.style.left = "-10000px";
        const fallbackLatest = document.createElement("p");
        fallbackLatest.textContent = "Latest";
        fallbackLatest.style.position = "absolute";
        fallbackLatest.style.left = "-10000px";
        parent.append(fallbackCurrent, fallbackLatest);
        const margins = (element: HTMLElement) => {
          const style = getComputedStyle(element);
          return [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft];
        };
        const result = {
          current: [margins(actualCurrent), margins(fallbackCurrent)],
          latest: [margins(actualLatest), margins(fallbackLatest)],
        };
        fallbackCurrent.remove();
        fallbackLatest.remove();
        return result;
      }, owners);
      expect(equivalence.current[0]).toEqual(equivalence.current[1]);
      expect(equivalence.latest[0]).toEqual(equivalence.latest[1]);
      expect((await current.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await latest.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});

function legacyMessage(source: string, key: string) {
  const escapedKey = key.replaceAll(".", "\\.");
  const value = source.match(new RegExp(`^${escapedKey}\\s*=\\s*(.*)$`, "mu"))?.[1];
  if (!value) throw new Error(`Missing legacy message ${key}`);
  return value.replaceAll("''", "'");
}
