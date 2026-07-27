import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-new-milestone-markdown-editor-mt10",
);
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/newMilestoneForm.tsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/-newMilestoneForm.stylex.ts", import.meta.url),
  "utf8",
);
const legacyCreateSource = readFileSync(
  new URL("../../yona-original/app/views/milestone/create.scala.html", import.meta.url),
  "utf8",
);
const legacyEditorSource = readFileSync(
  new URL("../../yona-original/app/views/common/editor.scala.html", import.meta.url),
  "utf8",
);
const legacyCommonLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("new milestone markdown editor preserves legacy mt10 ownership and tab behavior", async ({
  page,
}) => {
  expect(legacyCreateSource).toContain('@common.editor("contents",');
  expect(legacyEditorSource).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyCommonLessSource).toContain(".mt10 { margin-top:10px; }");

  expect(routeSource).toContain('data-stylex-owner="project-milestone-markdown-editor-wrapper"');
  expect(routeSource).toContain(
    'className={`mt10 ${markdownEditorWrapperStyleProps.className ?? ""}`.trim()}',
  );
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
  expect(styleSource).toContain('markdownEditorWrapper: { marginTop: "10px" }');

  await mockNewMilestoneForm(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/newMilestoneForm`, { waitUntil: "commit" });

    const wrapper = page.locator('[data-stylex-owner="project-milestone-markdown-editor-wrapper"]');
    await expect(wrapper).toBeVisible({ timeout: 15000 });
    await expect(wrapper).toHaveClass(/\bmt10\b/u);
    await expect(wrapper).toHaveCSS("margin-top", "10px");
    await expect(wrapper).not.toHaveAttribute("style", /.+/u);

    const tabs = wrapper.locator(".nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).locator("button")).toHaveText("Edit");
    await expect(tabs.nth(1).locator("button")).toHaveText("Preview");
    await expect(tabs.nth(2).locator("button")).toHaveText("Add checklist");
    await expect(tabs.nth(3).locator("button")).toHaveText("Clear Temporary");
    await expect(wrapper.locator("#edit-content-body")).toHaveClass(/\bactive\b/u);
    await expect(wrapper.locator("#preview-content-body")).not.toHaveClass(/\bactive\b/u);

    await tabs.nth(1).locator("button").click();
    await expect(wrapper.locator("#preview-content-body")).toHaveClass(/\bactive\b/u);
    await expect(wrapper.locator("#edit-content-body")).not.toHaveClass(/\bactive\b/u);
    await tabs.nth(0).locator("button").click();
    await expect(wrapper.locator("#edit-content-body")).toHaveClass(/\bactive\b/u);

    const metrics = await page.evaluate(() => {
      const editor = document.querySelector<HTMLElement>(
        '[data-stylex-owner="project-milestone-markdown-editor-wrapper"]',
      );
      const tabContent = editor?.querySelector<HTMLElement>(".tab-content");
      const leftPane = document.querySelector<HTMLElement>(".span-left-pane");
      if (!editor || !tabContent || !leftPane) {
        throw new Error("Milestone markdown editor geometry is missing.");
      }
      const editorBox = editor.getBoundingClientRect();
      const tabContentBox = tabContent.getBoundingClientRect();
      const leftPaneBox = leftPane.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        editorLeft: editorBox.left,
        editorRight: editorBox.right,
        editorWidth: editorBox.width,
        leftPaneRight: leftPaneBox.right,
        tabContentRight: tabContentBox.right,
        viewportWidth: window.innerWidth,
      };
    });
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.editorLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.editorRight).toBeLessThanOrEqual(metrics.leftPaneRight + 1);
    expect(metrics.tabContentRight).toBeLessThanOrEqual(metrics.editorRight + 1);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockNewMilestoneForm(page: Page) {
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "csrf-token" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: true,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: "admin",
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
}
