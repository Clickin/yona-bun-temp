import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-project-home.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_dashboard_issuesbyassignee.scala.html",
  import.meta.url,
);
const appCssSource = new URL("../src/app.css", import.meta.url);
test("project home assignee links use StyleX truncation owner", async () => {
  const [route, style, legacy, appCss] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(appCssSource, "utf8"),
  ]);
  expect(legacy).toContain("usf-group");
  expect(route).toContain('data-stylex-owner="project-home-assignee-link"');
  expect(style).toContain("assigneeLink");
  expect(style).toContain('textOverflow: "ellipsis"');
  expect(appCss).not.toContain(".project-overview-home .overview-assignee .usf-group");
});
