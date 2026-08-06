import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("webhooks code-menu visibility is conditional StyleX-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/webhooks.tsx", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-webhooks.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/project/webhooks.scala.html", "utf8");
  const settingMenu = readFileSync(
    "../yona-original/app/views/project/partial_settingmenu.scala.html",
    "utf8",
  );
  expect(template).toContain("partial_settingmenu(project)");
  expect(settingMenu).toContain('style="@if(!project.menuSetting.code){display:none;}"');
  expect(route).toContain('data-stylex-owner="project-webhooks-code-menu"');
  expect(route).toContain("webhooksStyles.codeMenuHidden");
  expect(route).not.toContain(
    'style={projectMenuEnabled(project, "code", "showCode") ? undefined : { display: "none" }}',
  );
  expect(theme).toContain('codeMenuHidden: { display: "none" }');
});
