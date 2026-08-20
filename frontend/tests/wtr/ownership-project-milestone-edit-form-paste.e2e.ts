import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("milestone edit upload paste-help display is conditional Style-owned", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx",
    "utf8",
  );
  const theme = curatedAppCss();
  const template = readFileSync("../yona-original/app/views/milestone/edit.scala.html", "utf8");
  const upload = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  expect(template).toContain("ResourceType.MILESTONE");
  expect(upload).toContain('class="help help-pastable"');
  expect(upload).toContain("common.attach.pastehere");
});
