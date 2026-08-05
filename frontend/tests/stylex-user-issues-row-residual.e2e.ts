import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("user issue row conditional and dynamic styles use route-local StyleX", async ({ page }) => {
  const source = readFileSync("src/routes/user/issues.tsx", "utf8");
  const styleSource = readFileSync("src/routes/user/-issues.stylex.ts", "utf8");
  const legacy = readFileSync(
    "../yona-original/app/views/issue/my_partial_list.scala.html",
    "utf8",
  );
  const childLegacy = readFileSync(
    "../yona-original/app/views/issue/partial_view_child.scala.html",
    "utf8",
  );

  expect(legacy).toContain('<li class="post-item title"');
  expect(legacy).toContain('class="child-issue-list hide"');
  expect(legacy).toContain('class="label issue-label list-label twoColumeModeTarget"');
  expect(legacy).toContain('style="background:@label.color"');
  expect(childLegacy).toContain('class="label issue-label list-label active twoColumeModeTarget"');
  expect(childLegacy).toContain('style="background:@label.color"');
  expect(source).toContain('import { IssueLabel } from "../../components/issue-label";');
  expect(source).toContain('data-stylex-owner="user-issues-issue-label-background"');
  expect(source).not.toContain("style={{ background: label.color }}");
  expect(source).not.toContain("childIssueLabelStyle(label.color)");
  expect(styleSource).toContain("issueLabelBackground: (backgroundColor) => ({ backgroundColor })");
  expect(source).toContain("issueStyles.issueRowTwoColumn");
  expect(source).toContain("issueStyles.issueRowHovered");
  expect(source).not.toContain('cursor: "pointer"');
  expect(source).not.toContain('backgroundColor: "#fafafa"');
  expect(styleSource).toContain('issueRowTwoColumn: { cursor: "pointer" }');
  expect(styleSource).toContain('issueRowHovered: { backgroundColor: "#fafafa" }');
  expect(styleSource).toContain("progressBar: (width) => ({ width })");

  await mockUserIssues(page);
  await page.addInitScript(() => localStorage.setItem("useTwoColumnMode", "true"));
  await page.goto(`${basePath}/user/issues`, { waitUntil: "commit" });

  const row = page.locator("li.post-item.title").first();
  await expect(row).toHaveCSS("cursor", "pointer");
  await row.hover();
  await expect(row).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await expect(row.locator(".child-issue-list")).toHaveCSS("display", "none");
  await expect(row.locator(".subtask-progress.upload-progress .bar")).toHaveCSS("width", "0px");
  const label = row.locator('[data-stylex-owner="user-issues-issue-label-background"]');
  await expect(label).toHaveCount(1);
  await expect(label).toHaveCSS("background-color", "rgb(18, 52, 86)");
  await expect(label).toHaveAttribute("style", /background-color:\s*rgb\(18, 52, 86\)/u);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "commit" });
  const mobileRow = page.locator("li.post-item.title").first();
  const mobileLabel = mobileRow.locator('[data-stylex-owner="user-issues-issue-label-background"]');
  await expect(mobileLabel).toHaveCSS("background-color", "rgb(18, 52, 86)");
  const [mobileRowBox, mobileLabelBox] = await Promise.all([
    mobileRow.boundingBox(),
    mobileLabel.boundingBox(),
  ]);
  expect(mobileRowBox).not.toBeNull();
  expect(mobileLabelBox).not.toBeNull();
  expect(mobileLabelBox!.x).toBeGreaterThanOrEqual(mobileRowBox!.x);
  expect(mobileLabelBox!.x + mobileLabelBox!.width).toBeLessThanOrEqual(
    mobileRowBox!.x + mobileRowBox!.width + 1,
  );
});

async function mockUserIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "alice",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/user/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        filter: "assigned",
        items: [
          {
            assigneeLabel: "",
            authorLabel: "Alice",
            authorLoginId: "alice",
            childClosedCount: 0,
            childOpenCount: 2,
            createdLabel: "2026-07-17",
            id: 1,
            issueNumber: 1,
            labels: [{ id: 42, name: "Server color", color: "#123456" }],
            ownerName: "alice",
            projectName: "sample",
            state: "open",
            title: "First issue",
            updatedLabel: "2026-07-17",
          },
        ],
        openIssueCount: 1,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: {},
        state: "open",
        totalCount: 1,
        totalPages: 1,
        viewerUserId: 1,
      },
    }),
  );
}
