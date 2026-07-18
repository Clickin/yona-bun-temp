import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("issue detail danger buttons own route override while retaining generic paint", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
    "utf8",
  );
  const issueView = readFileSync(
    new URL("../../yona-original/app/views/issue/view.scala.html", import.meta.url),
    "utf8",
  );
  const commentDelete = readFileSync(
    new URL("../../yona-original/app/views/common/commentDeleteModal.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(issueView).toContain('class="ybtn ybtn-danger"');
  expect(commentDelete).toContain('class="ybtn ybtn-danger"');
  expect(less).toContain("&.ybtn-danger");
  expect(
    (route.match(/data-stylex-owner="project-issue-detail-[^"]*danger-button"/g) ?? []).length,
  ).toBe(2);
  expect(route).toContain("styles.dangerButton");
  expect(style).toContain('color: "#b13427"');
  expect(style).toContain('borderColor: "#d98c82"');
  expect(css).not.toContain(".issue-detail-page .ybtn-danger");
  expect(css).toContain(".ybtn-danger");
  // Only color/border are moved; no viewport-specific geometry is introduced.
  expect(style.match(/dangerButton:\s*\{([\s\S]*?)\n  \},/)?.[1] ?? "").not.toContain("width:");
});
