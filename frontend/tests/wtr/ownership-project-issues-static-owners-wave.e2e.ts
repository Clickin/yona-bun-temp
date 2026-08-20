import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const routeSource = new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url);
const styleSource = new URL("../src/app.css", import.meta.url);
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

test("project issues static owners use route-local Style", async () => {
  const [route, style, appCss, massUpdate, twoColumn, subtasks] = await Promise.all([
    readFile(routeSource, "utf8"),
    Promise.resolve(curatedAppCss()),
    Promise.resolve(curatedAppCss()),
    readFile(legacyMassUpdate, "utf8"),
    readFile(legacyTwoColumn, "utf8"),
    readFile(legacySubtasks, "utf8"),
  ]);
  expect(massUpdate).toContain("mass-update-form");
  expect(twoColumn).toContain("two-column-mode");
  expect(subtasks).toContain("toggle-show-subtasks");
  expect(route).not.toContain("massUpdateOptionButtonStyle");
  expect(route).not.toContain("TWO_COLUMN_MODE_POPOVER_STYLE");
  expect(route).not.toContain("SHOW_SUBTASKS_POPOVER_STYLE");
  expect(route).toContain('data-content-ready="false"');
  expect(route).toContain('data-content-ready={issuesReady ? "true" : "false"}');
  expect(route).toContain('data-owner="project-issues-page-wireframe"');
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
  expect(appCss).not.toContain(".search-box-wrap {");
  expect(route).toContain('className="issue-item-row"');
  expect(route).not.toContain('className="issue-list-page');
});
