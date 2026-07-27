import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallback = process.env.VITE_DISABLE_LEGACY_FALLBACK ? "fallback-off" : "normal";
const screenshotDirectory = resolve(
  `output/playwright/stylex-project-milestones-action-floats/${fallback}`,
);
const routeSource = readFileSync("src/routes/$ownerName/$projectName/milestones.tsx", "utf8");
const styleSource = readFileSync(
  "src/routes/$ownerName/$projectName/-milestones.stylex.ts",
  "utf8",
);
const legacyList = readFileSync("../yona-original/app/views/milestone/list.scala.html", "utf8");
const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
const responsiveLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_responsive.less",
  "utf8",
);
const yobiUiLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  "utf8",
);
const messages = readFileSync("../yona-original/conf/messages", "utf8");

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

test("project milestone float migration keeps frozen legacy evidence and StyleX owners", () => {
  expect(legacyList).toContain('<div class="pull-right btns">');
  expect(legacyList).toContain('<div class="pull-left search search-bar">');
  expect(legacyList).toMatch(/<div class="pull-right">\s*<span class="number completion-rate">/u);

  expect(bootstrap).toMatch(/\.pull-right\s*\{[^}]*float:\s*right;/u);
  expect(bootstrap).toMatch(/\.pull-left\s*\{[^}]*float:\s*left;/u);
  for (const imported of legacyImportChain) {
    expect(yobiLess).toContain(`@import "less/${imported}"`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  for (const rule of [".filter-wrap {", ".filters {", ".milestones {", ".completion-rate"]) {
    expect(pageLess).toContain(rule);
  }
  expect(yobiUiLess).toContain(".search-bar {");
  expect(responsiveLess).toContain(".search-bar {");
  for (const message of [
    "milestone.menu.new = New milestone",
    "search.title = Search",
    "label.dueDate = Due Date",
    "common.order.completionRate = Completion Rate",
    "milestone.state.open = Open",
    "milestone.state.closed = Closed",
    "milestone.state.all = All",
  ]) {
    expect(messages).toContain(message);
  }

  for (const owner of [
    "project-milestones-new-wrap",
    "project-milestones-search",
    "project-milestones-completion",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain("className={`${sx.newWrap.className} btns`}");
  expect(routeSource).toContain("className={`${sx.search.className} search search-bar`}");
  expect(routeSource).not.toContain("pull-left search search-bar");
  expect(routeSource).not.toContain("pull-right btns");
  expect(routeSource).not.toContain("className={`${sx.completion.className} pull-right`}");
  expect(styleSource).toMatch(/newWrap:\s*\{\s*float:\s*"right"\s*\}/u);
  expect(styleSource).toMatch(/search:\s*\{[^}]*float:\s*"left"/u);
  expect(styleSource).toMatch(/completion:\s*\{\s*float:\s*"right"/u);
});

test(`project milestone action floats preserve populated responsive parity (${fallback})`, async ({
  page,
}) => {
  await mockProjectMilestones(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/milestones`);

  const newWrap = page.locator('[data-stylex-owner="project-milestones-new-wrap"]');
  const search = page.locator('[data-stylex-owner="project-milestones-search"]');
  const completionNumbers = page.locator('[data-stylex-owner="project-milestones-completion"]');
  const completionWrappers = completionNumbers.locator("..");

  await expect(newWrap).toBeVisible();
  await expect(search).toBeVisible();
  await expect(completionNumbers).toHaveCount(2);
  await expect(newWrap).toHaveCSS("float", "right");
  await expect(search).toHaveCSS("float", "left");
  expect(
    await completionWrappers.evaluateAll((elements) =>
      elements.every((element) => getComputedStyle(element).float === "right"),
    ),
  ).toBe(true);

  await expect(newWrap).toHaveClass(/\bbtns\b/u);
  await expect(search).toHaveClass(/\bsearch\b/u);
  await expect(search).toHaveClass(/\bsearch-bar\b/u);
  await expect(newWrap.locator("a")).toHaveText("New milestone");
  await expect(newWrap.locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/newMilestoneForm`,
  );
  await expect(page.locator('[data-stylex-owner="project-milestones-tab-link"]')).toHaveText([
    "Open",
    "Closed",
    "All",
  ]);
  await expect(page.locator(".nav-tabs li.active a")).toHaveText("Open");
  await expect(page.locator('[data-stylex-owner="project-milestones-sort-link"]')).toHaveText([
    "Due Date",
    "Completion Rate",
  ]);
  const searchInput = page.locator('[data-stylex-owner="project-milestones-search-input"]');
  await expect(searchInput).toHaveAttribute("placeholder", "Search");
  await expect(page.locator(".milestone-name")).toHaveText(["v1.0", "v1.1"]);
  await expect(page.locator(".milestone-name").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestone/5`,
  );
  await expect(page.locator(".milestone-name").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestone/7`,
  );
  await expect(page.locator(".issue-link")).toHaveCount(1);
  await expect(page.locator(".issue-link").first()).toContainText("#11");

  for (const target of [newWrap, search, completionWrappers]) {
    expect(
      await target.evaluateAll((elements) => {
        const pluginAttribute =
          /^data-(toggle|placement|action|href|url|request-.+|dismiss|target|trigger|backdrop|spy|provider|loading-text)$/u;
        return elements.every((element) =>
          [element, ...Array.from(element.querySelectorAll("*"))].every((node) =>
            Array.from(node.attributes).every(({ name }) => !pluginAttribute.test(name)),
          ),
        );
      }),
    ).toBe(true);
  }

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    const geometry = await page.evaluate(() => {
      const targets = [
        {
          positiveDimensionsRequired: true,
          verticalContainmentRequired: false,
          element: document.querySelector<HTMLElement>(
            '[data-stylex-owner="project-milestones-new-wrap"]',
          ),
          parent: document.querySelector<HTMLElement>(
            '[data-stylex-owner="project-milestones-shell"]',
          ),
        },
        {
          positiveDimensionsRequired: true,
          verticalContainmentRequired: false,
          element: document.querySelector<HTMLElement>(
            '[data-stylex-owner="project-milestones-search"]',
          ),
          parent: document.querySelector<HTMLElement>(
            '[data-stylex-owner="project-milestones-filter-wrap"]',
          ),
        },
        ...Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-stylex-owner="project-milestones-completion"]',
          ),
        ).map((element) => ({
          positiveDimensionsRequired: false,
          verticalContainmentRequired: false,
          element: element.parentElement,
          parent: element.parentElement?.parentElement,
        })),
      ];
      return {
        documentWidth: document.documentElement.scrollWidth,
        targets: targets.map(
          ({ element, parent, positiveDimensionsRequired, verticalContainmentRequired }) => {
            if (!element || !parent) return null;
            const box = element.getBoundingClientRect();
            const parentBox = parent.getBoundingClientRect();
            return {
              bottom: box.bottom,
              height: box.height,
              left: box.left,
              parentBottom: parentBox.bottom,
              parentLeft: parentBox.left,
              parentRight: parentBox.right,
              parentTop: parentBox.top,
              right: box.right,
              top: box.top,
              verticalContained: box.top >= parentBox.top - 1 && box.bottom <= parentBox.bottom + 1,
              verticalContainmentRequired,
              width: box.width,
              positiveDimensionsRequired,
            };
          },
        ),
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.targets).toHaveLength(4);
    for (const target of geometry.targets) {
      expect(target).not.toBeNull();
      if (!target) throw new Error("Expected milestone action geometry");
      if (target.positiveDimensionsRequired) {
        expect(target.width).toBeGreaterThan(0);
        expect(target.height).toBeGreaterThan(0);
      }
      expect(target.left).toBeGreaterThanOrEqual(target.parentLeft - 1);
      expect(target.right).toBeLessThanOrEqual(target.parentRight + 1);
      expect(target.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      if (target.verticalContainmentRequired) {
        expect(target.verticalContained).toBe(true);
      }
    }
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockProjectMilestones(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
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
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestones: [
          {
            closedIssueCount: 1,
            completionPercent: 50,
            dueDateLabel: "2026-07-30",
            dueDateOverdue: false,
            id: 5,
            openIssueCount: 1,
            openIssues: [
              {
                assigneeLabel: "Dev Member",
                issueNumber: 11,
                labels: [],
                state: "open",
                title: "Open milestone issue",
              },
            ],
            closedIssues: [],
            state: "open",
            title: "v1.0",
            untilLabel: "6 days",
            viewerCanUpdate: true,
          },
          {
            closedIssueCount: 0,
            completionPercent: 0,
            dueDateLabel: "2026-08-31",
            dueDateOverdue: false,
            id: 7,
            openIssueCount: 0,
            openIssues: [],
            closedIssues: [],
            state: "open",
            title: "v1.1",
            untilLabel: "38 days",
            viewerCanUpdate: true,
          },
        ],
      },
    }),
  );
}
