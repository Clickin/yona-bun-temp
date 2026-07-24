import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OWNER = "admin";
const PROJECT = "sample";

test("reviews export action owns legacy padding through route StyleX", async ({ page }) => {
  const routeSource = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
  const stylexSource = readFileSync(
    "src/routes/$ownerName/$projectName/-reviews.stylex.ts",
    "utf8",
  );
  expect(routeSource).toContain('data-stylex-owner="project-reviews-export-action"');
  expect(routeSource).toContain("reviewsLayout.exportAction");
  expect(routeSource).not.toContain("style={{ padding: 10 }}");
  expect(stylexSource).toContain('padding: "10px"');

  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: OWNER,
        userLabel: "Admin",
      }),
    });
  });
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/container`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isPrivate: false,
        isProtected: true,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: OWNER,
        ownerName: OWNER,
        projectName: PROJECT,
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerUserId: 1,
      }),
    });
  });
  await page.route(`**/api/v1/owners/${OWNER}/projects/${PROJECT}/reviews**`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        allCount: 1,
        authorCount: 1,
        closedCount: 0,
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: OWNER,
            comments: [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorLabel: "Admin",
                authorLoginId: OWNER,
                contentsMarkdown: "Review export action",
                createdLabel: "Jul 18, 2026",
                id: 1001,
                threadId: 1,
              },
            ],
            commitId: "abc123",
            createdLabel: "Jul 18, 2026",
            id: 1,
            path: "src/main.rs",
            pullRequestNumber: 1,
            state: "open",
          },
        ],
        openCount: 1,
        pageNum: 1,
        pageSize: 15,
        participantCount: 1,
        state: "open",
        totalCount: 1,
      }),
    });
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${BASE_PATH}/${OWNER}/${PROJECT}/reviews`);
  const wrapper = page.locator('[data-stylex-owner="project-reviews-export-action"]');
  await expect(wrapper).toBeVisible();
  await expect(wrapper.locator('a[href$="format=xls"]')).toHaveText("Download as Excel file");
  await expect(wrapper).not.toHaveAttribute("style", /padding/);
  await expect(wrapper).toHaveCSS("padding-top", "10px");
  await expect(wrapper).toHaveCSS("padding-right", "10px");
  const metrics = await wrapper.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { bottom: box.bottom, top: box.top, width: box.width };
  });
  expect(metrics.bottom).toBeGreaterThan(metrics.top);
  expect(metrics.width).toBeGreaterThan(20);
});
