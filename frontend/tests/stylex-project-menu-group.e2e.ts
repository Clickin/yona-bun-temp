import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project menu group owns route-local geometry", async () => {
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
  expect(legacy).toContain("project-menu-gruop");
  expect(less).toContain("project-menu-gruop");
  expect(source).toContain(
    "className={`${stylex.props(projectHomeStyles.projectMenuGroup).className} project-menu-nav project-menu-gruop`}",
  );
  expect(source).toContain('data-stylex-owner="project-menu-group"');
  expect(styles).toContain("projectMenuGroup:");
});
