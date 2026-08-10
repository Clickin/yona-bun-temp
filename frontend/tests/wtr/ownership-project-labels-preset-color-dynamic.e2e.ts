import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project labels preset colors use Dynamic Style", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/project/partial_issuelabels_editlabel.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issue/labelsform.tsx", "utf8"),
    readFile("src/app.css", "utf8"),
  ]);
  expect(legacy).toContain("label-preset-colors");
  expect(route).toContain('data-owner="project-labels-preset-color"');
});
