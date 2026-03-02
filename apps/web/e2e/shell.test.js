import { expect, test } from "@playwright/test";

test("navigation works and shell persists", async ({ page }) => {
  await page.goto("/");

  const header = page.getByTestId("yona-shell-header");
  const footer = page.getByTestId("yona-shell-footer");
  await expect(header).toBeVisible();
  await expect(footer).toBeVisible();

  await page.getByTestId("yona-nav-projects").click();
  await expect(page).toHaveURL(/\/projects/);
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  await expect(header).toBeVisible();
  await expect(footer).toBeVisible();

  await page.getByTestId("yona-nav-organizations").click();
  await expect(page).toHaveURL(/\/organizations/);
  await expect(page.getByRole("heading", { level: 1, name: "Organizations" })).toBeVisible();
  await expect(header).toBeVisible();
  await expect(footer).toBeVisible();

  await page.getByTestId("yona-nav-help").click();
  await expect(page).toHaveURL(/\/help/);
  await expect(page.getByRole("heading", { level: 1, name: "Help" })).toBeVisible();
  await expect(header).toBeVisible();
  await expect(footer).toBeVisible();

  await page.getByTestId("yona-nav-login").click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  await expect(header).toBeVisible();
  await expect(footer).toBeVisible();
});

test("paraglide placeholders are replaced in html lang/dir", async ({ page }) => {
  await page.goto("/");

  const lang = await page.evaluate(() => document.documentElement.lang);
  const dir = await page.evaluate(() => document.documentElement.dir);

  expect(lang).toBeTruthy();
  expect(lang).not.toContain("paraglide");
  expect(["ltr", "rtl"]).toContain(dir);
  expect(dir).not.toContain("paraglide");
});
