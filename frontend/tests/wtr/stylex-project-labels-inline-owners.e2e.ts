import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const fileURLToPath = (url: URL) => url.pathname;

const legacySource = fileURLToPath(
  new URL("../../yona-original/app/views/project/issuelabels.scala.html", import.meta.url),
);
const routeSource = fileURLToPath(
  new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
);
const styleSource = fileURLToPath(
  new URL("../src/routes/$ownerName/$projectName/issue/-labelsform.stylex.ts", import.meta.url),
);

test("labels form inline owners use conditional and Dynamic StyleX", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile(legacySource, "utf8"),
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
  ]);
  expect(legacy).toContain("label-preset-colors");
  expect(route).toContain('data-stylex-owner="project-labels-typeahead-anchor"');
  expect(route).toContain('data-stylex-owner="project-labels-typeahead-menu"');
  expect(route).toContain('data-stylex-owner="project-labels-preset-colors"');
  expect(route).toContain("labelsFormDynamicStyles.newLabelBackground");
  expect(route).toContain("labelsFormDynamicStyles.typeaheadPosition");
  expect(route).not.toContain("style={newLabelNameColor ? { backgroundColor: newLabelNameColor }");
  expect(route).not.toContain('style={isNewLabelColorsVisible ? { display: "inline-block" }');
  expect(style).toContain("typeaheadAnchor");
  expect(style).toContain("presetColorsVisible");
});
