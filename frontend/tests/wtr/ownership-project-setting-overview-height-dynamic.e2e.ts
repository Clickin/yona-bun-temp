import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project setting overview height uses dynamic Style", async () => {
  const [legacy, route] = await Promise.all([
    readFileSync("../yona-original/app/views/project/setting.scala.html", "utf8"),
    readFileSync("src/routes/$ownerName/$projectName/setting.tsx", "utf8"),
  ]);
  expect(legacy).toContain('<textarea id="project-desc" name="overview"');
  expect(route).toContain('data-owner="project-setting-description"');
});
