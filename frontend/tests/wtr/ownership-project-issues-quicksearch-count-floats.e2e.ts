import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = "normal";
const screenshotDirectory = resolve(
  "output/playwright/style-project-issues-quicksearch-count-floats",
  fallbackMode,
);
const owners = [
  { name: "project-issues-quicksearch-all-count", count: 8 },
  { name: "project-issues-quicksearch-assigned-count", count: 3 },
  { name: "project-issues-quicksearch-authored-count", count: 2 },
  { name: "project-issues-quicksearch-commented-count", count: 1 },
] as const;

test.use({ locale: "en-US" });

test(`project issue quick-search counts preserve float, interaction, and responsive parity (${fallbackMode})`, async ({
  page,
}) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  await mockProjectIssues(page);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issues`, { waitUntil: "commit" });

    const quickSearch = page.locator(".lst-stacked");
    await expect(quickSearch).toBeVisible();
    await expect(quickSearch.locator("li")).toHaveCount(4);
    for (const owner of owners) {
      const count = page.locator(`[data-owner="${owner.name}"]`);
      await expect(count).toHaveCount(1);
      await expect(count).toHaveText(String(owner.count));
      await expect(count).toHaveCSS("float", "right");
      await expect(count).not.toHaveAttribute("style");
      await expect(count.locator("xpath=..")).toHaveAttribute("type", "button");
    }
    expect(
      await quickSearch
        .locator("li")
        .evaluateAll((items) => items.map((item) => window.getComputedStyle(item).fontWeight)),
    ).toEqual(["700", "400", "400", "400"]);

    const attributes = await quickSearch.locator("button").evaluateAll((buttons) =>
      buttons.map((button) => ({
        assigneeId: button.getAttribute("data-assignee-id"),
        authorId: button.getAttribute("data-author-id"),
        commenterId: button.getAttribute("data-commenter-id"),
        milestoneId: button.getAttribute("data-milestone-id"),
      })),
    );
    expect(attributes).toEqual([
      { assigneeId: "", authorId: "", commenterId: "", milestoneId: "" },
      { assigneeId: "1", authorId: "", commenterId: "", milestoneId: "" },
      { assigneeId: "", authorId: "1", commenterId: "", milestoneId: "" },
      { assigneeId: "", authorId: "", commenterId: "1", milestoneId: "" },
    ]);

    const geometry = await page.evaluate(
      (ownerNames) => {
        const sidebar = document.querySelector<HTMLElement>(".left-menu");
        const sidebarBox = sidebar?.getBoundingClientRect();
        const countBoxes = ownerNames.map((name) => {
          const element = document.querySelector<HTMLElement>(`[data-owner="${name}"]`);
          const box = element?.getBoundingClientRect();
          return box ? { left: box.left, right: box.right } : null;
        });
        return {
          bodyScrollWidth: document.body.scrollWidth,
          countBoxes,
          documentScrollWidth: document.documentElement.scrollWidth,
          sidebar: sidebarBox ? { left: sidebarBox.left, right: sidebarBox.right } : null,
        };
      },
      owners.map((owner) => owner.name),
    );
    expect(geometry.sidebar).not.toBeNull();
    expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(viewport.width);
    for (const box of geometry.countBoxes) {
      expect(box).not.toBeNull();
      expect(box!.left).toBeGreaterThanOrEqual(geometry.sidebar!.left);
      expect(box!.right).toBeLessThanOrEqual(geometry.sidebar!.right);
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }

  await page.goto(`${basePath}/admin/sample/issues`, { waitUntil: "commit" });
  for (const filter of [
    { key: "assigneeId", owner: owners[1].name, value: "1" },
    { key: "authorId", owner: owners[2].name, value: "1" },
    { key: "commenterId", owner: owners[3].name, value: "1" },
    { key: "all", owner: owners[0].name, value: "" },
  ] as const) {
    const count = page.locator(`[data-owner="${filter.owner}"]`);
    await count.locator("xpath=..").click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get(filter.key))
      .toBe(filter.value || null);
    const search = new URL(page.url()).searchParams;
    expect(search.get("state")).toBe("open");
    for (const key of ["assigneeId", "authorId", "commenterId"]) {
      expect(search.get(key)).toBe(key === filter.key ? filter.value : null);
    }
    await expect(count.locator("xpath=../..")).toHaveCSS("font-weight", "700");
  }
});

async function mockProjectIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/issue-search-users**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/assignable-users**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [], total: 0 } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        assignedToMeCount: 3,
        authoredByMeCount: 2,
        closedIssueCount: 4,
        commentedByMeCount: 1,
        draftItems: [],
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            authorUserId: 1,
            commentCount: 2,
            createdLabel: "Jul 23, 2026",
            dueDateLabel: "",
            dueDateOverdue: false,
            dueDateText: "",
            id: 42,
            issueNumber: 11,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "First populated issue",
            voterCount: 0,
          },
        ],
        openIssueCount: 8,
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        totalCount: 1,
        totalPages: 1,
      },
    }),
  );
}
