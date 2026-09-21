import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);

const legacyEditor = new URL(
  "../../yona-original/app/views/common/editor.scala.html",
  import.meta.url,
);
const legacyIssue = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);

test("issueform editor shell owns route-scoped geometry in Style", async () => {
  const [route, _style, editor, issue, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(legacyEditor, "utf8"),
    readFile(legacyIssue, "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);

  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(editor).toContain('class="mt10"');
  expect(editor).toContain('class="nav nav-tabs nm small"');
  expect(editor).toContain('class="markdown-preview markdown-wrap @editorMode"');
  expect(issue).toContain("@common.editor");
  expect(issue).toContain("@common.fileUploader(ResourceType.ISSUE_POST, null)");

  // MarkdownEditor shell owners are passed as props (wrapper/tabList/preview)
  // and rendered as data-owner by the shared editor component.
  for (const propOwner of [
    'wrapperOwner="project-issue-form-markdown-editor"',
    'tabListOwner="project-issue-form-markdown-editor-tabs"',
    'previewOwner="project-issue-form-markdown-preview"',
  ]) {
    expect(route).toContain(propOwner);
  }
  for (const owner of [
    "project-issue-form-markdown-preview-video",
    "project-issue-form-editor-mention-options",
    "project-issue-form-mention-mirror",
    "project-issue-form-editor-mention-marker",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  expect(css).not.toContain(
    ".issue-form-page-wrap .issue-markdown-editor {\n  position: relative;",
  );
  expect(css).not.toContain(
    ".issue-form-page-wrap .issue-markdown-editor > .nav-tabs {\n  margin-bottom: 0;",
  );
  expect(css).not.toContain(
    ".issue-form-page-wrap #preview-body .markdown-preview {\n  min-height: 280px;",
  );
  expect(css).not.toContain(".issue-form-page-wrap #preview-body video {\n  max-width: 100%;");
  expect(css).not.toContain(
    ".issue-form-page-wrap .editor-mention-options {\n  right: auto;\n  width: min(420px, calc(100% - 16px));",
  );
  expect(css).not.toContain(
    ".issue-form-page-wrap .editor-mention-mirror {\n  position: absolute;",
  );
  expect(css).not.toContain(
    ".issue-form-page-wrap .editor-mention-marker {\n  display: inline-block;",
  );
  // Responsive max-width remains a separate fallback until its mobile owner is retired.
  expect(css).toContain(".issue-form-page-wrap .editor-mention-options {");
});
