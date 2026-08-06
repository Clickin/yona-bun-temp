import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue form owns static editor and selector declarations", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issueform.tsx", "utf8");
  const styles = readFileSync("src/routes/$ownerName/$projectName/-issueform.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");

  expect(legacy).toContain('style="position:relative;overflow: visible;"');
  expect(route).not.toContain('style={{ width: "100%" }}');
  expect(route).not.toContain('style={{ display: "inline-block" }}');
  expect(route).toContain('textareaOwner="project-issue-form-editor-textarea"');
  expect(route).not.toContain("height: `${textareaContentHeight}px`");
  expect(styles).toContain('editorTabContent: { position: "relative", overflow: "visible" }');
  expect(styles).toContain("editorTextareaHeight: (height: string) => ({ height })");
  expect(styles).toContain('overflowWrap: "break-word"');
  expect(route).not.toContain('style={{ resize: "none" }}');
  expect(styles).toContain('resize: "none"');
  expect(styles).toContain('assigneePicker: { width: "100%" }');
  expect(styles).toContain('milestonePicker: { width: "100%" }');
  expect(styles).toContain('labelPicker: { display: "inline-block" }');
  expect(route).toContain('tabContentPaneOwner="project-issue-form-editor-tab-content"');
  expect(route).toContain('data-stylex-owner="project-issue-form-assignee-picker"');
  expect(route).toContain('data-stylex-owner="project-issue-form-milestone-picker"');
  expect(route).toContain('data-stylex-owner="project-issue-form-label-picker"');
});
