import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacyEditor = new URL(
  "../../yona-original/app/views/common/editor.scala.html",
  import.meta.url,
);
const legacyIssue = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("issueform editor shell keeps only exact legacy geometry owners", async () => {
  const [route, style, editor, issue, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(legacyEditor, "utf8"),
    readFile(legacyIssue, "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);

  // legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.
  expect(editor).toContain('class="tab-content" style="position:relative;overflow: visible;"');
  expect(issue).toContain('<dd style="position: relative;">');

  expect(route).toContain('data-owner="project-issue-form-editor"');
  expect(route).toContain('tabContentPaneOwner="project-issue-form-editor-tab-content"');

  expect(css).not.toContain(".issue-form-page-wrap .issue-editor-cell {\n  position: relative;");
  expect(css).not.toContain(
    ".issue-form-page-wrap .issue-editor-tab-content {\n  position: relative;",
  );
  // These selectors have no exact legacy declaration; they remain fallback boundaries.
  expect(css).toContain(".issue-form-page-wrap .right-menu {");
  expect(css).toContain(".issue-form-page-wrap .issue-combobox,");
  expect(route).toContain('data-owner="project-issue-form-right-menu"');
  expect(route).not.toContain('data-owner="project-issue-form-title-head-combobox"');
});
