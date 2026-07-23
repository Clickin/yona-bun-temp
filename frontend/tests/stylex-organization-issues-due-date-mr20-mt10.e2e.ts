import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ORGANIZATION_ISSUES_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/organizations/$organizationName/issues.tsx", import.meta.url),
  "utf8",
);
const ORGANIZATION_ISSUES_STYLE_SOURCE = readFileSync(
  new URL(
    "../src/routes/organizations/$organizationName/-organization-issues.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);
const LEGACY_ISSUE_LIST_SOURCE = readFileSync(
  new URL(
    "../../yona-original/app/views/organization/group_issue_list_partial.scala.html",
    import.meta.url,
  ),
  "utf8",
);
const LEGACY_COMMON_LESS_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);
const LEGACY_ISSUE_PAGE_LESS_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const LEGACY_RESPONSIVE_LESS_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  "utf8",
);
const LEGACY_BOOTSTRAP_SOURCE = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
  "utf8",
);
const LEGACY_BOOTSTRAP_RESPONSIVE_SOURCE = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  "utf8",
);
const LEGACY_YOBI_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const LEGACY_MESSAGES_SOURCE = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);
const LEGACY_CSS_BUILD_SOURCE = readFileSync(
  new URL("../scripts/build-legacy-css.mjs", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("organization issue due-date wrapper keeps legacy source and StyleX evidence", () => {
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain(
    '<div class="mr20 mt10 pull-right @if(issue.isOverDueDate) {overdue}"',
  );
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain("@if(issue.dueDate != null)");
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain("@if(issue.isOpen)");
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain("@issue.until");
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain("@issue.getDueDateString");
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain('@Messages("issue.dueDate.overdue")');
  expect(LEGACY_ISSUE_LIST_SOURCE).toContain('<i class="yobicon-clock2"></i>');
  expect(LEGACY_COMMON_LESS_SOURCE).toContain(".mt10 { margin-top:10px; }");
  expect(LEGACY_COMMON_LESS_SOURCE).toContain(".mr20 { margin-right:20px; }");
  expect(LEGACY_ISSUE_PAGE_LESS_SOURCE).toContain(".overdue {\n    color:@yobi-red;\n}");
  expect(LEGACY_RESPONSIVE_LESS_SOURCE).toContain("@media all and (max-width: 720px)");
  expect(LEGACY_RESPONSIVE_LESS_SOURCE).toContain(".hide-in-mobile");
  expect(LEGACY_BOOTSTRAP_SOURCE).toContain(".pull-right");
  expect(LEGACY_BOOTSTRAP_RESPONSIVE_SOURCE).toContain(".row-fluid .span2");
  expect(LEGACY_BOOTSTRAP_RESPONSIVE_SOURCE).toContain("@media");
  for (const importPath of [
    "less/_common.less",
    "less/_page.less",
    "less/_responsive.less",
    "less/_sprites.less",
  ]) {
    expect(LEGACY_YOBI_SOURCE).toContain(`@import "${importPath}";`);
    expect(
      readFileSync(
        new URL(`../../yona-original/app/assets/stylesheets/${importPath}`, import.meta.url),
        "utf8",
      ),
    ).not.toHaveLength(0);
  }
  expect(LEGACY_CSS_BUILD_SOURCE).toContain("yona-original/public/bootstrap/css/bootstrap.css");
  expect(LEGACY_CSS_BUILD_SOURCE).toContain(
    "yona-original/public/bootstrap/css/bootstrap-responsive.css",
  );
  expect(LEGACY_CSS_BUILD_SOURCE).toContain("yona-original/app/assets/stylesheets/yobi.less");
  expect(LEGACY_MESSAGES_SOURCE).toContain("issue.dueDate = Due date");
  expect(LEGACY_MESSAGES_SOURCE).toContain("issue.dueDate.overdue = Overdue");
  expect(LEGACY_MESSAGES_SOURCE).toContain("common.time.leftday = {0} days left");

  expect(ORGANIZATION_ISSUES_ROUTE_SOURCE).toContain(
    'import { styles } from "./-organization-issues.stylex";',
  );
  expect(ORGANIZATION_ISSUES_ROUTE_SOURCE).toContain("styles.dueDateWrapper");
  expect(ORGANIZATION_ISSUES_ROUTE_SOURCE).toContain(
    'data-stylex-owner="organization-issues-due-date"',
  );
  const issueItemSource = ORGANIZATION_ISSUES_ROUTE_SOURCE.slice(
    ORGANIZATION_ISSUES_ROUTE_SOURCE.indexOf("function OrganizationIssueItem"),
    ORGANIZATION_ISSUES_ROUTE_SOURCE.indexOf("function TwoColumnModeCheckbox"),
  );
  expect(issueItemSource).not.toContain('data-toggle="tooltip"');
  expect(issueItemSource).not.toContain('data-placement="top"');
  expect(ORGANIZATION_ISSUES_STYLE_SOURCE).toContain(
    'dueDateWrapper: {\n    marginRight: "20px",\n    marginTop: "10px",',
  );
});

type DueDateCase = {
  name: "open-overdue" | "open-upcoming" | "closed";
  state: "open" | "closed";
  query: string;
  dueDateLabel: string;
  dueDateText: string;
  copy: string;
  title: string;
  overdue: boolean;
};

const dueDateCases: DueDateCase[] = [
  {
    name: "open-overdue",
    state: "open",
    query: "filter=bug&state=open",
    dueDateLabel: "Jun 30, 2026",
    dueDateText: "Overdue",
    copy: "Overdue",
    title: "Jun 30, 2026",
    overdue: true,
  },
  {
    name: "open-upcoming",
    state: "open",
    query: "filter=bug&state=open",
    dueDateLabel: "Jul 5, 2026",
    dueDateText: "4 days left",
    copy: "Jul 5, 2026",
    title: "Jul 5, 2026",
    overdue: false,
  },
  {
    name: "closed",
    state: "closed",
    query: "filter=bug&state=closed",
    dueDateLabel: "Jul 5, 2026",
    dueDateText: "Jul 5, 2026",
    copy: "Jul 5, 2026",
    title: "Jul 5, 2026",
    overdue: false,
  },
];

const viewports = [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
] as const;

const dueDateOwner = '[data-stylex-owner="organization-issues-due-date"]';
const pluginOnlyAttribute =
  /^(?:data-(?:toggle|placement|action|href|url|request-.+|dismiss|target|trigger|backdrop|spy|provider|loading-text)|pjax-.+)$/u;

for (const viewport of viewports) {
  for (const dueDateCase of dueDateCases) {
    test(`organization issue ${dueDateCase.name} keeps due-date geometry at ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await mockOrganizationIssues(page, dueDateCase);
      await page.goto(`${basePath}/organizations/weblabs/issues?${dueDateCase.query}`);

      const target = page.locator(dueDateOwner);
      await expect(target).toHaveCount(1);
      await expect(target).toHaveCSS("margin-right", "20px");
      await expect(target).toHaveCSS("margin-top", "10px");
      await expect(target).toHaveClass(/\bmr20\s+mt10\s+pull-right\b/u);
      await expect(target).toHaveAttribute("data-stylex-owner", "organization-issues-due-date");
      await expect(target).toHaveAttribute("title", dueDateCase.title);
      await expect(target).toHaveText(dueDateCase.copy);
      await expect(target.locator(".yobicon-clock2")).toHaveCount(1);
      if (dueDateCase.overdue) {
        await expect(target).toHaveClass(/\boverdue\b/u);
      } else {
        await expect(target).not.toHaveClass(/\boverdue\b/u);
      }

      const targetAttributes = await target.evaluate((element) =>
        Array.from(element.attributes, ({ name, value }) => ({ name, value })),
      );
      expect(targetAttributes.filter(({ name }) => pluginOnlyAttribute.test(name))).toEqual([]);

      const geometry = await page.evaluate(() => {
        const target = document.querySelector<HTMLElement>(
          '[data-stylex-owner="organization-issues-due-date"]',
        );
        const column = target?.closest<HTMLElement>(".span2");
        const item = target?.closest<HTMLElement>(".post-item");
        if (!target || !column || !item) return null;

        const targetStyle = window.getComputedStyle(target);
        const columnStyle = window.getComputedStyle(column);
        const targetRect = target.getBoundingClientRect();
        const columnRect = column.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const targetHiddenWithColumn =
          columnStyle.display === "none" && targetRect.width === 0 && targetRect.height === 0;
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

        return {
          columnDisplay: columnStyle.display,
          pageOverflow:
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            document.documentElement.clientWidth,
          targetDisplay: targetStyle.display,
          targetContainedInColumn,
          targetContainedInItem,
          targetHiddenWithColumn,
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry?.targetContainedInColumn).toBe(true);
      expect(geometry?.targetContainedInItem).toBe(true);
      testInfo.attach("due-date-geometry-diagnostic", {
        body: JSON.stringify({ dueDateCase, geometry, viewport }, null, 2),
        contentType: "application/json",
      });

      const screenshotMode =
        process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
      const screenshotDirectory = resolve(
        "output/playwright/stylex-organization-issues-due-date-mr20-mt10",
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

async function mockOrganizationIssues(page: Page, dueDateCase: DueDateCase) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanUpdate: true,
        visibleProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/issues**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: dueDateCase.state === "closed" ? 1 : 2,
        filter: "bug",
        items: [
          {
            assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
            assigneeLabel: "Site Admin",
            assigneeLoginId: "admin",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 3,
            createdLabel: "Jul 1, 2026",
            dueDateLabel: dueDateCase.dueDateLabel,
            dueDateOverdue: dueDateCase.overdue,
            dueDateText: dueDateCase.dueDateText,
            id: 42,
            issueNumber: 11,
            labels: [{ color: "#51aacc", id: 8, name: "bug" }],
            milestoneId: 5,
            milestoneTitle: "v1.0",
            ownerName: "weblabs",
            projectName: "sample",
            state: dueDateCase.state,
            title: "Fix flaky issue",
            updatedLabel: "Jul 1, 2026",
            voterCount: 1,
          },
        ],
        openIssueCount: dueDateCase.state === "closed" ? 0 : 1,
        orderBy: "createdDate",
        orderDir: "desc",
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        state: dueDateCase.state,
        totalCount: 1,
        totalPages: 3,
        viewerUserId: 1,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/boards**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
}
