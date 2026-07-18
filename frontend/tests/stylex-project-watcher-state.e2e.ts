import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project watcher state owns legacy static geometry", async () => {
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
  for (const token of ["watcher-count", "watch-on", "watch-btn"]) {
    expect(legacy).toContain(token);
    expect(less).toContain(token);
    expect(source).toContain(token);
  }
  expect(source).toContain('data-stylex-owner="project-header-watcher-count"');
  expect(source).toContain('data-stylex-owner="project-header-watch-button"');
  for (const name of ["watcherCount", "watcherOn", "watchButton"]) {
    expect(styles).toContain(`${name}:`);
  }
});
