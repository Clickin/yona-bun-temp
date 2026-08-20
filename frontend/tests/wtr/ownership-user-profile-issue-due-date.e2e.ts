import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("public profile overdue open issue due date owns the legacy right float", async ({ page }) => {
  const source = readFileSync("src/routes/$user.tsx", "utf8");
  const styleSource = readFileSync("src/app.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const legacyPartial = readFileSync(
    "../yona-original/app/views/user/partial_issues.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyView).toContain("partial_issues");
  expect(legacyPartial).toContain('class="infos span3 meta"');
  expect(legacyPartial).toContain('class="pull-right @if(issue.isOverDueDate) {overdue}"');
  expect(legacyPartial).toContain('class="yobicon-clock2"');
  expect(pageLess).toContain(".my-issues");
  expect(pageLess).toContain(".meta-cell");
  expect(commonLess).toContain(".mr10");
  expect(responsiveLess).toContain("@media");
  expect(yobiLess).toContain('@import "less/_page.less"');
  expect(bootstrap).toContain(".pull-right {\n  float: right;");
  expect(bootstrapResponsive).toContain("@media");
  expect(messages).toContain("issue.dueDate.overdue");
  expect(source).toContain('data-owner="user-profile-issue-due-date"');
  expect(source).toContain('data-owner="user-profile-issue-due-date-clock"');
  expect(source).not.toContain("className={`pull-right ${dueDateOverdue");
  expect(source).not.toContain('dueDateOverdue ? "overdue" : ""');
  expect(source).not.toContain('className="yobicon-clock2"');

  await mockProfile(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/door`, { waitUntil: "domcontentloaded" });

  const dueDate = page.locator('[data-owner="user-profile-issue-due-date"]');
  await expect(dueDate).toHaveCount(1);
  await expect(dueDate).toHaveCSS("float", "right");
  await expect(dueDate).not.toHaveClass(/overdue/);
  // Retained legacy cascade (66739804a parity-correct): pull-right / yobicon-clock2.
  await expect(dueDate).toHaveClass(/pull-right/);
  await expect(dueDate).not.toHaveAttribute("data-toggle");
  await expect(dueDate).not.toHaveAttribute("data-placement");
  await expect(dueDate).toHaveAttribute("title", "Due date: Jul 5, 2026");
  const clock = dueDate.locator('[data-owner="user-profile-issue-due-date-clock"]');
  await expect(clock).toHaveCount(1);
  await expect(clock).toHaveClass(/yobicon-clock2/);
  await expect(dueDate).toContainText("Overdue");

  const desktop = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>("#issue-item-11");
    const dueDate = document.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-due-date"]',
    );
    if (!row || !dueDate) throw new Error("profile issue due-date targets are missing");
    const rowBox = row.getBoundingClientRect();
    const dueBox = dueDate.getBoundingClientRect();
    return {
      dueDateInsideMeta: dueDate.closest(".meta-cell")?.contains(dueDate) ?? false,
      dueDateRight: dueBox.right <= rowBox.right + 1,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(desktop).toEqual({
    dueDateInsideMeta: true,
    dueDateRight: true,
    documentWidth: 1366,
    viewportWidth: 1366,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({
    dueDateWidth:
      document
        .querySelector<HTMLElement>('[data-owner="user-profile-issue-due-date"]')
        ?.getBoundingClientRect().width ?? 0,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(mobile.dueDateWidth).toBeGreaterThan(0);
  expect(mobile.documentWidth).toBe(mobile.viewportWidth);
});

async function mockProfile(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/door/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door User",
          englishName: "Door English",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "2026-06-30",
        },
        issueItems: [
          {
            authorLabel: "Door User",
            authorLoginId: "door",
            dueDateLabel: "Jul 5, 2026",
            dueDateOverdue: true,
            dueDateText: "Jul 5, 2026",
            id: 11,
            issueNumber: 7,
            labels: [],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Overdue profile issue",
            updatedLabel: "today",
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
}
