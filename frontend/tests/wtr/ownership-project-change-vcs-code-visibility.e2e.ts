import { expect, test, curatedAppCss } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

test("change VCS code menu visibility uses conditional Style", async () => {
  const [partial, route, style] = await Promise.all([
    readFile("../yona-original/app/views/project/partial_settingmenu.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/changeVCS.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(partial).toContain('id="subMenuProjectChangeVCS"');
  expect(partial).toContain("display:none;");
  expect(route).toContain('data-owner="project-change-vcs-code-menu"');

  expect(route).not.toContain('style={projectMenuEnabled(project, "code", "showCode")');
});
