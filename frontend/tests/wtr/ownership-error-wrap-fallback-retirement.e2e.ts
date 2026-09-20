import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("unknown routes preserve the legacy error layout", async ({ page }) => {
  await page.goto(`${basePath}/missing-legacy-route/unknown/root-style-notfound`, {
    waitUntil: "networkidle",
  });
  const wrap = page.locator('[data-owner="root-alias-notfound-error-wrap"]');
  await expect(wrap).toBeVisible();
  await expect(wrap).toHaveCSS("padding-top", "100px");
  await expect(wrap).toHaveCSS("text-align", "center");
});
