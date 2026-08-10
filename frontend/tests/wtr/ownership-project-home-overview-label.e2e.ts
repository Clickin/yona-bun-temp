import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "src/routes/$ownerName/$projectName.tsx";
const styleSource = "src/app.css";
const legacySource =
  "../yona-original/app/views/project/partial_dashboard_issuesbylabel.scala.html";

test("project overview labels use route Style geometry owners", async () => {
  const [route, legacy] = [readFileSync(routeSource, "utf8"), readFileSync(legacySource, "utf8")];
  expect(legacy).toContain("overview-label");
  expect(route).toContain('data-owner="project-home-overview-label"');
});
