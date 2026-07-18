import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("post detail keymap modal visibility is conditional StyleX-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const keymap = readFileSync("../yona-original/app/views/help/keymap.scala.html", "utf8");
  expect(template).toContain("keymap");
  expect(keymap).toContain("keymap-help");
  expect(route).toContain('data-stylex-owner="post-detail-keymap-modal"');
  expect(route).toContain("styles.keymapModalVisible");
  expect(route).not.toContain('style={open ? { display: "block" } : undefined}');
  expect(theme).toContain('keymapModalVisible: { display: "block" }');
});
