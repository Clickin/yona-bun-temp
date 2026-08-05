import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallback = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDirectory = resolve(
  `output/playwright/stylex-organization-issues-action-floats/${fallback}`,
);
const owner = (name: string) => `[data-stylex-owner="${name}"]`;

const routeSource = readFileSync("src/routes/organizations/$organizationName/issues.tsx", "utf8");
const styleSource = readFileSync(
  "src/routes/organizations/$organizationName/-organization-issues.stylex.ts",
  "utf8",
);
const legacyRoot = readFileSync(
  "../yona-original/app/views/organization/group_issue_list.scala.html",
  "utf8",
);
const legacySearch = readFileSync(
  "../yona-original/app/views/organization/group_issue_search_partial.scala.html",
  "utf8",
);
const legacyList = readFileSync(
  "../yona-original/app/views/organization/group_issue_list_partial.scala.html",
  "utf8",
);
const commonLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_common.less",
  "utf8",
);
const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
const responsiveLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_responsive.less",
  "utf8",
);
const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
const bootstrapResponsive = readFileSync(
  "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  "utf8",
);
const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
const messages = readFileSync("../yona-original/conf/messages", "utf8");
const legacyCssBuild = readFileSync("scripts/build-legacy-css.mjs", "utf8");

const legacyImportChain = [
  "_variables.less",
  "_mixins.less",
  "_common.less",
  "_sprites.less",
  "_page.less",
  "_tippy.less",
  "_scrollbar.less",
  "_responsive.less",
  "_yobiUI.less",
  "_temporary.less",
  "_markdown.less",
  "_migration.less",
  "_override.less",
] as const;

test.use({ locale: "en-US" });

test("organization issue action floats keep legacy source evidence before StyleX owners", () => {
  expect(legacyRoot).toContain(
    "group_issue_search_partial(title, currentPage, param, organization)",
  );
  expect(legacySearch).toContain('<div class="filter-wrap small-heights">');
  expect(legacySearch).toContain('<div class="filters pull-right">');
  expect(legacySearch).toContain('makeFilterLink("dueDate"');
  expect(legacySearch).toContain('makeFilterLink("updatedDate"');
  expect(legacySearch).toContain('makeFilterLink("createdDate"');
  expect(legacySearch).toContain('makeFilterLink("numOfComments"');
  expect(legacyList).toContain('<div class="mt5 pull-right">');
  expect(legacyList).toContain('<div class="span2 hide-in-mobile">');
  expect(legacyList).toContain("@if(issue.dueDate != null)");

  expect(bootstrap).toMatch(/\.pull-right\s*\{[^}]*float:\s*right;/u);
  expect(bootstrap).toMatch(/\.pull-left\s*\{[^}]*float:\s*left;/u);
  expect(bootstrapResponsive).toContain(".media .pull-right");
  expect(bootstrapResponsive).toContain(".media .pull-left");
  expect(commonLess).toContain(".mt5 { margin-top:5px; }");
  expect(pageLess).toContain(".filter-wrap {");
  expect(pageLess).toContain(".filters {");
  expect(pageLess).toContain("float: right;");
  expect(pageLess).toContain(".post-list-wrap {");
  expect(responsiveLess).toContain("@media all and (max-width: 720px)");
  expect(responsiveLess).toContain(".post-list-wrap {");
  expect(responsiveLess).toContain("padding: 10px 0 !important;");

  for (const imported of legacyImportChain) {
    expect(yobiLess).toContain(`@import "less/${imported}";`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  expect(legacyCssBuild).toContain("yona-original/public/bootstrap/css/bootstrap.css");
  expect(legacyCssBuild).toContain("yona-original/public/bootstrap/css/bootstrap-responsive.css");
  expect(legacyCssBuild).toContain("yona-original/app/assets/stylesheets/yobi.less");

  for (const message of [
    "common.order.dueDate = Due Date",
    "common.order.updatedDate = Updated",
    "common.order.date = Created",
    "common.order.comments = Comments",
    "issue.assignee = Assignee",
    "issue.dueDate = Due date",
    "issue.state.open = Open",
    "issue.state.closed = Closed",
    "organization.choose.projects = Choose projects",
  ]) {
    expect(messages).toContain(message);
  }

  expect(routeSource).toContain('data-stylex-owner="organization-issues-filters"');
  expect(routeSource).toContain('data-stylex-owner="organization-issues-assignee-rail"');
  expect(styleSource).toContain('filters: { float: "right" }');
  expect(styleSource).toContain('assigneeRail: { float: "right" }');
});

test(`organization issue action floats preserve populated responsive geometry (${fallback})`, async ({
  page,
}) => {
  await mockOrganizationIssues(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(
      `${basePath}/organizations/weblabs/issues?state=open&orderBy=createdDate&orderDir=desc`,
    );

    const filters = page.locator(owner("organization-issues-filters"));
    const assigneeRails = page.locator(owner("organization-issues-assignee-rail"));
    await expect(filters).toBeVisible();
    await expect(filters).toHaveClass(/(?:^|\s)filters(?:\s|$)/u);
    await expect(filters).not.toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
    await expect(assigneeRails).toHaveCount(2);
    await expect(assigneeRails.first()).toHaveClass(/(?:^|\s)mt5(?:\s|$)/u);
    await expect(assigneeRails.first()).not.toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
    await expect(filters).toHaveCSS("float", "right");
    await expect(assigneeRails.first()).toHaveCSS("float", "right");

    const pluginAttributes = await page.evaluate(() => {
      const pluginOnly =
        /^(?:data-(?:toggle|placement|action|href|url|request-.+|dismiss|target|trigger|backdrop|spy|provider|loading-text)|pjax-.+)$/u;
      return [
        ...document.querySelectorAll<HTMLElement>(
          '[data-stylex-owner="organization-issues-filters"], [data-stylex-owner="organization-issues-assignee-rail"]',
        ),
      ].flatMap((element) =>
        [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))].flatMap((node) =>
          Array.from(node.attributes)
            .filter((attribute) => pluginOnly.test(attribute.name))
            .map((attribute) => attribute.name),
        ),
      );
    });
    expect(pluginAttributes).toEqual([]);

    const geometry = await page.evaluate(() => {
      const filter = document.querySelector<HTMLElement>(
        '[data-stylex-owner="organization-issues-filters"]',
      );
      const results = document.querySelector<HTMLElement>(
        '[data-stylex-owner="organization-issues-results"]',
      );
      const rails = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-stylex-owner="organization-issues-assignee-rail"]',
        ),
      );
      if (!filter || !results) return null;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          float: getComputedStyle(element).float,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        };
      };
      const filterBox = filter.getBoundingClientRect();
      const resultsBox = results.getBoundingClientRect();
      return {
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        filter: box(filter),
        filterContained:
          filterBox.left >= resultsBox.left - 1 && filterBox.right <= resultsBox.right + 1,
        rails: rails.map((rail) => {
          const railBox = rail.getBoundingClientRect();
          const parentBox = rail.parentElement?.getBoundingClientRect();
          return {
            box: box(rail),
            contained:
              !parentBox ||
              (railBox.left >= parentBox.left - 1 && railBox.right <= parentBox.right + 1),
          };
        }),
        results: box(results),
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry?.documentScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry?.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry?.filterContained).toBe(true);
    expect(geometry?.filter.float).toBe("right");
    expect(geometry?.filter.left).toBeGreaterThanOrEqual(0);
    expect(geometry?.filter.right).toBeLessThanOrEqual(viewport.width);
    expect(geometry?.rails).toHaveLength(2);
    for (const rail of geometry?.rails ?? []) {
      expect(rail.box.float).toBe("right");
      expect(rail.contained).toBe(true);
      expect(rail.box.left).toBeGreaterThanOrEqual(0);
      expect(rail.box.right).toBeLessThanOrEqual(viewport.width);
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });

    const dueDateSort = filters.getByRole("button", { name: /Due Date/u });
    await expect(dueDateSort).toBeVisible();
    await dueDateSort.click();
    await expect.poll(() => new URL(page.url()).searchParams.get("orderBy")).toBe("dueDate");
    await expect.poll(() => new URL(page.url()).searchParams.get("orderDir")).toBe("desc");
  }
});

async function mockOrganizationIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
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
  for (const path of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(path, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanUpdate: true,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        filter: "",
        items: [
          {
            assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
            assigneeLabel: "Site Admin",
            assigneeLoginId: "admin",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 1,
            createdLabel: "Jul 23, 2026",
            dueDateLabel: "Jul 30, 2026",
            dueDateOverdue: false,
            dueDateText: "6 days left",
            id: 42,
            issueNumber: 11,
            labels: [],
            milestoneId: null,
            milestoneTitle: "",
            ownerName: "weblabs",
            projectName: "sample",
            state: "open",
            title: "Assigned populated issue",
            updatedLabel: "Jul 23, 2026",
            voterCount: 0,
          },
          {
            assigneeAvatarUrl: "",
            assigneeLabel: "",
            assigneeLoginId: "",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Site Admin",
            authorLoginId: "admin",
            commentCount: 0,
            createdLabel: "Jul 22, 2026",
            dueDateLabel: "",
            dueDateOverdue: false,
            dueDateText: "",
            id: 43,
            issueNumber: 12,
            labels: [],
            milestoneId: null,
            milestoneTitle: "",
            ownerName: "weblabs",
            projectName: "playground",
            state: "open",
            title: "Unassigned populated issue",
            updatedLabel: "Jul 22, 2026",
            voterCount: 0,
          },
        ],
        openIssueCount: 2,
        orderBy: "createdDate",
        orderDir: "desc",
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        state: "open",
        totalCount: 2,
        totalPages: 1,
        viewerUserId: 1,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      },
    }),
  );
}
