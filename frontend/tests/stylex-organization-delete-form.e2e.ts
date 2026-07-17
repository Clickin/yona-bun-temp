import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/organizations/$organizationName/deleteForm.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/organizations/$organizationName/-deleteForm.stylex.ts", import.meta.url),
  ),
  "utf8",
);

const owners = [
  "organization-delete-action",
  "organization-delete-modal",
  "organization-delete-modal-header",
  "organization-delete-modal-body",
  "organization-delete-modal-footer",
  "organization-delete-modal-backdrop",
] as const;

test("organization delete default and confirmation states have six direct StyleX owners", () => {
  expect(new Set(owners).size).toBe(6);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-deleteForm.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
});

test("organization delete paint variables stay route-local while geometry remains direct", () => {
  for (const geometryProperty of [
    "height:",
    "margin:",
    "padding:",
    "width:",
    "top:",
    "left:",
    "right:",
    "bottom:",
  ]) {
    expect(styleSource).not.toContain(geometryProperty);
  }

  expect(routeSource).toContain('default: "560px"');
  expect(routeSource).toContain('default: "20px 0 12px"');
  expect(routeSource).toContain('"@media (max-width: 720px)": "10px 0"');
  expect(routeSource).toContain('top: "10%"');
});

test("organization delete migrated owners retire legacy presentation and plugin hooks", () => {
  for (const retiredSource of [
    'className="box-wrap bottom"',
    'className="ybtn ybtn-danger"',
    'className="ybtn"',
    'className="modal hide"',
    'className="modal-header"',
    'className="modal-body"',
    'className="modal-footer"',
    'className="close"',
    'className="modal-backdrop fade in"',
    "data-toggle=",
    "data-dismiss=",
  ]) {
    expect(routeSource).not.toContain(retiredSource);
  }

  expect(routeSource).not.toMatch(/document\.(querySelector|getElementById|addEventListener)/);
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).toContain("setDeletionModalOpen(true)");
  expect(routeSource).toContain("deleteMutation.mutate()");
});
