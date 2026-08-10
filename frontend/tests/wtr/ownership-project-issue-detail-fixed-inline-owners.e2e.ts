import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail fixed inline owners use direct route Style", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const view = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const comment = readFileSync("../yona-original/app/views/common/commentForm.scala.html", "utf8");
  expect(view).toContain('class="bigdrop width100p"');
  expect(comment).toContain('class="comment disabled" disabled="disabled" style="cursor:text;"');
  expect(route).toContain('data-owner="issue-detail-assignee-input"');
  expect(route).toContain('data-owner="issue-detail-assignee-control"');
  expect(route).toContain('data-owner="issue-detail-disabled-comment-secondary"');

  // The hidden select2 offscreen input retains the inline width (legacy
  // positioning contract); the visible assignee control owns width via Style.
});
