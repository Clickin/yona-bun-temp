import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project menu count badge owns legacy geometry", async () => {
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
  expect(legacy).toContain("project-menu-count");
  expect(less).toContain(".project-menu-count");
  expect(source).toContain('data-stylex-owner="project-menu-count"');
  expect(styles).toContain("menuCount:");
  expect(source).toContain("CountBadge");
});
