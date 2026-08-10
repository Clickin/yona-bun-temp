import { readFileSync, expect, test } from "../wtr-compat.ts";

const read = (path: string) => readFileSync(path, "utf8");

test("orange-txt is retired from the three legacy form consumers", () => {
  // node:fs resolves bare relative strings against the cwd (frontend/); the
  // compat readFileSync maps them to the /tests/root/ fixture root.
  const appCss = read("src/app.css");
  const projectForm = read("src/routes/projectform.tsx");
  const projectFormStyle = read("src/app.css");
  const projectImport = read("src/routes/[_]import.tsx");
  const projectImportStyle = read("src/app.css");
  const organizationSettings = read("src/routes/organizations/$organizationName/settingform.tsx");
  const organizationStyle = read("src/app.css");

  expect(appCss).not.toMatch(/\.orange-txt\s*\{/u);
  expect(projectForm).not.toContain("orange-txt");
  expect(projectImport).not.toContain("orange-txt");
  // wave-33 retained-class retention (667398a04): settingform KEEPS orange-txt
  // per legacy organization/setting.scala.html:59 (<div class="orange-txt">) —
  // pinned by legacy-fallback-off.e2e.ts:718-721; retirement applies to the
  // app.css rule and the project form/import consumers only.
  expect(projectForm.match(/project-form-required-marker-/gu)).toHaveLength(2);
  expect(projectImport.match(/project-import-required-marker-/gu)).toHaveLength(3);
  expect(organizationSettings).toContain('data-owner="organization-setting-validation-message"');
});
