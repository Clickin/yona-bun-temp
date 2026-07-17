import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("records milestone edit form owner boundary", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx",
    "utf8",
  );
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId/-milestone-editform.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/milestone/edit.scala.html", "utf8");
  expect(template).toContain('id -> "milestone-form"');
  expect(template).toContain('name="title"');
  expect(route).toContain('data-stylex-owner="milestone-edit-form-title"');
  expect(route).toContain('data-stylex-owner="milestone-edit-form-uploader"');
  expect(theme).toContain("milestoneEditFormTheme");
});
