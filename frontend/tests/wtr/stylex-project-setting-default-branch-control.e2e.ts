import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName/setting.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-setting.stylex.ts",
  import.meta.url,
);
const legacyViewSource = new URL(
  "../../yona-original/app/views/project/setting.scala.html",
  import.meta.url,
);
const legacySelect2Source = new URL(
  "../../yona-original/public/javascripts/lib/select2/select2.css",
  import.meta.url,
);
const legacyOverrideSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_override.less",
  import.meta.url,
);

test("project setting default branch Select2 closed/open state owns frozen geometry with StyleX", async ({
  page,
}) => {
  const [route, style, view, select2, override] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyViewSource, "utf8"),
    readFile(legacySelect2Source, "utf8"),
    readFile(legacyOverrideSource, "utf8"),
  ]);

  expect(view).toContain('id="defaultBranceSettingPanel"');
  expect(view).toContain('id="project-default-branch"');
  expect(view).toContain('data-toggle="select2"');
  expect(select2).toContain(".select2-container .select2-choice");
  expect(select2).toContain(".select2-container .select2-choice .select2-arrow");
  expect(select2).toContain(".select2-results .select2-result-label");
  expect(override).toContain(".select2-drop.branches");
  expect(override).toContain(".select2-chosen .branch-label");
  expect(style).toContain("defaultBranchContainer: {");
  expect(style).toContain('boxShadow: "0 1px 0 rgba(0,0,0,0.05)"');
  expect(style).toContain("defaultBranchArrowGlyph: {");
  expect(style).toContain('defaultBranchLabel: { marginTop: "-2px" }');
  expect(route).toContain('data-stylex-owner="project-setting-default-branch-container"');
  expect(route).not.toContain('data-toggle="select2"');

  await mockProjectSettings(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/admin/sample/settingform`);

  const container = page.locator('[data-stylex-owner="project-setting-default-branch-container"]');
  const choice = page.locator('[data-stylex-owner="project-setting-default-branch-choice"]');
  const drop = page.locator('[data-stylex-owner="project-setting-default-branch-drop"]');
  const search = page.locator('[data-stylex-owner="project-setting-default-branch-search-input"]');
  const results = page.locator('[data-stylex-owner="project-setting-default-branch-result"]');

  await expect(container).toBeVisible();
  await expect(choice).toContainText("branch main");
  await expect(page.locator("#project-default-branch")).toHaveValue("main");
  await expect(drop).toBeHidden();

  const closed = await page.evaluate(() => {
    const container = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-default-branch-container"]',
    )!;
    const choice = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-default-branch-choice"]',
    )!;
    const arrow = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-default-branch-arrow"]',
    )!;
    const glyph = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-default-branch-arrow-glyph"]',
    )!;
    const containerBox = container.getBoundingClientRect();
    const choiceBox = choice.getBoundingClientRect();
    return {
      containerWidth: Math.round(containerBox.width),
      choiceHeight: Math.round(choiceBox.height),
      choiceWidth: Math.round(choiceBox.width),
      containerDisplay: getComputedStyle(container).display,
      containerBorderRadius: getComputedStyle(container).borderTopLeftRadius,
      containerShadow: getComputedStyle(container).boxShadow,
      choiceBackground: getComputedStyle(choice).backgroundColor,
      choiceBorderStyle: getComputedStyle(choice).borderTopStyle,
      arrowBackground: getComputedStyle(arrow).backgroundColor,
      arrowBorderLeftStyle: getComputedStyle(arrow).borderLeftStyle,
      glyphBorderTop: getComputedStyle(glyph).borderTop,
    };
  });
  expect(closed).toMatchObject({
    containerDisplay: "inline-block",
    containerBorderRadius: "3px",
    choiceBackground: "rgba(0, 0, 0, 0)",
    choiceBorderStyle: "none",
    arrowBackground: "rgba(0, 0, 0, 0)",
    arrowBorderLeftStyle: "none",
  });
  expect(closed.containerWidth).toBeGreaterThanOrEqual(220);
  expect(closed.containerWidth - closed.choiceWidth).toBe(2);
  expect(closed.choiceHeight).toBeGreaterThan(20);
  expect(closed.glyphBorderTop).toContain("4px");

  await choice.click();
  await expect(drop).toBeVisible();
  await expect(search).toBeVisible();
  await expect(results).toHaveText(["branch main", "branch develop"]);
  await expect(
    page.locator('[data-stylex-owner="project-setting-default-branch-result-label"]'),
  ).toHaveCount(2);
  await expect(
    page.locator('[data-stylex-owner="project-setting-default-branch-result-label"]').first(),
  ).toHaveCSS("margin-top", "-2px");

  const open = await page.evaluate(() => {
    const drop = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-default-branch-drop"]',
    )!;
    const search = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-default-branch-search"]',
    )!;
    const results = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-default-branch-results"]',
    )!;
    const choiceBox = document
      .querySelector<HTMLElement>('[data-stylex-owner="project-setting-default-branch-choice"]')!
      .getBoundingClientRect();
    const dropBox = drop.getBoundingClientRect();
    return {
      dropBorderTop: getComputedStyle(drop).borderTopColor,
      dropRadius: getComputedStyle(drop).borderTopLeftRadius,
      dropShadow: getComputedStyle(drop).boxShadow,
      dropPosition: getComputedStyle(drop).position,
      searchMarginTop: getComputedStyle(search).marginTop,
      resultsPadding: getComputedStyle(results).padding,
      belowChoice: dropBox.top >= choiceBox.bottom - 1,
      dropWithinViewport: dropBox.right <= window.innerWidth,
    };
  });
  expect(open).toMatchObject({
    dropBorderTop: "rgba(0, 0, 0, 0.15)",
    dropRadius: "0px",
    dropPosition: "absolute",
    searchMarginTop: "4px",
    resultsPadding: "4px",
    belowChoice: true,
    dropWithinViewport: true,
  });
  expect(open.dropShadow).toContain("2px 2px 0px");

  await search.fill("develop");
  await expect(results).toHaveText("branch develop");
  await results.click();
  await expect(drop).toBeHidden();
  await expect(choice).toContainText("branch develop");
  await expect(page.locator("#project-default-branch")).toHaveValue("develop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileContainer = page.locator(
    '[data-stylex-owner="project-setting-default-branch-container"]',
  );
  await mobileContainer
    .locator('[data-stylex-owner="project-setting-default-branch-choice"]')
    .click();
  const mobileBounds = await page.evaluate(() => {
    const drop = document.querySelector<HTMLElement>("#s2id_project-default-branch .select2-drop")!;
    const box = drop.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width };
  });
  expect(mobileBounds.left).toBeGreaterThanOrEqual(0);
  expect(mobileBounds.right).toBeLessThanOrEqual(390);
  expect(mobileBounds.width).toBeGreaterThan(0);
});

async function mockProjectSettings(page: Page) {
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
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-settings" },
      body: JSON.stringify({
        session: { csrfToken: "csrf-settings", projection: {}, userId: 1 },
        user: {
          emailAddress: "admin@example.com",
          id: 1,
          isConfirmed: true,
          isSiteAdmin: true,
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  const settings = {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    backgroundUrl: "/assets/images/bg-default-project.png",
    codeMemberOnly: false,
    defaultReviewerCount: 2,
    enrolledUsers: [],
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    logoUrl: "/assets/images/project_default_logo.png",
    maxReviewerCount: 3,
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    organizationName: "",
    overview: "Sample overview",
    ownerName: "admin",
    projectId: 7,
    projectName: "sample",
    projectScope: "PUBLIC",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanUpdate: true,
    watchCount: 5,
  };
  const container = {
    backgroundImageUrl: settings.backgroundImageUrl,
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    logoUrl: settings.logoUrl,
    menuSetting: settings.menuSetting,
    ownerName: "admin",
    projectName: "sample",
    vcs: "GIT",
    viewerCanUpdate: true,
  };
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(settings) });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(container) });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/members", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrollmentRequests: [],
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            isOwner: true,
            loginId: "admin",
            role: "manager",
            userId: 1,
            userLabel: "Site Admin",
          },
        ],
        ownerName: "admin",
        projectName: "sample",
        roleOptions: [{ label: "Manager", role: "manager" }],
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: true }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [
          { isDefault: true, name: "main", shortName: "main" },
          { isDefault: false, name: "develop", shortName: "develop" },
        ],
        defaultBranch: "main",
        noHead: false,
        ownerName: "admin",
        permissions: { canDelete: true, canUpdate: true },
        projectName: "sample",
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches/default", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ defaultBranch: "develop" }),
    });
  });
}
