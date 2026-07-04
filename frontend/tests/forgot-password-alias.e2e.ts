import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("forgot-password alias redirects to the legacy lostPassword route with search", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/forgot-password?requested=1`);

  await expect(page).toHaveURL(/\/lostPassword/u);
  const redirectedUrl = new URL(page.url());
  expect(redirectedUrl.pathname).toBe(`${basePath}/lostPassword`);
  expect(redirectedUrl.searchParams.get("requested")).toContain("1");
  await expect(page.locator(".alert.alert-success")).toBeVisible();
  await expect(page.locator(".login-form-wrap form[action='/lostPassword']")).toBeVisible();
});

test("forgot-password alias source uses TanStack Router redirect instead of browser replace", () => {
  const source = readFileSync("src/routes/forgot-password.tsx", "utf8");
  const legacyRoutes = readFileSync("../yona-original/conf/routes", "utf8");
  const legacyLostPassword = readFileSync(
    "../yona-original/app/views/site/lostPassword.scala.html",
    "utf8",
  );

  expect(legacyRoutes).toContain(
    "GET            /lostPassword                                                          controllers.PasswordResetApp.lostPassword",
  );
  expect(legacyLostPassword).toContain("@routes.PasswordResetApp.requestResetPasswordEmail()");
  expect(source).toContain('createFileRoute("/forgot-password")');
  expect(source).toContain("beforeLoad");
  expect(source).toContain("redirect({");
  expect(source).toContain("href: `/lostPassword${location.searchStr}`");
  expect(source).toContain("return null;");
  expect(source).not.toContain("window.location.replace");
});
