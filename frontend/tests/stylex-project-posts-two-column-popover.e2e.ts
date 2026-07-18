import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project posts two-column popover uses route-local StyleX", async () => {
  const [legacy, route] = await Promise.all([
    readFile("../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/posts.tsx", "utf8"),
  ]);
  expect(legacy).toContain("two-column-mode");
  expect(route).toContain('data-stylex-owner="project-posts-two-column-popover"');
  expect(route).toContain("twoColumnModePopoverStyles.popover");
  expect(route).not.toContain("TWO_COLUMN_MODE_POPOVER_STYLE");
  expect(route).not.toContain("style={TWO_COLUMN_MODE_POPOVER_STYLE}");
});
