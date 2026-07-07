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
  const rootMountedLinkStart = source.indexOf("function RootMountedRootLinkAnchor");
  const rootMountedLinkSource = source.slice(rootMountedLinkStart, rootFallbackStart);

  expect(legacyRoutes).toContain(
    "GET            /resetPassword                                                         controllers.PasswordResetApp.resetPasswordForm(s:String)",
  );
  expect(legacyResetPassword).toContain('class="center-wrap tag-line-wrap reset-password"');
  expect(rootMountedLinkSource).toContain("const RootMountedRootLink = createLink");
  expect(rootMountedLinkSource).toContain("ref?: React.Ref<HTMLAnchorElement>");
  expect(rootMountedLinkSource).toContain("legacyRootHref: string");
  expect(rootFallbackSource).toContain('if (pathname === "/reset-password")');
  expect(rootFallbackSource).toContain(
    '<Navigate to="/resetPassword" search={resetPasswordSearch} replace />',
  );
  expect(rootFallbackSource).toContain("<RootMountedRootLink");
  expect(rootFallbackSource).toContain("legacyRootHref={homeHref}");
  expect(rootFallbackSource).toContain('to="/"');
  expect(rootFallbackSource).toContain("activeOptions={legacyPlainLinkActiveOptions}");
  expect(rootFallbackSource).toContain("activeProps={legacyPlainLinkActiveProps}");
  expect(rootFallbackSource).toContain("router.history.push(homeHref);");
  expect(source).not.toContain("useLinkProps");
  expect(source).not.toContain("LegacyHrefAnchor");
  expect(source).not.toContain("React.createElement");
  expect(source).not.toContain("forwardRef");
  expect(rootFallbackSource).not.toContain("window.location.replace");
});

test("regular root not-found shell keeps legacy link hrefs", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mountedRootHref = basePath === "/" ? "/" : basePath;

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
  await expect(page.locator(".gnb-inner > a.logo")).toHaveAttribute("href", mountedRootHref);
  await expect(page.locator(".error-wrap a", { hasText: "Home" })).toHaveAttribute(
    "href",
    mountedRootHref,
  );
  await expect(page.locator(".gnb-inner > a.logo")).not.toHaveAttribute("aria-current");
  await expect(page.locator(".gnb-inner > a.logo")).not.toHaveAttribute("data-status");
  await expect(page.locator(".gnb-inner > a.logo")).not.toHaveClass(/active/u);
  await expect(page.locator(".error-wrap a", { hasText: "Home" })).not.toHaveAttribute(
    "aria-current",
  );
  await expect(page.locator(".error-wrap a", { hasText: "Home" })).not.toHaveAttribute(
    "data-status",
  );
  await expect(page.locator(".error-wrap a", { hasText: "Home" })).not.toHaveClass(/active/u);
});

test("regular root not-found Home link uses SPA navigation to mounted root", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/missing-legacy-route/unknown/root-home-navigation`);
  await expect(page.locator(".error-wrap")).toBeVisible();

  await page.locator(".error-wrap a", { hasText: "Home" }).click();
  await expect(page).toHaveURL(new RegExp(`${basePath.replaceAll("/", "\\/")}\\/?$`, "u"));
});
