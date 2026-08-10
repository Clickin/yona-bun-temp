import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("records milestone edit form owner boundary", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/milestone/edit.scala.html", "utf8");
  expect(template).toContain('id -> "milestone-form"');
  expect(template).toContain('name="title"');
  expect(route).toContain('data-owner="milestone-edit-form-title"');
});
