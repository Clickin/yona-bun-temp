import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("milestone edit upload paste-help display is conditional StyleX-owned", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx",
    "utf8",
  );
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId/-milestone-editform.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/milestone/edit.scala.html", "utf8");
  const upload = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  expect(template).toContain("ResourceType.MILESTONE");
  expect(upload).toContain('class="help help-pastable"');
  expect(upload).toContain("common.attach.pastehere");
  expect(route).toContain('pasteHelp: "milestone-edit-form-paste-help"');
  expect(route).toContain("milestoneEditFormStyles.pasteHelpVisible");
  expect(route).not.toContain('style={pasteSupported ? { display: "block" } : undefined}');
  expect(theme).toContain('pasteHelpVisible: { display: "block" }');
});
