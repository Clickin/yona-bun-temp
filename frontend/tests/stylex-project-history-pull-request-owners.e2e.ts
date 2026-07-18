import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_history.scala.html",
  import.meta.url,
);

test("project history pull-request metadata uses static StyleX owners", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("activity-stream");
  expect(route).toContain('data-stylex-owner="project-history-pull-request-date"');
  expect(route).toContain('data-stylex-owner="project-history-pull-request-link"');
  expect(route).not.toContain('style={{ color: "#999" }}');
  expect(route).not.toContain('style={{ marginRight: "17px" }}');
});
