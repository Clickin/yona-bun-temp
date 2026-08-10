import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project menu shell owns route-local geometry", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(new URL("../src/app.css", import.meta.url), "utf8");
  const legacy = await readFile(
    new URL("../../yona-original/app/views/projectMenu.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  for (const token of ["project-menu-outer", "project-menu-inner"]) {
    expect(legacy).toContain(token);
    expect(less).toContain(token);
    expect(source).toContain(token);
  }
  expect(source).toContain('data-owner="project-menu-outer"');
  expect(source).toContain('data-owner="project-menu-inner"');
});
