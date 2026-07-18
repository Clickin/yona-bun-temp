import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/members.tsx", import.meta.url);
const legacyMembersSource = new URL(
  "../../yona-original/app/views/project/members.scala.html",
  import.meta.url,
);
const legacyMenuSource = new URL(
  "../../yona-original/app/views/project/partial_settingmenu.scala.html",
  import.meta.url,
);

test("project members code menu uses conditional StyleX visibility", async () => {
  const [route, legacyMembers, legacyMenu] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacyMembersSource, "utf8"),
    readFile(legacyMenuSource, "utf8"),
  ]);
  expect(legacyMembers).toContain("partial_settingmenu");
  expect(legacyMenu).toContain("subMenuProjectChangeVCS");
  expect(route).toContain('data-stylex-owner="project-members-code-menu"');
  expect(route).toContain('codeMenuHidden: { display: "none" }');
  expect(route).not.toContain(
    'style={booleanField(menuSetting.code) ? undefined : { display: "none" }}',
  );
  expect(route).toContain("booleanField(menuSetting.code)");
});
