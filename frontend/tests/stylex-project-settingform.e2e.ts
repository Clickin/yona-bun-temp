import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/settingform.tsx", import.meta.url)),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-settingform.stylex.ts", import.meta.url),
  ),
  "utf8",
);

test("setting form declares route-local StyleX owners and paint vars", () => {
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('data-stylex-owner="project-settingform-page"');
  expect(routeSource).toContain('data-stylex-owner="project-settingform-shell"');
  expect(styleSource).toContain("stylex.defineVars({");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("setting form keeps the legacy route screen boundary", () => {
  expect(routeSource).toContain("ProjectSettingRouteScreen");
  expect(routeSource).toContain('selfRoutePath="/$ownerName/$projectName/settingform"');
});
