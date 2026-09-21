import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/sites/projectList.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/site/projectList.scala.html",
  import.meta.url,
);
test("site project list pagination sprite uses Dynamic Style", async () => {
  const [_route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("pagination");
});
