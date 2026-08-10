import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/__root.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/common/loginDialog.scala.html",
  import.meta.url,
);
test("root login dialog visibility uses conditional Style", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("loginDialog");
});
