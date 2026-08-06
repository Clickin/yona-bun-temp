import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("organization header utility shell owns legacy geometry", async () => {
  // Fixture paths as STRINGS (wave-9/10 gotcha: URL-object reads bypass the
  // .txt raw-suffix mapping and get esbuild-transformed).
  const source = await readFile("src/routes/organizations/$organizationName.tsx", "utf8");
  const styles = await readFile("src/routes/organizations/-organization-home.stylex.ts", "utf8");
  const legacy = await readFile("../yona-original/app/views/organization/view.scala.html", "utf8");
  const less = await readFile("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
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
