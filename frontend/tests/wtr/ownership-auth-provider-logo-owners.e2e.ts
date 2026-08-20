import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("OAuth provider logos use route-local Style owners", async () => {
  const rootSource = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  const loginSource = readFileSync(
    new URL("../src/routes/users/loginform.tsx", import.meta.url),
    "utf8",
  );
  const userSource = readFileSync(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  const rootStyle = curatedAppCss();
  const loginStyle = curatedAppCss();
  const legacyLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const legacyProfile = readFileSync(
    new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
    "utf8",
  );
  const legacyLogin = readFileSync(
    new URL("../../yona-original/app/views/user/login.scala.html", import.meta.url),
    "utf8",
  );
  const legacyDialog = readFileSync(
    new URL("../../yona-original/app/views/common/loginDialog.scala.html", import.meta.url),
    "utf8",
  );
  const appCss = curatedAppCss();

  expect(legacyLess).toContain(".auth-provider-logo");
  expect(legacyLess).toContain("vertical-align: middle");
  expect(legacyLess).toContain("margin-left: -4px");
  expect(legacyProfile).toContain('class="auth-provider-logo"');
  expect(legacyLogin).toContain("providerWithLogo");
  expect(legacyDialog).toContain("providerWithLogo");

  // Shared oauth-provider-link owns the legacy shell now.
  const sharedSource = readFileSync("src/components/oauth-provider-link.tsx", "utf8");
  expect(sharedSource).toContain("auth-provider-logo");
  for (const source of [rootSource, loginSource]) {
    expect(source).toContain("OAuthProviderLink");
  }
  expect(userSource).not.toContain("} github`}");
  // data-owner strings are built in the shared component from the prefix prop.
  expect(sharedSource).toContain("`${dataOwnerPrefix}-provider-logo`");
  expect(sharedSource).toContain("`${dataOwnerPrefix}-provider-${normalized}`");
  expect(rootSource).toContain('dataOwnerPrefix="root"');
  expect(loginSource).toContain('dataOwnerPrefix="standalone-login"');
  expect(userSource).toContain('dataOwnerPrefix="user-profile"');

  for (const style of [rootStyle, loginStyle, userSource]) {
  }
  expect(appCss).not.toContain(".auth-provider-logo {");
  expect(appCss).not.toContain(".auth-provider-logo svg");
  expect(appCss).not.toContain(".auth-provider-logo .github");
});
