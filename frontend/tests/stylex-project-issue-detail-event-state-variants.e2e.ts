import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("issue detail event state variants use finite StyleX lookup", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  const legacy = readFileSync(
    new URL(
      "../../yona-original/app/views/issue/partial_event_timeline.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const legacyIndex = readFileSync(
    new URL(
      "../../yona-original/app/views/issue/partial_index_event_timeline.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
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
  expect(css).toContain(".issue-detail-page .comments .event.event-index");
  expect(css).toContain(".issue-detail-page .comments .event .state i");
});
