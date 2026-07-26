import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("public profile owns API avatar and issue label paints with Dynamic StyleX", async ({
  page,
}) => {
  const source = readFileSync("src/routes/$user.tsx", "utf8");
  const styleSource = readFileSync("src/routes/-user-profile.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const partial = readFileSync("../yona-original/app/views/user/partial_issues.scala.html", "utf8");

  expect(legacy).toContain(
    'class="whoami-wrap" style="background-image:url(\'@user.avatarUrl(256)\')"',
  );
  expect(partial).toContain('style="background:@label.color"');
  expect(source).toContain('data-stylex-owner="user-profile-avatar-background"');
  expect(source).toContain('data-stylex-owner="user-profile-parent-issue-label"');
  expect(source).not.toContain("style={{ backgroundImage:");
  expect(source).not.toContain("style={{ background: label.color }}");
  expect(styleSource).toContain("avatarBackground: (backgroundImage: string)");
  expect(styleSource).toContain("issueLabelBackground: (backgroundColor: string)");

  await mockProfile(page);
  await page.goto(`${basePath}/door`, { waitUntil: "domcontentloaded" });

  const avatar = page.locator('[data-stylex-owner="user-profile-avatar-background"]');
  await expect(avatar).toHaveCount(1);
  await expect(avatar).toHaveCSS("background-image", /avatar-profile\.png/);
  await expect(avatar).toHaveAttribute("style", /--x-backgroundImage:\s*url\('/u);

  const label = page.locator('[data-stylex-owner="user-profile-parent-issue-label"]');
  await expect(label).toHaveCount(1);
  await expect(label).toHaveCSS("background-color", "rgb(244, 67, 54)");
  await expect(label).toHaveAttribute("style", /--x-backgroundColor:\s*rgb\(244,67,54\)/u);
  const geometry = await avatar.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
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
          avatarUrl: "/assets/images/avatar-profile.png",
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
            id: 11,
            issueNumber: 7,
            title: "Open profile issue",
            state: "open",
            ownerName: "door",
            projectName: "sample",
            authorLoginId: "door",
            authorLabel: "Door User",
            createdLabel: "today",
            labels: [{ id: 17, name: "Bug", color: "rgb(244,67,54)" }],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
}
