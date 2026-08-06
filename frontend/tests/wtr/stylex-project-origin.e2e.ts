import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project fork origin owns legacy header geometry", async () => {
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
  for (const token of ["project-origin", "project-origin-title", "project-origin-name"]) {
    expect(legacy).toContain(token);
    expect(less).toContain(token);
    expect(source).toContain(token);
  }
  expect(source).toContain('data-stylex-owner="project-header-origin"');
  expect(source).toContain('data-stylex-owner="project-header-origin-title"');
  expect(source).toContain('data-stylex-owner="project-header-origin-name"');
  expect(styles).toContain("projectOrigin:");
  expect(styles).toContain("projectOriginTitle:");
  expect(styles).toContain("projectOriginName:");
});
