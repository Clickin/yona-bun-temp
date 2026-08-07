import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/user/issues.tsx", import.meta.url);
const styleSource = new URL("../src/routes/user/-issues.stylex.ts", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/common/mySeriesMenuTab.scala.html",
  import.meta.url,
);

test("user issues default-login popover uses static StyleX", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain('id="setDefaultLoginPage"');
  expect(route).toContain('data-stylex-owner="user-issues-default-login-popover"');
  expect(route).toContain("defaultLoginPagePopover");
  expect(route).not.toContain("SET_DEFAULT_LOGIN_PAGE_POPOVER_STYLE");
  expect(style).toContain("defaultLoginPagePopover: {");
});
