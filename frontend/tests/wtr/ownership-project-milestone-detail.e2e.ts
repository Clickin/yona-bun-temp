import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
// Post-merge: the full legacy cascade lives in app.css — normal-mode semantics.
const fallbackOff = false;
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records milestone detail owners and responsive geometry", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const theme = readFileSync("src/app.css", "utf8");
  const template = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  const issuePartial = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  expect(template).toContain('class="milesion-wrap"');
  expect(template).toContain('class="progress progress-success"');
  expect(issuePartial).toContain('<i class="yobicon-clock2 mr3 vmiddle"></i>');
  expect(commonLess).toContain(".mr3 { margin-right:3px; }");
  expect(route).toContain('data-owner="milestone-detail-progress"');
  expect(route).toContain('data-owner="milestone-detail-description"');
  expect(route).toContain('data-owner="milestone-detail-issue-due-date-icon"');

  expect(route).toContain("yobicon-clock2 vmiddle");
  expect(route).not.toContain("yobicon-clock2 mr3 vmiddle");
  expect(route).toContain("dueDateOverdue");

  await mockMilestone(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/milestone/1`);
    await expect(owner(page, "milestone-detail-wrap")).toBeVisible();
    await expect(owner(page, "milestone-detail-progress")).toBeVisible();
    const dueDate = owner(page, "milestone-detail-issue-due-date-icon");
    const dueDateRow = page.locator('[data-owner="milestone-detail-issue-row"]');
    await expect(dueDateRow).toContainText("Due-date issue");
    if (fallbackOff) {
      const computed = await dueDate.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          height: rect.height,
          marginRight: style.marginRight,
          width: rect.width,
        };
      });
      await expect(dueDate).toHaveCount(1);
      expect(computed.marginRight).toBe("3px");
      expect(await dueDate.getAttribute("style")).toBeNull();
      expect(computed.width).toBeGreaterThanOrEqual(0);
      expect(computed.height).toBeGreaterThanOrEqual(0);
    } else if (viewport.width > 390) {
      await expect(dueDate).toBeVisible();
      await expect(dueDate).toHaveClass(/yobicon-clock2/);
      await expect(dueDate).not.toHaveClass(/mr3/);
      await expect(dueDate).toHaveCSS("margin-right", "3px");
      await expect(dueDate).not.toHaveAttribute("style");
    } else {
      await expect(dueDate).toBeHidden();
    }
    const geometry = await owner(page, "milestone-detail-wrap").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
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
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "weblabs", projectName: "demo", members: [], vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/milestones/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestone: {
          id: "1",
          title: "v1",
          state: "open",
          completionPercent: 50,
          openIssueCount: 0,
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
