import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project labels preset colors use Dynamic StyleX", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/project/partial_issuelabels_editlabel.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issue/labelsform.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issue/-labelsform.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain("label-preset-colors");
  expect(route).toContain('data-stylex-owner="project-labels-preset-color"');
  expect(route).toContain("labelsFormDynamicStyles.presetColorBackground(color)");
  expect(route).not.toContain("style={{ backgroundColor: color }}");
  expect(style).toContain(
    "presetColorBackground: (backgroundColor: string) => ({ backgroundColor })",
  );
});
