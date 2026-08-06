import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail labels own static geometry while retaining dynamic color", async () => {
  const route = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const style = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const selected = readFileSync(
    "../yona-original/app/views/issue/partial_show_selected_label.scala.html",
    "utf8",
  );
  const child = readFileSync(
    "../yona-original/app/views/issue/partial_view_child.scala.html",
    "utf8",
  );
  const timeline = readFileSync(
    "../yona-original/app/views/issue/partial_event_timeline.scala.html",
    "utf8",
  );
  const css = readFileSync("../src/app.css", "utf8");
  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(selected).toContain('class="label issue-label active static"');
  expect(child).toContain('class="label issue-label list-label active twoColumeModeTarget"');
  expect(timeline).toContain("class='label issue-label'");
  expect(
    (route.match(/data-stylex-owner="project-issue-detail-label-geometry"/g) ?? []).length,
  ).toBe(4);
  expect(route).toContain("styles.labelGeometry");
  expect(route).toContain("color={stringField(label.color)}");
  const sharedLabelComponent = readFileSync("../src/components/issue-label.tsx", "utf8");
  const sharedPaintContract = readFileSync("../src/legacy-issue-label-style.ts", "utf8");
  // Label paint moved to the shared IssueLabel contract (formerly styles.labelColor).
  expect(sharedLabelComponent).toContain("issueLabelStyle(color)");
  expect(sharedLabelComponent).toContain(
    "data-label-id={labelId == null ? undefined : String(labelId)}",
  );
  expect(sharedPaintContract).toContain("backgroundColor: color");
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
