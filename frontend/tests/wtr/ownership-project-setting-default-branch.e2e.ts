import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName/setting.tsx", import.meta.url);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/setting.scala.html",
  import.meta.url,
);

test("project setting default branch dropdown uses conditional Style", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("project-default-branch");
  expect(route).toContain('data-owner="project-setting-default-branch-drop"');
});
