import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project setting overview height uses dynamic StyleX", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/project/setting.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/setting.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/-setting.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('<textarea id="project-desc" name="overview"');
  expect(route).toContain('data-stylex-owner="project-setting-description"');
  expect(route).toContain("styles.textareaHeight(`${overviewHeight}px`)");
  expect(route).not.toContain("height: `${overviewHeight}px`");
  expect(route).toContain('overflow: "hidden"');
  expect(style).toContain("textareaHeight: (height: string) => ({ height })");
});
