import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
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
const styleSource = curatedAppCss() + mergedLegacyBlock();
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
const legacyYobiSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);
const screenshotDirectory = resolve(
  fileURLToPath(new URL("../", import.meta.url)),
  "output/playwright/style-project-pull-request-detail-action-wrapper",
);
mkdirSync(screenshotDirectory, { recursive: true });

test("populated pull-request detail owns the legacy action wrapper margin", async ({ page }) => {
  expect(legacyRootSource).toContain('<div class="mr5" style="display:inline-block;">');
  expect(legacyRootSource).toContain('@Messages("button.edit")');
  expect(legacyRootSource).toContain('@Messages("pullRequest.close")');
  expect(legacyStateSource).toContain('<div class="alert alert-success">');
  expect(legacyStateSource).toContain("mr5");
  expect(legacyCommonSource).toContain(".mr5 { margin-right:5px; }");
  expect(legacyPageSource).toContain(".board-actrow {");
  expect(legacyResponsiveSource).toContain(".board-actrow {");
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

  expect(routeSource).toContain('data-owner="pull-request-detail-action-wrapper"');

  expect(routeSource).not.toMatch(/<a\s/u);

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPullRequestDetail(page, basePath);

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/9`, { waitUntil: "networkidle" });

    const actions = page.locator('[data-owner="pull-request-detail-actions"]');
    const actionWrapper = page.locator('[data-owner="pull-request-detail-action-wrapper"]');
    const editLink = actionWrapper.getByRole("link", { name: "Edit" });
    const closeButton = actionWrapper.getByRole("button", { name: "Close" });

    await expect(actions).toBeVisible();
    await expect(actionWrapper).toBeVisible();
    await expect(actionWrapper).toHaveClass(/\bmr5\b/u);
    // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
    await expect(actionWrapper).toHaveCSS("margin-right", "5px");
    await expect(editLink).toBeVisible();
    await expect(editLink).toHaveText("Edit");
    await expect(editLink).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/pullRequest/9/editform`,
    );
    await expect(closeButton).toBeVisible();
    await expect(closeButton).toHaveText("Close");
    await expect(closeButton).not.toHaveAttribute("data-request-method", /.+/u);
    await expect(closeButton).not.toHaveAttribute("data-request-uri", /.+/u);

    const geometry = await actions.evaluate((element) => {
      const wrapper = element.querySelector<HTMLElement>(
        '[data-owner="pull-request-detail-action-wrapper"]',
      );
      const edit = wrapper?.querySelector<HTMLElement>("a");
      const close = wrapper?.querySelector<HTMLElement>("button");
      if (!wrapper || !edit || !close) throw new Error("action controls are missing");
      const actionsBox = element.getBoundingClientRect();
      const wrapperBox = wrapper.getBoundingClientRect();
      const editBox = edit.getBoundingClientRect();
      const closeBox = close.getBoundingClientRect();
      return {
        actionsBottom: actionsBox.bottom,
        actionsLeft: actionsBox.left,
        actionsRight: actionsBox.right,
        actionsTop: actionsBox.top,
        closeBottom: closeBox.bottom,
        closeLeft: closeBox.left,
        closeRight: closeBox.right,
        closeTop: closeBox.top,
        documentScrollWidth: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        editBottom: editBox.bottom,
        editLeft: editBox.left,
        editRight: editBox.right,
        editTop: editBox.top,
        viewportWidth: window.innerWidth,
        wrapperBottom: wrapperBox.bottom,
        wrapperLeft: wrapperBox.left,
        wrapperRight: wrapperBox.right,
        wrapperTop: wrapperBox.top,
      };
    });
    expect(geometry.wrapperLeft).toBeGreaterThanOrEqual(geometry.actionsLeft - 1);
    expect(geometry.wrapperRight).toBeLessThanOrEqual(geometry.actionsRight + 1);
    expect(geometry.wrapperRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.wrapperTop).toBeGreaterThanOrEqual(geometry.actionsTop - 1);
    expect(geometry.wrapperBottom).toBeLessThanOrEqual(geometry.actionsBottom + 1);
    expect(geometry.editLeft).toBeGreaterThanOrEqual(geometry.wrapperLeft - 1);
    expect(geometry.editRight).toBeLessThanOrEqual(geometry.wrapperRight + 1);
    expect(geometry.editTop).toBeGreaterThanOrEqual(geometry.wrapperTop - 1);
    expect(geometry.closeLeft).toBeGreaterThanOrEqual(geometry.editRight - 1);
    expect(geometry.closeRight).toBeLessThanOrEqual(geometry.wrapperRight + 1);
    expect(geometry.closeBottom).toBeLessThanOrEqual(geometry.wrapperBottom + 1);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

    await page.screenshot({
      path: resolve(screenshotDirectory, `${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/pullRequest/9`, { waitUntil: "networkidle" });
  await page.locator('[data-owner="pull-request-detail-action-wrapper"] a').click();
  await expect(page).toHaveURL(
    new RegExp(`${basePath}/admin/sample/pullRequest/9/editform(?:\\?|$)`, "u"),
  );
});

async function mockPullRequestDetail(page: Page, basePath: string) {
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
