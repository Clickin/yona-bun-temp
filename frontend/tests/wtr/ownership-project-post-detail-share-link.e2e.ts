import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("post detail share link hidden state is Style-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");

  const template = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  expect(template).toContain('class="share-link" style="display: none"');
  expect(route).toContain('data-owner="post-detail-share-link"');
});
