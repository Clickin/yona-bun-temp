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
  "../../yona-original/app/views/issue/partial_view_child.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

test("issue detail selected child owns conditional StyleX state", async () => {
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

  expect(style).toContain("selectedChild");
  expect(style).toContain('fontWeight: "bold"');
  expect(style).toContain('backgroundColor: "#f5f5f5"');
  expect(style).toContain('border: "1px solid #ddd"');
  expect(style).toContain('borderRadius: "4px"');
  expect(route).toContain(
    'isSelected ? "project-issue-detail-selected-child" : "project-issue-detail-subtask-item"',
  );
  expect(route).toContain('isSelected ? "selected-child" : ""');
});
