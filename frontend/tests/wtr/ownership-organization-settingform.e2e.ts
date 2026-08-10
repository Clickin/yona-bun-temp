import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("records organization setting form owner boundary", () => {
  const route = readFileSync("src/routes/organizations/$organizationName/settingform.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const template = readFileSync(
    "../yona-original/app/views/organization/setting.scala.html",
    "utf8",
  );
  expect(template).toContain('id="saveSetting"');
  expect(template).toContain('id="project-name"');
  expect(route).toContain('data-owner="organization-setting-form"');
  expect(route).toContain('data-owner="organization-setting-name-input"');
  // bucket-3 stale pin: owner renamed organization-setting-body ->
  // organization-setting-top-box (82a95f70c), PW-verified.
  expect(route).toContain('data-owner="organization-setting-top-box"');
  expect(route).toContain('data-owner="organization-setting-logo"');
  expect(route).toContain('data-owner="organization-setting-menu"');
});
