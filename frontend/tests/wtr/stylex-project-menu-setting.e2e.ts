import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project menu setting owns route-local float", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/routes/$ownerName/$projectName/-project-home.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = await readFile(
    new URL("../../yona-original/app/views/projectMenu.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  expect(legacy).toContain("project-setting");
  expect(less).toContain(".project-setting");
  expect(source).toContain('data-stylex-owner="project-menu-setting"');
  expect(styles).toContain("projectSetting:");
});
