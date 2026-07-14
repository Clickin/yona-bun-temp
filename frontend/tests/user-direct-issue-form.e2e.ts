import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

test("user direct issue form keeps /user/issues/new while rendering the selected project shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const directOptionRequests: Array<{ pathname: string; search: string }> = [];
  await mockDirectIssueForm(page, {
    directOptionRequests,
    directOptions: {
      bodyMarkdown: "",
      referCommentId: "",
      selectedProject: { ownerName: "alice", projectName: "sample" },
    },
  });

  await page.goto(`${basePath}/user/issues/new`);

  await expect.poll(() => directOptionRequests.length).toBe(1);
  expect(directOptionRequests[0]?.pathname).toBe(`${basePath}/api/v1/user/issues/new-options`);
  expect(readSearchParam(directOptionRequests[0]?.search ?? "", "commentId")).toBeNull();
  await expect
    .poll(() => currentLocationState(page))
    .toEqual({
      commentId: "",
      pathname: `${basePath}/user/issues/new`,
    });
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/alice/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toBeVisible();
  await expect(
    page.locator('.gnb-search-form [data-toggle="search-scope"], .gnb-search-form [data-action]'),
  ).toHaveCount(0);
  await expect(page.locator(".project-breadcrumb .project-author")).toHaveText("alice");
  await expect(page.locator(".project-breadcrumb .project-name")).toHaveText("sample");
  await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText("Issue");
  await expect(page.locator("#issue-form")).toHaveAttribute(
    "action",
    `${basePath}/alice/sample/issues/latest`,
  );
  await expect(page.locator(".subtask-wrap")).toHaveClass(/show/);
  await expect(page.locator(".subtask-message")).toHaveClass(/option-on/);
  await expect(page.locator("#targetProjectId")).toBeEnabled();
  await expect(page.locator("#parentId")).toBeEnabled();
  await expect(page.locator('input[name="referCommentId"]')).toHaveValue("");
  await expect(page.locator("#editor-body-body")).toHaveValue("");

  const boxes = await page.evaluate(() => {
    const header = document.querySelector(".project-header-outer");
    const menu = document.querySelector(".project-menu-outer");
    const form = document.querySelector(".content-wrap.frm-wrap");
    const leftPane = document.querySelector(".content-wrap.frm-wrap .span9.span-left-pane");
    const rightMenu = document.querySelector(
      ".content-wrap.frm-wrap .span3.span-hard-wrap.right-menu",
    );
    if (!header || !menu || !form || !leftPane || !rightMenu) {
      return null;
    }
    return {
      form: form.getBoundingClientRect(),
      header: header.getBoundingClientRect(),
      leftPane: leftPane.getBoundingClientRect(),
      menu: menu.getBoundingClientRect(),
      rightMenu: rightMenu.getBoundingClientRect(),
    };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.menu.top).toBeGreaterThanOrEqual(boxes!.header.bottom - 1);
  expect(boxes!.form.top).toBeGreaterThanOrEqual(boxes!.menu.bottom - 1);
  expect(boxes!.rightMenu.top).toBeCloseTo(boxes!.leftPane.top + 10, 0);
  expect(boxes!.rightMenu.left).toBeGreaterThan(boxes!.leftPane.right - 5);

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect
    .poll(() => currentLocationState(page))
    .toEqual({
      commentId: "",
      pathname: `${basePath}/user/issues/new`,
    });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const header = required(".project-header-outer");
    const menu = required(".project-menu-outer");
    const form = required(".content-wrap.frm-wrap");
    return {
      documentWidth: document.documentElement.scrollWidth,
      form: { left: Math.round(form.left), right: Math.round(form.right) },
      header: { left: Math.round(header.left), right: Math.round(header.right) },
      menu: { left: Math.round(menu.left), right: Math.round(menu.right) },
    };
  });
  expect(mobile.documentWidth).toBe(390);
  expect(mobile.header.left).toBeGreaterThanOrEqual(0);
  expect(mobile.header.right).toBeLessThanOrEqual(390);
  expect(mobile.menu.left).toBeGreaterThanOrEqual(0);
  expect(mobile.menu.right).toBeLessThanOrEqual(390);
  expect(mobile.form.left).toBeGreaterThanOrEqual(0);
  expect(mobile.form.right).toBeLessThanOrEqual(390);
});

test("user direct issue form keeps the comment reference body on /user/issues/new", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const directOptionRequests: Array<{ pathname: string; search: string }> = [];
  const referencedBody =
    "Comment **markdown**\n\n_Originally posted by @dev in https://example.com/yona/admin/sample/issue/11#comment-77_";
  await mockDirectIssueForm(page, {
    directOptionRequests,
    directOptions: {
      bodyMarkdown: referencedBody,
      referCommentId: "77",
      selectedProject: { ownerName: "admin", projectName: "sample" },
    },
  });

  await page.goto(`${basePath}/user/issues/new?commentId=77`);

  await expect.poll(() => directOptionRequests.length).toBe(1);
  expect(directOptionRequests[0]?.pathname).toBe(`${basePath}/api/v1/user/issues/new-options`);
  expect(
    normalizeLegacyValue(readSearchParam(directOptionRequests[0]?.search ?? "", "commentId")),
  ).toBe("77");
  await expect
    .poll(() => currentLocationState(page))
    .toEqual({
      commentId: "77",
      pathname: `${basePath}/user/issues/new`,
    });
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#issue-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/issues/latest`,
  );
  await expect(page.locator(".subtask-wrap")).toHaveClass(/show/);
  await expect(page.locator('input[name="referCommentId"]')).toHaveValue("77");
  await expect(page.locator("#editor-body-body")).toHaveValue(referencedBody);
});

test("user direct mine issue form keeps /user/issues/new/mine while selecting the mine project", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const directOptionRequests: Array<{ pathname: string; search: string }> = [];
  await mockDirectIssueForm(page, {
    directOptionRequests,
    directOptions: {
      bodyMarkdown: "",
      referCommentId: "",
      selectedProject: { ownerName: "dev", projectName: "inbox" },
    },
  });

  await page.goto(`${basePath}/user/issues/new/mine`);

  await expect.poll(() => directOptionRequests.length).toBe(1);
  expect(directOptionRequests[0]?.pathname).toBe(`${basePath}/api/v1/user/issues/new-options`);
  expect(readSearchParam(directOptionRequests[0]?.search ?? "", "mine")).toBe("true");
  await expect
    .poll(() => currentLocationState(page))
    .toEqual({
      commentId: "",
      pathname: `${basePath}/user/issues/new/mine`,
    });
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/dev/inbox/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toBeVisible();
  await expect(
    page.locator('.gnb-search-form [data-toggle="search-scope"], .gnb-search-form [data-action]'),
  ).toHaveCount(0);
  await expect(page.locator(".project-breadcrumb .project-author")).toHaveText("dev");
  await expect(page.locator(".project-breadcrumb .project-name")).toHaveText("inbox");
  await expect(page.locator("#issue-form")).toHaveAttribute(
    "action",
    `${basePath}/dev/inbox/issues/latest`,
  );
  await expect(page.locator(".subtask-wrap")).toHaveClass(/show/);
  await expect(page.locator(".subtask-message")).toHaveClass(/option-on/);
  await expect(page.locator(".label-edit")).toHaveAttribute(
    "href",
    `${basePath}/dev/inbox/issue/labelsform`,
  );
});

test("user direct issue routes are declared as route files and keep the shared wrapper route-local", () => {
  const newRouteSource = readFileSync(
    new URL("../src/routes/user/issues_/new.tsx", import.meta.url),
    "utf8",
  );
  const mineRouteSource = readFileSync(
    new URL("../src/routes/user/issues_/new/mine.tsx", import.meta.url),
    "utf8",
  );
  const indexRouteSource = readFileSync(
    new URL("../src/routes/user/issues_/new/index.tsx", import.meta.url),
    "utf8",
  );
  const helperSource = readFileSync(
    new URL("../src/routes/user/issues/-direct-issue-form-screen.tsx", import.meta.url),
    "utf8",
  );
  const issueFormSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url),
    "utf8",
  );
  const projectRouteSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );

  expect(newRouteSource).toContain('createFileRoute("/user/issues_/new")');
  expect(newRouteSource).toContain("component: Outlet");
  expect(newRouteSource).not.toContain("DirectIssueFormRouteScreen");
  expect(indexRouteSource).toContain('createFileRoute("/user/issues_/new/")');
  expect(indexRouteSource).toContain("DirectIssueFormRouteScreen");
  expect(mineRouteSource).toContain('createFileRoute("/user/issues_/new/mine")');
  expect(mineRouteSource).toContain("mine={true}");
  expect(helperSource).toContain("readDirectIssueFormOptions");
  expect(helperSource).toContain("ProjectIssueFormProjectScreen");
  expect(helperSource).toContain("projectSearchScope={selectedProject}");
  expect(helperSource).toContain("projectHeaderRuntimeConfig={runtimeConfig}");
  expect(issueFormSource).toContain("projectHeaderRuntimeConfig?: RuntimeConfig;");
  expect(issueFormSource).toContain("runtimeConfig={projectHeaderRuntimeConfig}");
  expect(projectRouteSource).toContain("runtimeConfig?: RuntimeConfig;");
  expect(projectRouteSource).toContain("function ProjectHeaderRouteContext");
  expect(helperSource).not.toContain("window.location");
  expect(helperSource).not.toContain("document.");
  expect(helperSource).not.toMatch(/<a\b/u);
});

type DirectIssueFormOptions = {
  bodyMarkdown: string;
  referCommentId: string;
  selectedProject: {
    ownerName: string;
    projectName: string;
  };
};

async function mockDirectIssueForm(
  page: Page,
  options: {
    directOptionRequests: Array<{ pathname: string; search: string }>;
    directOptions: DirectIssueFormOptions;
  },
) {
  const {
    directOptionRequests,
    directOptions: { selectedProject },
  } = options;

  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
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
    });
  });
  await page.route("**/api/v1/user/issues/new-options**", async (route) => {
    const requestUrl = new URL(route.request().url());
    directOptionRequests.push({
      pathname: requestUrl.pathname,
      search: requestUrl.search,
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(options.directOptions),
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/container", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const match = path.match(/\/owners\/([^/]+)\/projects\/([^/]+)\/container$/u);
    const ownerName = match?.[1] ?? selectedProject.ownerName;
    const projectName = match?.[2] ?? selectedProject.projectName;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectContainer(ownerName, projectName)),
    });
  });
  await page.route("**/api/v1/projects/*/*/issues/form-options", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const match = path.match(/\/projects\/([^/]+)\/([^/]+)\/issues\/form-options$/u);
    const ownerName = match?.[1] ?? selectedProject.ownerName;
    const projectName = match?.[2] ?? selectedProject.projectName;
    const project = projectContainer(ownerName, projectName);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canCreateIssueAssignee: true,
        canCreateIssueMilestone: true,
        canManageIssueLabels: true,
        currentProject: {
          logoUrl: project.logoUrl,
          ownerName,
          projectId: project.projectId,
          projectName,
        },
        issueTemplateMarkdown: "",
        movableIssueProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/projects/*/*/issues/parent-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: 42, issueNumber: 11, selected: false, title: "Existing parent" }],
      }),
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/milestones**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones: [
          {
            attachments: [],
            closedIssueCount: 0,
            closedIssues: [],
            completionPercent: 0,
            contentsHtml: "",
            contentsMarkdown: "",
            dueDateLabel: "",
            id: "5",
            openIssueCount: 0,
            openIssues: [],
            state: "open",
            title: "Sprint 1",
            viewerCanDelete: true,
            viewerCanUpdate: true,
          },
        ],
      }),
    });
  });
}

function projectContainer(ownerName: string, projectName: string) {
  return {
    backgroundUrl: "/assets/images/bg-default-project.png",
    boardCount: 1,
    cloneUrl: `git@example.com:${ownerName}/${projectName}.git`,
    codeMemberOnly: false,
    currentMilestone: null,
    defaultTab: "projectHome",
    enrollmentRequestCount: 0,
    enrollmentRequested: false,
    isFavorited: false,
    isForked: false,
    isWatching: false,
    logoUrl: "/assets/images/project_default_logo.png",
    memberCount: 1,
    members: [],
    openIssueCount: 0,
    openPullRequestCount: 0,
    organizationName: "",
    originOwnerName: "",
    originProjectName: "",
    overview: "Sample project",
    overviewEditable: true,
    ownerName,
    projectId: ownerName === "dev" ? 9 : 7,
    projectName,
    projectScope: ownerName === "dev" ? "PRIVATE" : "PUBLIC",
    reviewCount: 0,
    showAdmin: true,
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanEnroll: true,
    viewerCanLeave: false,
    viewerCanUpdate: true,
    viewerCanWatch: true,
    viewerUserId: 1,
    watchCount: 0,
  };
}

function currentLocationState(page: Page) {
  const currentUrl = new URL(page.url());
  return {
    commentId: normalizeLegacyValue(currentUrl.searchParams.get("commentId")),
    pathname: currentUrl.pathname,
  };
}

function normalizeLegacyValue(value: null | string) {
  if (value === null || value === "") {
    return value;
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") {
        return parsed;
      }
    } catch {
      return value;
    }
  }

  return value;
}

function readSearchParam(search: string, name: string) {
  return normalizeLegacyValue(new URLSearchParams(search).get(name));
}
