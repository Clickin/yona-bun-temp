import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

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
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText(
    "site.sidebar.projectList",
  );
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
  await expect(page.locator("#pagination")).toContainText("button.nextPage");
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
