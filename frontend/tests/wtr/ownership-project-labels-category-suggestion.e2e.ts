import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project labels category suggestion button uses direct Style", async () => {
  const [route, style] = await Promise.all([
    readFile("src/routes/$ownerName/$projectName/issue/labelsform.tsx", "utf8"),
    readFile("src/app.css", "utf8"),
  ]);
  expect(route).toContain('data-owner="project-labels-category-suggestion"');
});
