import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issues.stylex.ts",
  import.meta.url,
);
const appCssSource = new URL("../src/app.css", import.meta.url);
const legacyMassUpdate = new URL(
  "../../yona-original/app/views/issue/partial_massupdate.scala.html",
  import.meta.url,
);
const legacyTwoColumn = new URL(
  "../../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
  import.meta.url,
);
const legacySubtasks = new URL(
  "../../yona-original/app/views/common/showSubtasksCheckbox.scala.html",
  import.meta.url,
);

test("project issues static owners use route-local StyleX", async () => {
  const [route, style, appCss, massUpdate, twoColumn, subtasks] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(appCssSource, "utf8"),
    readFile(legacyMassUpdate, "utf8"),
    readFile(legacyTwoColumn, "utf8"),
    readFile(legacySubtasks, "utf8"),
  ]);
  expect(massUpdate).toContain("mass-update-form");
  expect(twoColumn).toContain("two-column-mode");
  expect(subtasks).toContain("toggle-show-subtasks");
  for (const owner of [
    "massUpdateOptionButton",
    "selectedLabelSearchInput",
    "twoColumnPopover",
    "showSubtasksPopover",
  ]) {
    expect(route).toContain(`styles.${owner}`);
    expect(style).toContain(`${owner}:`);
  }
  expect(route).not.toContain("massUpdateOptionButtonStyle");
  expect(route).not.toContain("TWO_COLUMN_MODE_POPOVER_STYLE");
  expect(route).not.toContain("SHOW_SUBTASKS_POPOVER_STYLE");
  expect(appCss).not.toContain(".issue-list-page .post-list-wrap {");
  expect(appCss).toContain(".post-list-wrap {");
  expect(appCss).not.toContain(".issue-list-page .issue-item-row {");
  for (const selector of [
    ".issue-list-page .left-menu #search hr.hide-in-mobile {",
    ".issue-list-page .left-menu .search-bar {",
    ".issue-list-page .left-menu .search-bar .textbox {",
    ".issue-list-page .left-menu .search-bar .search-btn {",
    ".issue-list-page .left-menu .issue-option {",
    ".issue-list-page .left-menu .issue-option dt {",
    ".issue-list-page .left-menu .issue-option dd {",
    ".issue-list-page .left-menu .issue-option select {",
  ]) {
    expect(appCss).not.toContain(selector);
  }
  expect(appCss).toContain(".search-box-wrap {");
  expect(route).toContain('className="issue-item-row"');
  expect(route).not.toContain('className="issue-list-page');
});
