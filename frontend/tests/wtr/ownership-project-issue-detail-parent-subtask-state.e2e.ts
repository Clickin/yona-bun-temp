import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx";
const styleSource = "../src/app.css";
const legacyView = "../yona-original/app/views/issue/view.scala.html";
const legacyPartial = "../yona-original/app/views/issue/partial_view_childIssueList.scala.html";
const legacyStyles = "../yona-original/app/assets/stylesheets/less/_page.less";

test("issue detail parent subtask progress and state own static Style geometry", async () => {
  const [route, style, view, partial, less] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyView, "utf8"),
    readFile(legacyPartial, "utf8"),
    readFile(legacyStyles, "utf8"),
  ]);

  expect(view).toContain("@partial_view_childIssueList(issue, project)");
  expect(partial).toContain('class="issue-item parent-issue"');
  expect(partial).toContain('class="upload-progress');
  expect(partial).toContain('class="parent-issue-state @parentIssue.state.state"');
  expect(less).toContain(".parent-issue-state");
  expect(less).toContain("width: 30px;");
  expect(less).toContain("background-color: #8BC34A;");

  expect(route).toContain('data-owner="project-issue-detail-subtask-progress-shell"');
  expect(route).toContain('data-owner="project-issue-detail-subtask-progress-bar"');
  expect(route).toContain('data-owner="project-issue-detail-parent-state"');
});
