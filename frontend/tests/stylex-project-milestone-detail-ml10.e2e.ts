import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-milestone-detail-ml10",
  fallbackOff ? "fallback-off" : "normal",
);

const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const legacyStyleSource = (relativePath: string) =>
  readFileSync(resolve("../yona-original/app/assets/stylesheets", relativePath), "utf8");

const milestoneCases = [
  { badge: "Open", date: "2026-07-30", id: "1", state: "open", title: "v1.0" },
  { badge: "Closed", date: "2026-06-30", id: "2", state: "closed", title: "v0.9" },
] as const;

test.use({ locale: "en-US" });

test("milestone detail owns the legacy title metadata ml10 spacing", async ({ page }) => {
  const route = source("../src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx");
  const styles = source(
    "../src/routes/$ownerName/$projectName/milestone/-milestone-detail.stylex.ts",
  );
  const legacyView = source("../../yona-original/app/views/milestone/view.scala.html");
  const commonLess = source("../../yona-original/app/assets/stylesheets/less/_common.less");
  const pageLess = source("../../yona-original/app/assets/stylesheets/less/_page.less");
  const responsiveLess = source("../../yona-original/app/assets/stylesheets/less/_responsive.less");
  const bootstrapCss = source("../../yona-original/public/bootstrap/css/bootstrap.css");
  const bootstrapResponsiveCss = source(
    "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  );
  const yobiLess = source("../../yona-original/app/assets/stylesheets/yobi.less");
  const messages = source("../../yona-original/conf/messages");
  const milestoneJs = source(
    "../../yona-original/public/javascripts/service/yobi.milestone.View.js",
  );

  expect(legacyView).toMatch(/class="title">@milestone\.title<\/a>\s*<small class="ml10">/u);
  expect(legacyView).toContain('<span class="due-date">');
  expect(legacyView).toContain(
    '@Messages("label.dueDate") <strong>@milestone.getDueDateString</strong>',
  );
  expect(legacyView).toContain('<span class="date">(@milestone.until)</span>');
  expect(legacyView).toContain(
    'class="badge badge-issue-@milestone.state.state.toLowerCase margin-left-5"',
  );
  expect(legacyView).toContain('@Messages("milestone.state." + milestone.state.state)');
  expect(legacyView).toContain('class="milesion-wrap"');
  expect(legacyView).toContain('class="progress progress-success"');

  expect(commonLess).toContain(".ml10 { margin-left:10px; }");
  for (const pageRule of [
    ".milestone-info",
    ".due-date",
    ".milestones",
    ".milestone-desc",
    ".milesion-wrap",
  ]) {
    expect(pageLess).toContain(pageRule);
  }
  expect(responsiveLess).toContain("@media all and (max-width: 720px) {");
  expect(responsiveLess).toContain(".main-stream");
  expect(bootstrapCss).toContain(".row-fluid {");
  expect(bootstrapCss).toContain("h1,");
  expect(bootstrapResponsiveCss).toContain("@media (max-width: 767px) {");
  expect(bootstrapResponsiveCss).toContain(".row-fluid {");

  const yobiImports = [...yobiLess.matchAll(/@import "less\/([^"]+)";/gu)].map((match) => match[1]);
  expect(yobiImports).toEqual([
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
  ]);
  for (const importedFile of yobiImports) {
    expect(legacyStyleSource(`less/${importedFile}`)).not.toBe("");
  }

  for (const message of [
    "common.time.leftday = {0} days left",
    "common.time.overday = {0} days past",
    "label.dueDate = Due Date",
    "milestone.state.open = Open",
    "milestone.state.closed = Closed",
    "milestone.close = Close milestone",
    "milestone.open = Open",
  ]) {
    expect(messages).toContain(message);
  }

  expect(legacyView).toContain('"sMilestoneId"');
  expect(legacyView).toContain('"sURLLabels"');
  expect(milestoneJs).toContain("htElement.sMilestoneId");
  expect(milestoneJs).toContain("htElement.sURLLabels");
  expect(milestoneJs).toContain("_initFileDownloader");
  expect(milestoneJs).toContain('waLabels.on("click"');

  expect(styles).toContain('titleMeta: { marginLeft: "10px" }');
  expect(route).toContain("titleMeta: stylex.props(styles.titleMeta)");
  expect(route).toContain("className={`${sx.titleMeta.className} ml10`}");
  expect(route).toContain('data-stylex-owner="milestone-detail-title-meta"');
  expect(route).not.toContain('<small className="ml10">');
  expect(route).not.toContain('style={{ marginLeft: "10px" }}');
  expect(route).toContain("styles.badgeOpen");
  expect(route).toContain("styles.badgeClosed");
  expect(route).toContain("localizedMilestoneUntilLabel");
  expect(route).not.toContain('data-toggle="modal"');
  expect(route).not.toContain("data-request-method");

  await mockMilestoneDetail(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const milestone of milestoneCases) {
    for (const viewport of [
      { height: 900, name: "1366x900", width: 1366 },
      { height: 844, name: "390x844", width: 390 },
    ]) {
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await page.goto(
        `${basePath}/weblabs/demo/milestone/${milestone.id}?state=${milestone.state}`,
        { waitUntil: "commit" },
      );

      const title = page.locator("h4 > a.title");
      const titleMeta = page.locator('[data-stylex-owner="milestone-detail-title-meta"]');
      const badge = titleMeta.locator('[data-stylex-owner="milestone-detail-state-badge"]');
      await expect(title).toHaveText(milestone.title);
      await expect(titleMeta).toBeVisible();
      await expect(titleMeta).toHaveClass(/\bml10\b/u);
      await expect(titleMeta.locator(".due-date")).toContainText("Due Date");
      await expect(titleMeta.locator(".due-date strong")).toHaveText(milestone.date);
      await expect(badge).toHaveText(milestone.badge);
      await expect(badge).toHaveClass(new RegExp(`\\bbadge-issue-${milestone.state}\\b`, "u"));
      await expect(titleMeta).toHaveCSS("margin-left", "10px");
      await expect(titleMeta).not.toHaveAttribute("style");

      if (milestone.state === "open") {
        await expect(titleMeta.locator(".date")).toHaveText("(10 days left)");
      } else {
        await expect(titleMeta.locator(".date")).toHaveCount(0);
      }

      const wrapperAttributes = await titleMeta.evaluate((element) => ({
        children: Array.from(element.children).map((child) => child.tagName),
        pluginAttributes: Array.from(element.attributes)
          .map((attribute) => attribute.name)
          .filter((name) =>
            /^data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)/u.test(
              name,
            ),
          ),
      }));
      expect(wrapperAttributes.children).toEqual(
        milestone.state === "open" ? ["SPAN", "SPAN", "SPAN"] : ["SPAN", "SPAN"],
      );
      expect(wrapperAttributes.pluginAttributes).toEqual([]);

      const geometry = await page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>(
          '[data-stylex-owner="milestone-detail-shell"]',
        );
        const heading = document.querySelector<HTMLElement>("h4");
        const titleMeta = document.querySelector<HTMLElement>(
          '[data-stylex-owner="milestone-detail-title-meta"]',
        );
        if (!shell || !heading || !titleMeta) return null;
        const box = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
        };
        return {
          documentContained: document.documentElement.scrollWidth <= window.innerWidth,
          heading: box(heading),
          shell: box(shell),
          titleMeta: box(titleMeta),
          viewport: window.innerWidth,
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry!.documentContained).toBe(true);
      expect(geometry!.shell.left).toBeGreaterThanOrEqual(0);
      expect(geometry!.shell.right).toBeLessThanOrEqual(geometry!.viewport);
      expect(geometry!.titleMeta.left).toBeGreaterThanOrEqual(geometry!.heading.left);
      expect(geometry!.titleMeta.right).toBeLessThanOrEqual(geometry!.heading.right);
      expect(geometry!.titleMeta.top).toBeGreaterThanOrEqual(geometry!.heading.top - 1);
      expect(geometry!.titleMeta.bottom).toBeLessThanOrEqual(geometry!.heading.bottom + 1);
      expect(geometry!.titleMeta.right).toBeLessThanOrEqual(geometry!.shell.right);
      expect(geometry!.titleMeta.bottom).toBeGreaterThan(geometry!.titleMeta.top);

      await page.screenshot({
        fullPage: true,
        path: resolve(screenshotDirectory, `${milestone.state}-${viewport.name}.png`),
      });
    }
  }
});

async function mockMilestoneDetail(page: Page) {
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

  await page.route("**/api/v1/owners/weblabs/projects/demo/container", (route: Route) =>
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
        ownerName: "weblabs",
        projectName: "demo",
        vcs: "GIT",
      },
    }),
  );

  for (const milestone of milestoneCases) {
    await page.route(
      `**/api/v1/owners/weblabs/projects/demo/milestones/${milestone.id}`,
      (route: Route) =>
        route.fulfill({
          contentType: "application/json",
          json: {
            milestone: {
              assignableUsers: [],
              attachments: [],
              closedIssues: [],
              closedIssueCount: 0,
              completionPercent: milestone.state === "closed" ? 100 : 50,
              contentsMarkdown: "Details",
              dueDateLabel: milestone.date,
              id: milestone.id,
              openIssues: [],
              openIssueCount: 0,
              openMilestones: [],
              projectLabels: [],
              state: milestone.state,
              title: milestone.title,
              untilLabel: milestone.state === "open" ? "10 days left" : "10 days past",
              viewerCanDelete: false,
              viewerCanUpdate: false,
            },
          },
        }),
    );
  }
}
