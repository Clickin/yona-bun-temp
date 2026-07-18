import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("milestone detail delete modal uses conditional StyleX visibility", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/milestone/view.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/milestone/-milestone-detail.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('<div id="deleteConfirm" class="modal hide fade">');
  expect(route).toContain('data-stylex-owner="milestone-detail-delete-modal"');
  expect(route).toContain("sx.deleteModalVisible");
  expect(route).toContain("sx.deleteModalHidden");
  expect(route).not.toContain("style={\n          deleteConfirmOpen");
  expect(style).toContain('deleteModalVisible: { display: "block" }');
  expect(style).toContain('deleteModalHidden: { display: "none" }');
});
