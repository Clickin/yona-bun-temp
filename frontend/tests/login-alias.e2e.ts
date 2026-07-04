import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("GET /login redirects to legacy login form route with search params", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/login?redirectUrl=/me&password=reset`);

  await expect(page).toHaveURL(/\/users\/loginform\?/u);
  const url = new URL(page.url());
  expect(url.pathname).toBe(`${basePath}/users/loginform`);
  expect(url.searchParams.get("redirectUrl")).toBe("/me");
  expect(url.searchParams.get("password")).toBe("reset");
  await expect(page.locator(".login-form-wrap form[action='/users/login']")).toBeVisible();
});

test("login alias source uses TanStack Router redirect instead of window replacement", () => {
  const source = readFileSync("src/routes/login.tsx", "utf8");
  const legacyRoutes = readFileSync("../yona-original/conf/routes", "utf8");
  const legacyLoginForm = readFileSync("../yona-original/app/views/user/login.scala.html", "utf8");

  expect(legacyRoutes).toContain("GET            /users/loginform");
  expect(legacyLoginForm).toContain("@routes.UserApp.login()");
  expect(source).toContain("redirect({");
  expect(source).toContain("href: `/users/loginform${location.searchStr}`");
  expect(source).toContain("replace: true");
  expect(source).not.toContain("window.location.replace");
});
