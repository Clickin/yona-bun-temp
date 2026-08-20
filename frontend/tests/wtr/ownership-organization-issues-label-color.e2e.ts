import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("organization issue labels keep server colors through Dynamic Style", async ({ page }) => {
  const route = readFileSync("src/routes/organizations/$organizationName/issues.tsx", "utf8");
  const styleSource = readFileSync("src/app.css", "utf8");
  const legacy = readFileSync(
    "../yona-original/app/views/organization/group_issue_list_partial.scala.html",
    "utf8",
  );
  expect(legacy).toContain('class="label issue-label list-label"');
  expect(legacy).toContain('style="background:@label.color"');
  expect(route).toContain("color={label.color}");

  for (const owner of [
    "organization-issues-row-avatar",
    "organization-issues-row-title-wrap",
    "organization-issues-row-title",
    "organization-issues-row-post-id",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  await mockOrganizationIssues(page);
  await page.goto(`${basePath}/organizations/weblabs/issues?state=open`, {
    waitUntil: "domcontentloaded",
  });

  const label = page.locator('[data-label-id="8"]');
  await expect(label).toHaveText("bug");
  await expect(label).toHaveCSS("background-color", "rgb(81, 170, 204)");
  expect(await label.evaluate((element) => (element as HTMLElement).style.background)).toBe("");
  expect(await label.getAttribute("style")).toContain("rgb(81, 170, 204)");
  const row = page.locator('[data-owner="organization-issues-row"]').first();
  await expect(page.locator('[data-owner="organization-issues-row-title"]')).toHaveCSS(
    "font-size",
    "15px",
  );
  await expect(page.locator('[data-owner="organization-issues-row-post-id"]')).toHaveCSS(
    "font-size",
    "13px",
  );
  await expect(page.locator('[data-owner="organization-issues-row-avatar"]')).toHaveCSS(
    "float",
    "left",
  );
  const geometry = await row.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: window.innerWidth };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
});

async function mockOrganizationIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);

  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { organizationName: "weblabs", viewerCanUpdate: true, logoUrl: "" },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        items: [
          {
            assigneeAvatarUrl: "",
            assigneeLabel: "",
            assigneeLoginId: "",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 0,
            createdLabel: "Jul 1, 2026",
            dueDateLabel: "",
            dueDateOverdue: false,
            id: 42,
            issueNumber: 11,
            labels: [{ color: "#51aacc", id: 8, name: "bug" }],
            milestoneId: null,
            milestoneTitle: "",
            ownerName: "weblabs",
            projectName: "sample",
            state: "open",
            title: "Fix flaky issue",
            updatedLabel: "Jul 1, 2026",
            voterCount: 0,
          },
        ],
        pageNum: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        openIssueCount: 1,
        closedIssueCount: 0,
        visibleProjects: [{ projectName: "sample", ownerName: "weblabs" }],
        filter: "",
        orderBy: "createdDate",
        orderDir: "desc",
        state: "open",
        projectNames: [],
      },
    }),
  );
}
