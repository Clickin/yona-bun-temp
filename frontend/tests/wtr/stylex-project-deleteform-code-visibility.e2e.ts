import { readFile } from "../wtr-compat.ts";

// Browser harness: fileURLToPath reduces URL objects to their pathname so
// readFile maps them through the fixture middleware.
const fileURLToPath = (u: URL) => u.pathname;

import { expect, test } from "../wtr-compat.ts";

const routeSource = fileURLToPath(
  new URL("../src/routes/$ownerName/$projectName/deleteform.tsx", import.meta.url),
);
const legacyDeleteSource = fileURLToPath(
  new URL("../../yona-original/app/views/project/delete.scala.html", import.meta.url),
);
const legacyMenuSource = fileURLToPath(
  new URL("../../yona-original/app/views/project/partial_settingmenu.scala.html", import.meta.url),
);

test("project delete form code menu uses conditional StyleX visibility", async () => {
  const [route, legacyDelete, legacyMenu] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacyDeleteSource, "utf8"),
    readFile(legacyMenuSource, "utf8"),
  ]);

  expect(legacyDelete).toContain("partial_settingmenu");
  expect(legacyMenu).toContain("subMenuProjectChangeVCS");
  expect(route).toContain('data-stylex-owner="project-delete-code-menu"');
  expect(route).toContain('codeMenuHidden: { display: "none" }');
  expect(route).not.toContain('style={showCode ? undefined : { display: "none" }}');
  expect(route).toContain("menuSetting.code");
});
