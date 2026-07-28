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
  const form = page.locator(".login-form-wrap > form");
  await expect(form).toBeVisible();
  await expect(form).toHaveAttribute("action", `${basePath}/users/login`);
});

test("login alias source uses TanStack Router redirect instead of window replacement", () => {
  const canonicalLoginFormSource = readFileSync("src/routes/users/loginform.tsx", "utf8");
  const source = readFileSync("src/routes/login.tsx", "utf8");
  const legacyRoutes = readFileSync("../yona-original/conf/routes", "utf8");
  const legacyLoginForm = readFileSync("../yona-original/app/views/user/login.scala.html", "utf8");
  const legacySiteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");

  expect(legacyRoutes).toContain("GET            /users/loginform");
  expect(legacyRoutes).toContain("POST           /users/login");
  expect(legacyLoginForm).toContain("@siteLayout(message, utils.MenuType.NONE)");
  expect(legacyLoginForm).toContain('class="login-form-wrap frm-wrap"');
  expect(legacyLoginForm).toContain("@routes.UserApp.login()");
  expect(legacySiteLayout).toContain("@layout(Messages(title))");
  expect(canonicalLoginFormSource).toMatch(
    /action=\{prefixBasePath\(\s*runtimeConfig\.basePath,\s*"\/users\/login",?\s*\)\}/u,
  );
  expect(source).toContain("redirect({");
  expect(source).toMatch(
    /const canonicalLegacyLoginFormHref\s*=\s*`\/users\/loginform\$\{location\.searchStr\}`/u,
  );
  expect(source).toContain("href: canonicalLegacyLoginFormHref");
  expect(source).toContain("replace: true");
  expect(source).not.toContain("window.location.replace");
});
