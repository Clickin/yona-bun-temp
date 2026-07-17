import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("records organization setting form owner boundary", () => {
  const route = readFileSync("src/routes/organizations/$organizationName/settingform.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/organizations/$organizationName/-settingform.stylex.ts",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/organization/setting.scala.html",
    "utf8",
  );
  expect(template).toContain('id="saveSetting"');
  expect(template).toContain('id="project-name"');
  expect(route).toContain('data-stylex-owner="organization-setting-form"');
  expect(route).toContain('data-stylex-owner="organization-setting-name-input"');
  expect(route).toContain('data-stylex-owner="organization-setting-body"');
  expect(route).toContain('data-stylex-owner="organization-setting-logo"');
  expect(route).toContain('data-stylex-owner="organization-setting-menu"');
  expect(theme).toContain("organizationSettingColors");
});
