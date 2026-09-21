import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project labels preset colors use Dynamic Style", async () => {
  const [legacy, route, _style] = await Promise.all([
    readFile("../yona-original/app/views/project/partial_issuelabels_editlabel.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issue/labelsform.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(legacy).toContain("label-preset-colors");
  expect(route).toContain('data-owner="project-labels-preset-color"');
});
