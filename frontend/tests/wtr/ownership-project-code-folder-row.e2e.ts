import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("code browser folder rows use route-local Style", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", import.meta.url),
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
  const css = curatedAppCss();
  expect(legacyView).toContain("code-viewer-wrap");
  expect(legacyFolder).toContain("listitem");
  // The legacy less nests .listitem inside .code-viewer-wrap (less nesting,
  // not a concatenated selector) — pin the nesting relationship.
  expect(less).toMatch(/\.code-viewer-wrap \{\n[\s\S]*?\.listitem \{/u);
  for (const owner of [
    "project-code-folder-row",
    "project-code-folder-filename",
    "project-code-folder-commit-message",
    "project-code-folder-commit-date",
  ])
    expect(route).toContain(owner);
  expect(css).not.toContain(".code-viewer-wrap .listitem {");
  expect(css).not.toContain(".code-viewer-wrap .listitem .filename {");
  expect(css).not.toContain(".code-viewer-wrap .listitem .commitMsg {");
  expect(css).not.toContain(".code-viewer-wrap .listitem .commitDate {");
  expect(css).toContain(".code-viewer-wrap span.dynatree-icon");
});
