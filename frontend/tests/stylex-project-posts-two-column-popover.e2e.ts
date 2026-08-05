import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project posts two-column popover uses route-local StyleX", async () => {
  const [legacy, route, sharedComponent] = await Promise.all([
    readFile("../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/posts.tsx", "utf8"),
    readFile("src/components/two-column-mode-checkbox.tsx", "utf8"),
  ]);
  expect(legacy).toContain("two-column-mode");
  expect(sharedComponent).toContain("data-stylex-owner={popoverOwner}");
  expect(route).toContain('popoverOwner="project-posts-two-column-popover"');
  expect(route).toContain("twoColumnModePopoverStyles.popover");
  expect(route).not.toContain("TWO_COLUMN_MODE_POPOVER_STYLE");
  expect(route).not.toContain("style={TWO_COLUMN_MODE_POPOVER_STYLE}");
});
