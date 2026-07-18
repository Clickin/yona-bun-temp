import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const route = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/webhooks.tsx", import.meta.url),
  "utf8",
);
const style = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/-webhooks.stylex.ts", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
const legacy = readFileSync(
  new URL("../../yona-original/app/views/project/webhooks.scala.html", import.meta.url),
  "utf8",
);
const less = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);

// legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.
test("project webhooks retires only dead wrapper fallbacks", () => {
  expect(legacy).toContain('class="new-webhook-wrap"');
  expect(legacy).toContain('class="webhook-list-wrap"');
  expect(less).toContain(".webhook-editor-wrap");
  expect(route).toContain('className="project-page-wrap webhook-editor-wrap"');
  expect(route).toContain('data-stylex-owner="project-webhooks-page"');
  expect(route).toContain("styles.form");
  expect(style).toContain("listItemHeading");

  expect(css).not.toContain(".webhook-editor-wrap .new-webhook-wrap");
  expect(css).not.toContain(".webhook-editor-wrap .webhook-list-wrap");
  expect(route).toContain("styles.listHead");
  expect(route).toContain("styles.listItem");
});
