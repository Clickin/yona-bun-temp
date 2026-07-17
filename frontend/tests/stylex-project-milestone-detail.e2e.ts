import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records milestone detail owners and responsive geometry", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/-milestone-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  expect(template).toContain('class="milesion-wrap"');
  expect(template).toContain('class="progress progress-success"');
  expect(route).toContain('data-stylex-owner="milestone-detail-progress"');
  expect(theme).toContain("export const milestoneDetailColors");
  await mockMilestone(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/milestone/1`);
    await expect(owner(page, "milestone-detail-wrap")).toBeVisible();
    await expect(owner(page, "milestone-detail-progress")).toBeVisible();
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
  await page.route("**/api/v1/owners/**/projects/**/container", (route: Route) =>
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
          openIssues: [],
          closedIssues: [],
          viewerCanUpdate: true,
          viewerCanDelete: true,
          assignableUsers: [],
        },
      },
    }),
  );
}
