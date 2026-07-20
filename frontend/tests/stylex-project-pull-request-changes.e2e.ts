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

test("pull request change commit hashes replace the legacy blue text consumer", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    "utf8",
  );
  const legacy = readFileSync("../yona-original/app/views/git/viewChanges.scala.html", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const variables = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );

  expect(legacy).toContain('class="blue-txt mr10 commit-hash"');
  expect(common).toContain(".blue-txt      { color:@blue;}");
  expect(variables).toContain("@blue   : #5DBBE0;");
  expect(route).not.toContain('className="blue-txt mr10 commit-hash"');
  expect(route).toContain('data-stylex-owner="pull-request-changes-commit-hash"');
  expect(route).toContain("styles.commitHash");
});
