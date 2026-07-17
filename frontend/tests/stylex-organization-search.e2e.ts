import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/organizations/$organizationName/search.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/organizations/$organizationName/-organization-search.stylex.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);

test("organization search declares direct StyleX owners and paint-only theme vars", () => {
  for (const owner of [
    "organization-search-page",
    "organization-search-categories",
    "organization-search-box",
    "organization-search-results",
    "organization-search-list",
  ])
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  const themeBlock = styleSource.slice(
    styleSource.indexOf("stylex.defineVars({"),
    styleSource.indexOf("});") + 3,
  );
  expect(themeBlock).toContain("mutedText");
  for (const geometry of ["margin:", "padding:", "width:", "height:"])
    expect(themeBlock).not.toContain(geometry);
  expect(routeSource).not.toContain("document.querySelector");
});

test("organization search renders issue results and category counts", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/organizations/acme/search**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        context: { organizationName: "acme" },
        counts: {
          issues: 1,
          users: 0,
          projects: 0,
          posts: 0,
          milestones: 0,
          issueComments: 0,
          postComments: 0,
          reviews: 0,
        },
        items: [
          {
            id: "11",
            type: "issue",
            number: "11",
            title: "Fix flaky issue",
            href: "/acme/sample/issue/11",
            ownerName: "acme",
            projectName: "sample",
            authorLabel: "Admin",
            authorLoginId: "admin",
            createdLabel: "today",
            updatedLabel: "",
            state: "OPEN",
            snippets: [{ text: "Body markdown", highlights: [] }],
          },
        ],
        keyword: "flaky",
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        searchType: "issue",
        scope: "organization",
        totalCount: 1,
      },
    }),
  );
  await page.goto("/yona/organizations/acme/search?keyword=flaky&searchType=issue&pageNum=1");
  await expect(page.locator('[data-stylex-owner="organization-search-results"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="organization-search-list"]')).toContainText(
    "Fix flaky issue",
  );
  await expect(page.locator('[data-stylex-owner="organization-search-categories"]')).toContainText(
    "1",
  );
});
