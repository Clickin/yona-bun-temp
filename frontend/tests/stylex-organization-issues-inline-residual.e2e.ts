import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("organization issue search moves the static project selector width into StyleX", async ({
  page,
}) => {
  const route = readFileSync("src/routes/organizations/$organizationName/issues.tsx", "utf8");
  const stylexSource = readFileSync(
    "src/routes/organizations/$organizationName/-organization-issues.stylex.ts",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/organization/group_issue_search_partial.scala.html",
    "utf8",
  );
  expect(template).toContain('id="projects"');
  expect(template).toContain('name="projectNames[]"');
  expect(route).toContain('data-stylex-owner="organization-issues-project-select"');
  expect(route).not.toContain('style={{ width: "100%" }}');
  expect(stylexSource).toContain('projectSelect: { width: "100%" }');

  await mockIssues(page);
  await page.goto(`${basePath}/organizations/weblabs/issues?projectNames%5B%5D=sample`, {
    waitUntil: "domcontentloaded",
  });

  const projectSelect = page.locator('[data-stylex-owner="organization-issues-project-select"]');
  await expect(projectSelect).toHaveCount(1);
  await expect(projectSelect.locator("option:checked")).toHaveText("sample");
  expect(await projectSelect.getAttribute("style")).toBeNull();
  const widths = await projectSelect.evaluate((element) => {
    const select = element.getBoundingClientRect();
    const form = element.closest("form")?.getBoundingClientRect();
    return { select: select.width, form: form?.width ?? 0 };
  });
  expect(widths.select).toBeGreaterThan(0);
  expect(widths.select).toBeCloseTo(widths.form, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(398);
});

async function mockIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);

  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        items: [],
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        openIssueCount: 0,
        closedIssueCount: 0,
        visibleProjects: [{ projectName: "sample", ownerName: "admin" }],
        filter: "",
        orderBy: "createdDate",
        orderDir: "desc",
        state: "open",
        projectNames: ["sample"],
      },
    }),
  );
}
