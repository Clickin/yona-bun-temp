import { expect, test } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

test("project labels list header uses colocated Style", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/issuelabels.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  expect(legacy).toContain("label-editor-wrap");
  expect(legacy).toContain("issue-label-list-wrap");
  expect(less).toContain(".label-editor-wrap");
  for (const owner of [
    "project-labels-list-head",
    "project-labels-list-category",
    "project-labels-list-name",
  ])
    expect(route).toContain(owner);

  expect(css).not.toContain(".label-editor-wrap .issue-label-list-wrap .list-head {");
  expect(css).not.toContain(".label-editor-wrap .issue-label-list-wrap .list-head .category {");
  expect(css).not.toContain(".label-editor-wrap .issue-label-list-wrap .list-head .name {");
  // bucket-3 pin fix (2026-08-06): src/app.css no longer carries ANY .list-head
  // rule — the header styles are fully colocated into labelsform.tsx Style
  // (the element keeps a literal `list-head` class for legacy hooks).
  expect(css).not.toContain(".list-head");
});
