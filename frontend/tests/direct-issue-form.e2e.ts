import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const DIRECT_ISSUE_FORM_SOURCE = "src/routes/user/issues/-direct-issue-form-screen.tsx";

test("direct issue create route renders the legacy New issue title for the selected project", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockDirectIssueForm(page, { ownerName: "admin", projectName: "sample" });

  await page.goto(`${basePath}/user/issues/new`);

  await expect(page).toHaveTitle("New issue - admin/sample");
  await expect(page.locator("header.gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator(".project-breadcrumb .project-author")).toHaveText("admin");
  await expect(page.locator(".project-breadcrumb .project-name")).toHaveText("sample");
  await expect(page.locator("#issue-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/issues`,
  );
});

test("direct mine issue create route renders the legacy New issue title for the mine project", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockDirectIssueForm(page, { ownerName: "admin", projectName: "inbox" });

  await page.goto(`${basePath}/user/issues/new/mine`);

  await expect(page).toHaveTitle("New issue - admin/inbox");
  await expect(page.locator("header.gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator(".project-breadcrumb .project-author")).toHaveText("admin");
  await expect(page.locator(".project-breadcrumb .project-name")).toHaveText("inbox");
  await expect(page.locator("#issue-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/inbox/issues`,
  );
});

test("direct issue title implementation follows legacy IssueApp.create title path without DOM mutation", () => {
  const routeSource = readFileSync(DIRECT_ISSUE_FORM_SOURCE, "utf8");
  const legacyRoutes = readFileSync("../yona-original/conf/routes", "utf8");
  const legacyIssueApp = readFileSync("../yona-original/app/controllers/IssueApp.java", "utf8");
  const legacyCreate = readFileSync("../yona-original/app/views/issue/create.scala.html", "utf8");
  const legacyMessages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyRoutes).toContain("GET            /user/issues/new");
  expect(legacyRoutes).toContain("GET            /user/issues/new/mine");
  expect(legacyIssueApp).toContain("return newIssueForm(project.owner, project.name);");
  expect(legacyIssueApp).toContain('create.render("title.newIssue"');
  expect(legacyCreate).toContain("@projectLayout(Messages(title), project, utils.MenuType.ISSUE)");
  expect(legacyMessages).toContain("title.newIssue = New issue");
  expect(legacyMessages).toContain("issue.menu.new = New issue");

  expect(routeSource).toContain(
    '<title>{`${t("title.newIssue")} - ${selectedProject.ownerName}/${selectedProject.projectName}`}</title>',
  );
  expect(routeSource).toContain("projectSearchScope={selectedProject}");
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain("globalThis.document");
  expect(routeSource).not.toContain("window.document");
  expect(routeSource).not.toContain("useEffect");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).not.toMatch(/<a\b/u);
});

async function mockDirectIssueForm(
  page: Page,
  selectedProject: {
    ownerName: string;
    projectName: string;
  },
) {
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
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        bodyMarkdown: "",
        referCommentId: "",
        selectedProject,
      }),
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
    id: 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: projectName === "inbox",
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
