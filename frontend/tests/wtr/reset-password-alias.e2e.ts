import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("reset-password alias redirects to legacy resetPassword form with token intact", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/reset-password?s=reset-token`);

  await expect(page).toHaveURL(/\/resetPassword\?s=reset-token/u);
  const redirectedUrl = new URL(page.url());
  expect(redirectedUrl.pathname).toBe(`${basePath}/resetPassword`);
  expect(redirectedUrl.searchParams.get("s")).toBe("reset-token");
  await expect(page.locator("form[name='passwordReset']")).toBeVisible();
  await expect(page.locator("form[name='passwordReset'] input[name='hashString']")).toHaveValue(
    "reset-token",
  );
});

test("reset-password alias uses TanStack Router redirect from legacy evidence", () => {
  const source = readFileSync("src/routes/$user.tsx", "utf8");
  const legacyRoutes = readFileSync("../yona-original/conf/routes", "utf8");
  const legacyResetPasswordTemplate = readFileSync(
    "../yona-original/app/views/user/resetPassword.scala.html",
    "utf8",
  );

  expect(legacyRoutes).toContain(
    "GET            /resetPassword                                                         controllers.PasswordResetApp.resetPasswordForm(s:String)",
  );
  expect(legacyResetPasswordTemplate).toContain(
    'form action="@routes.PasswordResetApp.resetPassword()"',
  );
  expect(source).toContain("beforeLoad");
  expect(source).toContain('params.user === "reset-password"');
  expect(source).toContain("redirect({");
  expect(source).toContain("href: `/resetPassword${location.searchStr}`");
  expect(source).toContain("replace: true");
  expect(source).not.toContain("window.location.replace");
});
