import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

test("post detail disabled comment owns cursor in Style", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const comment = readFileSync("../yona-original/app/views/common/commentForm.scala.html", "utf8");
  expect(comment).toContain('class="comment disabled" disabled="disabled" style="cursor:text;"');
  expect(route).toContain('data-owner="post-detail-disabled-comment"');
});
