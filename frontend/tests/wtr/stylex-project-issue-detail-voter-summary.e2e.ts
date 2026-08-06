import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail voter summary owns legacy margin in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const comment = readFileSync(
    "../yona-original/app/views/issue/partial_comment.scala.html",
    "utf8",
  );
  expect(comment).toContain('style="margin-right: 2px;"');
  expect(route).toContain('data-stylex-owner="issue-detail-voter-summary"');
  expect(route).not.toContain('style={{ marginRight: "2px" }}');
  expect(theme).toContain('voterSummary: { marginRight: "2px" }');
});
