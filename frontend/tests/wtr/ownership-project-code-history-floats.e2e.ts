import { expect, test, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: mkdirSync only feeds page.screenshot paths; fileURLToPath
// reduces URL objects to their pathname for the fixture middleware.
const mkdirSync = () => undefined;
const fileURLToPath = (u: URL) => u.pathname;

const routeSourcePath = fileURLToPath(
  new URL("../src/routes/$ownerName/$projectName/commits.tsx", import.meta.url),
);
const styleSourcePath = fileURLToPath(new URL("../src/app.css", import.meta.url));
const legacyHistoryPath = fileURLToPath(
  new URL("../../yona-original/app/views/code/history.scala.html", import.meta.url),
);
const legacyBootstrapPath = fileURLToPath(
  new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
);
const legacyPageLessPath = fileURLToPath(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
);
const legacyMessagesPath = fileURLToPath(
  new URL("../../yona-original/conf/messages", import.meta.url),
);
const screenshotRoot = fileURLToPath(
  new URL("../output/playwright/style-project-code-history-floats/", import.meta.url),
);

test("project code-history float ownership has legacy source provenance", () => {
  const routeSource = readFileSync(routeSourcePath, "utf8");
  const styleSource = readFileSync(styleSourcePath, "utf8");
  const legacyHistory = readFileSync(legacyHistoryPath, "utf8");
  const legacyBootstrap = readFileSync(legacyBootstrapPath, "utf8");
  const legacyPageLess = readFileSync(legacyPageLessPath, "utf8");
  const legacyMessages = readFileSync(legacyMessagesPath, "utf8");

  expect(legacyHistory).toContain('class="pull-right"');
  expect(legacyHistory).toContain('class="ybtn pull-left"');
  expect(legacyPageLess).toContain(".actrow {\n        margin-top:20px;");
  expect(legacyBootstrap).toContain(".pull-right {\n  float: right;");
  expect(legacyBootstrap).toContain(".pull-left {\n  float: left;");
  expect(legacyMessages).toContain("code.newer =");
  expect(legacyMessages).toContain("code.older =");
  expect(legacyMessages).toContain("title.commitHistory =");

  expect(routeSource).toContain('data-owner="project-commits-branch-picker"');
  expect(routeSource).toContain('data-owner="project-commits-newer"');
  expect(routeSource).toContain('data-owner="project-commits-older"');
  // F5 (2026-08-13): the route renders the legacy float classes —
  // history.scala.html:203/207 (Newer/Older class="ybtn pull-left"). The
  // route writes className before data-owner, so pull-left precedes the owner.
  expect(routeSource).toMatch(/pull-left[\s\S]{0,80}project-commits-newer/u);
  expect(routeSource).toMatch(/pull-left[\s\S]{0,80}project-commits-older/u);
});

test("project code-history branch and pagination floats preserve interaction and containment", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCodeHistory(page);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${basePath}/admin/sample/commits?page=1`, { waitUntil: "commit" });
    const branchPicker = page.locator('[data-owner="project-commits-branch-picker"]');
    await expect(branchPicker).toBeVisible();
    await assertFloatLayout(page, viewport.name);
    await expect(branchPicker).not.toHaveClass(/pull-right/u);
    await expect(branchPicker.locator(".select2-choice")).toHaveAttribute("aria-expanded", "false");
    await branchPicker.locator(".select2-choice").click();
    await expect(branchPicker.locator(".select2-results")).toBeVisible();
    await branchPicker.locator(".select2-result-label", { hasText: "feature/release" }).click();
    await expect(page).toHaveURL(/\/admin\/sample\/commits\/feature%2Frelease\/?$/u);

    await page.goto(`${basePath}/admin/sample/commits?page=1`, { waitUntil: "commit" });
    const newer = page.locator('[data-owner="project-commits-newer"]');
    const older = page.locator('[data-owner="project-commits-older"]');
    await expect(newer).toBeVisible();
    await expect(older).toBeVisible();
    await expect(newer).toHaveCSS("float", "left");
    await expect(older).toHaveCSS("float", "left");
    expect(
      await page.evaluate(() => {
        const shell = document
          .querySelector<HTMLElement>('[data-owner="project-commits-shell"]')!
          .getBoundingClientRect();
        const links = [
          document.querySelector<HTMLElement>('[data-owner="project-commits-newer"]')!,
          document.querySelector<HTMLElement>('[data-owner="project-commits-older"]')!,
        ];
        return {
          linksInsideShell: links.every(
            (link) => link.getBoundingClientRect().left >= shell.left - 1,
          ),
          noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        };
      }),
    ).toEqual({ linksInsideShell: true, noOverflow: true });
    await expect(newer).toHaveText("Newer");
    await expect(older).toHaveText("Older");
    await expect(newer).toHaveClass(/pull-left/u);
    await expect(older).toHaveClass(/pull-left/u);
    await expect(newer).toHaveAttribute("href", `${basePath}/admin/sample/commits?page=0`);
    await expect(older).toHaveAttribute("href", `${basePath}/admin/sample/commits?page=2`);
    await older.click();
    await expect(page).toHaveURL(`${basePath}/admin/sample/commits?page=2`);
    await expect(page.locator('[data-owner="project-commits-newer"]')).toHaveText("Newer");
    await page.locator('[data-owner="project-commits-newer"]').click();
    await expect(page).toHaveURL(`${basePath}/admin/sample/commits?page=1`);
  }
});

async function assertFloatLayout(page: Page, viewportName: string) {
  const metrics = await page.evaluate(() => {
    const branch = document.querySelector<HTMLElement>(
      '[data-owner="project-commits-branch-picker"]',
    );
    const shell = document.querySelector<HTMLElement>('[data-owner="project-commits-shell"]');
    if (!branch || !shell) throw new Error("code-history branch owners missing");
    return {
      branchFloat: getComputedStyle(branch).float,
      branchRight: Math.round(branch.getBoundingClientRect().right),
      noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
  });
  expect(metrics).toMatchObject({
    branchFloat: "right",
    noOverflow: true,
  });
  const mode = "normal";
  mkdirSync(`${screenshotRoot}/${mode}`, { recursive: true });
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: `${screenshotRoot}/${mode}/${viewportName}.png`,
  });
}

async function mockCodeHistory(page: Page) {
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", defaultBranch: "main" },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/commits**", (route) => {
    const requestUrl = new URL(route.request().url());
    const branch = requestUrl.searchParams.get("branch") ?? "main";
    const pageNumber = Number(requestUrl.searchParams.get("page") ?? "0");
    return route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: [],
        commits: [
          {
            authorAvatarUrl: "",
            authorDate: "Jul 17, 2026",
            authorEmail: "admin@example.com",
            authorLoginId: "admin",
            authorName: "Admin",
            commentCount: 0,
            commitId: `abcdef123456789${pageNumber}`,
            commitShortId: "abcdef1",
            message: "Initial commit",
            shortMessage: "Initial commit",
          },
        ],
        hasNewer: pageNumber > 0,
        hasOlder: pageNumber < 2,
        noHead: false,
        ownerName: "admin",
        page: pageNumber,
        path: "",
        projectName: "sample",
        selectedBranch: branch,
      },
    });
  });
}
