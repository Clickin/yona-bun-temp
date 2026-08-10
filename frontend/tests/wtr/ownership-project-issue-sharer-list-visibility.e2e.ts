import { expect, test, readFile } from "../wtr-compat.ts";

test("issue detail sharer list visibility uses conditional Style", async () => {
  const [legacy, route] = await Promise.all([
    readFile("../yona-original/app/views/issue/view.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8"),
  ]);
  expect(legacy).toContain("$('.sharer-list').show()");
  expect(route).toContain('data-owner="issue-detail-sharer-list"');

  expect(route).not.toContain("style={sharerListStyle}");
});
