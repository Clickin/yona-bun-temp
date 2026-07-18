import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_history.scala.html",
  import.meta.url,
);

test("project history activity geometry has route StyleX owners", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("activity-stream");
  expect(route).toContain('data-stylex-owner="project-history-activity-streams"');
  expect(route).toContain('data-stylex-owner="project-history-activity-item"');
  expect(route).toContain("activityItem");
  expect(route).not.toContain('className="activity-streams unstyled"');
});
