import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-milestone-detail-list-action-float",
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

test(`milestone detail owns the legacy list action float (${fallbackMode})`, async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/-milestone-detail.stylex.ts",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  const massUpdatePartial = readFileSync(
    "../yona-original/app/views/issue/partial_massupdate.scala.html",
    "utf8",
  );
  const issueListPartial = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
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

  expect(legacyView).toContain(
    "@urlToList = {@routes.MilestoneApp.milestones(project.owner, project.name)}",
  );
  expect(legacyView).toMatch(
    /<div class="actrow right-txt row-fluid"[^>]*>[\s\S]*?<a href="@routes\.MilestoneApp\.milestones\(project\.owner, project\.name\)" class="ybtn pull-left">/u,
  );
  expect(legacyView).toContain("issue.partial_massupdate");
  expect(legacyView).toContain("issue.partial_list");
  expect(massUpdatePartial).toContain('class="mass-update-wrap hide-in-mobile"');
  expect(issueListPartial).toContain('<ul class="post-list-wrap row-fluid">');
  expect(commonLess).toContain(".right-txt     { text-align:right; }");
  expect(pageLess).toContain(".milestone-desc {");
  expect(responsiveLess).toContain(".hide-in-mobile {");
  expect(bootstrap).toMatch(/\.pull-left\s*\{\s*float:\s*left;\s*\}/u);
  expect(bootstrapResponsive).toContain(".row-fluid {");
  for (const imported of legacyImportChain) {
    expect(yobiLess).toContain(`@import "less/${imported}"`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  expect(messages).toContain("button.list = List");
  expect(messages).toContain("button.delete = Delete");
  expect(messages).toContain("button.edit = Edit");
  expect(milestoneJs).toContain("_initFileDownloader");
  expect(milestoneJs).toContain('waLabels.on("click"');

  expect(styleSource).toContain('listAction: { float: "left" }');
  expect(routeSource).toContain('data-stylex-owner="milestone-detail-list-action"');
  expect(routeSource).toContain("sx.listAction.className");
  expect(routeSource).not.toContain('className="ybtn pull-left"');
  expect(routeSource).not.toContain("className={`${sx.listAction.className} ybtn pull-left`}");

  await mockMilestone(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/milestone/1`, { waitUntil: "commit" });

    const actionRow = page.locator('[data-stylex-owner="milestone-detail-actions"]');
    const listAction = page.locator('[data-stylex-owner="milestone-detail-list-action"]');
    await expect(actionRow).toBeVisible();
    await expect(listAction).toBeVisible();
    await expect(listAction).toHaveText("List");
    await expect(listAction).toHaveCSS("float", "left");
    await expect(listAction).toHaveClass(/\bybtn\b/u);
    await expect(listAction).not.toHaveClass(/\bpull-left\b/u);
    await expect(listAction).toHaveAttribute("href", `${basePath}/admin/sample/milestones`);
    await expect(actionRow.locator("a, button")).toHaveText([
      "List",
      "Delete",
      "Edit",
      "Close milestone",
    ]);

    const pluginAttribute =
      /^data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)/u;
    expect(
      await listAction.evaluate((element, pluginAttributeSource) => {
        const pluginAttribute = new RegExp(pluginAttributeSource, "u");
        return Array.from(element.attributes)
          .filter(({ name }) => pluginAttribute.test(name))
          .map(({ name }) => name);
      }, pluginAttribute.source),
    ).toEqual([]);

    const geometry = await page.evaluate(() => {
      const action = document.querySelector<HTMLElement>(
        '[data-stylex-owner="milestone-detail-actions"]',
      );
      const list = document.querySelector<HTMLElement>(
        '[data-stylex-owner="milestone-detail-list-action"]',
      );
      if (!action || !list) return null;
      const actionBox = action.getBoundingClientRect();
      const listBox = list.getBoundingClientRect();
      return {
        action: {
          bottom: actionBox.bottom,
          left: actionBox.left,
          right: actionBox.right,
          top: actionBox.top,
        },
        documentWidth: document.documentElement.scrollWidth,
        list: {
          bottom: listBox.bottom,
          left: listBox.left,
          right: listBox.right,
          top: listBox.top,
        },
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.documentWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
    expect(geometry!.list.left).toBeGreaterThanOrEqual(geometry!.action.left - 1);
    expect(geometry!.list.right).toBeLessThanOrEqual(geometry!.action.right + 1);
    expect(geometry!.list.top).toBeGreaterThanOrEqual(geometry!.action.top - 1);
    expect(geometry!.list.bottom).toBeLessThanOrEqual(geometry!.action.bottom + 1);

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });

    await listAction.click();
    await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/milestones$`));
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route: Route) =>
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
