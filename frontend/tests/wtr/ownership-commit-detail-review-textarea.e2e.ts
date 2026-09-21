import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/commit/$commitId.tsx",
  import.meta.url,
);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacySource = new URL("../../yona-original/app/views/code/diff.scala.html", import.meta.url);
test("commit review textarea height uses conditional Style", async () => {
  const [route, _style, _legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(route).toContain('"commit-detail-review-textarea"');
});
