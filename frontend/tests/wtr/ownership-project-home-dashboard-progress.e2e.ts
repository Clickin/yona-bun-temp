import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project home dashboard progress owns base geometry", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
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
  expect(route).toContain('data-owner="project-home-dashboard-progress"');

  expect(css).not.toContain(".project-overview-home .progress {");
});
