import { readFileSync, curatedAppCss as _curatedAppCss } from "../wtr-compat.ts"; // Browser harness: fileURLToPath reduces URL objects to their pathname so
// readFileSync maps them through the fixture middleware.
const fileURLToPath = (u: URL) => u.pathname;

import { expect, test } from "../wtr-compat.ts";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/commits.tsx", import.meta.url)),
  "utf8",
);

test("project commits exposes route-owned Style presentation boundaries", () => {
  for (const owner of [
    "project-commits-page",
    "project-commits-shell",
    "project-commits-branch-picker",
    "project-commits-tabs",
    "project-commits-history",
    "project-commits-table",
    "project-commits-pagination",
  ])
    expect(routeSource).toContain(`data-owner="${owner}"`);

  expect(routeSource).not.toContain("document.querySelector");
});

test("project commits preserves legacy history owner", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", defaultBranch: "main" },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/commits**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [],
        commits: [
          {
            authorAvatarUrl: "",
            authorDate: "Jul 17, 2026",
            authorEmail: "admin@example.com",
            authorLoginId: "admin",
            authorName: "Admin",
            commentCount: 0,
            commitId: "abcdef1234567890",
            commitShortId: "abcdef1",
            message: "Initial commit",
            shortMessage: "Initial commit",
          },
        ],
        hasNewer: false,
        hasOlder: false,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );
  await page.goto(`${basePath}/admin/sample/commits`, { waitUntil: "commit" });
  await expect(page.locator('[data-owner="project-commits-page"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-commits-history"]')).toBeVisible();
});
