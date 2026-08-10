import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("milestone detail delete modal uses conditional Style visibility", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/milestone/view.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx", "utf8"),
    readFile("src/app.css", "utf8"),
  ]);
  expect(legacy).toContain('<div id="deleteConfirm" class="modal hide fade">');
  expect(route).toContain('data-owner="milestone-detail-delete-modal"');
  expect(route).not.toContain("style={\n          deleteConfirmOpen");
});
