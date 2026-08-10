import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Fixture reads use STRING paths: URL-object reads of .ts sources return
// esbuild-transformed content under WTR (type annotations stripped), while
// string paths take the raw .txt route (bucket-1 divergence, reported).
const routeSource = "src/routes/$ownerName/$projectName/issue/labelsform.tsx";
const styleSource = "src/app.css";
const legacySource = "../yona-original/app/views/project/issuelabels.scala.html";

test("labels form color input uses Dynamic Style paint", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain('class="input-small input-label-color"');
  expect(legacy).toContain("background-color:#f44336");

  expect(route).not.toContain("style={colorInputStyle(");
});
