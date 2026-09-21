import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail secondary comment share-link reuses hidden Style owner", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");

  const comment = readFileSync(
    "../yona-original/app/views/issue/partial_comment.scala.html",
    "utf8",
  );
  expect(comment).toContain('class="share-link" style="display: none"');
  expect(route).toContain('data-owner="issue-detail-share-link-secondary"');
});
