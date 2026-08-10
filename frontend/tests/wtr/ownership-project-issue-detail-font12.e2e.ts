import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail child comment/vote text owns font size in Style", async () => {
  const route = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const style = readFileSync("../src/app.css", "utf8");
  const legacy = readFileSync(
    "../yona-original/app/views/issue/partial_view_child.scala.html",
    "utf8",
  );
  const parent = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const css = readFileSync("../src/app.css", "utf8");

  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(parent).toContain("partial_view_childIssueList");
  expect(legacy).toContain('class="font12 no-border-at-child"');
  expect(less).toContain(".font12 { font-size: 12px; }");
  expect(route).toContain('data-owner="project-issue-detail-child-comment-vote-text"');

  // The owner itself introduces no fixed geometry, so desktop/mobile layout remains legacy-responsive.
  expect(css).not.toContain(".issue-detail-page .font12");
});
