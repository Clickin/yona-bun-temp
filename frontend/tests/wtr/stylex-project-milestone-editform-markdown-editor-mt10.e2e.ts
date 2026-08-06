// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test, type Page } from "../wtr-compat.ts";
import type { Route } from "@playwright/test";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "/private/tmp",
  "yona-stylex-project-milestone-editform-markdown-editor-mt10",
);
const routeSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx",
    import.meta.url,
  ),
  "utf8",
);
const styleSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/milestone/$milestoneId/-milestone-editform.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);
const legacyMilestoneSource = readFileSync(
  new URL("../../yona-original/app/views/milestone/edit.scala.html", import.meta.url),
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
const legacyYobiSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const legacyMessagesSource = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("project milestone editform markdown editor keeps legacy mt10 ownership", async ({ page }) => {
  expect(legacyMilestoneSource).toContain(
    '@common.editor("contents", milestone.contents, "tabindex=2", "content-body")',
  );
  expect(legacyEditorSource).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyCommonLessSource).toContain(".mt10 { margin-top:10px; }");
  for (const importPath of [
    '"less/_common.less"',
    '"less/_page.less"',
    '"less/_responsive.less"',
    '"less/_yobiUI.less"',
    '"less/_markdown.less"',
  ]) {
    expect(legacyYobiSource).toContain(`@import ${importPath};`);
  }
  for (const message of [
    "common.editor.edit = Edit",
    "common.editor.preview = Preview",
    "button.add.checklist = Add checklist",
    "button.clear.temporary = Clear Temporary",
    "notification.receiver.list.title = Notification receivers",
  ]) {
    expect(legacyMessagesSource).toContain(message);
  }

  expect(routeSource).toContain(
    'wrapperClassName={`mt10 ${stylex.props(milestoneEditFormStyles.markdownEditorWrapper).className ?? ""}`.trim()}',
  );
  expect(routeSource).toContain('wrapper: "milestone-edit-form-markdown-editor-wrapper"');
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
  expect(routeSource).not.toContain("$yobi.loadModule");
  expect(styleSource).toContain('markdownEditorWrapper: { marginTop: "10px" }');

  await mockMilestoneEditForm(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/milestone/5/editform`, { waitUntil: "commit" });

    const editor = page.locator(
      '[data-stylex-owner="milestone-edit-form-markdown-editor-wrapper"]',
    );
    await expect(editor).toBeVisible({ timeout: 15000 });
    await expect(editor).toHaveClass(/\bmt10\b/u);
    await expect(editor).toHaveCSS("margin-top", "10px");
    await expect(editor).not.toHaveAttribute("style", /.+/u);
    await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);

    const tabs = editor.locator(".nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).locator("button")).toHaveText("Edit");
    await expect(tabs.nth(1).locator("button")).toHaveText("Preview");
    await expect(tabs.nth(2).locator("button")).toHaveText("Add checklist");
    await expect(tabs.nth(3).locator("button")).toHaveText("Clear Temporary");
    await expect(tabs.nth(4)).toHaveText("");
    await expect(editor.locator("#edit-content-body")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#preview-content-body")).not.toHaveClass(/\bactive\b/u);

    const urlBeforeTabClick = page.url();
    await tabs.nth(1).locator("button").click();
    await expect(editor.locator("#preview-content-body")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#edit-content-body")).not.toHaveClass(/\bactive\b/u);
    await tabs.nth(0).locator("button").click();
    await expect(editor.locator("#edit-content-body")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#preview-content-body")).not.toHaveClass(/\bactive\b/u);
    expect(page.url()).toBe(urlBeforeTabClick);

    const metrics = await page.evaluate(() => {
      const editorElement = document.querySelector<HTMLElement>(
        '[data-stylex-owner="milestone-edit-form-markdown-editor-wrapper"]',
      );
      if (!editorElement) throw new Error("markdown editor wrapper is missing");
      const box = editorElement.getBoundingClientRect();
      return {
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        editorBottom: box.bottom,
        editorLeft: box.left,
        editorRight: box.right,
        editorTop: box.top,
        viewportWidth: window.innerWidth,
      };
    });
    expect(metrics.editorTop).toBeGreaterThan(0);
    expect(metrics.editorBottom).toBeGreaterThan(metrics.editorTop);
    expect(metrics.editorLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.editorRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockMilestoneEditForm(page: Page) {
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: "1",
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "en-US",
        userLabel: "Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
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
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/5", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestone: {
          contentsMarkdown: "Release scope",
          dueDateLabel: "2026-08-31",
          id: 5,
          state: "OPEN",
          title: "v1.0",
        },
      },
    }),
  );
}
