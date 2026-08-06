import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project setting overview height uses dynamic StyleX", async () => {
  const [legacy, route, style] = await Promise.all([
    readFileSync("../yona-original/app/views/project/setting.scala.html", "utf8"),
    readFileSync("src/routes/$ownerName/$projectName/setting.tsx", "utf8"),
    readFileSync("src/routes/$ownerName/$projectName/-setting.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('<textarea id="project-desc" name="overview"');
  expect(route).toContain('data-stylex-owner="project-setting-description"');
  expect(route).toContain("styles.textareaHeight(`${overviewHeight}px`)");
  expect(route).not.toContain("height: `${overviewHeight}px`");
  expect(route).toContain('overflow: "hidden"');
  expect(style).toContain("textareaHeight: (height: string) => ({ height })");
});
