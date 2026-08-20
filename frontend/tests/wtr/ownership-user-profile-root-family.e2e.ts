import { readFile, readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/*/profile**", (route) => {
    const loginId = route
      .request()
      .url()
      .match(/\/users\/([^/]+)\/profile/u)?.[1];
    if (loginId === "ghost") {
      return route.fulfill({
        contentType: "application/json",
        status: 404,
        json: { error: { code: "not_found", message: "User exists not", status: 404 } },
      });
    }
    const empty = loginId === "empty";
    return route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        issueItems: empty
          ? []
          : [
              {
                authorLabel: "Owner",
                authorLoginId: "owner",
                id: 1,
                issueNumber: 7,
                ownerName: "owner",
                projectName: "sample",
                state: "open",
                title: "Populated profile issue",
                updatedLabel: "today",
              },
            ],
        memberProjects: empty
          ? []
          : [
              {
                createdLabel: "today",
                isWatching: false,
                logoUrl: "/assets/images/project_default_logo.png",
                memberCount: 1,
                overview: "Populated profile project",
                ownerName: "owner",
                projectName: "sample",
                projectScope: "public",
                viewerCanLeave: false,
                viewerCanWatch: false,
                watchCount: 0,
              },
            ],
        profile: {
          avatarUrl: "/assets/images/default-avatar-256.png",
          connectedSocialProviders: [],
          displayName: empty ? "Empty User" : "Owner User",
          englishName: empty ? "Empty" : "Owner",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: loginId,
          primaryEmailAddress: "",
          sinceLabel: "2026-01-01",
        },
        pullRequestItems: empty
          ? []
          : [
              {
                contributorLabel: "Owner",
                contributorLoginId: "owner",
                ownerName: "owner",
                projectName: "sample",
                pullRequestNumber: 3,
                receiverLoginId: "",
                state: "open",
                title: "Populated profile pull request",
                updatedLabel: "today",
              },
            ],
        selected: "issues",
        viewerCanEditProfile: false,
      },
    });
  });
});

test("public profile root family moves active legacy geometry into route-local Style", async ({
  page,
}) => {
  const [routeSource, styleSource, legacyView, legacyIssues, legacyPulls, legacyProjects, less] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      curatedAppCss(),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/views/user/partial_issues.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/views/user/partial_pullRequests.scala.html",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/views/user/partial_projectlist.scala.html",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
        "utf8",
      ),
    ]);

  for (const source of [legacyView, legacyIssues, legacyPulls, legacyProjects]) {
    expect(source).toContain("@**");
  }
  for (const selector of [".user-info-box", ".user-box", ".user-stream-box", ".my-issues"]) {
    expect(less).toContain(selector);
  }
  for (const owner of [
    "user-profile-box",
    "user-profile-info",
    "user-profile-stream",
    "user-profile-issue-row",
    "user-profile-issue-title-wrap",
  ]) {
    expect(routeSource).toContain(`data-owner=\"${owner}\"`);
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/owner`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.getByText("Populated profile issue")).toBeVisible();

  for (const [owner, property, value] of [
    ["user-profile-box", "overflow", "hidden"],
    ["user-profile-info", "float", "left"],
    ["user-profile-stream", "padding-left", "20px"],
    ["user-profile-issue-row", "padding-left", "10px"],
    ["user-profile-issue-title-wrap", "display", "table"],
  ] as const) {
    const locator = page.locator(`[data-owner="${owner}"]`).first();
    await expect(locator).toHaveCSS(property, value);
  }

  const desktop = await page.evaluate(() => {
    const box = document.querySelector<HTMLElement>(".user-box");
    const info = document.querySelector<HTMLElement>('[data-owner="user-profile-info"]');
    const stream = document.querySelector<HTMLElement>(".user-stream-box");
    if (!box || !info || !stream) throw new Error("profile geometry targets are missing");
    const outer = box.getBoundingClientRect();
    const infoBox = info.getBoundingClientRect();
    const streamBox = stream.getBoundingClientRect();
    return {
      infoWidth: Math.round(infoBox.width),
      streamStartsAfterInfo: streamBox.left >= infoBox.right,
      streamWithinProfile: streamBox.right <= outer.right + 1,
    };
  });
  expect(desktop).toEqual({
    infoWidth: 200,
    streamStartsAfterInfo: true,
    streamWithinProfile: true,
  });

  await page.getByRole("button", { name: /Pull request/i }).click();
  await expect(page.getByText("Populated profile pull request")).toBeVisible();
  await page.getByRole("button", { name: /projects/i }).click();
  await expect(page.getByText("Populated profile project")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({
    profileWidth:
      document.querySelector<HTMLElement>(".user-box")?.getBoundingClientRect().width ?? 0,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(mobile.profileWidth).toBeGreaterThan(0);
  expect(mobile.scrollWidth).toBe(390);
});

test("public profile empty and missing-user branches preserve legacy family output", async ({
  page,
}) => {
  await page.goto(`${basePath}/empty`);
  await expect(page.locator("#issues .error-wrap p")).toHaveCount(2);
  await expect(page.locator("#openIssues .error-wrap p")).toHaveText("recently No issue found");
  await page.getByRole("button", { name: /Pull request/i }).click();
  await expect(page.locator("#pullRequests .error-wrap p")).toHaveText(
    "recently No pull requests have been received",
  );
  await page.getByRole("button", { name: /projects/i }).click();
  await expect(page.locator("#projects .error-wrap p")).toHaveText("Project is non existent");

  await page.goto(`${basePath}/ghost`);
  await expect(page.locator(".error-wrap p")).toHaveText("User exists not");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute("href", `${basePath}/`);
});
