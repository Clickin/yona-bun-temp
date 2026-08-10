import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const fallbackMode = fallbackOff ? "fallback-off" : "normal";
const screenshotDirectory = resolve(
  "output/playwright/style-project-milestone-detail-action-floats",
  fallbackMode,
);

test.use({ locale: "ko-KR" });

test(`owns milestone issue assignee and due-date floats (${fallbackMode})`, async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const milestoneTemplate = readFileSync(
    "../yona-original/app/views/milestone/view.scala.html",
    "utf8",
  );
  const issuePartial = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");

  expect(milestoneTemplate).toContain("issue.partial_list");
  expect(issuePartial).toContain('<div class="mt5 pull-right">');
  expect(issuePartial).toContain('<div class="mr20 mt10 pull-right');
  expect(commonLess).toContain(".mt5 { margin-top:5px; }");
  expect(commonLess).toContain(".mt10 { margin-top:10px; }");
  expect(commonLess).toContain(".mr20 { margin-right:20px; }");
  expect(bootstrap).toContain(".pull-right {\n  float: right;\n}");

  expect(routeSource).toContain('data-owner="milestone-detail-issue-assignee-rail"');
  expect(routeSource).toContain('data-owner="milestone-detail-issue-due-date-rail"');
  expect(routeSource).not.toContain("mt5 pull-right");
  expect(routeSource).not.toContain("mr20 mt10 pull-right");

  await mockMilestone(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/milestone/1?state=open#issues`, {
      waitUntil: "commit",
    });

    const assigneeRail = page.locator('[data-owner="milestone-detail-issue-assignee-rail"]');
    const dueDateRail = page.locator('[data-owner="milestone-detail-issue-due-date-rail"]');
    await expect(assigneeRail).toHaveCount(1);
    await expect(dueDateRail).toHaveCount(1);
    await expect(assigneeRail).toHaveCSS("float", "right");
    await expect(dueDateRail).toHaveCSS("float", "right");
    await expect(assigneeRail).toHaveClass(/mt5/);
    await expect(assigneeRail).not.toHaveClass(/pull-right/);
    await expect(dueDateRail).toHaveClass(/mr20/);
    await expect(dueDateRail).toHaveClass(/mt10/);
    await expect(dueDateRail).not.toHaveClass(/pull-right/);
    await expect(dueDateRail).toContainText("8 days left");

    const geometry = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);

    mkdirSync(screenshotDirectory, { recursive: true });
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
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    actorId: "1",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "weblabs",
        projectName: "demo",
        members: [{ loginId: "admin" }],
        vcs: "GIT",
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/milestones/1", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestone: {
          id: "1",
          title: "v1",
          state: "open",
          completionPercent: 50,
          openIssueCount: 1,
          closedIssueCount: 0,
          contentsMarkdown: "Details",
          openIssues: [
            {
              id: "42",
              issueNumber: "42",
              title: "Due-date issue",
              state: "open",
              dueDateLabel: "2026-07-30",
              dueDateText: "8 days left",
              dueDateOverdue: false,
              authorLoginId: "admin",
              authorLabel: "Admin",
              createdLabel: "2026-07-01",
              createdTitle: "2026-07-01",
              assigneeLoginId: "dev",
              assigneeLabel: "Dev Member",
              assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
              labels: [],
            },
          ],
          closedIssues: [],
          viewerCanUpdate: true,
          viewerCanDelete: true,
          assignableUsers: [],
        },
      },
    }),
  );
}
