import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
// Wave-10 precedent (stylex-organization-boards): URL->string so the .txt
// raw-suffix mapping applies (URL-object reads get esbuild-transformed).
const fileURLToPath = (u: URL) => u.pathname;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/stylex-project-branches-default-badge-ml10");
const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const routeSource = source("../src/routes/$ownerName/$projectName/branches.tsx");
const legacyBranchRow = source("../../yona-original/app/views/code/partial_branchrow.scala.html");
const legacyCommon = source("../../yona-original/app/assets/stylesheets/less/_common.less");
const legacyPage = source("../../yona-original/app/assets/stylesheets/less/_page.less");
const legacyResponsive = source("../../yona-original/app/assets/stylesheets/less/_responsive.less");
const legacyBootstrap = source("../../yona-original/public/bootstrap/css/bootstrap.css");
const legacyBootstrapResponsive = source(
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
);
const legacyYobi = source("../../yona-original/app/assets/stylesheets/yobi.less");
const legacyMessages = source("../../yona-original/conf/messages");

test.use({ locale: "en-US" });

test("project branches preserves the default badge ml10 ownership and geometry", async ({
  page,
}) => {
  expect(legacyBranchRow).toContain(
    '<span class="headBranch ml10">@Messages("code.branches.defaultBranch")</span>',
  );
  expect(legacyCommon).toContain(".ml10 { margin-left:10px; }");
  for (const declaration of [
    ".headBranch {",
    "color: #0088cc;",
    "background-color: #fff;",
    "border: 1px solid rgba(0, 0, 0, 0.1);",
    "padding:3px 5px;",
    ".inline-block;",
    ".border-radius(3px);",
  ]) {
    expect(legacyPage).toContain(declaration);
  }
  expect(legacyResponsive).toContain("@media all and (max-width: 720px) {");
  expect(legacyBootstrap).toContain(".table {");
  expect(legacyBootstrapResponsive).toContain("@media (max-width: 767px) {");
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
    expect(legacyYobi).toContain(`@import "less/${importedFile}";`);
  }
  for (const message of [
    "code.branches.defaultBranch = Default branch",
    "code.branches.setAsDefault = Set as default branch",
    "button.delete = Delete",
    "title.branches = Branches",
  ]) {
    expect(legacyMessages).toContain(message);
  }

  expect(routeSource).toContain("defaultBadge: {");
  expect(routeSource).toContain('marginLeft: "10px"');
  expect(routeSource).toContain(
    "const defaultBadgeStyleProps = stylex.props(styles.defaultBadge);",
  );
  expect(routeSource).toContain("{...defaultBadgeStyleProps}");
  expect(routeSource).toContain(
    "className={`${defaultBadgeStyleProps.className} headBranch ml10`}",
  );
  expect(routeSource).toContain('data-stylex-owner="project-branches-default-badge"');

  await mockBranches(page);
  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/branches`, { waitUntil: "networkidle" });

    const table = page.locator('[data-stylex-owner="project-branches-table"]');
    const rows = table.locator("tbody > tr");
    const defaultBadge = page.locator('[data-stylex-owner="project-branches-default-badge"]');
    await expect(table).toHaveCount(1);
    await expect(rows).toHaveCount(2);
    await expect(defaultBadge).toHaveCount(1);
    await expect(defaultBadge).toHaveText("Default branch");
    await expect(defaultBadge).toHaveClass(/\bheadBranch\b/u);
    await expect(defaultBadge).toHaveClass(/\bml10\b/u);
    await expect(defaultBadge).toHaveCSS("margin-left", "10px");
    await expect(defaultBadge).toHaveAttribute(
      "data-stylex-owner",
      "project-branches-default-badge",
    );
    await expect(defaultBadge).toHaveAttribute("data-style-src", /branches\.tsx/u);
    await expect(rows.nth(1).locator(".headBranch")).toHaveCount(0);
    await expect(rows.nth(1).locator(".branchName > a")).toHaveText("feature/release");

    const order = await rows
      .nth(0)
      .locator(".branchName")
      .evaluate((cell) =>
        Array.from(cell.children).map((child) => ({
          tagName: child.tagName,
          text: child.textContent?.trim(),
        })),
      );
    expect(order).toEqual([
      { tagName: "A", text: "main" },
      { tagName: "SPAN", text: "Default branch" },
    ]);

    const geometry = await table.evaluate((element) => {
      const row = element.querySelector<HTMLElement>("tbody > tr");
      const cell = row?.querySelector<HTMLElement>(".branchName");
      const badge = cell?.querySelector<HTMLElement>(".headBranch");
      if (!row || !cell || !badge) throw new Error("branch badge geometry is missing");
      const tableBox = element.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const cellBox = cell.getBoundingClientRect();
      const badgeBox = badge.getBoundingClientRect();
      return {
        badgeContainedByCell: cell.contains(badge),
        cellContainedByRow: row.contains(cell),
        documentScrollWidth: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        tableContainedByBrowseWrap: Boolean(element.closest(".code-browse-wrap")),
        rowContainedByTable: element.contains(row),
        table: tableBox.toJSON(),
        row: rowBox.toJSON(),
        cell: cellBox.toJSON(),
        badge: badgeBox.toJSON(),
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.rowContainedByTable).toBe(true);
    expect(geometry.cellContainedByRow).toBe(true);
    expect(geometry.badgeContainedByCell).toBe(true);
    expect(geometry.badge.left).toBeGreaterThanOrEqual(geometry.cell.left);
    expect(geometry.badge.right).toBeLessThanOrEqual(geometry.cell.right);
    expect(geometry.badge.top).toBeGreaterThanOrEqual(geometry.row.top);
    expect(geometry.badge.bottom).toBeLessThanOrEqual(geometry.row.bottom);
    expect(geometry.tableContainedByBrowseWrap).toBe(true);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }

  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/branches`, { waitUntil: "networkidle" });
  await page.locator("tbody > tr").nth(1).locator(".branchName > a").click();
  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/code/feature(?:%2F|/)release`));
});

async function mockBranches(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
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
        openIssueCount: 1,
        openPullRequestCount: 1,
        organizationName: "",
        ownerName: "admin",
        postCount: 1,
        projectName: "sample",
        projectScope: "PUBLIC",
        reviewCount: 1,
        vcs: "GIT",
        viewerCanUpdate: true,
        watchingCount: 2,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/branches", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [
          {
            commitDate: "Jul 1, 2026",
            commitId: "abcdef1234567890",
            commitMessage: "Initial commit",
            commitShortId: "abcdef1",
            isDefault: false,
            name: "main",
            pullRequest: null,
            shortName: "main",
          },
          {
            commitDate: "Jul 2, 2026",
            commitId: "1234567890abcdef",
            commitMessage: "Release branch",
            commitShortId: "1234567",
            isDefault: false,
            name: "feature/release",
            pullRequest: null,
            shortName: "feature/release",
          },
        ],
        defaultBranch: "refs/heads/main",
        noHead: false,
        ownerName: "admin",
        permissions: { canDelete: false, canUpdate: false },
        projectName: "sample",
      },
    }),
  );
}
