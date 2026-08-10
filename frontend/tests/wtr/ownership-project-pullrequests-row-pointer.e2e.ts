import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("pull request list row pointer uses conditional Style", async () => {
  const [route, style] = await Promise.all([
    readFile("src/routes/$ownerName/$projectName/pullRequests.tsx", "utf8"),
    readFile("src/app.css", "utf8"),
  ]);
  expect(route).toContain('data-owner="project-pullrequests-row"');
  expect(route).not.toContain("style={rowStyle}");
});
