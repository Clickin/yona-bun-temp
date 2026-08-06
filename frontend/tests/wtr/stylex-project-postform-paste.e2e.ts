import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("postform paste-help display is conditional StyleX-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/postform.tsx", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-postform.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  expect(template).toContain('class="help help-pastable"');
  expect(template).toContain("common.attach.pastehere");
  expect(route).toContain('pasteHelp: "project-postform-paste-help"');
  expect(route).toContain("styles.pasteHelpVisible");
  expect(route).not.toContain('style={pasteSupported ? { display: "block" } : undefined}');
  expect(theme).toContain('pasteHelpVisible: { display: "block" }');
});
