import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issues.tsx";
const legacySource = "../yona-original/app/views/issue/partial_list_draft.scala.html";

test("project issues two-column row cursor uses conditional Style", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(route).toContain(
    'data-owner-clickable={useTwoColumnMode ? "project-issues-clickable-row" : undefined}',
  );
});
