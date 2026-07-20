import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("issue detail timeline event base/date use route-local StyleX", async () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
    "utf8",
  );
  const styleSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacyEvent = readFileSync(
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
  const legacyLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const appCss = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

  expect(legacyEvent).toContain('class="event"');
  expect(legacyIndex).toContain('class="event event-index"');
  expect(legacyLess).toContain("padding: 2px 0 2px 55px;");
  expect(legacyLess).toContain("font-size: 1em;");
  expect(legacyLess).toContain("line-height: 30px;");
  expect(legacyLess).toContain("font-size: 11px;");
  expect(legacyLess).toContain("color: #aaa;");

  expect(routeSource.match(/data-stylex-owner="issue-detail-timeline-event"/g)).toHaveLength(9);
  expect(routeSource.match(/data-stylex-owner="issue-detail-timeline-event-date"/g)).toHaveLength(
    9,
  );
  expect(routeSource.match(/data-stylex-owner="issue-detail-timeline-event-state"/g)).toHaveLength(
    10,
  );
  expect(styleSource).toContain("timelineEvent: {");
  expect(styleSource).toContain('padding: "2px 0 2px 55px"');
  expect(styleSource).toContain('timelineEventDate: { color: "#aaa", fontSize: "11px" }');
  expect(styleSource).toContain("timelineEventState: {");
  expect(styleSource).toContain('width: "90px"');
  expect(routeSource).toContain("state ${newValue}");
  expect(appCss).not.toContain(".issue-detail-page .comments .event {");
  expect(appCss).not.toContain(".issue-detail-page .comments .event .date {");
  expect(appCss).not.toContain(".issue-detail-page .comments .event .state {");
  expect(appCss).not.toContain(".issue-detail-page .comments .event.event-index {");
  expect(appCss).not.toContain(".issue-detail-page .comments .event.event-index .state {");
  expect(appCss).toContain(".issue-detail-page .comments .event .state i {");
});
