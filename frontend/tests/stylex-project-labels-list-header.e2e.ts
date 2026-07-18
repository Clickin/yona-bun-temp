import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("project labels list header uses colocated StyleX", async () => {
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
  expect(route).toContain("backgroundColor: labelsFormColors.listSurface");
  expect(route).toContain('paddingRight: "18px"');
  expect(route).toContain('paddingLeft: "8px"');
  expect(css).not.toContain(".label-editor-wrap .issue-label-list-wrap .list-head {");
  expect(css).not.toContain(".label-editor-wrap .issue-label-list-wrap .list-head .category {");
  expect(css).not.toContain(".label-editor-wrap .issue-label-list-wrap .list-head .name {");
  expect(css).toContain(".list-head");
});
