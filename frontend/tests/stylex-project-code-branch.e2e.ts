import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/code/$branch.tsx", import.meta.url)),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-code-branch.stylex.ts", import.meta.url),
  ),
  "utf8",
);

test("project code branch exposes route-owned StyleX presentation boundaries", () => {
  for (const owner of [
    "project-code-branch-page",
    "project-code-branch-browser",
    "project-code-branch-header",
    "project-code-branch-tabs",
    "project-code-branch-picker",
    "project-code-branch-viewer",
    "project-code-branch-list",
  ])
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
  expect(routeSource).not.toContain("document.querySelector");
});

test("project code branch preserves legacy browser owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", defaultBranch: "main" },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [],
        entries: [],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );
  await page.goto(`${basePath}/admin/sample/code/main`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="project-code-branch-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-code-branch-browser"]')).toBeVisible();
});
