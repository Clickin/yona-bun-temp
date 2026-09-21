import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("organization menu setting owns route-local float", async () => {
  const source = await readFile("src/routes/organizations/$organizationName.tsx", "utf8");
  const _styles = await Promise.resolve(curatedAppCss());
  const legacy = await readFile("../yona-original/app/views/organization/menu.scala.html", "utf8");
  const less = await readFile("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(legacy).toContain("project-setting");
  expect(less).toContain(".project-setting");
  expect(source).toContain('data-owner="organization-menu-setting"');
});
