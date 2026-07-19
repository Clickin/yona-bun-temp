import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const legacyTitleHead = new URL(
  "../../yona-original/public/javascripts/common/yona.TitleHeadAutoCompletion.js",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("issueform title suggestions own option and category StyleX states", async () => {
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
  expect(route).toContain('data-stylex-owner="project-issue-form-title-suggestion-option"');
  expect(route).toContain('data-stylex-owner="project-issue-form-title-suggestion-category"');
  expect(route).toContain('data-stylex-owner="project-issue-form-editor-mention-option"');
  expect(route).toContain('data-stylex-owner="project-issue-form-editor-mention-option-detail"');
  expect(route).toContain("issueFormStyles.issueComboboxOptionButtonActive");
  expect(route).toContain("issueFormStyles.issueComboboxOptionSmallActive");
  expect(route).toContain("aria-selected={index === activeIndex}");
  expect(style).toContain("issueComboboxOptionButton");
  expect(style).toContain("issueComboboxOptionButtonActive");
  expect(style).toContain("issueComboboxOptionSmall");
  expect(style).toContain("issueComboboxOptionSmallActive");
  for (const declaration of [
    'display: "flex"',
    'backgroundColor: "#51aacc"',
    'fontSize: "11px"',
    'color: "#fff"',
  ]) {
    expect(style).toContain(declaration);
  }

  // The shared combobox container remains for project, subtask, assignee,
  // and label consumers; all route-owned option buttons/details are colocated in StyleX.
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
