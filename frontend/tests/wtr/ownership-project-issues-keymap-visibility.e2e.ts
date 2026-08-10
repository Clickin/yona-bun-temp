import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

test("project issues keymap modal uses conditional Style visibility", async () => {
  const [legacy, route] = await Promise.all([
    readFile("../yona-original/app/views/help/keymap.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issues.tsx", "utf8"),
  ]);
  expect(legacy).toContain('id="helpKeys" class="modal hide fade keymap-help"');
  expect(route).toContain('data-owner="project-issues-keymap-modal"');
});
