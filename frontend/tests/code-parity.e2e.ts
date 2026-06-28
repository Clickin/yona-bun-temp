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

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

test.beforeEach(async ({ page }) => {
  let branchDefault = "main";
  let deleteMeVisible = true;
  const branchListPayload = () => ({
    branches: [
      {
        commitDate: "2026-04-21",
        commitId: "abcdef1234567890abcdef1234567890abcdef12",
        commitMessage: "Initial commit",
        commitShortId: "abcdef1",
        isDefault: branchDefault === "main",
        name: "main",
        pullRequest: null,
        shortName: "main",
      },
      {
        commitDate: "2026-04-22",
        commitId: "1234567890abcdef1234567890abcdef12345678",
        commitMessage: "Prepare branch admin",
        commitShortId: "1234567",
        isDefault: branchDefault === "topic/default",
        name: "topic/default",
        pullRequest: {
          ownerName: "admin",
          projectName: "projectYobi",
          pullRequestNumber: 7,
          state: "open",
        },
        shortName: "topic/default",
      },
      ...(deleteMeVisible
        ? [
            {
              commitDate: "2026-04-23",
              commitId: "fedcba1234567890abcdef1234567890abcdef12",
              commitMessage: "Delete candidate",
              commitShortId: "fedcba1",
              isDefault: false,
              name: "topic/delete-me",
              pullRequest: null,
              shortName: "topic/delete-me",
            },
          ]
        : []),
    ].sort((left, right) => {
      if (left.isDefault) return -1;
      if (right.isDefault) return 1;
      return left.name.localeCompare(right.name);
    }),
    defaultBranch: branchDefault,
    noHead: false,
    ownerName: "admin",
    permissions: {
      canDelete: true,
      canUpdate: true,
    },
    projectName: "projectYobi",
  });

  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: null,
        user: null,
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
        actorId: "11",
        defaultLandingPath: "/me",
        emailAddress: "nori@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "nori",
        userLabel: "Nori",
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

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "https://example.com/admin/projectYobi.git",
        codeMemberOnly: false,
        defaultTab: "code",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 0,
        members: [],
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Code parity project",
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
        viewerCanUpdate: true,
        viewerCanWatch: true,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/code(?:\?.*)?$/, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.searchParams.has("path")) {
      await route.fulfill({
        body: JSON.stringify({
          branches: [{ name: "main" }],
          breadcrumbs: [
            { name: "src", path: "src" },
            { name: "main.rs", path: "src/main.rs" },
          ],
          entries: [],
          file: {
            isBinary: false,
            mimeType: "text/plain",
            name: "main.rs",
            path: "src/main.rs",
            size: "13",
            text: "fn main() {}\n",
          },
          noHead: false,
          ownerName: "admin",
          path: "src/main.rs",
          projectName: "projectYobi",
          selectedBranch: "main",
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        branches: [{ name: "main" }],
        breadcrumbs: [],
        entries: [
          {
            commitDate: "2026-04-20",
            commitMessage: "Initial commit",
            commitShortId: "abc1234",
            kind: "folder",
            name: "src",
            path: "src",
          },
          {
            commitDate: "2026-04-20",
            commitMessage: "Initial commit",
            commitShortId: "abc1234",
            kind: "file",
            name: "README.md",
            path: "README.md",
            size: "12",
          },
        ],
        noHead: false,
        ownerName: "admin",
        projectName: "projectYobi",
        selectedBranch: "main",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/commits(?:\?.*)?$/, async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.searchParams.get("path") ?? "";
    await route.fulfill({
      body: JSON.stringify({
        branches: [{ name: "main" }],
        breadcrumbs: path
          ? [
              { name: "src", path: "src" },
              { name: "main.rs", path: "src/main.rs" },
            ]
          : [],
        commits: [
          {
            authorDate: "2026-04-21",
            authorEmail: "author@example.com",
            authorName: "Author",
            commentCount: 1,
            commitId: "abcdef1234567890abcdef1234567890abcdef12",
            commitShortId: "abcdef1",
            message: "Update main function",
            shortMessage: "Update main function",
          },
          {
            authorDate: "2026-04-20",
            authorEmail: "seed@example.com",
            authorName: "Seed",
            commentCount: 0,
            commitId: "1234567890abcdef1234567890abcdef12345678",
            commitShortId: "1234567",
            message: "Initial commit",
            shortMessage: "Initial commit",
          },
        ],
        hasNewer: false,
        hasOlder: path !== "",
        noHead: false,
        ownerName: "admin",
        page: 0,
        path,
        projectName: "projectYobi",
        selectedBranch: requestUrl.searchParams.get("branch") ?? "main",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/branches(?:\/default)?$/,
    async (route) => {
      const method = route.request().method();
      if (method === "POST") branchDefault = "topic/default";
      if (method === "DELETE") deleteMeVisible = false;
      await route.fulfill({
        body: JSON.stringify(branchListPayload()),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
});

test("code browser keeps legacy folder and file layout metrics", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/admin/projectYobi/code");

  await expect(page.locator(".code-browse-wrap")).toBeVisible();
  await expect(page.locator('.listitem[data-path="src"] a.folder')).toBeVisible();
  await expect(page.locator('.listitem[data-path="README.md"] a.file')).toBeVisible();

  const header = await layoutBox(page, ".project-header-outer");
  const menu = await layoutBox(page, ".project-menu-outer");
  const pageWrap = await layoutBox(page, ".page-wrap-outer");
  const projectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const browseWrap = await layoutBox(page, ".code-browse-wrap");
  const tabs = await layoutBox(page, '.code-browse-wrap nav[aria-label="Code tabs"]');
  const browseHeader = await layoutBox(page, ".code-browse-header");
  const branchSelect = await layoutBox(page, "#branches");
  const breadcrumbs = await layoutBox(page, "#breadcrumbs.code-breadcrumb-wrap");
  const newFile = await layoutBox(page, "#new-file-link");
  const download = await layoutBox(page, ".code-browse-header .pull-right .ybtn");
  const viewer = await layoutBox(page, ".code-viewer-wrap");
  const folderRow = await layoutBox(page, '.code-viewer-wrap .listitem[data-path="src"]');
  const fileRow = await layoutBox(page, '.code-viewer-wrap .listitem[data-path="README.md"]');

  expect(Math.round(header.height)).toBe(120);
  expect(menu.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  expect(Math.round(menu.height)).toBe(40);
  expect(pageWrap.y).toBeGreaterThanOrEqual(menu.y + menu.height - 1);
  expect(projectPage.width).toBeGreaterThanOrEqual(1100);
  expect(Math.abs(projectPage.x + projectPage.width / 2 - 640)).toBeLessThanOrEqual(2);

  expect(browseWrap.x).toBeCloseTo(projectPage.x, 0);
  expect(browseWrap.width).toBeCloseTo(projectPage.width, 0);
  expect(tabs.y).toBeGreaterThanOrEqual(browseWrap.y);
  expect(browseHeader.y).toBeGreaterThan(tabs.y + tabs.height - 1);
  expect(branchSelect.x).toBeCloseTo(browseHeader.x, 0);
  expect(breadcrumbs.x).toBeGreaterThan(branchSelect.x + branchSelect.width - 1);
  expect(newFile.y).toBeCloseTo(download.y, 0);
  expect(newFile.x).toBeGreaterThan(breadcrumbs.x + breadcrumbs.width - 1);
  expect(download.x).toBeGreaterThan(breadcrumbs.x + breadcrumbs.width - 1);
  expect(viewer.y).toBeGreaterThan(browseHeader.y + browseHeader.height - 1);
  expect(folderRow.y).toBeGreaterThanOrEqual(viewer.y);
  expect(fileRow.y).toBeGreaterThan(folderRow.y);

  await page.goto("/yona/admin/projectYobi/code/main/src/main.rs");

  const fileViewer = await layoutBox(page, ".code-viewer-wrap");
  const fileHeader = await layoutBox(page, ".file-header");
  const rawButton = await layoutBox(page, ".file-header a[href$='/rawcode/main/src/main.rs']");
  const openInBrowser = await layoutBox(page, "#open-in-browser");
  const codeBlock = await layoutBox(page, "#showCode");
  const firstLine = await layoutBox(page, ".code-line-wrap[data-line-number='1']");
  const firstLineNumber = await layoutBox(page, ".line-number");

  expect(fileHeader.y).toBeGreaterThanOrEqual(fileViewer.y);
  expect(rawButton.y).toBeCloseTo(openInBrowser.y, 0);
  expect(rawButton.x).toBeLessThan(openInBrowser.x);
  expect(codeBlock.y).toBeGreaterThan(fileHeader.y + fileHeader.height - 1);
  expect(firstLine.y).toBeGreaterThanOrEqual(codeBlock.y);
  expect(firstLineNumber.x).toBeCloseTo(firstLine.x, 0);
  expect(firstLineNumber.width).toBeLessThan(firstLine.width);
});

test("commit history keeps legacy table and path layout metrics", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/admin/projectYobi/commits");

  await expect(page.locator("#history .code-table.commits")).toBeVisible();

  const projectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const browseWrap = await layoutBox(page, ".code-browse-wrap");
  const browseHeader = await layoutBox(page, ".code-browse-header");
  const branchSelect = await layoutBox(page, "#branches");
  const tabs = await layoutBox(page, '.code-browse-wrap nav[aria-label="Code tabs"]');
  const history = await layoutBox(page, "#history.commit-wrap");
  const table = await layoutBox(page, "#history .code-table.commits");
  const headCommit = await layoutBox(page, "#history .code-table.commits thead .commit-id");
  const headMessage = await layoutBox(page, "#history .code-table.commits thead .messages");
  const firstCommit = await layoutBox(page, "#history .code-table.commits tbody tr:first-child");
  const firstCommitId = await layoutBox(
    page,
    "#history .code-table.commits tbody tr:first-child .commit-id",
  );
  const firstMessage = await layoutBox(
    page,
    "#history .code-table.commits tbody tr:first-child .messages",
  );
  const firstDate = await layoutBox(
    page,
    "#history .code-table.commits tbody tr:first-child .date",
  );
  const firstAuthor = await layoutBox(
    page,
    "#history .code-table.commits tbody tr:first-child .author",
  );

  expect(browseWrap.x).toBeCloseTo(projectPage.x, 0);
  expect(browseHeader.y).toBeGreaterThanOrEqual(browseWrap.y);
  expect(Math.abs(branchSelect.y - tabs.y)).toBeLessThanOrEqual(8);
  expect(branchSelect.x).toBeLessThanOrEqual(tabs.x);
  expect(history.y).toBeGreaterThan(browseHeader.y + browseHeader.height - 1);
  expect(table.width).toBeCloseTo(history.width, 0);
  expect(headCommit.x).toBeCloseTo(firstCommitId.x, 0);
  expect(headMessage.x).toBeCloseTo(firstMessage.x, 0);
  expect(firstCommit.y).toBeGreaterThan(table.y);
  expect(firstCommitId.x).toBeLessThan(firstMessage.x);
  expect(firstMessage.x).toBeLessThan(firstDate.x);
  expect(firstDate.x).toBeLessThan(firstAuthor.x);

  await page.goto("/yona/admin/projectYobi/commits/main/src/main.rs");

  const pathBrowseWrap = await layoutBox(page, ".code-browse-wrap");
  const breadcrumbs = await layoutBox(page, ".code-breadcrumb-wrap");
  const pathTable = await layoutBox(page, "#history .code-table.commits.mt10");
  const browseCell = await layoutBox(page, "#history .code-table.commits .browse");
  const olderButton = await layoutBox(page, ".actrow.margin-top-20 a");

  expect(breadcrumbs.y).toBeGreaterThanOrEqual(pathBrowseWrap.y);
  expect(pathTable.y).toBeGreaterThan(breadcrumbs.y + breadcrumbs.height - 1);
  expect(browseCell.x).toBeGreaterThan(firstMessage.x);
  expect(olderButton.y).toBeGreaterThan(pathTable.y + pathTable.height - 1);
});

test("branches table keeps legacy layout and mutation metrics", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/admin/projectYobi/branches");

  await expect(page.locator(".branch-list-wrap")).toBeVisible();

  const projectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const bubble = await layoutBox(page, ".bubble-wrap.dark-gray.repo-wrap");
  const browseWrap = await layoutBox(page, ".code-browse-wrap");
  const tabs = await layoutBox(page, ".code-browse-wrap .nav.nav-tabs");
  const table = await layoutBox(page, ".branch-list-wrap");
  const head = await layoutBox(page, ".branch-list-wrap thead");
  const firstRow = await layoutBox(page, ".branch-list-wrap tbody tr.head");
  const branchName = await layoutBox(page, ".branch-list-wrap tbody tr.head .branchName");
  const commitCell = await layoutBox(page, ".branch-list-wrap tbody tr.head .commit");
  const pullRequestCell = await layoutBox(page, ".branch-list-wrap tbody tr.head .pullRequest");
  const actionCell = await layoutBox(page, ".branch-list-wrap tbody tr:nth-child(2) .actions");

  expect(bubble.x).toBeCloseTo(projectPage.x, 0);
  expect(bubble.width).toBeCloseTo(projectPage.width, 0);
  expect(browseWrap.x).toBeGreaterThanOrEqual(bubble.x);
  expect(tabs.y).toBeGreaterThanOrEqual(browseWrap.y);
  expect(table.y).toBeGreaterThan(tabs.y + tabs.height - 1);
  expect(table.width).toBeGreaterThanOrEqual(650);
  expect(table.width).toBeLessThanOrEqual(browseWrap.width);
  expect(head.y).toBeGreaterThanOrEqual(table.y);
  expect(firstRow.y).toBeGreaterThan(head.y);
  expect(Math.abs(branchName.x - table.x)).toBeLessThanOrEqual(4);
  expect(commitCell.x).toBeGreaterThan(branchName.x + branchName.width - 1);
  expect(pullRequestCell.x).toBeGreaterThan(commitCell.x + commitCell.width - 1);
  expect(actionCell.x).toBeGreaterThan(pullRequestCell.x + pullRequestCell.width - 1);

  const setDefaultRequest = page.waitForRequest(
    (request) => request.url().endsWith("/branches/default") && request.method() === "POST",
  );
  await page
    .locator('[data-request-uri="/yona/admin/projectYobi/code/topic%2Fdefault/setAsDefault"]')
    .click();
  expect((await setDefaultRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator("tr.head .branchName")).toContainText("topic/default");

  const deleteRequest = page.waitForRequest(
    (request) => request.url().endsWith("/branches") && request.method() === "DELETE",
  );
  await page
    .locator(
      'a[data-request-method="delete"][href="/yona/admin/projectYobi/code/topic%2Fdelete-me/"]',
    )
    .click();
  expect((await deleteRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator(".branchName", { hasText: "topic/delete-me" })).toHaveCount(0);
});
