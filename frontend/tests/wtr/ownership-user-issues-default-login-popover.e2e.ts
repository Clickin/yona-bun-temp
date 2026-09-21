import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/user/issues.tsx", import.meta.url);

const legacySource = new URL(
  "../../yona-original/app/views/common/mySeriesMenuTab.scala.html",
  import.meta.url,
);

test("user issues default-login popover uses static Style", async () => {
  const [route, _style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain('id="setDefaultLoginPage"');
  expect(route).toContain('data-owner="user-issues-default-login-popover"');
  expect(route).toContain("defaultLoginPagePopover");
  expect(route).not.toContain("SET_DEFAULT_LOGIN_PAGE_POPOVER_STYLE");
});
