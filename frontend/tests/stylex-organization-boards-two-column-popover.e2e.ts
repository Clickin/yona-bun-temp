import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const routeSource = new URL(
  "../src/routes/organizations/$organizationName/boards.tsx",
  import.meta.url,
);
const sharedComponentSource = new URL(
  "../src/components/two-column-mode-checkbox.tsx",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
  import.meta.url,
);
test("organization boards two-column popover uses static StyleX", async () => {
  const [route, legacy, sharedComponent] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(sharedComponentSource, "utf8"),
  ]);
  expect(legacy).toContain("two-column-icon");
  expect(route).toContain('popoverOwner="organization-boards-two-column-popover"');
  expect(sharedComponent).toContain("data-stylex-owner={popoverOwner}");
  expect(route).toContain("twoColumnPopover");
  expect(route).not.toContain("TWO_COLUMN_MODE_POPOVER_STYLE");
});
