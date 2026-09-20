import { expect, test, type Page } from "../wtr-compat.ts";

test("organization directory formats lossless timestamps across the eight-day and year boundaries", async ({
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
  await mockAuthenticatedOrganizations(
    page,
    dates.map(({ value }, index) => ({
      organizationName: `date-${index}`,
      createdAt: value,
    })),
  );
  await page.goto(`${basePath}/orgs`);
  const createdDates = page.locator(".all-projects .name-tag > strong");
  await expect(createdDates).toHaveCount(dates.length);
  for (const [index, date] of dates.entries()) {
    await expect(createdDates.nth(index)).toHaveText(date.label);
    await expect(createdDates.nth(index)).toHaveAttribute("title", date.title);
  }
});

test("organizations list preserves legacy directory title and initial focus", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const filterInput = page.locator('#search input[name="filter"]');
  await expect(page.locator(".all-projects .project")).toBeVisible();
  await expect.poll(() => page.title()).toBe("Project list");
  await expect
    .poll(() => page.evaluate(() => document.head.querySelector("title")?.textContent))
    .toBe("Project list");
  await expect.poll(() => filterInput.getAttribute("autofocus")).toBeNull();
  await expect(filterInput).toBeFocused();
});

for (const width of [1366, 390]) {
  test(`organization directory preserves legacy wrapper geometry at ${width}px`, async ({
    page,
  }) => {
    const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
    await page.setViewportSize({ width, height: 900 });
    await mockAuthenticatedOrganizations(page);
    await page.goto(`${basePath}/orgs`);
    await expect(page.locator(".all-projects .project")).toBeVisible();
    await expect(
      page.locator(".site-breadcrumb-outer > .site-breadcrumb-inner > .title_area"),
    ).toBeVisible();
    const geometry = await page
      .locator(".page-wrap-outer > .project-page-wrap")
      .evaluate((shell) => {
        const outer = shell.parentElement!;
        const list = shell.querySelector(".all-projects")!;
        return {
          outerPadding: getComputedStyle(outer).padding,
          shellPadding: getComputedStyle(shell).padding,
          left: list.getBoundingClientRect().left,
          right: list.getBoundingClientRect().right,
          viewportWidth: document.documentElement.clientWidth,
        };
      });
    const inset = width === 390 ? 0 : 10;
    expect(geometry.outerPadding).toBe(width === 390 ? "0px" : "0px 10px");
    expect(geometry.shellPadding).toBe("0px");
    expect(geometry.left).toBe(inset);
    expect(geometry.right).toBe(geometry.viewportWidth - inset);
  });
}

test("organization list filter input preserves legacy initial focus without React prop warnings", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleMessages: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push(message.text());
    }
  });
  await mockAuthenticatedOrganizations(page);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const filterInput = page.locator('#search input[name="filter"]');
  await expect.poll(() => filterInput.getAttribute("autofocus")).toBeNull();
  await expect(filterInput).toBeFocused();
  expect(
    consoleMessages.some(
      (message) =>
        message.includes("Invalid DOM property") &&
        message.includes("autofocus") &&
        message.includes("autoFocus"),
    ),
  ).toBe(false);
});

test("organization directory card links keep legacy hrefs and use SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const logoLink = page.locator(".all-projects .owner-avatar-wrap a");
  const nameLink = page.locator(".all-projects .header a.black");

  await expect(logoLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(logoLink.locator("img")).toHaveCount(0);
  await expect(logoLink).not.toHaveAttribute("aria-current");
  await expect(logoLink).not.toHaveAttribute("data-status");
  await expect(nameLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(nameLink).toHaveClass("black");
  await expect(nameLink).not.toHaveAttribute("aria-current");
  await expect(nameLink).not.toHaveAttribute("data-status");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await nameLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization directory card falls back to legacy org.name and org.descr fields", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page, [
    {
      createdAt: "2026-06-30T12:00:00Z",
      descr: "Legacy group description",
      logoUrl: "",
      name: "legacy-labs",
    },
  ]);

  await page.goto(`${basePath}/orgs?filter=legacy`);
  const card = page.locator(".all-projects .project").first();

  await expect(card.locator(".owner-avatar-wrap a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/legacy-labs`,
  );
  await expect(card.locator(".header a.black")).toHaveAttribute(
    "href",
    `${basePath}/organizations/legacy-labs`,
  );
  await expect(card.locator(".header a.black")).toHaveText("legacy-labs");
  await expect(card.locator(".desc")).toHaveText("Legacy group description");
});

test("organization directory top tabs keep legacy hrefs without active marker leakage", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const projectTab = page.locator(".title_area .nav-tabs > li").first();
  const orgTab = page.locator(".title_area .nav-tabs > li").nth(1);
  const projectLink = projectTab.locator("a");
  const orgLink = orgTab.locator("a");
  const navbarProjectLink = page.locator('[data-owner="global-gnb-project-list-link"]');

  await expect(projectTab).not.toHaveClass(/active/u);
  await expect(orgTab).toHaveClass("active");
  await expect(projectLink).toHaveAttribute("href", `${basePath}/projects`);
  await expect(orgLink).toHaveAttribute("href", `${basePath}/orgs`);
  await expect(projectLink).not.toHaveAttribute("aria-current");
  await expect(projectLink).not.toHaveAttribute("data-status");
  await expect(orgLink).not.toHaveAttribute("aria-current");
  await expect(orgLink).not.toHaveAttribute("data-status");
  await expect(navbarProjectLink).toHaveAttribute("href", `${basePath}/projects`);
  await expect(navbarProjectLink).not.toHaveAttribute("aria-current");
  await expect(navbarProjectLink).not.toHaveAttribute("data-status");
});

test("organization directory renders legacy multi-page pagination with query-preserving SPA links", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(
    page,
    [
      {
        createdAt: "2026-06-30T12:00:00Z",
        description: "Web labs group",
        logoUrl: "",
        organizationName: "weblabs",
      },
    ],
    {
      pageNum: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 3,
    },
  );

  await page.goto(`${basePath}/orgs?filter=weblabs&pageNum=1`);
  const pagination = page.locator("#pagination");
  const nextLink = pagination.locator("li.page-num.ikon a").last();

  await expect(pagination).toHaveClass("page-navigation-wrap");
  await expect(pagination.locator("ul.page-nums")).toHaveCount(1);
  await expect(pagination.locator("li.page-num")).toHaveCount(5);
  await expect(pagination.locator("li.page-num.ikon").first().locator("a")).toHaveCount(0);
  await expect(pagination.locator("li.page-num.ikon").first().locator(".off")).toHaveCount(2);
  await expect(pagination.locator('input[name="pageNum"][type="number"]')).toHaveValue("1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "3");
  await expect(pagination.locator(".delimiter")).toHaveText("/");
  await expect(pagination.locator("li.page-num").nth(3)).toHaveText("3");
  await expect(nextLink).toHaveAttribute("href", `${basePath}/orgs?filter=weblabs&pageNum=2`);
  await expect(nextLink).not.toHaveAttribute("aria-current");
  await expect(nextLink).not.toHaveAttribute("data-status");
  await expect(nextLink).not.toHaveAttribute("class");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await nextLink.click();

  await expect(page).toHaveURL(`${basePath}/orgs?filter=weblabs&pageNum=2`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(pagination.locator('input[name="pageNum"][type="number"]')).toHaveValue("2");
  await expect(pagination.locator("li.page-num.ikon a").first()).toHaveAttribute(
    "href",
    `${basePath}/orgs?filter=weblabs&pageNum=1`,
  );
  await expect(pagination.locator("li.page-num.ikon a").first()).not.toHaveAttribute(
    "aria-current",
  );
  await expect(pagination.locator("li.page-num.ikon a").first()).not.toHaveAttribute("data-status");
  await expect(pagination.locator("li.page-num.ikon a").first()).not.toHaveAttribute("class");
});

test("organization directory pagination input clamps valid pages and resets invalid input", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(
    page,
    [
      {
        createdAt: "2026-06-30T12:00:00Z",
        description: "Web labs group",
        logoUrl: "",
        organizationName: "weblabs",
      },
    ],
    {
      pageNum: 2,
      pageSize: 1,
      totalCount: 3,
      totalPages: 3,
    },
  );

  await page.goto(`${basePath}/orgs?filter=weblabs&pageNum=2`);
  const input = page.locator('#pagination input[name="pageNum"]');
  await expect(input).toHaveValue("2");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await input.fill("99");
  await input.press("Enter");

  await expect(page).toHaveURL(`${basePath}/orgs?filter=weblabs&pageNum=3`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.goto(`${basePath}/orgs?filter=weblabs&pageNum=2`);
  await input.fill("1.5");
  await input.press("Enter");

  await expect(page).toHaveURL(`${basePath}/orgs?filter=weblabs&pageNum=2`);
  await expect(input).toHaveValue("2");
});

test("organization directory keeps the page indicator visible for a single page", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(
    page,
    [
      {
        createdAt: "2026-06-30T12:00:00Z",
        description: "Web labs group",
        logoUrl: "",
        organizationName: "weblabs",
      },
    ],
    {
      pageNum: 1,
      pageSize: 1,
      totalCount: 1,
      totalPages: 1,
    },
  );

  await page.goto(`${basePath}/orgs?filter=weblabs`);

  const pagination = page.locator("#pagination");
  await expect(pagination.locator('input[name="pageNum"]')).toBeVisible();
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "1");
  await expect(pagination.getByText("Previous page", { exact: true })).toBeVisible();
  await expect(pagination.getByText("Next page", { exact: true })).toBeVisible();
  await expect(pagination.locator("a")).toHaveCount(0);
});

test("organization directory omits pagination when there are no matching groups", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page, [], { pageNum: 1, totalCount: 0, totalPages: 0 });

  await page.goto(`${basePath}/orgs?filter=missing`);

  await expect(page.locator("#search input")).toHaveValue("missing");
  await expect(page.locator('[data-owner="organization-directory-empty-message"]')).toHaveText(
    "You do not belong to any group",
  );
  await expect(page.locator("#pagination")).toHaveCount(0);
});

test("organization directory renders unreadable private organization card like legacy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page, [
    {
      createdAt: "2026-06-30T12:00:00Z",
      description: "Web labs group",
      logoUrl: "",
      organizationName: "weblabs",
    },
    {
      isPrivate: true,
      organizationName: "secret-labs",
      viewerCanRead: false,
    },
  ]);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const unreadableCard = page.locator(".all-projects .project").nth(1);
  const infoWrap = unreadableCard.locator(".info-wrap");

  await expect(unreadableCard).toHaveCSS("background-color", "rgb(252, 252, 252)");
  await expect(infoWrap).toHaveCSS("opacity", "0.3");
  await expect(unreadableCard.locator(".owner-avatar-wrap img")).toHaveAttribute(
    "src",
    "/assets/images/organization_default_logo.png",
  );
  await expect(unreadableCard.locator(".owner-avatar-wrap img")).toHaveAttribute(
    "alt",
    "secret-labs",
  );
  await expect(infoWrap.locator("div").last()).toHaveCSS("color", "rgb(128, 128, 128)");
  await expect(unreadableCard).toContainText(
    "You do not have permission to view this project's information",
  );
  await expect(unreadableCard.locator("a")).toHaveCount(0);
  await expect(
    page.locator(".all-projects .project").first().locator(".header a.black"),
  ).toHaveText("weblabs");
});

async function mockAuthenticatedOrganizations(
  page: Page,
  items: Record<string, unknown>[] = [
    {
      createdAt: "2026-06-30T12:00:00Z",
      description: "Web labs group",
      logoUrl: "",
      organizationName: "weblabs",
    },
  ],
  pageMetadata: Record<string, unknown> = {},
) {
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
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "/assets/images/organization_default_logo.png",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/organizations**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (
      !pathname.endsWith("/api/v1/organizations") &&
      !pathname.endsWith("/api/v1/organizations/")
    ) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items,
        ...pageMetadata,
      }),
    });
  });
}
