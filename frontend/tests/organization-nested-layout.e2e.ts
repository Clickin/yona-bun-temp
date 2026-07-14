import { expect, test, type Page } from "@playwright/test";

test("organization home to boards keeps the legacy shell nodes mounted", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationNestedLayout(page);

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${basePath}/organizations/weblabs`);
  await expect(page.locator("#mylist-filter")).toBeVisible();
  await expect(page.locator(".project-menu-gruop > li.active a")).toHaveText("Group Home");

  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __organizationNestedLayoutNodes?: unknown }
    ).__organizationNestedLayoutNodes = {
      header: document.querySelector("[data-stylex-owner=global-gnb-outer]"),
      organizationHeader: document.querySelector(".project-header-outer"),
      organizationMenu: document.querySelector(".project-menu-outer"),
    };
  });

  await page.getByRole("link", { name: "Board", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${basePath}/organizations/weblabs/boards\\?`));
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(page.locator("#mylist-filter")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop > li.active a")).toHaveText("Board");

  expect(
    await page.evaluate(() => {
      const saved = (
        window as Window &
          typeof globalThis & {
            __organizationNestedLayoutNodes?: {
              header: Element | null;
              organizationHeader: Element | null;
              organizationMenu: Element | null;
            };
          }
      ).__organizationNestedLayoutNodes;
      return Boolean(
        saved &&
        saved.header === document.querySelector("[data-stylex-owner=global-gnb-outer]") &&
        saved.organizationHeader === document.querySelector(".project-header-outer") &&
        saved.organizationMenu === document.querySelector(".project-menu-outer"),
      );
    }),
  ).toBe(true);

  await expectShellContainment(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await expectShellContainment(page);
});

test("organization boards to issues keeps the legacy shell nodes mounted", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationNestedLayout(page);

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${basePath}/organizations/weblabs/boards`);
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop > li.active a")).toHaveText("Board");

  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __organizationNestedLayoutNodes?: unknown }
    ).__organizationNestedLayoutNodes = {
      header: document.querySelector("[data-stylex-owner=global-gnb-outer]"),
      organizationHeader: document.querySelector(".project-header-outer"),
      organizationMenu: document.querySelector(".project-menu-outer"),
    };
  });

  await page.getByRole("link", { name: "Issue", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${basePath}/organizations/weblabs/issues(?:\\?.*)?$`));
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator("#option_form")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop > li.active a")).toHaveText("Issue");

  expect(
    await page.evaluate(() => {
      const saved = (
        window as Window &
          typeof globalThis & {
            __organizationNestedLayoutNodes?: {
              header: Element | null;
              organizationHeader: Element | null;
              organizationMenu: Element | null;
            };
          }
      ).__organizationNestedLayoutNodes;
      return Boolean(
        saved &&
        saved.header === document.querySelector("[data-stylex-owner=global-gnb-outer]") &&
        saved.organizationHeader === document.querySelector(".project-header-outer") &&
        saved.organizationMenu === document.querySelector(".project-menu-outer"),
      );
    }),
  ).toBe(true);

  await expectShellContainment(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await expectShellContainment(page);
});

test("organization issues to pull requests keeps the legacy shell nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationNestedLayout(page);

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${basePath}/organizations/weblabs/issues`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".project-menu-gruop > li.active a")).toHaveText("Issue");

  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __organizationNestedLayoutNodes?: unknown }
    ).__organizationNestedLayoutNodes = {
      header: document.querySelector("[data-stylex-owner=global-gnb-outer]"),
      organizationHeader: document.querySelector(".project-header-outer"),
      organizationMenu: document.querySelector(".project-menu-outer"),
    };
  });

  await page.getByRole("link", { name: "Pull request", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`${basePath}/organizations/weblabs/pullrequests(?:\\?.*)?$`),
  );
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();
  await expect(page.locator(".project-menu-gruop > li.active a")).toHaveText("Pull request");

  expect(
    await page.evaluate(() => {
      const saved = (
        window as Window &
          typeof globalThis & {
            __organizationNestedLayoutNodes?: {
              header: Element | null;
              organizationHeader: Element | null;
              organizationMenu: Element | null;
            };
          }
      ).__organizationNestedLayoutNodes;
      return Boolean(
        saved &&
        saved.header === document.querySelector("[data-stylex-owner=global-gnb-outer]") &&
        saved.organizationHeader === document.querySelector(".project-header-outer") &&
        saved.organizationMenu === document.querySelector(".project-menu-outer"),
      );
    }),
  ).toBe(true);

  await expectShellContainment(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await expectShellContainment(page);
});

test("organization pull requests to members keeps the legacy shell nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationNestedLayout(page);

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${basePath}/organizations/weblabs/pullrequests`);
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();

  await page.evaluate((membersPath) => {
    (
      window as Window & typeof globalThis & { __organizationNestedLayoutNodes?: unknown }
    ).__organizationNestedLayoutNodes = {
      header: document.querySelector("[data-stylex-owner=global-gnb-outer]"),
      organizationHeader: document.querySelector(".project-header-outer"),
      organizationMenu: document.querySelector(".project-menu-outer"),
    };
    window.history.pushState({}, "", membersPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, `${basePath}/organizations/weblabs/members`);

  await expect(page).toHaveURL(new RegExp(`${basePath}/organizations/weblabs/members$`));
  await expect(page.locator("#addNewMember")).toBeVisible();
  await expect(page.locator(".nav-tabs > li.active a")).toHaveText("Group member");
  await expect(page.locator(".pullrequeset-tab-menu")).toHaveCount(0);

  expect(
    await page.evaluate(() => {
      const saved = (
        window as Window &
          typeof globalThis & {
            __organizationNestedLayoutNodes?: {
              header: Element | null;
              organizationHeader: Element | null;
              organizationMenu: Element | null;
            };
          }
      ).__organizationNestedLayoutNodes;
      return Boolean(
        saved &&
        saved.header === document.querySelector("[data-stylex-owner=global-gnb-outer]") &&
        saved.organizationHeader === document.querySelector(".project-header-outer") &&
        saved.organizationMenu === document.querySelector(".project-menu-outer"),
      );
    }),
  ).toBe(true);

  await expectShellContainment(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await expectShellContainment(page);
});

test("organization members to settings keeps the legacy shell nodes mounted", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationNestedLayout(page);

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${basePath}/organizations/weblabs/members`);
  await expect(page.locator("#addNewMember")).toBeVisible();
  await expect(page.locator(".nav-tabs > li.active a")).toHaveText("Group member");

  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __organizationNestedLayoutNodes?: unknown }
    ).__organizationNestedLayoutNodes = {
      header: document.querySelector("[data-stylex-owner=global-gnb-outer]"),
      organizationHeader: document.querySelector(".project-header-outer"),
      organizationMenu: document.querySelector(".project-menu-outer"),
    };
  });

  await page.getByRole("link", { name: "Setting", exact: true }).click();
  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();
  await expect(page.locator(".nav-tabs > li.active a")).toHaveText("Setting");
  await expect(page.locator("#addNewMember")).toHaveCount(0);

  expect(
    await page.evaluate(() => {
      const saved = (
        window as Window &
          typeof globalThis & {
            __organizationNestedLayoutNodes?: {
              header: Element | null;
              organizationHeader: Element | null;
              organizationMenu: Element | null;
            };
          }
      ).__organizationNestedLayoutNodes;
      return Boolean(
        saved &&
        saved.header === document.querySelector("[data-stylex-owner=global-gnb-outer]") &&
        saved.organizationHeader === document.querySelector(".project-header-outer") &&
        saved.organizationMenu === document.querySelector(".project-menu-outer"),
      );
    }),
  ).toBe(true);

  await expectShellContainment(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await expectShellContainment(page);
});

test("organization settings to delete form keeps the legacy shell nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationNestedLayout(page);

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();

  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __organizationNestedLayoutNodes?: unknown }
    ).__organizationNestedLayoutNodes = {
      header: document.querySelector("[data-stylex-owner=global-gnb-outer]"),
      organizationHeader: document.querySelector(".project-header-outer"),
      organizationMenu: document.querySelector(".project-menu-outer"),
    };
  });

  await page.getByRole("link", { name: "Group Delete", exact: true }).click();
  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/deleteForm`);
  await expect(page.locator("#btnDelete")).toBeVisible();
  await expect(page.locator(".nav-tabs > li.active a")).toHaveText("Group Delete");
  await expect(page.locator("#saveSetting")).toHaveCount(0);

  expect(
    await page.evaluate(() => {
      const saved = (
        window as Window &
          typeof globalThis & {
            __organizationNestedLayoutNodes?: {
              header: Element | null;
              organizationHeader: Element | null;
              organizationMenu: Element | null;
            };
          }
      ).__organizationNestedLayoutNodes;
      return Boolean(
        saved &&
        saved.header === document.querySelector("[data-stylex-owner=global-gnb-outer]") &&
        saved.organizationHeader === document.querySelector(".project-header-outer") &&
        saved.organizationMenu === document.querySelector(".project-menu-outer"),
      );
    }),
  ).toBe(true);

  await expectShellContainment(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await expectShellContainment(page);
});

test("organization pull requests to closed pull requests keeps the legacy shell nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationNestedLayout(page);

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${basePath}/organizations/weblabs/pullrequests`);
  await expect(page.locator(".pullrequeset-tab-menu")).toBeVisible();
  await expect(page.locator(".project-menu-gruop > li.active a")).toHaveText("Pull request");

  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __organizationNestedLayoutNodes?: unknown }
    ).__organizationNestedLayoutNodes = {
      header: document.querySelector("[data-stylex-owner=global-gnb-outer]"),
      organizationHeader: document.querySelector(".project-header-outer"),
      organizationMenu: document.querySelector(".project-menu-outer"),
    };
  });

  await page.locator(".pullrequeset-tab-menu button").nth(1).click();
  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/closedPullrequests`);
  await expect(page.locator(".pullrequeset-tab-menu > li.active")).toHaveText("Closed0");
  await expect(page.locator(".project-menu-gruop > li.active a")).toHaveText("Pull request");

  expect(
    await page.evaluate(() => {
      const saved = (
        window as Window &
          typeof globalThis & {
            __organizationNestedLayoutNodes?: {
              header: Element | null;
              organizationHeader: Element | null;
              organizationMenu: Element | null;
            };
          }
      ).__organizationNestedLayoutNodes;
      return Boolean(
        saved &&
        saved.header === document.querySelector("[data-stylex-owner=global-gnb-outer]") &&
        saved.organizationHeader === document.querySelector(".project-header-outer") &&
        saved.organizationMenu === document.querySelector(".project-menu-outer"),
      );
    }),
  ).toBe(true);

  await expectShellContainment(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await expectShellContainment(page);
});

test("organization closed pull requests to search keeps the legacy shell nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationNestedLayout(page);

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${basePath}/organizations/weblabs/closedPullrequests`);
  await expect(page.locator(".pullrequeset-tab-menu > li.active")).toHaveText("Closed0");

  await page.evaluate((searchPath) => {
    (
      window as Window & typeof globalThis & { __organizationNestedLayoutNodes?: unknown }
    ).__organizationNestedLayoutNodes = {
      header: document.querySelector("[data-stylex-owner=global-gnb-outer]"),
      organizationHeader: document.querySelector(".project-header-outer"),
      organizationMenu: document.querySelector(".project-menu-outer"),
    };
    window.history.pushState({}, "", searchPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, `${basePath}/organizations/weblabs/search?keyword=sample&searchType=project`);

  await expect(page).toHaveURL(
    `${basePath}/organizations/weblabs/search?keyword=sample&searchType=project`,
  );
  await expect(page.locator("#searchInnerForm")).toBeVisible();
  await expect(page.locator(".search-category-wrap li.active button")).toHaveText("Projects 0");
  await expect(page.locator(".pullrequeset-tab-menu")).toHaveCount(0);

  expect(
    await page.evaluate(() => {
      const saved = (
        window as Window &
          typeof globalThis & {
            __organizationNestedLayoutNodes?: {
              header: Element | null;
              organizationHeader: Element | null;
              organizationMenu: Element | null;
            };
          }
      ).__organizationNestedLayoutNodes;
      return Boolean(
        saved &&
        saved.header === document.querySelector("[data-stylex-owner=global-gnb-outer]") &&
        saved.organizationHeader === document.querySelector(".project-header-outer") &&
        saved.organizationMenu === document.querySelector(".project-menu-outer"),
      );
    }),
  ).toBe(true);

  await expectShellContainment(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await expectShellContainment(page);
});

async function expectShellContainment(page: Page) {
  const metrics = await page.evaluate(() => {
    const navbar = document.querySelector("[data-stylex-owner=global-gnb-outer]");
    const organizationHeader = document.querySelector(".project-header-outer");
    const organizationMenu = document.querySelector(".project-menu-outer");
    const body = document.querySelector(".page-wrap-outer");
    if (
      !(navbar instanceof HTMLElement) ||
      !(organizationHeader instanceof HTMLElement) ||
      !(organizationMenu instanceof HTMLElement) ||
      !(body instanceof HTMLElement)
    ) {
      throw new Error("Organization nested layout is incomplete");
    }
    return {
      body: body.getBoundingClientRect(),
      header: organizationHeader.getBoundingClientRect(),
      menu: organizationMenu.getBoundingClientRect(),
      navbar: navbar.getBoundingClientRect(),
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.navbar.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.header.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.menu.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.body.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.header.height).toBeGreaterThan(0);
  expect(metrics.menu.height).toBeGreaterThan(0);
  expect(metrics.body.height).toBeGreaterThan(0);
}

async function mockOrganizationNestedLayout(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanLeave: false,
        viewerCanUpdate: true,
        visibleProjects: [],
      }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/organizations/weblabs/boards**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
        visibleProjects: [],
      }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/organizations/weblabs/issues**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        closedIssueCount: 0,
        filter: "",
        items: [],
        openIssueCount: 0,
        orderBy: "createdDate",
        orderDir: "desc",
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        state: "open",
        totalCount: 0,
        totalPages: 1,
        viewerUserId: 1,
        visibleProjects: [],
      }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/organizations/weblabs/pull-requests**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        category: "open",
        closedCount: 0,
        items: [],
        openCount: 0,
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
      }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/organizations/weblabs/search?**", async (route) => {
    const url = new URL(route.request().url());
    const keyword = url.searchParams.get("keyword") ?? "sample";
    const searchType = url.searchParams.get("searchType") ?? "project";
    await route.fulfill({
      body: JSON.stringify({
        context: { organizationName: "weblabs", ownerName: "", projectName: "" },
        counts: {
          issueComments: 0,
          issues: 0,
          milestones: 0,
          postComments: 0,
          posts: 0,
          projects: 0,
          reviews: 0,
          users: 0,
        },
        items: [],
        keyword,
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: searchType,
        scope: "organization",
        searchType,
        totalCount: 0,
        totalPages: 1,
      }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/organizations/weblabs/admin", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        enrollmentRequests: [],
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-64.png",
            loginId: "admin",
            role: "org_admin",
            userId: 1,
            userLabel: "Site Admin",
          },
        ],
        organizationName: "weblabs",
        roleOptions: [
          { label: "Group Manager", role: "org_admin" },
          { label: "Group Member", role: "org_member" },
        ],
        viewerCanUpdate: true,
      }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/organizations/weblabs/settings", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        description: "Web labs group",
        id: 42,
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/organizations/weblabs", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        description: "Web labs group",
        id: 42,
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      }),
      contentType: "application/json",
    });
  });
}
