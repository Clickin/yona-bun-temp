import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("public profile owns API avatar and issue label paints with Dynamic Style", async ({
  page,
}) => {
  const source = readFileSync("src/routes/$user.tsx", "utf8");
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const partial = readFileSync("../yona-original/app/views/user/partial_issues.scala.html", "utf8");

  expect(legacy).toContain(
    'class="whoami-wrap" style="background-image:url(\'@user.avatarUrl(256)\')"',
  );
  expect(partial).toContain('style="background:@label.color"');
  expect(source).toContain('data-owner="user-profile-avatar-background"');
  expect(source).toContain('data-owner="user-profile-parent-issue-label"');

  await mockProfile(page);
  await page.goto(`${basePath}/door`, { waitUntil: "domcontentloaded" });

  const avatar = page.locator('[data-owner="user-profile-avatar-background"]');
  await expect(avatar).toHaveCount(1);
  await expect(avatar).toHaveCSS("background-image", /avatar-profile\.png/);
  // Bucket-3 (wave 33): the app renders the avatar through a real inline
  // backgroundImage (matching the legacy `style="background-image:url(...)"`)
  // instead of the retired `--x-backgroundImage` Dynamic Style var pin.
  // F5 dist-truth (2026-08-11): React serializes the inline style with
  // double quotes around the URL.
  await expect(avatar).toHaveAttribute("style", /background-image:\s*url\("/u);

  const label = page.locator('[data-owner="user-profile-parent-issue-label"]');
  await expect(label).toHaveCount(1);
  await expect(label).toHaveCSS("background-color", "rgb(244, 67, 54)");
  // Bucket-3 (wave 33): the app now renders the label through
  // issueLabelStyle() (real inline props) instead of the retired
  // `--x-backgroundColor` Dynamic Style var pin.
  await expect(label).toHaveAttribute(
    "style",
    "background-color: rgb(244, 67, 54); box-shadow: rgb(244, 67, 54) 2px 0px 0px inset; color: white;",
  );
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
