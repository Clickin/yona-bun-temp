import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project issues keymap modal uses conditional StyleX visibility", async () => {
  const [legacy, route] = await Promise.all([
    readFile("../yona-original/app/views/help/keymap.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issues.tsx", "utf8"),
  ]);
  expect(legacy).toContain('id="helpKeys" class="modal hide fade keymap-help"');
  expect(route).toContain('data-stylex-owner="project-issues-keymap-modal"');
  expect(route).toContain("issueListKeymapStyles.visible");
  expect(route).not.toContain('style={keymapOpen ? { display: "block" } : undefined}');
});
