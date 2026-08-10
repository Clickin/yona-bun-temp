import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("postform paste-help display is conditional Style-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/postform.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const template = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  expect(template).toContain('class="help help-pastable"');
  expect(template).toContain("common.attach.pastehere");
});
