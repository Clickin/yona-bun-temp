import { expect, test } from "@playwright/test";

test("auth aliases redirect to canonical legacy public routes", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/login?redirectUrl=/me`);
  await expect(page).toHaveURL(/\/users\/loginform\?redirectUrl=/u);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/users/loginform`);
  expect(new URL(page.url()).searchParams.get("redirectUrl")).toBe("/me");
  await expect(page.locator(".login-form-wrap form[action='/users/login']")).toBeVisible();

  await page.goto(`${basePath}/register`);
  await expect(page).toHaveURL(new RegExp(`${basePath}/users/signupform$`, "u"));
  await expect(page.locator(".signup-form-wrap form[name='signup']")).toBeVisible();

  await page.goto(`${basePath}/forgot-password?requested=1`);
  await expect(page).toHaveURL(/\/lostPassword/u);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/lostPassword`);
  await expect(page.locator(".alert.alert-success")).toBeVisible();
  await expect(page.locator(".login-form-wrap form[action='/lostPassword']")).toBeVisible();

  await page.goto(`${basePath}/reset-password?s=reset-token`);
  await expect(page).toHaveURL(/\/resetPassword/u);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/resetPassword`);
  await expect(page.locator("form[name='passwordReset'] input[name='hashString']")).toHaveValue(
    "reset-token",
  );
});
