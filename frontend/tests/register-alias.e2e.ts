import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("register alias redirects to the legacy signup form with search intact", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/register?loginId=alice&redirectUrl=/projects&empty=`);

  await expect(page).toHaveURL(new RegExp(`${basePath}/users/signupform\\?`, "u"));
  const redirectedUrl = new URL(page.url());
  expect(redirectedUrl.pathname).toBe(`${basePath}/users/signupform`);
  expect(redirectedUrl.search).toBe("?loginId=alice&redirectUrl=%2Fprojects&empty=");
  expect(redirectedUrl.searchParams.get("loginId")).toBe("alice");
  expect(redirectedUrl.searchParams.get("redirectUrl")).toBe("/projects");
  expect(redirectedUrl.searchParams.get("empty")).toBe("");
});

test("register alias route uses TanStack Router redirect instead of window location replacement", () => {
  const source = readFileSync("src/routes/register.tsx", "utf8");
  const legacyRoutes = readFileSync("../yona-original/conf/routes", "utf8");
  const legacySignupTemplate = readFileSync(
    "../yona-original/app/views/user/signup.scala.html",
    "utf8",
  );

  expect(legacyRoutes).toContain(
    "GET            /users/signupform                                                      controllers.UserApp.signupForm()",
  );
  expect(legacySignupTemplate).toContain(
    '<form action="@routes.UserApp.newUser()" method="post" name="signup">',
  );
  expect(source).toContain("beforeLoad");
  expect(source).toContain("redirect({");
  expect(source).toContain("location.searchStr");
  expect(source).toContain("href: `/users/signupform${location.searchStr}`");
  expect(source).not.toContain("window.location.replace");
});
