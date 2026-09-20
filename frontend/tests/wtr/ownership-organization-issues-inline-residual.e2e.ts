import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("organization issue project selection preserves filters and legacy selector geometry", async ({
  page,
}) => {
  await mockIssues(page);
  await page.goto(
    `${basePath}/organizations/weblabs/issues?projectNames%5B%5D=sample&projectNames%5B%5D=docs&filter=release&state=closed`,
    { waitUntil: "domcontentloaded" },
  );

  const projectSelect = page.locator('[data-owner="organization-project-picker"]');
  await expect(projectSelect).toHaveCount(1);
  await expect(projectSelect.locator(".select2-search-choice > div")).toHaveText([
    "sample",
    "docs",
  ]);
  await projectSelect.getByRole("button", { name: "삭제: sample", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.getAll("projectNames[]"))
    .toEqual(["docs"]);
  await expect(projectSelect.locator(".select2-search-choice > div")).toHaveText(["docs"]);
  await projectSelect.getByRole("combobox").fill("sample");
  await projectSelect.getByRole("option", { name: "sample", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.getAll("projectNames[]"))
    .toEqual(["docs", "sample"]);
  await expect(projectSelect.locator(".select2-search-choice > div")).toHaveText([
    "docs",
    "sample",
  ]);
  expect(new URL(page.url()).searchParams.get("filter")).toBe("release");
  expect(new URL(page.url()).searchParams.get("state")).toBe("closed");
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
        visibleProjects: [
          { projectName: "sample", ownerName: "admin" },
          { projectName: "docs", ownerName: "admin" },
        ],
        filter: "",
        orderBy: "createdDate",
        orderDir: "desc",
        state: "open",
        projectNames: ["sample"],
      },
    }),
  );
}
