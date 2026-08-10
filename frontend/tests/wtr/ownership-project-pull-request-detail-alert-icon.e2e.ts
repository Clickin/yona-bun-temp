import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve builds those paths; fileURLToPath yields the served URL
// pathname so string mapping + .txt raw-suffix applies.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
      import.meta.url,
    ),
  ),
  "utf8",
);
const styleSource =
  readFileSync(fileURLToPath(new URL("../src/app.css", import.meta.url)), "utf8") +
  readFileSync(
    fileURLToPath(
      new URL("../frontend/public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
    ),
    "utf8",
  );
const legacyRootSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/git/view.scala.html", import.meta.url)),
  "utf8",
);
const legacyStateSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/git/partial_state.scala.html", import.meta.url),
  ),
  "utf8",
);
const legacyCommonSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  ),
  "utf8",
);
const legacyPageSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const legacyResponsiveSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  ),
  "utf8",
);
const legacyBootstrapSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url)),
  "utf8",
);
const legacyYobiSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);
const screenshotDirectory = resolve(
  fileURLToPath(new URL("../", import.meta.url)),
  "output/playwright/style-project-pull-request-detail-alert-icon",
);
mkdirSync(screenshotDirectory, { recursive: true });

const ALERT_STATES = [
  {
    alertClass: "alert-success",
    copy: "This pull request can be merged safely.",
    iconClass: "yobicon-check-circle-alt",
    isMerging: false,
    key: "safe",
    conflict: false,
  },
  {
    alertClass: "alert-error",
    copy: "A conflict occurred when merging. This pull request cannot be merged safely.",
    iconClass: "yobicon-error",
    isMerging: false,
    key: "conflict",
    conflict: true,
  },
  {
    alertClass: "alert-warnning",
    copy: "We are checking if the code is safe. Please wait for a while to complete this process.",
    iconClass: "yobicon-supportrequest",
    isMerging: true,
    key: "merging",
    conflict: false,
  },
] as const;

test("populated pull-request alert icons own the legacy mr5 spacing", async ({ page }) => {
  expect(legacyRootSource).toContain('<div id="state" class="pullRequest-stateInfo">');
  expect(legacyRootSource).toContain(
    "@partial_state(project, pull, canDeleteBranch, canRestoreBranch)",
  );
  expect(legacyStateSource).toContain('<div class="alert alert-success">');
  expect(legacyStateSource).toContain('<div class="alert alert-error">');
  expect(legacyStateSource).toContain('<div class="alert alert-warnning">');
  expect(legacyStateSource).toContain('<i class="yobicon-check-circle-alt mr5"></i>');
  expect(legacyStateSource).toContain('<i class="yobicon-error mr5"></i>');
  expect(legacyStateSource).toContain('<i class="yobicon-supportrequest mr5"></i>');
  expect(legacyCommonSource).toContain(".mr5 { margin-right:5px; }");
  expect(legacyPageSource).toContain(".pullRequest-stateInfo {");
  expect(legacyPageSource).toContain("margin-top:-2px;");
  expect(legacyPageSource).toContain("font-size:15px;");
  expect(legacyPageSource).toContain("vertical-align: middle;");
  expect(legacyResponsiveSource).toContain(".board-actrow {");
  expect(legacyBootstrapSource).toContain(".alert-success {");
  expect(legacyBootstrapSource).toContain(".alert-error {");
  expect(legacyBootstrapSource).toContain(".alert-warnning {");
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
    expect(legacyYobiSource).toContain(`@import "less/${importedFile}";`);
  }

  expect(routeSource).toContain('data-owner="pull-request-detail-alert-icon"');
  for (const iconClass of [
    "yobicon-check-circle-alt mr5",
    "yobicon-error mr5",
    "yobicon-supportrequest mr5",
  ]) {
    expect(routeSource).toContain(iconClass);
  }
  expect(routeSource).not.toMatch(/<i[^>]*style=/u);
  expect(routeSource).not.toContain("data-request-method");
  expect(routeSource).not.toContain("data-request-uri");

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let currentState: (typeof ALERT_STATES)[number] = ALERT_STATES[0];
  await mockPullRequestDetail(page, basePath, () => currentState);

  for (const alertState of ALERT_STATES) {
    currentState = alertState;
    for (const viewport of [
      { height: 900, width: 1366 },
      { height: 844, width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`${basePath}/admin/sample/pullRequest/9`, { waitUntil: "networkidle" });

      const state = page.locator('[data-owner="pull-request-detail-state"]');
      const alert = state.locator(`.${alertState.alertClass}`);
      const icon = alert.locator('[data-owner="pull-request-detail-alert-icon"]');
      const copy = alert.locator("span").first();

      await expect(state).toBeVisible();
      await expect(alert).toBeVisible();
      await expect(icon).toHaveClass(new RegExp(`\\b${alertState.iconClass}\\b`, "u"));
      await expect(icon).toHaveClass(/\bmr5\b/u);
      // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
      await expect(icon).toHaveCSS("margin-right", "5px");
      await expect(icon).not.toHaveAttribute("data-request-method", /.+/u);
      await expect(icon).not.toHaveAttribute("data-request-uri", /.+/u);
      await expect(copy).toHaveText(alertState.copy);

      const geometry = await alert.evaluate((element) => {
        const iconElement = element.querySelector<HTMLElement>(
          '[data-owner="pull-request-detail-alert-icon"]',
        );
        const copyElement = element.querySelector<HTMLElement>("span");
        const stateElement = element.closest<HTMLElement>(
          '[data-owner="pull-request-detail-state"]',
        );
        if (!iconElement || !copyElement || !stateElement) {
          throw new Error("pull-request alert geometry elements are missing");
        }
        const alertBox = element.getBoundingClientRect();
        const iconBox = iconElement.getBoundingClientRect();
        const copyBox = copyElement.getBoundingClientRect();
        const stateBox = stateElement.getBoundingClientRect();
        return {
          alertBottom: alertBox.bottom,
          alertLeft: alertBox.left,
          alertRight: alertBox.right,
          alertTop: alertBox.top,
          copyBottom: copyBox.bottom,
          copyLeft: copyBox.left,
          copyRight: copyBox.right,
          copyTop: copyBox.top,
          iconLeft: iconBox.left,
          iconRight: iconBox.right,
          iconTop: iconBox.top,
          documentScrollWidth: Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          ),
          stateBottom: stateBox.bottom,
          stateLeft: stateBox.left,
          stateRight: stateBox.right,
          stateTop: stateBox.top,
          viewportWidth: window.innerWidth,
        };
      });
      expect(geometry.alertLeft).toBeGreaterThanOrEqual(geometry.stateLeft - 1);
      expect(geometry.alertRight).toBeLessThanOrEqual(geometry.stateRight + 1);
      expect(geometry.alertTop).toBeGreaterThanOrEqual(geometry.stateTop - 1);
      expect(geometry.alertBottom).toBeLessThanOrEqual(geometry.stateBottom + 1);
      expect(geometry.iconLeft).toBeGreaterThanOrEqual(geometry.alertLeft - 1);
      expect(geometry.iconRight).toBeLessThanOrEqual(geometry.alertRight + 1);
      expect(geometry.iconTop).toBeGreaterThanOrEqual(geometry.alertTop - 1);
      expect(geometry.copyLeft).toBeGreaterThanOrEqual(geometry.alertLeft - 1);
      expect(geometry.copyRight).toBeLessThanOrEqual(geometry.alertRight + 1);
      expect(geometry.copyTop).toBeGreaterThanOrEqual(geometry.alertTop - 1);
      expect(geometry.copyBottom).toBeLessThanOrEqual(geometry.alertBottom + 1);
      expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

      if (alertState.key === "safe") {
        await page.screenshot({
          path: resolve(screenshotDirectory, `${viewport.width}x${viewport.height}.png`),
          fullPage: true,
        });
      }
    }
  }
});

async function mockPullRequestDetail(
  page: Page,
  basePath: string,
  readState: () => (typeof ALERT_STATES)[number],
) {
  const avatarUrl = `${basePath}/legacy-assets/images/default-avatar-34.png`;
  const session = {
    actorId: 1,
    avatarUrl,
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
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
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/9", (route: Route) => {
    const alertState = readState();
    return route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        bodyMarkdown: "Pull request body",
        commits: [],
        conflict: alertState.conflict,
        contributor: { avatarUrl, loginId: "dev", userId: 2, userLabel: "Dev Member" },
        createdLabel: "Jul 2, 2026",
        events: [],
        fromBranch: "feature/ui",
        fromOwnerName: "admin",
        fromProjectName: "sample",
        id: 9,
        isMerging: alertState.isMerging,
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
    });
  });
}
