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
  expect(redirectedUrl.searchParams.get("requested")).toBe("1");
  const successAlert = page.locator('[data-stylex-owner="lost-password-success-alert"]');
  const successHeading = successAlert.locator(
    '[data-stylex-part="lost-password-success-alert-heading"]',
  );
  await expect(successAlert).toBeVisible();
  await expect(successHeading).toBeVisible();
  await expect(successHeading).toHaveText("Mail has been sent.");
  await expect(successAlert).not.toHaveClass(/\b(?:alert|alert-success)\b/u);
  const form = page.locator(".login-form-wrap > form");
  await expect(form).toBeVisible();
  await expect(form).toHaveAttribute("action", `${basePath === "/" ? "" : basePath}/lostPassword`);
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
  expect(source).toMatch(
    /const canonicalLegacyLostPasswordHref\s*=\s*`\/lostPassword\$\{location\.searchStr\}`;/u,
  );
  expect(source).toMatch(
    /throw redirect\(\{\s*href:\s*canonicalLegacyLostPasswordHref,\s*replace:\s*true,\s*\}\);/u,
  );
  expect(source).not.toContain("window.location.replace");
});
