import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

function siteProjectsPayload(input: {
  filter?: string;
  page?: number;
  projects: Array<{
    createdAt?: string;
    id: number;
    ownerName: string;
    overview?: string;
    projectName: string;
  }>;
  totalPages?: number;
}) {
  return {
    filter: input.filter ?? "",
    page: input.page ?? 1,
    pageSize: 30,
    projects: input.projects.map((project) => ({
      createdAt: project.createdAt ?? "2026-05-17 11:00:00",
      id: project.id,
      ownerName: project.ownerName,
      overview: project.overview ?? "",
      projectName: project.projectName,
    })),
    total: input.projects.length,
    totalPages: input.totalPages ?? (input.projects.length === 0 ? 0 : 1),
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "siteboss" },
        user: { isSiteAdmin: true, loginId: "siteboss" },
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("site admin project list keeps legacy list and pagination alignment", async ({ page }) => {
  await page.route(apiV1Route("/site/projects**"), async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      body: JSON.stringify(
        siteProjectsPayload({
          filter: url.searchParams.get("filter") ?? "",
          projects: [
            {
              createdAt: "2026-05-17 11:00:00",
              id: 7,
              ownerName: "siteboss",
              overview: "Legacy project list row",
              projectName: "alpha-project",
            },
            {
              createdAt: "2026-05-18 12:30:00",
              id: 8,
              ownerName: "pilot",
              overview: "Second row keeps list dimensions stable",
              projectName: "beta-project",
            },
          ],
          totalPages: 3,
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/sites/projectList?filter=alpha");

  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Site management");
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Projects");
  await expect(page.locator(".project-list-wrap .listitem")).toHaveCount(2);
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();

  const navbar = await layoutBox(page, ".gnb-outer");
  const breadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const pageOuter = await layoutBox(page, ".site-admin-page .page-wrap-outer");
  const sidebar = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span2");
  const content = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span10");
  const titleArea = await layoutBox(page, ".site-setting-wrap .title_area");
  const heading = await layoutBox(page, ".site-setting-wrap .title_area h2");
  const search = await layoutBox(page, ".site-setting-wrap .form-search");
  const listhead = await layoutBox(page, ".site-setting-wrap .listhead");
  const firstItem = await layoutBox(page, ".site-setting-wrap .project-list-wrap .listitem");
  const nameHeader = await layoutBox(page, ".site-setting-wrap .listhead .span5");
  const descriptionHeader = await layoutBox(page, ".site-setting-wrap .listhead .span4");
  const firstNameCell = await layoutBox(
    page,
    ".site-setting-wrap .project-list-wrap .listitem:first-child .span5",
  );
  const firstDescriptionCell = await layoutBox(
    page,
    ".site-setting-wrap .project-list-wrap .listitem:first-child .span4",
  );
  const pagination = await layoutBox(page, "#pagination.page-navigation-wrap");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(navbar.height).toBeGreaterThanOrEqual(38);
  expect(navbar.height).toBeLessThanOrEqual(44);
  expect(breadcrumb.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageOuter.y).toBeGreaterThanOrEqual(breadcrumb.y + breadcrumb.height + 8);
  expect(footer.y).toBeGreaterThan(pageOuter.y + pageOuter.height - 1);

  expect(sidebar.x).toBeLessThan(content.x);
  expect(sidebar.width).toBeGreaterThanOrEqual(170);
  expect(sidebar.width).toBeLessThanOrEqual(190);
  expect(content.width).toBeGreaterThanOrEqual(840);
  expect(Math.abs(sidebar.y - content.y)).toBeLessThanOrEqual(1);

  expect(titleArea.x).toBeCloseTo(content.x, 0);
  expect(titleArea.width).toBeCloseTo(content.width, 0);
  expect(search.x).toBeGreaterThan(heading.x + heading.width);
  expect(search.y).toBeGreaterThanOrEqual(titleArea.y);
  expect(search.y + search.height).toBeLessThanOrEqual(titleArea.y + titleArea.height + 1);

  expect(listhead.y).toBeGreaterThan(titleArea.y + titleArea.height - 1);
  expect(firstItem.y).toBeGreaterThanOrEqual(listhead.y + listhead.height - 1);
  expect(Math.abs(firstItem.width - listhead.width)).toBeLessThanOrEqual(4);
  expect(firstNameCell.x).toBeCloseTo(nameHeader.x, 0);
  expect(Math.abs(firstNameCell.width - nameHeader.width)).toBeLessThanOrEqual(4);
  expect(Math.abs(firstDescriptionCell.x - descriptionHeader.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(firstDescriptionCell.width - descriptionHeader.width)).toBeLessThanOrEqual(4);
  expect(pagination.y).toBeGreaterThan(firstItem.y + firstItem.height);
});

test("site admin project list preserves legacy shell and delete modal", async ({ page }) => {
  let deleted = false;
  const requests: string[] = [];

  await page.route(apiV1Route("/site/projects**"), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}${url.search}`);

    if (request.method() === "DELETE" && url.pathname.endsWith("/site/projects/7")) {
      deleted = true;
      await route.fulfill({
        body: JSON.stringify({ ok: true, redirectPath: "/sites/projectList" }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    const filter = url.searchParams.get("filter") ?? "";
    const projects =
      filter.toLowerCase().includes("alpha") && !deleted
        ? [
            {
              createdAt: "2026-05-17 11:00:00",
              id: 7,
              ownerName: "siteboss",
              overview: "Legacy project list row",
              projectName: "alpha-project",
            },
          ]
        : [];

    await route.fulfill({
      body: JSON.stringify(
        siteProjectsPayload({
          filter,
          projects,
          totalPages: filter === "alpha" ? 2 : undefined,
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/projectList?filter=alpha");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Projects");
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);
  await expect(page.locator("input[name='filter']")).toHaveValue("alpha");
  await expect(page.locator(".project-list-wrap .listitem")).toHaveCount(1);
  await expect(page.locator(".project-list-wrap .project-name")).toHaveText(
    "siteboss/alpha-project",
  );
  await expect(page.locator(".project-list-wrap .project-overview")).toHaveText(
    "Legacy project list row",
  );
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("Next page");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    "/yona/sites/projectList?filter=alpha&pageNum=2",
  );

  const deleteButton = page.locator("[data-toggle='delete-project']");
  await expect(deleteButton).toHaveAttribute("data-project-name", "siteboss/alpha-project");
  await expect(deleteButton).toHaveAttribute("data-href", "/yona/sites/project/delete/7");
  await expect(deleteButton).toHaveAttribute("data-request-uri", "/yona/api/v1/site/projects/7");
  await deleteButton.click();

  await expect(page.locator("#alertDeletionWrap")).toBeVisible();
  await expect(page.locator("#project-name")).toHaveText("siteboss/alpha-project");
  await page.locator("#projectDeleteBtn").click();
  await expect
    .poll(() => requests.some((request) => request === "DELETE /yona/api/v1/site/projects/7"))
    .toBe(true);
  await expect(page.locator(".project-list-wrap")).toHaveCount(1);
  await expect(page.locator(".warning-none")).toHaveCount(0);
});
