import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records project setting owners and responsive form containment", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/setting.tsx", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-setting.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/project/setting.scala.html", "utf8");
  expect(template).toContain('id="project-name"');
  expect(template).toContain('id="project-desc"');
  expect(template).toContain("<span style='color: red'>");
  expect(route).toContain('data-stylex-owner="project-setting-form"');
  expect(route).toContain('data-stylex-owner="project-setting-save"');
  expect(route).toContain('data-stylex-owner="project-setting-default-branch-container"');
  expect(route).toContain('data-stylex-owner="project-setting-default-branch-drop"');
  expect(route).toContain('data-stylex-owner="project-setting-default-branch-select"');
  expect(route).toContain('data-stylex-owner="project-setting-old-place"');
  expect(route).toContain('data-stylex-owner="project-setting-setting-box-left"');
  expect(route).toContain('data-stylex-owner="project-setting-setting-box-right"');
  expect(route).toContain('data-stylex-owner="project-setting-logo-desc"');
  expect(route).toContain('data-stylex-owner="project-setting-descs"');
  expect(route).toContain('data-stylex-owner="project-setting-point"');
  expect(route).toContain('data-stylex-owner="project-setting-name-field"');
  expect(route).toContain('data-stylex-owner="project-setting-name-popover"');
  expect(template).toContain('data-placement="left"');
  expect(template).toContain("data-content='@Messages(\"project.transfer.description6\")'");
  expect(route).not.toContain('style={{ color: "red" }}');
  expect(route).not.toContain("style={{ width: 220 }}");
  expect(route).not.toContain('style={{ minWidth: "220px" }}');
  expect(route).not.toContain('left: "-296px"');
  expect(route).not.toContain('top: "-12px"');
  expect(route).not.toContain('display: "block", width: 220');
  expect(theme).toContain("export const projectSettingColors");
  expect(theme).toContain('defaultBranchContainer: { width: "220px" }');
  expect(theme).toContain('defaultBranchDrop: { minWidth: "220px", width: "220px" }');
  expect(theme).toContain('defaultBranchSelect: { minWidth: "220px" }');
  expect(theme).toContain("namePopover: {");
  expect(route).not.toContain(
    'style={reviewerCountPanelVisible ? undefined : { display: "none" }}',
  );
  expect(route).not.toContain('style={{ display: reviewerCountEnabled ? "block" : "none" }}');
  expect(theme).toContain("reviewerCountPanelHidden");
  expect(theme).toContain('settingBox: { float: "left", width: "399px" }');
  expect(theme).toContain('default: "260px", [globalBreakpoints.mobile]: "100px"');
  expect(theme).toContain('default: "188px", [globalBreakpoints.mobile]: "100px"');
  expect(theme).toContain('default: "380px", [globalBreakpoints.mobile]: "inherit"');
  expect(theme).toContain("textareaHeight:");
  expect(theme).not.toContain('width: "40%"');
  expect(theme).not.toContain('width: "59%"');
  expect(theme).toContain('borderRight: "1px solid #ffffff"');
  expect(theme).toContain('default: "1px solid #d4d4d4"');
  expect(theme).toContain('margin: "0px"');
  expect(theme).toContain('paddingLeft: { default: "20px"');
  expect(theme).toContain('paddingRight: "20px"');
  expect(route).not.toContain('data-stylex-owner="project-setting-note"');
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
    await expect(settingBoxRight).toHaveCSS("width", "399px");
    await expect(logo).toHaveCSS("width", viewport.width <= 720 ? "100px" : "260px");
    await expect(logo).toHaveCSS("height", viewport.width <= 720 ? "100px" : "188px");
    if (viewport.width > 720) {
      await expect(owner(page, "project-setting-description")).toHaveCSS("width", "380px");
    }
    await expect(owner(page, "project-setting-description")).toHaveCSS("height", "40px");
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
      await defaultBranchContainer.getByRole("button").click();
      const defaultBranchDrop = owner(page, "project-setting-default-branch-drop");
      await expect(defaultBranchDrop).toBeVisible();
      await defaultBranchContainer.getByRole("button").click();
      await expect(page.locator("#reviewerCountSettingPanel")).toBeVisible();
      await expect(page.locator("#welReviewerCount")).toBeHidden();
      await page.locator("#reviewerCountEnable").check();
      await expect(page.locator("#welReviewerCount")).toBeVisible();
      await page.locator("#menuSettingCode").uncheck();
      await expect(page.locator("#reviewerCountSettingPanel")).toBeHidden();
      await expect(page.locator("#defaultBranceSettingPanel")).toBeHidden();
    }
    const geometry = await owner(page, "project-setting-form").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width <= 720 ? 429 : viewport.width);
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
  await page.route("**/api/v1/owners/**/projects/**/container", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/projects/**/branches", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { branches: [{ name: "main" }], defaultBranch: "main" },
    }),
  );
}
