import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("organization header utility shell owns legacy geometry", async () => {
  const source = await readFile(
    new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/routes/organizations/-organization-home.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = await readFile(
    new URL("../../yona-original/app/views/organization/view.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  expect(legacy).toContain("organization");
  expect(less).toContain(".project-util-wrap");
  for (const owner of [
    "organization-header-util-wrap",
    "organization-header-util",
    "organization-header-util-item",
  ]) {
    expect(source).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const name of ["projectUtilWrap", "projectUtil", "projectUtilItem", "projectUtilIcons"]) {
    expect(styles).toContain(`${name}:`);
  }
});
