import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("organization menu setting owns route-local float", async () => {
  const source = await readFile(
    new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/routes/organizations/-organization-home.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = await readFile(
    new URL("../../yona-original/app/views/organization/menu.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  expect(legacy).toContain("project-setting");
  expect(less).toContain(".project-setting");
  expect(source).toContain('data-stylex-owner="organization-menu-setting"');
  expect(styles).toContain("projectSetting:");
});
