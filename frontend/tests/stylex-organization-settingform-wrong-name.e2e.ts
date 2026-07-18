import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("organization setting wrong-name validation uses conditional StyleX ownership", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/organization/setting.scala.html", "utf8"),
    readFile("src/routes/organizations/$organizationName/settingform.tsx", "utf8"),
    readFile(
      "src/routes/organizations/$organizationName/-organization-settingform.stylex.ts",
      "utf8",
    ),
  ]);

  expect(legacy).toContain('<span class="msg wrongName" style="display: none;"></span>');
  expect(route).toContain('data-stylex-owner="organization-setting-wrong-name"');
  expect(route).toContain("organizationSettingFormStyles.wrongNameHidden");
  expect(route).not.toContain('style={wrongNameMessage ? undefined : { display: "none" }}');
  expect(style).toContain('wrongNameHidden: { display: "none" }');
});
