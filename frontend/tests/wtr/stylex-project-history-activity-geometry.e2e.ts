import { readFile } from "../wtr-compat.ts";

// Browser harness: fileURLToPath reduces URL objects to their pathname so
// readFile maps them through the fixture middleware.
const fileURLToPath = (u: URL) => u.pathname;

import { expect, test } from "../wtr-compat.ts";

const routeSource = fileURLToPath(
  new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
);
const legacySource = fileURLToPath(
  new URL("../../yona-original/app/views/project/partial_history.scala.html", import.meta.url),
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
