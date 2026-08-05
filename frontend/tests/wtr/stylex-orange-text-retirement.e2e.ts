import { readFileSync, expect, test } from "../wtr-compat.ts";

const read = (path: string) => readFileSync(path, "utf8");

test("orange-txt is retired from the three legacy form consumers", () => {
  // node:fs resolves bare relative strings against the cwd (frontend/); the
  // compat readFileSync maps them to the /tests/root/ fixture root.
  const appCss = read("src/app.css");
  const projectForm = read("src/routes/projectform.tsx");
  const projectFormStyle = read("src/routes/-projectform.stylex.ts");
  const projectImport = read("src/routes/[_]import.tsx");
  const projectImportStyle = read("src/routes/-project-import.stylex.ts");
  const organizationSettings = read("src/routes/organizations/$organizationName/settingform.tsx");
  const organizationStyle = read(
    "src/routes/organizations/$organizationName/-settingform.stylex.ts",
  );

  expect(appCss).not.toMatch(/\.orange-txt\s*\{/u);
  expect(projectForm).not.toContain("orange-txt");
  expect(projectImport).not.toContain("orange-txt");
  expect(organizationSettings).not.toContain("orange-txt");
  expect(projectForm.match(/project-form-required-marker-/gu)).toHaveLength(2);
  expect(projectImport.match(/project-import-required-marker-/gu)).toHaveLength(3);
  expect(organizationSettings).toContain(
    'data-stylex-owner="organization-setting-validation-message"',
  );
  expect(projectFormStyle).toContain('requiredMarker: "#f36c22"');
  expect(projectImportStyle).toContain('warningText: "#f36c22"');
  expect(organizationStyle).toContain('warningText: "#f36c22"');
});
