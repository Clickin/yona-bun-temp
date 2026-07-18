import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_dashboard_issuesbymilestone.scala.html",
  import.meta.url,
);
test("project home overview static owners use StyleX", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(route).toContain('data-stylex-owner="project-home-overview-heading"');
  expect(route).toContain('data-stylex-owner="project-home-overview-empty"');
});
