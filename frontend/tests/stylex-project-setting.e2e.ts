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
  await mockSetting(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/setting`);
    await expect(owner(page, "project-setting-form")).toBeVisible();
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
    await defaultBranchContainer.locator("button.select2-choice").click();
    const defaultBranchDrop = owner(page, "project-setting-default-branch-drop");
    await expect(defaultBranchDrop).toBeVisible();
    await expect(defaultBranchDrop).toHaveCSS("width", "220px");
    const branchGeometry = await defaultBranchContainer.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width };
    });
    const dropGeometry = await defaultBranchDrop.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width };
    });
    expect(branchGeometry.width).toBe(220);
    expect(dropGeometry.width).toBe(220);
    expect(dropGeometry.left).toBeGreaterThanOrEqual(branchGeometry.left);
    expect(dropGeometry.right).toBeLessThanOrEqual(branchGeometry.right + 2);
    await defaultBranchContainer.locator("button.select2-choice").click();
    await expect(page.locator("#reviewerCountSettingPanel")).toBeVisible();
    await expect(page.locator("#welReviewerCount")).toBeHidden();
    await expect(page.locator("#reviewerCountSettingPanel")).toHaveCSS("display", "block");
    await expect(page.locator("#welReviewerCount")).toHaveCSS("display", "none");
    await page.locator("#reviewerCountEnable").check();
    await expect(page.locator("#welReviewerCount")).toBeVisible();
    await expect(page.locator("#welReviewerCount")).toHaveCSS("display", "block");
    await page.locator("#menuSettingCode").uncheck();
    await expect(page.locator("#reviewerCountSettingPanel")).toBeHidden();
    await expect(page.locator("#defaultBranceSettingPanel")).toBeHidden();
    await expect(page.locator("#reviewerCountSettingPanel")).toHaveCSS("display", "none");
    await expect(page.locator("#defaultBranceSettingPanel")).toHaveCSS("display", "none");
    const geometry = await owner(page, "project-setting-form").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
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
