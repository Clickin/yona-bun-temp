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
const legacyPartial = new URL(
  "../../yona-original/app/views/issue/partial_view_childIssueList.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

test("issue detail parent subtask progress and state own static StyleX geometry", async () => {
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

  expect(style).toContain("subtaskProgressShell");
  expect(style).toContain('display: "inline-block"');
  expect(style).toContain('width: "30px"');
  expect(style).toContain('marginTop: "3px"');
  expect(style).toContain("parentIssueState");
  expect(style).toContain('backgroundColor: "#8bc34a"');
  expect(style).toContain('backgroundColor: "#f68c52"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-subtask-progress-shell"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-subtask-progress-bar"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-parent-state"');
  expect(route).toContain("styles.subtaskProgressBar(`${percentage}%`)");
});
