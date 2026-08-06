import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project setting description textarea static declarations use StyleX", async () => {
  const [legacy, route] = await Promise.all([
    readFileSync("../yona-original/app/views/project/setting.scala.html", "utf8"),
    readFileSync("src/routes/$ownerName/$projectName/setting.tsx", "utf8"),
  ]);
  expect(legacy).toContain('<textarea id="project-desc" name="overview"');
  expect(route).toContain("const textareaStaticStyles = stylex.create");
  expect(route).toContain('overflow: "hidden"');
  expect(route).toContain('overflowWrap: "break-word"');
  expect(route).toContain('resize: "none"');
  expect(route).not.toContain('style={{\n                      overflow: "hidden"');
});
