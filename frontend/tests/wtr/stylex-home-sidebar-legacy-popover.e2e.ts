import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/-home-route-screen.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/common/usermenu.scala.html",
  import.meta.url,
);
test("legacy home sidebar popover uses static StyleX", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(route).toContain(
    'data-stylex-part={ownsPopoverPresentation ? undefined : "home-sidebar-legacy-popover"}',
  );
  expect(route).toContain("legacyPopover");
  expect(route).not.toContain("HOME_SIDEBAR_POPOVER_STYLE");
});
