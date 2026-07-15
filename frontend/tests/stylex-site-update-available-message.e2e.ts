import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/update.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
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
  available: "site-update-available-message",
  strong: "site-update-available-message-strong",
} as const;

const owner = (root: Page | Locator, name: string) => root.locator(`[data-stylex-owner="${name}"]`);

async function openAvailableUpdate(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-update-available-message" },
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
        message: "site.update.isAvailable",
        releaseUrl: "https://example.test/yoram-1.1.0",
        versionToUpdate: "1.1.0",
      },
    }),
  );
  await page.goto(`${basePath}/sites/update`);
  const available = owner(page, owners.available);
  await expect(available).toBeVisible();
  return available;
}

test.describe("StyleX site update available message", () => {
  test("pins the Scala available branch, frozen cascade, and global theme ownership", async () => {
    const [route, theme, template, layout, messages, yobi, commonLess, bootstrap] =
      await Promise.all([
        readFile(routeSource, "utf8"),
        readFile(themeSource, "utf8"),
        readFile(templateSource, "utf8"),
        readFile(layoutSource, "utf8"),
        readFile(messagesSource, "utf8"),
        readFile(yobiSource, "utf8"),
        readFile(commonLessSource, "utf8"),
        readFile(bootstrapSource, "utf8"),
      ]);

    expect(template).toContain("@if(versionToUpdate != null){");
    expect(template).toContain(
      '<p><strong>@Messages("site.update.isAvailable", versionToUpdate)</strong>',
    );
    expect(template).toContain('@Messages("site.update.download")</a></p>');
    expect(template).toContain('Messages("site.update.currentVersion", currentVersion)');
    expect(layout).toContain('<div class="span10">');
    expect(messages).toContain("site.update.isAvailable");
    expect(messages).toContain("site.update.download");
    expect(messages).toContain("site.update.currentVersion");
    expect(yobi).toContain('@import "less/_common.less";');
    expect(yobi).toContain('@import "less/_page.less";');
    expect(yobi).toContain('@import "less/_override.less";');
    expect(yobi.indexOf("_common.less")).toBeLessThan(yobi.indexOf("_page.less"));
    expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_override.less"));
    expect(bootstrap).toContain("p {\n  margin: 0 0 10px;");
    expect(bootstrap).toContain("strong {\n  font-weight: bold;");
    expect(commonLess).toContain("body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{");
    expect(commonLess).toContain("margin:0;\n    padding:0");
    const frozenCascadeEvidence = `${bootstrap}\n/* yobi.less -> _common.less */\n${commonLess}`;
    expect(frozenCascadeEvidence.indexOf("p {\n  margin: 0 0 10px;")).toBeLessThan(
      frozenCascadeEvidence.indexOf(
        "body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{",
      ),
    );

    for (const explicitOwner of Object.values(owners))
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
    expect(route).toContain("styles.availableParagraph");
    expect(route).toContain("styles.availableStrong");
    expect(route).toContain("globalColors.siteUpdateAvailableParagraphMargin");
    expect(route).toContain("globalColors.siteUpdateAvailableStrongFontWeight");
    expect(theme).toContain("siteUpdateAvailableParagraphMargin");
    expect(theme).toContain("siteUpdateAvailableStrongFontWeight");
    expect(route).toContain("stylex.props(styles.availableParagraph)");
    expect(route).toContain("stylex.props(styles.availableStrong)");
  });

  test("keeps exact direct title, available, and current order and canonical copy", async ({
    page,
  }) => {
    const available = await openAvailableUpdate(page);
    const strong = owner(available, owners.strong);
    const download = owner(available, "site-update-download-action");
    const current = owner(page, "site-update-current-version");
    const messages = await readFile(messagesSource, "utf8");
    await expect(strong).toHaveText("Yoram 1.1.0 is available");
    await expect(download).toHaveText(legacyMessage(messages, "site.update.download"));
    await expect(current).toHaveText("Current version is Yoram 1.0.0");
    expect(
      await page
        .locator(".site-setting-wrap > .row-fluid > .span10 > *")
        .evaluateAll((nodes) =>
          nodes.slice(0, 3).map((node) => node.getAttribute("data-stylex-owner") ?? node.tagName),
        ),
    ).toEqual(["site-update-title-strip", owners.available, "site-update-current-version"]);
    await expect(available).toHaveJSProperty("tagName", "P");
    await expect(strong).toHaveJSProperty("tagName", "STRONG");
    expect(
      await available
        .locator(":scope > *")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-stylex-owner"))),
    ).toEqual([owners.strong, "site-update-download-action"]);
  });

  test("isolates generated ownership to the available paragraph and its direct strong", async ({
    page,
  }) => {
    const available = await openAvailableUpdate(page);
    const strong = owner(available, owners.strong);
    for (const element of [available, strong]) {
      expect(
        (await element.getAttribute("class"))
          ?.split(/\s+/u)
          .some((className) => className.startsWith("x")),
      ).toBe(true);
    }
    expect(
      await page.evaluate(
        (ownerNames) =>
          Array.from(
            document.querySelectorAll<HTMLElement>(
              `[data-stylex-owner="${ownerNames.available}"], [data-stylex-owner="${ownerNames.strong}"]`,
            ),
          ).map((element) => ({
            owner: element.dataset.stylexOwner,
            parentOwner: element.parentElement?.dataset.stylexOwner ?? null,
            tagName: element.tagName,
          })),
        owners,
      ),
    ).toEqual([
      { owner: owners.available, parentOwner: null, tagName: "P" },
      { owner: owners.strong, parentOwner: owners.available, tagName: "STRONG" },
    ]);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} margin, bold weight, geometry, screenshot, and fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const available = await openAvailableUpdate(page);
      const strong = owner(available, owners.strong);
      const download = owner(available, "site-update-download-action");
      const current = owner(page, "site-update-current-version");
      await expect(available).toHaveCSS("margin", "0px");
      await expect(strong).toHaveCSS("font-weight", "700");

      const geometry = await page.evaluate((ownerNames) => {
        const content = document
          .querySelector<HTMLElement>(".site-setting-wrap > .row-fluid > .span10")!
          .getBoundingClientRect();
        const get = (name: string) =>
          document
            .querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!
            .getBoundingClientRect();
        return {
          available: get(ownerNames.available).toJSON(),
          content: content.toJSON(),
          current: get("site-update-current-version").toJSON(),
          download: get("site-update-download-action").toJSON(),
          strong: get(ownerNames.strong).toJSON(),
          title: get("site-update-title-strip").toJSON(),
        };
      }, owners);
      for (const element of [geometry.available, geometry.strong, geometry.download]) {
        expect(element.left).toBeGreaterThanOrEqual(geometry.content.left);
        expect(element.right).toBeLessThanOrEqual(geometry.content.right + 1);
      }
      expect(geometry.available.top).toBeGreaterThanOrEqual(geometry.title.bottom);
      expect(geometry.current.top).toBeGreaterThanOrEqual(geometry.available.bottom);
      expect(geometry.strong.top).toBeGreaterThanOrEqual(geometry.available.top);
      expect(geometry.strong.bottom).toBeLessThanOrEqual(geometry.available.bottom + 1);
      expect(geometry.download.left).toBeGreaterThanOrEqual(geometry.strong.right);
      expect(geometry.download.top).toBeLessThan(geometry.available.bottom);
      expect(geometry.strong.right).toBeLessThanOrEqual(geometry.download.left);

      const equivalence = await available.evaluate((actualAvailable, ownerNames) => {
        const actualStrong = document.querySelector<HTMLElement>(
          `[data-stylex-owner="${ownerNames.strong}"]`,
        )!;
        const fallbackParagraph = document.createElement("p");
        fallbackParagraph.style.position = "absolute";
        fallbackParagraph.style.left = "-10000px";
        const fallbackStrong = document.createElement("strong");
        fallbackStrong.textContent = "Available";
        fallbackParagraph.append(fallbackStrong);
        actualAvailable.parentElement!.append(fallbackParagraph);
        const style = (element: HTMLElement) => getComputedStyle(element);
        const margins = (element: HTMLElement) => [
          style(element).marginTop,
          style(element).marginRight,
          style(element).marginBottom,
          style(element).marginLeft,
        ];
        const result = {
          margin: [margins(actualAvailable), margins(fallbackParagraph)],
          weight: [style(actualStrong).fontWeight, style(fallbackStrong).fontWeight],
        };
        fallbackParagraph.remove();
        return result;
      }, owners);
      expect(equivalence.margin[0]).toEqual(equivalence.margin[1]);
      expect(equivalence.weight[0]).toBe(equivalence.weight[1]);
      expect((await available.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await strong.screenshot()).byteLength).toBeGreaterThan(0);
      expect(await download.count()).toBe(1);
      expect(await current.count()).toBe(1);
    });
  }
});

function legacyMessage(source: string, key: string) {
  const escapedKey = key.replaceAll(".", "\\.");
  const value = source.match(new RegExp(`^${escapedKey}\\s*=\\s*(.*)$`, "mu"))?.[1];
  if (!value) throw new Error(`Missing legacy message ${key}`);
  return value.replaceAll("''", "'");
}
