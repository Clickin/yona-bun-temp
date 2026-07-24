import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const mode = process.env.VITE_DISABLE_LEGACY_FALLBACK ? "fallback-off" : "normal";
const outputDir = resolve(`output/playwright/stylex-project-issues-row-action-floats/${mode}`);
const routeSource = readFileSync("src/routes/$ownerName/$projectName/issues.tsx", "utf8");
const styleSource = readFileSync("src/routes/$ownerName/$projectName/-issues.stylex.ts", "utf8");
const legacy = readFileSync("../yona-original/app/views/issue/partial_list.scala.html", "utf8");

test("project issue row rails preserve legacy float ownership", async ({ page }) => {
  expect(legacy).toContain('class="mt5 pull-right"');
  expect(legacy).toContain('class="mr20 mt10 pull-right');
  expect(routeSource).toContain('data-stylex-owner="project-issues-assignee-rail"');
  expect(routeSource).not.toContain('className="mt5 pull-right"');
  expect(styleSource).toMatch(/issueAssigneeRail:\s*\{\s*float:\s*"right"\s*,?\s*\}/u);

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
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        ownerName: "admin",
        projectName: "sample",
        menuSetting: { issue: true },
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/issue-search-users**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/assignable-users**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [], total: 0 } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        draftItems: [],
        items: [
          {
            id: 42,
            issueNumber: 10,
            title: "Assigned issue",
            state: "open",
            authorLabel: "Admin",
            authorLoginId: "admin",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            assigneeLabel: "Admin",
            assigneeLoginId: "admin",
            assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
            assigneeUserId: 1,
            dueDateLabel: "Jul 30, 2026",
            dueDateText: "Jul 30, 2026",
            dueDateOverdue: false,
            labels: [],
            commentCount: 0,
            voterCount: 0,
          },
          {
            id: 43,
            issueNumber: 11,
            title: "Unassigned issue",
            state: "open",
            authorLabel: "Admin",
            authorLoginId: "admin",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            dueDateLabel: "",
            dueDateText: "",
            dueDateOverdue: false,
            labels: [],
            commentCount: 0,
            voterCount: 0,
          },
        ],
        openIssueCount: 2,
        ownerName: "admin",
        projectName: "sample",
        pageNum: 1,
        pageSize: 15,
        totalCount: 2,
        totalPages: 1,
      },
    }),
  );

  mkdirSync(outputDir, { recursive: true });
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issues`);
    const rails = page.locator('[data-stylex-owner="project-issues-assignee-rail"]');
    const dueDate = page.locator('[data-stylex-owner="project-issues-due-date"]');
    await expect(rails).toHaveCount(2);
    await expect(dueDate).toHaveCount(1);
    expect(
      await rails.evaluateAll((elements) =>
        elements.every((element) => getComputedStyle(element).float === "right"),
      ),
    ).toBe(true);
    await expect(dueDate).toHaveCSS("float", "right");
    expect(
      await page
        .locator("[data-stylex-owner]")
        .evaluateAll((elements) =>
          elements.every(
            (element) =>
              !Array.from(element.attributes).some(({ name }) =>
                /^data-(toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)$/.test(
                  name,
                ),
              ),
          ),
        ),
    ).toBe(true);
    const geometry = await page.evaluate(() => {
      const boxes = [
        "[data-stylex-owner=project-issues-assignee-rail]",
        "[data-stylex-owner=project-issues-due-date]",
      ].map((selector) => document.querySelector<HTMLElement>(selector)?.getBoundingClientRect());
      const bodyWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
      const root = document.documentElement.getBoundingClientRect();
      return {
        contained: boxes.every(
          (box) => !!box && box.left >= root.left && box.right <= root.right + 1,
        ),
        bodyWidth,
        viewport: window.innerWidth,
      };
    });
    expect(geometry.contained).toBe(true);
    expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewport);
    await page.screenshot({ fullPage: true, path: resolve(outputDir, `${viewport.name}.png`) });
  }
});
