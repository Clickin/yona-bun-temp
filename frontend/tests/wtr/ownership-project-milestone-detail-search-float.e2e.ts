import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDirectory = resolve(
  "output/playwright/style-project-milestone-detail-search-float",
  fallbackMode,
);
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

test(`milestone detail owns the filter search float (${fallbackMode})`, async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  const massUpdatePartial = readFileSync(
    "../yona-original/app/views/issue/partial_massupdate.scala.html",
    "utf8",
  );
  const issueListPartial = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );
  const issueDraftPartial = readFileSync(
    "../yona-original/app/views/issue/partial_list_draft.scala.html",
    "utf8",
  );
  const issueListTemplate = readFileSync(
    "../yona-original/app/views/issue/list.scala.html",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiUiLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");
  const milestoneJs = readFileSync(
    "../yona-original/public/javascripts/service/yobi.milestone.View.js",
    "utf8",
  );

  expect(legacyView).toContain('<div class="filter-wrap">');
  expect(legacyView).toContain('<div class="pull-right search search-bar">');
  expect(legacyView).toContain(
    '<input name="filter" class="textbox" type="text" placeholder="@Messages("milestone.searchPlaceholder")"',
  );
  expect(legacyView).toContain(
    '<button type="submit" class="search-btn"><i class="yobicon-search"></i></button>',
  );
  expect(legacyView).toContain("@issue.partial_massupdate(project, new SearchCondition())");
  expect(legacyView).toContain("issue.partial_list(project, milestone.sortedByNumberOfOpenIssue()");
  expect(massUpdatePartial).toContain('class="mass-update-wrap hide-in-mobile"');
  expect(issueListPartial).toContain('<ul class="post-list-wrap row-fluid">');
  expect(issueDraftPartial).toContain('<ul class="post-list-wrap row-fluid">');
  expect(issueListTemplate).toContain("@partial_list_wrap(title, currentPage, param, project)");

  expect(commonLess).toContain(".right-txt     { text-align:right; }");
  expect(pageLess).toContain(".filter-wrap {");
  expect(responsiveLess).toContain(".search-bar {");
  expect(yobiUiLess).toContain(".search-bar {");
  expect(yobiUiLess).toContain(".search-btn {");
  expect(bootstrap).toMatch(/\.pull-right\s*\{\s*float:\s*right;\s*\}/u);
  expect(bootstrapResponsive).toContain(".row-fluid {");
  for (const imported of legacyImportChain) {
    expect(yobiLess).toContain(`@import "less/${imported}"`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  expect(messages).toContain("milestone.searchPlaceholder = search at current milestone");
  expect(milestoneJs).toContain("_initFileDownloader");
  expect(milestoneJs).toContain('waLabels.on("click"');
  expect(milestoneJs).toContain("sMilestoneId");
  expect(milestoneJs).toContain("sURLLabels");

  expect(routeSource).toContain('data-owner="milestone-detail-search"');
  expect(routeSource).not.toContain('className="pull-right search search-bar"');

  await mockMilestone(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/milestone/1`, { waitUntil: "commit" });

    const filter = page.locator('[data-owner="milestone-detail-filter"]');
    const search = page.locator('[data-owner="milestone-detail-search"]');
    const input = search.locator('input[name="filter"]');
    const button = search.locator("button.search-btn");
    const issue = page.locator('[data-owner="milestone-detail-issue-row"]').first();
    await expect(filter).toBeVisible();
    await expect(search).toBeVisible();
    await expect(search).toHaveClass(/\bsearch\b/u);
    await expect(search).toHaveClass(/\bsearch-bar\b/u);
    await expect(search).toHaveCSS("float", "right");
    await expect(input).toHaveAttribute("name", "filter");
    await expect(input).toHaveAttribute("placeholder", "search at current milestone");
    await expect(input).toHaveValue("");
    await expect(button).toHaveAttribute("type", "submit");
    await expect(button.locator("i.yobicon-search")).toHaveCount(1);
    await expect(issue).toContainText("Populated milestone issue");

    const pluginAttribute =
      /^data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)/u;
    expect(
      await search.evaluate((element, pluginAttributeSource) => {
        const pluginAttribute = new RegExp(pluginAttributeSource, "u");
        return [element, ...Array.from(element.querySelectorAll("*"))].flatMap((node) =>
          Array.from(node.attributes)
            .filter(({ name }) => pluginAttribute.test(name))
            .map(({ name }) => name),
        );
      }, pluginAttribute.source),
    ).toEqual([]);

    const geometry = await page.evaluate(() => {
      const filterElement = document.querySelector<HTMLElement>(
        '[data-owner="milestone-detail-filter"]',
      );
      const searchElement = document.querySelector<HTMLElement>(
        '[data-owner="milestone-detail-search"]',
      );
      const inputElement = searchElement?.querySelector<HTMLElement>('input[name="filter"]');
      const buttonElement = searchElement?.querySelector<HTMLElement>("button.search-btn");
      if (!filterElement || !searchElement || !inputElement || !buttonElement) return null;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      return {
        button: box(buttonElement),
        documentWidth: document.documentElement.scrollWidth,
        filter: box(filterElement),
        input: box(inputElement),
        search: box(searchElement),
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.documentWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
    expect(geometry!.search.right).toBeLessThanOrEqual(geometry!.filter.right + 1);
    expect(geometry!.search.left).toBeGreaterThanOrEqual(geometry!.filter.left - 1);
    expect(geometry!.search.top).toBeGreaterThanOrEqual(geometry!.filter.top - 1);
    // Legacy float-wrap does not establish bottom containment.
    expect(geometry!.input.left).toBeGreaterThanOrEqual(geometry!.search.left - 1);
    expect(geometry!.input.right).toBeLessThanOrEqual(geometry!.search.right + 1);
    expect(geometry!.button.right).toBeLessThanOrEqual(geometry!.search.right + 1);
    expect(geometry!.button.top).toBeGreaterThanOrEqual(geometry!.search.top - 1);
    expect(geometry!.button.bottom).toBeLessThanOrEqual(geometry!.search.bottom + 1);

    await input.fill("does-not-match");
    await expect(issue).toBeHidden();
    await input.fill("Populated");
    await expect(issue).toBeVisible();
    await expect(issue).toContainText("Populated milestone issue");

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockMilestone(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: "1",
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
        members: [{ loginId: "admin" }],
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
        vcs: "GIT",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestone: {
          assignableUsers: [],
          attachments: [],
          closedIssues: [],
          closedIssueCount: 0,
          completionPercent: 50,
          contentsMarkdown: "Details",
          dueDateLabel: "2026-07-30",
          id: "1",
          openIssues: [
            {
              authorLabel: "Admin",
              authorLoginId: "admin",
              createdLabel: "2026-07-01",
              createdTitle: "2026-07-01",
              dueDateLabel: "2026-07-30",
              dueDateOverdue: false,
              dueDateText: "8 days left",
              id: "42",
              issueNumber: "42",
              labels: [],
              state: "open",
              title: "Populated milestone issue",
            },
          ],
          openIssueCount: 1,
          openMilestones: [],
          projectLabels: [],
          state: "open",
          title: "v1.0",
          untilLabel: "10 days left",
          viewerCanDelete: true,
          viewerCanUpdate: true,
        },
      },
    }),
  );
}
