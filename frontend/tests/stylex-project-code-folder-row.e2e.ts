import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("code browser folder rows use route-local StyleX", async () => {
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
  const legacyView = readFileSync(
    new URL("../../yona-original/app/views/code/view.scala.html", import.meta.url),
    "utf8",
  );
  const legacyFolder = readFileSync(
    new URL("../../yona-original/app/views/code/partial_view_folder.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  expect(legacyView).toContain("code-viewer-wrap");
  expect(legacyFolder).toContain("listitem");
  expect(less).toContain(".code-viewer-wrap .listitem");
  for (const owner of [
    "project-code-folder-row",
    "project-code-folder-filename",
    "project-code-folder-commit-message",
    "project-code-folder-commit-date",
  ])
    expect(route).toContain(owner);
  for (const token of ["folderRow", "folderFilename", "folderCommitMessage", "folderCommitDate"])
    expect(style).toContain(token);
  expect(css).not.toContain(".code-viewer-wrap .listitem {");
  expect(css).not.toContain(".code-viewer-wrap .listitem .filename {");
  expect(css).not.toContain(".code-viewer-wrap .listitem .commitMsg {");
  expect(css).not.toContain(".code-viewer-wrap .listitem .commitDate {");
  expect(css).toContain(".code-viewer-wrap span.dynatree-icon");
});
