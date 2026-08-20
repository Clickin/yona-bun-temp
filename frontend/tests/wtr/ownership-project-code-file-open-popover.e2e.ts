import { expect, test, curatedAppCss } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

test("code file open popover owns visible positioning in Style", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile("src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile("../yona-original/app/views/code/partial_view_file.scala.html", "utf8"),
  ]);
  expect(legacy).toContain('id="open-in-browser"');
  expect(route).toContain('data-owner="project-code-file-open-popover"');
});
