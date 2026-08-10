import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail danger buttons own route override while retaining generic paint", async () => {
  const route = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const style = readFileSync("../src/app.css", "utf8");
  const issueView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const commentDelete = readFileSync(
    "../yona-original/app/views/common/commentDeleteModal.scala.html",
    "utf8",
  );
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const css = readFileSync("../src/app.css", "utf8");

  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(issueView).toContain('class="ybtn ybtn-danger"');
  expect(commentDelete).toContain('class="ybtn ybtn-danger"');
  expect(less).toContain("&.ybtn-danger");
  expect((route.match(/data-owner="project-issue-detail-[^"]*danger-button"/g) ?? []).length).toBe(
    2,
  );

  expect(css).not.toContain(".issue-detail-page .ybtn-danger");
  expect(css).toContain(".ybtn-danger");
  // Only color/border are moved; no viewport-specific geometry is introduced.
  expect(style.match(/dangerButton:\s*\{([\s\S]*?)\n  \},/)?.[1] ?? "").not.toContain("width:");
});
