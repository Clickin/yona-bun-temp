import { expect, test, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const route = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/webhooks.tsx", import.meta.url),
  "utf8",
);
const style = curatedAppCss();
const css = curatedAppCss();
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
  expect(route).toContain('data-owner="project-webhooks-page"');

  expect(css).not.toContain(".webhook-editor-wrap .new-webhook-wrap");
  expect(css).not.toContain(".webhook-editor-wrap .webhook-list-wrap");
});
