import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail timeline event base/date use route-local Style", async () => {
  const routeSource = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );

  const legacyEvent = readFileSync(
    "../yona-original/app/views/issue/partial_event_timeline.scala.html",
    "utf8",
  );
  const legacyIndex = readFileSync(
    "../yona-original/app/views/issue/partial_index_event_timeline.scala.html",
    "utf8",
  );
  const legacyLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const appCss = readFileSync("../src/app.css", "utf8");

  expect(legacyEvent).toContain('class="event"');
  expect(legacyIndex).toContain('class="event event-index"');
  expect(legacyLess).toContain("padding: 2px 0 2px 55px;");
  expect(legacyLess).toContain("font-size: 1em;");
  expect(legacyLess).toContain("line-height: 30px;");
  expect(legacyLess).toContain("font-size: 11px;");
  expect(legacyLess).toContain("color: #aaa;");

  expect(routeSource.match(/data-owner="issue-detail-timeline-event"/g)).toHaveLength(9);
  expect(routeSource.match(/data-owner="issue-detail-timeline-event-date"/g)).toHaveLength(9);
  expect(routeSource.match(/data-owner="issue-detail-timeline-event-state"/g)).toHaveLength(10);

  expect(routeSource).toContain("state ${newValue}");
  expect(appCss).not.toContain(".issue-detail-page .comments .event {");
  expect(appCss).not.toContain(".issue-detail-page .comments .event .date {");
  expect(appCss).not.toContain(".issue-detail-page .comments .event .state {");
  expect(appCss).not.toContain(".issue-detail-page .comments .event.event-index {");
  expect(appCss).not.toContain(".issue-detail-page .comments .event.event-index .state {");
  expect(appCss).toContain(".issue-detail-page .comments .event .state i {");
});
