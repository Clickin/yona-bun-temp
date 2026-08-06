import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("post detail delete modal visibility is conditional StyleX-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const modal = readFileSync(
    "../yona-original/app/views/common/commentDeleteModal.scala.html",
    "utf8",
  );
  expect(template).toContain("commentDeleteModal");
  expect(modal).toContain('class="modal hide fade"');
  expect(route).toContain('data-stylex-owner="post-detail-delete-modal"');
  expect(route).toContain("styles.deleteModalVisible");
  expect(route).not.toContain('style={deleteModalOpen ? { display: "block" } : undefined}');
  expect(theme).toContain('deleteModalVisible: { display: "block" }');
});
