import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const routeSource =
  "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx";
const styleSource = "../src/app.css";
const legacySource = new URL(
  "../../yona-original/app/views/git/viewChanges.scala.html",
  import.meta.url,
);

test("pull request changes pending review block uses conditional and Dynamic Style", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("btnPop");
  expect(route).toContain('data-owner="pull-request-changes-pending-block"');
  expect(route).toContain("pendingBlock.top");
  expect(route).toContain("pendingBlock.left");
});
