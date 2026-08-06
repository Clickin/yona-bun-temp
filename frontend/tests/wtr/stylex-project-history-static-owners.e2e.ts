import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_history.scala.html",
  import.meta.url,
);

test("project history static owners use StyleX", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("main-stream");
  expect(legacy).toContain("header-text");
  expect(route).toContain('data-stylex-owner="project-history-stream"');
  expect(route).toContain('data-stylex-owner="project-history-header"');
  expect(route).toContain('data-stylex-owner="project-history-others"');
  expect(route).not.toContain('style={{ width: "100%" }}');
  expect(route).not.toContain('style={{ marginBottom: "5px" }}');
});
