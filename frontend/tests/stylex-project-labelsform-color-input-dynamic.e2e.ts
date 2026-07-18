import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/issue/labelsform.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/issue/-labelsform.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/project/issuelabels.scala.html",
  import.meta.url,
);

test("labels form color input uses Dynamic StyleX paint", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain('class="input-small input-label-color"');
  expect(legacy).toContain("background-color:#f44336");
  expect(route).toContain("labelsFormDynamicStyles.colorInputBoxShadow");
  expect(route).not.toContain("style={colorInputStyle(");
  expect(style).toContain("colorInputBoxShadow: (color: string)");
});
