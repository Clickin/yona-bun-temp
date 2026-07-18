import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("post detail comment edit visibility is conditional StyleX-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  const comment = readFileSync("../yona-original/app/views/common/commentForm.scala.html", "utf8");
  expect(template).toContain("comment-body");
  expect(comment).toContain('common.editor("contents"');
  expect(route).toContain('data-stylex-owner="post-detail-comment-body"');
  expect(route).toContain('data-stylex-owner="post-detail-comment-editor"');
  expect(route).not.toContain('style={isEditing ? { display: "none" } : undefined}');
  expect(route).not.toContain('style={isEditing ? { display: "block" } : undefined}');
  expect(theme).toContain('commentBodyHidden: { display: "none" }');
  expect(theme).toContain('commentEditorVisible: { display: "block" }');
});
