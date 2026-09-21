import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("post detail comment edit visibility is conditional Style-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");

  const template = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const comment = readFileSync("../yona-original/app/views/common/commentForm.scala.html", "utf8");
  expect(template).toContain("comment-body");
  expect(comment).toContain('common.editor("contents"');
  expect(route).toContain('data-owner="post-detail-comment-body"');
  expect(route).toContain('data-owner="post-detail-comment-editor"');
});
