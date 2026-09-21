import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issueform.tsx";
const styleSource = "../src/app.css";
const legacyCreate = "../yona-original/app/views/issue/create.scala.html";
const legacyAssignee = "../yona-original/app/views/issue/partial_assignee.scala.html";
const legacyOverride = "../yona-original/app/assets/stylesheets/less/_override.less";
const appStyles = "../src/app.css";

test("issueform select controls own route-scoped Style geometry", async () => {
  const [route, _style, create, assignee, override, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyCreate, "utf8"),
    readFile(legacyAssignee, "utf8"),
    readFile(legacyOverride, "utf8"),
    readFile(appStyles, "utf8"),
  ]);

  expect(create).toContain('class="span11"');
  expect(create).toContain("@partial_assignee(project, null)");
  expect(assignee).toContain('class="bigdrop"');
  expect(override).toContain(".select2-container-multi");
  expect(override).toContain(".select2-search-choice");

  for (const marker of [
    "project-issue-form-title-field",
    "project-issue-form-title-head-options",
    "project-issue-form-title-suggestion-category",
    "project-issue-form-assignee-dropdown-search",
    "project-issue-form-label-token",
    "project-issue-form-label-token-close",
  ]) {
    expect(route).toContain(marker);
  }

  for (const retiredSelector of [
    ".issue-form-page-wrap .issue-title-field",
    ".issue-form-page-wrap .title-head-options",
    ".issue-form-page-wrap .title-head-options > button small",
    ".issue-form-page-wrap .issue-assignee-dropdown-search",
    ".issue-form-page-wrap .issue-label-token",
    ".issue-form-page-wrap .issue-label-token .btn-transparent",
    ".issue-form-page-wrap .issue-label-trigger",
    ".issue-form-page-wrap .issue-assignee-selection",
    ".issue-form-page-wrap .issue-assignee-arrow",
    ".issue-form-page-wrap .issue-label-selection",
    ".issue-form-page-wrap .issue-label-color",
    ".issue-project-utility-menu",
  ]) {
    expect(css).not.toContain(`${retiredSelector} {`);
  }
  // Shared combobox geometry is still consumed by title, assignee, label,
  // project, and subtask controls, so its fallback remains intentionally.
  expect(css).toContain(".issue-form-page-wrap .issue-combobox-options {");
  expect(css).toContain(".issue-combobox-options {");
});
