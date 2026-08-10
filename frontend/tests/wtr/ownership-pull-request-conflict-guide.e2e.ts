import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

test("pull request conflict guide owns conditional static styling", async () => {
  const route = await readFile(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    "utf8",
  );
  const styles = await readFile("../src/app.css", "utf8");
  const legacy = await readFile(
    new URL("../../yona-original/app/views/git/partial_state.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = await readFile("../src/app.css", "utf8");

  expect(legacy).toContain("howto-resolve-conflict");
  expect(less).toContain(".howto-resolve-conflict");
  expect(route).toContain('data-owner="pull-request-detail-conflict-guide"');

  expect(css).not.toContain(".pull-request-conflict-guide {");
});
