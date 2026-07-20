import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issues.stylex.ts",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);
const legacyList = new URL(
  "../../yona-original/app/views/issue/partial_list.scala.html",
  import.meta.url,
);
const legacyDraftList = new URL(
  "../../yona-original/app/views/issue/partial_list_draft.scala.html",
  import.meta.url,
);
const legacyChildList = new URL(
  "../../yona-original/app/views/issue/partial_view_childIssueList.scala.html",
  import.meta.url,
);
const legacyChild = new URL(
  "../../yona-original/app/views/issue/partial_view_child.scala.html",
  import.meta.url,
);
const legacySubtask = new URL(
  "../../yona-original/app/views/issue/partial_list_subtask.scala.html",
  import.meta.url,
);

test("populated project issue rows own scoped StyleX geometry and states", async () => {
  const [route, style, css, legacy, legacyDraft, childList, child, subtask] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(appStyles, "utf8"),
    readFile(legacyList, "utf8"),
    readFile(legacyDraftList, "utf8"),
    readFile(legacyChildList, "utf8"),
    readFile(legacyChild, "utf8"),
    readFile(legacySubtask, "utf8"),
  ]);

  for (const source of [legacy, legacyDraft]) {
    expect(source).toContain('class="post-item title"');
    expect(source).toContain('class="title-wrap"');
    expect(source).toContain('class="post-id"');
  }
  expect(childList).toContain("partial_view_child");
  expect(child).toContain("child-issue-date");
  expect(subtask).toContain("subtask-progress");

  for (const owner of ["issuePostItem", "titleWrap", "postId", "subtaskProgress", "childDate"]) {
    expect(route).toContain(`styles.${owner}`);
    expect(style).toContain(`${owner}:`);
  }
  for (const marker of [
    "project-issues-post-item",
    "project-issues-title-wrap",
    "project-issues-post-id",
    "project-issues-subtask-progress",
    "project-issues-child-date",
  ]) {
    expect(route).toContain(`data-stylex-owner="${marker}"`);
  }
  expect(route).toContain("issuePostItemActive");
  expect(route).toContain("childDateVisible");
  expect(route).toContain("onMouseEnter");
  expect(route).toContain("onMouseLeave");

  for (const retiredSelector of [
    ".issue-list-page .post-item {",
    ".issue-list-page .post-item.active {",
    ".issue-list-page .post-item .title-wrap {",
    ".issue-list-page .post-item .title-wrap .post-id {",
    ".issue-list-page .for-subtask-progressbar {",
    ".issue-list-page .for-subtask-progressbar .subtask-progress {",
    ".issue-list-page .for-subtask-progressbar .upload-progress {",
    ".issue-list-page .for-subtask-progressbar .upload-progress.done-outline {",
    ".issue-list-page .for-subtask-progressbar .upload-progress.red-outline {",
    ".issue-list-page .for-subtask-progressbar .upload-progress .bar {",
    ".issue-list-page .for-subtask-progressbar .upload-progress .bar.done {",
    ".issue-list-page .for-subtask-progressbar .upload-progress .bar.red {",
    ".issue-list-page .for-subtask-progressbar .completion-ratio,",
    ".issue-list-page .child-issue .child-issue-date {",
    ".issue-list-page .issue-item-row:hover .child-issue-date {",
    ".issue-list-page .mass-update-form .btn-group {",
    ".issue-list-page .post-item .mass-update-check {",
    ".issue-list-page .post-item .avatar-wrap {",
    ".issue-list-page .post-item .title-wrap .title {",
    ".issue-list-page .post-item .infos {",
    ".issue-list-page .item-count-groups {",
    ".issue-list-page .child-issue-list {",
  ]) {
    expect(css).not.toContain(retiredSelector);
  }
});
