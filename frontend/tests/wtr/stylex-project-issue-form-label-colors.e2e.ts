import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("issue form owns selected and available label colors with Dynamic StyleX", async ({
  page,
}) => {
  const source = readFileSync("src/routes/$ownerName/$projectName/issueform.tsx", "utf8");
  const styles = readFileSync("src/routes/$ownerName/$projectName/-issueform.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/issue/create.scala.html", "utf8");
  const labels = readFileSync(
    "../yona-original/app/views/issue/partial_select_label.scala.html",
    "utf8",
  );
  const legacyUi = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );

  expect(legacy).toContain("@partial_select_label(IssueLabel.findByProject(project), null");
  expect(labels).toContain('data-format="issuelabel"');
  expect(legacyUi).toContain(".issue-label {");
  expect(legacyUi).toContain("background:#f9f9f9;");
  expect(source).toContain("issueFormStyles.labelBackground(normalizedColor(label.color))");
  expect(styles).toContain("labelBackground: (backgroundColor: string) => ({ backgroundColor })");
  expect(source).not.toContain("style={{ backgroundColor: normalizedColor(label.color) }}");

  await mockIssueForm(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issueform`, { waitUntil: "commit" });

  const picker = page.locator('[data-stylex-owner="project-issue-form-label-picker"]');
  await expect(picker).toHaveCount(1);
  await picker.locator(".select2-input").click();
  const colors = page.locator('[data-stylex-owner="project-issue-form-label-background"]');
  await expect(colors).toHaveCount(2);
  await expect(colors.filter({ hasText: "bug" })).toHaveCSS(
    "background-color",
    "rgb(81, 170, 204)",
  );
  await expect(colors.filter({ hasText: "high" })).toHaveCSS(
    "background-color",
    "rgb(243, 108, 34)",
  );
  for (const color of await colors.all()) {
    await expect(color).not.toHaveAttribute("style", /(?:^|;)\s*background(?:-color)?\s*:/i);
  }

  const desktopBox = await picker.boundingBox();
  expect(desktopBox).not.toBeNull();
  expect(desktopBox!.x).toBeGreaterThanOrEqual(0);
  expect(desktopBox!.x + desktopBox!.width).toBeLessThanOrEqual(1366);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBox = await picker.boundingBox();
  expect(mobileBox).not.toBeNull();
  expect(mobileBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileBox!.x + mobileBox!.width).toBeLessThanOrEqual(390);
});

async function mockIssueForm(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: 1,
    avatarUrl: `${basePath}/assets/images/default-avatar-32.png`,
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", json: session }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ contentType: "application/json", json: { session: null, user: null } }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { session, favoriteProjects: [], organizations: [] },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        projectId: 7,
        vcs: "GIT",
        projectScope: "PRIVATE",
        defaultTab: "projectHome",
        logoUrl: `${basePath}/assets/images/project_default_logo.png`,
        isFavorited: false,
        isWatching: false,
        viewerCanWatch: false,
        viewerCanEnroll: false,
        showIssue: true,
        showBoard: true,
        showCode: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        showAdmin: true,
        memberCount: 1,
        openIssueCount: 1,
        openPullRequestCount: 0,
        watchCount: 0,
        members: [],
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        labels: [
          {
            id: 8,
            name: "bug",
            color: "#51aacc",
            categoryId: 3,
            categoryName: "type",
            categoryIsExclusive: false,
          },
          {
            id: 9,
            name: "high",
            color: "#f36c22",
            categoryId: 4,
            categoryName: "priority",
            categoryIsExclusive: true,
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/form-options", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canCreateIssueAssignee: false,
        canCreateIssueMilestone: false,
        canManageIssueLabels: true,
        currentProject: { ownerName: "admin", projectName: "sample", projectId: 7 },
        issueTemplateMarkdown: "",
        movableIssueProjects: [],
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/parent-options**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
}
