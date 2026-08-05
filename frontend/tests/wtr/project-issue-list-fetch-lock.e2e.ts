import { expect, test, type Page } from "../wtr-compat.ts";

const OWNER = "admin";
const PROJECT = "sample";
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

function issueItem(issueNumber: number, state: "open" | "closed", title: string) {
  return {
    assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
    assigneeLabel: "Site Admin",
    assigneeLoginId: "admin",
    assigneeUserId: 1,
    authorAvatarUrl: "/assets/images/default-avatar-32.png",
    authorLabel: "Dev Member",
    authorLoginId: "dev",
    authorUserId: 2,
    commentCount: 0,
    createdLabel: "Jul 1, 2026",
    dueDateLabel: "",
    dueDateOverdue: false,
    dueDateText: "",
    id: issueNumber,
    issueNumber,
    labels: [],
    milestoneId: undefined,
    milestoneTitle: undefined,
    ownerName: OWNER,
    projectName: PROJECT,
    state,
    title,
    updatedLabel: "Jul 1, 2026",
    voterCount: 0,
  };
}

const OPEN_ITEM = issueItem(11, "open", "Fix flaky issue");
const CLOSED_ITEM = issueItem(12, "closed", "Ship v1.0");

/**
 * Mocks the routes the project issues screen fetches. The issues list route is
 * delayed and branches on ?state= so the open/closed toggle observably changes
 * the DOM once the fetch settles; every other route answers instantly so the
 * progress bar is dominated by the list query itself.
 */
async function mockProjectIssuesLock(page: Page, issuesDelayMs: number) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-issue-lock" },
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: OWNER,
        userLabel: "관리자",
      }),
    });
  });
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/container**`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        boardCount: 0,
        enrolledUsers: [],
        id: 9,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        isWatching: true,
        logoUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        openIssueCount: 1,
        openPullRequestCount: 0,
        ownerName: OWNER,
        postCount: 0,
        projectId: 9,
        projectName: PROJECT,
        reviewCount: 0,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "Git",
        viewerCanUpdate: true,
        viewerCanWatch: true,
        viewerIsProjectMember: true,
        watchCount: 1,
      }),
    });
  });
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/milestones**`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestones: [] }),
    });
  });
  await page.route(
    `**/api/v1/owners/${OWNER}/projects/${PROJECT}/issue-search-users**`,
    async (route) => {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [] }) });
    },
  );
  await page.route(
    `**/api/v1/owners/${OWNER}/projects/${PROJECT}/assignable-users**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, truncated: false }),
      });
    },
  );
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/labels`, async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ labels: [] }) });
  });
  await page.route(`**/api/v1/projects/${OWNER}/${PROJECT}/issues**`, async (route) => {
    const state = new URL(route.request().url()).searchParams.get("state") ?? "open";
    await new Promise((resolve) => setTimeout(resolve, issuesDelayMs));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 1,
        draftItems: [],
        items: state === "closed" ? [CLOSED_ITEM] : [OPEN_ITEM],
        openIssueCount: 1,
        ownerName: OWNER,
        pageNum: 1,
        pageSize: 15,
        projectName: PROJECT,
        totalCount: 1,
        totalPages: 1,
      }),
    });
  });
}

async function currentState(page: Page): Promise<string | null> {
  return page.evaluate(() => location.search.match(/state=(\w+)/)?.[1] ?? null);
}

test("direct URL state renders and the root progress bar covers the list settle", async ({
  page,
}) => {
  await mockProjectIssuesLock(page, 600);
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/issues?state=closed`);

  await expect(page.locator("#nprogress .bar")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ship v1.0" })).toBeVisible();
  await expect(page.locator("#nprogress .bar")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`state=closed`));
});

test("rapid open/closed toggling drops triggers while the fetch group is in flight", async ({
  page,
}) => {
  await mockProjectIssuesLock(page, 900);
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/issues?state=open`);
  await expect(page.getByRole("link", { name: "Fix flaky issue" })).toBeVisible();

  await page.locator(".nav-tabs a", { hasText: "Closed" }).click();
  // the open/closed toggle is a plain Link: the first click wins and locks
  await expect(page.locator("#nprogress .bar")).toBeVisible();
  await expect.poll(() => currentState(page)).toBe("closed");

  // a second trigger during the in-flight fetch must be dropped
  await page.locator(".nav-tabs a", { hasText: "Open" }).click();
  await page.waitForTimeout(200);
  await expect.poll(() => currentState(page)).toBe("closed");

  await expect(page.getByRole("link", { name: "Ship v1.0" })).toBeVisible();
  await expect(page.locator("#nprogress .bar")).toHaveCount(0);
  await expect.poll(() => currentState(page)).toBe("closed");

  // once the closed list is committed to the DOM, the block has released and
  // the toggle works again
  await page.locator(".nav-tabs a", { hasText: "Open" }).click();
  await expect(page.getByRole("link", { name: "Fix flaky issue" })).toBeVisible();
  await expect.poll(() => currentState(page)).toBe("open");
});

test("every route gets the top progress bar without registering (global visibility)", async ({
  page,
}) => {
  // project home is NOT a registered content group; the bar must still show
  // while its container fetch is in flight because bar visibility is global.
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-issue-lock" },
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: OWNER,
        userLabel: "관리자",
      }),
    });
  });
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/container**`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        boardCount: 0,
        enrolledUsers: [],
        id: 9,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        isWatching: true,
        logoUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        openIssueCount: 1,
        openPullRequestCount: 0,
        ownerName: OWNER,
        postCount: 0,
        projectId: 9,
        projectName: PROJECT,
        reviewCount: 0,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "Git",
        viewerCanUpdate: true,
        viewerCanWatch: true,
        viewerIsProjectMember: true,
        watchCount: 1,
      }),
    });
  });

  await page.goto(`${basePath}/${OWNER}/${PROJECT}`);
  await expect(page.locator("#nprogress .bar")).toBeVisible();
  await expect(page.locator(".project-page-wrap")).toBeVisible();
  await expect(page.locator("#nprogress .bar")).toHaveCount(0);
});

test("modifier clicks are never blocked while the lock is held", async ({ page }) => {
  await mockProjectIssuesLock(page, 900);
  await page.goto(`${basePath}/${OWNER}/${PROJECT}/issues?state=open`);
  await expect(page.getByRole("link", { name: "Fix flaky issue" })).toBeVisible();

  await page.locator(".nav-tabs a", { hasText: "Closed" }).click();
  await expect(page.locator("#nprogress .bar")).toBeVisible();

  const notPrevented = await page.evaluate(() => {
    const anchor = [...document.querySelectorAll(".nav-tabs a")].find((a) =>
      a.textContent.includes("Open"),
    );
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      metaKey: true,
    });
    anchor!.dispatchEvent(event);
    return !event.defaultPrevented;
  });
  expect(notPrevented).toBe(true);
});
