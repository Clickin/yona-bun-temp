import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacyCreate = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const legacyAssignee = new URL(
  "../../yona-original/app/views/issue/partial_assignee.scala.html",
  import.meta.url,
);
const legacyOverride = new URL(
  "../../yona-original/app/assets/stylesheets/less/_override.less",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("issueform select controls own route-scoped StyleX geometry", async () => {
  const [route, style, create, assignee, override, css] = await Promise.all([
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

  for (const owner of [
    "issueTitleField",
    "titleHeadOptions",
    "titleHeadOptionsButtonSmall",
    "assigneeDropdownSearch",
    "issueLabelToken",
    "issueLabelTokenClose",
  ]) {
    expect(style).toContain(owner);
  }
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
