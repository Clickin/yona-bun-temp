import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: screenshot paths are artifact-only no-ops.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("/private/tmp", "yona-style-project-commit-file-history-mt10");
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/commits/$branch/$filePath.tsx", import.meta.url),
  "utf8",
);
const styleSource = curatedAppCss();
const legacyHistorySource = readFileSync(
  new URL("../../yona-original/app/views/code/history.scala.html", import.meta.url),
  "utf8",
);
const legacyYobiSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const legacyCommonSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);
const legacyPageSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const legacyResponsiveSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  "utf8",
);
const bootstrapSource = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
  "utf8",
);
const bootstrapResponsiveSource = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  "utf8",
);
const messagesSource = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("path history table owns legacy mt10 on the table and keeps interactions", async ({
  page,
}) => {
  expect(legacyHistorySource).toContain(
    '<table class="code-table commits@if(path != null){ mt10}">',
  );
  expect(legacyHistorySource).toContain('<div id="history" class="commit-wrap">');
  expect(legacyCommonSource).toContain(".mt10 { margin-top:10px; }");
  expect(legacyPageSource).toContain(".code-table {");
  expect(legacyPageSource).toContain("width: 100%;");
  expect(legacyPageSource).toContain(".commit-wrap {");
  expect(legacyResponsiveSource).toContain("@media all and (max-width: 720px)");
  expect(legacyResponsiveSource).toContain(".page-wrap-outer");
  expect(legacyCommonSource).toContain(".margin-top-20   { margin-top:20px;   }");
  expect(legacyPageSource).toContain(".actrow {");
  expect(legacyPageSource).toContain("margin-top:20px;");
  expect(bootstrapSource).toContain("table {");
  expect(bootstrapSource).toContain(".pull-left {");
  expect(bootstrapSource).toContain("float: left;");
  expect(bootstrapSource).toContain("max-width: 100%;");
  expect(bootstrapSource).toContain("border-collapse: collapse;");
  expect(bootstrapResponsiveSource).toContain("@media");
  expect(bootstrapResponsiveSource).toContain(".row-fluid");
  expect(messagesSource).toContain("code.commitMsg = Commit message");
  expect(messagesSource).toContain("code.newer = Newer");
  expect(messagesSource).toContain("code.older = Older");
  expect(messagesSource).toContain("code.copyCommitId.copied = Commit ID is copied");
  expect(legacyHistorySource).toContain('<div class="actrow margin-top-20">');
  expect(legacyHistorySource).toContain('class="ybtn pull-left"');
  expect(legacyHistorySource).toContain('@Messages("code.newer")');
  expect(legacyHistorySource).toContain('@Messages("code.older")');

  expect(legacyYobiSource).toContain('@import "less/_common.less";');
  expect(legacyYobiSource).toContain('@import "less/_page.less";');
  expect(legacyYobiSource).toContain('@import "less/_responsive.less";');

  expect(routeSource).toContain('data-owner="commit-file-history-pagination-newer"');
  expect(routeSource).toContain('data-owner="commit-file-history-pagination-older"');
  expect(routeSource).toContain('data-owner="commit-file-history-table"');

  const historyRequests = await mockHistory(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/weblabs/demo/commits/main/src/app.ts?page=2`, {
    waitUntil: "networkidle",
  });

  const table = page.locator('[data-owner="commit-file-history-table"]');
  await expect(table).toBeVisible();
  await expect(table).toHaveClass(/\bcode-table\b/u);
  await expect(table).toHaveClass(/\bcommits\b/u);
  await expect(table).toHaveClass(/\bmt10\b/u);
  await expect(table).toHaveCSS("margin-top", "10px");
  await expect(table).not.toHaveAttribute("style", /.+/u);
  await expect(table.locator("thead tr td")).toHaveCount(5);
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("tbody tr td")).toHaveCount(5);
  await expect(table.locator(".commit-id a")).toHaveText("abcdef1");
  await expect(table.locator(".messages a.commitMsg.short")).toHaveText("Initial commit");
  await expect(table.locator(".browse a")).toHaveText("Browse code");
  await expect(table.locator(".author a.avatar-wrap")).toHaveAttribute("title", "admin");
  await expect(
    table.locator("[data-toggle], [data-placement], [data-url], [data-action]"),
  ).toHaveCount(0);

  const newer = page.getByRole("link", { name: "Newer" });
  const older = page.getByRole("link", { name: "Older" });
  await expect(newer).toHaveCount(1);
  await expect(older).toHaveCount(1);
  await expect(newer).toHaveClass(/\bybtn\b/u);
  await expect(older).toHaveClass(/\bybtn\b/u);
  await expect(newer).not.toHaveClass(/\bpull-left\b/u);
  await expect(older).not.toHaveClass(/\bpull-left\b/u);
  await expect(newer).toHaveCSS("float", "left");
  await expect(older).toHaveCSS("float", "left");
  await expect(page.locator(".actrow a")).toHaveText(["Newer", "Older"]);
  await expect(newer).toHaveAttribute(
    "href",
    `${basePath}/weblabs/demo/commits/main/src/app.ts?page=1`,
  );
  await expect(older).toHaveAttribute(
    "href",
    `${basePath}/weblabs/demo/commits/main/src/app.ts?page=3`,
  );
  await expect(newer).not.toHaveAttribute("style", /.+/u);
  await expect(older).not.toHaveAttribute("style", /.+/u);
  await expect(newer).not.toHaveAttribute("data-toggle");
  await expect(older).not.toHaveAttribute("data-toggle");

  await assertContained(page, table);
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "desktop.png"),
  });

  const description = table.locator("pre.commitMsg.desc");
  await expect(description).toHaveClass(/\bhidden\b/u);
  const currentUrl = page.url();
  await table.locator("button.commitMsg.moreBtn").click();
  await expect(description).not.toHaveClass(/\bhidden\b/u);
  await expect(description).toHaveText("Add README");
  await expect(page).toHaveURL(currentUrl);

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text: string) {
          (window as typeof window & { __copiedCommitId?: string }).__copiedCommitId = text;
          return Promise.resolve();
        },
      },
    });
  });
  await table.locator("tbody .commit-id").hover();
  await table.locator(".btn-copy-commitId").click();
  await expect(
    page.evaluate(() => (window as typeof window & { __copiedCommitId?: string }).__copiedCommitId),
  ).resolves.toBe("abcdef1234567890");
  await expect(page.locator('#yobiToasts [data-part="toast-message"]')).toHaveText(
    "Commit ID is copied",
  );

  await expect(table.locator(".commit-id a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/demo/commit/abcdef1234567890?branch=main&path=src%2Fapp.ts#src-app-ts`,
  );
  await expect(table.locator(".browse a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/demo/code/abcdef1/src/app.ts`,
  );

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "code-history-file";
  });
  await page.getByRole("link", { name: "Older" }).click();
  await expect(page).toHaveURL(`${basePath}/weblabs/demo/commits/main/src/app.ts?page=3`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("code-history-file");
  expect(historyRequests).toContain("branch=main&page=2&path=src%2Fapp.ts");
  expect(historyRequests).toContain("branch=main&page=3&path=src%2Fapp.ts");

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${basePath}/weblabs/demo/commits/main/src/app.ts?page=2`, {
    waitUntil: "networkidle",
  });
  await expect(page.locator('[data-owner="commit-file-history-table"]')).toHaveCSS(
    "margin-top",
    "10px",
  );
  await assertContained(page, page.locator('[data-owner="commit-file-history-table"]'));
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "mobile.png"),
  });
});

test("pathless history keeps the conditional table class and empty state", async ({ page }) => {
  expect(legacyHistorySource).toContain("@if(path == null){");
  expect(legacyHistorySource).toContain("@if(path != null){");

  await mockHistory(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${basePath}/weblabs/demo/commits/main/`, { waitUntil: "networkidle" });

  const table = page.locator('[data-owner="project-commits-table"]');
  await expect(table).toBeVisible();
  await expect(table).toHaveClass(/\bcode-table\b/u);
  await expect(table).toHaveClass(/\bcommits\b/u);
  await expect(table).not.toHaveClass(/\bmt10\b/u);
  await expect(table).toHaveCSS("margin-top", "0px");
  await expect(table).not.toHaveAttribute("style", /.+/u);
  await expect(table.locator("thead tr td")).toHaveCount(4);
  await expect(table.locator(".browse")).toHaveCount(0);
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator('[data-owner="project-commits-empty-warning"]')).toHaveText(
    "No commit exists",
  );
  await expect(page.locator(".actrow a")).toHaveCount(0);
  await assertContained(page, table);
});

async function assertContained(page: Page, table: ReturnType<Page["locator"]>) {
  const metrics = await table.evaluate((element) => {
    const history = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    if (!history) return null;
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      history: {
        bottom: history.bottom,
        left: history.left,
        right: history.right,
        scrollWidth: (element.parentElement as HTMLElement).scrollWidth,
        top: history.top,
        width: history.width,
      },
      table: {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
      },
      viewportWidth: window.innerWidth,
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.table.top).toBeGreaterThanOrEqual(metrics!.history.top);
  expect(metrics!.table.left).toBeGreaterThanOrEqual(metrics!.history.left - 1);
  expect(metrics!.table.right).toBeLessThanOrEqual(
    metrics!.history.left + metrics!.history.scrollWidth + 1,
  );
  expect(metrics!.history.right).toBeLessThanOrEqual(metrics!.viewportWidth + 1);
  expect(metrics!.documentScrollWidth).toBeLessThanOrEqual(metrics!.documentClientWidth + 1);
}

async function mockHistory(page: Page) {
  const historyRequests: string[] = [];
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/weblabs/projects/demo/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        menuSetting: { board: true, code: true, issue: true, milestone: true, pullRequest: true },
        ownerName: "weblabs",
        projectName: "demo",
        vcs: "GIT",
      },
    }),
  );
  await page.route("**/api/v1/projects/weblabs/demo/commits**", async (route: Route) => {
    const url = new URL(route.request().url());
    historyRequests.push(url.search.slice(1));
    const path = url.searchParams.get("path");
    await route.fulfill({
      contentType: "application/json",
      json:
        path === null
          ? emptyHistory("", "")
          : path === "src/empty.ts"
            ? emptyHistory(path, path)
            : fileHistory(path),
    });
  });
  return historyRequests;
}

function fileHistory(path: string) {
  return {
    branches: [{ name: "main" }],
    breadcrumbs: [
      { name: "src", path: "src" },
      { name: path.split("/").at(-1) ?? path, path },
    ],
    commits: [
      {
        authorAvatarUrl: "",
        authorDate: "Jul 1, 2026",
        authorEmail: "admin@example.com",
        authorLoginId: "admin",
        authorName: "Admin",
        commentCount: 2,
        commitId: "abcdef1234567890",
        commitShortId: "abcdef1",
        message: "Initial commit\nAdd README",
        shortMessage: "Initial commit",
      },
    ],
    hasNewer: true,
    hasOlder: true,
    noHead: false,
    ownerName: "weblabs",
    page: 2,
    path,
    projectName: "demo",
    selectedBranch: "main",
  };
}

function emptyHistory(path: string, breadcrumbPath: string) {
  return {
    branches: [{ name: "main" }],
    breadcrumbs: breadcrumbPath ? [{ name: breadcrumbPath, path: breadcrumbPath }] : [],
    commits: [],
    hasNewer: false,
    hasOlder: false,
    noHead: false,
    ownerName: "weblabs",
    page: 0,
    path,
    projectName: "demo",
    selectedBranch: "main",
  };
}
