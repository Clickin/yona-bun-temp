import { expect, test } from "@playwright/test";

test("shell renders on home page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("yona-shell-header")).toBeVisible();
  await expect(page.getByTestId("yona-shell-footer")).toBeVisible();
});
