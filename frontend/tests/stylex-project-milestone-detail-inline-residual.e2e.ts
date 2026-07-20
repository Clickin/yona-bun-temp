import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("milestone detail action row owns static inline layout declarations", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const styles = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/-milestone-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");

  expect(template).toContain('class="actrow right-txt row-fluid"');
  expect(template).toContain('style="padding: 15px 0; clear:both;"');
  expect(route).toContain('data-stylex-owner="milestone-detail-actions"');
  expect(route).toContain("actrow row-fluid");
  expect(route).not.toContain("actrow right-txt row-fluid");
  expect(route).toContain("sx.progressBar(`${completionPercent}%`)");
  expect(route).toContain('data-stylex-owner="milestone-detail-progress-bar"');
  expect(styles).toContain("progressBar: (width: string) => ({");
  expect(route).not.toContain('style={{ clear: "both", display: "block", padding: "15px 0" }}');
  expect(styles).toContain('display: "block"');
  expect(styles).toContain('padding: "15px 0px"');

  await mockMilestone(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/milestone/1?state=open#issues`);

    const actions = page.locator('[data-stylex-owner="milestone-detail-actions"]');
    await expect(actions).toBeVisible();
    await expect(actions).toHaveClass(/actrow/);
    await expect(actions).not.toHaveClass(/right-txt/);
    await expect(actions).toHaveClass(/row-fluid/);
    await expect(actions).toHaveCSS("clear", "both");
    await expect(actions).toHaveCSS("display", "block");
    await expect(actions).toHaveCSS("padding", "15px 0px");
    await expect(actions).toHaveCSS("text-align", "right");
    expect(await actions.getAttribute("style")).toBeNull();
    const progressBar = page.locator('[data-stylex-owner="milestone-detail-progress-bar"]');
    await expect(progressBar).toHaveAttribute("style", /--x-width:\s*50%/u);
    await expect(progressBar).not.toHaveAttribute("style", /(?:^|;)\s*width\s*:/u);

    const geometry = await actions.evaluate((element) => ({
      right: element.getBoundingClientRect().right,
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.scrollWidth).toBe(geometry.viewport);
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
      json: {
        ownerName: "weblabs",
        projectName: "demo",
        members: [{ loginId: "admin" }],
        vcs: "GIT",
      },
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
          projectLabels: [],
          openMilestones: [],
        },
      },
    }),
  );
}
