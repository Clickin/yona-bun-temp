import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);

const editorTemplate = new URL(
  "../../yona-original/app/views/common/editor.scala.html",
  import.meta.url,
);
const legacyPageStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const legacyUiStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  import.meta.url,
);

test("issueform editor toolbar notice owns scoped Style geometry and paint", async () => {
  const [route, _style, editor, pageLess, uiLess, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(editorTemplate, "utf8"),
    readFile(legacyPageStyles, "utf8"),
    readFile(legacyUiStyles, "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);

  expect(editor).toContain('<div class="task-list-button">');
  expect(editor).toContain('<div class="editor-notice-label"></div>');
  expect(pageLess).toContain(".task-list-button {");
  expect(pageLess).toContain("margin-top: 2px;");
  expect(uiLess).toContain(".editor-notice-label {");
  expect(uiLess).toContain("padding:4px 15px;");
  expect(uiLess).toContain(".saved {");
  expect(uiLess).toContain("border: 1px solid #8bc34a;");

  expect(route).toContain('checklistOwner="project-issue-form-task-list-button"');
  expect(route).toContain('noticeLabelOwner="project-issue-form-editor-notice"');
  expect(route).toContain('data-owner="project-issue-form-editor-notice-saved"');
  expect(css).not.toContain(".issue-form-page-wrap .task-list-button");
  expect(css).not.toContain(".issue-form-page-wrap .editor-notice-label");
});
