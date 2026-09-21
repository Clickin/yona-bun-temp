import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("postform paste-help display is conditional Style-owned", () => {
  const template = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  expect(template).toContain('class="help help-pastable"');
  expect(template).toContain("common.attach.pastehere");
});
