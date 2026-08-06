import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail event state variants use finite StyleX lookup", async () => {
  const route = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const style = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const css = readFileSync("../src/app.css", "utf8");
  const legacy = readFileSync(
    "../yona-original/app/views/issue/partial_event_timeline.scala.html",
    "utf8",
  );
  const legacyIndex = readFileSync(
    "../yona-original/app/views/issue/partial_index_event_timeline.scala.html",
    "utf8",
  );
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  for (const token of [
    "open",
    "closed",
    "changed",
    "rejected",
    "conflict",
    "resolved",
    "sharer-added",
    "label-added",
    "sharer-deleted",
    "label-deleted",
  ]) {
    expect(route).toContain(token);
    expect(less).toContain(token);
  }
  expect(legacy).toContain("event");
  expect(legacyIndex).toContain("event-index");
  expect(route.match(/data-stylex-owner="issue-detail-timeline-event-state"/g)).toHaveLength(10);
  expect(route).toContain("timelineEventStateVariant");
  for (const token of [
    "timelineStateOpen",
    "timelineStateClosed",
    "timelineStateChanged",
    "timelineStateRejected",
    "timelineStateConflict",
    "timelineStateResolved",
    "timelineStateAdded",
    "timelineStateDeleted",
  ])
    expect(style).toContain(token);
  for (const selector of [
    ".state.open",
    ".state.closed",
    ".state.changed",
    ".state.rejected",
    ".state.conflict",
    ".state.resolved",
    ".state.sharer-added",
    ".state.sharer-deleted",
  ])
    expect(css).not.toContain(`.issue-detail-page .comments .event ${selector}`);
  expect(css).not.toContain(".issue-detail-page .comments .event.event-index {");
  expect(css).not.toContain(".issue-detail-page .comments .event.event-index .state {");
  expect(css).toContain(".issue-detail-page .comments .event .state i");
});
