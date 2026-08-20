import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const PROJECT_ISSUES_ROUTE_SOURCE = readFileSync(
  "../src/routes/$ownerName/$projectName/issues.tsx",
  "utf8",
);
const PROJECT_ISSUES_STYLE_SOURCE = readFileSync("src/app.css", "utf8");
const LEGACY_ISSUE_LIST_SOURCE = readFileSync(
  "../yona-original/app/views/issue/partial_list.scala.html",
  "utf8",
);
const LEGACY_COMMON_LESS_SOURCE = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_common.less",
  "utf8",
);
const LEGACY_ISSUE_PAGE_LESS_SOURCE = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_page.less",
  "utf8",
);
const LEGACY_RESPONSIVE_LESS_SOURCE = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_responsive.less",
  "utf8",
);
const LEGACY_BOOTSTRAP_SOURCE = readFileSync(
  "../yona-original/public/bootstrap/css/bootstrap.css",
  "utf8",
);
const LEGACY_BOOTSTRAP_RESPONSIVE_SOURCE = readFileSync(
  "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  "utf8",
);
const LEGACY_YOBI_SOURCE = readFileSync(
  "../yona-original/app/assets/stylesheets/yobi.less",
  "utf8",
);
const LEGACY_MESSAGES_SOURCE = readFileSync("../yona-original/conf/messages", "utf8");

test.use({ locale: "en-US" });

test("project issue due-date port keeps the legacy source and Style evidence", () => {
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain('<div class="mr20 mt10 pull-right');
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain("@if(issue.dueDate != null)");
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain('@Messages("issue.dueDate.overdue")');
  expect(LEGACY_COMMON_LESS_SOURCE).toContain(".mt10 { margin-top:10px; }");
  expect(LEGACY_COMMON_LESS_SOURCE).toContain(".mr20 { margin-right:20px; }");
  expect(LEGACY_ISSUE_PAGE_LESS_SOURCE).toContain(".overdue {\n    color:@yobi-red;\n}");
  expect(LEGACY_RESPONSIVE_LESS_SOURCE).toContain("@media all and (max-width: 720px)");
  expect(LEGACY_RESPONSIVE_LESS_SOURCE).toContain(".hide-in-mobile");
  expect(LEGACY_BOOTSTRAP_SOURCE).toContain(".pull-right");
  expect(LEGACY_BOOTSTRAP_RESPONSIVE_SOURCE).toContain(".row-fluid .span3");
  expect(LEGACY_BOOTSTRAP_RESPONSIVE_SOURCE).toContain("@media");
  expect(LEGACY_YOBI_SOURCE).toContain('@import "less/_common.less";');
  expect(LEGACY_YOBI_SOURCE).toContain('@import "less/_page.less";');
  expect(LEGACY_YOBI_SOURCE).toContain('@import "less/_responsive.less";');
  expect(LEGACY_MESSAGES_SOURCE).toContain("issue.dueDate = Due date");
  expect(LEGACY_MESSAGES_SOURCE).toContain("issue.dueDate.overdue = Overdue");

  expect(PROJECT_ISSUES_ROUTE_SOURCE).toContain('data-owner="project-issues-due-date"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('data-toggle="tooltip"');
  expect(PROJECT_ISSUES_ROUTE_SOURCE).not.toContain('data-placement="top"');
});

type DueDateCase = {
  name: "open-overdue" | "upcoming-open" | "closed";
  state: "populated" | "upcoming" | "weighted";
  query: string;
  text: string;
  title?: string;
  overdue: boolean;
};

const dueDateCases: DueDateCase[] = [
  {
    name: "open-overdue",
    state: "populated",
    query: "filter=populated",
    text: "Overdue",
    title: "Jun 30, 2026",
    overdue: true,
  },
  {
    name: "upcoming-open",
    state: "upcoming",
    query: "filter=upcoming",
    text: "4 days left",
    title: "Jul 5, 2026",
    overdue: false,
  },
  {
    name: "closed",
    state: "weighted",
    query: "filter=weighted&state=closed",
    text: "Jul 5, 2026",
    overdue: false,
  },
];

const viewports = [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
] as const;

const dueDateOwner = '[data-owner="project-issues-due-date"]';
const pluginOnlyAttribute =
  /^(?:data-(?:toggle|placement|action|href|url|request-.+|dismiss|target|trigger|backdrop|spy|provider|loading-text)|pjax-.+)$/u;

for (const viewport of viewports) {
  for (const dueDateCase of dueDateCases) {
    test(`project issue ${dueDateCase.name} keeps due-date geometry at ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await mockProjectIssues(page, dueDateCase.state);
      await page.goto(`${basePath}/admin/sample/issues?${dueDateCase.query}`);

      const target = page.locator(dueDateOwner);
      await expect(target).toHaveCount(1);
      await expect(target).toHaveCSS("margin-right", "20px");
      await expect(target).toHaveCSS("margin-top", "10px");
      await expect(target).toHaveClass(/\bmr20\s+mt10\b/u);
      await expect(target).toHaveCSS("float", "right");
      await expect(target.locator(".vmiddle").last()).toHaveText(dueDateCase.text);

      if (dueDateCase.title) {
        await expect(target).toHaveAttribute("title", dueDateCase.title);
      } else {
        await expect(target).not.toHaveAttribute("title");
      }
      if (dueDateCase.overdue) {
        await expect(target).toHaveClass(/\boverdue\b/u);
      } else {
        await expect(target).not.toHaveClass(/\boverdue\b/u);
      }

      const targetAttributes = await target.evaluate((element) =>
        Array.from(element.attributes, ({ name, value }) => ({ name, value })),
      );
      expect(targetAttributes.filter(({ name }) => pluginOnlyAttribute.test(name))).toEqual([]);
      expect(targetAttributes).toContainEqual({
        name: "data-owner",
        value: "project-issues-due-date",
      });

      const geometry = await page.evaluate(() => {
        const target = document.querySelector<HTMLElement>(
          '[data-owner="project-issues-due-date"]',
        );
        const column = target?.closest<HTMLElement>(".span3");
        const item = target?.closest<HTMLElement>(".post-item");
        if (!target || !column || !item) return null;

        const targetStyle = window.getComputedStyle(target);
        const columnStyle = window.getComputedStyle(column);
        const targetRect = target.getBoundingClientRect();
        const columnRect = column.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const targetHiddenWithColumn = columnStyle.display === "none" && targetRect.width === 0;
        const targetContainedInColumn = targetHiddenWithColumn
          ? true
          : targetRect.left >= columnRect.left &&
            targetRect.right <= columnRect.right + 1 &&
            targetRect.top >= columnRect.top &&
            targetRect.bottom <= columnRect.bottom + 1;
        const targetContainedInItem = targetHiddenWithColumn
          ? true
          : targetRect.left >= itemRect.left &&
            targetRect.right <= itemRect.right + 1 &&
            targetRect.top >= itemRect.top &&
            targetRect.bottom <= itemRect.bottom + 1;
        const pageScrollWidth = Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        );

        return {
          columnDisplay: columnStyle.display,
          pageOverflow: pageScrollWidth - document.documentElement.clientWidth,
          targetDisplay: targetStyle.display,
          targetContainedInColumn,
          targetContainedInItem,
          targetHiddenWithColumn,
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry?.targetContainedInColumn).toBe(true);
      expect(geometry?.targetContainedInItem).toBe(true);
      expect(Number.isFinite(geometry?.pageOverflow)).toBe(true);
      testInfo?.attach?.("due-date-geometry-diagnostic", {
        body: JSON.stringify({ dueDateCase, geometry, viewport }, null, 2),
        contentType: "application/json",
      });

      const screenshotMode = "normal";
      const screenshotDirectory = resolve(
        "output/playwright/style-project-issues-due-date-mr20-mt10",
        screenshotMode,
      );
      mkdirSync(screenshotDirectory, { recursive: true });
      await page.screenshot({
        fullPage: true,
        path: resolve(screenshotDirectory, `${dueDateCase.name}-${viewport.name}.png`),
      });
    });
  }
}

async function mockProjectIssues(page: Page, state: DueDateCase["state"]) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      siteName: "Yona",
      supportedLanguages: ["en"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "csrf-token" },
        body: JSON.stringify(session),
      });
    });
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
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
        openIssueCount: 1,
        openPullRequestCount: 1,
        ownerName: "admin",
        boardCount: 1,
        projectName: "sample",
        reviewCount: 2,
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerIsProjectMember: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", async (route) => {
    const milestoneState = new URL(route.request().url()).searchParams.get("state");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones:
          milestoneState === "closed"
            ? [{ id: 7, state: "closed", title: "v0.9" }]
            : [
                {
                  id: 5,
                  closedIssueCount: 1,
                  completionPercent: 50,
                  dueDateLabel: "Jul 5, 2026",
                  dueDateOverdue: false,
                  state: "open",
                  title: "v1.0",
                  openIssueCount: 1,
                  untilLabel: "4 days left",
                },
              ],
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ labels: [] }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/issue-search-users**", async (route) => {
    const role = new URL(route.request().url()).searchParams.get("role");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items:
          role === "author"
            ? [
                {
                  avatarUrl: "/assets/images/default-avatar-32.png",
                  displayName: "Dev Member",
                  loginId: "dev",
                  pureNameOnly: "Dev Member",
                  userId: 2,
                },
                {
                  avatarUrl: "/assets/images/default-avatar-32.png",
                  displayName: "Site Admin",
                  loginId: "admin",
                  pureNameOnly: "Site Admin",
                  userId: 1,
                },
              ]
            : [
                {
                  avatarUrl: "/assets/images/default-avatar-32.png",
                  displayName: "Site Admin",
                  loginId: "admin",
                  pureNameOnly: "Site Admin",
                  userId: 1,
                },
              ],
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/assignable-users**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            displayName: "Site Admin",
            loginId: "admin",
            pureNameOnly: "Site Admin",
            type: "user",
            userId: 1,
          },
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            displayName: "Dev Member",
            loginId: "dev",
            pureNameOnly: "Dev Member",
            type: "user",
            userId: 2,
          },
        ],
        total: 2,
        truncated: false,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(dueDateIssueResponse(state)),
    });
  });
}

function dueDateIssueResponse(state: DueDateCase["state"]) {
  const response = populatedIssueResponse();
  if (state === "upcoming") {
    return {
      ...response,
      items: [
        {
          ...response.items[0],
          dueDateLabel: "Jul 5, 2026",
          dueDateOverdue: false,
          dueDateText: "4 days left",
        },
      ],
    };
  }
  if (state === "weighted") {
    return {
      ...response,
      closedIssueCount: 1,
      items: [
        {
          ...response.items[0],
          dueDateLabel: "Jul 5, 2026",
          dueDateOverdue: false,
          dueDateText: "Jul 5, 2026",
          state: "closed",
          weight: 4,
        },
      ],
      openIssueCount: 0,
      totalCount: 1,
      totalPages: 1,
    };
  }
  return response;
}

test("project issue state tabs keep navigating across repeated switches", async ({ page }) => {
  await mockProjectIssues(page, "populated");
  await page.goto(`${basePath}/admin/sample/issues?state=open`);

  const openTab = page.locator('a[href*="state=open"]').first();
  const closedTab = page.locator('a[href*="state=closed"]').first();
  await expect(openTab).toBeVisible();
  await expect(closedTab).toBeVisible();

  // Repeated open/closed switches must not deadlock the router: the first
  // switch starts a real fetch, later ones hit the query cache. A stale
  // transition lock used to preventDefault the third click onward (see
  // route-fetch-lock.tsx fallback release counting disabled queries as
  // pending), freezing every later navigation.
  for (let i = 0; i < 3; i += 1) {
    await closedTab.click();
    await expect(page).toHaveURL(new RegExp(`state=closed(?:&|$)`));
    await openTab.click();
    await expect(page).toHaveURL(new RegExp(`state=open(?:&|$)`));
  }

  // Navigation must still work after the switches: open an issue detail page.
  const issueLink = page.locator('[data-owner="project-issues-title"]').first();
  await expect(issueLink).toBeVisible();
  await issueLink.click();
  await expect(page).toHaveURL(/\/issue\/\d+(?:[?#]|$)/u);
});

function populatedIssueResponse() {
  return {
    closedIssueCount: 2,
    draftItems: [],
    items: [
      {
        assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
        assigneeLabel: "Site Admin",
        assigneeLoginId: "admin",
        assigneeUserId: 1,
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        authorUserId: 2,
        commentCount: 3,
        createdLabel: "Jul 1, 2026",
        dueDateLabel: "Jun 30, 2026",
        dueDateOverdue: true,
        dueDateText: "Overdue",
        id: 42,
        issueNumber: 11,
        labels: [
          {
            categoryId: 3,
            categoryIsExclusive: false,
            categoryName: "bug",
            color: "#51aacc",
            id: 8,
            name: "bug",
          },
        ],
        milestoneId: 5,
        milestoneTitle: "v1.0",
        ownerName: "admin",
        projectName: "sample",
        state: "open",
        title: "Fix flaky issue",
        updatedLabel: "Jul 1, 2026",
        voterCount: 1,
      },
    ],
    openIssueCount: 1,
    ownerName: "admin",
    pageNum: 1,
    pageSize: 15,
    projectName: "sample",
    totalCount: 3,
    totalPages: 3,
  };
}
