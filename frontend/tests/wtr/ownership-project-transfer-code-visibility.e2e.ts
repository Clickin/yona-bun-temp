import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project transfer code menu visibility uses conditional Style", async () => {
  const [legacy, partial, route, _style] = await Promise.all([
    readFile("../yona-original/app/views/project/transfer.scala.html", "utf8"),
    readFile("../yona-original/app/views/project/partial_settingmenu.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/transfer.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(legacy).toContain("partial_settingmenu(project)");
  expect(partial).toContain('id="subMenuProjectChangeVCS"');
  expect(partial).toContain("display:none;");
  expect(route).toContain('data-owner="project-transfer-code-menu"');

  expect(route).not.toMatch(/style=\{[^}]*display/gu);
});
