import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("pull-request changes owns the comment-delete modal display in Style", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    "utf8",
  );
  const style = readFileSync("src/app.css", "utf8");
  const viewChanges = readFileSync("../yona-original/app/views/git/viewChanges.scala.html", "utf8");
  const deletePartial = readFileSync(
    "../yona-original/app/views/common/commentDeleteModal.scala.html",
    "utf8",
  );

  expect(viewChanges).toContain('@common.commentDeleteModal("#changes")');
  expect(deletePartial).toContain('id="comment-delete-modal" class="modal hide fade"');
  expect(route).toContain('data-owner="pull-request-changes-comment-delete-modal"');
});
