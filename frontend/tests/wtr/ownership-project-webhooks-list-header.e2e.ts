import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
test("project webhook list owns header and item geometry in Style", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/webhooks.tsx", import.meta.url),
    "utf8",
  );
  const style = curatedAppCss();
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/webhooks.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = curatedAppCss();
  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(legacy).toContain('class="webhook-list-wrap"');
  expect(less).toContain(".webhook-list-wrap");
  expect(less).toContain("padding-left: 8px");
  expect(route).toContain('data-owner="project-webhooks-list-head"');

  // bucket-3 pin fix (2026-08-06): list-head/listHeadCell/listItem geometry
  // lives in the webhooks.tsx route styles; -webhooks.style.ts carries only the
  // listSurface theme var; app.css has NO webhook rules anymore.

  expect(css).not.toContain(".webhook-editor-wrap .webhook-list-wrap .list-head {");
  expect(css).not.toContain(".webhook-editor-wrap .webhook-list-wrap .list-item {");
  expect(css).not.toContain(".webhook-editor-wrap");
});
