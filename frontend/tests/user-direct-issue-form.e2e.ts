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
      selectedProject: { ownerName: "admin", projectName: "sample" },
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
  await expect(page.locator("header.gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toBeVisible();
  await expect(
    page.locator('.gnb-search-form [data-toggle="search-scope"]').first(),
  ).toHaveAttribute("data-action", `${basePath}/admin/sample/search`);
  await expect(page.locator(".project-breadcrumb .project-author")).toHaveText("admin");
  await expect(page.locator(".project-breadcrumb .project-name")).toHaveText("sample");
  await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText("Issue");
  await expect(page.locator("#issue-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/issues`,
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

  await page
    .locator('[data-toggle="markdown-editor"] .nav-tabs button[type="button"][data-mode="preview"]')
    .click();
  await expect
    .poll(() => currentLocationState(page))
    .toEqual({
      commentId: "",
      pathname: `${basePath}/user/issues/new`,
    });
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
    `${basePath}/admin/sample/issues`,
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
  expect(["true", null]).toContain(readSearchParam(directOptionRequests[0]?.search ?? "", "mine"));
  await expect
    .poll(() => currentLocationState(page))
    .toEqual({
      commentId: "",
      pathname: `${basePath}/user/issues/new/mine`,
    });
  await expect(page.locator("header.gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/dev/inbox/search`,
  );
  await expect(
    page.locator('.gnb-search-form [data-toggle="search-scope"]').first(),
  ).toHaveAttribute("data-action", `${basePath}/dev/inbox/search`);
  await expect(page.locator(".project-breadcrumb .project-author")).toHaveText("dev");
  await expect(page.locator(".project-breadcrumb .project-name")).toHaveText("inbox");
  await expect(page.locator("#issue-form")).toHaveAttribute(
    "action",
    `${basePath}/dev/inbox/issues`,
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
  const helperSource = readFileSync(
    new URL("../src/routes/user/issues/-direct-issue-form-screen.tsx", import.meta.url),
    "utf8",
  );

  expect(newRouteSource).toContain('createFileRoute("/user/issues_/new")');
  expect(mineRouteSource).toContain('createFileRoute("/user/issues_/new/mine")');
  expect(mineRouteSource).toContain("mine={true}");
  expect(helperSource).toContain("readDirectIssueFormOptions");
  expect(helperSource).toContain("ProjectIssueFormProjectScreen");
  expect(helperSource).toContain("projectSearchScope={selectedProject}");
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
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
    id: ownerName === "dev" ? 9 : 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: ownerName === "dev",
    isProtected: false,
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    ownerName,
    projectName,
    vcs: "GIT",
    viewerCanUpdate: true,
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
