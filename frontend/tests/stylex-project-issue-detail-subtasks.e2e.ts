import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
  import.meta.url,
);
const legacyView = new URL("../../yona-original/app/views/issue/view.scala.html", import.meta.url);
const legacyList = new URL(
  "../../yona-original/app/views/issue/partial_view_childIssueList.scala.html",
  import.meta.url,
);
const legacyChild = new URL(
  "../../yona-original/app/views/issue/partial_view_child.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("issue detail subtasks own route-scoped geometry in StyleX", async () => {
  const [route, style, view, list, child, less, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyView, "utf8"),
    readFile(legacyList, "utf8"),
    readFile(legacyChild, "utf8"),
    readFile(legacyStyles, "utf8"),
    readFile(appStyles, "utf8"),
  ]);

  expect(view).toContain('<div class="subtasks">');
  expect(list).toContain('<div class="issue-item parent-issue">');
  expect(list).toContain('<hr class="parent-issue-delimeter"/>');
  expect(child).toContain(
    '<div class="issue-item @if(childIssue.id == parentIssue.id){selected-child} child-issue">',
  );
  expect(less).toContain(".subtasks {");
  expect(less).toContain("margin-top: 40px;");
  expect(less).toContain("margin-bottom: 15px;");
  expect(less).toContain("padding: 0 3px;");
  expect(less).toContain("border-top: dashed 1px #ddd;");

  expect(css).not.toContain(".issue-detail-page .subtasks");
  expect(css).toContain(".board-body .author-info");

  expect(style).toContain("subtasks");
  expect(style).toContain('marginTop: "40px"');
  expect(style).toContain('marginBottom: "15px"');
  expect(style).toContain("subtaskItem");
  expect(style).toContain('padding: "0 3px"');
  expect(style).toContain("parentIssue");
  expect(style).toContain('fontSize: "16px"');
  expect(style).toContain("parentIssueDelimiter");
  expect(style).toContain('borderTop: "1px dashed #ddd"');

  expect(route).toContain('data-stylex-owner="project-issue-detail-subtasks"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-parent-issue"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-parent-issue-delimiter"');
  expect(route).toContain('"project-issue-detail-selected-child"');
  expect(route).toContain('"project-issue-detail-subtask-item"');
});
