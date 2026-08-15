import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/data.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const ownerSelector = '[data-owner="site-data-export-action"]';

async function open(page: Page) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ headers: { "x-csrf-token": "csrf-site-data" }, json: {} }),
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ json: { isAnonymous: false, isSiteAdmin: true } }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.goto(`${basePath}/sites/data`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test("export action preserves href, class absence, and legacy copy order", async ({ page }) => {
  const owner = await open(page);

  await expect(owner).toHaveAttribute("href", `${basePath}/sites/export`);
  await expect(owner).not.toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
  await expect(owner).toHaveText("Export");
  await expect(page.locator('[data-owner="site-data-setting-content-column"] > h3')).toHaveText([
    "Export",
    "Import",
  ]);
  await expect(page.locator('[data-owner="site-data-setting-content-column"] > p')).toHaveText([
    "All data read from DB will be exported to a file.",
    "Replace existing data with exported Yoram data file.",
  ]);
});

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${viewport.name} export action preserves primary states and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const owner = await open(page);

    await expect(owner).toHaveCSS("background-color", "rgb(255, 115, 50)");
    expect(
      await owner.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          color: style.color,
          lineHeight: style.lineHeight,
          padding: style.padding,
        };
      }),
    ).toEqual({
      borderColor: "rgb(233, 94, 1)",
      borderRadius: "3px",
      color: "rgb(255, 255, 255)",
      lineHeight: "20px",
      padding: "4px 12px",
    });
    await owner.hover();
    // The ybtn-success hover paint can lag under shard load (gate flake:
    // the background stayed at the base #ff7332); poll the hovered state.
    await expect
      .poll(() => owner.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe("rgb(233, 94, 1)");
    await owner.focus();
    await page.waitForTimeout(350);
    await expect
      .poll(() => owner.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe("rgb(233, 94, 1)");

    const geometry = await owner.evaluate((element) => {
      const action = element.getBoundingClientRect();
      const content = element
        .closest('[data-owner="site-data-setting-content-column"]')
        ?.getBoundingClientRect();
      const copy = element.previousElementSibling?.getBoundingClientRect();
      if (!content || !copy) return null;
      return {
        afterCopy: action.top >= copy.bottom,
        withinContent: action.left >= content.left && action.right <= content.right,
      };
    });
    expect(geometry).toEqual({ afterCopy: true, withinContent: true });
  });
}

test("export owner excludes import controls", async ({ page }) => {
  const owner = await open(page);

  await expect(owner.locator("form, input")).toHaveCount(0);
  await expect(page.locator('[data-owner="site-data-setting-content-column"] > form')).toHaveCount(
    1,
  );
  await expect(page.locator('input[type="file"][name="data"]')).toBeVisible();
});

test("export owner does not expose generated selectors", async () => {
  const [route, theme] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(themeSource, "utf8"),
  ]);

  expect(route).toContain('data-owner="site-data-export-action"');

  expect(route).not.toContain("anonymousSiteSignup");
  expect(route).not.toContain("':hover, :focus, :active'");

  expect(route).not.toMatch(/#[0-9a-f]/iu);
});
