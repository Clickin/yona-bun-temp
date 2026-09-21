import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/style-pull-request-branch-direction-ml10",
  "normal",
);
const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test.use({ locale: "en-US" });

test("pull-request branch direction preserves the legacy ml10 icon boundary", async ({ page }) => {
  const routeSource = source(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
  );

  const legacyPartial = source("../../yona-original/app/views/git/partial_branch.scala.html");
  const legacyView = source("../../yona-original/app/views/git/view.scala.html");
  const legacyCommon = source("../../yona-original/app/assets/stylesheets/less/_common.less");

  expect(legacyPartial).toContain('<i class="yobicon-right-2 ml10"></i>');
  expect(legacyView).toContain("@partial_branch(pull)");
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");

  expect(routeSource).toContain('data-owner="pull-request-detail-branch-direction-icon"');
  expect(routeSource).toContain('to="/$ownerName/$projectName/code/$branch"');

  await mockPullRequestDetail(page);
  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/pullRequest/9`, { waitUntil: "networkidle" });

    const direction = page.locator('[data-owner="pull-request-detail-branch-direction-icon"]');
    await expect(direction).toBeVisible();
    await expect(direction).toHaveClass(/\byobicon-right-2\b/u);
    await expect(direction).toHaveClass(/\bml10\b/u);
    await expect(direction).toHaveCSS("margin-left", "10px");
    await expect(direction).toHaveCSS("color", "rgb(42, 127, 143)");
    await expect(direction).toHaveCSS("font-family", /yobicon/u);
    await expect(direction).not.toHaveAttribute("style", /.+/u);
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);

    const geometry = await page.evaluate(() => {
      const branch = document.querySelector<HTMLElement>(".pullRequest-branchInfo");
      const from = document.querySelector<HTMLElement>(".pullRequest-branchInfo .from");
      const icon = document.querySelector<HTMLElement>(
        '[data-owner="pull-request-detail-branch-direction-icon"]',
      );
      const to = document.querySelector<HTMLElement>(".pullRequest-branchInfo .to");
      if (!branch || !from || !icon || !to) throw new Error("branch direction geometry missing");
      const branchBox = branch.getBoundingClientRect();
      const fromBox = from.getBoundingClientRect();
      const iconBox = icon.getBoundingClientRect();
      const toBox = to.getBoundingClientRect();
      return {
        branch: {
          bottom: branchBox.bottom,
          left: branchBox.left,
          right: branchBox.right,
          top: branchBox.top,
        },
        from: { right: fromBox.right },
        icon: {
          bottom: iconBox.bottom,
          height: iconBox.height,
          left: iconBox.left,
          right: iconBox.right,
          top: iconBox.top,
          width: iconBox.width,
        },
        to: { left: toBox.left },
        viewportWidth: window.innerWidth,
        pseudoContent: getComputedStyle(icon, "::before").content,
      };
    });
    expect(geometry.icon.width).toBeGreaterThan(0);
    expect(geometry.icon.height).toBeGreaterThan(0);
    expect(geometry.icon.left).toBeGreaterThanOrEqual(geometry.branch.left - 1);
    expect(geometry.icon.right).toBeLessThanOrEqual(geometry.branch.right + 1);
    expect(geometry.icon.top).toBeGreaterThanOrEqual(geometry.branch.top - 1);
    expect(geometry.icon.bottom).toBeLessThanOrEqual(geometry.branch.bottom + 1);
    expect(geometry.pseudoContent).not.toBe("none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width + 2,
    );

    await expect(page.locator(".pullRequest-branchInfo .from .branchName")).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/code/feature%2Fui`,
    );
    await expect(page.locator(".pullRequest-branchInfo .to .branchName")).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/code/main`,
    );

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockPullRequestDetail(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const avatarUrl = `${basePath}/legacy-assets/images/default-avatar-34.png`;
  const session = {
    actorId: "1",
    avatarUrl,
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Site Admin",
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
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        isUsingReviewerCount: false,
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/9", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        bodyMarkdown: "Pull request body",
        commits: [],
        conflict: false,
        contributor: { avatarUrl, loginId: "dev", userId: 2, userLabel: "Dev Member" },
        createdLabel: "Jul 2, 2026",
        events: [],
        fromBranch: "feature/ui",
        fromOwnerName: "admin",
        fromProjectName: "sample",
        id: 9,
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
        pullRequestNumber: 9,
        receiver: { avatarUrl, loginId: "admin", userId: 1, userLabel: "Site Admin" },
        requiredReviewerCount: 0,
        reviewed: false,
        reviewers: [],
        sourceBranchExists: true,
        state: "open",
        threads: [],
        title: "Improve docs",
        toBranch: "main",
        updatedLabel: "Jul 2, 2026",
        watcherCount: 0,
      },
    }),
  );
}
