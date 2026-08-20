import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("webhooks code-menu visibility is conditional Style-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/webhooks.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const template = readFileSync("../yona-original/app/views/project/webhooks.scala.html", "utf8");
  const settingMenu = readFileSync(
    "../yona-original/app/views/project/partial_settingmenu.scala.html",
    "utf8",
  );
  expect(template).toContain("partial_settingmenu(project)");
  expect(settingMenu).toContain('style="@if(!project.menuSetting.code){display:none;}"');
  expect(route).toContain('data-owner="project-webhooks-code-menu"');
});
