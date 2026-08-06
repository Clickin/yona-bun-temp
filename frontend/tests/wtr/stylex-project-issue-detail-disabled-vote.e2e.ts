import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail owns the disabled vote color in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const stylex = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");

  expect(template).toContain('class="ybtn-disabled" style="color: #777;"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-disabled-vote"');
  expect(route).toContain("styles.disabledVote");
  expect(route).toContain('ybtn-disabled ${disabledVoteStyleProps.className ?? ""}');
  expect(route).not.toContain('style={{ color: "#777" }}');
  expect(stylex).toContain("disabledVote:");
  expect(stylex).toContain("color: issueDetailColors.mutedText");
});
