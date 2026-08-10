import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/site/issueList.scala.html",
  import.meta.url,
);
test("site issue list pagination sprite uses Dynamic Style", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("pagination");
  expect(route).toContain('data-owner="site-issue-list-pagination-first"');
  expect(route).not.toContain("paginationSpriteStyle");
});
