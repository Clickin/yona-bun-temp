import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("public profile subtask progress uses Dynamic StyleX width ownership", async ({ page }) => {
  const source = readFileSync("src/routes/$user.tsx", "utf8");
  const styleSource = readFileSync("src/routes/-user-profile.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const partial = readFileSync(
    "../yona-original/app/views/issue/partial_list_subtask.scala.html",
    "utf8",
  );

  expect(legacy).toContain('class="user-box"');
  expect(partial).toContain('class="subtask-progress upload-progress');
  expect(partial).toContain('style="width: @percentage%;"');
  expect(source).toContain('data-stylex-owner="user-profile-subtask-progress-bar"');
  expect(source).not.toContain("style={{ width: `${percentage}%` }}");
  expect(styleSource).toContain("progressBar: (width: string) => ({ width })");

  await mockProfile(page);
  await page.goto(`${basePath}/door`, { waitUntil: "domcontentloaded" });

  const progress = page.locator('[data-stylex-owner="user-profile-subtask-progress-bar"]');
  await expect(progress).toHaveCount(1);
  await expect(progress).toHaveCSS("width", "30px");
  await expect(progress).toHaveAttribute("title", "Subtask");
  await expect(progress).toHaveClass(/\bbar\b/);

  const geometry = await progress.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      width: rect.width,
    };
  });
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.documentWidth).toBe(geometry.viewportWidth);
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
      json: { avatarUrl: "", isAnonymous: false, isGuest: false, loginId: "alice" },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAuthenticated: true, user: { loginId: "alice" } },
    }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { avatarUrl: "", isAnonymous: false, isGuest: false, loginId: "alice" },
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
            assigneeLabel: "",
            authorLabel: "Door User",
            authorLoginId: "door",
            childClosedCount: 1,
            childOpenCount: 2,
            commentCount: 0,
            id: 11,
            issueNumber: 7,
            labels: [],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Open profile issue",
            updatedLabel: "2026-07-01",
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
}
