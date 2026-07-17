import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("records pull request changes owner boundary", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    "utf8",
  );
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-pull-request-changes.stylex.ts",
    "utf8",
  );
  expect(route).toContain('data-stylex-owner="pull-request-changes-diffs"');
  expect(route).toContain('data-stylex-owner="pull-request-changes-author"');
  expect(theme).toContain("pullRequestChangesColors");
  expect(readFileSync("../yona-original/app/views/git/partial_list.scala.html", "utf8")).toContain(
    "post-list-wrap",
  );
});
