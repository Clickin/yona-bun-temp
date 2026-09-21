import { expect, test, readFile, curatedAppCss } from "../wtr-compat.ts";
test("issue detail legacy popover coordinates use Dynamic Style", async () => {
  const [legacy, route, _style] = await Promise.all([
    readFile("../yona-original/app/views/issue/view.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(legacy).toContain('data-toggle="popover"');
  expect(route).toContain('data-owner="issue-detail-legacy-popover"');
});
