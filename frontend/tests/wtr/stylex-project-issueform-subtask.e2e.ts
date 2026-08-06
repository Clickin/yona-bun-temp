import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issueform subtask option controls own route-scoped StyleX state", async () => {
  const route = readFileSync("../src/routes/$ownerName/$projectName/issueform.tsx", "utf8");
  const style = readFileSync("../src/routes/$ownerName/$projectName/-issueform.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/issue/create.scala.html", "utf8");
  const partial = readFileSync(
    "../yona-original/app/views/issue/partial_select_subtask.scala.html",
    "utf8",
  );
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const css = readFileSync("../src/app.css", "utf8");

  // legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.
  expect(legacy).toContain('<div class="span1 subtask-message">');
  expect(partial).toContain('<div class="subtask-wrap @if(showOption){show}">');
  expect(partial).toContain('id="targetProjectId"');
  expect(partial).toContain('id="parentId"');
  expect(less).toContain(".subtask-message {");
  expect(less).toContain(".subtask-wrap {");

  expect(route).toContain('data-stylex-owner="project-issue-form-subtask-message"');
  expect(route).toContain('data-stylex-owner="project-issue-form-subtask-parent-control"');
  expect(route).toContain("isCrossProject && issueFormStyles.subtaskParentControlHidden");
  expect(style).toContain("subtaskMessage");
  expect(style).toContain("subtaskParentControlHidden");
  for (const declaration of [
    'position: "relative"',
    "zIndex: 1",
    'boxSizing: "border-box"',
    'minHeight: "30px"',
    'fontFamily: "inherit"',
    'backgroundColor: "#fff"',
    'borderRadius: "0"',
  ]) {
    expect(style).toContain(declaration);
  }

  expect(css).not.toContain(".issue-form-page-wrap .subtask-message {");
  expect(css).not.toContain(".issue-form-page-wrap .subtask-parent-control[hidden]");
  expect(css).toContain(".frm-wrap .subtask-message");
  expect(css).toContain(".frm-wrap .subtask-wrap");
});
