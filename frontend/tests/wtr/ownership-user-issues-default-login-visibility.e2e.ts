import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("user issues default-login action uses conditional Style visibility", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/issue/my_list.scala.html", "utf8"),
    readFile("src/routes/user/issues.tsx", "utf8"),
    readFile("src/app.css", "utf8"),
  ]);
  expect(legacy).toContain("$setDefaultLoginPage.hide()");
  expect(route).toContain('data-owner="user-issues-default-login-button"');
});
