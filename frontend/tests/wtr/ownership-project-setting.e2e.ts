import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records project setting owners and responsive form containment", async ({ page }) => {
  await mockSetting(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/setting`);
    await expect(owner(page, "project-setting-form")).toBeVisible();
    const settingBoxLeft = owner(page, "project-setting-setting-box-left");
    const settingBoxRight = owner(page, "project-setting-setting-box-right");
    const logo = owner(page, "project-setting-logo");
    await expect(settingBoxLeft).toHaveCSS("float", "left");
    await expect(settingBoxLeft).toHaveCSS("width", "399px");
    await expect(settingBoxRight).toHaveCSS(
      "width",
      viewport.width <= 720 ? `${viewport.width}px` : "399px",
    );
    await expect(logo).toHaveCSS("width", viewport.width <= 720 ? "100px" : "260px");
    await expect(logo).toHaveCSS("height", viewport.width <= 720 ? "100px" : "188px");
    if (viewport.width > 720) {
      await expect(owner(page, "project-setting-description")).toHaveCSS("width", "380px");
    }
    // bucket-3: the textarea now carries legacyTextareaHeight (height: 80px
    // !important, matching legacy _page.less .setting-box.right .textarea
    // height: 80px), so the old dynamic one-line 40px pin is stale.
    await expect(owner(page, "project-setting-description")).toHaveCSS("height", "80px");
    await expect(owner(page, "project-setting-name-input")).toHaveValue("demo");
    const nameField = owner(page, "project-setting-name-field");
    await expect(nameField).toHaveCSS("position", "relative");
    await owner(page, "project-setting-name-input").focus();
    const namePopover = owner(page, "project-setting-name-popover");
    await expect(namePopover).toBeVisible();
    await expect(namePopover).toHaveCSS("display", "block");
    await expect(namePopover).toHaveCSS("left", "-296px");
    await expect(namePopover).toHaveCSS("top", "-12px");
    await expect(namePopover).toHaveCSS("width", "276px");
    await expect(owner(page, "project-setting-description")).toHaveValue("Demo project");
    const oldPlace = owner(page, "project-setting-old-place");
    await expect(oldPlace).toHaveText("legacy-place");
    await expect(oldPlace).toHaveCSS("color", "rgb(255, 0, 0)");
    const defaultBranchContainer = owner(page, "project-setting-default-branch-container");
    const defaultBranchSelect = owner(page, "project-setting-default-branch-select");
    await expect(defaultBranchContainer).toHaveCSS("width", "220px");
    await expect(defaultBranchSelect).toHaveCSS("min-width", "220px");
    await expect(defaultBranchContainer).toBeVisible();
    if (viewport.width > 720) {
      await defaultBranchContainer.locator("button.select2-choice").click();
      const defaultBranchDrop = owner(page, "project-setting-default-branch-drop");
      await expect(defaultBranchDrop).toBeVisible();
      await defaultBranchContainer.locator("button.select2-choice").click();
      await expect(page.locator("#reviewerCountSettingPanel")).toBeVisible();
      await expect(page.locator("#welReviewerCount")).toBeHidden();
      await page.locator("#reviewerCountEnable").check();
      await expect(page.locator("#welReviewerCount")).toBeVisible();
      await page.locator("#menuSettingCode").uncheck();
      await expect(page.locator("#reviewerCountSettingPanel")).toBeHidden();
      await expect(page.locator("#defaultBranceSettingPanel")).toBeHidden();
    }
  }
});

async function mockSetting(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  const project = {
    ownerName: "weblabs",
    projectName: "demo",
    name: "demo",
    overview: "Demo project",
    vcs: "GIT",
    projectScope: "PUBLIC",
    menuSetting: {
      code: true,
      issue: true,
      pullRequest: true,
      review: true,
      milestone: true,
      board: true,
    },
    isCodeAccessibleMemberOnly: false,
    isUsingReviewerCount: false,
    defaultReviewerCount: 1,
    oldPlace: "legacy-place",
  };
  await page.route("**/api/v1/owners/**/projects/**/settings", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/projects/**/branches", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { branches: [{ name: "main" }], defaultBranch: "main" },
    }),
  );
}
