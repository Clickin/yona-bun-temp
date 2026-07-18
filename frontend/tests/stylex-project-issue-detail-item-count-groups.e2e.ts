import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
  import.meta.url,
);
const legacyCaller = new URL(
  "../../yona-original/app/views/issue/partial_view_child.scala.html",
  import.meta.url,
);
const legacyPair = new URL(
  "../../yona-original/app/views/common/commentAndVoterPairDisplay.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("issue detail child count groups own the exact route-scoped StyleX cluster", async () => {
  const [route, style, caller, pair, less, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyCaller, "utf8"),
    readFile(legacyPair, "utf8"),
    readFile(legacyStyles, "utf8"),
    readFile(appStyles, "utf8"),
  ]);

  expect(caller).toContain('<span class="font12 no-border-at-child">');
  expect(caller).toContain("@common.commentAndVoterPairDisplay(childIssue, parentIssue.project)");
  expect(pair).toContain('<span class="item-count-groups">');
  expect(less).toContain(".item-count-groups {");
  expect(less).toContain(".no-border-at-child");
  expect(less).toContain(".count-groups");
  expect(less).toContain("margin-left: -5px;");
  expect(css).not.toContain(".issue-detail-page .item-count-groups");
  expect(css).not.toContain(".issue-detail-page .no-border-at-child .item-count-groups");
  expect(css).toContain(".item-count-groups");

  for (const owner of [
    "itemCountGroup",
    "itemCountGroupNoBorder",
    "itemCountLinkComment",
    "itemCountLinkVote",
    "itemCountLinkOffset",
    "countGroup",
    "countGroupIcon",
    "countGroupIconFirst",
    "countGroupCount",
  ]) {
    expect(style).toContain(owner);
  }
  expect(route).toContain('data-stylex-owner="project-issue-detail-item-count-group"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-comment-count-link"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-vote-count-link"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-comment-count-icon"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-vote-count-icon"');
  expect(route).toContain('data-stylex-owner="project-issue-detail-child-comment-vote-text"');
  expect(route).toContain("styles.itemCountGroupNoBorder");
});
