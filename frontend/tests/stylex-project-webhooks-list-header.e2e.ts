import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
test("project webhook list owns header and item geometry in StyleX", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/webhooks.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-webhooks.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/webhooks.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(legacy).toContain('class="webhook-list-wrap"');
  expect(less).toContain(".webhook-list-wrap");
  expect(less).toContain("padding-left: 8px");
  expect(route).toContain('data-stylex-owner="project-webhooks-list-head"');
  expect(route).toContain("styles.listHeadCell");
  expect(route).toContain("styles.listItem");
  expect(style).toContain("backgroundColor: webhooksColors.listSurface");
  expect(style).toContain('borderWidth: "0 0 2px"');
  expect(style).toContain('lineHeight: "30px"');
  expect(style).toContain('borderBottom: "1px solid #ddd"');
  expect(css).not.toContain(".webhook-editor-wrap .webhook-list-wrap .list-head {");
  expect(css).not.toContain(".webhook-editor-wrap .webhook-list-wrap .list-item {");
  expect(css).toContain(".webhook-editor-wrap");
});
