import { expect, test } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallback = "normal";
const screenshotDir = resolve(`output/playwright/style-project-issues-action-floats/${fallback}`);

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
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
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
  await page.route("**/api/v1/projects/admin/sample/issues**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        draftItems: [],
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            authorUserId: 1,
            commentCount: 0,
            createdLabel: "Jul 23, 2026",
            dueDateLabel: "",
            dueDateOverdue: false,
            dueDateText: "",
            id: 42,
            issueNumber: 10,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "First populated issue",
            voterCount: 0,
          },
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            authorUserId: 1,
            commentCount: 0,
            createdLabel: "Jul 22, 2026",
            dueDateLabel: "",
            dueDateOverdue: false,
            dueDateText: "",
            id: 43,
            issueNumber: 11,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "Second populated issue",
            voterCount: 0,
          },
        ],
        openIssueCount: 2,
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        totalCount: 2,
        totalPages: 1,
      },
    }),
  );
}

test(`project issue action owners preserve float, action, and responsive parity (${fallback})`, async ({
  page,
}) => {
  mkdirSync(screenshotDir, { recursive: true });
  await mockProjectIssues(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issues`);

  const newIssue = page.locator('[data-owner="project-issues-new-issue-action"]');
  const filters = page.locator('[data-owner="project-issues-sort-filters"]');
  const exportAction = page.locator('[data-owner="project-issues-excel-download"]');
  await expect(newIssue).toBeVisible();
  await expect(filters).toBeVisible();
  await expect(exportAction).toBeVisible();
  await expect(newIssue.locator("a")).toHaveText("New issue");
  await expect(newIssue.locator("a")).toHaveAttribute("href", `${basePath}/admin/sample/issueform`);
  await expect(filters.locator("button")).toHaveText([
    "Due Date",
    "Updated",
    "Created",
    "Comments",
  ]);
  await expect(exportAction.locator("a")).toHaveText("Download as Excel file");
  await expect(exportAction.locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?format=xls`,
  );
  for (const owner of [newIssue, filters, exportAction]) {
    await expect(owner).not.toHaveAttribute("style");
    await expect(owner).not.toHaveAttribute("data-toggle");
    await expect(owner).not.toHaveAttribute("data-action");
    await expect(owner).not.toHaveAttribute("data-url");
  }
  // Legacy my_partial_search.scala.html:19-21 sort filter links carry
  // orderBy/orderDir attributes; the route renders them (documented in
  // issues.tsx IssueSortFilter) — the app owns the click behavior but keeps
  // the legacy attributes for DOM parity.
  expect(
    await filters
      .locator("button")
      .evaluateAll((buttons) => buttons.every((button) => button.hasAttribute("orderby"))),
  ).toBe(true);
  expect(
    await filters
      .locator("button")
      .evaluateAll((buttons) => buttons.every((button) => button.hasAttribute("orderdir"))),
  ).toBe(true);
  await expect(newIssue).toHaveCSS("float", "right");
  await expect(filters).toHaveCSS("float", "right");
  await expect(exportAction).toHaveCSS("float", "left");
  await expect(exportAction).toHaveCSS("padding", "10px");

  await filters.locator("button").first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get("orderBy")).toBe("dueDate");
  await expect.poll(() => new URL(page.url()).searchParams.get("orderDir")).toBe("desc");
  await filters.locator("button").first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get("orderDir")).toBe("asc");

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const metrics = await page.evaluate(() => {
      const selectors = {
        exportAction: '[data-owner="project-issues-excel-download"]',
        filters: '[data-owner="project-issues-sort-filters"]',
        newIssue: '[data-owner="project-issues-new-issue-action"]',
        results: '[data-owner="project-issues-results"]',
      } as const;
      const results = document.querySelector<HTMLElement>(selectors.results);
      if (!results) return null;
      const resultBox = results.getBoundingClientRect();
      const owners = Object.fromEntries(
        Object.entries(selectors)
          .filter(([name]) => name !== "results")
          .map(([name, selector]) => {
            const element = document.querySelector<HTMLElement>(selector);
            if (!element) return [name, null];
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return [
              name,
              {
                bottom: box.bottom,
                float: style.float,
                left: box.left,
                padding: style.padding,
                right: box.right,
                top: box.top,
              },
            ];
          }),
      );
      return {
        bodyScrollWidth: document.body.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        owners,
        resultBox: {
          bottom: resultBox.bottom,
          left: resultBox.left,
          right: resultBox.right,
          top: resultBox.top,
        },
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(metrics!.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
    for (const owner of Object.values(metrics!.owners)) {
      expect(owner).not.toBeNull();
      expect(owner!.left).toBeGreaterThanOrEqual(0);
      expect(owner!.right).toBeLessThanOrEqual(viewport.width);
      expect(owner!.left).toBeGreaterThanOrEqual(metrics!.resultBox.left);
      expect(owner!.right).toBeLessThanOrEqual(metrics!.resultBox.right);
    }
    expect(metrics!.owners.newIssue!.float).toBe("right");
    expect(metrics!.owners.filters!.float).toBe("right");
    expect(metrics!.owners.exportAction!.float).toBe("left");
    expect(metrics!.owners.exportAction!.padding).toBe("10px");
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDir, `${viewport.name}.png`),
    });
  }
});
