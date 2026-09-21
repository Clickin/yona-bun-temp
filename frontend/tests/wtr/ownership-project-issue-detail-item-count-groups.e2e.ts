import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx";
const styleSource = "../src/app.css";
const legacyCaller = "../yona-original/app/views/issue/partial_view_child.scala.html";
const legacyPair = "../yona-original/app/views/common/commentAndVoterPairDisplay.scala.html";
const legacyStyles = "../yona-original/app/assets/stylesheets/less/_page.less";
const appStyles = "../src/app.css";

test("issue detail child count groups own the exact route-scoped Style cluster", async () => {
  const [route, _style, caller, pair, less, css] = await Promise.all([
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

  expect(route).toContain('data-owner="project-issue-detail-item-count-group"');
  expect(route).toContain('data-owner="project-issue-detail-comment-count-link"');
  expect(route).toContain('data-owner="project-issue-detail-vote-count-link"');
  expect(route).toContain('data-owner="project-issue-detail-comment-count-icon"');
  expect(route).toContain('data-owner="project-issue-detail-vote-count-icon"');
  expect(route).toContain('data-owner="project-issue-detail-child-comment-vote-text"');
});
