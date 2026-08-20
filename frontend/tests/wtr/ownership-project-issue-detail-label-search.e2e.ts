import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail label search input owns fixed width in Style", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const theme = curatedAppCss();
  const template = readFileSync(
    "../yona-original/app/views/issue/partial_select_label.scala.html",
    "utf8",
  );
  expect(template).toContain('data-toggle="select2"');
  expect(route).toContain('data-owner="project-issue-detail-label-search-input"');
});
