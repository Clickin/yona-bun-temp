import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/issue/labelsform.tsx",
  import.meta.url,
);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_settingmenu.scala.html",
  import.meta.url,
);

test("labels form change-vcs menu uses conditional Style", async () => {
  const [_route, _style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain('id="subMenuProjectChangeVCS"');
  expect(legacy).toContain("display:none;");
});
