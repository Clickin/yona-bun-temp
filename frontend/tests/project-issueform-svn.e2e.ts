import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
});

test("SVN issue form renders the canonical shell and complete legacy form", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSvnIssueForm(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/issueform`);

  await expect(page).toHaveTitle("새 이슈 - admin/svnplayground");
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-util-wrap .watch-btn")).toBeVisible();
  await expect(page.locator(".project-menu-gruop > li")).toHaveCount(6);
  await expect(page.locator(".project-menu-gruop > li.active .menu-name")).toHaveText("이슈");
  await expect(
    page.locator(".project-menu-gruop .menu-name", { hasText: "코드 주고받기" }),
  ).toHaveCount(0);

  const form = page.locator("#issue-form");
  const content = page.locator(".content-wrap.frm-wrap");
  await expect(content).toBeVisible();
  await expect(form).toBeVisible();
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await expect(page.locator(".textarea-box")).toBeVisible();
  await expect(page.locator(".upload-wrap.content-footer")).toBeVisible();
  await expect(page.locator(".right-menu .issue-option")).toHaveCount(4);
  await expect(page.locator(".actrow.right-txt #button-save")).toHaveText("저장");
  await expect(page.locator(".actrow.right-txt #draft-save-btn")).toHaveText("초안으로 저장");
  await expect(
    page.locator(".actrow.right-txt").getByRole("button", { name: "취소" }),
  ).toBeVisible();
  expect(await formGeometry(page)).toMatchObject({
    contained: true,
    noOverflow: true,
    ordered: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await formGeometry(page)).toMatchObject({
    contained: true,
    noOverflow: true,
    ordered: true,
  });
});

test("SVN issue form preserves shell and form when an optional collection API fails", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSvnIssueForm(page, { labelsStatus: 500 });
  await page.goto(`${basePath}/admin/svnplayground/issueform`);
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-outer")).toHaveCount(1);
  await expect(page.locator("#issue-form")).toBeVisible();
  await expect(page.locator(".issue-form-load-error")).toHaveCount(0);
  await expect(page.locator("#labelIds")).toHaveCount(0);
});

test("SVN issue form save and draft use the typed issue mutation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const createBodies: Record<string, unknown>[] = [];
  await mockSvnIssueForm(page, { createBodies });
  await page.goto(`${basePath}/admin/svnplayground/issueform`);
  await page.locator("#title").fill("SVN 이슈 저장 경계");
  await page.locator("#editor-body-body").fill("본문");
  await page.locator("#draft-save-btn").click();
  await expect.poll(() => createBodies.length).toBe(1);
  expect(createBodies[0]).toMatchObject({ isDraft: true, title: "SVN 이슈 저장 경계" });

  await page.goto(`${basePath}/admin/svnplayground/issueform`);
  await page.locator("#title").fill("SVN 이슈 저장");
  await page.locator("#editor-body-body").fill("본문");
  await page.locator("#button-save").click();
  await expect.poll(() => createBodies.length).toBe(2);
  expect(createBodies[1]).toMatchObject({ isDraft: false, title: "SVN 이슈 저장" });
});

test("SVN issue route uses the canonical project shell and no string asset fallback", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url),
    "utf8",
  );
  expect(source).toContain('import { ProjectHeader, ProjectMenu } from "../$projectName"');
  expect(source).toContain("<ProjectHeader basePath={runtimeConfig.basePath}");
  expect(source).toContain('<ProjectMenu active="issue"');
  expect(source).not.toContain("function IssueFormProjectHeader(");
  expect(source).not.toContain("function IssueFormProjectMenu(");
  expect(source).not.toContain("projectLogoUrl");
  expect(source).not.toContain('"/legacy-assets/');
});

type MockOptions = { createBodies?: Record<string, unknown>[]; labelsStatus?: number };

async function mockSvnIssueForm(page: Page, options: MockOptions = {}) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(session()) }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-svn-issue" },
      body: JSON.stringify({
        session: { csrfToken: "csrf-svn-issue", userId: 1 },
        user: session(),
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/svnplayground/container", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(project()) }),
  );
  await page.route("**/api/v1/owners/admin/projects/svnplayground/labels", (route) =>
    route.fulfill({
      status: options.labelsStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(
        options.labelsStatus ? { error: { message: "labels failed" } } : { labels: [label()] },
      ),
    }),
  );
  await page.route("**/api/v1/projects/admin/svnplayground/issues/form-options", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canCreateIssueAssignee: true,
        canCreateIssueMilestone: true,
        canManageIssueLabels: true,
        currentProject: {
          logoUrl: "/assets/images/project_default_logo.png",
          ownerName: "admin",
          projectId: 17,
          projectName: "svnplayground",
        },
        issueTemplateMarkdown: "",
        movableIssueProjects: [],
      }),
    }),
  );
  await page.route("**/api/v1/projects/admin/svnplayground/issues/parent-options**", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [] }) }),
  );
  await page.route("**/api/v1/owners/admin/projects/svnplayground/milestones**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestones: [{ id: 5, state: "open", title: "Sprint" }] }),
    }),
  );
  await page.route("**/api/v1/projects/admin/svnplayground/issues", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    options.createBodies?.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ issueNumber: 91, ownerName: "admin", projectName: "svnplayground" }),
    });
  });
}

function session() {
  return {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "관리자",
  };
}

function project() {
  return {
    backgroundUrl: "",
    boardCount: 0,
    enrollmentRequestCount: 0,
    enrollmentRequested: false,
    isFavorited: false,
    isForked: false,
    isWatching: true,
    logoUrl: "",
    openIssueCount: 0,
    openPullRequestCount: 0,
    ownerName: "admin",
    projectId: 17,
    projectName: "svnplayground",
    projectScope: "PUBLIC",
    reviewCount: 0,
    showAdmin: true,
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "Subversion",
    viewerCanEnroll: false,
    viewerCanLeave: false,
    viewerCanUpdate: true,
    viewerCanWatch: true,
    watchCount: 1,
  };
}

function label() {
  return {
    categoryId: 3,
    categoryIsExclusive: false,
    categoryName: "type",
    color: "#51aacc",
    id: 8,
    name: "bug",
  };
}

async function formGeometry(page: Page) {
  return page.evaluate(() => {
    const content = document.querySelector(".content-wrap.frm-wrap")!.getBoundingClientRect();
    const form = document.querySelector("#issue-form")!.getBoundingClientRect();
    const title = document.querySelector("#title")!.getBoundingClientRect();
    const editor = document.querySelector(".textarea-box")!.getBoundingClientRect();
    const upload = document.querySelector(".upload-wrap")!.getBoundingClientRect();
    const actions = document.querySelector(".actrow.right-txt")!.getBoundingClientRect();
    return {
      contained: form.left >= content.left && form.right <= content.right + 1,
      noOverflow: document.body.scrollWidth <= window.innerWidth,
      ordered:
        title.top < editor.top && editor.bottom <= upload.top && upload.bottom <= actions.top,
    };
  });
}
