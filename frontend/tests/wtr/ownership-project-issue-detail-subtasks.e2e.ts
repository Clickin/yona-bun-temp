import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx";
const styleSource = "../src/app.css";
const legacyView = "../yona-original/app/views/issue/view.scala.html";
const legacyList = "../yona-original/app/views/issue/partial_view_childIssueList.scala.html";
const legacyChild = "../yona-original/app/views/issue/partial_view_child.scala.html";
const legacyStyles = "../yona-original/app/assets/stylesheets/less/_page.less";
const appStyles = "../src/app.css";

test("issue detail subtasks own route-scoped geometry in Style", async () => {
  const [route, _style, view, list, child, less, css] = await Promise.all([
    readFile(routeSource),
    readFile(styleSource),
    readFile(legacyView),
    readFile(legacyList),
    readFile(legacyChild),
    readFile(legacyStyles),
    readFile(appStyles),
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

  expect(route).toContain('data-owner="project-issue-detail-subtasks"');
  expect(route).toContain('data-owner="project-issue-detail-parent-issue"');
  expect(route).toContain('data-owner="project-issue-detail-parent-issue-delimiter"');
  expect(route).toContain('"project-issue-detail-selected-child"');
  expect(route).toContain('"project-issue-detail-subtask-item"');
});
