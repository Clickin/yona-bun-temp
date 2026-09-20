import { expect, test, type Page } from "../wtr-compat.ts";

test("project directory formats lossless timestamps across the eight-day and year boundaries", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.clock.setFixedTime(new Date(2026, 8, 19, 12));
  await page.addInitScript((basePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const dates = [
    {
      value: new Date(2026, 8, 19, 11, 58).toISOString(),
      label: "2 minutes ago",
      title: "2026-09-19 11:58:00 AM",
    },
    {
      value: new Date(2026, 8, 11, 12, 0, 1).toISOString(),
      label: "7 days ago",
      title: "2026-09-11 12:00:01 PM",
    },
    {
      value: new Date(2026, 8, 11, 12).toISOString(),
      label: "09-11",
      title: "2026-09-11 12:00:00 PM",
    },
    {
      value: new Date(2025, 8, 11, 12).toISOString(),
      label: "2025-09-11",
      title: "2025-09-11 12:00:00 PM",
    },
    { value: "", label: "", title: "" },
  ];
  await mockAuthenticatedProjects(page, {
    items: dates.map(({ value }, index) =>
      makeReadableProjectDirectoryItem({
        projectName: `date-${index}`,
        createdAt: value,
        lastPushedAt: value,
      }),
    ),
  });
  await page.goto(`${basePath}/projects`);
  const createdDates = page.locator('[data-owner="projects-directory-name-tag"] > strong');
  const pushedDates = page.locator('[data-owner="projects-directory-code-update"]');
  await expect(createdDates).toHaveCount(dates.length);
  for (const [index, date] of dates.entries()) {
    await expect(createdDates.nth(index)).toHaveText(date.label);
    await expect(createdDates.nth(index)).toHaveAttribute("title", date.title);
    await expect(pushedDates.nth(index)).toHaveText(
      date.value ? `, Latest code update ${date.label}` : "",
    );
  }
});

test("projects list preserves legacy directory layout and title", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator('[data-owner="projects-directory-row"]').first()).toBeVisible();
  await expect(page).toHaveTitle("Project list");
  await expect
    .poll(() =>
      page
        .locator("head > title")
        .evaluateAll((titles) => titles.map((title) => title.textContent ?? "")),
    )
    .toContain("Project list");

  const expectedMetrics = {
    avatarBorderRadius: "3px",
    avatarDisplay: "block",
    avatarFloat: "left",
    avatarHeight: "50px",
    avatarImageHeight: "50px",
    // F5 dist-truth (2026-08-20): 50px — the route-owned
    // [data-owner=projects-directory-owner-avatar-image] height:100% fills
    // the 50px avatar box (legacy .owner-avatar-wrap img{height:100%} parity).
    // The prior 36px pin matched a pre-load image state, not settled css.
    avatarImageVerticalAlign: "top",
    avatarImageWidth: "50px",
    avatarMarginRight: "10px",
    avatarWidth: "50px",
    descriptionColor: "rgb(186, 186, 186)",
    descriptionMarginLeft: "10px",
    headerFontSize: "20px",
    headerFontWeight: "700",
    headerMarginBottom: "5px",
    headerMarginLeft: "10px",
    listClear: "both",
    listMargin: "0px 0px 20px",
    listStyleType: "none",
    nameTagColor: "rgb(153, 153, 153)",
    nameTagFontSize: "11px",
    nameTagMarginLeft: "10px",
    rowBorderBottomColor: "rgb(220, 220, 220)",
    rowBorderBottomStyle: "solid",
    rowOverflow: "hidden",
    rowPadding: "15px 0px 10px",
    statsTextAlign: "right",
    statsWidth: "120px",
  };
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(
        document.querySelectorAll<HTMLImageElement>('[data-owner="projects-directory-row"] img'),
      ).map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        }
        if (image.naturalWidth > 0) await image.decode();
      }),
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  expect(await readProjectsListMetrics(page)).toEqual(expectedMetrics);
});

test("projects list filter input keeps legacy initial focus without lowercase autofocus injection", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);
  const autofocusWarnings: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("Invalid DOM property") || text.includes("autofocus autoFocus")) {
      autofocusWarnings.push(text);
    }
  });

  await page.goto(`${basePath}/projects?filter=sample`);
  const filterInput = page.locator('#search input[name="filter"]');
  await expect(filterInput).toBeFocused();
  expect(autofocusWarnings).toEqual([]);
});

test("project directory top tabs keep legacy hrefs without active marker leakage", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator('[data-owner="projects-directory-row"]').first()).toBeVisible();

  const tabItems = page.locator('[data-owner="projects-directory-tabs-item"]');
  const projectTabItem = tabItems.nth(0);
  const organizationTabItem = tabItems.nth(1);
  const projectTabLink = projectTabItem.locator(
    ':scope > [data-owner="projects-directory-tabs-link"]',
  );
  const organizationTabLink = organizationTabItem.locator(
    ':scope > [data-owner="projects-directory-tabs-link"]',
  );
  const navbarProjectLink = page.locator('[data-owner="global-gnb-project-list-link"]');

  await expect(projectTabItem).toHaveAttribute("data-selected", "true");
  await expect(organizationTabItem).toHaveAttribute("data-selected", "false");
  await expect(projectTabLink).toHaveAttribute("href", `${basePath}/projects`);
  await expect(organizationTabLink).toHaveAttribute("href", `${basePath}/orgs`);
  await expect(projectTabLink).not.toHaveAttribute("class", /active/);
  await expect(projectTabLink).not.toHaveAttribute("data-status", /./);
  await expect(projectTabLink).not.toHaveAttribute("aria-current", /./);
  await expect(organizationTabLink).not.toHaveAttribute("class", /active/);
  await expect(organizationTabLink).not.toHaveAttribute("data-status", /./);
  await expect(organizationTabLink).not.toHaveAttribute("aria-current", /./);
  await expect(navbarProjectLink).toHaveAttribute("href", `${basePath}/projects`);
  // wave-33 retained-class retention (667398a04): show-progress-bar is deliberately retained on the
  // gnb project-list link at frontend/src/routes/-home-route-screen.tsx:1901 (legacy
  // yona-original/app/views/common/navbar.scala.html:46 uses the same class).
  await expect(navbarProjectLink).toHaveClass(/(?:^|\s)show-progress-bar(?:\s|$)/u);
  await expect(navbarProjectLink).not.toHaveAttribute("data-status");
  await expect(navbarProjectLink).not.toHaveAttribute("aria-current");
});

test("project directory card links keep legacy hrefs while using SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);
  await mockProjectCardDestinations(page);

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator('[data-owner="projects-directory-row"]').first()).toBeVisible();

  const projectLogoLink = page.locator(
    '[data-owner="projects-directory-list"] [data-owner="projects-directory-owner-avatar"] a',
  );
  const projectNameLink = page.locator('[data-owner="projects-directory-title-link"]');
  const ownerNameLink = page.locator('[data-owner="projects-directory-owner-link"]');

  await expect(projectLogoLink).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectNameLink).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(ownerNameLink).toHaveAttribute(
    "href",
    `${basePath}/admin?daysAgo=14&selected=issues`,
  );
  await expect(projectNameLink).not.toHaveClass(/(?:^|\s)black(?:\s|$)/u);
  await expect(ownerNameLink).not.toHaveClass(/(?:^|\s)owner-name-small(?:\s|$)/u);
  await expectNoActiveMarker(projectLogoLink);
  await expectNoActiveMarker(projectNameLink);
  await expectNoActiveMarker(ownerNameLink);

  await page.evaluate(() => {
    (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker = "project";
  });
  await projectNameLink.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker,
      ),
    )
    .toBe("project");

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator('[data-owner="projects-directory-row"]').first()).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker = "owner";
  });
  await ownerNameLink.click();
  await expect(page).toHaveURL(`${basePath}/admin?daysAgo=14&selected=issues`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker,
      ),
    )
    .toBe("owner");
});

test("project directory labels keep legacy header links and query", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const projectRequests: Array<{ filter: string | null; labelIds: string | null }> = [];
  await mockAuthenticatedProjects(page, (requestUrl) => {
    const queryState = {
      filter: requestUrl.searchParams.get("filter"),
      labelIds: requestUrl.searchParams.get("labelIds"),
    };
    projectRequests.push(queryState);

    if (queryState.labelIds === "8") {
      return {
        items: [
          makeReadableProjectDirectoryItem({
            overview: "Bug-only project list",
            projectName: "sample-bug",
          }),
        ],
        pageNum: 1,
        totalPages: 1,
      };
    }

    return {
      items: [makeReadableProjectDirectoryItem()],
      pageNum: 1,
      totalPages: 1,
    };
  });

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator('[data-owner="projects-directory-row"]').first()).toBeVisible();
  expect(projectRequests).toContainEqual({ filter: "sample", labelIds: null });

  const projectLabel = page.locator(
    '[data-owner="projects-directory-list"] [data-owner="projects-directory-project-label"]',
  );
  await expect(projectLabel).toHaveCount(1);
  await expect(projectLabel).toHaveClass(/(?:^|\s)bug(?:\s|$)/u);
  await expect(projectLabel).not.toHaveClass(/(?:^|\s)project-label(?:\s|$)/u);
  await expect(projectLabel).toHaveText("bug");
  await expect(projectLabel).toHaveAttribute("href", `${basePath}/projects?labelIds=8`);
  await expectNoActiveMarker(projectLabel);

  await page.evaluate(() => {
    (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker = "label";
  });
  await projectLabel.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/projects`);
  await expect.poll(() => new URL(page.url()).searchParams.get("labelIds")).toBe("8");
  await expect.poll(() => new URL(page.url()).searchParams.has("filter")).toBe(false);
  await expect(page.locator('[data-owner="projects-directory-row"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="projects-directory-title-link"]')).toHaveText(
    "sample-bug",
  );
  expect(projectRequests).toContainEqual({ filter: null, labelIds: "8" });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker,
      ),
    )
    .toBe("label");
});

test("projects list applies filter, labelIds, and pageNum query state to API requests and results", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const projectRequests: Array<{
    filter: string | null;
    labelIds: string | null;
    pageNum: string | null;
  }> = [];
  await mockAuthenticatedProjects(page, (requestUrl) => {
    const queryState = {
      filter: requestUrl.searchParams.get("filter"),
      labelIds: requestUrl.searchParams.get("labelIds"),
      pageNum: requestUrl.searchParams.get("pageNum"),
    };
    projectRequests.push(queryState);

    if (
      queryState.filter === "sample" &&
      queryState.labelIds === "8" &&
      queryState.pageNum === "2"
    ) {
      return {
        items: [
          makeReadableProjectDirectoryItem({
            overview: "Legacy query page two",
            projectName: "sample-page-two",
          }),
        ],
        pageNum: 2,
        totalPages: 3,
      };
    }

    if (
      queryState.filter === "sample" &&
      queryState.labelIds === "8" &&
      queryState.pageNum === "1"
    ) {
      return {
        items: [
          makeReadableProjectDirectoryItem({
            overview: "Legacy query page one",
            projectName: "sample-page-one",
          }),
        ],
        pageNum: 1,
        totalPages: 3,
      };
    }

    return {
      items: [
        makeReadableProjectDirectoryItem({
          overview: "Plain query fallback",
          projectName: "unexpected-plain",
        }),
      ],
      pageNum: 1,
      totalPages: 1,
    };
  });

  await page.goto(`${basePath}/projects?filter=sample&labelIds=8&pageNum=2`);
  await expect(page.locator('[data-owner="projects-directory-row"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="projects-directory-title-link"]')).toHaveText(
    "sample-page-two",
  );
  await expect(page.locator('[data-owner="projects-directory-description"]')).toHaveText(
    "Legacy query page two",
  );
  await expect(
    page.locator(
      '[data-owner="projects-directory-list"] [data-owner="projects-directory-project-label"]',
    ),
  ).toHaveText("bug");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("2");
  expect(projectRequests).toContainEqual({ filter: "sample", labelIds: "8", pageNum: "2" });

  const previousPageLink = page.locator("#pagination a", { hasText: "Previous page" });
  await previousPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  await expect(page.locator('[data-owner="projects-directory-title-link"]')).toHaveText(
    "sample-page-one",
  );
  await expect(page.locator('[data-owner="projects-directory-description"]')).toHaveText(
    "Legacy query page one",
  );
  expect(projectRequests).toContainEqual({ filter: "sample", labelIds: "8", pageNum: "1" });
});

test("projects list renders legacy pagination controls for multi-page project lists", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page, { pageNum: 1, totalPages: 3 });

  await page.goto(`${basePath}/projects?filter=sample&labelIds=8&pageNum=1`);
  await expect(page.locator('[data-owner="projects-directory-row"]').first()).toBeVisible();

  const pagination = page.locator('[data-owner="projects-directory-pagination"]');
  await expect(pagination).not.toHaveClass(/(?:^|\s)page-navigation-wrap(?:\s|$)/u);
  await expect(
    pagination.locator(':scope > [data-owner="projects-directory-pagination-list"]'),
  ).toHaveCount(1);
  const paginationItems = pagination.locator('[data-owner="projects-directory-pagination-item"]');
  await expect(paginationItems).toHaveCount(5);
  await expect(
    pagination.locator(
      '[data-owner="projects-directory-pagination-prev-icon"][data-disabled="true"]',
    ),
  ).toHaveCount(1);
  await expect(
    pagination.locator('[data-owner="projects-directory-pagination-label"][data-disabled="true"]'),
  ).toHaveText("Previous page");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "3");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
  await expect(paginationItems.nth(2)).toHaveText("/");
  await expect(paginationItems.nth(3)).toHaveText("3");

  const nextPageLink = pagination.locator("a", { hasText: "Next page" });
  await expectNoActiveMarker(nextPageLink);

  const nextHref = await nextPageLink.getAttribute("href");
  expect(nextHref).not.toBeNull();
  const nextUrl = new URL(nextHref ?? "", page.url());
  expect(nextUrl.pathname).toBe(`${basePath}/projects`);
  expect(nextUrl.searchParams.get("filter")).toBe("sample");
  expect(nextUrl.searchParams.get("labelIds")).toBe("8");
  expect(nextUrl.searchParams.get("pageNum")).toBe("2");

  await page.evaluate(() => {
    (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker =
      "pagination";
  });
  await nextPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectsListSpaMarker?: string }).__projectsListSpaMarker,
      ),
    )
    .toBe("pagination");

  const prevPageLink = pagination.locator("a", { hasText: "Previous page" });
  await expectNoActiveMarker(prevPageLink);

  const prevHref = await prevPageLink.getAttribute("href");
  expect(prevHref).not.toBeNull();
  const prevUrl = new URL(prevHref ?? "", page.url());
  expect(prevUrl.pathname).toBe(`${basePath}/projects`);
  expect(prevUrl.searchParams.get("filter")).toBe("sample");
  expect(prevUrl.searchParams.get("labelIds")).toBe("8");
  expect(prevUrl.searchParams.get("pageNum")).toBe("1");

  const pageInput = pagination.locator('input[name="pageNum"]');
  await pageInput.fill("9");
  await pageInput.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(pageInput).toHaveValue("3");
  await expect(
    pagination.locator(
      '[data-owner="projects-directory-pagination-next-icon"][data-disabled="true"]',
    ),
  ).toHaveCount(1);
});

test("site admin project delete button drops legacy delegated hooks while React owns delete", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  const requests = await mockSiteProjects(page);
  await mockSiteUpdate(page);

  await page.goto(`${basePath}/sites/projectList?filter=road`);
  await expect(page.locator('[data-owner="site-project-list-row"]')).toHaveCount(1);

  const deleteButton = page.locator('[data-owner="site-project-list-delete-action"]');
  await expect(deleteButton).toHaveText("Delete");
  await expect(deleteButton).toHaveAttribute("data-project-name", "acme/roadmap");
  await expect(deleteButton).not.toHaveAttribute("data-href", /.+/);
  await expect(deleteButton).not.toHaveAttribute("data-toggle", /.+/);
  await expect(
    page.locator('[data-toggle="delete-project"], [data-href*="/sites/project/delete"]'),
  ).toHaveCount(0);

  await page.evaluate(() => {
    (
      window as Window & { __siteAdminProjectDeleteSpaMarker?: string }
    ).__siteAdminProjectDeleteSpaMarker = "kept";
  });
  const projectListUrl = page.url();
  await deleteButton.click();

  const deleteModal = page.locator("#alertDeletionWrap");
  await expect(deleteModal).toHaveAttribute("data-owner", "site-project-list-delete-modal");
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#project-name")).toHaveText("acme/roadmap");
  await expect(page.locator('[data-owner="site-project-list-delete-modal-header"]')).toHaveText(
    "×acme/roadmapDelete project",
  );
  await expect(page.locator('[data-owner="site-project-list-delete-modal-body"] p')).toHaveText(
    "Do you really want to delete this project?",
  );
  await expect(
    page.locator('[data-owner="site-project-list-delete-modal-footer"] > button'),
  ).toHaveText(["Yes", "No"]);

  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/site/projects/77") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#projectDeleteBtn").click();
  await deleteResponse;

  await expect.poll(() => requests.deletedProjectIds).toEqual(["77"]);
  expect(requests.deleteRequests).toEqual([
    {
      hasCsrfHeader: true,
      method: "DELETE",
      pathname: `${basePath}/api/v1/site/projects/77`,
    },
  ]);
  await expect(page.locator('[data-owner="site-project-list-row"]')).toHaveCount(0);
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(page).toHaveURL(projectListUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __siteAdminProjectDeleteSpaMarker?: string })
            .__siteAdminProjectDeleteSpaMarker,
      ),
    )
    .toBe("kept");
});

async function expectNoActiveMarker(locator: ReturnType<Page["locator"]>) {
  await expect(locator).not.toHaveAttribute("aria-current", /./);
  await expect(locator).not.toHaveAttribute("data-status", /./);
}

type ProjectsDirectoryMockPayload = Record<string, unknown>;
type ProjectsDirectoryMockResolver = (requestUrl: URL) => ProjectsDirectoryMockPayload;

async function mockAuthenticatedProjects(
  page: Page,
  payload: ProjectsDirectoryMockPayload | ProjectsDirectoryMockResolver = {},
) {
  const resolvePayload: ProjectsDirectoryMockResolver =
    typeof payload === "function" ? payload : () => payload;
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/projects**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const resolvedPayload = resolvePayload(requestUrl);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [makeReadableProjectDirectoryItem()],
        ...resolvedPayload,
      }),
    });
  });
}

function makeReadableProjectDirectoryItem(
  overrides: ProjectsDirectoryMockPayload = {},
): ProjectsDirectoryMockPayload {
  return {
    createdAt: "2026-06-30T12:00:00Z",
    labels: [
      {
        category: "BUG",
        id: 8,
        name: "bug",
      },
    ],
    lastPushedAt: "2026-06-30T12:00:00Z",
    logoUrl: `${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/legacy-assets/images/project_default_logo.png`,
    memberCount: 2,
    members: [
      {
        avatarUrl: "/assets/images/default-avatar-32.png",
        loginId: "member1",
        userLabel: "Member One",
      },
      {
        avatarUrl: "/assets/images/default-avatar-32.png",
        loginId: "member2",
        userLabel: "Member Two",
      },
    ],
    overview: "Sample project",
    ownerName: "admin",
    projectName: "sample",
    projectScope: "public",
    watchCount: 3,
    ...overrides,
  };
}

async function mockProjectCardDestinations(page: Page) {
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        allowEnroll: false,
        allowLeave: false,
        allowManage: false,
        allowWatch: true,
        codeBrowserUrl: "/admin/sample/code",
        createdLabel: "just now",
        createdTitle: "2026-06-30",
        isFavorite: false,
        isWatching: false,
        lastPushedLabel: "just now",
        lastPushedTitle: "2026-06-30",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        members: [],
        ownerName: "admin",
        projectName: "sample",
        projectScope: "public",
        readme: "",
        repositoryUrl: "",
      }),
    });
  });
  await page.route("**/api/v1/users/admin/profile?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        daysAgo: 14,
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
          sinceLabel: "just now",
        },
        pullRequestItems: [],
        selected: "issues",
        viewerCanEditProfile: true,
      }),
    });
  });
}

async function mockSiteAdminSession(page: Page) {
  const sessionBody = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "siteboss@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "siteboss",
    userLabel: "Site Boss",
  };
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify(sessionBody),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify(sessionBody),
    });
  });
}

async function mockSiteProjects(page: Page) {
  const requests = {
    deletedProjectIds: [] as string[],
    deleteRequests: [] as Array<{ hasCsrfHeader: boolean; method: string; pathname: string }>,
  };
  const projects = [
    {
      createdAt: "2026-06-29",
      id: 77,
      ownerName: "acme",
      overview: "Release planning",
      projectLogoUrl: "/assets/images/default-project-logo.png",
      projectName: "roadmap",
    },
  ];

  await page.route("**/api/v1/site/projects?*", async (route) => {
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("page") ?? "1") || 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        filter: url.searchParams.get("filter") ?? "",
        page: pageNum,
        pageSize: 20,
        projects,
        total: projects.length,
        totalPages: projects.length > 0 ? 1 : 0,
      }),
    });
  });
  await page.route("**/api/v1/site/projects/*", async (route) => {
    if (route.request().method() === "DELETE") {
      const url = new URL(route.request().url());
      const deletedProjectId = url.pathname.split("/").pop() ?? "";
      requests.deleteRequests.push({
        hasCsrfHeader: Boolean(route.request().headers()["x-csrf-token"]),
        method: route.request().method(),
        pathname: url.pathname,
      });
      requests.deletedProjectIds.push(deletedProjectId);
      const deletedIndex = projects.findIndex((project) => String(project.id) === deletedProjectId);
      if (deletedIndex >= 0) {
        projects.splice(deletedIndex, 1);
      }
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, redirectPath: "/sites/projectList" }),
    });
  });

  return requests;
}

async function mockSiteUpdate(page: Page) {
  await page.route("**/api/v1/site/update", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        currentVersion: "1.0.0",
        error: null,
        message: "site.update.isNotNecessary",
        releaseUrl: null,
        versionToUpdate: null,
      }),
    });
  });
}

async function readProjectsListMetrics(page: Page) {
  return page.evaluate(() => {
    const list = document.querySelector<HTMLElement>('[data-owner="projects-directory-list"]');
    const row = document.querySelector<HTMLElement>('[data-owner="projects-directory-row"]');
    const avatar = document.querySelector<HTMLElement>(
      '[data-owner="projects-directory-owner-avatar"]',
    );
    const avatarImage = document.querySelector<HTMLElement>(
      '[data-owner="projects-directory-owner-avatar-image"]',
    );
    const header = document.querySelector<HTMLElement>('[data-owner="projects-directory-header"]');
    const description = document.querySelector<HTMLElement>(
      '[data-owner="projects-directory-description"]',
    );
    const nameTag = document.querySelector<HTMLElement>(
      '[data-owner="projects-directory-name-tag"]',
    );
    const stats = document.querySelector<HTMLElement>('[data-owner="projects-directory-stats"]');
    const members = document.querySelector<HTMLElement>(
      '[data-owner="projects-directory-members"]',
    );
    if (
      !list ||
      !row ||
      !avatar ||
      !avatarImage ||
      !header ||
      !description ||
      !nameTag ||
      !stats ||
      !members
    ) {
      throw new Error("Expected projects list metric targets are missing.");
    }

    const listStyle = getComputedStyle(list);
    const rowStyle = getComputedStyle(row);
    const avatarStyle = getComputedStyle(avatar);
    const avatarImageStyle = getComputedStyle(avatarImage);
    const headerStyle = getComputedStyle(header);
    const descriptionStyle = getComputedStyle(description);
    const nameTagStyle = getComputedStyle(nameTag);
    const statsStyle = getComputedStyle(stats);
    const membersStyle = getComputedStyle(members);

    return {
      avatarBorderRadius: avatarStyle.borderRadius,
      avatarDisplay: avatarStyle.display,
      avatarFloat: avatarStyle.cssFloat,
      avatarHeight: avatarStyle.height,
      avatarImageHeight: avatarImageStyle.height,
      avatarImageVerticalAlign: avatarImageStyle.verticalAlign,
      avatarImageWidth: avatarImageStyle.width,
      avatarMarginRight: avatarStyle.marginRight,
      avatarWidth: avatarStyle.width,
      descriptionColor: descriptionStyle.color,
      descriptionMarginLeft: descriptionStyle.marginLeft,
      headerFontSize: headerStyle.fontSize,
      headerFontWeight: headerStyle.fontWeight,
      headerMarginBottom: headerStyle.marginBottom,
      headerMarginLeft: headerStyle.marginLeft,
      listClear: listStyle.clear,
      listMargin: listStyle.margin,
      listStyleType: listStyle.listStyleType,
      nameTagColor: nameTagStyle.color,
      nameTagFontSize: nameTagStyle.fontSize,
      nameTagMarginLeft: nameTagStyle.marginLeft,
      rowBorderBottomColor: rowStyle.borderBottomColor,
      rowBorderBottomStyle: rowStyle.borderBottomStyle,
      rowOverflow: rowStyle.overflow,
      rowPadding: rowStyle.padding,
      statsTextAlign: statsStyle.textAlign,
      statsWidth: membersStyle.width,
    };
  });
}
