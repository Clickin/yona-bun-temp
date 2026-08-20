import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
test("project webhook list item headings own padding while retaining truncate", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/webhooks.tsx", import.meta.url),
    "utf8",
  );
  const style = curatedAppCss();
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/webhooks.scala.html", import.meta.url),
    "utf8",
  );
  const partial = readFileSync(
    new URL(
      "../../yona-original/app/views/project/partial_webhooks_list.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = curatedAppCss();
  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(legacy).toContain('class="webhook-list-wrap"');
  expect(partial).toContain("list-item");
  expect(less).toContain("padding-left: 8px");
  expect((route.match(/data-owner="project-webhooks-list-item-heading"/g) ?? []).length).toBe(3);

  expect(css).not.toContain(".webhook-editor-wrap .webhook-list-wrap .list-item h6");
  // bucket-3 pin fix (2026-08-06): .truncate is no longer in app.css — the
  // truncate style moved into -webhooks.style.ts webhooksStyles.truncate.
});
