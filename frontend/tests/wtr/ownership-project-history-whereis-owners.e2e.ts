import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_history.scala.html",
  import.meta.url,
);
test("project history whereis/date owners preserve legacy paint", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("whereis");
  expect(route).toContain('data-owner="project-history-whereis"');
  expect(route).toContain('data-owner="project-history-where"');
  expect(route).toContain('data-owner="project-history-title"');
});
