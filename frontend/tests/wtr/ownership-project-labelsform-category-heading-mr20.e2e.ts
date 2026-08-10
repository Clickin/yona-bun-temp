import { expect, test, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const fileURLToPath = (url: URL) => url.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
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
const legacyShell = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/project/issuelabels.scala.html", import.meta.url),
  ),
  "utf8",
);
const legacyList = readFileSync(
  fileURLToPath(
    new URL(
      "../../yona-original/app/views/project/partial_issuelabels_list.scala.html",
      import.meta.url,
    ),
  ),
  "utf8",
);
const commonLess = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  ),
  "utf8",
);
const pageLess = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const responsiveLess = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  ),
  "utf8",
);
const yobiLess = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);
const bootstrapCss = readFileSync(
  fileURLToPath(new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url)),
  "utf8",
);
const bootstrapResponsiveCss = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  ),
  "utf8",
);
const messages = readFileSync(
  fileURLToPath(new URL("../../yona-original/conf/messages", import.meta.url)),
  "utf8",
);
const screenshotDirectory = resolve(
  fileURLToPath(new URL("../output", import.meta.url)),
  "playwright",
  "style-project-labelsform-category-heading-mr20",
  process.env.VITE_DISABLE_LEGACY_FALLBACK ? "fallback-off" : "normal",
);

test("project labels category headings own the legacy mr20 spacing", async ({ page }) => {
  expect(legacyShell).toContain("@partial_issuelabels_list(project, labels)");
  expect(legacyShell).toContain('class="issue-label-list-wrap"');
  expect(legacyList).toContain('<h5 class="right-txt mr20">');
  expect(legacyList).toContain('<span class="category-name">');
  expect(commonLess).toMatch(/\.mr20\s*\{\s*margin-right\s*:\s*20px\s*;/u);
  expect(pageLess).toContain(".issue-label-list-wrap");
  expect(pageLess).toContain(".category-name");
  expect(pageLess).toContain("margin-right:2px;");
  expect(responsiveLess).toContain(".label-editor-wrap");
  expect(bootstrapCss).toContain(".row-fluid");
  expect(bootstrapResponsiveCss).toContain(".row-fluid");
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
    "label.category = Category",
    "label.name = Name",
    "label.category.edit = Edit",
  ]) {
    expect(messages).toContain(message);
  }

  expect(routeSource).toContain('data-owner="project-labels-category-heading"');

  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");

  await mockLabelsPage(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/labelsform`, {
      waitUntil: "commit",
    });

    const headings = page.locator('[data-owner="project-labels-category-heading"]');
    await expect(headings).toHaveCount(2);
    await expect(headings.locator(".category-name")).toHaveText(["type", "priority"]);
    for (let index = 0; index < 2; index += 1) {
      const heading = headings.nth(index);
      await expect(heading).toBeVisible();
      await expect(heading).toHaveClass(/\bmr20\b/u);
      await expect(heading).toHaveCSS("margin-right", "20px");
      await expect(heading).toHaveCSS("text-align", "right");
      // data-style-src is dev-only metadata (dist renders null; the parity
      // helper treats it as env-variant noise) — dropped in the WTR copy.
      await expect(heading).not.toHaveAttribute("style", /.+/u);

      const forbiddenAttributes = await heading.evaluate((element) =>
        [
          "data-toggle",
          "data-placement",
          "data-action",
          "data-href",
          "data-url",
          "data-request-method",
          "data-dismiss",
          "data-target",
          "data-trigger",
          "data-backdrop",
          "data-spy",
          "data-provider",
          "data-loading-text",
        ].filter((name) => element.hasAttribute(name)),
      );
      expect(forbiddenAttributes).toEqual([]);
    }

    const shellDiagnostic = await page.evaluate(() => ({
      formWidth: document.querySelector<HTMLElement>(".label-editor-wrap")?.getBoundingClientRect()
        .width,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    test.info().annotations.push({
      type: "diagnostic",
      description:
        `labels form shell at ${viewport.name}: width=${shellDiagnostic.formWidth ?? "unknown"}, ` +
        `scrollWidth=${shellDiagnostic.scrollWidth}, innerWidth=${shellDiagnostic.innerWidth}; ` +
        "owner-outside legacy form/shell drift is recorded without a strict page-wide geometry assertion or compensation.",
    });

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockLabelsPage(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-labels" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        backgroundUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isFavorited: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        ownerName: "admin",
        projectId: 7,
        projectName: "sample",
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        isFavorite: false,
        isPrivate: false,
        isWatching: true,
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        openIssueCount: 1,
        openPullRequestCount: 0,
        ownerName: "admin",
        postCount: 1,
        projectId: 7,
        projectName: "sample",
        reviewCount: 0,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanManageIssueLabels: true,
        viewerCanUpdate: true,
        viewerCanWatch: true,
        watchCount: 1,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            category: "type",
            categoryId: 3,
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#e11d48",
            id: 8,
            name: "bug",
          },
          {
            category: "priority",
            categoryId: 4,
            categoryIsExclusive: true,
            categoryName: "priority",
            color: "#ff9800",
            id: 10,
            name: "high",
          },
        ],
      }),
    });
  });
}
