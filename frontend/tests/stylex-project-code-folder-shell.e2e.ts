import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
test("code folder shell uses StyleX", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL(
      "../src/routes/$ownerName/$projectName/code/$branch/-code-file.stylex.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/code/partial_view_folder.scala.html", import.meta.url),
    "utf8",
  );
  const legacyView = readFileSync(
    new URL("../../yona-original/app/views/code/view.scala.html", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  expect(legacy).toContain("listitem");
  expect(legacyView).toContain("code-viewer-wrap");
  for (const owner of [
    "project-code-folder-list-wrap",
    "project-code-folder-list-head",
    "project-code-folder-row",
  ])
    expect(route).toContain(owner);
  for (const token of ["folderListWrap", "folderRowFluid", "folderListHead"])
    expect(style).toContain(token);
  for (const selector of [
    ".code-viewer-wrap .list-wrap {",
    ".code-viewer-wrap .row-fluid {",
    ".code-viewer-wrap .listhead {",
  ])
    expect(css).not.toContain(selector);
  expect(css).toContain(".code-viewer-wrap .currentPath {");
});
