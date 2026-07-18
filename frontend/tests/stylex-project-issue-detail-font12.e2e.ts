import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("issue detail child comment/vote text owns font size in StyleX", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/issue/partial_view_child.scala.html", import.meta.url),
    "utf8",
  );
  const parent = readFileSync(
    new URL("../../yona-original/app/views/issue/view.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(parent).toContain("partial_view_childIssueList");
  expect(legacy).toContain('class="font12 no-border-at-child"');
  expect(less).toContain(".font12 { font-size: 12px; }");
  expect(route).toContain('data-stylex-owner="project-issue-detail-child-comment-vote-text"');
  expect(route).toContain("styles.childCommentVoteText");
  expect(style).toMatch(/childCommentVoteText:\s*\{\s*fontSize: "12px",\s*\}/);
  // The owner itself introduces no fixed geometry, so desktop/mobile layout remains legacy-responsive.
  expect(css).not.toContain(".issue-detail-page .font12");
});
