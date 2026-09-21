import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = "normal";
const owner = (name: string) => `[data-owner="${name}"]`;

test("user issue action floats preserve legacy source, runtime placement, and sorting", async ({
  page,
}) => {
  const source = readFileSync("src/routes/user/issues.tsx", "utf8");
  const search = readFileSync(
    "../yona-original/app/views/issue/my_partial_search.scala.html",
    "utf8",
  );
  const list = readFileSync("../yona-original/app/views/issue/my_partial_list.scala.html", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(search).toContain('<div class="filters pull-right">');
  expect(list).toContain('<span class="pull-right');
  expect(list).toContain('<div class="mt5 pull-right hide-in-mobile">');
  expect(common).toContain(".mt5 { margin-top:5px; }");
  expect(pageLess).toContain(".filters {");
  expect(responsive).toContain(".hide-in-mobile");
  expect(bootstrap).toContain(".pull-right {");
  expect(bootstrap).toContain("float: right;");
  for (const importLine of [
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ])
    expect(yobi).toContain(importLine);
  expect(messages).toContain("common.order.dueDate = Due Date");
  expect(messages).toContain("common.order.updatedDate = Updated");
  expect(messages).toContain("common.order.date = Created");
  expect(messages).toContain("common.order.comments = Comments");
  expect(messages).toContain("issue.assignee = Assignee");
  expect(messages).toContain("issue.dueDate.overdue = Overdue");

  for (const name of ["user-issues-filters", "user-issues-due-date", "user-issues-assignee-rail"]) {
    expect(source).toContain(`data-owner="${name}"`);
  }

  const requestedOrder: string[] = [];
  await mockUserIssues(page, requestedOrder);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/user/issues?filter=authored`, { waitUntil: "domcontentloaded" });

  const rows = page.locator("li.post-item.title");
  await expect(rows).toHaveCount(2);
  await expect(page.locator(owner("user-issues-filters"))).toHaveText(
    /Due Date.*Updated.*Created.*Comments/s,
  );
  await expect(rows.nth(0).locator(owner("user-issues-due-date"))).toHaveAttribute(
    "title",
    "Due date: 2026-08-01",
  );
  await expect(rows.nth(0).locator(owner("user-issues-due-date"))).toHaveText(/Overdue/u);
  await expect(page.locator(owner("user-issues-filters"))).toHaveClass(/\bfilters\b/u);
  await expect(rows.nth(0).locator(owner("user-issues-due-date"))).toHaveClass(/\boverdue\b/u);
  await expect(rows.nth(0).locator(owner("user-issues-assignee-rail"))).toHaveClass(
    /\bmt5\b.*\bhide-in-mobile\b/u,
  );
  await expect(rows.nth(0).locator(owner("user-issues-assignee-rail"))).not.toHaveClass(
    /pull-right/u,
  );
  await expect(rows.nth(0).locator(owner("user-issues-assignee-rail"))).toHaveCSS(
    "margin-top",
    "5px",
  );
  await expect(rows.nth(0).locator(owner("user-issues-assignee-rail"))).toBeVisible();
  await expect(
    rows.nth(0).locator(owner("user-issues-assignee-rail")).getByRole("link"),
  ).toHaveAttribute("href", `${basePath}/bob`);
  await expect(rows.nth(0).locator("img")).toHaveAttribute("alt", "Bob");

  const pluginAttributes = await page.evaluate(() =>
    ["user-issues-filters", "user-issues-due-date", "user-issues-assignee-rail"].map((name) => {
      const element = document.querySelector(`[data-owner="${name}"]`);
      return element
        ? [...element.attributes]
            .map((attribute) => attribute.name)
            .filter((attributeName) =>
              /^(data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)|pjax-)/u.test(
                attributeName,
              ),
            )
        : null;
    }),
  );
  expect(pluginAttributes).toEqual([[], [], []]);

  const floats = await page.evaluate(() =>
    ["user-issues-filters", "user-issues-due-date", "user-issues-assignee-rail"].map((name) => {
      const element = document.querySelector<HTMLElement>(`[data-owner="${name}"]`);
      return element ? getComputedStyle(element).float : null;
    }),
  );
  expect(floats).toEqual(["right", "right", "right"]);

  await page.locator(owner("user-issues-filters")).getByRole("button", { name: "Created" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("orderBy")).toBe("createdDate");
  await expect.poll(() => requestedOrder.at(-1)).toBe("createdDate");
  expect(await rows.allTextContents()).toEqual(
    expect.arrayContaining([
      expect.stringContaining("First issue"),
      expect.stringContaining("Second issue"),
    ]),
  );

  await saveEvidence(page, "desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  const rails = page.locator(owner("user-issues-assignee-rail"));
  await expect(rails).toHaveCount(2);
  await expect(rails.nth(0)).toBeHidden();
  await expect(rails.nth(1)).toBeHidden();
  const mobile = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    rows: [...document.querySelectorAll<HTMLElement>("li.post-item.title")].map((row) => {
      const box = row.getBoundingClientRect();
      return { left: box.left, right: box.right };
    }),
  }));
  expect(mobile.scrollWidth).toBeLessThanOrEqual(mobile.width);
  for (const row of mobile.rows) {
    expect(row.left).toBeGreaterThanOrEqual(0);
    expect(row.right).toBeLessThanOrEqual(mobile.width + 1);
  }
  await saveEvidence(page, "mobile");
});

async function saveEvidence(page: Page, viewport: string) {
  const directory = resolve(`output/playwright/style-user-issues-action-floats/${fallbackMode}`);
  mkdirSync(directory, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(directory, `user-issues-${viewport}.png`),
  });
}

async function mockUserIssues(page: Page, requestedOrder: string[]) {
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
    loginId: "alice",
    preferredLanguage: "en-US",
  };
  for (const path of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(path, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/user/issues**", (route) => {
    requestedOrder.push(new URL(route.request().url()).searchParams.get("orderBy") ?? "");
    return route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        filter: "authored",
        items: [
          {
            assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
            assigneeLabel: "Bob",
            assigneeLoginId: "bob",
            authorLabel: "Alice",
            authorLoginId: "alice",
            createdLabel: "2026-07-17",
            dueDateLabel: "2026-08-01",
            dueDateOverdue: true,
            dueDateText: "in 8 days",
            id: 1,
            issueNumber: 1,
            labels: [],
            ownerName: "alice",
            projectName: "sample",
            state: "open",
            title: "First issue",
            updatedLabel: "2026-07-18",
          },
          {
            assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
            assigneeLabel: "Carol",
            assigneeLoginId: "carol",
            authorLabel: "Alice",
            authorLoginId: "alice",
            createdLabel: "2026-07-16",
            dueDateLabel: "2026-08-03",
            dueDateText: "in 10 days",
            id: 2,
            issueNumber: 2,
            labels: [],
            ownerName: "alice",
            projectName: "sample",
            state: "open",
            title: "Second issue",
            updatedLabel: "2026-07-19",
          },
        ],
        openIssueCount: 2,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: {},
        state: "open",
        totalCount: 2,
        totalPages: 1,
        viewerUserId: 1,
      },
    });
  });
}
