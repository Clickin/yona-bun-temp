import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("orange-txt is retired from the three legacy form consumers", () => {
  const root = process.cwd();
  const appCss = read(`${root}/src/app.css`);
  const projectForm = read(`${root}/src/routes/projectform.tsx`);
  const projectFormStyle = read(`${root}/src/routes/-projectform.stylex.ts`);
  const projectImport = read(`${root}/src/routes/[_]import.tsx`);
  const projectImportStyle = read(`${root}/src/routes/-project-import.stylex.ts`);
  const organizationSettings = read(
    `${root}/src/routes/organizations/$organizationName/settingform.tsx`,
  );
  const organizationStyle = read(
    `${root}/src/routes/organizations/$organizationName/-settingform.stylex.ts`,
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
