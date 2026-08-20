import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail label control owns inline-block display in Style", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const theme = curatedAppCss();
  const template = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  expect(template).toContain("partial_show_selected_label");
  expect(route).toContain('data-owner="project-issue-detail-label-control"');
});
