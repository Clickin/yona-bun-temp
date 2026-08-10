// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/style-project-milestones-closed-due-margin");
const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test("closed milestone due dates keep the legacy ml5 ownership and geometry", async ({ page }) => {
  const routeSource = source("../src/routes/$ownerName/$projectName/milestones.tsx");
  const legacyList = source("../../yona-original/app/views/milestone/list.scala.html");
  const commonLess = source("../../yona-original/app/assets/stylesheets/less/_common.less");
  const pageLess = source("../../yona-original/app/assets/stylesheets/less/_page.less");
  const responsiveLess = source("../../yona-original/app/assets/stylesheets/less/_responsive.less");
  const bootstrapCss = source("../../yona-original/public/bootstrap/css/bootstrap.css");
  const bootstrapResponsiveCss = source(
    "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  );
  const yobiLess = source("../../yona-original/app/assets/stylesheets/yobi.less");
  const messages = source("../../yona-original/conf/messages");
  const milestonePageLess = pageLess.split("\n").slice(2327, 2420).join("\n");

  expect(legacyList).toContain('<ul class="milestones">');
  expect(legacyList).toContain('<span class="due-date @if(milestone.isOverDueDate){over}">');
  expect(legacyList).toContain('<span class="due-date ml5">');
  expect(legacyList).toContain('class="state nm open"');
  expect(legacyList).toContain('class="state nm closed"');
  expect(legacyList).toContain('@Messages("label.dueDate")');
  expect(commonLess).toContain(".ml5 { margin-left:5px; }");
  for (const rule of [
    ".milestones {",
    ".milestone {",
    ".meta-info",
    ".due-date",
    ".progress-wrap",
    ".progress {",
  ]) {
    expect(milestonePageLess).toContain(rule);
  }
  expect(responsiveLess).toContain("@media all and (max-width: 720px) {");
  expect(responsiveLess).toContain('input[type="text"],');
  expect(bootstrapCss).toContain("button,\ninput,\nselect,\ntextarea {\n  margin: 0;");
  expect(bootstrapCss).toContain("input::-moz-focus-inner");
  expect(bootstrapCss).toContain(".row-fluid {");
  expect(bootstrapResponsiveCss).toContain("@media (max-width: 767px) {");
  expect(bootstrapResponsiveCss).toContain(".row-fluid {");
  expect(bootstrapResponsiveCss).toContain(".input-block-level {");
  for (const importedFile of [
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
  ]) {
    expect(yobiLess).toContain(`@import "less/${importedFile}";`);
  }
  for (const message of [
    "common.order.dueDate = Due Date",
    "label.dueDate = Due Date",
    "milestone.is.empty = No milestone entered.",
    "milestone.menu.new = New milestone",
    "milestone.state.all = All",
    "milestone.state.closed = Closed",
    "milestone.state.open = Open",
    "search.title = Search",
  ]) {
    expect(messages).toContain(message);
  }

  expect(routeSource).toContain("due-date ml5");

  await mockProjectMilestones(page);
  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/milestones?state=all&orderBy=dueDate&orderDir=asc`, {
      waitUntil: "commit",
    });

    const milestones = page.locator("ul.milestones > li.milestone");
    const openDue = milestones.filter({ hasText: "v1.0" }).locator(".due-date");
    const closedDue = milestones.filter({ hasText: "v0.9" }).locator(".due-date");
    await expect(milestones).toHaveCount(2);
    await expect(page.locator(".milestone-name")).toHaveText(["v1.0", "v0.9"]);
    await expect(page.locator(".nav-tabs li.active a")).toHaveText("All");
    await expect(page.locator(".nav-tabs a")).toHaveText(["Open", "Closed", "All"]);
    await expect(page.locator(".filters a")).toHaveText(["Due Date", "Completion Rate"]);
    await expect(page.locator('input[name="filter"]')).toHaveAttribute("placeholder", "Search");
    await expect(page.locator(".ybtn-success")).toHaveText("New milestone");

    await expect(openDue).toHaveClass(/\bdue-date\b/u);
    await expect(openDue).toHaveClass(/\bover\b/u);
    await expect(openDue).not.toHaveClass(/\bml5\b/u);
    await expect(openDue).toContainText("Due Date");
    await expect(openDue.locator("strong")).toHaveText("2026-06-30");
    await expect(openDue.locator(".date")).toHaveText("(Overdue)");
    await expect(openDue).not.toHaveCSS("margin-left", "5px");
    await expect(closedDue).toHaveClass(/\bdue-date\b/u);
    await expect(closedDue).toHaveClass(/\bml5\b/u);
    await expect(closedDue).toContainText("Due Date");
    await expect(closedDue.locator("strong")).toHaveText("2026-05-31");
    await expect(closedDue).toHaveCSS("margin-left", "5px");
    // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.

    const geometry = await page.evaluate(() => {
      const selectors = [
        ".page-wrap-outer",
        ".project-page-wrap",
        ".filter-wrap.milestone",
        ".row-fluid:not(.user-menu-wrap)",
        "ul.milestones",
        "ul.milestones > li.milestone",
        ".milestone .due-date",
      ];
      const boxes = selectors.flatMap((selector) =>
        Array.from(document.querySelectorAll<HTMLElement>(selector)).map((element) => {
          const box = element.getBoundingClientRect();
          return {
            bottom: box.bottom,
            left: box.left,
            right: box.right,
            top: box.top,
            width: box.width,
          };
        }),
      );
      return {
        boxes,
        documentContained: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });
    expect(geometry.documentContained).toBe(true);
    for (const box of geometry.boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport.width);
      expect(box.width).toBeGreaterThan(0);
      expect(box.bottom).toBeGreaterThan(box.top);
    }

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }

  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/milestones?state=all&orderBy=dueDate&orderDir=asc`, {
    waitUntil: "commit",
  });
  await page.locator('.nav-tabs a:has-text("Closed")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/milestones?state=closed`);
  await expect(page.locator(".nav-tabs li.active a")).toHaveText("Closed");
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
            dueDateLabel: "2026-06-30",
            dueDateOverdue: true,
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
            untilLabel: "Overdue",
            viewerCanUpdate: true,
          },
          {
            closedIssueCount: 1,
            completionPercent: 100,
            dueDateLabel: "2026-05-31",
            dueDateOverdue: false,
            id: 7,
            openIssueCount: 0,
            openIssues: [],
            closedIssues: [
              {
                assigneeLabel: "",
                issueNumber: 13,
                labels: [],
                state: "closed",
                title: "Closed all-state issue",
              },
            ],
            state: "closed",
            title: "v0.9",
            untilLabel: "",
            viewerCanUpdate: true,
          },
        ],
      },
    }),
  );
}
