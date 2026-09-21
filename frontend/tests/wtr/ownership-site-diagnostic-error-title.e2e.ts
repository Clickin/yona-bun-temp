import { expect, test } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/diagnostic.tsx", import.meta.url);
const ownerSelector = '[data-owner="site-diagnostic-error-title"]';

async function openErrorDiagnostic(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ json: { isAnonymous: false, isSiteAdmin: true } }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/diagnostics", (route) =>
    route.fulfill({ json: { errorCount: 1, errors: ["database probe failed"] } }),
  );
  await page.goto(`${basePath}/sites/diagnostic`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  await expect(page.locator('[data-owner="site-diagnostic-page"]')).toBeVisible();
  await expect(page.locator('[data-owner="site-diagnostic-content"]')).toBeVisible();
  return owner;
}

test("error title uses the distinct owner and preserves legacy error order", async ({ page }) => {
  const owner = await openErrorDiagnostic(page);

  await expect(owner.locator(":scope > h2")).toHaveText("Diagnostics");
  await expect(owner.locator("+ p")).toHaveText("1 errors were found");
  await expect(owner.locator("+ p + ul pre")).toHaveText("database probe failed");
  expect(
    await page
      .locator('[data-owner="site-diagnostic-setting-content-column"] > *')
      .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
  ).toEqual(["DIV", "P", "UL"]);
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`${viewport.name} error title matches legacy paint and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const owner = await openErrorDiagnostic(page);
    const heading = owner.locator("h2");

    await expect(owner).toHaveCSS("overflow", "hidden");
    await expect(owner).toHaveCSS("margin-bottom", "29px");
    await expect(owner).toHaveCSS("padding-bottom", "8px");
    await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
    await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
    await expect(heading).toHaveCSS("font-size", "19.5px");
    await expect(heading).toHaveCSS("float", "left");
    const boxes = await owner.evaluate((element) => {
      const owner = element.getBoundingClientRect();
      const content = element.parentElement?.getBoundingClientRect();
      const heading = element.querySelector("h2")?.getBoundingClientRect();
      if (!content || !heading) return null;
      return { content, heading, owner };
    });
    expect(boxes).not.toBeNull();
    expect(boxes!.owner.left).toBeGreaterThanOrEqual(boxes!.content.left);
    expect(boxes!.owner.right).toBeLessThanOrEqual(boxes!.content.right + 1);
    expect(boxes!.heading.top).toBeGreaterThanOrEqual(boxes!.owner.top);
    expect(boxes!.heading.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
  });
}

test("error title excludes the no-error owner", async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ json: { isAnonymous: false, isSiteAdmin: true } }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/diagnostics", (route) =>
    route.fulfill({ json: { errorCount: 0, errors: [] } }),
  );
  await page.goto(`${basePath}/sites/diagnostic`);

  await expect(page.locator(ownerSelector)).toHaveCount(0);
  await expect(page.locator('[data-owner="site-diagnostic-no-error-title"]')).toBeVisible();
});

test("error title has no generated selector contract", async () => {
  const route = await readFile(routeSource, "utf8");

  expect(route).toContain('"site-diagnostic-error-title"');

  // F5 className="pull-left" — yona-original/app/views/site/diagnostic.scala.html:28
  expect(route).toContain('className="pull-left"');
  // F5 className="title_area" — yona-original/app/views/site/diagnostic.scala.html:27
  expect(route).toContain('className="title_area"');
  expect(route).not.toContain("hasNoDiagnosticErrors || hasDiagnosticErrors");
  expect(route).not.toMatch(/siteDiagnosticErrorTitle[^\n]*#[0-9a-f]/iu);
});
