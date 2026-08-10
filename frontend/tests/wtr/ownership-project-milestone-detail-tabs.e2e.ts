import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDirectory = resolve(
  "output/playwright/style-project-milestone-detail-tabs",
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

test(`milestone detail owns the issue tabs (${fallbackMode})`, async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const yobiUiLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
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

  expect(legacyView).toContain('<div id="issues">');
  expect(legacyView).toContain('<ul class="nav nav-tabs">');
  expect(legacyView).toContain('<li @if(issueState == state) { class="active" }>');
  expect(legacyView).toContain('<a href="@getTabLinkByState(state)#issues">');
  expect(legacyView).toContain('<span class="num-badge">');
  expect(legacyView).toContain("@for(state <- Array(State.OPEN, State.CLOSED, State.ALL)) {");
  expect(yobiUiLess).toContain("padding-left:30px; padding-right:30px;");
  expect(yobiUiLess).toContain("color: #3592b5;");
  expect(yobiUiLess).toContain("font-weight: bold;");
  expect(yobiUiLess).toContain("/** tab UI **/");
  expect(pageLess).toContain(".nav-tabs");
  expect(responsiveLess).toContain(".nav-tabs li a");
  expect(responsiveLess).toContain("padding-left: 5px !important");
  expect(responsiveLess).toContain("padding-right: 5px !important");
  expect(bootstrap).toContain(".nav {\n  margin-bottom: 20px;");
  expect(bootstrap).toContain(".nav-tabs {\n  border-bottom: 1px solid #ddd;");
  expect(bootstrap).toContain(".nav-tabs > li {\n  margin-bottom: -1px;");
  expect(bootstrap).toContain(".nav-tabs > li > a {\n  padding-top: 8px;");
  expect(bootstrap).toContain("border-radius: 4px 4px 0 0;");
  expect(bootstrapResponsive).toContain(".nav-collapse .nav");
  for (const imported of legacyImportChain) {
    expect(yobiLess).toContain(`@import "less/${imported}"`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  for (const message of [
    "issue.state.open = Open",
    "issue.state.closed = Closed",
    "issue.state.all = All",
  ]) {
    expect(messages).toContain(message);
  }
  expect(milestoneJs).toContain("_initFileDownloader");

  expect(routeSource).toContain('data-owner="milestone-detail-tabs"');
  expect(routeSource).toContain('hash="issues"');
  expect(routeSource).toContain('data-owner="milestone-detail-tabs"');
  expect(routeSource).not.toContain('data-toggle="tab"');

  await mockMilestone(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/milestone/1`, { waitUntil: "commit" });
    const tabs = page.locator('[data-owner="milestone-detail-tabs"]');
    const items = tabs.locator(":scope > li");
    const links = items.locator(":scope > a");
    await expect(tabs).toHaveClass(/\bnav\b/u);
    await expect(tabs).toHaveClass(/\bnav-tabs\b/u);
    await expect(items).toHaveCount(3);
    await expect(items).toHaveText(["Open1", "Closed0", "All1"]);
    await expect(items.nth(0)).toHaveClass(/\bactive\b/u);
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/milestone/1?state=open#issues`,
    );
    await expect(links.nth(1)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/milestone/1?state=closed#issues`,
    );
    await expect(links.nth(2)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/milestone/1?state=all#issues`,
    );

    for (const link of await links.all()) {
      await expect(link).toHaveCSS("display", "block");
      await expect(link).toHaveCSS("margin-right", "2px");
      await expect(link).toHaveCSS("line-height", "20px");
      await expect(link).toHaveCSS("font-weight", "700");
      await expect(link).toHaveCSS("border-top-left-radius", "4px");
    }
    await expect(tabs).toHaveCSS("margin-bottom", "20px");
    await expect(tabs).toHaveCSS("margin-left", "0px");
    await expect(tabs).toHaveCSS("border-bottom-width", "1px");
    await expect(items.nth(0)).toHaveCSS("float", "left");
    await expect(items.nth(0)).toHaveCSS("margin-bottom", "-2px");
    await expect(links.nth(0)).toHaveCSS("color", "rgb(85, 85, 85)");
    await expect(links.nth(0)).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(links.nth(0)).toHaveCSS("cursor", "default");
    await expect(links.nth(0)).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
    await expect(links.nth(1)).toHaveCSS("color", "rgb(53, 146, 181)");
    if (viewport.width === 390) {
      await expect(links.nth(0)).toHaveCSS("padding-left", "5px");
      await expect(links.nth(0)).toHaveCSS("padding-right", "5px");
      await expect(links.nth(1)).toHaveCSS("padding-left", "5px");
      await expect(links.nth(1)).toHaveCSS("padding-right", "5px");
    } else {
      await expect(links.nth(0)).toHaveCSS("padding-left", "30px");
      await expect(links.nth(0)).toHaveCSS("padding-right", "30px");
      await expect(links.nth(1)).toHaveCSS("padding-left", "30px");
      await expect(links.nth(1)).toHaveCSS("padding-right", "30px");
    }
    const pluginAttribute =
      /^data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)/u;
    expect(
      await tabs.evaluate((element, pluginAttributeSource) => {
        const matcher = new RegExp(pluginAttributeSource, "u");
        return [element, ...Array.from(element.querySelectorAll("*"))].flatMap((node) =>
          Array.from(node.attributes)
            .filter(({ name }) => matcher.test(name))
            .map(({ name }) => name),
        );
      }, pluginAttribute.source),
    ).toEqual([]);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    const geometry = await tabs.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const children = Array.from(element.children, (child) => child.getBoundingClientRect());
      return {
        bottom: rect.bottom,
        children,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    });
    expect(geometry.children.every((child) => child.left >= geometry.left - 1)).toBe(true);
    expect(geometry.children.every((child) => child.right <= geometry.right + 1)).toBe(true);
    expect(geometry.children.every((child) => child.top >= geometry.top - 1)).toBe(true);
    expect(geometry.children.every((child) => child.bottom <= geometry.bottom + 1)).toBe(true);

    await links.nth(1).click();
    await expect(page).toHaveURL(/milestone\/1\?state=closed#issues$/u);
    await expect(items.nth(1)).toHaveClass(/\bactive\b/u);
    await expect(items.nth(0)).not.toHaveClass(/\bactive\b/u);
    await expect(links.nth(1)).toHaveCSS("cursor", "default");

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
