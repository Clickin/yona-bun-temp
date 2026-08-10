import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project watcher state owns legacy static geometry", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
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
  for (const token of ["watcher-count", "watch-on", "watch-btn"]) {
    expect(legacy).toContain(token);
    expect(less).toContain(token);
    expect(source).toContain(token);
  }
  expect(source).toContain('data-owner="project-header-watcher-count"');
  expect(source).toContain('data-owner="project-header-watch-button"');
});
