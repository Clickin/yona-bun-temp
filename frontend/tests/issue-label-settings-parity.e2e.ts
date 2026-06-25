import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

function projectContainer(viewerCanUpdate = true) {
  return {
    cloneUrl: "https://example.com/admin/projectYobi.git",
    enrollmentRequested: false,
    isFavorited: false,
    isWatching: false,
    logoUrl: "",
    memberCount: 1,
    members: [],
    openIssueCount: 1,
    openPullRequestCount: 0,
    organizationName: "",
    overview: "Issue label parity",
    ownerName: "admin",
    projectName: "projectYobi",
    projectScope: "public",
    reviewCount: 0,
    showAdmin: true,
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    viewerCanEnroll: false,
    viewerCanUpdate,
    viewerCanWatch: true,
    watchCount: 1,
  };
}

function labelRows() {
  return [
    {
      categoryId: "4",
      categoryIsExclusive: false,
      categoryName: "Type",
      color: "#f44336",
      id: "5",
      name: "bug",
    },
  ];
}

function categoryRows() {
  return [{ id: "4", isExclusive: false, name: "Type" }];
}

async function installRuntime(page: Page, viewerCanUpdate = true) {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "admin" },
        user: { isSiteAdmin: true, loginId: "admin" },
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
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Admin",
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

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainer(viewerCanUpdate)),
      headers: restJsonHeaders,
      status: 200,
    });
  });
}

async function installLabelApis(page: Page) {
  let labels = labelRows();
  let categories = categoryRows();

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/labels"), async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as {
        categoryIsExclusive: boolean;
        categoryName: string;
        labelColor: string;
        labelName: string;
      };
      const categoryId = body.categoryName === "New Area" ? "9" : "4";
      const nextLabel = {
        categoryId,
        categoryIsExclusive: body.categoryIsExclusive,
        categoryName: body.categoryName,
        color: body.labelColor,
        id: "10",
        name: body.labelName,
      };
      labels = [...labels, nextLabel];
      if (!categories.some((category) => category.name === body.categoryName)) {
        categories = [
          ...categories,
          { id: categoryId, isExclusive: body.categoryIsExclusive, name: body.categoryName },
        ];
      }
      await route.fulfill({
        body: JSON.stringify({ label: nextLabel }),
        headers: restJsonHeaders,
        status: 201,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ labels }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/labels/categories"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({ categories }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/labels/5"), async (route) => {
    expect(route.request().method()).toBe("PATCH");
    const body = route.request().postDataJSON() as {
      categoryId: number;
      labelColor: string;
      labelName: string;
    };
    labels = labels.map((label) =>
      label.id === "5"
        ? {
            ...label,
            categoryId: String(body.categoryId),
            color: body.labelColor,
            name: body.labelName,
          }
        : label,
    );
    await route.fulfill({
      body: JSON.stringify({ label: labels.find((label) => label.id === "5") }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/labels/categories/4"),
    async (route) => {
      expect(route.request().method()).toBe("PATCH");
      const body = route.request().postDataJSON() as {
        categoryIsExclusive: boolean;
        categoryName: string;
      };
      categories = categories.map((category) =>
        category.id === "4"
          ? { ...category, isExclusive: body.categoryIsExclusive, name: body.categoryName }
          : category,
      );
      labels = labels.map((label) =>
        label.categoryId === "4"
          ? {
              ...label,
              categoryIsExclusive: body.categoryIsExclusive,
              categoryName: body.categoryName,
            }
          : label,
      );
      await route.fulfill({
        body: JSON.stringify({ category: categories.find((category) => category.id === "4") }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
}

test("issue label settings are forbidden for read-only viewers", async ({ page }) => {
  await installRuntime(page, false);
  await installLabelApis(page);

  await page.goto("/yona/admin/projectYobi/issue/labelsform");

  await expect(page.locator(".error-wrap")).toContainText("You are not authorized");
  await expect(page.locator("#frmNewLabel")).toHaveCount(0);
  await expect(page.locator("#copyLabel")).toHaveCount(0);
});

test("issue label settings preserve typeahead, new-category choice, and edit modals", async ({
  page,
}) => {
  const createRequests: Array<Record<string, unknown>> = [];
  const labelUpdateRequests: Array<Record<string, unknown>> = [];
  const categoryUpdateRequests: Array<Record<string, unknown>> = [];

  await installRuntime(page, true);
  await installLabelApis(page);
  page.on("request", (request) => {
    if (!request.url().includes("/owners/admin/projects/projectYobi/labels")) {
      return;
    }
    if (request.method() === "POST") {
      createRequests.push(request.postDataJSON() as Record<string, unknown>);
    }
    if (request.method() === "PATCH" && request.url().endsWith("/labels/5")) {
      labelUpdateRequests.push(request.postDataJSON() as Record<string, unknown>);
    }
    if (request.method() === "PATCH" && request.url().endsWith("/labels/categories/4")) {
      categoryUpdateRequests.push(request.postDataJSON() as Record<string, unknown>);
    }
  });

  await page.goto("/yona/admin/projectYobi/issue/labelsform");

  await expect(page.locator("#frmNewLabel")).toBeVisible();
  await expect(page.locator("#copyLabel")).toBeVisible();
  await page.locator('#frmNewLabel input[name="category"]').fill("Ty");
  await expect(page.locator(".typeahead.dropdown-menu")).toContainText("Type");
  await page.locator(".typeahead.dropdown-menu button", { hasText: "Type" }).click();
  await expect(page.locator('#frmNewLabel input[name="category"]')).toHaveValue("Type");

  await page.locator('#frmNewLabel input[name="category"]').fill("New Area");
  await page.locator('#frmNewLabel input[name="name"]').fill("frontend");
  await page.locator('#frmNewLabel input[name="color"]').fill("#2196f3");
  await page.locator("#frmNewLabel button[type='submit']").click();
  await expect(page.locator("#newCategoryOption")).toBeVisible();
  await page.locator("#newCategoryOption button", { hasText: "Single" }).click();
  await expect(page.locator("#newCategoryOption")).toBeHidden();
  expect(createRequests).toEqual([
    {
      categoryIsExclusive: true,
      categoryName: "New Area",
      labelColor: "#2196f3",
      labelName: "frontend",
    },
  ]);

  await page.locator('button[data-update-uri$="/issue/labels/5"]').click();
  await expect(page.locator("#editLabel")).toBeVisible();
  await expect(page.locator('#editLabel input[name="name"]')).toHaveValue("bug");
  await page.locator('#editLabel input[name="name"]').fill("defect");
  await page.locator('#editLabel input[name="color"]').fill("#ff7770");
  await page.locator("#editLabel .btnSubmit").click();
  await expect(page.locator("#editLabel")).toBeHidden();
  expect(labelUpdateRequests).toEqual([
    { categoryId: 4, labelColor: "#ff7770", labelName: "defect" },
  ]);

  await page.locator('button[data-category-update-uri$="/issue/labelCategories/4"]').click();
  await expect(page.locator("#editCategory")).toBeVisible();
  await expect(page.locator('#editCategory input[name="name"]')).toHaveValue("Type");
  await page.locator('#editCategory input[name="name"]').fill("Kind");
  await page.locator('#editCategory select[name="isExclusive"]').selectOption("true");
  await page.locator("#editCategory .btnSubmit").click();
  await expect(page.locator("#editCategory")).toBeHidden();
  expect(categoryUpdateRequests).toEqual([{ categoryIsExclusive: true, categoryName: "Kind" }]);
});
