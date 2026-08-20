import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_dashboard_issuesbyassignee.scala.html",
  import.meta.url,
);
const appCssSource = new URL("../src/app.css", import.meta.url);
test("project home assignee links use Style truncation owner", async () => {
  const [route, style, legacy, appCss] = await Promise.all([
    readFile(routeSource, "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(legacySource, "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(legacy).toContain("usf-group");
  expect(route).toContain('data-owner="project-home-assignee-link"');

  expect(appCss).not.toContain(".project-overview-home .overview-assignee .usf-group");
});
