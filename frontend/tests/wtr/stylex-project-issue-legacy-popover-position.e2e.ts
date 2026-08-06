import { expect, test, readFile } from "../wtr-compat.ts";

test("issue detail legacy popover coordinates use Dynamic StyleX", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/issue/view.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('data-toggle="popover"');
  expect(route).toContain('data-stylex-owner="issue-detail-legacy-popover"');
  expect(route).toContain("styles.legacyPopoverPosition");
  expect(route).not.toContain("const popoverStyle: CSSProperties");
  expect(route).not.toContain("style={popoverStyle}");
  expect(style).toContain("legacyPopoverPosition: (left: number, top: number)");
});
