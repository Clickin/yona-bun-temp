import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("organization menu setting owns route-local float", async () => {
  const source = await readFile("src/routes/organizations/$organizationName.tsx", "utf8");
  const styles = await readFile("src/app.css", "utf8");
  const legacy = await readFile("../yona-original/app/views/organization/menu.scala.html", "utf8");
  const less = await readFile("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(legacy).toContain("project-setting");
  expect(less).toContain(".project-setting");
  expect(source).toContain('data-owner="organization-menu-setting"');
});
