import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("pull request list row pointer uses conditional StyleX", async () => {
  const [route, style] = await Promise.all([
    readFile("src/routes/$ownerName/$projectName/pullRequests.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/-pull-requests.stylex.ts", "utf8"),
  ]);
  expect(route).toContain('data-stylex-owner="project-pullrequests-row"');
  expect(route).toContain("sx.rowPointer");
  expect(route).not.toContain("style={rowStyle}");
  expect(route).not.toContain('{ cursor: "pointer" }');
  expect(style).toContain('rowPointer: { cursor: "pointer" }');
});
