import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("project milestone list owns server-provided issue-label colors with Dynamic Style", async ({
  page,
}) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/milestones.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/milestone/list.scala.html", "utf8");

  expect(template).toContain('class="label issue-label list-label active"');

  expect(route).toContain("data-label-id={stringField(label.id)}");

  await mockMilestones(page);
  await page.goto(`${basePath}/admin/sample/milestones?state=open&orderBy=dueDate&orderDir=asc`);

  const labels = page.locator('.issue-label[data-category-id="3"][data-label-id="8"]');
  await expect(labels).toHaveCount(2);
  await expect(labels.first()).toHaveCSS("background-color", "rgb(244, 67, 54)");
  await expect(labels.nth(1)).toHaveCSS("background-color", "rgb(244, 67, 54)");
  await expect(labels.first()).toHaveClass(/label issue-label list-label active/);
  await expect(labels.first()).not.toHaveAttribute("style", /(?:^|;)\s*background(?:-color)?\s*:/u);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

async function mockMilestones(page: Page) {
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
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        members: [{ loginId: "admin" }],
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/milestones**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestones: [
          {
            id: "5",
            title: "v1.0",
            state: "open",
            dueDateLabel: "2026-06-30",
            dueDateOverdue: true,
            untilLabel: "Overdue",
            completionPercent: 50,
            openIssueCount: 1,
            closedIssueCount: 1,
            viewerCanUpdate: true,
            openIssues: [
              {
                issueNumber: "11",
                title: "Open milestone issue",
                assigneeLabel: "Dev Member",
                labels: [
                  { categoryId: "3", categoryName: "Type", id: "8", name: "bug", color: "#f44336" },
                ],
              },
            ],
            closedIssues: [
              {
                issueNumber: "12",
                title: "Closed milestone issue",
                labels: [
                  { categoryId: "3", categoryName: "Type", id: "8", name: "bug", color: "#f44336" },
                ],
              },
            ],
          },
        ],
      },
    }),
  );
}
