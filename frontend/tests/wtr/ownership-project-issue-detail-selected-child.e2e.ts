import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx";
const styleSource = "../src/app.css";
const legacyView = "../yona-original/app/views/issue/view.scala.html";
const legacyPartial = "../yona-original/app/views/issue/partial_view_child.scala.html";
const legacyStyles = "../yona-original/app/assets/stylesheets/less/_page.less";

test("issue detail selected child owns conditional Style state", async () => {
  const [route, style, view, partial, less] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyView, "utf8"),
    readFile(legacyPartial, "utf8"),
    readFile(legacyStyles, "utf8"),
  ]);

  expect(view).toContain("@partial_view_childIssueList(issue, project)");
  expect(partial).toContain(
    'class="issue-item @if(childIssue.id == parentIssue.id){selected-child} child-issue"',
  );
  expect(less).toContain(".selected-child");
  expect(less).toContain("font-weight: bold;");
  expect(less).toContain("background-color: #F5F5F5;");
  expect(less).toContain("border-radius: 4px;");

  expect(route).toContain(
    'isSelected ? "project-issue-detail-selected-child" : "project-issue-detail-subtask-item"',
  );
  expect(route).toContain('isSelected ? "selected-child" : ""');
});
