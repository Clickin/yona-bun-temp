import { expect, test } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

test("code file open popover owns visible positioning in StyleX", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile("src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/code/$branch/-code-file.stylex.ts", "utf8"),
    readFile("../yona-original/app/views/code/partial_view_file.scala.html", "utf8"),
  ]);
  expect(legacy).toContain('id="open-in-browser"');
  expect(route).toContain('data-stylex-owner="project-code-file-open-popover"');
  expect(route).not.toContain('style={{\n                  bottom: "100%"');
  expect(style).toContain('bottom: "100%"');
  expect(style).toContain('transform: "translateX(-50%)"');
});
