import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("milestone detail preserves the legacy project wrapper hierarchy", async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const legacyView = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");

  expect(legacyView).toContain('<div class="page-wrap-outer">');
  expect(legacyView).toContain('    <div class="project-page-wrap">');
  expect(legacyView).toContain('        <div class="milesion-wrap">');
  expect(routeSource).toContain("className={`${sx.page.className} page-wrap-outer`}");
  expect(routeSource).toContain('className="project-page-wrap"');
  expect(routeSource).toContain("className={`${sx.wrap.className} milesion-wrap`}");

  await mockMilestoneDetail(page);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/milestone/1`, { waitUntil: "commit" });

    const outer = page.locator('[data-stylex-owner="milestone-detail-page"]');
    const project = page.locator('[data-stylex-owner="milestone-detail-shell"]');
    const content = page.locator('[data-stylex-owner="milestone-detail-wrap"]');
    await expect(outer).toHaveClass(/\bpage-wrap-outer\b/u);
    await expect(project).toHaveClass(/\bproject-page-wrap\b/u);
    await expect(content).toHaveClass(/\bmilesion-wrap\b/u);

    const hierarchy = await outer.evaluate((element) => {
      const project = element.firstElementChild;
      const content = project?.firstElementChild;
      const box = (node: Element) => {
        const rect = node.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      if (!project || !content) return null;
      return {
        content: box(content),
        outer: box(element),
        project: box(project),
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(hierarchy).not.toBeNull();
    expect(hierarchy!.outer.right).toBeLessThanOrEqual(hierarchy!.viewportWidth);
    expect(hierarchy!.project.left).toBeGreaterThanOrEqual(hierarchy!.outer.left - 1);
    expect(hierarchy!.project.right).toBeLessThanOrEqual(hierarchy!.outer.right + 1);
    expect(hierarchy!.content.left).toBeGreaterThanOrEqual(hierarchy!.project.left - 1);
    expect(hierarchy!.content.right).toBeLessThanOrEqual(hierarchy!.project.right + 1);
    expect(hierarchy!.scrollWidth).toBeLessThanOrEqual(hierarchy!.viewportWidth);
  }
});

async function mockMilestoneDetail(page: Page) {
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
        members: [{ loginId: "admin" }],
        menuSetting: { board: true, code: true, issue: true, milestone: true },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestone: {
          assignableUsers: [],
          attachments: [],
          closedIssues: [],
          closedIssueCount: 0,
          completionPercent: 50,
          contentsMarkdown: "Details",
          dueDateLabel: "2026-07-30",
          id: "1",
          openIssues: [],
          openIssueCount: 0,
          openMilestones: [],
          projectLabels: [],
          state: "open",
          title: "v1.0",
          untilLabel: "10 days left",
          viewerCanDelete: true,
          viewerCanUpdate: true,
        },
      },
    }),
  );
}
