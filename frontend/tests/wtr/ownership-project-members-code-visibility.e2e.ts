import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const routeSource = new URL("../src/routes/$ownerName/$projectName/members.tsx", import.meta.url);
const legacyMembersSource = new URL(
  "../../yona-original/app/views/project/members.scala.html",
  import.meta.url,
);
const legacyMenuSource = new URL(
  "../../yona-original/app/views/project/partial_settingmenu.scala.html",
  import.meta.url,
);

test("project members code menu uses conditional Style visibility", async () => {
  const [route, legacyMembers, legacyMenu] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacyMembersSource, "utf8"),
    readFile(legacyMenuSource, "utf8"),
  ]);
  expect(legacyMembers).toContain("partial_settingmenu");
  expect(legacyMenu).toContain("subMenuProjectChangeVCS");
  expect(route).toContain('data-owner="project-members-code-menu"');

  expect(route).toContain("booleanField(menuSetting.code)");
});
