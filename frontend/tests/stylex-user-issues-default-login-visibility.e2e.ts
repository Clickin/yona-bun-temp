import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("user issues default-login action uses conditional StyleX visibility", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/issue/my_list.scala.html", "utf8"),
    readFile("src/routes/user/issues.tsx", "utf8"),
    readFile("src/routes/user/-issues.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain("$setDefaultLoginPage.hide()");
  expect(route).toContain('data-stylex-owner="user-issues-default-login-button"');
  expect(route).toContain("issueStyles.defaultLoginPageHidden");
  expect(route).not.toContain(
    'style={hideDefaultLoginPageButton ? { display: "none" } : undefined}',
  );
  expect(style).toContain('defaultLoginPageHidden: { display: "none" }');
});
