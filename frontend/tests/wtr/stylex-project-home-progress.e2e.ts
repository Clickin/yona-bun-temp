import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project home uses Dynamic StyleX for server-provided milestone progress", async ({
  page,
}) => {
  const [routeSource, styleSource] = [
    readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8"),
    readFileSync("src/routes/$ownerName/$projectName/-project-home.stylex.ts", "utf8"),
  ];
  expect(routeSource).toContain("projectHomeStyles.milestoneProgressBar(`${completionPercent}%`)");
  expect(routeSource).toContain('data-stylex-owner="project-home-milestone-progress-bar"');
  expect(styleSource).toContain("progressBar: (width: string) => ({ width })");

  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        currentMilestone: {
          closedIssueCount: 1,
          completionPercent: 50,
          dueDateLabel: "2026-06-30",
          dueDateOverdue: true,
          id: 5,
          openIssueCount: 1,
          state: "open",
          title: "v1.0",
          untilLabel: "Overdue",
        },
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );

  await page.goto(`${basePath}/admin/sample`);
  const progress = page.locator('[data-stylex-owner="project-home-milestone-progress-bar"]');
  await expect(progress).toHaveCount(1);
  await expect(progress).toHaveAttribute("style", /--x-width:\s*50%/u);
  await expect(progress).not.toHaveAttribute("style", /(?:^|;)\s*width\s*:/u);
});
