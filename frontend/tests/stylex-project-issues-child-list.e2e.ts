import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issues.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/issue/partial_view_child.scala.html",
  import.meta.url,
);

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
