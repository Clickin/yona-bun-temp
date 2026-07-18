import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/site/issueList.scala.html",
  import.meta.url,
);
test("site issue list pagination sprite uses Dynamic StyleX", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("pagination");
  expect(route).toContain("paginationSprite");
  expect(route).toContain('data-stylex-owner="site-issue-list-pagination-first"');
  expect(route).not.toContain("paginationSpriteStyle");
});
