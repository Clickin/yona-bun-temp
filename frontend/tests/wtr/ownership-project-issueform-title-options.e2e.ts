import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issueform.tsx";
const styleSource = "../src/app.css";
const legacySource = "../yona-original/app/views/issue/create.scala.html";
const legacyTitleHead =
  "../yona-original/public/javascripts/common/yona.TitleHeadAutoCompletion.js";
const appStyles = "../src/app.css";

test("issueform title suggestions own option and category Style states", async () => {
  const [route, style, legacy, titleHead, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(legacyTitleHead, "utf8"),
    readFile(appStyles, "utf8"),
  ]);

  expect(legacy).toContain('id="title"');
  expect(titleHead).toContain("displayTpl");
  expect(titleHead).toContain("<small style='color: #${labelColor}'>${category}</small>");
  expect(route).toContain('data-owner="project-issue-form-title-suggestion-option"');
  expect(route).toContain('data-owner="project-issue-form-title-suggestion-category"');
  expect(route).toContain('data-owner="project-issue-form-editor-mention-option"');
  expect(route).toContain('data-owner="project-issue-form-editor-mention-option-detail"');

  expect(route).toContain("aria-selected={index === activeIndex}");
  for (const declaration of []) {
    expect(style).toContain(declaration);
  }

  // The shared combobox container remains for project, subtask, assignee,
  // and label consumers; all route-owned option buttons/details are colocated in Style.
  expect(css).toContain(".issue-form-page-wrap .issue-combobox-options {");
  for (const retiredSelector of [
    ".issue-form-page-wrap .issue-combobox-options > button {",
    ".issue-form-page-wrap .issue-combobox-options > button:hover,",
    ".issue-form-page-wrap .issue-combobox-options > button small {",
    ".issue-form-page-wrap .issue-combobox-options > button:hover small,",
  ]) {
    expect(css).not.toContain(retiredSelector);
  }
});
