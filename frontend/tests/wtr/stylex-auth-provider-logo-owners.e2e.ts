import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("OAuth provider logos use route-local StyleX owners", async () => {
  const rootSource = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  const loginSource = readFileSync(
    new URL("../src/routes/users/loginform.tsx", import.meta.url),
    "utf8",
  );
  const userSource = readFileSync(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  const rootStyle = readFileSync(new URL("../src/routes/-root.stylex.ts", import.meta.url), "utf8");
  const loginStyle = readFileSync(
    new URL("../src/routes/users/-loginform.stylex.ts", import.meta.url),
    "utf8",
  );
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
  const appCss = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

  expect(legacyLess).toContain(".auth-provider-logo");
  expect(legacyLess).toContain("vertical-align: middle");
  expect(legacyLess).toContain("margin-left: -4px");
  expect(legacyProfile).toContain('class="auth-provider-logo"');
  expect(legacyLogin).toContain("providerWithLogo");
  expect(legacyDialog).toContain("providerWithLogo");

  for (const source of [rootSource, loginSource]) {
    expect(source).toContain("auth-provider-logo");
  }
  expect(userSource).not.toContain("} github`}");
  expect(rootSource).toContain('data-stylex-owner="root-provider-logo"');
  expect(rootSource).toContain('data-stylex-owner="root-provider-github"');
  expect(loginSource).toContain('data-stylex-owner="standalone-login-provider-logo"');
  expect(loginSource).toContain('data-stylex-owner="standalone-login-provider-github"');
  expect(userSource).toContain('data-stylex-owner="user-profile-provider-logo"');
  expect(userSource).toContain('data-stylex-owner="user-profile-provider-github"');

  for (const style of [rootStyle, loginStyle, userSource]) {
    expect(style).toContain('fontFamily: "Roboto, sans-serif"');
    expect(style).toContain('verticalAlign: "middle"');
    expect(style).toContain('display: "inline-block"');
    expect(style).toContain('marginLeft: "-4px"');
    expect(style).toContain('marginTop: "3px"');
    expect(style).toContain('marginBottom: "3px"');
    expect(style).toContain('width: "30px"');
  }
  expect(appCss).not.toContain(".auth-provider-logo {");
  expect(appCss).not.toContain(".auth-provider-logo svg");
  expect(appCss).not.toContain(".auth-provider-logo .github");
});
