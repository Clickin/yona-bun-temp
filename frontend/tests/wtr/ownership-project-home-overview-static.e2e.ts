import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "src/routes/$ownerName/$projectName.tsx";
const legacySource =
  "../yona-original/app/views/project/partial_dashboard_issuesbymilestone.scala.html";

test("project home overview static owners use Style", async () => {
  const [route, legacy] = [readFileSync(routeSource, "utf8"), readFileSync(legacySource, "utf8")];
  expect(route).toContain('data-owner="project-home-overview-heading"');
  expect(route).toContain('data-owner="project-home-overview-empty"');
  expect(route).toContain('data-owner="project-home-overview-empty-message"');
  expect(route).toContain('data-owner="project-home-overview-number"');
  expect(legacy).toContain('class="span3 num"');
});
