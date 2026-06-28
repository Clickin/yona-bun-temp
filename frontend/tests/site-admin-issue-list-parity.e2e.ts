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

function siteIssuesPayload(input: {
  issues: Array<{
    authorLabel?: string;
    authorLoginId: string;
    commentCount?: number;
    createdLabel?: string;
    issueNumber: string;
    ownerName: string;
    projectName: string;
    state: "closed" | "open";
    title: string;
  }>;
  page?: number;
  state?: "closed" | "open";
  totalPages?: number;
}) {
  return {
    issues: input.issues.map((issue) => ({
      assigneeLabel: "",
      authorLabel: issue.authorLabel ?? issue.authorLoginId,
      authorLoginId: issue.authorLoginId,
      commentCount: issue.commentCount ?? 0,
      createdLabel: issue.createdLabel ?? "2026-05-17 11:00:00",
      issueNumber: issue.issueNumber,
      labels: [],
      milestoneTitle: "",
      ownerName: issue.ownerName,
      projectName: issue.projectName,
      state: issue.state,
      title: issue.title,
      updatedLabel: issue.createdLabel ?? "2026-05-17 11:00:00",
      voterCount: 0,
      watcherCount: 0,
    })),
    page: input.page ?? 1,
    pageSize: 30,
    state: input.state ?? "open",
    total: input.issues.length,
    totalPages: input.totalPages ?? (input.issues.length === 0 ? 0 : 1),
  };
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
        session: { loginId: "siteboss" },
        user: { isSiteAdmin: true, loginId: "siteboss" },
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
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
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
});

test("site admin issue list keeps legacy tabs, row, and pagination alignment", async ({ page }) => {
  await page.route(apiV1Route("/site/issues**"), async (route) => {
    const state =
      new URL(route.request().url()).searchParams.get("state") === "closed" ? "closed" : "open";
    await route.fulfill({
      body: JSON.stringify(
        siteIssuesPayload({
          issues: [
            {
              authorLabel: "Member Name",
              authorLoginId: "member",
              commentCount: 4,
              createdLabel: "2026-05-17 11:00:00",
              issueNumber: "7",
              ownerName: "member",
              projectName: "issueproj",
              state,
              title: "Open site issue",
            },
            {
              authorLabel: "Observer Name",
              authorLoginId: "observer",
              commentCount: 1,
              createdLabel: "2026-05-18 12:00:00",
              issueNumber: "8",
              ownerName: "pilot",
              projectName: "issueproj",
              state,
              title: "Second site issue keeps row dimensions stable",
            },
          ],
          state,
          totalPages: 2,
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/sites/issueList?state=open&pageNum=1");

  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Site management");
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Issues");
  await expect(page.locator(".site-setting-wrap .span10 > .nav.nav-tabs li.active a")).toHaveText(
    "Open",
  );
  await expect(page.locator(".post-list-wrap .listitem")).toHaveCount(2);

  const navbar = await layoutBox(page, ".gnb-outer");
  const breadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const pageOuter = await layoutBox(page, ".site-admin-page .page-wrap-outer");
  const sidebar = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span2");
  const content = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span10");
  const titleArea = await layoutBox(page, ".site-setting-wrap .title_area");
  const tabs = await layoutBox(page, ".site-setting-wrap .span10 > .nav.nav-tabs");
  const list = await layoutBox(page, ".site-setting-wrap .post-list-wrap");
  const firstItem = await layoutBox(page, ".site-setting-wrap .post-list-wrap .listitem");
  const avatar = await layoutBox(page, ".post-list-wrap .listitem:first-child .list-avatar");
  const info = await layoutBox(page, ".post-list-wrap .listitem:first-child .post-info-wrap");
  const meta = await layoutBox(page, ".post-list-wrap .listitem:first-child .post-meta-wrap");
  const pagination = await layoutBox(page, "#pagination.page-navigation-wrap");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(navbar.height).toBeGreaterThanOrEqual(38);
  expect(navbar.height).toBeLessThanOrEqual(44);
  expect(breadcrumb.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageOuter.y).toBeGreaterThanOrEqual(breadcrumb.y + breadcrumb.height + 8);
  expect(footer.y).toBeGreaterThan(pageOuter.y + pageOuter.height - 1);

  expect(sidebar.x).toBeLessThan(content.x);
  expect(sidebar.width).toBeGreaterThanOrEqual(170);
  expect(sidebar.width).toBeLessThanOrEqual(190);
  expect(content.width).toBeGreaterThanOrEqual(840);
  expect(Math.abs(sidebar.y - content.y)).toBeLessThanOrEqual(1);

  expect(titleArea.x).toBeCloseTo(content.x, 0);
  expect(titleArea.width).toBeCloseTo(content.width, 0);
  expect(tabs.y).toBeGreaterThan(titleArea.y + titleArea.height - 1);
  expect(list.y).toBeGreaterThan(tabs.y + tabs.height - 1);
  expect(list.x).toBeCloseTo(content.x, 0);
  expect(Math.abs(list.width - content.width)).toBeLessThanOrEqual(4);

  expect(firstItem.y).toBeGreaterThanOrEqual(list.y);
  expect(Math.abs(firstItem.width - list.width)).toBeLessThanOrEqual(4);
  expect(avatar.x).toBeGreaterThanOrEqual(firstItem.x + 8);
  expect(info.x).toBeGreaterThan(avatar.x + avatar.width);
  expect(meta.x).toBeGreaterThan(info.x + info.width - 1);
  expect(meta.x + meta.width).toBeLessThanOrEqual(firstItem.x + firstItem.width - 8);
  expect(
    Math.abs(avatar.y + avatar.height / 2 - (firstItem.y + firstItem.height / 2)),
  ).toBeLessThanOrEqual(12);
  expect(pagination.y).toBeGreaterThan(firstItem.y + firstItem.height);
});

test("site admin issue list preserves legacy state tabs and read-only anchors", async ({
  page,
}) => {
  const requests: string[] = [];

  await page.route(apiV1Route("/site/issues**"), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}${url.search}`);
    const state = url.searchParams.get("state") === "closed" ? "closed" : "open";

    await route.fulfill({
      body: JSON.stringify(
        siteIssuesPayload({
          issues: [
            {
              authorLabel: "Member Name",
              authorLoginId: "member",
              commentCount: 4,
              createdLabel: "2026-05-17 11:00:00",
              issueNumber: "7",
              ownerName: "member",
              projectName: "issueproj",
              state,
              title: state === "closed" ? "Closed site issue" : "Open site issue",
            },
          ],
          state,
          totalPages: 2,
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/issueList?state=open&pageNum=1");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Issues");
  await expect(page.locator(".site-setting-wrap .span10 > .nav.nav-tabs li.active a")).toHaveText(
    "Open",
  );
  await expect(
    page.locator(".nav.nav-tabs a[href='/yona/sites/issueList?state=closed']"),
  ).toHaveText("Closed");
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .listitem")).toHaveCount(1);

  const row = page.locator(".post-list-wrap .listitem").first();
  await expect(row.locator(".avatar-wrap.list-avatar")).toHaveAttribute(
    "href",
    "/yona/member/issueproj",
  );
  await expect(row.locator(".post-project")).toHaveText("member/issueproj");
  await expect(row.locator(".post-project")).toHaveAttribute("href", "/yona/member/issueproj");
  await expect(row.locator(".post-info-separator")).toHaveText("\u00b7");
  await expect(row.locator(".post-title")).toHaveText("Open site issue");
  await expect(row.locator(".post-title")).toHaveAttribute(
    "href",
    "/yona/member/issueproj/issue/7",
  );
  await expect(row.locator(".post-meta-item").first()).toHaveText("Member Name");
  await expect(row.locator(".post-meta-item").first()).toHaveAttribute("href", "/yona/member");
  await expect(row.locator(".post-comments a")).toHaveAttribute(
    "href",
    "/yona/member/issueproj/issue/7#comments",
  );
  await expect(row.locator(".post-comments")).toContainText("4");
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("Next page");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    "/yona/sites/issueList?state=open&pageNum=2",
  );
  await expect
    .poll(() =>
      requests.some((request) => request === "GET /yona/api/v1/site/issues?state=open&page=1"),
    )
    .toBe(true);
});
