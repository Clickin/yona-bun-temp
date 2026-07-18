import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("user profile static popover geometry is route-local StyleX-owned", () => {
  const route = readFileSync("src/routes/$user.tsx", "utf8");
  const legacy = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(legacy).toContain('id="two-column-mode-checkbox"');
  expect(less).toContain(".two-column-icon");
  expect(route).toContain('data-stylex-owner="user-profile-two-column-popover"');
  expect(route).toContain('data-stylex-owner="user-profile-show-subtasks-popover"');
  expect(route).toContain("faqPopover: {");
  expect(route).not.toContain("SHOW_SUBTASKS_POPOVER_STYLE");
  expect(route).not.toContain("style={SHOW_SUBTASKS_POPOVER_STYLE}");
});
