import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("project home dashboard progress owns base geometry", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-project-home.stylex.ts", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  const assignee = readFileSync(
    new URL(
      "../../yona-original/app/views/project/partial_dashboard_issuesbyassignee.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const milestone = readFileSync(
    new URL(
      "../../yona-original/app/views/project/partial_dashboard_issuesbymilestone.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  expect(assignee).toContain('class="progress progress-warning');
  expect(milestone).toContain('class="progress progress-success');
  expect(route).toContain('data-stylex-owner="project-home-dashboard-progress"');
  expect(style).toContain('dashboardProgress: { height: "7px", marginTop: "7px", width: "100px" }');
  expect(css).not.toContain(".project-overview-home .progress {");
});
