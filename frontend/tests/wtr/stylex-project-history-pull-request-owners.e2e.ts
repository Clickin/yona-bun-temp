import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_dashboard_pullrequests.scala.html",
  import.meta.url,
);

test("project dashboard pull-request metadata uses static StyleX owners", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain('class="span3 num right-txt"');
  expect(legacy).toContain('class="right-txt mt5"');
  expect(legacy).toContain('style="color:#999;"');
  expect(legacy).toContain('style="margin-right:17px;"');
  expect(route).toContain('data-stylex-owner="project-history-pull-request-date"');
  expect(route).toContain('data-stylex-owner="project-history-pull-request-link"');
  expect(route).toContain('pullRequestDate: { color: "#999", textAlign: "right" }');
  expect(route).toContain('pullRequestLink: { marginRight: "17px", textAlign: "right" }');
  expect(route).not.toContain("span3 num right-txt");
  expect(route).not.toContain(
    "stylex.props(projectHistoryStyles.pullRequestLink).className} right-txt",
  );
  expect(route).not.toContain('style={{ color: "#999" }}');
  expect(route).not.toContain('style={{ marginRight: "17px" }}');
});
