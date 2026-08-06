import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project header utility shell owns its route-local geometry", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/routes/$ownerName/$projectName/-project-home.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = await readFile(
    new URL("../../yona-original/app/views/project/header.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  expect(legacy).toContain('<div class="project-util-wrap">');
  expect(legacy).toContain('<ul class="project-util">');
  expect(less).toContain(".project-util-wrap");
  expect(less).toContain(".project-util");
  for (const owner of [
    "project-header-util-wrap",
    "project-header-util",
    "project-header-util-item",
    "project-header-util-icons",
  ]) {
    expect(source).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const name of ["projectUtilWrap", "projectUtil", "projectUtilItem", "projectUtilIcons"]) {
    expect(styles).toContain(`${name}:`);
  }
});
