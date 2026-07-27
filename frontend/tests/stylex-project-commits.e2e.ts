import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/commits.tsx", import.meta.url)),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-commits.stylex.ts", import.meta.url),
  ),
  "utf8",
);

test("project commits exposes route-owned StyleX presentation boundaries", () => {
  for (const owner of [
    "project-commits-page",
    "project-commits-shell",
    "project-commits-branch-picker",
    "project-commits-tabs",
    "project-commits-history",
    "project-commits-table",
    "project-commits-pagination",
  ])
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
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
  await expect(page.locator('[data-stylex-owner="project-commits-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-commits-history"]')).toBeVisible();
});
