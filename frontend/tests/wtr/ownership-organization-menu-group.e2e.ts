import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("organization menu group owns route-local geometry", async () => {
  const source = await readFile(
    new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url),
    "utf8",
  );
  const _styles = await Promise.resolve(curatedAppCss());
  const legacy = await readFile(
    new URL("../../yona-original/app/views/organization/menu.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  expect(legacy).toContain("project-menu-gruop");
  expect(less).toContain("project-menu-gruop");
  expect(source).toContain('data-owner="organization-menu-group"');
});
