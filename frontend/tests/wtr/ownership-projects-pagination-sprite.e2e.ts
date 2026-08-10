import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/projects.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/list.scala.html",
  import.meta.url,
);
test("projects pagination sprite uses Dynamic Style", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("pagination");
  expect(route).not.toContain("paginationSpriteStyle");
});
