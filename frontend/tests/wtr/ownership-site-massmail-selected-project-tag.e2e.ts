import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-owner="site-massmail-selected-project-tag"]';
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);

const legacyMassMailScript = new URL(
  "../../yona-original/public/javascripts/service/yobi.site.MassMail.js",
  import.meta.url,
);

async function mockSession(page: Page) {
  const fulfill = (route: Route) =>
    route.fulfill({
      headers: { "x-csrf-token": "csrf-site-massmail-selected-project-tag" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({
      json: {
        projects: [
          { ownerName: "admin", projectName: "projectYobi" },
          { ownerName: "yona", projectName: "docs" },
        ],
      },
    }),
  );
}

async function addProjects(page: Page, names = ["admin/projectYobi", "yona/docs"]) {
  await mockSession(page);
  await page.goto(`${basePath}/sites/massmail`);
  await page.locator("#mailtoPrj").check();
  await expect(page.locator(ownerSelector)).toHaveCount(0);
  for (const name of names) {
    await page.locator("#input-project").fill(name);
    await page.locator("#select-project").click();
  }
  const tags = page.locator(ownerSelector);
  await expect(tags).toHaveText(names.map((name) => `${name} x`));
  return tags;
}

test.describe("Style site massmail selected-project tag", () => {
  test("retires only the generated label fallback classes and keeps tags absent until added", async ({
    page,
  }) => {
    const [route, _theme, appCss, legacyScript] = await Promise.all([
      readFile(routeSource, "utf8"),
      Promise.resolve(curatedAppCss()),
      Promise.resolve(curatedAppCss()),
      readFile(legacyMassMailScript, "utf8"),
    ]);
    expect(route).toContain('data-owner="site-massmail-selected-project-tag"');

    expect(route).not.toContain('className="label label-info"');
    expect(appCss).not.toContain(".label-info {");
    expect(legacyScript).toContain('<span class="label label-info">');

    await mockSession(page);
    await page.goto(`${basePath}/sites/massmail`);
    await expect(page.locator(ownerSelector)).toHaveCount(0);
    await page.locator("#mailtoPrj").check();
    await expect(page.locator(ownerSelector)).toHaveCount(0);
  });

  test("keeps generated project-tag text order and React-owned removal behavior", async ({
    page,
  }) => {
    const tags = await addProjects(page);
    await expect(tags).toHaveText(["admin/projectYobi x", "yona/docs x"]);
    await expect(tags.locator(":scope > button.selected-project-remove")).toHaveText(["x", "x"]);
    await tags.nth(0).locator(":scope > button.selected-project-remove").click();
    await expect(page.locator(ownerSelector)).toHaveText("yona/docs x");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`${viewport.name} preserves every applicable generated-label declaration and containment`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const tags = await addProjects(page, ["admin/projectYobi"]);
      const tag = tags.nth(0);
      expect(
        await tag.evaluate((element) => {
          const style = getComputedStyle(element);
          const tagBox = element.getBoundingClientRect();
          const containerBox = element.parentElement?.getBoundingClientRect();
          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            color: style.color,
            display: style.display,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            marginRight: style.marginRight,
            padding: style.padding,
            textShadow: style.textShadow,
            verticalAlign: style.verticalAlign,
            whiteSpace: style.whiteSpace,
            withinSelectedProjects: Boolean(
              containerBox &&
              tagBox.left >= containerBox.left &&
              tagBox.right <= containerBox.right + 1 &&
              tagBox.top >= containerBox.top &&
              tagBox.bottom <= containerBox.bottom,
            ),
          };
        }),
      ).toEqual({
        backgroundColor: "rgb(58, 135, 173)",
        borderRadius: "1px",
        color: "rgb(255, 255, 255)",
        display: "inline-block",
        fontSize: "11.844px",
        fontWeight: "700",
        lineHeight: "14px",
        marginRight: "5px",
        padding: "2px 4px",
        textShadow: "rgba(0, 0, 0, 0.25) 0px -1px 0px",
        verticalAlign: "baseline",
        whiteSpace: "nowrap",
        withinSelectedProjects: true,
      });
    });
  }

  test("keeps empty and href-only label rules inapplicable", async ({ page }) => {
    const tags = await addProjects(page, ["admin/projectYobi"]);
    expect(
      await tags.nth(0).evaluate((element) => ({
        emptyRuleInapplicable: !element.matches(":empty"),
        hrefRuleInapplicable: !element.hasAttribute("href"),
        tagHasLabelFallback: /(?:^|\s)label(?:\s|$)/u.test(element.className),
        tagHasLabelInfoFallback: /(?:^|\s)label-info(?:\s|$)/u.test(element.className),
      })),
    ).toEqual({
      emptyRuleInapplicable: true,
      hrefRuleInapplicable: true,
      tagHasLabelFallback: false,
      tagHasLabelInfoFallback: false,
    });
  });
});
