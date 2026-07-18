import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("issue detail fixed inline owners use direct route StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const view = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const comment = readFileSync("../yona-original/app/views/common/commentForm.scala.html", "utf8");
  expect(view).toContain('class="bigdrop width100p"');
  expect(comment).toContain('class="comment disabled" disabled="disabled" style="cursor:text;"');
  expect(route).toContain('data-stylex-owner="issue-detail-assignee-input"');
  expect(route).toContain('data-stylex-owner="issue-detail-assignee-control"');
  expect(route).toContain('data-stylex-owner="issue-detail-disabled-comment-secondary"');
  expect(route).toContain('fullWidth: { width: "100%" }');
  expect(route).toContain('disabledComment: { cursor: "text" }');
  expect(route).not.toContain('style={{ width: "100%" }}');
  expect(route).not.toContain('style={{ cursor: "text" }}');
});
