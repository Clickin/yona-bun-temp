import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
test("project webhook list item headings own padding while retaining truncate", async () => {
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
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(legacy).toContain('class="webhook-list-wrap"');
  expect(partial).toContain("list-item");
  expect(less).toContain("padding-left: 8px");
  expect(
    (route.match(/data-stylex-owner="project-webhooks-list-item-heading"/g) ?? []).length,
  ).toBe(3);
  expect(route).toContain("webhooksStyles.listItemHeading");
  expect(style).toContain("listItemHeading");
  expect(css).not.toContain(".webhook-editor-wrap .webhook-list-wrap .list-item h6");
  // bucket-3 pin fix (2026-08-06): .truncate is no longer in app.css — the
  // truncate style moved into -webhooks.stylex.ts webhooksStyles.truncate.
  expect(style).toContain('textOverflow: "ellipsis"');
  expect(style).toContain('whiteSpace: "nowrap"');
});
