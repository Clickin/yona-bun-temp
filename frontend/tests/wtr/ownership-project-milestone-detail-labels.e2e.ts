import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("milestone detail owns server-provided issue-label colors with Dynamic Style", async ({
  page,
}) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );

  const partial = readFileSync("../yona-original/app/views/issue/partial_list.scala.html", "utf8");

  expect(partial).toContain('class="label issue-label list-label active"');

  expect(route).toContain("data-label-id={stringField(label.id)}");

  expect(route).not.toContain("style={label.color ? { background: cssBackgroundColor");

  await mockMilestone(page);
  await page.goto(`${basePath}/weblabs/demo/milestone/1?state=open#issues`);

  const parentLabel = page.locator('[data-label-id="7"]');
  const childLabel = page.locator('[data-label-id="8"]');
  await expect(parentLabel).toHaveCount(1);
  await expect(childLabel).toHaveCount(1);
  await expect(parentLabel).toHaveCSS("background-color", "rgb(244, 67, 54)");
  await expect(childLabel).toHaveCSS("background-color", "rgb(33, 150, 243)");
  await expect(parentLabel).toHaveClass(/label/);
  await expect(childLabel).toHaveClass(/twoColumeModeTarget/);
  await expect(parentLabel).not.toHaveAttribute("style", /(?:^|;)\s*background\s*:/u);
  await expect(childLabel).not.toHaveAttribute("style", /(?:^|;)\s*background\s*:/u);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
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
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
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
          openIssueCount: 1,
          closedIssueCount: 0,
          contentsMarkdown: "Details",
          openIssues: [
            {
              id: "11",
              issueNumber: "11",
              title: "[Bug] Fix issue",
              state: "open",
              authorLoginId: "admin",
              authorLabel: "Admin",
              createdLabel: "today",
              createdTitle: "today",
              labels: [
                {
                  categoryId: "1",
                  color: "#f44336",
                  id: "7",
                  name: "Bug",
                },
              ],
              childIssues: [
                {
                  id: "12",
                  issueNumber: "12",
                  title: "Child",
                  state: "open",
                  labels: [
                    {
                      categoryId: "1",
                      color: "#2196f3",
                      id: "8",
                      name: "Feature",
                    },
                  ],
                },
              ],
            },
          ],
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
