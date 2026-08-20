import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue form owns static editor and selector declarations", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issueform.tsx", "utf8");
  const styles = readFileSync("src/app.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");

  expect(legacy).toContain('style="position:relative;overflow: visible;"');

  expect(route).toContain('textareaOwner="project-issue-form-editor-textarea"');

  expect(route).toContain('tabContentPaneOwner="project-issue-form-editor-tab-content"');
  expect(route).toContain('data-owner="project-issue-form-assignee-picker"');
  expect(route).toContain('data-owner="project-issue-form-milestone-picker"');
  expect(route).toContain('data-owner="project-issue-form-label-picker"');
});
