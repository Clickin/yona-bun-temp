import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type JsonRecord = Record<string, unknown>;

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

function projectItems(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      createdDate: "2026-06-26",
      createdLabel: "2026-06-26",
      isPublic: true,
      lastPushedLabel: "2026-06-26",
      logoUrl: `/avatars/project-${number}.png`,
      memberCount: number,
      overview: `match pagination project ${number}`,
      ownerName: "admin",
      projectName: `project-${String(number).padStart(2, "0")}`,
      projectScope: "public",
      role: "manager",
      updatedDate: "2026-06-26",
      watchCount: number,
    };
  });
}

function organizationItems(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      createdLabel: "2026-06-26",
      description: `match pagination organization ${number}`,
      logoUrl: `/avatars/org-${number}.png`,
      organizationName: `org-${String(number).padStart(2, "0")}`,
    };
  });
}

function projectDetail(ownerName: string, projectName: string) {
  return {
    cloneUrl: `https://example.com/${ownerName}/${projectName}.git`,
    enrollmentRequested: false,
    isFavorited: false,
    isWatching: false,
    logoUrl: "",
    memberCount: 1,
    members: [],
    openIssueCount: 0,
    openPullRequestCount: 0,
    organizationName: "",
    overview: "Created from browser proof",
    ownerName,
    projectName,
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
    viewerCanUpdate: true,
    viewerCanWatch: true,
    watchCount: 0,
  };
}

async function installBaseRuntime(page: Page) {
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
}

async function installProjectFormOptions(page: Page) {
  await page.route(apiV1Route("/projects/form-options**"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        ownerOptions: [
          { organization: false, ownerName: "admin", selected: true },
          { organization: true, ownerName: "weblabs", selected: false },
        ],
        selectedOwnerName: "admin",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
}

test.beforeEach(async ({ page }) => {
  await installBaseRuntime(page);
});

test("project and organization directories drive legacy pagination links under a mounted base path", async ({
  page,
}) => {
  await page.route(apiV1Route("/projects"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({ items: projectItems(12), pageNum: 1, pageSize: 15, totalCount: 12 }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/organizations"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({ items: organizationItems(32) }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/projects?filter=match&pageNum=1");

  await expect(page.locator("#pagination.page-navigation-wrap")).toBeVisible();
  await expect(page.locator("#pagination input[name='pageNum']")).toHaveValue("1");
  await expect(page.locator(".all-projects .project")).toHaveCount(10);
  await expect(page.locator(".all-projects .project .black").first()).toHaveText("project-01");
  const projectBreadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const projectPageWrap = await layoutBox(page, ".page-wrap-outer");
  const projectDirectory = await layoutBox(page, ".project-page-wrap");
  const projectSearchWrap = await layoutBox(page, ".search-wrap");
  const projectSearchForm = await layoutBox(page, "#search form");
  const projectSearchInput = await layoutBox(page, "#search input[name='filter']");
  const projectList = await layoutBox(page, ".all-projects");
  const firstProjectRow = await layoutBox(page, ".all-projects .project");
  const firstProjectAvatar = await layoutBox(page, ".all-projects .project .owner-avatar-wrap");
  const firstProjectTitle = await layoutBox(page, ".all-projects .project .black");
  const firstProjectDesc = await layoutBox(page, ".all-projects .project .desc");
  const projectPagination = await layoutBox(page, "#pagination.page-navigation-wrap");

  expect(projectBreadcrumb.y).toBeGreaterThanOrEqual(40);
  expect(projectPageWrap.y).toBeGreaterThan(projectBreadcrumb.y + projectBreadcrumb.height);
  expect(Math.abs(projectDirectory.y - projectPageWrap.y)).toBeLessThanOrEqual(1);
  expect(projectSearchWrap.y).toBeLessThanOrEqual(projectList.y);
  expect(projectSearchForm.width).toBeGreaterThanOrEqual(180);
  expect(projectSearchInput.width).toBeGreaterThanOrEqual(150);
  expect(firstProjectRow.y).toBeGreaterThanOrEqual(projectSearchWrap.y);
  expect(firstProjectRow.width).toBeGreaterThanOrEqual(500);
  expect(firstProjectAvatar.x).toBeLessThan(firstProjectTitle.x);
  expect(firstProjectTitle.y).toBeLessThanOrEqual(firstProjectDesc.y);
  expect(projectPagination.y).toBeGreaterThan(firstProjectRow.y);
  await page.locator("#pagination a", { hasText: "Next" }).click();
  await expect(page).toHaveURL(/\/yona\/projects\?filter=match&pageNum=2$/);
  await expect(page.locator("#pagination input[name='pageNum']")).toHaveAttribute("value", "2");
  await expect(page.locator(".all-projects .project")).toHaveCount(2);
  await expect(page.locator(".all-projects .project .black").first()).toHaveText("project-11");
  await expect(page.locator("#pagination a", { hasText: "Prev" })).toHaveAttribute(
    "href",
    "/yona/projects?filter=match&pageNum=1",
  );

  await page.goto("/yona/orgs?filter=match&pageNum=1");

  await expect(page.locator("#pagination.page-navigation-wrap")).toBeVisible();
  await expect(page.locator("#pagination input[name='pageNum']")).toHaveValue("1");
  await expect(page.locator(".all-projects .project")).toHaveCount(30);
  await page.locator("#pagination a", { hasText: "Next" }).click();
  await expect(page).toHaveURL(/\/yona\/orgs\?filter=match&pageNum=2$/);
  await expect(page.locator("#pagination input[name='pageNum']")).toHaveAttribute("value", "2");
  await expect(page.locator(".all-projects .project")).toHaveCount(2);
  await expect(page.locator(".all-projects .project .black").first()).toHaveText("org-31");
  await expect(page.locator(".all-projects .project .name-tag").first()).toContainText("created");
  await expect(page.locator("#pagination a", { hasText: "Prev" })).toHaveAttribute(
    "href",
    "/yona/orgs?filter=match&pageNum=1",
  );
});

test("project create keeps legacy validation and submits one REST JSON payload", async ({
  page,
}) => {
  await installProjectFormOptions(page);
  let createPayload: JsonRecord | null = null;
  await page.route(apiV1Route("/owners/admin/projects"), async (route) => {
    createPayload = route.request().postDataJSON() as JsonRecord;
    await route.fulfill({
      body: JSON.stringify(projectDetail("admin", String(createPayload.projectName))),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/projects/admin/space-name/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectDetail("admin", "space-name")),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/projectform");
  await expect(page.locator("#newProjectForm")).toBeVisible();
  await expect(page.locator("#opt-protected")).toBeHidden();
  const createPageWrap = await layoutBox(page, ".page-wrap-outer");
  const createProjectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const createFormWrap = await layoutBox(page, ".form-wrap.new-project");
  const createForm = await layoutBox(page, "#newProjectForm");
  const createLegend = await layoutBox(page, "#newProjectForm > legend");
  const ownerField = await layoutBox(page, "#project-owner");
  const nameField = await layoutBox(page, "#project-name");
  const descriptionField = await layoutBox(page, "#description");
  const advancedOptions = await layoutBox(page, "#newProjectForm .advanced-options");
  const shareOptions = await layoutBox(page, "#newProjectForm .project-scopes");
  const vcsField = await layoutBox(page, "#vcs");
  const menuSettings = await layoutBox(page, "#menuSettingCode");
  const createActions = await layoutBox(page, "#newProjectForm .actions");

  expect(Math.abs(createProjectPage.y - createPageWrap.y)).toBeLessThanOrEqual(1);
  expect(createFormWrap.y).toBeGreaterThanOrEqual(createProjectPage.y);
  expect(createForm.width).toBeGreaterThanOrEqual(500);
  expect(createLegend.y).toBeLessThan(ownerField.y);
  expect(ownerField.y).toBeLessThan(nameField.y);
  expect(nameField.y).toBeLessThan(descriptionField.y);
  expect(descriptionField.y).toBeLessThan(advancedOptions.y);
  expect(shareOptions.y).toBeGreaterThanOrEqual(advancedOptions.y);
  expect(vcsField.y).toBeGreaterThan(shareOptions.y);
  expect(menuSettings.y).toBeGreaterThan(vcsField.y);
  expect(createActions.y).toBeGreaterThan(menuSettings.y);

  await page.locator("#newProjectForm button[type='submit']").click();
  await expect(page.locator(".popover-content")).toBeVisible();
  await expect(page.locator(".popover-content")).not.toContainText("project.name.alert");
  expect(createPayload).toBeNull();

  await page.locator("#project-name").fill(".git");
  await page.locator("#newProjectForm button[type='submit']").click();
  await expect(page.locator(".popover-content")).not.toContainText("project.name.reserved.alert");
  expect(createPayload).toBeNull();

  await page.locator("#project-name").fill("space name");
  await page.locator("#description").fill("Created from browser proof");
  await page.locator("#project-owner").selectOption("weblabs");
  await expect(page.locator("#opt-protected")).toBeVisible();
  await page.locator("#project-owner").selectOption("admin");
  await expect(page.locator("#opt-protected")).toBeHidden();
  await page.locator("#vcs").selectOption("SVN");
  await expect(page.locator("#svn")).toBeVisible();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeVisible();
  await page.locator("#vcs").selectOption("GIT");
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeVisible();
  await page.locator("#project-name").blur();
  await expect(page.locator("#project-name")).toHaveValue("space-name");

  await page.locator("#newProjectForm button[type='submit']").click();
  await expect(page).toHaveURL(/\/yona\/admin\/space-name$/);
  expect(createPayload).toMatchObject({
    overview: "Created from browser proof",
    projectName: "space-name",
    projectScope: "public",
    vcs: "GIT",
  });
});

test("project import blocks invalid input, exposes repo auth, and submits REST JSON", async ({
  page,
}) => {
  await installProjectFormOptions(page);
  let importPayload: JsonRecord | null = null;
  await page.route(apiV1Route("/projects/import"), async (route) => {
    importPayload = route.request().postDataJSON() as JsonRecord;
    await route.fulfill({
      body: JSON.stringify({ redirectPath: "/admin/imported-repo" }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/projects/admin/imported-repo/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectDetail("admin", "imported-repo")),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/_import?owner=admin");
  await expect(page.locator("#importGit")).toBeVisible();
  await expect(page.locator("#repoAuth")).toBeHidden();
  const importPageWrap = await layoutBox(page, ".page-wrap-outer");
  const importProjectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const importFormWrap = await layoutBox(page, ".form-wrap.new-project");
  const importForm = await layoutBox(page, "#importGit");
  const importLegend = await layoutBox(page, "#importGit > legend");
  const importUrl = await layoutBox(page, "#url");
  const importOwner = await layoutBox(page, "#project-owner");
  const importName = await layoutBox(page, "#project-name");
  const importDescription = await layoutBox(page, "#description");
  const importScopes = await layoutBox(page, "#importGit .project-scopes");
  const importVcs = await layoutBox(page, "#vcs");
  const importActions = await layoutBox(page, "#importGit .actions");

  expect(Math.abs(importProjectPage.y - importPageWrap.y)).toBeLessThanOrEqual(1);
  expect(importFormWrap.y).toBeGreaterThanOrEqual(importProjectPage.y);
  expect(importForm.width).toBeGreaterThanOrEqual(500);
  expect(importLegend.y).toBeLessThan(importUrl.y);
  expect(importUrl.y).toBeLessThan(importOwner.y);
  expect(importOwner.y).toBeLessThan(importName.y);
  expect(importName.y).toBeLessThan(importDescription.y);
  expect(importDescription.y).toBeLessThan(importScopes.y);
  expect(importScopes.y).toBeLessThan(importVcs.y);
  expect(importActions.y).toBeGreaterThan(importVcs.y);

  await page.locator("#importGit button[type='submit']").click();
  await expect(page.locator(".popover-content").first()).toContainText(/./);
  await expect(page.locator(".popover-content").first()).not.toContainText(
    "project.import.error.empty.url",
  );
  expect(importPayload).toBeNull();

  await page.locator("#url").fill("https://example.com/imported-repo.git");
  await page.locator("#project-name").fill("imported repo");
  await page.locator("#project-name").blur();
  await expect(page.locator("#project-name")).toHaveValue("imported-repo");
  await page.locator("#useRepoAuth").check();
  await expect(page.locator("#repoAuth")).toBeVisible();
  await page.locator("input[name='authId']").fill("git-user");
  await page.locator("input[name='authPw']").fill("git-secret");

  await page.locator("#importGit button[type='submit']").click();
  await expect(page).toHaveURL(/\/yona\/admin\/imported-repo$/);
  expect(importPayload).toMatchObject({
    authId: "git-user",
    authPw: "git-secret",
    ownerName: "admin",
    projectName: "imported-repo",
    projectScope: "public",
    url: "https://example.com/imported-repo.git",
    vcs: "GIT",
  });
});

test("organization create keeps legacy validation and submits one REST JSON payload", async ({
  page,
}) => {
  let organizationPayload: JsonRecord | null = null;
  await page.route(apiV1Route("/organizations"), async (route) => {
    if (route.request().method() === "POST") {
      organizationPayload = route.request().postDataJSON() as JsonRecord;
      await route.fulfill({
        body: JSON.stringify({
          description: organizationPayload.description,
          organizationName: organizationPayload.organizationName,
          viewerCanUpdate: true,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ items: [] }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/organizations/new-org/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        description: "Created organization",
        organizationName: "new-org",
        viewerCanUpdate: true,
        visibleProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/organizations/new");
  await expect(page.locator("form[name='new-org']")).toBeVisible();
  const pageWrap = await layoutBox(page, ".page-wrap-outer");
  const projectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const formWrap = await layoutBox(page, ".form-wrap.new-project");
  const form = await layoutBox(page, "form[name='new-org']");
  const legend = await layoutBox(page, "form[name='new-org'] legend");
  const fieldList = await layoutBox(page, "form[name='new-org'] dl");
  const nameInput = await layoutBox(page, "#name");
  const descriptionInput = await layoutBox(page, "#descr");
  const actions = await layoutBox(page, "form[name='new-org'] .actions");
  const submit = await layoutBox(page, "form[name='new-org'] button[type='submit']");

  expect(Math.abs(projectPage.y - pageWrap.y)).toBeLessThanOrEqual(1);
  expect(formWrap.y).toBeGreaterThanOrEqual(projectPage.y);
  expect(form.y).toBeGreaterThanOrEqual(formWrap.y);
  expect(form.width).toBeGreaterThanOrEqual(500);
  expect(legend.y).toBeLessThan(fieldList.y);
  expect(nameInput.y).toBeLessThan(descriptionInput.y);
  expect(nameInput.width).toBeGreaterThanOrEqual(150);
  expect(descriptionInput.width).toBeGreaterThanOrEqual(nameInput.width);
  expect(actions.y).toBeGreaterThan(descriptionInput.y);
  expect(submit.x).toBeGreaterThanOrEqual(actions.x);

  await page.locator("#name").fill("bad/name");
  await page.locator("form[name='new-org'] button[type='submit']").click();
  await expect(page.locator(".msg.wrongName")).toBeVisible();
  await expect(page.locator(".msg.wrongName")).not.toContainText("organization.name.alert");
  expect(organizationPayload).toBeNull();

  await page.locator("#name").fill("new-org");
  await page.locator("#descr").fill("Created organization");
  await page.locator("form[name='new-org'] button[type='submit']").click();

  await expect(page).toHaveURL(/\/yona\/organizations\/new-org$/);
  expect(organizationPayload).toMatchObject({
    description: "Created organization",
    organizationName: "new-org",
  });
});
