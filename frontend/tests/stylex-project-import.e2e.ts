import { expect, test } from "@playwright/test";

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
        ownerOptions: [{ ownerName: "admin", selected: true, organization: false }],
        selectedOwnerName: "admin",
        formValues: {},
        formErrors: {},
      },
    }),
  );
  await page.goto("/yona/_import?owner=admin");
  await expect(page.locator('[data-stylex-owner="project-import-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-import-form-wrap"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-import-heading"]')).toContainText("Git");
  await expect(page.locator("#url")).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-import-advanced"]')).toBeVisible();
  const rightLabels = page.locator('[data-stylex-owner="project-import-right-label"]');
  await expect(rightLabels).toHaveCount(3);
  await expect(rightLabels).toHaveClass(/span2/);
  await expect(rightLabels.first()).not.toHaveClass(/right-txt/);
  await expect(rightLabels.first()).toHaveCSS("text-align", "right");
  for (const viewport of [{ width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const metrics = await page
      .locator('[data-stylex-owner="project-import-page"]')
      .evaluate((node) => ({
        left: node.getBoundingClientRect().left,
        right: node.getBoundingClientRect().right,
        width: node.getBoundingClientRect().width,
      }));
    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(viewport.width);
  }
});
