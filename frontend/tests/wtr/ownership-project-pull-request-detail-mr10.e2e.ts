import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve builds those paths; fileURLToPath yields the served URL
// pathname so string mapping + .txt raw-suffix applies.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/style-project-pull-request-detail-mr10");

test.use({ locale: "en-US" });

test("pull request detail owns legacy mr10 on the header state/date wrapper", async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyRoot = readFileSync("../yona-original/app/views/git/view.scala.html", "utf8");
  const legacyInfo = readFileSync("../yona-original/app/views/git/partial_info.scala.html", "utf8");
  const legacyState = readFileSync(
    "../yona-original/app/views/git/partial_state.scala.html",
    "utf8",
  );
  const gitViewJs = readFileSync(
    "../yona-original/public/javascripts/service/yobi.git.View.js",
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

  expect(legacyRoot).toContain('@partial_info(project, pull, "overview")');
  expect(legacyRoot).toContain('$yobi.loadModule("git.View"');
  expect(legacyRoot).toContain('"sStateUrl"');
  expect(legacyInfo).toContain('<div class="board-header issue">');
  expect(legacyInfo).toContain('<div class="pull-right mr10 mt10">');
  expect(legacyInfo).toContain(
    '<div class="date" title="@utils.JodaDateUtil.getDateString(pull.created)">',
  );
  expect(legacyInfo).toContain(
    '<span class="badge nm @if(pull.isConflict == true) {badge-issue-conflict} else {badge-issue-@pull.state.state.toLowerCase}">',
  );
  expect(legacyInfo).toContain('@Messages("pullRequest.menu.overview")');
  expect(legacyInfo).toContain('@Messages("pullRequest.menu.changes")');
  expect(legacyState).toContain('@Messages("pullRequest.is.safe")');
  expect(legacyState).toContain('@Messages("pullRequest.is.not.safe")');
  expect(gitViewJs).toContain("sStateUrl");
  expect(gitViewJs).toContain("sStateHTML");
  expect(gitViewJs).toContain("_updateState");
  expect(commonLess).toMatch(/\.mr10\s*\{\s*margin-right:10px;\s*\}/u);
  expect(pageLess).toContain(".board-header {");
  expect(pageLess).toContain(".date {");
  expect(pageLess).toContain("margin-right:20px;");
  expect(pageLess).toContain(".badge-issue-open");
  expect(pageLess).toContain(".badge-issue-closed");
  expect(pageLess).toContain(".badge-issue-conflict");
  expect(responsiveLess).toContain(".board-header .date");
  expect(responsiveLess).toContain("margin-right: 5px !important;");
  expect(bootstrap).toContain(".pull-right");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  for (const importPath of [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ]) {
    expect(yobiLess).toContain(`@import "${importPath}";`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/${importPath}`, "utf8"),
    ).not.toHaveLength(0);
  }
  for (const messageKey of [
    "pullRequest.state.open",
    "pullRequest.state.closed",
    "pullRequest.state.conflict",
    "pullRequest.menu.overview",
    "pullRequest.menu.changes",
    "pullRequest.is.safe",
    "pullRequest.is.not.safe",
  ]) {
    expect(messages).toContain(`${messageKey} =`);
  }

  // Bucket-3 fix (wave 22): source gained marginTop in "Own pull request help messages mt10 consumer" (e1caa0ef1).

  expect(routeSource).toContain('data-owner="pull-request-detail-header-state-date"');
  expect(routeSource).toContain("pull-right mr10 mt10");
  expect(routeSource).toContain('data-owner="pull-request-detail-badge"');
  expect(routeSource).not.toContain('data-toggle="tooltip"');
  expect(routeSource).not.toContain('data-placement="top"');

  await mockPullRequestDetail(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  const states = [
    { conflict: false, copy: "Open", name: "open", number: 9, state: "open" },
    { conflict: false, copy: "Closed", name: "closed", number: 10, state: "closed" },
    { conflict: true, copy: "Conflict", name: "conflict", number: 11, state: "open" },
  ] as const;

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    for (const state of states) {
      await page.goto(`${basePath}/admin/sample/pullRequest/${state.number}`, {
        waitUntil: "commit",
      });

      const header = page.locator(".board-header.issue");
      const wrapper = page.locator('[data-owner="pull-request-detail-header-state-date"]');
      const date = wrapper.locator(".date");
      const badge = page.locator('[data-owner="pull-request-detail-badge"]');
      await expect(header).toBeVisible();
      await expect(wrapper).toHaveCount(1);
      await expect(wrapper).toHaveClass(/pull-right/u);
      await expect(wrapper).toHaveClass(/mr10/u);
      await expect(wrapper).toHaveClass(/mt10/u);
      await expect(wrapper).not.toHaveAttribute("style");
      await expect(wrapper).toHaveCSS("margin-right", "10px");
      await expect(wrapper).toHaveCSS("margin-top", "10px");
      await expect(date).toHaveText("Jul 2, 2026");
      await expect(date).toHaveAttribute("title", "Jul 2, 2026");
      await expect(badge).toHaveText(state.copy);
      await expect(badge).toHaveClass(new RegExp(`badge-issue-${state.name}`, "u"));
      await expect(badge).toHaveAttribute("data-owner", "pull-request-detail-badge");
      await expect(badge).toHaveCSS("padding", "5px 15px");
      await expect(badge).toHaveCSS("border-radius", "15px");
      await expect(badge).toHaveCSS("font-weight", "700");
      await expect(badge).not.toHaveAttribute("style");

      const pluginAttributes = await wrapper.evaluate((element) =>
        Array.from(element.attributes)
          .map((attribute) => attribute.name)
          .filter((name) =>
            /^(?:data-(?:toggle|placement|action|href|url|dismiss|target|trigger|backdrop|spy|provider|loading-text|content)|data-request-[\w-]+)$/u.test(
              name,
            ),
          ),
      );
      expect(pluginAttributes).toEqual([]);

      const metrics = await page.evaluate(() => {
        const headerElement = document.querySelector<HTMLElement>(".board-header.issue");
        const wrapperElement = document.querySelector<HTMLElement>(
          '[data-owner="pull-request-detail-header-state-date"]',
        );
        const titleElement = document.querySelector<HTMLElement>(".board-header.issue .title");
        const dateElement = wrapperElement?.querySelector<HTMLElement>(".date");
        const badgeElement = wrapperElement?.querySelector<HTMLElement>(".badge");
        if (!headerElement || !wrapperElement || !titleElement || !dateElement || !badgeElement) {
          return null;
        }
        const box = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
        };
        return {
          badge: box(badgeElement),
          date: box(dateElement),
          documentWidth: document.documentElement.scrollWidth,
          header: box(headerElement),
          innerWidth: window.innerWidth,
          title: box(titleElement),
          wrapper: box(wrapperElement),
          wrapperDisplay: getComputedStyle(wrapperElement).display,
        };
      });
      expect(metrics).not.toBeNull();
      expect(metrics!.documentWidth).toBeLessThanOrEqual(metrics!.innerWidth + 1);
      expect(metrics!.wrapperDisplay).not.toBe("none");
      expect(metrics!.wrapper.left).toBeGreaterThanOrEqual(metrics!.header.left - 1);
      expect(metrics!.wrapper.right).toBeLessThanOrEqual(metrics!.header.right + 1);
      expect(metrics!.wrapper.top).toBeGreaterThanOrEqual(metrics!.header.top - 1);
      expect(metrics!.wrapper.bottom).toBeLessThanOrEqual(metrics!.header.bottom + 1);
      expect(metrics!.date.left).toBeGreaterThanOrEqual(metrics!.wrapper.left - 1);
      expect(metrics!.badge.right).toBeLessThanOrEqual(metrics!.wrapper.right + 1);
      expect(metrics!.title.left).toBeGreaterThanOrEqual(metrics!.header.left - 1);
      expect(metrics!.title.right).toBeLessThanOrEqual(metrics!.header.right + 1);

      await page.screenshot({
        fullPage: true,
        path: resolve(screenshotDirectory, `${state.name}-${viewport.name}.png`),
      });
    }
  }
});

async function mockPullRequestDetail(page: Page) {
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
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
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
        id: 7,
        isPrivate: false,
        isUsingReviewerCount: false,
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
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/*", (route: Route) => {
    const number = Number(new URL(route.request().url()).pathname.split("/").pop());
    const conflict = number === 11;
    const state = number === 10 ? "closed" : "open";
    return route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        bodyMarkdown: "Pull request body",
        commits: [],
        conflict,
        contributor: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "dev",
          userId: 2,
          userLabel: "Dev Member",
        },
        createdLabel: "Jul 2, 2026",
        events: [],
        fromBranch: "feature/ui",
        fromOwnerName: "admin",
        fromProjectName: "sample",
        id: number,
        isMerging: false,
        isWatching: false,
        lackingReviewerCount: 0,
        mergedCommitIdFrom: "",
        mergedCommitIdTo: "",
        ownerName: "admin",
        permissions: {
          canComment: true,
          canDeleteSourceBranch: false,
          canRead: true,
          canReadChanges: true,
          canReview: false,
          canRestoreSourceBranch: false,
          canUpdate: true,
          canUpdateState: true,
          canWatch: true,
        },
        projectName: "sample",
        pullRequestNumber: number,
        receiver: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "admin",
          userId: 1,
          userLabel: "Site Admin",
        },
        requiredReviewerCount: 0,
        reviewed: false,
        reviewers: [],
        sourceBranchExists: true,
        state,
        threads: [],
        title: `${state === "closed" ? "Closed" : conflict ? "Conflict" : "Open"} header`,
        toBranch: "main",
        updatedLabel: "Jul 2, 2026",
        watcherCount: 0,
      },
    });
  });
}
