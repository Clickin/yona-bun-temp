import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("root fallback reset-password alias source uses router navigation", () => {
  const source = readFileSync("src/routes/__root.tsx", "utf8");
  const legacyRoutes = readFileSync("../yona-original/conf/routes", "utf8");
  const legacyResetPassword = readFileSync(
    "../yona-original/app/views/user/resetPassword.scala.html",
    "utf8",
  );
  const rootFallbackStart = source.indexOf("function RootAliasNotFoundScreen");
  const rootFallbackSource = source.slice(rootFallbackStart);

  expect(legacyRoutes).toContain(
    "GET            /resetPassword                                                         controllers.PasswordResetApp.resetPasswordForm(s:String)",
  );
  expect(legacyResetPassword).toContain('class="center-wrap tag-line-wrap reset-password"');
  expect(rootFallbackSource).toContain('if (pathname === "/reset-password")');
  expect(rootFallbackSource).toContain(
    '<Navigate to="/resetPassword" search={resetPasswordSearch} replace />',
  );
  expect(rootFallbackSource).not.toContain("window.location.replace");
});

test("regular root not-found shell keeps legacy link hrefs", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/missing-legacy-route/unknown/root-alias-guard`);
  await expect(page.locator(".error-wrap")).toBeVisible();
  await expect(page.locator(".gnb-nav a", { hasText: "Project list" })).toHaveAttribute(
    "href",
    `${basePath}/projects`,
  );
  await expect(page.locator(".gnb-usermenu a", { hasText: "Log in" })).toHaveAttribute(
    "href",
    `${basePath}/users/loginform`,
  );
  await expect(page.locator(".error-wrap a", { hasText: "Home" })).toHaveAttribute(
    "href",
    `${basePath}/`,
  );
});
