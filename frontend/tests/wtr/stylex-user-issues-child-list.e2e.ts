import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("user issues owns the visible child-issue list state in StyleX", () => {
  const route = readFileSync("src/routes/user/issues.tsx", "utf8");
  const stylex = readFileSync("src/routes/user/-issues.stylex.ts", "utf8");
  const listTemplate = readFileSync(
    "../yona-original/app/views/issue/my_partial_list.scala.html",
    "utf8",
  );

  expect(listTemplate).toContain('<div class="child-issue-list hide">');
  expect(route).toContain('data-stylex-owner="user-issues-child-list-visible"');
  expect(route).toContain("issueStyles.childIssueListVisible");
  expect(route).not.toContain(
    'style={showSubtasksAlways || isChildListVisible ? { display: "block" } : undefined}',
  );
  expect(stylex).toContain('childIssueListVisible: { display: "block" }');
});
