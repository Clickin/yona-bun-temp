import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-massmail-selected-project-tag"]';
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-massmail.stylex.ts", import.meta.url);

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

test.describe("StyleX site massmail selected-project tag", () => {
  test("retires only the generated label fallback classes and keeps tags absent until added", async ({
    page,
  }) => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-stylex-owner="site-massmail-selected-project-tag"');
    expect(route).toContain("styles.selectedProjectTag");
    expect(route).not.toContain('className="label label-info"');
    expect(route).not.toContain('marginRight: "5px"');
    expect(theme).toContain("whitePaint");
    expect(theme).toContain("tagSurface");
    expect(route).not.toContain("globalColors.");

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
        borderRadius: "3px",
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
      await expect(page.locator("#selected-projects")).toHaveScreenshot(
        `stylex-site-massmail-selected-project-tag-${viewport.name}.png`,
      );
    });
  }

  test("keeps empty and href-only label rules inapplicable and isolates generated classes", async ({
    page,
  }) => {
    const tags = await addProjects(page, ["admin/projectYobi"]);
    expect(
      await tags.nth(0).evaluate((element) => {
        const hasGeneratedToken = (current: Element | null) =>
          [...(current?.classList ?? [])].some((token) => /^x[a-z0-9_-]{5,}$/iu.test(token));
        return {
          emptyRuleInapplicable: !element.matches(":empty"),
          hrefRuleInapplicable: !element.hasAttribute("href"),
          removeButtonHasGeneratedToken: hasGeneratedToken(
            element.querySelector(":scope > .selected-project-remove"),
          ),
          tagHasGeneratedToken: hasGeneratedToken(element),
          tagHasLabelFallback: /(?:^|\s)label(?:\s|$)/u.test(element.className),
          tagHasLabelInfoFallback: /(?:^|\s)label-info(?:\s|$)/u.test(element.className),
          wrapperHasGeneratedToken: hasGeneratedToken(element.parentElement),
        };
      }),
    ).toEqual({
      emptyRuleInapplicable: true,
      hrefRuleInapplicable: true,
      removeButtonHasGeneratedToken: false,
      tagHasGeneratedToken: true,
      tagHasLabelFallback: false,
      tagHasLabelInfoFallback: false,
      wrapperHasGeneratedToken: false,
    });
  });
});
