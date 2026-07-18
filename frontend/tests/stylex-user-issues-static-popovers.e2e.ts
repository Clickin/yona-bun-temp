import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("user issues static popovers are route-local StyleX-owned", () => {
  const route = readFileSync("src/routes/user/issues.tsx", "utf8");
  const legacy = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const showSubtasks = readFileSync(
    "../yona-original/app/views/common/showSubtasksCheckbox.scala.html",
    "utf8",
  );
  expect(legacy).toContain('id="two-column-mode-checkbox"');
  expect(showSubtasks).toContain("toggle-show-subtasks");
  expect(route).toContain('data-stylex-owner="user-issues-two-column-popover"');
  expect(route).toContain('data-stylex-owner="user-issues-show-subtasks-popover"');
  expect(route).toContain("twoColumnPopover: {");
  expect(route).toContain("showSubtasksPopover: {");
  expect(route).not.toContain("TWO_COLUMN_MODE_POPOVER_STYLE");
  expect(route).not.toContain("SHOW_SUBTASKS_POPOVER_STYLE");
});
