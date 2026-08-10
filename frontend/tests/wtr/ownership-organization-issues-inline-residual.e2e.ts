import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("organization issue search moves the static project selector width into Style", async ({
  page,
}) => {
  const route = readFileSync("src/routes/organizations/$organizationName/issues.tsx", "utf8");
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const template = readFileSync(
    "../yona-original/app/views/organization/group_issue_search_partial.scala.html",
    "utf8",
  );
  const commonTemplate = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  expect(template).toContain('id="projects"');
  expect(template).toContain('name="projectNames[]"');
  expect(route).toContain('data-owner="organization-issues-project-select"');

  expect(commonTemplate).toContain('class="two-column-icon mr10 hide-in-mobile"');
  expect(route).toContain('data-owner="organization-issues-two-column-popover"');

  await mockIssues(page);
  await page.goto(`${basePath}/organizations/weblabs/issues?projectNames%5B%5D=sample`, {
    waitUntil: "domcontentloaded",
  });

  const projectSelect = page.locator('[data-owner="organization-issues-project-select"]');
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

  const anchor = page.locator("#two-column-mode-checkbox");
  await anchor.hover();
  const popover = page.locator('[data-owner="organization-issues-two-column-popover"]');
  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS("display", "block");
  await expect(popover).not.toHaveAttribute("style", /display|left|top/u);

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
