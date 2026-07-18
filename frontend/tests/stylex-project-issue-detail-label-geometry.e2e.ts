import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("issue detail labels own static geometry while retaining dynamic color", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
    "utf8",
  );
  const selected = readFileSync(
    new URL(
      "../../yona-original/app/views/issue/partial_show_selected_label.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const child = readFileSync(
    new URL("../../yona-original/app/views/issue/partial_view_child.scala.html", import.meta.url),
    "utf8",
  );
  const timeline = readFileSync(
    new URL(
      "../../yona-original/app/views/issue/partial_event_timeline.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(selected).toContain('class="label issue-label active static"');
  expect(child).toContain('class="label issue-label list-label active twoColumeModeTarget"');
  expect(timeline).toContain("class='label issue-label'");
  expect(
    (route.match(/data-stylex-owner="project-issue-detail-label-geometry"/g) ?? []).length,
  ).toBe(4);
  expect(route).toContain("styles.labelGeometry");
  expect(route).toContain("styles.labelColor");
  expect(style).toContain('display: "inline-block"');
  expect(style).toContain('margin: "0 4px 4px 0"');
  expect(style).toContain('padding: "2px 6px"');
  expect(style).toContain('borderRadius: "3px"');
  const geometry = style.match(/labelGeometry:\s*\{([\s\S]*?)\n  \},/)?.[1] ?? "";
  expect(geometry).not.toContain("width:");
  expect(geometry).not.toContain("height:");
  expect(css).not.toContain(".issue-detail-page .issue-label");
  expect(css).toContain(".issue-label");
});
