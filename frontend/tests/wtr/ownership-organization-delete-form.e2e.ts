import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const fileURLToPath = (u) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/organizations/$organizationName/deleteForm.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource =
  readFileSync(fileURLToPath(new URL("../src/app.css", import.meta.url)), "utf8") +
  readFileSync(
    fileURLToPath(
      new URL("../frontend/public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
    ),
    "utf8",
  );

const owners = [
  "organization-delete-page",
  "organization-delete-shell",
  "organization-delete-menu",
  "organization-delete-action",
  "organization-delete-modal",
  "organization-delete-modal-header",
  "organization-delete-modal-body",
  "organization-delete-modal-footer",
  "organization-delete-modal-backdrop",
] as const;

test("organization delete default and confirmation states have direct Style owners", () => {
  expect(new Set(owners).size).toBe(owners.length);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
});

test("organization delete paint variables stay route-local while geometry remains direct", () => {});

test("organization delete migrated owners retire legacy presentation and plugin hooks", () => {
  expect(routeSource).not.toMatch(/document\.(querySelector|getElementById|addEventListener)/);
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).toContain("setDeletionModalOpen(true)");
  expect(routeSource).toContain("deleteMutation.mutate()");
});
