import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project labels category suggestion button uses direct StyleX", async () => {
  const [route, style] = await Promise.all([
    readFile("src/routes/$ownerName/$projectName/issue/labelsform.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issue/-labelsform.stylex.ts", "utf8"),
  ]);
  expect(route).toContain('data-stylex-owner="project-labels-category-suggestion"');
  expect(route).toContain("labelsFormStyles.categorySuggestionButton");
  expect(route).not.toContain('background: "transparent"');
  expect(style).toContain("categorySuggestionButton");
  expect(style).toContain('padding: "3px 20px"');
});
