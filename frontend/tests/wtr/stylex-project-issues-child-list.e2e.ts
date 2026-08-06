import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issues.tsx";
const styleSource = "../src/routes/$ownerName/$projectName/-issues.stylex.ts";
const legacySource = "../yona-original/app/views/issue/partial_view_child.scala.html";

test("project issue child list uses conditional StyleX visibility", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("child-issue");
  expect(route).toContain('data-stylex-owner="project-issues-child-list"');
  expect(route).toContain("childIssueListVisible");
  expect(route).not.toContain('style={childIssueListVisible ? { display: "block" } : undefined}');
  expect(style).toContain('childIssueListVisible: { display: "block" }');
});
