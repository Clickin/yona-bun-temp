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

type OrganizationMember = {
  avatarUrl: string;
  loginId: string;
  role: string;
  userId: number;
  userLabel: string;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
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
        session: { loginId: "owner" },
        user: { loginId: "owner" },
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
        emailAddress: "owner@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "owner",
        userLabel: "Owner",
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

  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        daysAgo: 0,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("direct organization directory preserves the legacy list shell", async ({ page }) => {
  await page.route(apiV1Route("/organizations"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            createdLabel: "2026-06-01",
            description: "Frontend platform group",
            logoUrl: "/avatars/weblabs.png",
            organizationName: "weblabs",
          },
          {
            createdLabel: "2026-06-02",
            description: "Operations group",
            logoUrl: "/avatars/ops.png",
            organizationName: "ops",
          },
        ],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/orgs?filter=web&pageNum=1");

  await expect(page).toHaveTitle("Group List");
  await expect(page.locator(".site-breadcrumb-outer .nav-tabs li.active")).toContainText(
    "Group List",
  );
  await expect(page.locator("#search form")).toHaveAttribute("action", "/yona/orgs");
  await expect(page.locator("#search input[name='filter']")).toHaveAttribute(
    "placeholder",
    "Find organization by name",
  );
  await expect(page.locator(".all-projects .project")).toHaveCount(1);
  await expect(page.locator(".all-projects .project .black")).toHaveText("weblabs");
  await expect(page.locator(".all-projects .project .name-tag")).toContainText("created");
});

test("direct organization directory keeps its legacy shell on a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.route(apiV1Route("/organizations"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            createdLabel: "2026-06-01",
            description: "Frontend platform group",
            logoUrl: "/avatars/weblabs.png",
            organizationName: "weblabs",
          },
        ],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/orgs?filter=web&pageNum=1");

  await expect(page.locator(".site-breadcrumb-outer .nav-tabs li.active")).toContainText(
    "Group List",
  );
  await expect(page.locator("#search input[name='filter']")).toBeVisible();
  await expect(page.locator(".all-projects .project .black")).toHaveText("weblabs");
  await expect(page.locator(".all-projects .project .owner-avatar-wrap")).toBeVisible();
});

test("organization settings shell keeps legacy layout size and alignment metrics", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.route(apiV1Route("/organizations/*/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        adminMembers: [],
        description: "Frontend platform group",
        enrollmentRequested: false,
        logoUrl: "/avatars/weblabs.png",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanEnroll: false,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        visibleProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/organizations/weblabs/settingform");

  await expect(page.locator(".gnb-outer.project-header")).toBeVisible();
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer > .project-page-wrap")).toBeVisible();

  const navbar = await layoutBox(page, ".gnb-outer.project-header");
  const header = await layoutBox(page, ".project-header-outer");
  const headerInner = await layoutBox(page, ".project-header-inner");
  const projectMenu = await layoutBox(page, ".project-menu-outer");
  const pageWrap = await layoutBox(page, ".page-wrap-outer");
  const projectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const settingSubmenu = await layoutBox(
    page,
    ".page-wrap-outer > .project-page-wrap > .nav.nav-tabs",
  );
  const form = await layoutBox(page, "#saveSetting");
  const topBox = await layoutBox(page, "#saveSetting .box-wrap.top");
  const leftColumn = await layoutBox(page, "#saveSetting .setting-box.left");
  const rightColumn = await layoutBox(page, "#saveSetting .setting-box.right");
  const logo = await layoutBox(page, "#saveSetting .logo-wrap");
  const description = await layoutBox(page, "#project-desc");

  expect(Math.round(navbar.y)).toBe(0);
  expect(Math.round(header.y)).toBe(0);
  expect(navbar.height).toBeLessThan(header.height);
  expect(Math.round(header.height)).toBe(120);
  expect(Math.round(headerInner.height)).toBe(Math.round(header.height));
  expect(projectMenu.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  expect(Math.round(projectMenu.height)).toBe(40);
  expect(pageWrap.y).toBeGreaterThanOrEqual(projectMenu.y + projectMenu.height + 19);
  expect(Math.abs(projectPage.y - pageWrap.y)).toBeLessThanOrEqual(1);
  expect(settingSubmenu.y).toBeLessThan(form.y);

  expect(Math.abs(leftColumn.y - rightColumn.y)).toBeLessThanOrEqual(1);
  expect(leftColumn.x).toBeLessThan(rightColumn.x);
  expect(rightColumn.x - (leftColumn.x + leftColumn.width)).toBeGreaterThanOrEqual(-2);
  expect(Math.round(leftColumn.width)).toBeGreaterThanOrEqual(419);
  expect(Math.round(rightColumn.width)).toBeGreaterThanOrEqual(419);
  expect(Math.round(logo.width)).toBe(260);
  expect(Math.round(logo.height)).toBe(188);
  expect(description.width).toBeGreaterThanOrEqual(370);
  expect(description.width).toBeLessThanOrEqual(rightColumn.width);
  expect(topBox.height).toBeGreaterThanOrEqual(220);
});

test("organization home, settings, members, and delete screens expose legacy interactions", async ({
  page,
}) => {
  let organizationName = "weblabs";
  let description = "Frontend platform group";
  let leftOrganization = false;
  let deletedOrganization = false;
  let members: OrganizationMember[] = [
    {
      avatarUrl: "/avatars/owner.png",
      loginId: "owner",
      role: "manager",
      userId: 1,
      userLabel: "Owner",
    },
    {
      avatarUrl: "/avatars/member.png",
      loginId: "member",
      role: "member",
      userId: 2,
      userLabel: "Member",
    },
  ];
  let enrollmentRequests: OrganizationMember[] = [
    {
      avatarUrl: "/avatars/guest.png",
      loginId: "guest",
      role: "member",
      userId: 3,
      userLabel: "Guest",
    },
  ];

  const containerPayload = () => ({
    adminMembers: members.filter((member) => member.role === "manager"),
    description,
    enrollmentRequested: false,
    logoUrl: "/avatars/weblabs.png",
    memberMembers: members.filter((member) => member.role !== "manager"),
    organizationName,
    viewerCanCreateProject: true,
    viewerCanEnroll: false,
    viewerCanLeave: true,
    viewerCanUpdate: true,
    visibleProjects: [
      {
        createdLabel: "2026-05-01",
        isWatching: true,
        lastPushedLabel: "2026-06-01",
        logoUrl: "/avatars/project.png",
        memberCount: 3,
        originOwnerName: "",
        originProjectName: "",
        overview: "Primary frontend project",
        ownerName: organizationName,
        projectName: "alpha",
        projectScope: "public",
        watchCount: 7,
      },
      {
        createdLabel: "2026-05-02",
        isWatching: false,
        lastPushedLabel: "",
        logoUrl: "/avatars/project2.png",
        memberCount: 1,
        originOwnerName: "",
        originProjectName: "",
        overview: "Legacy API fixtures",
        ownerName: organizationName,
        projectName: "api-fixtures",
        projectScope: "protected",
        watchCount: 2,
      },
    ],
  });

  const adminPayload = () => ({
    deleteAllowed: true,
    enrollmentRequests,
    members,
    organizationName,
    roleOptions: [
      { label: "manager", role: "manager" },
      { label: "member", role: "member" },
    ],
    viewerCanUpdate: true,
  });

  await page.route(apiV1Route("/organizations/*/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(containerPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/organizations/*/admin"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(adminPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/organizations/*/leave"), async (route) => {
    leftOrganization = true;
    await route.fulfill({
      body: JSON.stringify({ redirectPath: "/orgs" }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/organizations/*/members"), async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { loginId: string };
      members = [
        ...members,
        {
          avatarUrl: "/avatars/newbie.png",
          loginId: body.loginId,
          role: "member",
          userId: 4,
          userLabel: body.loginId === "newbie" ? "Newbie" : body.loginId,
        },
      ];
    }
    await route.fulfill({
      body: JSON.stringify(adminPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/yona\/-_-api\/v1\/users(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify([{ info: "Newbie @newbie", loginId: "newbie" }]),
      headers: {
        ...restJsonHeaders,
        "content-range": "items 1/1",
      },
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/organizations\/[^/]+\/members\/\d+$/, async (route) => {
    const userId = Number(route.request().url().split("/").pop());
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as { role: string };
      members = members.map((member) =>
        member.userId === userId ? { ...member, role: body.role } : member,
      );
    } else if (route.request().method() === "DELETE") {
      members = members.filter((member) => member.userId !== userId);
    }
    await route.fulfill({
      body: JSON.stringify(adminPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/organizations/*"), async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as {
        description: string;
        organizationName: string;
      };
      organizationName = body.organizationName;
      description = body.description;
      await route.fulfill({
        body: JSON.stringify(containerPayload()),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    if (route.request().method() === "DELETE") {
      deletedOrganization = true;
      await route.fulfill({
        body: JSON.stringify({ redirectPath: "/orgs" }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fallback();
  });

  await page.goto("/yona/organizations/weblabs");
  await expect(page.locator("#project-description")).toHaveText("Frontend platform group");
  await expect(page.locator("#mylist-filter")).toHaveAttribute("placeholder", "Type name");
  await expect(page.locator("a.ybtn.ybtn-primary")).toHaveAttribute(
    "href",
    "/yona/projectform?owner=weblabs",
  );
  await expect(page.locator(".organization-project-list .project")).toHaveCount(2);

  await page.locator("#mylist-filter").fill("api");
  await expect(page.locator(".organization-project-list .project")).toHaveCount(1);
  await expect(page.locator(".organization-project-list .project .black")).toHaveText(
    "api-fixtures",
  );

  await page.locator('[data-href="/yona/organizations/weblabs/leave"]').click();
  await expect(page.locator("#alertLeave")).toBeVisible();
  await page.locator("#alertLeave").getByRole("button", { name: "No" }).click();
  await expect(page.locator("#alertLeave")).toBeHidden();
  await page.locator('[data-href="/yona/organizations/weblabs/leave"]').click();
  await page.locator("#alertLeave").getByRole("button", { name: "Yes" }).click();
  await page.waitForURL(/\/yona\/orgs$/);
  await expect.poll(() => leftOrganization).toBe(true);

  await page.goto("/yona/organizations/weblabs/settingform");
  await expect(page.locator("#saveSetting")).toBeVisible();
  await expect(page.locator("label[for='project-name']")).toHaveText("input group name");
  await page.locator("#project-name").fill("weblabs-renamed");
  await page.locator("#project-desc").fill("Renamed frontend group");
  await page.locator("#save").click();
  await expect(page).toHaveURL(/\/yona\/organizations\/weblabs-renamed\/settingform$/);

  await page.goto("/yona/organizations/weblabs-renamed/members");
  await expect(page.locator("#addNewMember")).toBeVisible();
  await expect(page.locator("#loginId")).toHaveAttribute("placeholder", "Add new member ID.");
  await page.locator("#loginId").fill("new");
  await expect(page.locator(".typeahead.dropdown-menu")).toBeVisible();
  await page.locator(".typeahead.dropdown-menu a", { hasText: "Newbie @newbie" }).click();
  await expect(page.locator("#loginId")).toHaveValue("newbie");
  await page.locator("#addNewMember").getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".member-id", { hasText: "@newbie" })).toBeVisible();

  await page.locator('[data-name="roleof-member"] .dropdown-toggle').click();
  await page
    .locator(
      '[data-action="apply"][data-href="/yona/organizations/weblabs-renamed/member/2/edit"]',
      {
        hasText: "Manager",
      },
    )
    .click();
  await expect(page.locator('[data-name="roleof-member"] .d-label')).toContainText("Manager");

  await page
    .locator(
      '[data-action="delete"][data-href="/yona/organizations/weblabs-renamed/member/2/delete"]',
    )
    .click();
  await expect(page.locator("#alertDeletion")).toBeVisible();
  await expect(page.locator("#alertDeletion .modal-header h3")).toHaveText("Delete a group member");
  await page.locator("#alertDeletion").getByRole("button", { name: "No" }).click();
  await expect(page.locator("#alertDeletion")).toBeHidden();
  await page
    .locator(
      '[data-action="delete"][data-href="/yona/organizations/weblabs-renamed/member/2/delete"]',
    )
    .click();
  await page.locator("#deleteBtn").click();
  await expect(page.locator(".member-id", { hasText: "@member" })).toHaveCount(0);

  await page.goto("/yona/organizations/weblabs-renamed/deleteForm");
  await expect(page.locator("#btnDelete")).toHaveText("Delete This Group");
  await page.locator("#btnDelete").click();
  await expect(page.locator("#alertDeletion")).toBeVisible();
  await expect(page.locator("#alertDeletion .modal-header h3")).toHaveText(
    "Do you want to delete this group?",
  );
  await page.locator("#alertDeletion").getByRole("button", { name: "No" }).click();
  await expect(page.locator("#alertDeletion")).toBeHidden();
  await page.locator("#btnDelete").click();
  await page.locator("#btnDeleteExec").click();
  await expect.poll(() => deletedOrganization).toBe(true);
  await expect(page).toHaveURL(/\/yona\/orgs$/);
});
