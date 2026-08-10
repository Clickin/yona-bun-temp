import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve builds those paths; fileURLToPath yields the served URL
// pathname so string mapping + .txt raw-suffix applies.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/style-project-code-branch-breadcrumb-ml10",
  fallbackOff ? "fallback-off" : "normal",
);

const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const legacyStyleSource = (relativePath: string) =>
  readFileSync(resolve("../yona-original/app/assets/stylesheets", relativePath), "utf8");

test.use({ locale: "en-US" });

test("project code branch breadcrumb owns the legacy ml10 margin", async ({ page }) => {
  const route = source("../src/routes/$ownerName/$projectName/code/$branch.tsx");
  const styles = source("../src/app.css");
  const legacyView = source("../../yona-original/app/views/code/view.scala.html");
  const legacyFolder = source("../../yona-original/app/views/code/partial_view_folder.scala.html");
  const commonLess = source("../../yona-original/app/assets/stylesheets/less/_common.less");
  const pageLess = source("../../yona-original/app/assets/stylesheets/less/_page.less");
  const responsiveLess = source("../../yona-original/app/assets/stylesheets/less/_responsive.less");
  const bootstrapCss = source("../../yona-original/public/bootstrap/css/bootstrap.css");
  const bootstrapResponsiveCss = source(
    "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  );
  const yobiLess = source("../../yona-original/app/assets/stylesheets/yobi.less");
  const messages = source("../../yona-original/conf/messages");
  const browserJs = source("../../yona-original/public/javascripts/service/yobi.code.Browser.js");

  expect(legacyView).toContain(
    '<div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left">',
  );
  expect(legacyView).toContain('<div class="code-browse-header">');
  expect(legacyView).toContain('<select id="branches" data-toggle="select2"');
  expect(legacyView).toContain(
    '@routes.CodeApp.codeBrowserWithBranch(project.owner, project.name, URLEncoder.encode(branch, "UTF-8"), "")',
  );
  expect(legacyView).toContain(
    '<a href="@routes.CodeApp.codeBrowserWithBranch(project.owner, project.name, URLEncoder.encode(branch, "UTF-8"), "")">@project.name</a>@makeBreadCrumbs(path)',
  );
  expect(legacyFolder).toContain('<div class="row-fluid listhead">');
  expect(legacyFolder).toContain('@Messages("code.filename")');
  expect(commonLess).toContain(".ml10 { margin-left:10px; }");
  for (const pageRule of [
    ".code-browse-wrap",
    ".code-browse-header",
    ".code-breadcrumb-wrap",
    ".code-viewer-wrap",
  ]) {
    expect(pageLess).toContain(pageRule);
  }
  expect(responsiveLess).toContain("@media all and (max-width: 720px) {");
  expect(responsiveLess).toContain(".main-stream");
  expect(bootstrapCss).toContain(".row-fluid {");
  expect(bootstrapCss).toContain(".pull-left {");
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
    "code.files = Files",
    "code.filename = File name",
    "code.commitMsg = Commit message",
    "code.commitDate = Commit date",
    "code.commits = Commit",
    "code.nofiles = No file exists",
    "title.branches = Branches",
  ]) {
    expect(messages).toContain(message);
  }
  expect(browserJs).toContain("welBreadCrumbs");
  expect(browserJs).toContain("welBranches");
  expect(browserJs).toContain("_onChangeBranch");
  expect(browserJs).toContain("_updateBreadcrumbs");
  expect(browserJs).toContain("sMetaInfoURL");

  expect(route).toContain('data-owner="project-code-branch-breadcrumbs"');
  expect(route).toContain("code-breadcrumb-wrap ml10 pull-left");

  expect(route).not.toContain('data-toggle="select2"');

  await mockCodeBranch(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/code/main`, { waitUntil: "commit" });

    const breadcrumbs = page.locator('[data-owner="project-code-branch-breadcrumbs"]');
    await expect(breadcrumbs).toBeVisible();
    await expect(breadcrumbs).toHaveClass(/\bcode-breadcrumb-wrap\b/u);
    await expect(breadcrumbs).toHaveClass(/\bml10\b/u);
    await expect(breadcrumbs).toHaveClass(/\bpull-left\b/u);
    await expect(breadcrumbs).toHaveCSS("margin-left", "10px");
    await expect(breadcrumbs).not.toHaveAttribute("style");
    await expect(breadcrumbs.locator("a")).toHaveCount(2);
    await expect(breadcrumbs.locator("a")).toHaveText(["sample", ""]);
    await expect(breadcrumbs.locator("a").first()).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/code/main`,
    );
    await expect(page.locator("#branches option")).toHaveText(["main"]);
    await expect(page.locator(".select2-chosen .branch-label.branch")).toHaveText("branch");
    await expect(page.locator(".select2-chosen")).toContainText("main");
    await expect(page.locator(".code-viewer-wrap .listitem")).toHaveCount(1);

    const pluginAttributes = await breadcrumbs.evaluate((element) =>
      Array.from(element.attributes)
        .map((attribute) => attribute.name)
        .filter((name) =>
          /^data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)/u.test(
            name,
          ),
        ),
    );
    expect(pluginAttributes).toEqual([]);

    const geometry = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(
        '[data-owner="project-code-branch-header"]',
      );
      const breadcrumbs = document.querySelector<HTMLElement>(
        '[data-owner="project-code-branch-breadcrumbs"]',
      );
      const viewer = document.querySelector<HTMLElement>(
        '[data-owner="project-code-branch-viewer"]',
      );
      if (!header || !breadcrumbs || !viewer) return null;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      return {
        breadcrumbs: box(breadcrumbs),
        documentContained:
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <=
          window.innerWidth + 1,
        header: box(header),
        viewer: box(viewer),
        viewport: window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.documentContained).toBe(true);
    expect(geometry!.header.left).toBeGreaterThanOrEqual(0);
    expect(geometry!.header.right).toBeLessThanOrEqual(geometry!.viewport + 1);
    expect(geometry!.breadcrumbs.left).toBeGreaterThanOrEqual(geometry!.header.left - 1);
    expect(geometry!.breadcrumbs.right).toBeLessThanOrEqual(geometry!.header.right + 1);
    expect(geometry!.viewer.right).toBeLessThanOrEqual(geometry!.viewport + 1);

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockCodeBranch(page: Page) {
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
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [{ name: "sample", path: "" }],
        entries: [
          {
            commitDate: "2026-07-20T10:00:00Z",
            commitMessage: "Initial README",
            commitShortId: "abcdef1",
            kind: "file",
            name: "README.md",
            path: "README.md",
          },
        ],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );
}
