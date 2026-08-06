import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("milestone detail issue filter hides rows with conditional StyleX", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/milestone/view.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/milestone/-milestone-detail.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('data-toggle="item-search"');
  expect(legacy).toContain('data-items="issue-item"');
  expect(route).toContain('data-stylex-owner="milestone-detail-issue-row"');
  expect(route).toContain("styles.issueRowHidden");
  expect(route).not.toContain('style={hidden ? { display: "none" } : undefined}');
  expect(style).toContain('issueRowHidden: { display: "none" }');
});
