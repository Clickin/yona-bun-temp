import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
test("issueform markdown tabs own route-scoped base and active paint", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-issueform.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/common/editor.scala.html", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(legacy).toContain('class="nav nav-tabs nm small"');
  expect(legacy).toContain('data-mode="edit"');
  expect(legacy).toContain('data-mode="preview"');
  expect((route.match(/data-stylex-owner="project-issue-form-markdown-tab-/g) ?? []).length).toBe(
    2,
  );
  expect(route).toContain("issueFormStyles.markdownTabActive");
  expect(style).toContain('minHeight: "29px"');
  expect(style).toContain('borderColor: "#ddd #ddd transparent"');
  expect(css).not.toContain(
    ".issue-form-page-wrap .issue-markdown-editor > .nav-tabs > li > button",
  );
  expect(css).not.toContain(
    ".issue-form-page-wrap .issue-markdown-editor > .nav-tabs > li.active > button",
  );
  expect(css).toContain(".nav-tabs");
});
