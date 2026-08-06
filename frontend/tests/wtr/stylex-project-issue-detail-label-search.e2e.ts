import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail label search input owns fixed width in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/issue/partial_select_label.scala.html",
    "utf8",
  );
  expect(template).toContain('data-toggle="select2"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-label-search-input"');
  expect(route).not.toContain('style={{ width: "10px" }}');
  expect(theme).toContain('labelSearchInput: { width: "10px" }');
});
