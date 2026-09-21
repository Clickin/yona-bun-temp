import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail owns the disabled vote color in Style", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");

  const template = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");

  expect(template).toContain('class="ybtn-disabled" style="color: #777;"');
  expect(route).toContain('data-owner="project-issue-detail-disabled-vote"');
});
