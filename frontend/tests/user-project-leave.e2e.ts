import { expect, test, type Page } from "@playwright/test";

test("legacy project leave URL deletes the current membership then renders Alice's projects tab", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  const requests = await mockUserProjectLeave(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/info/leave/alice/sample`);

  await expect
    .poll(() => requests.deletes)
    .toEqual([{ csrfToken: "csrf-project-leave", method: "DELETE", userId: "2" }]);
  await expect(page).toHaveURL(`${basePath}/alice?daysAgo=14&selected=projects`);
  await expect(page).toHaveTitle("alice");
  await expect(page.locator(".site-breadcrumb-inner > h3")).toHaveText("앨리스");
  await expect(page.locator(".user-box")).toHaveCount(1);
  await expect(page.locator(".project-header-outer, .project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".user-stream-box > .nav-tabs > li.active")).toContainText("프로젝트");
  await expect(page.locator(".user-stream-box > .nav-tabs > li.active .num-badge")).toHaveCount(0);
  await expect(page.locator("#projects.tab-pane.active")).toHaveCount(1);
  await expect(page.locator(".user-streams.all-projects > li.project")).toHaveCount(0);
  await expect(page.locator("#projects > .error-wrap > p")).toHaveText(
    "프로젝트가 존재하지 않습니다.",
  );

  const desktop = await userProjectLeaveGeometry(page);
  expect(desktop.documentWidth).toBe(1366);
  expect(desktop.page.left).toBeGreaterThanOrEqual(desktop.pageWrap.left);
  expect(desktop.page.right).toBeLessThanOrEqual(desktop.pageWrap.right);
  expect(desktop.stream.left).toBeGreaterThanOrEqual(desktop.userBox.left);
  expect(desktop.stream.right).toBeLessThanOrEqual(desktop.userBox.right);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await userProjectLeaveGeometry(page);
  expect(mobile.documentWidth).toBe(390);
  expect(mobile.page.left).toBeGreaterThanOrEqual(0);
  expect(mobile.page.right).toBeLessThanOrEqual(390);
  expect(mobile.stream.left).toBeGreaterThanOrEqual(0);
  expect(mobile.stream.right).toBeLessThanOrEqual(390);
});

async function mockUserProjectLeave(page: Page) {
  const deletes: Array<{ csrfToken: string | null; method: string; userId: string }> = [];

  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: 2,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        loginId: "alice",
      }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ isAuthenticated: true, user: { loginId: "alice" } }),
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-project-leave" },
    });
  });
  await page.route("**/api/v1/owners/alice/projects/sample/members/2", async (route) => {
    deletes.push({
      csrfToken: route.request().headers()["x-csrf-token"] ?? null,
      method: route.request().method(),
      userId: new URL(route.request().url()).pathname.split("/").pop() ?? "",
    });
    await route.fulfill({
      body: JSON.stringify({ redirectPath: "/alice?daysAgo=14&selected=projects" }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/users/alice/profile?**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      body: JSON.stringify({
        daysAgo: Number(url.searchParams.get("daysAgo") ?? "14"),
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-256.png",
          connectedSocialProviders: [],
          displayName: "앨리스",
          englishName: "Alice",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "alice",
          primaryEmailAddress: "alice@example.com",
          sinceLabel: "2026-06-30",
        },
        pullRequestItems: [],
        selected: url.searchParams.get("selected") ?? "issues",
        viewerCanEditProfile: true,
      }),
      contentType: "application/json",
    });
  });

  return { deletes };
}

async function userProjectLeaveGeometry(page: Page) {
  return page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const pageWrap = required(".page-wrap-outer");
    const page = required(".page-wrap");
    const userBox = required(".user-box");
    const stream = required(".user-stream-box");
    return {
      documentWidth: document.documentElement.scrollWidth,
      page: { left: Math.round(page.left), right: Math.round(page.right) },
      pageWrap: { left: Math.round(pageWrap.left), right: Math.round(pageWrap.right) },
      stream: { left: Math.round(stream.left), right: Math.round(stream.right) },
      userBox: { left: Math.round(userBox.left), right: Math.round(userBox.right) },
    };
  });
}
