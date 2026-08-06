import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/-home-route-screen.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/common/usermenu.scala.html",
  import.meta.url,
);

test("root user-menu dropdown colors use scoped StyleX owners", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("gnb-usermenu-dropdown");
  expect(route).toContain('data-stylex-owner="root-usermenu-sidebar-dropdown"');
  expect(route).toContain('data-stylex-owner="root-usermenu-create-dropdown"');
  expect(route).toContain("createMenuMargin");
  expect(route).not.toContain("style={{ color: homeColors.navigationDropdownText }}");
  expect(route).not.toContain(
    'style={{ color: homeColors.navigationDropdownText, marginLeft: "10px" }}',
  );
});
