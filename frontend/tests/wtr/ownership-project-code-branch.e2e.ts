import { expect, test } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: fileURLToPath yields the served URL pathname so string
// mapping + .txt raw-suffix applies.
const fileURLToPath = (u: URL) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/code/$branch.tsx", import.meta.url)),
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

test("project code branch exposes route-owned Style presentation boundaries", () => {
  for (const owner of [
    "project-code-branch-page",
    "project-code-branch-browser",
    "project-code-branch-header",
    "project-code-branch-tabs",
    "project-code-branch-picker",
    "project-code-branch-viewer",
    "project-code-branch-list",
  ])
    expect(routeSource).toContain(`data-owner="${owner}"`);

  expect(routeSource).not.toContain("document.querySelector");
});

test("project code branch preserves legacy browser owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
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
  await expect(page.locator('[data-owner="project-code-branch-page"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-code-branch-browser"]')).toBeVisible();
});
