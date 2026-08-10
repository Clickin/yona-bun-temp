import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
test("issueform markdown tabs own route-scoped base and active paint", async () => {
  const route = readFileSync("../src/routes/$ownerName/$projectName/issueform.tsx", "utf8");
  const style =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");
  const css = readFileSync("../src/app.css", "utf8");
  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(legacy).toContain('class="nav nav-tabs nm small"');
  expect(legacy).toContain('data-mode="edit"');
  expect(legacy).toContain('data-mode="preview"');
  expect((route.match(/project-issue-form-markdown-tab-[a-z]+/g) ?? []).length).toBe(2);

  expect(css).not.toContain(
    ".issue-form-page-wrap .issue-markdown-editor > .nav-tabs > li > button",
  );
  expect(css).not.toContain(
    ".issue-form-page-wrap .issue-markdown-editor > .nav-tabs > li.active > button",
  );
  expect(css).toContain(".nav-tabs");
});
