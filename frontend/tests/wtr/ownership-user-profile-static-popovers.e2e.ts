import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("user profile static popover geometry is route-local Style-owned", () => {
  const route = readFileSync("src/routes/$user.tsx", "utf8");
  const sharedComponentSource = readFileSync("src/components/two-column-mode-checkbox.tsx", "utf8");

  const legacy = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(legacy).toContain('id="two-column-mode-checkbox"');
  expect(less).toContain(".two-column-icon");
  expect(route).toContain('popoverOwner="user-profile-two-column-popover"');
  expect(sharedComponentSource).toContain("data-owner={popoverOwner}");
  expect(route).toContain('data-owner="user-profile-show-subtasks-popover"');

  expect(route).not.toContain("SHOW_SUBTASKS_POPOVER_STYLE");
  expect(route).not.toContain("style={SHOW_SUBTASKS_POPOVER_STYLE}");
});
