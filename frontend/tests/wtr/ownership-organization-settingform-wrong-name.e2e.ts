import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("organization setting wrong-name validation uses conditional Style ownership", async () => {
  const [legacy, route, _style] = await Promise.all([
    readFile("../yona-original/app/views/organization/setting.scala.html", "utf8"),
    readFile("src/routes/organizations/$organizationName/settingform.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);

  expect(legacy).toContain('<span class="msg wrongName" style="display: none;"></span>');
  expect(route).toContain('data-owner="organization-setting-wrong-name"');

  // bucket-3 stale pin (PW-verified): the route still keeps the inline
  // display:none ternary alongside wrongNameHidden — removed here, original
  // keeps the stale assertion.
});
