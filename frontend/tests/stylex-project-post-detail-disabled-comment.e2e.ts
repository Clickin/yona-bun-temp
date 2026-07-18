import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("post detail disabled comment owns cursor in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const comment = readFileSync("../yona-original/app/views/common/commentForm.scala.html", "utf8");
  expect(comment).toContain('class="comment disabled" disabled="disabled" style="cursor:text;"');
  expect(route).toContain('data-stylex-owner="post-detail-disabled-comment"');
  expect(route).not.toContain('style={{ cursor: "text" }}');
  expect(theme).toContain('disabledComment: { cursor: "text" }');
});
