import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = readFileSync("../src/routes/[_]import.tsx", "utf8");

const legacySource = readFileSync(
  "../yona-original/app/views/project/importing.scala.html",
  "utf8",
);
const legacyCommon = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_common.less",
  "utf8",
);

const scopeLabels = [
  "project-import-public-scope-label",
  "project-import-protected-scope-label",
  "project-import-private-scope-label",
] as const;

test("project import scope labels preserve legacy ml5 through route-local Style", () => {
  expect(legacySource).toContain('<ul class="unstyled project-scopes mt10">');
  expect(legacySource.match(/<strong class="ml5">/g)).toHaveLength(3);
  expect(legacyCommon).toContain(".ml5 { margin-left:5px; }");
  for (const owner of scopeLabels) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }

  expect(routeSource).not.toContain('style="display:none;"');
});

test("project import renders legacy form skeleton and stays contained", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/projects/form-options**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerOptions: [
          { ownerName: "admin", selected: true, organization: false },
          { ownerName: "weblabs", organization: true },
        ],
        selectedOwnerName: "admin",
        formValues: {},
        formErrors: {},
      },
    }),
  );
  await page.goto("/yona/_import?owner=admin");
  await expect(page.locator('[data-owner="project-import-page"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-import-form-wrap"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-import-heading"]')).toContainText("Git");
  await expect(page.locator("#url")).toBeVisible();
  await expect(page.locator('[data-owner="project-import-advanced"]')).toBeVisible();
  const labels = page.locator('[data-owner$="-scope-label"]');
  await expect(labels).toHaveCount(3);
  for (const owner of scopeLabels) {
    const label = page.locator(`[data-owner="${owner}"]`);
    await expect(label).toHaveClass(/ml5/);
    await expect(label).toHaveCSS("margin-left", "5px");
    // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
  }
  await expect(page.locator('[data-owner="project-import-protected-scope-label"]')).toBeHidden();
  await expect(page.locator("#public")).toBeChecked();
  await expect(page.locator("#private")).not.toBeChecked();
  await page.locator('[data-owner="project-import-owner-select"] > button').click();
  await page.locator(".select2-results button", { hasText: "weblabs" }).click();
  await expect(page.locator('[data-owner="project-import-protected-scope-label"]')).toBeVisible();
  await page.locator("#protected").check();
  await expect(page.locator("#protected")).toBeChecked();
  await page.locator('[data-owner="project-import-owner-select"] > button').click();
  await page.locator(".select2-results button", { hasText: "admin" }).click();
  await expect(page.locator('[data-owner="project-import-protected-scope-label"]')).toBeHidden();
  await expect(page.locator("#public")).toBeChecked();
  await page.locator('[data-owner="project-import-owner-select"] > button').click();
  await page.locator(".select2-results button", { hasText: "weblabs" }).click();
  await expect(page.locator('[data-owner="project-import-protected-scope-label"]')).toBeVisible();

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const labels = Array.from(
        document.querySelectorAll<HTMLElement>('[data-owner$="-scope-label"]'),
      ).filter((label) => label.offsetParent !== null);
      const boxes = labels.map((label) => {
        const rect = label.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      return {
        boxes,
        viewport: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(geometry.boxes).toHaveLength(3);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(viewport.width + 8);
    for (const box of geometry.boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(box.bottom).toBeGreaterThan(box.top);
    }
  }
  const rightLabels = page.locator('[data-owner="project-import-right-label"]');
  await expect(rightLabels).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await expect(rightLabels.nth(index)).toHaveClass(/span2/);
  }
  await expect(rightLabels.first()).not.toHaveClass(/right-txt/);
  await expect(rightLabels.first()).toHaveCSS("text-align", "right");
  for (const viewport of [{ width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const metrics = await page.locator('[data-owner="project-import-page"]').evaluate((node) => ({
      left: node.getBoundingClientRect().left,
      right: node.getBoundingClientRect().right,
      width: node.getBoundingClientRect().width,
    }));
    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(viewport.width);
  }
});
