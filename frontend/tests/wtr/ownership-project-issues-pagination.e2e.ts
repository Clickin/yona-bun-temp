const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  delimiter: '[data-owner="project-issues-pagination-delimiter"]',
  input: '[data-owner="project-issues-pagination-input"]',
  inputPage: '[data-owner="project-issues-pagination-input-page"]',
  nextIcon: '[data-owner="project-issues-pagination-next-icon"]',
  nextLabel: '[data-owner="project-issues-pagination-next-label"]',
  nextPage: '[data-owner="project-issues-pagination-next-page"]',
  pageNums: '[data-owner="project-issues-pagination-page-nums"]',
  prevIcon: '[data-owner="project-issues-pagination-prev-icon"]',
  prevLabel: '[data-owner="project-issues-pagination-prev-label"]',
  prevPage: '[data-owner="project-issues-pagination-prev-page"]',
  root: '[data-owner="project-issues-pagination"]',
  total: '[data-owner="project-issues-pagination-total"]',
} as const;

test.use({ locale: "ko-KR" });

async function mockProjectIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yoram-project/yoram/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "project-issues-pagination" },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
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
        openIssueCount: 3,
        openPullRequestCount: 1,
        ownerName: "admin",
        projectName: "sample",
        reviewCount: 1,
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerIsProjectMember: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/issue-search-users**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/assignable-users**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [], total: 0 } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues**", (route) => {
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("pageNum") ?? "1");
    return route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        draftItems: [],
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            authorUserId: 2,
            commentCount: 0,
            createdLabel: "Jul 1, 2026",
            dueDateLabel: "",
            dueDateOverdue: false,
            dueDateText: "",
            id: 42 + pageNum,
            issueNumber: 10 + pageNum,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: `Issue page ${pageNum}`,
            voterCount: 0,
          },
        ],
        openIssueCount: 3,
        ownerName: "admin",
        pageNum,
        pageSize: 15,
        projectName: "sample",
        totalCount: 45,
        totalPages: 3,
      },
    });
  });
}

async function openPagination(page: Page, viewport: { height: number; width: number }) {
  await page.setViewportSize(viewport);
  await mockProjectIssues(page);
  await page.goto(`${basePath}/admin/sample/issues`);
  await expect(page.locator(owners.root)).toBeVisible();
  return page.locator(owners.root);
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`project issues populated pagination preserves legacy ${viewport.name} geometry and overflow`, async ({
    page,
  }) => {
    const pagination = await openPagination(page, viewport);
    await expect(pagination.locator(owners.pageNums)).toHaveCount(1);
    await expect(pagination.locator(`${owners.pageNums} > li`)).toHaveCount(5);
    await expect(pagination.locator(`${owners.pageNums} > li`)).toHaveText([
      "이전 페이지",
      "",
      "/",
      "3",
      "다음 페이지",
    ]);
    await expect(pagination.locator(owners.prevLabel)).toHaveText("이전 페이지");
    await expect(pagination.locator(owners.nextLabel)).toHaveText("다음 페이지");
    await expect(pagination.locator("a", { hasText: "이전 페이지" })).toHaveCount(0);
    await expect(pagination.locator("a", { hasText: "다음 페이지" })).toHaveCount(1);

    await expect(pagination).toHaveCSS("text-align", "center");
    await expect(pagination).toHaveCSS("margin-top", "20px");
    await expect(pagination).toHaveCSS("margin-bottom", "20px");
    await expect(pagination).toHaveCSS("clear", "both");
    await expect(pagination.locator(owners.pageNums)).toHaveCSS("display", "inline-block");
    await expect(pagination.locator(owners.pageNums)).toHaveCSS("font-size", "0px");
    await expect(pagination.locator(owners.pageNums)).toHaveCSS("margin-left", "-120px");
    await expect(pagination.locator(owners.input)).toHaveCSS("width", "30px");
    await expect(pagination.locator(owners.input)).toHaveCSS("border-style", "solid");
    await expect(pagination.locator(owners.input)).toHaveCSS("border-width", "1px");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).toBe(true);

    mkdirSync(resolve("output/playwright/batch-824"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(`output/playwright/batch-824/project-issues-pagination-${viewport.name}.png`),
    });
  });
}

test("project issues pagination preserves SPA links and clamps input navigation", async ({
  page,
}) => {
  const pagination = await openPagination(page, { height: 900, width: 1366 });
  await page.evaluate(() => {
    (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker = true;
  });
  await pagination.locator("a", { hasText: "다음 페이지" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => page.locator(owners.input).inputValue()).toBe("2");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker,
      ),
    )
    .toBe(true);

  const input = pagination.locator(owners.input);
  await input.fill("1.5");
  await input.press("Enter");
  await expect(input).toHaveValue("2");
  await input.fill("99");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect.poll(() => page.locator(owners.input).inputValue()).toBe("3");
  await expect(page.locator("a", { hasText: "다음 페이지" })).toHaveCount(0);

  await page.locator(owners.input).fill("0");
  await page.locator(owners.input).press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  await expect.poll(() => page.locator(owners.input).inputValue()).toBe("1");
});
